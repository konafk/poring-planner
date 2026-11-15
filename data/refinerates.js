// Refining at a Blacksmith, +1 to +10 (Ragnarok Zero Global's official game guide, roz.mygnjoy.com/en/intro/guide/20, as rozerodb.com and
// roz.prontera.info copy it; the two agree on every rate). REFINE_RATES[gear][ore]: the success % of the try that takes it to +1 … +10.
// n: the normal ore, e: the Enriched ore (higher rates). The HD ore (h) uses the normal ore's rate: the guide gives it none of its own.
const REFINE_RATES={
  armor:     {n:[90,90,90,80,60,40,40,20,20, 9],e:[100,100,100,100,90,70,70,40,40,20]},
  weapon_lv1:{n:[90,90,90,90,90,90,80,60,40,19],e:[100,100,100,100,100,100,100,90,70,30]},
  weapon_lv2:{n:[90,90,90,90,90,80,60,40,20,19],e:[100,100,100,100,100,100,90,70,40,30]},
  weapon_lv3:{n:[90,90,90,90,80,60,50,20,20,19],e:[100,100,100,100,100,90,80,40,40,30]},
  weapon_lv4:{n:[90,90,90,80,60,40,40,20,20, 9],e:[100,100,100,100,90,70,70,40,40,20]}};
// The ores, per gear: [item id (null: no single item in the client, only boxes of it), name, the Blacksmith's fee a try, NPC price or null].
// A failed try with the normal or Enriched ore destroys the gear, its cards and the ore. The HD ore works from +7 (the tries to +8,
// +9 and +10) on armor and level 3–4 weapons, and a failure takes 1 off the refine instead (the client's item text: "failure will not
// destroy the Weapon, and the current refine level becomes -1. This ore cannot refine beyond +10")
const REFINE_ORE={
  armor:     {n:[985,"Elunium",10000,null],e:[7619,"Enriched Elunium",10000,null],h:[null,"HD Elunium",20000,null]},
  weapon_lv1:{n:[1010,"Phracon",1000,200],e:[7620,"Enriched Oridecon",10000,null]},
  weapon_lv2:{n:[1011,"Emveretarcon",2000,1000],e:[7620,"Enriched Oridecon",10000,null]},
  weapon_lv3:{n:[984,"Oridecon",10000,null],e:[7620,"Enriched Oridecon",10000,null],h:[null,"HD Oridecon",20000,null]},
  weapon_lv4:{n:[984,"Oridecon",10000,null],e:[7620,"Enriched Oridecon",10000,null],h:[null,"HD Oridecon",20000,null]}};
const REFINE_HD_FROM=7;
