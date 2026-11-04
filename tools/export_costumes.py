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
Also COSTUME_CRAFT: the costumes the Enchant Stone Craft Box takes, any 5 for one Costume Enchant Stone box, from the official
Costume Enchant guide (roz.mygnjoy.com/en/intro/guide/23, updated with the 5 November 2026 maintenance). It names costumes; their
(Bound) versions are left out, as Enchant Stone Craft Box B's text says only unbound costumes go in. Names no costume in data/clientitems.js or data/client.js has are listed at the end, picked
up once an export adds them.
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_prices import item, ROOT, CACHE  # noqa: E402

# the database's slot words -> the stones' costume slots
WORD = {"upper": "upper", "top": "upper", "mid": "middle", "middle": "middle", "lower": "lower", "low": "lower", "bottom": "lower",
        "garment": "garment", "robe": "garment"}

# the official guide's list, in its order (roz.mygnjoy.com/en/intro/guide/23)
CRAFT_BOX = """Old Timey Mustache|Savage Babe on Shoulder|Singing Bird|Zombie Mask|Green Feeler|Blue Pencil Bite|Angel Wing|Baby Dragon|
Sentimental Flower|Green Frog Hood|Sprout Hat|Beach Ball|Chick Hat|Sweet Chef Hat|Propeller|Pickki Egg Doll|Bamboo Hat|Pagdaya|Lucky Clover|
Munak Hat|Snake Hat|Bongun Hat|Demon Headband|Diabolic Rock Guitar|Agami Helm|Summer Forest Vacation|Frog Prince Hat|Smile Mask|
Butterfly Hairpin|Goblin Leader Mask|White Beard|Gas Mask|Large Hibiscus|Expressionless Mask|Peco Peco Cap|Suprised Eyes Mask|Fedora|
Annoying Mask|Straw Hat|Tare Wild Rose|Sunglasses|Judge Hat|Hair Tie|Giant Golden Bell|Teddy Bear Hat|Thorn Scarf|Happy Summer Afro|
Gularing Doll|Cigarette|Pirate Bandana|Poo Poo Hat|Golden Gear|Black Ribbon|Moonlight Bell|Drooping Argiope|Large Orc Hero Helm|
Firinto Scarf|Vampire Hairband|Grassland Breeze|Nordfeld Onyx Helm|Sale Sign|Nordfeld Platinum Helm|Green Hair Tie|
Alien Sunglasses - Green|Coiled Snake Hat|Monochrome Cap|Aqua Ten-Gallon Hat|Alien Sunglasses - Red|Mermaid Headphones|Necktie|
Happy Summer Ribbon|Boyfriend Wanted|Poring Mascot|Majoruros Horns|Blue Fish|Ghoul Mask|Circlet|Shadow Devil|Blue Headband|Ribbon|
Magnolia's Hat|Grand Circlet|Western Grace|Crown|Mystic Rose|Spiky Band|Colorful Eggshell|Blood Sucker|Cone Hat|Oliver Wolf Hood|
Decorative Flower|Baby Wolf In Mouth|Honey Pancake|Funeral Hat|Sleep Eclipse Family|Black Hand of Fate|Yoyo Hat|Whistle|Sugar Fruit Bite|
King Strawberry|Trace of Battle|Mosaic|Veil of Blessing|Red Ribbon|Spider Wings|Majestic Goat|Pig Nose|Sphinx Helm|Chewy Gelato|
Papa Shovel Hat|Claw Hairpin|Orc Helm|Dwarf Beard|Soda in Mouth|Shaving Foam|Golden Brain Hat|Wolf Masquerade|Rideword|Persica|
Rotating Gears|Poporing Muffler|Alarm Mask|Sun God's Hat|Owlduke Silk Hat""".replace("\n", "").split("|")
# where the guide's name isn't the game's: the game's name. The guide's two columns each run in item id order, so a name the game
# doesn't have is the costume between its neighbours' ids that fits it (Agami: Korean for gills; Tare: drooping; tanghulu: sugared fruit)
CRAFT_ALIAS = {"Old Timey Mustache": "Charlie Beard", "Zombie Mask": "Zombie Face", "Propeller": "Mini Propeller",
               "Pickki Egg Doll": "Egg Picky Doll", "Demon Headband": "Evil Wing", "Agami Helm": "Fin Helm", "Smile Mask": "Mr. Smile",
               "White Beard": "Grampa Beard", "Expressionless Mask": "Poker Face", "Suprised Eyes Mask": "Surprised Mask",
               "Annoying Mask": "Annoyed Mask", "Tare Wild Rose": "Drooping Wild Rose", "Hair Tie": "Cute Ribbon",
               "Happy Summer Afro": "Happy Summer Wig", "Grassland Breeze": "Wind of the Prairie", "Sale Sign": "Sales Banner",
               "Green Hair Tie": "Cute Green Ribbon", "Blue Headband": "Blue Hairband", "Cone Hat": "Party Hat",
               "Decorative Flower": "Fancy Flower", "Sleep Eclipse Family": "Sleeping Eclipse Family", "Sugar Fruit Bite": "Tanghulu in Mouth"}


def bare(name):
    """"[Costume] Mini Propeller (Bound)" -> "mini propeller"."""
    name = re.sub(r"^\[costume\]\s*|^costume\s+|\s*\(bound\)$", "", (name or "").strip().lower())
    return re.sub(r"[^a-z0-9]", "", name)


def craft_costumes(names):
    """The guide's costumes as item ids (names: {item id: name}; (Bound) versions left out), and the guide's names no item has."""
    by = {}
    for i, n in names.items():
        if not re.search(r"\(bound\)\s*$", n or "", re.I):
            by.setdefault(bare(n), []).append(i)
    ids, missing = [], []
    for n in CRAFT_BOX:
        hit = by.get(bare(CRAFT_ALIAS.get(n, n)))
        if hit:
            ids += hit
        else:
            missing.append(n)
    return sorted(set(ids)), missing


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
        craft, missing = craft_costumes({**client_costumes(0), **costume_names()})
        f.write("// The costumes the Enchant Stone Craft Box takes, any 5 for one Costume Enchant Stone box (the official Costume Enchant\n"
                "// guide, roz.mygnjoy.com/en/intro/guide/23, as of the 5 November 2026 maintenance). Not their (Bound) versions.\n")
        if missing:
            f.write("// On the guide but not in this site's item lists yet: " + ", ".join(missing) + ".\n")
        f.write("const COSTUME_CRAFT=" + json.dumps(craft, separators=(",", ":")) + ";\n")
    print(f"{len(out)} costumes, {len(craft)} go in the Enchant Stone Craft Box")
    if missing:
        print(f"enchant guide names with no item: {', '.join(missing)}")
    if odd:
        print(f"no stone slot for {len(odd)}: " + ", ".join(f"{i} ({s})" for i, s in odd.items()))


if __name__ == "__main__":
    main()
