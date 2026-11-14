// NPC shops on Zero Global, from in-game screenshots (shop window and Navigation, 2026-10-28): [name, [[map, x, y], ...] where it
// stands, [[item id, price (zeny, before Discount)], ...]]. The Cooking Ingredient Trader's list may hold more than the screenshots showed.
// The Tool Dealer's list is from the user's screenshots (14 November 2026, no Discount: its potions match data/recovery.js's npc prices),
// put on every Tool Dealer the client's navigation has, as the user said they all sell it.
// A shop that opens after a quest has its title last: Brewer Telsa sells Nordfeld Beer for 3,000z (the user, 14 November 2026) after
// Brewer Burkel's "Nordfeld: Special Beer!" ("Want to drink more special beer? I have some beer I set aside without Burkel knowing")
const NPC_SHOPS=[
["Cooking Ingredient Trader",[["prontera",156,212],["geffen",196,111],["payon",206,119],["alberta",167,135],["aldebaran",165,107],
  ["comodo",225,164],["umbala",102,154],["moc_ruins",115,123]],
  [[12849,40],[581,40],[7482,150],[580,150],[577,200],[7457,375],[7454,525],[7455,525],[7453,525],[7456,750],[7452,750],[579,700],
   [7286,15],[567,500],[12125,500],[12126,1000],[12127,2000],[7472,750],[7473,750],[7474,750],[7475,750],[7476,750]]],
["Tool Dealer",[["prt_mk",27,275],["prt_mk",53,23],["prt_mk",170,161],["prt_mk",272,299],["prt_mk",294,47],["morocc",146,103],
  ["morocc",151,241],["payon",159,96],["moc_ruins",91,128],["alb2trea",87,65],["prt_fild05",290,221],["cmd_fild07",257,126]],
  [[611,1],[601,250],[602,1000],[23626,150],[23627,1500],[713,50],[510,60],[717,450],[1771,50],[645,1200],[656,2200],[657,4500],
   [501,10],[502,50],[503,180],[504,1200],[506,40]]],
["Brewer Telsa",[["nordfeld",208,143]],[[107452,3000]],"Nordfeld: Special Beer!"],
];
