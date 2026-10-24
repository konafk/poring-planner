# Development

[← Back to README](../README.md)

The page is plain HTML, CSS and JavaScript with no dependencies. Open `index.html` directly or serve the folder.

**Don't put `?v=` stamps in `index.html`.** The Pages deploy (`.github/workflows/pages.yml`) runs `node tools/stamp.mjs`, which gives each script and stylesheet a `?v=` of its content hash, so after a deploy a browser never runs the new page with an old cached file. Keeping the hashes out of the repo means PRs don't conflict over them. `tests/stamp.test.mjs` fails if a stamp is committed.

## Project layout

| Path | What's in it |
| --- | --- |
| `index.html` | Page markup. Loads `data/*.js`, then `build.js`, then `js/*.js`. |
| `style.css` | Styles. |
| `build.js` | Build simulator: turns base stats, job level, gear, refine and cards into the status window's ATK/MATK/HIT/FLEE/ASPD/DEF/HP/SP. |
| `js/` | Calculator and tracker code (see below). |
| `data/` | Game data tables, one per file (see below). |
| `img/` | Gear icon and card picture sprite sheets, written by `tools/export_icons.py`. |
| `tools/` | Python scripts that export and cross-check the data, and `stamp.mjs`, which builds the deployed site with each file stamped. |
| `tests/` | Node tests. |

### `js/`

Plain scripts that `index.html` loads in this order. They share one global scope, so later files use what earlier ones define.

| File | Purpose |
| --- | --- |
| `game.js` | Merges the monster tables; holds the element and size tables, the jobs and the attack presets. |
| `state.js` | Storage and accounts, saved state and its migrations, small helpers. |
| `model.js` | Damage, SP, defence and Sage models, maps (and which are open, from the roadmap) and the tracker maths. |
| `render.js` | Draws the Character, Session and Monsters & maps tabs. |
| `events.js` | Input handlers, stats, the log form, accounts, sessions, backups, the share link and the column picker. |
| `skills.js` | Skill trees, passives and buffs. |
| `build-ui.js` | Build mode, consumables and the equipment stats rows. |
| `ref.js` | The EXP & formulas tab, and the Character tab's Your gear vs other gear sets. |
| `gear-db.js` | The Equipment and Cards tabs (filters, effects text) and the Equip dialog that puts gear or a card in a gear set. |
| `info.js` | The details popup for a monster, item, piece of gear or card, opened from any name with `data-info="mob:<id>"` or `"item:<id>"`. |
| `memorial.js` | The Memorials tab: the Jellostone tracker and its estimate, the Expedition upgrades, the memorial dungeons and their gear's enchants. |
| `start.js` | Tabs and their headings, collapsible cards, the Character tab's section links, the get started card's buttons, the search (Ctrl+K), the sidebar's Compact button and its Settings menu (Hints / Theme / Full width), and the first render. |

### `data/`

Each table lives in its own file, so a re-export after a patch only touches that file. Each file's first line describes its fields. See [Data sources](data-sources.md) for where each comes from.

| File | Contents |
| --- | --- |
| `mobs.js` | Monsters (EXP is `null` where there's no data yet) |
| `spawn.js` | Spawn maps and counts, normal and PvP channels, all from the client. Maps the client doesn't list yet have `[map, null]`: the monster comes there, count not known. Written by `tools/export_spawns.py`. |
| `maps.js` | In-game map code and name for each spawn map. Names written by `tools/export_mapnames.py`. |
| `roadmap.js` | Release roadmap: each update's month (or day), level cap, what it adds and the map regions it opens (by map code prefix). Made by hand from the official roadmap. |
| `mobskills.js` | Monsters that poison you (Poison Attack level, rate, delay) and ones that assist their kind. Written by `tools/export_mobskills.py`. |
| `loot.js` | Drops (chance `null` where no rate is published yet) |
| `items.js` | Item names |
| `prices.js` | NPC sell price for every drop. Written by `tools/export_prices.py`. |
| `weights.js` | Item weight for every drop; items with no weight count as weightless. Written by `tools/export_prices.py`. |
| `consumables.js` | Items skills use up (gemstones, traps, bottles, arrows): NPC buy price and weight, from rAthena until Zero's buy prices are exported. |
| `recovery.js` | HP and SP recovery items: amount restored (measured in Ragnarok Zero Global on a Merchant), weight, NPC, Discount and player prices. |
| `itemtypes.js` | Auto-loot group for every drop, from item categories. Written by `tools/export_prices.py`. |
| `mstat.js` | Monster DEF/MDEF/ATK |
| `elem.js` | Monster element, HIT/FLEE |
| `sizes.js` | Monster size and race |
| `exp.js` | EXP tables |
| `equipment.js`, `cards.js`, `refine.js`, `skills.js` | Gear, refine and skill data for the build simulator. Written by `tools/export_prontera.py`. |
| `jobs.js` | Job bonus stats and base Max HP / SP per base level. Written by `tools/export_jobs.py`. |
| `cardnames.js` | The name each card gives the gear it's in, as the equipment window shows it ("Healing" for Vitata Card). Written by `tools/export_cardnames.py`. |
| `affixes.js` | Random options per pool (monster drop, MVP, forging, activation, Glast Heim), gear type and option slot, with min–max and whether it's a %. Written by `tools/export_affixes.py`. |
| `stones.js` | Costume enchant stones (one per costume slot) as bonus lines, and the stone sets. Made by hand from rozerodb's item descriptions. |
| `special.js` | Pet egg enchants for the Taming Ring (Special Equipment, Accessory Right), Lv.1 and Lv.2 per pet, as bonus lines. Made from rozerodb's item descriptions. The MVP eggs for its card slot 3 come from the Taiwan notice (no Global ids yet, so they're keyed by name). |
| `memorial.js` | Memorial dungeons and their reward boxes, the Jello Fragment of each weekday and its Jellostone, the Expedition upgrades and the Subjugation Team / Expedition enchant pools. Made by hand from the Taiwan server's notices. |
| `iteminfo.js` | Each card's and piece of gear's in-game description, the monsters that drop it (MVP, mini boss or normal, with the drop %) and the quests that give it. Written by `tools/export_iteminfo.py`. |
| `icons.js` | Where each item's gear icon or card picture sits in the `img/` sprite sheets, with a checksum of each sheet. Written by `tools/export_icons.py`. |

## Tools

All scripts use only the Python standard library.

| Command | What it does |
| --- | --- |
| `python tools/export_spawns.py [--client PATH]` | Rewrites `data/spawn.js` from `navi_mob.lub` in your installed client's `data.grf` (read-only). Default client path: `C:\Gravity\RagnarokZero`. |
| `python tools/export_mapnames.py [--client PATH]` | Sets the map names in `data/maps.js` to the names your installed client shows in game (read-only). |
| `python tools/export_prices.py [--refresh]` | Writes `data/prices.js`, `data/weights.js` and `data/itemtypes.js`, and checks the prices add up to each monster's loot value. |
| `python tools/export_prontera.py [--refresh]` | Writes the gear, refine and skill data. |
| `python tools/export_jobs.py [--refresh]` | Writes `data/jobs.js` from rAthena's pre-renewal job tables with Zero's changes (see the top of the script). |
| `python tools/export_cardnames.py [--refresh]` | Writes `data/cardnames.js`: each card's name in the equipment window, from divine-pride.net's item pages, for the cards in `data/cards.js`. Run it after `export_prontera.py` picks up new cards. |
| `python tools/export_iteminfo.py [--refresh]` | Writes `data/iteminfo.js`: descriptions and quests from the roz.prontera.info pages `export_prontera.py` cached, drops from rozerodb's item API and MVP / mini boss from its monster list. Run it after `export_prontera.py`. |
| `python tools/export_icons.py [--refresh]` | Writes `img/gear-icons.png`, `img/card-art.png` and `data/icons.js`: each item's inventory icon (24 × 24) and a 36 × 48 thumbnail of each card's picture (every card has the same inventory icon), from divine-pride.net's copies of the client images. Images are cached in `tools/cache/icons/`. Run it after `export_prontera.py` picks up new items. |
| `python tools/export_affixes.py` | Writes `data/affixes.js` from rozerodb's Affixes Simulator page (its data is in the page itself; there is no API). |
| `python tools/export_mobskills.py [--refresh]` | Writes `data/mobskills.js` from rAthena's pre-renewal monster skill and monster tables, for the monsters in `data/mobs.js`. |
| `python tools/check_maps.py` | Compares `data/spawn.js` with the cross-check source and lists missing monsters and spawn counts that differ. Monsters marked as upcoming are expected to show up as missing. |
| `python tools/check_drops.py` | Compares drops, drop rates and item names with the cross-check source. Loot value per kill isn't compared, because the two sources price items differently. |

Every Monday, `.github/workflows/refresh-data.yml` runs the scripts that only need the internet (`export_prontera.py`, `export_cardnames.py`, `export_iteminfo.py`, `export_prices.py`, `export_affixes.py`, `export_icons.py`) from an empty cache, runs the tests, and opens a PR on the `data-refresh` branch with what changed (Actions → Refresh data → Run workflow runs it now). It needs Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests". Spawns and map names need the game client, so run those by hand.

Notes on `export_prontera.py`:

- It caches pages in `tools/cache/`. After a patch, run it with `--refresh` to pick up new items and skill, job and refine changes. Delete the cache to also pick up changed stats on existing items.
- Items that fail to download are left out and listed at the end, so rerun it to retry them.
- It applies corrections found by checking against the official client (listed at the top of the script): Guild gear options are GvG/Siege-only, a few cards' CRIT only counts against one race, some skill cooldowns and damage-taken lines that were missing, and the Subjugation Team / Expedition gear and Oath rings' bonus lines as their descriptions give them.

## Tests

```sh
node tests/build.test.mjs    # build simulator
node tests/ingame.test.mjs   # real characters against their in-game status window
node tests/model.test.mjs    # damage and tracker maths, loaded with a stand-in page
node tests/stamp.test.mjs    # index.html carries no ?v= stamps, and the deploy stamps every file
```

`tests/browser/smoke.mjs` opens the real page in Chromium: every tab shows only its own panels, Ctrl+K search opens a monster's details, the theme in the Settings menu cycles and the sidebar follows it, the account and session pickers sit on the Character and Session tabs with their + New buttons, and no tab scrolls sideways at phone width. It fails on any script error. It needs Playwright, so it isn't a `*.test.mjs` file:

```sh
npm i --no-save playwright && npx playwright install chromium && node tests/browser/smoke.mjs
```

`model.test.mjs` covers the roadmap's open and closed regions, the details popup, damage per hit, hit chance, cast time, party share, EXP and job EXP rates, walking time, the monster table filters recovery item costs, and the Equipment and Cards tabs' filters and equipping. GitHub Actions runs every test (the browser one too), and checks that every script in `tools/` compiles, on each pull request and push to `main` (`.github/workflows/tests.yml`). Each push to `main` also deploys the page (`.github/workflows/pages.yml`).
