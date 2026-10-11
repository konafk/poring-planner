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
  // right: 1h sword vs Large 75%, Wind vs Water 150%; status ATK doubled + other gear, Neutral. No skill tree: masteries Lv 5
  const right = Math.floor(hit(200 * 0.75 * 1.5 + 2 * 100 + 20) * 100 / 100);
  // left: dagger vs Large 50%, Neutral; status ATK once
  const left = Math.floor(hit(80 * 0.5 + 100 + 20) * 80 / 100);
  assert.equal(run(`dmgPerHit(${MOB})`), right);
  assert.equal(run(`leftDmg(${MOB})`), left);
  near(run(`perUse(${MOB})`), right + left);
  run(`C().skills={"righthand-mastery":2,"lefthand-mastery":1}`);   // learned levels: 70% and 40%
  assert.equal(run(`dmgPerHit(${MOB})`), Math.floor(hit(200 * 0.75 * 1.5 + 220) * 70 / 100));
  assert.equal(run(`leftDmg(${MOB})`), Math.floor(hit(80 * 0.5 + 120) * 40 / 100));
  run(`C().skills={}`);
  // Double Attack repeats only the right hand
  run(`C().a.hits=1.5`);
  near(run(`perUse(${MOB})`), right * 1.5 + left);
  // skills use the right hand only, at full damage
  run(`C().a={...C().a,type:"phys",hits:1}`);
  assert.equal(run(`leftDmg(${MOB})`), 0);
  assert.equal(run(`dmgPerHit(${MOB})`), hit(200 * 0.75 * 1.5 + 220));
  // a katar (or any other job) is never dual wield, and the left weapon's ATK stays in the Neutral share
  setup("Assassin", { atkTxt: "100+300", wAtk: 200, weapon: "Katar", wElem: "Neutral", lw: "Dagger", lwAtk: 80, st: {}, a: basic });
  assert.equal(run(`dualOn()`), false);
  assert.equal(run(`leftDmg(${MOB})`), 0);
  setup("Rogue", { atkTxt: "100+300", wAtk: 200, weapon: "Dagger", lw: "Dagger", lwAtk: 80, st: {}, a: basic });
  assert.equal(run(`dualOn()`), false);
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

t("cast time: variable part shrinks with DEX and INT, fixed part doesn't", () => {
  setup("Wizard", { st: { dex: "60" }, intTxt: "70", a: { name: "x", type: "magic", pct: 100, hits: 1, el: "Fire", vct: 4, fct: 1, cast: 5, delay: 0, sp: 0, targets: 1 } });
  near(run(`vctFactor()`), 1 - Math.sqrt((2 * 60 + 70) / 530));
  near(run(`castSec()`), 4 * (1 - Math.sqrt(190 / 530)) + 1);
  run(`C().st.dex="230";C().intTxt="70"`);                            // 2×230 + 70 = 530: no variable cast left
  near(run(`castSec()`), 1);
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
  assert.deepEqual(app("JSON.stringify(state.chars.Sage.skills)"), JSON.stringify({ "fire-bolt": 7, hindsight: 4 }));
  assert.deepEqual(app("JSON.stringify(state.chars.Sage.build.check)"), JSON.stringify({ hit: 250 }));
  assert.equal(app("'Knight' in state.chars"), false);
  assert.deepEqual(app("JSON.stringify(state.prices)"), JSON.stringify({ "904": 3000 }));   // item ids only, numbers only
  assert.deepEqual(app("JSON.stringify(state.npcPrices)"), JSON.stringify({ "904": 10 }));
  assert.equal(app("state.tab"), "char");                              // not one of the tabs: back to Character
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

t("map names: in-game codes, rozerodb codes and unique names all find the same map", () => {
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

t("monsters with no EXP in rozerodb are listed but left out of EXP averages", () => {
  const myst = run(`MOBS.find(m=>m.name==="Myst")`);
  assert.ok(myst.expUnknown && myst.exp === 0);
  assert.equal(run(`fmtExp(MOBS.find(m=>m.name==="Myst"))`), "?");
  assert.ok(run(`MAPMOBS.mjo_d03.some(x=>x.m.name==="Myst"&&x.n===39)`));
  setup("Knight", { atkTxt: "100+300", wAtk: 0, weapon: "Two-handed spear", st: {}, a: { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 } });
  const r = run(`mapStats0("mjo_d03",2)`);
  assert.equal([...r.unkNames].sort().join(), "Cramp,Giearth,Myst");
  // only the monsters with known EXP make up EXP / kill
  const known = run(`MAPMOBS.mjo_d03.filter(x=>!x.m.boss&&!x.m.expUnknown).map(x=>x.m.name)`);
  assert.ok(known.length && !known.includes("Myst"));
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
  // Myst has no EXP in rozerodb but still drops loot, so it counts towards zeny on its map
  const map = run(`huntMap0("mjo_d03",2)`);
  assert.ok(map.earn.some(x => x.m.name === "Myst") && map.epm > 0 && map.loot > 0);  // net can go below 0: this character loses ~4k HP/min there
  // monsters you skip are left out
  const id = run(`MOBS.find(m=>m.name==="Myst").id`);
  run(`state.skipMobs=[${id}]`);
  assert.ok(!run(`huntMap0("mjo_d03",2)`).earn.some(x => x.m.name === "Myst"));
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
  near(run(`zenyKill(${mob})`), 50);                                     // no prices typed: rozerodb loot value only
  run(`state.prices={909:200}`);                                          // players pay 200, NPC price from rozerodb (data/prices.js)
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

t("NPC prices: rozerodb's NPC price is the default, a typed one overrides it", () => {
  assert.ok(run(`NPCSELL[909]`) > 0);                                     // Jellopy has an NPC price in data/prices.js
  assert.equal(run(`npcSell(909)`), run(`NPCSELL[909]`));
  run(`state.npcPrices={909:1}`); assert.equal(run(`npcSell(909)`), 1);    // typed value wins
  run(`state.npcPrices={909:0}`); assert.equal(run(`npcSell(909)`), 0);    // even 0
  run(`state.npcPrices={}`);
  assert.equal(run(`npcSell(-99)`), 0);                                   // unknown item: 0
  // every drop in loot.js is listed; null where rozerodb has no price, which counts as 0
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

t("auto loot: drops of a group you don't loot earn nothing", () => {
  run(`C().baseLv=1;state.dropBonus=0;state.prices={};state.npcPrices={};state.autoLoot={}`);
  assert.equal(run(`ITEMTYPE[909]`), "e"); assert.equal(run(`ITEMTYPE[4001]`), "c"); assert.equal(run(`ITEMTYPE[1202]`), "w");
  const mob = "({id:-4,name:'Looter',lv:1,loot:50,drops:[[909,10],[4001,0.5]]})";
  near(run(`zenyKill(${mob})`), 50);                                       // everything looted: rozerodb's loot value as is
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
  assert.equal(run(`Object.values(SPAWN).flat().filter(x=>!(x[1]>0)).length`), 0);
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

t("auto-cast spells from cards work on any job's basic attacks", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", matkTxt: "100+50", intTxt: "40", hitTxt: "300", crit: 0, st: {}, a: AUTO });
  const off = run(`usesPerKill(${MOB})`);
  run("C().ac={on:true,spell:'Fire Bolt',lv:3,pct:5}");
  const per = run(`dmgPerHit(${MOB})`), hc = run(`hitChance(${MOB})`) / 100;
  const bolt = run(`magicDmg(${MOB},120,'Fire')`) * 3;                     // (100 + ½ × 40 INT)% × 3 hits, Fire vs Water 1
  near(run(`acDmg(${MOB})`), bolt);
  near(run(`usesPerKill(${MOB})`), 10000 / (per * hc + bolt * 0.05 * hc));   // only procs on swings that connect
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
  run(`C().converters=false`);
  assert.equal(run(`JSON.stringify(elOptions())`), "[null]");
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
  assert.equal(eff("riff", 3), "ASPD +5%");
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
  // stacking (Landgris ROCalculator): stat food and Yggdrasil don't add, the higher counts; a course meal stacks on top
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

t("cards any job can slot: Side Winder, Hunter Fly, Vitata", () => {
  const AUTO = { name: "x", type: "auto", pct: 100, hits: 1, el: "W", cast: 0, delay: 0, sp: 0, targets: 1 };
  setup("Knight", { atkTxt: "100+300", wAtk: 0, wElem: "Neutral", hitTxt: "300", crit: 0, aspd: 170, defTxt: "10+10", hitScale: 1, mobInterval: 1.5,
    st: {}, skills: {}, a: AUTO });
  assert.equal(run("JSON.stringify(CRD())"), run("JSON.stringify(CARD_D)"));  // all off for a new job
  const per = run(`perUse(${MOB})`), hp = run(`hpLossPerMin(${MOB})`), fight = run(`fightSec(${MOB})`), sp = run("spNeedPerSec()");
  run("CRD().daSF=true;CRD().daPct=7");                                     // Side Winder: basic attacks hit twice 7% of the time
  near(run(`perUse(${MOB})`), per * 1.07);
  run("C().skills={'double-attack':10}");                                   // a learned Double Attack: the card follows it, nothing added
  near(run(`perUse(${MOB})`), per);
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
  near(at("useSec()"), Math.expm1(l * 2) / l + Math.max(0, 1 / run("atkPerSec()")));
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
  assert.equal(after.chars.Sage.sage.hsAuto, true);
  assert.equal(run("JSON.stringify(unpackState({sessions:[]}))"), '{"sessions":[]}');  // older links, not packed, load as they are
});

t("share links get a real two-account backup back", () => {
  const bk = JSON.parse(readFileSync(new URL("tests/fixtures/backup-2-accounts.json", root), "utf8"));
  for (const a of bk.accounts) {
    const r = load(a.data);                                                  // the page as it opens with this account saved
    const before = JSON.parse(r("JSON.stringify(state)")), packed = r("JSON.stringify(packState(state))");
    const after = JSON.parse(r(`JSON.stringify(unpackState(JSON.parse(${JSON.stringify(packed)})))`));
    for (const j in before.chars) delete before.chars[j].bx;
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

t("preset cast times and delays match the in-game skill table", () => {
  // fixed / variable cast and max(cooldown, after-cast delay) at the preset's level, for every preset the table has a row for
  const bad = run(`(()=>{const out=[];for(const j in JOBS){state.job=j;for(const p of JOBS[j].p){const s=presetSkill(p);if(!s||p.fct==null)continue;
    const r=skRow(s,s.max),near=(a,b)=>Math.abs(a-b)<1e-9;
    if(!near(p.fct,(r[4]||0)/1000)||!near(p.vct,(r[3]||0)/1000)||!near(p.delay,Math.max(r[5]||0,r[6]||0)/1000))out.push(j+": "+p.name)}}return out.join(", ")})()`);
  assert.equal(bad, "");
});

console.log(`${n} tests passed`);
