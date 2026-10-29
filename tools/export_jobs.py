"""Build data/jobs.js (JOBDATA: job bonus stats and base Max HP / SP per base level) for Ragnarok Zero Global.

    python tools/export_jobs.py            # fetch the rAthena files if they aren't cached, then write data/jobs.js
    python tools/export_jobs.py --refresh  # refetch them

Source: rAthena's pre-renewal tables (db/pre-re/job_basepoints.yml, db/pre-re/job_stats.yml), cached in tools/cache/.
Zero changes them like this (checked against in-game status windows and the character select screen, 1st and 2nd jobs, Lv 1-70):
- Job bonus: 1st jobs (and Novice) use their own table; 2nd jobs go to Job Lv 70 and use the transcendent class's table
  (Knight -> Lord Knight, Sage -> Professor ...).
- Base HP / SP: every job is scaled like a baby class, x 0.7 rounded to the nearest (halves up); 2nd jobs then get the
  transcendent x 1.25, rounded down. Max HP is then floor(base x (1 + VIT/100)), as in build.js.
- 2nd-job SP that differs from rAthena: Sage and Alchemist grow 9 SP per base level (Wizard's rate), Crusader 1 more.
"""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
RATHENA = "https://raw.githubusercontent.com/rathena/rathena/master/db/pre-re/"
UA = "poring-planner data export"
MAX_LV = 99
STATS = ["str", "agi", "vit", "int", "dex", "luk"]
# our job name -> rAthena name for HP / SP, and the rAthena class whose job bonus table Zero uses
JOBS = {"Novice": ("Novice", "Novice"), "Swordsman": ("Swordman", "Swordman"), "Mage": ("Mage", "Mage"), "Archer": ("Archer", "Archer"),
        "Acolyte": ("Acolyte", "Acolyte"), "Merchant": ("Merchant", "Merchant"), "Thief": ("Thief", "Thief"),
        "Knight": ("Knight", "Lord_Knight"), "Crusader": ("Crusader", "Paladin"), "Wizard": ("Wizard", "High_Wizard"),
        "Sage": ("Sage", "Professor"), "Hunter": ("Hunter", "Sniper"), "Bard": ("Bard", "Clown"), "Dancer": ("Dancer", "Gypsy"),
        "Priest": ("Priest", "High_Priest"), "Monk": ("Monk", "Champion"), "Blacksmith": ("Blacksmith", "Whitesmith"),
        "Alchemist": ("Alchemist", "Creator"), "Assassin": ("Assassin", "Assassin_Cross"), "Rogue": ("Rogue", "Stalker")}
SECOND = {"Knight", "Crusader", "Wizard", "Sage", "Hunter", "Bard", "Dancer", "Priest", "Monk", "Blacksmith", "Alchemist", "Assassin", "Rogue"}
SP_PER_LV = {"Sage": 9, "Alchemist": 9}   # rAthena SP replaced by 10 + rate x base level
SP_ADD = {"Crusader": 1}                  # added to rAthena's SP before Zero's scaling


def fetch(name, refresh):
    path = os.path.join(CACHE, "rathena-pre-re-" + name)
    if refresh or not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(RATHENA + name, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    with open(path, encoding="utf-8") as f:
        return f.read()


def entries(text):
    """rAthena's job YAML as [(job names, {section: [{key: value}]})]; a section is a list of '- Level: n' entries."""
    out, jobs, sections, section, cur, in_jobs = [], None, None, None, None, False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        ind = len(line) - len(line.lstrip())
        s = line.strip()
        if ind == 2 and s.startswith("- Jobs:"):
            jobs, sections, section, cur, in_jobs = [], {}, None, None, True
            out.append((jobs, sections))
        elif jobs is None:
            continue
        elif ind == 4:
            in_jobs = False
            section = s[:-1] if s.endswith(":") else None
            if section:
                sections[section] = []
        elif in_jobs and ind == 6 and s.endswith(": true"):
            jobs.append(s[: -len(": true")])
        elif section and ind == 6 and s.startswith("- "):
            k, v = s[2:].split(":", 1)
            cur = {k.strip(): int(v)}
            sections[section].append(cur)
        elif section and ind == 8 and cur is not None:
            k, v = s.split(":", 1)
            cur[k.strip()] = int(v)
    return out


def by_job(blocks, section, value):
    t = {}
    for jobs, sections in blocks:
        if section in sections:
            for j in jobs:
                t[j] = value(sections[section])
    return t


def zero(base, second):
    v = (base * 7 + 5) // 10   # x 0.7, nearest, halves up (whole-number math: 85 x 0.7 is 59.5 -> 60)
    return v * 5 // 4 if second else v   # x 1.25, down


def main():
    refresh = "--refresh" in sys.argv
    points = entries(fetch("job_basepoints.yml", refresh))
    stats = entries(fetch("job_stats.yml", refresh))
    table = lambda key: lambda rows: {r["Level"]: r[key] for r in rows if key in r}
    hp, sp = by_job(points, "BaseHp", table("Hp")), by_job(points, "BaseSp", table("Sp"))
    bonus = by_job(stats, "BonusStats", lambda rows: rows)
    jobs = {}
    for name, (ra, ra_bonus) in JOBS.items():
        second = name in SECOND
        b = {}
        for row in bonus[ra_bonus]:
            for k, v in row.items():
                if k != "Level":
                    b.setdefault(k.lower(), []).extend([row["Level"]] * v)
        raw_sp = lambda lv: 10 + SP_PER_LV[name] * lv if name in SP_PER_LV else sp[ra][lv] + SP_ADD.get(name, 0)
        jobs[name] = {"bonus": {k: sorted(b[k]) for k in STATS if k in b},
                      "hp": [zero(hp[ra][lv], second) for lv in range(1, MAX_LV + 1)],
                      "sp": [zero(raw_sp(lv), second) for lv in range(1, MAX_LV + 1)]}
    header = ("// Per job: bonus = job levels that give +1 to each stat; hp / sp = base Max HP / SP at base level 1, 2, ...\n"
              "// Exported by tools/export_jobs.py from rAthena's pre-renewal tables with Zero's changes (x 0.7, 2nd jobs x 1.25 and the\n"
              "// transcendent job bonus to Job Lv 70; Sage and Alchemist 9 SP per level, Crusader SP +1). See that file for details.")
    with open(os.path.join(ROOT, "data", "jobs.js"), "w", encoding="utf-8") as f:
        f.write(header + "\nconst JOBDATA=" + json.dumps(jobs, separators=(",", ":")) + ";\n")
    print(f"wrote {len(jobs)} jobs", flush=True)


if __name__ == "__main__":
    main()
