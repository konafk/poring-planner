// The NPC crafts in the in-game Tip Box's Item Creation guides (the client's System\tipbox_enUS.lub, tips 7032-7035),
// written by tools/export_tipbox.py. TIPBOX_RECIPES: rows like data/recipes.js's NPC ones (cat, type npc, id, n, lv null,
// mats [[item id, amount]], fee in zeny, npc [name, map x,y]), quest: true when the NPC's quest unlocks them.
// TIPBOX_FORGING: the Blacksmith's weapon crafting and ranking guides (tips 9069, 9082, 9083): anvils (one must be in the
// inventory) and hammers (one is used up) as [[item id, or null when the client has no such item, the guide's name]], command
// (the ranking), ranks [[who, what their crafted weapons come with]] and points [[ranking points, for what]]
const TIPBOX_RECIPES=[
{"cat":"Dye Making","type":"npc","id":975,"n":1,"lv":null,"mats":[[507,30],[973,1],[713,1]],"fee":3000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":976,"n":1,"lv":null,"mats":[[508,30],[973,1],[713,1]],"fee":3000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":978,"n":1,"lv":null,"mats":[[510,20],[973,1],[713,1]],"fee":3500,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":979,"n":1,"lv":null,"mats":[[510,5],[511,20],[508,20],[973,1],[974,1],[713,1]],"fee":5000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":980,"n":1,"lv":null,"mats":[[507,20],[508,20],[973,1],[974,1],[713,1]],"fee":5000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":981,"n":1,"lv":null,"mats":[[507,30],[510,10],[973,1],[974,1],[713,1]],"fee":5000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":982,"n":1,"lv":null,"mats":[[509,30],[973,1],[713,1]],"fee":3000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Dye Making","type":"npc","id":983,"n":1,"lv":null,"mats":[[507,30],[508,30],[511,30],[510,5],[973,1],[974,1],[713,1]],"fee":7000,"npc":["Java Dury Han","morocc_in 146,99"]},
{"cat":"Potions","type":"npc","id":501,"n":1,"lv":null,"mats":[[507,2],[713,1]],"fee":3,"npc":["Old Pharmacist","alberta_in 16,28"]},
{"cat":"Potions","type":"npc","id":502,"n":1,"lv":null,"mats":[[507,1],[508,1],[713,1]],"fee":5,"npc":["Old Pharmacist","alberta_in 16,28"]},
{"cat":"Potions","type":"npc","id":503,"n":1,"lv":null,"mats":[[508,2],[713,1]],"fee":10,"npc":["Old Pharmacist","alberta_in 16,28"]},
{"cat":"Potions","type":"npc","id":504,"n":1,"lv":null,"mats":[[509,2],[713,1]],"fee":20,"npc":["Old Pharmacist","alberta_in 16,28"]},
{"cat":"Potions","type":"npc","id":505,"n":1,"lv":null,"mats":[[510,2],[713,1]],"fee":30,"npc":["Old Pharmacist","alberta_in 16,28"]},
{"cat":"Potions","type":"npc","id":506,"n":1,"lv":null,"mats":[[511,2],[713,1]],"fee":3,"npc":["Old Pharmacist","alberta_in 16,28"]},
{"cat":"Mixture & Counteragent","type":"npc","id":973,"n":1,"lv":null,"mats":[[970,1],[971,1],[713,1]],"fee":3000,"npc":["Luitz","alberta_in 133,55"],"quest":true},
{"cat":"Mixture & Counteragent","type":"npc","id":974,"n":1,"lv":null,"mats":[[970,1],[972,1],[713,1]],"fee":4000,"npc":["Luitz","alberta_in 133,55"],"quest":true},
{"cat":"Fruit Juice","type":"npc","id":531,"n":1,"lv":null,"mats":[[512,1],[713,1]],"fee":3,"npc":["Marienne","prt_in 49,172"],"quest":true},
{"cat":"Fruit Juice","type":"npc","id":532,"n":1,"lv":null,"mats":[[513,1],[713,1]],"fee":3,"npc":["Marienne","prt_in 49,172"],"quest":true},
{"cat":"Fruit Juice","type":"npc","id":534,"n":1,"lv":null,"mats":[[515,1],[713,1]],"fee":3,"npc":["Marienne","prt_in 49,172"],"quest":true},
{"cat":"Fruit Juice","type":"npc","id":533,"n":1,"lv":null,"mats":[[514,1],[713,1]],"fee":3,"npc":["Marienne","prt_in 49,172"],"quest":true}];
const TIPBOX_FORGING={"anvils":[[986,"Normal Anvil"],[987,"Oridecon Anvil"],[988,"Golden Anvil"],[null,"Emperium Anvil"]],"hammers":[[613,"Steel Hammer"],[614,"Golden Hammer"],[615,"Oridecon Hammer"]],"command":"/blacksmith","ranks":[["Rank 1–5","4 random options granted to crafted level 3–4 weapons"],["Rank 6–10","4 random options granted to crafted level 3–4 weapons"],["Unranked","3 random options on level 3–4 weapons"]],"points":[[1,"Refine a self-crafted level 1 weapon to +10"],[10,"Successfully craft a level 3 weapon using 3 additional materials"],[25,"Refine a self-crafted level 2 weapon to +10"],[1000,"Refine a self-crafted level 3 weapon to +10"]]};
