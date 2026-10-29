"""Export each job's look for the Character tab's equipment window into data/sprites.js, from your installed
Ragnarok Zero client (official Global client, read-only). Each 2nd job also gets its transcendent job's look (Knight as a Lord Knight),
which Zero lets a 2nd job wear since it has no transcendent jobs.

    python tools/export_sprites.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_sprites.py --client "D:\\Games\\RagnarokZero"

The client's data.grf holds every job's body (data\\sprite\\인간족\\몸통\\<남|여>\\<job>_<남|여>.spr/.act) and every hair style
(data\\sprite\\인간족\\머리통\\<남|여>\\<n>_<남|여>.spr/.act). Each is drawn as the game draws it standing and facing you (action 0,
frame 0: the ACT's layers placed around the feet). The page puts the head on the body at the body's anchor point, the way the client
does, so any hair style goes on any job without a picture for each pair. Bodies and heads are drawn as palette indices, with each
clothes colour's palette (data\\palette\\몸) and each hair colour's (data\\palette\\머리), so the page colours them.

Writes data/sprites.js: the body sheet and the hair sheet (each sprite cropped to what it draws, packed in rows, as indices) as data:
URLs, since the page reads their pixels to colour them, which a browser only allows for an image from the page's own site and never
for a file opened from disk; per job and gender the body's place on the sheet, where it draws from the feet, its head anchor and its
clothes colours (body, and trans for the transcendent look); per gender and hair style the head's place, where it draws from the
anchor and its hair colours.

Also writes img/job-icons.png, each job's icon from the client (data\\texture\\유저인터페이스\\uirenewal\\jobicon\\big\\icon_job_<job id>.bmp,
52 x 52, magenta see-through), a sheet like tools/export_icons.py's that data/sprites.js's icons names. Standard library only.
"""
import base64, json, os, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# the page's job names, and the body sprite name the client uses for each (Bard is male only, Dancer female only)
JOBS = {"Novice": "초보자", "Swordsman": "검사", "Mage": "마법사", "Archer": "궁수", "Acolyte": "성직자", "Merchant": "상인", "Thief": "도둑",
        "Knight": "기사", "Crusader": "크루세이더", "Wizard": "위저드", "Sage": "세이지", "Hunter": "헌터", "Bard": "바드", "Dancer": "무희",
        "Priest": "프리스트", "Monk": "몽크", "Blacksmith": "제철공", "Alchemist": "연금술사", "Assassin": "어세신", "Rogue": "로그"}
SEX = {"m": "남", "f": "여"}
ONE_SEX = {"Bard": "m", "Dancer": "f"}
# Zero has no transcendent jobs, so a 2nd job can wear its transcendent job's look instead (Knight as a Lord Knight). The client's
# <job>_h bodies are the same as the plain ones, not these
TRANS = {"Knight": "로드나이트", "Crusader": "팔라딘", "Wizard": "하이위저드", "Sage": "프로페서", "Hunter": "스나이퍼", "Bard": "클라운",
         "Dancer": "집시", "Priest": "하이프리", "Monk": "챔피온", "Blacksmith": "화이트스미스", "Alchemist": "크리에이터",
         "Assassin": "어쌔신크로스", "Rogue": "스토커"}
# the client's job id for each, which names its job icon
JOB_ID = {"Novice": 0, "Swordsman": 1, "Mage": 2, "Archer": 3, "Acolyte": 4, "Merchant": 5, "Thief": 6, "Knight": 7, "Priest": 8, "Wizard": 9,
          "Blacksmith": 10, "Hunter": 11, "Assassin": 12, "Crusader": 14, "Monk": 15, "Sage": 16, "Rogue": 17, "Alchemist": 18, "Bard": 19,
          "Dancer": 20}
ICON = "data\\texture\\유저인터페이스\\uirenewal\\jobicon\\big\\icon_job_{}.bmp"
ICON_W, ICON_COLS = 52, 10
# bodies whose clothes palettes go by another name: the Clown's are the Gypsy's male ones
PAL_NAME = {"클라운": "집시"}
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

    def readable(self, name):
        return self.has(name) and not self.ents[name.lower()][3] & 6

    def read(self, name):
        csize, asize, _, flags, foff = self.ents[name.lower()]
        if flags & 6:
            raise SystemExit(f"{name} is encrypted in the GRF")
        self.f.seek(foff + 46)
        return zlib.decompress(self.f.read(asize)[:csize])


def spr_read(b):
    """The images of an SPR file as (w, h, RGBA bytes, index RGBA bytes): palette images first, then RGBA ones (no index image), as
    ACT layers number them. The index image has each pixel's palette index for red, green and blue, so a dye's palette can colour it."""
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
        px, ipx = bytearray(w * h * 4), bytearray(w * h * 4)
        for i, c in enumerate(idx[:w * h]):
            if c:
                px[i * 4:i * 4 + 3] = pal[c * 4:c * 4 + 3]; px[i * 4 + 3] = 255; ipx[i * 4:i * 4 + 4] = bytes([c, c, c, 255])
        imgs.append((w, h, px, ipx))
    for _ in range(nrgba):  # ABGR, bottom row first
        w, h = struct.unpack_from("<HH", b, p); p += 4; px = bytearray(w * h * 4)
        for y in range(h):
            for x in range(w):
                a, bl, g, r = b[p + ((h - 1 - y) * w + x) * 4:p + ((h - 1 - y) * w + x) * 4 + 4]
                px[(y * w + x) * 4:(y * w + x) * 4 + 4] = bytes([r, g, bl, a])
        p += w * h * 4; imgs.append((w, h, px, None))
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


def draw(spr, act, indexed=False):
    """One frame drawn as the client draws it: (w, h, RGBA, left, top), left / top from the origin (the feet, for a body). indexed
    draws the palette indices instead of colours (RGBA layers and layer tints left out)."""
    imgs, npal = spr_read(spr); layers, anchor = act_frame(act)
    parts = []
    for x, y, i, mirror, rgba, sx, sy, typ in layers:
        if i < 0:
            continue
        k = i + (npal if typ == 1 else 0)
        if k >= len(imgs):
            continue
        w, h, px, ipx = imgs[k]
        if indexed:
            if ipx is None:
                continue
            px, rgba = ipx, (255, 255, 255, 255)
        W, H = max(1, round(w * abs(sx))), max(1, round(h * abs(sy)))
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


def png_gray(w, h, px):
    """A greyscale PNG of the red channel, 0 transparent: the palette indices of index images, read back exactly by a canvas."""
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\0" + bytes(px[(y * w + x) * 4] if px[(y * w + x) * 4 + 3] else 0 for x in range(w)) for y in range(h))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
            + chunk(b"tRNS", b"\0\0") + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def pack(images):
    """Images packed in rows on a sheet SHEET_W wide, tallest first: where each goes, and the sheet's RGBA and height."""
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
    return at, px, H


def colours(img, pals):
    """The colours of an index image in each of its palettes (pals[0] the sprite's own): the indices it draws (i, 2 hex digits each)
    with their colours in pals[0] (b, 6 hex digits each), once; then per palette only the indices the palettes change (d), with their
    colours (c), since one colour in the sprite's palette can become different ones; k is the swatch, the changed index drawn most."""
    w, h, px = img[:3]; count = {}
    for k in range(0, len(px), 4):
        if px[k + 3]:
            count[px[k]] = count.get(px[k], 0) + 1
    used = sorted(count); dyed = [i for i in used if len({p[i * 4:i * 4 + 3] for p in pals}) > 1] or used[:1]
    hex2 = lambda idx: "".join(f"{i:02x}" for i in idx)
    return {"i": hex2(used), "b": "".join(pals[0][i * 4:i * 4 + 3].hex() for i in used), "d": hex2(dyed),
            "k": dyed.index(max(dyed, key=lambda i: count[i])), "c": ["".join(p[i * 4:i * 4 + 3].hex() for i in dyed) for p in pals]}


def palettes(grf, spr, path):
    """A sprite's own palette, then path.format(n) for n = 1, 2 ... up to the first missing or encrypted one: colour 0 is no dye,
    the sprite's own palette as the client draws it (its _0.pal, where there is one, is the same or unused)."""
    pals, n = [grf.read(spr)[-1024:]], 1
    while grf.readable(path.format(n)):
        pals.append(grf.read(path.format(n))[:1024]); n += 1
    return pals


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = Grf(os.path.join(client, "data.grf"))
    base = "data\\sprite\\인간족\\"
    images, hair_images, bodies, trans, heads, body_pal, trans_pal, hair_pal, missing = [], [], {}, {}, {}, {}, {}, {}, []

    def take(path, into=images, indexed=False):
        if not grf.has(path + ".spr") or not grf.has(path + ".act"):
            missing.append(path); return None
        img, anchor = draw(grf.read(path + ".spr"), grf.read(path + ".act"), indexed)
        if not img:
            missing.append(path); return None
        into.append(crop(img)); return len(into) - 1, anchor

    for job, name in JOBS.items():
        for s, ko in SEX.items():
            if ONE_SEX.get(job, s) != s:
                continue
            for into, pal, nm in [(bodies, body_pal, name), (trans, trans_pal, TRANS.get(job))]:
                r = nm and take(f"{base}몸통\\{ko}\\{nm}_{ko}", images, True)
                if r:
                    # clothes colour n is data\\palette\\몸\\<name>_<남|여>_<n>.pal
                    into.setdefault(job, {})[s] = r
                    pal.setdefault(job, {})[s] = colours(images[r[0]], palettes(
                        grf, f"{base}몸통\\{ko}\\{nm}_{ko}.spr", f"data\\palette\\몸\\{PAL_NAME.get(nm, nm)}_{ko}_{{}}.pal"))
    for s, ko in SEX.items():
        n = 1
        while grf.has(f"{base}머리통\\{ko}\\{n}_{ko}.spr"):
            r = take(f"{base}머리통\\{ko}\\{n}_{ko}", hair_images, True)
            if r:
                heads.setdefault(s, {})[n] = r
                # hair colour n is data\\palette\\머리\\머리<n>_<남|여>_<colour>.pal (female style 7 stops at colour 11, past a gap)
                hair_pal.setdefault(s, {})[n] = colours(hair_images[r[0]], palettes(
                    grf, f"{base}머리통\\{ko}\\{n}_{ko}.spr", f"data\\palette\\머리\\머리{n}_{ko}_{{}}.pal"))
            n += 1
    at, px, H = pack(images)
    data = png_gray(SHEET_W, H, px)
    hat, hpx, HH = pack(hair_images)
    hdata = png_gray(SHEET_W, HH, hpx)
    cell = lambda i: [*at[i], *images[i][:2]]
    body = lambda bs: {j: {s: cell(i) + list(images[i][3:5]) + list(a or (0, -70)) for s, (i, a) in g.items()} for j, g in bs.items()}
    out = {"jobData": "data:image/png;base64," + base64.b64encode(data).decode(),
           "hairData": "data:image/png;base64," + base64.b64encode(hdata).decode(),
           # [x, y, w, h on the sheet, left, top from the feet, head anchor x, y from the feet]
           "body": body(bodies),
           # the same for a 2nd job's transcendent look
           "trans": body(trans),
           # per job and gender the clothes colours, as hairPal's
           "bodyPal": body_pal, "transPal": trans_pal,
           # [x, y, w, h on the hair sheet, left, top from the body's head anchor]
           "head": {s: {n: [*hat[i], *hair_images[i][:2], hair_images[i][3] - (a or (0, 0))[0], hair_images[i][4] - (a or (0, 0))[1]]
                        for n, (i, a) in g.items()} for s, g in heads.items()},
           "hairPal": hair_pal}
    # the job icons, drawn at half their size (hd) so they're sharp on high-DPI screens; ids are the page's job names
    from export_minimaps import bmp_rgba
    from export_icons import sheet
    icons = [j for j in JOBS if grf.has(ICON.format(JOB_ID[j]))]
    missing += [ICON.format(JOB_ID[j]) for j in JOBS if j not in icons]
    pics = [(w, h, bytearray(x for r in rows for p in r for x in p)) for w, h, rows in (bmp_rgba(grf.read(ICON.format(JOB_ID[j]))) for j in icons)]
    out["icons"] = {"file": "img/job-icons.png", "v": sheet(pics, ICON_W, ICON_W, ICON_COLS, os.path.join(ROOT, "img", "job-icons.png")),
                    "w": ICON_W // 2, "h": ICON_W // 2, "hd": 2, "cols": ICON_COLS, "ids": icons}
    with open(os.path.join(ROOT, "data", "sprites.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Job looks for the equipment window (tools/export_sprites.py, from the game client): the body and hair sheets as data:\n"
                "// URLs, so the page can read their pixels even opened from disk (jobData, hairData); per job and gender (m/f) the body\n"
                "// [x,y,w,h on the sheet, left,top from the feet, head anchor x,y from the feet], trans the same for a 2nd job's\n"
                "// transcendent look (Knight as a Lord Knight); per gender and hair style the head [x,y,w,h on the hair sheet, left,top from\n"
                "// the body's head anchor]. Both sheets hold palette indices (grey level = index); hairPal per gender and hair style, and\n"
                "// bodyPal / transPal per job and gender, have the indices it draws (i, 2 hex digits each) with their colours (b, 6 hex\n"
                "// digits each), the indices the colours change (d), the swatch's place among those (k) and per colour their colours (c).\n")
        f.write("const JOB_SPRITES=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print(f"{sum(len(g) for g in bodies.values())} bodies, {sum(len(g) for g in trans.values())} transcendent "
          f"({sum(len(p['c']) for d in (body_pal, trans_pal) for g in d.values() for p in g.values())} clothes colours), {sum(len(g) for g in heads.values())} hair styles "
          f"({sum(len(p['c']) for g in hair_pal.values() for p in g.values())} colours), sheets {SHEET_W} x {H} ({len(data)} bytes) and {SHEET_W} x {HH} ({len(hdata)} bytes), {len(icons)} job icons")
    if missing:
        print("not in the client: " + ", ".join(missing))


if __name__ == "__main__":
    main()
