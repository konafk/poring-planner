"""Rewrite data/spawn.js from the spawn counts in your installed Ragnarok Zero client (official Global client, read-only).

    python tools/export_spawns.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_spawns.py --client "D:\\Games\\RagnarokZero"

The client's navigation table (data.grf: data\\luafiles514\\lua files\\navigation\\navi_mob.lub, compiled Lua 5.1) lists every
map's monsters with their counts, per channel. In game the map itself and channels _a to _d are normal and _y/_z are PvP; the
table lists the map, _a, _b (always the same counts) and _z (PvP, about 1.5x the monsters), so those stand for the rest.
MVPs sit in their own tables, b_<map> and b_<map>_z, which count toward the map.
Fields also have a table under their old name (prt_fild06, mjolnir_04, prt_maze02) with the same counts but no channels; their PvP
and boss tables are only under the Zero name (prt_f06_z, mjo_f04_z, maz_d02_z), so those are looked up there.
The database takes its spawn list from this same file but fills field counts with rAthena Renewal estimates, so field counts were
far too high; its dungeon counts already matched the client.
Each spawn becomes [map, normal count, PvP count], or [map, normal count] when the table has no PvP channel for the map. The client is
the only source for counts: on maps it doesn't list yet (regions not out) each monster already there becomes [map, null], so the
Roadmap still knows what comes when but no estimate stands in for the count; once a client update lists the map, its counts come in.
Those maps are printed. Nothing from the client is written apart from these counts.
"""
import json, os, re, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
NAVI = "data\\luafiles514\\lua files\\navigation\\navi_mob.lub"


def grf_file(grf, name):
    """One file from a GRF 0x300 archive (header 46 bytes, zlib file table, zlib entries)."""
    with open(grf, "rb") as f:
        h = f.read(46)
        if not h.startswith((b"Event Horizon", b"Master of Magic")):
            raise SystemExit(f"{grf}: not a GRF file")
        off, count, ver = struct.unpack("<QII", h[30:46])
        if ver != 0x300:
            raise SystemExit(f"{grf}: GRF version {ver:#x}, only 0x300 is handled")
        f.seek(off + 46)
        f.read(4)  # 0x300 file tables start with 4 extra bytes
        comp, size = struct.unpack("<II", f.read(8))
        table, p = zlib.decompress(f.read(comp)), 0
        while p < len(table):
            e = table.index(b"\0", p); n = table[p:e].decode("cp949", "replace"); p = e + 1
            csize, asize, rsize, flags, foff = struct.unpack("<iiiBQ", table[p:p + 21]); p += 21
            if n.lower() == name.lower():
                if flags & 6:
                    raise SystemExit(f"{name} is encrypted in the GRF")
                f.seek(foff + 46)
                return zlib.decompress(f.read(asize)[:csize])
    raise SystemExit(f"{name} not found in {grf}")


def text(raw, enc):
    """enc "utf-8": the English client's strings are UTF-8 with a few cp1252 ones"""
    if enc != "utf-8":
        return raw.decode(enc, "replace")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp1252", "replace")


def lua_data(b, enc="cp949"):
    """Globals set by a compiled Lua 5.1 data file, running only the opcodes that build tables. enc: how its strings are written."""
    p = [12]

    def u8(): p[0] += 1; return b[p[0] - 1]
    def i32(): p[0] += 4; return struct.unpack_from("<i", b, p[0] - 4)[0]
    def s():
        n = struct.unpack_from("<I", b, p[0])[0]; p[0] += 4 + n
        return text(b[p[0] - n:p[0] - 1], enc) if n else None

    def func():
        s(); i32(); i32(); u8(); u8(); u8(); u8()
        code = [i32() & 0xFFFFFFFF for _ in range(i32())]
        k = []
        for _ in range(i32()):
            t = u8()
            if t == 3:
                v = struct.unpack_from("<d", b, p[0])[0]; p[0] += 8; k.append(int(v) if v == int(v) else v)
            else:
                k.append(None if t == 0 else bool(u8()) if t == 1 else s())
        for _ in range(i32()): func()
        for _ in range(i32()): i32()
        for _ in range(i32()): s(); i32(); i32()
        for _ in range(i32()): s()
        return code, k

    if b[:5] != b"\x1bLuaQ":
        raise SystemExit("navi_mob.lub isn't Lua 5.1 bytecode")
    code, k = func()
    G, reg, pc = {}, {}, 0
    rk = lambda x: k[x - 256] if x >= 256 else reg.get(x)
    while pc < len(code):
        i = code[pc]; pc += 1
        op, A, C, B, Bx = i & 0x3F, (i >> 6) & 0xFF, (i >> 14) & 0x1FF, (i >> 23) & 0x1FF, i >> 14
        if op == 0: reg[A] = reg.get(B)                       # MOVE
        elif op == 1: reg[A] = k[Bx]                          # LOADK
        elif op == 2: reg[A] = bool(B); pc += 1 if C else 0   # LOADBOOL
        elif op == 3: reg.update({j: None for j in range(A, B + 1)})  # LOADNIL
        elif op == 5: reg[A] = G.get(k[Bx])                   # GETGLOBAL
        elif op == 6: reg[A] = (reg.get(B) or {}).get(rk(C))  # GETTABLE
        elif op == 7: G[k[Bx]] = reg.get(A)                   # SETGLOBAL
        elif op == 9: reg[A][rk(B)] = rk(C)                   # SETTABLE
        elif op == 10: reg[A] = {}                            # NEWTABLE
        elif op == 34:                                        # SETLIST
            if C == 0: C = code[pc]; pc += 1
            for j in range(1, B + 1): reg[A][(C - 1) * 50 + j] = reg.get(A + j)
        elif op == 30: break                                  # RETURN
        else: raise SystemExit(f"navi_mob.lub: opcode {op} not handled")
    return G


def js_object(name, var):
    src = open(os.path.join(DATA, f"{name}.js"), encoding="utf-8").read()
    start = src.index("{", src.index(f"const {var}="))
    return json.loads(src[start:src.index("};", start) + 1])


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    navi = lua_data(grf_file(os.path.join(client, "data.grf"), NAVI))["Navi_Mob"]
    # entries: [map, uid, 300 mob / 301 boss, count << 16 | monster id, name, sprite, level, element/size/race]
    counts = {}
    for e in navi.values():
        mp, packed = e[1], e[4]
        c = counts.setdefault(mp, {})
        c[packed & 0xFFFF] = c.get(packed & 0xFFFF, 0) + (packed >> 16)

    names, old = js_object("maps", "MAPNAMES"), js_object("spawn", "SPAWN")
    src = open(os.path.join(DATA, "mobs.js"), encoding="utf-8").read()
    ours = {int(i) for i in old} | {int(x) for x in re.findall(r"\[(\d+),\s*\"", src[src.index("const MOBS="):])}
    maps = sorted(set(names) | {mp for v in old.values() for mp, *_ in v})
    zero = lambda c: re.sub(r"^mjolnir_(\d\d)$", r"mjo_f\1", re.sub(r"^prt_maze(\d\d)$", r"maz_d\1", re.sub(r"_fild(\d\d)$", r"_f\1", c)))
    codes = lambda mp: (lambda cs: cs + [z for z in map(zero, cs) if z not in cs])([(names.get(mp) or [mp])[0], *(names.get(mp) or [])[2:], mp])
    pick = lambda mp, sufs, pre="": next((pre + c + s for c in codes(mp) for s in sufs if pre + c + s in counts), None)
    table = lambda *keys: {m: sum(counts[k].get(m, 0) for k in keys if k) for k in keys if k for m in counts[k]}

    spawn, kept, dropped = {}, [], []
    for mp in maps:
        normal, pvp = pick(mp, ["", "_a", "_b", "_c", "_d"]), pick(mp, ["_z", "_y"])
        if not normal:
            kept.append(mp)
            for i, v in old.items():
                if any(x[0] == mp for x in v): spawn.setdefault(i, []).append([mp, None])
            continue
        n = table(normal, pick(mp, ["", "_a", "_b", "_c", "_d"], "b_"))
        z = table(pvp, pick(mp, ["_z", "_y"], "b_")) if pvp else {}
        for mid in sorted(set(n) | set(z)):
            if mid in ours:
                spawn.setdefault(str(mid), []).append([mp, n.get(mid, 0)] + ([z.get(mid, 0)] if pvp else []))
        for i, v in old.items():
            if any(x[0] == mp for x in v) and int(i) not in n and int(i) not in z:
                dropped.append(f"{i} on {mp}")
    spawn = {i: sorted(v, key=lambda x: -(x[1] or 0)) for i, v in sorted(spawn.items(), key=lambda x: int(x[0]))}
    with open(os.path.join(DATA, "spawn.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Spawn maps per monster id: [[map, count, PvP count], ...] from the official Global client's navigation table (navi_mob.lub): count on the "
                "normal channels (the map, _a to _d), PvP count on the PvP channels (_y/_z), left out when the table has none for the map. Maps the client "
                "doesn't list yet (regions not out) have [map, null]: the monster comes there, count not known yet. Written by tools/export_spawns.py\n")
        f.write("const SPAWN=" + json.dumps(spawn, separators=(",", ":")) + ";\n")
    print(f"{len(maps) - len(kept)} of {len(maps)} maps from the client, {sum(len(v) for v in spawn.values())} spawns")
    print("not in the client yet, no counts:", " ".join(kept))
    if dropped:
        print("not on that map in the client, removed:", ", ".join(dropped))


if __name__ == "__main__":
    main()
