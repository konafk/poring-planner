# Features by tab

[← Back to README](../README.md) · The Character tab has [its own page](character.md).

- [Page layout](#page-layout)
- [Accounts, sessions and Backup](#accounts-sessions-and-backup)
- [Session (EXP tracker)](#session-exp-tracker)
- [Monsters & maps](#monsters--maps): Where to farm, Map planner, Monster table
- [Memorial dungeons](#memorial-dungeons): Jellostones, Expedition upgrades, memorial dungeons and their gear's enchants
- [Stellar weapons](#stellar-weapons): ★ Forging Certificates and Activation
- [Roadmap](#roadmap)
- [Monster info](#monster-info)
- [Item info](#item-info)
- [Equipment and Cards](#equipment-and-cards)
- [Recipes](#recipes)
- [Market](#market)
- [EXP & formulas](#exp--formulas)
- [Tables everywhere](#tables-everywhere)

## Page layout

The tabs sit in a sidebar on the left, grouped into Plan (Character, Session, Monsters & maps), Look up (Roadmap, Monster info, Item info, Equipment, Cards, Recipes, Market, EXP & formulas) and Data (Account). On a phone or a narrow window they become a tab bar along the top that stays in view as you scroll. A bar at the top of the page names the session you're on and what you're farming; its dot turns amber while the session is paused. Once you've logged two entries it also shows a small line of your EXP %/hr between entries, with the session average.

**Log EXP from any tab:** type in the Log EXP box on the right of the top bar, or press **L** on any tab to jump to it. It takes a line like the paste box does: `17.9` (EXP %), `17.9 63` (with job %), `15:05 17.9 63` (at that time), and `died` on the line for EXP after a death. The entry goes in at the level of your last one, and a level-up is picked up the same way as in the Log EXP card. On a phone the box opens as a sheet from the round **+** button. At the max base level (70) base EXP no longer counts, so the box, the + button and **L** go away.

**Search:** press **Ctrl+K** (⌘K on a Mac) or **/** on any tab, or the Search button at the top of the sidebar, and type part of a name. It finds tabs, a few actions (Log EXP, theme, hints, new session), every monster, every item a monster drops or a recipe makes, every piece of gear and card, and every map, by name, map code or item number. **Enter** opens a monster, item, piece of gear or card in its details popup (below), and a map in the Map planner.

**Details popup:** click a monster, item, gear or card name (underlined) and its details open over the page, without leaving the tab you're on. The names are in drop lists, Where to get, the Map planner, Where to farm, Item info's droppers, the Market prices, the Recovery items, the Equipment, Cards and Recipes tabs and search. Every item name has its inventory icon from the game client beside it (a card, its picture), and every monster name its sprite (the popup shows it full size).

- **Monster:** HP, DEF, MDEF and ATK, EXP (and what you get), your kill time, hit and dodge, EXP / min, zeny per kill, its best open map, every drop (with your chance and the price), and every spawn map, with when closed ones come (Roadmap). Buttons: Farming it now (or Also killing it), Monster info.
- **Item:** its icon, a box for what players pay (it's saved like the Market tab's), the NPC price and weight, the monsters that drop it with their best open map, and the recipes that make it (**Made from**) and use it (**Used in**). Buttons: Item info, Recipes.
- **Gear:** level, card slots, ATK / MATK / DEF, weapon level, element, weight, the jobs that wear it, its effects, the in-game text, where to get it and, for a weapon a Blacksmith forges, its recipe. Buttons: Equip (the Equip dialog), Equipment tab and Recipes.
- **Card:** its picture, the gear it goes in, the name it gives that gear, its effects, the in-game text and where to get it. Buttons: Equip and Cards tab.
- Names inside the popup open theirs (a drop from a monster, a monster from an item); **←** goes back. A map opens in the Map planner.

**Get started:** a new player sees three steps over the Character, Session and Monsters & maps tabs: set up your character (type all six stats, or use build mode), pick where to farm (Farm here on one of the best spots), and log your EXP twice. Each one ticks off as you do it, and the card goes away for good once all three are done, or when you close it.

At the bottom of the sidebar, **Compact sidebar** shrinks it to its icons (hover an icon to see its tab's name), and **Settings** opens a menu that changes how the page looks. It stays open while you switch things, and Esc or a click elsewhere closes it:

- **Hints:** hides the help paragraphs under the cards once you know your way around.
- **Theme:** switches between auto (follows your device), light and dark. The sidebar follows it.
- **Full width:** lets the page use the whole window instead of stopping at 1180px. It only shows on very wide screens.

All four are remembered in this browser, apart from your account data, so backups and share links don't carry them.


## Accounts, sessions and Backup

- **Accounts:** keep separate characters, sessions and settings for each of your accounts. The account picker is at the top of the Character tab, with **+ New account** beside it, and Rename and Delete in its ⋯ menu.
- **Sessions:** the session picker is at the top of the Session tab, with ✎ to rename it, **+ New session** (which takes you to Monsters & maps to pick its monster), and Rename and Delete in its ⋯ menu.
- **Backup** (the Account tab): Copy backup copies every account as one block of text (it also shows in the box). Restore from text replaces every account with it; older single-account backups still restore into the current account.
- **Several browser tabs:** you can keep the page open in more than one tab. Every save carries a revision number. When one tab saves (an EXP entry, a setting), the others reload to pick it up, straight away if they're showing or when you switch back to them, and say "Updated from another tab". A tab that still saves on an old copy (or finds storage changed by something else) never overwrites the newer save: the EXP entries and pauses it added go into the newer save by time, its other changes give way, and it reloads. A reloaded tab keeps its own account, page tab, scroll position and any EXP % you'd typed but not logged.
- **Copy share link** puts the current account in a link. The data sits in the part after `#`, which never reaches the server. Opening the link loads the account into the backup box, and nothing changes until you click Restore.

## Session (EXP tracker)

- Log Base and Job EXP % as you farm. The Log EXP card shows the session's map, then level, EXP % and job % with Add entry, Died and Pause; the time and date, party and death settings fold under **Time, party and deaths** (its line says what they're set to), and **Paste several entries** folds under its own heading. Entries go on today's date unless you pick another. If a session runs past midnight or over several days, the date shows next to each time.
- **Died −10%** logs a death: type your EXP % from just before you died and press it. It logs that EXP, then the EXP left after losing 10%, so what you gained up to the death still counts. If you only noted your EXP after dying, tick **Died since the last entry** before adding it (or put "died" on a pasted line); ✎ on an entry can mark or unmark it too. Tick **Death penalty item** if you use the shop item, and it takes 5% instead. The EXP a death costs isn't counted as negative EXP/hr: deaths show a 💀 in the entries and on the chart, and Compare sessions counts them.
- See EXP/hr, time to the next level and a progress chart. Kill pace is split into fighting and walking time.
- **Walking is calibrated from your logs:** each time you log, the session keeps a copy of your character's stats (ATK, MATK, ASPD, skills, gear). Its fight time comes from those stats, and its walking per kill is its logged seconds per kill less that fight time. That walking is used everywhere, so changing your gear or stats later changes only fight time, never the walking. If you change stats that change the fight time and then log again, the entries logged before keep the stats they were logged with, so lowering ATK or MATK and logging once more doesn't shrink the walking of the hour before. Sessions saved before this take the stats you have the first time they're worked out. Hover sec / kill in Where to farm (by EXP) to see which session the walking comes from.
- **Map:** the box at the top of the Log EXP card picks the map you farm the session's monsters on. Auto takes the open map where most of them spawn (ties: more spawns); pick another to weight EXP/hr, kill pace, walking and loot by its spawn counts instead. The Map planner's **Use session monster's map** opens it too. On the Map planner, **Farming this map now** makes the planner's map the session's map, with the monsters you hunt there (not bosses or ones you skip) as its monsters, the same mix the planner works out. A map you pick stays even if you mark it as not open.
- A new session is named after its map (e.g. nrd_dun02) once you add a monster, and the name follows the map while you add or remove monsters. Rename a session with ✎ next to the session picker (Enter or ✓ saves, Esc cancels), and compare sessions side by side.
- **Goal:** the EXP needed and the farming time to a target base and job level, charted together, with a date for each level-up if you farm non-stop.

## Monsters & maps

### Where to farm

The first card on the tab answers "where should I farm?" for your character.

- **Best spots:** the top 3 open maps by EXP / min and the top 3 by net zeny / hr, side by side, with their main monsters. **Farm here** makes a map the session's map and its monsters the ones you hunt (for a zeny spot, the monsters the zeny ranking hunts there), and names a new session after it. The spot you're farming shows ✓ farming. At the max base level only the zeny spots show.
- **One ranking:** **By EXP** or **By zeny** switches the table under the spots; **Show** sets how many rows. Every map row has its own **Farm here** too, and clicking anywhere else on a row opens the map in the Map planner.
- **More options** (folded, its line says what they're set to): min monsters on map, max sec / kill, and auto loot for both; Calibrate to my logs by EXP; the monster level filter, skipping drop-penalty monsters, hunting only the best-paying monsters and seconds per teleport by zeny.
- The tables start on their **Compact** columns; **All** or Show / hide columns brings the rest back.

### By EXP

Open maps ranked by EXP/min, weighted by spawn counts. At the max base level (70, `MAX_BASE_LV` in `js/state.js`) EXP no longer counts: the table says so, ranks and sorts by Net zeny / hr (until you click another column) and greys out EXP / min.

- Zeny / hr is loot less skill items, the ASPD potion and ground buffs. Heal cost / hr is the HP items for the map's HP lost / min plus the SP items, from Consumables (hover it to see which items and how many an hour), and Net zeny / hr is what's left. Sort by any of them.
- **Max sec / kill** (60 by default, 0 for no limit; one box for both rankings, under More options): maps that take longer a kill, like a Lv 45 Thief on nrd_dun02's Boulder Dwarves, get a **too slow** badge and rank after every other map, so a huge EXP per kill can't put a map you can't really farm at #1. They stay last in the default sort too; sort by another column to see them in place.
- Maps with an entry level (nrd_dun02 needs base Lv 50) are left out of both hunters below it, with a note in the line above the table, and show a "Lv 50+" badge on Monster info.
- Maps show their in-game code and name (`in_sphinx5` · Sphinx B5F). You can also type the database code (`sp_d05`).
- Monsters with no EXP data yet (Mist, Isis, Anubis…) show EXP `?` and are left out of EXP/min.
- **Logged vs projected:** for each map you have sessions on, your logged kills / hr ÷ what the table projects for them, each with the stats it was logged with (hover for every session). **Calibrate to my logs** scales kills / hr by the median of that ratio over your sessions longer than 60 minutes, so EXP / min, loot and weight per hour follow; HP and SP items and other hourly costs don't.
- **Weight columns** (off until you tick them under Show / hide columns): loot weight per kill and per hour, from item weights and drop chances with your drop rate bonus and the level penalty, and how often you go to town (farming to your sell point, then the trip). The line above the table shows the Max Weight, weight now and sell point they assume.
- HP lost / min is the damage that gets through less HP regen and Hunter Fly. Casters and archers take the same hits as melee: aggressive monsters, and monsters that reach you while you cast, are in "swings reach you". With Vitata your Heals cover it, so it costs SP and time instead of HP items. Hover it to see the damage taken, poison and regen. "Damage taken from" a race, size or element (Thara Frog Card, Poo Poo Hat's −10% from Demi-Human, "Resistance to Demi-Human" options, Equipment stats lines) scales each monster hit first, so it lowers HP lost, the HP items and heal cost, and raises net zeny.
- **Crowds:** aggressive monsters, and ones that join a fight their kind is in (Wolves, Goblins, Thief Bugs…), gang up on you: "Possible rampage" (monsters attacking you together) on the Character tab (2 unless you change it; other monsters count as 1); a map can set its own count for all its monsters in the Map planner, which the room dungeons, such as Labyrinth Forest 1F and 3F and Sunken Ship, do). Each one swings at you, and from 3 at once your FLEE drops 10% and your DEF 5% per monster past 2 (rAthena's pre-renewal settings).
- **Poison:** monsters with Poison Attack (Argiope, Side Winder, Ghoul, Argos, Zenorc…) try it on 5% of their swings, then wait 5 s. It lands at 120% of their hit chance and poisons on 20% × its level, less your VIT % and LUK / 10. Poison lasts 60 s (less with VIT and LUK) and isn't refreshed while it runs. While poisoned you lose 2 + 1.5% of Max HP a second (down to 25%), get no natural HP or SP regen, and your VIT DEF drops 25%. The share of the time you're poisoned shows on the Character tab and in the HP tooltips.
- Skip monsters you don't want to fight. Regions that aren't open yet (see the Roadmap tab) are left out, and listed under the table, with a link to the tab.

### By zeny

Open maps, or single monsters, ranked by net zeny/hr. That's the loot value per kill with your drop rate bonus and the level penalty, less skill costs (Mammonite zeny, catalysts, arrows, support casts), HP items for the HP you lose and SP items (both from Consumables), the ASPD potion and Sage ground buffs. Hover Costs / hr to see each.

- Drops fall 50% from monsters 40 or more levels below you. There's no published penalty for −20 to −39, so that range counts as none.
- **Level filter:** set a Monster Lv range, or tick "Skip drop-penalty monsters" to leave out monsters 40 or more levels below you (it follows your base level). Monsters mode lists only those; on a map the rest are passed by, which costs extra walking or teleports like unticking them.
- Converters are picked by zeny rather than EXP. Monsters with no EXP data still count, since they drop loot.
- Monsters mode lists every drop with your chance, what it adds per kill and its weight.
- **Weight / kill** and **Weight / hr:** the weight of the drops you loot. Hover Weight / hr for the loot zeny per weight point and how soon you reach your sell point (with your Max Weight set). Each monster on a map shows its weight per kill too.
- **Auto loot:** tick the item groups you loot, like the game's Looting tab (weapons, armor, consumables, cards, miscellaneous, costumes). Unticked groups count as 0 zeny everywhere. The random option grade on equipment isn't modelled.
- **Monster picks:** like the game's Monster tab, click a monster on a map to stop or start hunting it. **Hunt only the best-paying monsters** picks for you, keeping at least "Min monsters on map" spawns.
- Skipping monsters costs time. You either walk further (walking × √(all / hunted)) or teleport past them ((all / hunted − 1) teleports per kill, at your seconds per teleport). Each map uses whichever nets more. Teleporting only counts with a Creamy Card (ticked or in build gear) or the Teleport skill learned; Fly Wings cost too much to burn on every landing, so without either it walks. The data doesn't say which maps block teleport, so click "teleport ok" on a map to mark it "no teleport".

### Map planner

Per-map averages, kills/hr, EXP/hr and net zeny/hr, under the map's picture from the game client's map window (click it for full size; Ayothaya - Ancient Shrine Maze has none in the client). Its **Farming this map now** button does what Farm here does. The EXP ranking's Zeny / hr column is net the same way.

### Farm without items

Whether your character can farm a map with no HP or SP items, as a % in green, yellow or red. It's a tile in the Map planner, a No items column in the EXP ranking (sortable, filter `>=100`), a column per monster in the Map planner and a tile for the monster you click. Hover any of them to see the breakdown.

- **HP out:** what each monster takes off you while you fight it: its ATK through your DEF, the hits that get past your FLEE (its hit against your FLEE, the same dodge % as the Monsters table), "swings reach you" and Energy Coat.
- **HP back:** natural HP regen and Increase HP Recovery over fight and walking time, HP-over-time consumables, and Hunter Fly while you attack.
- **SP out and back:** the SP your attack and Energy Coat use, against natural SP regen, Increase SP Recovery, SP-over-time consumables and SP cards (Dracula, Dark Priest, +5 SP per kill).
- **Heal:** spare SP pays for Heal when HP falls short: your Heal skill at its learned level ((Base Lv + INT) / 5 × 3 × Lv + MATK, rAthena's renewal formula, not checked in game), else Vitata's Heal Lv1 from the Cards card. Learn Heal in the Skills card for it to count.
- **Indulge (Sage):** spare HP turns into SP when SP falls short: 10% of Max HP for (10 × Lv)% of it as SP, less its SP cost (the 10% is classic RO's, not checked in game).

The % is the share of what you use that comes back on its own, the lower of HP and SP. On a map the monsters add up by spawn count.

- **Green (keeps up):** 100%, and no single kill takes half your Max HP.
- **Yellow (with rests):** 50% or more. You sit now and then; the tooltip says about how long a kill (at standing regen, so sitting is quicker).
- **Red (needs items):** below 50%, or one kill can take all your HP before regen catches up and you have no Heal.

**Possible rampage, per map:** the Map planner's box next to the map sets how many monsters attack you together there, for every monster on it, aggressive or not, in place of the Character tab's crowd (see Crowds above). RO Zero's maps are towns, fields and dungeons, and dungeons come in two kinds: normal ones, and room dungeons, one big map cut into small rooms where the monsters crowd into the room you're in. The room dungeons, Labyrinth Forest 1F and 3F (`prt_maze01`, `prt_maze03`, 25 rooms in a 5×5 grid) and Sunken Ship 1F and 2F (`treasure01`, `treasure02`, its cabins), Kunlun's Immortal's Chess Terrace (`gon_dun02`) and Sphinx B5F (`in_sphinx5`), start at 3: they're the maps with 8 or more warps from room to room inside the same map in rAthena's warp scripts (Labyrinth Forest 2F has none; Izlude Shipwreck isn't in them, so it isn't known), and the Map planner says "room dungeon" under their name; other maps have none, so the Character tab's count applies to their aggressive and assisting monsters and the rest count as 1. Type your own for any map, or clear the box to go back to the default. Hits add up and the same FLEE / DEF crowd penalty applies. It counts in everything worked out for that map (HP lost / min, heal cost, interrupted casts, this check), and Where to farm tags those maps `×3 rampage`. Dodge never goes above 95%, so even with very high FLEE 1 swing in 20 lands.

With an elemental converter (or Spell Fist bolts), a table shows each element's rate against every monster on the map and the map's EXP/min with it, and warns about the monsters the one in use is weak against (for example Fire against Jakk, Fire 2, on Geffen Dungeon B2F). An Element % column shows the rate per monster. For physical attacks the rate applies to weapon and equipment ATK; status ATK always hits as Neutral.

### Monster table

The last card on the tab, and on the Monster info tab too (under Monster info): look up any one monster against your attack.

Every monster with HP, EXP, EXP/HP, your damage, kill time, EXP/min, dodge, HP lost, zeny per kill (after skill items) and net zeny/hr (after skill items, SP items, the ASPD potion and ground buffs).

Click a row to see the monster's details (EXP/min, per kill, defence, farm without items, weight, maps, and the button to farm it) in a panel beside the table that stays in view while you scroll the list. On narrower screens the panel slides in from the right, and on a phone up from the bottom; × or Esc closes it.

The Element, Race, Size and Boss dropdowns above the table narrow both the table and the monster search's suggestions. Boss: No bosses (the default) leaves out Boss-class monsters, Normal only also leaves out mini bosses, Mini bosses, MVPs and Bosses (Boss class, neither of those) list only those, and Any lists every monster. The dropdowns are saved per account.

### Mini bosses

Vocal, Eclipse, Toad, Mastering, Dragon Fly and the other monsters that spawn one per map on a long respawn carry a `mini boss` tag wherever monsters are listed, including the monster search on the Session and Monster info tabs, and Monster info says so. Type `mini` in a Monster filter to find them.

Mini boss is how they spawn, not the game's Boss class, which is what boss / normal bonuses go by: Vocal and Garm Baby count as normal monsters, Eclipse as a boss (hover the tag to see which). Boss-class monsters that aren't mini bosses (Owl Duke) are tagged `boss`. Boss-class monsters stay out of the farming tables; Vocal and Garm Baby stay in, weighted by their one spawn on a map.

### MVPs

The MVPs that spawn on the maps here (Amon Ra, Osiris, Baphomet, Moonlight, Orc Hero, Orc Lord, Dracula and the rest) are in the monster tables: each carries an `MVP` tag wherever monsters are listed, Monster info says so, and the Boss dropdown's MVPs lists them. Type `mvp` in a Monster filter to find them. They're Boss class, so they stay out of the farming tables like the other bosses; the ones with no EXP data yet show it as unknown. Maya, Mistress, Phreeoni, Eddga, Pharaoh and Drake are in the tables too but have no map: the client's spawn table doesn't list them on any map it has.

## Memorial dungeons

Its own tab, with Global's item names. Fragments, stones, the stone being crafted and the pieces you want are saved per account.

- **Jellostones:** Poring Village (base Lv 30) gives one Jello Fragment a run, which one by weekday (Poring on Monday, Poporing, Drops, Deviling, Angeling on Friday, a Jellopy Fragment Box at the weekend); today's row is marked, by this device's clock. Type the fragments and stones you have, or press **+1** after a run. **Craft** takes 5 fragments and starts the 3-day wait at the Memory Craftsman's Workshop (one stone at a time: the wait is one quest for all five); set **ready at** to the game's time if you started earlier, and **Collect** adds the stone. The tiles show the stones and fragments the pieces you want still need and the day the last stone is ready, at one run a day from tomorrow, a weekend box counted as a fifth of each fragment, crafts one after another, and no stone swaps.
- **Expedition upgrades:** the eight Expedition pieces the Ant Hell memorial's Upgrader makes, each from a Subjugation Team piece, 50 Faintly Glowing Crystal and its Jellostones. Tick the ones you want; the crystals they take show under the table.
- **Memorial dungeons:** Poring Village, Orc's Memory, Prontera Culvert and Ant Hell: base level, the NPC who lets you in and where they stand, and the normal and hard mode reward boxes (a party of 7 or more gets more from the last three).

Every item on the tab shows its in-game icon and opens its details, which say which memorial box gives it (or which weekday Poring Village gives a Jello Fragment) and what it makes or is made from, as on the Recipes tab. Search finds the memorial items no monster drops too (Mithril Ore, the Jello Fragments, the gems); the Item info tab only lists monster drops.
- **Memorial gear enchants:** the card slot 4 enchant on Subjugation Team and Expedition armor, garments and shoes, by refine (+0 to +8, or +9 and up per part), with each line's chance, the +9 armor's job spirit enchants and the reset cost. The line you get goes in the item's random options on the Character tab.

The Subjugation Team and Expedition gear itself is on the Equipment tab with the lines its client description gives (MaxHP / MaxSP and "DEF +x", +3 refine bonuses once, the set's after-attack delay and cast lines only with the whole set). The Lv 80 Contingent gear the Izlude memorial upgrades to is only on the Roadmap for now.

## Stellar weapons

Its own tab, for the Activation System. It's marked **Not open in game yet**: it's Taiwan Zero data, and Global doesn't have the system yet. The certificates you have and your weapon's refine are saved per account.

- **★ Forging Certificates:** the 17 ★ weapons Global's client has, grouped by weapon type, since a certificate is per type: Workshop Apprentice Nariya (prontera 272 264) gives one for each monster-drop weapon of the type. Type the certificates and drop weapons you have; To go counts down from the 100 a ★ to ★★ activation takes. Fastest for you is the monster (bosses aside, on an open map) that gets you them quickest: every weapon of the type it drops at its rate, with your drop bonus and level penalty, at the kill speed and walking Monsters & maps works out. Monsters with no published rate don't count. Time is To go over that rate.
- **Activation:** each route's refine loss, certificates and Goblin Coin Fragments at Grandpa Taotao (prontera 272 260): ★ to ★★ (−7, 100 ★ certificates, 8 fragments), ★★ to ★★★ (−3, 3 ★★ certificates, 30), and ★ armor (stable −3 for 100 and 30, aggressive −7 for 10 and 3); the last three came in the Taiwan server's later updates. Type your weapon's refine to see it after each. Cards, enchants and random options stay.

## Roadmap

Its own tab: Ragnarok Zero Global's release roadmap, from August 2026 to July 2027: each update's month, the level cap it raises to, what it adds, and the map regions it opens. The heading shows the level cap now and the next update.

- A region opens by itself on its update's day, or once its month is over when the day isn't announced (so the Clock Tower update opens on 29 October 2026, and Glast Heim, December 2026, counts as open from 1 January). Maps on no region, such as Comodo's and Umbala's fields, Sphinx, Prontera Labyrinth and Mjolnir Dead Pit (out since the 1 October update, which raised the level cap to 70), and Ant Hell 1F and 2F (only its memorial dungeon is still to come), are always open. Until then its maps are left out of Where to farm and the Map planner rankings, and its monsters are hidden by "Hide monsters with no open map".
- A closed monster shows when it comes: "none open · Dec 2026" in the monster table and Item info, "comes with the Glast Heim update, Dec 2026" in its details, a `closed · Dec 2026` tag on its maps in Monster info, and the same line in the Map planner.
- Spawn counts come only from the game client, so maps it doesn't list yet (the regions still to come, and Western Cave Karu) show `≈?`: which monsters are there is known, how many isn't. Those maps stay out of the map rankings until a client update lists them and `tools/export_spawns.py` reads their counts.
- Click a region to mark it open (or closed) yourself, for example the day an update goes live; it shows `yours` while it differs from the roadmap, and clicking it back follows the roadmap again. Other closed maps takes any single map.
- The roadmap is `data/roadmap.js`. When an update's day is announced, set its `when` to `YYYY-MM-DD`.

## Monster info

One monster's stats, how you do against it, and every map it spawns on. The Element, Race, Size and Boss dropdowns next to the search narrow its suggestions. Its drops list shows the auto-loot group, chance, your chance, NPC and player price, and zeny per kill. The [Monster table](#monster-table) sits under it on this tab as well, so you can browse every monster and click one to open it here (its farming details open beside the table). Clicking a monster in the Monsters table, the Map planner or Where to farm (by zeny) opens it here too. Drops with no published rate yet (the Boulder Dwarves in Nordfeld Cave) show chance `?` and add nothing to zeny or weight figures.

## Item info

**Items** picks what the table lists: **Monster drops** (the default, below), **All items** (every item in the game client, from the community database's item catalog: consumables, materials, costumes, enchant stones, boxes, pet items and the rest, plus the recipe, memorial and skill items; gear and cards are on the Equipment and Cards tabs), or one of the client's categories, each with how many it has. An item no monster drops shows its category under Group, `–` for the drop columns, and opens its details when you click it. Search (Ctrl+K) finds every one of them too.

Every item monsters drop, searchable and filterable by auto-loot group (the Group dropdown in the filter row), with NPC and player prices and NPC zeny per kill: the NPC price times your drop chance (after drop bonus and level penalty), at the monster where that comes to most, and spawns: the most of one monster that drops it on one open map. Click an item to see every monster that drops it, the drop chance, the NPC zeny per kill from each, and its best open map with how many spawn there. The **Where to get** filter shows only items an MVP, a mini boss or a normal monster drops, or a quest gives. The farm tables have no MVPs, so for gear and cards it also uses the full drop lists, and an item's **Other sources** lists the monsters that aren't in its table (MVPs, champion monsters) and its quests.

**Find card by prefix:** type the name a card gives its gear in the equipment window (`Bloody`, `of Health`) to list the cards that give it, with whether it goes before or after the item name and the part the card goes in. A whole gear name works too: `+5 Double Bloody Damascus` lists Hydra Card. Click a card for its details.

## Equipment and Cards

Every piece of gear and every card the build simulator knows. Gear shows its inventory icon from the game client. Every card has the same inventory icon, so cards show a small picture of the card instead.

- **Equipment:** search by name, item number or effect (`demon` finds gear that does more to Demons), and filter by **Type** (one weapon type, all weapons, one armor part such as upper headgear, shield or accessory, or all armor), weapon **Element**, **Job** (your job by default; a 2nd job wears its 1st job's gear), **Required Lv** (from–to), **Card slots** (none, 1–4 or 1 or more), and the least **ATK**, **MATK** and **DEF**. **Sort** by name, level, ATK, MATK, DEF, card slots, weight or ID, or click a column header. A **Where to get** filter shows only gear an MVP, a mini boss or a normal monster drops, gear a quest gives, or gear with no known source. Each row shows the item's type and weapon level, required level, slots, ATK, MATK, DEF, weight, the jobs that wear it, where to get it (the monsters that drop it with their level and drop rate, best first, MVPs and mini bosses marked, and quests), and its effects: the lines the calculator counts (refine and level conditions included), with the item's **In-game text** folded under them, which also has anything the lines leave out. Click a monster the farm tables know to open it in Monster info.
- **Cards:** search by name, item number, the name it gives its gear in game (`healing` finds Vitata Card), effect or monster, and filter by the **Equipment slot** it goes in and **Where to get** it: MVP, mini boss or normal monster cards. Effects are the card's in-game text, which has everything the card does (Eddga Card's Endure, Baphomet Card's splash), and Where to get lists the monsters that drop it.
- **Equip:** click a row (or its Equip button) and pick which gear set it goes in: **My gear**, any of your other gear sets, or a **New set** with only it on. An accessory asks which accessory slot, and an Assassin's dagger, one-handed sword or one-handed axe which hand. A headgear that covers more than one row (Coif: upper and middle) fills them all, and takes off whatever was there. Gear you take off keeps its refine, cards and affixes for when you put it back on. A card asks for the set, the item and the card slot, from the gear in each set that takes it; a set with no slotted item for it links to the Equipment tab with the matching filter. Items your job can't wear can't be equipped. If the Character tab is on typed status window values, equipping switches it to Build from gear (switching back brings your typed values back). Rows mark the sets each item or card is in now.

## Recipes

Every crafting recipe: 343 of them under **Forging** (weapons, with the weapon's level, and ores refined into Iron, Steel and elemental stones), **Brewing** (potions), **Arrows** (Arrow Crafting: one item makes a stack, such as 700 Arrows from a Wooden Mail), **Cooking**, **Misc** (Holy Water, elemental converters, Poison Bottle), and the two that NPCs make for a zeny fee: **Mixture & Counteragent** (Morgenstein in Geffen, once Merchant Louitz in Alberta and Aure Dupon in Geffen have sent you to him) and **Dye Making** (the eight Dyestuffs, JavaDullihan in Morroc). **Memorial** has the five Jellostones (5 of their Jello Fragment at the Memory Craftsman's Workshop, then a 3-day wait), the eight Expedition upgrades (the Upgrader: a Subjugation Team piece, 50 Faintly Glowing Crystal and Jellostones), Mithril (10 Mithril Ore at Thor's Flame) and the Oath rings and earrings (15 of their gem and 10 Mithril at the Suspicious Craftsman), from the [Memorial dungeons](#memorial-dungeons) tab's data. The NPC and where they stand show under the category. The category buttons show how many recipes each has for your search. **Search** matches the item made, its number, the materials and the NPC, so typing a drop (`jellopy`) finds everything it turns into. Each row lists the materials with their icons and amounts, and **Materials worth**: each material at your Market price, else what an NPC pays, `+?` when one has neither, plus an NPC's fee, and per arrow or item when a craft makes more than one. Click a header to sort, and any item to open its details, which show who drops it and every recipe that makes or uses it.

## Market

- Type what players pay for an item, and that drop counts at the player price in every zeny figure.
- The NPC price is subtracted, since the loot value already includes it. It's filled in for every drop, and you can type your own to override it.
- Click a drop in Where to farm (by zeny), Monster info or Item info to price it.

### Sell timer

The game's auto return only takes you to town at a weight %; it doesn't sell or store anything. Press Start when you leave town and the timer counts down to when the current session's monsters should have filled you to your sell point, then rings: a beep, an optional browser notification and "Sell now" in the tab title. It can ring a few minutes early.

- Time the session spends paused is added on, and Start or **Back from town** ends a pause left open while you sold.
- If the trip length can't be worked out (no monster picked, no Max Weight) or doesn't match what you see, type the minutes one trip takes.
- It also shows how many town runs you make an hour.
- In a background tab the browser can make it up to a minute late.

## EXP & formulas

- Base and job EXP tables for Base Lv 1–70 and Novice, 1st and 2nd job levels. Your level is highlighted, with kills per level for your monster and how much more EXP each level takes than the one before (e.g. +20.0%).
- **Party EXP (Even Share):** the bonus is +10% per extra member (2 members 110%, 3: 120% … 12: 210%), split evenly.
- **EXP bonuses** add together. Gear EXP counts for both base and job; an item's "EXP +X%" goes in EXP bonus % (base only) and "Job EXP +X%" in Job EXP bonus % (job only).
- Every formula the calculator uses, with your own numbers next to it.
- **Other gear sets:** the formulas table gets a **Set N** column for each set from Build from gear (Character tab), with the values that differ from yours highlighted.
- The element and weapon size tables.

## Tables everywhere

Every big table works the same way:

- Click a column header to sort.
- Type in the filter row under the header. Filters accept `<350`, `100-200`, `fire`, `-` for blank and `or`. In the EXP ranking, `poring` under Main monsters finds every map with Porings; by zeny, `elunium` under Earns from finds every monster that drops it.
- While any of a table's filters is on (saved ones too, even under a hidden column), a **Filters on: … clear** line above the table names them; **clear** empties them all.
- The auto-loot group filters in Monster info's drops and in Item info are dropdowns: pick a group, or Not looted for the groups you don't auto loot.
- Show or hide columns with the column picker. The Monsters table and both Where to farm rankings also have one-click **column views** next to it (All, Compact, EXP, Zeny, or Weight by zeny); the view that matches the columns showing is marked.
- The first column (in the hunters, the rank and the map) stays in place when you scroll a table sideways.
- On a phone, Compare sessions shows each session as a card.
- In the hunters, filters apply before the Show limit, and # stays the map's rank among all open maps.
