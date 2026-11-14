"""Export the daily quests NPCs give, from the game client, for the Daily quests tab: writes data/dailies.js.

    python tools/export_dailies.py                                  # client in C:\\Gravity\\RagnarokZero
    python tools/export_dailies.py --client "D:\\Games\\RagnarokZero"
    python tools/export_dailies.py --patches                        # the newest copies on the public patch server instead

What it reads (read-only):
- the quest log, System\\OngoingQuestInfoList_enUS.lub: each daily has a "<title> - Pending" entry ("This is a daily quest ... Quest
  available from [NPC] ...", Reset at 04:00 UTC+0) just after the hunt itself (its Summary: "Defeat 10 Hunter Fly"), and often an
  "<title> Again Today" entry, the one you take every day after the first. The hunt's <NAVI> tags say where to go;
- the Navigation's NPC table (data.grf, navi_npc.lub): where the NPC stands. A daily whose NPC it doesn't place yet is in the client
  for later (live: false; the page shows it with Future content on). Its names are keys into the translation tables below;
- the NPC dialogue (data.grf, data\\i18n\\sc\\*.csv: key, then each language in base64, English third), for the level a daily needs:
  "- This quest can be undertaken at Level 80 or higher. -" comes after the lines of the NPC that says it. An NPC with one such line
  gives that level to all its dailies; LEVELS has the dailies of NPCs with more than one (or a name two NPCs share), from the lines
  around each. Every level line near a daily's NPC is printed with the level it gave, so a new one shows.
--patches reads the quest log, the NPC table and the dialogue files from the patch server (tools/check_patch.py, cached in
tools/cache/patches): the quest log and NPC table whole, but only the dialogue files a patch has carried, so older NPCs' level lines
can be missing. Run it with the installed client when you can.

Monsters in a daily's task are matched by name against data/mobs.js and the client's spawn list (data/client.js mobLv), with
MOB_ALIAS for the names the quest log writes differently.

Writes data/dailies.js. Standard library only.
"""
import base64, csv, io, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import DATA, lua_data  # noqa: E402

NAVI_NPC = "data\\luafiles514\\lua files\\navigation\\navi_npc.lub"
I18N = "data\\i18n\\sc\\"
OUT = os.path.join(DATA, "dailies.js")
# the quest log's ids for NPC quests (Payon to Pharos) and event quests; the rest are raids, attendance, memorial dungeon timers
QUEST_IDS = [(21000, 23999), (1300000, 1300999)]
# daily-looking entries that aren't an NPC's daily: a story step, the town's thank-you buff, the Kumamon collaboration (ended
# 2026-10-29: its NPCs are still in the client)
SKIP = {21134, 23446, 23449}
SKIP_TITLES = {"Trust of the Town"}
# the dailies of an NPC with more than one level line, or whose name another daily NPC shares, by "- Pending" id: the level and the line
LEVELS = {
    # Junior Mage (Geffen): "you'll need to gain a bit more experience first" / Lv 55 when you first talk to him; "you'll need a bit
    # more training before you can head up to the 3rd floor" / Lv 80, then the 1st and 2nd floor hunts are offered instead
    21102: 55, 21105: 55, 21108: 80,
    # Serdin, the Tower Keeper (Al De Baran): "You should be at least Level 60" for the 1st floor, "Level 70" for the living clocks
    21287: 60, 21289: 70,
    # Honest in the Morroc Ruins (another Honest stands in the Undersea Cave): "We're not strong enough to handle this ourselves, so
    # we'll have to ask other adventurers for help" / Lv 60, after his three dailies and the Old Scholar's lines. His other line, "If you
    # were a little stronger, I might've grabbed onto your pant leg and begged you to help" / Lv 40, is for finding Maxim's team in the
    # Pyramid, before the dailies
    21214: 60, 21216: 60, 21218: 60,
    # Honest in the Undersea Cave: "Uh... you're going down there? Be careful. It might be dangerous. You could end up getting hurt, like
    # me." / Lv 50, his only line, before he asks you to find Maxim's party and then for the Swordfish and Marc
    21238: 50,
    # Maxim Leader in the Pyramid (another Maxim Leader stands in the Undersea Cave): "Oh? An adventurer, are you? ... it might be a bit
    # dangerous up ahead" / Lv 40, his only line, before he asks for Memento from Mummy
    21220: 40,
    # Suerte (Pharos Lighthouse): "Hey, fancy seeing you in a place like this. Are you an adventurer too?" / Lv 30 before the ants
    # (Pierre, Andre, Deniro); "there is something else I'd like to ask of you, but... I think that might be too much for now" / Lv 40
    # before the Raggler
    22509: 30, 22512: 40,
}
# monster names the quest log writes differently from the planner and the client's spawn list
MOB_ALIAS = {"Petite (Flying)": 1156, "Petite (Ground)": 1155, "Flying Petite": 1156, "Boa": 1025, "Pirate Skel": 1071,
             "Wanderer": 1208, "Seeotter": 1323}
# a word before a monster's name that's part of the name the quest uses ("Axe Goblin": not the planner's Goblin), unless it's one of these
NOT_NAME = {"defeat", "hunt", "and", "the", "each", "of", "kill", "eliminate", "collect", "observe", "nearby", "or", "with", "from"}
LEVEL_LINE = re.compile(r"(?:can be (?:undertaken|accepted|started)|requires|quest (?:is )?(?:available )?for|is a quest for|need to be at least|"
                        r"should be at least)\D{0,40}?(?:Level|Lv\.?)\s*(\d+)", re.I)
TAG = re.compile(r"<NAVI>\[([^\]]+)\]<INFO>(\w+?)(?:\.gat)?,(\d+),(\d+)[^<]*</INFO></NAVI>")


def clean(s):
    s = re.sub(r"<INFO>[^<]*</INFO>|</?(?:NAVI|ITEM|TIPBOX)>|\^[0-9a-fA-F]{6}", "", str(s))
    return re.sub(r"\s+", " ", re.sub(r"\[([^\]]*)\]", r"\1", s)).strip()


def text(q):
    return " ".join(str(x) for _, x in sorted((q.get("Description") or {}).items(), key=lambda kv: str(kv[0]).zfill(4)))


def dialogue_rows(files):
    """[(file, English line)] in each file's order, from the translation tables' (name, bytes) pairs"""
    out = []
    for name, b in files:
        for row in csv.reader(io.StringIO(b.decode("utf-8", "replace"))):
            if len(row) > 2 and row[2]:
                try:
                    out.append((name, row[0], base64.b64decode(row[2]).decode("utf-8").strip()))
                except ValueError:
                    pass
    return out


def from_client(client):
    from export_minimaps import DesGrf
    grf = DesGrf(os.path.join(client, "data.grf"))
    quests = lua_data(open(os.path.join(client, "System", "OngoingQuestInfoList_enUS.lub"), "rb").read(), "utf-8")["QuestInfoList_string"]
    npcs = lua_data(grf.read(NAVI_NPC), "utf-8")["Navi_Npc"]
    files = [(n, grf.read(n)) for n in sorted(grf.ents) if n.startswith(I18N) and n.endswith(".csv")]
    return quests, npcs, dialogue_rows(files)


def from_patches():
    import check_patch as cp
    rows = cp.patch_list()
    t = cp.latest(rows, {"ongoingquestinfolist_enus", "navi_npc"})
    quests = lua_data(t["ongoingquestinfolist_enus"], "utf-8")["QuestInfoList_string"]
    npcs = lua_data(t["navi_npc"], "utf-8")["Navi_Npc"]
    newest = {}
    for _, f in rows:
        if "live_client" in f and f.endswith(".gpf"):
            for e in cp.gpf_table(f):
                if e[0].lower().startswith(I18N) and e[0].lower().endswith(".csv"):
                    newest[e[0].lower()] = (f, e)
    files = [(n, cp.gpf_file(f, e)) for n, (f, e) in sorted(newest.items())]
    return quests, npcs, dialogue_rows(files)


def mob_names():
    """{lower-case name: monster id}: the planner's monsters, then the client's spawn list for the ones it doesn't have"""
    names = {}
    src = open(os.path.join(DATA, "mobs.js"), encoding="utf-8").read()
    for i, n in re.findall(r"\[(\d+),\"([^\"]+)\"", src[src.index("const MOBS="):]):
        names.setdefault(n.lower(), int(i))
    src = open(os.path.join(DATA, "client.js"), encoding="utf-8").read()
    lv = json.JSONDecoder().raw_decode(src, src.index("{", src.index('"mobLv":')))[0]
    for i, v in lv.items():
        names.setdefault(str(v[0]).lower(), int(i))
    names.update({k.lower(): v for k, v in MOB_ALIAS.items()})
    return names


def mobs_in(task, names):
    """the monsters a task names, in its order: the longest name that fits wins (Orc Zombie before Orc)"""
    found, low = [], task.lower()
    for n in sorted(names, key=len, reverse=True):
        for m in re.finditer(r"(?<![\w(])" + re.escape(n) + r"(?![\w)])", low):
            before = re.search(r"([A-Za-z][\w'’-]*)\s+$", task[:m.start()])
            if before and before.group(1)[0].isupper() and before.group(1).lower() not in NOT_NAME:
                continue
            if not any(a <= m.start() < b for a, b, _ in found):
                found.append((m.start(), m.end(), names[n]))
    return list(dict.fromkeys(i for _, _, i in sorted(found)))


def giver(desc):
    """the NPC a "- Pending" entry says to go back to"""
    m = re.search(r"\bfrom\b(.*)", desc, re.S)
    if not m:
        return None
    b = re.search(r"\[([^\]]+)\]", m.group(1))
    if b:
        return b.group(1)
    p = re.match(r"\s*(?:the\s+)?([A-Z][\w'’ ]*?)\s+(?:outside|in|at|on|by|near)\b", m.group(1))
    return p.group(1) if p else None


def main():
    if "--patches" in sys.argv:
        quests, npc_rows, said = from_patches()
    else:
        quests, npc_rows, said = from_client(sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero")
    tr = {k: v for _, k, v in said}
    name = lambda s: tr.get(s.strip("\x1c"), "") if isinstance(s, str) and s.startswith("\x1c") else (s or "")
    navi_names = {name(r.get(5)) for r in npc_rows.values() if isinstance(r, dict)} - {""}
    placed = {}  # NPC name -> [(map, x, y)]: channels (geffen_a) count as their map
    for r in npc_rows.values():
        if isinstance(r, dict) and isinstance(r.get(1), str):
            placed.setdefault(name(r.get(5)), []).append((re.sub(r"_[a-dyz]$", "", r[1]), r.get(7), r.get(8)))
    q = {int(k): v for k, v in quests.items() if isinstance(v, dict) and str(k).isdigit()}
    names = mob_names()
    src = open(os.path.join(DATA, "minimaps.js"), encoding="utf-8").read()
    towns = json.JSONDecoder().raw_decode(src, src.index("{", src.index("const TOWNS=")))[0]
    towns.update({c.split("_")[0] + "_": t for c, t in list(towns.items())})  # a town's fields and dungeons (pay_arche: Payon)

    rows = []
    for k in sorted(q):
        v, d = q[k], text(q[k])
        if k in SKIP or not any(a <= k <= b for a, b in QUEST_IDS) or str(v.get("Title")) in SKIP_TITLES:
            continue
        if not (re.search(r"daily quest|accepted? (?:it |the quest )?again", d, re.I) or str(v.get("Summary", "")).startswith("Reset at 04")):
            continue
        who = giver(d)
        if not who:
            print(f"  {k} {v.get('Title')}: no NPC named, left out")
            continue
        title = re.sub(r"^\(Daily\)\s*|\s*-\s*Pending$", "", str(v["Title"]))
        # the hunt: the entry of the same title (or its "Again Today") just after this one (the one you retake every day), else just
        # before it, else the nearest one before it with a task
        def usable(j):
            return j in q and "Pending" not in str(q[j].get("Title")) and str(q[j].get("Title")) not in SKIP_TITLES and j not in SKIP
        named = lambda j: re.sub(r"^\(Daily\)\s*|\s*Again Today$", "", str(q[j].get("Title"))) == title
        after = [j for j in range(k + 1, k + 4) if usable(j)]
        before = [j for j in range(k - 1, k - 7, -1) if usable(j)]
        hunt = ([j for j in after[:2] if named(j)] or [j for j in before if named(j)][:1]
                or [j for j in before[:1] if q[j].get("Summary") or text(q[j])])
        if not hunt:
            print(f"  {k} {title}: no hunt entry found, left out")
            continue
        main_q = q[hunt[0]]
        task = clean(main_q.get("Summary") or "")
        if not task or task.startswith("Reset at"):
            said_ = [x.strip() for x in re.split(r"(?<=[.!])\s+", clean(text(main_q))) if x.strip()]
            task = next((x for x in said_ if re.search(r"\b(defeat|collect|bring|hunt|obtain|deliver|retrieve)\b", x, re.I)), said_[0] if said_ else title)
        task = task.rstrip(".")
        # where the NPC stands: the spot the quest log gives for it, which the Navigation places an NPC at (within a few cells) when it's in
        # the game; with no spot in the quest log, the Navigation's NPC of that name, in the town the entry names
        tags = [t for j in [k, *hunt] for t in TAG.findall(text(q[j]))]
        own = next(((mp, int(x), int(y)) for n, mp, x, y in tags if n == who), None)
        if own:
            near = [p for ps in placed.values() for p in ps if p[0] == own[0] and abs(p[1] - own[1]) + abs(p[2] - own[2]) <= 6]
            # a spot the quest log has wrong (Junior Mage: 126,133 in one entry, 126,113 in the others and the Navigation): the
            # Navigation's NPC of that name on that map
            moved = sorted((p for p in placed.get(who, []) if p[0] == own[0]), key=lambda p: abs(p[1] - own[1]) + abs(p[2] - own[2]))
            live, at = bool(near or moved), own if near or not moved else moved[0]
        else:
            spots = sorted(placed.get(who, []), key=lambda p: not any(t.lower() in d.lower() for c, t in towns.items() if p[0].startswith(c)))
            live, at = bool(spots), spots[0] if spots else None
        at = f"{at[0]} {at[1]} {at[2]}" if at else None
        # where to go: the hunt's other tags (a place: a map code and a spot, not a monster's tag), not the NPC's own spot
        where = []
        for n, mp, x, y in tags:
            n = re.sub(r"«T:([^»]*)»", r"\1", n).lstrip(":").strip()
            if n == who or not re.fullmatch(r"[a-z][a-z0-9_]*", mp) or (x, y) == ("0", "0"):
                continue
            if own and own[0] == mp and abs(own[1] - int(x)) + abs(own[2] - int(y)) < 6:
                continue
            if [n, f"{mp} {x} {y}"] not in where:
                where.append([n, f"{mp} {x} {y}"])
        row = {"id": k, "title": title, "npc": [who, at], "lv": LEVELS.get(k), "task": task}
        if where:
            row["where"] = where
        ms = mobs_in(task, names)
        if ms:
            row["mobs"] = ms
        if not live:
            row["live"] = False
        rows.append(row)

    # level lines: each goes to the nearest daily NPC before it in its file, named on a line of its own or as the speaker
    givers = {r["npc"][0] for r in rows}
    found = {}
    for i, (f, _, t) in enumerate(said):
        m = LEVEL_LINE.search(t)
        if not m:
            continue
        for j in range(i - 1, max(-1, i - 60), -1):
            if said[j][0] != f:
                break
            s = re.match(r"\[([^\]]+)\]", said[j][2])
            who = said[j][2] if said[j][2] in givers else s.group(1) if s and s.group(1) in givers else None
            if who:
                found.setdefault(who, []).append(int(m.group(1)))
                break
            if said[j][2] in navi_names:  # another NPC's name: its lines start here
                break
    for who, lvs in sorted(found.items()):
        mine = [r for r in rows if r["npc"][0] == who]
        spots = [r["npc"][1].split() for r in mine if r["npc"][1]]
        shared = any(a[0] != b[0] or abs(int(a[1]) - int(b[1])) + abs(int(a[2]) - int(b[2])) > 6 for a in spots for b in spots)
        if len(set(lvs)) == 1 and not shared:
            for r in mine:
                if r["lv"] is None:
                    r["lv"] = lvs[0]
        print(f"  {who}: level lines {sorted(set(lvs))} -> " + ", ".join(f"{r['title']} {r['lv']}" for r in mine))

    for r in rows:
        if r["npc"][1] is None:
            print(f"  {r['id']} {r['title']}: no spot for {r['npc'][0]}")
        if not r.get("mobs") and re.match(r"(Defeat|Hunt)", r["task"]):
            print(f"  {r['id']} {r['title']}: no monster matched in {r['task']!r}")
    head = """// The daily quests NPCs give, from the game client (tools/export_dailies.py: the quest log, the Navigation's NPCs and the NPC
// dialogue). DAILIES: one per daily, by its "- Pending" quest log id: title, npc [name, "map x y" where it stands, or null], lv (the
// base level its NPC's dialogue asks for, or null where the client has none), task (the quest log's, the one you take every day after
// the first), where [[the quest log's name for it, "map x y"]] (where it sends you), mobs (the monsters the task names, by id), live
// false when the Navigation doesn't place its NPC yet (in the client for later). Every daily resets at 04:00 UTC+0.
"""
    body = ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    open(OUT, "w", encoding="utf-8", newline="\n").write(head + "const DAILIES=[\n" + body + "];\n")
    print(f"{len(rows)} dailies ({sum(r.get('live', True) for r in rows)} live, {sum(r['lv'] is not None for r in rows)} with a level) -> {OUT}")


if __name__ == "__main__":
    main()
