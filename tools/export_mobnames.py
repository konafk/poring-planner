"""Set the monster names in data/mobs.js (and the drop lists in data/iteminfo.js) to the English names your installed Ragnarok
Zero client shows in game (read-only).

    python tools/export_mobnames.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_mobnames.py --client "D:\\Games\\RagnarokZero"

The client's navigation table (data.grf: navi_mob.lub) gives each spawned monster a string code ("\\x1cJIcB\\x1c" for Coco), and
data\\i18n\\sc\\*.csv give each code its name per language as base64 (code, Korean, English, ...). A name two of our monsters would
share (the five Goblins, the two Petites, Whisper (1185), Weak Skeleton, which the client calls "Giearth") keeps ours, so rows
stay apart. Monsters the client doesn't spawn yet (regions not out, most MVPs) keep their community database names and are printed.
"""
import base64, os, re, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, NAVI, grf_file, lua_data


def english(grf):
    """String code -> English name, from every data\\i18n\\sc\\*.csv in the GRF."""
    out = {}
    with open(grf, "rb") as f:
        h = f.read(46)
        off, count, ver = struct.unpack("<QII", h[30:46])
        f.seek(off + 46)
        f.read(4)
        comp, size = struct.unpack("<II", f.read(8))
        table, p, files = zlib.decompress(f.read(comp)), 0, []
        while p < len(table):
            e = table.index(b"\0", p); n = table[p:e].decode("cp949", "replace"); p = e + 1
            csize, asize, rsize, flags, foff = struct.unpack("<iiiBQ", table[p:p + 21]); p += 21
            if flags == 1 and re.fullmatch(r"data\\i18n\\sc\\\w+\.csv", n, re.I):
                files.append((csize, asize, foff))
        for csize, asize, foff in files:
            f.seek(foff + 46)
            for line in zlib.decompress(f.read(asize)[:csize]).decode("utf-8").splitlines():
                c = line.split(",")
                if len(c) > 2 and c[2]:
                    out.setdefault(c[0], base64.b64decode(c[2]).decode("utf-8").strip())
    return out


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = os.path.join(client, "data.grf")
    # entries: [map, uid, 300 mob / 301 boss, count << 16 | monster id, name code, sprite, level, element/size/race]
    code = {}
    for r in lua_data(grf_file(grf, NAVI))["Navi_Mob"].values():
        code.setdefault(r[4] & 0xFFFF, r[5].strip("\x1c"))
    en = english(grf)
    path = os.path.join(DATA, "mobs.js")
    src = open(path, encoding="utf-8").read()
    start = src.index("const MOBS=")
    mobs = {int(i): n for i, n in re.findall(r'\[(\d+),"([^"]*)"', src[start:])}
    shown = {i: en[code[i]] for i in mobs if code.get(i) in en}
    taken = {}
    for i, n in shown.items():
        taken.setdefault(n, []).append(i)
    for i, n in mobs.items():
        if i not in shown:
            taken.setdefault(n, []).append(i)
    names, changed, shared = {}, [], []
    for i, n in shown.items():
        if len(taken[n]) > 1:
            shared.append(f"{mobs[i]} ({n})")
        elif n != mobs[i]:
            names[i] = n
            changed.append(f"{i}: {mobs[i]} -> {n}")
    rename = lambda m: f'[{m[1]},"{names.get(int(m[1]), m[2])}"'
    src = src[:start] + re.sub(r'\[(\d+),"([^"]*)"', rename, src[start:])
    open(path, "w", encoding="utf-8", newline="\n").write(src)
    # the drop lists: [monster id, name, level, "mvp" | "mini" | "normal", drop %]
    path = os.path.join(DATA, "iteminfo.js")
    info = open(path, encoding="utf-8").read()
    info = re.sub(r'\[(\d+),"([^"]*)"(?=,\d+,"(?:mvp|mini|normal)")', rename, info)
    open(path, "w", encoding="utf-8", newline="\n").write(info)
    print(f"{len(shown)} of {len(mobs)} monsters named by the client, {len(changed)} renamed")
    print("\n".join(changed))
    print("kept, the client name is shared:", ", ".join(shared))
    print("kept (not in the client):", ", ".join(n for i, n in mobs.items() if i not in shown))


if __name__ == "__main__":
    main()
