// Items that skills and attacks use up, by item id: [name, NPC buy price (zeny), weight as shown in game]. From rAthena's renewal item_db (Buy, Weight / 10),
// since rozerodb (where the other price tables come from) has no buy prices exported yet. TODO: check the prices against RO Zero's NPC shops
// (rozerodb /api/items/<id>: buy_price) — rAthena's prices don't always match Zero. The weights match data/weights.js where an item is in both.
// Each player can type their own price per item in the Character tab (saved per job), which replaces these.
const CONSUM={"715":["Yellow Gemstone",450,0.1],"716":["Red Gemstone",450,0.1],"717":["Blue Gemstone",450,0.1],"1065":["Trap",50,0.2],
"7135":["Bottle Grenade",200,1],"7136":["Acid Bottle",200,1],"1771":["Venom Knife",50,0.5],
"1750":["Arrow",1,0.1],"1751":["Silver Arrow",5,0.1],"1752":["Fire Arrow",5,0.1],"1754":["Crystal Arrow",5,0.1],"1755":["Arrow of Wind",5,0.1],
"1756":["Stone Arrow",5,0.1],"1757":["Immaterial Arrow",5,0.1],"1763":["Poison Arrow",10,0.1],"1767":["Arrow of Shadow",5,0.1]};
