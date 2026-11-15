// Real characters checked against the in-game status window, using the exported data. Run: node tests/ingame.test.mjs
import { createRequire } from "module";
import { readFileSync } from "fs";
import assert from "assert/strict";
const require = createRequire(import.meta.url);
for (const f of ["equipment", "cards", "refine", "jobs"])
  (0, eval)(readFileSync(new URL(`../data/${f}.js`, import.meta.url), "utf8").replace(/^const (\w+)=/gm, "globalThis.$1="));
// the game client's gear, cards and lines laid over the database's, as data/client.js does when the page loads (the event cards are only there)
{
  const src = readFileSync(new URL("../data/client.js", import.meta.url), "utf8").split("\n").find(l => l.startsWith("const CLIENT="));
  (0, eval)(src.replace(/^const CLIENT=/, "globalThis.CLIENT="));
  const has = new Set(EQUIP.map(e => e.id)), hasCard = new Set(CARDS.map(c => c.id));
  CLIENT.gear.forEach(r => { if (!has.has(r.id)) EQUIP.push(r) });
  CLIENT.cards.forEach(r => { if (!hasCard.has(r.id)) CARDS.push(r) });
  const byId = new Map([...EQUIP, ...CARDS].map(x => [x.id, x]));
  Object.entries(CLIENT.fix).forEach(([i, f]) => { const x = byId.get(+i); if (x) Object.assign(x, f) });
  Object.entries(CLIENT.lines).forEach(([i, g]) => { const x = byId.get(+i); if (x) x.g = (x.g || []).concat(g) });
}

const BUILD = require("../build.js");
const id = slug => (EQUIP.find(x => x.slug === slug) || CARDS.find(x => x.slug === slug)).id;
const sum = t => String(t).split("+").reduce((a, b) => a + +b, 0);

// Lv 26 Merchant, Job Lv 26-29 (job bonus STR/VIT/DEX +2, INT +1), screenshot 2026-10-04:
// +7 Hurricane Hammer (Hammer + Andre Card, options ATK +25, FLEE +20), Criatura Academy Hat, Jacket.
// Status window: ATK 52+186, MATK 13+21, HIT 223, FLEE 147+1, DEF 14+17, MDEF 13+0, CRIT 1, ASPD 143.
// Max HP 235 (the hat's +15 HP, VIT 1+2; no clan yet). Max SP 116 isn't compared: Equipment Stats listed +53 SP and the hat has +5.
{
  const r = BUILD.compute({ baseLv: 26, jobLv: 27, base: { str: 39, agi: 1, vit: 1, int: 1, dex: 20, luk: 1 },
    gear: { weapon: { id: id("hammer-620035"), refine: 7, cards: [id("andre-card-4043")], opts: "ATK +25, FLEE +20" },
            headTop: { id: id("criatura-academy-hat-18730") }, armor: { id: id("jacket-450347") } } },
    "Merchant", () => 156 - 15);   // Merchant two-handed axe: 156 base, −15
  const F = r.fields;
  assert.equal(F.atkTxt, "52+186");
  assert.equal(sum(F.hitTxt), 223);
  assert.equal(F.fleeTxt, "147+1");                // FLEE + Perfect Dodge, as the window shows it
  assert.equal(F.defTxt, "14+17");
  assert.equal(Math.floor(F.aspd), 143);
  assert.equal(Math.floor(F.crit), 1);
  assert.equal(F.matkTxt, "13+21");               // refine MATK on the weapon
  assert.equal(F.maxHp, 235);
  console.log("ok Lv 26 Merchant matches the status window");
}

// Lv 73 Sage, Job Lv 70, screenshot 2026-11-14, with an Awakening Potion and Study (Sage's Diary is a book):
// +9 Nordfeld Platinum Helm, Poring Village Leek, +7 Sage's Diary (2 Boulder Dwarf Squad Leader Cards), +7 Hunter's Cape (Galactor Army
// Card), +9 Expedition's Armor, +7 Hill Patrol Boots, Shining Clip (Vitata Card), Subjugation Team's Ring (Creamy Card). The options aren't
// in the screenshot: what Equipment Stats lists beyond the gear (AGI +9, FLEE +39, MATK +75, MATK +5%, MaxHP +321, MaxSP +41, ASPD +1%).
// Status window: ATK 30+147, MATK 136+265 (MATK % isn't in it), HIT 283, FLEE 330+1, DEF 59+394, CRIT 2, ASPD 178, Max HP 3612.
// Max SP 1289 isn't compared: the base SP table gives 583 at Lv 73, the window needs 584
{
  const r = BUILD.compute({ baseLv: 73, jobLv: 70, base: { str: 1, agi: 85, vit: 1, int: 62, dex: 1, luk: 1 }, today: "2026-11-14",
    gear: { headTop: { id: id("nordfeld-platinum-helm-401510"), refine: 9 }, headLow: { id: id("poring-village-leek-19238") },
            weapon: { id: id("sage-s-diary-540112"), refine: 7, cards: [300943, 300943] },
            garment: { id: id("hunter-s-cape-481000"), refine: 7, cards: [300733] }, armor: { id: id("expedition-s-armor-15221"), refine: 9 },
            shoes: { id: id("hill-patrol-boots-470466"), refine: 7, opts: "AGI +9, FLEE +39, MATK +75, MATK +5%, MaxHP +321, MaxSP +41, ASPD +1%" },
            acc1: { id: id("shining-clip-490975"), cards: [id("vitata-card-4053")] }, acc2: { id: id("subjugation-team-s-ring-28539"), cards: [id("creamy-card-4040")] } },
    extra: [["aspd_mod", null, null, 6], ["aspd_mod", null, null, 4]] },   // Awakening Potion 6, Study 4
    "Sage", () => 153);   // Sage book: 153
  const F = r.fields;
  assert.equal(F.atkTxt, "30+147");
  assert.equal(F.matkTxt, "136+265");
  assert.equal(F.matkPct, 5);
  assert.equal(sum(F.hitTxt), 283);
  assert.equal(F.fleeTxt, "330+1");
  assert.equal(F.defTxt, "59+394");
  assert.equal(Math.floor(F.crit), 2);
  assert.equal(F.aspd, 178);
  assert.equal(F.maxHp, 3612);
  console.log("ok Lv 73 Sage matches the status window");
}

// Lv 72 Priest, Job Lv 70, Crossbow Clan, screenshot 2026-11-14, with Clementia, Canto Candidus, Impositio Manus Lv 5, a Concentration
// Potion, Mace Mastery Lv 10 and Meditation Lv 10: +9 Nordfeld Platinum Helm, Poring Village Leek, +9 Chain (3 Boulder Dwarf Captain
// Cards), +9 Hunter's Cape (Nine Tail Card), +4 Nordfeld Soldier's Armor, +7 Hill Patrol Boots (Matyr Card), 2 Subjugation Team's Rings
// (Kukre Card). The options are what Equipment Stats lists beyond the gear.
// Status window: ATK 97+171, MATK 114+52, HIT 349, FLEE 366+1, DEF 65+265, CRIT 12, ASPD 185, Max HP 3765. Not compared: soft DEF
// (65 in game, 66 here) and Max SP (1282 in game, 1278 here)
{
  const lines = [["dex", null, null, 1], ["agi", null, null, 1], ["hp", null, null, 30], ["sp", null, null, 10],   // Crossbow Clan
    ["str", null, null, 17], ["int", null, null, 17], ["dex", null, null, 17], ["hit", null, null, 27],                // Clementia, Job Lv 70
    ["agi", null, null, 19], ["aspd_percent", null, null, 17], ["atk", null, null, 25], ["matk", null, null, 25],     // Canto Candidus, Impositio Manus
    ["aspd_mod", null, null, 4], ["crit", null, null, 10], ["sp_percent", null, null, 10]];                          // Concentration, Mace Mastery, Meditation
  const r = BUILD.compute({ baseLv: 72, jobLv: 70, base: { str: 40, agi: 85, vit: 1, int: 24, dex: 20, luk: 1 }, extra: lines,
    gear: { headTop: { id: id("nordfeld-platinum-helm-401510"), refine: 9 }, headLow: { id: id("poring-village-leek-19238") },
            weapon: { id: id("chain-590071"), refine: 9, cards: [300944, 300944, 300944] },
            garment: { id: id("hunter-s-cape-481000"), refine: 9, cards: [id("nine-tail-card-4159")] }, armor: { id: id("nordfeld-soldier-s-armor-450588"), refine: 4 },
            shoes: { id: id("hill-patrol-boots-470466"), refine: 7, cards: [id("matyr-card-4097")], opts: "AGI +11, FLEE +25, MaxHP +650, MaxSP +174, ATK +21, ASPD +1, ASPD +1%" },
            acc1: { id: id("subjugation-team-s-ring-28539"), cards: [id("kukre-card-4027")] }, acc2: { id: id("subjugation-team-s-ring-28539"), cards: [id("kukre-card-4027")] } } },
    "Priest", () => 153);   // Priest mace: 153 (js/events.js ASPD_T)
  const F = r.fields;
  assert.deepEqual([F.st.str, F.st.agi, F.st.vit, F.intTxt, F.st.dex, F.st.luk], ["40+28", "85+49", "1+7", "24+33", "20+30", "1+2"]);
  assert.equal(F.atkTxt, "97+171");
  assert.equal(F.matkTxt, "114+52");
  assert.equal(sum(F.hitTxt), 349);
  assert.equal(F.fleeTxt, "366+1");
  assert.equal(F.defTxt.split("+")[1], "265");
  assert.equal(Math.floor(F.crit), 12);
  assert.equal(F.aspd, 185);
  assert.equal(F.maxHp, 3765);
  console.log("ok Lv 72 Priest matches the status window");
}

// Max HP / SP: Zero's base tables (tools/export_jobs.py), job bonus to Job Lv 70, flat bonuses, then %.
// Status windows with nothing equipped; clans and buffs go in as their bonus lines. 2026-10.
{
  const clan = st => [...st.map(k => [k, null, null, 1]), ["hp", null, null, 30], ["sp", null, null, 10]];
  const allStats = n => ["str", "agi", "vit", "int", "dex", "luk"].map(k => [k, null, null, n]);
  const check = (job, baseLv, jobLv, base, extra, hp, sp, what) => {
    const F = BUILD.compute({ baseLv, jobLv, base, gear: {}, extra }, job, () => 150).fields;
    assert.deepEqual([F.maxHp, F.maxSp], [hp, sp], `${what}: Max HP / SP`);
  };
  check("Novice", 1, 10, {}, [], 28, 8, "new Novice B1/J10");
  [[1, 28, 8], [2, 32, 10], [3, 37, 11], [5, 48, 14], [6, 53, 15], [7, 60, 17], [8, 66, 18]].forEach(([lv, hp, sp]) =>
    check("Thief", lv, 1, {}, [], hp, sp, `new Thief B${lv}/J1`));   // B7: 85 x 0.7 = 59.5 rounds up to 60
  check("Merchant", 31, 36, { str: 38, agi: 24, dex: 15 }, clan(["str", "vit"]), 315, 83, "Merchant B31/J36, Sword Clan");
  check("Merchant", 36, 48, { str: 50, dex: 21 }, clan(["dex", "agi"]), 383, 94, "Merchant B36/J48, Crossbow Clan");
  check("Sage", 50, 40, { agi: 62, int: 40 }, [], 1134, 590, "Sage B50/J40");
  check("Sage", 67, 67, { agi: 83, int: 50 }, [], 1916, 862, "Sage B67/J67");   // 2nd job: x 0.7 then x 1.25, SP 9 per level
  check("Alchemist", 57, 58, { str: 63, int: 40, dex: 30 }, clan(["str", "vit"]), 1676, 672, "Alchemist B57/J58, Sword Clan");
  check("Rogue", 66, 66, { agi: 82, int: 50 }, [], 2063, 454, "Rogue B66/J66");
  check("Priest", 68, 68, { str: 20, agi: 70, int: 30, dex: 30 }, [...allStats(7), ["sp_percent", null, null, 10]], 2153, 788,
    "Priest B68/J68, All Stats +7 and Meditatio Lv 10 (Max SP +10%)");
  check("Dancer", 51, 43, { int: 60, dex: 46 }, [...allStats(7), ["sp_percent", null, null, 10]], 1133, 515,
    "Dancer B51/J43, All Stats +7 and Dance Lessons Lv 10 (Max SP +10%)");
  check("Dancer", 51, 43, {}, [...allStats(7), ["sp_percent", null, null, 10]], 1133, 336, "the same Dancer after a stat reset");
  console.log("ok Max HP / SP match the status window with nothing equipped");
}

// The character select screen shows Max HP / SP from base stats only (no job bonus, gear or clan), so long as the character
// logged out with full HP / SP: floor(base x (1 + VIT/100)) and floor(base x (1 + INT/100)). [job, base level, VIT, INT, HP, SP]
{
  const max = (job, lv, stat, kind) => Math.floor(JOBDATA[job][kind][lv - 1] * (100 + stat) / 100);
  [["Thief", 45, 1, 1, 557, 70], ["Acolyte", 35, 4, 3, 335, 133], ["Knight", 60, 5, 1, 2841, 167], ["Crusader", 60, 33, 1, 2874, 258],
   ["Crusader", 60, 11, 10, 2398, 281], ["Wizard", 60, 2, 78, 1196, 856], ["Sage", 60, 1, 16, null, 557], ["Hunter", 60, 1, 6, 1671, 231],
   ["Blacksmith", 60, 1, 14, 1753, 248], ["Alchemist", 58, 1, 47, 1649, 683], ["Assassin", 53, 1, 1, 1657, 194],
   ["Assassin", 70, 60, 20, 4369, 303], ["Rogue", 58, 1, 40, 1572, 366], ["Rogue", 60, 1, 70, 1671, 460]].forEach(([job, lv, vit, int, hp, sp]) => {
    if (hp != null) assert.equal(max(job, lv, vit, "hp"), hp, `${job} B${lv} Max HP`);   // the Sage was below full HP
    assert.equal(max(job, lv, int, "sp"), sp, `${job} B${lv} Max SP`);
  });
  console.log("ok base HP / SP match the character select screen");
}

// 2nd jobs get the transcendent job's bonus stats up to Job Lv 70 (status windows with gear and clan taken out)
{
  const BONUS = (job, jobLv) => ["str", "agi", "vit", "int", "dex", "luk"].map(k => (JOBDATA[job].bonus[k] || []).filter(l => l <= jobLv).length);
  assert.deepEqual(BONUS("Sage", 67), [6, 8, 4, 11, 11, 2]);
  assert.deepEqual(BONUS("Sage", 68), [6, 8, 4, 12, 11, 2]);
  assert.deepEqual(BONUS("Rogue", 66), [8, 10, 4, 3, 12, 6]);
  assert.deepEqual(BONUS("Priest", 68), [7, 8, 7, 11, 9, 2]);
  assert.deepEqual(BONUS("Knight", 49), [10, 5, 6, 1, 8, 3]);
  assert.deepEqual(BONUS("Alchemist", 58), [3, 5, 2, 5, 12, 8]);
  const SECOND = ["Knight", "Crusader", "Wizard", "Sage", "Hunter", "Bard", "Dancer", "Priest", "Monk", "Blacksmith", "Alchemist", "Assassin", "Rogue"];
  for (const job in JOBDATA) assert.equal(BONUS(job, 70).reduce((a, b) => a + b, 0), job === "Novice" ? 6 : SECOND.includes(job) ? 45 : 18, `${job} job bonus total`);
  console.log("ok job bonus stats up to Job Lv 70");
}
