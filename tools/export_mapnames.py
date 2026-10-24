"""Set the map names in data/maps.js to the English names your installed Ragnarok Zero client shows in game (read-only).

    python tools/export_mapnames.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_mapnames.py --client "D:\\Games\\RagnarokZero"

The names come from System\\mapInfo_enUS.lub (compiled Lua 5.1: mapTbl_string["<in-game code>.rsw"].displayName), e.g.
"Sphinx B5F", "Sewer Tunnel 1F", "Gypsy Village". Maps the client doesn't have yet (regions not out) keep their
ragnarokzero.net names and are printed. Codes are left alone, so saves and typed codes keep working.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, js_object, lua_data


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    tbl = lua_data(open(os.path.join(client, "System", "mapInfo_enUS.lub"), "rb").read())["mapTbl_string"]
    shown = {str(k).lower().removesuffix(".rsw"): v.get("displayName") for k, v in tbl.items() if isinstance(v, dict)}
    names = js_object("maps", "MAPNAMES")
    changed, kept = [], []
    for key, row in names.items():
        name = next((shown[c.lower()] for c in [row[0], *row[2:], key] if shown.get(c.lower())), None)
        if not name:
            kept.append(key)
        elif name.strip() != row[1]:
            changed.append(f"{key}: {row[1]} -> {name.strip()}")
            row[1] = name.strip()
    with open(os.path.join(DATA, "maps.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// In-game map code and name per spawn map (source map code -> [in-game code, name, other codes]): codes from ragnarokzero.net/database/maps, "
                "names as the official Global client shows them (System/mapInfo_enUS.lub, written by tools/export_mapnames.py); "
                "maps the client doesn't have yet keep ragnarokzero.net's names\n")
        f.write("const MAPNAMES={" + ",\n".join(f"{json.dumps(k)}:{json.dumps(v, ensure_ascii=False, separators=(',', ':'))}" for k, v in names.items()) + "};\n")
    print(f"{len(names) - len(kept)} of {len(names)} maps named from the client, {len(changed)} renamed")
    print("\n".join(changed))
    print("kept (not in the client):", " ".join(kept))


if __name__ == "__main__":
    main()
