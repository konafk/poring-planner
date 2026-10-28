"""Export the cooking recipes in the Lv.1-10 Cookbooks from your installed Ragnarok Zero client (official Global client,
read-only) into data/cookbooks.js, for the Cooking tab and the Recipes tab's Cooking recipes.

    python tools/export_cookbooks.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_cookbooks.py --client "D:\\Games\\RagnarokZero"

Each cookbook's in-game pages are data\\book\\<item id>_enus.txt in data.grf: per dish a "Dish name: ..." line, then
"Ingredients: 4 Meat, 1 Old Frying Pan, ..." (with ^RRGGBB colour codes). A dish is matched to the item of its level
(12041-12070 Lv 1-5, 12071-12100 Lv 6-10, as js/craftsim.js's dishLv) whose client name is closest to the book's; an ingredient
by its client name, singular or plural, else ALIAS (the books use older names). An ingredient it can't match stops the export.
"""
import difflib, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, grf_file  # noqa: E402

BOOKS = range(7472, 7482)  # Lv.1 Cookbook … Lv.10 Cookbook
# the books' names for items the client calls something else
ALIAS = {"bag of grain": 577, "bags of grain": 577, "savory sauce": 7454, "spicy sauce": 7455, "fresh fish": 579, "fresh fishes": 579,
         "potatoes": 516, "soft blades of grass": 7194, "aloe vera": 606, "fig leafs": 7298, "animal gore": 702,
         "scorpion nippers": 7125, "heart of mermaids": 950}
DISH_ALIAS = {"Seasoned Sticky Webfoot": 12042}  # the client's Flipper Salad


def dish_lv(i):
    return (i - 12041) % 5 + 1 if i < 12071 else (i - 12071) % 5 + 6


def client_names():
    src = open(os.path.join(DATA, "clientitems.js"), encoding="utf-8").read()
    items = json.JSONDecoder().raw_decode(src, src.index("{", src.index("const CLIENT_ITEMS=")))[0]
    return {int(k): v[0] for k, v in items.items()}


def main():
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    names = client_names()
    by_name = {}
    for i, n in sorted(names.items()):
        by_name.setdefault(n.lower(), i)

    def item(n):
        n = re.sub(r"(CL:0)?\}?$", "", n).strip().lower()
        w = n.split(" ")
        cands = [n]
        for a, b in (("ies", "y"), ("ves", "f"), ("es", ""), ("s", "")):
            for k in (0, len(w) - 1):
                if w[k].endswith(a):
                    cands.append(" ".join(w[:k] + [w[k][:-len(a)] + b] + w[k + 1:]))
        for c in cands:
            if c in ALIAS:
                return ALIAS[c]
            if c in by_name:
                return by_name[c]
        raise SystemExit(f"no item called {n!r}: add it to ALIAS")

    out, n = {}, 0
    for book in BOOKS:
        lv = book - 7471
        raw = grf_file(os.path.join(client, "data.grf"), "data\\book\\%d_enus.txt" % book).decode("utf-8", "replace")
        t = re.sub(r"\^[0-9A-Fa-f]{6}", "", raw).replace("\r", "")
        ids = [i for i in range(12041, 12101) if dish_lv(i) == lv]
        out[book] = []
        for m in re.finditer(r"Ingredients:\s*([^\n]+)", t):
            dish = [l for l in t[:m.start()].split("\n") if re.match(r"^[^:\n]{3,45}:", l)][-1].split(":")[0].strip()
            did = DISH_ALIAS.get(dish) or max(ids, key=lambda i: difflib.SequenceMatcher(None, names[i].lower(), dish.lower()).ratio())
            mats = []
            for part in re.split(r",\s*", m.group(1).strip()):
                q = re.match(r"(?:and )?(\d+)\s+(.+)", part.strip())
                i, k = item(q.group(2)), int(q.group(1))
                # an item the book names twice (Fried Sweet Potato's "Potatoes" and "Sweet Potato" are both Sweet Potato) counts once, summed
                same = next((x for x in mats if x[0] == i), None)
                if same:
                    same[1] += k
                else:
                    mats.append([i, k])
            out[book].append([did, mats])
            n += 1
        got = sorted(d for d, _ in out[book])
        if len(set(got)) != len(got):
            raise SystemExit(f"Lv.{lv} Cookbook: two dishes matched the same item {got}")
    with open(os.path.join(DATA, "cookbooks.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// The cooking recipes in each Cookbook, from the client's data\\book\\<id>_enus.txt (the book's in-game pages); written by\n"
                "// tools/export_cookbooks.py. COOKBOOKS: cookbook item id -> [[dish item id, [[ingredient item id, amount], ...]], ...] in the\n"
                "// book's order\n")
        f.write("const COOKBOOKS={" + ",\n".join(f'"{b}":{json.dumps(v, separators=(",", ":"))}' for b, v in out.items()) + "};\n")
    print(f"{n} dishes from {len(out)} cookbooks")


if __name__ == "__main__":
    main()
