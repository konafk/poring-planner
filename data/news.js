// What's new tab: each game update's highlights, newest first, read from the installed Global client after its patch (data.grf's spawn
// and NPC tables, System\iteminfo_enUS.lub) and from its maintenance notice. The floors' monsters and counts aren't written here: the tab
// draws them from data/spawn.js, so they stay what the planner uses.
// NEWS: {when (YYYY-MM-DD), name (the ROADMAP update it is), intro, floors: [[map, tag]] top to bottom (ground: the town between),
//   bosses: [name, level, map, card id], gear: [item id or null, name, what it does], events: [name, "new" | "ended", text], town: [text]}
const NEWS=[
{when:"2026-10-29",name:"Clock Tower",
 intro:"The Al De Baran Clock Tower is open: four floors above the town and four basement floors below it, with a field boss on each basement floor. A Gatchaman collaboration and the Anomalous Rift emergency event start too.",
 floors:[["c_tower4","4F"],["tow_d03","3F"],["tow_d02","2F"],["tow_d01","1F"],{ground:"aldebaran"},["alde_dun01","B1F"],["alde_dun02","B2F"],["alde_dun03","B3F"],["alde_dun04","B4F"]],
 floorNote:"Counts per channel from the game client; the PvP channels have the same counts here, not 1.5×. Elites (Solid, Furious, Ringleader, Elusive) and the 13 Knight Porings on every floor aren't in the planner.",
 bosses:[["Sieglouse",102,"alde_dun01",27274],["Orc General",96,"alde_dun02",27273],["Jeniffer",100,"alde_dun03",27272],["Erzsebet",101,"alde_dun04",27271],["Extra Joker",105,"alde_dun04",27270]],
 bossNote:"Their HP and EXP aren't in the client, so the planner doesn't have them yet. Extra Joker spawns twice on B4F.",
 gear:[[null,"Clock Tower Gear","Upgrades Clock Tower Manager Headphones, Pocket Watch Ornament, Clock Casket and Black Witch Hat, keeping the refine level and cards."],
  [null,"General's Cape","Garment, Lv 60. MHP +200, MSP +20; +100 MHP and +10 MSP every 2 refines. At +7 and again at +9: variable cast −5%, after-attack delay −5%."],
  [null,"Hunter's Cape","Garment, Lv 60. ATK +10, HIT +10; +1 ATK and +1 HIT per refine above +5. At +7 and again at +9: after-attack delay −5%."],
  [null,"Rotating Gear","Garment, Lv 60. FLEE +10; +1 FLEE per refine above +5. At +7 and again at +9: variable cast −5%."],
  [19333,"Clock Tower Manager Headphones","Middle headgear, Lv 60. M.ATK +20; with Tower Keeper Card, variable cast −15%."],
  [19357,"Clock Casket","Upper headgear, Lv 60. ATK +20; +1% physical damage to every race per 2 refines; HIT +15 at +7, MHP +250 at +9."]],
 events:[["Gatchaman collaboration","new","Ken, Joe, Jun, Jinpei and Ryu take on Berg Katse and the Galactor in Morroc; Joe also turns up on Kokomo Beach, Sograt Desert, Pyramid 2F and Sphinx B3F. Three event garment cards (Gatchaman, Galactor Army, Bird Missile) give +15% EXP from monsters, +7% drop rate and +10% damage to every race and size while the event runs."],
  ["[Emergency] Anomalous Rift","new","Rifts open in Morroc, with investigators, a receptionist and a technician; guides stand in Prontera and Payon."],
  ["Clock Tower quests","new","A Clock Tower daily quest and the event quest Curse of the Clock Tower (from the maintenance notice)."],
  ["Prontera's last event","ended","Kumamon, Shepherd Girl Yen, Priest Raymond and the sheep have left Prontera, and Apep is gone from Morroc Ruins."]],
 town:["Al De Baran has Clock Tower Clerk Molden, a Hat Maker and a Tower Keeper.","Magic Circles and Gatekeepers move you between floors; B3F's Gatekeeper takes you down to B4F.","Each basement floor has a Monster Scholar: Zeke, Dun, Jenny, and Page and Yeon on B4F.","The War of Emperium schedule for EU changes (maintenance notice)."]},
];
