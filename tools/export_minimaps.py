"""Export each spawn map's and town's minimap from your installed Ragnarok Zero client (official Global client, read-only) into
img/maps/, and the client's world maps with where each map is on them, for the Map planner and the Maps tab.

    python tools/export_minimaps.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_minimaps.py --client "D:\\Games\\RagnarokZero"

The client's data.grf holds the whole map as the game's map window shows it (data\\texture\\유저인터페이스\\map\\<in-game code>.bmp,
512 x 512, 8-bit paletted, magenta where there's no map). Each map in data/maps.js is looked up under its in-game code, other codes
and source code (and ALIAS), and written full size as img/maps/<source code>.png, with the magenta see-through. Many of these files
are stored with the GRF's mixed DES encoding (the file table's flag 2, or flag 4 for the first 20 blocks only); they're decoded here
the way the client does, after rAthena's src/common/grfio.cpp and des.cpp.

The world maps are the worlds of the client's world view (worldviewdata_list.lub: Midgard, worldmap_z.jpg, 1280 x 1024; Nordfeld,
worldmap_Nordfeld.png, 1602 x 1216, stored in the GRF as it is), copied as they are. worldviewdata_table.lub gives each map's box on
its world, in the picture's pixels; maps whose region isn't out yet have none.

The towns are the maps of the client's town guide (System\\Towninfo_enUS.lub: Prontera, Geffen, Nordfeld, ...) that no monster spawns
on and that are on a world map, named as the client's map window names them (System\\mapInfo_enUS.lub); a town's copies under
another code with the same name (prt_mk_g1 for prt_mk) are left out.

Writes img/maps/*.png (and removes ones no map uses any more), img/world-<world>.jpg / .png and data/minimaps.js: a checksum of each
map's picture, by source map code, the towns' names, and per world its file, checksum, size and each map's box [x1, y1, x2, y2]. Maps with no
minimap or no box in the client are left out and printed. Standard library only.
"""
import json, os, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, js_object, lua_data
from export_sprites import ROOT, Grf

UI = "data\\texture\\유저인터페이스\\"
MAPDIR = UI + "map\\"
WORLDVIEW = "data\\luafiles514\\lua files\\worldviewdata\\"
OUT = os.path.join(ROOT, "img", "maps")
# maps whose minimap goes by a name data/maps.js doesn't list
ALIAS = {"bea_d02": "beach_dun2", "bea_d03": "beach_dun3"}

# ---- the GRF's DES variant (one round), from rAthena's des.cpp
MASK = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
IP_T = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
        57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
FP_T = [40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
        36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25]
TP_T = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]
S_T = [bytes.fromhex(s) for s in (
    "ef0341fdd8741e4726effb22b3d8841e39aca76062c1cdba5c969059053b7a8540fd1ec8e78a8b21da43649f2d14b172f55bc8b69c3776ec39a0a305526e0fd9",
    "a7dd0d789e0be3956036364ff9605aa31124d287c85275ecbbc14cba24fe8f19da1366af49d090068c6afb91378d0d78bf4911f423e5ce3b55bca257e82274ce",
    "2ceac1bf4a241fc27947a27cb6d9681580565d0133fdf4aede30079be5839b6849b42e831fc2b57ca219d8e57c2f83daf76b90fec4015a9761a63d400b58e63d",
    "4dd1b20f28bde478f64a0f938b17d1a43aecc93593567ecb5520a0fe6c89176217624bb1b4ded187c9143c4a7ea8e27da09ff65c6a098df00fe35325953628cb")]
SUBST = {0x00: 0x2B, 0x2B: 0x00, 0x6C: 0x80, 0x01: 0x68, 0x68: 0x01, 0x48: 0x77, 0x60: 0xFF, 0x77: 0x48, 0xB9: 0xC0, 0xC0: 0xB9,
         0xFE: 0xEB, 0xEB: 0xFE, 0x80: 0x6C, 0xFF: 0x60}


def permute(b, table, src_off=0, dst_off=0):
    out = bytearray(8)
    for i, t in enumerate(table):
        j = t - 1
        if b[(j >> 3) + src_off] & MASK[j & 7]:
            out[(i >> 3) + dst_off] |= MASK[i & 7]
    return out


def des_block(b):
    b = permute(b, IP_T)
    e = [((b[7] << 5) | (b[4] >> 3)) & 0x3f, ((b[4] << 1) | (b[5] >> 7)) & 0x3f, ((b[4] << 5) | (b[5] >> 3)) & 0x3f,
         ((b[5] << 1) | (b[6] >> 7)) & 0x3f, ((b[5] << 5) | (b[6] >> 3)) & 0x3f, ((b[6] << 1) | (b[7] >> 7)) & 0x3f,
         ((b[6] << 5) | (b[7] >> 3)) & 0x3f, ((b[7] << 1) | (b[4] >> 7)) & 0x3f]
    s = bytes((S_T[i][e[i * 2]] & 0xf0) | (S_T[i][e[i * 2 + 1]] & 0x0f) for i in range(4)) + bytes(4)
    t = permute(s, TP_T, 0, 4)
    for i in range(4):
        b[i] ^= t[i + 4]
    return permute(b, FP_T)


def grf_decode(buf, flags, csize):
    """rAthena's grf_decode: flag 2 (mixed) DES-decodes the first 20 blocks, then every cycle-th block, and shuffles every 7th of
    the blocks in between; flag 4 DES-decodes only the first 20 blocks."""
    if not flags & 6:
        return buf
    buf, n = bytearray(buf), len(buf) // 8
    if flags & 2:
        digits = len(str(csize))
        cycle = 1 if digits < 3 else digits + 1 if digits < 5 else digits + 9 if digits < 7 else digits + 15
    j = -1
    for i in range(n):
        b = buf[i * 8:i * 8 + 8]
        if i < 20:
            buf[i * 8:i * 8 + 8] = des_block(b)
        elif not flags & 2:
            break
        elif i % cycle == 0:
            buf[i * 8:i * 8 + 8] = des_block(b)
        else:
            j += 1
            if j % 7 == 0 and j:
                buf[i * 8:i * 8 + 8] = bytes([b[3], b[4], b[6], b[0], b[1], b[2], b[5], SUBST.get(b[7], b[7])])
    return bytes(buf)


class DesGrf(Grf):
    """export_sprites' GRF reader, reading DES-encoded entries too, and entries stored as they are (flag 0, same size packed and
    unpacked: Nordfeld's world map)."""
    def read(self, name):
        csize, asize, rsize, flags, foff = self.ents[name.lower()]
        self.f.seek(foff + 46)
        if not flags & 1 and csize == rsize:
            return self.f.read(rsize)
        return zlib.decompress(grf_decode(self.f.read(asize), flags, csize)[:csize])


def bmp_rgba(b):
    """A BMP's pixels as (w, h, rows of (r, g, b, a)), magenta (the client's see-through colour) at alpha 0."""
    off, = struct.unpack("<I", b[10:14]); hsize, w, h = struct.unpack("<Iii", b[14:26]); bpp, = struct.unpack("<H", b[28:30])
    pal = b[14 + hsize:off]
    stride = (w * bpp // 8 + 3) // 4 * 4
    rows = []
    for y in range(abs(h)):
        r = b[off + (abs(h) - 1 - y if h > 0 else y) * stride:][:stride]
        if bpp == 8:
            px = [(pal[i * 4 + 2], pal[i * 4 + 1], pal[i * 4]) for i in r[:w]]
        elif bpp in (24, 32):
            n = bpp // 8
            px = [(r[x * n + 2], r[x * n + 1], r[x * n]) for x in range(w)]
        else:
            raise ValueError(f"{bpp}-bit BMP")
        rows.append([(c[0], c[1], c[2], 0 if c[0] >= 0xfe and c[1] <= 3 and c[2] >= 0xfe else 255) for c in px])
    return w, abs(h), rows


def png(w, h, rows):
    """A paletted PNG when the picture has 256 colours or fewer (the minimaps do), else RGBA."""
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    cols = {}
    for r in rows:
        for c in r:
            cols.setdefault((0, 0, 0, 0) if c[3] == 0 else c, len(cols))
            if len(cols) > 256:
                break
    if len(cols) <= 256:
        order = sorted(cols, key=lambda c: c[3])  # see-through first, so tRNS is one byte
        idx = {c: i for i, c in enumerate(order)}
        raw = b"".join(b"\0" + bytes(idx[(0, 0, 0, 0) if c[3] == 0 else c] for c in r) for r in rows)
        body = chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0)) + chunk(b"PLTE", b"".join(bytes(c[:3]) for c in order))
        if order[0][3] == 0:
            body += chunk(b"tRNS", b"\0")
    else:
        raw = b"".join(b"\0" + bytes(v for c in r for v in c) for r in rows)
        body = chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    return b"\x89PNG\r\n\x1a\n" + body + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def jpeg_size(b):
    """(width, height) from a JPEG's frame header."""
    p = 2
    while p < len(b):
        marker, n = b[p + 1], struct.unpack(">H", b[p + 2:p + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", b[p + 5:p + 9])
            return w, h
        p += 2 + n
    raise ValueError("no JPEG frame header")


def worlds(grf, names):
    """Each world in the world view (Midgard, Nordfeld): its picture to img/world-<name>.<ext>, and each map's box on it, by
    source map code (a map on two worlds goes on the first)."""
    table = lua_data(grf.read(WORLDVIEW + "worldviewdata_table.lub"))
    out, placed = [], set()
    for _, wv in sorted(lua_data(grf.read(WORLDVIEW + "worldviewdata_list.lub"))["World_List"].items()):
        name, maps, picture = wv[1], wv[2], wv[4]  # [name, map table, dungeon table, picture]
        pic = grf.read(UI + picture)
        file = f"img/world-{name.lower()}{os.path.splitext(picture)[1].lower()}"
        with open(os.path.join(ROOT, file), "wb") as f:
            f.write(pic)
        at = {}
        for r in table[maps].values():  # [id, "<code>.rsw", x1, y1, x2, y2, ...]
            at.setdefault(r[2].lower().removesuffix(".rsw"), [r[3], r[4], r[5], r[6]])
        codes = lambda k: [c.lower() for c in [names[k][0], *names[k][2:], k, ALIAS.get(k)] if c]
        boxes = {k: next(at[c] for c in codes(k) if c in at) for k in names if k not in placed and any(c in at for c in codes(k))}
        placed |= boxes.keys()
        w, h = struct.unpack(">II", pic[16:24]) if pic[:8] == b"\x89PNG\r\n\x1a\n" else jpeg_size(pic)
        out.append({"name": name, "file": file, "v": f"{zlib.crc32(pic) & 0xFFFFFFFF:08x}", "w": w, "h": h, "maps": boxes})
    for f in os.listdir(os.path.join(ROOT, "img")):  # pictures of worlds the client no longer has
        if f.startswith("world") and f"img/{f}" not in {w["file"] for w in out}:
            os.remove(os.path.join(ROOT, "img", f))
    return out


def towns(client, grf, names):
    """The town guide's maps no monster spawns on, with a minimap and a world map box: {code: [code, name]}, in the guide's order."""
    guide = lua_data(open(os.path.join(client, "System", "Towninfo_enUS.lub"), "rb").read())["mapNPCInfoTable_string"]
    shown = {str(k).lower().removesuffix(".rsw"): v.get("displayName", "").strip()
             for k, v in lua_data(open(os.path.join(client, "System", "mapInfo_enUS.lub"), "rb").read())["mapTbl_string"].items()
             if isinstance(v, dict)}
    spawn = {c.lower() for k, r in names.items() for c in [r[0], *r[2:], k, ALIAS.get(k)] if c}
    boxed = {r[2].lower().removesuffix(".rsw") for t in lua_data(grf.read(WORLDVIEW + "worldviewdata_table.lub")).values()
             for r in t.values() if isinstance(r, dict) and isinstance(r.get(2), str)}
    out, seen = {}, set()
    for code in (k.lower() for k in guide if isinstance(k, str)):
        name = shown.get(code) or code
        if code in spawn or code not in boxed or name in seen or not grf.has(MAPDIR + code + ".bmp"):
            continue
        seen.add(name)
        out[code] = [code, name]
    return out


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = DesGrf(os.path.join(client, "data.grf"))
    spawns = js_object("maps", "MAPNAMES")
    town = towns(client, grf, spawns)
    names = {**spawns, **town}
    wms = worlds(grf, names)
    os.makedirs(OUT, exist_ok=True)
    sums, missing, total = {}, [], 0
    for key, row in names.items():
        code = next((c for c in [row[0], *row[2:], key, ALIAS.get(key)] if c and grf.has(MAPDIR + c + ".bmp")), None)
        if not code:
            missing.append(key)
            continue
        data = png(*bmp_rgba(grf.read(MAPDIR + code + ".bmp")))
        with open(os.path.join(OUT, key + ".png"), "wb") as f:
            f.write(data)
        sums[key] = f"{zlib.crc32(data) & 0xFFFFFFFF:08x}"  # the page asks for the picture with this, so a new one isn't read from an old cache
        total += len(data)
    for f in os.listdir(OUT):
        if f.endswith(".png") and f[:-4] not in sums:
            os.remove(os.path.join(OUT, f))
    with open(os.path.join(DATA, "minimaps.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Each spawn map's and town's minimap from the game client (tools/export_minimaps.py): img/maps/<source map code>.png, 512 x 512, "
                "and a checksum of it, by source map code. Maps with no minimap in the client aren't listed\n")
        f.write("const MINIMAPS=" + json.dumps(sums, separators=(",", ":")) + ";\n")
        f.write("// The towns (the client's town guide's maps no monster spawns on, on a world map): their names as the client shows them, by map code\n")
        f.write("const TOWNS=" + json.dumps({k: v[1] for k, v in town.items()}, separators=(",", ":"), ensure_ascii=False) + ";\n")
        f.write("// The client's world maps (its world view's worlds, Midgard first): each one's picture, a checksum of it (v), its size, and each "
                "map's box on it [x1,y1,x2,y2] in its pixels, by source map code. Maps whose region isn't out yet have no box\n")
        f.write("const WORLDMAPS=" + json.dumps(wms, separators=(",", ":")) + ";\n")
    print(f"{len(sums)} of {len(names)} maps written to img/maps ({total // 1024} KB), towns:", " ".join(town))
    print("no minimap in the client:", " ".join(missing))
    for wm in wms:
        print(f"world map {wm['name']} ({wm['w']} x {wm['h']}) written to {wm['file']}, {len(wm['maps'])} of {len(names)} maps on it")
    print("on no world map:", " ".join(k for k in names if not any(k in wm["maps"] for wm in wms)))


if __name__ == "__main__":
    main()
