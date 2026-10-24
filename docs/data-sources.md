# Data sources

[← Back to README](../README.md)

The numbers are estimates. Skill values and formulas follow the sources below and may differ from the live server after a patch, so check them against your own EXP logs.

- Monsters, drops, NPC prices and skills: [rozerodb.com](https://rozerodb.com)
- Gear, cards and refine: [roz.prontera.info](https://roz.prontera.info)
- Job bonus stats and base HP / SP: [rAthena](https://github.com/rathena/rathena/tree/master/db/pre-re)'s pre-renewal `job_stats.yml` and `job_basepoints.yml`, with Zero's changes worked out from in-game status windows (see `tools/export_jobs.py`). The same job bonus table as [ROZero Planner](https://rozeroplanner.com)
- The names cards give gear in the equipment window ("Healing" for Vitata Card): [divine-pride.net](https://www.divine-pride.net/database/item/4053)
- Gear and card descriptions (in-game text) and quests: [roz.prontera.info](https://roz.prontera.info); which monsters drop them, drop rates and MVP / mini boss: [rozerodb.com](https://rozerodb.com)
- Gear icons and card pictures (Equipment and Cards tabs): the game client's images, as [divine-pride.net](https://www.divine-pride.net) serves them per item id
- Random options (affixes) per gear type, pool and slot, with their min–max: [rozerodb.com Affixes Simulator](https://rozerodb.com/tools/affixes)
- Costume enchant stones and their sets: item descriptions on [rozerodb.com](https://rozerodb.com/guides/enchant), cross-checked with [midgardhub.com](https://midgardhub.com/guides/enchant-stones)
- Taming Ring pet egg enchants: item descriptions on [rozerodb.com](https://rozerodb.com), cross-checked with [midgardhub.com pet bonuses](https://midgardhub.com/guides/pet-bonuses); the MVP pet eggs (card slot 3): the Taiwan server's [pet enchant notice](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=217539)
- Memorial dungeons, Jellostones, the Expedition upgrades and the memorial gear's enchants (`data/memorial.js`): the Taiwan server's notices for [Poring Village](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=217651), [Orc's Memory](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=217841), [Prontera Culvert](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=217842), [Ant Hell](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=217972), [Byalan Dungeon 2F](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=218152) and the [Subjugation Team](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=218153) and [Expedition](https://roz.gnjoy.com.tw/Notice/Notice_Info?id=218154) enchants; Global item names and ids from [rozerodb.com](https://rozerodb.com)
- Spawn counts: the official Ragnarok Zero Global client (navigation table)
- Map names: the official client (`System/mapInfo_enUS.lub`)
- Spawn, drop and item name cross-check, in-game map codes: [ragnarokzero.net](https://ragnarokzero.net/database/maps)
- Monster race and HP cross-check: [einh-guild.de](https://einh-guild.de), [midgardhub.com](https://midgardhub.com/database/monsters)
- Formulas: [roz.prontera.info/mechanics](https://roz.prontera.info/mechanics), [iRO Wiki](https://irowiki.org/wiki/Stats)
- Skill damage %, cast times, cooldowns and after-cast delays: the in-game skill table from [roz.prontera.info](https://roz.prontera.info) (`data/skills.js`)
- Skill stat add-ons and base-level scaling: Zero skill data with the Zero Global ratios, checked against the in-game skill text
- Element table: [rozerodb.com](https://rozerodb.com/guides/elements-sizes)
- ASPD tables: the RO樂園攻速計算機 sheet (2026-09-07), checked against characters in game
- Consumables: values from the in-game item tooltips (Ragnarok Zero Global). How they stack: stat food and Blessing of Yggdrasil take the higher per stat, course meals and event drinks add on top
- Size table and EXP tables: [official game guide](https://roz.mygnjoy.com/en/intro/guide/12)
- Clan buffs: [Midgard Hub new player guide](https://midgardhub.com/guides/new-player), the same as iRO Wiki's Clan System
- Drop rate level penalty: [official game guide](https://roz.mygnjoy.com/en/intro/guide/11)
- Release roadmap (`data/roadmap.js`): the [official roadmap](https://www.mygnjoy.com/en/event/roadmap), as [rozerodb](https://rozerodb.com/guides/roadmap-update) and [JPGAMES](https://jpgames.de/wp-content/uploads/2026/07/ragnarok-zero-roadmap.jpg) list it
