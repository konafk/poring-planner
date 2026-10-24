// Engine tests for build.js with a small made-up dataset. Run: node tests/build.test.mjs
import { createRequire } from "module";
import { readFileSync } from "fs";
import assert from "assert/strict";
const require = createRequire(import.meta.url);

Object.assign(globalThis, {
  EQUIP: [
    { id: 1, slug: "blade", name: "Blade", slot: ["weapon"], type: "sword_1h", wlv: 2, refine: "weapon", atk: 100, slots: 2,
      g: [{ b: [["str", null, null, 2]] }, { b: [["atk", null, null, 5, 1]] }, { r: 7, b: [["damage_percent", "race", "demi_human", 10]] }] },
    { id: 2, slug: "coat", name: "Coat", slot: ["armor"], refine: "armor", def: 10, g: [] },
    { id: 3, slug: "boots", name: "Boots", slot: ["footgear"], refine: "armor", def: 2, g: [] },
    { id: 5, slug: "guard", name: "Guard", slot: ["shield"], refine: "armor", def: 3, g: [] },
    { id: 6, slug: "knife", name: "Knife", slot: ["weapon"], type: "dagger", wlv: 2, refine: "weapon", atk: 40, el: "fire", slots: 1, g: [] },
    { id: 7, slug: "ring", name: "Ring", slot: ["accessory_1", "accessory_2"], g: [{ b: [["matk", null, null, 10, 1]] }, { r: 7, b: [["int", null, null, 3]] }] },
    { id: 4, slug: "hat", name: "Hat", slot: ["head_upper", "head_middle"], refine: "armor", def: 1, g: [{ b: [["aspd_percent", null, null, 10]] }] },
  ],
  CARDS: [
    { id: 10, slug: "hydra", name: "Hydra Card", slot: ["weapon"], g: [{ b: [["damage_percent", "race", "demi_human", 20]] }] },
    { id: 11, slug: "proc", name: "Proc Card", slot: ["weapon"], g: [{ proc: "Chance to autocast Bash" }] },
    { id: 12, slug: "cruiser", name: "Cruiser Card", slot: ["weapon"], g: [{ b: [["crit_damage_percent", null, null, 10]] }, { b: [["crit", "race", "brute", 7]] }] },
    { id: 13, slug: "seal", name: "Seal Card", slot: ["weapon"], g: [{ cls: ["acolyte"], b: [["hit", null, null, 10]] }] },
    { id: 14, slug: "captain", name: "Captain Card", slot: ["weapon"], g: [{ b: [["physical_damage_percent", "monster_group", "boulder_dwarf", 30]] }] },
    { id: 16, slug: "shark", name: "Shark Card", slot: ["garment"], g: [{ lvPer: 10, lvMax: 50, b: [["atk", null, null, 7], ["def", null, null, 3], ["mdef", null, null, 1]] }] },
    { id: 15, slug: "leader", name: "Leader Card", slot: ["weapon"], g: [{ b: [["magic_damage_percent", "monster_group", "boulder_dwarf", 30]] }] },
    { id: 17, slug: "arclouse", name: "Arclouse Card", slot: ["shield"], g: [] },
    { id: 18, slug: "sieglouse", name: "Sieglouse Card", slot: ["footgear"], g: [] },
    { id: 19, slug: "gem", name: "Gem Card", slot: ["head_upper"], g: [] },
    { id: 20, slug: "joker", name: "Joker Card", slot: ["accessory_1"], g: [] },
    { id: 21, slug: "xjoker", name: "Extra Joker Card", slot: ["shield"], g: [] },
  ],
  SETS: [{ slug: "s", name: "Coat Set", pieces: ["coat", "boots"], g: [{ rs: 10, b: [["hp", null, null, 500]] }, { b: [["vit", null, null, 3]] }] },
    { slug: "sa", name: "Sieglouse & Arclouse Card", pieces: ["sieglouse", "arclouse"], ref: "arclouse", g: [{ b: [["flee", null, null, 2, 1]] }] },
    { slug: "gh", name: "Gem Card & Hat", pieces: ["gem", "hat"], ref: "hat", g: [{ b: [["atk", null, null, 1, 1]] }] },
    { slug: "jx", name: "Extra Joker & Joker Card", pieces: ["joker", "xjoker"], g: [{ proc: "Chance to transform into Joker", b: [["atk", null, null, 70]] }] }],
  REFINE: { weapon_lv2: Array.from({ length: 20 }, (_, i) => [3 * (i + 1), 3 * (i + 1), 0]),
            armor: Array.from({ length: 20 }, (_, i) => [0, 0, (i + 1) ** 2]) },
  JOBDATA: { Knight: { bonus: { str: [1, 6], vit: [5] }, hp: [40, 48, 58], sp: [10, 12, 14] } },
});
// the real affix list (rozerodb) and costume enchant stones, as the page loads them before build.js
for (const f of ["affixes", "stones", "special"]) (0, eval)(readFileSync(new URL(`../data/${f}.js`, import.meta.url), "utf8").replace(/^const (\w+)=/gm, "globalThis.$1="));
const BUILD = require("../build.js");
const aspdBase = () => 150;
const base = { str: 50, agi: 30, vit: 20, int: 1, dex: 30, luk: 10 };
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok", name); };

t("job bonus counts job levels at or below the current one", () => {
  assert.deepEqual(BUILD.jobBonus("Knight", 5), { str: 1, agi: 0, vit: 1, int: 0, dex: 0, luk: 0 });
  assert.equal(BUILD.jobBonus("Knight", 10).str, 2);
});

t("weapon stats, per-refine bonus, refine threshold and cards", () => {
  const r = BUILD.compute({ baseLv: 3, jobLv: 10, base, gear: { weapon: { id: 1, refine: 7, cards: [10, 11] } } }, "Knight", aspdBase);
  const S = r.status;
  assert.equal(r.total.str, 50 + 2 + 2);                                  // base + job + item STR
  assert.equal(r.fields.atkTxt, `${S.atk}+${100 + 21 + 35}`);              // weapon 100 + refine 3×7 + ATK 5 per refine
  assert.equal(r.fields.wAtk, 121);                                        // weapon ATK incl. refine
  assert.equal(r.acc.phys.race["Demi-Human"], 30);                         // +10 at +7, +20 card, same category adds
  assert.equal(r.acc.magic.race["Demi-Human"], undefined);                 // damage_percent is physical only
  assert.equal(r.fields.weapon, "One-handed sword");
  assert.ok(r.unmodelled.some(x => x.includes("autocast")));               // procs are listed, not counted
});

t("consumable STR +10%: a share of base + job + flat bonuses, rounded down", () => {
  const r = BUILD.compute({ baseLv: 50, jobLv: 10, base, gear: {}, extra: [["str", null, null, 5], ["str_percent", null, null, 10]] }, "Knight", aspdBase);
  assert.equal(r.total.str, 57 + Math.floor(57 * 0.10));                  // 50 + job 2 + 5 = 57, then +5
});

t("damage against a monster group (Boulder Dwarf Captain / Squad Leader cards)", () => {
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, refine: 0, cards: [14, 15] } } }, "Knight", aspdBase);
  assert.equal(r.acc.phys.group["Boulder Dwarf"], 30);                    // Captain: physical only
  assert.equal(r.acc.magic.group["Boulder Dwarf"], 30);                   // Squad Leader: magic only
  const one = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, refine: 0, cards: [14] } } }, "Knight", aspdBase);
  assert.equal(one.acc.magic.group["Boulder Dwarf"], undefined);
  assert.equal(one.unmodelled.length, 0);
});

t("refine threshold not reached", () => {
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, refine: 6, cards: [] } } }, "Knight", aspdBase);
  assert.equal(r.acc.phys.race["Demi-Human"], undefined);
});

t("armor refine DEF, sets with combined refine, HP from the job curve", () => {
  const off = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { armor: { id: 2, refine: 4 }, shoes: { id: 3, refine: 5 } } }, "Knight", aspdBase);
  const S = off.status;
  assert.equal(off.fields.defTxt, `${S.softDef}+${10 + 2 + 16 + 25}`);
  assert.equal(off.total.vit, 20 + 0 + 3);                                  // set VIT, no job VIT before job Lv 5
  assert.equal(off.fields.maxHp, Math.floor(Math.floor(58 * (1 + 23 / 100)) + 0));   // combined refine 9 < 10: no set HP
  const on = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { armor: { id: 2, refine: 5 }, shoes: { id: 3, refine: 5 } } }, "Knight", aspdBase);
  assert.equal(on.fields.maxHp, Math.floor(58 * 1.23) + 500);
});

t("card sets: cards slotted in worn gear, per-refine lines by the ref piece's item, procs listed only", () => {
  const gear = { shield: { id: 5, refine: 6, cards: [17] }, shoes: { id: 3, refine: 9, cards: [18] } };
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear }, "Knight", aspdBase);
  assert.equal(r.acc.flee, 2 * 6);                                          // FLEE +2 per shield refine, not the shoes' +9
  const half = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { ...gear, shoes: { id: 3, refine: 9 } } }, "Knight", aspdBase);
  assert.equal(half.acc.flee, 0);                                           // one card short: no set
  const hat = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { headTop: { id: 4, refine: 5, cards: [19] } } }, "Knight", aspdBase);
  assert.equal(hat.acc.atk, 5);                                             // an item and a card in it: ATK +1 per refine of the item
  const joker = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { acc1: { id: 7, cards: [20] }, shield: { id: 5, cards: [21] } } }, "Knight", aspdBase);
  assert.equal(joker.acc.atk, 0);                                           // ATK +70 only while transformed
  assert.ok(joker.unmodelled.some(x => x.startsWith("Extra Joker & Joker Card: Chance")));
});

t("ASPD % pivots on 195 and caps at 190; multi-slot headgear counts once", () => {
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { headTop: { id: 4 }, headMid: { id: 4 } } }, "Knight", aspdBase);
  const a1 = Math.floor(150 + r.status.aspdTerm);
  assert.equal(r.fields.aspd, Math.floor(a1 + (195 - a1) * 0.10));
  const fast = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: {} }, "Knight", () => 189);
  assert.equal(fast.fields.aspd <= 190, true);
});

t("a shield takes the job's shield penalty off base ASPD", () => {
  const off = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: {} }, "Knight", aspdBase);
  const on = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { shield: { id: 5 } } }, "Knight", aspdBase);
  assert.equal(BUILD.SHIELD_ASPD.Knight, 5);
  assert.equal(off.fields.aspd - on.fields.aspd, 5);
});

t("status formulas match the verified Zero formulas", () => {
  const s = { str: 60, agi: 50, vit: 40, int: 30, dex: 45, luk: 12 }, S = BUILD.status(70, s, false);
  assert.equal(S.atk, Math.floor(70 / 4 + 60 + 45 / 5 + 12 / 3));
  assert.equal(S.matk, 30 + 15 + 9 + 4 + 17);
  assert.equal(S.hit, 175 + 70 + 45 + 4);
  assert.equal(S.flee, 100 + 70 + 50 + 2);
  assert.equal(S.softDef, 35 + 20 + 10);
});

t("CRIT against one race is kept apart from your CRIT", () => {
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, refine: 0, cards: [12] } } }, "Knight", aspdBase);
  assert.equal(r.acc.crit, 0);                         // not on the status window
  assert.deepEqual(r.acc.critRace, { Brute: 7 });      // only when hitting a Brute
  assert.equal(r.acc.critDmg, 10);
});

t("a 1st-job condition (\"Acolyte Class\") also applies to its 2nd jobs", () => {
  const hit = job => BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, refine: 0, cards: [13] } } }, job, aspdBase).acc.hit;
  assert.equal(hit("Acolyte"), 10);
  assert.equal(hit("Priest"), 10);
  assert.equal(hit("Monk"), 10);
  assert.equal(hit("Knight"), 0);
});

t("potion/skill values add value × AGI/200 to ASPD1 (RO樂園攻速計算機's own Priest example)", () => {
  // Priest, mace + shield: 156 − 3 − 3; AGI 128 (109 + Canto Candidus 19), DEX 85; gear ASPD +45% and +2,
  // Canto Candidus +17%, Concentration Potion 4: ASPD1 floor(150 + 24.54 + 2.56) = 177, ASPD floor(177 + 18 × 0.62 + 2) = 190
  const r = BUILD.compute({ baseLv: 1, jobLv: 1, base: { str: 1, agi: 109, vit: 1, int: 1, dex: 85, luk: 1 }, gear: { shield: { id: 5 } },
    extra: [["agi", null, null, 19], ["aspd_percent", null, null, 45], ["aspd", null, null, 2], ["aspd_percent", null, null, 17], ["aspd_mod", null, null, 4]] },
    "Priest", () => 156 - 3);
  assert.equal(r.fields.aspd, 190);
  const a1 = Math.floor(156 - 3 - 3 + r.status.aspdTerm + 4 * 128 / 200);
  assert.equal(a1, 177);
});

t("Assassin left-hand weapon in the Shield row: dual wield ATK, element and ASPD", () => {
  const ab = (job, w) => ({ "One-handed sword": 146, Dagger: 154 })[w] ?? 156;
  const gear = { weapon: { id: 1, refine: 0, cards: [] }, shield: { id: 6, refine: 2, cards: [10] } };
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear }, "Assassin", ab);
  assert.equal(r.fields.lw, "Dagger");
  assert.equal(r.fields.lwAtk, 40 + 6);                                     // left weapon ATK incl. its refine (3 per refine)
  assert.equal(r.fields.lwElem, "Fire");
  assert.equal(r.fields.atkTxt, `${r.status.atk}+${100 + 40 + 6}`);          // both weapons on the gear side, like the status window
  assert.equal(r.shield, false);                                            // not a shield: no shield ASPD penalty
  assert.equal(r.fields.aspd, Math.floor(146 - 10 + r.status.aspdTerm));    // dagger in the left hand: −10
  assert.equal(r.acc.phys.race["Demi-Human"], 20);                          // its card counts
  // the same dagger in both hands is two items
  const two = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 6, refine: 0 }, shield: { id: 6, refine: 0 } } }, "Assassin", ab);
  assert.equal(two.fields.lw, "Dagger");
  assert.equal(two.fields.atkTxt, `${two.status.atk}+${40 + 40}`);
  // not an Assassin: the left weapon isn't dual wield
  const k = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear }, "Knight", ab);
  assert.equal(k.fields.lw, "");
  assert.ok(k.unmodelled.some(x => x.includes("left-hand weapon")));
});

t("random options picked from lists: any item takes up to 5, resists and cast time store negated", () => {
  assert.equal(BUILD.OPT_MAX, 5);                                          // the most the game rolls on one item
  assert.equal(new Set(BUILD.OPTIONS.map(o => o.k)).size, BUILD.OPTIONS.length);
  const opts = [{ k: "atk", v: 25 }, { k: "dmg_race_demi_human", v: 5 }, { k: "res_ele_fire", v: 10 }, { k: "cast_time_variable_percent", v: 5 }, { k: "gone", v: 3 }, { k: "flee", v: "" }];
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { armor: { id: 2, opts } } }, "Knight", aspdBase);
  const z = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { armor: { id: 2 } } }, "Knight", aspdBase);
  assert.equal(r.acc.atk, 25);
  assert.equal(r.acc.phys.race["Demi-Human"], 5);
  assert.equal(r.acc.taken.ele.Fire, -10);
  assert.equal(r.acc.vct, 5);
  assert.equal(r.acc.flee, z.acc.flee);                                    // an option with no value yet adds nothing
  assert.deepEqual(BUILD.optRows(opts).map(x => x.k), ["atk", "dmg_race_demi_human", "res_ele_fire", "cast_time_variable_percent", "flee"]);
  // a build saved with typed text still counts, and shows as rows
  const old = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { armor: { id: 2, opts: "ATK +25, FLEE +20" } } }, "Knight", aspdBase);
  assert.equal(old.acc.atk, 25);
  assert.deepEqual(BUILD.optRows("ATK +25, MATK +3%"), [{ k: "atk", v: 25 }, { k: "matk_percent", v: 3 }]);
  // five typed lines on a Criatura Academy Hat: the two that match an option become rows, the three that don't are kept as text
  const typed = "MaxHP +100, MaxSP +50, EXP +5%, Healing +3%, Movement Speed +5%";
  assert.deepEqual(BUILD.optRows(typed).map(x => x.k), ["hp", "sp"]);
  assert.deepEqual(BUILD.optBad(typed), ["EXP +5%", "Healing +3%", "Movement Speed +5%"]);
  assert.deepEqual(BUILD.optBad(BUILD.optRows(typed)), []);
  const kept = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { armor: { id: 2, opts: BUILD.optRows(typed), optsText: "EXP +5%, Healing +3%, FLEE +4" } } }, "Knight", aspdBase);
  assert.equal(kept.acc.flee, 4);                                           // a kept line that's understood counts
  assert.ok(kept.unmodelled.some(x => /option not understood: EXP \+5%$/.test(x)));
});

t("random options come from rozerodb's affixes, filtered to what the row's gear rolls", () => {
  const keys = (slot, it) => BUILD.optChoices(slot, it).map(o => o.k);
  const by = (slot, it, k) => BUILD.optChoices(slot, it).find(o => o.k === k);
  // a sword rolls melee weapon affixes (monster / MVP drop, forging, activation), with the min–max over all of them
  const sword = keys("weapon", BUILD.item(1));
  assert.ok(sword.includes("atk") && sword.includes("dmg_race_demon") && sword.includes("dmg_size_small") && sword.includes("ign_def_race_demon"));
  assert.ok(!sword.includes("matk") && !sword.includes("res_race_demon") && !sword.includes("mdmg_race_demon"));
  // options rozerodb has no affix for ("Other": special enchants) go on every part, with no min–max
  assert.ok(sword.includes("str") && sword.includes("magic_damage_percent") && keys("armor", BUILD.item(2)).includes("str"));
  assert.equal(by("weapon", BUILD.item(1), "str").range, null);
  assert.deepEqual(by("weapon", BUILD.item(1), "atk").range, [1, 60]);           // drops 5–30, activation 1–39, forging 1–60
  // staves roll the magic series; bows the ranged one (no forging); a weapon in the Shield row rolls weapon affixes
  const staff = { slot: ["weapon"], type: "staff_1h" }, bow = { slot: ["weapon"], type: "bow" };
  assert.ok(keys("weapon", staff).includes("mdmg_race_demon") && !keys("weapon", staff).includes("atk"));
  assert.equal(BUILD.optGear("weapon", bow), "ranged");
  // books and weapons with MATK roll the magic series too, with their own
  const book = { slot: ["weapon"], type: "book" }, mdagger = { slot: ["weapon"], type: "dagger", matk: 105 };
  assert.equal(BUILD.optGear("weapon", book), "melee+magic");
  for (const w of [book, mdagger]) assert.ok(keys("weapon", w).includes("mdmg_race_demon") && keys("weapon", w).includes("matk") && keys("weapon", w).includes("dmg_size_small"));
  assert.deepEqual(by("weapon", book, "atk").range, [1, 60]);
  assert.ok(!keys("weapon", bow).includes("dmg_size_small"));
  assert.deepEqual(keys("shield", BUILD.item(6)), keys("weapon", BUILD.item(6)));
  // armor, garment and shoes have their own pools
  assert.deepEqual(by("armor", BUILD.item(2), "res_race_demon").range, [3, 7]);
  assert.ok(keys("garment", null).includes("res_ele_fire") && !keys("armor", BUILD.item(2)).includes("res_ele_fire"));
  assert.deepEqual(by("shoes", BUILD.item(3), "hp").range, [150, 300]);
  // rozerodb has no pool for accessories, headgear or shields: those list every option, old hand-made ones too
  assert.equal(BUILD.optGear("acc1", BUILD.item(7)), null);
  assert.equal(keys("acc1", BUILD.item(7)).length, BUILD.OPTIONS.length);
  assert.ok(keys("acc1", BUILD.item(7)).includes("str") && keys("headTop", BUILD.item(4)).includes("mele_fire"));
  assert.equal(by("acc1", BUILD.item(7), "atk").range, null);
  // options the model can't use are listed, then reported; ones apply() can't place report through it
  const opts = [{ k: "heal_percent", v: 8 }, { k: "mdmg_ele_fire", v: 5 }, { k: "ign_def_race_demon", v: 10 }, { k: "ign_def_kind_normal", v: 5 },
    { k: "res_race_demon", v: 5 }, { k: "pres_ele_water", v: 6 }, { k: "sp_cost_percent", v: 4 }, { k: "mele_fire", v: 3 }];
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, opts } } }, "Knight", aspdBase);
  assert.ok(r.unmodelled.includes("Blade option not counted: Heal increase 8%"));
  assert.ok(r.unmodelled.includes("Blade option not counted: Magic Damage to Fire enemies 5%"));
  // ignore DEF of a race or of normal monsters counts against those monsters only (acc.ign), not as plain ignore DEF
  assert.ok(!r.unmodelled.some(x => x.includes("ignore_def_percent")));
  assert.equal(r.acc.ignDef, 0);
  assert.equal(r.acc.ign.def.race.Demon, 10);
  assert.equal(r.acc.ign.def.kind.normal, 5);
  assert.equal(r.acc.taken.race.Demon, -5);
  assert.equal(r.acc.taken.ele.Water, -6);
  assert.equal(r.acc.spCost, -4);
  assert.equal(r.acc.myEle.Fire, 3);                                          // a key from the hand-made list still counts
});

t("ignore DEF / MDEF of a race, size, element or boss / normal monsters", () => {
  const keys = (slot, it) => BUILD.optChoices(slot, it).map(o => o.k);
  // rozerodb's race and Normal Enemy affixes go on the weapons that roll them; the sizes, elements and boss it has none for yet on every part
  assert.ok(keys("weapon", { slot: ["weapon"], type: "staff_1h" }).includes("ign_mdef_race_dragon") && keys("weapon", BUILD.item(1)).includes("ign_def_kind_normal"));
  for (const k of ["ign_def_kind_boss", "ign_def_size_small", "ign_mdef_size_large", "ign_def_ele_fire", "ign_mdef_ele_undead"])
    assert.ok(keys("weapon", BUILD.item(1)).includes(k) && keys("armor", BUILD.item(2)).includes(k), k);
  const lab = k => BUILD.OPTIONS.find(o => o.k === k).label;
  assert.equal(lab("ign_mdef_race_dragon"), "Ignore Dragon Magic Def %");
  assert.equal(lab("ign_def_ele_undead"), "Ignore Undead element Phys Def %");      // the element, not the Undead race
  const opts = [{ k: "ign_mdef_race_dragon", v: 15 }, { k: "ign_def_size_small", v: 10 }, { k: "ign_def_ele_undead", v: 20 }, { k: "ign_mdef_kind_boss", v: 5 }];
  const A = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { weapon: { id: 1, opts } } }, "Knight", aspdBase).acc;
  assert.equal(A.ign.mdef.race.Dragon, 15); assert.equal(A.ign.def.size.S, 10); assert.equal(A.ign.def.ele.Undead, 20); assert.equal(A.ign.mdef.kind.boss, 5);
  assert.equal(A.ignDef + A.ignMdef, 0);
});

t("costume enchant stones: one per slot, plus the sets they complete", () => {
  const run = stones => BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: {}, stones }, "Knight", aspdBase);
  const none = run({});
  // three Critical Stones: 3 + 3 + 3 and the 3-piece +6%; the Garment one adds 20% and the 4-piece CRIT +10
  const c3 = run({ upper: 25304, middle: 25060, lower: 25305 }), c4 = run({ upper: 25304, middle: 25060, lower: 25305, garment: 25303 });
  assert.equal(c3.acc.critDmg - none.acc.critDmg, 15);
  assert.equal(c4.acc.critDmg - none.acc.critDmg, 35);
  assert.equal(c4.acc.crit - none.acc.crit, 10);
  assert.equal(c3.acc.crit, none.acc.crit);
  // Variable Casting: −3 × 3 and the set's −6
  assert.equal(run({ upper: 25172, middle: 25173, lower: 25174 }).acc.vct, 15);
  // an Exchange pair gives back what each one takes: STR +6, INT and DEX unchanged
  const ex = run({ middle: 25003, lower: 25012 }).acc.st;
  assert.deepEqual([ex.str, ex.int, ex.dex], [6, 0, 0]);
  assert.deepEqual([run({ lower: 25012 }).acc.st.str, run({ lower: 25012 }).acc.st.dex], [3, -3]);
  // DEF (Middle) + MDEF (Lower): HIT and FLEE +5
  const dm = run({ middle: 25001, lower: 25014 });
  assert.deepEqual([dm.acc.def, dm.acc.mdef, dm.acc.hit, dm.acc.flee], [20, 4, 5, 5]);
  // a stone only counts in its own slot; effects the model can't use are listed
  assert.equal(run({ middle: 6636 }).acc.st.str, 0);
  assert.ok(run({ garment: 25302 }).unmodelled.includes("Double Attack Stone (Garment): Double Attack Lv 3 with any weapon"));
  assert.ok(BUILD.STONE_SLOTS.every(z => STONES.some(x => x.slot === z.k)));
  assert.ok(STONE_SETS.every(z => z.need.every(i => BUILD.stone(i))));
});

t("Taming Ring: the pet egg sealed in it adds its bonus", () => {
  const run = special => BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: {}, special }, "Knight", aspdBase);
  const none = run({}), petite = run({ ring: 313625 });                          // Ground Petite Egg Lv.2: after-attack delay −1%, AGI +1
  assert.equal(petite.acc.st.agi, 1);
  assert.equal(petite.acc.aspdPct - none.acc.aspdPct, 1);
  assert.equal(run({ ring: 313586 }).acc.taken.ele.Poison, -10);                // Poporing Lv.1: Poison resistance +10%
  assert.deepEqual([run({ ring: 313627 }).acc.phys.all, run({ ring: 313627 }).acc.matkPct, run({ ring: 313627 }).acc.hpPct], [1, 1, 1]);
  assert.ok(run({ ring: 313596 }).unmodelled.includes("Taming Ring (Hunter Fly Egg Lv.1): Perfect Dodge +2"));
  assert.equal(TAMING_EGGS.length, 52);
  assert.ok(TAMING_EGGS.every(x => x.b.length || x.off));
});

t("other special equipment: named rows with effects from the affix list, counted while ticked", () => {
  const run = own => BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: {}, special: { own } }, "Knight", aspdBase);
  const row = { name: "Event Ring", opts: [{ k: "dmg_race_demon", v: 5 }, { k: "res_ele_fire", v: 10 }, { k: "crit", v: 3 }, { k: "mdmg_ele_fire", v: 4 }] };
  const r = run([row]), none = run([]);
  assert.equal(r.acc.phys.race.Demon, 5);
  assert.equal(r.acc.taken.ele.Fire, -10);                                       // resist: less damage taken
  assert.equal(r.acc.crit - none.acc.crit, 3);
  assert.ok(r.unmodelled.includes("Event Ring not counted: Magic Damage to Fire enemies 4%"));
  assert.equal(run([{ ...row, on: false }]).acc.phys.race.Demon, undefined);     // unticked: not worn
  assert.equal(run([{ opts: [{ k: "atk", v: 10 }] }]).acc.atk, 10);               // no name, still counted
});

t("a refined accessory counts its own refine lines, with no armor DEF schedule", () => {
  const r = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { acc1: { id: 7, refine: 7 } } }, "Knight", aspdBase);
  const z = BUILD.compute({ baseLv: 3, jobLv: 1, base, gear: { acc1: { id: 7, refine: 0 } } }, "Knight", aspdBase);
  assert.equal(r.acc.matk, 70);
  assert.equal(r.acc.st.int, 3);
  assert.deepEqual(BUILD.refineAt(BUILD.item(7), 7), [0, 0, 0]);
  assert.equal(r.fields.defTxt, z.fields.defTxt);
});

t("a card that grows every 10 base levels, up to Lv 50", () => {
  const at = lv => BUILD.compute({ baseLv: lv, jobLv: 1, base, gear: { garment: { id: 2, cards: [16] } } }, "Knight", aspdBase).acc;
  assert.deepEqual([9, 10, 37, 50, 99].map(lv => at(lv).atk), [0, 7, 21, 35, 35]);
  assert.equal(at(45).def, 12);
  assert.equal(at(99).mdef, 5);
});

t("gear named the way the equipment window shows it: card names, Double / Triple, cut-off names", () => {
  const items = [{ id: 1, name: "Shining Clip", slots: 1 }, { id: 2, name: "Muffler", slots: 0 }, { id: 3, name: "Muffler", slots: 1 },
    { id: 4, name: "Nordfeld Soldier's Armor", slots: 1 }, { id: 5, name: "Hill Patrol Boots", slots: 2 }, { id: 6, name: "Sage's Diary", slots: 4 }];
  const cards = [{ id: 10, name: "Vitata Card" }, { id: 11, name: "Shark Family Card" }, { id: 12, name: "Pecopeco Card" },
    { id: 13, name: "Verit Card" }, { id: 14, name: "Matyr Card" }, { id: 15, name: "Hydra Card" }];
  const names = { 10: "Healing", 11: "Shark Family", 12: "Hard", 13: "of Health", 14: "of Hermes", 15: "Bloody" };
  const read = s => BUILD.readGearName(s, items, () => cards, c => names[c.id]);
  assert.deepEqual(read("+9 Healing Shining Clip"), { id: 1, refine: 9, cards: [10] });
  assert.deepEqual(read("+4 Shark Family Muffler"), { id: 3, refine: 4, cards: [11] }, "the slotted Muffler");
  assert.deepEqual(read("Muffler"), { id: 2, refine: null, cards: [] });
  assert.deepEqual(read("+7 Hard Nordfeld Soldier..."), { id: 4, refine: 7, cards: [12] }, "cut-off item name");
  assert.deepEqual(read("+7 hard nordfeld soldier’s armor"), { id: 4, refine: 7, cards: [12] }, "any case, curly apostrophe");
  assert.deepEqual(read("Hard Hill Patrol Boots of Health"), { id: 5, refine: null, cards: [12, 13] }, "prefix and suffix");
  assert.deepEqual(read("+7 Hill Patrol Boots of Hea"), { id: 5, refine: 7, cards: [13] }, "cut-off suffix only one card fits");
  assert.deepEqual(read("Double Bloody Triple Healing Sage's Diary"), { id: 6, refine: null, cards: [15, 15, 10, 10] }, "copies, up to the slots");
  assert.deepEqual(read("Hill Patrol Boots of H"), { id: 5, refine: null, cards: [] }, "cut-off suffix two cards fit: the item alone");
  assert.equal(read("Hill Patrol Boots of X"), null);
  assert.equal(read("Hybrid Malicious Sage"), null, "unknown item");
  assert.equal(read("Healing Boots"), null);
  assert.deepEqual(BUILD.readCardNames("double healing", cards, c => names[c.id]), [10, 10]);
  assert.deepEqual(BUILD.readCardNames("of hermes", cards, c => names[c.id]), [14]);
  assert.equal(BUILD.readCardNames("healing x", cards, c => names[c.id]), null);
  assert.deepEqual(BUILD.readCardNames("vitata card", cards, c => names[c.id]), [10], "the card's own name");
  assert.deepEqual(BUILD.readCardNames("Double Vitata Hard", cards, c => names[c.id]), [10, 10, 12], "own names and window names mixed");
  assert.deepEqual(read("+9 Shining Clip Vitata Card"), { id: 1, refine: 9, cards: [10] }, "item then its card");
  assert.deepEqual(read("+4 Shark Family Card Muffler"), { id: 3, refine: 4, cards: [11] });
});

console.log(`${n} tests passed`);
