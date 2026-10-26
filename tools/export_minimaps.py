"""Export each spawn map's minimap from your installed Ragnarok Zero client (official Global client, read-only) into img/maps/,
for the Map planner.

    python tools/export_minimaps.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_minimaps.py --client "D:\\Games\\RagnarokZero"

The client's data.grf holds the whole map as the game's map window shows it (data\\texture\\유저인터페이스\\map\\<in-game code>.bmp,
512 x 512, 8-bit paletted, magenta where there's no map). Each map in data/maps.js is looked up under its in-game code, other codes
and source code (and ALIAS), and written full size as img/maps/<source code>.png, with the magenta see-through. Many of these files
are stored with the GRF's mixed DES encoding (the file table's flag 2, or flag 4 for the first 20 blocks only); they're decoded here
the way the client does, after rAthena's src/common/grfio.cpp and des.cpp.

Writes img/maps/*.png (and removes ones no map uses any more) and data/minimaps.js: a checksum of each map's picture, by source map
code. Maps with no minimap in the client are left out and printed. Standard library only.
"""
import json, os, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, js_object
from export_sprites import ROOT, Grf

MAPDIR = "data\\texture\\유저인터페이스\\map\\"
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
    """export_sprites' GRF reader, reading DES-encoded entries too."""
    def read(self, name):
        csize, asize, _, flags, foff = self.ents[name.lower()]
        self.f.seek(foff + 46)
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


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = DesGrf(os.path.join(client, "data.grf"))
    names = js_object("maps", "MAPNAMES")
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
        f.write("// Each spawn map's minimap from the game client (tools/export_minimaps.py): img/maps/<source map code>.png, 512 x 512, and a "
                "checksum of it, by source map code. Maps with no minimap in the client aren't listed\n")
        f.write("const MINIMAPS=" + json.dumps(sums, separators=(",", ":")) + ";\n")
    print(f"{len(sums)} of {len(names)} maps written to img/maps ({total // 1024} KB)")
    print("no minimap in the client:", " ".join(missing))


if __name__ == "__main__":
    main()
