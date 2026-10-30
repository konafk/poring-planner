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
| `img/` | Gear icon, item icon, card picture, monster picture and skill icon sprite sheets, written by `tools/export_icons.py`, and `img/maps/`, each spawn map's and town's picture, and `img/world-midgard.jpg` / `img/world-nordfeld.png`, the game's world maps, written by `tools/export_minimaps.py`. |
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
| `recipes.js` | The Recipes tab (with the Jellostones and Expedition upgrades from `data/memorial.js`), and the recipes that make or use each item (the details popup lists them). |
| `info.js` | The details popup for a monster, item, piece of gear or card, opened from any name with `data-info="mob:<id>"` or `"item:<id>"`. |
| `memorial.js` | The Memorial dungeons tab: the Jellostone tracker and its estimate, the Expedition upgrades, the memorial dungeons and their gear's enchants. |
| `navi.js` | The game's Navigation (`data/navi.js`): the marks on a map's picture (ways out, NPCs), Getting there from the nearest town (with a Kafra teleport in front when that's quicker), and the Kafra, ways out and NPC lists, for the Maps tab and the Map planner. |
| `mapinfo.js` | The Maps tab: every spawn map and town on the game's world map (`worldMap` in `render.js`, which the Map planner's world map uses too), its picture and monsters, and a table of every map. |
| `stellar.js` | The Stellar weapons tab: the ★ weapons by weapon type, the certificates each still needs and the monster that gets you them fastest, and the Activation routes. |
| `start.js` | Tabs and their headings, collapsible cards, the Character tab's section links, the get started card's buttons, the search (Ctrl+K), the sidebar's Compact button and its Settings menu (Hints / Theme / Full width), and the first render. |

### `data/`

Each table lives in its own file, so a re-export after a patch only touches that file. Each file's first line describes its fields. See [Data sources](data-sources.md) for where each comes from.

| File | Contents |
| --- | --- |
| `mobs.js` | Monsters (EXP is `null` where there's no data yet). Names written by `tools/export_mobnames.py`. |
| `spawn.js` | Spawn maps and counts, normal and PvP channels, all from the client. Maps the client doesn't list yet have `[map, null]`: the monster comes there, count not known. Written by `tools/export_spawns.py`. |
| `maps.js` | In-game map code and name for each spawn map. Names written by `tools/export_mapnames.py`. |
| `minimaps.js` | A checksum of each spawn map's and town's picture in `img/maps/` (the client's 512 × 512 minimap, by source map code), the towns' names (`TOWNS`), and each world map's picture, size and each map's box on it (`WORLDMAPS`: Midgard, Nordfeld), for the Map planner and the Maps tab. Written by `tools/export_minimaps.py`. |
| `navi.js` | From the client's Navigation tables, by source map code: each map's size in cells (`NAVI_SIZE`), its NPCs with their cell and kind (`NAVI_NPCS`), its ways out (`NAVI_WARPS`), where its Kafra teleports you (`NAVI_KAFRA`), the nearest starts to each spawn map on foot with the cells and each way out taken (`NAVI_ROUTES`), and names for the other maps on the way (`NAVI_NAMES`). Written by `tools/export_navi.py`. |
| `roadmap.js` | Release roadmap: each update's month (or day), level cap, what it adds and the map regions it opens (by map code prefix). Made by hand from the official roadmap. |
| `mobskills.js` | The skills each monster uses (state, level, chance, cast, delay, condition; Monster info and the monster popup show them), monsters that poison you (Poison Attack level, rate, delay) and ones that assist their kind. Written by `tools/export_mobskills.py`. |
| `loot.js` | Drops (chance `null` where no rate is published yet) |
| `items.js` | Item names |
| `prices.js` | NPC sell price for every drop. Written by `tools/export_prices.py`. |
| `weights.js` | Item weight for every drop; items with no weight count as weightless. Written by `tools/export_prices.py`. |
| `recipes.js` | Crafting recipes (forging, brewing, arrow crafting, cooking, misc, and the Alchemy Lab's Mixture, Counteragent and Dyestuffs): the item made, how many, the weapon level, the materials, an NPC's fee and where they stand, and the name of every item in them. Written by `tools/export_recipes.py`. |
| `tipbox.js` | The NPC crafts in the in-game Tip Box's Item Creation guides (dyes, potions, Detoxifier and Mixture, fruit juices): materials, fee, the NPC and whether a quest unlocks them. The Recipes tab adds the ones `recipes.js` lacks (potions, fruit juices). Written by `tools/export_tipbox.py`. |
| `consumables.js` | Items skills use up (gemstones, traps, bottles, arrows): NPC buy price and weight, from rAthena until Zero's buy prices are exported. |
| `recovery.js` | HP and SP recovery items: amount restored (measured in Ragnarok Zero Global on a Merchant), weight, NPC, Discount and player prices. |
| `itemtypes.js` | Auto-loot group for every drop, from item categories. Written by `tools/export_prices.py`. |
| `mstat.js` | Monster DEF/MDEF/ATK |
| `elem.js` | Monster element, HIT/FLEE |
| `sizes.js` | Monster size and race |
| `exp.js` | EXP tables |
| `equipment.js`, `cards.js`, `refine.js`, `skills.js` | Gear, refine and skill data for the build simulator. Written by `tools/export_prontera.py`. Each card's `affix` / `affixPos` is the name it gives the gear it's in, as the equipment window shows it ("Healing" for Vitata Card, `prefix`; "of Health" for Verit Card, `suffix`), added by `tools/export_cardnames.py`. |
| `jobs.js` | Job bonus stats and base Max HP / SP per base level. Written by `tools/export_jobs.py`. |
| `affixes.js` | Random options per pool (monster drop, MVP, forging, activation, Glast Heim), gear type and option slot, with min–max and whether it's a %. Written by `tools/export_affixes.py`. |
| `stones.js` | Costume enchant stones (one per costume slot) as bonus lines, and the stone sets. Made by hand from the stones' item descriptions. |
| `special.js` | Pet egg enchants for the Taming Ring (Special Equipment, Accessory Right), Lv.1 and Lv.2 per pet, as bonus lines. Made from the eggs' item descriptions. |
| `memorial.js` | Memorial dungeons and their reward boxes, the Jello Fragment of each weekday and its Jellostone, the Expedition upgrades and the Subjugation Team / Expedition enchant pools. Also Thor's Flame's Mithril and the Suspicious Craftsman's Oath rings and earrings. Made by hand. |
| `jobmasters.js` | Where each 2nd job changes class: the NPC, the place and where they stand. Made by hand from the [official guide](https://roz.mygnjoy.com/en/intro/guide/22), checked against the client's `navi_npc.lub`. |
| `stellar.js` | The Activation routes (refine loss, certificates, Goblin Coin Fragments) and their NPCs. Made by hand from the Taiwan server's Activation System; the ★ weapons come from `equipment.js`. |
| `clientitems.js` | Every item in the game client's catalog that isn't gear or a card (2,850, costumes included), with its category, for Item info's All items and search. Written by `tools/export_items.py`. |
| `client.js` | The game client's own item data, laid over the community database's as the page loads, so wherever the client has it, it wins: gear's and cards' in-game text, names, card slots, level, DEF, ATK, MATK, weapon level and weight where the database's differ, armour and cards the database doesn't have yet (with bonus lines read from their text), bonus lines an item's client text has that the database's lines leave out (flat stat lines, mostly), other items no data file has, monsters the database doesn't have yet that were asked for (the Clock Tower basement bosses: level, element, size, race and spawns; HP and EXP unknown), the headgear NPCs craft (Februs's from the client's NPC dialogue, `data\i18n\sc\*.csv`; the Hat Maker's from the quest log) for the Recipes tab, every monster's level as the client spawns it (for the monster list and the drop lists, which also name each monster as the monster list does), which monsters are an enhanced or boss version of another (`Enhanced Owl Duke`, `Boss Bathory`), what's in the boxes the client lists, and the client's card pictures, gear and item icons and monster pictures (`img/*-client.png`, with the database's sheets as the fallback; card and monster pictures are stored at 2×, `hd: 2`, so they're sharp on high-DPI screens). Written by `tools/export_client.py`; the weekly refresh never touches it. |
| `itemtext.js` | Every consumable's in-game text from the client (`System\iteminfo_enUS.lub`), for the details popup's In-game text, and the cards the client doesn't have yet (`CARDS_NOT_IN_CLIENT`, marked "not in game yet"). Written by `tools/export_itemtext.py`. |
| `costumelooks.js` | How each costume looks in the Stylist, from the game client: each costume's view (headgear or garment), the headgear sheet (`img/costume-head.png`) and a garment sheet per job and transcendent look (`img/costume-robe-<job>.png`), with where each sprite sits. Written by `tools/export_costume_sprites.py`. |
| `looks/` | The Stylist's animated pieces (`tools/export_look_frames.py`): one file per body, hair style, headgear and garment (`<kind>/<key>.js`, with RGBA sheets in `img/looks/`), each loaded when the preview first shows it; `looks/index.js` lists them. |
| `costumes.js` | The costume slots (Upper, Middle, Lower, Garment) each costume in `clientitems.js` takes, for the costume a costume enchant stone goes on. Written by `tools/export_costumes.py`. |
| `iteminfo.js` | Each card's and piece of gear's in-game description, the monsters that drop it (MVP, mini boss or normal, with the drop %) and the quests that give it. Written by `tools/export_iteminfo.py`. |
| `icons.js` | Where each item's icon (gear, or any other item, the memorial ones included), card picture, monster picture or skill icon (by skill slug) sits in the `img/` sprite sheets, with a checksum of each sheet. Written by `tools/export_icons.py`. |

## Tools

All scripts use only the Python standard library. The ones that read the community database (`export_prices.py`, `export_iteminfo.py`, `export_items.py`, `export_costumes.py`, `export_affixes.py`, `export_recipes.py`, `export_mluk.py`) take its address from the `DB_SITE` environment variable: `DB_SITE=https://... python tools/export_prices.py`. Without it they stop and say so.

| Command | What it does |
| --- | --- |
| `python tools/export_spawns.py [--client PATH]` | Rewrites `data/spawn.js` from `navi_mob.lub` in your installed client's `data.grf` (read-only). Default client path: `C:\Gravity\RagnarokZero`. |
| `python tools/export_mapnames.py [--client PATH]` | Sets the map names in `data/maps.js` to the names your installed client shows in game (read-only). |
| `python tools/export_minimaps.py [--client PATH]` | Writes `img/maps/<map>.png` and `data/minimaps.js`: each spawn map in `data/maps.js`, and each town (the maps of the client's `System\Towninfo_enUS.lub` with no monsters, on a world map), as the client's map window draws it (`data\texture\유저인터페이스\map\*.bmp` in `data.grf`, read-only), full size, with the magenta see-through, and `img/world-<world>.jpg` / `.png`: each world of the client's world view (`worldviewdata_list.lub`: Midgard's `worldmap_z.jpg`, Nordfeld's `worldmap_Nordfeld.png`, as they are), with each spawn map's box on it from `worldviewdata_table.lub`. It decodes the GRF entries stored with the GRF's mixed DES encoding. Run it after `data/maps.js` gets new maps. |
| `python tools/export_navi.py [--client PATH]` | Writes `data/navi.js` from the Navigation tables in your installed client's `data.grf` (`navi_npc.lub`, `navi_link.lub`, `navi_linkdistance.lub`, `navi_map.lub`; read-only), with the NPC names from its translation tables (`data\i18n\sc\*.csv`) and the other maps' names from `System\mapInfo_enUS.lub`. A map's channels count as the map; routes walk the client's own distances from where a Kafra teleport lands you in each town or Kafra destination, through portals and NPCs that send you. Run it after `export_minimaps.py` (it reads `TOWNS`) and when a client update opens new maps. |
| `python tools/export_costume_sprites.py [--client PATH]` | Writes `data/costumelooks.js` and `img/costume-head.png`, `img/costume-robe-<job>.png`: each costume in `data/costumes.js` drawn standing from your installed client's sprites (its view from `System\itemInfo_data.lub`, the sprite names from the compiled `accname.lub` / `spriterobename.lub`, read by `tools/lua51.py`). |
| `python tools/export_look_frames.py [--client PATH] [--only body\|hair\|head\|robe]` | Writes `data/looks/` and `img/looks/`: every frame of the stand, walk, sit and attack actions in 8 directions of each body, hair style, headgear and garment, from your installed client's SPR/ACT sprites (run `export_costume_sprites.py` first: it picks the headgear and garments). About 44 MB. |
| `python tools/export_client.py [--client PATH]` | Writes `data/client.js` and `img/card-client.png`, `img/gear-client.png`, `img/item-client.png`, `img/mob-client.png` from your installed client (read-only): `System\iteminfo_enUS.lub` (names, text, stat blocks), `System\itemInfo_data.lub` (card slots, icon names; read with `lua_data(..., lenient=True)`, since it defines functions too) and `data.grf` (card pictures, item icons). Run it after the weekly refresh or a client patch: it prints what it changed, new gear and items, and any bonus sentence it couldn't read. |
| `python tools/export_itemtext.py [--client PATH]` | Writes `data/itemtext.js`: the in-game text of every consumable in `data/clientitems.js`, from your installed client's `System\iteminfo_enUS.lub` (read-only), and the cards in `data/cards.js` it has no item for. Run it after `export_items.py` and `export_prontera.py`. |
| `python tools/export_tipbox.py [--client PATH]` | Writes `data/tipbox.js` from the Item Creation guides (tips 7032–7035) in your installed client's `System	ipbox_enUS.lub` (read-only). |
| `python tools/export_mobnames.py [--client PATH]` | Sets the monster names in `data/mobs.js` and the drop lists in `data/iteminfo.js` to the names your installed client shows in game (read-only). A name two monsters would share keeps ours. |
| `python tools/export_prices.py [--refresh]` | Writes `data/prices.js`, `data/weights.js` and `data/itemtypes.js`, and checks the prices add up to each monster's loot value. |
| `python tools/export_prontera.py [--refresh]` | Writes the gear, refine and skill data. |
| `python tools/export_jobs.py [--refresh]` | Writes `data/jobs.js` from rAthena's pre-renewal job tables with Zero's changes (see the top of the script). |
| `python tools/export_cardnames.py [--refresh]` | Adds each card's name in the equipment window (`affix`, and `affixPos`: before or after the item name) to `data/cards.js`, from divine-pride.net's item pages, and lists the cards it has no name for. The community database's item API only has the Chinese names. Run it after `export_prontera.py` picks up new cards (`export_prontera.py` keeps the names already there when it rewrites the file). |
| `python tools/export_iteminfo.py [--refresh]` | Writes `data/iteminfo.js`: descriptions and quests from the roz.prontera.info pages `export_prontera.py` cached, drops from the community database's item API and MVP / mini boss from its monster list. Run it after `export_prontera.py`. |
| `python tools/export_items.py [--refresh]` | Writes `data/clientitems.js` from the community database's item catalog (`/api/items`, which it reads from the Global client): every item that isn't gear or a card, with its category. Run it before `export_icons.py`, which fetches their icons. |
| `python tools/export_costumes.py [--refresh]` | Writes `data/costumes.js`: the costume slots each costume in `data/clientitems.js` takes, from the community database's item records (`/api/items/<id>`: slot). Run it after `export_items.py`. |
| `python tools/export_recipes.py` | Writes `data/recipes.js` from the community database's Recipes page and Alchemy Lab guide (their data is in the pages themselves; there is no API). |
| `python tools/export_icons.py [--refresh]` | Writes `img/gear-icons.png`, `img/item-icons.png`, `img/card-art.png`, `img/mob-icons.png`, `img/skill-icons.png` and `data/icons.js`: each item's inventory icon (24 × 24; gear in one sheet, every other item in another: drops, recipe items, memorial items, skill and recovery items and the rest of the client's items) and a 36 × 48 thumbnail of each card's picture (every card has the same inventory icon), and each monster's sprite in `data/mobs.js` shrunk to fit 48 × 48, from divine-pride.net's copies of the client images, and each skill's 24 × 24 icon in `data/skills.js` from roz.prontera.info. Images are cached in `tools/cache/icons/`. Run it after `export_prontera.py` or `export_recipes.py` picks up new items or skills, or a monster is added to `data/mobs.js`. |
| `python tools/export_affixes.py` | Writes `data/affixes.js` from the community database's Affixes Simulator page (its data is in the page itself; there is no API). |
| `python tools/export_mobskills.py [--refresh] [--client PATH]` | Writes `data/mobskills.js` for the monsters in `data/mobs.js`: their skills from divine-pride.net's monster pages (the client has no monster skill tables; one page a second, cached), with skill names from your installed client's `skillinfolist_enus.lub` where it has them (read-only), and poison and assist from rAthena's pre-renewal tables. |
| `python tools/check_maps.py` | Compares `data/spawn.js` with the cross-check source and lists missing monsters and spawn counts that differ. Monsters marked as upcoming are expected to show up as missing. |
| `python tools/check_drops.py` | Compares drops, drop rates and item names with the cross-check source. Loot value per kill isn't compared, because the two sources price items differently. |
| `python tools/check_client.py [--client PATH]` | Compares the planner with your installed client (read-only): spawn counts, monster levels, the level cap against `data/exp.js`, gear's DEF, MDEF, ATK, MATK and weapon level against `EquipmentProperties.lub`, its required level and weight against its in-game text, and its card slots against `itemInfo_data.lub`. It also checks the hand-kept boss links (`MOB_BOSSES`): same element, size and race as the base, a higher level, and the sprite that looks most like it; a new monster that looks like a boss version is printed but doesn't count as a difference. The client is right: a difference means the planner needs fixing. It doesn't flag what isn't wrong: a map's old and Zero names count as one, a monster only on a map the planner doesn't list isn't missing, and a gear number that table leaves to a script counts as right if the item's text gives it. Prints each difference and exits 1 if there are any. Run it after a patch and its exports. |
| `python tools/check_patch.py [--from N] [--to N] [--client PATH]` | Reports what the game's newest patches changed, from its public patch server: monster spawns and levels, NPCs, map links, skill text, the level cap, gear stats, boxes, items, maps and quests, each against the version before it, and which exports to re-run. Reads only each `.gpf`'s file list and those tables, and downloads whole `.rgz` patches, into `tools/cache/patches/`. Without `--from` it starts after the last patch it saw (first run: your client's `patch.inf`). |

Every Monday, `.github/workflows/refresh-data.yml` runs the scripts that only need the internet (`export_prontera.py`, `export_cardnames.py`, `export_iteminfo.py`, `export_prices.py`, `export_affixes.py`, `export_recipes.py`, `export_items.py`, `export_costumes.py`, `export_icons.py`) from an empty cache, runs the tests, and opens a PR on the `data-refresh` branch with what changed (Actions → Refresh data → Run workflow runs it now). The `DB_SITE` repository variable (Settings → Secrets and variables → Actions → Variables) gives those scripts the address; without it they're listed as failed in the PR. It also needs Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests". Spawns, map names, map pictures, the Navigation, job looks and the client's item data (`export_client.py`) need the game client, so run those by hand.

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

`tests/browser/smoke.mjs` opens the real page in Chromium: every tab shows only its own panels, Ctrl+K search opens a monster's details, a details link (`#item/909`) opens its popup, the theme in the Settings menu cycles and the sidebar follows it, the account and session pickers sit on the Character and Session tabs with their + New buttons, and no tab scrolls sideways at phone width. It fails on any script error. It needs Playwright, so it isn't a `*.test.mjs` file:

```sh
npm i --no-save playwright && npx playwright install chromium && node tests/browser/smoke.mjs
```

`model.test.mjs` covers the roadmap's open and closed regions, the details popup, damage per hit, hit chance, cast time, party share, EXP and job EXP rates, walking time, the monster table filters recovery item costs, and the Equipment and Cards tabs' filters and equipping. GitHub Actions runs every test (the browser one too), and checks that every script in `tools/` compiles, on each pull request and push to `main` (`.github/workflows/tests.yml`). Each push to `main` also deploys the page (`.github/workflows/pages.yml`).
