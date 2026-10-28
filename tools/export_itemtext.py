"""Export the in-game text of every consumable from your installed Ragnarok Zero client (official Global client, read-only) into
data/itemtext.js, for the details popup's In-game text (gear and cards take theirs from data/iteminfo.js), and the cards in
data/cards.js the client has no item for yet (regions not out on Global), which the planner marks "not in game yet".

    python tools/export_itemtext.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_itemtext.py --client "D:\\Games\\RagnarokZero"

The client's English item descriptions are in System\\iteminfo_enUS.lub (compiled Lua 5.1, table tbl_string: item id ->
identifiedDescriptionName, one string per line, with ^RRGGBB colour codes). Items are the ones data/clientitems.js lists as
Consumable, plus the Lv.1–10 Cookbooks (ETC items the Cooking tab links to). The colour codes, the blank spacer line (^FFFFFF_) and the ---- rules are left out; the lines are joined with newlines; the
character the client's text can't decode (a dash in its other encoding) is written as a dash.
Consumables the client has no text for are left out and counted at the end.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402

ITEMINFO = os.path.join("System", "iteminfo_enUS.lub")
COOKBOOKS = list(range(7472, 7482))  # Lv.1 Cookbook … Lv.10 Cookbook


def consumables():
    src = open(os.path.join(DATA, "clientitems.js"), encoding="utf-8").read()
    i = src.index("{", src.index("const CLIENT_ITEMS="))
    return sorted(int(k) for k, v in json.JSONDecoder().raw_decode(src, i)[0].items() if v[1] == "Consumable")


def card_ids():
    src = open(os.path.join(DATA, "cards.js"), encoding="utf-8").read()
    return [x["id"] for x in json.JSONDecoder().raw_decode(src, src.index("[", src.index("const CARDS=")))[0]]


def clean(lines):
    out = []
    for line in lines:
        t = re.sub(r"\^[0-9A-Fa-f]{6}", "", line or "").strip()
        t = t.replace("�", "—")
        if t and t != "_" and not re.fullmatch(r"-+", t):
            out.append(t)
    return "\n".join(out)


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    info = lua_data(open(os.path.join(client, ITEMINFO), "rb").read(), "utf-8")["tbl_string"]
    text, missing = {}, 0
    nc = sorted(i for i in card_ids() if i not in info)
    for i in consumables() + COOKBOOKS:
        d = (info.get(i) or {}).get("identifiedDescriptionName") or {}
        t = clean(d[k] for k in sorted(d))
        if t:
            text[i] = t
        else:
            missing += 1
    with open(os.path.join(DATA, "itemtext.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Consumables' and cookbooks' in-game text by item id, from the client's System\\iteminfo_enUS.lub (colour codes and rules left out, lines\n"
                "// joined with newlines); written by tools/export_itemtext.py\n")
        f.write("const ITEM_TEXT=" + json.dumps({str(k): v for k, v in text.items()}, ensure_ascii=False, separators=(",", ":")) + ";\n")
        f.write("// cards in data/cards.js the client has no item for yet (not out on Global)\n")
        f.write("const CARDS_NOT_IN_CLIENT=" + json.dumps(nc, separators=(",", ":")) + ";\n")
    print(f"{len(text)} consumables written, {missing} with no text in the client; {len(nc)} cards not in the client")


if __name__ == "__main__":
    main()
