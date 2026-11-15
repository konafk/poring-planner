# Data sources

[← Back to README](../README.md)

The numbers are estimates. Skill values and formulas follow the sources below and may differ from the live server after a patch, so check them against your own EXP logs.

- Monsters, drops, NPC prices and skills: a community database's export of the Global client
- Gear, cards and refine: [roz.prontera.info](https://roz.prontera.info)
- Job bonus stats and base HP / SP: [rAthena](https://github.com/rathena/rathena/tree/master/db/pre-re)'s pre-renewal `job_stats.yml` and `job_basepoints.yml`, with Zero's changes worked out from in-game status windows (see `tools/export_jobs.py`). The same job bonus table as [ROZero Planner](https://rozeroplanner.com)
- The names cards give gear in the equipment window ("Healing" for Vitata Card): [divine-pride.net](https://www.divine-pride.net/database/item/4053)
- Gear and card descriptions (in-game text) and quests: [roz.prontera.info](https://roz.prontera.info); which monsters drop them, drop rates and MVP / mini boss: the same community database
- Item icons, card pictures and monster pictures: the game client's images, as [divine-pride.net](https://www.divine-pride.net) serves them per item or monster id
- Skill icons: the game client's skill icons, as [roz.prontera.info](https://roz.prontera.info) serves them for each skill in its skill planner
- Crafting recipes (Recipes tab): the community database's recipe list and its Alchemy Lab guide (Mixture, Counteragent, Dyestuffs); the Old Pharmacist's potions and Marienne's fruit juices from the official client's Tip Box (`System/tipbox_enUS.lub`, Item Creation), and the Forging notes (anvils, hammers, Blacksmith ranking) from its Manufacturing Classes guides
- Random options (affixes) per gear type, pool and slot, with their min–max: the community database's affix simulator
- Costume enchant stones and their sets: the stones' item descriptions (Global client text)
- Job Essences (`data/essences.js`): their item descriptions in the client's `System\iteminfo_enUS.lub`; that they go on +9 armor from the Enchant Staff's dialogue in `data.grf`
- Taming Ring pet egg enchants: the eggs' item descriptions (Global client text)
- Memorial dungeons, Jellostones, the Expedition upgrades and the memorial gear's enchants (`data/memorial.js`): made by hand; item names and ids as the Global client has them. The Contingent and Conqueror upgrades (`LATER_RUNGS`) and the Vegetable Enhancer's cost and lines (`VEGGIE_ENCHANT`) aren't in the Global client, so they're as reported from other Zero servers (rAthena's Zero data); the Vegetable Enhancer's spot is from Global's Navigation
- Every item in the game client that isn't gear or a card (Item info's All items): the community database's item catalog, read from the Global client
- Stellar weapons and the Activation System (`data/stellar.js`): the Taiwan server's Activation System; the ★ weapons from the official client
- Items that add affixes (the Affixes tab): which gear each one works on is the client's `lapineupgradebox_data.lub` (`upgrades` in `data/client.js`); what they roll is players' reports (`data/affixitems.js`), since the client doesn't have it
- Daily quests (`data/dailies.js`): the official client's quest log (`System/OngoingQuestInfoList_enUS.lub`), its Navigation (where each NPC stands, and whether the game has it yet) and the NPCs' dialogue (`data\i18n\sc`, the level each asks for)
- 2nd job change NPCs (`data/jobmasters.js`): the [official game guide](https://roz.mygnjoy.com/en/intro/guide/22), checked against the client's Navigation table
- Spawn counts: the official Ragnarok Zero Global client (navigation table)
- Map names: the official client (`System/mapInfo_enUS.lub`)
- NPCs, ways out of each map, Kafra teleports and walking routes: the official client's Navigation tables (`navigation/navi_*.lub` in `data.grf`), NPC names from its translation tables
- Spawn, drop and item name cross-check, in-game map codes: [ragnarokzero.net](https://ragnarokzero.net/database/maps)
- Monster race and HP cross-check: [einh-guild.de](https://einh-guild.de)
- Refine success rates, ores and fees, +1 to +10 (Refine tab, `data/refinerates.js`): the [official game guide](https://roz.mygnjoy.com/en/intro/guide/20), as [rozerodb.com](https://rozerodb.com/guides/refine) and [roz.prontera.info](https://roz.prontera.info/refine) copy it (they agree on every rate); HD ore's rules from its item text in the client (from +7, never past +10, a failure takes 1 off); its rate the normal ore's
- Brewing and cooking chances (Brewing and Cooking tabs): rAthena's pre-renewal `skill_produce_mix` and `produce_db.txt` (each potion's guide, each dish's level), the brewing one as [roz.prontera.info's Crafting Calculator](https://roz.prontera.info/crafting) has it. Not measured on Zero Global
- Formulas: [roz.prontera.info/mechanics](https://roz.prontera.info/mechanics), [iRO Wiki](https://irowiki.org/wiki/Stats)
- Monster skills (`data/mobskills.js`: the Monster skills tab and each monster's details): [divine-pride.net](https://www.divine-pride.net)'s monster pages, which show kRO's official tables (the client has none), with the client's skill names; the kinds of skill are the planner's own grouping
- Skill damage %, cast times, cooldowns and after-cast delays: the in-game skill table from [roz.prontera.info](https://roz.prontera.info) (`data/skills.js`)
- Skill stat add-ons and base-level scaling: Zero skill data with the Zero Global ratios, checked against the in-game skill text
- Element table: entered by hand in `js/game.js`
- ASPD tables: the RO樂園攻速計算機 sheet (2026-09-07), checked against characters in game
- Consumables: values from the in-game item tooltips (Ragnarok Zero Global). How they stack: stat food and Blessing of Yggdrasil take the higher per stat, course meals and event drinks add on top
- Size table and EXP tables: [official game guide](https://roz.mygnjoy.com/en/intro/guide/12)
- Clan buffs: iRO Wiki's Clan System, as Ragnarok Zero Global has it
- Drop rate level penalty: [official game guide](https://roz.mygnjoy.com/en/intro/guide/11)
- Release roadmap (`data/roadmap.js`): the [official roadmap](https://www.mygnjoy.com/en/event/roadmap), as [JPGAMES](https://jpgames.de/wp-content/uploads/2026/07/ragnarok-zero-roadmap.jpg) list it
