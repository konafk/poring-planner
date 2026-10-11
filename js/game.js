// ---- merge the per-monster tables from data/*.js into MOBS ----
MOBS.forEach(m=>{const e=ELEM[m.id];if(e){m.el=e[0];m.elv=e[1];m.hit100=e[2];m.flee95=e[3]}
  const st=MSTAT[m.id];if(st){m.def=st[0];m.mdef=st[1];m.atkMin=st[2];m.atkMax=st[3];m.vit=st[4];m.int=st[5];m.agg=!!st[6];m.luk=st[7]||0}
  const lt=LOOT[m.id];if(lt){m.loot=lt[0];m.priced=lt[1];m.dropsN=lt[2];m.drops=lt[3]}else m.drops=[];
  const sz=SIZES[m.id];if(sz){m.size=sz[0];m.race=RACES[sz[1]]}});

// ---- element table: defender element -> element level 1-4 -> attacker element (rozerodb.com/guides/elements-sizes) ----
const AE=["Neutral","Water","Earth","Fire","Wind","Poison","Holy","Shadow","Ghost","Undead"];
const ET0={
Neutral:["100,100,100,100,100,100,100,100,90,100","100,100,100,100,100,100,100,100,70,100","100,100,100,100,100,100,100,100,50,100","100,100,100,100,100,100,100,100,0,100"],
Water:["100,25,100,90,150,150,100,100,100,100","100,0,100,80,175,150,100,100,100,100","100,0,100,70,200,125,100,100,100,100","100,0,100,60,200,125,100,100,100,100"],
Earth:["100,100,25,150,90,150,100,100,100,100","100,100,0,175,80,150,100,100,100,100","100,100,0,200,70,125,100,100,100,100","100,100,0,200,60,125,100,100,100,100"],
Fire:["100,150,90,25,100,150,100,100,100,90","100,175,80,0,100,150,100,100,100,80","100,200,70,0,100,125,100,100,100,70","100,200,60,0,100,125,100,100,100,60"],
Wind:["100,90,150,100,25,150,100,100,100,100","100,80,175,100,0,150,100,100,100,100","100,70,200,100,0,125,100,100,100,100","100,60,200,100,0,125,100,100,100,100"],
Poison:["100,150,150,150,150,0,75,75,75,75","100,150,150,150,150,0,75,75,75,50","100,125,125,125,125,0,50,50,50,25","100,125,125,125,125,0,50,50,50,0"],
Holy:["100,100,100,100,100,75,0,125,90,125","100,100,100,100,100,75,0,150,80,150","100,100,100,100,100,50,0,175,70,175","100,100,100,100,100,50,0,200,60,200"],
Shadow:["100,100,100,100,100,75,125,0,90,0","100,100,100,100,100,75,150,0,80,0","100,100,100,100,100,50,175,0,70,0","100,100,100,100,100,50,200,0,60,0"],
Ghost:["90,100,100,100,100,75,100,100,125,100","70,100,100,100,100,75,100,100,150,125","50,100,100,100,100,50,100,100,175,150","0,100,100,100,100,50,100,100,200,175"],
Undead:["100,100,100,125,100,75,125,0,100,0","100,100,100,150,100,50,150,0,125,0","100,100,100,175,100,25,175,0,150,0","100,100,100,200,100,0,200,0,175,0"]};
const ET={};Object.entries(ET0).forEach(([d,rows])=>ET[d]=rows.map(r=>r.split(",").map(Number)));
const elemMult=(m,atkEl)=>{const r=ET[m.el||"Neutral"];if(!r)return 100;const row=r[Math.min(4,Math.max(1,m.elv||1))-1];const i=AE.indexOf(atkEl);return i<0?100:row[i]};

// ---- weapons: size modifier S/M/L ----
// weapon size modifiers from the official guide: roz.mygnjoy.com/en/intro/guide/12 (applies to basic attacks and physical skills, not magic)
const WEAPONS={"Bare hands":[100,100,100],"Dagger":[100,75,50],"One-handed sword":[75,100,75],"Two-handed sword":[75,75,100],"One-handed spear":[75,75,100],"Two-handed spear":[75,75,100],"One-handed axe":[50,75,100],"Two-handed axe":[50,75,100],"One-handed mace":[75,100,100],"Two-handed mace":[75,100,100],"One-handed staff":[100,100,100],"Two-handed staff":[100,100,100],"Bow":[100,100,75],"Katar":[75,100,75],"Knuckle":[100,100,75],"Musical instrument":[75,100,75],"Whip":[75,100,75],"Book":[100,100,50]};
const WREN={"Bare hand":"Bare hands","Spear":"Two-handed spear","Axe":"Two-handed axe","Mace":"One-handed mace","Staff / Rod":"One-handed staff","Instrument":"Musical instrument"};
const sizeMod=(m,w)=>{const t=WEAPONS[w]||WEAPONS[WREN[w]]||WEAPONS["Bare hands"];return t[{S:0,M:1,L:2}[m.size]??1]};

// ---- jobs and attack presets: max-level values from rozerodb.com/tools/skill-tree (Ragnarok Zero) ----
// type: phys / magic / auto · pct per hit · hits per use · el ("W" = weapon/arrow element) · cast = rozerodb base cast (lower it for your DEX/gear) · delay = cooldown · sp · targets
// what each use costs (catalysts from rAthena's renewal skill_db; prices and weights in data/consumables.js, see useItems in model.js):
// consumes: [{item, qty}] by item name · arrows: arrows per use with a bow, instrument or whip (basic attacks always fire one) · zeny: zeny per use (Mammonite, scaled to the learned level)
// wgt: Axe Boomerang adds the weapon's weight to its % · wpct: {weapon type: extra %} · mvit: + N × the monster's VIT % (Acid Bomb)
// shw: shield skills (Shield Boomerang, Rapid Smiting / Shield Chain) add the shield's weight + 4 × its refine to their % (Landgris: 80×SLV+SHW+SRL*4, 600+400×SLV+SHW+SRL*4)
const A=(name,type,pct,hits,el,cast,delay,sp,targets,note,extra)=>({name,type,pct,hits,el,cast,delay,sp,targets,note:note||"",...(extra||{})});
const BASIC=A("Basic attack","auto",100,1,"W",0,0,0,1);
// Cast (fixed / variable), cooldown and after-cast delay (the gcd slot) come from the in-game skill table in data/skills.js
// (roz.prontera.info, verified for Zero); Plagiarism copies follow their source. The Monk combo has no row and keeps Landgris' numbers.
// Zero skill data from Landgris ROCalculator (skills_zero.json + Zero Global overrides): base-level scaling (blv) and stat add-ons
// (sadd: [stat, % per point]); ratios cross-checked with rozerodb.
// blv: × base level / 100, but only above Lv100, so it never lowers a skill. blvBug: Soul Destroyer, Axe Tornado and Triangle Shot miss
// that check in Zero (and on Global) and take × base level / 100 at every level (forum.gamer.com.tw/C.php?bsn=83142&snA=3087)
const Z=(fct,vct,cd,gcd,more)=>({fct,vct,cd,gcd,...(more||{})});
const A2=(name,type,pct,hits,el,sp,targets,note,z)=>A(name,type,pct,hits,el,Math.round(((z.fct||0)+(z.vct||0))*100)/100,Math.max(z.cd||0,z.gcd||0),sp,targets,note,z);
const SWORD=[A2("Bash Lv10","phys",400,1,"W",15,1,"",Z(0,0,0,0)),A2("Magnum Break Lv10","phys",300,1,"Fire",30,3,"5x5 around you",Z(0,0,2,0))];
const BOLT3=[A2("Fire Bolt Lv10","magic",100,10,"Fire",30,1,"",Z(1.2,3.2,0.7,0.3,{sadd:[["int",0.5]]})),A2("Cold Bolt Lv10","magic",100,10,"Water",30,1,"",Z(1.2,3.2,0.7,0.3,{sadd:[["int",0.5]]})),A2("Lightning Bolt Lv10","magic",100,10,"Wind",30,1,"",Z(1.2,3.2,0.7,0.3,{sadd:[["int",0.5]]}))];
const MAGE=[...BOLT3,A2("Earth Spike Lv5","magic",200,5,"Earth",30,1,"",Z(0.28,1.12,0.7,0.3,{sadd:[["int",1]]})),A2("Soul Strike Lv10","magic",100,5,"Ghost",38,1,"+50% vs Undead element not included",Z(0.05,0.2,0.7,0.3)),
 A2("Fire Ball Lv10","magic",340,1,"Fire",25,3,"340% centre, 255% around it",Z(0.1,0.4,0.35,0.3)),A2("Frost Driver Lv10","magic",200,1,"Water",16,1,"",Z(0.08,0.32,0.25,0.3)),
 A2("Napalm Beat Lv10","magic",170,1,"Ghost",18,1,"Damage is split when it hits several monsters",Z(0.05,0.2,0.25,0.3)),A2("Thunder Storm Lv10","magic",100,10,"Wind",74,3,"5x5 area",Z(0.8,3.2,1,0.3,{sadd:[["int",1]]}))];
const ARCH=[A2("Double Strafe Lv10","phys",190,2,"W",12,1,"1 arrow per use",Z(0,0,0,0.1,{arrows:1})),A2("Arrow Shower Lv10","phys",250,1,"W",15,3,"3x3 area, 1 arrow per use",Z(0,0,0,0.1,{arrows:1}))];
const ACO=[A2("Holy Light","magic",125,1,"Holy",15,1,"",Z(0.1,0.4,0,0))];
const MERC=[A2("Mammonite Lv10","phys",600,1,"W",5,1,"Costs 1,000 z per use (taken off zeny/hr)",Z(0,0,0,0,{zeny:1000})),A2("Cart Revolution","phys",150,1,"W",12,3,"Quest skill; +100% per 8,000 cart weight (set Cart weight)",Z(0,0,0,0,{cart:100}))];
const THIEF=[A("Basic attack (Double Attack Lv10)","auto",100,1.5,"W",0,0,0,1,"Dagger: about half your hits strike twice"),A2("Envenom Lv10","phys",100,1,"Poison",12,1,"Plus a flat +150 damage, not included",Z(0,0,0,0)),A2("Sand Attack","phys",130,1,"Earth",9,1,"",Z(0,0,0,0))];
const JOBS={
 "Novice":{w:"Dagger",p:[BASIC]},
 "Swordsman":{w:"One-handed sword",p:[...SWORD,BASIC]},"Mage":{w:"One-handed staff",p:[...MAGE.filter(p=>!p.name.startsWith("Earth Spike")),BASIC]},"Archer":{w:"Bow",p:[...ARCH,BASIC]},
 "Acolyte":{w:"One-handed mace",p:[...ACO,BASIC]},"Merchant":{w:"One-handed axe",p:[...MERC,BASIC]},"Thief":{w:"Dagger",p:[...THIEF]},
 "Knight":{w:"Two-handed spear",p:[A2("Bowling Bash Lv10","phys",500,3,"W",38,2,"Hits 3–5 times (more with a two-handed sword); +STR% per hit",Z(0.4,1.6,4,0.3,{sadd:[["str",1]]})),
   A2("Brandish Spear Lv10","phys",1400,1,"W",24,3,"Spear, mounted only. +5×STR%",Z(0.4,1.6,4,0.3,{sadd:[["str",5]]})),A2("Pierce Lv10","phys",200,3,"W",10,1,"Spear only. Hits 2/3/4 times on small/medium/large; +2×STR%",Z(0,0,0,0,{sizeHits:[2,3,4],sadd:[["str",2]]})),
   A2("Spear Stab Lv10","phys",300,1,"W",9,2,"Spear only. Hits everything in a line",Z(0,0,0,0)),A2("Spear Boomerang Lv5","phys",350,1,"W",10,1,"Spear only. Range 11",Z(0,0,0.5,0.3)),
   A2("Clashing Spiral Lv5","phys",400,5,"W",30,1,"5 hits, scales with base level and weapon weight",Z(0.11,0.44,0.5,0.3,{blv:true})),A2("Traumatic Blow Lv5","phys",300,1,"W",23,1,"",Z(0,0,0,0.3)),A2("Vital Strike Lv10","phys",150,1,"W",20,1,"Spear only",Z(0,0,0.4,0.3)),...SWORD,BASIC]},
 "Crusader":{w:"One-handed sword",p:[A2("Holy Cross Lv10","phys",450,1,"Holy",20,1,"+2×VIT%",Z(0,0,0,0,{sadd:[["vit",2]]})),A2("Holy Cross Lv10 (spear)","phys",900,1,"Holy",20,1,"Spear: (450 + 5×VIT)% × 2",Z(0,0,0,0,{sadd:[["vit",10]]})),
   A2("Grand Cross Lv10","phys",500,3,"Holy",100,3,"Uses ATK and MATK, costs 20% of your HP. Modelled on ATK",Z(0.25,1,0.5,0.3)),A2("Shield Boomerang Lv5","phys",400,1,"Neutral",12,1,"+ shield weight + 4 × shield refine %",Z(0,0,0.35,0.3,{shw:true})),
   A2("Smite Lv5","phys",200,1,"W",10,1,"Shield only",Z(0,0,0,0)),A2("Rapid Smiting Lv5","phys",2600,1,"W",40,1,"Shield only, + shield weight + 4 × shield refine %",Z(0.2,0.8,0.5,0.3,{shw:true})),A2("Cannon Spear Lv5","phys",600,1,"W",28,3,"Spear only. (120 + STR)% × 5, × base level / 100 above Lv100",Z(0.1,0.4,0,1,{blv:true,sadd:[["str",5]]})),
   A2("Gloria Domini Lv5","magic",1450,1,"Holy",50,1,"",Z(0.2,0.8,0,0.3)),...SWORD,BASIC]},
 "Wizard":{w:"One-handed staff",p:[A2("Jupitel Thunder Lv10","magic",100,12,"Wind",47,1,"",Z(0.56,2.24,0,0)),A2("Heaven's Drive Lv5","magic",200,5,"Earth",44,3,"5x5 area, +INT%",Z(0.4,1.6,0.5,0.3,{sadd:[["int",1]]})),
   A2("Napalm Vulcan Lv5","magic",350,5,"Ghost",70,2,"3x3 area, scales with base level",Z(0.1,0.4,0.3,0.5,{blv:true})),A2("Storm Gust Lv10","magic",570,3,"Water",78,5,"(570 + INT)% per hit, up to 10 hits but monsters freeze after ~3",Z(1.2,4.8,2.5,0.3,{sadd:[["int",1]]})),
   A2("Lord of Vermilion Lv10","magic",1400,1,"Wind",96,5,"13x13 area, +INT%",Z(0.84,3.36,1.5,0.3,{sadd:[["int",1]]})),A2("Meteor Storm Lv10","magic",625,1,"Fire",64,4,"(125 + INT)% × 5 per meteor, 7 meteors over 13x13",Z(1.2,4.8,2.5,0.3,{sadd:[["int",5]]})),
   A2("Gravitational Field Lv5","magic",500,10,"Neutral",100,4,"5x5 area, scales with base level",Z(1,4,4.5,0.3,{blv:true})),A2("Sightrasher Lv10","magic",300,1,"Fire",53,3,"Needs Sight",Z(0.04,0.16,1,0.3)),...MAGE,BASIC]},
 "Sage":{w:"Book",p:[A("Spell Fist (full Sage model)","spellfist",0,1,"Fire",0,0,0,1,"Spell Fist procs with the best of your ticked bolts, plus the Sage options below"),A2("Heaven's Drive Lv5","magic",200,5,"Earth",44,3,"5x5 area, +INT%",Z(0.4,1.6,0.5,0.3,{sadd:[["int",1]]})),...MAGE,BASIC]},
 "Hunter":{w:"Bow",p:[A2("Focused Arrow Strike Lv5","phys",1800,1,"W",24,2,"5x5 around the target, scales with base level. 1 arrow per use",Z(0.2,0.8,1.2,0.3,{blv:true,arrows:1})),...ARCH,BASIC]},
 "Bard":{w:"Musical instrument",p:[A2("Arrow Vulcan Lv10","phys",3000,1,"W",30,1,"Instrument only, scales with base level. 1 arrow per use",Z(0.38,1.52,1.5,0.3,{blv:true,arrows:1})),A2("Melody Strike Lv5","phys",300,2,"W",15,1,"Instrument only. +INT% per hit. 1 arrow per use",Z(0,0,0,0.3,{sadd:[["int",1]],arrows:1})),...ARCH,BASIC]},
 "Dancer":{w:"Whip",p:[A2("Arrow Vulcan Lv10","phys",3000,1,"W",30,1,"Whip only, scales with base level. 1 arrow per use",Z(0.38,1.52,1.5,0.3,{blv:true,arrows:1})),A2("Slinging Arrow Lv5","phys",300,2,"W",15,1,"Whip only. +INT% per hit. 1 arrow per use",Z(0,0,0,0.3,{sadd:[["int",1]],arrows:1})),...ARCH,BASIC]},
 "Priest":{w:"One-handed mace",p:[A2("Magnus Exorcismus Lv10","magic",100,10,"Holy",58,4,"Costs a Blue Gemstone. 130% vs Demon, Undead and Shadow",Z(0.5,2,3,0.3,{consumes:[{item:"Blue Gemstone",qty:1}]})),...ACO,BASIC]},
 "Monk":{w:"Knuckle",p:[A2("Throw Spirit Sphere Lv5","phys",1600,1,"W",28,1,"Uses 1 spirit sphere",Z(0,1,0.3,0.3)),A2("Occult Impaction Lv5","phys",500,1,"W",20,1,"Uses 1 spirit sphere. More vs high DEF",Z(0.2,0.8,0,0.3)),
   A2("Excruciating Palm","phys",800,1,"W",40,1,"Costs 200 HP",Z(0,0,1,0.3)),A2("Combo: Quadruple Blow + Raging Thrust","phys",2100,1,"W",16,1,"After a Triple Attack proc; Thrust uses a sphere. Quadruple Blow 500% (1000% with a knuckle) + Thrust (1600 + 5×STR)%",Z(0,0,0,0,{sadd:[["str",5]],wpct:{Knuckle:500}})),...ACO,BASIC]},
 "Blacksmith":{w:"Two-handed axe",p:[A2("Power Swing Lv10","phys",1300,1,"W",19,1,"+STR% +DEX%",Z(0,0,0,0.2,{sadd:[["str",1],["dex",1]]})),A2("Axe Tornado Lv5","phys",4300,1,"W",45,3,"Axe only. 7x7 around you. (4300 + 10×VIT)% × base level / 100 (Zero bug: applies below Lv100 too)",Z(0,0,2,0.3,{blv:true,blvBug:true,sadd:[["vit",10]]})),
   A2("Axe Boomerang Lv5","phys",500,1,"W",14,1,"(500 + axe weight)%, × base level / 100 above Lv100",Z(0,0,0.6,0,{blv:true,wgt:true})),...MERC,BASIC]},
 "Alchemist":{w:"Two-handed axe",p:[A2("Acid Terror Lv5","phys",1000,1,"W",15,1,"Costs an Acid Bottle",Z(0.2,0.8,0,0.3,{consumes:[{item:"Acid Bottle",qty:1}]})),A2("Acid Bomb Lv10","phys",4000,1,"W",50,1,"Costs an Acid Bottle and a Bottle Grenade. (4000 + 2×INT + 10 × monster VIT)%, × base level / 100 above Lv100",Z(0.2,0.8,0.5,0.3,{blv:true,sadd:[["int",2]],mvit:10,consumes:[{item:"Acid Bottle",qty:1},{item:"Bottle Grenade",qty:1}]})),...MERC,BASIC]},
 "Assassin":{w:"Katar",p:[A2("Sonic Blow Lv10","phys",1100,1,"W",28,1,"Katar only. +50% below half HP. (100 + 100 × level)% on Zero Global",Z(0,0,1,0)),A2("Meteor Assault Lv10","phys",1400,1,"W",40,3,"5x5 around you. (1400 + 5×AGI)%, × base level / 100 above Lv100",Z(0,0,0.7,0.3,{blv:true,sadd:[["agi",5]]})),
   A2("Soul Destroyer Lv10","phys",1500,1,"W",60,1,"(1500 + STR + INT)% × base level / 100 (Zero bug: applies below Lv100 too)",Z(0.1,0.4,0.5,0.3,{blv:true,blvBug:true,sadd:[["str",1],["int",1]]})),A2("Venom Splasher Lv10","phys",1400,1,"W",30,2,"Explodes after 2s, 5x5",Z(0.2,0.8,1,0)),
   A2("Grimtooth Lv5","phys",300,1,"W",8,2,"Katar, from Hiding. (300 + AGI)%",Z(0,0,0,0,{sadd:[["agi",1]]})),
   // TODO: Venom Knife uses up a Venom Knife (ammo); its item id and NPC price aren't in data/consumables.js yet, so it costs nothing here
   A2("Venom Knife","phys",500,1,"W",35,1,"Costs a Venom Knife (not counted)",Z(0,0,0,0)),A("Basic attack (katar)","auto",100,1.2,"W",0,0,0,1,"Katar extra hit averaged in"),...THIEF,
   // appended so saved preset indexes stay put: dual wield with a one-handed sword or axe in the right hand (no Double Attack)
   A("Basic attack","auto",100,1,"W",0,0,0,1,"No Double Attack: for a one-handed sword or axe in the right hand")]},
 "Rogue":{w:"Dagger",p:[A2("Back Stab Lv10","phys",700,2,"W",12,1,"Hits twice with a dagger, half damage with a bow",Z(0,0,0.7,0.3)),A2("Triangle Shot Lv10","phys",2300,1,"W",20,1,"Bow, costs 3 arrows. (2300 + 3×AGI)% × base level / 100 (Zero bug: applies below Lv100 too)",Z(0.2,0.8,0,0.2,{blv:true,blvBug:true,sadd:[["agi",3]],arrows:3})),
   A2("Sightless Mind Lv5","phys",850,1,"W",15,3,"From Hiding, 7x7. +3×AGI% +DEX/2%",Z(0,0,0,0,{sadd:[["agi",3],["dex",0.5]]})),A2("Double Strafe Lv10","phys",190,2,"W",12,1,"Bow, 1 arrow per use",Z(0,0,0,0.1,{arrows:1})),...THIEF]}
};
// support skills cast between attacks that use up an item (not damage presets: trap damage is DEX/INT-based and isn't modelled). You type
// how many you cast per kill; each cast costs items [name, qty] (rAthena renewal skill_db). Their cast time isn't counted.
// TODO: pre-renewal rAthena has Blast Mine and Freezing Trap at 1 Trap; Zero's number isn't confirmed. Quagmire uses no item in either.
// Stone Curse is the Mage skill, so Wizards and Sages have it too
const SUPPORT=[{key:"ankle-snare",sk:"anklesnare",name:"Ankle Snare",jobs:["Hunter"],items:[["Trap",1]]},{key:"land-mine",name:"Land Mine",jobs:["Hunter"],items:[["Trap",1]]},
  {key:"blast-mine",name:"Blast Mine",jobs:["Hunter"],items:[["Trap",2]]},{key:"claymore-trap",name:"Claymore Trap",jobs:["Hunter"],items:[["Trap",2]]},
  {key:"freezing-trap",name:"Freezing Trap",jobs:["Hunter"],items:[["Trap",2]]},{key:"skid-trap",name:"Skid Trap",jobs:["Hunter"],items:[["Trap",1]]},
  {key:"stone-curse",name:"Stone Curse",jobs:["Mage","Wizard","Sage"],items:[["Red Gemstone",1]]},
  {key:"bomb",name:"Bomb (Demonstration)",jobs:["Alchemist"],items:[["Bottle Grenade",1]]}];
// Sage ground buffs (switched on in the Skills card): one item per cast, recast every 60 s × level (rAthena Duration1)
// TODO: renewal rAthena uses a Blue Gemstone, pre-renewal a Yellow Gemstone (same NPC price); Zero's isn't confirmed
const FIELD_ITEM={volcano:"Blue Gemstone",deluge:"Blue Gemstone",whirlwind:"Blue Gemstone"};
// Rogue Plagiarism: one copied skill at Lv10, appended so saved preset indexes stay put. Only skills with no weapon a Rogue can't hold
// (no katar/spear/instrument/whip/axe/shield); magic copies use your MATK
(function plagiarism(){const all=Object.values(JOBS).flatMap(j=>j.p);const fix={"Bowling Bash Lv10":"Hits 3–5 times; +STR% per hit"};
  ["Bowling Bash Lv10","Bash Lv10","Magnum Break Lv10","Holy Cross Lv10","Mammonite Lv10","Arrow Shower Lv10","Holy Light",
   "Fire Bolt Lv10","Cold Bolt Lv10","Lightning Bolt Lv10","Earth Spike Lv5","Soul Strike Lv10","Fire Ball Lv10","Frost Driver Lv10","Napalm Beat Lv10","Thunder Storm Lv10",
   "Jupitel Thunder Lv10","Heaven's Drive Lv5","Storm Gust Lv10","Lord of Vermilion Lv10","Meteor Storm Lv10"].forEach(n=>{const s=all.find(x=>x.name===n);
    if(s)JOBS.Rogue.p.push({...s,name:"Copied: "+s.name,note:"Plagiarism copy"+((fix[n]??s.note)?". "+(fix[n]??s.note):"")})});
  // Auto Shadow Spell Lv10 (needs Plagiarism 10): basic attacks have a 30% chance to auto-cast the copied magic skill at up to Lv7, MATK +50.
  // Lv7 ratios from Landgris skills_zero.json; single-target skills only. Auto-casts are modelled as free (no SP)
  const ss=(n,el,pct,hits,sadd,note)=>JOBS.Rogue.p.push(A("Shadow Spell: "+n,"auto",100,1.5,"W",0,0,0,1,
    `Basic attacks (Double Attack averaged in), 30% per attack to auto-cast ${n}: ${pct}%${sadd?" + "+sadd.map(([k,f])=>(f===1?"":f===0.5?"½":f+"×")+k.toUpperCase()).join(" + ")+"%":""} × ${hits} ${el}, MATK +50${note?". "+note:""}`,{ss:{el,pct,hits,sadd:sadd||[]}}));
  const INT2=[["int",0.5]];
  ss("Fire Bolt Lv7","Fire",100,7,INT2);ss("Cold Bolt Lv7","Water",100,7,INT2);ss("Lightning Bolt Lv7","Wind",100,7,INT2);
  ss("Jupitel Thunder Lv7","Wind",100,9);ss("Fire Ball Lv7","Fire",280,1,null,"Splash on nearby monsters not counted");ss("Frost Driver Lv7","Water",170,1);
  ss("Soul Strike Lv7","Ghost",100,4,null,"+35% vs Undead element not included");ss("Napalm Beat Lv7","Ghost",140,1);ss("Earth Spike Lv5","Earth",200,5,[["int",1]],"Max level is 5")})();
// Shadow Spell auto-cast damage per proc (0 when the attack has none)
const SS_CHANCE=0.3,SS_MATK=50;
const ssDmg=m=>{const s=C().a.ss;if(!s)return 0;let p=num(s.pct);s.sadd.forEach(([k,f])=>{const v=statVal(C(),k);if(v!=null)p+=v*f});return magicDmg(m,p,s.el,SS_MATK)*s.hits};
// auto-cast spells from a card, weapon or scroll (any job, Mages too): each basic attack that connects has a chance % to cast the spell
// for free at its level, as MATK damage. Ratios as the Mage presets and Shadow Spell above: [element, max Lv, % per hit, hits, INT% per hit]
const AC_SPELLS={"Fire Bolt":["Fire",10,()=>100,lv=>lv,0.5],"Cold Bolt":["Water",10,()=>100,lv=>lv,0.5],"Lightning Bolt":["Wind",10,()=>100,lv=>lv,0.5],
 "Earth Spike":["Earth",5,()=>200,lv=>lv,1],"Soul Strike":["Ghost",10,()=>100,lv=>Math.ceil(lv/2),0],"Napalm Beat":["Ghost",10,lv=>70+10*lv,()=>1,0],
 "Fire Ball":["Fire",10,lv=>140+20*lv,()=>1,0],"Frost Driver":["Water",10,lv=>100+10*lv,()=>1,0],"Jupitel Thunder":["Wind",10,()=>100,lv=>lv+2,0]};
const AC_D={on:false,spell:"Fire Bolt",lv:3,pct:5};
const AC=()=>{const c=C();if(!c.ac||typeof c.ac!=="object")c.ac={};for(const k in AC_D)if(c.ac[k]==null)c.ac[k]=AC_D[k];if(!AC_SPELLS[c.ac.spell])c.ac.spell=AC_D.spell;return c.ac};
// cards any job can slot (they used to sit in Sage options): Vitata (Heal Lv1, SP cost +25%), Hunter Fly (HP back on physical
// attacks), Side Winder (Double Attack on basic attacks), Creamy (Teleport Lv1, so the Zeny Hunter may teleport), and SP back: Dracula (SP on attacks),
// Dark Priest (Sage: 1 SP per physical hit) and the +5 SP per kill cards (killSp: the races, see KILL_SP); Phen and Bloody Butterfly
// (casts can't be interrupted, variable cast +25% / +30%)
const CARD_D={vitata:false,spBonus:25,healSp:13,healHp:357,hfOn:false,hfPct:5,hfHp:100,hfN:1,daSF:false,daPct:7,creamy:false,
  dracOn:false,dracPct:10,dracSp:20,dracN:1,dpOn:false,killSp:[],phen:false,bbfly:false};
const CRD=()=>{const c=C();if(!c.cards||typeof c.cards!=="object")c.cards={};for(const k in CARD_D)if(c.cards[k]==null)c.cards[k]=JSON.parse(JSON.stringify(CARD_D[k]));
  if(!Array.isArray(c.cards.killSp))c.cards.killSp=[];return c.cards};
// weapon cards: "Recovers 5 SP when defeating <race> monsters with melee physical attacks"
const KILL_SP={Fish:"Beetle King",Plant:"Caterpillar",Dragon:"Driller",Brute:"Nereid","Demi-Human":"Phendark",Formless:"Tri-Joint",Undead:"Zombie Master"};
// Energy Coat: the Mage quest skill, so Wizards and Sages have it too (it used to sit in Sage options). spPct: where your SP sits
// when SP items top it up, which sets the damage cut
const EC_JOBS=["Mage","Wizard","Sage"];
const EC_D={on:false,spPct:50};
const ECO=()=>{const c=C();if(!c.ec||typeof c.ec!=="object")c.ec={};for(const k in EC_D)if(c.ec[k]==null)c.ec[k]=EC_D[k];return c.ec};
const ecOn=()=>EC_JOBS.includes(state.job)&&!!ECO().on;
const acSpell=()=>{const a=AC(),[el,max,pct,hits,int]=AC_SPELLS[a.spell],lv=Math.min(max,Math.max(1,Math.round(num(a.lv,1))));return {el,lv,pct:pct(lv)+(statVal(C(),"int")||0)*int,hits:hits(lv)}};
// auto-cast damage per proc (0 when it's off or the attack isn't basic attacks)
const acDmg=m=>{if(!AC().on||C().a.type!=="auto")return 0;const s=acSpell();return withEl(s.el,()=>magicDmg(m,s.pct,s.el))*s.hits};
const acChance=()=>Math.min(100,Math.max(0,num(AC().pct)))/100;
const MAGIC_JOBS=["Mage","Wizard","Sage"];
const charDefault=job=>{const J=JOBS[job]||JOBS.Novice;const mag=J.p[0].type==="magic";
  const c={baseLv:60,atkTxt:mag?"60+50":"120+200",matkTxt:mag?"100+200":"40+30",hitTxt:"300",fleeTxt:"250",aspd:170,defTxt:"40+60",maxHp:6000,maxSp:600,intTxt:mag?"60+10":"10",spRegen:0,weapon:J.w,wElem:"Neutral",
    preset:0,a:{...J.p[0]},dmgBonus:0,eq:[],
    nameType:MAGIC_JOBS.includes(job)?"magic":"phys", // name bonus defaults to the job's damage type
    autoSp:false,itemSp:37,itemPrice:200,itemHp:175,itemHpPrice:180,potOn:false,potType:"",potPrice:2200,potMin:30,mobInterval:1.5,hitScale:0.3,hpRegen6:0,curW:0,maxW:0,sellAt:70,townMin:3};
  if(job==="Sage")Object.assign(c,{matkTxt:"100+200",intTxt:"40+10",maxSp:800,maxHp:4000,sage:{hsAuto:true,hsWorth:50000,hsLv:10},cards:{vitata:true},ec:{on:true}});
  return c};

