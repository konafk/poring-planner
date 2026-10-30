// Damage and tracker maths in js/*.js, run against the real data files with a stand-in page. Run: node tests/model.test.mjs
import { readFileSync, readdirSync } from "fs";
import vm from "vm";
import assert from "assert/strict";

// a stand-in for every page element: any property is another stand-in, calling one returns one, it reads as "" and iterates as empty
const stub = () => {
  const own = {};
  const p = new Proxy(function () {}, {
    get: (_, k) => k in own ? own[k] : k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? [][Symbol.iterator] : k === "then" ? undefined : (own[k] = stub()),
    set: (_, k, v) => (own[k] = v, true),
    apply: () => stub(),
  });
  return p;
};
const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
// a fresh copy of the page's scripts; save (optional) is what localStorage holds for the account when they load, raw (optional) the whole localStorage
const load = (save, raw) => {
  const store = raw ?? (save ? { "rozero-farm-planner-v1": JSON.stringify(save) } : {});
  const ctx = vm.createContext({
    document: stub(), console, setTimeout: () => 0, clearTimeout() {}, navigator: stub(), location: stub(), scrollTo() {}, addEventListener() {},
    localStorage: { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v) }, removeItem: k => { delete store[k] } },
  });
  for (const [, src] of html.matchAll(/<script src="([^"?]+)(?:\?v=[^"]*)?"><\/script>/g)) vm.runInContext(readFileSync(new URL(src, root), "utf8"), ctx, { filename: src });
  return code => vm.runInContext(code, ctx);
};
const run = load();

let n = 0;
const t = (name, fn) => { run("state.sessions=[{id:'s1',name:'t',mobIds:[],entries:[]}];state.current='s1';state.chars={};state.bonus=0;state.jobBonus=0;state.dropBonus=0"); fn(); n++; console.log("ok", name); };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ""} ${a} != ${b}`);
// a kill by whole hits: the damage of u uses (avg each) covers the Dummy's 10,000 HP, overshooting by less than one landed hit (max)
const overkill = (u, avg, max) => assert.ok(u * avg >= 10000 - 1e-6 && u * avg <= 10000 + max, `${u} uses × ${avg} vs 10000 HP`);
// a made-up monster, so the expected numbers don't depend on the exported tables
const MOB = "({id:-1,name:'Dummy',lv:50,hp:10000,exp:2000,el:'Water',elv:1,size:'L',race:'Brute',def:20,mdef:10,vit:30,int:20,hit100:200,flee95:250,atkMin:100,atkMax:200,drops:[]})";
// pick a job and character fields, then redo what renderAll does before the maths reads them
// Buy with Discount off unless a test turns it on, so prices are the NPC prices
const setup = (job, fields) => run(`state.job=${JSON.stringify(job)};state.chars={};state.recovery={discount:false};Object.assign(C(),${JSON.stringify(fields)});
  if(C().a&&${JSON.stringify(!!fields.a)})C().a={...C().a};SKFX=skillEffects(C());applyBuild();applyConsumables();`);

t("element table and weapon size modifiers", () => {
  assert.equal(run(`elemMult({el:'Water',elv:1},'Wind')`), 150);
  assert.equal(run(`elemMult({el:'Ghost',elv:4},'Neutral')`), 0);
  assert.equal(run(`elemMult({},'Fire')`), 100);                      // no element: Neutral 1
  assert.equal(run(`sizeMod({size:'L'},'Dagger')`), 50);
  assert.equal(run(`sizeMod({size:'S'},'Spear')`), 75);              // old saves' weapon names still work
});

t("physical damage per hit: weapon share takes size and element, status ATK stays Neutral", () => {
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", wElem: "Wind", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  // no STR typed, so no +0.5%/STR on weapon ATK. Pool = 300 × size 100% × Wind vs Water 150% + 2 × 100 status ATK × 100%
  const pool = 300 * 1.5 + 200, df = 20, soft = Math.floor((50 + 30) / 2);
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(pool * (4000 + df) / (4000 + 10 * df) - soft));
  run(`C().ignDef=50`);                                              // ignore DEF halves hard DEF only
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(pool * (4000 + 10) / (4000 + 100) - soft));
});

t("Assassin dual wield: both hands on basic attacks, hand masteries, left weapon's own size and element", () => {
  const basic = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  // gear side 300 = right weapon 200 + left weapon 80 + 20 other gear; no STR typed, so weapon ATK isn't scaled
  setup("Assassin", { atkTxt: "100+300", wAtk: 200, weapon: "One-handed sword", wElem: "Wind", lw: "Dagger", lwAtk: 80, lwElem: "Neutral", st: {}, a: basic });
  const df = 20, soft = Math.floor((50 + 30) / 2), hit = pool => Math.floor(pool * (4000 + df) / (4000 + 10 * df) - soft);
  // right: 1h sword vs Large 75% + other gear, Wind vs Water 150%; status ATK doubled, Neutral. No skill tree: masteries Lv 5
  const right = Math.floor(hit((200 * 0.75 + 20) * 1.5 + 2 * 100) * 100 / 100);
  // left: dagger vs Large 50%, Neutral; status ATK once
  const left = Math.floor(hit(80 * 0.5 + 100 + 20) * 80 / 100);
  assert.equal(run(`dmgPerHit(${MOB})`), right);
  assert.equal(run(`leftDmg(${MOB})`), left);
  near(run(`perUse(${MOB})`), right + left);
  run(`C().skills={"righthand-mastery":2,"lefthand-mastery":1}`);   // learned levels: 70% and 40%
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(hit((200 * 0.75 + 20) * 1.5 + 200) * 70 / 100));
  assert.equal(run(`leftDmg(${MOB})`), Math.floor(hit(80 * 0.5 + 120) * 40 / 100));
  run(`C().skills={}`);
  // Double Attack repeats only the right hand
  run(`C().a.hits=1.5`);
  near(run(`perUse(${MOB})`), right * 1.5 + left);
  // skills use the right hand only, at full damage, with status ATK once (not twice) while dual-wielding
  run(`C().a={...C().a,type:"phys",hits:1}`);
  assert.equal(run(`leftDmg(${MOB})`), 0);
  assert.equal(run(`dmgPerHit(${MOB})`), hit((200 * 0.75 + 20) * 1.5 + 100));
  // a katar (or any other job) is never dual wield, and the left weapon's ATK counts as equipment ATK
  setup("Assassin", { atkTxt: "100+300", wAtk: 200, weapon: "Katar", wElem: "Neutral", lw: "Dagger", lwAtk: 80, st: {}, a: basic });
  assert.equal(run(`dualOn()`), false);
  assert.equal(run(`leftDmg(${MOB})`), 0);
  setup("Rogue", { atkTxt: "100+300", wAtk: 200, weapon: "Dagger", lw: "Dagger", lwAtk: 80, st: {}, a: basic });
  assert.equal(run(`dualOn()`), false);
});

t("physical damage: cards and ATK % scale weapon + equipment ATK only, ATK % adds next to the cards", () => {
  const basic = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  // gear side 300 = weapon 200 + 100 other gear; status ATK 100 counts twice; Neutral weapon vs Water 1, 1h sword vs Large 75%
  setup("Knight", { atkTxt: "100+300", wAtk: 200, weapon: "One-handed sword", wElem: "Neutral", st: {}, rangePct: 15, a: basic });
  const df = 20, soft = Math.floor((50 + 30) / 2), hit = (pool, full = 1.15) => Math.floor(pool * full * (4000 + df) / (4000 + 10 * df) - soft);
  const post = 200 * 0.75 + 100;
  assert.equal(run(`dmgPerHit(${MOB})`), hit(post + 200));
  const B = (race, size) => `{race:{Brute:${race}},size:{L:${size}},ele:{},kind:{},all:0,group:{}}`;
  run(`C().bx={phys:${B(20, 10)},magic:${B(0, 0)}}`);                 // +20% vs Brute, +10% vs Large: each its own multiplier,
  assert.equal(run(`dmgPerHit(${MOB})`), hit(post * 1.2 * 1.1 + 200));  // on post ATK only, not status ATK
  run("C().atkPct=19");                                               // ATK +19%: post ATK × 19% added, not × the cards
  assert.equal(run(`dmgPerHit(${MOB})`), hit(post * (1.2 * 1.1 + 0.19) + 200));
  run("C().dmgBonus=10");                                             // the extra damage % box is on the whole hit
  assert.equal(run(`dmgPerHit(${MOB})`), hit(post * (1.2 * 1.1 + 0.19) + 200, 1.15 * 1.1));
});

t("ATK %: not in the status window's ATK; build mode and consumables pass it on as atkPct", () => {
  run(`state.job="Knight";state.chars={};C().mode='build';C().build={base:{str:50,agi:1,vit:1,int:1,dex:1,luk:1},gear:{}};C().cons={}`);
  const r = run(`(()=>{const a=BUILD.compute({base:{str:50,agi:1,vit:1,int:1,dex:1,luk:1},gear:{},extra:[]},"Knight",aspdBase).fields,
    b=BUILD.compute({base:{str:50,agi:1,vit:1,int:1,dex:1,luk:1},gear:{},extra:[["atk",null,null,40],["atk_percent",null,null,19]]},"Knight",aspdBase).fields;return {a,b}})()`);
  assert.equal(Number(r.b.atkTxt.split("+")[1]) - Number(r.a.atkTxt.split("+")[1]), 40);   // ATK +40 shows, ATK +19% doesn't
  assert.equal(r.b.atkPct, 19);
});

t("Assassin left weapon slows base ASPD by a quarter of its delay", () => {
  run(`state.job="Assassin";state.chars={}`);
  assert.equal(run(`aspdBaseOf({weapon:"Dagger",lw:""})`), 154);
  assert.equal(run(`aspdBaseOf({weapon:"Dagger",lw:"Dagger"})`), 144);
  assert.equal(run(`aspdBaseOf({weapon:"Dagger",lw:"One-handed sword"})`), 142);
  assert.equal(run(`aspdBaseOf({weapon:"Katar",lw:"Dagger"})`), 154);
  // a shield costs the job's shield penalty (Assassin 6), but never alongside a left-hand weapon
  assert.equal(run(`aspdStart({weapon:"Dagger",lw:"",shield:true})`), 148);
  assert.equal(run(`aspdStart({weapon:"Dagger",lw:"Dagger",shield:true})`), 144);
  run(`state.job="Knight"`);
  assert.equal(run(`aspdStart({weapon:"One-handed sword",shield:true})`), 156 - 5 - 5);
});

t("magic damage per hit: MATK × skill %, MDEF factor, soft MDEF, element", () => {
  setup("Wizard", { matkTxt: "200+100", st: {}, intTxt: "", a: { name: "x", type: "magic", pct: 100, hits: 3, el: "Wind", cast: 0, delay: 0, sp: 10, targets: 1 } });
  const md = 10, soft = Math.floor((50 + 20) / 4);
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor((300 * (1000 + md) / (1000 + 10 * md) - soft) * 1.5));
  run(`C().a.el='Water'`);                                           // Water vs Water 1: 25%
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor((300 * (1000 + md) / (1000 + 10 * md) - soft) * 0.25));
});

t("hit chance and uses per kill spread over misses", () => {
  setup("Knight", { atkTxt: "100+300", hitTxt: "250", wAtk: 0, weapon: "Two-handed spear", wElem: "Neutral", st: {}, a: { name: "x", type: "phys", pct: 100, hits: 2, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.equal(run(`hitChance(${MOB})`), 100);                         // 100 + 250 − 200, capped at 100
  run(`C().hitTxt="120"`);
  assert.equal(run(`hitChance(${MOB})`), 20);
  run(`C().hitTxt="1"`);
  assert.equal(run(`hitChance(${MOB})`), 5);                          // floor 5%
  run(`C().hitTxt="150"`);
  const d = run(`dmgPerHit(${MOB})`);
  near(run(`usesPerKill(${MOB})`), Math.ceil(10000 / (d * 2)) / 0.5);
  assert.equal(run(`C().a.type="magic";hitChance(${MOB})`), 100);      // magic always lands
});

t("uses per kill counts whole hits and crits: 3.5 hits of HP takes 4 hits, or 3 when two of them crit", () => {
  setup("Knight", { atkTxt: "100+300", hitTxt: "250", wAtk: 0, weapon: "Two-handed spear", wElem: "Neutral", crit: 30, critDmg: 0, st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const d = run(`dmgPerHit(${MOB})`), mob = `({...${MOB},hp:${Math.ceil(3.5 * d)}})`;
  near(run("critMul()"), 1.4);
  near(run(`critChance(${mob})`), 0.3);
  const two = c => 3 * c * c * (1 - c) + c ** 3;                         // 1.4 + 1.4 + 1 = 3.8 hits' worth; one crit's 3.4 isn't enough
  near(run(`usesPerKill(${mob})`), 3 * two(0.3) + 4 * (1 - two(0.3)));
  run(`C().hitTxt="150"`);                                              // 50% hit: crits always land, so 65% of swings land, 0.3 / 0.65 of them crits
  near(run(`usesPerKill(${mob})`), (3 * two(0.3 / 0.65) + 4 * (1 - two(0.3 / 0.65))) / 0.65);
  run(`C().crit=0`);
  near(run(`usesPerKill(${mob})`), 4 / 0.5);
});

t("cast time: variable part shrinks with DEX and INT, fixed part doesn't", () => {
  setup("Wizard", { st: { dex: "60" }, intTxt: "70", a: { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", vct: 4, fct: 1, cast: 5, delay: 0, sp: 0, targets: 1 } });
  near(run(`vctFactor()`), 1 - Math.sqrt((2 * 60 + 70) / 530));
  near(run(`castSec()`), 4 * (1 - Math.sqrt(190 / 530)) + 1);
  run(`C().st.dex="230";C().intTxt="70"`);                            // 2×230 + 70 = 530: no variable cast left
  near(run(`castSec()`), 1);
});

t("skill delay: after-cast delay % only cuts the after-cast delay; the attack interval overlaps the cast", () => {
  const SK = { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", vct: 0, fct: 0, cast: 0, delay: 0.7, gcd: 0.3, cd: 0.7, sp: 0, targets: 1 };
  setup("Wizard", { st: {}, intTxt: "", aspd: 190, acdPct: 30, hitScale: 0, a: SK });
  near(run("delaySec()"), 0.7);                                       // the cooldown holds you: 30% off the 0.3 s after-cast delay is wasted
  run(`C().a={...C().a,cd:0.1}`);
  near(run("delaySec()"), 0.21);                                      // no long cooldown: the % now counts
  run(`C().a={...C().a,cd:0,gcd:0.3};C().acdPct=0`);
  near(run("useSec()"), 0.3);                                         // no cast, 0.3 s delay: ASPD 190 (0.2 s) is past the cap
  run(`C().aspd=175`);
  near(run("useSec()"), 0.5);                                         // ASPD 175: the 0.5 s attack interval holds you
  run(`C().aspd=150;C().a={...C().a,vct:2,cast:2}`);
  near(run("useSec()"), 2.3);                                         // a 2 s cast covers the 1 s attack interval: 2 + 0.3, not 2 + 1
  run(`C().a={...C().a,delay:0.5};delete C().a.cd;delete C().a.gcd;C().acdPct=20`);
  near(run("delaySec()"), 0.4);                                       // a typed delay is an after-cast delay
});

t("fixed cast %: only the highest cut counts", () => {
  run(`C().mode='build';C().a={name:'x',type:'magic',pct:100,hits:1,el:'Fire',cast:1,delay:0,sp:0,targets:1};C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{}}`);
  const r = run(`BUILD.compute({base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{},extra:[["cast_time_fixed_percent",null,null,-30],["cast_time_fixed_percent",null,null,-50],["cast_time_variable_percent",null,null,-10],["cast_time_variable_percent",null,null,-20]]},"Wizard",aspdBase).fields`);
  assert.equal(r.fctPct, 50);
  assert.equal(r.vctPct, 30);                                          // variable cast % cuts add up
});

t("party Even Share and EXP bonus", () => {
  // in-game kills with +10% EXP item and +10% EXP gear
  run(`state.bonus=10;C().bx={exp:{all:10,race:{}}};cur().partyN=3`);
  assert.equal(run(`killExp({exp:32822})`), 15753);                             // Boulder Dwarf Captain, party of 3
  run(`cur().partyN=4`);
  assert.equal(run(`killExp({exp:32822})`), 12800);                   // Boulder Dwarf Captain, party of 4
  run(`cur().partyN=2`);
  assert.equal(run(`killExp({exp:33361})`), 22017);                             // Boulder Dwarf Squad Leader, party of 2
  run(`cur().partyN=1`);
  assert.equal(run(`killExp({exp:32822})`), 39386);                             // solo: 32,822 × 1.20, rounded down
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].forEach((p, i) => { run(`cur().partyN=${i + 1}`); assert.equal(run(`partyBonus()`), p); });
});

t("job EXP per kill: gear counts for job EXP, an item's base-only EXP % doesn't", () => {
  // in game, party of 3: Captain (job 6,564) with 10% gear gave 14,441 / 2,888, Squad Leader (job 6,672) with an "EXP +10%" item
  // gave 14,679 / 2,669; the game shares by damage dealt, so these come out 1 EXP above the model
  run(`state.bonus=0;state.jobBonus=0;C().bx={exp:{all:10,race:{}}};cur().partyN=3`);
  assert.equal(run(`killExp({exp:32822,job:6564})`), 14440);
  assert.equal(run(`killJobExp({exp:32822,job:6564})`), 2887);
  run(`state.bonus=10;delete C().bx`);
  assert.equal(run(`killExp({exp:33361,job:6672})`), 14678);
  assert.equal(run(`killJobExp({exp:33361,job:6672})`), 2668);
  run(`state.jobBonus=10`);                                            // [Event] Account EXP Buff: EXP +10%, Job EXP +10%
  assert.equal(run(`killJobExp({exp:33361,job:6672})`), 2934);
});

t("tracker: EXP rate across a level-up, with paused time left out", () => {
  const h = 36e5, t0 = 1e12;
  run(`cur().entries=[{t:${t0},lv:10,pct:50},{t:${t0 + h},lv:11,pct:25}];cur().pauses=[]`);
  const exp = run("EXP_TABLE[10]") * 0.5 + run("EXP_TABLE[11]") * 0.25;
  let s = run("stats(cur())");
  near(s.avgRaw, exp);
  near(s.nextH, run("EXP_TABLE[11]") * 0.75 / exp);
  run(`cur().pauses=[{from:${t0 + h / 4},to:${t0 + h / 2}}]`);        // 15 min away: same EXP over 45 min
  s = run("stats(cur())");
  near(s.avgRaw, exp / 0.75);
  assert.equal(s.spanMin, 45);
});

t("tracker: entries on a picked date, and pasted times running past midnight", () => {
  assert.equal(run(`entryTime(21,30,"2026-10-04")`), new Date(2026, 9, 4, 21, 30).getTime());
  assert.deepEqual([...run(`pasteTimes([[23,50],[0,10],[0,40]],"2026-10-04")`)],
    [new Date(2026, 9, 4, 23, 50), new Date(2026, 9, 5, 0, 10), new Date(2026, 9, 5, 0, 40)].map(d => d.getTime()));
  const a = new Date(2026, 9, 4, 23, 50).getTime(), b = new Date(2026, 9, 5, 0, 10).getTime();
  assert.equal(run(`multiDay([{t:${a - 6e5}},{t:${a}}])`), false);
  assert.equal(run(`multiDay([{t:${a}},{t:${b}}])`), true);
});

t("tracker: pasted lines, with or without a time", () => {
  const p = line => { const r = run(`pasteLine(${JSON.stringify(line)})`); return r && [...r] };
  assert.deepEqual(p("15:05 17.9% 63%"), [15, 5, 17.9, 63]);
  assert.deepEqual(p("1505 17.9%"), [15, 5, 17.9, null]);
  assert.deepEqual(p("[09:40] 2.5% / 80%"), [9, 40, 2.5, 80]);
  // no time: the current time is filled in later
  assert.deepEqual(p("17.9% 63%"), [null, null, 17.9, 63]);
  assert.deepEqual(p("17.9"), [null, null, 17.9, null]);
  assert.deepEqual(p("100% 50%"), [null, null, 100, 50]);
  assert.deepEqual(p("45.123% 12%"), [null, null, 45.123, 12]);
  // the % signs can be left out
  assert.deepEqual(p("15:05 17.9 63"), [15, 5, 17.9, 63]);
  assert.deepEqual(p("20.4 65"), [null, null, 20.4, 65]);
  assert.equal(p("25:00 17%"), null);
  assert.equal(p("15:05"), null);
  assert.equal(p(""), null);
});

t("tracker: job EXP % wraps at a job level-up", () => {
  const t0 = 1e12;
  run(`cur().entries=[{t:${t0},lv:10,pct:1,jpct:80},{t:${t0 + 18e5},lv:10,pct:2,jpct:95},{t:${t0 + 36e5},lv:10,pct:3,jpct:10}];cur().pauses=[]`);
  const j = run("jobRate(cur())");
  near(j.rate, 15 + 15);                                              // 80 → 95 → (100) → 10 in one hour
  assert.equal(j.last, 10);
});

t("tracker: a small job EXP % drop is a loss, not a level-up", () => {
  const t0 = 1e12;
  // 65 → 69.4 → 78.2 (mistyped) → 71.7: the typo cancels out, the session gained 6.7%, not 6.7% + a whole level
  run(`cur().entries=[{t:${t0},lv:67,pct:0.5,jpct:65},{t:${t0 + 36e5},lv:67,pct:5,jpct:69.4},{t:${t0 + 72e5},lv:67,pct:6.8,jpct:78.2},{t:${t0 + 108e5},lv:67,pct:7.3,jpct:71.7}];cur().pauses=[]`);
  const j = run("jobRate(cur())");
  near(j.rate, 6.7 / 3);
  assert.equal(j.last, 71.7);
});

t("tracker: a job level-up counts the job EXP it took when job levels are known", () => {
  const t0 = 1e12, tb = run("JOB_EXP.second");
  // Sage Job Lv 66 at 90% → Job Lv 67 at 10% in one hour: 10% of Job Lv 66 + 10% of Job Lv 67, in % of Job Lv 67
  run(`state.job='Sage';state.chars={};C().jobLv=67;cur().job='Sage';cur().entries=[{t:${t0},lv:66,pct:1,jpct:90,jlv:66},{t:${t0 + 36e5},lv:66,pct:2,jpct:10,jlv:67}];cur().pauses=[]`);
  near(run("jobRate(cur())").rate, (0.1 * tb[65] + 0.1 * tb[66]) / tb[66] * 100);
});

t("tracker: entry job levels run across sessions of the same job", () => {
  const t0 = 1e12, h = 36e5;
  // an older session (a) and the current one (b); Job % drops 95 → 5 in b, a job level-up
  run(`C().jobLv=10;state.sessions=[{id:'a',name:'a',mobIds:[],entries:[{t:${t0},lv:5,pct:1,jpct:80},{t:${t0 + h},lv:5,pct:2,jpct:90}]},
    {id:'b',name:'b',mobIds:[],entries:[{t:${t0 + 2 * h},lv:5,pct:3,jpct:95},{t:${t0 + 3 * h},lv:5,pct:4,jpct:5}]}];state.current='b'`);
  const lv = id => run(`(()=>{const s=state.sessions.find(x=>x.id==='${id}'),m=entryJobLvs(s);return s.entries.map(e=>m.get(e))})()`);
  assert.deepEqual([...lv("b")], [9, 10]);                            // only the newest entry is your current job level
  assert.deepEqual([...lv("a")], [9, 9]);                             // opening the older session doesn't make it Job Lv 10
  // a job level saved on an entry wins over working it out
  run(`state.sessions[0].entries[0].jlv=8`);
  assert.deepEqual([...lv("a")], [8, 8]);
});

t("job EXP: the last job level is the max and needs no EXP", () => {
  run(`state.job="Novice";state.chars={};state.goalJobLv=null`);
  const t = run("JOB_EXP.novice");
  assert.equal(run("jobMax()"), 10);                                  // Novice Job Lv 10 is the max (official guide)
  assert.equal(run("C().jobLv=9;jobNeed()"), t[8]);
  assert.equal(run("C().jobLv=10;jobNeed()"), null);
  assert.equal(run("jobMax('first')"), 50);
  assert.equal(run("jobMax('second')"), 70);
  // job goal from Job Lv 1 at 0% to the max: every entry but the max level's own
  const t0 = 1e12;
  run(`C().jobLv=1;cur().entries=[{t:${t0},lv:10,pct:0,jpct:0},{t:${t0 + 36e5},lv:10,pct:1,jpct:10}];cur().pauses=[]`);
  const g = run("renderJobGoal(cur())"), rate = 10 / 100 * t[0];   // 10% of Job Lv 1 per hour
  assert.equal(g.hi, 10);
  near(g.pts[g.pts.length - 1].h * rate, t.slice(0, 9).reduce((x, y) => x + y, 0) - 0.1 * t[0]); // already 10% into Job Lv 1
  assert.equal(run("C().jobLv=10;renderJobGoal(cur())"), undefined); // at the max: a note, no goal
});

t("walking time: the current session first, then another of the same job, then 2s", () => {
  setup("Knight", { atkTxt: "100+300", hitTxt: "400", wAtk: 0, weapon: "Two-handed spear", wElem: "Neutral", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const t0 = 1e12, sess = (id, pct) => `{id:'${id}',name:'${id}',job:'Knight',mobIds:[1002],entries:[{t:${t0},lv:30,pct:10},{t:${t0 + 36e5},lv:30,pct:${pct}}]}`;
  run(`state.sessions=[${sess("a", 20)},${sess("b", 15)},{id:'c',name:'c',mobIds:[],entries:[]}];state.current='b'`);
  const walk = id => run(`sessionPace(state.sessions.find(s=>s.id==='${id}')).walk`);
  assert.ok(walk("a") > 1 && walk("b") > walk("a"));                 // slower EXP, so more walking per kill
  near(run("walkSec()"), walk("b"));
  run("state.current='c'");
  near(run("walkSec()"), walk("a"));                                 // the current session has no pace yet
  run("state.sessions.forEach(s=>s.job='Mage')");
  assert.equal(run("walkSec()"), 2);                                  // no session of this job
});

t("session map: auto is the best open map, a picked one wins while its monsters spawn there", () => {
  run(`cur().mobIds=[];cur().name='New session';toggleSessMob(1002)`);
  const om = run(`JSON.stringify(openMaps(MOBS.find(m=>m.id===1002)))`), maps = JSON.parse(om).map(x => x[0]);
  assert.ok(maps.length >= 2);
  assert.equal(run(`sessMap(cur())`), maps[0]);                      // nothing picked: the old best-map rule
  assert.equal(run(`cur().name`), run(`mapCode(${JSON.stringify(maps[0])})`));
  run(`cur().map=${JSON.stringify(maps[1])}`);
  assert.equal(run(`sessMap(cur())`), maps[1]);
  assert.equal(run(`sessMix(cur()).mp`), maps[1]);                   // spawn weights come from the picked map
  assert.equal(run(`mobMap(MOBS.find(m=>m.id===1002))`), maps[1]);   // the Map planner follows it
  run(`cur().map='no_such_map'`);
  assert.equal(run(`sessMap(cur())`), maps[0]);                      // a map none of them spawn on falls back to auto
  run(`cur().map=${JSON.stringify(maps[1])};toggleSessMob(1002)`);
  assert.equal(run(`cur().map`), undefined);                         // removing its monsters drops the pick
});

t("Map planner's Farming this map now: the map's hunted monsters, and a picked map holds even when marked closed", () => {
  const mp = run(`JSON.stringify(openMaps(MOBS.find(m=>m.id===1002))[1][0])`);
  const ids = JSON.parse(run(`JSON.stringify(mapHuntIds(${mp}))`));
  assert.ok(ids.includes(1002) && ids.length > 1);
  assert.ok(!run(`mapHuntIds(${mp}).some(id=>MOBS.find(m=>m.id===id).boss)`));
  run(`cur().mobIds=mapHuntIds(${mp});cur().map=${mp}`);
  assert.equal(run(`sessMap(cur())`), JSON.parse(mp));
  run(`state.closed=[...(state.closed||[]),${mp}]`);
  assert.equal(run(`sessMap(cur())`), JSON.parse(mp));              // closed: no longer in the auto list, but your pick stays
  assert.notEqual(run(`sessMapAuto(cur())`), JSON.parse(mp));
  run(`state.closed=state.closed.filter(c=>c!==${mp})`);
});

t("zeny per kill: the loot value scaled by the drop rate bonus", () => {
  assert.equal(run(`zenyKill({loot:200})`), 200);
  assert.equal(run(`state.dropBonus=50;zenyKill({loot:200})`), 300);
  assert.equal(run(`zenyKill({})`), 0);
});

t("a restored save is cleaned up before anything uses it", () => {
  // what a broken or hand-made backup or share link could hold
  const bad = "x\"'><img src=x onerror=1>";
  const app = load({ job: "Sage", tab: bad, refTier: bad, current: "s1", prices: { "904": 3000, [bad]: 5000, "938": bad }, npcPrices: { "904": 10, [bad]: 1 },
    sessions: [{ id: "s1", name: "S", mobIds: [1002], entries: [{ t: 1e12, lv: 40, pct: 10 }, { t: 1e12 + 36e5, lv: 40, pct: 30 }],
      pauses: [{ from: bad, to: 1e12 + 1e6 }, { from: 1e12 + 1e5, to: bad }, { from: 1e12 + 2e5, to: 1e12 + 3e5 }, { from: 1e12 + 4e5 }] }],
    chars: { Sage: { skills: { "spell-fist": bad, "fire-bolt": "7", hindsight: 3.6, "cold-bolt": -2 }, build: { check: { atk: bad, hit: "250", sp: "" } } }, Knight: "junk" } });
  assert.deepEqual(app("JSON.stringify(cur().pauses)"), JSON.stringify([{ from: 1e12 + 2e5, to: 1e12 + 3e5 }, { from: 1e12 + 4e5 }]));
  assert.deepEqual(app("JSON.stringify(state.chars.Sage.skills)"), JSON.stringify({ "fire-bolt": 7, hindsight: 4, "basic-skill": 9, "energy-coat": 1, "create-elemental-converter": 1 }));   // the Novice days and the job change give these three
  assert.deepEqual(app("JSON.stringify(state.chars.Sage.build.check)"), JSON.stringify({ hit: 250 }));
  assert.equal(app("'Knight' in state.chars"), false);
  assert.deepEqual(app("JSON.stringify(state.prices)"), JSON.stringify({ "904": 3000 }));   // item ids only, numbers only
  assert.deepEqual(app("JSON.stringify(state.npcPrices)"), JSON.stringify({ "904": 10 }));
  assert.equal(app("state.tab"), "home");                              // not one of the tabs: back to Home
  assert.ok(app("stats(cur())").avgRaw > 0);                            // the tracker maths still runs
});

t("Vitata: you cast Heal Lv1, so healing takes time away from attacking", () => {
  setup("Sage", { matkTxt: "300+200", aspd: 170, defTxt: "10+10", maxSp: 800, maxHp: 4000, hitScale: 1, mobInterval: 1.5, st: {}, intTxt: "",
    sage: { hsOn: false, hsAuto: false }, ec: { on: false }, cards: { vitata: false, healSp: 13, healHp: 357, spBonus: 25 } });
  const off = run(`fightSec(${MOB})`);
  assert.equal(run(`healShare(${MOB})`), 0);                         // no Vitata: no healing
  run("CRD().vitata=true");
  const d = run(`defense(${MOB})`), heals = d.hp / 357, f = heals * Math.max(0.3, 1 / run("atkPerSec()"));
  near(run(`healsPerSec(${MOB})`), heals);
  near(run(`healShare(${MOB})`), f);
  assert.ok(f > 0 && f < 1);
  near(run(`fightSec(${MOB})`), off / (1 - f));                       // the fight takes longer by the time spent healing
  near(d.healSP, heals * 13 * 1.25);                                  // Heal's SP carries Vitata's +25%
  run("CRD().healHp=0.01");                                             // a heal too small to keep up
  assert.equal(run(`fightSec(${MOB})`), Infinity);
});

t("skill buffs: element and crit damage bonuses don't become damage on every hit", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  // hit with the buff off and on; the skill is learned at max and the buff ticked, as on the Skills card
  const hit = (job, slug, fields) => [false, true].map(on => run(`(()=>{state.job=${JSON.stringify(job)};state.chars={};const c=C();Object.assign(c,${JSON.stringify(fields)});
    c.skills={${JSON.stringify(slug)}:skOf(state.job)[${JSON.stringify(slug)}].max};c.buffs={${JSON.stringify(slug)}:${on}};
    SKFX=skillEffects(c);applyBuild();applyConsumables();return {d:dmgPerHit(${MOB}),k:bonusMul(${MOB},c.a.type==="magic"),crit:SKFX.buffStat.filter(b=>b[0]==="crit_damage_percent").reduce((x,b)=>x+b[3],0)}})()`));
  const phys = el => ({ atkTxt: "100+300", wAtk: 0, wElem: el, st: {}, a: AUTO });
  // Lady Luck: "CRIT +10, Critical Damage +20%" only adds crit damage
  let [off, on] = hit("Dancer", "lady-luck", phys("Neutral"));
  assert.equal(on.d, off.d);
  assert.equal(on.crit, 20);
  // Volcano: "Fire Damage +20%" counts for a Fire weapon, not a Water one (its ATK +30 counts for both)
  const vol = hit("Sage", "volcano", phys("Water")), volFire = hit("Sage", "volcano", phys("Fire"));
  near(vol[1].k, vol[0].k, "Water weapon bonus");                       // its ATK +30 still raises the hit
  near(volFire[1].k / volFire[0].k, 1.2, "Fire weapon bonus");
  // Endow Blaze: "Fire Magical Damage +5%" leaves physical hits alone and adds 5% to Fire spells
  [off, on] = hit("Sage", "endow-blaze", phys("Fire"));
  assert.equal(on.d, off.d);
  const bolt = { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", cast: 0, delay: 0, sp: 0, targets: 1 };
  [off, on] = hit("Sage", "endow-blaze", { matkTxt: "300+200", st: {}, intTxt: "", a: bolt });
  near(on.k / off.k, 1.05, "Fire spell bonus");
  assert.ok(on.d > off.d);
});

t("monster table filters", () => {
  const m = (e, v, txt) => run(`matchF(${JSON.stringify(e)},${JSON.stringify(v)},${JSON.stringify(txt ?? null)})`);
  assert.ok(m("<350", 300) && !m("<350", 350));
  assert.ok(m("100-200", 150) && !m("100-200", 201));
  assert.ok(m("fire", null, "Fire 2") && !m("fire", null, "Water 1"));
  assert.ok(m("-", null) && !m("-", 5));
  assert.ok(m("<10 or >100", 150) && !m("<10 or >100", 50));
});

t("info and market tables: filters, header sort, blanks last, saved sort on a missing column falls back", () => {
  const rows = `[{id:"909",pl:500,npc:3,d:null},{id:"910",pl:null,npc:10,d:null},{id:"911",pl:2000,npc:null,d:null}]`;
  const ids = () => run(`tableRows("priceTable",${rows}).map(r=>r.id).join()`);
  run(`state.tfilt={};state.tsort={priceTable:["pl",-1]}`);
  assert.equal(ids(), "911,909,910");                                   // no player price sorts last either way
  run(`state.tsort={priceTable:["pl",1]}`);
  assert.equal(ids(), "909,911,910");
  run(`state.tfilt={priceTable:{npc:"<5 or -"}}`);
  assert.equal(ids(), "909,911");
  run(`state.tfilt={};state.tsort={priceTable:["constructor",1]}`);     // not a column: the table's own default (name)
  assert.equal(run(`tblSort("priceTable").join()`), "name,1");
  run(`state.tsort={}`);
});

t("Hunter tables: an older save's sort carries over to the shared table sort", () => {
  const r = load({ bestSort: "secT", bestDir: 1, huntSort: "cost", huntDir: -1 });
  assert.equal(r(`tblSort("bestTable").join()`), "secT,1");
  assert.equal(r(`tblSort("huntTable").join()`), "cost,-1");
  assert.equal(r(`"bestSort" in state||"huntDir" in state`), false);
  assert.equal(run(`tblSort("huntTable").join()`), "net,-1");          // a new save starts on net zeny / hr
});

t("map names: in-game codes, source codes and unique names all find the same map", () => {
  assert.equal(run(`mapCode("sp_d05")`), "in_sphinx5");
  assert.equal(run(`mapName("sp_d05")`), "Sphinx B5F");
  for (const s of ["in_sphinx5", "SP_D05", "sp_dun05", " Sphinx B5F "]) assert.equal(run(`mapKey(${JSON.stringify(s)})`), "sp_d05");
  assert.equal(run(`mapKey("mjo_dun03")`), "mjo_d03");
  assert.equal(run(`mapKey("Prontera Field")`), "prontera field");      // a name many maps share stays as typed
  assert.equal(run(`mapCode("nowhere")`), "nowhere");
  run(`state.regions={};state.closed=["in_sphinx5"]`);                  // a map closed by its in-game code
  assert.ok(run(`isClosed("sp_d05")`) && !run(`isClosed("sp_d04")`));
  run(`state.closed=[]`);
});

t("roadmap: regions open on their update's day, or after its month when the day isn't known, unless you say otherwise", () => {
  run(`var ROADMAP_TODAY="2026-10-19";state.regions={};state.closed=[]`);
  assert.equal(run(`regionOf("tow_d01").id`), "ct");
  assert.ok(run(`isClosed("tow_d01")&&isClosed("alde_dun04")&&isClosed("gl_chu")`));  // Clock Tower update: 29 October
  assert.ok(!run(`isClosed("pay_d00")||isClosed("um_fild01")||isClosed("cmd_fild01")`)); // not on the roadmap (Umbala, Comodo are out): open
  assert.ok(!run(`isClosed("sp_d05")||isClosed("maz_d01")||isClosed("mjo_d03")`)); // opened before Clock Tower
  assert.ok(!run(`isClosed("an_d01")||isClosed("an_d02")`));                     // Ant Hell is open, only its memorial isn't
  assert.equal(run(`upStatus(ROADMAP.find(u=>u.name==="Clock Tower"))`), "due 29 Oct 2026");
  assert.equal(run(`upStatus(ROADMAP.find(u=>u.name==="Ant Hell memorial"))`), "next month");
  assert.equal(run(`upStatus(ROADMAP.find(u=>u.name==="Glast Heim"))`), "in 2 months");
  assert.equal(run(`capTxt(capNow())`), "Base 70 / Job 70");                       // the 1 October update raised it, not Clock Tower
  assert.equal(run(`upStatus(ROADMAP.find(u=>u.name==="Level 70 & new dungeons"))`), "out");
  assert.equal(run(`ROADMAP.find(u=>u.name==="Clock Tower").cap`), undefined);
  assert.equal(run(`mapArrives("gl_chu")`), "Glast Heim update, Dec 2026");
  const alarm = `MOBS.find(m=>m.name==="Alarm")`;                                      // only in the Clock Tower
  assert.ok(run(`!openMaps(${alarm}).length`));
  assert.equal(run(`mobArrives(${alarm})`), "Clock Tower update, 29 Oct 2026");
  run(`ROADMAP_TODAY="2026-10-28"`);
  assert.ok(run(`isClosed("tow_d01")`));
  run(`ROADMAP_TODAY="2026-10-29"`);                                                 // its day has come: open
  assert.ok(!run(`isClosed("tow_d01")`));
  run(`ROADMAP_TODAY="2026-11-01"`);
  assert.ok(!run(`isClosed("tow_d01")`) && run(`isClosed("gl_chu")`));
  assert.ok(run(`isClosed("iz_d03")&&isClosed("iz_d04")`) && !run(`isClosed("iz_d02")`)); // Byalan 4F & 5F: 12 November
  assert.equal(run(`regionOf("iz_dun04").id`), "by");
  assert.equal(run(`mapArrives("iz_d04")`), "Byalan Dungeon 4F & 5F update, 12 Nov 2026");
  run(`ROADMAP_TODAY="2026-11-12"`);
  assert.ok(!run(`isClosed("iz_d03")||isClosed("iz_d04")`));
  run(`ROADMAP_TODAY="2026-11-01"`);
  assert.equal(run(`capTxt(capNow())`), "Base 70 / Job 70");
  assert.equal(run(`mapArrives("tow_d01")`), "");
  run(`ROADMAP_TODAY="2026-10-19"`);
  run(`toggleRegion("ct")`);                                                          // your call: open before the roadmap says so
  assert.ok(!run(`isClosed("tow_d01")`) && run(`state.regions.ct`) === false && run(`mapArrives("tow_d01")`) === "");
  run(`toggleRegion("ct")`);                                                          // back to the roadmap
  assert.ok(run(`isClosed("tow_d01")`) && !run(`"ct" in state.regions`));
  run(`ROADMAP_TODAY="2026-11-01";toggleRegion("ct")`);                              // closed after it's out
  assert.ok(run(`isClosed("tow_d01")&&state.regions.ct===true`));
  run(`state.regions={};ROADMAP_TODAY=undefined`);
});

t("monsters with no EXP in the data are listed but left out of EXP averages", () => {
  const myst = run(`MOBS.find(m=>m.name==="Mist")`);
  assert.ok(myst.expUnknown && myst.exp === 0);
  assert.equal(run(`fmtExp(MOBS.find(m=>m.name==="Mist"))`), "?");
  assert.ok(run(`MAPMOBS.mjo_d03.some(x=>x.m.name==="Mist"&&x.n===39)`));
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const r = run(`mapStats0("mjo_d03",2)`);
  assert.equal([...r.unkNames].sort().join(), "Cramp,Giearth,Mist");
  // only the monsters with known EXP make up EXP / kill
  const known = run(`MAPMOBS.mjo_d03.filter(x=>!x.m.boss&&!x.m.expUnknown).map(x=>x.m.name)`);
  assert.ok(known.length && !known.includes("Mist"));
  assert.ok(r.epk > 0 && isFinite(r.epm));
});

t("mini bosses are tagged apart from Boss class: Vocal is a mini boss, Owl Duke only Boss class", () => {
  const mob = name => `MOBS.find(m=>m.name===${JSON.stringify(name)})`;
  assert.equal(run(`JSON.stringify([${mob("Vocal")}.mini,${mob("Vocal")}.boss,${mob("Eclipse")}.mini,${mob("Eclipse")}.boss,${mob("Owl Duke")}.mini,${mob("Owl Duke")}.boss,${mob("Poring")}.mini])`),
    JSON.stringify([true, false, true, true, false, true, false]));
  // every listed mini boss is a monster we have, spawning at most twice on a map
  assert.equal(run(`[...MINIBOSS].filter(id=>!MOBS.some(m=>m.id===id)).length`), 0);
  assert.ok(run(`MOBS.filter(m=>m.mini).every(m=>(SPAWN[m.id]||[]).every(([,n])=>n<=5))`));
  assert.ok(run(`BOSS_PILL(${mob("Vocal")})`).includes(">mini boss<") && run(`BOSS_PILL(${mob("Vocal")})`).includes("not Boss class"));
  assert.ok(run(`BOSS_PILL(${mob("Owl Duke")})`).includes(">boss<"));
  assert.equal(run(`BOSS_PILL(${mob("Poring")})`), "");
  // the name filter text carries the tag, so "mini" finds them
  assert.ok(run(`matchF("mini",null,colText(${mob("Vocal")},"name"))`) && !run(`matchF("mini",null,colText(${mob("Poring")},"name"))`));
});

t("Amon Ra is in the monster tables as an MVP, Boss class, on Pyramid B2F", () => {
  const ra = `MOBS.find(m=>m.id===1511)`;
  assert.equal(run(`JSON.stringify([${ra}.name,${ra}.lv,${ra}.mvp,${ra}.boss,${ra}.mini,${ra}.el,${ra}.size,${ra}.race,${ra}.expUnknown])`),
    JSON.stringify(["Amon Ra", 69, true, true, false, "Earth", "L", "Demi-Human", true]));
  assert.equal(run(`MOBS.filter(m=>m.mvp).length`), run(`MVP.size`));
  // every MVP is a Boss-class monster we have, one on its map, and none is a mini boss
  assert.ok(run(`MVP.size`) > 20);
  assert.ok(run(`MOBS.filter(m=>m.mvp).every(m=>m.boss&&!m.mini&&(SPAWN[m.id]||[]).every(([,n])=>n===1||n===null))`));
  assert.ok(run(`MOBS.filter(m=>m.mvp&&SPAWN[m.id]).length`) >= 15);
  // the client's table doesn't have Maya, Mistress, Phreeoni, Eddga, Pharaoh or Drake on their maps, and no estimate stands in
  assert.equal(run(`[1147,1059,1159,1115,1157,1112].filter(i=>SPAWN[i]).length`), 0);
  assert.equal(run(`MOBS.find(m=>m.name==="Baphomet").mvp`), true);
  assert.equal(run(`JSON.stringify(SPAWN[1511])`), JSON.stringify([["pry_d06", 1, 1]]));
  assert.ok(run(`BOSS_PILL(${ra})`).includes(">MVP<"));
  assert.ok(run(`matchF("mvp",null,colText(${ra},"name"))`));
  // the Boss dropdown: MVPs lists it, Bosses and No bosses leave it out
  assert.equal(run(`JSON.stringify(["mvp","boss","noboss",""].map(b=>mobFOk(${ra},{boss:b})))`), JSON.stringify([true, false, false, true]));
  assert.equal(run(`mobFOk(MOBS.find(m=>m.name==="Owl Duke"),{boss:"mvp"})`), false);
  // its drops count as MVP drops in Item info, and it's no longer an other source there (Safety Ring)
  assert.equal(run(`itemFromOk("2615","mvp")`), true);
  assert.doesNotMatch(run(`otherSourcesHtml("2615")`), /Amon Ra/);
});

t("Zeny Hunter: net zeny per hour is loot less skill and item costs, and counts monsters with no EXP", () => {
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, autoSp: false, potOn: false, cons: [], hpRegen6: 1, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const mob = MOB.replace("drops:[]", "drops:[],loot:500");
  const r = run(`huntMob0(${mob},2)`), sec = run(`fightSec(${mob})`) + 2;
  near(r.zk, 500); near(r.loot, 500 * 3600 / sec);
  assert.ok(r.hpZ > 0); near(r.cost, r.hpZ); near(r.net, r.loot - r.hpZ);  // the only cost: HP items for the HP it takes off you
  run(`state.dropBonus=50`);                                            // drop rate bonus scales loot
  near(run(`huntMob0(${mob},2)`).loot, 750 * 3600 / sec);
  run(`state.dropBonus=0;C().a.zeny=100`);                              // Mammonite-style zeny per use comes off each kill
  near(run(`huntMob0(${mob},2)`).zk, 500 - 100 * run(`usesPerKill(${mob})`));
  run(`C().a.zeny=0;C().potOn=true;C().potMin=30;C().potPrice=1000`);   // an ASPD potion every 30 min: 2,000 z/hr
  const p = run(`huntMob0(${mob},2)`);
  near(p.cost, 2000 + p.hpZ); near(p.net, p.loot - 2000 - p.hpZ);
  run(`C().potOn=false`);
  // Mist has no EXP in the data but still drops loot, so it counts towards zeny on its map
  const map = run(`huntMap0("mjo_d03",2)`);
  assert.ok(map.earn.some(x => x.m.name === "Mist") && map.epm > 0 && map.loot > 0);  // net can go below 0: this character loses ~4k HP/min there
  // monsters you skip are left out
  const id = run(`MOBS.find(m=>m.name==="Mist").id`);
  run(`state.skipMobs=[${id}]`);
  assert.ok(!run(`huntMap0("mjo_d03",2)`).earn.some(x => x.m.name === "Mist"));
  run(`state.skipMobs=[]`);
});

t("skill items: catalysts and arrows per use, your prices, support casts and ground buffs come off zeny", () => {
  const pre = (job, name) => `({...JOBS.${job}.p.find(p=>p.name.startsWith(${JSON.stringify(name)}))})`;
  setup("Alchemist", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed axe", st: {}, autoSp: false, potOn: false, cons: [], });
  run(`C().a=${pre("Alchemist", "Acid Bomb")}`);
  assert.equal(run(`useItems().map(x=>consName(x.id)+" "+x.qty).join()`), "Acid Bottle 1,Bottle Grenade 1");
  near(run(`useZeny()`), 200 + 200);                                     // NPC prices from data/consumables.js
  run(`C().itemPrices={7136:350}`);                                      // a market price for Acid Bottles
  near(run(`useZeny()`), 350 + 200);
  const mob = MOB.replace("drops:[]", "drops:[],loot:5000");
  near(run(`skillZeny(${mob})`), 550 * run(`usesPerKill(${mob})`));
  const r = run(`mobRow0(${mob},2)`);                                    // zeny per kill and per hour are after the bottles
  near(r.zk, 5000 - r.zc); near(r.zph, r.zk / r.tot * 3600 - r.hc);
  run(`C().supCasts={bomb:0.5}`);                                         // half a Bomb a kill: a Bottle Grenade every other kill
  assert.equal(run(`supShown().map(s=>s.key).join()`), "bomb");             // no skill tree: offered
  run(`C().skills={"acid-terror":5}`);                                     // a skill tree without Bomb: still shown, as casts are typed
  assert.equal(run(`supShown().map(s=>s.key).join()`), "bomb");
  run(`C().supCasts={}`); assert.equal(run(`supShown().length`), 0);     // ... and hidden once they're cleared
  run(`C().skills.bomb=1`); assert.equal(run(`supShown().map(s=>s.key).join()`), "bomb");
  run(`C().skills={};C().supCasts={bomb:0.5}`);
  near(run(`skillZeny(${mob})`), 550 * run(`usesPerKill(${mob})`) + 100);
  // arrows: bows fire one per basic attack and a.arrows per skill, of the attack's element; melee weapons fire none
  setup("Archer", { atkTxt: "100+300", wAtk: 0, weapon: "Bow", wElem: "Neutral", st: {}, autoSp: false, potOn: false, cons: [] });
  run(`C().a={...BASIC}`);
  assert.equal(run(`useItems().map(x=>consName(x.id)+" "+x.qty).join()`), "Arrow 1");
  run(`C().wElem="Fire"`);
  assert.equal(run(`useItems().map(x=>consName(x.id)).join()`), "Fire Arrow");
  run(`C().a=${pre("Archer", "Double Strafe")}`);
  assert.equal(run(`useItems()[0].qty`), 1);
  setup("Rogue", { weapon: "Bow", wElem: "Neutral", st: {} });
  run(`C().a=${pre("Rogue", "Triangle Shot")}`);
  assert.equal(run(`useItems()[0].qty`), 3);
  run(`C().weapon="Dagger"`);
  assert.equal(run(`useItems().length`), 0);
  // Venom Knife throws, and uses up, a Venom Knife
  setup("Assassin", { st: {} });
  run(`C().a=${pre("Assassin", "Venom Knife")}`);
  assert.equal(run(`useItems().map(x=>consName(x.id)+" "+x.qty).join()`), "Venom Knife 1");
  near(run(`useZeny()`), 50);
  // Mammonite costs 100 z × the learned level
  setup("Merchant", { st: {} });
  run(`C().skills={mammonite:3}`);
  assert.equal(run(`levelPreset(JOBS.Merchant.p[0],C()).a.zeny`), 300);
  // Volcano: a gemstone every 60 s × Lv, per hour like the ASPD potion; it's in the map planner's net zeny / hr
  setup("Sage", { atkTxt: "100+300", wAtk: 0, st: {}, autoSp: false, potOn: false, cons: [], sage: { hsOn: false, hsAuto: false } });
  run(`C().skills={volcano:5};C().buffs={volcano:true};SKFX=skillEffects(C())`);
  near(run(`fieldCostHr()`), 12 * 450);
  const m = run(`mapStats0("mjo_d03",2)`);
  near(m.zph, m.zg - 12 * 450);
  // weight: Volcano's gems weigh 0.1 each
  const h = run(`useHour(${mob},2)`);
  near(h.w, 12 * 0.1); near(h.z, 12 * 450);
});

t("market prices: a drop sold to players counts at its player price instead of its NPC price", () => {
  const mob = "({id:-2,name:'Seller',loot:50,drops:[[909,10],[4001,0.5]]})";
  near(run(`zenyKill(${mob})`), 50);                                     // no prices typed: the exported loot value only
  run(`state.prices={909:200}`);                                          // players pay 200, NPC price from the data (data/prices.js)
  near(run(`zenyKill(${mob})`), 50 + (200 - run(`NPCSELL[909]`)) * 0.10);
  run(`state.npcPrices={909:10}`);                                        // NPC pays 10: that part is already in the loot value
  near(run(`zenyKill(${mob})`), 50 + (200 - 10) * 0.10);
  run(`state.dropBonus=100`);                                             // drop bonus doubles the chance (capped at 100%)
  near(run(`zenyKill(${mob})`), 100 + 190 * 0.20);
  run(`state.prices={909:5};state.npcPrices={909:10};state.dropBonus=0`); // cheaper than the NPC: you'd sell to the NPC
  near(run(`zenyKill(${mob})`), 50);
  assert.ok(run(`hasLoot({drops:[[909,10]]})`) === false);
  run(`state.prices={909:200};state.npcPrices={}`);
  assert.ok(run(`hasLoot({drops:[[909,10]]})`));                         // a priced drop gives a monster with no loot value a zeny figure
  run(`state.prices={}`);
});

t("weight: trips end at the sell point, no regen past 70%, nothing past 90%", () => {
  const atk = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, a: atk, maxW: 0 });
  assert.equal(run(`ITEMW[909]`), 1);                                      // Jellopy weighs 1
  const mob = MOB.replace("drops:[]", "drops:[[909,100]]");
  const tot = run(`fightSec(${mob})`) + 2;
  near(run(`tripTot(${mob},${tot},2)`), tot);                               // no Max Weight typed: off
  run(`Object.assign(C(),{maxW:1000,curW:100,sellAt:70,townMin:2})`);
  near(run(`weightKill(${mob})`), 1);
  near(run(`tripTot(${mob},${tot},2)`), tot + 120 / 600);                   // 600 weight of room at 70%: a 2-minute trip spread over 600 kills
  near(run(`mobRow0(${mob},2)`).tot, tot + 120 / 600);
  assert.equal(Math.round(run(`tripInfo(${mob},2)`).kills), 600);
  run(`C().sellAt=90`);                                                     // basic attacks need no SP, so you carry on to 90%
  near(run(`tripTot(${mob},${tot},2)`), tot + 120 / 800);
  assert.equal(run(`withRegenOff(()=>regenPerSec())`), 0);
  run(`C().a={...C().a,type:"magic",matkTxt:"300",sp:30,el:"Wind"};C().matkTxt="300";C().autoSp=false`);
  const t2 = run(`fightSec(${mob})`) + 2;                                   // a spell costs SP: with no regen and no SP items you can't fight past 70%
  near(run(`tripTot(${mob},${t2},2)`), t2 + 120 / 600);
  assert.ok(run(`tripInfo(${mob},2)`).fell);
  run(`C().sellAt=70;C().curW=800`);                                        // already past the sell point
  assert.equal(run(`tripTot(${mob},${t2},2)`), Infinity);
  run(`C().sellAt=70;C().curW=100;C().baseLv=99`);                         // far above the monster: the drop penalty means less loot to carry
  assert.ok(run(`dropPenalty(${mob})`) > 0);
  near(run(`weightKill(${mob})`), 1 - run(`dropPenalty(${mob})`) / 100);
  run(`C().maxW=0;C().curW=0`);
});

t("weight: a sell point below 70% (65%) keeps regen the whole trip; above 70% fights the rest with none", () => {
  const atk = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, a: atk, maxW: 1000, curW: 100, sellAt: 65, townMin: 2 });
  const mob = MOB.replace("drops:[]", "drops:[[909,100]]");
  const tot = run(`fightSec(${mob})`) + 2;
  near(run(`tripTot(${mob},${tot},2)`), tot + 120 / 550);                   // 650 − 100 starting weight (gear, potions) = 550 kills a trip
  assert.ok(!run(`tripInfo(${mob},2)`).fell);
  run(`C().sellAt=80`); near(run(`tripTot(${mob},${tot},2)`), tot + 120 / 700);
  run(`C().sellAt=0`); assert.equal(run(`sellPct()`), 70);                   // blank: 70%
  run(`C().sellAt=95`); assert.equal(run(`sellPct()`), 90);                  // nothing past 90%
  run(`C().maxW=0;C().curW=0;C().sellAt=70`);
});

t("sell timer: trip length for the session's monsters, and paused time pushes the due time back", () => {
  const atk = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, a: atk, maxW: 0 });
  const id = run(`MOBS.find(m=>!m.boss&&!m.expUnknown&&(m.drops||[]).some(([i])=>ITEMW[i]>0)&&isFinite(bestFight(m))&&openMaps(m).length).id`);
  run(`cur().mobIds=[${id}]`);
  assert.equal(run(`sessTrip(cur(),2)`), null);                             // no Max Weight: off
  run(`Object.assign(C(),{maxW:2000,curW:300,sellAt:65,townMin:3})`);
  const m = `MOBS.find(m=>m.id===${id})`, one = run(`tripInfo(${m},2)`), tr = run(`sessTrip(cur(),2)`);
  near(tr.kills, one.kills, "kills"); near(tr.min, one.min, "minutes");    // one monster: same as its own weight tile
  near(tr.kills, (2000 * 0.65 - 300) / run(`weightKill(${m})`), "room / weight per kill");
  assert.equal(tr.at, 65);
  run(`cur().trip={from:1000,due:1000+6e5};cur().pauses=[{from:2000,to:62000}]`);
  assert.equal(run(`tripDue(cur())`), 1000 + 6e5 + 60000);                  // a minute paused: due a minute later
  run(`state.tripEarly=2`); assert.equal(run(`tripEarly()`), 120000);
  run(`state.tripEarly=0;delete cur().trip;cur().pauses=[];C().maxW=0;C().curW=0;C().sellAt=70`);
});

t("sell timer: Start ends an open pause, and a typed trip length works without the model", () => {
  run(`cur().mobIds=[];C().maxW=0;delete state.tripMin`);
  assert.equal(run(`tripMinutes(cur())`), null);                            // no monster, no Max Weight, nothing typed
  assert.equal(run(`startTrip(cur(),1000)`), false); assert.equal(run(`cur().trip`), undefined);
  run(`state.tripMin=25;cur().pauses=[{from:500}]`);                         // paused while selling, then back from town
  assert.equal(run(`startTrip(cur(),1000)`), true);
  assert.equal(run(`JSON.stringify(cur().trip)`), JSON.stringify({ from: 1000, due: 1000 + 25 * 6e4 }));
  assert.equal(run(`openPause(cur())`), undefined);                          // the pause ended, so the clock runs
  assert.equal(run(`cur().pauses[0].to`), 1000);
  run(`delete state.tripMin;delete cur().trip;cur().pauses=[]`);
  const r = load({ sessions: [{ id: "a", name: "x", mobIds: [], entries: [] }], current: "a", tripMin: -3 });
  assert.equal(r(`state.tripMin`), undefined);                              // a bad saved value is dropped
});

t("sell timer: a saved trip keeps only its times", () => {
  const r = load({ sessions: [{ id: "a", name: "x", mobIds: [], entries: [], trip: { from: "5", due: 9, rang: true, x: "<b>" } }, { id: "b", name: "y", mobIds: [], entries: [], trip: { from: "no" } }], current: "a" });
  assert.equal(r(`JSON.stringify(state.sessions[0].trip)`), JSON.stringify({ from: 5, due: 9, rang: true }));
  assert.equal(r(`state.sessions[1].trip`), undefined);
});

t("NPC prices: the database's NPC price is the default, a typed one overrides it", () => {
  assert.ok(run(`NPCSELL[909]`) > 0);                                     // Jellopy has an NPC price in data/prices.js
  assert.equal(run(`npcSell(909)`), run(`NPCSELL[909]`));
  run(`state.npcPrices={909:1}`); assert.equal(run(`npcSell(909)`), 1);    // typed value wins
  run(`state.npcPrices={909:0}`); assert.equal(run(`npcSell(909)`), 0);    // even 0
  run(`state.npcPrices={}`);
  assert.equal(run(`npcSell(-99)`), 0);                                   // unknown item: 0
  // every drop in loot.js is listed; null where the database has no price, which counts as 0
  assert.deepEqual(run(`Object.values(LOOT).flatMap(v=>v[3].map(d=>String(d[0]))).filter(id=>!(id in NPCSELL)).length`), 0);
  assert.equal(run(`NPCSELL[7001]`), null); assert.equal(run(`npcSell(7001)`), 0);
  // players pay 200, an NPC 10, at 10%: the loot value plus what the player price beats the NPC price by
  run(`NPCSELL[-5]=10;state.prices={"-5":200}`);
  near(run(`zenyKill({loot:50,drops:[[-5,10]]})`), 50 + (200 - 10) * 0.10);
  run(`delete NPCSELL[-5];state.prices={}`);
});

t("drop level penalty: monster Lv − base Lv, none down to −19, 50% from −40", () => {
  run(`C().baseLv=60`);
  for (const lv of [99, 60, 41]) assert.equal(run(`dropPenalty({lv:${lv}})`), 0);  // gap +39, 0, −19: free band
  assert.equal(run(`penNote({lv:41})`), "");
  for (const lv of [20, 1]) assert.equal(run(`dropPenalty({lv:${lv}})`), 50);    // gap −40, −59
  assert.equal(run(`penNote({lv:20})`), "drops −50% (Lv gap −40)");
  assert.equal(run(`dropPenalty({lv:30})`), 0);                                   // −30: not in the guide, counted as none
  assert.match(run(`penNote({lv:30})`), /unknown/);
  assert.equal(run(`dropPenalty({})`), 0);                                        // no monster level: no penalty
});

t("drop level penalty scales zeny per kill and the Zeny Hunter", () => {
  run(`C().baseLv=60`);
  const mob = "({id:-3,name:'Low',lv:20,loot:100,drops:[[909,10]]})";
  near(run(`zenyKill(${mob})`), 50);                                     // loot value halved
  run(`state.prices={909:200};state.npcPrices={909:10}`);
  near(run(`zenyKill(${mob})`), 50 + 190 * 0.05);                         // the market part too: 10% chance becomes 5%
  run(`state.dropBonus=100`);                                             // bonus and penalty both apply: 10% × 2 × 0.5
  near(run(`zenyKill(${mob})`), 100 + 190 * 0.10);
  run(`state.dropBonus=0;state.prices={};state.npcPrices={}`);
  // a monster far below the character earns less in the rankings
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, autoSp: false, potOn: false, cons: [], a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const low = MOB.replace("drops:[]", "drops:[],loot:500").replace("lv:50", "lv:20");
  run(`C().baseLv=50`); const near0 = run(`huntMob0(${low},2)`);
  run(`C().baseLv=60`); const far = run(`huntMob0(${low},2)`);
  near(near0.zk, 500); near(far.zk, 250); assert.ok(far.net < near0.net);
  const real = run(`MOBS.find(m=>m.id===1002)`).lv;                       // Poring: ranks lower once you outlevel it by 40
  run(`C().baseLv=${real}`); const a = run(`huntMob0(MOBS.find(m=>m.id===1002),2)`);
  run(`C().baseLv=${real + 40}`); const b = run(`huntMob0(MOBS.find(m=>m.id===1002),2)`);
  near(b.zk, a.zk / 2);
});

t("drops with no published rate (Nordfeld Cave Boulder Dwarves) are listed as ? and earn nothing", () => {
  const m = "MOBS.find(m=>m.id===25327)";
  assert.equal(run(`JSON.stringify(${m}.drops.map(([id])=>itemName(id)))`), JSON.stringify(["Coal", "Boulder Dwarf Siege Trooper Card", "Archeologist's Shoes", "Advanced Boulder Dwarf Token"]));
  assert.ok(run(`[25327,25328,25329].every(id=>{const x=MOBS.find(m=>m.id===id);return x.drops.length&&x.drops.every(([,ch])=>ch==null)&&x.loot==null})`));
  assert.equal(run(`chTxt(null)`), "?"); assert.equal(run(`chTxt(5)`), "5%"); assert.equal(run(`yourCh(${m},null)`), null);
  assert.ok(run(`dropNames(${m})`).startsWith("Coal ? (NPC 250 z)"));
  run(`state.prices={300942:5000000}`);                                // even a market price adds nothing without a rate
  assert.equal(run(`hasLoot(${m})`), false); assert.equal(run(`zenyKill(${m})`), 0); assert.equal(run(`weightKill(${m})`), 0);
  assert.equal(run(`dropZ(${m},300942,null)`), 0);
  run(`state.prices={}`);
});

t("drops seen in game (data/client.js): on the monster and the item, rate unknown, earning nothing", () => {
  [[480999, "General's Cape", 20178, "Orc General"], [481000, "Hunter's Cape", 1211, "Brilight"], [481001, "Rotating Gear", 1269, "Clock"]].forEach(([id, item, mob, name]) => {
    assert.equal(run(`itemName(${id})`), item);
    assert.ok(run(`MOBS.find(m=>m.id===${mob}).drops.some(([i,ch])=>i===${id}&&ch==null)`));
    assert.equal(run(`JSON.stringify(ITEM_INFO[${id}].d.map(r=>[r[0],r[1],r[4]]))`), JSON.stringify([[mob, name, null]]));
    assert.equal(run(`ITEMTYPE[${id}]`), "a");
  });
  // Brilight's zeny per kill is what its other drops earn, as before
  near(run(`zenyKill(MOBS.find(m=>m.id===1211))`), run(`zenyKill({loot:LOOT[1211][0],drops:LOOT[1211][3].filter(([,ch])=>ch!=null)})`));
  assert.equal(run(`hasLoot(MOBS.find(m=>m.id===20178))`), false);
});

t("auto loot: drops of a group you don't loot earn nothing", () => {
  run(`C().baseLv=1;state.dropBonus=0;state.prices={};state.npcPrices={};state.autoLoot={}`);
  assert.equal(run(`ITEMTYPE[909]`), "e"); assert.equal(run(`ITEMTYPE[4001]`), "c"); assert.equal(run(`ITEMTYPE[1202]`), "w");
  const mob = "({id:-4,name:'Looter',lv:1,loot:50,drops:[[909,10],[4001,0.5]]})";
  near(run(`zenyKill(${mob})`), 50);                                       // everything looted: the database's loot value as is
  run(`state.autoLoot={c:false}`);                                          // cards left behind: only the Jellopy counts
  near(run(`zenyKill(${mob})`), run(`NPCSELL[909]`) * 0.10);
  run(`state.prices={4001:100000}`);                                        // a market price doesn't matter for an item you don't pick up
  near(run(`zenyKill(${mob})`), run(`NPCSELL[909]`) * 0.10);
  assert.equal(run(`dropZ(${mob},4001,0.5)`), 0);
  run(`state.autoLoot={}`);                                                 // each drop's share adds up to zeny per kill
  const sum = run(`(m=>m.drops.reduce((a,[id,ch])=>a+dropZ(m,id,ch),0))(MOBS.find(m=>m.id===1002))`);
  assert.ok(Math.abs(run(`zenyKill(MOBS.find(m=>m.id===1002))`) - sum) <= 1);   // loot.js rounds its loot value to the zeny
  run(`state.prices={};state.autoLoot={}`);
});

t("Zeny Hunter monster picks: passing monsters by drops them from the map and lengthens the walk", () => {
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, autoSp: false, potOn: false, cons: [], a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  run(`state.huntOff={};state.huntAuto=false`);
  const all = run(`huntMap0("mjo_d03",2)`);
  assert.equal(all.earn.length, all.mobs.length); near(all.walk, 2);
  const off = all.mobs[all.mobs.length - 1], rest = all.n - off.n;
  run(`state.huntOff={mjo_d03:[${off.m.id}]}`);
  const r = run(`huntMap0("mjo_d03",2)`);
  assert.ok(r.manual && !r.earn.some(x => x.m.id === off.m.id) && r.mobs.find(x => x.m.id === off.m.id).on === false);
  assert.equal(r.n, rest);
  const walked = 2 * Math.sqrt(all.n / rest), jumps = all.n / rest - 1;
  assert.equal(run("canTele()"), false);                                     // no Creamy Card, no Teleport skill: Fly Wings cost too much, so it walks
  near(r.walk, walked); assert.equal(r.tele, 0);
  run(`CRD().creamy=true;state.teleSec=0`);                                 // Creamy Card: free, instant teleports beat the longer walk
  const cr = run(`huntMap0("mjo_d03",2)`); near(cr.tele, jumps); near(cr.walk, 2); near(cr.cost - cr.hpZ, r.cost - r.hpZ);  // HP lost / min is time-weighted, so the walk moves its HP items
  run(`state.noTele=["mjo_d03"]`);                                            // a map that blocks teleport only walks
  const nt = run(`huntMap0("mjo_d03",2)`); near(nt.walk, walked); assert.equal(nt.tele, 0);
  run(`state.noTele=[];CRD().creamy=false;C().skills={teleport:1}`);        // the Teleport skill works the same
  assert.equal(run("canTele()"), true); near(run(`huntMap0("mjo_d03",2)`).tele, jumps);
  run(`C().skills={};delete state.teleSec`);
  run(`state.huntOff={};state.huntAuto=true`);                              // best-paying: never worse than hunting everything
  const a = run(`huntMap0("mjo_d03",2)`);
  assert.ok(a.net >= all.net - 1e-6 && !a.manual);
  const m40 = run(`huntMap0("mjo_d03",2,40)`);                               // but it keeps at least that many spawns
  assert.ok(m40.n >= Math.min(40, all.n) && m40.net <= a.net + 1e-6);
  run(`state.huntOff={mjo_d03:[]};`);                                       // a map you set by hand ignores best-paying
  near(run(`huntMap0("mjo_d03",2)`).net, all.net);
  run(`state.huntOff={};state.huntAuto=false`);
});

t("Zeny Hunter weight: per kill from the drops you loot, per hour from the kill pace", () => {
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, autoSp: false, potOn: false, cons: [], a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  run(`state.huntOff={};state.huntAuto=false;state.autoLoot={};state.dropBonus=0;C().baseLv=1;C().maxW=0`);
  const mob = "({id:-5,name:'Heavy',lv:1,hp:100,exp:10,el:'Water',elv:1,size:'S',race:'Brute',def:0,mdef:0,vit:0,int:0,atkMin:1,atkMax:2,loot:50,drops:[[909,50],[4001,1]]})";
  near(run(`weightKill(${mob})`), run(`ITEMW[909]`) * 0.5 + run(`ITEMW[4001]||0`) * 0.01);
  const h = run(`huntMob0(${mob},2)`); near(h.wk, run(`weightKill(${mob})`)); near(h.wph, h.wk * h.kph);
  run(`state.autoLoot={e:false}`);                                          // Jellopy left on the ground weighs nothing
  near(run(`weightKill(${mob})`), (run(`ITEMW[4001]||0`)) * 0.01);
  run(`state.autoLoot={}`);
  const m = run(`huntMap0("mjo_d03",2)`), wsum = m.earn.reduce((a, x) => a + x.n * run(`weightKill(MOBS.find(m=>m.id===${x.m.id}))`), 0);
  near(m.wk, wsum / m.n); near(m.wph, m.wk * m.kph);                        // spawn-weighted over the monsters you hunt
});

t("Zeny Hunter level filter: monsters outside the Lv range, or with a drop penalty, are passed by", () => {
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, autoSp: false, potOn: false, cons: [], a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  run(`state.huntOff={};state.huntAuto=false;state.huntMinLv=null;state.huntMaxLv=null;state.huntNoPen=false;C().baseLv=1`);
  const all = run(`huntMap0("mjo_d03",2)`), lvs = all.mobs.map(x => x.m.lv), lo = Math.min(...lvs), hi = Math.max(...lvs);
  assert.ok(lo < hi && all.mobs.every(x => !x.lvOut));
  run(`state.huntMinLv=${lo + 1}`);                                         // the lowest-level monsters are passed by: a longer walk
  const r = run(`huntMap0("mjo_d03",2)`), out = all.mobs.filter(x => x.m.lv === lo);
  assert.ok(!r.earn.some(x => x.m.lv < lo + 1) && out.every(o => r.mobs.find(x => x.m.id === o.m.id).lvOut));
  assert.equal(r.n, all.n - out.reduce((a, x) => a + x.n, 0)); near(r.walk, 2 * Math.sqrt(all.n / r.n));
  run(`state.huntOff={mjo_d03:[${r.earn.map(x => x.m.id).join(",")}]}`);   // a pick of yours that leaves nothing in range hunts the whole range
  near(run(`huntMap0("mjo_d03",2)`).net, r.net);
  run(`state.huntOff={};state.huntMinLv=null;state.huntMaxLv=${lo - 1}`);   // nothing in range: the map drops out
  assert.equal(run(`huntMap0("mjo_d03",2)`), null);
  run(`state.huntMaxLv=null;state.huntNoPen=true;C().baseLv=${lo + 40}`);   // 40 levels above the lowest: they lose half their drops, so they're skipped
  assert.equal(run(`dropPenalty(MOBS.find(m=>m.id===${out[0].m.id}))`), 50);
  const np = run(`huntMap0("mjo_d03",2)`);
  assert.ok(np.mobs.filter(x => x.lvOut).every(x => x.m.lv <= lo + 40 - 40) && np.mobs.some(x => x.lvOut));
  assert.equal(run(`huntLvOk(MOBS.find(m=>m.id===${out[0].m.id}))`), false);
  run(`state.huntNoPen=false;C().baseLv=1`);
});

t("Overcharge raises NPC sales; Buy with Discount (Lv 10 on the account) cuts NPC purchases", () => {
  const atk = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Blacksmith", { atkTxt: "100+300", st: {}, a: atk, skills: {}, itemPrice: 1000, potOn: true, potMin: 30, potPrice: 1000, cons: [] });
  const mob = "({id:-3,name:'Seller',lv:50,loot:100,drops:[[909,10]]})";
  run(`C().baseLv=50;state.dropBonus=0;state.prices={};state.npcPrices={}`);
  near(run(`zenyKill(${mob})`), 100);                                     // no skills learned
  near(run(`potCostHr()`), 2000);
  run(`C().skills={overcharge:10,discount:10}`);
  assert.equal(run(`skRate("overcharge")`), 24);                          // Lv 10: 24% in Zero's skill data
  assert.equal(run(`(C().skills.overcharge=1,skRate("overcharge"))`), 7);  // Lv 1: 7%
  run(`C().skills.overcharge=10`);
  near(run(`zenyKill(${mob})`), 124);                                     // NPC loot value +24%
  run(`state.prices={909:200};state.npcPrices={909:10}`);                 // a market price replaces the NPC price you'd get with Overcharge
  near(run(`zenyKill(${mob})`), 124 + (200 - Math.floor(10 * 1.24)) * 0.10);
  near(run(`potCostHr()`), 2000);                                         // this character's own Discount doesn't count
  run(`state.recovery.discount=true`);                                    // Buy with Discount: −24% (Lv 10) on what you buy from NPCs
  near(run(`potCostHr()`), 2000 * 0.76);
  run(`REC().spItem="custom"`);                                          // a Custom SP item (typed 1,000 z) takes it too
  near(run(`spItemPrice()`), 760);
  run(`C().skills={}`);                                                   // on any job, not only the Merchant line
  near(run(`potCostHr()`), 2000 * 0.76);
  run(`state.recovery.discount=false`);                                   // off: NPC prices
  near(run(`potCostHr()`), 2000);
  run(`state.prices={};state.npcPrices={};C().skills={};C().potOn=false`);
});

t("recovery items: cost per HP / SP, the cheapest pick and healing per hour", () => {
  setup("Merchant", { st: {}, autoSp: false, potOn: false, cons: [] });
  run(`state.recovery={discount:true}`);
  const per = id => run(`recItem("${id}").per`);
  near(per(501), 8 / 45); assert.equal(+per(501).toFixed(3), 0.178);       // Red Potion at the Discount price
  near(per(548), 23 / 32); assert.equal(+per(548).toFixed(2), 0.72);        // Cheese: 25–39 SP, avg 32
  near(per(510), 49 / 62); assert.equal(+per(510).toFixed(2), 0.79);        // Blue Herb: 51–73, avg 62
  near(per(578), 200 / 101); assert.equal(+per(578).toFixed(2), 1.98);      // Strawberry at the 200 z player price
  assert.equal(per(505), null);                                             // Blue Potion: not sold by NPCs, no price
  assert.equal(run(`recCheapest("hp").name`), "Red Potion");
  assert.equal(run(`recCheapest("sp").name`), "Cheese");
  assert.equal(run(`recPick("hp").auto`), true);                            // Auto (cheapest) by default
  // healing per hour: 202 HP lost / min ≈ 2.2k z/hr with Red Potions, 1,089 ≈ 11.6k
  near(run(`hpHeal(202).z`), 202 * 60 / 45 * 8); assert.equal(Math.round(run(`hpHeal(202).z`) / 100) / 10, 2.2);
  assert.equal(Math.round(run(`hpHeal(1089).z`) / 100) / 10, 11.6);
  near(run(`hpHeal(202).n`), 202 * 60 / 45);
  assert.equal(run(`hpHeal(null).z`), 0);
  // Discount off: the NPC price
  run(`state.recovery.discount=false`);
  near(per(501), 10 / 45); near(per(548), 28 / 32); near(per(578), 200 / 101);
  run(`state.recovery.discount=true`);
  // your values per item: a dearer Cheese makes Blue Herb the cheapest; a price on Blue Potion lets it be picked
  run(`REC().overrides={"548":{disc:100}}`);
  assert.equal(run(`recCheapest("sp").name`), "Blue Herb");
  run(`REC().overrides["505"]={player:6}`);
  near(per(505), 0.1); assert.equal(run(`recCheapest("sp").name`), "Blue Potion");
  run(`REC().overrides={"501":{min:40,max:50,w:5}}`);
  near(run(`recItem("501").avg`), 45); near(run(`recItem("501").perW`), 9); assert.equal(run(`recItem("501").edited`), true);
  run(`REC().overrides={}`);
  // a picked item; one with no price falls back to the cheapest
  run(`REC().spItem="578"`);
  near(run(`spItemAmt()`), 101); near(run(`spItemPrice()`), 200);
  run(`REC().spItem="505"`);
  assert.equal(run(`recPick("sp").name`), "Cheese"); assert.equal(run(`recPick("sp").want.name`), "Blue Potion");
  run(`REC().hpItem="504"`);
  near(run(`hpHeal(100).z`), 100 * 60 / 325 * 996);
  // Custom: the restores / costs boxes, as before
  run(`REC().spItem="custom";C().itemSp=50;C().itemPrice=300;C().skills={}`);
  near(run(`spItemAmt()`), 50); near(run(`spItemPrice()`), 300 * 0.76);     // with Buy with Discount
  run(`state.recovery.discount=false`); near(run(`spItemPrice()`), 300); run(`state.recovery.discount=true`);
  run(`REC().hpItem="custom";C().itemHp=200;C().itemHpPrice=500`);              // a Custom HP item: its own boxes
  assert.equal(run(`recPick("hp").name`), "Custom HP item");
  near(run(`hpHeal(100).n`), 100 * 60 / 200); near(run(`hpHeal(100).z`), 100 * 60 / 200 * 500 * 0.76);
  near(run(`spItemAmt()`), 50);                                 // the SP item keeps its own
  // None: no HP item (HP loss costs nothing) and no SP item (auto-use has nothing to use, so you rest)
  run(`REC().hpItem="none";REC().spItem="none"`);
  assert.equal(run(`recPick("hp")`), null); assert.equal(run(`recPick("sp")`), null);
  assert.equal(run(`hpHeal(202).z`), 0); assert.equal(run(`hpHeal(202).n`), 0);
  assert.equal(run(`spItemAmt()`), 0); assert.equal(run(`spItemPrice()`), 0);
  run(`REC().spItem="auto";REC().hpItem="auto"`);
  // items that heal HP and SP: listed as an HP item and as an SP item. Yggdrasil Berry / Seed: all / half of Max HP and SP, at the price you type
  run(`C().maxHp=2000;C().maxSp=300`);
  assert.equal(run(`recItem("607","hp").avg`), 2000); assert.equal(run(`recItem("607","sp").avg`), 300);
  assert.equal(run(`recItem("608","hp").avg`), 1000); assert.equal(run(`recItem("608","sp").avg`), 150);
  assert.equal(run(`recItems().filter(x=>x.id==="607").map(x=>x.kind).join()`), "hp,sp");
  near(run(`recItem("526","hp").avg`), 365); near(run(`recItem("526","sp").avg`), 50);   // Royal Jelly: 325–405 HP, 40–60 SP
  run(`REC().overrides={"607":{player:5000}};REC().spItem="607"`);
  near(run(`spItemAmt()`), 300); near(run(`spItemPrice()`), 5000); near(run(`recItem("607","hp").per`), 2.5);
  run(`REC().overrides={"526":{spMin:30,spMax:30}}`);                        // the SP side's own amounts; the HP side keeps its own
  near(run(`recItem("526","sp").avg`), 30); near(run(`recItem("526","hp").avg`), 365);
  run(`REC().overrides={};REC().spItem="auto"`);
});

t("recovery items: SP items in the SP model, Heal cost / hr and Net zeny / hr in the EXP Hunter", () => {
  const sk = { name: "x", type: "phys", pct: 300, hits: 1, el: "Neutral", cast: 0, delay: 1, sp: 40, targets: 1 };
  setup("Merchant", { atkTxt: "100+300", wAtk: 0, st: {}, a: sk, autoSp: true, potOn: false, cons: [], spRegen: 5, maxSp: 300, hpRegen6: 1 });
  run(`state.recovery={discount:true};state.skipMobs=[]`);
  const mob = MOB.replace("drops:[]", "drops:[],loot:5000");
  // SP items per second cover what regen doesn't, at the Cheese's 32 SP each
  const short = run(`(()=>{SG_MOB=${mob};try{return spNeedPerSec()-regenPerSec()}finally{SG_MOB=null}})()`);
  assert.ok(short > 0);
  near(run(`(()=>{SG_MOB=${mob};try{return itemsPerSec()}finally{SG_MOB=null}})()`), short / 32);
  const r = run(`mobRow0(${mob},2)`);
  near(r.hc, r.sph * 23); near(r.sph, short / 32 * 3600);
  const m = run(`mapStats0("prt_f08",2)`);
  near(m.zb, m.zph + m.spZ); near(m.heal, m.hpZ + m.spZ); near(m.net, m.zb - m.heal);
  near(m.spZ, m.spHr * 23);
  if (m.hpm != null) near(m.hpZ, m.hpm * 60 / 45 * 8);
  near(run(`mapSpShort("prt_f08",2,null)`) / 32, m.spHr);                 // auto-use on: the items cover the whole shortfall
  // Zeny Hunter: Costs / hr hold HP items for the HP lost, SP items, the ASPD potion and ground buffs
  const hm = run(`huntMob0(${mob},2)`);
  assert.ok(hm.hpm > 0 && hm.hpZ > 0);
  near(hm.hpZ, hm.hpm * 60 / 45 * 8); near(hm.spZ, hm.spHr * 23); near(hm.cost, hm.hpZ + hm.spZ + hm.other); near(hm.net, hm.loot - hm.cost);
  near(hm.cost, run(`huntCostHr(${mob})`) + hm.hpZ);
  const hmap = run(`huntMap0("prt_f08",2)`);
  near(hmap.cost, hmap.hpZ + hmap.spZ + hmap.other); near(hmap.net, hmap.loot - hmap.cost);
  if (hmap.hpm != null) near(hmap.hpZ, hmap.hpm * 60 / 45 * 8);
  run(`REC().spItem="none";REC().hpItem="none"`);                           // None: no SP items bought, no HP items either
  const m3 = run(`mapStats0("prt_f08",2)`);
  assert.equal(m3.spZ, 0); assert.equal(m3.hpZ, 0); near(m3.net, m3.zph);
  run(`REC().spItem="auto";REC().hpItem="auto"`);
  run(`C().autoSp=false`);                                                  // auto-use off: you rest, no SP items bought
  const m2 = run(`mapStats0("prt_f08",2)`);
  assert.equal(m2.spZ, 0); near(m2.net, m2.zph - m2.hpZ);
});

t("recovery items: saves load with defaults, older SP items carry over, bad values are dropped", () => {
  const S = [{ id: "s1", name: "t", mobIds: [1002], entries: [{ t: 1, lv: 50, pct: 1 }, { t: 60001, lv: 50, pct: 2 }], pauses: [{ from: 10, to: 20 }] }];
  const app = load({ job: "Merchant", current: "s1", sessions: S, chars: { Merchant: { itemSp: 37, itemPrice: 200 }, Sage: { itemSp: 60, itemPrice: 450 },
    Wizard: { recovery: { hpItem: 501, spItem: "548", scaleByStats: "yes", refStats: { vit: "40", int: "x", job: 3 }, overrides: { 548: { disc: "30", w: -1, bogus: 5 }, 999: { disc: 1 }, 501: "x" } } } } });
  assert.equal(app("state.chars.Merchant.recovery.spItem"), "auto");       // the 37 SP for 200 z default: Auto (cheapest)
  assert.equal(app("JSON.stringify(state.chars.Sage.recovery)"), JSON.stringify({ hpItem: "auto", spItem: "custom", overrides: {} }));
  assert.equal(app("JSON.stringify(state.chars.Wizard.recovery)"), JSON.stringify({ hpItem: "auto", spItem: "548", overrides: { 548: { disc: 30 } } }));
  assert.equal(app("state.recovery.discount"), true);                      // Buy with Discount: on by default
  assert.equal(app("JSON.stringify(state.sessions[0].entries)"), JSON.stringify(S[0].entries));
  assert.equal(app("JSON.stringify(state.sessions[0].pauses)"), JSON.stringify(S[0].pauses));
  assert.equal(load({ sessions: S, recovery: { discount: false } })("state.recovery.discount"), false);
});

t("recovery items: three accounts load, switch and keep their own settings", () => {
  const bk = JSON.parse(readFileSync(new URL("tests/fixtures/backup-2-accounts.json", root), "utf8"));
  const gem = { job: "Alchemist", current: "g1", sessions: [{ id: "g1", name: "Gemini", mobIds: [], entries: [] }], chars: { Alchemist: { baseLv: 55 } } };
  const store = { "rozero-farm-planner-accounts": JSON.stringify({ list: [{ id: "a0", name: "Kona" }, { id: "aFX", name: "FXFighter" }, { id: "aGem", name: "Gemini" }], active: "a0" }),
    "rozero-farm-planner-v1": JSON.stringify(bk.accounts[0].data), "rozero-farm-planner-v1:aFX": JSON.stringify(bk.accounts[1].data), "rozero-farm-planner-v1:aGem": JSON.stringify(gem) };
  const want = { a0: "Sage", aFX: "Merchant", aGem: "Alchemist" };
  for (const id of ["a0", "aFX", "aGem"]) {
    store["rozero-farm-planner-accounts"] = JSON.stringify({ ...JSON.parse(store["rozero-farm-planner-accounts"]), active: id });
    const app = load(null, store);                                           // the page reloads on each account switch
    assert.equal(app("state.job"), want[id], id);
    assert.equal(app(`REC().hpItem`), "auto", id);
    app(`REC().overrides={"501":{disc:${id === "aFX" ? 7 : 9}}};state.recovery.discount=${id !== "aGem"};save()`);
  }
  assert.equal(JSON.parse(store["rozero-farm-planner-v1:aFX"]).chars.Merchant.recovery.overrides["501"].disc, 7);
  assert.equal(JSON.parse(store["rozero-farm-planner-v1"]).chars.Sage.recovery.overrides["501"].disc, 9);
  assert.equal(JSON.parse(store["rozero-farm-planner-v1:aGem"]).recovery.discount, false);
  assert.equal(JSON.parse(store["rozero-farm-planner-v1:aFX"]).sessions.length, bk.accounts[1].data.sessions.length);
  const app = load(null, store);                                             // aGem is still the active one: its settings came back
  assert.equal(app(`recItem("501").price`), 10);                             // Discount off for this account: NPC price
  run(`state.job="Merchant";state.chars={};REC().overrides={"548":{disc:20}};REC().spItem="custom"`);  // and a share link keeps them
  const after = JSON.parse(run(`JSON.stringify(unpackState(JSON.parse(JSON.stringify(packState(state)))))`));
  assert.deepEqual(after.chars.Merchant.recovery, { hpItem: "auto", spItem: "custom", overrides: { 548: { disc: 20 } } });
});

t("spawn counts come from the client's navigation table (normal channels)", () => {
  const sp = (id, mp) => run(`JSON.stringify((SPAWN[${id}]||[]).find(x=>x[0]==="${mp}"))`);
  assert.equal(sp(1002, "prt_f08"), JSON.stringify(["prt_f08", 20, 30]));  // Poring: 20 on prt_fild08, 30 on the PvP channel
  assert.equal(sp(1169, "mjo_d03"), JSON.stringify(["mjo_d03", 78, 78]));  // Skel Worker on mjo_dun03
  assert.equal(sp(1013, "maz_d03"), JSON.stringify(["maz_d03", 20, 20]));  // Wolf on prt_maze03: missing before
  assert.equal(sp(1045, "bea_d02"), JSON.stringify(["bea_d02", 30, 30]));  // Marc on North Cave (Luanda) since the patch
  assert.equal(sp(1278, "bea_d02"), JSON.stringify(["bea_d02", 50, 50]));  // Stalactic Golem there: 65 before the patch
  assert.equal(sp(1046, "gef_d01"), JSON.stringify(["gef_d01", 1, 1]));    // Doppelganger, from the client's b_gef_d01 boss table
  assert.equal(sp(1002, "prt_fild06"), JSON.stringify(["prt_fild06", 20, 30]));  // old field name: PvP count from prt_f06_z
  assert.equal(sp(1037, "mjolnir_04"), JSON.stringify(["mjolnir_04", 43, 65]));  // from mjo_f04_z
  assert.equal(sp(1031, "prt_maze02"), JSON.stringify(["prt_maze02", 32, 32]));  // from maz_d02_z
  assert.equal(sp(1087, "gef_fild03"), JSON.stringify(["gef_fild03", 1, 1]));    // Orc Hero, from b_gef_f03 / b_gef_f03_z
  assert.equal(run(`Object.values(SPAWN).flat().filter(x=>!(x[1]>0)&&x[1]!==null).length`), 0);
  // maps the client doesn't list yet: which monsters come, but no count (no estimate), and only on the roadmap's regions
  assert.equal(sp(1045, "iz_d03"), JSON.stringify(["iz_d03", null]));      // Marc on Undersea Cave 4F
  // (Western Cave Karu, bea_d01, isn't in the client either but isn't on the roadmap: open, counts ?)
  assert.ok(run(`Object.values(SPAWN).flat().filter(x=>x[1]===null&&x[0]!=="bea_d01").every(x=>regionOf(x[0]))`));
  assert.equal(run(`Object.values(SPAWN).flat().filter(x=>x[1]===null&&x.length!==2).length`), 0);
  assert.equal(run(`spN(null)+" "+spN(30)`), "? 30");
  assert.ok(run(`mapStats("iz_d03",0)`) == null);                          // nothing to weight by: out of the map rankings
  assert.equal(run(`MAPMOBS.prt_f08.find(x=>x.m.id===1002).n`), 20);      // the app uses the normal-channel count
});

t("gear CRIT against a race only counts against that race", () => {
  setup("Knight", { a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 }, st: {} });
  run(`C().bx={critRace:{Brute:7}}`);
  const base = run(`critChance({race:"Plant"})`);
  near(run(`critChance({race:"Brute"})`) - base, 0.07);
  near(run(`critChance()`), base);                     // no monster: your plain CRIT
  run(`delete C().bx`);
});

t("damage against Boulder Dwarves counts only against Boulder Dwarves, from cards and Equipment stats lines", () => {
  const g = id => run(`JSON.stringify((CARDS.find(e=>e.id===${id})||{}).g||null)`);
  assert.equal(g(300944), JSON.stringify([{ b: [["physical_damage_percent", "monster_group", "boulder_dwarf", 30]] }]));  // Captain
  assert.equal(g(300943), JSON.stringify([{ b: [["magic_damage_percent", "monster_group", "boulder_dwarf", 30]] }]));     // Squad Leader
  setup("Knight", { mode: "status", eq: [{ by: "group", t: "Boulder Dwarf", ch: "phys", v: 30 }] });
  const cap = "({name:'Boulder Dwarf Captain',el:'Earth',size:'M',race:'Demi-Human'})", other = "({name:'Poring',el:'Earth',size:'M',race:'Demi-Human'})";
  near(run(`bonusMul(${cap})/bonusMul(${other})`), 1.3);
  near(run(`bonusMul(${cap},true)/bonusMul(${other},true)`), 1);         // physical line: spells don't get it
  near(run(`bonusMul({...${cap},name:'Cannon Boulder Dwarf'})/bonusMul(${other})`), 1.3);
  setup("Knight", { mode: "status", eq: [] });
});

t("Equipment stats: Fill from gear turns the gear saved in Build from gear into lines, and the lines count like the gear", () => {
  const own = [{ name: "Event Ring", opts: [{ k: "dmg_race_demon", v: 5 }, { k: "mdmg_race_demon", v: 5 }, { k: "res_ele_fire", v: 10 }, { k: "mele_fire", v: 4 }] }];
  setup("Knight", { mode: "status", eq: [], build: { base: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, gear: {} } });
  assert.equal(run("gearSaved(C())"), false);
  run(`C().build.special={ring:313627,own:${JSON.stringify(own)}}`);              // Taming Ring egg: physical damage +1%
  assert.equal(run("gearSaved(C())"), true);
  assert.deepEqual(JSON.parse(run("JSON.stringify(gearEqRows(C()))")), [
    { by: "race", t: "Demon", ch: "both", v: 5 }, { by: "all", t: "", ch: "phys", v: 1 }, { by: "myEle", t: "Fire", ch: "both", v: 4 }, { by: "takenEle", t: "Fire", ch: "both", v: -10 }]);
  // the filled lines give status window mode the same bonuses build mode reads from the gear
  run("C().eq=gearEqRows(C());applyBuild()");
  const fromEq = run("JSON.stringify(C().bx)");
  run("C().mode='build';applyBuild()");
  const bx = JSON.parse(run("JSON.stringify(C().bx)")), eq = JSON.parse(fromEq);
  for (const k of ["phys", "magic", "myEle", "taken", "exp", "critRace", "spCost", "spRec", "hpRec"]) assert.deepEqual(eq[k], bx[k], k);
  // CRIT vs a race: a flat line, counted against that race only
  setup("Knight", { mode: "status", eq: [{ by: "critRace", t: "Brute", ch: "both", v: 7 }] });
  assert.equal(run("critRace({race:'Brute'})"), 7);
  assert.equal(run("critRace({race:'Demon'})"), 0);
  setup("Knight", { mode: "status", eq: [] });
});

t("gear from the client check: Guild options are GvG-only, race CRIT and damage taken are in", () => {
  const g = id => run(`JSON.stringify((EQUIP.concat(CARDS).find(e=>e.id===${id})||{}).g||null)`);
  assert.equal(g(560003), "null");                     // Advanced Guild Fist: Guillotine Fist cast -30% in Siege only
  assert.ok(g(4297).includes('["crit","race","brute",7]'));   // Cruiser Card
  assert.ok(g(2254).includes('["damage_taken_percent","race","demon",-3]'));   // Angel Wing
  assert.ok(g(4312).includes('"cls":["acolyte"]'));    // Fur Seal Card: Acolyte Class vs Demon/Undead
  assert.equal(g(27270), JSON.stringify([{ b: [["mdef", null, null, 10, 1]] }]));   // Extra Joker Card: MDEF +10 per shield refine, ATK / MATK +70 only in the set's transform
  assert.ok(!g(27273).includes('"atk"'));   // Orc General Card: ATK +25 only with High Orc Card (the set)
  assert.ok(run(`ITEM_INFO[27273].t`).includes("While using a knuckle"));
  assert.ok(!g(4199).includes('"agi"'));   // Merman Card: AGI / DEX +5 / +3 are the five-card set's
  assert.ok(g(4159).includes('{"r":9,"b":[["flee",null,null,20]]}'));   // Nine Tail Card: FLEE +20 at refine 9+
  assert.ok(g(4288).includes('["int",null,null,2]'));   // Carat Card: INT +2
  assert.ok(g(300551).includes('{"r":9,"b":[["hp",null,null,300]'));   // A-Ji & Geffen Card: MHP +300 on a +9 garment
  assert.ok(g(4153).includes('["physical_damage_percent","monster_group","aster",30]'));   // Crab Card vs Aster
  assert.ok(run(`SETS.some(s=>s.slug==="crab-shell-fish-aster-card"&&s.pieces.length===3)`));
  assert.ok(run(`ITEM_INFO[4288].t`).startsWith("INT +2."));   // Carat Card's text, from the client
  // a monster group counts against whole words of the name: Aster, not Mastering
  assert.equal(run(`groupMul({group:{Aster:30}},{name:"Mastering"})`), 1);
  assert.equal(run(`groupMul({group:{Aster:30}},{name:"Aster"})`), 1.3);
  assert.equal(run(`groupMul({group:{"Boulder Dwarf":30}},{name:"Boulder Dwarf Captain"})`), 1.3);
  // cards the client doesn't have yet are marked
  assert.ok(run(`notInGame(4246)&&!notInGame(4247)`));   // Assaulter Card isn't out yet, Aster Card is
});

t("Spell Fist: each basic attack also lands its physical hit", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  const char = { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", matkTxt: "300+200", hitTxt: "220", crit: 0, aspd: 170, st: {}, intTxt: "",
    sage: { sfLv: 10, boltLv: 10, bolts: { Fire: true, Water: false, Wind: false }, hsOn: false, hsAuto: false }, ec: { on: false }, cards: { daSF: false, vitata: false } };
  setup("Sage", { ...char, a: AUTO });
  const phys = run(`dmgPerHit(${MOB})`) * run(`hitChance(${MOB})`) / 100;   // a plain basic attack's hit, misses averaged in
  assert.ok(phys > 0);
  setup("Sage", { ...char, preset: 0, a: JSON.parse(run("JSON.stringify(JOBS.Sage.p[0])")) });   // the Spell Fist preset
  near(run(`sfPerAttack(${MOB})`), run(`sfMagic(${MOB})`) + phys);
  near(run(`hitChance(${MOB})`), 100);                                    // the Spell Fist proc itself still always lands
  run("CRD().daSF=true;CRD().daPct=7");                                        // Side Winder: the 2nd hit is physical too
  near(run(`sfPerAttack(${MOB})`), run(`sfMagic(${MOB})`) + phys * 1.07);
  run("C().atkTxt='0'");                                                   // no ATK still leaves the 1 damage minimum
  assert.ok(run(`sfPhys(${MOB})`) < phys);
});

t("Spell Fist: the bolt at 100%, then × (100 × bolt Lv + 100 × Spell Fist Lv)%", () => {
  setup("Sage", { matkTxt: "300+200", intTxt: "", st: {}, sage: { sfLv: 10, boltLv: 10, bolts: { Fire: true, Water: false, Wind: false }, hsOn: false, hsAuto: false },
    ec: { on: false }, cards: {}, a: JSON.parse(run("JSON.stringify(JOBS.Sage.p[0])")) });
  assert.equal(run("sfPct()"), 2000);
  const bolt = run(`magicDmg(${MOB},100,'Fire')`);
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(bolt * 20));        // soft MDEF taken off the bolt, then × 20
  assert.ok(run(`dmgPerHit(${MOB})`) < run(`magicDmg(${MOB},2000,'Fire')`));
  run("G().sfLv=5");
  assert.equal(run("sfPct()"), 1500);                                 // Spell Fist Lv5 with Lv10 bolts
  run("G().boltLv=3");
  assert.equal(run("sfPct()"), 800);
});

t("Sage attacks: Spell Fist, Hindsight, or both, named with their levels", () => {
  const sage = { matkTxt: "300+200", intTxt: "", st: {}, aspd: 170, sage: { sfLv: 10, boltLv: 10, bolts: { Fire: true, Water: false, Wind: false }, hsLv: 10, dbOn: false },
    ec: { on: false }, cards: { daSF: false, vitata: false } };
  const pick = name => `JOBS.Sage.p.findIndex(p=>p.name===${JSON.stringify(name)})`;
  const on = name => { const i = run(pick(name)); assert.ok(i >= 0, name); setup("Sage", { ...sage, preset: i, a: JSON.parse(run(`JSON.stringify(JOBS.Sage.p[${i}])`)) }) };
  on("Spell Fist Lv10");
  near(run("sfChance()"), 0.5); near(run("hsChance()"), 0);
  near(run("sgUpkeep()"), 106 / 300);                                            // Spell Fist's 76 SP and a bolt every 300 s
  on("Hindsight Lv10");
  near(run("sfChance()"), 0); near(run("hsChance()"), 0.2);                       // Lv × 2%, a Lv5 bolt at 100% MATK
  near(run("sgUpkeep()"), 0);
  near(run(`dmgPerHit(${MOB})`), 5 * run(`magicDmg(${MOB},100,'Fire')`));         // one proc is the Hindsight bolt, not Spell Fist's
  near(run(`sfMagic(${MOB})`), 0.2 * run("hsSustain()") * 5 * run(`magicDmg(${MOB},100,'Fire')`));
  on("Spell Fist Lv10 + Hindsight Lv10");
  near(run("sfChance()"), 0.5); near(run("hsChance()"), 0.2);
  near(run(`sfMagic(${MOB})`), 0.5 * run(`sfHit(${MOB},'Fire')`) + 0.2 * run("hsSustain()") * 5 * run(`magicDmg(${MOB},100,'Fire')`));
  // names follow Sage options, or the learned levels with a skill tree; "not learned" at 0
  run("G().sfLv=7;G().hsLv=4");
  assert.equal(run(`levelPreset(JOBS.Sage.p[C().preset],C()).a.name`), "Spell Fist Lv7 + Hindsight Lv4");
  run("C().skills={'spell-fist':3}");
  assert.equal(run(`levelPreset(JOBS.Sage.p[C().preset],C()).lv`), 0);
  assert.equal(run(`levelPreset(JOBS.Sage.p[0],C()).a.name`), "Spell Fist Lv3");
});

t("Foresight: half the variable cast for 5 casts, plus its own 1 s cast, only when that saves time", () => {
  // a made-up spell: 4 s variable + 1 s fixed cast, 0.5 s delay, no monster on you (no interrupted casts)
  const BOLT = { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", vct: 4, fct: 1, cd: 0.5, gcd: 0, sp: 20, targets: 1, cast: 5, delay: 0.5 };
  setup("Sage", { matkTxt: "300", intTxt: "0", st: { dex: "0" }, aspd: 150, sage: { fsOn: true }, cards: { vitata: false }, a: BOLT });
  near(run("plainUseSec()"), 5.5);
  near(run("fsUseSec()"), 2 + 1 + 0.5 + 1 / 5);                                  // half of 4 s, + 1 s, + 0.5 s, + Foresight's 1 s every 5 casts
  assert.equal(run("fsUsed()"), true);
  near(run("useSec()"), 3.7);
  near(run("skillSPPerSec()"), (20 + 1 / 5) / 3.7);                               // Foresight's 1 SP every 5 casts
  run("C().st.dex='200';C().intTxt='130'");                                       // 2 × DEX + INT ≥ 530: no variable cast left to halve
  assert.equal(run("fsUsed()"), false);
  near(run("useSec()"), run("plainUseSec()"));
  run("C().st.dex='0';C().skills={'study':1}");                                   // a skill tree without Foresight learned
  assert.equal(run("fsUsed()"), false);
  run("C().skills={};G().fsOn=false");
  assert.equal(run("fsUsed()"), false);
});

t("Auto Shadow Spell procs on a miss too; card auto-casts need a hit", () => {
  setup("Rogue", { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", matkTxt: "100+50", intTxt: "40", hitTxt: "1", crit: 0, st: {},
    a: JSON.parse(run(`JSON.stringify(JOBS.Rogue.p.find(p=>p.name.startsWith("Shadow Spell: Fire Bolt")))`)) });
  const per = run(`perUse(${MOB})`), hc = run(`hitChance(${MOB})`) / 100, ss = run(`ssDmg(${MOB})`);
  assert.ok(hc < 0.1 && ss > 0);
  overkill(run(`usesPerKill(${MOB})`), per * hc + ss * 0.3, per + ss * 0.3);    // the 30% Shadow Spell isn't cut by the misses
});

t("Duple Light: a physical orb per hit (own hit roll) and a magic orb half the time", () => {
  const dl = JSON.parse(run(`JSON.stringify(JOBS.Priest.p.find(p=>p.dl))`));
  setup("Priest", { atkTxt: "100+150", wAtk: 0, wElem: "Neutral", matkTxt: "200+100", intTxt: "", hitTxt: "250", crit: 0, st: {}, maxSp: 300, a: dl });
  const hc = run(`hitChance(${MOB})`) / 100;
  const orb = (type, pct, el) => run(`withAtk({...C().a,dl:false,type:'${type}',pct:${pct},el:'${el}'},()=>dmgPerHit(${MOB}))`);
  near(run(`dlDmg(${MOB})`), orb("phys", 1000, "W") * hc + orb("magic", 1600, "Neutral") * 0.5);
  const base = run(`dmgPerHit(${MOB})`);
  overkill(run(`usesPerKill(${MOB})`), (base + run(`dlDmg(${MOB})`)) * hc, base + run(`dlDmg(${MOB})`));   // both orbs need the basic attack to land
  near(run("dlUpkeep()"), 100 / 360);                                  // 100 SP every 6 minutes
  run("C().skills={'duple-light':3}");                                   // a skill tree at Lv3: same chances, Lv3 damage %
  near(run(`dlDmg(${MOB})`), orb("phys", 650, "W") * hc + orb("magic", 1040, "Neutral") * 0.5);
  near(run("dlUpkeep()"), 65 / 150);                                   // 65 SP every 150 s
  run("C().skills={}");
  near(run("skillSPPerSec()"), 100 / 360);
  run("C().a={...C().a,dl:false}");
  assert.equal(run(`dlDmg(${MOB})`), 0);
});

t("Blitz Beat: falcon hits that always land, ignore DEF and bonuses; auto Blitz on basic attacks", () => {
  const blitz = JSON.parse(run(`JSON.stringify(JOBS.Hunter.p.find(p=>p.falcon))`));
  setup("Hunter", { atkTxt: "100+150", wAtk: 120, weapon: "Bow", wElem: "Neutral", hitTxt: "1", crit: 0, jobLv: 50, dmgBonus: 50,
    st: { agi: "90", dex: "80", luk: "60" }, a: blitz });
  const per = (Math.floor(90 / 2) + Math.floor(80 / 10)) * 2 + 6 * 10 + 20 * 5;   // Steel Crow Lv10 without a skill tree
  assert.equal(run(`dmgPerHit(${MOB})`), per);                         // Neutral vs Water 1: 100%; the +50% extra damage isn't counted
  assert.equal(run(`hitChance(${MOB})`), 100);
  near(run(`perUse(${MOB})`), per * 5);
  const auto = JSON.parse(run(`JSON.stringify(JOBS.Hunter.p.find(p=>p.autoBlitz))`));
  run(`C().a=${JSON.stringify(auto)}`);
  assert.equal(run("autoBlitzLv()"), 5);                               // Job Lv 50: (50 + 9) / 10 = 5
  near(run(`autoBlitzDmg(${MOB})`), 0.2 * per * 5);                     // LUK 60: 20% per basic attack that hits
  run("C().jobLv=25");
  assert.equal(run("autoBlitzLv()"), 3);
  const hc = run(`hitChance(${MOB})`) / 100;
  const ab = run(`dmgPerHit(${MOB})`) + run(`autoBlitzDmg(${MOB})`);
  overkill(run(`usesPerKill(${MOB})`), ab * hc, ab);
  assert.equal(run(`JOBS.Monk.p[0].pct`), 1600);                       // Throw Spirit Sphere Lv5 on Global: 600 + 200 × Lv
  const fa = JSON.parse(run(`JSON.stringify(JOBS.Hunter.p.find(p=>p.falcon==="assault"))`));
  run(`C().a=${JSON.stringify(fa)};C().baseLv=99`);                    // Falcon Assault Lv5: the Lv5 Blitz Beat hit / 10 × 5 × (55 + 99/5)
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(per / 10 * 5 * (55 + 99 / 5)));
  assert.equal(run(`hitChance(${MOB})`), 100);
  near(run(`perUse(${MOB})`), Math.floor(per / 10 * 5 * (55 + 99 / 5)));
});

t("Martyr's Reckoning, Guillotine Fist, the Chain Crush combo, Excruciating Palm's HP, Cannon Spear crits", () => {
  const mr = JSON.parse(run(`JSON.stringify(JOBS.Crusader.p.find(p=>p.mr))`));
  setup("Crusader", { atkTxt: "100+150", wAtk: 120, weapon: "One-handed sword", wElem: "Neutral", hitTxt: "1", crit: 50, maxHp: 8000, maxSp: 400,
    st: {}, a: mr });
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(0.09 * 8000 * 1.4));     // 9% of Max HP × 1.4 at Lv5, Neutral vs Water 1
  assert.equal(run(`hitChance(${MOB})`), 100);
  assert.equal(run(`critChance(${MOB})`), 0);
  near(run("selfHpPerSec()"), 0.09 * 8000 * run("atkPerSec()"));           // 9% of Max HP per attack
  near(run("skillSPPerSec()"), 20 * run("atkPerSec()"));                    // 100 SP per 5 attacks
  near(run(`(()=>{const d=defense(${MOB});return d.self})()`), 0.09 * 8000 * run("atkPerSec()"));
  const gf = JSON.parse(run(`JSON.stringify(JOBS.Monk.p.find(p=>p.asura))`));
  setup("Monk", { atkTxt: "100+150", wAtk: 120, weapon: "Knuckle", wElem: "Neutral", maxSp: 437, st: { str: "80" }, a: gf });
  assert.equal(run(`pctEff()`), (8 + 43) * 100);                             // (8 + SP/10) × 100% with Max SP 437
  near(run("skillSPPerSec()"), 437 / run("useSec()"));                       // all your SP every use
  const cc = JSON.parse(run(`JSON.stringify(JOBS.Monk.p.find(p=>/Chain Crush/.test(p.name)))`));
  run(`C().a=${JSON.stringify(cc)}`);
  assert.equal(run(`pctEff()`), 4400 + 10 * 80 + 500);                       // 500 (+500 knuckle) + (1600 + 5×STR) + (2300 + 5×STR)
  const ep = JSON.parse(run(`JSON.stringify(JOBS.Monk.p.find(p=>p.name==="Excruciating Palm"))`));
  run(`C().a=${JSON.stringify(ep)}`);
  near(run("selfHpPerSec()"), 200 / run("useSec()"));                        // Excruciating Palm costs 200 HP a use
  const cs = JSON.parse(run(`JSON.stringify(JOBS.Crusader.p.find(p=>/Cannon Spear/.test(p.name)))`));
  setup("Crusader", { atkTxt: "100+150", wAtk: 120, weapon: "Two-handed spear", wElem: "Neutral", hitTxt: "300", crit: 30, critDmg: 20, st: {}, a: cs });
  near(run(`critChance(${MOB})`), 0.3);                                        // Cannon Spear crits with your CRIT
  near(run("critMul()"), 1 + (1.4 * 1.2 - 1) / 2);                              // at half of a crit's extra damage
  run(`C().a={...C().a,critHalf:false}`);
  assert.equal(run(`critChance(${MOB})`), 0);                                  // other skills don't crit
});

t("auto-cast spells from cards work on any job's basic attacks", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", matkTxt: "100+50", intTxt: "40", hitTxt: "300", crit: 0, st: {}, a: AUTO });
  const off = run(`usesPerKill(${MOB})`);
  run("C().ac={on:true,spell:'Fire Bolt',lv:3,pct:5}");
  const per = run(`dmgPerHit(${MOB})`), hc = run(`hitChance(${MOB})`) / 100;
  const bolt = run(`magicDmg(${MOB},120,'Fire')`) * 3;                     // (100 + ½ × 40 INT)% × 3 hits, Fire vs Water 1
  near(run(`acDmg(${MOB})`), bolt);
  overkill(run(`usesPerKill(${MOB})`), per * hc + bolt * 0.05 * hc, per + bolt * 0.05);   // only procs on swings that connect
  assert.ok(run(`usesPerKill(${MOB})`) < off);
  run("C().ac.spell='Soul Strike';C().ac.lv=10");                          // Soul Strike Lv10: 5 Ghost hits
  near(run(`acDmg(${MOB})`), run(`magicDmg(${MOB},100,'Ghost')`) * 5);
  run("C().a={...C().a,type:'phys',pct:400}");                             // skills don't proc it
  assert.equal(run(`acDmg(${MOB})`), 0);
  // a Mage swinging a staff gets both its physical hit and the auto-cast
  setup("Mage", { atkTxt: "60+50", wAtk: 0, wElem: "Neutral", matkTxt: "200+100", intTxt: "80", hitTxt: "300", crit: 0, st: {}, a: AUTO });
  run("C().ac={on:true,spell:'Cold Bolt',lv:10,pct:10}");
  assert.ok(run(`dmgPerHit(${MOB})`) > 1 && run(`acDmg(${MOB})`) > 0);
});

t("elemental converter: one element picked, or the best per monster / map", () => {
  setup("Knight", { atkTxt: "150+200", wAtk: 0, wElem: "Neutral", weapon: "Two-handed sword", hitTxt: "300", st: {}, autoSp: false, potOn: false, cons: [], converters: true, convEl: "",
    a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.equal(run(`JSON.stringify(elOptions())`), JSON.stringify(["Neutral", "Fire", "Water", "Earth", "Wind"]));   // auto: your weapon and each converter
  const jakk = `MOBS.find(m=>m.name==="Jakk")`;
  assert.equal(run(`elemMult(${jakk},"Fire")`), 0);                          // Fire 2 takes nothing from Fire
  assert.equal(run(`mobRow(${jakk},0).el2`), "Water");
  run(`C().convEl="Fire"`);                                                  // only one converter can be on
  assert.equal(run(`JSON.stringify(elOptions())`), JSON.stringify(["Fire"]));
  assert.equal(run(`mobRow(${jakk},0).el2`), "Fire");
  assert.equal(run(`mapStats(mapKey("gef_dun01"),0).el2`), "Fire");
  assert.ok(run(`withEl("Fire",()=>hitPctOf(${jakk}))`) < run(`withEl("Water",()=>hitPctOf(${jakk}))`));
  // bought from players (made by Sages): 3 an hour at what players pay, off zeny/hr; none on the weapon's own element or without a price
  assert.equal(run(`convCostHr()`), 0);
  run(`state.prices[12114]=1500`);
  near(run(`convCostHr()`), 4500);
  near(run(`mobRow(${jakk},0).hc`), 4500);
  run(`C().convEl=""`);
  assert.equal(run(`withEl("Neutral",()=>convCostHr())`), 0);              // auto, on your weapon's own element
  near(run(`withEl("Fire",()=>convCostHr())`), 4500);
  assert.equal(run(`withEl("Water",()=>convCostHr())`), 0);                // no price typed for Water
  run(`C().converters=false`);
  assert.equal(run(`convCostHr()`), 0);
  assert.equal(run(`JSON.stringify(elOptions())`), "[null]");
  run(`delete state.prices[12114]`);
});

t("ASPD potion and buffs from others (RO樂園攻速計算機 values)", () => {
  setup("Knight", { baseLv: 90, atkTxt: "100+300", aspd: 160, weapon: "Two-handed sword", st: { str: "50", agi: "80", vit: "1", int: "1", dex: "40", luk: "1" }, intTxt: "1",
    potOn: true, potType: "conc", cons: [], pbuffs: {}, buffs: {}, skills: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.equal(run(`aspdEff()`), Math.floor(160 + 4 * 80 / 200));          // Concentration: 4 × AGI/200 on top of the typed ASPD
  run(`C().potType="bers";SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.equal(run(`aspdEff()`), Math.floor(160 + 9 * 80 / 200));          // Berserk is 9 and Knights can drink it
  assert.equal(run(`potOk("bers","Priest")`), false);
  // base level (rAthena): Berserk from 85, Awakening from 40; below it the strongest one you can drink is used
  run(`C().baseLv=84`); assert.equal(run(`potOk("bers")`), false); assert.equal(run(`potKey(C())`), "awak");
  run(`C().baseLv=39`); assert.equal(run(`potKey(C())`), "conc");
  run(`C().baseLv=""`); assert.equal(run(`potKey(C())`), "bers");          // blank base level: not held back
  assert.equal(run(`potOk("awak","Bard",99)`), false); assert.equal(run(`potOk("bers","Assassin",99)`), false);
  run(`C().baseLv=90;C().potType="bers"`);
  run(`C().potOn=false;C().pbuffs={incAgi:{on:true,lv:10},canto:{on:true}};SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  const lines = run(`JSON.stringify(aspdBuffLines())`);
  assert.ok(lines.includes('"agi",null,null,19') && !lines.includes('"agi",null,null,12'));   // Canto Candidus replaces Increase AGI
  run(`C().pbuffs={adren:{on:true}}`);
  assert.equal(run(`aspdBuffLines().length`), 0);                           // Adrenaline Rush needs an axe or mace
  run(`C().pbuffs={};C().skills={"two-hand-quicken":10};C().buffs={"two-hand-quicken":true};SKFX=skillEffects(C())`);
  assert.ok(run(`JSON.stringify(SKFX.buffStat)`).includes('"aspd_mod",null,null,7'));      // Two-Hand Quicken: value 7, +10%
  run(`state.job="Hunter";state.chars={};Object.assign(C(),{weapon:"Bow",skills:{"falcon-eyes":10},buffs:{"falcon-eyes":true}});SKFX=skillEffects(C())`);
  assert.equal(run(`SKFX.buffStat.filter(b=>["agi","dex"].includes(b[0])).reduce((a,b)=>a+b[3],0)`), 10);   // Falcon Eyes (True Sight): AGI, DEX +5
});

t("Max SP from Dance Lessons with any weapon, Max HP from Angelus", () => {
  setup("Dancer", { atkTxt: "100+100", aspd: 160, weapon: "Bow", maxHp: 1000, maxSp: 300, st: { vit: "9", int: "11" }, intTxt: "11",
    cons: [], pbuffs: {}, buffs: {}, skills: { "dance-lessons": 10 } });
  const sk = () => JSON.parse(run(`SKFX=skillEffects(C());JSON.stringify({stat:SKFX.stat,mastery:SKFX.mastery})`));
  let fx = sk();
  assert.deepEqual(fx.stat.map(b => [b[0], b[3]]), [["sp_percent", 10]]);   // with a bow: only the Max SP % (a Dancer with no whip had it in game)
  assert.equal(fx.mastery.length, 0);
  run(`C().weapon="Whip"`); fx = sk();
  assert.ok(fx.stat.some(b => b[0] === "sp_percent" && b[3] === 10) && fx.stat.some(b => b[0] === "crit") && fx.mastery.length === 1);
  run(`C().pbuffs={angelus:{on:true,lv:10}};SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.ok(run(`JSON.stringify(aspdBuffLines())`).includes('"hp",null,null,500'));   // Zero's Angelus: Max HP +50 per level
  assert.equal(run(`cf("maxHp")`), 1500);
});

t("Angelus: VIT-based DEF % on the VIT / 2 part of soft DEF, from others or your own Skills card, both modes", () => {
  // status window: VIT 61 -> VIT / 2 = 30; Lv 10 is +50% -> soft DEF +15, typed 40+60 -> 55+60; Max HP 3000 + 500
  setup("Acolyte", { atkTxt: "50+20", aspd: 150, weapon: "One-handed mace", maxHp: 3000, maxSp: 300, defTxt: "40+60", st: { vit: "61", int: "40" }, intTxt: "40",
    cons: [], pbuffs: { angelus: { on: true, lv: 10 } }, buffs: {}, skills: {} });
  run(`SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.equal(run(`cf("defTxt")`), "55+60");
  assert.equal(run(`cf("maxHp")`), 3500);
  assert.equal(run(`pbEff(PBUFF.find(b=>b.k==="angelus"),4)`), "Max HP +200, VIT DEF +20%");
  // your own Angelus Lv 4 from the Skills card: the same lines from its skill text, and the one from others isn't counted twice
  run(`C().skills={"angelus":4};C().buffs={"angelus":true};SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(SKFX.buffStat.map(b=>[b[0],b[3]]))`)), [["vit_def_percent", 20], ["hp", 200]]);
  assert.equal(run(`aspdBuffLines().length`), 0);
  assert.equal(run(`cf("defTxt")`), "46+60");                              // 30 × 20% = 6
  assert.equal(run(`cf("maxHp")`), 3200);
  // build mode: the same on the computed soft DEF and Max HP
  setup("Acolyte", { mode: "build", baseLv: 50, jobLv: 40, build: { base: { str: 1, agi: 1, vit: 60, int: 1, dex: 1, luk: 1 }, gear: {} }, cons: [], consStat: {}, pbuffs: {}, buffs: {}, skills: {} });
  run(`SKFX=skillEffects(C());applyBuild()`);
  const def0 = run(`BUILD_LAST.status.softDef`), vit = run(`BUILD_LAST.total.vit`), hp0 = run(`C().maxHp`);
  run(`C().pbuffs={angelus:{on:true,lv:10}};SKFX=skillEffects(C());applyBuild()`);
  assert.equal(run(`BUILD_LAST.status.softDef`), def0 + Math.floor(Math.floor(vit / 2) / 2));
  assert.equal(run(`C().maxHp`), hp0 + 500);                                // flat Max HP, after the VIT multiplier
  assert.equal(run(`BUILD_LAST.unmodelled.length`), 0);
});

t("buffs from others: Zero's Impositio Manus, Assumptio and Adrenaline Rush values", () => {
  setup("Blacksmith", { atkTxt: "100+100", matkTxt: "50+0", hitTxt: "200", aspd: 160, weapon: "Two-handed axe", maxHp: 4000, defTxt: "40+60", st: { vit: "40" },
    cons: [], pbuffs: { impositio: { on: true, lv: 5 }, assumptio: { on: true, lv: 5 }, adren: { on: true } }, buffs: {}, skills: {} });
  run(`SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.equal(run(`cf("atkTxt")`), "100+125");                            // ATK +25
  assert.equal(run(`cf("defTxt")`), "40+310");                             // Assumptio Lv 5: DEF +250
  assert.equal(run(`cf("hitTxt")`), "220");                                // Adrenaline Rush Lv 5: HIT +20
  assert.equal(run(`consSum("heal_pct")`), 10);                            // Assumptio Lv 5: Heal received +10%
  // build mode: DEF on the gear side, and Heal received isn't listed as not counted (consSum counts it)
  setup("Blacksmith", { mode: "build", baseLv: 50, jobLv: 40, build: { base: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, gear: {} }, cons: [], consStat: {}, pbuffs: { assumptio: { on: true, lv: 5 } }, buffs: {}, skills: {} });
  assert.equal(run(`BUILD_LAST.acc.def`), 250);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(BUILD_LAST.unmodelled)`)), []);
});

t("consumables: + and +% per main stat, old food buffs move into the table", () => {
  setup("Knight", { atkTxt: "100+300", aspd: 160, weapon: "Two-handed sword", st: { str: "50", agi: "80", vit: "1", int: "1", dex: "40", luk: "1" }, intTxt: "1",
    potOn: false, cons: [], consStat: { str: { n: 10, p: 10 } }, pbuffs: { agiFood: { on: true, lv: 7 }, dexFood: { on: false, lv: 5 } }, buffs: {}, skills: {},
    a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.equal(run(`statVal(C(),"str")`), 50 + 10 + Math.floor(60 * 0.10));  // +10, then 10% of 60
  assert.equal(run(`statVal(C(),"agi")`), 87);                              // AGI food Lv 7 from an old save
  assert.equal(run(`JSON.stringify(C().pbuffs)`), "{}");
  assert.equal(run(`potCostHr()`), 0);                                       // consumables carry no zeny cost
  assert.equal(run(`PBUFF.some(b=>b.k==="bandage")`), false);               // Yggdrasil's Blessing (Battle Bandage) is gone
  // the effect text follows the level you typed
  const eff = (k, lv) => run(`pbEff(PBUFF.find(b=>b.k==="${k}"),${lv})`);
  assert.equal(eff("blessing", 5), "STR +5, INT +5, DEX +5, HIT +10");
  assert.equal(eff("incAgi", 3), "AGI +5, ASPD +3%");
  assert.equal(eff("riff", 3), "ASPD +5% (Zero: 17% at Lv 10, not the description's 20%)");
  assert.equal(eff("riff", 10), "ASPD +17% (Zero: 17% at Lv 10, not the description's 20%)");   // Zero: 17%, not 20%
  assert.equal(run(`JSON.stringify(SK_ASPD.study(1))`), run(`JSON.stringify(SK_ASPD.study(10))`)); // Study: a flat potion/skill value 4
  assert.equal(run(`SK_ASPD.study(10)[0][3]`), 4);
  assert.equal(eff("clementia", 70), "STR +17, INT +17, DEX +17 (Blessing Lv 10 + Priest Job Lv/10)");
  run(`C().pbuffs={bandage:{on:true}};SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.equal(run(`statVal(C(),"luk")`), 1);                               // an old save's tick adds nothing
  run(`C().pbuffs={};C().consStat={...C().consStat,dex:{n:7},luk:{n:7}};C().cons=[{on:true,name:"x",eff:"HIT +5"}];applyConsumables()`);
  assert.equal(run(`statVal(C(),"luk")`), 8);
  assert.equal(run(`sumStat(cf("hitTxt"))-sumStat(C().hitTxt)`), 5 + 7 + 2); // HIT +5, DEX +7, and LUK 1 → 8 adds floor(8/3)
  run(`C().addOnTop=false;applyConsumables()`);                             // the typed status window already has them
  assert.equal(run(`statVal(C(),"luk")`), 1);
  assert.equal(run(`cf("hitTxt")`), run(`C().hitTxt`));
  run(`C().addOnTop=true`);
  // Blessing of Yggdrasil (World Tree Dew / Zelstar from the KP shop, 1 hour): all stats +7, ATK/MATK +30, HIT/FLEE +5, no zeny
  run(`C().consStat={};C().cons=[];C().yggOn=true;applyConsumables()`);
  assert.equal(run(`statVal(C(),"luk")`), 8);
  assert.equal(run(`statVal(C(),"str")`), 57);
  // stacking: stat food and Yggdrasil don't add, the higher counts; a course meal stacks on top
  run(`C().consStat={str:{n:10},agi:{n:5}};applyConsumables()`);
  assert.equal(run(`statVal(C(),"str")`), 60); assert.equal(run(`statVal(C(),"agi")`), 80 + 7);  // STR 50 + 10 (not 17); AGI food 5 < 7
  run(`C().cons=[{on:true,name:"Premium Course Meal",eff:"All stats +5, ATK/MATK +20"}];applyConsumables()`);
  assert.equal(run(`statVal(C(),"str")`), 65);
  run(`C().consStat={};C().cons=[];applyConsumables()`);
  assert.equal(run(`sumStat(cf("hitTxt"))-sumStat(C().hitTxt)`), 5 + 7 + 2); // HIT +5, DEX +7, LUK +7
  assert.equal(run(`sumStat(cf("fleeTxt"))-sumStat(C().fleeTxt)`), 5 + 7 + 1); // FLEE +5, AGI +7, LUK +7
  assert.equal(run(`potCostHr()`), 0);
  run(`C().yggOn=false;applyConsumables()`);
  assert.equal(run(`statVal(C(),"luk")`), 1);
  const r = run(`JSON.stringify(BUILD.parseOptions("DEX +5%, LUK +3"))`);
  assert.equal(r, JSON.stringify({ lines: [["dex_percent", null, null, 5], ["luk", null, null, 3]], bad: [] }));
  // your own buffs (+ Add under Buffs from others) count like other consumables, only while ticked
  setup("Merchant", { atkTxt: "100+0", st: { str: "50" }, cons: [], pbuffs: {}, buffs: {}, skills: {}, pbuffOwn: [{ on: true, name: "Guild buff", eff: "STR +5, ATK +20" }] });
  assert.equal(run(`JSON.stringify(consLines().lines)`), JSON.stringify([["str", null, null, 5], ["atk", null, null, 20]]));
  run(`C().pbuffOwn[0].eff="STR +5, nonsense"`); assert.equal(run(`consLines().bad.join()`), "Guild buff: nonsense");
  run(`C().pbuffOwn[0].on=false`); assert.equal(run(`consLines().lines.length`), 0);
});

t("clan: a buff that stays on, two stats +1, Max HP +30, Max SP +10, counted in build mode", () => {
  // build mode counts it like the other buffs
  setup("Knight", { mode: "build", baseLv: 3, jobLv: 1, build: { base: { str: 10, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, gear: {} }, cons: [], consStat: {}, pbuffs: {}, buffs: {}, skills: {}, clan: "archwand" });
  run(`applyBuild()`);
  assert.deepEqual([run(`BUILD_LAST.acc.st.int`), run(`BUILD_LAST.acc.st.dex`), run(`BUILD_LAST.acc.hp`), run(`BUILD_LAST.acc.sp`)], [1, 1, 30, 10]);
  // it stacks with Blessing of Yggdrasil (all stats +7), unlike food
  run(`C().yggOn=true;applyBuild()`);
  assert.equal(run(`BUILD_LAST.acc.st.int`), 8);
  run(`C().yggOn=false;C().clan="crossbow";applyBuild()`);
  assert.deepEqual([run(`BUILD_LAST.acc.st.dex`), run(`BUILD_LAST.acc.st.agi`), run(`BUILD_LAST.acc.st.int`)], [1, 1, 0]);
  assert.equal(run(`clanEff(CLANS.goldenmace)`), "LUK +1, INT +1, Max HP +30, Max SP +10");
  // it can't be switched off, so a typed status window already has it: nothing is added on top
  setup("Knight", { atkTxt: "100+300", aspd: 160, weapon: "Two-handed sword", maxHp: 1000, maxSp: 100, st: { str: "50", agi: "80", vit: "1", int: "1", dex: "40", luk: "1" }, intTxt: "1",
    potOn: false, cons: [], consStat: {}, pbuffs: {}, buffs: {}, skills: {}, clan: "sword" });
  run(`applyConsumables()`);
  assert.equal(run(`statVal(C(),"str")`), 50);
  assert.equal(run(`cf("maxHp")`), 1000);
});

t("Thief Double Attack: daggers hit twice 7% × Lv of the time with HIT +1% × Lv; other weapons don't", () => {
  const AUTO = { name: "Basic attack", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  const ORC = MOB.replace("size:'L'", "size:'M'").replace("hit100:200", "hit100:250");   // a Medium monster you hit 80% of the time
  const base = { atkTxt: "60+150", wAtk: 150, wElem: "Neutral", hitTxt: "230", crit: 0, aspd: 170, st: {}, skills: {}, a: AUTO };
  setup("Thief", { ...base, weapon: "Dagger" });
  const hit = run(`dmgPerHit(${ORC})`);
  near(run(`perUse(${ORC})`), hit);                                          // not learned, no a.da: one hit
  assert.equal(run(`hitChance(${ORC})`), 80);
  run("C().skills={'double-attack':5}");                                     // learned Lv5: 35% twice, HIT +5%
  near(run(`perUse(${ORC})`), hit * 1.35);
  assert.equal(run(`hitChance(${ORC})`), 85);
  run("C().skills={'double-attack':10}");
  near(run(`perUse(${ORC})`), hit * 1.7);
  assert.equal(run(`hitChance(${ORC})`), 90);
  const dagger = run(`dpsOf(${ORC})`);
  run("C().a={...C().a,type:'phys'}");                                       // skills don't double attack
  near(run(`perUse(${ORC})`), hit); assert.equal(run(`hitChance(${ORC})`), 80);
  // the same character with a Saber (one-handed sword): 100% vs Medium, but no Double Attack
  setup("Thief", { ...base, weapon: "One-handed sword", skills: { "double-attack": 10 } });
  near(run(`perUse(${ORC})`), run(`dmgPerHit(${ORC})`)); assert.equal(run(`hitChance(${ORC})`), 80);
  assert.ok(dagger > run(`dpsOf(${ORC})`) * 1.2, "dagger 75% × 1.7 beats a sword's 100% on orcs");
  // no skill tree: the preset that names it counts Lv10, a dagger still needed
  setup("Thief", { ...base, weapon: "Dagger", preset: 0, a: JSON.parse(run("JSON.stringify(JOBS.Thief.p[0])")) });
  near(run(`perUse(${ORC})`), hit * 1.7);
  // a save from before: a Thief on the preset with 1.5 hits averaged in takes the new preset, its session snapshot too
  const old = { ...JSON.parse(run("JSON.stringify(JOBS.Thief.p[0])")), hits: 1.5 }; delete old.da;
  const app = load({ job: "Thief", current: "s", chars: { Thief: { ...base, weapon: "Dagger", preset: 0, a: old } },
    sessions: [{ id: "s", name: "s", job: "Thief", mobIds: [], entries: [], snap: { at: 1, c: { ...base, preset: 0, a: old } } }] });
  assert.deepEqual(JSON.parse(app("JSON.stringify([C().a.hits,C().a.da,cur().snap.c.a.hits,cur().snap.c.a.da])")), [1, true, 1, true]);
});

t("damage taken from race / size / element cuts HP lost, heal cost and raises net zeny", () => {
  // a Thief like Chainsmoker: Poo Poo Hat's own −10% from Demi-Human, Muffler and Boots each rolled "Resistance to Demi-Human 7%"
  run(`state.job="Thief";state.chars={};state.recovery={discount:false};Object.assign(C(),{baseLv:45,jobLv:40,mode:"build",st:{},eq:[],skills:{}})`);
  const orc = "MOBS.find(m=>m.id===1023)", mp = "gef_fild03";
  const set = g => { run(`C().build={base:{str:60,agi:70,vit:20,int:1,dex:30,luk:1},gear:${g}};SKFX=skillEffects(C());applyBuild();applyConsumables()`);
    return JSON.parse(run(`JSON.stringify({mul:takenMul(${orc}),hit:mobHitDmg(${orc}),hpm:hpLossPerMin(${orc}),map:(r=>({hpm:r.hpm,heal:r.heal,net:r.net}))(mapStats(${JSON.stringify(mp)},2)),un:BUILD_LAST.unmodelled})`)); };
  const none = set(`{weapon:{id:1222},garment:{id:480378},shoes:{id:470233}}`);      // the same DEF, no resist
  assert.equal(run(`${orc}.race`), "Demi-Human");
  const res = `{k:"res_race_demi_human",v:7}`;
  const all = set(`{weapon:{id:1222},headTop:{id:2289},garment:{id:480378,opts:[${res}]},shoes:{id:470233,opts:[${res}]}}`);
  near(all.mul, 0.76);
  near(none.mul, 1); near(all.hit, none.hit * 0.76, "a monster's hit");
  assert.ok(all.hpm < none.hpm && all.map.hpm < none.map.hpm && all.map.heal < none.map.heal && all.map.net > none.map.net);
  // typed the way the game names it
  const typed = set(`{weapon:{id:1222},headTop:{id:2289},garment:{id:480378,opts:"Resistance to Demi-Human 7%"},shoes:{id:470233,opts:"Resistance to Demi-Human 7%"}}`);
  near(typed.mul, 0.76); assert.deepEqual(typed.un, []);
  // status window mode: Equipment stats lines, by race, size and element
  run(`C().mode="status";C().eq=[{by:"takenRace",t:"Demi-Human",v:-24}];applyBuild()`); near(run(`takenMul(${orc})`), 0.76);
  run(`C().eq=[{by:"takenSize",t:"M",v:-10},{by:"takenEle",t:"Earth",v:-20}];applyBuild()`); near(run(`takenMul(${orc})`), 0.9 * 0.8);
  run(`C().eq=[{by:"takenSize",t:"L",v:-10}];applyBuild()`); near(run(`takenMul(${orc})`), 1);   // orcs are Medium
  // each kind of cut stops at −70% (official guide, Option Maximum Limit System), each kind on its own
  run(`C().eq=[{by:"takenRace",t:"Demi-Human",v:-50},{by:"takenRace",t:"Demi-Human",v:-40}];applyBuild()`); near(run(`takenMul(${orc})`), 0.3);
  run(`C().eq=[{by:"takenRace",t:"Demi-Human",v:-90},{by:"takenSize",t:"M",v:-80}];applyBuild()`); near(run(`takenMul(${orc})`), 0.3 * 0.3);
});

t("maps too slow to farm rank last with a badge; nrd_dun02 needs base Lv 50", () => {
  run(`state.job="Thief";state.chars={};state.recovery={discount:false};state.maxSec=60;Object.assign(C(),{baseLv:45,jobLv:40,atkTxt:"60+150",hitTxt:"150",fleeTxt:"150",aspd:165,
    defTxt:"20+10",maxHp:3000,maxSp:200,st:{},eq:[],weapon:"Dagger",skills:{}});SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  const rank = () => JSON.parse(run(`JSON.stringify(rankRows(Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)&&!lvLocked(mp)).map(mp=>mapStats(mp,2)).filter(r=>r&&r.N>=20),r=>r.epm).map(r=>({mp:r.mp,rank:r.rank,slow:r.slow,secT:r.secT,epm:r.epm})))`));
  // Lv 45: nrd_dun02 is locked, so it isn't ranked and isn't its Boulder Dwarves' open map
  assert.equal(run("lvLocked('nrd_dun02')"), true);
  assert.ok(!rank().some(r => r.mp === "nrd_dun02"));
  assert.ok(!run("openMaps(MOBS.find(m=>m.id===25327)).some(x=>x[0]==='nrd_dun02')"));
  assert.match(run("lockPill('nrd_dun02')"), /Lv 50\+/);
  // Lv 50: it can be entered, has the best EXP / min, but takes far over 60 s a kill: ranked after every map that isn't too slow
  run("C().baseLv=50");
  let rows = rank(), nrd = rows.find(r => r.mp === "nrd_dun02");
  assert.ok(nrd.secT > 60 && nrd.slow && rows.every(r => r.epm <= nrd.epm));
  const first = rows.findIndex(r => r.slow);
  assert.ok(first > 0 && rows.slice(first).every(r => r.slow) && rows.slice(0, first).every(r => r.secT <= 60));
  assert.match(run("slowPill({slow:true,secT:175})"), /too slow/);
  // the table's default sort (EXP / min) keeps them last too; another column sorts them in place
  run("state.tsort={}");
  const shown = JSON.parse(run(`JSON.stringify(sortRows("bestTable",[{mp:"a",epm:9,slow:true},{mp:"b",epm:5,slow:false},{mp:"c",epm:7,slow:false}]).map(r=>r.mp))`));
  assert.deepEqual(shown, ["c", "b", "a"]);
  run(`state.tsort={bestTable:["secT",1]}`);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(sortRows("bestTable",[{mp:"a",secT:9,slow:true},{mp:"b",secT:5}]).map(r=>r.mp))`)), ["b", "a"]);
  run(`state.tsort={bestTable:["epm",-1]}`);                                  // epm picked by hand is the default column: still last
  assert.deepEqual(JSON.parse(run(`JSON.stringify(sortRows("bestTable",[{mp:"a",epm:9,slow:true},{mp:"b",epm:5}]).map(r=>r.mp))`)), ["b", "a"]);
  run("state.tsort={}");
  // 0 is no limit: back to plain EXP / min
  run("state.maxSec=0"); rows = rank(); assert.equal(rows[0].mp, "nrd_dun02"); assert.ok(!rows.some(r => r.slow));
  run("state.maxSec=200"); assert.equal(rank()[0].mp, "nrd_dun02");                    // an editable limit
  run("delete state.maxSec"); assert.equal(run("maxSecKill()"), 60);                     // saves from before: 60
});

t("a table's saved column filters are listed for the Filters on chip", () => {
  run(`state.tfilt={bestTable:{sus:">80",mp:"",nope:"x"}}`);                // the saved filter that hid every orc map
  assert.deepEqual(JSON.parse(run(`JSON.stringify(activeFilters("bestTable").map(([k,,v])=>[k,v]))`)), [["sus", ">80"]]);
  run("filterRows('bestTable',[])");                                         // draws the chip without failing
  run(`state.tfilt={}`); assert.equal(run(`activeFilters("bestTable").length`), 0);
});

t("FLEE reads like the status window: every FLEE (Improve Dodge included) + Perfect Dodge", () => {
  const b = (job, skills, luk = 25) => { run(`state.job=${JSON.stringify(job)};state.chars={};Object.assign(C(),{baseLv:45,jobLv:40,mode:"build",st:{},eq:[],skills:${JSON.stringify(skills)}});
    C().build={base:{str:40,agi:60,vit:10,int:1,dex:30,luk:${luk}},gear:{}};SKFX=skillEffects(C());applyBuild()`); return run("BUILD_LAST"); };
  const r0 = b("Thief", {}), st = r0.status.flee, pd = 1 + Math.floor(r0.total.luk / 10);
  assert.ok(pd > 1); assert.equal(r0.fields.fleeTxt, `${st}+${pd}`);         // Perfect Dodge 1 + LUK / 10
  // Improve Dodge Lv10: FLEE +30 for a Thief, +40 after the 2nd job, in the first number (not its per-level data lines on top)
  assert.equal(b("Thief", { "improve-dodge": 10 }).fields.fleeTxt, `${st + 30}+${pd}`);
  assert.equal(b("Assassin", { "improve-dodge": 10 }).fields.fleeTxt, `${b("Assassin", {}).status.flee + 40}+${1 + Math.floor(b("Assassin", {}).total.luk / 10)}`);
  // Perfect Dodge from gear goes in the second number
  b("Thief", {});
  run(`C().build.gear={garment:{id:480378,cards:[4285]}};applyBuild()`);     // Muffler with a Choco Card: FLEE +10, Perfect Dodge +5
  assert.equal(run("BUILD_LAST.fields.fleeTxt"), `${st + run("BUILD_LAST.acc.flee")}+${pd + 5}`);
  assert.ok(run("BUILD_LAST.acc.flee") > 0 && !run("BUILD_LAST.unmodelled").some(x => /perfect/i.test(x)));
  // the check against the game compares the FLEE number only
  run(`state.job="Thief"`); assert.equal(run(`CHECKS.find(x=>x[0]==="flee")[2]({fleeTxt:"273+1"})`), 273);
  // other skills with data lines: Owl's Eye Lv10 is DEX +10, Faith Lv10 MHP +2000
  assert.equal(b("Hunter", { "owls-eye": 10 }).total.dex - b("Hunter", {}).total.dex, 10);
  run(`state.job="Crusader";C().skills={faith:10}`); assert.deepEqual(JSON.parse(run("JSON.stringify(skillEffects(C()).stat.filter(x=>x[0]==='hp').map(x=>x[3]))")), [2000]);
});

t("option lines typed before the lists aren't lost when the rows replace them", () => {
  run(`state.job="Knight";state.chars={};Object.assign(C(),{mode:"build",build:{base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{headTop:{id:18730,opts:"MaxHP +100, MaxSP +50, EXP +5%, Healing +3%, Movement Speed +5%"}}}})`);
  assert.match(run("optFoot(buildOf(C()).gear.headTop,2)"), /Kept as typed, not counted: EXP \+5%, Healing \+3%, Movement Speed \+5%/);   // shown before any pick
  run("(()=>{const g=buildOf(C()).gear.headTop,rows=BUILD.optRows(g.opts);rows.push({k:'flee',v:3});optSet(g,rows)})()");   // picking a 3rd option in the lists
  assert.deepEqual(JSON.parse(run("JSON.stringify(buildOf(C()).gear.headTop)")), { id: 18730,
    opts: [{ k: "hp", v: 100 }, { k: "sp", v: 50 }, { k: "flee", v: 3 }], optsText: "EXP +5%, Healing +3%, Movement Speed +5%" });
  assert.match(run("optFoot(buildOf(C()).gear.headTop,3)"), /Kept as typed, not counted: EXP \+5%/);
  assert.match(run("optFoot({},5)"), /max 5 options/); assert.equal(run("optFoot({},4)"), "");
  // taken off and put back on, it comes back with them
  run("(()=>{const g=buildOf(C()).gear.headTop;gearPut(C(),g,2289);gearPut(C(),g,18730)})()");
  assert.equal(run("buildOf(C()).gear.headTop.optsText"), "EXP +5%, Healing +3%, Movement Speed +5%");
  assert.equal(run("buildOf(C()).gear.headTop.opts.length"), 3);
  run("optDrop(buildOf(C()).gear.headTop)"); assert.equal(run("optFoot(buildOf(C()).gear.headTop,3)"), "");   // remove
});

t("in-game gear names fill the item and its cards: card prefixes and suffixes, Double / Triple, cut-off names", () => {
  run(`state.job="Thief";state.chars={};Object.assign(C(),{mode:"build",baseLv:60})`);
  const rd = (slot, txt) => JSON.parse(run(`JSON.stringify(readGear(${JSON.stringify(slot)},${JSON.stringify(txt)}))`));
  assert.deepEqual(rd("headTop", "Novice Criatura Academy Hat"), { id: 18730, refine: null, cards: [4545] });   // Novice Poring Card
  // two Hydra Cards ("Bloody"): the 2-slot Damascus, not the 1-slot copy that would drop one; Triple keeps as many as fit
  assert.deepEqual(rd("weapon", "Double Bloody Damascus"), { id: 510132, refine: null, cards: [4035, 4035] });
  assert.deepEqual(rd("weapon", "+7 Triple Bloody Damascus"), { id: 510132, refine: 7, cards: [4035, 4035] });
  assert.equal(rd("weapon", "Bloody Damascus").cards.length, 1);
  // the equipment window cuts long names: "Hard Nordfeld Soldier" is Nordfeld Soldier's Armor with a Pupa Card
  assert.deepEqual(rd("armor", "Hard Nordfeld Soldier"), { id: 450588, refine: null, cards: [4003] });
  assert.deepEqual(rd("weapon", "+5 Double Bloody Damascus"), { id: 510132, refine: 5, cards: [4035, 4035] });
  // one Hydra Card fits all three Damascus copies: the first is filled in, the other two are in alts
  const one = rd("weapon", "Bloody Damascus");
  assert.deepEqual([one, ...one.alts].map(r => r.id).sort(), [1222, 510132, 510137]);
  assert.deepEqual(rd("garment", "+4 Shark Family Muffler"), { id: 480378, refine: 4, cards: [300835] });
  assert.deepEqual(rd("garment", "Baby Shark Muffler [1]"), { id: 480378, refine: null, cards: [300834] });
  // Poo Poo Hat: damage from Demi-Human −10% of its own
  run(`C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{headTop:{id:2289}}};SKFX=skillEffects(C());applyBuild()`);
  assert.deepEqual(JSON.parse(run("JSON.stringify(C().bx.taken.race)")), { "Demi-Human": -10 });
});

t("cards carry the name they give their gear: affix before or after the item name", () => {
  const card = id => JSON.parse(run(`JSON.stringify((({affix,affixPos})=>({affix,affixPos}))(BUILD.item(${id})))`));
  assert.deepEqual(card(4035), { affix: "Bloody", affixPos: "prefix" });          // Hydra
  assert.deepEqual(card(4003), { affix: "Hard", affixPos: "prefix" });            // Pupa
  assert.deepEqual(card(4545), { affix: "Novice", affixPos: "prefix" });          // Novice Poring
  assert.deepEqual(card(300834), { affix: "Baby Shark", affixPos: "prefix" });
  assert.deepEqual(card(300835), { affix: "Shark Family", affixPos: "prefix" });
  assert.deepEqual(card(4050), { affix: "of Hermes", affixPos: "suffix" });       // Matyr
  assert.equal(run("CARDS.filter(c=>c.affix&&(c.affixPos==='suffix')!==c.affix.startsWith('of ')).length"), 0);
  assert.equal(run("cardName({id:4035})"), "Bloody");
  assert.equal(run("cardName(BUILD.item(4003))"), "Hard");
  // Item info: find card by prefix, by part of it, or from a whole gear name
  const find = q => JSON.parse(run(`JSON.stringify(cardsByAffix(${JSON.stringify(q)}).map(c=>c.id))`));
  assert.deepEqual(find("bloody"), [4035]);
  assert.ok(find("of herm").includes(4050));
  assert.deepEqual(find("+5 Double Bloody Damascus"), [4035]);
  assert.ok(find("Hard Nordfeld Soldier").includes(4003));
  assert.deepEqual(find(" "), []);
});

t("cards any job can slot: Side Winder, Hunter Fly, Vitata", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", hitTxt: "300", crit: 0, aspd: 170, defTxt: "10+10", hitScale: 1, mobInterval: 1.5,
    st: {}, skills: {}, a: AUTO });
  assert.equal(run("JSON.stringify(CRD())"), run("JSON.stringify(CARD_D)"));  // all off for a new job
  const per = run(`perUse(${MOB})`), hp = run(`hpLossPerMin(${MOB})`), fight = run(`fightSec(${MOB})`), sp = run("spNeedPerSec()");
  run("CRD().daSF=true;CRD().daPct=7");                                     // Side Winder: basic attacks hit twice 7% of the time
  near(run(`perUse(${MOB})`), per * 1.07);
  run("C().skills={'double-attack':10}");                                   // Double Attack needs a dagger: without one the card still counts
  near(run(`perUse(${MOB})`), per * 1.07);
  run("C().skills={};C().a={...AUTO_,type:'phys',pct:300,sp:10}".replace("AUTO_", JSON.stringify(AUTO)));
  const skillPer = run(`perUse(${MOB})`);
  run("CRD().daSF=false");
  near(run(`perUse(${MOB})`), skillPer);                                    // skills don't double attack
  run(`C().a=${JSON.stringify(AUTO)}`);
  run("CRD().hfOn=true");                                                   // Hunter Fly: HP back from basic attacks
  const hf = run("hfHpPerSec()"), n = run("atkPerSec()") * 5;
  near(hf, (1 - Math.pow(0.95, n)) * 100);
  near(run(`hpLossPerMin(${MOB})`), Math.max(0, hp - hf * 60));
  const raw = run(`defense(${MOB})`).taken;                                  // Hunter Fly and HP regen each come off once
  near(run(`hpLossPerMin(${MOB})`), Math.max(0, raw - hf - run("hpRegenPerSec()")) * 60);
  run("C().a={...C().a,type:'magic'}");                                     // spells don't trigger it
  assert.equal(run("hfHpPerSec()"), 0);
  run(`C().a=${JSON.stringify(AUTO)};CRD().hfOn=false;CRD().vitata=true`);  // Vitata: you cast Heal Lv1 as on a Sage
  const heals = hp / 60 / 357, f = heals * Math.max(0.3, 1 / run("atkPerSec()"));
  near(run(`healsPerSec(${MOB})`), heals);
  near(run(`fightSec(${MOB})`), fight / (1 - f));
  near(run(`(()=>{SG_MOB=${MOB};try{return spNeedPerSec()}finally{SG_MOB=null}})()`), sp + heals * 13 * 1.25);   // Heal's SP, +25%
  assert.equal(run(`hpLossPerMin(${MOB})`), 0);                             // Heal covers the HP, so no HP items on top
  run("C().hpRegen6=60");                                                   // more HP regen: fewer Heals
  near(run(`healsPerSec(${MOB})`), Math.max(0, raw - 10) / 357);
  run("C().hpRegen6=0");
  run("C().a={...C().a,sp:20}");
  near(run(`(()=>{SG_MOB=${MOB};try{return spNeedPerSec()-defSP()}finally{SG_MOB=null}})()`), 20 * 1.25 / run("useSec()"));   // skills cost +25% SP
  run("C().mode='build';C().build={gear:{acc1:{id:2601,cards:[4053]}}}");    // build mode: the card in your gear already counts its +25%
  assert.equal(run("vitPct()"), 0);
});

t("cards: Hunter Fly and Dracula copies (box or counted in the gear) roll on every attack, one restore at a time", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed sword", hitTxt: "300", aspd: 170, maxSp: 500, st: {}, skills: {}, a: AUTO });
  const n5 = run("atkPerSec()") * 5, n7 = run("atkPerSec()") * 7;
  run("CRD().hfOn=true");
  near(run("hfHpPerSec()"), (1 - Math.pow(0.95, n5)) * 100);              // 1 copy, as before
  run("CRD().hfN=2");                                                      // 2 copies: twice the rolls, still 100 HP/s at most
  near(run("hfHpPerSec()"), (1 - Math.pow(0.95, 2 * n5)) * 100);
  assert.ok(run("hfHpPerSec()") < 2 * (1 - Math.pow(0.95, n5)) * 100);
  run("CRD().hfN=9"); assert.equal(run("hfCards()"), 4);                    // 1–4
  run("CRD().hfN='';CRD().hfOn=false"); assert.equal(run("hfHpPerSec()"), 0);
  run("CRD().dracOn=true");
  near(run("dracSPPerSec()"), (1 - Math.pow(0.9, n7)) * 20);
  run("CRD().dracN=2");
  near(run("dracSPPerSec()"), (1 - Math.pow(0.9, 2 * n7)) * 20);
  run("CRD().dracOn=false;CRD().dracN=1");
  // build mode counts the copies in the gear, and they count as ticked
  run("C().mode='build';C().build={gear:{weapon:{id:1158,cards:[27266,27266,27268,0]}}}");
  assert.equal(run("cardsInGear(C(),[HUNTER_FLY])"), 2); assert.equal(run("hfCards()"), 2); assert.equal(run("dracCards()"), 1);
  const na = run("atkPerSec()") * 5;
  near(run("hfHpPerSec()"), (1 - Math.pow(0.95, 2 * na)) * 100);
  run("C().mode='status'"); assert.equal(run("hfCards()"), 0);               // status window mode: the boxes again
  // an old save without the counts loads as 1, and a share link keeps a 2
  const app = load({ job: "Knight", current: "s1", sessions: [{ id: "s1", name: "t", mobIds: [], entries: [] }], chars: { Knight: { cards: { hfOn: true, dracOn: true } } } });
  assert.equal(app("CRD().hfN"), 1); assert.equal(app("CRD().dracN"), 1); assert.equal(app("hfCards()"), 1);
  run(`state.job="Knight";state.chars={};CRD().hfOn=true;CRD().hfN=2`);
  const packed = JSON.parse(run(`JSON.stringify(packState(state))`));
  assert.ok(!JSON.stringify(packed).includes('"dracN"'));                   // defaults aren't written
  const back = JSON.parse(run(`JSON.stringify(unpackState(${JSON.stringify(packed)}))`));
  assert.equal(back.chars.Knight.cards.hfN, 2);
});

t("cards: a Sage's old Vitata, Hunter Fly and Side Winder settings move out of Sage options", () => {
  const app = load({ job: "Sage", current: "s1", sessions: [{ id: "s1", name: "t", mobIds: [], entries: [] }],
    chars: { Sage: { sage: { hsLv: 10, vitata: false, hfOn: true, hfHp: 120, daSF: true } }, Knight: { sage: { vitata: true } }, Wizard: { sage: { hsLv: 5 } } } });
  const keys = ["vitata", "spBonus", "healSp", "healHp", "hfOn", "hfPct", "hfHp", "daSF", "daPct"];
  assert.equal(app(`JSON.stringify(${JSON.stringify(keys)}.map(k=>state.chars.Sage.cards[k]))`), JSON.stringify([false, 25, 13, 357, true, 5, 120, true, 7]));
  assert.equal(app("Object.keys(CARD_D).filter(k=>k in state.chars.Sage.sage).length"), 0);   // gone from Sage options
  assert.equal(app("state.chars.Sage.sage.hsLv"), 10);
  assert.equal(app("state.chars.Knight.cards"), undefined);                 // only a Sage's settings carry over
  assert.equal(app("JSON.stringify(state.chars.Knight.sage)"), "{}");
  const old = load({ job: "Sage", current: "s1", sessions: [{ id: "s1", name: "t", mobIds: [], entries: [] }], chars: { Sage: { sage: { hsLv: 10 } } } });
  assert.equal(old("state.chars.Sage.cards.vitata"), true);                 // Vitata was on by default in Sage options
  assert.equal(run("state.job='Sage';state.chars={};CRD().vitata"), true);  // and still is for a new Sage
});

t("Energy Coat works on any Mage, Wizard or Sage attack", () => {
  setup("Wizard", { matkTxt: "300+200", aspd: 170, defTxt: "10+10", maxSp: 1000, maxHp: 4000, hitScale: 1, mobInterval: 1.5, spRegen: 40, hpRegen6: 1, st: {}, intTxt: "", autoSp: false,
    a: { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", cast: 0, delay: 1, sp: 1, targets: 1 } });
  assert.equal(run("ecOn()"), false);                                       // off for a new Wizard
  const raw = run(`defense(${MOB})`).taken, sp = run(`(()=>{SG_MOB=${MOB};try{return spNeedPerSec()}finally{SG_MOB=null}})()`);
  run("ECO().on=true");
  let d = run(`defense(${MOB})`);
  assert.equal(d.red, 30);                                                  // 40 SP per 8 s holds full SP: −30%, 3% of Max SP a hit
  near(d.hp, raw * 0.7 - 1 / 6);                                            // less HP regen (1 per 6 s)
  near(d.ecSP, raw / run(`mobHitDmg(${MOB})`) * 0.03 * 1000);
  near(run(`hpLossPerMin(${MOB})`), d.hp * 60);
  near(run(`(()=>{SG_MOB=${MOB};try{return spNeedPerSec()}finally{SG_MOB=null}})()`), sp + d.ecSP);
  run("C().a={...C().a,sp:60}");                                            // the skill eats the regen: SP runs low, −6%
  assert.equal(run(`defense(${MOB})`).red, 6);
  run("C().autoSp=true;C().itemSp=37;ECO().spPct=70");                      // SP items keep it around 70%: −24%
  assert.equal(run(`defense(${MOB})`).red, 24);
  run("state.job='Knight';state.chars={};ECO().on=true");                   // not a Mage-line job
  assert.equal(run("ecOn()"), false);
});

t("Energy Coat: a Sage's old setting moves out of Sage options", () => {
  const S = [{ id: "s1", name: "t", mobIds: [], entries: [] }];
  const app = load({ job: "Sage", current: "s1", sessions: S, chars: { Sage: { sage: { hsLv: 10, ecOn: false, autoSpPct: 30 } }, Wizard: { sage: { ecOn: true } } } });
  assert.equal(app("JSON.stringify(state.chars.Sage.ec)"), JSON.stringify({ on: false, spPct: 30 }));
  assert.equal(app("'ecOn' in state.chars.Sage.sage||'autoSpPct' in state.chars.Sage.sage"), false);
  assert.equal(app("state.chars.Wizard.ec"), undefined);                    // only a Sage's setting carries over
  const old = load({ job: "Sage", current: "s1", sessions: S, chars: { Sage: { sage: { hsLv: 10 } } } });
  assert.equal(old("JSON.stringify(state.chars.Sage.ec)"), JSON.stringify({ on: true, spPct: 50 }));   // it was on by default
  assert.equal(run("state.job='Sage';state.chars={};ecOn()"), true);       // and still is for a new Sage
});

t("SP regen: Increase SP Recovery adds to auto regen; consumables restore SP / HP over time and cut SP cost", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Wizard", { atkTxt: "100+300", maxSp: 500, maxHp: 4000, spRegen: 0, st: { int: "30" }, intTxt: "30", skills: {}, cons: [], a: AUTO });
  const base = run("regenPerSec()");
  near(base, (1 + 5 + 5) / 8);
  run(`C().skills={"increase-sp-recovery":10}`);                           // Lv 10: 10 × (3 + 0.2% of 500) = 40 SP every 10 s
  assert.equal(run("isrPer10()"), 40); near(run("regenPerSec()"), base + 4);
  near(run("withRegenOff(()=>regenPerSec())"), 0);                         // none at 70% weight, like natural regen
  run(`C().skills={};C().cons=[{on:true,name:"Small Mana Potion",eff:"SP +5% every 5s"}]`);
  near(run("consSPPerSec()"), 500 * 0.05 / 5); near(run("regenPerSec()"), base + 5);
  near(run("withRegenOff(()=>regenPerSec())"), 5);                         // keeps going when overweight
  run(`C().cons=[{on:true,name:"",eff:"HP +5% every 5s, SP +2/s"}]`);
  near(run("consHPPerSec()"), 4000 * 0.05 / 5); near(run("consSPPerSec()"), 2);
  run(`C().cons=[{on:true,name:"Mimir's Well",eff:"Max SP +10%, SP consumption -10%"}]`);
  near(run("spCostMul()"), 0.9);
  run(`C().cons[0].on=false`); near(run("spCostMul()"), 1); near(run("consSPPerSec()"), 0);
});

t("event consumables: presets and the effect lines they use", () => {
  setup("Wizard", { atkTxt: "100+300", st: {}, skills: {}, cons: [], fctPct: 10 });
  const lines = eff => run(`JSON.stringify(parseCons(${JSON.stringify(eff)}))`);
  assert.equal(lines("ATK/MATK +30, HIT/FLEE +30"), JSON.stringify({ lines: [["atk", null, null, 30], ["matk", null, null, 30], ["hit", null, null, 30], ["flee", null, null, 30]], bad: [] }));
  assert.equal(JSON.parse(lines("All stats +5")).lines.length, 6);
  assert.equal(lines("Base/Job EXP +50%"), JSON.stringify({ lines: [["exp_base", null, null, 50], ["exp_job", null, null, 50]], bad: [] }));
  assert.equal(lines("Casting cannot be interrupted, Crit damage +5%"), JSON.stringify({ lines: [["no_break", null, null, 1], ["crit_dmg", null, null, 5]], bad: [] }));
  // written the way the item tooltips are
  const kinds = eff => JSON.parse(lines(eff)).lines.map(l => l[0] + " " + l[3]).join(", ");
  assert.equal(kinds("+7 All Stats"), "str 7, agi 7, vit 7, int 7, dex 7, luk 7");
  assert.equal(kinds("HIT/FLEE 30"), "hit 30, flee 30");
  assert.equal(kinds("MHP/MSP +5%"), "hp_percent 5, sp_percent 5");
  assert.equal(kinds("Cri damage / ranged damage / magic damage +5%"), "crit_dmg 5, range_dmg 5, magic_dmg 5");
  assert.equal(kinds("Incoming Heal and Recovery Item effect +20%"), "heal_pct 20, rec_item_pct 20");
  assert.equal(kinds("SP Consumption -5%, Fixed Cast Time -30%"), "sp_cost_percent -5, fct_percent -30");
  // every preset reads without leftovers
  assert.equal(run(`CONS_PRESETS.flatMap(p=>parseCons(p.eff).bad).join()`), "");
  // fixed cast: only the highest % cut counts
  assert.equal(run("fctPctEff()"), 10);
  run(`C().cons=[{on:true,name:"Challenge Drink",eff:CONS_PRESETS[0].eff}]`);
  assert.equal(run("fctPctEff()"), 30); near(run("spCostMul()"), 0.95);
  assert.equal(run("noBreak()"), false);
  run(`C().cons.push({on:true,name:"Unlimited Drink",eff:CONS_PRESETS[4].eff})`); assert.equal(run("noBreak()"), true);
  // Growth Elixir: +50% base and job EXP per kill
  const mob = "({id:-4,name:'E',lv:10,exp:100,job:60,drops:[]})";
  run(`state.bonus=0;state.jobBonus=0`);
  assert.equal(run(`killExp(${mob})`), 100); assert.equal(run(`killJobExp(${mob})`), 60);
  run(`C().cons=[{on:true,name:"Growth Elixir",eff:"Base/Job EXP +50%"}]`);
  assert.equal(run(`killExp(${mob})`), 150); assert.equal(run(`killJobExp(${mob})`), 90);
  // Unlimited Drink: ranged damage only with a ranged weapon, magic damage only on spells
  const tgt = "({id:-5,name:'T',lv:10,hp:1e9,def:0,mdef:0,race:'Brute',size:'M',el:'Neutral',elv:1})";
  setup("Hunter", { atkTxt: "300+200", weapon: "Bow", st: {}, skills: {}, cons: [], a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const bow0 = run(`bonusMul(${tgt})`);
  run(`C().cons=[{on:true,name:"",eff:"Ranged damage +5%, Magic damage +5%"}]`);
  near(run(`bonusMul(${tgt})`), bow0 * 1.05); near(run(`bonusMul(${tgt},true)`) / bow0, 1.05);
  run(`C().weapon="Dagger"`); near(run(`bonusMul(${tgt})`), bow0);
  // Ale's Blessing: HP / SP items and Heal received +20%
  setup("Merchant", { st: {}, cons: [], autoSp: false, potOn: false });
  run(`state.recovery={discount:true}`);
  near(run(`recItem("501").avg`), 45);
  run(`C().cons=[{on:true,name:"Ale's Blessing",eff:CONS_PRESETS.find(p=>p.name==="Ale's Blessing").eff}]`);
  near(run(`recItem("501").avg`), 54); near(run(`recItem("548").avg`), 32 * 1.2);
  run(`CRD().healHp=100`); near(run(`healHpEff()`), 120);
  run(`C().cons=[]`);
});

t("SP back from cards: Dracula, Dark Priest, +5 SP per kill, SP recovery %", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", weapon: "Two-handed sword", hitTxt: "300", crit: 0, aspd: 170, maxSp: 500, spRegen: 0,
    st: { int: "30" }, intTxt: "30", skills: {}, a: AUTO });
  const mob = `({...${MOB},race:'Brute'})`, at = code => run(`(()=>{SG_MOB=${mob};try{return ${code}}finally{SG_MOB=null}})()`);
  const base = at("regenPerSec()");
  near(base, (1 + 5 + 5) / 8);                                              // 1 + 500/100 + 30/6 per 8 s
  run("CRD().dracOn=true");                                                 // Dracula: 10% per attack, 20 SP/s for 7 s
  near(at("dracSPPerSec()"), (1 - Math.pow(0.9, run("atkPerSec()") * 7)) * 20);
  near(at("regenPerSec()"), base + at("dracSPPerSec()"));
  run("CRD().dracOn=false;CRD().dpOn=true");                                // Dark Priest: Sages only
  assert.equal(at("dpSPPerSec()"), 0);
  run("CRD().dpOn=false;CRD().killSp=['Brute']");                           // Nereid: +5 SP per Brute kill, over the fight time
  near(at("killSPPerSec()"), 5 / at(`rawFight(${mob})`));
  assert.equal(at(`(SG_MOB={...SG_MOB,race:'Plant'},killSPPerSec())`), 0);  // other races don't count
  run("C().weapon='Bow'");                                                  // melee only
  assert.equal(at("killSPPerSec()"), 0);
  run("C().weapon='Two-handed sword';C().a={...C().a,type:'magic'}");       // physical only
  assert.equal(at("killSPPerSec()"), 0);
  run(`C().a=${JSON.stringify(AUTO)};CRD().killSp=[]`);
  near(at("regenPerSec()"), base);
  run("C().eq=[{by:'spRec',v:15}];applyBuild()");                           // Eggyra Card in status window mode: an Equipment stats line
  assert.equal(run("spRegen8()"), Math.floor(11 * 1.15));
  run("C().spRegen=20");                                                    // a typed regen already has it
  assert.equal(run("spRegen8()"), 20);
  setup("Sage", { matkTxt: "300+200", atkTxt: "100+300", wAtk: 0, hitTxt: "300", crit: 0, aspd: 170, st: {}, intTxt: "", cards: { dpOn: true } });
  const hc = at(`withAtk(BASIC,()=>hitChance(${mob}))`) / 100;               // Dark Priest on a Sage: 1 SP per physical hit that lands
  near(at("dpSPPerSec()"), run("atkPerSec()") * hc);
  run("C().mode='build';C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{shoes:{id:470011,cards:[4070]}}};applyBuild()");   // build mode: Eggyra in your shoes
  assert.equal(run("C().bx.spRec"), 15);
});

t("HP regen works like SP regen: worked out unless typed, HP Recovery +% gear, Increase HP Recovery, none when overweight", () => {
  setup("Knight", { atkTxt: "100+300", maxHp: 5000, st: { vit: "40" }, skills: {}, cons: [], eq: [], hpRegen6: 0 });
  assert.equal(run("hpRegen6()"), 8 + 25);                                    // VIT/5 + Max HP/200
  near(run("hpRegenPerSec()"), 33 / 6);
  run("C().eq=[{by:'hpRec',v:10}];applyBuild()");                           // Muka Card in status window mode: an Equipment stats line
  assert.equal(run("hpRegen6()"), Math.floor(33 * 1.1));
  run("C().hpRegen6=50");                                                   // a typed regen already has it
  assert.equal(run("hpRegen6()"), 50);
  run("C().skills={'increase-hp-recovery':10}");                            // Increase HP Recovery Lv 10: 10 × (5 + 0.2% of 5000) per 10 s
  assert.equal(run("ihrPer10()"), 150);
  near(run("hpRegenPerSec()"), 50 / 6 + 15);
  assert.equal(run("withRegenOff(()=>hpRegenPerSec())"), 0);                // past 70% weight: none
  run("C().mode='build';C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{acc1:{id:2601,cards:[4036]}}};applyBuild()");   // build mode: Muka in a ring
  assert.equal(run("C().bx.hpRec"), 10);
});

t("an old \"HP back per minute\" box carries over as the 6 s tick", () => {
  const app = load({ chars: { Knight: { hpRegen: 300 }, Sage: { hpRegen: 0 } } });
  assert.equal(app("state.chars.Knight.hpRegen6"), 30);
  assert.equal(app("state.chars.Knight.hpRegen"), undefined);
  assert.equal(app("state.chars.Sage.hpRegen6"), undefined);
});

t("hits interrupt casts unless Phen or Bloody Butterfly", () => {
  const BOLT = { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", cast: 2, delay: 0, sp: 10, targets: 1 };
  setup("Wizard", { matkTxt: "300+200", aspd: 170, fleeTxt: "1", hitScale: 1, mobInterval: 1.5, fixedShare: 0, vctPct: 0, st: {}, intTxt: "", a: BOLT });
  const at = code => run(`(()=>{SG_MOB=${MOB};try{return ${code}}finally{SG_MOB=null}})()`);
  const l = 1 / 1.5;                                                        // FLEE 1: every swing lands
  near(at(`hitsOnYou(${MOB})`), l);
  near(run("castSec()"), 2);
  near(at("castEff()"), Math.expm1(l * 2) / l);                              // restarts after each hit: ~2.9 s on average
  near(at("useSec()"), Math.max(Math.expm1(l * 2) / l, 1 / run("atkPerSec()")));
  run("C().hitScale=0");                                                    // nothing reaches you: the plain cast
  near(at("castEff()"), 2);
  run("C().hitScale=1;CRD().phen=true");                                    // Phen: never interrupted, cast +25%
  near(run("castSec()"), 2.5);
  near(at("castEff()"), 2.5);
  run("CRD().phen=false;CRD().bbfly=true");                                 // Bloody Butterfly: +30%
  near(at("castEff()"), 2.6);
  run("CRD().bbfly=false;C().a={...C().a,type:'auto'}");                    // basic attacks have no cast
  near(at("useSec()"), 1 / run("atkPerSec()"));
  run(`C().a=${JSON.stringify(BOLT)};C().mode='build';C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{acc1:{id:2601,cards:[4077]}}};CRD().phen=true;applyBuild()`);
  assert.equal(run("noBreak()"), true);                                     // build mode: Phen in your gear, its +25% counted from there
  assert.equal(run("vctCards()"), 0);
  near(run("C().vctPct"), -25);
});

t("share links leave out defaults and get every value back", () => {
  run(`state.job="Hunter";C().baseLv=67;C().atkTxt="150+210";AC();CRD().hfOn=true;ECO();
    state.job="Sage";C().eq=[{slot:"w",id:1601,ref:7}];G().bolts={Fire:true,Water:false,Wind:true};CRD();ECO();applyBuild();
    state.job="Assassin";C();state.minLv=40;state.prices={"512":150};
    const s=state.sessions[0];s.mobIds=[1031];s.pauses=[{from:5}];s.entries=[{t:1791227430624,lv:60,pct:0,jpct:0},{t:1791227652213,lv:60,pct:2.44},{t:1791227848687,lv:61,pct:0.5,jpct:3.4,jlv:41}]`);
  const before = JSON.parse(run("JSON.stringify(state)"));
  const packed = run("JSON.stringify(packState(state))");
  assert.ok(packed.length < JSON.stringify(before).length / 2, `packed ${packed.length} of ${JSON.stringify(before).length}`);
  const after = JSON.parse(run(`JSON.stringify(unpackState(JSON.parse(${JSON.stringify(packed)})))`));
  for (const j in before.chars) delete before.chars[j].bx;                     // gear totals: applyBuild works them out again
  // every value the save had comes back; anything new is a default the page would fill in anyway
  const has = (a, b, at) => { if (a && typeof a === "object" && !Array.isArray(a)) for (const k in a) has(a[k], b?.[k], `${at}.${k}`); else assert.deepEqual(b, a, at) };
  has(before, after, "state");
  assert.deepEqual(after.sessions[0].entries, before.sessions[0].entries);
  assert.equal(after.chars.Sage.sage.sfLv, 10);
  assert.equal(run("JSON.stringify(unpackState({sessions:[]}))"), '{"sessions":[]}');  // older links, not packed, load as they are
});

t("share links get a real two-account backup back", () => {
  const bk = JSON.parse(readFileSync(new URL("tests/fixtures/backup-2-accounts.json", root), "utf8"));
  for (const a of bk.accounts) {
    const r = load(a.data);                                                  // the page as it opens with this account saved
    const before = JSON.parse(r("JSON.stringify(state)")), packed = r("JSON.stringify(packState(state))");
    const after = JSON.parse(r(`JSON.stringify(unpackState(JSON.parse(${JSON.stringify(packed)})))`));
    for (const j in before.chars) delete before.chars[j].bx;
    before.sessions.forEach(s => delete s.walk);                              // worked out again from the snapshot
    const has = (x, y, at) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const k in x) has(x[k], y?.[k], `${at}.${k}`); else assert.deepEqual(y, x, at) };
    has(before, after, a.name);
    assert.ok(packed.length < JSON.stringify(before).length, a.name);
  }
});

t("base-level skills scale only above Lv100, except the three Zero skills missing that check", () => {
  const pre = (job, name) => `({...JOBS.${job}.p.find(p=>p.name.startsWith(${JSON.stringify(name)}))})`;
  setup("Assassin", { baseLv: 60, st: { str: 1, int: 1 } });
  run(`C().a=${pre("Assassin", "Meteor Assault")};C().a.sadd=[]`);
  near(run(`pctEff()`), 1400);                                            // Lv60: no × 60/100
  run(`C().a=${pre("Assassin", "Soul Destroyer")};C().a.sadd=[]`);
  near(run(`pctEff()`), 1500 * 60 / 100);                                 // the bug: × 60/100
  // Attack details says so: a real element for the summary line, so the text renderChar writes can be read back
  run(`globalThis.getEl=document.getElementById;const sum={textContent:""};document.getElementById=id=>id==="atkSummary"?sum:getEl(id);
    C().preset=JOBS.Assassin.p.findIndex(p=>p.name.startsWith("Soul Destroyer"));renderChar()`);
  assert.match(run(`$("atkSummary").textContent`), /Zero bug: .*× 60\/100 at Lv 60\): 900% per hit/);
  run(`C().preset=JOBS.Assassin.p.findIndex(p=>p.name.startsWith("Meteor Assault"));C().a=${pre("Assassin", "Meteor Assault")};C().a.sadd=[];renderChar()`);
  assert.match(run(`$("atkSummary").textContent`), /base level only raises it above Lv100, so no change at Lv 60: 1400% per hit/);
  run(`document.getElementById=getEl`);
  setup("Blacksmith", { baseLv: 72, st: {} });
  run(`C().a=${pre("Blacksmith", "Axe Tornado")};C().a.sadd=[]`);
  near(run(`pctEff()`), 4300 * 72 / 100);
  setup("Rogue", { baseLv: 99, st: {} });
  run(`C().a=${pre("Rogue", "Triangle Shot")};C().a.sadd=[]`);
  near(run(`pctEff()`), 2300 * 99 / 100);
  // a save from before blvBug gets it back from the preset
  run(`C().preset=JOBS.Rogue.p.findIndex(p=>p.name.startsWith("Triangle Shot"));delete C().a.blvBug`);
  assert.equal(run(`C().a.blvBug`), true);
  // Sonic Blow is 100% lower on Zero Global at every level: 1100% at Lv10, 600% at Lv5
  setup("Assassin", { st: {} });
  const sb = `JOBS.Assassin.p.find(p=>p.name.startsWith("Sonic Blow"))`;
  run(`C().skills={"sonic-blow":5,"katar-mastery":4}`);
  assert.equal(run(`levelPreset(${sb},C()).a.pct`), 600);
  run(`C().skills={"sonic-blow":10,"katar-mastery":4}`);
  assert.equal(run(`levelPreset(${sb},C()).a.pct`), 1100);
});

t("shield skills add the shield's weight + 4 × its refine to their %", () => {
  const pre = name => `({...JOBS.Crusader.p.find(p=>p.name.startsWith(${JSON.stringify(name)}))})`;
  setup("Crusader", { st: {}, shieldW: 130, shieldRef: 7 });               // a +7 Shield (weight 130), typed in
  run(`C().a=${pre("Rapid Smiting")}`);
  near(run(`pctEff()`), 2600 + 130 + 4 * 7);
  run(`C().a=${pre("Shield Boomerang")}`);
  near(run(`pctEff()`), 400 + 130 + 4 * 7);
  run(`C().a=${pre("Smite")}`);                                            // Smite takes none of it
  near(run(`pctEff()`), 200);
  // build mode reads the Shield row, not the boxes: a +4 Guard (460058) weighs 30
  run(`C().a=${pre("Rapid Smiting")};C().mode='build';C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{shield:{id:460058,refine:4,cards:[]}}};applyBuild()`);
  assert.equal(run(`BUILD.item(460058).w`), 30);
  near(run(`pctEff()`), 2600 + 30 + 4 * 4);
  run(`C().build.gear={};applyBuild()`);                                   // no shield: no bonus
  near(run(`pctEff()`), 2600);
  // every shield the data has carries its weight
  assert.equal(run(`EQUIP.filter(x=>(x.slot||[]).includes("shield")&&!(x.w>0)).map(x=>x.name).join()`), "");
  // a preset saved before the flag existed picks it up again
  run(`C().mode='status';C().preset=JOBS.Crusader.p.findIndex(p=>p.name.startsWith("Rapid Smiting"));delete C().a.shw`);
  assert.equal(run(`C().a.shw`), true);
});

t("skill check: Grimtooth, the Monk combo, Acid Bomb and Axe Boomerang", () => {
  const pre = (job, name) => `({...JOBS.${job}.p.find(p=>p.name.startsWith(${JSON.stringify(name)}))})`;
  setup("Assassin", { st: { agi: 50 } });
  run(`C().a=${pre("Assassin", "Grimtooth")}`);
  near(run(`pctEff()`), 300 + 50);                                         // ATK 300% at Lv5 in game, + AGI
  // Raging Quadruple Blow doubles with a knuckle, Raging Thrust adds 5 × STR
  setup("Monk", { st: { str: 40 }, weapon: "Knuckle" });
  run(`C().a=${pre("Monk", "Combo")}`);
  near(run(`pctEff()`), 1000 + 1600 + 5 * 40);
  run(`C().weapon="One-handed mace"`);
  near(run(`pctEff()`), 500 + 1600 + 5 * 40);
  // Acid Bomb: + 10 × the monster's VIT, only when there's a monster
  setup("Alchemist", { baseLv: 90, st: {}, intTxt: "30" });
  run(`C().a=${pre("Alchemist", "Acid Bomb")}`);
  near(run(`pctEff(${MOB})`), 4000 + 2 * 30 + 10 * 30);                    // the Dummy has VIT 30
  near(run(`pctEff()`), 4000 + 2 * 30);
  // Axe Boomerang: + the axe's weight, typed in or from the Weapon row
  setup("Blacksmith", { baseLv: 90, st: {}, weaponW: 250 });
  run(`C().a=${pre("Blacksmith", "Axe Boomerang")}`);
  near(run(`pctEff()`), 500 + 250);
  const axe = run(`EQUIP.find(x=>x.type==="axe_2h"&&x.w>0).id`);
  run(`C().mode='build';C().build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{weapon:{id:${axe},refine:0,cards:[]}}};applyBuild()`);
  near(run(`pctEff()`), 500 + run(`BUILD.item(${axe}).w`));
  // weapons carry their weight; starter and guild weapons weigh nothing
  assert.equal(run(`EQUIP.filter(x=>(x.slot||[]).includes("weapon")&&x.w>0).length>300`), true);
  assert.equal(run(`EQUIP.find(x=>x.name==="Novice Battle Axe").w`), undefined);
});

t("Farm without items: HP and SP out against regen, cards, Heal and Indulge, graded green / yellow / red", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", aspd: 170, defTxt: "10+10", fleeTxt: "0", maxHp: 6000, maxSp: 300, hitScale: 1, mobInterval: 1.5, hpRegen6: 30, spRegen: 8, st: {}, intTxt: "", a: AUTO });
  const sus = (w = 2) => run(`susMob(${MOB},${w})`), F = run(`rawFight(${MOB})`), raw = run(`defense(${MOB})`).taken;
  let s = sus();
  near(s.hpOutM, raw * F / (F + 2) * 60);                              // HP lost only while fighting
  near(s.hpInM, 5 * 60);                                                // regen (30 per 6 s) over fight + walk
  near(s.hpCov, Math.min(100, 5 * (F + 2) / (raw * F) * 100));
  near(s.spCov, 100);                                                   // basic attacks use no SP
  near(s.score, s.hpCov);
  assert.equal(s.cls, s.score >= 99.95 && s.burst < 0.5 ? "good" : s.score >= 50 && s.burst < 1 ? "warnc" : "bad");
  run("C().fleeTxt='500'");                                             // dodge everything you can (95%): far less HP lost
  assert.ok(sus().hpOutM < s.hpOutM && sus().score >= s.score);
  run("C().fleeTxt='0';C().hpRegen6=6000");                             // regen far above the damage: green
  s = sus(); assert.equal(s.score, 100); assert.equal(s.cls, "good");
  run("C().hpRegen6=1;C().maxHp=10");                                   // one kill takes all your HP and you have no Heal: red
  s = sus(); assert.ok(s.burst >= 1); assert.equal(s.cls, "bad");
  // Heal: spare SP pays for it at the learned level, (BaseLv + INT) / 5 × 3 × Lv + MATK per cast
  setup("Crusader", { baseLv: 60, atkTxt: "100+300", matkTxt: "100", aspd: 170, defTxt: "10+10", fleeTxt: "0", maxHp: 6000, maxSp: 600, hitScale: 1, mobInterval: 1.5, hpRegen6: 6, spRegen: 400, st: {}, intTxt: "40", a: AUTO });
  const noHeal = sus();
  run("C().skills={heal:10,faith:10}");
  const h = run("healOpt()");
  assert.equal(h.name, "Heal Lv10"); near(h.hp, Math.floor((60 + 40) / 5) * 3 * 10 + 100); near(h.sp, 40);
  s = sus();
  assert.ok(s.healsM > 0); near(s.healM, s.healsM * h.hp);
  assert.ok(s.hpCov > noHeal.hpCov); assert.equal(s.burst, 0);         // with a Heal, a long fight isn't a threat on its own
  run("C().spRegen=1");                                                 // little spare SP: only as many Heals as it pays for
  const few = sus(); assert.ok(few.healsM < s.healsM && few.hpCov < s.hpCov);
  // Indulge (Sage): spare HP turns into SP at (10 × Lv)% of 10% of Max HP, less its SP
  setup("Sage", { matkTxt: "300+200", aspd: 170, defTxt: "10+10", fleeTxt: "0", maxSp: 300, maxHp: 4000, hitScale: 0, mobInterval: 1.5, hpRegen6: 600, spRegen: 1, st: {}, intTxt: "",
    sage: { hsOn: false, hsAuto: false }, ec: { on: false }, cards: { vitata: false }, a: { ...AUTO, type: "magic", pct: 100, sp: 30, el: "Fire", cast: 1, delay: 1 } });
  const dry = sus();
  assert.ok(dry.spCov < 100 && dry.hpCov === 100);
  run("C().skills={indulge:5,'increase-sp-recovery':1,'magic-rod':1}");
  const ind = run("indulgeOpt()");
  near(ind.sp, 400 * 0.5 - 5);
  s = sus(); assert.ok(s.indsM > 0 && s.spCov > dry.spCov); near(s.indM, s.indsM * ind.sp);
  // a map adds up its monsters by spawns, and comes back on every EXP Hunter row
  setup("Knight", {});
  const mp = run("Object.keys(MAPMOBS).find(mp=>!isClosed(mp)&&mapStats(mp,2))");
  const r = run(`mapStats(${JSON.stringify(mp)},2)`);
  assert.ok(r.sus && r.sus.score >= 0 && r.sus.score <= 100 && ["good", "warnc", "bad"].includes(r.sus.cls));
  // it never changes what the rest of the page counts (SP items stay on for it)
  run("C().autoSp=true"); const before = run(`itemsOnNow()`); run(`susMob(${MOB},2)`); assert.equal(run(`itemsOnNow()`), before);
});

t("a map's own count of monsters on you: every monster there, hits add up, FLEE / DEF crowd penalty; room dungeons (Labyrinth Forest 1F / 3F, Sunken Ship) start at 3", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", aspd: 170, defTxt: "40+60", fleeTxt: "200", maxHp: 6000, hitScale: 1, mobInterval: 1.5, st: {}, a: AUTO });
  const one = run(`({d:dodge(${MOB}),h:hitsOnYou(${MOB}),dmg:mobHitDmg(${MOB})})`);
  near(one.d, 95 + 200 - 250);                                              // one at a time: as before
  const at = n => run(`(()=>{const k=MOBBED;MOBBED=${n};try{return {d:dodge(${MOB}),h:hitsOnYou(${MOB}),dmg:mobHitDmg(${MOB})}}finally{MOBBED=k}})()`);
  const two = at(2);
  near(two.d, one.d); near(two.h, 2 * one.h); near(two.dmg, one.dmg);       // two: twice the hits, no penalty yet
  const four = at(4);
  near(four.d, Math.max(0, 95 + 200 * 0.8 - 250));                          // 4: FLEE −20%
  near(four.h, 4 * (100 - four.d) / 100 / 1.5);
  near(four.dmg, Math.max(1, 150 * (4000 + 54) / (4000 + 540) - 36));     // DEF −10%: hard 60 → 54, soft 40 → 36
  near(at(20).d, 0);
  near(run(`(()=>{const k=MOBBED;MOBBED=4;try{return crowdN(${MOB})}finally{MOBBED=k}})()`), 4);   // the map's count wins, aggressive or not
  assert.equal(run(`crowdN(${MOB})`), 1);                                   // elsewhere a passive monster is 1 on you                                                        // FLEE can't go below 0
  run("C().fleeTxt='900'"); near(at(1).d, 95);                              // dodge tops out at 95%: 5% of swings always land
  // per map: Labyrinth Forest defaults to 3, a typed count wins, other maps have none (the Character tab's per-monster count applies)
  assert.equal(run("mobbedOf('maz_d01')"), 3); assert.equal(run("mobbedOf('maz_d03')"), 3); assert.equal(run("mobbedOf('prt_maze02')"), null);
  assert.equal(run("mobbedOf('tre_d01')"), 3); assert.equal(run("mobbedOf('tre_d02')"), 3);              // Sunken Ship's cabins: a room dungeon too
  assert.equal(run("mobbedOf('gon_d02')"), 3); assert.equal(run("mobbedOf('sp_d05')"), 3);               // Kunlun's Chess Terrace, Sphinx B5F
  assert.equal(run("mobbedOf('c_tower4')"), null);                                                       // only a few room warps: normal
  assert.equal(run("ROOM_MAPS.every(mp=>MAPMOBS[mp])"), true);                                           // every room dungeon is a real spawn map assert.equal(run(`mobbedOf(mapKey('pay_dun00'))`), null);
  setup("Knight", { fleeTxt: "100", defTxt: "0+0", hpRegen6: 1, hitScale: 1 });   // the default attack hurts Payon Cave's monsters; no DEF, little regen
  const P = JSON.stringify(run("mapKey('pay_dun00')")), set = n => run(`state.mobbed={[${P}]:${n}}`);
  set(4); assert.equal(run(`mobbedOf(${P})`), 4);
  const hp4 = run(`mapStats(${P},2).hpm`); run("state.mobbed={}"); const hp1 = run(`mapStats(${P},2).hpm`);
  assert.ok(hp4 > hp1); assert.equal(run("MOBBED"), null);                     // and nothing outside the map changes
  const s1 = run(`mapStats(${P},2).sus.score`); set(6); assert.ok(s1 >= run(`mapStats(${P},2).sus.score`));
  run("state.mobbed={}");
});

t("preset cast times and delays match the in-game skill table", () => {
  // fixed / variable cast, cooldown and after-cast delay at the preset's level, for every preset the table has a row for
  const bad = run(`(()=>{const out=[];for(const j in JOBS){state.job=j;for(const p of JOBS[j].p){const s=presetSkill(p);if(!s||p.fct==null)continue;
    const r=skRow(s,s.max),near=(a,b)=>Math.abs(a-b)<1e-9;
    if(!near(p.fct,(r[4]||0)/1000)||!near(p.vct,(r[3]||0)/1000)||!near(p.delay,Math.max(r[5]||0,r[6]||0)/1000)||!near(p.gcd||0,(r[5]||0)/1000)||!near(p.cd||0,(r[6]||0)/1000))
      out.push(j+": "+p.name)}}return out.join(", ")})()`);
  assert.equal(bad, "");
});

t("walking comes from the stats a session was logged with: lowering ATK or MATK only adds fight time", () => {
  const bk = JSON.parse(readFileSync(new URL("tests/fixtures/backup-2-accounts.json", root), "utf8"));
  const app = load(bk.accounts[0].data);                                     // a Sage on Spell Fist (Hindsight auto) with 17 sessions
  app("renderAll()");
  assert.equal(app("state.sessions.filter(s=>s.snap&&s.snap.est).length"), 17);   // saved before snapshots: they take today's stats once
  const w0 = app("walkSec()"), maps = app(`JSON.stringify(Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)))`);
  const secs = () => JSON.parse(app(`JSON.stringify(${maps}.map(mp=>{const r=mapStats(mp,walkSec());return r?r.secT:null}))`));
  assert.match(app("walkSrcTxt()"), /^walk calibrated from nrd_dun02 run 8/);
  // the self-check: on every open map, sec / kill never falls when MATK or ATK goes down, and the walking stays put
  let before = secs();
  for (const lower of [`C().matkTxt="114+172"`, `C().matkTxt="114+100"`, `C().atkTxt="29+60"`]) {
    app(`${lower};renderAll()`);
    near(app("walkSec()"), w0, lower);
    const after = secs();
    JSON.parse(maps).forEach((mp, i) => { if (before[i] != null && after[i] != null) assert.ok(after[i] >= before[i] - 1e-9, `${mp}: ${before[i]} → ${after[i]} after ${lower}`) });
    before = after;
  }
  assert.equal(app("C().matkTxt"), "114+100");                               // working a session out puts your character back
  // the reported case: Lv 70, MATK 126+227 then 126+172, with Hindsight on and off: gef_fild06 and mjolnir_05 never get faster
  const two = () => JSON.parse(app(`JSON.stringify(["gef_fild06","mjolnir_05"].map(mp=>{const r=mapStats(mapKey(mp),walkSec());return [r.sec,r.walk,r.secT]}))`));
  for (const hs of [true, false]) {
    app(`C().baseLv=70;C().a={...C().a,hs:${hs}};C().matkTxt="126+227";renderAll()`); const hi = two();
    app(`C().matkTxt="126+172";renderAll()`); const lo = two();
    hi.forEach(([sec, walk, secT], i) => { near(lo[i][1], walk); assert.ok(lo[i][0] > sec && lo[i][2] > secT, `hs ${hs}: ${hi[i]} → ${lo[i]}`) });
  }
});

t("a session keeps the stats it was logged with", () => {
  setup("Knight", { atkTxt: "100+300", hitTxt: "400", wAtk: 0, weapon: "Two-handed spear", wElem: "Neutral", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const t0 = 1e12;
  run(`state.sessions=[{id:'b',name:'b',job:'Knight',mobIds:[1013],entries:[{t:${t0},lv:30,pct:10},{t:${t0 + 36e5},lv:30,pct:15}]}];state.current='b';snapSession(cur())`);   // Wolves
  const w = run("walkSec()");
  near(w, run("pace0(cur(),true).walk"));
  run(`C().atkTxt="100+100";applyConsumables()`);                           // less weapon ATK: longer fights
  near(run("walkSec()"), w);                                                 // the session's walking doesn't move
  assert.ok(run("pace0(cur(),true).walk") < w);                              // (worked out from today's stats it would shrink)
  near(run("sessionPace(cur()).fight") + w, run("sessionPace(cur()).obs"));  // its fight time is the logged one too
  assert.equal(run("C().atkTxt"), "100+100");
  assert.match(run("walkSrcTxt()"), /^walk calibrated from b \(stats from /);
  // logging again takes the stats you have then for the new stretch; the hour logged before keeps its own fight time
  const fOld = run("snapFight(cur(),cur().snap.c)");
  run(`cur().entries.push({t:${t0 + 72e5},lv:30,pct:20});snapSession(cur(),[${t0},${t0 + 36e5}])`);
  assert.equal(run("cur().snapHist.length"), 1);
  const fNew = run("snapFight(cur(),cur().snap.c)"), obs = run("sessionPace(cur()).obs");
  assert.ok(fNew > fOld);
  near(run("walkSec()"), obs - (fOld + fNew) / 2);                          // two equal stretches: half the kills at each fight time
  assert.ok(run("walkSec()") < w && run("walkSec()") > obs - fNew);         // not all of the session at the new stats
  assert.match(run("walkSrcTxt()"), /the entries before keep the stats they were logged with/);
  // logging with stats that don't change the fight time keeps no history
  run(`C().curW=123;cur().entries.push({t:${t0 + 108e5},lv:30,pct:25});snapSession(cur(),[${t0},${t0 + 36e5},${t0 + 72e5}])`);
  assert.equal(run("cur().snapHist.length"), 1);
  // the history survives a share link
  const back = JSON.parse(run("JSON.stringify(unpackState(packState(JSON.parse(JSON.stringify(state)))))"));
  assert.deepEqual(back.sessions[0].snapHist.map(x => [x.t, x.c.atkTxt, "$d" in x]), [[t0 + 36e5, "100+300", false]]);
});

t("deaths: the EXP a death costs isn't negative EXP / hr", () => {
  const t0 = 1e12, L = run("lvExp(30)"), st = es => run(`cur().entries=${JSON.stringify(es)};cur().pauses=[];stats(cur())`);
  // the Died button: your EXP just before (20%), then a second later 10% less
  const b = st([{ t: t0, lv: 30, pct: 10 }, { t: t0 + 36e5, lv: 30, pct: 20 }, { t: t0 + 36e5 + 1000, lv: 30, pct: 10, died: 10 }]);
  near(b.avgRaw, 0.1 * L / ((36e5 + 1000) / 36e5));
  assert.equal(b.deaths, 1);
  near(b.recRaw, 0.1 * L / ((36e5 + 1000) / 36e5));                         // the last minute runs from before the death
  // only the EXP after a death, noted later (the form's "Died since the last entry" or "died" on a pasted line): the 10% comes back
  near(st([{ t: t0, lv: 30, pct: 10 }, { t: t0 + 36e5, lv: 30, pct: 15, died: 10 }]).avgRaw, 0.15 * L);
  // dying at 3%: it takes you to 0%, so only 3% is given back
  near(st([{ t: t0, lv: 30, pct: 0 }, { t: t0 + 36e5, lv: 30, pct: 3 }, { t: t0 + 36e5 + 1000, lv: 30, pct: 0, died: 10 }]).avgRaw, 0.03 * L / ((36e5 + 1000) / 36e5));
  near(st([{ t: t0, lv: 30, pct: 10 }, { t: t0 + 36e5, lv: 30, pct: 5 }]).avgRaw, -0.05 * L);   // a drop not marked as a death still counts
});

t("another tab saved: a stale tab doesn't overwrite it, it adds its new entries and reloads", () => {
  const key = "rozero-farm-planner-v1", sess = (es) => ({ id: "s1", name: "x", mobIds: [], entries: es.map(t => ({ t, lv: 30, pct: t })) });
  const store = { [key]: JSON.stringify({ job: "Knight", current: "s1", tab: "char", sessions: [sess([1, 2])] }) };
  const a = load(null, store), b = load(null, store);                        // two tabs on one account
  for (const tab of [a, b]) tab("globalThis.RELOADS=0;location={reload(){RELOADS++}}");
  a("cur().entries.push({t:3,lv:30,pct:3});save()");
  const rev = JSON.parse(store[key]).rev;
  assert.ok(rev > 0);
  b("cur().entries=cur().entries.filter(e=>e.t!==1);cur().entries.push({t:4,lv:30,pct:4});cur().pauses=[{from:5,to:6}];C().baseLv=55;save()");
  const s = JSON.parse(store[key]);
  assert.deepEqual(s.sessions[0].entries.map(e => e.t), [1, 2, 3, 4]);       // a's entry stays, b's new one is added by time
  assert.deepEqual(s.sessions[0].pauses, [{ from: 5, to: 6 }]);
  assert.equal(s.rev, rev + 1);
  assert.notEqual(s.chars && s.chars.Knight && s.chars.Knight.baseLv, 55);   // b's other changes give way to the newer save
  assert.equal(b("RELOADS"), 1);
  b("cur().entries.push({t:7,lv:30,pct:7});save()");                         // until it has reloaded it writes nothing more
  assert.equal(JSON.parse(store[key]).sessions[0].entries.length, 4);
  a("cur().entries=cur().entries.filter(e=>e.t!==2);save()");               // a, also behind now, merges too: nothing of its own is new
  assert.deepEqual(JSON.parse(store[key]).sessions[0].entries.map(e => e.t), [1, 2, 3, 4]);
  assert.equal(a("RELOADS"), 1);
  const c = load(null, store);                                               // a fresh tab saves as usual
  c("cur().entries=cur().entries.filter(e=>e.t!==2);save()");
  assert.deepEqual(JSON.parse(store[key]).sessions[0].entries.map(e => e.t), [1, 3, 4]);
});

t("HP lost: casters and ranged attackers still take hits; Vitata's Heal covers it instead of HP items", () => {
  const agg = MOB.replace("drops:[]", "drops:[],agg:true");
  setup("Wizard", { matkTxt: "200+300", fleeTxt: "100", defTxt: "10+10", maxHp: 3000, hitScale: 0.3, mobInterval: 1.5, st: { vit: "1" }, a: { name: "x", type: "magic", pct: 100, hits: 3, el: "Fire", cast: 1, delay: 1, sp: 10, targets: 1 } });
  const loss = run(`hpLossPerMin(${agg})`);
  assert.ok(loss > 0);
  near(run(`hpItemsPerMin(${agg})`), loss);
  near(run(`hpTakenPerMin(${agg})`) - run("hpRegenPerSec()") * 60, loss);
  run("CRD().vitata=true");
  assert.ok(run(`hpLossPerMin(${agg})`) > 0);                               // still lost: the Heals cost SP and time instead
  assert.equal(run(`hpItemsPerMin(${agg})`), 0);
  const m = run(`mapStats0("mjolnir_05",2)`);                                // Argiope, Mantis and Driller on Mt. Mjolnir
  assert.ok(m.hpm > 0); assert.equal(m.hpi, 0); assert.equal(m.hpZ, 0);
  setup("Hunter", { atkTxt: "100+300", fleeTxt: "100", defTxt: "10+10", maxHp: 3000, weapon: "Bow", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.ok(run(`hpLossPerMin(${agg})`) > 0);                               // a bow too
});

t("max base level: the EXP Hunter ranks by net zeny, EXP gear lines are flagged", () => {
  setup("Knight", { baseLv: 69 });
  run("state.tsort={}");
  assert.equal(run("MAX_BASE_LV"), 70);
  assert.equal(run(`JSON.stringify(tblSort("bestTable"))`), '["epm",-1]');
  run("C().baseLv=MAX_BASE_LV");
  assert.equal(run(`JSON.stringify(tblSort("bestTable"))`), '["net",-1]');
  run(`state.tsort["bestTable@max"]=["zph",-1]`);                            // a column you pick at the max level is kept for it
  assert.equal(run(`JSON.stringify(tblSort("bestTable"))`), '["zph",-1]');
  run("C().baseLv=60");
  assert.equal(run(`JSON.stringify(tblSort("bestTable"))`), '["epm",-1]');
});

t("EXP Hunter: weight columns and calibration to your logs", () => {
  setup("Knight", { atkTxt: "100+300", hitTxt: "400", wAtk: 0, weapon: "Two-handed spear", wElem: "Neutral", maxW: 3000, curW: 300, sellAt: 70, townMin: 3, st: {},
    a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const r = run(`mapStats0("prt_f08",2)`), wk = run(`(()=>{let a=0,n=0;MAPMOBS.prt_f08.forEach(({m,n:c})=>{if(m.boss||m.expUnknown||!isFinite(fightSec(m)))return;a+=c*weightKill(m);n+=c});return a/n})()`);
  near(r.wk, wk);
  near(r.wph, r.wk * 3600 / r.secT);
  near(r.trip, (3000 * 0.7 - 300) / r.wk * r.secT / 3600);                 // kills to the sell point × seconds a kill
  run("C().maxW=0;C().st={}");
  assert.equal(run(`mapStats0("prt_f08",2).trip`), null);                    // weight off
  const c = run(`(()=>{const r=mapStats0("prt_f08",2),o={...r};calApply(r,0.5);return {o,r}})()`);
  near(c.r.epm, c.o.epm / 2); near(c.r.secT, c.o.secT * 2);
  near(c.r.net, c.o.zg / 2 - (c.o.zg - c.o.zph) - c.o.hpZ);                // loot halves, hourly costs don't
  assert.equal(run("median([3,1,2])"), 2); assert.equal(run("median([4,1,2,3])"), 2.5); assert.equal(run("median([])"), null);
  // two 2-hour sessions: the one the walking comes from projects exactly; the slower one is under its projection
  const t0 = 1e12, sess = (id, pct) => `{id:'${id}',name:'${id}',job:'Knight',mobIds:[1002],entries:[{t:${t0},lv:30,pct:10},{t:${t0 + 72e5},lv:30,pct:${pct}}]}`;
  run(`state.sessions=[${sess("a", 20)},${sess("b", 15)}];state.current='a';state.sessions.forEach(snapSession)`);
  const cal = run(`calInfo(walkSec())`), at = cal.maps[run("sessMap(cur())")].list;
  assert.equal(cal.n, 2);
  near(at.find(x => x.s.id === "a").ratio, 1);
  const rb = at.find(x => x.s.id === "b").ratio;
  assert.ok(rb < 1);
  near(cal.k, (1 + rb) / 2);
});

t("ignore DEF / MDEF of one race, size, element or boss / normal only lowers that monster's defence", () => {
  setup("Knight", { ignDef: 10, ignMdef: 0 });
  const mob = MOB;                                                     // Brute, Large, Water, normal, DEF 20, MDEF 10
  run(`C().bx={...C().bx,ign:{def:{race:{Brute:20},size:{L:5},ele:{Fire:50},kind:{normal:5}},mdef:{race:{Dragon:15},size:{},ele:{},kind:{boss:30}}}}`);
  near(run(`effDef(${mob})`), 20 * (1 - 0.40));                       // 10 plain + 20 Brute + 5 Large + 5 normal; Fire doesn't match
  near(run(`effMdef(${mob})`), 10);                                    // Dragon and boss don't match
  near(run(`effMdef({...${mob},race:'Dragon'})`), 10 * 0.85);
  near(run(`effDef({...${mob},boss:true})`), 20 * (1 - 0.35));         // not a normal monster
  run(`C().bx.ign.def.race.Brute=200`);
  near(run(`effDef(${mob})`), 0);                                      // at most 100%
});

t("other gear sets: up to 3 worked out next to your gear without touching it, swapped in and out; older saves move over", () => {
  run(`state.job="Knight";state.chars={};state.calcMobId=1002;const c=C();c.mode="build";const b=buildOf(c);b.base={str:50,agi:30,vit:10,int:1,dex:30,luk:1};
    const id=n=>EQUIP.find(x=>x.name===n).id;b.gear={weapon:{id:id("Pike")}};b.check={hp:9999};
    altOf(c,0).gear={weapon:{id:id("Zweihander"),refine:7}};altOf(c,2).gear={weapon:{id:id("Pike"),refine:10}};
    SKFX=skillEffects(C());applyBuild();applyConsumables()`);
  assert.deepEqual(JSON.parse(run("JSON.stringify(altList(C()))")), [0, 2]);   // set 2 is empty
  const mine = run("JSON.stringify(gearStats())"), M = JSON.parse(mine);
  const [S1, S3] = [0, 2].map(i => JSON.parse(run(`JSON.stringify(withSnap(altChar(C(),${i}),gearStats))`)));
  assert.ok(S1.atk > S3.atk && S3.atk > M.atk, `${S1.atk} ${S3.atk} ${M.atk}`);
  assert.equal(M.hp, 9999);                                               // the in-game Max HP typed for your gear
  assert.notEqual(S1.hp, 9999);                                           // doesn't count for the other sets
  assert.equal(run("JSON.stringify(gearStats())"), mine);                 // your gear is untouched afterwards
  assert.equal(run("'alts' in altChar(C(),0).build"), false);
  assert.equal(run("altChar(C(),1)"), null);
  // the formulas table: a value per row for each set
  const f = run("(()=>{const av=[0,2].map(i=>withSnap(altChar(C(),i),()=>refFormulas().vals)),r=refFormulas(av);return [av[0].length,av[1].length,r.vals.length,(r.html.match(/class=\"chg\"/g)||[]).length]})()");
  assert.equal(f[0], f[2]); assert.equal(f[1], f[2]); assert.ok(f[3] > 0);
  // the gear table edits the set picked; Swap wears a set and keeps yours in its place
  run("C().gearEdit='alt2'"); assert.equal(run("gearSet()===altOf(C(),2)"), true);
  run("C().gearEdit='alt7'"); assert.equal(run("gearSet()===buildOf(C())"), true);   // no such set
  run("delete C().gearEdit"); assert.equal(run("gearSet()===buildOf(C())"), true);
  const pike = run("buildOf(C()).gear.weapon.id"), zwei = run("altOf(C(),0).gear.weapon.id");
  run("altSwap(C(),0)"); assert.equal(run("buildOf(C()).gear.weapon.id"), zwei); assert.equal(run("altOf(C(),0).gear.weapon.id"), pike);
  run("altSwap(C(),0)"); assert.equal(run("buildOf(C()).gear.weapon.id"), pike);
  assert.equal(run("altOf(C(),2).gear.weapon.refine"), 10);               // the other sets stay as they were
  assert.equal(run("'alts' in (charSnap().build||{})"), false);           // session snapshots don't keep them
  // as many sets as you add, up to ALT_MAX; removing one moves the ones after it up and the table back to your gear
  run("C().gearEdit='alt2'"); assert.equal(run("altAdd(C())"), 3); assert.equal(run("altN(C())"), 4);
  assert.equal(run("altList(C()).join()"), "0,2");                        // the new one is empty
  run("altDel(C(),0)"); assert.equal(run("altN(C())"), 3); assert.equal(run("altOf(C(),1).gear.weapon.refine"), 10);
  assert.equal(run("altIdx(C())"), -1); assert.equal(run("JSON.stringify(altList(C()))"), "[1]");
  run("while(altAdd(C())>=0);"); assert.equal(run("altN(C())"), run("ALT_MAX")); assert.equal(run("altAdd(C())"), -1);
  // older saves: a Try other gear copy is your character again and the gear tried is set 1; one other set (build.alt) is set 1
  const B = id => ({ base: { str: 9 }, gear: { weapon: { id } } });
  const app = load({ job: "Knight", chars: { Knight: { mode: "build", baseLv: 60, build: B(2), trial: { base: { mode: "build", baseLv: 50, build: B(1) } } },
    Wizard: { mode: "build", gearEdit: "alt", build: { ...B(1), alt: { gear: { weapon: { id: 3 } } } } } } });
  assert.equal(app("state.chars.Knight.baseLv"), 50);
  assert.equal(app("JSON.stringify([state.chars.Knight.build.gear,state.chars.Knight.build.alts[0].gear,'trial' in state.chars.Knight])"), JSON.stringify([{ weapon: { id: 1 } }, { weapon: { id: 2 } }, false]));
  assert.equal(app("JSON.stringify([state.chars.Wizard.build.alts[0].gear,'alt' in state.chars.Wizard.build,state.chars.Wizard.gearEdit])"), JSON.stringify([{ weapon: { id: 3 } }, false, "alt0"]));
  // the three sets that were always there: empty ones at the end go, unless the table is editing one
  const E = { gear: {} }, three = load({ job: "Knight", chars: { Knight: { mode: "build", build: { ...B(1), alts: [E, B(2), E, E] } },
    Wizard: { mode: "build", gearEdit: "alt2", build: { ...B(1), alts: [B(2), null, E] } } } });
  assert.equal(three("JSON.stringify(state.chars.Knight.build.alts)"), JSON.stringify([E, B(2)]));
  assert.equal(three("JSON.stringify(state.chars.Wizard.build.alts)"), JSON.stringify([B(2), E, E]));
});

t("remembered gear and saved loadouts: swapping a part out and back keeps its refine, cards and affixes", () => {
  run(`{state.job="Knight";state.chars={};const c=C();c.mode="build";const b=buildOf(c);const id=n=>EQUIP.find(x=>x.name===n).id;
    globalThis.PIKE=id("Pike");globalThis.ZWEI=id("Zweihander");globalThis.CARD=CARDS.find(x=>(x.slot||[]).includes("weapon")).id;
    b.gear={weapon:{id:PIKE,refine:7,cards:[CARD],opts:[{k:BUILD.OPTIONS[0].k,v:5}]}}}`);
  const w = () => JSON.parse(run("JSON.stringify(buildOf(C()).gear.weapon)"));
  run("gearPut(C(),buildOf(C()).gear.weapon,ZWEI)");
  assert.equal(w().id, run("ZWEI")); assert.equal(w().refine, 0); assert.deepEqual(w().cards, []); assert.deepEqual(w().opts, []);   // a new item: +0, bare
  run("buildOf(C()).gear.weapon.refine=4");
  run("gearPut(C(),buildOf(C()).gear.weapon,PIKE)");                                             // back: as it was
  assert.equal(w().refine, 7); assert.deepEqual(w().cards, [run("CARD")]); assert.equal(w().opts.length, 1);
  run("gearPut(C(),buildOf(C()).gear.weapon,ZWEI)"); assert.equal(w().refine, 4); assert.equal(w().opts.length, 0);
  run("memKeep(C(),{id:PIKE,refine:0,cards:[null],opts:[]})"); assert.equal(run("PIKE in memOf(C())"), false);   // nothing to keep
  run("for(let i=0;i<MEM_N+5;i++)memOf(C())[-1-i]={refine:1,cards:[],opts:[],t:i};memKeep(C(),buildOf(C()).gear.weapon)");
  assert.equal(run("Object.keys(memOf(C())).length"), run("MEM_N")); assert.equal(run("ZWEI in memOf(C())"), true);   // the oldest go
  // loadouts: save the table under a name, load another one in its place, the one in the table found again
  run("buildOf(C()).gear={weapon:{id:PIKE,refine:7}};loadoutSave(C(),'Farm')");
  run("buildOf(C()).gear={weapon:{id:ZWEI,refine:9,cards:[]}};loadoutSave(C(),'Boss')");
  assert.equal(run("loadoutAt(C())"), 1);
  run("loadoutLoad(C(),0)"); assert.equal(w().id, run("PIKE")); assert.equal(run("loadoutAt(C())"), 0);
  assert.equal(run("memOf(C())[ZWEI].refine"), 9);                                               // what came off is remembered
  run("buildOf(C()).gear.weapon.refine=8;loadoutSave(C(),' farm ')");                           // same name, any case: replaced
  assert.equal(run("loadoutsOf(C()).length"), 2); assert.equal(run("loadoutsOf(C())[0].gear.weapon.refine"), 8);
  run("altAdd(C());altAdd(C());C().gearEdit='alt1';loadoutLoad(C(),1)");                                                // into the set being edited
  assert.equal(run("altOf(C(),1).gear.weapon.id"), run("ZWEI")); assert.equal(w().refine, 8);
  run("delete C().gearEdit");
  const snap = JSON.parse(run("JSON.stringify(charSnap().build)")); assert.equal("loadouts" in snap || "mem" in snap, false);
  assert.equal(run("'loadouts' in altChar(C(),1).build"), false);
});

t("crowds: aggressive or assisting monsters gang up, and from 3 at once FLEE and DEF drop", () => {
  const agg = MOB.replace("drops:[]", "drops:[],agg:true"), calm = MOB;
  setup("Knight", { atkTxt: "100+300", fleeTxt: "240", defTxt: "20+40", maxHp: 5000, hitScale: 0.3, mobInterval: 1.5, st: { vit: "1" }, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.equal(run(`crowdN(${calm})`), 1); assert.equal(run(`crowdN(${agg})`), 2);         // 2 unless you change it
  assert.equal(run(`crowdN({...${calm},assist:true})`), 2);                                // assist counts like aggressive
  near(run(`hitsOnYou(${agg})`), 2 * run(`hitsOnYou(${calm})`));                         // two swinging, no penalty yet
  near(run(`dodge(${agg})`), 85);                                                         // 95 + 240 − 250
  run("C().crowd=4");
  near(run(`dodge(${agg})`), 95 + 240 * 0.8 - 250);                                      // FLEE −20% with 4 on you
  near(run("crowdDef(4)"), 0.9);
  const hard = 40 * 0.9, soft = 20 * 0.9;                                                 // DEF −10%
  near(run(`mobHitDmg(${agg})`), Math.max(1, 150 * (4000 + hard) / (4000 + 10 * hard) - soft));
  run("C().crowd=null");
  assert.equal(run(`crowdN(${agg})`), 2);
});

t("poison: monsters with Poison Attack poison you part of the time: HP drain, no regen, VIT DEF −25%", () => {
  assert.equal(run(`JSON.stringify(MOBS.find(m=>m.name==="Argiope").poison)`), "[3,500,5000]");   // rAthena: Lv 3, 5% a swing, 5 s delay
  assert.equal(run(`MOBS.find(m=>m.name==="Wolf").assist`), true);
  const pm = MOB.replace("drops:[]", "drops:[],poison:[3,500,5000]");
  setup("Knight", { atkTxt: "100+300", fleeTxt: "100", defTxt: "20+40", maxHp: 5000, hitScale: 0.3, mobInterval: 1.5, baseLv: 50, st: { vit: "0", luk: "0" }, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  assert.equal(run(`poisonUp(${MOB})`), 0);
  // 1 monster: 0.2 swings/s reach you, 5% try it → once every 100 s + 5 s delay; dodge 0 so it lands (120%, capped at 100%); 60% to poison
  const a = 1 / (5 + 1 / (0.2 * 0.05)) * 0.6, D = 60, u = a * D / (1 + a * D);
  near(run(`poisonUp(${pm})`), u);
  near(run("poisonHpPerSec()"), 2 + 75);                                                  // 2 + 1.5% of 5000
  const d = run(`defense(${pm})`);
  near(d.psn, u * 77);
  near(run(`hpRegenPerSec(${pm})`), run("hpRegenPerSec(null)") * (1 - u));                // no natural regen while poisoned
  near(run(`regenPerSec(${pm})`), run("regenPerSec(null)") * (1 - u));
  near(run(`mobHitDmg(${pm})`), 150 * 4040 / 4400 - 20 * (1 - 0.25 * u));               // VIT DEF −25% while poisoned
  run(`C().st={vit:"50",luk:"20"};applyConsumables()`);                                  // VIT and LUK resist it
  const a2 = 1 / (5 + 1 / (0.2 * 0.05)) * Math.max(0, 0.6 * 0.5 - 20 / 1000), D2 = 60 * (1 - 0.0075 * 50) - 2;
  near(run(`poisonUp(${pm})`), a2 * D2 / (1 + a2 * D2));
});

t("a fresh session is named after its map and follows it while the name is the default", () => {
  run(`cur().name="New session";toggleSessMob(25328)`);
  assert.equal(run(`cur().name`), run(`mapCode(sessMap(cur()))`));
  assert.equal(run(`cur().name`), "nrd_dun02");
  run(`toggleSessMob(25329)`);                                       // same map: still its code
  assert.equal(run(`cur().name`), "nrd_dun02");
  run(`cur().name="my run";toggleSessMob(25329)`);                    // a name you typed is kept
  assert.equal(run(`cur().name`), "my run");
});

t("Equipment and Cards tabs: effects text, filters and job names", () => {
  assert.equal(run(`fxLine(["damage_percent","race","demi_human",20])`), "Physical damage vs Demi-Human +20%");
  assert.equal(run(`fxLine(["str",null,null,2])`), "STR +2");
  assert.equal(run(`fxLine(["matk_percent",null,null,1,2])`), "MATK +1% per 2 refines");
  assert.equal(run(`fxLine(["skill_damage_percent",null,null,20,null,"Sonic Blow"])`), "Sonic Blow: Skill damage +20%");
  assert.equal(run(`fxLine(["magic_damage_percent","element","fire",10])`), "Fire magic damage +10%");
  assert.equal(run(`fxGroup({r:7,b:[["hp",null,null,150],["sp",null,null,50]]})`), "at +7: MaxHP +150, MaxSP +50");
  assert.equal(run(`jobsTxt(BUILD.item(480378))`), "All but Novice");                                // Muffler
  assert.equal(run(`jobsTxt(BUILD.item(1407))`), "Swordsman");                                      // Pike
  assert.equal(run(`jobsTxt(BUILD.item(2607))`), "All jobs");                                       // Clip: no job list
  assert.equal(run(`gearKind(BUILD.item(5093))`), "Upper / Middle headgear");                      // Coif
  const ok = (id, f, job = "Knight") => run(`eqDbOk(BUILD.item(${id}),{...EQDB_D,...${JSON.stringify(f)}},${JSON.stringify(job)})`);
  assert.equal(ok(1407, {}), true);                                                                   // a Knight wears Swordsman gear
  assert.equal(ok(1407, {}, "Mage"), false);                                                          // "Your job" by default
  assert.equal(ok(1407, { job: "" }, "Mage"), true);
  assert.equal(ok(1407, { type: "w:spear_1h" }), true); assert.equal(ok(1407, { type: "w:dagger" }), false); assert.equal(ok(1407, { type: "a:" }), false);
  assert.equal(ok(2607, { type: "a:accessory" }), true); assert.equal(ok(5093, { type: "a:head_middle", job: "" }), true);
  assert.equal(ok(1407, { slots: "3" }), true); assert.equal(ok(1407, { slots: "1+" }), true); assert.equal(ok(1168, { slots: "1+" }), false);
  assert.equal(ok(1168, { atk: "200" }), true); assert.equal(ok(1168, { atk: "201" }), false);
  assert.equal(ok(1168, { lvMin: "50" }), false); assert.equal(ok(1168, { lvMax: "48" }), true);
  assert.equal(ok(1407, { q: "pik" }), true); assert.equal(ok(1407, { q: "#1407" }), true);
  const cd = (id, f) => run(`cardDbOk(BUILD.item(${id}),{...CARDDB_D,...${JSON.stringify(f)}})`);
  assert.equal(cd(4122, { slot: "head" }), true); assert.equal(cd(4053, { slot: "accessory" }), true); assert.equal(cd(4035, { slot: "armor" }), false);
  assert.equal(cd(4053, { q: "healing" }), true);                                                    // its in-game name
  assert.equal(cd(4035, { q: "demi-human" }), true);                                                 // its effect
});

t("Equip from the Equipment and Cards tabs: into your gear or another set, headgear in every row it covers, cards in a slot", () => {
  run("state.job='Knight';C().mode='build'");
  assert.equal(run(`JSON.stringify(eqPlaces(BUILD.item(1407),'Knight'))`), JSON.stringify([["weapon"]]));
  assert.equal(run(`JSON.stringify(eqPlaces(BUILD.item(1207),'Assassin'))`), JSON.stringify([["weapon"], ["shield"]]));   // dual wield
  assert.equal(run(`JSON.stringify(eqPlaces(BUILD.item(2607),'Knight'))`), JSON.stringify([["acc1"], ["acc2"]]));
  assert.equal(run(`JSON.stringify(eqPlaces(BUILD.item(5093),'Knight'))`), JSON.stringify([["headTop", "headMid"]]));
  run("eqPut(C(),-1,['weapon'],1407);buildOf(C()).gear.weapon.refine=7");
  assert.equal(run("buildOf(C()).gear.weapon.id"), 1407);
  run("eqPut(C(),-1,['headTop','headMid'],5093)");                                                  // Coif covers upper and middle
  assert.equal(run("JSON.stringify([buildOf(C()).gear.headTop.id,buildOf(C()).gear.headMid.id])"), "[5093,5093]");
  run("eqPut(C(),-1,['headTop'],2217)");                                                             // Biretta: the Coif comes off both rows
  assert.equal(run("JSON.stringify([buildOf(C()).gear.headTop.id,'headMid' in buildOf(C()).gear])"), "[2217,false]");
  // a new set: only that item on, your gear untouched
  run("const i=altAdd(C());eqPut(C(),i,['weapon'],530055)");
  assert.equal(run("JSON.stringify([buildOf(C()).alts[0].gear.weapon.id,buildOf(C()).gear.weapon.id])"), "[530055,1407]");
  assert.equal(run("JSON.stringify(wornIn(C(),1407))"), JSON.stringify(["My gear"]));
  assert.equal(run("JSON.stringify(wornIn(C(),530055))"), JSON.stringify(["Set 1"]));
  // a weapon card: 3 boxes on your Pike, 4 on the set's Pike; none for a garment card
  const ts = JSON.parse(run("JSON.stringify(cardTargets(C(),BUILD.item(4035)).map(x=>[x.set,x.row,x.box]))"));
  assert.equal(ts.length, 7); assert.deepEqual(ts[0], [-1, "weapon", 0]); assert.deepEqual(ts[6], [0, "weapon", 3]);
  assert.equal(run("cardTargets(C(),BUILD.item(4102)).length"), 0);
  run("cardPut(C(),-1,'weapon',2,4035)");
  assert.equal(run("JSON.stringify(buildOf(C()).gear.weapon.cards)"), JSON.stringify([null, null, 4035]));
  assert.equal(run("JSON.stringify(wornIn(C(),4035,true))"), JSON.stringify(["My gear"]));
  // swapping the Pike out and back keeps its refine and card
  run("eqPut(C(),-1,['weapon'],1168);eqPut(C(),-1,['weapon'],1407)");
  assert.equal(run("JSON.stringify([buildOf(C()).gear.weapon.refine,buildOf(C()).gear.weapon.cards])"), JSON.stringify([7, [null, null, 4035]]));
  // a set made here has no "Special equipment" difference from your gear when neither has any
  run("buildOf(C()).special={own:[]};delete buildOf(C()).alts[0].special");
  assert.equal(run("altDiff(C(),0).includes('Special equipment')"), false);
});

t("Equipment and Cards tabs: each item's cell in the icon and card picture sheets", () => {
  const S = JSON.parse(run("JSON.stringify(ICON_SHEETS)"));
  for (const k of ["gear", "card"]) assert.equal(new Set(S[k].ids).size, S[k].ids.length, `${k} ids repeat`);
  const at = (k, id) => S[k].ids.indexOf(id), pos = (k, i) => `-${i % S[k].cols * S[k].w}px -${Math.floor(i / S[k].cols) * S[k].h}px`;
  assert.ok(at("gear", 1168) >= 0); assert.ok(at("card", 4035) >= 0);                               // Zweihander, Hydra Card
  assert.ok(run(`iconHtml("gear",1168)`).includes(`background-position:${pos("gear", at("gear", 1168))}`));
  assert.ok(run(`iconHtml("card",4035)`).includes(`background-position:${pos("card", at("card", 4035))}`));
  assert.ok(run(`iconHtml("gear",-5)`).includes("none"));                                            // no image: an empty cell
  // half size (the gear table's card boxes): the whole sheet scaled with it
  const h = run(`iconHtml("card",4035,.5)`), rows = Math.ceil(S.card.ids.length / S.card.cols), i = at("card", 4035);
  assert.ok(h.includes(`width:${S.card.w / 2}px;height:${S.card.h / 2}px;background-size:${S.card.cols * S.card.w / 2}px ${rows * S.card.h / 2}px;`));
  assert.ok(h.includes(`background-position:-${i % S.card.cols * S.card.w / 2}px -${Math.floor(i / S.card.cols) * S.card.h / 2}px`));
  // its own class: "card" is the page's panel style (padding and a border)
  assert.ok(h.includes('class="ico ico-card"')); assert.ok(!/class="([^"]*)"/.exec(run(`iconHtml("card",4035)`))[1].split(" ").includes("card"));
});

t("Skill tree: each skill's icon cell, by slug", () => {
  const S = JSON.parse(run("JSON.stringify(ICON_SHEETS.skill)")), slugs = JSON.parse(run("JSON.stringify([...new Set(Object.values(SKILLS).flat().flatMap(t=>t.skills.map(s=>s.slug)))])"));
  assert.equal(new Set(S.ids).size, S.ids.length, "skill ids repeat");
  // every skill has one but Skilled Special Singer, which roz.prontera.info has no picture for
  assert.deepEqual(slugs.filter(s => !S.ids.includes(s)), ["skilled-special-singer"]);
  const i = S.ids.indexOf("bash");
  assert.ok(run(`iconHtml("skill","bash")`).includes(`class="ico ico-skill" aria-hidden="true" style="background-position:-${i % S.cols * S.w}px -${Math.floor(i / S.cols) * S.h}px"`));
});

t("Skill tree: quest skills cost no points and are tagged", () => {
  assert.deepEqual(JSON.parse(run(`JSON.stringify(treesOf("Sage").at(-1).skills.filter(s=>s.free).map(s=>s.slug))`)),
    ["elemental-change-water", "elemental-change-wind", "elemental-change-ground", "elemental-change-fire", "create-elemental-converter"]);
  assert.equal(run(`treeUsed(treesOf("Sage").at(-1),{"create-elemental-converter":1,"elemental-change-fire":1,"study":5})`), 5);
  for (const [job, slug] of [["Knight", "charge-attack"], ["Priest", "redemptio"], ["Assassin", "venom-knife"], ["Rogue", "close-confine"]])
    assert.equal(run(`skOf(${JSON.stringify(job)})[${JSON.stringify(slug)}].free`), true, slug);
  const html = run(`treesHtml("Knight",{},70)`);
  assert.match(html, /class="sk quest" data-sk="charge-attack"><span class="qtag"/);
  assert.doesNotMatch(html, /data-sk="bash"><span class="qtag"/);
});

t("Skill tree: the job change gives the quest skills but the Elemental Changes, and 1st and 2nd jobs have the Novice skills in their 1st-job tree", () => {
  assert.deepEqual(JSON.parse(run(`JSON.stringify(Object.values(skOf("Priest")).filter(s=>s.def&&!s.nov).map(s=>s.slug))`)), ["holy-light", "redemptio"]);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(Object.values(skOf("Sage")).filter(s=>s.free&&!s.def&&!s.nov).map(s=>s.slug))`)),
    ["elemental-change-water", "elemental-change-wind", "elemental-change-ground", "elemental-change-fire"]);
  for (const [job, slug] of [["Wizard", "energy-coat"], ["Knight", "charge-attack"], ["Sage", "create-elemental-converter"], ["Rogue", "close-confine"]])
    assert.equal(run(`skOf(${JSON.stringify(job)})[${JSON.stringify(slug)}].def`), true, slug);
  // the client's quest skills: Create Deadly Poison isn't one (it costs points), Venom Knife is; Sonic Acceleration isn't in its Assassin tree
  assert.equal(run(`skOf("Assassin")["create-deadly-poison"].free`), undefined);
  assert.equal(run(`treeUsed(treesOf("Assassin").at(-1),{"create-deadly-poison":1,"venom-knife":1})`), 1);
  assert.equal(run(`skOf("Assassin")["sonic-acceleration"]`), undefined);
  for (const [job, slug] of [["Assassin", "venom-knife"], ["Blacksmith", "dubious-salesmanship"], ["Monk", "spiritual-bestowment"],
    ["Monk", "excruciating-palm"], ["Alchemist", "bioethics"]])
    assert.equal(run(`skOf(${JSON.stringify(job)})[${JSON.stringify(slug)}].free&&skOf(${JSON.stringify(job)})[${JSON.stringify(slug)}].def`), true, slug);
  // the Novice skills sit in the 1st-job tree's first column, as in the game's skill window: Basic Skill Lv 9 from the Novice days (can't
  // be lowered), First Aid and Play Dead the quest skills; none take the 1st job's points
  assert.deepEqual(JSON.parse(run(`JSON.stringify(["Novice","Mage","Wizard"].map(j=>treesOf(j).map(t=>t.job)))`)), [["Novice"], ["Mage"], ["Mage", "Wizard"]]);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(treesOf("Wizard")[0].skills.filter(s=>s.nov).map(s=>[s.slug,s.slot,!!s.def]))`)),
    [["basic-skill", 0, true], ["first-aid", 7, false], ["play-dead", 14, false]]);
  assert.equal(run(`new Set(treesOf("Knight")[0].skills.map(s=>s.slot)).size`), run(`treesOf("Knight")[0].skills.length`));
  assert.equal(run(`state.job="Mage";state.chars={};skLv(C(),"basic-skill")`), 9);
  assert.match(run(`stepSkill(C(),"basic-skill","dn","Mage").join()`), /is learned as a Novice/);
  assert.equal(run(`treeUsed(treesOf("Mage")[0],{"basic-skill":9,"first-aid":1,"cold-bolt":10})`), 10);
  assert.match(run(`treesHtml("Mage",learned(C()),50)`), /data-sk="basic-skill"><span class="qtag" title="Learned as a Novice/);
  // given skills are learned without a click, can't be lowered, and don't count as a tree you set
  run(`state.job="Priest";state.chars={}`);
  assert.equal(run(`skLv(C(),"redemptio")`), 1);
  assert.equal(run(`hasTree(C())`), false);
  assert.equal(run(`learned(C())["holy-light"]`), 1);
  assert.match(run(`stepSkill(C(),"redemptio","dn","Priest").join()`), /comes with the job change/);
  assert.equal(run(`skLv(C(),"redemptio")`), 1);
  run(`raiseSkill(C(),"heal",3)`);
  assert.equal(run(`hasTree(C())`), true);
  const html = run(`treesHtml("Priest",learned(C()),70)`);
  assert.match(html, /class="sk on quest" data-sk="redemptio"><span class="qtag" title="Given at the job change: no skill points">Job<\/span>/);
  assert.match(html, /data-sk="redemptio">[\s\S]*?data-act="dn" aria-label="Lower" disabled>/);
  // the Skill tree tab's plan gets them too
  assert.equal(run(`state.skPlan={job:"Wizard"};planOf().skills["energy-coat"]`), 1);
});

t("Skill tree: a 2nd job's points can go on its 1st-job skills", () => {
  // a Sage at Job Lv 70 (69 points) with 68 in the Sage tree and Increase SP Recovery Lv 1 past the Mage's 49: full, nothing over
  const L = `{...Object.fromEntries(treesOf("Mage")[0].skills.filter(s=>!s.free&&!s.nov).map(s=>[s.slug,0])),"cold-bolt":10,"lightning-bolt":10,"fire-bolt":10,"napalm-beat":7,"soul-strike":5,"safety-wall":5,"stone-curse":1,"earth-spike":1,"increase-sp-recovery":1}`;
  // the Sage from the game's skill window
  const SAGE = { study: 5, "cast-cancel": 1, "magic-rod": 1, "endow-tsunami": 2, "endow-tornado": 2, "endow-blaze": 2, "heavens-drive": 5, "free-cast": 4,
    "spell-breaker": 3, deluge: 3, whirlwind: 3, volcano: 3, hindsight: 10, dispell: 5, "blinding-mist": 1, "land-protector": 3, "double-bolt": 5, "spell-fist": 10 };
  const tally = sage => JSON.parse(run(`JSON.stringify(treeTally("Sage",{...${L},...${JSON.stringify(sage)}},70).map(({used,pts,from,spill,n,over})=>({used,pts,from,spill,n,over})))`));
  const T = tally(SAGE);
  assert.equal(T[0].used, 50); assert.equal(T[1].used, 68);
  assert.deepEqual(T.map(x => [x.from, x.spill, x.n, x.over]), [[1, 0, 49, 0], [0, 1, 69, 0]]);
  assert.match(run(`tallyTxt(${JSON.stringify(T[1])},treesOf("Sage"),1)`), /^68 \+ 1 in Mage = 69 \/ 69$/);
  // one more point is over, on both trees
  const U = tally({ ...SAGE, "free-cast": 5 });
  assert.deepEqual(U.map(x => x.over), [1, 1]);
  // a 1st job has no 2nd-job points to borrow
  assert.equal(run(`treeTally("Mage",${L},50)[0].over`), 1);
});

t("Stylist: a saved look is cleaned, and drawn as the job's body allows", () => {
  const app = load({ stylist: { job: "Knight", sex: "x", hair: "abc", color: -3, dye: 2.6, trans: 1 } });
  assert.equal(app("JSON.stringify(state.stylist)"), JSON.stringify({ job: "Knight", sex: "m", hair: 1, color: 0, dye: 3, trans: true, cos: {}, gear: {} }));
  // the Knight's transcendent look has its own clothes colours; a number past the last falls back to the first
  assert.equal(app("JSON.stringify((({job,trans,sex,dye,dyes})=>({job,trans,sex,dye,dyes}))(styleOf()))"),
    JSON.stringify({ job: "Knight", trans: true, sex: "m", dye: 3, dyes: app("JOB_SPRITES.transPal.Knight.m.c.length") }));
  // Dancers are female only; an unknown job takes yours, and a 1st job has no transcendent look
  app(`state.stylist={job:"Dancer",sex:"m",hair:99,color:0,dye:0,trans:false}`);
  assert.equal(app("styleOf().sex"), "f"); assert.equal(app("styleOf().hair"), 1);
  app(`state.job="Mage";state.stylist.job="Nope";state.stylist.trans=true`);
  assert.equal(app("styleOf().job"), "Mage"); assert.equal(app("styleOf().trans"), false);
  // a hair style on its own: its place on the hair sheet, drawn twice its size
  const h = app("JSON.stringify(JOB_SPRITES.head.f[7])");
  const [x, y, w, hh] = JSON.parse(h);
  assert.match(app(`headCanvas("f",7,3,2)`), new RegExp(`width="${w}" height="${hh}" style="width:${w * 2}px;height:${hh * 2}px" data-head="${x},${y},${w},${hh},0,0" data-hair="f,7,3"`));
});

t("Stylist costumes: worn by slot, drawn on the look from the client's sheets", () => {
  const app = load({ stylist: { job: "Knight", cos: { upper: "19930", middle: -1, garment: 480574, weapon: 1101 } } });
  assert.equal(app("JSON.stringify(state.stylist.cos)"), JSON.stringify({ upper: 19930, garment: 480574 }));   // item ids by slot only
  // a costume that takes two slots (the Annoyed Mask: middle and lower) fills both and takes off what was in them; wearing it again
  // takes it off
  assert.equal(app("JSON.stringify(COSTUMES[19794])"), JSON.stringify(["middle", "lower"]));
  app(`state.stylist.cos={lower:19683};styWear("cos",19794)`);
  assert.equal(app("JSON.stringify(state.stylist.cos)"), JSON.stringify({ middle: 19794, lower: 19794 }));
  app(`styWear("cos",19794)`);
  assert.equal(app("JSON.stringify(state.stylist.cos)"), "{}");
  // on the look: headgear on the head anchor (one costume in two slots drawn once), the garment on the Knight's garment sheet, or the
  // Lord Knight's for the transcendent look
  const cos = "{upper:19930,middle:19794,lower:19794,garment:480574}";
  const html = app(`lookCanvas("Knight",{sex:"m",hair:1,color:0,dye:0,cos:${cos}})`);
  assert.equal((html.match(/data-acc="([^"]*)"/) || [])[1].split(";").length, 2);
  assert.match(html, /data-robe="Knight,(-?\d+,){6}[01]"/);
  assert.match(app(`lookCanvas("Knight",{sex:"m",hair:1,color:0,dye:0,cos:${cos}},true)`), /data-robe="Knight\+,/);
  assert.doesNotMatch(app(`lookCanvas("Knight",{sex:"m",hair:1,color:0,dye:0})`), /data-acc|data-robe/);
  // the canvas grows to hold them: the wings are wider than the Knight
  const w = s => +s.match(/width="(\d+)"/)[1];
  assert.ok(w(html) > w(app(`lookCanvas("Knight",{sex:"m",hair:1,color:0,dye:0})`)));
  // normal headgear shows too, under costumes, as in game: each slot shows its costume, else its headgear, and a piece in two slots
  // shows from its highest. 2225 (upper and middle) with 2218 (lower): both drawn
  const n = L => ((app(`lookCanvas("Knight",{sex:"m",hair:1,color:0,dye:0,...${L}})`).match(/data-acc="([^"]*)"/) || [, ""])[1].split(";").filter(Boolean)).length;
  assert.equal(n("{gear:{upper:2225,middle:2225,lower:2218}}"), 2);
  // an upper costume (5915) covers the whole two-slot headgear; a middle one (19291) doesn't, as the headgear shows from upper
  assert.equal(n("{gear:{upper:2225,middle:2225,lower:2218},cos:{upper:5915}}"), 2);
  assert.equal(n("{gear:{upper:2225,middle:2225,lower:2218},cos:{middle:19291}}"), 3);
  // headgear and costumes are worn apart; the few costumes only the gear data has (named "[Costume] ...") are costumes
  app(`state.stylist.gear={};state.stylist.cos={};styWear("gear",2225);styWear("cos",5915)`);
  assert.equal(app("JSON.stringify([state.stylist.gear,state.stylist.cos])"), JSON.stringify([{ upper: 2225, middle: 2225 }, { upper: 5915 }]));
  assert.equal(app(`Object.keys(COSTUME_LOOKS.gear).filter(i=>styCosName(i).startsWith("[Costume]")).length`), 0);
  assert.equal(app(`STY_COS.cos.middle.includes("19638")`), true);
  // "Start from my look" brings in what the character wears: the gear set's headgear (Goggles in upper and middle, a lower one) and
  // Special equipment's costumes, replacing what the Stylist had
  app(`state.job="Knight";const b=gearSet(C());b.gear={headTop:{id:2225},headMid:{id:2225},headLow:{id:2218},armor:{id:2301}};b.special={costume:{upper:5915,garment:480574}};
    state.look={sex:"m",hair:7,color:2,dye:1,trans:false};state.stylist={job:"Mage",cos:{lower:19683},gear:{}};styFromMine()`);
  assert.equal(app("JSON.stringify(state.stylist)"), JSON.stringify({ job: "Knight", sex: "m", hair: 7, color: 2, dye: 1, trans: false,
    cos: { upper: 5915, garment: 480574 }, gear: { upper: 2225, middle: 2225, lower: 2218 } }));
  // the lists: costumes with a look in the client, by name; one with no look for this body is greyed out, not hidden
  assert.ok(app("STY_COS.cos.upper.length") > 300 && app("STY_COS.cos.garment.length") > 40);
  assert.equal(app(`STY_COS.cos.upper.every((id,i,a)=>!i||styCosName(a[i-1]).localeCompare(styCosName(id))<=0)`), true);
});

t("Stylist animation: every frame of a look, drawn by anchors", () => {
  // every job's body (both genders where it has them) and every hair style has its frames; the pieces' list names their files
  assert.equal(run(`Object.keys(JOB_SPRITES.body).every(j=>Object.keys(JOB_SPRITES.body[j]).every(s=>LOOK_HAS["body/"+j+"-"+s]))`), true);
  assert.equal(run(`["m","f"].every(s=>Object.keys(JOB_SPRITES.head[s]).every(n=>LOOK_HAS["hair/"+n+"-"+s]))`), true);
  // a piece: four actions in 8 directions, frames of layers [image, x, y, mirror, scale x, scale y] and the anchor
  const src = readFileSync(new URL("data/looks/body/Knight-m.js", root), "utf8");
  const p = JSON.parse(src.slice(src.indexOf(",") + 1, src.lastIndexOf(")")));
  assert.deepEqual(Object.keys(p.act), ["stand", "walk", "sit", "attack"]);
  assert.ok(Object.values(p.act).every(dirs => dirs.length === 8 && dirs.every(d => d.f.length > 0 && d.d > 0)));
  assert.ok(p.act.walk[0].f.length > 1 && p.act.walk[0].f.every(([ls, a]) => ls.length && a.length === 2 && ls.every(l => l.length === 6 && p.img[l[0]])));
  // drawn on a canvas stand-in: the body, then the hair attached by anchors; walking moves through the frames with the time
  const drawn = run(`(()=>{LOOKS["body/Knight-m"]={...${JSON.stringify(p)},im:{naturalWidth:1,naturalHeight:1}};
    LOOKS["hair/1-m"]={img:[[0,0,10,10]],act:Object.fromEntries(LOOK_ACTS.map(([a])=>[a,Array.from({length:8},()=>({d:4,f:[[[[0,0,0,0,1,1]],[0,-70]]]}))])),im:{}};
    const calls=[];lookTinted=(k)=>k;const g={imageSmoothingEnabled:true,save(){},restore(){},translate(){},scale(){},drawImage:(im,...a)=>calls.push([im,...a])};
    const o={job:"Knight",trans:false,sex:"m",hair:1,color:0,dye:0,worn:{head:[],robe:null}};
    lookAnimDraw(g,o,"walk",0,0,90,168);const first=calls.splice(0);lookAnimDraw(g,o,"walk",0,150,90,168);
    return JSON.stringify([first.map(c=>c[0]),first.at(-1).slice(5,7),calls[0].slice(1,5)])})()`);
  const [order, hairAt, later] = JSON.parse(drawn);
  assert.deepEqual(order, ["body/Knight-m", "hair/1-m"]);
  const a = p.act.walk[0].f[0][1];
  assert.deepEqual(hairAt, [90 + a[0] - 0 - 5, 168 + a[1] + 70 - 5]);           // the hair's anchor on the body's, the image centred
  assert.deepEqual(later, p.img[p.act.walk[0].f[1][0][0][0]].slice(0, 4));        // 150 ms in: the second walking frame (100 ms each)
});

t("Equipment and Cards tabs: in-game text, where to get it and the Where to get filter", () => {
  // Eddga Card: its bonus line is only MaxHP -25%; Endure is in the in-game text, which the search and the card's effects use
  assert.match(run(`itemText(4123)`), /Endure/);
  const cd = (id, f) => run(`cardDbOk(BUILD.item(${id}),{...CARDDB_D,...${JSON.stringify(f)}})`);
  assert.equal(cd(4123, { q: "endure" }), true);
  assert.equal(cd(4123, { from: "mvp" }), true); assert.equal(cd(4123, { from: "normal" }), false);    // Eddga is an MVP
  assert.equal(cd(4035, { from: "normal" }), true); assert.equal(cd(4035, { from: "mvp" }), false);    // Hydra
  assert.equal(cd(300834, { from: "none" }), true);                                                   // Baby Shark Card: an event card
  assert.equal(cd(4123, { q: "eddga lv 84" }), true);                                                 // by monster
  assert.match(run(`fromTxt(4123)`), /^Eddga Lv 84 \(MVP\) [\d.]+%$/);
  // gear: monster drops (Zweihander from Doppelganger, an MVP), quests (Antlers), the filter on the Equipment tab
  const ok = (id, f) => run(`eqDbOk(BUILD.item(${id}),{...EQDB_D,job:"",...${JSON.stringify(f)}},"Knight")`);
  assert.equal(ok(1168, { from: "mvp" }), true); assert.equal(ok(1168, { from: "quest" }), false);
  assert.equal(ok(2284, { from: "quest" }), true); assert.equal(ok(2284, { from: "none" }), false);
  assert.equal(ok(1168, { q: "doppelganger" }), true);
  assert.match(run(`fromHtml(2284)`), /quest/);
  assert.match(run(`fromHtml(-1)`), /no known source/);
  // champion monsters read as their name, not its code
  assert.equal(run(`JSON.stringify(ITEM_INFO)`).includes("C5_"), false);
});

t("Item info: every item in the client, by category, with the drops' columns blank for the ones no monster drops", () => {
  assert.equal(run(`itemName(5915)`), "[Costume] Angel's Veil");                                     // a costume nothing else names
  assert.equal(run(`clientCat(5915)`), "Costume"); assert.equal(run(`itemGroupTxt(5915)`), "Costume");
  assert.equal(run(`itemName(909)`), "Jellopy"); assert.match(run(`itemGroupTxt(909)`), /^\S/);      // a drop keeps its auto-loot group
  const all = run(`JSON.stringify(allItemIds())`);
  for (const id of ["909", "5915", "1029", "25429", "25470", "501"]) assert.ok(JSON.parse(all).includes(id), id); // drop, costume, material, memorial, recovery
  assert.ok(!JSON.parse(all).includes("15221"));                                                      // gear no monster drops stays on the Equipment tab
  assert.equal(new Set(JSON.parse(all)).size, JSON.parse(all).length);
  assert.ok(run(`CLIENT_CATS.includes("Costume")&&CLIENT_CATS.includes("Consumable")`));
  // the table's columns don't need a drop: Best drop and Dropped by sort as blank
  assert.equal(run(`TABLES.itemTable.cols.best.n({id:"5915",b:null})`), null);
  assert.match(run(`popItem("5915").sub`), /Costume/); assert.match(run(`popItem("5915").body`), /No monster/);
  assert.ok(run(`Object.keys(CLIENT_ITEMS).every(id=>!/ none"/.test(itemIcon(id)))`), "every client item has an icon");
});

t("Item info: the Where to get filter, and other sources the farm tables don't have", () => {
  // War Axe: Chimera (a mini boss) and two MVPs (Turtle General, Lord of Death) drop it, all in the farm tables
  assert.equal(run(`itemFromOk("1306","mvp")`), true);
  assert.equal(run(`itemFromOk("1306","mini")`), true);
  assert.equal(run(`itemFromOk("1306","normal")`), false);
  assert.equal(run(`itemFromOk("507","mini")`), true);                                               // Red Herb: mini bosses drop it
  assert.equal(run(`itemFromOk("507","mvp")`), false);
  assert.equal(run(`itemFromOk("507","")`), true);
  assert.equal(run(`otherSourcesHtml("1306")`), "");                                                  // every one is in the table
  // Tao Gunka's drops: an MVP the farm tables don't have (the database has no HP for it), so only its drop list has it
  const o = run(`otherSourcesHtml("2296")`);
  assert.match(o, /Tao Gunka/); assert.match(o, /MVP/);
  assert.equal(run(`otherSourcesHtml("507")`), "");                                                   // nothing beyond the table
});

t("details popup: a monster, an item, gear and a card, linked to each other", () => {
  assert.equal(run(`infoKind(909)`), "item");                                                        // Jellopy
  assert.equal(run(`infoKind(1168)`), "gear");                                                       // Zweihander
  assert.equal(run(`infoKind(4123)`), "card");                                                       // Eddga Card
  const m = run(`popMob(MOBS.find(m=>m.id===1002))`);                                                // Poring
  assert.equal(m.title, "Poring");
  assert.match(m.body, /data-info="item:909"/);                                                      // its drops open theirs
  assert.match(m.body, /data-infomap="/);                                                            // and its maps the planner
  assert.match(m.acts, /data-infoact="mobinfo"/);
  const i = run(`popItem("909")`);
  assert.match(i.body, /data-infoprice="909"/);                                                      // a box for the player price
  assert.match(i.body, /data-info="mob:1002"/);                                                      // Poring drops it
  const g = run(`popGear(1168)`);
  assert.equal(g.title, "Zweihander");
  assert.match(g.body, /data-info="mob:1046">Doppelganger/);                                          // Doppelganger: an MVP, links to its own
  assert.doesNotMatch(run(`popGear(2296).body`), /data-info="mob:/);                                 // Tao Gunka: an MVP the farm tables don't have
  assert.match(g.acts, /data-infoact="equip"/);
  assert.match(run(`popGear(1306).body`), /data-info="mob:\d+">Chimera/);                             // War Axe: Chimera links to its own
  const c = run(`popCard(4123)`);
  assert.match(c.title, /Eddga/); assert.match(c.acts, /data-infoact="cardtab"/);
  assert.match(run(`fromHtml(1306)`), /data-info="mob:\d+"/);                                         // Where to get links open the popup
});

t("equipment window: gear named as the game shows it, and the job's look (Bards male, Dancers female)", () => {
  setup("Novice", { mode: "build" });
  const muf = run(`EQUIP.find(x=>/muffler/i.test(x.name)).id`), name = run(`BUILD.item(${muf}).name`);
  assert.equal(run(`gameName({id:${muf},refine:5,cards:[]})`), `+5 ${name}`);
  assert.equal(run(`gameName({})`), "");
  // two of one card: "Double <its name>" before the item name
  const card = run(`(CARDS.find(c=>cardName(c)&&c.affixPos!=="suffix"&&!/^of /i.test(cardName(c)))||{}).id`);
  if (card) assert.equal(run(`gameName({id:${muf},refine:0,cards:[${card},${card}]})`), `Double ${run(`cardName(BUILD.item(${card}))`)} ${name}`);
  run(`state.look={sex:"m",hair:2};state.job="Dancer"`);
  assert.match(run(`lookHtml()`), /disabled[^>]*>♀/);                    // a male look still draws a Dancer female
  run(`state.job="Knight"`);
  assert.match(run(`lookHtml()`), /aria-label="Gender">♂/); assert.match(run(`lookHtml()`), /Hair <\/span>2</);
});

t("Recipes: search by item or material, the popup's Made from and Used in, and every item's icon", () => {
  // Cooking from the client's cookbooks (60 dishes, Lv 1–10) in place of the database's 29, the Tip Box's 6 potions and 4 fruit juices,
  // and the 5 Jellostones, 8 Expedition pieces, 5 Mithril crafts, and the client's 4 headgear crafts (the 2 Februs offers on Global, the Hat Maker's 2)
  assert.equal(run(`RECIPES.filter(r=>r.cat!=="Cooking").length+60+10+18+4`), run(`RECIPE_LIST.length`));
  assert.equal(run(`RECIPE_LIST.filter(r=>r.cat==="Headgear").length`), 4);
  assert.equal(run(`recipeNpc(RECIPE_LIST.find(r=>r.id===19357))`), "Februs · prontera 50,293");                            // Clock Casket
  assert.equal(run(`JSON.stringify(RECIPE_LIST.find(r=>r.id===19358).mats)`), "[[1061,200],[983,5],[2252,1],[25506,1],[25429,50]]"); // Black Witch Hat
  assert.equal(run(`RECIPE_LIST.find(r=>r.id===19357).fee`), 50000);
  assert.ok(run(`!RECIPE_LIST.some(r=>[19361,19332,19356].includes(r.id))`), "Februs's crafts Global doesn't offer yet stay out");
  assert.match(run(`recipeNpcHtml(RECIPE_LIST.find(r=>r.id===19333))`), /data-copynavi="\/navi aldebaran 130\/140"/);          // Hat Maker
  assert.match(run(`recipeNpcHtml(RECIPE_LIST.find(r=>r.id===19357))`), />\/navi prontera 50\/293</);                            // Februs
  assert.equal(run(`RECIPE_LIST.filter(r=>r.cat==="Potions").length`), 6); assert.equal(run(`RECIPE_LIST.filter(r=>r.cat==="Fruit Juice").length`), 4);
  assert.equal(run(`recipeNpc(RECIPE_LIST.find(r=>r.id===502&&r.cat==="Potions"))`), "Old Pharmacist · alberta_in 16,28");   // Orange Potion: Red + Yellow Herb
  assert.equal(run(`recipeNpc(RECIPE_LIST.find(r=>r.id===531))`), "Marienne (quest) · prt_in 49,172");                     // Apple Juice
  assert.ok(run(`TIPBOX_RECIPES.every(r=>RECIPE_CATS.includes(r.cat)&&r.fee>0&&r.mats.every(([id,n])=>!/^#|Unknown/.test(itemName(id))&&n>0))`));
  // the database's dyes and Mixture & Counteragent have the Tip Box guide's materials and fees
  assert.ok(run(`TIPBOX_RECIPES.filter(r=>!TIPBOX_ONLY.includes(r)).every(t=>{const d=RECIPES.find(r=>r.cat===t.cat&&r.id===t.id);
    return d&&d.fee===t.fee&&JSON.stringify([...d.mats].sort())===JSON.stringify([...t.mats].sort())})`));
  assert.equal(run(`RECIPE_LIST.filter(r=>r.cat==="Cooking"&&r.lv===3).length`), 6);
  assert.equal(run(`JSON.stringify(RECIPE_LIST.find(r=>r.id===12048).mats)`), "[[518,2],[509,10],[7452,1]]");   // Honey Herbal Tea: the book's 2 Honey
  assert.ok(run(`RECIPE_LIST.filter(r=>r.cat==="Cooking").every(r=>r.mats.every(([id])=>!/^#|Unknown/.test(itemName(id))&&!/ none"/.test(itemIcon(id))))`), "every ingredient has a name and an icon");
  assert.equal(run(`shopPrice(7472)`), 750); assert.equal(run(`shopPrice(12127)`), 2000);              // the Cooking Ingredient Trader
  assert.ok(run(`RECIPES.every(r=>RECIPE_CATS.includes(r.cat)&&r.mats.length&&r.mats.every(([id,n])=>RECIPE_ITEMN[id]&&n>0))`));
  assert.equal(run(`itemName(1301)`), "Axe");                                                          // a recipe's name for an item no monster drops
  const ok = (q, cat) => run(`RECIPES.filter(r=>recipeOk(r,{q:${JSON.stringify(q)},cat:${JSON.stringify(cat || "")}})).map(r=>r.id)`);
  assert.ok(ok("axe").includes(1301));
  assert.ok(ok("jellopy").includes(1750));                                                             // a material finds what it turns into: Arrow
  assert.ok(ok("jellopy", "Forging").every(id => run(`RECIPES_MAKING[${id}][0].cat`) === "Forging"));
  assert.ok(ok("#998").length > 10);                                                                   // Iron, by its number
  // Materials worth: your Market price first, else what an NPC pays; +? counted for a material with neither
  const blade = "RECIPES.find(r=>r.id===1107)";                                                        // 25 Tooth of Bat + 45 Iron
  run(`state.prices={998:100,913:50}`);
  assert.deepEqual(run(`JSON.stringify(recipeWorth(${blade}))`), JSON.stringify({ z: 45 * 100 + 25 * 50, unknown: 0 }));
  // an NPC's fee counts too: Counteragent = Alcohol + Detrimindexta + Empty Bottle + 3,000 z at Morgenstein
  const ca = "RECIPES.find(r=>r.id===973)";
  assert.equal(run(`${ca}.cat`), "Mixture & Counteragent"); assert.equal(run(`${ca}.npc[0]`), "Morgenstein");
  run(`state.prices={970:1000,971:2000,713:10}`);
  assert.equal(run(`recipeWorth(${ca}).z`), 3000 + 1000 + 2000 + 10);
  assert.ok(ok("javadullihan").includes(983));                                                        // by NPC: Black Dyestuffs
  assert.ok(ok("counteragent").includes(975));                                                        // Scarlet Dyestuffs uses it
  run(`state.prices={}`);
  const i = run(`popItem("909")`);                                                                     // Jellopy
  assert.match(i.body, /Used in/); assert.match(i.acts, /data-infoact="recipes"/);
  assert.match(run(`popItem("1750").body`), /Made from \(\d+ ways\)/);                                // Arrow: many ways
  assert.match(run(`popGear(1107).body`), /Made from/);                                                // Blade: a forged weapon
  // icons: drops and recipe items from the item sheet, gear from its own, cards their picture
  assert.match(run(`itemIcon(909)`), /ico-item"/);
  assert.match(run(`itemIcon(1301)`), /ico-gear"/);
  assert.match(run(`itemIcon(4123)`), /ico-card"/);
  assert.ok(run(`[...Object.keys(ITEMN),...Object.keys(RECIPE_ITEMN)].every(id=>!/ none"/.test(itemIcon(id)))`), "every item has an icon");
  // Memorial: 5 Jello Fragments make their Jellostone, and an Expedition piece takes its Subjugation Team piece, crystals and stones
  const mem = id => run(`JSON.stringify(RECIPE_LIST.find(r=>r.cat==="Memorial"&&r.id===${id}))`);
  assert.deepEqual(JSON.parse(mem(25470)).mats, [[25465, 5]]);                                        // Crimson Jellostone: 5 Poring Jello Fragment
  assert.deepEqual(JSON.parse(mem(15221)).mats, [[15220, 1], [25424, 50], [25470, 2]]);                // Expedition's Armor
  assert.equal(run(`itemName(25470)`), "Crimson Jellostone"); assert.equal(run(`itemName(15221)`), "Expedition's Armor");
  const memOk = q => run(`RECIPE_LIST.filter(r=>recipeOk(r,{q:${JSON.stringify(q)},cat:"Memorial"})).map(r=>r.id)`);
  assert.deepEqual([...memOk("poporing")], [25471]);                                                       // a fragment finds its stone
  assert.ok(memOk("upgrader").length === 8);
  assert.match(run(`popItem("25465").body`), /Used in/); assert.match(run(`popGear(15221).body`), /Made from/);
  assert.doesNotMatch(run(`infoRecipe(RECIPE_LIST.find(r=>r.id===25470))`), /undefined| z</);         // no fee to show
  // Mithril Ore: no monster drops it, but the hard mode boxes do, and Thor's Flame makes Mithril from it for the Oath rings
  assert.deepEqual(JSON.parse(mem(25430)).mats, [[25429, 10]]);
  assert.deepEqual(JSON.parse(mem(28570)).mats, [[25459, 15], [25430, 10]]);                          // Ring of Blue Oath
  const ore = run(`popItem("25429")`);
  assert.equal(ore.title, "Mithril Ore"); assert.match(ore.body, /Orc's Memory<\/b> hard mode/); assert.doesNotMatch(ore.body, /No monster/);
  assert.match(run(`popItem("25465").body`), /Poring Village<\/b> on Monday/);
  assert.match(run(`popItem("990").body`), /Ant Hell<\/b> hard mode/);                               // Red Blood: the hard mode boxes' elemental ores
  assert.ok(run(`MEMORIALS.every(m=>(m.hard||[]).every(x=>x[0]))`), "every hard mode reward is an item");                       // a Jello Fragment's weekday
  assert.ok(run(`RECIPE_LIST.filter(r=>r.cat==="Memorial").flatMap(r=>[r.id,...r.mats.map(m=>m[0])]).every(id=>!/ none"/.test(itemIcon(id)))`), "every memorial item has an icon");
});

t("monster pictures: every monster has one, at icon height in lists and full size in the popup", () => {
  const S = JSON.parse(run("JSON.stringify(ICON_SHEETS.mob)")), i = S.ids.indexOf(1002), rows = Math.ceil(S.ids.length / S.cols);
  assert.equal(new Set(S.ids).size, S.ids.length, "mob ids repeat");
  assert.ok(run(`MOBS.every(m=>!/ none"/.test(mobIcon(m.id)))`), "every monster has a picture");
  const h = run(`mobIcon(1002)`);                                                                     // Poring: half size, 24 x 24
  assert.ok(h.includes('class="ico ico-mob"'));
  assert.ok(h.includes(`width:${S.w / 2}px;height:${S.h / 2}px;background-size:${S.cols * S.w / 2}px ${rows * S.h / 2}px;`));
  assert.ok(h.includes(`background-position:-${i % S.cols * S.w / 2}px -${Math.floor(i / S.cols) * S.h / 2}px`));
  assert.ok(!run(`mobIcon(1002,2)`).includes("width:"));                                             // full size: the class's 48 x 48
  assert.match(run(`popMob(MOB_BY_ID.get(1002)).ico`), /ico-mob"/);
  assert.match(run(`infoDroppers(909)`), /ico-mob il"/);                                              // Jellopy's droppers
  assert.match(run(`mobIcon(-5)`), / none"/);                                                         // no picture: an empty cell
});

t("memorial gear: Subjugation Team and Expedition lines as the client describes them, each set bonus counted once", () => {
  const acc = gear => run(`BUILD.compute({baseLv:70,jobLv:1,base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:${JSON.stringify(gear)}},"Knight",aspdBase).acc`);
  const none = acc({});
  const armor = r => acc({ armor: { id: 15221, refine: r } });                   // Expedition's Armor: MaxHP +500, MaxSP +30, DEF +30; at +3 DEF +10, MaxHP +50
  assert.deepEqual([armor(0).hp, armor(0).sp, armor(0).def], [500, 30, 30]);
  assert.deepEqual([armor(3).hp, armor(3).def], [550, 40]);
  assert.equal(armor(0).aspdPct, none.aspdPct);                                  // its after-attack delay is the set's, not the armor's
  assert.equal(armor(0).fct, none.fct);
  assert.deepEqual([acc({ armor: { id: 15220 } }).hp, acc({ armor: { id: 15220 } }).def], [300, 20]);
  assert.equal(acc({ acc2: { id: 28570 } }).st.int, 2);                           // Ring of Blue Oath: INT +2, DEX +2 at any refine
  assert.equal(acc({ acc2: { id: 28570, refine: 7 } }).st.dex, 4);
  const set = acc({ armor: { id: 15221, refine: 6 }, garment: { id: 20868, refine: 5 }, shoes: { id: 22151, refine: 5 }, acc1: { id: 28540, refine: 5 } });
  assert.equal(set.atk - none.atk, 20);
  assert.equal(set.aspdPct - none.aspdPct, 5);                                    // total refine 21: after-attack delay −5% once
  assert.ok(!set.unmodelled.some(x => /heal/.test(x)));                           // HP / SP heal effect lines are quiet
});

t("Jellostones: what the wanted Expedition pieces still need, and when the last stone is ready", () => {
  run(`state.jello={frag:{},stone:{},want:[],crystals:0}`);
  assert.equal(run(`jelloReady()`), null);                                        // nothing wanted
  run(`state.jello.want=[15221]`);                                                // Expedition's Armor: 2 Crimson Jellostone
  assert.deepEqual(run(`jelloShort().find(x=>x.j.stone[0]===25470)`).stones, 2);
  assert.equal(run(`jelloShort().find(x=>x.j.stone[0]===25470)`).frags, 10);
  run(`state.jello.stone[25470]=1;state.jello.frag[25465]=5`);                     // one stone and 5 fragments: craft now, ready in 3 days
  const now = Date.UTC(2026, 9, 21, 12);
  assert.equal(run(`jelloReady(${now})`), now + 3 * 864e5);
  run(`state.jello.craft={id:25470,due:${now + 864e5}};state.jello.frag={}`);      // the one crafting counts too
  assert.equal(run(`jelloShort().find(x=>x.j.stone[0]===25470)`).stones, 0);
  assert.equal(run(`jelloReady(${now})`), null);
  // Expedition Ring: 3 Dusk = 15 Drops fragments at one a Wednesday and a fifth of each weekend box (1.4 a week), then the last 3-day craft
  run(`state.jello={frag:{},stone:{},want:[28540],crystals:0}`);
  const d = (run(`jelloReady(${now})`) - now) / 864e5;
  assert.ok(d > 15 / 1.4 * 7 && d < 15 / 1.4 * 7 + 10, String(d));
  assert.equal(run(`jelloNeed()[25472]`), 3);
});

t("Stellar weapons: each ★ weapon's certificates come from its own weapon, and the monster that gets you copies fastest", () => {
  assert.equal(run(`STAR_W.length`), 17);                                         // the ★ weapons in Global's client
  const src = id => JSON.parse(run(`JSON.stringify(starSrc(STAR_W.find(x=>x.id===${id})).map(x=>x.id))`));
  assert.deepEqual(src(540118), [540106]);                                        // ★ Book: the Book monsters drop
  assert.deepEqual(src(510183), [510131]);                                        // ★ Stiletto: Stiletto, not any dagger
  // ★ Book: Mimic, Garm Baby and Lude drop it with no published rate: listed, not timed
  const book = JSON.parse(run(`JSON.stringify(starMobs(STAR_W.find(x=>x.id===540118)).map(o=>[o.id,o.per,o.unk]))`));
  assert.ok(book.some(([id, per, unk]) => id === 1191 && per === 0 && unk), JSON.stringify(book));
  // ★ Jur: Martin drops the Jur at 0.05%, twice that with +100% drop bonus
  const per = () => run(`starMobs(STAR_W.find(x=>x.id===610092)).find(o=>o.id===1145).per`);
  near(per(), 0.0005);
  run(`state.dropBonus=100`);
  near(per(), 0.001);
  run(`state.dropBonus=0;state.stellar={have:{610092:40},refine:9}`);
  assert.equal(run(`starLeft(STAR_W.find(x=>x.id===610092))`), 60);
  run(`state.stellar.have[610092]=150`);
  assert.equal(run(`starLeft(STAR_W.find(x=>x.id===610092))`), 0);
  setup("Assassin", { atkTxt: "300+300", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const b = JSON.parse(run(`JSON.stringify((()=>{const b=starBest(STAR_W.find(x=>x.id===510183),0);return b&&{ph:b.ph,per:b.per,kph:b.kph,ds:b.ds}})())`));
  assert.ok(b && b.ph > 0 && b.ds.every(([id]) => id === 510131), JSON.stringify(b));   // a Stiletto dropper
  near(b.ph, b.per * b.kph);
});

t("Brewing simulator: rAthena's Prepare Potion rate and each potion's random term", () => {
  const v = "({jobLv:50,int:60,dex:60,luk:40,pp:10,pr:10,hom:0})";
  assert.equal(run(`brewBase(${v})`), 5800);                                        // the numbers roz.prontera.info's calculator starts with
  const ch = id => JSON.parse(run(`JSON.stringify(brewChance(${v},${id}))`));
  near(ch(501).lo, 0.781); near(ch(501).hi, 0.88); near(ch(501).avg, 0.8305);      // +20% and 0.1–10%: its 78.10 / 83.05 / 88.00%
  near(ch(970).avg, 0.7305); near(ch(7136).avg, 0.6305);                            // Alcohol +10%, Acid Bottle none
  assert.deepEqual(ch(505), { lo: 0.58, hi: 0.58, avg: 0.58 });                     // Blue Potion: no random term
  near(ch(546).lo, 0.53); near(ch(546).avg, 0.5545); near(ch(547).avg, 0.5295); near(ch(7139).avg, 0.5295);
  assert.equal(run(`brewChance({jobLv:70,int:999,dex:999,luk:999,pp:10,pr:10,hom:5},501).avg`), 1);   // never over 100%
  assert.equal(run(`brewChance({jobLv:1,int:1,dex:1,luk:1,pp:0,pr:0,hom:0},547).lo`), 0.0001);       // nor under 0.01%
  assert.ok(run(`BREW_RECIPES.every(r=>BREW_MANUAL[r.id])`));                       // every potion has its guide
  // a run of tries lands near the average
  const r = JSON.parse(run(`(()=>{let s=1;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;return JSON.stringify(brewRoll(${v},501,20000,rnd))})()`));
  assert.equal(r.ok + r.fail, 20000);
  assert.ok(Math.abs(r.ok / 20000 - 0.8305) < 0.02, JSON.stringify(r));
});

t("Cooking simulator: dish levels, kits, cook mastery", () => {
  assert.deepEqual(JSON.parse(run(`JSON.stringify([12041,12045,12046,12068,12070].map(dishLv))`)), [1, 5, 1, 3, 5]);
  assert.equal(run(`dishFx(12068)`), "LUK +3");
  assert.ok(run(`COOK_RECIPES.every(r=>dishFx(r.id)===dishFx(r.id).slice(0,3)+" +"+dishLv(r.id))`));   // the text's +N is the dish's level
  // Fried Grasshopper Legs (Lv 1, 3 ingredients), Outdoor kit, Base Lv 50, DEX 50, LUK 30, mastery 0:
  // 1200 + 1020 + 1020 − 400 − 710 − 1000 = 1130, plus 600–2900 and minus 100–400
  const v = "({baseLv:50,dex:50,luk:30,mastery:0,kit:11})", r = "RECIPES.find(x=>x.id===12041)";
  const c = JSON.parse(run(`JSON.stringify(cookChance(${v},${r}))`));
  near(c.lo, 0.133); near(c.hi, 0.393); near(c.avg, (1130 + 1750 - 250) / 10000);
  near(run(`cookChance(${v},${r},13).avg`), (1130 + 2400 + 1750 - 250) / 10000);   // Professional: two kit levels more
  assert.equal(run(`cookChance(${v},${r},15).avg`), 1);                            // rAthena's Fantastic kit always works
  near(run(`cookChance({...${v},mastery:1999},${r}).avg`), (1130 + 3950 - 250) / 10000);   // 30–49% at full mastery
  assert.equal(run(`cookMastery(0,${r},true)`), 5);
  assert.equal(run(`cookMastery(0,${r},false)`), 0);                               // never under 0
  assert.equal(run(`cookMastery(100,RECIPES.find(x=>x.id===12045),true)`), 120);   // Lv 5: 20 a dish
  assert.equal(run(`cookMastery(100,RECIPES.find(x=>x.id===12045),false)`), 90);   // and 4 + 2×3 off
  assert.equal(run(`cookMastery(1995,${r},true)`), 1999);
  const roll = JSON.parse(run(`(()=>{let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;return JSON.stringify(cookRoll(${v},${r},500,rnd))})()`));
  assert.equal(roll.ok + roll.fail, 500);
  assert.ok(roll.ok > 0 && roll.mastery > 0 && roll.mastery <= 1999, JSON.stringify(roll));   // mastery climbs as dishes work
});

t("Brewing and Cooking simulators: typed numbers over the character's, saved per account", () => {
  setup("Alchemist", { jobLv: 40, baseLv: 60, st: { dex: "50+5", luk: "20" }, intTxt: "30", skills: { "potion-research": 5, "prepare-potion": 7 } });
  assert.equal(run(`JSON.stringify(brewVals())`), JSON.stringify({ jobLv: 40, int: 30, dex: 55, luk: 20, pp: 7, pr: 5, hom: 0 }));
  run(`state.craftSim.brew={dex:90,hom:3}`);
  assert.equal(run(`brewVals().dex`), 90); assert.equal(run(`brewVals().hom`), 3); assert.equal(run(`brewVals().luk`), 20);
  assert.equal(run(`JSON.stringify(cookVals())`), JSON.stringify({ baseLv: 60, dex: 55, luk: 20, mastery: 0, kit: 11 }));
  // a save's simulator settings are cleaned up when it loads
  const run2 = load({ craftSim: { brew: { dex: "70", pp: 40, junk: 1 }, cook: { kit: 20, mastery: -5, luk: "x" } } });
  assert.deepEqual(JSON.parse(run2(`JSON.stringify(state.craftSim)`)), { brew: { dex: 70, pp: 10 }, cook: { mastery: 0, kit: 13 } });
});

t("Navigation: routes from the nearest town, the Kafra teleport in front, and where a cell is on a map's picture", () => {
  // every spawn map a route reaches is one the page has, and every route starts in a town or where a town's Kafra teleports you
  const bad = JSON.parse(run(`JSON.stringify(Object.entries(NAVI_ROUTES).filter(([k,rs])=>!MAPMOBS[k]||!rs.every(([s,c,st])=>(isTown(s)||naviKafraFrom(s).length)&&c>=0&&Array.isArray(st))).map(([k])=>k))`));
  assert.deepEqual(bad, []);
  // Orc Dungeon 1F: Geffen's Kafra teleports you to the Orc Village field, a short walk away
  const g = JSON.parse(run(`JSON.stringify(naviRoute("orc_d01"))`));
  assert.equal(g.start, "gef_f10"); assert.ok(g.kafra.includes("geffen"), g.kafra.join());
  assert.ok(g.kafra.every(k => run(`isTown(${JSON.stringify(k)})`)));
  assert.ok(g.cells < 200, `${g.cells} cells`);
  assert.equal(g.steps[g.steps.length - 1][0], "in_orcs01");   // the last way out is the one into the dungeon
  // Payon Cave 1F: on foot from Archer Village next door, no Kafra
  const p = JSON.parse(run(`JSON.stringify(naviRoute("pay_d00"))`));
  assert.deepEqual(p.kafra, []); assert.equal(p.start, "pay_arche");
  // a map the Navigation has no way into, and one it doesn't have at all
  assert.equal(run(`naviRoute("nrd_dun02")`), null);
  assert.equal(run(`naviRoute("gl_chu")`), null);
  // a 280 x 400 field sits in the middle of its square picture, north up
  assert.deepEqual(JSON.parse(run(`JSON.stringify(NAVI_SIZE.pay_f08)`)), [280, 400]);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(naviAt("pay_f08",0,400))`)), [15, 0]);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(naviAt("pay_f08",280,0))`)), [85, 100]);
});

t("a new visitor starts with no session and no job picked", () => {
  const app = load();
  assert.equal(app("state.sessions.length"), 0);
  assert.equal(app("state.current"), null);
  assert.equal(app("state.noJob"), true);
  assert.equal(app("noChar()"), true);
  assert.equal(app("cur()===NO_SESS&&stats(cur())===null&&sessMap(cur())===null"), true);
  app("renderAll();renderHome()");                                          // every tab draws without a session
  assert.equal(app("state.sessions.length"), 0);                           // and reading doesn't make one
  app("sessNow().entries.push({t:1,lv:5,pct:1})");                          // logging EXP (Farm here, New session…) starts one
  assert.equal(app("state.sessions.length+' '+(state.current===state.sessions[0].id)+' '+cur().entries.length"), "1 true 1");
  app("save()");
  const again = load(JSON.parse(app("JSON.stringify(state)")));
  assert.equal(again("state.sessions.length+' '+state.noJob"), "1 true");   // still no job until one is picked or set up
  assert.equal(load({ sessions: [], job: "Mage" })("state.sessions.length+' '+state.noJob+' '+state.current"), "0 undefined null");
  assert.equal(load({ job: "Mage", noJob: "yes" })("state.noJob"), undefined);
  assert.equal(app("C().mode='build';noChar()"), false);                     // a character built from gear counts as set up
});

console.log(`${n} tests passed`);
