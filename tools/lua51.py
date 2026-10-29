"""Run the game client's compiled Lua 5.1 data files (data.grf's lua files\\datainfo\\*.lub, which are bytecode, not text): load the
bytecode and run it on a small virtual machine that knows what those files do: build tables, look things up, compare, branch, loop and
call their own functions. What a file sets is left in the globals dict, so a file can use what an earlier one set (accname.lub uses
accessoryid.lub's ACCESSORY_IDs). Standard library only.

    g = {}
    run(grf.read("...\\accessoryid.lub"), g); run(grf.read("...\\accname.lub"), g)
    g["AccNameTable"][g["ACCESSORY_IDs"]["ACCESSORY_BUNNYBAND"]]  # "_토끼머리띠"
    call(g["IsTopLayer"], [robe id])                               # a function the file defines
"""
import struct

# Lua 5.1's opcodes, in its order
(MOVE, LOADK, LOADBOOL, LOADNIL, GETUPVAL, GETGLOBAL, GETTABLE, SETGLOBAL, SETUPVAL, SETTABLE, NEWTABLE, SELF, ADD, SUB, MUL, DIV, MOD,
 POW, UNM, NOT, LEN, CONCAT, JMP, EQ, LT, LE, TEST, TESTSET, CALL, TAILCALL, RETURN, FORLOOP, FORPREP, TFORLOOP, SETLIST, CLOSE,
 CLOSURE, VARARG) = range(38)
FIELDS_PER_FLUSH = 50


class Proto:
    """One compiled function: its instructions, constants and the functions inside it."""
    def __init__(self, code, k, protos, nups, nparams):
        self.code, self.k, self.protos, self.nups, self.nparams = code, k, protos, nups, nparams


class Closure:
    def __init__(self, p, ups, g):
        self.p, self.ups, self.g = p, ups, g


def load(b):
    """The main function of a Lua 5.1 bytecode file (4-byte ints, sizes and instructions, 8-byte numbers, little-endian)."""
    if b[:5] != b"\x1bLuaQ" or b[6:12] != b"\x01\x04\x04\x04\x08\x00":
        raise ValueError("not Lua 5.1 bytecode in the client's format")
    p = 12

    def i32():
        nonlocal p
        v, = struct.unpack_from("<i", b, p); p += 4; return v

    def string():
        nonlocal p
        n = i32()
        if not n:
            return None
        s = b[p:p + n - 1]; p += n
        for enc in ("utf-8", "cp949", "latin-1"):
            try:
                return s.decode(enc)
            except UnicodeDecodeError:
                pass

    def func():
        nonlocal p
        string(); i32(); i32()
        nups, nparams = b[p], b[p + 1]; p += 4
        n = i32(); code = list(struct.unpack_from(f"<{n}I", b, p)); p += 4 * n
        k = []
        for _ in range(i32()):
            t = b[p]; p += 1
            if t == 0:
                k.append(None)
            elif t == 1:
                k.append(bool(b[p])); p += 1
            elif t == 3:
                v, = struct.unpack_from("<d", b, p); p += 8; k.append(int(v) if v == int(v) else v)
            elif t == 4:
                k.append(string())
            else:
                raise ValueError(f"constant type {t}")
        protos = [func() for _ in range(i32())]
        n = i32(); p += 4 * n                            # line numbers
        for _ in range(i32()):                           # local names
            string(); i32(); i32()
        for _ in range(i32()):                           # upvalue names
            string()
        return Proto(code, k, protos, nups, nparams)
    return func()


def _ipairs(t):
    return (lambda t, i: (i + 1, t[i + 1]) if (i + 1) in t else (None,)), t, 0


def _pairs(t):
    ks = list(t)
    return (lambda t, k: (ks[ks.index(k) + 1], t[ks[ks.index(k) + 1]]) if k is not None and ks.index(k) + 1 < len(ks)
            else ((ks[0], t[ks[0]]) if k is None and ks else (None,))), t, None


# the few standard functions the client's data files call
BUILTINS = {"ipairs": _ipairs, "pairs": _pairs, "type": lambda v: "table" if isinstance(v, dict) else "string" if isinstance(v, str)
            else "number" if isinstance(v, (int, float)) and not isinstance(v, bool) else "boolean" if isinstance(v, bool)
            else "nil" if v is None else "function", "tostring": lambda v: str(_key(v)), "tonumber": lambda v: _key(float(v))}


def run(b, g):
    """Run a bytecode file with globals g (a dict it adds to, with BUILTINS where it has none of its own); returns g."""
    for k, f in BUILTINS.items():
        g.setdefault(k, f)
    call(Closure(load(b), [], g), [])
    return g


def _key(v):
    return int(v) if isinstance(v, float) and v == int(v) else v


def call(f, args):
    """Call a function a file defined (or a Python one in its globals) with args; returns the list of what it returns."""
    if callable(f):
        r = f(*args)
        return list(r) if isinstance(r, tuple) else [r]
    p, g, ups = f.p, f.g, f.ups
    R = list(args[:p.nparams]) + [None] * 256
    top, pc = None, 0

    def rk(x):
        return p.k[x & 0xFF] if x & 0x100 else R[x]

    def index(t, k):
        if isinstance(t, dict):
            return t.get(_key(k))
        if isinstance(t, str) and k == "len":
            return len
        return None

    while True:
        i = p.code[pc]; pc += 1
        op, a, c, b_ = i & 0x3F, (i >> 6) & 0xFF, (i >> 14) & 0x1FF, (i >> 23) & 0x1FF
        bx = (i >> 14) & 0x3FFFF; sbx = bx - 131071
        if op == MOVE: R[a] = R[b_]
        elif op == LOADK: R[a] = p.k[bx]
        elif op == LOADBOOL:
            R[a] = bool(b_)
            if c: pc += 1
        elif op == LOADNIL:
            for r in range(a, b_ + 1): R[r] = None
        elif op == GETUPVAL: R[a] = ups[b_][0]
        elif op == GETGLOBAL: R[a] = g.get(p.k[bx])
        elif op == GETTABLE: R[a] = index(R[b_], rk(c))
        elif op == SETGLOBAL: g[p.k[bx]] = R[a]
        elif op == SETUPVAL: ups[b_][0] = R[a]
        elif op == SETTABLE: R[a][_key(rk(b_))] = rk(c)
        elif op == NEWTABLE: R[a] = {}
        elif op == SELF: R[a + 1] = R[b_]; R[a] = index(R[b_], rk(c))
        elif op in (ADD, SUB, MUL, DIV, MOD, POW):
            x, y = rk(b_), rk(c)
            R[a] = _key({ADD: lambda: x + y, SUB: lambda: x - y, MUL: lambda: x * y, DIV: lambda: x / y, MOD: lambda: x % y, POW: lambda: x ** y}[op]())
        elif op == UNM: R[a] = -R[b_]
        elif op == NOT: R[a] = R[b_] is None or R[b_] is False
        elif op == LEN:
            t = R[b_]; n = 0
            if isinstance(t, dict):
                while (n + 1) in t: n += 1
            else:
                n = len(t)
            R[a] = n
        elif op == CONCAT: R[a] = "".join(str(_key(R[r])) for r in range(b_, c + 1))
        elif op == JMP: pc += sbx
        elif op in (EQ, LT, LE):
            x, y = rk(b_), rk(c)
            r = x == y if op == EQ else (x < y if op == LT else x <= y)
            if r != bool(a): pc += 1
        elif op == TEST:
            if (R[a] is not None and R[a] is not False) != bool(c): pc += 1
        elif op == TESTSET:
            if (R[b_] is not None and R[b_] is not False) == bool(c): R[a] = R[b_]
            else: pc += 1
        elif op in (CALL, TAILCALL):
            n = (b_ - 1) if b_ else top - a - 1
            res = call(R[a], R[a + 1:a + 1 + n])
            if op == TAILCALL:
                return res
            if c:
                for j in range(c - 1): R[a + j] = res[j] if j < len(res) else None
            else:
                for j, v in enumerate(res): R[a + j] = v
                top = a + len(res)
        elif op == RETURN:
            n = (b_ - 1) if b_ else top - a
            return R[a:a + n]
        elif op == FORPREP:
            R[a] = R[a] - R[a + 2]; pc += sbx
        elif op == FORLOOP:
            R[a] += R[a + 2]
            if (R[a] <= R[a + 1]) if R[a + 2] > 0 else (R[a] >= R[a + 1]):
                pc += sbx; R[a + 3] = R[a]
        elif op == TFORLOOP:
            res = call(R[a], [R[a + 1], R[a + 2]])
            for j in range(c): R[a + 3 + j] = res[j] if j < len(res) else None
            if R[a + 3] is not None: R[a + 2] = R[a + 3]
            else: pc += 1
        elif op == SETLIST:
            n = b_ if b_ else top - a - 1
            if not c:
                c = p.code[pc]; pc += 1
            for j in range(1, n + 1): R[a][(c - 1) * FIELDS_PER_FLUSH + j] = R[a + j]
        elif op == CLOSE: pass
        elif op == CLOSURE:
            q = p.protos[bx]; nu = []
            for _ in range(q.nups):
                pi = p.code[pc]; pc += 1
                # MOVE shares a local of this function (as a one-item cell), GETUPVAL passes one of ours on
                nu.append([R[(pi >> 23) & 0x1FF]] if pi & 0x3F == MOVE else ups[(pi >> 23) & 0x1FF])
            R[a] = Closure(q, nu, g)
        elif op == VARARG:
            n = (b_ - 1) if b_ else len(args) - p.nparams
            extra = list(args[p.nparams:])
            for j in range(n): R[a + j] = extra[j] if j < len(extra) else None
            top = a + n
        else:
            raise ValueError(f"opcode {op} isn't handled")
