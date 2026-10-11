# Data sources

[← Back to README](../README.md)

The numbers are estimates. Skill values and formulas follow the sources below and may differ from the live server after a patch, so check them against your own EXP logs.

- Monsters, drops, NPC prices and skills: [rozerodb.com](https://rozerodb.com)
- Gear, cards and refine: [roz.prontera.info](https://roz.prontera.info)
- Job bonus stats and base HP / SP: [rAthena](https://github.com/rathena/rathena/tree/master/db/pre-re)'s pre-renewal `job_stats.yml` and `job_basepoints.yml`, with Zero's changes worked out from in-game status windows (see `tools/export_jobs.py`). The same job bonus table as [ROZero Planner](https://rozeroplanner.com)
- The names cards give gear in the equipment window ("Healing" for Vitata Card): [divine-pride.net](https://www.divine-pride.net/database/item/4053)
- Random options (affixes) per gear type, pool and slot, with their min–max: [rozerodb.com Affixes Simulator](https://rozerodb.com/tools/affixes)
- Costume enchant stones and their sets: item descriptions on [rozerodb.com](https://rozerodb.com/guides/enchant), cross-checked with [midgardhub.com](https://midgardhub.com/guides/enchant-stones)
- Taming Ring pet egg enchants: item descriptions on [rozerodb.com](https://rozerodb.com), cross-checked with [midgardhub.com pet bonuses](https://midgardhub.com/guides/pet-bonuses)
- Spawn counts: the official Ragnarok Zero Global client (navigation table)
- Map names: the official client (`System/mapInfo_enUS.lub`)
- Spawn, drop and item name cross-check, in-game map codes: [ragnarokzero.net](https://ragnarokzero.net/database/maps)
- Monster race and HP cross-check: [einh-guild.de](https://einh-guild.de), [midgardhub.com](https://midgardhub.com/database/monsters)
- Formulas: [roz.prontera.info/mechanics](https://roz.prontera.info/mechanics), [iRO Wiki](https://irowiki.org/wiki/Stats)
- Skill damage %, cast times, cooldowns and after-cast delays: the in-game skill table from [roz.prontera.info](https://roz.prontera.info) (`data/skills.js`)
- Skill stat add-ons and base-level scaling, element table and ASPD table: [Landgris ROCalculator](https://landgris.github.io/ROCalculator/?zero)
- Consumables: values from the in-game item tooltips (Ragnarok Zero Global). How they stack follows Landgris: stat food and Blessing of Yggdrasil take the higher per stat, course meals and event drinks add on top
- Size table and EXP tables: [official game guide](https://roz.mygnjoy.com/en/intro/guide/12)
- Clan buffs: [Midgard Hub new player guide](https://midgardhub.com/guides/new-player), the same as iRO Wiki's Clan System
- Drop rate level penalty: [official game guide](https://roz.mygnjoy.com/en/intro/guide/11)
