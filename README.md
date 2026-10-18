# RO Zero Farm Planner

A farming planner and EXP tracker for **Ragnarok Zero: Global**. Enter your character, and it works out your damage, kill speed, EXP/hr and zeny/hr against every monster. Then it ranks the open maps for you and tracks your real EXP while you farm.

It's a single page that runs entirely in your browser. There's no server, no login and no build step, and your data stays in your browser's local storage.

**Live page:** https://kx-lam.github.io/RO-Zero-farmer-calculator/

## Quick start

1. **Character tab:** pick your job and attack. Then copy ATK, MATK, HIT, FLEE, ASPD, DEF, Max HP/SP and your six stats from the in-game status window.
2. **Session tab:** pick the monster you're farming and press **Farming … now**.
3. Log your EXP % every few minutes, for example `15:05 17.9% 63%` (time, base %, job %). Leave the time off (`17.9% 63%`) to log it at the current time. You can also paste many lines at once.
4. **Monsters & maps tab:** use the EXP Hunter, Zeny Hunter and Map planner to find a better spot.

## What it does

- **Character:** every 2nd job with Zero skill data, a build simulator that matches the status window, and a damage model covering elements, sizes, DEF, crits, dual wield, auto-casts, cards, buffs, consumables (HP / SP items included), skill items and weight. **Try other gear** compares a different weapon or gear with what you wear now, and puts your gear back in one click.
- **Session:** an EXP tracker with EXP/hr, time to level, a progress chart and level goals.
- **Monsters & maps:** a monster table, the EXP Hunter and Zeny Hunter map rankings, and a Map planner.
- **Monster info, Item info, Market:** drops, prices, player prices and a sell timer.
- **EXP & formulas:** EXP tables, party share and every formula with your numbers.
- **Accounts:** separate characters per account, text backups and share links.

## Docs

- [Character tab](docs/character.md): build mode, damage model, cards, buffs, consumables, skill items and weight
- [Other tabs](docs/features.md): Account, Session, Monsters & maps, Monster info, Item info, Market, EXP & formulas, and how tables work
- [Development](docs/development.md): project layout, data export tools and tests
- [Data sources](docs/data-sources.md): where the data and formulas come from

The numbers are estimates. Skill values and formulas follow the [data sources](docs/data-sources.md) and may differ from the live server after a patch, so check them against your own EXP logs.
