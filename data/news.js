// What's new tab: each game update's highlights, newest first, read from the installed Global client after its patch (data.grf's spawn
// and NPC tables, System\iteminfo_enUS.lub) and from its maintenance notice. The floors' monsters and counts aren't written here: the tab
// draws them from data/spawn.js, so they stay what the planner uses.
// NEWS: {when (YYYY-MM-DD), name (the ROADMAP update it is), intro, floors: [[map, tag]] top to bottom (ground: the town between),
//   bosses: [name, level, map, card id], gear: [item id or null, name, what it does], collab: {name, intro, groups: [[group, [[name, text]]]]},
//   events: [name, "new" | "ended", text], town: [text]}
const NEWS=[
{when:"2026-10-29",name:"Clock Tower",
 intro:"The Al De Baran Clock Tower is open: four floors above the town and four basement floors below it, with a field boss on each basement floor. A Gatchaman collaboration and the Anomalous Rift emergency event start too.",
 floors:[["c_tower4","4F"],["tow_d03","3F"],["tow_d02","2F"],["tow_d01","1F"],{ground:"aldebaran"},["alde_dun01","B1F"],["alde_dun02","B2F"],["alde_dun03","B3F"],["alde_dun04","B4F"]],
 floorNote:"Counts per channel from the game client; the PvP channels have the same counts here, not 1.5×. Elites (Solid, Furious, Ringleader, Elusive) and the 13 Knight Porings on every floor aren't in the planner.",
 bosses:[["Sieglouse",102,"alde_dun01",27274],["Orc General",96,"alde_dun02",27273],["Jeniffer",100,"alde_dun03",27272],["Erzsebet",101,"alde_dun04",27271],["Extra Joker",105,"alde_dun04",27270]],
 bossNote:"Their HP and EXP aren't in the client, so the planner doesn't have them yet. Extra Joker spawns twice on B4F.",
 gear:[[108494,"Clock Tower Gear","Upgrades Clock Tower Manager Headphones, Pocket Watch Ornament, Clock Casket and Black Witch Hat, keeping the refine level and cards."],
  [480999,"General's Cape","Garment, Lv 60. MHP +200, MSP +20; +100 MHP and +10 MSP every 2 refines. At +7 and again at +9: variable cast −5%, after-attack delay −5%."],
  [481000,"Hunter's Cape","Garment, Lv 60. ATK +10, HIT +10; +1 ATK and +1 HIT per refine above +5. At +7 and again at +9: after-attack delay −5%."],
  [481001,"Rotating Gear","Garment, Lv 60. FLEE +10; +1 FLEE per refine above +5. At +7 and again at +9: variable cast −5%."],
  [19333,"Clock Tower Manager Headphones","Middle headgear, Lv 60. M.ATK +20; with Tower Keeper Card, variable cast −15%."],
  [19357,"Clock Casket","Upper headgear, Lv 60. ATK +20; +1% physical damage to every race per 2 refines; HIT +15 at +7, MHP +250 at +9."]],
 collab:{name:"Gatchaman collaboration",
  intro:"Ken, Joe, Jun, Jinpei and Ryu take on Berg Katse and the Galactor in Morroc; Joe also turns up on Kokomo Beach, Sograt Desert, Pyramid 2F and Sphinx B3F. Galactor's monsters, Galaring and Squid Bomb, roam the fields around Morroc. Every item below is from the client's item text; the event-limited bonuses go when the event ends.",
  groups:[["Event cards · garment",[["Gatchaman Card","ATK +7, DEF +3, MDEF +1 for every 10 base levels, up to Lv 50."],["Galactor Army Card","MATK +7, DEF +3, MDEF +1 for every 10 base levels, up to Lv 50."],["Bird Missile Card","MHP +70, DEF +3, MDEF +1 for every 10 base levels, up to Lv 50."],["All three, during the event","+10% physical and magical damage to every race and size (not players), +15% EXP from monsters, +7% item drop rate."]]],
   ["Costume headgear · upper/middle",[["G-1 Ken, the Eagle · G-2 Joe, the Condor · G-3 Jun, the Swan · G-4 Jinpei, the Swallow · G-5 Ryu, the Owl","The five team helmets. During the event: EXP from monsters +5%, item drop rate +5%."],["Galactor's Leader","Berg Katse's helmet. During the event: EXP +5%, drop rate +5%."]]],
   ["Costume headgear · lower and upper",[["Gatchaman! Move Out! · Farewell Gatchaman! · Doctor's Urgent Transmission","Lower costumes. During the event: EXP +5%."],["Honorary Gatchaman","Upper costume hairpin for helping the team get back to Earth. During the event: EXP +5%."],["Operation Firebird Footprints (Garment)","Enchants a costume garment's 4th slot with the Firebird footprints, at Gruzio Gurmani in the item mall."]]],
   ["Cash shop packages",[["Gatchaman Collaboration Package I","Selection Scroll I: one of the five team helmets."],["Gatchaman Collaboration Package II","Selection Scroll II: Galactor's Leader, Gatchaman! Move Out!, Farewell Gatchaman!, Doctor's Urgent Transmission or Operation Firebird Footprints."]]],
   ["Quests and quest items",[["Visitors from Another World","The story quest in Morroc: follow the Galactor to a hidden rift, then help build the Mid Missile so the team can go home. Part of it runs inside a memorial dungeon."],["Daily quests","Launch! Mid Missile! (10 Mid Powder), All right! I'll smash them all. (10 Galaring), Galactor's monster won't make it back to base. (10 Squid Bomb), and Prepare Yourself, Berg Katse! (smash the rift again)."],["Mid Powder · Mid Missile Button","Mid Powder drops from Galaring and Squid Bomb and goes into the Mid Missile; the button goes to Condor Joe. Both disappear when the event ends."]]]]},
 events:[["Gatchaman collaboration","new","Running in Morroc and the fields around it; its items are listed in their own card."],
  ["[Emergency] Anomalous Rift","new","Rifts open in Morroc, with investigators, a receptionist and a technician; guides stand in Prontera and Payon."],
  ["Clock Tower quests","new","A Clock Tower daily quest and the event quest Curse of the Clock Tower (from the maintenance notice)."],
  ["Prontera's last event","ended","Kumamon, Shepherd Girl Yen, Priest Raymond and the sheep have left Prontera, and Apep is gone from Morroc Ruins."]],
 town:["Al De Baran has Clock Tower Clerk Molden, a Hat Maker and a Tower Keeper.","Magic Circles and Gatekeepers move you between floors; B3F's Gatekeeper takes you down to B4F.","Each basement floor has a Monster Scholar: Zeke, Dun, Jenny, and Page and Yeon on B4F.","The War of Emperium schedule for EU changes (maintenance notice)."]},
];
