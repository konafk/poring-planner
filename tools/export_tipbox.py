"""Export the in-game Tip Box's Item Creation guides from your installed Ragnarok Zero client (official Global client, read-only)
into data/tipbox.js, for the Recipes tab.

    python tools/export_tipbox.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_tipbox.py --client "D:\\Games\\RagnarokZero"

The Tip Box (/tip or Alt+D in game) is System\\tipbox_enUS.lub, a loose file next to data.grf (compiled Lua 5.1): tbl_string
{tip id: {Title, Page: {page: {line: text}}}}. Its Item Creation guide (tip 7036) links four guides, each one NPC's recipes:
a "▶<ITEM>result<INFO>id</INFO></ITEM>" line, then "<ITEM>material<INFO>id</INFO></ITEM> xN" lines, then "3,000 zeny". The NPC is
the page's <NAVI>[name]<INFO>map,x,y,...</INFO></NAVI>; on a guide with a "Quest Start" it's the NPC whose quest unlocks the recipes.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402

TIPBOX = "System\\tipbox_enUS.lub"
# the Item Creation guides (tip id) and the Recipes tab category each becomes
GUIDES = {7032: "Dye Making", 7033: "Potions", 7034: "Mixture & Counteragent", 7035: "Fruit Juice"}
ITEM = r"<ITEM>[^<]*<INFO>(\d+)</INFO></ITEM>"


def guide(tip, cat):
    lines = [re.sub(r"\^[0-9A-Fa-f]{6}", "", pg[k]).strip() for p in sorted(tip["Page"], key=int)
             for pg in [tip["Page"][p]] for k in sorted(pg, key=int)]
    npc = next(re.search(r"<NAVI>\[(.*?)\]<INFO>(\w+),(\d+),(\d+)", l).groups() for l in lines if "<NAVI>" in l)
    quest = any("Quest Start" in l for l in lines)
    rows, r = [], None
    for l in lines:
        mat = re.fullmatch(ITEM + r"\s*x\s*(\d+)", l)
        fee = re.fullmatch(r"([\d,]+)\s*zeny", l)
        res = re.fullmatch(r"▶(?:Materials ?f(?:or)? ?)?" + ITEM, l)
        if res:
            r = {"cat": cat, "type": "npc", "id": int(res.group(1)), "n": 1, "lv": None, "mats": [], "fee": None,
                 "npc": [npc[0], f"{npc[1]} {npc[2]},{npc[3]}"]}
            if quest:
                r["quest"] = True
        elif mat and r:
            r["mats"].append([int(mat.group(1)), int(mat.group(2))])
        elif fee and r:
            r["fee"] = int(fee.group(1).replace(",", ""))
            rows.append(r)
            r = None
    if not rows or r:
        raise SystemExit(f"tip {tip['Title']!r}: couldn't read its recipes")
    return rows


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    tips = lua_data(open(os.path.join(client, TIPBOX), "rb").read(), "utf-8")["tbl_string"]
    rows = [r for tip, cat in GUIDES.items() for r in guide(tips[tip], cat)]
    head = ("// The NPC crafts in the in-game Tip Box's Item Creation guides (the client's System\\tipbox_enUS.lub, tips 7032-7035),\n"
            "// written by tools/export_tipbox.py. TIPBOX_RECIPES: rows like data/recipes.js's NPC ones (cat, type npc, id, n, lv null,\n"
            "// mats [[item id, amount]], fee in zeny, npc [name, map x,y]), quest: true when the NPC's quest unlocks them\n")
    with open(os.path.join(DATA, "tipbox.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(head + "const TIPBOX_RECIPES=[\n" + ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "];\n")
    print(f"wrote {len(rows)} recipes from {len(GUIDES)} guides")


if __name__ == "__main__":
    main()
