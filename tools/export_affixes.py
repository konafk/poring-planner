"""Export random options (affixes) from the community database's Affixes Simulator into data/affixes.js.

    python tools/export_affixes.py

The page has no API: its whole dataset is in the server-rendered Next.js payload
(self.__next_f.push chunks) as {"data": {pool: [{type, pool, tier, name, value, source}]}, "sources": [...]}, which is
what every tab and gear button of the page shows. Values are "min-max" or a single number. A % is marked "(%)" in the
name, except two lines whose names leave it out (PCT_NAMES).
"""
import json, os, re, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import site  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = "/tools/affixes"  # on the community database (DB_SITE)
UA = "poring-planner data export"
# percentages whose name in the database has no "(%)"
PCT_NAMES = {"Variable Casting reduction", "Received Healing increase"}


def payload():
    html = urllib.request.urlopen(urllib.request.Request(site(PATH), headers={"User-Agent": UA}), timeout=60).read().decode("utf-8")
    s = "".join(json.loads('"' + c + '"') for c in re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)\s*</script>', html, re.S))
    i = s.index('{"data":{')
    return json.JSONDecoder().raw_decode(s[i:])[0]


def main():
    p = payload()
    rows = []
    for pool, items in p["data"].items():
        for r in items:
            lo, _, hi = r["value"].partition("-")
            name = r["name"]
            rows.append([pool, r["type"], int(r["tier"].split()[-1]), name, int(lo), int(hi or lo), 1 if "(%)" in name or name in PCT_NAMES else 0])
    pools = {s["id"]: s["label"] for s in p["sources"]}
    head = ("// Random options (affixes) per pool, gear type and option slot, from the community database's Affixes Simulator.\n"
            "// Exported by tools/export_affixes.py. pools: pool id -> name. rows: [pool, gear type, option slot, name, min, max, pct (1 = a %)].\n"
            "// Gear types: Melee / Ranged / Magic Series (weapons), Physical / Magic Series (Activation System weapons), Forging Weapons,\n"
            "// Armor, Garment, Shoes. It lists no pool for shields, headgear or accessories.\n")
    body = "const AFFIXES={pools:" + json.dumps(pools, ensure_ascii=False, separators=(",", ":")) + ",rows:[\n" + \
        ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "]};\n"
    with open(os.path.join(ROOT, "data", "affixes.js"), "w", encoding="utf-8") as f:
        f.write(head + body)
    print(f"wrote {len(rows)} affixes from {len(pools)} pools")


if __name__ == "__main__":
    main()
