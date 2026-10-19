// Real characters checked against the in-game status window, using the exported data. Run: node tests/ingame.test.mjs
import { createRequire } from "module";
import { readFileSync } from "fs";
import assert from "assert/strict";
const require = createRequire(import.meta.url);
for (const f of ["equipment", "cards", "refine", "jobs"])
  (0, eval)(readFileSync(new URL(`../data/${f}.js`, import.meta.url), "utf8").replace(/^const (\w+)=/gm, "globalThis.$1="));
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
