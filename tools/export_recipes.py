"""Export crafting recipes from rozerodb.com's Recipes page into data/recipes.js.

    python tools/export_recipes.py

The page (https://rozerodb.com/recipes) has no API: its whole list is in the server-rendered Next.js payload (self.__next_f.push
chunks) as [{category, craft_type, name, item_id, quantity, level, materials: [{name, id, amount}]}], which is what every tab of
the page shows. Categories: Forging (weapons, and ores refined into Iron / Steel / elemental stones), Brewing, Arrows (Arrow
Crafting: one item makes a stack of arrows), Cooking and Misc. level is the weapon level of a forged weapon.
"""
import json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://rozerodb.com/recipes"
UA = "RO-Zero-farmer-calculator data export"
CATS = ["Forging", "Brewing", "Arrows", "Cooking", "Misc"]


def payload():
    html = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8")
    s = "".join(json.loads('"' + c + '"') for c in re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)\s*</script>', html, re.S))
    i = s.index('[{"category":')
    return json.JSONDecoder().raw_decode(s[i:])[0]


def main():
    rows, names = [], {}
    for r in payload():
        names[r["item_id"]] = r["name"]
        for m in r["materials"]:
            names[m["id"]] = m["name"]
        rows.append({"cat": r["category"], "type": r["craft_type"], "id": r["item_id"], "n": r["quantity"], "lv": r["level"],
                     "mats": [[m["id"], m["amount"]] for m in r["materials"]]})
    rows.sort(key=lambda r: (CATS.index(r["cat"]) if r["cat"] in CATS else len(CATS), names[r["id"]], r["mats"]))
    head = ("// Crafting recipes from rozerodb.com's Recipes page (https://rozerodb.com/recipes), exported by tools/export_recipes.py.\n"
            "// RECIPES: cat (Forging, Brewing, Arrows, Cooking, Misc), type (forge, ore, brew, arrow, cook, other), id (the item made), n (how\n"
            "// many one craft makes), lv (a forged weapon's level, else null), mats [[item id, amount]]. RECIPE_ITEMN: the name of every item in them.\n")
    body = ("const RECIPES=[\n" + ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "];\n"
            "const RECIPE_ITEMN=" + json.dumps({str(k): names[k] for k in sorted(names)}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    with open(os.path.join(ROOT, "data", "recipes.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(head + body)
    print(f"wrote {len(rows)} recipes using {len(names)} items")


if __name__ == "__main__":
    main()
