"""Export the in-game text of every consumable from your installed Ragnarok Zero client (official Global client, read-only) into
data/itemtext.js, for the details popup's In-game text (gear and cards take theirs from data/iteminfo.js).

    python tools/export_itemtext.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_itemtext.py --client "D:\\Games\\RagnarokZero"

The client's English item descriptions are in System\\iteminfo_enUS.lub (compiled Lua 5.1, table tbl_string: item id ->
identifiedDescriptionName, one string per line, with ^RRGGBB colour codes). Items are the ones data/clientitems.js lists as
Consumable. The colour codes, the blank spacer line (^FFFFFF_) and the ---- rules are left out; the lines are joined with newlines.
Consumables the client has no text for are left out and counted at the end.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402

ITEMINFO = os.path.join("System", "iteminfo_enUS.lub")


def consumables():
    src = open(os.path.join(DATA, "clientitems.js"), encoding="utf-8").read()
    i = src.index("{", src.index("const CLIENT_ITEMS="))
    return sorted(int(k) for k, v in json.JSONDecoder().raw_decode(src, i)[0].items() if v[1] == "Consumable")


def clean(lines):
    out = []
    for line in lines:
        t = re.sub(r"\^[0-9A-Fa-f]{6}", "", line or "").strip()
        if t and t != "_" and not re.fullmatch(r"-+", t):
            out.append(t)
    return "\n".join(out)


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    info = lua_data(open(os.path.join(client, ITEMINFO), "rb").read(), "utf-8")["tbl_string"]
    text, missing = {}, 0
    for i in consumables():
        d = (info.get(i) or {}).get("identifiedDescriptionName") or {}
        t = clean(d[k] for k in sorted(d))
        if t:
            text[i] = t
        else:
            missing += 1
    with open(os.path.join(DATA, "itemtext.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Consumables' in-game text by item id, from the client's System\\iteminfo_enUS.lub (colour codes and rules left out, lines\n"
                "// joined with newlines); written by tools/export_itemtext.py\n")
        f.write("const ITEM_TEXT=" + json.dumps({str(k): v for k, v in text.items()}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"{len(text)} consumables written, {missing} with no text in the client")


if __name__ == "__main__":
    main()
