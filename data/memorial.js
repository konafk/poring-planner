// Memorial dungeons, Jellostones and the memorial gear's upgrades and enchants. Made by hand from the Taiwan server's notices
// (roz.gnjoy.com.tw), which run ahead of Global; item names and ids as the Global client has them (rozerodb.com).
// MEMORIALS: one row per dungeon: name, lv (base level to enter), at (where you go in), normal / hard: the reward box,
// [item id or null, name, how many].
const MEMORIALS=[
{name:"Poring Village",lv:30,at:"prt_fild05 145 235",
 normal:[[null,"Jello Fragment of the day (Jellostones card)","1"],[null,"Jellopy crystals, Poring Village Carrot or Leek, herbs and an Apple",""]]},
{name:"Orc's Memory",lv:59,at:"gef_fild10 231 203",
 normal:[[25424,"Faintly Glowing Crystal","1–3"],[15220,"Subjugation Team's Armor","0–2"],[20867,"Subjugation Team's Shoulder Belt","0–2"]],
 hard:[[25424,"Faintly Glowing Crystal","6–10"],[757,"Rough Elunium","2–8"],[756,"Rough Oridecon","2–8"],[985,"Elunium","1–3"],[984,"Oridecon","1–3"],
   [25429,"Mithril Ore","1–4"],[null,"Wind, Fire, Water and Earth ores","1–3 each"],[25457,"Cursed Emerald","0–3"]]},
{name:"Prontera Culvert",lv:59,at:"prt_fild05 265 208",
 normal:[[25424,"Faintly Glowing Crystal","1–3"],[28539,"Subjugation Team's Ring","0–2"],[22150,"Subjugation Team Boots","0–2"]],
 hard:[[25424,"Faintly Glowing Crystal","6–10"],[757,"Rough Elunium","2–8"],[756,"Rough Oridecon","2–8"],[985,"Elunium","1–3"],[984,"Oridecon","1–3"],
   [25429,"Mithril Ore","1–4"],[null,"Wind, Fire, Water and Earth ores","1–3 each"],[25458,"Shimmering Opal","0–3"]]},
{name:"Ant Hell",lv:70,at:"prt_fild06 37 197",
 normal:[[25424,"Faintly Glowing Crystal",""],[25475,"Crystal of Blue Light",""],[23649,"Jellopy Fragment Box",""]],
 hard:[[25424,"Faintly Glowing Crystal",""],[757,"Rough Elunium",""],[756,"Rough Oridecon",""],[985,"Elunium",""],[984,"Oridecon",""],
   [25429,"Mithril Ore",""],[null,"Wind, Fire, Water and Earth ores",""],[25460,"Ruby Soaked in Blood",""]]}];
// Poring Village's reward has one Jello Fragment, which one by weekday (day: 1 Monday … 5 Friday; Saturday and Sunday give a Jellopy
// Fragment Box instead). 5 of a fragment make its Jellostone at the Memory Craftsman's Workshop (prontera 48 227), with a 3-day wait.
// JELLO: frag / stone: [item id, name]
const JELLO=[
{day:1,frag:[25465,"Poring Jello Fragment"],stone:[25470,"Crimson Jellostone"]},
{day:2,frag:[25466,"Poporing Jello Fragment"],stone:[25471,"Wind of Verdure Jellostone"]},
{day:3,frag:[25467,"Drops Jello Fragment"],stone:[25472,"Dusk Jellostone"]},
{day:4,frag:[25468,"Deviling Jello Fragment"],stone:[25473,"Chaos Jellostone"]},
{day:5,frag:[25469,"Angeling Jello Fragment"],stone:[25474,"Holy Jellostone"]}];
const JELLO_PER_STONE=5,JELLO_CRAFT_DAYS=3,JELLO_BOX=[23649,"Jellopy Fragment Box"],JELLO_NPC=["Memory Craftsman's Workshop","prontera 48,227"];
// Expedition gear (Ant Hell): the Upgrader (prt_in 118 34) makes it from a Subjugation Team piece, 50 Faintly Glowing Crystal and
// Jellostones. EXPEDITION: id, name, from: [id, name], stones: {Jellostone id: how many}
const EXPEDITION_CRYSTALS=[25424,"Faintly Glowing Crystal",50],EXPEDITION_NPC=["Upgrader","prt_in 118,34"];
const EXPEDITION=[
{id:15221,name:"Expedition's Armor",from:[15220,"Subjugation Team's Armor"],stones:{25470:2}},
{id:15222,name:"Expedition's Robe",from:[15220,"Subjugation Team's Armor"],stones:{25471:2}},
{id:20868,name:"Expedition Manteau",from:[20867,"Subjugation Team's Shoulder Belt"],stones:{25473:1}},
{id:20869,name:"Expedition Muffler",from:[20867,"Subjugation Team's Shoulder Belt"],stones:{25474:1}},
{id:22151,name:"Expedition Boots",from:[22150,"Subjugation Team Boots"],stones:{25470:1,25473:1}},
{id:22152,name:"Expedition Shoes",from:[22150,"Subjugation Team Boots"],stones:{25471:1,25474:1}},
{id:28540,name:"Expedition Ring",from:[28539,"Subjugation Team's Ring"],stones:{25472:3}},
{id:28541,name:"Expedition Magic Ring",from:[28539,"Subjugation Team's Ring"],stones:{25474:3}}];
// the enchant in card slot 4 of Subjugation Team and Expedition armor, garments and shoes (Enchant Association staff, prt_in 135 35
// for Subjugation Team gear, prt_in 135 28 for Expedition): 100,000 zeny for one random line. Its pool depends on the gear and on
// refine: MEM_ENCHANT[gear][pool] = [[line, %], …]; "spirit" rows are the job spirit enchants, together (see MEM_SPIRITS)
const MEM_STATS=["STR","AGI","VIT","INT","DEX","LUK"];
const memPool=(s1,s2,flee,crit,def,mdef,hp)=>[...MEM_STATS.map(s=>[s+" +1",s1]),...MEM_STATS.map(s=>[s+" +2",s2]),["FLEE +3",flee],["CRIT +1",crit],
  ["DEF +15",def],["MDEF +2",mdef],...hp.map(([v,p])=>["MaxHP +"+v,p])];
const MEM_ENCHANT={
 subjugation:{low:memPool(10.52,0.09,6.03,6.03,5.17,5.17,[[50,6.18],[100,4.31],[200,3.45]]),
   garment:memPool(7.13,0.89,3.48,3.48,3.48,3.48,[[50,10.70],[100,8.91],[200,7.58],[300,6.31],[400,4.46]]),
   shoes:memPool(7.58,3.57,4.90,4.90,4.90,4.90,[[50,4.90],[100,3.50],[200,2.60],[300,1.70],[400,0.80]]),
   armor:[...memPool(6.75,0.81,6.54,6.54,6.54,6.54,[[50,4.88],[100,4.07],[200,3.25],[300,2.44],[400,1.66]]),["spirit",12.18]]},
 expedition:{low:memPool(6.00,5.00,5.00,5.00,5.00,5.00,[[50,6.00],[100,5.00],[200,3.00]]),
   garment:memPool(7.13,0.89,3.48,3.48,3.48,3.48,[[50,10.70],[100,8.91],[200,7.58],[300,6.31],[400,4.46]]),
   shoes:memPool(7.58,3.57,4.90,4.90,4.90,4.90,[[50,4.90],[100,3.50],[200,2.60],[300,1.70],[400,0.80]]),
   armor:[...memPool(5.25,4.90,4.28,4.28,4.28,4.28,[[50,5.25],[100,5.25],[200,5.25],[300,3.50],[400,0.805]]),["spirit",1.925]]}};
// the job spirit enchants on +9 armor: Subjugation Team armor rolls a 1st job's spirit Lv 1 (2.03% each); Expedition armor rolls a 2nd
// job's, 0.05% for a Lv 1 and 0.025% for a Lv 2
const MEM_SPIRITS={
 subjugation:["Swordsman Spirit Lv 1: Magnum Break SP −10, after-attack delay −1% per 2 levels of Bash",
   "Merchant Spirit Lv 1: ATK +2 per level of Discount, after-attack delay −1% per 2 levels of Overcharge",
   "Thief Spirit Lv 1: ATK +30 for Thieves, after-attack delay −1% per 2 levels of Steal",
   "Mage Spirit Lv 1: Cold Bolt, Fire Bolt and Lightning Bolt damage +20%, variable cast −1% per 2 levels of Fire Wall",
   "Acolyte Spirit Lv 1: Heal, Increase AGI and Blessing SP −15%, heal +1% per 2 levels of Heal",
   "Archer Spirit Lv 1: Double Strafe SP −5, bow ATK +1% per level of Owl's Eye"],
 expedition:["Knight, Blacksmith, Assassin, Wizard, Priest, Hunter, Crusader, Alchemist, Rogue, Sage, Monk, Bard / Dancer and Ninja spirits, Lv 1 and Lv 2: skill damage, cast and after-attack delay bonuses for that job"]};
