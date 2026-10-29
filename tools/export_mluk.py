"""Add monster LUK to data/mstat.js (the last field of each MSTAT row), for the crit chance formula (your CRIT − monster LUK × 0.2).

    python tools/export_mluk.py            # fetch what isn't cached, then rewrite data/mstat.js
    python tools/export_mluk.py --refresh  # refetch every monster

LUK comes from the community database's monster API (/api/monsters/<id>: luk), the site data/mstat.js came from.
Monsters are fetched one per second and cached in tools/cache/ (gitignored). Delete a cached file to refetch it.
Monsters the database has no record for keep LUK 0.
"""
import json, os, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import site  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "mstat.js")
CACHE = os.path.join(ROOT, "tools", "cache")
UA = "poring-planner data export"
HEAD = "// Monster stats per id (the community database): [DEF, MDEF, ATK min, ATK max, VIT, INT, aggressive 0/1, LUK]"


def monster(mid, refresh):
    """the database's record for a monster id, from cache when present; None when it has none."""
    f = os.path.join(CACHE, f"mob_{mid}.json")
    if os.path.exists(f) and not refresh:
        return json.load(open(f, encoding="utf-8"))
    req = urllib.request.Request(site(f"/api/monsters/{mid}"), headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        d = None
    os.makedirs(CACHE, exist_ok=True)
    json.dump(d, open(f, "w", encoding="utf-8"))
    time.sleep(1)
    return d


def main():
    refresh = "--refresh" in sys.argv
    src = open(PATH, encoding="utf-8").read()
    start = src.index("{", src.index("const MSTAT="))
    mstat = json.loads(src[start:src.index("};", start) + 1])
    missing = []
    for mid, row in mstat.items():
        d = monster(mid, refresh)
        luk = d.get("luk") if d else None
        if luk is None:
            missing.append(mid)
        mstat[mid] = row[:7] + [int(luk or 0)]
    body = ",".join(f'"{k}":{json.dumps(v, separators=(",", ":"))}' for k, v in mstat.items())
    open(PATH, "w", encoding="utf-8").write(f"{HEAD}\nconst MSTAT={{{body}}};\n")
    print(f"{len(mstat)} monsters, {len(missing)} without LUK: {', '.join(missing) or 'none'}")


if __name__ == "__main__":
    main()
