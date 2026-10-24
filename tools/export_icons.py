"""Export the item icons and card pictures the page shows next to item names into three sprite sheets, and data/icons.js.

    python tools/export_icons.py            # fetch what isn't cached, then write the sheets and data/icons.js
    python tools/export_icons.py --refresh  # refetch every image

Gear and every other item: the inventory icon from the game client (24 x 24), as divine-pride.net serves it for each item id
(static.divine-pride.net/images/items/item/<id>.png). Cards: every card has the same inventory icon in the client, so a card shows
a thumbnail of its illustration instead (.../images/items/cards/<id>.png, 300 x 400, shrunk to CARD_W x CARD_H). Ids: gear from
data/equipment.js, cards from data/cards.js, and items (drops, recipe items, consumables, recovery items) from data/items.js,
data/recipes.js, data/consumables.js and data/recovery.js, and every [id, "name"] in data/memorial.js (Jello Fragments, Jellostones,
memorial rewards), that aren't gear or cards. Images are fetched a few per second and cached in tools/cache/icons/ (gitignored); delete a
cached file to refetch it. divine-pride answers an id it has no image for with a 57 x 57 placeholder: those ids are left out (the
page shows no icon for them) and listed at the end.

Writes img/gear-icons.png, img/item-icons.png, img/card-art.png (cells left to right, then down, in data/icons.js order) and data/icons.js.
Standard library only: PNGs are decoded and written here (8-bit and paletted, non-interlaced, which is what the site serves); the
sheets are written with a palette of up to 255 colours, which keeps the card pictures small.
"""
import json, os, re, struct, sys, time, urllib.error, urllib.request, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache", "icons")
SITE = "https://static.divine-pride.net/images/items"
UA = "RO-Zero-farmer-calculator data export"
GEAR_W, GEAR_H, GEAR_COLS = 24, 24, 32
ITEM_COLS = 32
CARD_W, CARD_H, CARD_COLS = 36, 48, 20


def ids(name, const):
    src = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    start = src.index("[", src.index(f"const {const}="))
    return [x["id"] for x in json.JSONDecoder().raw_decode(src, start)[0] if "id" in x]  # a few novice items have no id


def keys(name, const):
    """The item ids an {id: ...} table is keyed by (data/recovery.js isn't JSON, so the keys are read off the text)."""
    path = os.path.join(ROOT, "data", name)
    if not os.path.exists(path):
        return []
    src = open(path, encoding="utf-8").read()
    i = src.index(f"const {const}=")
    return [int(k) for k in re.findall(r'"(\d+)":', src[i:src.index("};", i)])]


def pairs(name):
    """The item ids a hand-made table names as [id, "name", ...] (data/memorial.js isn't JSON either)."""
    path = os.path.join(ROOT, "data", name)
    return [int(k) for k in re.findall(r'\[(\d+),"', open(path, encoding="utf-8").read())] if os.path.exists(path) else []


def fetch(kind, item_id, refresh=False):
    f = os.path.join(CACHE, kind, f"{item_id}.png")
    if os.path.exists(f) and not refresh:
        return open(f, "rb").read()
    req = urllib.request.Request(f"{SITE}/{kind}/{item_id}.png", headers={"User-Agent": UA})
    data = b""
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                break
            if attempt == 2:
                raise
            time.sleep(5)
        except OSError:
            if attempt == 2:
                raise
            time.sleep(5)
    os.makedirs(os.path.dirname(f), exist_ok=True)
    open(f, "wb").write(data)
    time.sleep(0.25)
    return data


def png_read(b):
    """(width, height, RGBA rows as a flat bytearray) from a non-interlaced PNG, or None."""
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    p, idat, pal, trns = 8, b"", None, None
    while p < len(b):
        n, t = struct.unpack(">I4s", b[p:p + 8]); d = b[p + 8:p + 8 + n]; p += 12 + n
        if t == b"IHDR":
            w, h, depth, ctype, _, _, inter = struct.unpack(">IIBBBBB", d)
        elif t == b"PLTE":
            pal = d
        elif t == b"tRNS":
            trns = d
        elif t == b"IDAT":
            idat += d
    if inter or (depth != 8 and ctype != 3):
        return None
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    bits = depth * ch; stride = (w * bits + 7) // 8; bpp = max(1, bits // 8)
    raw, out, prev, q = zlib.decompress(idat), bytearray(w * h * 4), bytearray(stride), 0
    for y in range(h):
        f = raw[q]; line = bytearray(raw[q + 1:q + 1 + stride]); q += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0; c = prev[x - bpp] if x >= bpp else 0; up = prev[x]
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + up) & 255
            elif f == 3: line[x] = (line[x] + (a + up) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(up - c), abs(a - c), abs(a + up - 2 * c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else up if pb <= pc else c)) & 255
        prev = line
        for x in range(w):
            o = (y * w + x) * 4
            if ctype == 3:
                i = (line[x * depth // 8] >> (8 - depth - (x * depth) % 8)) & ((1 << depth) - 1)
                out[o:o + 3] = pal[i * 3:i * 3 + 3]; out[o + 3] = trns[i] if trns and i < len(trns) else 255
            elif ctype == 6: out[o:o + 4] = line[x * 4:x * 4 + 4]
            elif ctype == 2:
                out[o:o + 3] = line[x * 3:x * 3 + 3]
                out[o + 3] = 0 if trns and len(trns) == 6 and bytes(line[x * 3:x * 3 + 3]) == trns[1::2] else 255
            elif ctype == 4: out[o:o + 3] = bytes([line[x * 2]]) * 3; out[o + 3] = line[x * 2 + 1]
            else: out[o:o + 3] = bytes([line[x]]) * 3; out[o + 3] = 255
    return w, h, out


def shrink(img, W, H):
    """Area-average img down to W x H (colours weighted by alpha, so transparent edges don't darken)."""
    w, h, px = img; out = bytearray(W * H * 4)
    for oy in range(H):
        y0, y1 = oy * h // H, max(oy * h // H + 1, (oy + 1) * h // H)
        for ox in range(W):
            x0, x1 = ox * w // W, max(ox * w // W + 1, (ox + 1) * w // W)
            r = g = b = a = n = 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    o = (y * w + x) * 4; al = px[o + 3]
                    r += px[o] * al; g += px[o + 1] * al; b += px[o + 2] * al; a += al; n += 1
            o = (oy * W + ox) * 4
            if a: out[o:o + 4] = bytes([r // a, g // a, b // a, a // n])
    return W, H, out


def quantize(px):
    """A palette of up to 255 colours for RGBA pixels (median cut, weighted by pixel count; exact when there are fewer colours) and each
    pixel's index into it, with index 0 for transparent pixels (the images' alpha is all or nothing, bar a few card corners)."""
    count = {}
    for i in range(0, len(px), 4):
        if px[i + 3] >= 128:
            k = bytes(px[i:i + 3]); count[k] = count.get(k, 0) + 1

    def box(cs):  # (score to split by, channel to split on, colours)
        r = [max(c[0][j] for c in cs) - min(c[0][j] for c in cs) for j in range(3)]
        return (max(r) * sum(c[1] for c in cs) if len(cs) > 1 else -1), r.index(max(r)), cs

    boxes = [box(list(count.items()))]
    while len(boxes) < 255 and max(b[0] for b in boxes) > 0:
        _, ch, cs = boxes.pop(max(range(len(boxes)), key=lambda i: boxes[i][0]))
        cs.sort(key=lambda c: c[0][ch]); half, acc, j = sum(c[1] for c in cs) / 2, 0, 0
        while acc < half: acc += cs[j][1]; j += 1
        j = max(1, min(len(cs) - 1, j)); boxes += [box(cs[:j]), box(cs[j:])]
    pal, lut = [b"\0\0\0"], {}
    for _, _, cs in boxes:
        n = sum(c[1] for c in cs)
        pal.append(bytes(sum(c[0][k] * c[1] for c in cs) // n for k in range(3)))
        for c in cs: lut[c[0]] = len(pal) - 1
    idx = bytes(lut[bytes(px[i:i + 3])] if px[i + 3] >= 128 else 0 for i in range(0, len(px), 4))
    return b"".join(pal), idx


def sheet(imgs, W, H, cols, path):
    """Cells W x H, left to right then down; an image of another size is centred in its cell (and cropped)."""
    rows = max(1, (len(imgs) + cols - 1) // cols); SW = W * cols; px = bytearray(SW * H * rows * 4)
    for k, (w, h, src) in enumerate(imgs):
        cx, cy = k % cols * W + (W - w) // 2, k // cols * H + (H - h) // 2
        for y in range(h):
            for x in range(w):
                tx, ty = cx + x, cy + y
                if k % cols * W <= tx < (k % cols + 1) * W and k // cols * H <= ty < (k // cols + 1) * H:
                    o, s = (ty * SW + tx) * 4, (y * w + x) * 4; px[o:o + 4] = src[s:s + 4]
    # a paletted PNG: a quarter of the size of RGBA, and the card pictures look the same at this size
    pal, idx = quantize(px)
    raw = b"".join(b"\0" + idx[y * SW:(y + 1) * SW] for y in range(H * rows))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", SW, H * rows, 8, 3, 0, 0, 0))
           + chunk(b"PLTE", pal) + chunk(b"tRNS", b"\0") + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(png)
    return f"{zlib.crc32(png) & 0xFFFFFFFF:08x}"  # the page asks for the sheet with this, so a new sheet isn't read from an old cache


def main():
    refresh = "--refresh" in sys.argv
    gear, cards, items, gear_ids, card_ids, item_ids, missing = [], [], [], [], [], [], []
    eq, cd = ids("equipment.js", "EQUIP"), ids("cards.js", "CARDS")
    known = set(eq) | set(cd)
    other = sorted(({i for f, c in [("items.js", "ITEMN"), ("recipes.js", "RECIPE_ITEMN"), ("consumables.js", "CONSUM"),
                                   ("recovery.js", "RECOVERY")] for i in keys(f, c)} | set(pairs("memorial.js"))) - known)
    todo = [("gear", i) for i in eq] + [("cards", i) for i in cd] + [("other", i) for i in other]
    for n, (kind, i) in enumerate(todo, 1):
        img = png_read(fetch("cards" if kind == "cards" else "item", i, refresh))
        if kind != "cards" and img and img[0] <= 32 and img[1] <= 32:
            (gear if kind == "gear" else items).append(img); (gear_ids if kind == "gear" else item_ids).append(i)
        elif kind == "cards" and img and img[0] >= 150:
            cards.append(shrink(img, CARD_W, CARD_H)); card_ids.append(i)
        else:
            missing.append(f"{kind} {i}")
        if n % 100 == 0:
            print(f"{n} / {len(todo)}", flush=True)
    gv = sheet(gear, GEAR_W, GEAR_H, GEAR_COLS, os.path.join(ROOT, "img", "gear-icons.png"))
    iv = sheet(items, GEAR_W, GEAR_H, ITEM_COLS, os.path.join(ROOT, "img", "item-icons.png"))
    cv = sheet(cards, CARD_W, CARD_H, CARD_COLS, os.path.join(ROOT, "img", "card-art.png"))
    with open(os.path.join(ROOT, "data", "icons.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Gear icons, other items' icons and card pictures (tools/export_icons.py, from divine-pride.net's copies of the game client's images):\n"
                "// each sheet's file, a checksum of it (v), its cell size, and the item ids in cell order (left to right, then down). Ids with no image\n"
                "// aren't listed.\n")
        f.write("const ICON_SHEETS=" + json.dumps({
            "gear": {"file": "img/gear-icons.png", "v": gv, "w": GEAR_W, "h": GEAR_H, "cols": GEAR_COLS, "ids": gear_ids},
            "item": {"file": "img/item-icons.png", "v": iv, "w": GEAR_W, "h": GEAR_H, "cols": ITEM_COLS, "ids": item_ids},
            "card": {"file": "img/card-art.png", "v": cv, "w": CARD_W, "h": CARD_H, "cols": CARD_COLS, "ids": card_ids}},
            separators=(",", ":")) + ";\n")
    print(f"{len(gear_ids)} gear icons, {len(item_ids)} item icons, {len(card_ids)} card pictures")
    if missing:
        print(f"no image for {len(missing)}: " + ", ".join(missing))


if __name__ == "__main__":
    main()
