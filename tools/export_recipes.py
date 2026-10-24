"""Export crafting recipes from rozerodb.com's Recipes page and Alchemy Lab guide into data/recipes.js.

    python tools/export_recipes.py

The page (https://rozerodb.com/recipes) has no API: its whole list is in the server-rendered Next.js payload (self.__next_f.push
chunks) as [{category, craft_type, name, item_id, quantity, level, materials: [{name, id, amount}]}], which is what every tab of
the page shows. Categories: Forging (weapons, and ores refined into Iron / Steel / elemental stones), Brewing, Arrows (Arrow
Crafting: one item makes a stack of arrows), Cooking and Misc. level is the weapon level of a forged weapon.

The Alchemy Lab guide (https://rozerodb.com/guides/alchemy-lab) adds the recipes NPCs make for a fee: Mixture & Counteragent
(Morgenstein, after a short quest) and Dye Making (JavaDullihan). They're only in its rendered HTML, one recipe card each: a name,
a zeny fee, the materials (item links with a quantity) and the result (an item link with "x N"). The NPC is the last one each
section's steps name.
"""
import html as htmllib, json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://rozerodb.com/recipes"
LAB_URL = "https://rozerodb.com/guides/alchemy-lab"
UA = "RO-Zero-farmer-calculator data export"
# the Alchemy Lab's sections (their id in the page) and the category each becomes
LAB = {"mixtures": "Mixture & Counteragent", "dyes": "Dye Making"}
CATS = ["Forging", "Brewing", "Arrows", "Cooking", "Misc", *LAB.values()]


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8")


def payload():
    html = get(URL)
    s = "".join(json.loads('"' + c + '"') for c in re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)\s*</script>', html, re.S))
    i = s.index('[{"category":')
    return json.JSONDecoder().raw_decode(s[i:])[0]


def lab(names):
    """The Alchemy Lab's recipe cards, as rows like the Recipes page's with the NPC's fee and the NPC (name, map x,y)."""
    page, rows = get(LAB_URL), []
    text = lambda x: htmllib.unescape(re.sub(r"<[^>]+>", "", x)).strip()
    for sid, cat in LAB.items():
        i = page.index(f'id="{sid}"'); j = page.find("</section>", page.find("recipeGrid", i))
        sec = page[i:j]
        npc = re.findall(r"<h3>(.*?)</h3><code>(.*?)</code>", sec[:sec.index("recipeGrid")])[-1]
        for card in re.findall(r'<article class="[^"]*recipeCard".*?</article>', sec, re.S):
            fee = int(re.sub(r"\D", "", text(re.search(r'zeny">(.*?)</span>', card).group(1))))
            mats = []
            for m, n, nm in re.findall(r'itemLine" href="/items/(\d+)".*?itemQty">(\d+)</b>(.*?)</span>', card, re.S):
                mats.append([int(m), int(n)]); names.setdefault(int(m), text(nm))
            res = re.search(r'resultItem" href="/items/(\d+)".*?<b>(.*?)</b>.*?<em>(.*?)</em>', card, re.S)
            names.setdefault(int(res.group(1)), text(res.group(2)))
            rows.append({"cat": cat, "type": "npc", "id": int(res.group(1)), "n": int(re.sub(r"\D", "", text(res.group(3)))), "lv": None,
                         "mats": mats, "fee": fee, "npc": [text(npc[0]), text(npc[1])]})
    return rows


def main():
    rows, names = [], {}
    for r in payload():
        names[r["item_id"]] = r["name"]
        for m in r["materials"]:
            names[m["id"]] = m["name"]
        rows.append({"cat": r["category"], "type": r["craft_type"], "id": r["item_id"], "n": r["quantity"], "lv": r["level"],
                     "mats": [[m["id"], m["amount"]] for m in r["materials"]]})
    rows += lab(names)
    rows.sort(key=lambda r: (CATS.index(r["cat"]) if r["cat"] in CATS else len(CATS), names[r["id"]], r["mats"]))
    head = ("// Crafting recipes from rozerodb.com's Recipes page (https://rozerodb.com/recipes), exported by tools/export_recipes.py.\n"
            "// The Alchemy Lab guide (https://rozerodb.com/guides/alchemy-lab) adds what NPCs make for a fee (type npc).\n"
            "// RECIPES: cat (Forging, Brewing, Arrows, Cooking, Misc, Mixture & Counteragent, Dye Making), type (forge, ore, brew, arrow, cook,\n"
            "// other, npc), id (the item made), n (how many one craft makes), lv (a forged weapon's level, else null), mats [[item id, amount]],\n"
            "// and for an NPC's: fee (zeny) and npc [name, map x,y]. RECIPE_ITEMN: the name of every item in them.\n")
    body = ("const RECIPES=[\n" + ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "];\n"
            "const RECIPE_ITEMN=" + json.dumps({str(k): names[k] for k in sorted(names)}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    with open(os.path.join(ROOT, "data", "recipes.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(head + body)
    print(f"wrote {len(rows)} recipes using {len(names)} items")


if __name__ == "__main__":
    main()
