"""Build data/mobskills.js: the skills each monster uses (MOBSKILL), which monsters poison you (MOBPOISON) and which ones join a
fight their kind is in (MOBASSIST).

    python tools/export_mobskills.py            # fetch what isn't cached, then write data/mobskills.js
    python tools/export_mobskills.py --refresh  # refetch everything
    python tools/export_mobskills.py --client PATH   # the installed client (default C:\\Gravity\\RagnarokZero), for skill names

The client has no monster skill tables (they live on the game server), so:
- MOBSKILL {id: [[skill id, state, level, chance %, cast ms, delay ms, condition, interruptible 0/1], ...]} and MOBSKILLNAME
  {skill id: name}: divine-pride.net's monster pages (the Skills tab, the "default" table: kRO's official server tables, the
  same whichever server the site is set to), for the monster ids in data/mobs.js. Pages are fetched one per second and cached in
  tools/cache/ (gitignored); delete a cached file to refetch it. Skill names are the client's English ones where it has one
  (skillinfoz/skillinfolist.lub, read-only), else divine-pride's, else NAME_FIX or the skill's id made readable.
- MOBPOISON {id: [skill level, rate per attack /10000, delay ms]} from rAthena's pre-renewal mob_skill_db.txt: NPC_POISON (Poison
  Attack) used while the monster attacks you (state attack, angry or anytarget). With several rows the highest rate is kept.
- MOBASSIST [id, ...] from rAthena's pre-renewal mob_db.yml: the Assist mode (0x8), from the Aegis AI type (03, 07 and 13 have
  it) or a Modes: Assist line. Zero's own monsters (Boulder Dwarves ...) aren't in rAthena, so they get neither.
"""
import html, json, os, re, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_spawns import grf_file, lua_data  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
RATHENA = "https://raw.githubusercontent.com/rathena/rathena/master/db/pre-re/"
DP = "https://www.divine-pride.net"
UA = "poring-planner data export"
ASSIST_AI = {"03", "07", "13"}
STATES = {"attack", "angry", "anytarget"}
SKILLS = "data\\luafiles514\\lua files\\skillinfoz\\"
# divine-pride's untranslated conditions (Aegis's IF_ checks, without their values: how few slaves, which skill...)
COND = {"Slavenum": "few slaves left", "Skilluse": "you use a skill on it", "Rangeattacked": "hit from range",
        "Comradehp": "an ally is hurt", "Heavydamage": "a heavy hit", "Jobcheck": "against some jobs", "Hiding": "someone hides near it",
        "Groundattackcheck": "hit by a ground skill", "Alchemist": "an Alchemist near it", "Magiclocked": "its target is casting",
        "Trickcasting": "trick casting"}
# skills neither the client nor divine-pride has an English name for (divine-pride shows the bare skill id)
NAME_FIX = {741: "Phantom Thrust", 764: "Bleeding"}


def fetch(name, refresh):
    path = os.path.join(CACHE, "rathena-pre-re-" + name)
    if refresh or not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(RATHENA + name, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    with open(path, encoding="utf-8") as f:
        return f.read()


def dp_page(mid, refresh):
    """divine-pride's page for a monster id, from cache when present; "" when it has none."""
    f = os.path.join(CACHE, f"divinepride_mob_{mid}.html")
    if os.path.exists(f) and not refresh:
        return open(f, encoding="utf-8").read()
    req = urllib.request.Request(f"{DP}/database/monster/{mid}", headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                text = r.read().decode("utf-8")
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                text = ""
                break
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


def cell(c):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c))).strip()


def dp_skills(text):
    """the Skills tab's default table: [(skill id, divine-pride's name, interruptible, state, level, chance, cast, delay, condition)]"""
    m = re.search(r'<tbody class="monster-version-block" data-version="default"[^>]*>(.*?)</tbody>', text[text.find('id="skills"'):], re.S)
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", m.group(1) if m else "", re.S):
        sid = re.search(r'/database/skill/(\d+)"', tr)
        cells = [cell(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if sid and len(cells) == 9:
            rows.append((int(sid.group(1)), *cells[1:]))
    return rows


def our_ids():
    with open(os.path.join(ROOT, "data", "mobs.js"), encoding="utf-8") as f:
        return {int(x) for x in re.findall(r"\[(\d+),\"", f.read())}


def poison(text, ids):
    out = {}
    for line in text.splitlines():
        if line.startswith("//") or "@NPC_POISON," not in line:
            continue
        p = line.split(",")
        mid, state, lv, rate, delay = int(p[0]), p[2], int(p[4]), int(p[5]), int(p[7])
        if mid in ids and state in STATES and (mid not in out or rate > out[mid][1]):
            out[mid] = [lv, rate, delay]
    return out


def assist(text, ids):
    out = []
    for block in re.split(r"\n  - Id: ", text)[1:]:
        mid = int(block.split("\n", 1)[0])
        ai = re.search(r"\n    Ai: (\d+)", block)
        mode = re.search(r"\n      Assist: (true|false)", block)
        on = mode.group(1) == "true" if mode else bool(ai and ai.group(1) in ASSIST_AI)
        if mid in ids and on:
            out.append(mid)
    return sorted(out)


def client_names(client):
    """{skill id: English name} from the installed client's skillinfolist_enus.lub; {} without a client"""
    grf = os.path.join(client, "data.grf")
    if not os.path.exists(grf):
        print(f"no client at {client}: divine-pride's skill names only", file=sys.stderr)
        return {}
    sk = lua_data(grf_file(grf, SKILLS + "skillid.lub"), "utf-8", lenient=True)
    info = lua_data(grf_file(grf, SKILLS + "skillinfolist_enus.lub"), "utf-8", lenient=True, env=sk)["SkillInfoList_string"]
    return {k: v["SkillName"] for k, v in info.items() if isinstance(k, int) and (v or {}).get("SkillName")}


def ms(t):
    """divine-pride's "0,5 sec" / "instant" / "none" in ms"""
    m = re.match(r"([\d,]+) sec", t)
    return round(float(m.group(1).replace(",", ".")) * 1000) if m else 0


def readable(t):
    """a condition, short, as the page shows it"""
    m = re.match(r"If the monster's health drops below (\d*)%\.", t)
    if m:
        return f"its HP below {m.group(1)}%" if m.group(1) else "its HP low"  # some rows have no number on divine-pride
    m = re.match(r"If the number of nearby players are at least (\d+)\.", t)
    if m:
        return f"{m.group(1)}+ players near it"
    if t == "If monster can't reach player who damaged it.":
        return "can't reach who hit it"
    return COND.get(t, t)


def skills(pages, names):
    """MOBSKILL and MOBSKILLNAME; rows that differ only in state become one row with the states joined"""
    out, used = {}, {}
    for mid, rows in pages.items():
        merged = {}
        for sid, name, intr, state, lv, ch, cast, delay, cond in rows:
            ch = float(ch.rstrip("%").replace(",", "."))
            key = (sid, int(lv), int(ch) if ch == int(ch) else ch, ms(cast), ms(delay), readable(cond), int(intr == "yes"))
            merged.setdefault(key, []).append(state)
            used[sid] = names.get(sid) or NAME_FIX.get(sid) or name
        out[mid] = [[k[0], ", ".join(dict.fromkeys(v)), *k[1:]] for k, v in merged.items()]
    return out, used


def main():
    refresh = "--refresh" in sys.argv
    client = sys.argv[sys.argv.index("--client") + 1] if "--client" in sys.argv else r"C:\Gravity\RagnarokZero"
    ids = our_ids()
    pages = {}
    for n, mid in enumerate(sorted(ids)):
        text = dp_page(mid, refresh)
        if text:
            pages[mid] = dp_skills(text)
        print(f"\r{n + 1}/{len(ids)} monster pages", end="", file=sys.stderr)
    print(file=sys.stderr)
    msk, names = skills(pages, client_names(client))
    pz = poison(fetch("mob_skill_db.txt", refresh), ids)
    asst = assist(fetch("mob_db.yml", refresh), ids)
    dump = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(ROOT, "data", "mobskills.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// The skills each monster uses, from divine-pride.net (kRO's official tables), names from the client where it has them (tools/export_mobskills.py):\n")
        f.write("// MOBSKILL {id: [[skill id, states, level, chance %, cast ms, delay ms, condition, interruptible 0/1], ...]} ([] = none listed), MOBSKILLNAME {skill id: name}\n")
        f.write("const MOBSKILLNAME={" + ",".join(f"{k}:{dump(v)}" for k, v in sorted(names.items())) + "};\n")
        f.write("const MOBSKILL={\n" + ",\n".join(f"{k}:{dump(v)}" for k, v in sorted(msk.items())) + "};\n")
        f.write("// Monsters that poison you: {id: [NPC_POISON level, rate per attack /10000, delay ms]}, and ones that assist their kind (rAthena pre-renewal)\n")
        f.write("const MOBPOISON={" + ",".join(f"{k}:[{v[0]},{v[1]},{v[2]}]" for k, v in sorted(pz.items())) + "};\n")
        f.write("const MOBASSIST=[" + ",".join(map(str, asst)) + "];\n")
    print(f"{len(msk)} monsters with a skill table ({sum(1 for v in msk.values() if v)} use skills), {len(names)} skills; "
          f"no page for {', '.join(map(str, sorted(ids - set(msk)))) or 'none'}; {len(pz)} poison, {len(asst)} assist")
    odd = sorted({n for n in names.values() if not n.isascii() or "_" in n} | {r[6] for v in msk.values() for r in v if r[6][:1].isupper()})
    if odd:
        print("names or conditions with no English text yet (NAME_FIX, COND):", ", ".join(odd))


if __name__ == "__main__":
    main()
