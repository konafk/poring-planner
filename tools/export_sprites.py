"""Export each job's look for the Character tab's equipment window into img/job-sprites.png and data/sprites.js, from your installed
Ragnarok Zero client (official Global client, read-only).

    python tools/export_sprites.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_sprites.py --client "D:\\Games\\RagnarokZero"

The client's data.grf holds every job's body (data\\sprite\\인간족\\몸통\\<남|여>\\<job>_<남|여>.spr/.act) and every hair style
(data\\sprite\\인간족\\머리통\\<남|여>\\<n>_<남|여>.spr/.act). Each is drawn as the game draws it standing and facing you (action 0,
frame 0: the ACT's layers placed around the feet, with the SPR's own palette, so the default hair colour). The page puts the head on
the body at the body's anchor point, the way the client does, so any hair style goes on any job without a picture for each pair.
Hair dyes and clothes dyes (palette files) aren't exported.

Writes img/job-sprites.png (each image cropped to what it draws, packed in rows) and data/sprites.js: per job and gender the body's
place on the sheet, where it draws from the feet and its head anchor; per gender and hair style the head's place and where it draws
from the anchor. Standard library only.
"""
import json, os, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# the page's job names, and the body sprite name the client uses for each (Bard is male only, Dancer female only)
JOBS = {"Novice": "초보자", "Swordsman": "검사", "Mage": "마법사", "Archer": "궁수", "Acolyte": "성직자", "Merchant": "상인", "Thief": "도둑",
        "Knight": "기사", "Crusader": "크루세이더", "Wizard": "위저드", "Sage": "세이지", "Hunter": "헌터", "Bard": "바드", "Dancer": "무희",
        "Priest": "프리스트", "Monk": "몽크", "Blacksmith": "제철공", "Alchemist": "연금술사", "Assassin": "어세신", "Rogue": "로그"}
SEX = {"m": "남", "f": "여"}
ONE_SEX = {"Bard": "m", "Dancer": "f"}
SHEET_W = 512


class Grf:
    """Files from a GRF 0x300 archive (header 46 bytes, zlib file table, zlib entries); the table is read once."""
    def __init__(self, path):
        self.f = open(path, "rb")
        h = self.f.read(46)
        if not h.startswith((b"Event Horizon", b"Master of Magic")):
            raise SystemExit(f"{path}: not a GRF file")
        off, _, ver = struct.unpack("<QII", h[30:46])
        if ver != 0x300:
            raise SystemExit(f"{path}: GRF version {ver:#x}, only 0x300 is handled")
        self.f.seek(off + 46); self.f.read(4)  # 0x300 file tables start with 4 extra bytes
        comp, _ = struct.unpack("<II", self.f.read(8))
        table, p, self.ents = zlib.decompress(self.f.read(comp)), 0, {}
        while p < len(table):
            e = table.index(b"\0", p); n = table[p:e].decode("cp949", "replace"); p = e + 1
            self.ents[n.lower()] = struct.unpack("<iiiBQ", table[p:p + 21]); p += 21

    def has(self, name):
        return name.lower() in self.ents

    def read(self, name):
        csize, asize, _, flags, foff = self.ents[name.lower()]
        if flags & 6:
            raise SystemExit(f"{name} is encrypted in the GRF")
        self.f.seek(foff + 46)
        return zlib.decompress(self.f.read(asize)[:csize])


def spr_read(b):
    """The images of an SPR file as (w, h, RGBA bytes): palette images first, then RGBA ones, as ACT layers number them."""
    if b[:2] != b"SP":
        raise ValueError("not an SPR file")
    minor, major = b[2], b[3]; ver = major * 0x100 + minor
    npal = struct.unpack_from("<H", b, 4)[0]; nrgba = struct.unpack_from("<H", b, 6)[0] if ver >= 0x200 else 0
    p = 8 if ver >= 0x200 else 6
    pal = b[-1024:]; imgs = []
    for _ in range(npal):
        w, h = struct.unpack_from("<HH", b, p); p += 4
        if ver >= 0x201:  # runs of index 0 are stored as 0, count
            n = struct.unpack_from("<H", b, p)[0]; p += 2; src, idx, q = b[p:p + n], bytearray(), 0; p += n
            while q < len(src):
                c = src[q]; q += 1
                if c == 0:
                    idx += bytes(src[q]); q += 1
                else:
                    idx.append(c)
        else:
            idx = b[p:p + w * h]; p += w * h
        px = bytearray(w * h * 4)
        for i, c in enumerate(idx[:w * h]):
            if c:
                px[i * 4:i * 4 + 3] = pal[c * 4:c * 4 + 3]; px[i * 4 + 3] = 255
        imgs.append((w, h, px))
    for _ in range(nrgba):  # ABGR, bottom row first
        w, h = struct.unpack_from("<HH", b, p); p += 4; px = bytearray(w * h * 4)
        for y in range(h):
            for x in range(w):
                a, bl, g, r = b[p + ((h - 1 - y) * w + x) * 4:p + ((h - 1 - y) * w + x) * 4 + 4]
                px[(y * w + x) * 4:(y * w + x) * 4 + 4] = bytes([r, g, bl, a])
        p += w * h * 4; imgs.append((w, h, px))
    return imgs, npal


def act_frame(b, action=0, frame=0):
    """The layers of one frame of an ACT file ((x, y, sprite, mirror, rgba, sx, sy, type) each) and its first anchor point."""
    if b[:2] != b"AC":
        raise ValueError("not an ACT file")
    ver = struct.unpack_from("<H", b, 2)[0]; nact = struct.unpack_from("<H", b, 4)[0]; p = 16
    for a in range(nact):
        nfr = struct.unpack_from("<I", b, p)[0]; p += 4
        for fr in range(nfr):
            p += 32; nl = struct.unpack_from("<I", b, p)[0]; p += 4; layers = []
            for _ in range(nl):
                x, y, spr, flags = struct.unpack_from("<iiiI", b, p); p += 16
                rgba, sx, sy, typ = (255, 255, 255, 255), 1.0, 1.0, 0
                if ver >= 0x200:
                    rgba = tuple(b[p:p + 4]); p += 4
                    if ver >= 0x204:
                        sx, sy = struct.unpack_from("<ff", b, p); p += 8
                    else:
                        sx = sy = struct.unpack_from("<f", b, p)[0]; p += 4
                    p += 4  # rotation
                    typ = struct.unpack_from("<i", b, p)[0]; p += 4
                    if ver >= 0x205:
                        p += 8  # width, height
                layers.append((x, y, spr, flags & 1, rgba, sx, sy, typ))
            if ver >= 0x200:
                p += 4  # sound event
            anchor = None
            if ver >= 0x203:
                na = struct.unpack_from("<I", b, p)[0]; p += 4
                for k in range(na):
                    ax, ay = struct.unpack_from("<ii", b, p + 4)
                    if k == 0:
                        anchor = (ax, ay)
                    p += 16
            if a == action and fr == frame:
                return layers, anchor
    raise ValueError("no such frame")


def draw(spr, act):
    """One frame drawn as the client draws it: (w, h, RGBA, left, top), left / top from the origin (the feet, for a body)."""
    imgs, npal = spr_read(spr); layers, anchor = act_frame(act)
    parts = []
    for x, y, i, mirror, rgba, sx, sy, typ in layers:
        if i < 0:
            continue
        k = i + (npal if typ == 1 else 0)
        if k >= len(imgs):
            continue
        w, h, px = imgs[k]; W, H = max(1, round(w * abs(sx))), max(1, round(h * abs(sy)))
        parts.append((x - W // 2, y - H // 2, W, H, w, h, px, mirror, rgba))
    if not parts:
        return None, anchor
    L = min(p[0] for p in parts); T = min(p[1] for p in parts)
    R = max(p[0] + p[2] for p in parts); B = max(p[1] + p[3] for p in parts)
    OW, OH = R - L, B - T; out = bytearray(OW * OH * 4)
    for x0, y0, W, H, w, h, px, mirror, rgba in parts:
        for y in range(H):
            for x in range(W):
                sxp = (W - 1 - x) if mirror else x
                s = ((y * h // H) * w + sxp * w // W) * 4
                if px[s + 3] < 128:
                    continue
                o = ((y0 - T + y) * OW + x0 - L + x) * 4
                out[o:o + 4] = bytes([px[s] * rgba[0] // 255, px[s + 1] * rgba[1] // 255, px[s + 2] * rgba[2] // 255, 255])
    return (OW, OH, out, L, T), anchor


def crop(img):
    """Cut img to the pixels it draws, keeping where it draws from."""
    w, h, px, L, T = img
    ys = [y for y in range(h) if any(px[(y * w + x) * 4 + 3] for x in range(w))]
    xs = [x for x in range(w) if any(px[(y * w + x) * 4 + 3] for y in range(h))]
    if not xs:
        return img
    x0, x1, y0, y1 = xs[0], xs[-1] + 1, ys[0], ys[-1] + 1; W = x1 - x0; out = bytearray(W * (y1 - y0) * 4)
    for y in range(y0, y1):
        out[(y - y0) * W * 4:(y - y0 + 1) * W * 4] = px[(y * w + x0) * 4:(y * w + x1) * 4]
    return W, y1 - y0, out, L + x0, T + y0


def png(w, h, px):
    """A paletted PNG when the image has up to 255 colours (sprites do), else RGBA."""
    cols = {}
    for i in range(0, len(px), 4):
        if px[i + 3]:
            cols.setdefault(bytes(px[i:i + 3]), len(cols) + 1)
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    if len(cols) <= 255:
        idx = bytes(cols[bytes(px[i:i + 3])] if px[i + 3] else 0 for i in range(0, len(px), 4))
        raw = b"".join(b"\0" + idx[y * w:(y + 1) * w] for y in range(h))
        return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0))
                + chunk(b"PLTE", b"\0\0\0" + b"".join(cols)) + chunk(b"tRNS", b"\0") + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    raw = b"".join(b"\0" + bytes(px[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = Grf(os.path.join(client, "data.grf"))
    base = "data\\sprite\\인간족\\"
    images, bodies, heads, missing = [], {}, {}, []

    def take(path):
        if not grf.has(path + ".spr") or not grf.has(path + ".act"):
            missing.append(path); return None
        img, anchor = draw(grf.read(path + ".spr"), grf.read(path + ".act"))
        if not img:
            missing.append(path); return None
        images.append(crop(img)); return len(images) - 1, anchor

    for job, name in JOBS.items():
        for s, ko in SEX.items():
            if ONE_SEX.get(job, s) != s:
                continue
            r = take(f"{base}몸통\\{ko}\\{name}_{ko}")
            if r:
                bodies.setdefault(job, {})[s] = r
    for s, ko in SEX.items():
        n = 1
        while grf.has(f"{base}머리통\\{ko}\\{n}_{ko}.spr"):
            r = take(f"{base}머리통\\{ko}\\{n}_{ko}")
            if r:
                heads.setdefault(s, {})[n] = r
            n += 1
    # pack in rows, tallest first
    order = sorted(range(len(images)), key=lambda i: -images[i][1]); at, x, y, row = {}, 0, 0, 0
    for i in order:
        w, h = images[i][:2]
        if x + w > SHEET_W:
            x, y, row = 0, y + row + 1, 0
        at[i] = (x, y); x += w + 1; row = max(row, h)
    H = y + row; px = bytearray(SHEET_W * H * 4)
    for i, (x0, y0) in at.items():
        w, h, src = images[i][:3]
        for yy in range(h):
            px[((y0 + yy) * SHEET_W + x0) * 4:((y0 + yy) * SHEET_W + x0 + w) * 4] = src[yy * w * 4:(yy + 1) * w * 4]
    data = png(SHEET_W, H, px)
    os.makedirs(os.path.join(ROOT, "img"), exist_ok=True)
    open(os.path.join(ROOT, "img", "job-sprites.png"), "wb").write(data)
    cell = lambda i: [*at[i], *images[i][:2]]
    out = {"file": "img/job-sprites.png", "v": f"{zlib.crc32(data) & 0xFFFFFFFF:08x}",
           # [x, y, w, h on the sheet, left, top from the feet, head anchor x, y from the feet]
           "body": {j: {s: cell(i) + list(images[i][3:5]) + list(a or (0, -70)) for s, (i, a) in g.items()} for j, g in bodies.items()},
           # [x, y, w, h on the sheet, left, top from the body's head anchor]
           "head": {s: {n: cell(i) + [images[i][3] - (a or (0, 0))[0], images[i][4] - (a or (0, 0))[1]] for n, (i, a) in g.items()} for s, g in heads.items()}}
    with open(os.path.join(ROOT, "data", "sprites.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Job looks for the equipment window (tools/export_sprites.py, from the game client): the sheet, a checksum of it (v); per job and\n"
                "// gender (m/f) the body [x,y,w,h on the sheet, left,top from the feet, head anchor x,y from the feet]; per gender and hair style\n"
                "// the head [x,y,w,h on the sheet, left,top from the body's head anchor].\n")
        f.write("const JOB_SPRITES=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print(f"{sum(len(g) for g in bodies.values())} bodies, {sum(len(g) for g in heads.values())} hair styles, sheet {SHEET_W} x {H}, {len(data)} bytes")
    if missing:
        print("not in the client: " + ", ".join(missing))


if __name__ == "__main__":
    main()
