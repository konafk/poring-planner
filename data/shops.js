// NPC shops on Zero Global, from in-game screenshots (shop window and Navigation, 2026-10-28): [name, [[map, x, y], ...] where it
// stands (x, y left out when not known), [[item id, price (zeny, before Discount)], ...]]. The Cooking Ingredient Trader's list may hold
// more than the screenshots showed. The Point Merchant's and Scroll Merchant's spots are from the client's Navigation (navi_npc.lub);
// their prices (the four element Points, Sage Endow catalysts, and the Empty Scroll elemental scrolls are made from) are as reported
// by a player
const NPC_SHOPS=[
["Cooking Ingredient Trader",[["prontera",156,212],["geffen",196,111],["payon",206,119],["alberta",167,135],["aldebaran",165,107],
  ["comodo",225,164],["umbala",102,154],["moc_ruins",115,123]],
  [[12849,40],[581,40],[7482,150],[580,150],[577,200],[7457,375],[7454,525],[7455,525],[7453,525],[7456,750],[7452,750],[579,700],
   [7286,15],[567,500],[12125,500],[12126,1000],[12127,2000],[7472,750],[7473,750],[7474,750],[7475,750],[7476,750]]],
["Point Merchant",[["iz_ac01",140,78]],[[6360,200],[6361,200],[6362,200],[6363,200]]],
["Scroll Merchant",[["iz_ac01",140,69]],[[7433,4000]]],
];
