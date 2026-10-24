"""Cross-check data/spawn.js against ragnarokzero.net/database/maps.

Lists, per map, monsters ragnarokzero.net has that data/spawn.js doesn't, and spawn counts that differ.
Each map is looked up under every code in data/maps.js (source map code, in-game code and other codes).
Run: python tools/check_maps.py
By default it leaves out plants and mushrooms (ids 1078-1085), event and elite variants (ids 2600+) and monsters
with no spawn count; --all lists them too. Monsters the database marks UPCOMING also show up as missing. On maps the client
doesn't list yet our counts are null (not known), so only missing monsters show there.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def js_object(name):
    src = (DATA / f"{name}.js").read_text(encoding="utf-8")
    return json.loads(src[src.index("{"):src.rindex("}") + 1])


def site_maps():
    req = urllib.request.Request("https://ragnarokzero.net/database/maps", headers={"User-Agent": "Mozilla/5.0"})
    page = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")
    # the map list is in the page's Next.js payload: self.__next_f.push([1,"..."])
    payload = "".join(json.loads('"' + c + '"') for c in re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', page, flags=re.S))
    maps, _ = json.JSONDecoder().raw_decode(payload, payload.index('{"maps":[') + 8)
    return {m["id"]: m["monsters"] for m in maps}


def main():
    show_all = "--all" in sys.argv
    sys.stdout.reconfigure(encoding="utf-8")  # map names and ≈ on a Windows console
    spawn, names, site = js_object("spawn"), js_object("maps"), site_maps()
    ours = {}
    for mob_id, rows in spawn.items():
        for mp, n, *_ in rows:  # [map, count, PvP count]
            ours.setdefault(mp, {})[int(mob_id)] = n
    issues = 0
    for mp in sorted(ours):
        codes = [mp, *names.get(mp, [mp])[:1], *names.get(mp, [])[2:]]
        theirs = {}
        for code in codes:
            for m in site.get(code, []):
                theirs.setdefault(m["id"], m)
        if not theirs:
            print(f"{mp}: not on ragnarokzero.net under {', '.join(codes)}")
            issues += 1
            continue
        lines = []
        for mob_id, m in sorted(theirs.items()):
            n = m.get("amount")
            if not show_all and (1078 <= mob_id <= 1085 or mob_id >= 2600 or not n):
                continue
            if mob_id not in ours[mp]:
                lines.append(f"  missing {m['name']} #{mob_id} Lv {m['level']} ≈{n if n else '?'}")
            elif n and ours[mp][mob_id] is not None and n != ours[mp][mob_id]:
                lines.append(f"  {m['name']} #{mob_id}: ours ≈{ours[mp][mob_id]}, theirs ≈{n}")
        if lines:
            label = names.get(mp, [mp, ""])
            print(f"{mp} ({label[0]} · {label[1]})")
            print("\n".join(lines))
            issues += len(lines)
    print(f"{issues} differences")


if __name__ == "__main__":
    main()
