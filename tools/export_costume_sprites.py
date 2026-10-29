"""Export how each costume looks for the Stylist tab into data/costumelooks.js and img/costume-*.png, from your installed Ragnarok Zero
client (official Global client, read-only).

    python tools/export_costume_sprites.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_costume_sprites.py --client "D:\\Games\\RagnarokZero"

Which costumes: data/costumes.js's (their slots: upper, middle, lower, garment). Each one's view number is its ClassNum in the client's
System\\itemInfo_data.lub. A headgear's view is an accessory: data.grf's accessoryid.lub and accname.lub (compiled Lua, read with
tools/lua51.py) name its sprite, data\\sprite\\악세사리\\<남|여>\\<남|여><name>.spr/.act, one per gender. A garment's view is a robe:
spriterobeid.lub and spriterobename.lub name its folder, data\\sprite\\로브\\<name>\\<남|여>\\<body>_<남|여>.spr/.act, one per job (and
transcendent look) and gender; spriterobename_f.lub's IsTopLayer says which robes the client draws over the body instead of behind it.
Each is drawn as the game draws it standing and facing you (action 0, frame 0), in its own colours, like tools/export_sprites.py's
bodies: a headgear placed from the body's head anchor (as hair is), a garment from the feet, moved by the body's anchor less its own.
Many entries are DES-encoded; export_minimaps' DesGrf reads them.

Writes data/costumelooks.js (COSTUME_LOOKS: items {item id: ["h" | "r", view]}, the headgear sheet with each view's [x, y, w, h on the
sheet, left, top from the head anchor] per gender, and per body (job, or "<job>+" for the transcendent look) a garment sheet with each
robe's [x, y, w, h, left, top from the feet] per gender, plus the robes drawn over the body), img/costume-head.png and
img/costume-robe-<job>.png (RGBA, packed in rows). Standard library only.
"""
import json, os, re, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_sprites  # noqa: E402
from export_sprites import ROOT, JOBS, TRANS, SEX, ONE_SEX, draw, crop, pack  # noqa: E402
from export_minimaps import DesGrf  # noqa: E402
from export_spawns import lua_data  # noqa: E402
from lua51 import run, call  # noqa: E402

LUA = "data\\luafiles514\\lua files\\datainfo\\"
ACC = "data\\sprite\\악세사리\\"
ROBE = "data\\sprite\\로브\\"


def png_rgba(w, h, px):
    """An RGBA PNG, each row filtered by the difference from the pixel to its left (smaller for sprites' flat colours)."""
    rows = []
    for y in range(h):
        r = px[y * w * 4:(y + 1) * w * 4]
        rows.append(b"\1" + bytes([r[i] if i < 4 else (r[i] - r[i - 4]) & 0xFF for i in range(len(r))]))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
            + chunk(b"IEND", b""))


def write_sheet(images, path):
    """Pack the images (w, h, RGBA, ...) and write them; where each went, and the file's checksum."""
    at, px, H = pack(images)
    data = png_rgba(export_sprites.SHEET_W, H, px)
    open(path, "wb").write(data)
    return at, f"{zlib.crc32(data) & 0xFFFFFFFF:08x}", len(data)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    grf = DesGrf(os.path.join(client, "data.grf"))
    src = open(os.path.join(ROOT, "data", "costumes.js"), encoding="utf-8").read()
    costumes = {int(k): json.loads(v) for k, v in re.findall(r"(\d+):(\[[^\]]*\])", src[src.index("const COSTUMES="):])}
    info = lua_data(open(os.path.join(client, "System", "itemInfo_data.lub"), "rb").read(), "utf-8", lenient=True)["tbl_data"]
    g = {}
    for f in ("accessoryid.lub", "accname.lub", "spriterobeid.lub", "spriterobename.lub", "spriterobename_f.lub"):
        run(grf.read(LUA + f), g)
    acc_names, robe_names = g["AccNameTable"], g["RobeNameTable"]
    # the body's head anchor per job and gender, from data/sprites.js (export_sprites.py's): a garment moves by it less its own
    s = open(os.path.join(ROOT, "data", "sprites.js"), encoding="utf-8").read()
    sprites = json.JSONDecoder().raw_decode(s, s.index("{", s.index("const JOB_SPRITES=")))[0]

    def drawn(path):
        """The sprite at path (no extension) standing, cropped, and its anchor; None if the client has no such sprite."""
        if not grf.has(path + ".spr") or not grf.has(path + ".act"):
            return None
        try:
            img, anchor = draw(grf.read(path + ".spr"), grf.read(path + ".act"))
        except Exception:
            return None
        return (crop(img), anchor) if img and img[0] and img[1] else None

    items, heads, robes, missing = {}, {}, {}, []
    for i, slots in sorted(costumes.items()):
        view = (info.get(i) or {}).get("ClassNum")
        if not view:
            missing.append(f"{i} (no view)"); continue
        kind = "r" if "garment" in slots else "h"
        if (acc_names if kind == "h" else robe_names).get(view) is None:
            missing.append(f"{i} (view {view} unnamed)"); continue
        items[i] = [kind, view]
        (heads if kind == "h" else robes).setdefault(view, None)

    # headgear: one sprite per gender
    images, head_at = [], {}
    for view in heads:
        name = acc_names[view]
        for sx, ko in SEX.items():
            r = drawn(f"{ACC}{ko}\\{ko}{name}")
            if not r:
                missing.append(f"{ko}{name}"); continue
            (w, h, px, L, T), a = r
            a = a or (0, 0)
            images.append((w, h, px)); head_at.setdefault(view, {})[sx] = (len(images) - 1, L - a[0], T - a[1])
    export_sprites.SHEET_W = 1024
    at, v, size = write_sheet(images, os.path.join(ROOT, "img", "costume-head.png"))
    head = {"file": "img/costume-head.png", "v": v, "at": {str(view): {sx: [*at[k], images[k][0], images[k][1], l, t] for sx, (k, l, t) in g2.items()}
                                                         for view, g2 in head_at.items()}}
    print(f"headgear: {len(head_at)} views, {len(images)} sprites, sheet {export_sprites.SHEET_W} wide, {size // 1024} KB")

    # garments: per body (each job, and each 2nd job's transcendent look) and gender
    export_sprites.SHEET_W = 512
    bodies = {job: (name, "body") for job, name in JOBS.items()}
    bodies.update({job + "+": (name, "trans") for job, name in TRANS.items()})
    robe_sheets, total = {}, 0
    for key, (body, kind) in bodies.items():
        job = key.rstrip("+")
        images, robe_at = [], {}
        for view in robes:
            name = call(g["ReqRobSprName_V2"], [view, False])[0] if "ReqRobSprName_V2" in g else robe_names[view]
            for sx, ko in SEX.items():
                if ONE_SEX.get(job, sx) != sx:
                    continue
                r = drawn(f"{ROBE}{name}\\{ko}\\{body}_{ko}")
                bj = sprites[kind].get(job, {}).get(sx)
                if not r or not bj:
                    continue
                (w, h, px, L, T), a = r
                dx, dy = (bj[6] - a[0], bj[7] - a[1]) if a else (0, 0)
                images.append((w, h, px)); robe_at.setdefault(view, {})[sx] = (len(images) - 1, L + dx, T + dy)
        if not images:
            continue
        file = f"img/costume-robe-{key.lower().replace('+', '-trans')}.png"
        at, v, size = write_sheet(images, os.path.join(ROOT, *file.split("/")))
        total += size
        robe_sheets[key] = {"file": file, "v": v, "at": {str(view): {sx: [*at[k], images[k][0], images[k][1], l, t] for sx, (k, l, t) in g2.items()}
                                                         for view, g2 in robe_at.items()}}
    top = [view for view in robes if call(g["IsTopLayer"], [view])[0]]
    print(f"garments: {len(robes)} robes, {len(robe_sheets)} body sheets, {total // 1024} KB in all")
    out = {"items": {str(k): v for k, v in items.items()}, "head": head, "robe": {"top": top, "bodies": robe_sheets}}
    with open(os.path.join(ROOT, "data", "costumelooks.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// How costumes look in the Stylist (tools/export_costume_sprites.py, from the game client). items: {item id: [\"h\" (headgear) |\n"
                "// \"r\" (garment), view]}; head: the headgear sheet and per view and gender (m/f) [x,y,w,h on the sheet, left,top from the\n"
                "// body's head anchor]; robe.bodies: per job (\"<job>+\": its transcendent look) a garment sheet and per robe and gender\n"
                "// [x,y,w,h, left,top from the feet]; robe.top: the robes drawn over the body (the rest go behind it). Sheets are RGBA.\n")
        f.write("const COSTUME_LOOKS=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print(f"{len(items)} of {len(costumes)} costumes have a look")
    if missing:
        print(f"not drawn ({len(missing)}): " + ", ".join(missing[:40]) + (" …" if len(missing) > 40 else ""))


if __name__ == "__main__":
    main()
