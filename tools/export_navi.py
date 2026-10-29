"""Export the NPCs, the ways out of each map and the walking routes from the towns, from your installed Ragnarok Zero client's
Navigation tables (official Global client, read-only), for the Maps tab and the Map planner.

    python tools/export_navi.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_navi.py --client "D:\\Games\\RagnarokZero"

data.grf's data\\luafiles514\\lua files\\navigation\\ holds the tables the game's Navigation (/navi) finds its way with:
- navi_npc.lub: every NPC, [map, id, type, sprite, name, group, x, y]. Names are keys (\\x1c<key>\\x1c) into the client's
  translation tables (data\\i18n\\sc\\*.csv: key, then each language in base64, English third)
- navi_link.lub: every way from one map to another, [map, id, type, sprite, name, group, x, y, to map, to x, to y]. Type 200 is a
  portal you walk into, 201 an NPC that sends you (Sailor, Eden Group Teleport, Nordfeld Ambassador, channel devices), 204 a Kafra
  Employee's teleport service (its fee isn't in the client)
- navi_linkdistance.lub: per map and per way out, how many cells you walk to it from where each way in lands you
- navi_map.lub: each map's size in cells
The _enus, _data, krloc and krpri copies next to them are other servers' tables or only their strings; these four are the live ones
(they hold the same maps as navi_mob.lub, which data/spawn.js comes from).

A map's channels (an_d01_a, _b, _z, ...) are the same map, so they count as it; the channel devices and the PvP guides that move you
between them aren't ways out. A field's old code (prt_fild08) and Zero code (prt_f08) are the same map too.

Routes: from each start (a town in data/minimaps.js TOWNS, or a map a Kafra teleports you to), where a Kafra teleport lands you
there, every spawn map in data/maps.js is reached the shortest walk away (portals and NPCs that send you, no Kafra teleports): the
cells walked and each way out taken on the way. The page adds a Kafra teleport from your save town in front.

Writes data/navi.js. Standard library only.
"""
import base64, heapq, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, js_object, lua_data
from export_minimaps import ALIAS, DesGrf

NAVI = "data\\luafiles514\\lua files\\navigation\\"
I18N = "data\\i18n\\sc\\"
# ways between a map's channels, not out of it
CHANNEL_SPRITES = {13004, 10007}
CHANNEL = re.compile(r"^(.+)_[a-dyz]$")
PVP = re.compile(r"^(.+)_[yz]$")
# NPC kinds the page marks on the map: Kafra, shops, the rest
SHOP = re.compile(r"(Dealer|Merchant|Trader|Vendor|Shop)$")
KEEP_ROUTES = 6  # starts kept per spawn map, nearest first
# NPCs the client's dialogue has but its Navigation doesn't place: (map, name, x, y), each with where it's from. Februs crafts the
# Atelier Manus headgear (data/client.js recipes); the Project Zero wiki (wiki.playragnarokzero.com, Headgear Ingredients) has
# Atelier Manus at prontera 50 293. Not checked in game on Global yet: correct it here if it's elsewhere
EXTRA_NPCS = [("prontera", "Februs", 50, 293)]


def translations(grf):
    """The client's English text by key (data\\i18n\\sc\\*.csv)"""
    tr = {}
    for name in grf.ents:
        if name.startswith(I18N) and name.endswith(".csv"):
            for line in grf.read(name).decode("utf-8", "replace").split("\n"):
                cols = line.split(",")
                if len(cols) > 2 and cols[2]:
                    try:
                        tr[cols[0]] = base64.b64decode(cols[2]).decode("utf-8").strip()
                    except ValueError:
                        pass
    return tr


def rows(grf, file, table):
    return [r for r in lua_data(grf.read(NAVI + file), "utf-8")[table].values() if isinstance(r, dict)]


def chunks(flat):
    """navi_linkdistance's flat list (map, count, {...}, map, count, {...}, ...) as {map: {...}}"""
    vals = [flat[i] for i in sorted(flat)]
    return {vals[i]: vals[i + 2] for i in range(0, len(vals) - 2, 3)}


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = DesGrf(os.path.join(client, "data.grf"))
    tr = translations(grf)
    name = lambda s: tr.get(s.strip("\x1c"), "") if isinstance(s, str) and s.startswith("\x1c") else (s or "")
    spawns = js_object("maps", "MAPNAMES")
    src = open(os.path.join(DATA, "minimaps.js"), encoding="utf-8").read()
    i = src.index("{", src.index("const TOWNS="))
    towns = json.loads(src[i:src.index("};", i) + 1])
    shown = {str(k).lower().removesuffix(".rsw"): v.get("displayName", "").strip()
             for k, v in lua_data(open(os.path.join(client, "System", "mapInfo_enUS.lub"), "rb").read())["mapTbl_string"].items()
             if isinstance(v, dict)}

    # in-game code -> the page's key: spawn maps by every code they go by, towns by their code and their copies' (prt_mk_g1, the
    # same name), channels as their map
    keys = {t: t for t in towns}
    keys.update({c: t for t in towns for c, n in shown.items() if n and n == shown.get(t) and c not in keys})
    for k, r in spawns.items():
        for c in [r[0], *r[2:], k, ALIAS.get(k)]:
            if c:
                keys.setdefault(c.lower(), k)
    def key(code):
        code = code.lower()
        if code in keys:
            return keys[code]
        m = CHANNEL.match(code)
        return keys.get(m.group(1), m.group(1)) if m else code
    def pvp(code):
        """a PvP channel (_y, _z) of a map"""
        return code.lower() not in keys and bool(PVP.match(code.lower())) and key(code) != code.lower()
    is_kafra = lambda r: r[3] == 204 or name(r[5]) == "Kafra Employee"
    def way(r):
        """a way out you walk or are sent through: not a Kafra teleport, not between a map's channels (or to a PvP one), and on the
        same map only a portal between its rooms (a town Guide "sending" you inside the town only shows you the way)"""
        if is_kafra(r) or r[4] in CHANNEL_SPRITES or pvp(r[9]):
            return False
        return key(r[9]) != key(r[1]) or (r[9].lower() == r[1].lower() and r[3] == 200)

    maps = {r[1].lower(): r for r in rows(grf, "navi_map.lub", "Navi_Map")}
    npcs = rows(grf, "navi_npc.lub", "Navi_Npc")
    links = {r[2]: r for r in rows(grf, "navi_link.lub", "Navi_Link")}
    # channels named apart from their map's code (nrd_d02_a for nrd_dun02): the channel devices link them
    for r in links.values():
        if r[4] in CHANNEL_SPRITES and r[1].lower() not in keys and r[9].lower() in keys:
            keys[r[1].lower()] = keys[r[9].lower()]
    dist = {m.lower(): t for m, t in chunks(lua_data(grf.read(NAVI + "navi_linkdistance.lub"), "utf-8")["Navi_Distance"]).items()}

    # each key's own code: the one the page's picture is of (in-game code first, as tools/export_minimaps.py looks), so NPCs and
    # warps are drawn where the picture has them
    own = {}
    for k, r in [*spawns.items(), *((t, [t]) for t in towns)]:
        code = next((c.lower() for c in [r[0], *r[2:], k, ALIAS.get(k)] if c and c.lower() in maps), None)
        if code:
            own[k] = code
    size = {k: [maps[c][4], maps[c][5]] for k, c in own.items()}

    # ---- NPCs on each map, and where each way out goes
    sends = {(r[1].lower(), r[7], r[8]) for r in links.values() if r[3] == 201 and way(r)}
    out_npcs, warps, kafra = {}, {}, {}
    for k, code in own.items():
        seen, lst = set(), []
        for r in npcs:
            n = name(r[5])
            if r[1].lower() != code or not n or r[4] in CHANNEL_SPRITES or (n, r[7], r[8]) in seen:
                continue
            seen.add((n, r[7], r[8]))
            kind = "k" if n == "Kafra Employee" else "s" if SHOP.search(n) else "w" if (code, r[7], r[8]) in sends else ""
            lst.append([n, r[7], r[8], kind] if kind else [n, r[7], r[8]])
        lst += [[n, x, y] for m, n, x, y in EXTRA_NPCS if m == k and not any(e[0] == n for e in lst)]
        if lst:
            out_npcs[k] = sorted(lst, key=lambda x: (x[0], x[1], x[2]))
        seen, lst = set(), []
        for r in links.values():
            if r[1].lower() != code:
                continue
            if is_kafra(r) and key(r[9]) != k:
                kafra.setdefault(k, set()).add(key(r[9]))
            if not way(r):
                continue
            w = [r[7], r[8], key(r[9])] + ([name(r[5])] if r[3] == 201 else [])
            if tuple(w) not in seen:
                seen.add(tuple(w)); lst.append(w)
        if lst:
            warps[k] = lst

    # ---- routes: Dijkstra over the ways in (a state is the link that brought you, so where you stand), walking cells
    by_map = {}
    for lid, r in links.items():
        if r[3] in (200, 201) and way(r):
            by_map.setdefault(r[1].lower(), []).append(lid)
    # navi_linkdistance by way out: {way out: {the next ways out, on the map it takes you to: cells from where it lands you}}
    walk = {}
    for t in dist.values():
        for row in t.values():
            if isinstance(row, dict):
                walk[row[1]] = {v[2]: v[3] for v in row.values() if isinstance(v, dict) and v.get(1) == "E"}
    usable = {lid for ids in by_map.values() for lid in ids}
    def exits(lid):
        """the ways out of the map link lid lands you on, with the cells walked to each"""
        return ((e, d) for e, d in walk.get(lid, {}).items() if e in usable)

    # starts: where a Kafra teleport lands you in each town or Kafra destination (any way in when none does)
    landing = {}
    for lid, r in links.items():
        landing.setdefault(key(r[9]), {}).setdefault(is_kafra(r), []).append(lid)
    starts = sorted({*towns, *(d for ds in kafra.values() for d in ds)})
    routes = {}
    for s in starts:
        ins = landing.get(s, {}).get(True) or landing.get(s, {}).get(False) or []
        best, prev, heap = {}, {}, [(0, lid) for lid in ins]
        for _, lid in heap:
            best[lid] = 0
        heapq.heapify(heap)
        reached = {}
        while heap:
            d, lid = heapq.heappop(heap)
            if d > best.get(lid, 1e18):
                continue
            k = key(links[lid][9])
            if k not in reached and k != s:
                reached[k] = (d, lid)
            for e, c in exits(lid):
                if d + c < best.get(e, 1e18):
                    best[e] = d + c; prev[e] = lid
                    heapq.heappush(heap, (d + c, e))
        for k, (d, lid) in reached.items():
            if k not in spawns:
                continue
            steps, cur = [], lid
            while cur in prev:  # the start's ways in have none
                r = links[cur]
                steps.append([key(r[1]), r[7], r[8]] + ([name(r[5])] if r[3] == 201 else []))
                cur = prev[cur]
            routes.setdefault(k, []).append([s, d, steps[::-1]])
    routes = {k: sorted(v, key=lambda x: x[1])[:KEEP_ROUTES] for k, v in sorted(routes.items())}

    # names of the maps on the way that the page has no name for
    named = {*spawns, *towns}
    others = {x for ws in warps.values() for w in ws for x in [w[2]]} | {st[0] for rs in routes.values() for r in rs for st in r[2]}
    names = {c: shown.get(own.get(c, c)) or shown.get(c) for c in sorted(others - named)}
    names = {c: n for c, n in names.items() if n}

    j = lambda v: json.dumps(v, separators=(",", ":"), ensure_ascii=False)
    with open(os.path.join(DATA, "navi.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// From the game client's Navigation tables (tools/export_navi.py), by source map code (data/maps.js, data/minimaps.js TOWNS; "
                "other maps by in-game code). Each map's size in cells [width, height]\n")
        f.write("const NAVI_SIZE=" + j(size) + ";\n")
        f.write("// The NPCs on each map: [name, x, y, kind] (k: Kafra Employee, s: a shop, w: sends you to another map, none: the rest)\n")
        f.write("const NAVI_NPCS={" + ",\n".join(f"{j(k)}:{j(v)}" for k, v in out_npcs.items()) + "};\n")
        f.write("// Each map's ways out: [x, y, to map, the NPC's name when an NPC sends you rather than a portal]\n")
        f.write("const NAVI_WARPS={" + ",\n".join(f"{j(k)}:{j(v)}" for k, v in warps.items()) + "};\n")
        f.write("// Where a Kafra Employee on each map teleports you (for a fee the client doesn't give)\n")
        f.write("const NAVI_KAFRA=" + j({k: sorted(v) for k, v in sorted(kafra.items())}) + ";\n")
        f.write(f"// The {KEEP_ROUTES} nearest starts (towns, Kafra destinations) to each spawn map on foot, from where a Kafra teleport lands "
                "you there: [start, cells walked, [[map, x, y, NPC name if an NPC sends you], ...] each way out taken, the last into the map]\n")
        f.write("const NAVI_ROUTES={" + ",\n".join(f"{j(k)}:{j(v)}" for k, v in routes.items()) + "};\n")
        f.write("// Names of the other maps on the way (System/mapInfo_enUS.lub), by in-game code\n")
        f.write("const NAVI_NAMES=" + j(names) + ";\n")
    print(f"{len(size)} maps, {sum(map(len, out_npcs.values()))} NPCs on {len(out_npcs)}, ways out of {len(warps)}, "
          f"Kafra on {len(kafra)}, routes to {len(routes)} of {len(spawns)} spawn maps from {len(starts)} starts")
    print("spawn maps not in the Navigation tables:", " ".join(k for k in spawns if k not in own))
    print("spawn maps with no route:", " ".join(k for k in spawns if k in own and k not in routes))


if __name__ == "__main__":
    main()
