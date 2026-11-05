// What the items that add random options (affixes) roll, from player reports: the client lists only the gear each item works on
// (CLIENT.upgrades, data/client.js), and the server decides the rolls. Kept by hand. item id -> {rolls: [[affix, min, max]],
// seen: affixes seen with no value reported yet}, or, when each use gives one affix from each of several lists, {slots: [{rolls,
// seen}, ...]} in the order they come. min null = only the most seen is known ("up to"). Add a line when a player reports one,
// and a min once someone sees the lowest.
const AFFIX_ITEMS={
  // Clock Tower Gear: MaxHP up to 500 is a guess from MHP +468 seen on the market
  108494:{rolls:[["STR",null,5],["AGI",null,5],["VIT",null,5],["INT",null,5],["DEX",null,5],["LUK",null,5],["ATK",null,20],["MATK",null,20],["HIT",null,20],["FLEE",null,20],
    ["MaxHP",null,500],["MaxSP",null,100]],seen:[]},
  // Nordfeld Helm Scroll: 2 affixes, MaxHP or MaxSP first, then a stat, ATK, MATK, HIT or FLEE
  107871:{slots:[
    {rolls:[["MaxHP",null,200],["MaxSP",null,100]],seen:[]},
    {rolls:[["STR",null,3],["AGI",null,3],["VIT",null,3],["INT",null,3],["DEX",null,3],["LUK",null,3],["ATK",null,20],["MATK",null,20],["HIT",null,20],["FLEE",null,20]],seen:[]}]},
};
