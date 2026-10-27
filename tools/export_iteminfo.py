"""Export each card's and piece of gear's in-game description and where to get it into data/iteminfo.js, for the Equipment and
Cards tabs.

    python tools/export_iteminfo.py            # fetch what isn't cached, then write data/iteminfo.js
    python tools/export_iteminfo.py --refresh  # refetch the database's item records and monster list (prontera pages stay cached)

Items are the ones in data/equipment.js and data/cards.js. For each:
- t: the item description as the game shows it, from its roz.prontera.info page (tools/export_prontera.py's cache). The bonus lines
  there leave out effects they have no type for (Eddga Card's "Grants continuous [Endure] effect", Baphomet Card's splash), so the
  tabs show this text too.
- d: the monsters that drop it, from the community database's item API (/api/items/<id>: dropped_by, cached like tools/export_prices.py's),
  each tagged MVP, mini boss or normal from its monster list (/api/monsters: is_mvp, is_mini_boss).
- q: the quests that give it, from its roz.prontera.info page.
Items with none of these are left out.
"""
import json, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import item, ROOT, CACHE, site, UA  # noqa: E402
import export_prontera  # noqa: E402


def rows(name, const):
    src = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    start = src.index("[", src.index(f"const {const}="))
    return [x for x in json.JSONDecoder().raw_decode(src, start)[0] if "id" in x]  # a few novice items have no id


def monsters(refresh=False):
    """monster id -> [MVP, mini boss], every monster the database lists (200 a page). Cached as JSON."""
    f = os.path.join(CACHE, "db_monsters.json")
    if os.path.exists(f) and not refresh:
        return {int(k): v for k, v in json.load(open(f, encoding="utf-8")).items()}
    out, off = {}, 0
    while True:
        req = urllib.request.Request(site(f"/api/monsters?limit=200&offset={off}"), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read().decode("utf-8"))
        for m in d["items"]:
            out[m["monster_id"]] = [bool(m.get("is_mvp")), bool(m.get("is_mini_boss"))]
        off += len(d["items"])
        if not d["items"] or off >= d["total"]:
            break
        time.sleep(1)
    os.makedirs(CACHE, exist_ok=True)
    json.dump(out, open(f, "w", encoding="utf-8"))
    return out


# champion monsters the database has no English name for, only their code ("C5_ALARM"): C1 to C5 are the Swift, Solid, Ringleader,
# Furious and Elusive versions of a monster (rAthena's mob_db), so "C5_ALARM" reads "Elusive Alarm"
CHAMPION = {"1": "Swift", "2": "Solid", "3": "Ringleader", "4": "Furious", "5": "Elusive"}
# data/mobs.js names (the client's, from tools/export_mobnames.py) win over the database's ("CocO" is Coco in game)
_src = open(os.path.join(ROOT, "data", "mobs.js"), encoding="utf-8").read()
MOB_NAMES = {int(i): n for i, n in re.findall(r'\[(\d+),"([^"]*)"', _src[_src.index("const MOBS="):])}


def mob_name(m):
    if m["monster_id"] in MOB_NAMES:
        return MOB_NAMES[m["monster_id"]]
    n = m.get("name_en") or m.get("aegis_name") or ""
    c = re.fullmatch(r"C([1-5])_([A-Z0-9_]+)", n)
    return f"{CHAMPION[c.group(1)]} {c.group(2).replace('_', ' ').title()}" if c else n


# descriptions roz.prontera.info has short or missing, as the Global client's System/iteminfo_enUS.lub gives them (lines joined
# with spaces, like prontera's); used in place of prontera's text
DESC = {27273: "While using a blunt weapon, increases CRIT by 1 per weapon refine, and at +10 increases Critical Damage by 10%. While using "
               "a knuckle, reduces After Attack Delay by 1% per refine, and at +10 increases ASPD by 2. When equipped together with High "
               "Orc Card, grants ASPD +2 and ATK +25.",  # Orc General Card
        4240: "DEF +2 and MDEF +3 when refine level is 5 or lower.",  # Arclouse Card
        4288: "INT +2. If refine level ≥ 9, MSP +150.",  # Carat Card
        4200: "MDEF +7 when refine level is 5 or lower.",  # Megalith Card
        4226: "DEF +2. When refine level is 9 or higher, MDEF +5.",  # Sting Card
        27275: "Triggers Meteor Storm Lv.1 as an auto spell at a certain probability when performing physical attacks. When hit by "
               "close-range physical attacks, has a 10% chance to inflict Stun. When Meteor Storm hits an enemy, inflicts Blind, "
               "Confusion, or Silence depending on weapon refine level."}  # Bloody Knight Card


def desc_fix(i, t):
    return DESC.get(i, t)


def page(slug):
    d = export_prontera.nuxt(export_prontera.fetch(f"/items/{slug}"))
    return d[next(k for k in d if k.startswith("item-") and k.endswith("-en"))]


def main():
    refresh = "--refresh" in sys.argv
    kinds, out = monsters(refresh), {}
    for x in rows("equipment.js", "EQUIP") + rows("cards.js", "CARDS"):
        p, o = page(x["slug"]), {}
        t = desc_fix(x["id"], re.sub(r"\s+", " ", p["item"].get("description") or "").strip())
        if t:
            o["t"] = t
        drops = (item(x["id"], refresh) or {}).get("dropped_by") or []
        if isinstance(drops, str):
            drops = json.loads(drops)
        d = []
        for m in drops:
            mvp, mini = kinds.get(m["monster_id"], [False, False])
            d.append([m["monster_id"], mob_name(m), m.get("level") or 0, "mvp" if mvp else "mini" if mini else "normal",
                      m.get("rate_percent")])
        if d:
            o["d"] = sorted(d, key=lambda r: (-(r[4] or 0), r[2], r[1]))  # best rate first
        q = sorted({z["name"] for z in p.get("quests") or [] if z.get("name")})
        if q:
            o["q"] = q
        if o:
            out[x["id"]] = o
    with open(os.path.join(ROOT, "data", "iteminfo.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Gear and cards: item id -> {t: in-game description (roz.prontera.info), d: monsters that drop it [[monster id, name, level,\n"
                "// \"mvp\" | \"mini\" (mini boss) | \"normal\", drop %]] best rate first (the community database), q: quests that give it (roz.prontera.info)};\n"
                "// written by tools/export_iteminfo.py\n")
        f.write("const ITEM_INFO={" + ",\n".join(f"{k}:{json.dumps(v, ensure_ascii=False, separators=(',', ':'))}" for k, v in out.items()) + "};\n")
    n = lambda k: sum(k in v for v in out.values())
    print(f"{len(out)} items: {n('t')} with a description, {n('d')} dropped by monsters, {n('q')} from quests")


if __name__ == "__main__":
    main()
