"""Check the planner's data against the installed Global client: spawn counts, monster levels, the level cap and gear stats.

Spawn counts: data/spawn.js's normal and PvP counts against data.grf's navi_mob.lub (the most on one normal channel, and on a PvP one).
A field's table under its old name has no channels, so a PvP count is only compared where the client lists one.
A map's boss and PvP tables can be under its Zero name only (Orc Hero: gef_fild03 is b_gef_f03), so a map's old and Zero names count as one.
Monster levels: data/client.js's mobLv, then data/mobs.js, against navi_mob.lub (the monster list takes its levels from mobLv, so this
finds an old export). A monster that only spawns on a map the planner doesn't list (quest maps) isn't one it's missing.
Level cap: ExternalSettings.lub's MaxLevelTable against the top level of data/exp.js's EXP tables.
Gear stats: data/equipment.js with data/client.js's fixes laid over it, against EquipmentProperties.lub's Stat fields, numbered per Type
(worked out by matching them against the planner's gear; the client doesn't name them):
  armor: 1 DEF, 10 MDEF; Mweapon: 3 ATK, 4 MATK, 11 weapon level; Rweapon: 2 ATK, 9 weapon level; ammo: 2 ATK.
Required level and weight come from the gear's in-game text (System\\iteminfo_enUS.lub: "Required Level : 14", "Weight : 60") and card slots
from System\\itemInfo_data.lub's slotCount. In all of this the client is right: a difference means the planner needs its export re-run
or a fix.
That table's OnStartEquip functions aren't read, so a number a script gives shows as
0 there (★ Book's MATK +125). When the two differ, the gear's in-game text decides: if a line that isn't a refine or set bonus gives
the planner's number, that's no difference. A gear's data-driven bonuses aren't compared, only those numbers.

Boss links: MOB_BOSSES is kept by hand, because the client doesn't link a boss to its base, so each link is checked against the client:
same element, size and race, a higher level, and a sprite that looks most like its base's (bosses are their base's art recoloured).
A monster with a new id that looks like a lower-level one is printed as a possible new boss, but doesn't count as a difference.

Nothing is written. It prints each difference and a summary, and exits 1 if there are any, so it can gate an update.
Run: python tools/check_client.py [--client PATH]
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402
from export_minimaps import DesGrf  # noqa: E402
from export_sprites import crop, draw  # noqa: E402
from lua_tables import load  # noqa: E402

LUA = "data\\luafiles514\\lua files\\"
NAVI = LUA + "navigation\\navi_mob.lub"
EQUIP_PROPS = LUA + "equipmentproperties\\equipmentproperties.lub"
SETTINGS = LUA + "externalsettings.lub"
CHANNEL = re.compile(r"_[abcdyz]$")
COLOUR = re.compile(r"\^[0-9a-fA-F]{6}")
MOB_SPR = "data\\sprite\\몬스터\\"
MOB_BOSSES = {20175: 1131, 20176: 1102, 20177: 1216, 20178: 1213, 20179: 1194}  # boss -> its base, told by a player: Joker, Bathory, Penomena, Infinite High Orc, Arclouse
SPRITE_MATCH = 0.75  # how alike a boss's first frame and its base's must be; unrelated monsters score 0.5 or less, the bosses 0.83 and up
SPRITE_SUGGEST = 0.8  # how alike, to suggest a boss nobody has linked yet
GEAR_FIELDS = {"armor": {"def": 1, "mdef": 10}, "Mweapon": {"atk": 3, "matk": 4, "wlv": 11}, "Rweapon": {"atk": 2, "wlv": 9}, "ammo": {"atk": 2}}


def js_value(name, var):
    """The JSON value after `const var=` in data/<name>.js."""
    src = open(os.path.join(DATA, name), encoding="utf-8").read()
    i = src.index("const " + var + "=") + len(var) + 7
    return json.JSONDecoder().raw_decode(src[i:])[0]


def navi_counts(navi):
    """{(map, monster id): [normal, PvP]}, channels and a map's boss table together, and {id: (sprite, level)}."""
    counts, levels = {}, {}
    for r in navi.values():
        if not isinstance(r, dict) or not isinstance(r.get(4), int) or not r[4] & 0xFFFF:
            continue
        mob, count, name = r[4] & 0xFFFF, r[4] >> 16, r[1]
        row = counts.setdefault((CHANNEL.sub("", name[2:] if name.startswith("b_") else name), mob), [0, None])
        if name.endswith(("_y", "_z")):
            row[1] = max(row[1] or 0, count)
        else:
            row[0] = max(row[0], count)
        levels[mob] = (r[6], r[7])
    return counts, levels


def zero_name(mp):
    """A map's Zero name, as tools/export_spawns.py works it out: prt_fild06 is prt_f06, mjolnir_04 mjo_f04, prt_maze02 maz_d02."""
    return re.sub(r"^mjolnir_(\d\d)$", r"mjo_f\1", re.sub(r"^prt_maze(\d\d)$", r"maz_d\1", re.sub(r"_fild(\d\d)$", r"_f\1", mp)))


def map_codes(mp, names):
    """Every name the client's tables may use for a planner map: its own, its in-game codes, and their Zero names."""
    row = names.get(mp) or []
    codes = [CHANNEL.sub("", c) for c in (mp, *row[:1], *row[2:]) if isinstance(c, str)]
    return list(dict.fromkeys(codes + [zero_name(c) for c in codes]))


def merged_counts(counts, codes, mob):
    """The most any of a map's names lists for a monster, [normal, PvP], or None."""
    found = [counts[(c, mob)] for c in codes if (c, mob) in counts]
    if not found:
        return None
    pvp = [f[1] for f in found if f[1] is not None]
    return [max(f[0] for f in found), max(pvp) if pvp else None]


def check_spawns(spawn, counts, names):
    bad, missing, same = [], [], 0
    for mob, rows in spawn.items():
        for row in rows:
            mp, n, pvp = row[0], row[1], row[2] if len(row) > 2 else None
            if n is None:
                continue  # a map the client doesn't have
            have = merged_counts(counts, map_codes(mp, names), int(mob))
            if not have:
                missing.append(f"  monster {mob} on {mp}: planner {n}, not in the client's table")
            elif have[0] != n or (have[1] is not None and pvp is not None and have[1] != pvp):
                bad.append(f"  monster {mob} on {mp}: planner {n} (PvP {pvp}), client {have[0]} (PvP {have[1]})")
            else:
                same += 1
    print(f"Spawn counts: {same} match, {len(bad)} differ, {len(missing)} not in the client")
    print("\n".join(bad + missing)) if bad or missing else None
    return len(bad) + len(missing)


def check_levels(mob_lv, mobs_js, levels, counts, names):
    ours = {**{i: lv for i, (_, lv) in mobs_js.items()}, **{int(i): v[1] for i, v in mob_lv.items()}}
    nm = lambda i: (mob_lv.get(str(i)) or mobs_js.get(i) or ("?",))[0]
    bad = [f"  {i} {nm(i)}: planner Lv {ours[i]}, client Lv {lv}" for i, (_, lv) in sorted(levels.items()) if i in ours and ours[i] != lv]
    # the planner's maps, under every name the client may use
    known = {c for mp in names for c in map_codes(mp, names)}
    on_ours = {mob for mp, mob in counts if mp in known}
    missing = [f"  {i} {s}: Lv {lv}, not in the planner" for i, (s, lv) in sorted(levels.items()) if i not in ours and i in on_ours]
    other = sum(1 for i in levels if i not in ours and i not in on_ours)
    print(f"Monster levels: {len(levels) - len(bad) - len(missing) - other} match, {len(bad)} differ, {len(missing)} missing from the planner, {other} only on maps the planner doesn't list")
    print("\n".join(bad + missing)) if bad or missing else None
    return len(bad) + len(missing)


def check_cap(settings, exp_src):
    cap = settings.get("MaxLevelTable", {})
    base = cap.get("BaseLevel")
    table = re.search(r"const EXP_TABLE=\{(.*?)\}", exp_src, re.S)
    top = max(int(i) for i in re.findall(r"(\d+):", table.group(1)))
    print(f"Level cap: client {base}, planner's EXP table runs to {top}")
    if base != top:
        print(f"  the client's cap is {base} and the EXP table stops at {top}: see data/exp.js")
        return 1
    return 0


def in_text(lines, field, value):
    """Whether a gear's text gives this number for this stat: "MATK +125", "MATK : 125"."""
    label = {"def": "DEF", "mdef": r"M\.?DEF", "atk": "ATK", "matk": r"M\.?ATK", "wlv": "Weapon Level"}[field]
    return any(re.search(rf"(?<![A-Za-z.]){label}\s*[:+]\s*{value}(?!\d)", x) for x in lines if not re.search(r"(?i)refine|when equipped|set with", x))


def text_number(lines, label):
    """The number on a gear's "Label : N" line, or None."""
    for x in lines:
        m = re.fullmatch(rf"\s*{label}\s*:\s*(\d+)\s*", x)
        if m:
            return int(m[1])
    return None


def check_gear(equip, fix, props, info, slots):
    bad, unknown, same, by_text = [], [], 0, 0
    for e in equip:
        i = e.get("id")
        if not i:
            continue
        p = props.get(i)
        if not isinstance(p, dict) or not isinstance(p.get("Stat"), dict):
            unknown.append(i)
            continue
        fields = GEAR_FIELDS.get(p.get("Type"))
        if not fields:
            continue
        g = {**e, **fix.get(str(i), {})}
        lines = [COLOUR.sub("", str(x)) for x in ((info.get(i) or {}).get("identifiedDescriptionName") or {}).values()]
        diff = [(k, g.get(k) or 0, p["Stat"].get(n) or 0) for k, n in fields.items() if (g.get(k) or 0) != (p["Stat"].get(n) or 0)]
        real = [d for d in diff if not (d[1] and in_text(lines, d[0], d[1]))]
        msgs = [f"{k} planner {a}, stats table {b}{', item text agrees with the table' if b and in_text(lines, k, b) else ''}" for k, a, b in real]
        lv, w, sl = text_number(lines, "Required Level"), text_number(lines, "Weight"), slots.get(i)
        if lv is not None and lv != (g.get("lv") or 0):
            msgs.append(f"required level planner {g.get('lv') or 0}, item text {lv}")
        if w is not None and w != (g.get("w") or 0):
            msgs.append(f"weight planner {g.get('w') or 0}, item text {w}")
        if sl is not None and sl != (g.get("slots") or 0):
            msgs.append(f"card slots planner {g.get('slots') or 0}, client {sl}")
        if msgs:
            bad.append(f"  {i} {g.get('name')}: " + ", ".join(msgs))
        elif diff:
            by_text += 1
        else:
            same += 1
    print(f"Gear stats: {same} match, {by_text} match the item text (the stats table leaves that number to a script), {len(bad)} differ, {len(unknown)} not in the client's table")
    print("\n".join(bad)) if bad else None
    return len(bad)


def sprite_look(grf, sprite, n=24):
    """A monster's first frame shrunk to n x n, whatever its colours: (drawn or not, brightness) per cell; None if it has no sprite file."""
    path = MOB_SPR + (sprite or "").lower()
    if not sprite or not grf.has(path + ".spr") or not grf.has(path + ".act"):
        return None
    w, h, px, _, _ = crop(draw(grf.read(path + ".spr"), grf.read(path + ".act"))[0])
    cells = [(yy * h // n * w + xx * w // n) * 4 for yy in range(n) for xx in range(n)]
    return [1 if px[i + 3] else 0 for i in cells], [(px[i] + px[i + 1] + px[i + 2]) // 3 if px[i + 3] else 0 for i in cells]


def sprite_score(a, b):
    """0 to 1: the average of how well two looks' shapes overlap and how alike their shading is, so a recolour still scores high."""
    both = [(x, y) for x, y, m, k in zip(a[1], b[1], a[0], b[0]) if m and k]
    either = sum(1 for m, k in zip(a[0], b[0]) if m or k)
    if len(both) < 20 or not either:
        return 0
    mx, my = sum(x for x, _ in both) / len(both), sum(y for _, y in both) / len(both)
    dx, dy = sum((x - mx) ** 2 for x, _ in both) ** .5, sum((y - my) ** 2 for _, y in both) ** .5
    shading = sum((x - mx) * (y - my) for x, y in both) / (dx * dy) if dx and dy else 0
    return (len(both) / either + max(shading, 0)) / 2


def check_bosses(grf, navi, bosses, levels):
    """A boss link holds if the boss has its base's element, size and race, a higher level, and looks most like its base of the monsters
    that share those. Monsters that look like a lower-level one with the same element, size and race but aren't linked are only suggested."""
    packed = {r[4] & 0xFFFF: r[8] for r in navi.values() if isinstance(r, dict) and isinstance(r.get(4), int) and r[4] & 0xFFFF}
    looks, name = {}, lambda i: levels[i][0] if i in levels else i

    def look(i):
        if i not in looks:
            looks[i] = sprite_look(grf, levels[i][0]) if i in levels else None
        return looks[i]

    def rivals(i):
        return [j for j in packed if j != i and packed[j] == packed[i] and look(j)]

    bad, good = [], 0
    for boss, base in sorted(bosses.items()):
        if boss not in packed or base not in packed:
            bad.append(f"  {boss} -> {base}: not in the client's spawn table")
        elif packed[boss] != packed[base]:
            bad.append(f"  {name(boss)} -> {name(base)}: different element, size or race")
        elif levels[boss][1] <= levels[base][1]:
            bad.append(f"  {name(boss)} -> {name(base)}: Lv {levels[boss][1]} isn't above its base's Lv {levels[base][1]}")
        elif not look(boss) or not look(base):
            bad.append(f"  {name(boss)} -> {name(base)}: no sprite file to compare")
        else:
            score = sprite_score(look(boss), look(base))
            best = max(rivals(boss), key=lambda j: sprite_score(look(boss), look(j)))
            if score < SPRITE_MATCH:
                bad.append(f"  {name(boss)} -> {name(base)}: sprites don't look alike ({score:.2f})")
            elif best != base:
                bad.append(f"  {name(boss)} -> {name(base)}: looks more like {name(best)} ({sprite_score(look(boss), look(best)):.2f} against {score:.2f})")
            else:
                good += 1
    print(f"Boss links: {good} confirmed by their sprites, {len(bad)} don't hold")
    print("\n".join(bad)) if bad else None
    # not a difference, only worth a look: a new boss nobody has linked yet
    new = []
    for i in sorted(packed):
        if i in bosses or i < 20000 or i not in levels or not look(i):
            continue
        low = [j for j in rivals(i) if levels[j][1] < levels[i][1]]
        best = max(low, key=lambda j: sprite_score(look(i), look(j)), default=None)
        if best and sprite_score(look(i), look(best)) >= SPRITE_SUGGEST:
            new.append(f"  {name(i)} ({i}) looks like {name(best)} ({best}): add it to MOB_BOSSES if it's a boss version")
    print("Possible new boss versions (not counted as differences):\n" + "\n".join(new)) if new else None
    return len(bad)


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = DesGrf(os.path.join(client, "data.grf"))
    navi = load(grf.read(NAVI))["Navi_Mob"]
    counts, levels = navi_counts(navi)
    props = load(grf.read(EQUIP_PROPS))["Item"]
    settings = load(grf.read(SETTINGS))
    names = js_value("maps.js", "MAPNAMES")
    mobs = open(os.path.join(DATA, "mobs.js"), encoding="utf-8").read()
    mobs_js = {int(i): (n, int(lv)) for i, n, lv in re.findall(r'\[(\d+),"([^"]*)",(\d+),', mobs[mobs.index("const MOBS="):])}
    n = check_spawns(js_value("spawn.js", "SPAWN"), counts, names)
    n += check_levels(js_value("client.js", "CLIENT")["mobLv"], mobs_js, levels, counts, names)
    n += check_cap(settings, open(os.path.join(DATA, "exp.js"), encoding="utf-8").read())
    info = {int(k): v for k, v in lua_data(open(os.path.join(client, "System", "iteminfo_enUS.lub"), "rb").read(), "utf-8")["tbl_string"].items()}
    data = lua_data(open(os.path.join(client, "System", "itemInfo_data.lub"), "rb").read(), "utf-8", lenient=True)["tbl_data"]
    slots = {int(k): v["slotCount"] for k, v in data.items() if isinstance(v, dict) and isinstance(v.get("slotCount"), int)}
    n += check_gear(js_value("equipment.js", "EQUIP"), js_value("client.js", "CLIENT")["fix"], props, info, slots)
    n += check_bosses(grf, navi, MOB_BOSSES, levels)
    print(f"{n} difference{'' if n == 1 else 's'}" if n else "No differences.")
    sys.exit(1 if n else 0)


if __name__ == "__main__":
    main()
