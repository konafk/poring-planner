"""Export the name each card adds to the gear it's in (the equipment window shows "Healing Shining Clip", not the Vitata Card)
into data/cards.js: each card gets affix (the name) and affixPos ("prefix", or "suffix" for a name starting with "of " that goes
after the item name, like "Boots of Health").

    python tools/export_cardnames.py            # fetch what isn't cached, then add the names to data/cards.js
    python tools/export_cardnames.py --refresh  # refetch every card

Names come from divine-pride.net's item pages (the "Prefix" row). rozerodb.com's item API has a card_prefix_name too, but only
the Chinese one ("殘酷的" for Hydra Card's "Bloody"). Cards are the ones in data/cards.js, so run this after export_prontera.py
(which keeps the names already there when it rewrites the file). Pages are fetched one per second and cached in tools/cache/
(gitignored). Delete a cached file to refetch it. Zero's own versions of classic cards take the classic card's name (CLASSIC). Cards divine-pride has no English name for are left out and listed at the end.
"""
import html, json, os, re, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
SITE = "https://www.divine-pride.net"
UA = "RO-Zero-farmer-calculator data export"
# names divine-pride has only in Korean, as the Global equipment window shows them; other non-English names are left out
GLOBAL = {300835: "Shark Family",  # "+4 Shark Family Muffler"
          300834: "Baby Shark"}
# Zero's own versions of classic cards (27xxx: Maya, Hunter Fly, Bloody Knight...) have no name on divine-pride: they take the classic card's (ids from rAthena's item_db).
# Checked in game for Hunter Fly: "Hybrid Malicious Sage..." is a Sidewinder and a Hunter Fly Card ("Malicious")
CLASSIC = {27275: 4320, 27206: 4142, 27268: 4134, 27271: 300293, 27270: 300292, 27153: 4128, 27266: 4115, 27272: 300294,
           27269: 4318, 27154: 4146, 27207: 4131, 27273: 300295, 27208: 4144, 27267: 4121, 27274: 300296}


CARDS_JS = os.path.join(ROOT, "data", "cards.js")


def read_cards():
    """data/cards.js as (header comment lines, card list)."""
    src = open(CARDS_JS, encoding="utf-8").read()
    at = src.index("const CARDS=")
    return src[:at], json.loads(src[src.index("[", at):src.rindex("]") + 1])


def page(item_id, refresh=False):
    f = os.path.join(CACHE, f"divinepride_item_{item_id}.html")
    if os.path.exists(f) and not refresh:
        return open(f, encoding="utf-8").read()
    req = urllib.request.Request(f"{SITE}/database/item/{item_id}", headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                text = r.read().decode("utf-8")
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return ""
            if attempt == 2:
                raise
            time.sleep(5)
        except OSError:
            if attempt == 2:
                raise
            time.sleep(5)
    os.makedirs(CACHE, exist_ok=True)
    open(f, "w", encoding="utf-8").write(text)
    time.sleep(1)
    return text


def prefix(text):
    m = re.search(r'<td class="text-muted">\s*Prefix\s*</td>\s*<td>(.*?)</td>', text, re.S)
    return html.unescape(re.sub(r"<[^>]*>", "", m.group(1))).strip() if m else ""


def main():
    refresh = "--refresh" in sys.argv
    named, missing = 0, []
    head, cards = read_cards()
    for i, c in enumerate(cards, 1):
        cid = c["id"]
        p = GLOBAL.get(cid) or prefix(page(cid, refresh)) or (cid in CLASSIC and prefix(page(CLASSIC[cid], refresh)))
        c.pop("affix", None)
        c.pop("affixPos", None)
        if p and p.isascii():
            c["affix"], c["affixPos"] = p, "suffix" if p.startswith("of ") else "prefix"
            named += 1
        else:
            missing.append(f"{cid} {c['name']}")
        if i % 25 == 0:
            print(f"{i}/{len(cards)}", flush=True)
    with open(CARDS_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write(head + "const CARDS=" + json.dumps(cards, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"{named} card names written to data/cards.js")
    if missing:
        print(f"{len(missing)} cards without a name (ids): " + ", ".join(missing))


if __name__ == "__main__":
    main()
