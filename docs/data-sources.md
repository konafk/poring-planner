# Data sources

[← Back to README](../README.md)

The numbers are estimates. Skill values and formulas follow the sources below and may differ from the live server after a patch, so check them against your own EXP logs.

- Monsters, drops, NPC prices and skills: a community database's export of the Global client
- Gear, cards and refine: [roz.prontera.info](https://roz.prontera.info)
- Job bonus stats and base HP / SP: [rAthena](https://github.com/rathena/rathena/tree/master/db/pre-re)'s pre-renewal `job_stats.yml` and `job_basepoints.yml`, with Zero's changes worked out from in-game status windows (see `tools/export_jobs.py`). The same job bonus table as [ROZero Planner](https://rozeroplanner.com)
- The names cards give gear in the equipment window ("Healing" for Vitata Card): [divine-pride.net](https://www.divine-pride.net/database/item/4053)
- Gear and card descriptions (in-game text) and quests: [roz.prontera.info](https://roz.prontera.info); which monsters drop them, drop rates and MVP / mini boss: the same community database
- Item icons, card pictures and monster pictures: the game client's images, as [divine-pride.net](https://www.divine-pride.net) serves them per item or monster id
- Crafting recipes (Recipes tab): the community database's recipe list and its Alchemy Lab guide (Mixture, Counteragent, Dyestuffs)
- Random options (affixes) per gear type, pool and slot, with their min–max: the community database's affix simulator
- Costume enchant stones and their sets: the stones' item descriptions (Global client text)
- Taming Ring pet egg enchants: the eggs' item descriptions (Global client text)
- Memorial dungeons, Jellostones, the Expedition upgrades and the memorial gear's enchants (`data/memorial.js`): the Taiwan server's notices (roz.gnjoy.com.tw), which run ahead of Global; item names and ids as the Global client has them
- Stellar weapons and the Activation System (`data/stellar.js`): the Taiwan server's Activation System; the ★ weapons from the official client
- Spawn counts: the official Ragnarok Zero Global client (navigation table)
- Map names: the official client (`System/mapInfo_enUS.lub`)
- Spawn, drop and item name cross-check, in-game map codes: [ragnarokzero.net](https://ragnarokzero.net/database/maps)
- Monster race and HP cross-check: [einh-guild.de](https://einh-guild.de)
- Formulas: [roz.prontera.info/mechanics](https://roz.prontera.info/mechanics), [iRO Wiki](https://irowiki.org/wiki/Stats)
- Skill damage %, cast times, cooldowns and after-cast delays: the in-game skill table from [roz.prontera.info](https://roz.prontera.info) (`data/skills.js`)
- Skill stat add-ons and base-level scaling: Zero skill data with the Zero Global ratios, checked against the in-game skill text
- Element table: entered by hand in `js/game.js`
- ASPD tables: the RO樂園攻速計算機 sheet (2026-09-07), checked against characters in game
- Consumables: values from the in-game item tooltips (Ragnarok Zero Global). How they stack: stat food and Blessing of Yggdrasil take the higher per stat, course meals and event drinks add on top
- Size table and EXP tables: [official game guide](https://roz.mygnjoy.com/en/intro/guide/12)
- Clan buffs: iRO Wiki's Clan System, as Ragnarok Zero Global has it
- Drop rate level penalty: [official game guide](https://roz.mygnjoy.com/en/intro/guide/11)
- Release roadmap (`data/roadmap.js`): the [official roadmap](https://www.mygnjoy.com/en/event/roadmap), as [JPGAMES](https://jpgames.de/wp-content/uploads/2026/07/ragnarok-zero-roadmap.jpg) list it
