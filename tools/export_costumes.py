"""Export which costume slots each costume takes into data/costumes.js, so a costume enchant stone can go on a costume you pick for
its slot (Special Equipment).

    python tools/export_costumes.py            # fetch what isn't cached, then write data/costumes.js
    python tools/export_costumes.py --refresh  # refetch every costume's record

Costumes are the items data/clientitems.js lists as "Costume". Each one's slot is in the community database's item record
(/api/items/<id>: slot, such as "Lower Head" or "Upper/Mid Head", else the "Position : ..." line of its description; cached like
tools/export_prices.py's), fetched a couple a second. Costumes only the game client has (data/client.js's items, such as Golden
Majestic Goat) take the slot from the "Position : ..." (or "Location : ...") line of their in-game text.
Writes COSTUMES: {item id: [costume slots]}, the slots as the stones name them (upper, middle, lower, garment). Costumes the database
has no slot for, or one no stone goes in, are left out and listed at the end.
Also COSTUME_CRAFT: the costumes the Enchant Stone Craft Box takes, any 5 for one Costume Enchant Stone box, from the
installed client (data.grf's LapineDdukDDakBox_data.lub, ZTW_Dress_Enc_Box's SourceItems). The 5 November 2026 patch cut it from 229
costumes to the official Costume Enchant guide's (roz.mygnjoy.com/en/intro/guide/23) plus Golden Majestic Goat. It lists unbound
costumes only, as Enchant Stone Craft Box B's text says.
    python tools/export_costumes.py --client PATH  # the client's folder (default C:\\Gravity\\RagnarokZero)
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import item, ROOT, CACHE  # noqa: E402
from export_minimaps import DesGrf  # noqa: E402
from lua_tables import load  # noqa: E402

# the database's slot words -> the stones' costume slots
WORD = {"upper": "upper", "top": "upper", "mid": "middle", "middle": "middle", "lower": "lower", "low": "lower", "bottom": "lower",
        "garment": "garment", "robe": "garment"}
# the client's table of what the Enchant Stone Craft Box takes
LAPINE = "data\\luafiles514\\lua files\\datainfo\\lapineddukddakbox_data.lub"


def craft_costumes(client):
    """The costume ids the Enchant Stone Craft Box takes: ZTW_Dress_Enc_Box's SourceItems, each [name, count, item id]."""
    box = load(DesGrf(os.path.join(client, "data.grf")).read(LAPINE))["tblLapineDdukddakBox_data"]["sources"]["ZTW_Dress_Enc_Box"]
    return sorted({row[3] for row in box["SourceItems"].values()})


def costume_names():
    """{item id: name} for data/clientitems.js's costumes."""
    src = open(os.path.join(ROOT, "data", "clientitems.js"), encoding="utf-8").read()
    i = src.index("{", src.index("const CLIENT_ITEMS="))
    return {int(k): v[0] for k, v in json.JSONDecoder().raw_decode(src, i)[0].items() if v[1] == "Costume"}


def costume_ids():
    return sorted(costume_names())


def client_costumes(field=2):
    """{item id: in-game text} (field 0: name) for the costumes data/client.js adds that data/clientitems.js doesn't have."""
    src = open(os.path.join(ROOT, "data", "client.js"), encoding="utf-8").read()
    i = src.index("{", src.index("const CLIENT="))
    return {int(k): v[field] or "" for k, v in json.JSONDecoder().raw_decode(src, i)[0]["items"].items() if v[1] == "Costume"}


def slots_of(slot):
    """"Upper/Mid Head" -> ["upper", "middle"], "All Head Slots" -> all three; [] when no stone slot is named."""
    slot = (slot or "").lower()
    if re.search(r"\ball head", slot):
        return ["upper", "middle", "lower"]
    out = []
    for w in re.findall(r"[a-z]+", slot):
        if w in WORD and WORD[w] not in out:
            out.append(WORD[w])
    return [s for s in ["upper", "middle", "lower", "garment"] if s in out]


def main():
    refresh = "--refresh" in sys.argv
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    ids, out, odd = costume_ids(), {}, {}
    for n, i in enumerate(ids, 1):
        cached = os.path.exists(os.path.join(CACHE, f"db_item_{i}.json"))
        rec = item(i, refresh)
        if not cached or refresh:
            time.sleep(0.5)
        # a few records have no slot ("-"), but their description ends "Position : Middle" as the game shows it
        s = slots_of((rec or {}).get("slot"))
        pos = re.search(r"Position\s*:\s*([^\n]+)", (rec or {}).get("description") or "")
        if not s and pos:
            s = slots_of(pos.group(1))
        if s:
            out[i] = s
        else:
            odd[i] = (rec or {}).get("slot")
        if n % 100 == 0:
            print(f"{n} / {len(ids)}", flush=True)
    for i, t in sorted(client_costumes().items()):
        if i in out or i in odd:
            continue
        pos = re.search(r"(?:Position|Location)\s*:\s*([^\n]+)", t)
        if pos and (s := slots_of(pos.group(1))):
            out[i] = s
        else:
            odd[i] = pos and pos.group(1)
    with open(os.path.join(ROOT, "data", "costumes.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// The costume slots each costume takes (tools/export_costumes.py, from the community database's item records and the\n"
                "// client's item text), for the costume a costume enchant stone goes on. COSTUMES: {item id: [slots]}, slots as\n"
                "// data/stones.js names them.\n")
        f.write("const COSTUMES={" + ",".join(f'{i}:{json.dumps(s)}' for i, s in out.items()) + "};\n")
        craft = craft_costumes(client)
        f.write("// The costumes the Enchant Stone Craft Box takes, any 5 for one Costume Enchant Stone box (the client's\n"
                "// LapineDdukDDakBox_data.lub, as of the 5 November 2026 patch). Not their (Bound) versions.\n")
        f.write("const COSTUME_CRAFT=" + json.dumps(craft, separators=(",", ":")) + ";\n")
    print(f"{len(out)} costumes, {len(craft)} go in the Enchant Stone Craft Box")
    if odd:
        print(f"no stone slot for {len(odd)}: " + ", ".join(f"{i} ({s})" for i, s in odd.items()))


if __name__ == "__main__":
    main()
