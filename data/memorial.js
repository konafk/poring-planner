// Memorial dungeons, Jellostones and the memorial gear's upgrades and enchants. Made by hand; item names and ids as the Global
// client has them.
// MEMORIALS: one row per dungeon: name, lv (base level to enter), npc (who lets you in), at (where they stand), normal / hard: the
// reward box, [item id or null, name, how many]. A party of 7 or more gets more from Orc's Memory, Prontera Culvert and Ant Hell.
const MEMORIALS=[
{name:"Poring Village",lv:30,npc:"Emily",at:"prt_fild05 145 235",
 normal:[[null,"Jello Fragment of the day (Jellostones card)","1"],[null,"Jellopy crystals, Poring Village Carrot or Leek, herbs and an Apple",""]]},
{name:"Orc's Memory",lv:59,npc:"Calm Scientist",at:"gef_fild10 231 203",
 normal:[[25424,"Faintly Glowing Crystal","1–3"],[15220,"Subjugation Team's Armor","0–2"],[20867,"Subjugation Team's Shoulder Belt","0–2"]],
 hard:[[25424,"Faintly Glowing Crystal","6–10"],[757,"Rough Elunium","2–8"],[756,"Rough Oridecon","2–8"],[985,"Elunium","1–3"],[984,"Oridecon","1–3"],
   [25429,"Mithril Ore","1–4"],
   [990,"Red Blood","1–3"],[991,"Crystal Blue","1–3"],[992,"Wind of Verdure","1–3"],[993,"Green Live","1–3"],[25457,"Cursed Emerald","0–3"]]},
{name:"Prontera Culvert",lv:59,npc:"Underground Management Director",at:"prt_fild05 265 208",
 normal:[[25424,"Faintly Glowing Crystal","1–3"],[28539,"Subjugation Team's Ring","0–2"],[22150,"Subjugation Team Boots","0–2"]],
 hard:[[25424,"Faintly Glowing Crystal","6–10"],[757,"Rough Elunium","2–8"],[756,"Rough Oridecon","2–8"],[985,"Elunium","1–3"],[984,"Oridecon","1–3"],
   [25429,"Mithril Ore","1–4"],
   [990,"Red Blood","1–3"],[991,"Crystal Blue","1–3"],[992,"Wind of Verdure","1–3"],[993,"Green Live","1–3"],[25458,"Shimmering Opal","0–3"]]},
{name:"Ant Hell",lv:70,npc:"Memory Labyrinth Association Member",at:"prt_fild06 37 197",
 normal:[[25424,"Faintly Glowing Crystal",""],[25475,"Crystal of Blue Light",""],[23649,"Jellopy Fragment Box",""]],
 hard:[[25424,"Faintly Glowing Crystal",""],[757,"Rough Elunium",""],[756,"Rough Oridecon",""],[985,"Elunium",""],[984,"Oridecon",""],
   [25429,"Mithril Ore",""],
   [990,"Red Blood",""],[991,"Crystal Blue",""],[992,"Wind of Verdure",""],[993,"Green Live",""],[25460,"Ruby Soaked in Blood",""]]}];
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
// Expedition gear (Ant Hell): the Equipment Enhancer (prt_in 118 34) makes it from a Subjugation Team piece, 50 Faintly Glowing Crystal and
// Jellostones. EXPEDITION: id, name, from: [id, name], stones: {Jellostone id: how many}
const EXPEDITION_CRYSTALS=[25424,"Faintly Glowing Crystal",50],EXPEDITION_NPC=["Equipment Enhancer","prt_in 118,34"];
const EXPEDITION=[
{id:15221,name:"Expedition's Armor",from:[15220,"Subjugation Team's Armor"],stones:{25470:2}},
{id:15222,name:"Expedition's Robe",from:[15220,"Subjugation Team's Armor"],stones:{25471:2}},
{id:20868,name:"Expedition Manteau",from:[20867,"Subjugation Team's Shoulder Belt"],stones:{25473:1}},
{id:20869,name:"Expedition Muffler",from:[20867,"Subjugation Team's Shoulder Belt"],stones:{25474:1}},
{id:22151,name:"Expedition Boots",from:[22150,"Subjugation Team Boots"],stones:{25470:1,25473:1}},
{id:22152,name:"Expedition Shoes",from:[22150,"Subjugation Team Boots"],stones:{25471:1,25474:1}},
{id:28540,name:"Expedition Ring",from:[28539,"Subjugation Team's Ring"],stones:{25472:3}},
{id:28541,name:"Expedition Magic Ring",from:[28539,"Subjugation Team's Ring"],stones:{25474:3}}];
// The two rungs after Expedition, not in the Global client yet: Contingent (base Lv 80, with the Izlude memorial of the Lutie update,
// data/roadmap.js) and Conqueror (base Lv 90, not announced). From RagnaDex's memorial gear page (ragnadex.com/en/memorial/gear, as of
// 22 September 2026, rAthena's Zero data), so no item ids and no Crimson Crystal id. The Equipment Enhancer makes each from its piece of
// the rung below, 50 crystals and Jellostones, in four branches: melee, ranged, magic and healing. Upgrading gives a new +0 piece: the
// old one's refine, card and enchant are gone. LATER_RUNGS: rung: {crystals: [id, name, how many], lv, pieces: [{name, from: [id, name],
// branch, stones: {Jellostone id: how many}}]}
const LATER_RUNGS={
contingent:{name:"Contingent",lv:80,crystals:[25475,"Crystal of Blue Light",50],pieces:[
 {name:"Contingent Mail",from:[15221,"Expedition's Armor"],branch:"melee",stones:{25470:4}},
 {name:"Contingent Manteau",from:[20868,"Expedition Manteau"],branch:"melee",stones:{25473:4}},
 {name:"Contingent Greaves",from:[22151,"Expedition Boots"],branch:"melee",stones:{25470:4}},
 {name:"Contingent Ring",from:[28540,"Expedition Ring"],branch:"melee",stones:{25474:6}},
 {name:"Contingent Cloth",from:[15221,"Expedition's Armor"],branch:"ranged",stones:{25470:2,25473:2}},
 {name:"Contingent Cloak",from:[20868,"Expedition Manteau"],branch:"ranged",stones:{25470:2,25473:2}},
 {name:"Contingent Boots",from:[22151,"Expedition Boots"],branch:"ranged",stones:{25473:4}},
 {name:"Contingent Glove",from:[28540,"Expedition Ring"],branch:"ranged",stones:{25474:6}},
 {name:"Contingent Robe",from:[15222,"Expedition's Robe"],branch:"magic",stones:{25471:4}},
 {name:"Contingent Muffler",from:[20869,"Expedition Muffler"],branch:"magic",stones:{25471:2,25474:2}},
 {name:"Contingent Shoes",from:[22152,"Expedition Shoes"],branch:"magic",stones:{25471:4}},
 {name:"Contingent Magic Ring",from:[28541,"Expedition Magic Ring"],branch:"magic",stones:{25474:6}},
 {name:"Contingent Dress",from:[15222,"Expedition's Robe"],branch:"healing",stones:{25471:2,25474:2}},
 {name:"Contingent Cape",from:[20869,"Expedition Muffler"],branch:"healing",stones:{25474:4}},
 {name:"Contingent Sandal",from:[22152,"Expedition Shoes"],branch:"healing",stones:{25474:4}},
 {name:"Contingent Necklace",from:[28541,"Expedition Magic Ring"],branch:"healing",stones:{25474:6}}]},
conqueror:{name:"Conqueror",lv:90,crystals:[null,"Crimson Crystal",50],pieces:[
 {name:"Conqueror's Mail",from:[null,"Contingent Mail"],branch:"melee",stones:{25470:6}},
 {name:"Conqueror's Manteau",from:[null,"Contingent Manteau"],branch:"melee",stones:{25473:6}},
 {name:"Conqueror's Greaves",from:[null,"Contingent Greaves"],branch:"melee",stones:{25470:6}},
 {name:"Conqueror's Ring",from:[null,"Contingent Ring"],branch:"melee",stones:{25474:9}},
 {name:"Conqueror's Cloth",from:[null,"Contingent Cloth"],branch:"ranged",stones:{25470:3,25473:3}},
 {name:"Conqueror's Cloak",from:[null,"Contingent Cloak"],branch:"ranged",stones:{25470:3,25473:3}},
 {name:"Conqueror's Boots",from:[null,"Contingent Boots"],branch:"ranged",stones:{25473:6}},
 {name:"Conqueror's Glove",from:[null,"Contingent Glove"],branch:"ranged",stones:{25474:10}},
 {name:"Conqueror's Robe",from:[null,"Contingent Robe"],branch:"magic",stones:{25471:6}},
 {name:"Conqueror's Muffler",from:[null,"Contingent Muffler"],branch:"magic",stones:{25471:3,25474:3}},
 {name:"Conqueror's Shoes",from:[null,"Contingent Shoes"],branch:"magic",stones:{25471:6}},
 {name:"Conqueror's Magic Ring",from:[null,"Contingent Magic Ring"],branch:"magic",stones:{25474:10}},
 {name:"Conqueror's Dress",from:[null,"Contingent Dress"],branch:"healing",stones:{25471:3,25474:3}},
 {name:"Conqueror's Cape",from:[null,"Contingent Cape"],branch:"healing",stones:{25474:6}},
 {name:"Conqueror's Magic Shoes",from:[null,"Contingent Sandal"],branch:"healing",stones:{25474:6}},
 {name:"Conqueror's Necklace",from:[null,"Contingent Necklace"],branch:"healing",stones:{25474:10}}]}};
// every upgrade the Jellostone tracker can count, with its crystals: an Expedition piece's key is its item id, a later one's its name
const MEM_LADDER=[...EXPEDITION.map(x=>({...x,key:x.id,crystals:EXPEDITION_CRYSTALS})),
  ...Object.values(LATER_RUNGS).flatMap(r=>r.pieces.map(x=>({...x,key:x.name,crystals:r.crystals})))];
// what the hard mode gems and Mithril Ore make: Thor's Flame (alberta_in 18 58, prt_in 64 68, morocc_in 74 35, payon 143 169,
// geffen_in 102 176, aldeba_in 33 50) turns 10 Mithril Ore into a Mithril, and the Mysterious Artisan (morocc_in 76 167) makes each
// Oath ring and earring from 15 of its gem and 10 Mithril, ready in a week, or at once for 10 more Mithril (its dialogue, client patch
// of 12 November 2026, which names it; the amounts are filled in by the server, not in the client). MEM_CRAFTS: id, name, npc [name, map
// x,y], mats [[id, name, how many]]
const MEM_CRAFT_NPC=["Mysterious Artisan","morocc_in 76,167"];
const MEM_CRAFTS=[
{id:25430,name:"Mithril",npc:["Thor's Flame","prt_in 64,68"],mats:[[25429,"Mithril Ore",10]]},
{id:28568,name:"Cursed Emerald Earring",npc:MEM_CRAFT_NPC,mats:[[25457,"Cursed Emerald",15],[25430,"Mithril",10]]},
{id:28569,name:"Shimmering Opal Earrings",npc:MEM_CRAFT_NPC,mats:[[25458,"Shimmering Opal",15],[25430,"Mithril",10]]},
{id:28570,name:"Ring of Blue Oath",npc:MEM_CRAFT_NPC,mats:[[25459,"Sapphire of the Blue Sea",15],[25430,"Mithril",10]]},
{id:28571,name:"Red Oath Ring",npc:MEM_CRAFT_NPC,mats:[[25460,"Ruby Soaked in Blood",15],[25430,"Mithril",10]]}];
// the enchant in card slot 4 of Subjugation Team and Expedition armor, garments and shoes (Enchant Association staff, prt_in 135 35
// for Subjugation Team gear, prt_in 135 28 for Expedition): 100,000 zeny for one random line. Its pool depends on the gear and on
// refine: MEM_ENCHANT[gear][pool] = [[line, %], …]; "essence" rows are the Job Essences, together (see MEM_ESSENCE)
const MEM_STATS=["STR","AGI","VIT","INT","DEX","LUK"];
const memPool=(s1,s2,flee,crit,def,mdef,hp)=>[...MEM_STATS.map(s=>[s+" +1",s1]),...MEM_STATS.map(s=>[s+" +2",s2]),["FLEE +3",flee],["CRIT +1",crit],
  ["DEF +15",def],["MDEF +2",mdef],...hp.map(([v,p])=>["MaxHP +"+v,p])];
const MEM_ENCHANT={
 subjugation:{low:memPool(10.52,0.09,6.03,6.03,5.17,5.17,[[50,6.18],[100,4.31],[200,3.45]]),
   garment:memPool(7.13,0.89,3.48,3.48,3.48,3.48,[[50,10.70],[100,8.91],[200,7.58],[300,6.31],[400,4.46]]),
   shoes:memPool(7.58,3.57,4.90,4.90,4.90,4.90,[[50,4.90],[100,3.50],[200,2.60],[300,1.70],[400,0.80]]),
   armor:[...memPool(6.75,0.81,6.54,6.54,6.54,6.54,[[50,4.88],[100,4.07],[200,3.25],[300,2.44],[400,1.66]]),["essence",12.18]]},
 expedition:{low:memPool(6.00,5.00,5.00,5.00,5.00,5.00,[[50,6.00],[100,5.00],[200,3.00]]),
   garment:memPool(7.13,0.89,3.48,3.48,3.48,3.48,[[50,10.70],[100,8.91],[200,7.58],[300,6.31],[400,4.46]]),
   shoes:memPool(7.58,3.57,4.90,4.90,4.90,4.90,[[50,4.90],[100,3.50],[200,2.60],[300,1.70],[400,0.80]]),
   armor:[...memPool(5.25,4.90,4.28,4.28,4.28,4.28,[[50,5.25],[100,5.25],[200,5.25],[300,3.50],[400,0.805]]),["essence",1.925]]}};
// the Vegetable Enhancer's one enchant on the Poring Village Leek or Carrot you're wearing (Global's Navigation has the NPC; the cost
// and lines are RagnaDex's, which gives no chances): VEGGIE_ENCHANT: gear [[id, name]], cost (zeny, [[id, name, how many]]), lines
const VEGGIE_ENCHANT={gear:[[19238,"Poring Village Leek"],[19239,"Poring Village Carrot"]],zeny:20000,mats:[[909,"Jellopy",50]],ok:70,
  lines:[...MEM_STATS.map(s=>s+" +1"),"MaxSP +10","MaxSP +25","MaxSP +50","MaxHP +100","MaxHP +200"]};
// the Job Essences on +9 armor (names and effects in data/essences.js), % each by essence level: Subjugation Team armor rolls a 1st
// job's Lv 1; Expedition armor rolls a 2nd job's. What the essences here don't add up to in MEM_ENCHANT is the Ninja's, which the client doesn't have
const MEM_ESSENCE={subjugation:{tier:1,lv:{1:2.03}},expedition:{tier:2,lv:{1:0.05,2:0.025}}};
// every NPC the tab's memorials, Jellostones, upgrades, crafts and enchants need, for the NPCs card: [name, where ("map x y", or a
// list when there are several), what they do]
const MEM_NPCS=[
["Emily","prt_fild05 145 235","lets you into Poring Village (base Lv 30)"],
["Calm Scientist","gef_fild10 231 203","lets you into Orc's Memory (base Lv 59)"],
["Underground Management Director","prt_fild05 265 208","lets you into Prontera Culvert (base Lv 59)"],
["Memory Labyrinth Association Member","prt_fild06 37 197","lets you into Ant Hell (base Lv 70)"],
["Memory Craftsman's Workshop","prontera 48 227","makes a Jellostone from 5 of its Jello Fragment, after a 3-day wait (one at a time)"],
["Stone Transmuter","prt_in 118 28","turns a Jellostone you have spare into another with a Zelstar (KP shop)"],
["Equipment Enhancer","prt_in 118 34","makes an Expedition piece from a Subjugation Team piece, 50 Faintly Glowing Crystal and Jellostones"],
["Enchant Association staff","prt_in 135 35","enchants Subjugation Team armor, garments and shoes (card slot 4)"],
["Enchant Association staff","prt_in 135 28","enchants Expedition armor, garments and shoes (card slot 4)"],
["Vegetable Enhancer","prt_fild05 174 238","enchants the Poring Village Leek or Carrot you're wearing (one line) for 50 Jellopy and 20,000 zeny: 70% success, a failure breaks it"],
["Thor's Flame",["prt_in 64 68","alberta_in 18 58","morocc_in 74 35","payon 143 169","geffen_in 102 176","aldeba_in 33 50"],"turns 10 Mithril Ore into a Mithril"],
["Mysterious Artisan","morocc_in 76 167","makes the Oath rings and the earrings from 15 of their gem and 10 Mithril, in a week or at once for 10 more Mithril"]];
