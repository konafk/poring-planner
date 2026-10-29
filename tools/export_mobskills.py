"""Build data/mobskills.js (MOBPOISON: which monsters poison you; MOBASSIST: which ones join a fight their kind is in).

    python tools/export_mobskills.py            # fetch the rAthena files if they aren't cached, then write data/mobskills.js
    python tools/export_mobskills.py --refresh  # refetch them

Source: rAthena's pre-renewal tables (db/pre-re/mob_skill_db.txt, db/pre-re/mob_db.yml), cached in tools/cache/, for the
monster ids in data/mobs.js. Zero's own monsters (Boulder Dwarves ...) aren't in rAthena, so they get neither.
- MOBPOISON {id: [skill level, rate per attack /10000, delay ms]}: NPC_POISON (Poison Attack) used while the monster attacks
  you (state attack, angry or anytarget). With several rows the highest rate is kept.
- MOBASSIST [id, ...]: the Assist mode (0x8), from the Aegis AI type (03, 07 and 13 have it) or a Modes: Assist line.
"""
import os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
RATHENA = "https://raw.githubusercontent.com/rathena/rathena/master/db/pre-re/"
UA = "poring-planner data export"
ASSIST_AI = {"03", "07", "13"}
STATES = {"attack", "angry", "anytarget"}


def fetch(name, refresh):
    path = os.path.join(CACHE, "rathena-pre-re-" + name)
    if refresh or not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(RATHENA + name, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    with open(path, encoding="utf-8") as f:
        return f.read()


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


def main():
    refresh = "--refresh" in sys.argv
    ids = our_ids()
    pz = poison(fetch("mob_skill_db.txt", refresh), ids)
    asst = assist(fetch("mob_db.yml", refresh), ids)
    with open(os.path.join(ROOT, "data", "mobskills.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Monsters that poison you: {id: [NPC_POISON level, rate per attack /10000, delay ms]}, and ones that assist their kind (rAthena pre-renewal, tools/export_mobskills.py)\n")
        f.write("const MOBPOISON={" + ",".join(f"{k}:[{v[0]},{v[1]},{v[2]}]" for k, v in sorted(pz.items())) + "};\n")
        f.write("const MOBASSIST=[" + ",".join(map(str, asst)) + "];\n")
    print(f"{len(pz)} poison, {len(asst)} assist")


if __name__ == "__main__":
    main()
