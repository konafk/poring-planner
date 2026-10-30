"""What the game's newest patches changed, from its public patch server, so you know which data to refresh.

It reads the launcher's patch list (patch-roz.mygnjoy.com/live/patchinfo/patch.txt), takes the patches after the last one it saw, and
compares each changed table with the version before it (found by walking back through the list):
- from .gpf patches, only each file's table of contents and the tables below, by range request: monster spawns and levels, NPCs, map
  links, skill text, the level cap, gear stats, box lists and selection boxes (Navi_Mob, Navi_Npc, Navi_Link, SkillDescript_enUS,
  ExternalSettings, EquipmentProperties, packageitem, SelectPackageItem_Data);
- from .rgz patches, the whole file: English item names and text, map names and quests (System\\iteminfo_enUS.lub, mapInfo_enUS.lub,
  OngoingQuestInfoList_enUS.lub). Ragexe and Raghash patches are the game program and its hash, and are only listed.
Patch files are read as data; nothing in them is run. They're kept in tools/cache/patches, so a re-run downloads nothing twice.
Monster and map names come from the installed client, so one it doesn't have yet shows by its sprite or code.

The last patch seen is kept in tools/cache/patch_seen.txt; the first run starts at the installed client's patch.inf. --from and --to
compare any range, and don't move the last patch seen.
Run: python tools/check_patch.py [--from N] [--to N] [--client PATH]
"""
import collections, gzip, json, os, re, struct, sys, urllib.request, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_client import navi_counts  # noqa: E402
from export_minimaps import des_block, grf_decode  # noqa: E402
from export_mobnames import english  # noqa: E402
from export_spawns import lua_data  # noqa: E402
from lua_tables import load  # noqa: E402

BASE = "https://patch-roz.mygnjoy.com/live/"
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache", "patches")
SEEN = os.path.join(CACHE, "..", "patch_seen.txt")
TABLES = ("navi_mob", "navi_npc", "navi_link", "skilldescript_enus", "externalsettings", "equipmentproperties", "packageitem", "selectpackageitem_data")
TEXTS = ("iteminfo_enus", "mapinfo_enus", "ongoingquestinfolist_enus")
COLOUR = re.compile(r"\^[0-9a-fA-F]{6}")
CHANNEL = re.compile(r"_[abcdyz]$")


def fetch(path, rng=None):
    head = {"User-Agent": "curl/8"}
    if rng:
        head["Range"] = f"bytes={rng[0]}-{rng[1]}"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=head), timeout=120) as r:
        return r.read(), r.headers


def patch_list():
    """[(number, file)] in order; a line commented out with // is one the launcher skips."""
    text = fetch("patchinfo/patch.txt")[0].decode("utf-8", "replace")
    return [(int(m[1]), m[2]) for m in re.finditer(r"^\s*(\d+)\s+(\S+)\s*$", text, re.M)]


def gpf_table(name):
    """A .gpf's table of contents, [[file, packed size, aligned size, size, position]]: a GRF 0x102, whose names are scrambled (rAthena's
    grfio: each byte's nibbles swapped, then the GRF DES on each block)."""
    path = os.path.join(CACHE, name + ".json")
    if os.path.exists(path):
        return json.load(open(path, encoding="utf-8"))
    h, hd = fetch("patchfile/" + name, (0, 45))
    total = int(hd["Content-Range"].split("/")[1])
    off, _, _, ver = struct.unpack("<IIII", h[30:46])
    if ver != 0x102:
        raise SystemExit(f"{name}: GRF version {ver:#x}, only 0x102 is handled")
    t, i, out = fetch("patchfile/" + name, (off + 46, total - 1))[0], 0, []
    while i + 4 <= len(t):
        ln = struct.unpack("<I", t[i:i + 4])[0]
        o = i + 4 + ln
        if o + 17 > len(t):
            break
        enc, dec = t[i + 6:i + ln], bytearray()
        for k in range(0, len(enc) - len(enc) % 8, 8):
            dec += bytes(des_block(bytearray(((x << 4) & 0xF0) | (x >> 4) for x in enc[k:k + 8])))
        c, a, r = struct.unpack("<III", t[o:o + 12])
        if t[o + 12] & 1:
            out.append([bytes(dec).split(b"\0")[0].decode("cp949", "replace"), c - r - 715, a - 37579, r, struct.unpack("<I", t[o + 13:o + 17])[0] + 46])
        i = o + 17
    os.makedirs(CACHE, exist_ok=True)
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    return out


def gpf_file(name, entry):
    """One file out of a .gpf, by range request."""
    nm, cs, al, rs, pos = entry
    path = os.path.join(CACHE, f"{name}.{re.sub(r'[^a-z0-9_.]', '_', nm.lower())}")
    if os.path.exists(path):
        return open(path, "rb").read()
    d = zlib.decompress(grf_decode(fetch("patchfile/" + name, (pos, pos + al - 1))[0], 2, cs)[:cs])
    if len(d) != rs:
        raise SystemExit(f"{name}: {nm} unpacked to {len(d)} bytes, not {rs}")
    open(path, "wb").write(d)
    return d


def rgz_files(name):
    """{file name: bytes} of an .rgz: a gzip of [type byte, name length byte, name, size, data]."""
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        open(path, "wb").write(fetch("patchfile/" + name)[0])
    b, i, out = gzip.open(path).read(), 0, {}
    while i < len(b):
        t = b[i:i + 1]; ln = b[i + 1]; nm = b[i + 2:i + 2 + ln].rstrip(b"\0").decode("cp949", "replace"); i += 2 + ln
        if t == b"e":
            break
        if t == b"f":
            s = struct.unpack("<I", b[i:i + 4])[0]; i += 4
            out[nm] = b[i:i + s]; i += s
    return out


def base_name(f):
    return f.replace("/", "\\").rsplit("\\", 1)[-1].lower().rsplit(".", 1)[0]


def latest(rows, wanted):
    """{table: bytes}: each wanted table's newest version in rows (oldest first), stopping as soon as all are found."""
    found = {}
    for _, f in reversed(rows):
        if "live_client" not in f or len(found) == len(wanted):
            continue
        if f.endswith(".gpf"):
            for e in gpf_table(f):
                k = base_name(e[0])
                if k in wanted and k not in found and "luafiles514" in e[0].lower():
                    found[k] = gpf_file(f, e)
        elif set(wanted) & set(TEXTS):
            for nm, b in rgz_files(f).items():
                k = base_name(nm)
                if k in wanted and k not in found:
                    found[k] = b
    return found


def section(title, lines):
    if lines:
        print(f"\n{title} ({len(lines)})")
        print("\n".join("  " + x for x in lines))
    return bool(lines)


def diff_spawns(old, new, names, maps):
    (c0, l0), (c1, l1) = navi_counts(old), navi_counts(new)
    code = lambda t: {r[4] & 0xFFFF: names.get(str(r[5]).strip("\x1c")) or r[6] for r in t.values() if isinstance(r, dict) and isinstance(r.get(4), int)}
    nm = {**code(old), **code(new)}
    rows = [(k, c0.get(k, [0, None]), c1.get(k, [0, None])) for k in sorted(set(c0) | set(c1)) if c0.get(k) != c1.get(k)]
    # a field's table under its old name repeats the Zero name's counts, without PvP: leave those out
    pvp = {(maps.get(k[0], k[0]), k[1], o[0], n[0]) for k, o, n in rows if o[1] is not None or n[1] is not None}
    rows = [r for r in rows if r[1][1] is not None or r[2][1] is not None or (maps.get(r[0][0], r[0][0]), r[0][1], r[1][0], r[2][0]) not in pvp]
    by = collections.defaultdict(list)
    for (mp, mob), o, n in rows:
        by[mob].append(f"{maps.get(mp, mp)} " + (f"+{n[0]}" if not o[0] else f"removed, was {o[0]}" if not n[0] else f"{o[0]} -> {n[0]}"))
    changed = section("Monster spawns", [f"{nm.get(m, m)} ({m}){' (first time in the spawn table)' if m not in l0 else ''}: " + ", ".join(dict.fromkeys(v)) for m, v in sorted(by.items())])
    gone = [f"{nm.get(m, m)} ({m})" for m in sorted(set(l0) - set(l1))]
    lv = [f"{nm.get(m, m)} ({m}): Lv {l0[m][1]} -> {l1[m][1]}" for m in sorted(set(l0) & set(l1)) if l0[m][1] != l1[m][1]]
    return section("Monsters no longer spawned", gone) | section("Monster levels", lv) | changed


def diff_npcs(old, new, names, maps):
    def table(t):
        s = collections.defaultdict(set)
        for r in t.values():
            if isinstance(r, dict):
                s[(CHANNEL.sub("", r[1]), r.get(5))].add((r.get(7), r.get(8)))
        return s
    a, b = table(old), table(new)
    label = lambda k: f"{maps.get(k[0], k[0])}: {names.get(str(k[1]).strip(chr(28))) or '(unnamed)'}"
    keys = sorted(set(a) | set(b), key=str)
    return (section("NPCs added", sorted({label(k) for k in keys if k not in a}))
            | section("NPCs removed", sorted({label(k) for k in keys if k not in b}))
            | section("NPCs moved", sorted({label(k) for k in keys if k in a and k in b and a[k] != b[k]})))


def diff_links(old, new, maps):
    pairs = lambda t: {(maps.get(CHANNEL.sub("", r[1]), r[1]), maps.get(CHANNEL.sub("", r[9]), r[9])) for r in t.values() if isinstance(r, dict) and isinstance(r.get(9), str)}
    a, b = pairs(old), pairs(new)
    fmt = lambda s: [f"{x} -> {y}" for x, y in sorted(s) if x != y]
    return section("Map connections added", fmt(b - a)) | section("Map connections removed", fmt(a - b))


def text_lines(v):
    if not isinstance(v, dict):
        return []
    return [s for s in (COLOUR.sub("", str(x)).strip() for _, x in sorted(v.items(), key=lambda z: str(z[0]).zfill(5))) if s and s != "_" and not re.fullmatch(r"-{3,}", s)]


def diff_text(old, new, label=lambda k, v: k):
    lines = []
    for k in sorted(set(old) | set(new), key=str):
        a, b = text_lines(old.get(k)), text_lines(new.get(k))
        if a != b:
            lines.append(label(k, new.get(k) or old.get(k)) + ":")
            lines += [f"  - {x}" for x in a if x not in b] + [f"  + {x}" for x in b if x not in a]
    return lines


def diff_gear(old, new, items):
    a, b = old.get("Item", {}), new.get("Item", {})
    lines = []
    for k in sorted(set(a) & set(b), key=str):
        x, y = (a[k].get("Stat") or {}) if isinstance(a[k], dict) else {}, (b[k].get("Stat") or {}) if isinstance(b[k], dict) else {}
        ch = [f"stat {i}: {x.get(i)} -> {y.get(i)}" for i in sorted(set(x) | set(y)) if x.get(i) != y.get(i)]
        if ch:
            lines.append(f"{items.get(k, k)} ({k}): " + ", ".join(ch))
    added = [f"{items.get(k, k)} ({k})" for k in sorted(set(b) - set(a), key=str)]
    return section("Gear stats changed (stat fields: see tools/check_client.py)", lines) | section("Gear added to the stats table", added)


def box_items(t):
    out = {}
    for k, v in (t or {}).items():
        out[k] = sorted(str(e.get("id", e.get("item"))) + (f" x{e['cnt']}" if e.get("cnt", 1) != 1 else "")
                        for g in (v.values() if isinstance(v, dict) else []) for e in (g.values() if isinstance(g, dict) and "id" not in g else [g]) if isinstance(e, dict))
    return out


def diff_boxes(old, new, items, title):
    a, b = box_items(old), box_items(new)
    named = lambda s: re.sub(r"^\d+", lambda m: str(items.get(int(m[0]), m[0])), s)
    lines = [f"{items.get(k, k)} ({k}): " + (", ".join(named(x) for x in b[k]) if k not in a else "+ " + ", ".join(named(x) for x in b[k] if x not in a[k]) + "  - " + ", ".join(named(x) for x in a[k] if x not in b[k]))
             for k in sorted(b, key=str) if a.get(k) != b[k]]
    return section(title, lines)


def diff_items(old, new):
    name = lambda v: v.get("identifiedDisplayName", "")
    added = sorted(set(new) - set(old))
    lines = [f"{name(new[k])} ({k})" for k in sorted(added, key=lambda k: (not name(new[k]).startswith("[Costume]"), k))]
    ren = [f"{k}: {name(old[k])} -> {name(new[k])}" for k in sorted(set(old) & set(new)) if name(old[k]) != name(new[k])]
    txt = diff_text({k: old[k].get("identifiedDescriptionName") for k in old if k in new}, {k: new[k].get("identifiedDescriptionName") for k in new if k in old}, lambda k, _: f"{name(new[k])} ({k})")
    return section("New items", lines) | section("Items renamed", ren) | section("Item text changed", txt)


def named_dict(t, key):
    return {k: (v.get(key, "") if isinstance(v, dict) else "") for k, v in t.items()}


def main():
    arg = lambda f: sys.argv[sys.argv.index(f) + 1] if f in sys.argv else None
    client = arg("--client") or r"C:\Gravity\RagnarokZero"
    rows = patch_list()
    start = arg("--from")
    if start is None:
        if os.path.exists(SEEN):
            start = open(SEEN).read().strip()
        else:
            start = struct.unpack("<i", open(os.path.join(client, "patch.inf"), "rb").read(4))[0]
    start, end = int(start), int(arg("--to") or rows[-1][0])
    new = [r for r in rows if start < r[0] <= end]
    if not new:
        print(f"No new patches: the list ends at {rows[-1][0]}, and you've seen up to {start}.")
        return
    before, upto = [r for r in rows if r[0] <= start], [r for r in rows if r[0] <= end]
    print(f"Patches {new[0][0]} to {new[-1][0]}:")
    for n, f in new:
        print(f"  {n} {f}")
    # which of the watched files these patches carry, and every file they touch
    touched, kinds = set(), collections.Counter()
    for _, f in new:
        if "live_client" not in f:
            continue
        names = [e[0] for e in gpf_table(f)] if f.endswith(".gpf") else list(rgz_files(f))
        for nm in names:
            touched.add(base_name(nm))
            p = nm.lower().split("\\")
            kinds[p[0] if p[0] != "data" else "\\".join(p[1:3]) if len(p) > 3 else "data"] += 1
    section("Files changed, by folder", [f"{v} {k}" for k, v in kinds.most_common(12)])
    if not kinds:
        print("\nOnly the game program changed: no game data.")
    wanted = touched & set(TABLES + TEXTS)
    a, b = latest(before, wanted), latest(upto, wanted)
    names = english(os.path.join(client, "data.grf"))
    sysf = lambda f: lua_data(open(os.path.join(client, "System", f), "rb").read(), "utf-8")
    maps = {k[:-4]: v for k, v in named_dict(sysf("mapInfo_enUS.lub")["mapTbl_string"], "displayName").items()}
    info = sysf("iteminfo_enUS.lub")["tbl_string"]
    if "iteminfo_enus" in b:
        info = {**info, **lua_data(b["iteminfo_enus"], "utf-8")["tbl_string"]}
    items = {int(k): v.get("identifiedDisplayName", "") for k, v in info.items()}
    if "mapinfo_enus" in b:
        maps.update({k[:-4]: v for k, v in named_dict(lua_data(b["mapinfo_enus"], "utf-8")["mapTbl_string"], "displayName").items()})
    maps.update({k[:-2]: v for k, v in list(maps.items()) if k.endswith("_a") and k[:-2] not in maps})  # the channels have the name
    found, refresh = False, set()
    tbl = lambda k, var: (load(a[k]).get(var, {}) if k in a else {}, load(b[k]).get(var, {}))
    for k in wanted - set(b):
        print(f"\n{k}: changed, but no version could be read")
    if "navi_mob" in b and a.get("navi_mob") != b["navi_mob"] and "navi_mob" in a:
        if diff_spawns(*tbl("navi_mob", "Navi_Mob"), names, maps):
            found = True; refresh |= {"export_spawns.py", "export_client.py"}
    if "navi_npc" in b and "navi_npc" in a and a["navi_npc"] != b["navi_npc"]:
        if diff_npcs(*tbl("navi_npc", "Navi_Npc"), names, maps):
            found = True; refresh.add("export_navi.py")
    if "navi_link" in b and "navi_link" in a and a["navi_link"] != b["navi_link"]:
        if diff_links(*tbl("navi_link", "Navi_Link"), maps):
            found = True; refresh.add("export_navi.py")
    if "skilldescript_enus" in b and "skilldescript_enus" in a:
        lines = diff_text(*tbl("skilldescript_enus", "SKILL_DESCRIPT"), lambda k, v: (text_lines(v) or [k])[0] + f" ({str(k).replace('SKID.', '')})")
        found |= section("Skill text changed", lines)
    if "externalsettings" in b and "externalsettings" in a:
        x, y = tbl("externalsettings", "MaxLevelTable")
        if section("Level cap", [f"{k}: {x.get(k)} -> {y.get(k)}" for k in sorted(set(x) | set(y)) if x.get(k) != y.get(k)]):
            found = True; print("  Extend data/exp.js's tables if the cap went past them.")
    if "equipmentproperties" in b and "equipmentproperties" in a:
        found |= diff_gear(load(a["equipmentproperties"]), load(b["equipmentproperties"]), items)
    if "packageitem" in b:
        found |= diff_boxes(load(a["packageitem"]).get("tbl", {}) if "packageitem" in a else {}, load(b["packageitem"]).get("tbl", {}), items, "Box lists")
        refresh.add("export_client.py")
    if "selectpackageitem_data" in b:
        pick = lambda t: t.get("SelectPackageItemData", {}).get("PackageTbl", {})
        def flat(t):
            return {k: {i: e for g in v.values() if isinstance(g, dict) for i, e in g.items()} for k, v in pick(t).items() if isinstance(v, dict)}
        found |= diff_boxes(flat(load(a["selectpackageitem_data"])) if "selectpackageitem_data" in a else {}, flat(load(b["selectpackageitem_data"])), items, "Selection boxes")
        refresh.add("export_client.py")
    if "iteminfo_enus" in b and "iteminfo_enus" in a:
        if diff_items(lua_data(a["iteminfo_enus"], "utf-8")["tbl_string"], lua_data(b["iteminfo_enus"], "utf-8")["tbl_string"]):
            found = True; refresh.add("export_client.py")
    if "mapinfo_enus" in b and "mapinfo_enus" in a:
        x, y = (named_dict(lua_data(t["mapinfo_enus"], "utf-8")["mapTbl_string"], "displayName") for t in (a, b))
        if section("New maps", [f"{v or k} ({k[:-4]})" for k, v in sorted(y.items()) if k not in x]):
            found = True; refresh.add("export_mapnames.py")
    if "ongoingquestinfolist_enus" in b and "ongoingquestinfolist_enus" in a:
        def quests(t):
            d = lua_data(t["ongoingquestinfolist_enus"], "utf-8")
            return next((v for k, v in d.items() if k == "QuestInfoList_string"), {})
        x, y = quests(a), quests(b)
        title = lambda v: (v.get("Title") or v.get("title") or "") if isinstance(v, dict) else ""
        found |= section("New quests", [f"{title(v)} ({k})" for k, v in sorted(y.items(), key=lambda z: str(z[0])) if k not in x])
    if not found and kinds:
        print("\nNo changes in the tables it watches.")
    if refresh:
        print("\nAfter the launcher installs these patches, re-run: " + ", ".join(f"tools/{x}" for x in sorted(refresh)) + ", then tools/check_client.py")
    if arg("--from") is None and arg("--to") is None:
        os.makedirs(CACHE, exist_ok=True)
        open(SEEN, "w").write(str(end))


if __name__ == "__main__":
    main()
