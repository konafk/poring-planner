# Character tab

[← Back to README](../README.md) · [Other tabs](features.md)

- **Every 2nd job:** pick a job and an attack. The presets use max-level Ragnarok Zero skill data, including cast time, delay, base-level scaling and stat bonuses. Shield Boomerang and Rapid Smiting (Shield Chain) add the shield's weight + 4 × its refine to their damage %: type them in the Shield weight / refine boxes under Attack details, or build mode reads them from the Shield row. Axe Boomerang adds the axe's weight the same way (Weapon weight box, or the Weapon row), Acid Bomb adds 10 × the monster's VIT, and the Monk combo's Quadruple Blow doubles with a knuckle.
- **Build mode:** works out ATK, MATK, HIT, FLEE, ASPD, DEF, HP and SP from base stats, job level, gear, refine, cards and affixes, matching the in-game status window. You can type gear the way the equipment window shows it: `+7 Healing Shining Clip` in the item box picks a +7 Shining Clip with a Vitata Card. The game names gear by its cards ("Healing" is the Vitata Card, "Boots of Health" a Verit Card; Double, Triple and Quadruple mean 2–4 copies of one card), and long names that the window cuts off (`+7 Hard Nordfeld Soldier...`) still work. Card names work too, in any case and with or without "Card": `+7 Shining Clip Vitata` in the item box, or `vitata` in a card box. A card box also takes the name a card gives its gear (`Healing`, `Double Healing`), and the card list shows that name next to each card. Every part except arrows takes a refine, since some accessories and headgear refine too. Pick each affix (random option) from the list and type its value. Each list shows only the affixes that gear can roll, from rozerodb's affix tables, with the min–max next to each name. Weapons go by type: staves get the magic affixes, bows, instruments and whips the ranged ones, and every other weapon the melee ones. Books and weapons with MATK (Encyclopedia, Bazerald) get the magic affixes as well as their own. That includes a weapon in the Assassin's left-hand row. Armor, garments and shoes have their own lists. rozerodb has no affixes for shields, headgear or accessories, so those rows show every affix. Any item takes up to 4 affixes, because the same item can roll 2 on one drop and 4 on the next. Resist affixes lower the damage you take from that race or element. Affixes the damage model can't use, such as healing, magic damage vs an element or ignoring one race's DEF, are listed under "Not counted". An affix you saved earlier stays even if that gear can't roll it, under "Saved". Bonuses rozerodb doesn't list as an affix, such as a dungeon's special enchants, are under "Other" on every part. Builds saved with typed affixes still count them, and they turn into list rows when you next edit them. Under the gear, the Special Equipment row takes a costume enchant stone for each costume slot (Upper, Middle, Lower, Garment) and the pet egg sealed in a Taming Ring (Accessory Right). An egg's Lv.1 gives that pet's Cordial bonus and Lv.2 its Loyal bonus. Stones that complete a set add its bonus too: Critical Stones in Upper, Middle and Lower give +6% critical damage, and +10 CRIT with the Garment one as well; Variable Casting Stones in Upper, Middle and Lower give −6% variable cast; a Lower Exchange Stone with the same stat's Middle one gives back the stats both take away; DEF (Middle) with MDEF (Lower) gives HIT and FLEE +5. Recovery stones, the Double Attack Stone, and the eggs' Perfect Dodge and Stun resistance are listed under "Not counted". For special equipment the lists don't have, press **+ Add other special equipment**: name it, pick up to 4 effects from the full affix list and type their values. Untick a row to take it off without losing it.
- **Max HP and SP:** Zero uses classic RO's job tables made smaller: base HP and SP × 0.7 (rounded to the nearest), and 2nd jobs × 1.25 on top (rounded down), the way baby and transcendent classes work. Sage and Alchemist get 9 SP per base level (the Wizard's rate) and Crusader 1 SP more. Then Max HP = base × (1 + VIT/100), plus flat gear HP and the clan's +30, then every % added together; SP the same with INT. Checked against in-game status windows and the character select screen of every job but the Monk, from Lv 1 to Lv 70. 2nd jobs get their job bonus stats up to Job Lv 70 from the transcendent job's table (Knight from Lord Knight, Sage from Professor …). Right after a job change the game can keep counting the old job's bonus stats into Max HP / SP until you relog, so check against the game after that. Learned passives with Max HP / SP count (Faith, Meditatio, Soul Drain, Music and Dance Lessons, which give their Max SP % with any weapon).
- **Equipment stats (Status window mode):** the % lines from the in-game Equipment Stats window that the status window doesn't show: damage to a race, size, element, boss / normal monsters, a monster group or all monsters, your spells' element damage, CRIT when attacking a race, damage taken, EXP, SP cost and HP / SP recovery. **Fill from gear** replaces the lines with the ones the gear you set up in Build from gear gives (gear, cards, affixes, costume stones, the Taming Ring and other special equipment; not consumables or buffs). It asks first if you already have lines. The two modes keep their own lines, so press it again after changing your gear.
- **Damage model:** status ATK/MATK, weapon size penalty, the element table, monster DEF/MDEF, hit and dodge chance, crits, mastery ATK, gear % bonuses, cast and delay reduction, ASPD potions and elemental converters.

## Assassin dual wield

Put a dagger, one-handed sword or one-handed axe in the left hand. In Status window mode, use the Left hand fields; the "Wearing a shield" tick box (any job) and the Left hand swap each other out and move your typed ASPD by the shield or left-weapon penalty. In Build mode, use the "Shield / left hand" row.

Basic attacks hit with both hands: the right hand × Righthand Mastery (50 + 10 per level %), the left hand × Lefthand Mastery (30 + 10 per level %), each with its own weapon ATK, size penalty and element. The left hand counts status ATK once, Double Attack repeats only the right hand, and skills use the right hand only. The left weapon costs a quarter of its delay in ASPD: −10 for a dagger and −12 for a one-handed sword or axe (rAthena renewal rules, whose Assassin ASPD table matches Zero's). Without a skill tree, both masteries count as Lv 5.

## Consumables

One card for everything you buy and use up: the Discount setting, HP and SP items (below) and the ASPD potion, converters, food and buffs. Read your status window with these off; they add on top. If your typed numbers already include your buffs and items, untick the box under the status window stats and nothing is added (the ASPD potion still costs zeny).

- **ASPD potion:** Concentration (any job), Awakening (Base Lv 40+, not Novice, Acolyte, Priest, Bard or Dancer) or Berserk (Base Lv 85+; Swordsman, Knight, Crusader, Mage, Wizard, Merchant, Blacksmith, Alchemist and Rogue). One you can't drink yet is greyed out, and the strongest you can drink is used instead.
- **Elemental converter:** one element at a time. Pick Fire, Water, Earth or Wind, or let it pick the best per monster and map; it shows each one's element-table rate against the monster you picked.
- **Blessing of Yggdrasil:** a World Tree Dew or Zelstar from the KP shop each hour: all stats +7, ATK +30, MATK +30, HIT +5, FLEE +5.
- **Clan:** pick the clan you joined. It's a buff that stays on: Sword Clan STR +1 and VIT +1, Arch Wand Clan INT +1 and DEX +1, Golden Mace Clan LUK +1 and INT +1, Crossbow Clan DEX +1 and AGI +1, each with Max HP +30 and Max SP +10. It stacks with food and Blessing of Yggdrasil. It counts in Build mode only: the buff can't be switched off, so a typed status window already includes it.
- **Food and other consumables:** type them as + and +% per main stat (STR … LUK; +% is a share of the total stat, rounded down; the + doesn't stack with Blessing of Yggdrasil, the higher one counts, as in Landgris ROCalculator), anything else as effect lines ("ATK +20, ASPD +10%"). Other consumables carry no zeny cost.
- **Event items:** "+ event item…" adds Challenge Drink, Mimir's Well, Small Mana / Healing Potion, Unlimited Drink, Premium Course Meal, Enriched Abrasive, Growth Elixir or Ale's Blessing as an editable row. Effect lines can also say "SP +5% every 5s" or "HP +20 every 5s" (restored over time, even when overweight), "SP consumption -10%", "Fixed cast -30%" (only the highest % cut counts), "Crit damage +5%", "Ranged damage +5%" (ranged weapons), "Magic damage +5%" (spells), "Base/Job EXP +50%", "Recovery items +20%" (HP and SP items), "Heal received +20%" (Vitata's Heal), "All stats +5", "Casting cannot be interrupted", and "ATK/MATK +30" for both. They can be typed the way the item says them, too: "+7 All Stats", "HIT/FLEE 30", "Incoming Heal and Recovery Item effect +20%". These count whether or not your status window already has your buffs.
- **Buffs from others:** "+ Add" under the list takes a buff that isn't there, written the same way.
- **Buffs from others:** tick Blessing, Increase AGI, Angelus (Max HP +50 per level in Zero), Impressive Riff…

## Auto-cast spells

Any job, Mages included, can add a spell from a card, weapon or scroll that procs on basic attacks with your MATK. Sage Spell Fist counts the basic attack's own physical hit as well as the procs.

## Cards any job can slot

- **Vitata:** SP cost +25%, and the Heal Lv1 you cast costs SP and time you aren't attacking. Heal covers the HP you lose (after Hunter Fly, HP regen and consumables), so no HP items are counted on top. In build mode a Vitata Card in your gear already counts its SP cost.
- **Side Winder:** basic attacks hit twice some of the time, right hand only. With Double Attack learned the card adds nothing.
- **Creamy:** Teleport Lv1, so the Zeny Hunter can teleport past monsters you skip. Its 10 SP a cast isn't counted.
- **Phen / Bloody Butterfly:** casts can't be interrupted, variable cast +25% / +30%. Build mode reads them from your gear.

## Interrupted casts

A hit that lands while you cast interrupts it and you start again, so with λ hits landing per second (from "swings reach you" and your dodge) a T-second cast takes (e^(λT) − 1)/λ on average. No SP is spent on an interrupted cast. Phen and Bloody Butterfly turn this off. Basic attacks and Spell Fist have no cast.

## SP regen

Left blank, SP regen per 8 s is worked out: 1 + Max SP/100 + INT/6, plus more from INT 120, raised by SP Recovery +% gear. Increase SP Recovery from your Skills card adds Lv × (3 + 0.2% of Max SP) every 10 s on top, and consumables that restore SP over time add theirs, so type only the natural tick if you type one. Natural regen and Increase SP Recovery stop at 70% weight.

HP works the same way. Under Taking damage in Attack details, HP regen per 6 s left blank is worked out: VIT/5 + Max HP/200 (at least 1), raised by HP Recovery +% gear (rAthena's formula, not checked in game). Increase HP Recovery (Swordsman, Knight, Crusader) adds Lv × (5 + 0.2% of Max HP) every 10 s on top, and consumables that restore HP over time and Hunter Fly add theirs, so type only the natural tick if you type one. Natural regen and Increase HP Recovery stop at 70% weight. Saves from before this kept an "HP back per minute" box; a number typed there carries over as the 6 s tick (a tenth of it).

## HP back from cards

- **Hunter Fly:** physical attacks have a chance to restore HP every second for 5 s, so less HP lost per minute. Set how many copies you wear (1–4); build mode counts them in your gear and counts the card as on. Each copy rolls on every attack until one procs, but the restore doesn't add up, so the HP restore runs 1 − (1 − 5%)^(copies × attacks in 5 s) of the time (not checked in game).

Card HP keeps coming when you're overweight, unlike natural regen. "HP Recovery +x%" (Muka, Zombie, Wooden Golem, Merman) raises natural HP regen: build mode reads it from your gear, and in Status window mode you add an "HP recovery" line under Equipment stats.

## SP back from cards

- **Dracula:** attacks have a chance to restore SP every second for 7 s. Copies (1–4, or counted from your gear in build mode) work like Hunter Fly's: more rolls per attack, one restore at a time.
- **Dark Priest:** a Sage gets 1 SP per physical hit that lands.
- **+5 SP per kill weapon cards** (Beetle King, Caterpillar, Driller, Nereid, Phendark, Tri-Joint, Zombie Master): when a melee physical attack kills that race, spread over the fight; not with Spell Fist.

Card SP keeps coming when you're overweight, unlike natural regen. "SP Recovery +x%" (Eggyra, Sohee, Merman) raises natural SP regen: build mode reads it from your gear, and in Status window mode you add an "SP recovery" line under Equipment stats.

## Energy Coat (Mage, Wizard, Sage)

Cuts damage taken by 6–30% for 1–3% of Max SP per hit, the fuller your SP the more of both. Your SP level is the fullest that regen can hold after your attack's own SP; when it can't, SP items hold it at the level you set, and without items your SP runs low (−6%).

## Sage options

Spell Fist with the best bolt per monster, Hindsight (switched on or off automatically against your zeny limit), Double Bolt and SP items. The cards and Energy Coat above count for Spell Fist too: Side Winder's 2nd hit also procs Spell Fist.

## Items skills use up

Each use of an attack takes its catalysts and arrows:

- Acid Terror: an Acid Bottle
- Acid Bomb: an Acid Bottle and a Bottle Grenade
- Magnus Exorcismus: a Blue Gemstone
- One arrow per shot with a bow, instrument or whip (basic attacks, Double Strafe, Arrow Shower, Focused Arrow Strike, Arrow Vulcan…; Triangle Shot takes 3). The arrow matches your attack element (Fire Arrow, Crystal Arrow, Silver Arrow…).
- Mammonite costs 100 z × its level.

Hunters (traps), Mages, Wizards and Sages (Stone Curse) and Alchemists (Bomb) can type how many times per kill they cast a support skill that uses an item (0.5 = every other kill; blank = never). With a skill tree, only the ones you learned are offered, and Sage ground buffs (Volcano, Deluge, Whirlwind) cost a gemstone every 60 s × level while switched on.

Under Attack details you see what a use costs, the zeny and weight per hour against the monster you picked and how long Max Weight's worth lasts. The support casts and each item's price are in the Consumables card: an item defaults to its NPC price (less Discount); type your own (a market price) per item, saved per job. Every zeny/hr figure takes these off.

## Overcharge and Discount

A Merchant, Blacksmith or Alchemist with Overcharge learned gets more from NPCs. That raises the loot value per kill and the NPC price that a market price replaces (7, 9, 11 … 23, 24% for Lv 1–10).

**Buy with Discount** in the Consumables card (on by default, saved for the whole account) takes it that a Merchant on the account with Discount Lv 10 buys for every character: −24% on the ASPD potion, skill items and Custom HP / SP items, and the Discount price for HP and SP items. Untick it to use NPC prices. The character's own Discount level isn't used.

## HP and SP items

In the Consumables card: HP and SP items with what they really cost per HP / SP: Red, Orange, Yellow and White Potion, Cheese, Blue Herb, Strawberry and Blue Potion. The amounts were measured in Ragnarok Zero Global on a Merchant (they don't match classic RO) and the average of min and max is counted.

- With **Buy with Discount** each item uses its Discount price, else the NPC price. Items NPCs don't sell (Strawberry, Blue Potion) use a player price you type; Blue Potion has none until you do, shows n/a and is never picked as the cheapest.
- Edit any item's min, max, price or weight in the table (saved per job); "reset" goes back to the defaults. Sort by any column; the item in use is marked.
- Uses, zeny and weight per hour are worked out for the Map planner's map (else the monster you picked): HP items cover its HP lost / min, SP items the SP your attack uses beyond regen and cards.
- Pick the HP and SP item per job, leave them on Auto (cheapest), or pick None to use no item: no HP item means HP loss costs nothing (regen, cards, heals cover it), no SP item means you rest. The SP item is the one "SP items: auto-use when needed" and Sage Hindsight use; Custom (HP or SP) lets you type what one restores and costs. Older saves with their own SP item typed carry it over as Custom.

## Weight

Enter what you carry when you leave town (gear, potions, scrolls), your Max Weight, where you sell (any % up to 90, such as 65% to stay clear of 70%) and how long a town trip takes.

- At 70% weight HP and SP stop regenerating, and at 90% you can't attack or use skills, so each trip ends at your sell point. Only the room above your starting weight fills with loot.
- Kills per trip come from each drop's weight × chance. The trip time is spread over those kills in every EXP/min and zeny/hr figure.
- Selling past 70% means fighting the stretch above 70% with no regen. It falls back to 70% when your attack needs SP and you have no SP items.
