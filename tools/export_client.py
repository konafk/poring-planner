"""Lay the game client's own item data over the community database's: writes data/client.js and img/card-art-client.png from your
installed Ragnarok Zero client (official Global client, read-only), for the page to put on top of the database's data as it loads.

    python tools/export_client.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_client.py --client "D:\\Games\\RagnarokZero"

The database exports (equipment.js, cards.js, iteminfo.js, clientitems.js, icons.js) are refreshed every week from the internet, where
the client isn't, so what the client says goes in a file of its own that only this script writes. Wherever the client has it, it wins:
- text: every piece of gear's and card's in-game description (System\\iteminfo_enUS.lub), without the Type / DEF / Weight ... block,
  the rules and spacers, lines joined with spaces like the database's. The database's copies often stop before the refine lines.
- fix: where the client's name (unless another item already has it), card slots (System\\itemInfo_data.lub slotCount), required level, DEF, ATK, MATK or weapon level
  differ from the database's.
- gear: armour the database doesn't have yet, built from the client: slot from its Type / Position, the numbers from its stat block,
  card slots, and bonus lines read from its simple sentences (stat lists, "For every N refine levels", "At +N refine", "for each refine
  level above +N"); a sentence it can't read stays in the text only and is printed. Only "All Jobs" gear is built (the job lists of
  the rest would need reading), and weapons are left for the database, which has their weapon type; both are printed.
- items: items in the client that no data file has (new event items and cards, packages, costumes), with a category and their text in
  data/itemtext.js's form (tools/export_itemtext.py's clean).
- art: the client's pictures, as sheets like tools/export_icons.py's (img/<kind>-client.png): card pictures (data.grf's
  data\\num2cardillustnametable.txt gives each card id its picture's name, data\\texture\\유저인터페이스\\cardbmp\\<name>.bmp,
  300 x 400, shrunk), and gear and item icons (System\\itemInfo_data.lub gives each item its identifiedResourceName,
  data\\texture\\유저인터페이스\\item\\<name>.bmp, 24 x 24, magenta see-through). Anything the client has no picture for keeps the
  database's.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402
from export_icons import ROOT, CARD_W, CARD_H, CARD_COLS, GEAR_W, GEAR_H, GEAR_COLS, ITEM_COLS, ids, keys, pairs, shrink, sheet  # noqa: E402
from export_itemtext import clean  # noqa: E402

STAT = r"Type|Position|Weight|DEF|MDEF|ATK|MATK|Required Level|Equippable [Bb]y|Weapon Level|Element|Equipped on|Property|Range|Usable by"
STAT_RE = re.compile(rf"({STAT})\s*:\s*(.*?)(?=\s+(?:{STAT})\s*:|$)")
STAT_LINE = re.compile(rf"^(?:{STAT})\s*:")
SLOT = {"Garment": ["garment"], "Armor": ["armor"], "Shoes": ["footgear"], "Footgear": ["footgear"], "Shield": ["shield"],
        "Accessory": ["accessory_1", "accessory_2"]}
HEAD = {"Upper": "head_upper", "Middle": "head_middle", "Lower": "head_lower"}
# the names the client's bonus sentences use -> the bonus types data/equipment.js uses
STATS = {"MHP": "hp", "MaxHP": "hp", "MSP": "sp", "MaxSP": "sp", "ATK": "atk", "MATK": "matk", "M.ATK": "matk", "HIT": "hit", "FLEE": "flee",
         "CRIT": "crit", "DEF": "def", "MDEF": "mdef", "STR": "str", "AGI": "agi", "VIT": "vit", "INT": "int", "DEX": "dex", "LUK": "luk"}
PCT = {"variable casting time": "cast_time_variable_percent", "after attack delay": "attack_delay_percent"}


def rows(name, const):
    src = open(os.path.join(DATA, name), encoding="utf-8").read()
    return [x for x in json.JSONDecoder().raw_decode(src, src.index("[", src.index(f"const {const}=")))[0] if "id" in x]


def lines(v):
    d = v.get("identifiedDescriptionName") or {}
    return [re.sub(r"\^[0-9A-Fa-f]{6}", "", str(d[k])).strip() for k in sorted(d)]


def stats(ls):
    """The stat block's key -> value ("Type" -> "Garment", "DEF" -> "7")."""
    return {m.group(1).title().replace("By", "by"): m.group(2).strip() for line in ls if STAT_LINE.match(line) for m in STAT_RE.finditer(line)}


def desc(ls):
    """The description without the stat block, rules and spacers, joined with spaces (data/iteminfo.js's t)."""
    return re.sub(r"\s+", " ", " ".join(x for x in ls if x and x != "_" and not re.fullmatch(r"-+", x) and not STAT_LINE.match(x))).strip()


def num(s):
    m = re.match(r"\d+", s or "")
    return int(m.group()) if m else None


def bonus(sentence):
    """Bonus groups for one sentence, or None when it isn't one of the simple kinds."""
    def parts(s, per=None):
        out = []
        for p in re.split(r",\s*|\s+and\s+", s.strip().rstrip(".")):
            m = re.fullmatch(r"([A-Za-z.]+)\s*([+-]\d+)", p.strip())
            n = re.fullmatch(r"(?:reduces\s+)?([A-Za-z ]+?)\s+by\s+(\d+)%", p.strip(), re.I)
            if m and m.group(1) in STATS:
                out.append([STATS[m.group(1)], None, None, int(m.group(2))] + ([per] if per else []))
            elif n and n.group(1).lower() in PCT:
                out.append([PCT[n.group(1).lower()], None, None, -int(n.group(2))] + ([per] if per else []))
            else:
                return None
        return out
    s = sentence.strip()
    if m := re.fullmatch(r"At \+(\d+) refine or higher, (.+?) for each refine level above \+(\d+)\.?", s):
        b = parts(m.group(2), 1)
        # +1 per refine, less the refines up to +N: one group, so it reads "at +6: ATK +1 per refine, ATK -5"
        return b and [{"r": int(m.group(1)), "b": [y for x in b for y in (x, [x[0], None, None, -x[3] * int(m.group(3))])]}]
    if m := re.fullmatch(r"For every (\d+) refine levels?, (.+)", s):
        b = parts(m.group(2), int(m.group(1)))
        return b and [{"b": b}]
    if m := re.fullmatch(r"At \+(\d+) refine, (.+)", s):
        b = parts(m.group(2))
        return b and [{"r": int(m.group(1)), "b": b}]
    b = parts(s)
    return b and [{"b": b}]


def build(i, v, d, st):
    """An equipment.js row for gear the database doesn't have, and the sentences it couldn't read; None when it can't be built."""
    ty, pos = st.get("Type", ""), st.get("Position", "")
    slot = SLOT.get(ty) or ([HEAD[p.strip()] for p in pos.split("/") if p.strip() in HEAD] if ty == "Headgear" else None)
    if not slot or not re.fullmatch(r"all jobs", st.get("Equippable by", ""), re.I):
        return None, []
    name = v["identifiedDisplayName"].replace("’", "'")
    g, unread = [], []
    for sentence in re.split(r"(?<=\.)\s+", desc(lines(v))):
        b = bonus(sentence)
        if b:
            g += b
        elif re.search(r"[+-]\d|\d+%", sentence):
            unread.append(sentence)
    row = {"id": i, "slug": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") + f"-{i}", "name": name, "slot": slot,
           "slots": d.get("slotCount") or 0, "lv": num(st.get("Required Level")) or 0, "refine": "armor", "def": num(st.get("Def")) or 0,
           "g": g}  # no jobs: every job wears it
    return {k: x for k, x in row.items() if x not in (None, [], "")}, unread


def category(name, d, st):
    if st.get("Type") == "Card":
        return "Card"
    if d.get("costume") or name.startswith("[Costume]"):
        return "Costume"
    if name.endswith(" Egg"):
        return "Pet Egg"
    return "Package/Box" if re.search(r"\b(Package|Box|Pack|Bundle|Pouch)\b", name) else "ETC"


def card_names(grf):
    """{card id: picture name}, from the client's num2cardillustnametable.txt."""
    out = {}
    for line in grf.read("data\\num2cardillustnametable.txt").decode("cp949", "replace").splitlines():
        c = line.split("#")
        if len(c) > 1 and c[0].isdigit():
            out[int(c[0])] = c[1]
    return out


def pictures(grf, names, folder, opaque=False):
    """{id: (w, h, RGBA bytearray)} for each {id: picture name} the GRF has under texture\\유저인터페이스\\<folder>."""
    from export_minimaps import UI, bmp_rgba
    out = {}
    for i, n in names.items():
        bmp = UI + folder + "\\" + (n or "") + ".bmp"
        if n and grf.has(bmp):
            w, h, px = bmp_rgba(grf.read(bmp))
            out[i] = (w, h, bytearray(x for r in px for p in r for x in (*p[:3], 255 if opaque else p[3])))
    return out


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    info = lua_data(open(os.path.join(client, "System", "iteminfo_enUS.lub"), "rb").read(), "utf-8")["tbl_string"]
    data = lua_data(open(os.path.join(client, "System", "itemInfo_data.lub"), "rb").read(), "utf-8", lenient=True)["tbl_data"]
    eq, cards = rows("equipment.js", "EQUIP"), rows("cards.js", "CARDS")
    known = {e["id"] for e in eq} | {c["id"] for c in cards} | set(ids("equipment.js", "EQUIP"))
    known |= {i for f, c in [("items.js", "ITEMN"), ("recipes.js", "RECIPE_ITEMN"), ("consumables.js", "CONSUM"), ("recovery.js", "RECOVERY"),
                             ("clientitems.js", "CLIENT_ITEMS")] for i in keys(f, c)} | set(pairs("memorial.js"))
    cos = open(os.path.join(DATA, "costumes.js"), encoding="utf-8").read()
    known |= {int(i) for i in re.findall(r"[{,](\d+):\[", cos[cos.index("const COSTUMES="):])}  # its keys aren't quoted
    eq_ids, names = {e["id"] for e in eq}, {x["name"] for x in eq + cards}
    text, fix, gear, items, skipped, unread = {}, {}, [], {}, [], {}
    for x in eq + cards:
        v = info.get(x["id"])
        if not v:
            continue
        ls, d = lines(v), data.get(x["id"]) or {}
        t = desc(ls)
        if t:
            text[x["id"]] = t
        st, f = stats(ls), {}
        name = (v.get("identifiedDisplayName") or "").replace("’", "'")
        if name and name != x["name"] and name not in names:  # Bow Thimble [1]: the client calls both Bow Thimbles that
            f["name"] = name
        if x["id"] in eq_ids:
            if "slotCount" in d and d["slotCount"] != (x.get("slots") or 0):
                f["slots"] = d["slotCount"]
            for k, field in (("Required Level", "lv"), ("Def", "def"), ("Atk", "atk"), ("Matk", "matk"), ("Weapon Level", "wlv")):
                n = num(st.get(k))
                if n is not None and n != (x.get(field) or 0):
                    f[field] = n
        if f:
            fix[x["id"]] = f
    for i, v in sorted(info.items()):
        name = (v.get("identifiedDisplayName") or "").replace("’", "'")
        if i in known or not name:
            continue
        ls, d = lines(v), data.get(i) or {}
        st = stats(ls)
        if st.get("Type") in SLOT or st.get("Type") == "Headgear" or re.search(r"Weapon|Sword|Spear|Axe|Mace|Staff|Bow|Dagger|Katar|Book|Knuckle|Instrument|Whip", st.get("Type", "")) and "Weapon Level" in st:
            row, bad = build(i, v, d, st)
            if row:
                gear.append(row); text[i] = desc(ls)
                if bad:
                    unread[name] = bad
                continue
            skipped.append(f"{name} ({st.get('Type')})")
        items[i] = [name, category(name, d, st), clean(ls)]
    from export_minimaps import DesGrf
    wanted = {}
    grf, art, res = DesGrf(os.path.join(client, "data.grf")), {}, {i: d.get("identifiedResourceName") for i, d in data.items()}
    card_ids, gear_ids = [c["id"] for c in cards], [e["id"] for e in eq] + [g["id"] for g in gear]
    other = sorted(({i for f, c in [("items.js", "ITEMN"), ("recipes.js", "RECIPE_ITEMN"), ("consumables.js", "CONSUM"), ("recovery.js", "RECOVERY"),
                                    ("clientitems.js", "CLIENT_ITEMS")] for i in keys(f, c)} | set(pairs("memorial.js")) | set(items))
                   - set(card_ids) - set(gear_ids))
    # card pictures shrunk to their cell; icons as they are (24 x 24), and only when they're icon-sized
    for kind, want, names, folder, (W, H, cols), card in (
            # cards the database doesn't have yet (the Gatchaman event cards) get their picture too
            ("card", card_ids + [i for i, x in items.items() if x[1] == "Card"], card_names(grf), "cardbmp", (CARD_W, CARD_H, CARD_COLS), True),
            ("gear", gear_ids, res, "item", (GEAR_W, GEAR_H, GEAR_COLS), False),
            ("item", other, res, "item", (GEAR_W, GEAR_H, ITEM_COLS), False)):
        pics = pictures(grf, {i: names.get(i) for i in want}, folder, opaque=card)
        got = [i for i in want if i in pics and (card or pics[i][0] <= 32 and pics[i][1] <= 32)]
        file = f"img/{kind}-client.png"
        v = sheet([shrink(pics[i], W, H) if card else pics[i] for i in got], W, H, cols, os.path.join(ROOT, "img", f"{kind}-client.png"))
        art[kind] = {"file": file, "v": v, "w": W, "h": H, "cols": cols, "ids": got}
        wanted[kind] = len(want)
    # a new item with no icon in the client isn't out on Global yet (Fei-Chai Egg, Tai-zi Egg): left out
    unreleased = [items.pop(i)[0] for i in list(items) if i not in art["item"]["ids"]]
    if unreleased:
        print(f"  no icon in the client, left out: {', '.join(unreleased)}")
    out = {"text": text, "fix": fix, "gear": gear, "items": items, "art": art}
    with open(os.path.join(DATA, "client.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// The game client's own item data (tools/export_client.py, from the installed Global client), laid over the community database's\n"
                "// as the page loads: wherever the client has it, it wins. text: gear's and cards' in-game descriptions; fix: name, card slots, level,\n"
                "// DEF, ATK, MATK, weapon level where the database's differ; gear: armour the database doesn't have yet, as data/equipment.js rows;\n"
                "// items: other items no data file has, [name, category, in-game text]; art: the client's card pictures and gear and item icons\n"
                "// (sheets like data/icons.js's)\n")
        f.write("const CLIENT=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
        f.write("(function(){const has=new Set(EQUIP.map(e=>e.id));CLIENT.gear.forEach(r=>{if(!has.has(r.id))EQUIP.push(r)});\n"
                "  const byId=new Map([...EQUIP,...CARDS].map(x=>[x.id,x]));Object.entries(CLIENT.fix).forEach(([id,f])=>{const x=byId.get(+id);if(x)Object.assign(x,f)});\n"
                "  Object.entries(CLIENT.text).forEach(([id,t])=>{ITEM_INFO[id]=Object.assign(ITEM_INFO[id]||{},{t})});\n"
                "  Object.entries(CLIENT.items).forEach(([id,[n,c,t]])=>{if(!CLIENT_ITEMS[id])CLIENT_ITEMS[id]=[n,c];if(t&&!ITEM_TEXT[id])ITEM_TEXT[id]=t});\n"
                "  // the database's sheets stay as the fallback for what the client has no picture for (js/build-ui.js iconHtml)\n"
                "  Object.entries(CLIENT.art).forEach(([k,s])=>{if(s.ids.length){ICON_SHEETS[k+\"Db\"]=ICON_SHEETS[k];ICON_SHEETS[k]=s}})})();\n")
    print(f"{len(text)} texts, {len(fix)} fixes, {len(gear)} new gear ({', '.join(g['name'] for g in gear)}), {len(items)} new items; pictures: "
          + ", ".join(f"{len(s['ids'])} of {wanted[k]} {k}" for k, s in art.items()))
    for k in ("name", "slots", "lv", "def", "atk", "matk", "wlv"):
        n = [f"{i}" for i, f in fix.items() if k in f]
        if n:
            print(f"  {k} differs: {len(n)} ({', '.join(n[:15])}{'…' if len(n) > 15 else ''})")
    for name, bad in unread.items():
        print(f"  {name}: not read into bonus lines: {' | '.join(bad)}")
    if skipped:
        print(f"  gear left for the database: {', '.join(skipped)}")


if __name__ == "__main__":
    main()
