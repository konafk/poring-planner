// Ragnarok Zero Global release roadmap: the official one (mygnjoy.com/en/event/roadmap), as rozerodb.com/guides/roadmap-update and
// jpgames.de's copy of it list it. ROADMAP: one update each, in order: when (YYYY-MM, or YYYY-MM-DD once the day is announced), name,
// cap (the base / job level cap it raises to), add (what it brings), and regions: the maps it opens, as {id, name, pre: map code prefixes in
// data/spawn.js}. A region opens by itself once its update's day has come, or the month after its update's month when the day isn't known;
// mark it open or closed yourself on the Monsters & maps tab's Roadmap.
const ROADMAP=[
{when:"2026-08",name:"Global launch",cap:{base:50},add:["1st classes","Episode 1-1: the royal investigation with Sigrun"]},
{when:"2026-09",name:"2nd classes & Episode 1-2",cap:{base:60,job:60},add:["2nd job change","Episode 1-2: the missing mage, the abductions and the Comodo plague","Memorial dungeons: Prontera Culvert, Orc's Memory","War of Emperium"]},
{when:"2026-10",name:"Clock Tower",cap:{base:70,job:70},add:["Dungeons: Clock Tower (Al De Baran), Prontera Labyrinth, Sphinx, Mjolnir Dead Pit","Star (Ashura) weapons, first wave"],
 regions:[{id:"ct",name:"Clock Tower",pre:["c_tower","tow_d","alde_dun"]},{id:"lb",name:"Prontera Labyrinth",pre:["maz_d","prt_maze"]},
  {id:"sp",name:"Sphinx",pre:["sp_d","in_sphinx"]},{id:"mj",name:"Mjolnir Dead Pit",pre:["mjo_d"]}]},
{when:"2026-11",name:"Ant Hell",cap:{base:80},add:["Memorial dungeon: Ant Hell (Mutant Maya)"]},
{when:"2026-12",name:"Glast Heim",add:["Glast Heim: the Monastery, Catacombs, caves, Underground Prison and Culvert"],
 regions:[{id:"gh",name:"Glast Heim",pre:["gl_","glast_"]}]},
{when:"2027-01",name:"Lutie",cap:{base:90},add:["Lutie and the Toy Factory","Memorial dungeon: Izlude"],
 regions:[{id:"lu",name:"Lutie",pre:["xma_"]}]},
{when:"2027-02",name:"Marriage",add:["Marriage system","Niflheim and Turtle Island"],
 regions:[{id:"nf",name:"Niflheim",pre:["nif_","niflheim"]},{id:"tu",name:"Turtle Island",pre:["tur_"]}]},
{when:"2027-03",name:"Gonryun",cap:{base:99},add:["Gonryun","Memorial dungeon: Sunken Ship"],
 regions:[{id:"go",name:"Gonryun",pre:["gon_"]}]},
{when:"2027-04",name:"Louyang & Ayothaya",add:["Louyang (royal tomb)","Ayothaya (ruins)"],
 regions:[{id:"lo",name:"Louyang",pre:["lou_"]},{id:"ay",name:"Ayothaya",pre:["ayo_"]}]},
{when:"2027-05",name:"Ninja",add:["Ninja class","Amatsu"],
 regions:[{id:"am",name:"Amatsu",pre:["ama_"]}]},
{when:"2027-06",name:"Juno",add:["Juno","Dungeon: Nogg Road"],
 regions:[{id:"ju",name:"Juno",pre:["yun_","mag_d"]}]},
{when:"2027-07",name:"Episode 1-3 Part 1",cap:{base:110},add:["Episode 1-3 Part 1: the story goes on in Comodo and Umbala","Memorial dungeon: Old Glast Heim"],
 regions:[{id:"um",name:"Umbala",pre:["um_"]}]}];
