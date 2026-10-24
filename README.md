# RO Zero Farm Planner

A farming planner and EXP tracker for **Ragnarok Zero: Global**. Enter your character, and it works out your damage, kill speed, EXP/hr and zeny/hr against every monster. Then it ranks the open maps for you and tracks your real EXP while you farm.

It's a single page that runs entirely in your browser. There's no server, no login and no build step, and your data stays in your browser's local storage.

**Live page:** https://kx-lam.github.io/RO-Zero-farmer-calculator/

## Quick start

1. **Character tab:** pick your job and attack. Then copy ATK, MATK, HIT, FLEE, ASPD, DEF, Max HP/SP and your six stats from the in-game status window.
2. **Session tab:** pick the monster you're farming and press **Farming … now**.
3. Log your EXP % every few minutes, for example `15:05 17.9% 63%` (time, base %, job %). Leave the time off (`17.9% 63%`) to log it at the current time. You can also paste many lines at once, or press **L** on any tab to log from the top bar. **Ctrl+K** or **/** searches every monster, item and map, and clicking a monster, item, gear or card name opens its details.
4. **Monsters & maps tab:** Where to farm shows the best maps for your character by EXP and by zeny; press **Farm here** on one.

## What it does

- **Character:** every 2nd job with Zero skill data, a build simulator that matches the status window, and a damage model covering elements, sizes, DEF, crits, dual wield, auto-casts, cards, buffs, consumables (HP / SP items included), skill items and weight. Up to 10 **other gear sets** (add or remove them as you need) are worked out next to your gear, so you can compare weapons or cards before you switch. Gear you take off keeps its refine, cards and affixes for when you put it back on, and whole setups can be saved as named **loadouts** to swap between.
- **Session:** an EXP tracker with EXP/hr, time to level, a progress chart and level goals.
- **Monsters & maps:** Where to farm (the best spots and one map ranking by EXP or zeny, with Farm here), a Map planner, a monster table, and a green / yellow / red check of whether you can farm a map with no HP or SP items.
- **Memorials:** a Jellostone tracker (today's Poring Village fragment, the 3-day craft, when you'll have the stones for the Expedition pieces you want), and the memorial dungeons' rewards and gear enchants.
- **Roadmap:** the release roadmap: when each update comes, its level cap, and which maps and monsters are out (the rest open by themselves on their date).
- **Monster info, Item info, Market:** drops, prices, player prices and a sell timer. Monster info has the monster table too. Every item shows its in-game icon.
- **Equipment, Cards:** every weapon, armor and card, filtered by type, job, level, card slots and ATK / MATK / DEF, with one click to put it in your gear or another gear set.
- **Recipes:** every forging, brewing, arrow crafting, cooking, Mixture & Counteragent and Dye Making recipe, searchable by the item made or its materials, with what the materials are worth.
- **EXP & formulas:** EXP tables, party share and every formula with your numbers.
- **Accounts:** separate characters per account, text backups and share links.

## Docs

- [Character tab](docs/character.md): build mode, damage model, cards, buffs, consumables, skill items and weight
- [Other tabs](docs/features.md): accounts and Backup, Session, Monsters & maps, Roadmap, Monster info, Item info, Equipment and Cards, Recipes, Market, EXP & formulas, and how tables work
- [Development](docs/development.md): project layout, data export tools and tests
- [Data sources](docs/data-sources.md): where the data and formulas come from

The numbers are estimates. Skill values and formulas follow the [data sources](docs/data-sources.md) and may differ from the live server after a patch, so check them against your own EXP logs.
