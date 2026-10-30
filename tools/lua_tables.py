"""What a compiled Lua 5.1 data file sets, as data only: a small interpreter of its main function, for tables whose keys are other files' names, which export_spawns'
lua_data and lua51.py can't read alone. Nothing real runs: a global it doesn't know becomes a named placeholder (SKID.NF_DOUBLE, as a table key
"SKID.NF_DOUBLE"), a function becomes "function", and calls are never entered, so what a table builds inside a function isn't seen.
"""
import math, struct


class Sym(str):
    """A global the file reads but never sets, by name."""


def text(raw):
    """The client's strings are UTF-8, Korean or a few cp1252 ones."""
    for enc in ("utf-8", "cp949"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("cp1252", "replace")


def load(b):
    """{global: value}; Lua tables as dicts."""
    p = [12]

    def u8(): p[0] += 1; return b[p[0] - 1]
    def i32(): p[0] += 4; return struct.unpack_from("<i", b, p[0] - 4)[0]
    def s():
        n = struct.unpack_from("<I", b, p[0])[0]; p[0] += 4 + n
        return text(b[p[0] - n:p[0] - 1]) if n else None

    def func():
        s(); i32(); i32(); nups = u8(); u8(); u8(); u8()
        code = [i32() & 0xFFFFFFFF for _ in range(i32())]
        k = []
        for _ in range(i32()):
            t = u8()
            if t == 3:
                v = struct.unpack_from("<d", b, p[0])[0]; p[0] += 8
                k.append(int(v) if v == v and abs(v) != math.inf and v == int(v) else v)
            else:
                k.append(None if t == 0 else bool(u8()) if t == 1 else s())
        protos = [func() for _ in range(i32())]
        for _ in range(i32()): i32()
        for _ in range(i32()): s(); i32(); i32()
        for _ in range(i32()): s()
        return code, k, protos, nups

    if b[:5] != b"\x1bLuaQ":
        raise ValueError("not Lua 5.1 bytecode")
    code, k, protos, _ = func()
    G, reg, pc, steps = {}, {}, 0, 0
    rk = lambda x: k[x - 256] if x >= 256 else reg.get(x)
    key = lambda x: str(x) if isinstance(x, Sym) else x
    while pc < len(code) and steps < 20000000:
        steps += 1
        i = code[pc]; pc += 1
        op, A, C, B, Bx = i & 0x3F, (i >> 6) & 0xFF, (i >> 14) & 0x1FF, (i >> 23) & 0x1FF, i >> 14
        if op == 0: reg[A] = reg.get(B)                       # MOVE
        elif op == 1: reg[A] = k[Bx]                          # LOADK
        elif op == 2:                                         # LOADBOOL
            reg[A] = bool(B)
            if C: pc += 1
        elif op == 3: reg.update({j: None for j in range(A, B + 1)})  # LOADNIL
        elif op == 4: reg[A] = None                           # GETUPVAL
        elif op == 5: reg[A] = G[k[Bx]] if k[Bx] in G else Sym(str(k[Bx]))  # GETGLOBAL
        elif op == 6:                                         # GETTABLE
            t, x = reg.get(B), rk(C)
            reg[A] = t.get(key(x)) if isinstance(t, dict) else Sym(f"{t}.{x}") if isinstance(t, Sym) else None
        elif op == 7: G[k[Bx]] = reg.get(A)                   # SETGLOBAL
        elif op == 9:                                         # SETTABLE
            if isinstance(reg.get(A), dict): reg[A][key(rk(B))] = rk(C)
        elif op == 10: reg[A] = {}                            # NEWTABLE
        elif op == 11: reg[A + 1] = reg.get(B); reg[A] = Sym("self")  # SELF
        elif 12 <= op <= 17:                                  # ADD SUB MUL DIV MOD POW
            x, y = rk(B), rk(C)
            try:
                v = {12: lambda: x + y, 13: lambda: x - y, 14: lambda: x * y, 15: lambda: x / y, 16: lambda: x % y, 17: lambda: x ** y}[op]()
                reg[A] = int(v) if isinstance(v, float) and v == int(v) else v
            except (TypeError, ZeroDivisionError, OverflowError, ValueError):
                reg[A] = Sym(f"({x} op {y})")
        elif op == 18:                                        # UNM
            v = reg.get(B); reg[A] = -v if isinstance(v, (int, float)) else Sym(f"-{v}")
        elif op == 19: reg[A] = not reg.get(B)                # NOT
        elif op == 20:                                        # LEN
            v = reg.get(B); reg[A] = len(v) if hasattr(v, "__len__") else 0
        elif op == 21: reg[A] = "".join(str(reg.get(j)) for j in range(B, C + 1))  # CONCAT
        elif op == 22: pc += Bx - 131071                      # JMP
        elif op in (23, 24, 25, 26, 27): pc += 1              # comparisons and tests: never taken
        elif op == 28:                                        # CALL: the results are unknown
            for j in range(A, A + max(C - 1 if C else 1, 0)): reg[j] = None
        elif op in (29, 30, 31, 32, 33): break                # TAILCALL RETURN FORLOOP FORPREP TFORLOOP
        elif op == 34:                                        # SETLIST
            n = B
            if C == 0: C = code[pc]; pc += 1
            if n == 0: n = max([j for j in reg if j > A] + [A]) - A
            if isinstance(reg.get(A), dict):
                for j in range(1, n + 1): reg[A][(C - 1) * 50 + j] = reg.get(A + j)
        elif op == 36: reg[A] = Sym("function"); pc += protos[Bx][3]  # CLOSURE
    return G
