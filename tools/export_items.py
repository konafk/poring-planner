"""Export every item in the game client's item catalog (not gear or cards, which have their own tabs) into data/clientitems.js, so
the Item info tab and search can list items no monster drops and nothing on the page names.

    python tools/export_items.py            # fetch the catalog if it isn't cached, then write data/clientitems.js
    python tools/export_items.py --refresh  # refetch it

From the community database's item catalog (/api/items, 200 a page: item_id, display_name, ui_category), which it reads from the
Global client. Cached as JSON in tools/cache/ (gitignored). Writes CLIENT_ITEMS: {item id: [name, category]}, the category as the
catalog has it (Consumable, Costume, Enchant Stone, ETC, Material, Package/Box, Collectible, Pet Egg, Pet Equipment, Taming Item).
"""
import json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import ROOT, CACHE, SITE, UA  # noqa: E402


def catalog(refresh=False):
    f = os.path.join(CACHE, "rozerodb_catalog.json")
    if os.path.exists(f) and not refresh:
        return json.load(open(f, encoding="utf-8"))
    out, off = [], 0
    while True:
        req = urllib.request.Request(f"{SITE}/api/items?limit=200&offset={off}", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read().decode("utf-8"))
        out += d["items"]
        off += len(d["items"])
        if not d["items"] or off >= d["total"]:
            break
        time.sleep(1)
    os.makedirs(CACHE, exist_ok=True)
    json.dump(out, open(f, "w", encoding="utf-8"))
    return out


def main():
    items = {}
    for x in catalog("--refresh" in sys.argv):
        name = (x.get("display_name") or "").strip()
        if isinstance(x.get("item_id"), int) and name:
            items[x["item_id"]] = [name, x.get("ui_category") or "ETC"]
    with open(os.path.join(ROOT, "data", "clientitems.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Every item in the Global client's item catalog that isn't gear or a card, from the community database's catalog (tools/export_items.py).\n"
                "// CLIENT_ITEMS: {item id: [name, category]}\n")
        f.write("const CLIENT_ITEMS={\n" + ",\n".join(f'"{i}":{json.dumps(v, ensure_ascii=False, separators=(",", ":"))}'
                                                  for i, v in sorted(items.items())) + "};\n")
    print(f"{len(items)} items")


if __name__ == "__main__":
    main()
