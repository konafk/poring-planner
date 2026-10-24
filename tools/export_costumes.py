"""Export which costume slots each costume takes into data/costumes.js, so a costume enchant stone can go on a costume you pick for
its slot (Special Equipment).

    python tools/export_costumes.py            # fetch what isn't cached, then write data/costumes.js
    python tools/export_costumes.py --refresh  # refetch every costume's record

Costumes are the items data/clientitems.js lists as "Costume". Each one's slot is in the community database's item record
(/api/items/<id>: slot, such as "Lower Head" or "Upper/Mid Head", else the "Position : ..." line of its description; cached like
tools/export_prices.py's), fetched a couple a second.
Writes COSTUMES: {item id: [costume slots]}, the slots as the stones name them (upper, middle, lower, garment). Costumes the database
has no slot for, or one no stone goes in, are left out and listed at the end.
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import item, ROOT, CACHE  # noqa: E402

# the database's slot words -> the stones' costume slots
WORD = {"upper": "upper", "top": "upper", "mid": "middle", "middle": "middle", "lower": "lower", "low": "lower", "bottom": "lower",
        "garment": "garment", "robe": "garment"}


def costume_ids():
    src = open(os.path.join(ROOT, "data", "clientitems.js"), encoding="utf-8").read()
    i = src.index("{", src.index("const CLIENT_ITEMS="))
    return sorted(int(k) for k, v in json.JSONDecoder().raw_decode(src, i)[0].items() if v[1] == "Costume")


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
    with open(os.path.join(ROOT, "data", "costumes.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// The costume slots each costume takes (tools/export_costumes.py, from the community database's item records), for the\n"
                "// costume a costume enchant stone goes on. COSTUMES: {item id: [slots]}, slots as data/stones.js names them.\n")
        f.write("const COSTUMES={" + ",".join(f'{i}:{json.dumps(s)}' for i, s in out.items()) + "};\n")
    print(f"{len(out)} costumes")
    if odd:
        print(f"no stone slot for {len(odd)}: " + ", ".join(f"{i} ({s})" for i, s in odd.items()))


if __name__ == "__main__":
    main()
