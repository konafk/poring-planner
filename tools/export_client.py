"""Lay the game client's own item and monster data over the community database's: writes data/client.js and img/*-client.png from your
installed Ragnarok Zero client (official Global client, read-only), for the page to put on top of the database's data as it loads.

    python tools/export_client.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_client.py --client "D:\\Games\\RagnarokZero"

The database exports (equipment.js, cards.js, iteminfo.js, clientitems.js, icons.js) are refreshed every week from the internet, where
the client isn't, so what the client says goes in a file of its own that only this script writes. Wherever the client has it, it wins:
- text: every piece of gear's and card's in-game description (System\\iteminfo_enUS.lub), without the Type / DEF / Weight ... block,
  the rules and spacers, lines joined with spaces like the database's. The database's copies often stop before the refine lines.
- fix: where the client's name (unless another item already has it), card slots (System\\itemInfo_data.lub slotCount), required level, DEF, ATK, MATK or weapon level
  differ from the database's.
- lines: bonus lines an item's client text has that its database lines don't (missing(): flat stat lines, mostly), added to it.
- cards: cards the database doesn't have yet (the Gatchaman event cards), as data/cards.js rows (card_row()).
- gear: armour the database doesn't have yet, built from the client: slot from its Type / Position, the numbers from its stat block,
  card slots, and bonus lines read from its simple sentences (stat lists, "For every N refine levels", "At +N refine", "for each refine
  level above +N"); a sentence it can't read stays in the text only and is printed. Only "All Jobs" gear is built (the job lists of
  the rest would need reading), and weapons are left for the database, which has their weapon type; both are printed.
- items: items in the client that no data file has (new event items and cards, packages, costumes), with a category and their text in
  data/itemtext.js's form (tools/export_itemtext.py's clean).
- mobs: monsters the database doesn't have yet that were asked for (CLIENT_MOBS: the Clock Tower basement bosses), from the client's
  spawn table (data.grf's navi_mob.lub): name, level, element, size, race and where they spawn. The client has no HP, EXP or drops,
  so those stay unknown and the farm tables leave them out. The other monsters it has and the database doesn't (plants, Knight
  Porings, the Solid / Furious / ... champions, event monsters) stay out, as before.
- mobLv: every monster the client spawns, [name, level]: the monster list takes the client's level, and the drop lists name each
  monster as the monster list does (or as the client does, for one the list doesn't have) with its level.
- recipes: the headgear NPCs craft (npc_recipes(): Februs's from the dialogue, the Hat Maker's from the quest log), as
  data/recipes.js's NPC rows in a Headgear category, for the Recipes tab and each item's details.
- drops: drops seen in game that neither the client nor the database lists (DROPS, kept by hand), rate unknown. They go on the monster's
  drop list and the item's Where to get it, and a row the database has for the same item and monster wins, so a published rate shows.
- art: the client's pictures, as sheets like tools/export_icons.py's (img/<kind>-client.png): card pictures (data.grf's
  data\\num2cardillustnametable.txt gives each card id its picture's name, data\\texture\\유저인터페이스\\cardbmp\\<name>.bmp,
  300 x 400, shrunk), and gear and item icons (System\\itemInfo_data.lub gives each item its identifiedResourceName,
  data\\texture\\유저인터페이스\\item\\<name>.bmp, 24 x 24, magenta see-through), and monster pictures (each spawned monster's
  standing sprite, data\\sprite\\몬스터\\<sprite>.spr / .act with the sprite name from navi_mob.lub, drawn as tools/export_sprites.py
  draws a body and fitted to MOB_W x MOB_H). Anything the client has no picture for keeps the database's.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402
from export_icons import (ROOT, CARD_W, CARD_H, CARD_COLS, GEAR_W, GEAR_H, GEAR_COLS, ITEM_COLS, MOB_W, MOB_H, MOB_COLS,  # noqa: E402
                          ids, keys, pairs, shrink, sheet, fit)
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
CLIENT_MOBS = {20175, 20176, 20177, 20178, 20179}  # Extra Joker, Erzsebet, Jeniffer, Orc General, Sieglouse
DROPS = {480999: [20178], 481000: [1211], 481001: [1269]}  # item id -> monsters, seen in game: General's Cape from Orc General, Hunter's Cape from Brilight, Rotating Gear from Clock
# navi_mob.lub's element numbers -> data/elem.js's names; sizes S M L; races in data/sizes.js's RACES order
ELEMENTS = ["Neutral", "Water", "Earth", "Fire", "Wind", "Poison", "Holy", "Shadow", "Ghost", "Undead"]
RACES = ["Formless", "Undead", "Brute", "Plant", "Insect", "Fish", "Demon", "Demi-Human", "Angel", "Dragon"]
MOB_SPR = "data\\sprite\\몬스터\\"
HD = 2  # card and monster pictures are stored at twice the size the page shows them; the sheet's hd says so (js/build-ui.js iconHtml)


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


def line_key(g, b):
    return (g.get("r") or 0, *b[:4], (b[4] if len(b) > 4 else None) or None)


def missing(t, x):
    """Bonus groups the client's text has and the item's lines don't: the database's often leave out a flat stat line (Clock Tower
    headgear's ATK / MATK +20, a card's INT +1 next to its class line). Only the sentences bonus() reads, and only before "※" (the
    siege-only options), and only sentences that end in a full stop; a line the item has unconditionally, or as its ATK / MATK / DEF / MDEF column, isn't added again."""
    have = {line_key(g, b) for g in x.get("g") or [] if not (g.get("cls") or g.get("lv") or g.get("rs") or g.get("lvPer")) for b in g.get("b", [])}
    flat = {(k, x.get(k)) for k in ("atk", "matk", "def", "mdef") if x.get(k)}
    out = []
    for s in re.split(r"(?<=\.)\s+", (t or "").split("※")[0]):
        # a sentence with no full stop runs into the next ("At refine level 7, ATK +18. MATK +65"): not read
        for g in (bonus(s) if s.strip().endswith(".") else None) or []:
            b = [b for b in g["b"] if line_key(g, b) not in have and not (not g.get("r") and len(b) < 5 and (b[0], b[3]) in flat)]
            if b:
                out.append({**g, "b": b})
    return out


CARD_SLOT = {"Weapon": "weapon", "Armor": "armor", "Shield": "shield", "Garment": "garment", "Shoes": "footgear", "Footgear": "footgear",
             "Accessory": "accessory_1", "Headgear": "head_upper"}


def affixes(grf):
    """{card id: [the name it gives gear, "prefix" | "suffix"]}, from the client's cardprefixnametable_enus.txt (cardpostfixnametable.txt
    lists the ones that go after the item's name). Only for cards the database doesn't have: for the rest the tables don't say clearly
    enough how the game builds the name (Crab Card's "of Cancer" listed as a prefix, Cookie Card's bare "Chance"), so data/cards.js's stay."""
    post = {int(l.split("#")[0]) for l in grf.read("data\\cardpostfixnametable.txt").decode("utf-8", "replace").splitlines() if l.split("#")[0].isdigit()}
    out = {}
    for line in grf.read("data\\cardprefixnametable_enus.txt").decode("utf-8", "replace").splitlines():
        c = line.split("#")
        if len(c) > 1 and c[0].isdigit() and c[1]:
            out[int(c[0])] = [c[1], "suffix" if int(c[0]) in post else "prefix"]
    return out


def card_row(i, v, st, affix):
    """A data/cards.js row for a card the database doesn't have yet: its slot from "Equipped on" / "Equippable by", bonus lines from
    its text up to "[Event-Limited Option]" (an event's options go when it ends, so they stay text only), "For every 10 BaseLv, ...
    (Applies up to BaseLv 50.)" as lvPer / lvMax."""
    slot = CARD_SLOT.get(st.get("Equipped On") or st.get("Equippable by") or "")
    if not slot:
        return None
    name, t = v["identifiedDisplayName"].replace("’", "'"), desc(lines(v)).split("[Event-Limited Option]")[0]
    g, cap = [], re.search(r"Applies up to BaseLv (\d+)", t)
    for s in re.split(r"(?<=\.)\s+", t):
        if m := re.fullmatch(r"For every (\d+) BaseLv, (.+)", re.sub(r"([+-]) (\d)", r"\1\2", s.strip())):
            b = bonus(m.group(2))
            if b:
                g.append({"lvPer": int(m.group(1)), **({"lvMax": int(cap.group(1))} if cap else {}), "b": b[0]["b"]})
        elif b := bonus(s):
            g += b
    row = {"id": i, "slug": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") + f"-{i}", "name": name, "slot": [slot], "slots": 0, "lv": 0,
           "wlv": 0, "g": g, **({"affix": affix[0], "affixPos": affix[1]} if affix else {})}
    return {k: x for k, x in row.items() if x not in (None, [], "")}


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


def scaled(img, W, H):
    """img at W x H: area-averaged down, or each pixel repeated up (a small sprite is pixel art, so it stays crisp)."""
    w, h, px = img
    if W <= w and H <= h:
        return shrink(img, W, H)
    out = bytearray(W * H * 4)
    for y in range(H):
        for x in range(W):
            s = ((y * h // H) * w + x * w // W) * 4; o = (y * W + x) * 4
            out[o:o + 4] = px[s:s + 4]
    return W, H, out


ITEM_TAG = re.compile(r"<ITEM>\[.*?\]<INFO>(\d+)</INFO></ITEM>")  # a name can hold brackets itself: "[Clock Casket[1]]"


def npc_at(name):
    """Where data/navi.js puts an NPC: "map x,y" (the first it finds), or None."""
    src = open(os.path.join(DATA, "navi.js"), encoding="utf-8").read()
    npcs = json.JSONDecoder().raw_decode(src, src.index("{", src.index("const NAVI_NPCS=")))[0]
    return next((f"{m} {r[1]},{r[2]}" for m, rs in npcs.items() for r in rs if r[0] == name), None)


def npc_recipes(grf, client):
    """The headgear NPCs craft, as data/recipes.js's NPC rows (cat Headgear): from the client's NPC dialogue (data\\i18n\\sc\\*.csv,
    the lines the server sends by key), "[Februs] / You mean the <ITEM>..</ITEM>. / Here's the material estimate. / <ITEM>..</ITEM> xN
    ... / A crafting fee of 50,000z is required.", and from the quest log (System\\OngoingQuestInfoList_enUS.lub), "The <NAVI>[Hat
    Maker]<INFO>map,x,y..</INFO></NAVI> ... if you need <ITEM>..</ITEM> ... Bring 1 <ITEM>..</ITEM>, 100 <ITEM>..</ITEM> ...", with
    where the NPC is from data/navi.js (or the quest's NAVI tag)."""
    import base64
    out, offered = {}, {}
    for f in (n for n in grf.ents if n.startswith("data\\i18n\\sc\\") and n.endswith(".csv")):
        for line in grf.read(f).decode("utf-8", "replace").splitlines():
            c = line.split(",")
            if len(c) < 3 or not c[2]:
                continue
            t = base64.b64decode(c[2]).decode("utf-8", "replace")
            # the NPC's list of what it makes now: Februs has two, the full menu's (Tip Box links to all five) and one with item links
            # (Clock Casket, Black Witch Hat), which is what Global offers (seen in game, 29 October 2026)
            a = re.match(r"\[([^\]]+)\]\s*Here.s the list of items available for commission\.(.*)", t.replace("\n", " "))
            if a and ITEM_TAG.search(a.group(2)):
                offered.setdefault(a.group(1), set()).update(int(i) for i in ITEM_TAG.findall(a.group(2)))
            m = re.match(r"\[([^\]]+)\]\s*You mean the " + ITEM_TAG.pattern + r"\.\s*Here.s the material estimate\.(.*?)A crafting fee of ([\d,]+)z",
                         t.replace("\n", " "))
            if m:
                mats = [[int(i), int(n)] for i, n in re.findall(ITEM_TAG.pattern + r"\s*x(\d+)", m.group(3))]
                out[(m.group(1), int(m.group(2)))] = {"cat": "Headgear", "type": "npc", "id": int(m.group(2)), "n": 1, "lv": None, "mats": mats,
                                                       "fee": int(m.group(4).replace(",", "")), "npc": [m.group(1), npc_at(m.group(1))]}
    quests = lua_data(open(os.path.join(client, "System", "OngoingQuestInfoList_enUS.lub"), "rb").read(), "utf-8")["QuestInfoList_string"]
    for q in quests.values():
        t = " ".join(str(x) for x in (q.get("Description") or {}).values())
        m = re.search(r"<NAVI>\[([^\]]+)\]<INFO>(\w+),(\d+),(\d+)[^<]*</INFO></NAVI>.*?if you need " + ITEM_TAG.pattern + r".*?Bring (.*)", t)
        if m:
            mats = [[int(i), int(n)] for n, i in re.findall(r"(\d+) " + ITEM_TAG.pattern, m.group(6))]
            out[(m.group(1), int(m.group(5)))] = {"cat": "Headgear", "type": "npc", "id": int(m.group(5)), "n": 1, "lv": None, "mats": mats,
                                                   "npc": [m.group(1), npc_at(m.group(1)) or f"{m.group(2)} {m.group(3)},{m.group(4)}"]}
    # an NPC with an item-linked list only makes what's on it; the rest of its recipes are in the client for later
    later = sorted(r["id"] for (npc, i), r in out.items() if npc in offered and i not in offered[npc])
    if later:
        print(f"  in the dialogue but not offered yet, left out: {later}")
    return [{k: x for k, x in r.items() if x is not None or k == "lv"} for (npc, i), r in sorted(out.items())
            if npc not in offered or i in offered[npc]]


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


def monsters(grf, path):
    """{monster id: {name, lv, el, elv, size, race, sprite, spawn: {map key: count}}} from navi_mob.lub, for every monster it spawns on
    a map in data/maps.js (the most on one normal channel). Rows: [map, uid, 300 / 301, count << 16 | id, name code, sprite, level,
    (element level * 20 + element) << 16 | size << 8 | race]."""
    from export_spawns import NAVI
    from export_mobnames import english
    src = open(os.path.join(DATA, "maps.js"), encoding="utf-8").read()
    maps = json.JSONDecoder().raw_decode(src, src.index("{", src.index("const MAPNAMES=")))[0]
    key = {c: k for k, v in maps.items() for c in [k, v[0], *v[2:]]}
    en, out = english(path), {}
    for e in lua_data(grf.read(NAVI))["Navi_Mob"].values():
        i, n, table = e[4] & 0xFFFF, e[4] >> 16, re.sub(r"^b_", "", e[1])
        k = key.get(table) or key.get(re.sub(r"_a$", "", table))
        if not i or not k:
            continue
        v = e[8]
        m = out.setdefault(i, {"name": en.get(e[5].strip("\x1c"), e[5]), "lv": e[7], "el": ELEMENTS[(v >> 16) % 20], "elv": (v >> 16) // 20,
                                "size": "SML"[(v >> 8) & 0xFF], "race": RACES[v & 0xFF], "sprite": e[6], "spawn": {}})
        m["spawn"][k] = max(m["spawn"].get(k, 0), n)
    return out


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    info = lua_data(open(os.path.join(client, "System", "iteminfo_enUS.lub"), "rb").read(), "utf-8")["tbl_string"]
    data = lua_data(open(os.path.join(client, "System", "itemInfo_data.lub"), "rb").read(), "utf-8", lenient=True)["tbl_data"]
    eq, cards = rows("equipment.js", "EQUIP"), rows("cards.js", "CARDS")
    from export_minimaps import DesGrf
    affix, new_cards = affixes(DesGrf(os.path.join(client, "data.grf"))), []
    known = {e["id"] for e in eq} | {c["id"] for c in cards} | set(ids("equipment.js", "EQUIP"))
    known |= {i for f, c in [("items.js", "ITEMN"), ("recipes.js", "RECIPE_ITEMN"), ("consumables.js", "CONSUM"), ("recovery.js", "RECOVERY"),
                             ("clientitems.js", "CLIENT_ITEMS")] for i in keys(f, c)} | set(pairs("memorial.js"))
    cos = open(os.path.join(DATA, "costumes.js"), encoding="utf-8").read()
    known |= {int(i) for i in re.findall(r"[{,](\d+):\[", cos[cos.index("const COSTUMES="):])}  # its keys aren't quoted
    eq_ids, names = {e["id"] for e in eq}, {x["name"] for x in eq + cards}
    text, fix, gear, items, skipped, unread, extra = {}, {}, [], {}, [], {}, {}
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
        add = missing(t, x)
        if add:
            extra[x["id"]] = add
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
        if items[i][1] == "Card" and (row := card_row(i, v, st, affix.get(i))):
            new_cards.append(row); text[i] = desc(ls)
    from export_minimaps import DesGrf
    wanted = {}
    grf, art, res = DesGrf(os.path.join(client, "data.grf")), {}, {i: d.get("identifiedResourceName") for i, d in data.items()}
    card_ids, gear_ids = [c["id"] for c in cards], [e["id"] for e in eq] + [g["id"] for g in gear]
    other = sorted(({i for f, c in [("items.js", "ITEMN"), ("recipes.js", "RECIPE_ITEMN"), ("consumables.js", "CONSUM"), ("recovery.js", "RECOVERY"),
                                    ("clientitems.js", "CLIENT_ITEMS")] for i in keys(f, c)} | set(pairs("memorial.js")) | set(items))
                   - set(card_ids) - set(gear_ids))
    # card pictures shrunk to their cell, at HD times the size the page shows them (sharp on high-DPI screens); icons as they are
    # (24 x 24, the client has none bigger), and only when they're icon-sized
    for kind, want, names, folder, (W, H, cols), card in (
            # cards the database doesn't have yet (the Gatchaman event cards) get their picture too
            ("card", card_ids + [i for i, x in items.items() if x[1] == "Card"], card_names(grf), "cardbmp", (CARD_W, CARD_H, CARD_COLS), True),
            ("gear", gear_ids, res, "item", (GEAR_W, GEAR_H, GEAR_COLS), False),
            ("item", other, res, "item", (GEAR_W, GEAR_H, ITEM_COLS), False)):
        pics = pictures(grf, {i: names.get(i) for i in want}, folder, opaque=card)
        got = [i for i in want if i in pics and (card or pics[i][0] <= 32 and pics[i][1] <= 32)]
        file, k = f"img/{kind}-client.png", HD if card else 1
        v = sheet([shrink(pics[i], W * k, H * k) if card else pics[i] for i in got], W * k, H * k, cols, os.path.join(ROOT, "img", f"{kind}-client.png"))
        art[kind] = {"file": file, "v": v, "w": W, "h": H, "cols": cols, "ids": got, **({"hd": k} if k > 1 else {})}
        wanted[kind] = len(want)
    # a new item with no icon in the client isn't out on Global yet (Fei-Chai Egg, Tai-zi Egg): left out
    unreleased = [items.pop(i)[0] for i in list(items) if i not in art["item"]["ids"]]
    if unreleased:
        print(f"  no icon in the client, left out: {', '.join(unreleased)}")
    # monsters: the new ones asked for, and a picture of every one the client spawns (the planner's too)
    from export_sprites import draw, crop
    src = open(os.path.join(DATA, "mobs.js"), encoding="utf-8").read()
    ours = [int(k) for k in re.findall(r'\[(\d+),\s*"', src[src.index("const MOBS="):src.index("].map(")])]
    spawned = monsters(grf, os.path.join(client, "data.grf"))
    mobs = [{"id": i, **{k: x for k, x in spawned[i].items() if k not in ("sprite", "spawn")},
             "spawn": sorted(([k, n] for k, n in spawned[i]["spawn"].items()), key=lambda x: -x[1])}
            for i in sorted(CLIENT_MOBS - set(ours)) if i in spawned]
    pics, got = [], []
    for i in ours + [m["id"] for m in mobs]:
        base = MOB_SPR + (spawned[i]["sprite"] or "").lower() if i in spawned else ""
        if base and grf.has(base + ".spr") and grf.has(base + ".act"):
            img, _ = draw(grf.read(base + ".spr"), grf.read(base + ".act"))
            if img:
                w, h, px, _, _ = crop(img)
                # the size the page shows it (fitted to MOB_W x MOB_H, never enlarged), drawn at HD times that
                k = min(1, MOB_W / w, MOB_H / h)
                pics.append(scaled((w, h, px), max(1, round(w * k * HD)), max(1, round(h * k * HD)))); got.append(i)
    art["mob"] = {"file": "img/mob-client.png", "v": sheet(pics, MOB_W * HD, MOB_H * HD, MOB_COLS, os.path.join(ROOT, "img", "mob-client.png")),
                  "w": MOB_W, "h": MOB_H, "cols": MOB_COLS, "ids": got, "hd": HD}
    wanted["mob"] = len(ours) + len(mobs)
    # every monster the client spawns: [name, level], for the monster list's levels and the drop lists (the database's are often another
    # server's: Baphomet Lv 105 for the client's 81, Extra Joker 126 for 105)
    mob_lv = {i: [m["name"], m["lv"]] for i, m in sorted(spawned.items())}
    recipes = npc_recipes(grf, client)
    # the names of what they make and use, as the client has them, for the Recipes tab (data/recipes.js's RECIPE_ITEMN lacks some)
    recipe_names = {i: (info[i].get("identifiedDisplayName") or "").replace("’", "'") for r in recipes for i in [r["id"], *(m[0] for m in r["mats"])]
                    if i in info}
    out = {"text": text, "fix": fix, "lines": extra, "gear": gear, "cards": new_cards, "items": items, "mobs": mobs, "mobLv": mob_lv,
           "recipes": recipes, "recipeNames": recipe_names, "drops": DROPS, "art": art}
    with open(os.path.join(DATA, "client.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// The game client's own item data (tools/export_client.py, from the installed Global client), laid over the community database's\n"
                "// as the page loads: wherever the client has it, it wins. text: gear's and cards' in-game descriptions; fix: name, card slots, level,\n"
                "// DEF, ATK, MATK, weapon level where the database's differ; gear: armour the database doesn't have yet, as data/equipment.js rows;\n"
                "// items: other items no data file has, [name, category, in-game text]; mobs: monsters the database doesn't have yet (no HP or\n"
                "// EXP in the client); art: the client's card pictures, gear and item icons and monster pictures (sheets like data/icons.js's);\n"
                "// mobLv: every monster the client spawns, [name, level], for the monster list's levels and the drop lists; recipes: the headgear\n"
                "// NPCs craft, as data/recipes.js's NPC rows (js/recipes.js adds them); drops: item id -> monsters, seen in game with no known rate\n")
        f.write("const CLIENT=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
        f.write("(function(){const has=new Set(EQUIP.map(e=>e.id));CLIENT.gear.forEach(r=>{if(!has.has(r.id))EQUIP.push(r)});\n"
                "  const hasCard=new Set(CARDS.map(c=>c.id));CLIENT.cards.forEach(r=>{if(!hasCard.has(r.id))CARDS.push(r)});\n"
                "  const byId=new Map([...EQUIP,...CARDS].map(x=>[x.id,x]));Object.entries(CLIENT.fix).forEach(([id,f])=>{const x=byId.get(+id);if(x)Object.assign(x,f)});\n"
                "  // bonus lines the client's text has and the database's lines don't\n"
                "  Object.entries(CLIENT.lines).forEach(([id,g])=>{const x=byId.get(+id);if(x)x.g=(x.g||[]).concat(g)});\n"
                "  Object.entries(CLIENT.text).forEach(([id,t])=>{ITEM_INFO[id]=Object.assign(ITEM_INFO[id]||{},{t})});\n"
                "  // monsters from the client: HP and EXP unknown (expUnknown keeps them out of the farm tables); element, size and race go in the\n"
                "  // tables js/game.js reads them from, and their spawns in SPAWN\n"
                "  const mob=new Set(MOBS.map(m=>m.id));CLIENT.mobs.forEach(m=>{if(mob.has(m.id))return;\n"
                "    MOBS.push({id:m.id,name:m.name,lv:m.lv,hp:null,exp:0,job:0,expUnknown:true,boss:false,mini:false,mvp:false});\n"
                "    ELEM[m.id]=ELEM[m.id]||[m.el,m.elv,null,null];SIZES[m.id]=SIZES[m.id]||[m.size,RACES.indexOf(m.race)];SPAWN[m.id]=SPAWN[m.id]||m.spawn});\n"
                "  // drops seen in game (armour), rate unknown; a row the database has for the same item and monster stays. The tables data/loot.js's\n"
                "  // items are all in get these too: no known NPC price, looted as armour\n"
                "  Object.entries(CLIENT.drops).forEach(([id,mobs])=>{const g=byId.get(+id);if(g&&!ITEMN[id])ITEMN[id]=g.name;if(!(id in NPCSELL))NPCSELL[id]=null;if(!ITEMTYPE[id])ITEMTYPE[id]=\"a\";\n"
                "    const x=ITEM_INFO[id]=ITEM_INFO[id]||{};x.d=x.d||[];mobs.forEach(mid=>{const l=LOOT[mid]=LOOT[mid]||[null,0,0,[]];if(!l[3].some(d=>d[0]===+id)){l[3].push([+id,null]);l[2]++}\n"
                "      if(!x.d.some(r=>r[0]===mid))x.d.push([mid,\"\",0,\"normal\",null])})});\n"
                "  // every monster's level as the client spawns it; the drop lists name a monster as the monster list does, or as the client does\n"
                "  const byMob=new Map(MOBS.map(m=>[m.id,m]));Object.entries(CLIENT.mobLv).forEach(([id,[n,lv]])=>{const m=byMob.get(+id);if(m)m.lv=lv});\n"
                "  Object.values(ITEM_INFO).forEach(x=>(x.d||[]).forEach(r=>{const m=byMob.get(r[0]),c=CLIENT.mobLv[r[0]];\n"
                "    if(m){r[1]=m.name;r[2]=m.lv}else if(c){r[1]=c[0];r[2]=c[1]}}));\n"
                "  Object.entries(CLIENT.items).forEach(([id,[n,c,t]])=>{if(!CLIENT_ITEMS[id])CLIENT_ITEMS[id]=[n,c];if(t&&!ITEM_TEXT[id])ITEM_TEXT[id]=t});\n"
                "  Object.entries(CLIENT.recipeNames).forEach(([id,n])=>{if(n&&!RECIPE_ITEMN[id])RECIPE_ITEMN[id]=n});\n"
                "  // the database's sheets stay as the fallback for what the client has no picture for (js/build-ui.js iconHtml)\n"
                "  Object.entries(CLIENT.art).forEach(([k,s])=>{if(s.ids.length){ICON_SHEETS[k+\"Db\"]=ICON_SHEETS[k];ICON_SHEETS[k]=s}})})();\n")
    print(f"{len(text)} texts, {len(fix)} fixes, {len(gear)} new gear ({', '.join(g['name'] for g in gear)}), {len(items)} new items, "
          f"{len(mobs)} new monsters ({', '.join(m['name'] for m in mobs)}); pictures: "
          + ", ".join(f"{len(s['ids'])} of {wanted[k]} {k}" for k, s in art.items()))
    for r in recipes:
        fee = f", {r['fee']:,}z" if r.get("fee") else ""
        print(f"  recipe: {r['npc'][0]} ({r['npc'][1]}) makes {r['id']} from {r['mats']}{fee}")
    print(f"  {len(new_cards)} new cards ({', '.join(c['name'] for c in new_cards)}); bonus lines added from the client's text to {len(extra)} items:")
    for i, g in extra.items():
        print(f"    {i}: {json.dumps(g)}")
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
