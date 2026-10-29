"""Export every frame of the Stylist's looks, so its preview can turn and move: each job's body (and transcendent look), each hair style,
each headgear and each garment, from your installed Ragnarok Zero client (official Global client, read-only).

    python tools/export_look_frames.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_look_frames.py --client "D:\\Games\\RagnarokZero"
    python tools/export_look_frames.py --only body                      # one kind: body, hair, head or robe

The sprites are the ones tools/export_sprites.py (bodies, hair) and tools/export_costume_sprites.py (headgear, garments, with the views
in data/costumelooks.js) draw standing; here each one's SPR images go on a sheet and its ACT's frames are kept for four actions, in all
8 directions (S, SW, W, NW, N, NE, E, SE): stand, walk, sit and attack (the client's action types 0, 1, 2 and 5, action = type x 8 +
direction). A frame is its layers [image, x, y, mirror, scale x, scale y] from the sprite's origin and its anchor (where a head, headgear
or garment attaches: the client draws each so its anchor is on the body's). The ACT's delay per action is in client ticks of 25 ms.

Bodies and hair keep palette indices (a grey sheet, grey level = index) so the page colours them with any clothes or hair colour, and
their sheets go in the data file as data: URLs (the page reads their pixels, refused for an image from a file opened from disk);
headgear and garments are drawn in their own colours, from RGBA PNGs beside. One file a piece, loaded when the preview first shows it:
data/looks/<kind>/<key>.js, which calls LOOKS_ADD("<kind>/<key>", {...}), and img/looks/<kind>/<key>.png for headgear and garments.
Keys: body <job>-<m|f> (<job>+-<m|f> for the transcendent look), hair <style>-<m|f>, head <view>-<m|f>, robe <view>-<job>-<m|f>.
Writes data/looks/index.js too (LOOK_FILES: which keys exist). Standard library only.
"""
import base64, hashlib, json, os, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_sprites  # noqa: E402
from export_sprites import ROOT, JOBS, TRANS, SEX, ONE_SEX, spr_read, png_gray, pack  # noqa: E402
from export_minimaps import DesGrf  # noqa: E402
from export_costume_sprites import png_rgba, LUA, ACC, ROBE  # noqa: E402
from lua51 import run, call  # noqa: E402

ACTIONS = {"stand": 0, "walk": 1, "sit": 2, "attack": 5}
BODY = "data\\sprite\\인간족\\"


def act_read(b):
    """Every action of an ACT file: [frames, delay], each frame (layers, anchor), a layer [image, x, y, mirror, scale x, scale y] (the
    image numbered as the SPR has them: palette images first, then RGBA ones), the anchor [x, y] or None; delay in 25 ms ticks."""
    if b[:2] != b"AC":
        raise ValueError("not an ACT file")
    ver = struct.unpack_from("<H", b, 2)[0]; nact = struct.unpack_from("<H", b, 4)[0]; p = 16
    acts = []
    for _ in range(nact):
        nfr = struct.unpack_from("<I", b, p)[0]; p += 4; frames = []
        for _ in range(nfr):
            p += 32; nl = struct.unpack_from("<I", b, p)[0]; p += 4; layers = []
            for _ in range(nl):
                x, y, spr, flags = struct.unpack_from("<iiiI", b, p); p += 16
                sx = sy = 1.0; typ = 0
                if ver >= 0x200:
                    p += 4                                           # tint
                    if ver >= 0x204:
                        sx, sy = struct.unpack_from("<ff", b, p); p += 8
                    else:
                        sx = sy = struct.unpack_from("<f", b, p)[0]; p += 4
                    p += 4                                           # rotation
                    typ = struct.unpack_from("<i", b, p)[0]; p += 4
                    if ver >= 0x205:
                        p += 8
                if spr >= 0:
                    layers.append([spr, typ, x, y, flags & 1, round(sx, 3), round(sy, 3)])
            if ver >= 0x200:
                p += 4
            anchor = None
            if ver >= 0x203:
                na = struct.unpack_from("<I", b, p)[0]; p += 4
                for k in range(na):
                    if k == 0:
                        anchor = list(struct.unpack_from("<ii", b, p + 4))
                    p += 16
            frames.append((layers, anchor))
        acts.append([frames, 4.0])
    if ver >= 0x201 and p < len(b):
        ns = struct.unpack_from("<I", b, p)[0]; p += 4 + 40 * ns
    if ver >= 0x202:
        for a in acts:
            if p + 4 <= len(b):
                a[1] = round(struct.unpack_from("<f", b, p)[0], 3); p += 4
    return acts


def export(grf, path, indexed, out_js, out_png, key):
    """Write one piece (path: its SPR/ACT without the extension) as data/looks/<key>.js (+ img/looks/<key>.png); its size, or None."""
    if not grf.has(path + ".spr") or not grf.has(path + ".act"):
        return None
    try:
        imgs, npal = spr_read(grf.read(path + ".spr")); acts = act_read(grf.read(path + ".act"))
    except Exception:
        return None
    # the images the kept actions use, renumbered onto the sheet; bodies and hair keep only their palette images, as indices
    keep = {t: [acts[t * 8 + d] if t * 8 + d < len(acts) else [[], 4.0] for d in range(8)] for t in ACTIONS.values()}
    used = sorted({(l[1] == 1) * npal + l[0] for dirs in keep.values() for fr, _ in dirs for ls, _ in fr for l in ls})
    used = [k for k in used if k < len(imgs) and (not indexed or imgs[k][3] is not None) and imgs[k][0] and imgs[k][1]]
    if not used:
        return None
    num = {k: i for i, k in enumerate(used)}
    sheet = [(imgs[k][0], imgs[k][1], imgs[k][3] if indexed else imgs[k][2]) for k in used]
    at, px, H = pack(sheet)
    data = png_gray(export_sprites.SHEET_W, H, px) if indexed else png_rgba(export_sprites.SHEET_W, H, px)
    act = {}
    for name, t in ACTIONS.items():
        dirs = []
        for frames, delay in keep[t]:
            fr = []
            for layers, anchor in frames:
                ls = [[num[k], x, y, m, sx, sy] for spr, typ, x, y, m, sx, sy in layers
                      for k in [(typ == 1) * npal + spr] if k in num]
                fr.append([ls, anchor])
            dirs.append({"d": delay, "f": fr})
        act[name] = dirs
    piece = {"img": [[*at[i], sheet[i][0], sheet[i][1]] for i in range(len(sheet))], "act": act}
    if indexed:
        piece["sheet"] = "data:image/png;base64," + base64.b64encode(data).decode()
    else:
        os.makedirs(os.path.dirname(out_png), exist_ok=True)
        open(out_png, "wb").write(data)
        piece["sheet"] = os.path.relpath(out_png, ROOT).replace(os.sep, "/") + "?v=" + f"{zlib.crc32(data) & 0xFFFFFFFF:08x}"
    os.makedirs(os.path.dirname(out_js), exist_ok=True)
    js = "LOOKS_ADD(" + json.dumps(key) + "," + json.dumps(piece, separators=(",", ":")) + ");\n"
    open(out_js, "w", encoding="utf-8", newline="\n").write(js)
    return len(js) + (0 if indexed else len(data))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    grf = DesGrf(os.path.join(client, "data.grf"))
    export_sprites.SHEET_W = 512
    js = lambda kind, key: os.path.join(ROOT, "data", "looks", kind, key + ".js")
    png = lambda kind, key: os.path.join(ROOT, "img", "looks", kind, key + ".png")
    index_path = os.path.join(ROOT, "data", "looks", "index.js")
    files = {"body": [], "hair": [], "head": [], "robe": []}
    if only and os.path.exists(index_path):          # keep the other kinds' lists
        s = open(index_path, encoding="utf-8").read()
        files.update(json.JSONDecoder().raw_decode(s, s.index("{", s.index("const LOOK_FILES=")))[0])
    sizes = {}

    def put(kind, key, path, indexed):
        n = export(grf, path, indexed, js(kind, key), png(kind, key), kind + "/" + key)
        if n:
            files[kind].append(key); sizes[kind] = sizes.get(kind, 0) + n

    if only in (None, "body"):
        files["body"] = []
        for job, name in list(JOBS.items()) + [(j + "+", n) for j, n in TRANS.items()]:
            for sx, ko in SEX.items():
                if ONE_SEX.get(job.rstrip("+"), sx) == sx:
                    put("body", f"{job}-{sx}", f"{BODY}몸통\\{ko}\\{name}_{ko}", True)
    if only in (None, "hair"):
        files["hair"] = []
        for sx, ko in SEX.items():
            n = 1
            while grf.has(f"{BODY}머리통\\{ko}\\{n}_{ko}.spr"):
                put("hair", f"{n}-{sx}", f"{BODY}머리통\\{ko}\\{n}_{ko}", True); n += 1
    if only in (None, "head", "robe"):
        g = {}
        for f in ("accessoryid.lub", "accname.lub", "spriterobeid.lub", "spriterobename.lub", "spriterobename_f.lub"):
            run(grf.read(LUA + f), g)
        s = open(os.path.join(ROOT, "data", "costumelooks.js"), encoding="utf-8").read()
        looks = json.JSONDecoder().raw_decode(s, s.index("{", s.index("const COSTUME_LOOKS=")))[0]
        if only in (None, "head"):
            files["head"] = []
            for view in sorted({v for k, v in looks["items"].values() if k == "h"}):
                for sx, ko in SEX.items():
                    put("head", f"{view}-{sx}", f"{ACC}{ko}\\{ko}{g['AccNameTable'][view]}", False)
        if only in (None, "robe"):
            files["robe"] = []
            for view in sorted({v for k, v in looks["items"].values() if k == "r"}):
                name = call(g["ReqRobSprName_V2"], [view, False])[0]
                for job, body in list(JOBS.items()) + [(j + "+", n) for j, n in TRANS.items()]:
                    for sx, ko in SEX.items():
                        if ONE_SEX.get(job.rstrip("+"), sx) == sx:
                            put("robe", f"{view}-{job}-{sx}", f"{ROBE}{name}\\{ko}\\{body}_{ko}", False)
    with open(index_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("// The Stylist's animated looks (tools/export_look_frames.py, from the game client): the pieces exported, by kind (body: <job>-<m|f>,\n"
                "// \"<job>+\" the transcendent look; hair: <style>-<m|f>; head: <headgear view>-<m|f>; robe: <garment view>-<job>-<m|f>). Each is\n"
                "// data/looks/<kind>/<key>.js, loaded when the preview first shows it.\n")
        f.write("const LOOK_FILES=" + json.dumps(files, separators=(",", ":")) + ";\n")
    for k, n in sizes.items():
        print(f"{k}: {len(files[k])} pieces, {n / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
