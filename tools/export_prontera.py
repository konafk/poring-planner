"""Export gear and job data from roz.prontera.info into data/*.js for the build simulator.

    python tools/export_prontera.py            # fetch what isn't cached, then write the data files
    python tools/export_prontera.py --refresh  # refetch list, refine, job and skill pages (new items and skill changes after a patch), keep cached item pages

Pages are fetched one per second and cached in tools/cache/ (gitignored). Delete a cached file to refetch it.
Writes: data/equipment.js (EQUIP, SETS), data/cards.js (CARDS), data/refine.js (REFINE), data/skills.js (SKILLS).
data/jobs.js (job bonus, base HP / SP) comes from tools/export_jobs.py: roz.prontera.info has the classic tables, not Zero's.
"""
import json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
SITE = "https://roz.prontera.info"
UA = "poring-planner data export"
JOBS = ["Novice", "Swordsman", "Mage", "Archer", "Acolyte", "Merchant", "Thief", "Knight", "Crusader", "Wizard", "Sage",
        "Hunter", "Bard", "Dancer", "Priest", "Monk", "Blacksmith", "Alchemist", "Assassin", "Rogue"]
sys.setrecursionlimit(10000)
# values roz.prontera.info is missing, from the official client (skillinfoz/skilldelaylist.lub): only fill in what it leaves blank
CLIENT_FIX = {"falcon-assault": {"cooldown_ms": 500}}
# Zero Global skill ratios that differ from roz.prontera.info (kRO Zero): slug -> (prontera's max-level damage %, % to add at every level);
# applied only while prontera still shows its own value. Sonic Blow is 100% lower on Global (1100% at Lv10, not 1200%)
GLOBAL_PCT = {"sonic-blow": (1200, -100)}
# skill points per tree that roz.prontera.info gets wrong: a Novice gets one point per job level after the first, so Job Lv 10 = 9 (Basic Skill's 9 levels)
POINTS_FIX = {"Novice": 9}
# quest skills (no skill points) roz.prontera.info has wrong, from the official client (skillinfoz/skillinfolist.lub, Type = "Quest"): slug -> quest or not.
# Create Deadly Poison is an Assassin skill learned with points (it needs Envenom, Detoxify and Enchant Poison)
QUEST_FIX = {"create-deadly-poison": False, "venom-knife": True, "dubious-salesmanship": True, "spiritual-bestowment": True,
             "excruciating-palm": True, "bioethics": True}
# prerequisites roz.prontera.info has differently from the official client (skillinfoz/skillinfolist.lub): (tree, slug) -> [[skill slug, level]].
# A Rogue's Vulture's Eye needs nothing (prontera points at the Archer's Owl's Eye); Cart Boost also needs Cart Revolution and Change Cart
PRE_FIX = {("Rogue", "vultures-eye"): [], ("Merchant", "cart-boost"): [["pushcart", 5], ["cart-revolution", 1], ["change-cart", 1]]}
# skills roz.prontera.info has that the official client's skill tree (skillinfoz/skilltreeview.lub) doesn't: (tree, slug), left out.
# Sonic Acceleration is kRO Zero's; the client has no place for it in the Assassin tree
NOT_IN_CLIENT = {("Assassin", "sonic-acceleration")}
# skills the game gives at the job change that roz.prontera.info doesn't mark as given (is_default): since 2024-12-04 the 2nd-job quest skills
# come with the job change, all but the Elemental Changes, which still take a quest (criatura-academy.com/skills/1014-redemptio/ and the others' pages)
GIVEN_FIX = {"charge-attack", "shrink", "sight-blaster", "create-elemental-converter", "phantasmic-arrow", "pang-voice", "charming-wink", "redemptio",
             "close-confine", "venom-knife", "dubious-salesmanship", "spiritual-bestowment", "excruciating-palm", "bioethics"}
# skill text roz.prontera.info has differently from the official client (skillinfoz/skilldescript_enus.lub): slug -> (old, new) swaps in
# the description and each level's line, applied while prontera still has the old text
CLIENT_TEXT = {"cart-boost": [("While Geneticist Cart Boost", "While Cart Boost")], "hindsight": [("Frost Driver", "Frost Diver")],
               "stone-curse": [("Petrification chance", "Catalyst consumption: On use, Petrification chance", range(1, 6)),
                               ("Petrification chance", "Catalyst consumption: On success, Petrification chance", range(6, 11))]}


def client_text(slug, desc, lv):
    for old, new, *lvs in CLIENT_TEXT.get(slug, []):
        if not lvs:
            desc = desc.replace(old, new)
        lv = [[*r[:7], r[7].replace(old, new) if (not lvs or i + 1 in lvs[0]) and new not in r[7] else r[7]] for i, r in enumerate(lv)]
    return desc, lv


def global_pct(slug, lv, f):
    fix = GLOBAL_PCT.get(slug)
    if not fix or not lv or lv[-1][1] != fix[0]:
        return lv, f
    d = fix[1]
    lv = [[r[0], r[1] + d, *r[2:7], r[7].replace(f"ATK {r[1]}%", f"ATK {r[1] + d}%")] if r[1] is not None else r for r in lv]
    return lv, f and re.sub(r"^(\d+)", lambda m: str(int(m.group(1)) + d), f)
# gear checked against the official client's item descriptions (System/iteminfo_enUS.lub):
# every option on these items is listed under "GvG-only options" / "Additional options in Siege areas", but roz.prontera.info
# only flags the first line as GvG-only (e.g. Guild Fist's "Guillotine Fist fixed cast -30% in Siege" read as -30% for every skill)
GVG_ONLY = {450012, 450013, 450014, 470011, 470012, 470013, 480007, 520001, 550004, 550005, 560003, 590004, 620001, 640001,
            1859, 2052, 15216, 15217, 15218, 26146, 26147, 28133}
# bonuses roz.prontera.info has wrong or missing, as the client describes them; each applies only while prontera still lacks it
RACE_CRIT = {4297: ("brute", 7), 4310: ("brute", 7), 4192: ("fish", 7)}  # "When attacking Brute/Fish monsters, CRIT +7"
# Poo Poo Hat (2289): "Damage from Demi-Human / Human players -10%" (the Demi-Human monsters you farm count)
TAKEN = {2254: ("demon", -3), 2255: ("angel", -3), 2327: ("demon", -15), 2289: ("demi_human", -10)}  # "Damage Taken from Demon/Angel Monsters -x%"
# Baby Shark / Shark Family Card (event over, the level bonus stays): garment cards; prontera has no slot and only the text
# "For every 10 BaseLv, ATK (MATK) +7, DEF +3, and MDEF +1. (Up to BaseLv 50.)"
LV_STEP = {300834: "atk", 300835: "matk"}
# "Physical / Magic damage against Boulder Dwarves +30%": prontera has only the description text, no bonus line
GROUP_DMG = {300944: ("physical_damage_percent", "boulder_dwarf", 30), 300943: ("magic_damage_percent", "boulder_dwarf", 30)}
# memorial dungeon gear whose bonus groups prontera has wrong: the armor's set lines (counted again by SETS) as its own, its
# +3 group twice, MaxHP / MaxSP and the "DEF +x" line (on top of the armor's DEF) missing, the shoes' SP Heal effect missing,
# the Oath rings' INT / DEX and LUK / AGI +2 only at +7. Replaced with the groups the Global client's item description gives
GEAR_G = {
    # Clock Casket: prontera has the refine line vs Formless and no ATK; the client: "ATK +20. Every 2 refine levels, increases Physical
    # Damage to monsters of all races by 1%. At +7 refine, HIT +15. At +9 refine, MHP +250."
    19357: [{"b": [["atk", None, None, 20]]}, {"r": 7, "b": [["hit", None, None, 15]]}, {"r": 9, "b": [["hp", None, None, 250]]},
            {"b": [["damage_percent", "race", "all", 1, 2]]}],
    15220: [{"b": [["hp", None, None, 300], ["sp", None, None, 20], ["def", None, None, 20]]}],  # Subjugation Team's Armor
    22150: [{"b": [["item_heal_percent", None, None, 5], ["sp_heal_percent", None, None, 3]]}],  # Subjugation Team Boots
    15221: [{"b": [["hp", None, None, 500], ["sp", None, None, 30], ["def", None, None, 30]]},  # Expedition's Armor
            {"r": 3, "b": [["def", None, None, 10], ["hp", None, None, 50]]}],
    15222: [{"b": [["hp", None, None, 400], ["sp", None, None, 50], ["def", None, None, 30]]},  # Expedition's Robe
            {"r": 3, "b": [["def", None, None, 5], ["sp", None, None, 10]]}],
    22151: [{"b": [["item_heal_percent", None, None, 15], ["sp_heal_percent", None, None, 5]]}, {"r": 3, "b": [["agi", None, None, 1]]}],  # Expedition Boots
    22152: [{"b": [["item_heal_percent", None, None, 10], ["sp_heal_percent", None, None, 7]]}, {"r": 3, "b": [["vit", None, None, 1]]}],  # Expedition Shoes
    28570: [{"b": [["int", None, None, 2], ["dex", None, None, 2]]}, {"r": 7, "b": [["dex", None, None, 2], ["int", None, None, 2]]}],  # Ring of Blue Oath
    28571: [{"b": [["luk", None, None, 2], ["agi", None, None, 2]]}, {"r": 7, "b": [["agi", None, None, 2], ["luk", None, None, 2]]}],  # Red Oath Ring
    # Extra Joker Card: prontera has ATK / MATK +70, MDEF +10 flat. Client: "Each refine on Shield grants MDEF +10. When equipped
    # with Joker Card, ... transform you into Joker for 7 seconds. During transformation: ATK +70, MATK +70" (the set's proc, not counted)
    27270: [{"b": [["mdef", None, None, 10, 1]]}],
    # Orc General Card: prontera has ATK +25 flat. Client: ATK +25 (and ASPD +2) only "When equipped together with High Orc Card"
    # (the set, in SETS); its own lines depend on the weapon type, not counted
    27273: [{"text": "While using a blunt weapon, increases CRIT by 1 per weapon refine, and at +10 increases Critical Damage by 10%."},
            {"text": "While using a knuckle, reduces After Attack Delay by 1% per refine, and at +10 increases ASPD by 2."}],
    # cards checked against the client's text: prontera counts set lines as the card's own (Merman: AGI / DEX and the Archer line
    # belong to the Merman, Cruiser, Anolian, Alligator & Dragon Tail set), refine conditions as always on, or leaves lines out
    4199: [{"b": [["hp_recovery_percent", None, None, 10], ["sp_recovery_percent", None, None, 10]]}],  # Merman Card
    4159: [{"b": [["agi", None, None, 2]]}, {"r": 9, "b": [["flee", None, None, 20]]}],  # Nine Tail Card: "refinement level is 9 or higher, FLEE +20"
    4288: [{"b": [["int", None, None, 2]]}, {"r": 9, "b": [["sp", None, None, 150]]}],  # Carat Card: "INT +2. If refine level >= 9, MSP +150"
    # "When equipped with a Garment refined to +9 or higher, MHP +300 and an additional ... Damage Taken from Neutral Enemies -10%"
    300551: [{"b": [["magic_damage_taken_percent", "element", "neutral", -5]]},  # A-Ji & Geffen Card
             {"r": 9, "b": [["hp", None, None, 300], ["magic_damage_taken_percent", "element", "neutral", -10]]}],
    300547: [{"b": [["damage_taken_percent", "element", "neutral", -5]]},  # Luke & Alberta Card
             {"r": 9, "b": [["hp", None, None, 300], ["damage_taken_percent", "element", "neutral", -10]]}],
    # "Physical Damage to Shellfish / Aster +30%" (the client says Shellfish for the Shell Fish Card too)
    4247: [{"b": [["atk", None, None, 5], ["physical_damage_percent", "monster_group", "shellfish", 30]]}],  # Aster Card
    4273: [{"b": [["atk", None, None, 5], ["physical_damage_percent", "monster_group", "shellfish", 30]]}],  # Shell Fish Card
    4153: [{"b": [["atk", None, None, 5], ["physical_damage_percent", "monster_group", "aster", 30]]}],  # Crab Card
    # lines prontera leaves out, not counted
    27153: [{"b": [["mdef", None, None, 250]]}, {"text": "Physical Defense -90%."}],  # Golden Thief Bug Card
    4302: [{"b": [["hp_percent", None, None, 50]]}, {"text": "User's physical and magical defense is fixed at half."}],  # Tao Gunka Card
    4322: [{"b": [["def", None, None, 1]]}, {"text": "Reflects 5% of melee physical damage received."}],  # High Orc Card
    4053: [{"b": [["sp_cost_percent", None, None, 25]]}, {"text": "[Heal] Lv 1 can be used."}],  # Vitata Card
    4212: [{"proc": "Chance to autocast Bash Lv 1 when dealing physical damage. Using Bash pushes enemies back by 5 cells.",  # Bongun Card
            "text": "Chance to autocast Bash Lv 1 when dealing physical damage. Using Bash pushes enemies back by 5 cells."},
           {"text": "Physical damage taken from Munak +100%."}],
    27275: [{"proc": "Triggers Meteor Storm Lv 1 as an auto spell at a certain probability when performing physical attacks. When Meteor "  # Bloody Knight Card
                     "Storm hits an enemy, inflicts Blind, Confusion, or Silence depending on weapon refine level.",
             "text": "Triggers Meteor Storm Lv 1 as an auto spell at a certain probability when performing physical attacks. When Meteor "
                     "Storm hits an enemy, inflicts Blind, Confusion, or Silence depending on weapon refine level."},
            {"proc": "When hit by close-range physical attacks, has a 10% chance to inflict Stun.",
             "text": "When hit by close-range physical attacks, has a 10% chance to inflict Stun."}]}
# card sets prontera doesn't have, as the client's card text gives them (Crab Card: "When equipped together with Crab, Shellfish, and
# Aster Card, Fish monsters have a chance to drop Sashimi when hunted, and Physical Damage to Water-property Monsters +30%")
EXTRA_SETS = [{"slug": "crab-shell-fish-aster-card", "name": "Crab, Shell Fish & Aster Card",
               "pieces": ["crab-card-4153", "shell-fish-card-4273", "aster-card-4247"],
               "g": [{"b": [["damage_percent", "element", "water", 30]]},
                     {"text": "Fish monsters have a chance to drop Sashimi when hunted."}]}]
# card sets whose lines are "per refine" of one item (client text): the piece that is or sits in that item, by set slug
SET_REF = {"sieglouse-arclouse-card": "arclouse-card-4240",  # FLEE +2 per shield refine
           "erzsebet-bathory-card": "bathory-card-4119",  # INT +1 per armor refine
           "jeniffer-penomena-card": "penomena-card-4314",  # ASPD +1 per 2 shield refines
           "nordtfelt-onyx-helm-gem-poring-card": "nordfeld-onyx-helm-401509",  # ATK / MATK +1 per refine of the Helm
           "nordtfelt-platinum-helm-gem-poring-card": "nordfeld-platinum-helm-401510"}


def client_fix(row):
    """Apply GVG_ONLY, GEAR_G, RACE_CRIT, TAKEN, GROUP_DMG, LV_STEP and Fur Seal Card (CRIT +9 vs Demon/Undead, Acolyte Class only) to an item row."""
    i, g = row.get("id"), row.get("g", [])
    if i in GEAR_G:
        g = GEAR_G[i]
    lines = lambda: [b for x in g for b in x.get("b", [])]
    if i in GVG_ONLY:
        g = []
    if i in RACE_CRIT and not any(b[0] == "crit" and len(b) > 1 and b[1] for b in lines()):
        race, v = RACE_CRIT[i]
        g = [{**x, "b": [b for b in x["b"] if b[0] != "crit"]} if x.get("b") else x for x in g]
        g = [x for x in g if x.get("b") or x.get("proc") or x.get("text")] + [{"b": [["crit", "race", race, v]]}]
    if i == 4312 and not any(b[0] == "crit" and len(b) > 1 and b[1] for b in lines()):
        g = [{**x, "b": [b for b in x["b"] if b[0] != "crit"]} if x.get("b") else x for x in g]
        g += [{"cls": ["acolyte"], "b": [["crit", "race", "demon", 9], ["crit", "race", "undead", 9]]}]
    if i in TAKEN and not any(b[0] == "damage_taken_percent" for b in lines()):
        race, v = TAKEN[i]
        g = g + [{"b": [["damage_taken_percent", "race", race, v]]}]
    if i in GROUP_DMG and not any(len(b) > 1 and b[1] == "monster_group" for b in lines()):
        t, grp, v = GROUP_DMG[i]
        g = g + [{"b": [[t, "monster_group", grp, v]]}]
    if i in LV_STEP and not lines():
        row["slot"] = row.get("slot") or ["garment"]
        g = [x for x in g if not (x.get("text") or "").startswith("For every 10 BaseLv")]
        g += [{"lvPer": 10, "lvMax": 50, "b": [[LV_STEP[i], None, None, 7], ["def", None, None, 3], ["mdef", None, None, 1]]}]
    if g: row["g"] = g
    else: row.pop("g", None)
    return row


def fetch(path, refresh=False):
    """Page HTML, from cache when present."""
    f = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9._-]+", "_", path.strip("/")) + ".html")
    if os.path.exists(f) and not refresh:
        return open(f, encoding="utf-8").read()
    req = urllib.request.Request(SITE + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8")
    os.makedirs(CACHE, exist_ok=True)
    open(f, "w", encoding="utf-8").write(html)
    time.sleep(1)
    return html


def nuxt(html):
    """Decode the page's __NUXT_DATA__ payload (a flat array where values point at other indexes)."""
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    A, memo = json.loads(m.group(1)), {}

    def d(i):
        if not isinstance(i, int):
            return i
        if i < 0:
            return None
        if i in memo:
            return memo[i]
        v = A[i]
        if isinstance(v, list):
            if v and v[0] in ("Reactive", "ShallowReactive", "Ref", "ShallowRef", "EmptyRef", "EmptyShallowRef"):
                memo[i] = d(v[1]) if len(v) > 1 else None
                return memo[i]
            r = memo[i] = []
            r.extend(d(x) for x in (v[1:] if v and v[0] == "Set" else v))
            return r
        if isinstance(v, dict):
            r = memo[i] = {}
            for k, x in v.items():
                r[k] = d(x)
            return r
        return v
    return d(0)["data"]


def groups(gs):
    """Bonus groups -> compact dicts. GvG/siege-only groups are dropped; procs/autocasts keep only their text."""
    out = []
    for g in gs or []:
        if g.get("siege_only"):
            continue
        o = {}
        for k, short in (("refine_min", "r"), ("refine_sum_min", "rs"), ("min_base_level", "lv")):
            if g.get(k) is not None:
                o[short] = g[k]
        if g.get("condition_class_slugs"):
            o["cls"] = g["condition_class_slugs"]
        if g.get("proc_trigger") or g.get("autocast_skill") or g.get("inflict_status") or g.get("proc_chance_percent"):
            o["proc"] = g.get("effect_text") or ""
        name = lambda v: v.get("name") if isinstance(v, dict) else v  # skills come as {slug, name}
        b = [[x["bonus_type"], x.get("target_kind"), x.get("target"), x["value"], x.get("per_refine_levels"),
              name(x.get("target_skill")), name(x.get("scaling_skill"))] for x in g.get("bonuses") or []
             if x.get("target_kind") != "player"]  # PvP-only lines don't matter for farming
        for x in b:  # trim trailing nulls
            while x and x[-1] is None:
                x.pop()
        if b:
            o["b"] = b
        pvp_only = bool(g.get("bonuses")) and not b  # every line targeted players
        if g.get("effect_text") and not b and not pvp_only:
            o["text"] = g["effect_text"]
        if o.get("b") or o.get("proc") or o.get("text"):
            out.append(o)
    return out


def item_row(slug):
    d = nuxt(fetch(f"/items/{slug}"))
    k = next(k for k in d if k.startswith("item-") and k.endswith("-en"))
    page = d[k]
    it = page["item"]
    # names as the game client spells them: a straight apostrophe ("Subjugation Team's Armor", not prontera's "Team’s")
    row = {"id": it["item_id_ingame"], "slug": slug, "name": it["name"].replace("’", "'"), "slot": it.get("equip_slots") or ([it["equip_slot"]] if it.get("equip_slot") else None),
           "type": it.get("weapon_type"), "el": it.get("element"), "slots": it.get("slots") or 0,
           "lv": it.get("min_level") or 0, "wlv": it.get("weapon_level") or 0,
           # weapon and shield weight, as in game: Axe Boomerang, Shield Boomerang and Rapid Smiting add it to their damage %
           # (starter and guild weapons have none: weightless)
           "w": it.get("weight") or None if {"weapon", "shield"} & set(it.get("equip_slots") or [it.get("equip_slot")]) else None,
           "refine": it.get("refine_schedule"),
           "atk": it.get("physical_attack") or 0, "matk": it.get("magic_attack") or 0,
           "def": it.get("physical_defense") or 0, "mdef": it.get("magic_defense") or 0,
           "jobs": [c.get("slug") or c.get("name") if isinstance(c, dict) else c for c in page.get("required_classes") or []],
           "g": groups(page.get("bonus_groups"))}
    # flat stat columns (e.g. "MHP +15", a card's "ATK +20") often have no bonus line; add them unless a line already covers that stat
    cols = {"str": "str", "agi": "agi", "vit": "vit", "int": "int", "dex": "dex", "luck": "luk", "hit": "hit", "flee": "flee", "crit": "crit", "hp": "hp", "sp": "sp"}
    if page.get("section") == "cards":
        cols.update({"physical_attack": "atk", "magic_attack": "matk", "physical_defense": "def", "magic_defense": "mdef"})
        for k in ("atk", "matk", "def", "mdef"):
            row.pop(k, None)
    have = {b[0] for g in row["g"] for b in g.get("b", [])}
    flat = [[t, None, None, it[c]] for c, t in cols.items() if it.get(c) and t not in have]
    if flat:
        row["g"].insert(0, {"b": flat})
    sets = [{k: v for k, v in {"slug": s["slug"], "name": s["name"], "pieces": s["piece_slugs"], "ref": SET_REF.get(s["slug"]),
                               "g": groups(s.get("bonus_groups"))}.items() if v is not None}
            for s in page.get("sets") or []]
    return client_fix({k: v for k, v in row.items() if v not in (None, [], "")}), sets


def write(name, header, body):
    with open(os.path.join(ROOT, "data", name), "w", encoding="utf-8", newline="\n") as f:
        f.write(header.rstrip() + "\n" + body + "\n")


def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def main():
    refresh = "--refresh" in sys.argv
    first = nuxt(fetch("/equipment", refresh))
    lst = next(v for k, v in first.items() if k.startswith("item-list"))
    slugs = [x["slug"] for x in lst["data"]]
    for p in range(2, lst["meta"]["pageCount"] + 1):
        d = nuxt(fetch(f"/equipment?page={p}", refresh))
        slugs += [x["slug"] for x in next(v for k, v in d.items() if k.startswith("item-list"))["data"]]
    cards = [c["slug"] for c in nuxt(fetch("/cards", refresh))["card-index-en"]["cards"]]
    print(f"{len(slugs)} equipment, {len(cards)} cards", flush=True)

    equip, card_rows, sets, skipped = [], [], {}, []
    for i, s in enumerate(slugs + cards, 1):
        try:
            row, ss = item_row(s)
        except Exception as e:
            print(f"  skip {s}: {e}", flush=True)
            skipped.append(s)
            continue
        (card_rows if i > len(slugs) else equip).append(row)
        for x in ss:
            sets[x["slug"]] = x
        if i % 100 == 0:
            print(f"  {i}/{len(slugs) + len(cards)}", flush=True)
    for x in EXTRA_SETS:
        sets.setdefault(x["slug"], x)

    src = "Exported by tools/export_prontera.py from roz.prontera.info"
    fields = ("// fields: id, slug, name, slot (every slot it takes), type (weapon type), el, slots, lv (required), wlv (weapon level), w (weapon and shield weight, as in game; none = weightless), refine (schedule),\n"
              "// atk, matk, def, mdef, g: bonus groups {r: min refine, rs: min combined refine, lv: min base level, cls: job slugs, lvPer / lvMax: lines count once per lvPer base levels up to lvMax,\n"
              "// proc: text of an effect that isn't a plain stat, b: [[type, target kind, target, value, per N refines, skill, scaling skill]]}")
    write("equipment.js", f"// Equipment ({src}); GvG-only bonuses are left out.\n{fields}\n// SETS: combos by item or card slug, same bonus groups; ref: the piece whose item's refine per-refine lines count.",
          f"const EQUIP={js(equip)};\nconst SETS={js(list(sets.values()))};")
    # the names cards give their gear come from tools/export_cardnames.py: keep the ones already there, so a failed run of it loses none
    old = os.path.join(ROOT, "data", "cards.js")
    if os.path.exists(old):
        src_js = open(old, encoding="utf-8").read()
        had = {c["id"]: c for c in json.loads(src_js[src_js.index("[", src_js.index("const CARDS=")):src_js.rindex("]") + 1])}
        for c in card_rows:
            for k in ("affix", "affixPos"):
                if k in had.get(c["id"], {}):
                    c[k] = had[c["id"]][k]
    write("cards.js", f"// Cards ({src}); same fields as data/equipment.js, plus affix / affixPos: the name the card gives the gear it's in, before\n"
          "// the item's name (\"prefix\": Hydra Card's \"Bloody\") or after it (\"suffix\": Verit Card's \"of Health\"), from tools/export_cardnames.py.",
          f"const CARDS={js(card_rows)};")

    rf = nuxt(fetch("/refine", refresh))["refine"]["schedules"]
    refine = {s["key"]: [[x["bonus_atk"], x["bonus_matk"], x["bonus_def"]] for x in s["steps"]] for s in rf}
    write("refine.js", f"// Refine bonus totals at +1, +2, ... per schedule: [ATK, MATK, DEF] ({src})", f"const REFINE={js(refine)};")

    # skill trees: per job the planner returns Novice, 1st and 2nd job trees
    skills = {}
    for j in JOBS:
        v = nuxt(fetch(f"/skills/planner?class={j.lower()}", refresh))[f"skill-planner-{j.lower()}"]
        v = v if isinstance(v, list) else list(v.values())[0]
        slug_of = {sk["id"]: sk["slug"] for t in v for sk in t["skills"]}
        trees = []
        for t in v:
            rows = []
            for sk in t["skills"]:
                if (t["job_class"]["name"], sk["slug"]) in NOT_IN_CLIENT:
                    continue
                lv = [[L.get("sp_cost") or 0, L.get("damage_ratio_percent"), L.get("hit_count"), L.get("cast_variable_ms"), L.get("cast_fixed_ms"),
                       L.get("after_cast_delay_ms"), L.get("cooldown_ms") if L.get("cooldown_ms") is not None else CLIENT_FIX.get(sk["slug"], {}).get("cooldown_ms"), L.get("description_text") or ""]
                      for L in sorted(sk["levels"], key=lambda L: L["level"])]
                lv, f = global_pct(sk["slug"], lv, sk.get("damage_formula_expression"))
                desc, lv = client_text(sk["slug"], (sk.get("description") or "").strip(), lv)
                row = {"slug": sk["slug"], "name": sk["name"], "desc": desc, "max": sk["max_level"], "slot": sk["tree_slot"], "passive": sk["passive"] == "passive",
                       "el": sk.get("element"), "pre": PRE_FIX.get((t["job_class"]["name"], sk["slug"]), [[slug_of.get(p["skill_id"], p["skill_id"]), p["level"]] for p in sk.get("prerequisites") or []]),
                       "f": f, "lv": lv, "g": groups(sk.get("bonus_groups")), "free": True if QUEST_FIX.get(sk["slug"], sk.get("free")) else None,
                       "def": True if sk.get("is_default") or sk["slug"] in GIVEN_FIX else None,
                       "icon": (sk.get("image") or "").rsplit("/", 1)[-1] or None}
                rows.append({k: x for k, x in row.items() if x not in (None, [], "")})
            trees.append({"job": t["job_class"]["name"], "points": POINTS_FIX.get(t["job_class"]["name"], t.get("skill_points")), "skills": rows})
        skills[j] = trees
    write("skills.js", f"// Skill trees per job: Novice, 1st and 2nd job trees with points, and per skill slug, name, desc (what the skill does), max level, slot (grid position),\n"
          f"// passive, free (quest skill, no points), def (given at the job change), el, pre: [[skill slug, level]], f: damage formula, lv: per level [SP, damage %, hits, variable cast ms, fixed cast ms,\n"
          f"// after-cast delay ms, cooldown ms, description], g: bonus groups, icon: the skill's icon ({SITE}/assets/<icon>, fetched by tools/export_icons.py) ({src})", f"const SKILLS={js(skills)};")
    print(f"wrote {len(equip)} equipment, {len(card_rows)} cards, {len(sets)} sets, {len(refine)} refine schedules", flush=True)
    if skipped:  # these are missing from the data files; rerun to retry them
        print(f"WARNING: {len(skipped)} item(s) failed and were left out: {', '.join(skipped)}", flush=True)


if __name__ == "__main__":
    main()
