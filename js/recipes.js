// ---- the Recipes tab: what each craft (forging, brewing, arrow crafting, cooking) uses up, from the exported recipe list, what the
// Alchemy Lab NPCs make for a fee (Mixture, Counteragent, Dyestuffs) from its Alchemy Lab guide (data/recipes.js), the NPC potions and
// fruit juices from the client's Tip Box (data/tipbox.js), and the memorial crafts (Jellostones, Expedition upgrades, Mithril and the
// Oath accessories).
// Search also matches the materials, so a drop finds what it turns into. Every item opens its details (js/info.js), which list the
// recipes that make it and the ones that use it. The Memorial category comes from data/memorial.js: 5 Jello Fragments into their
// Jellostone at the Memory Craftsman's Workshop, the Upgrader's Expedition pieces from a Subjugation Team piece, Faintly Glowing
// Crystals and Jellostones, and Mithril and the Oath rings and earrings from the hard mode boxes' Mithril Ore and gems ----
const MEMORIAL_RECIPES=typeof JELLO==="undefined"?[]:[
  ...JELLO.map(j=>({cat:"Memorial",type:"npc",id:j.stone[0],n:1,lv:null,mats:[[j.frag[0],JELLO_PER_STONE]],npc:JELLO_NPC})),
  ...EXPEDITION.map(x=>({cat:"Memorial",type:"npc",id:x.id,n:1,lv:null,
    mats:[[x.from[0],1],[EXPEDITION_CRYSTALS[0],EXPEDITION_CRYSTALS[2]],...Object.entries(x.stones).map(([id,k])=>[+id,k])],npc:EXPEDITION_NPC})),
  ...MEM_CRAFTS.map(x=>({cat:"Memorial",type:"npc",id:x.id,n:1,lv:null,mats:x.mats.map(([id,,k])=>[id,k]),npc:x.npc}))];
// Cooking from the client's cookbooks (data/cookbooks.js: every dish Lv 1–10, lv the cookbook's level) in place of the community
// database's, which lacks Fried Sweet Potato and Lv 6–10 and has Honey Herbal Tea at 10 Honey (the book: 2)
const COOKBOOK_RECIPES=typeof COOKBOOKS==="undefined"?[]:Object.entries(COOKBOOKS).flatMap(([b,ds])=>ds.map(([id,mats])=>({cat:"Cooking",type:"cook",id,n:1,lv:b-7471,mats,book:+b})));
// The Tip Box's Item Creation guides (data/tipbox.js) for the NPC crafts the database lacks: the Old Pharmacist's potions and
// Marienne's fruit juices. Its dyes and Mixture & Counteragent are the database's too, with the same materials and fees
const TIPBOX_ONLY=typeof TIPBOX_RECIPES==="undefined"?[]:TIPBOX_RECIPES.filter(r=>typeof RECIPES==="undefined"||!RECIPES.some(x=>x.cat===r.cat));
// The headgear NPCs craft, from the client's NPC dialogue, Tip Box and quest log (data/client.js recipes): Februs at Atelier Manus, the
// Hat Maker, and the hat quests around the towns
const CLIENT_RECIPES=typeof CLIENT!=="undefined"&&CLIENT.recipes||[];
// a database recipe the client has as an NPC's (the same item from the same materials: Oridecon from 5 Rough Oridecon) shows once, as the NPC's
const sameRecipe=(a,b)=>a.id===b.id&&JSON.stringify(a.mats)===JSON.stringify(b.mats);
const RECIPE_LIST=[...(typeof RECIPES!=="undefined"?RECIPES:[]).filter(r=>(!COOKBOOK_RECIPES.length||r.cat!=="Cooking")&&!CLIENT_RECIPES.some(c=>sameRecipe(c,r))),...COOKBOOK_RECIPES,...TIPBOX_ONLY,...MEMORIAL_RECIPES,...CLIENT_RECIPES];
const RECIPE_CATS=["Forging","Brewing","Arrows","Cooking","Misc","Mixture & Counteragent","Dye Making","Potions","Fruit Juice","Headgear","Memorial"];
// by item id: the recipes that make it, and the ones it's a material of
const RECIPES_MAKING={},RECIPES_USING={};
RECIPE_LIST.forEach(r=>{(RECIPES_MAKING[r.id]=RECIPES_MAKING[r.id]||[]).push(r);
  r.mats.forEach(([id])=>{const l=RECIPES_USING[id]=RECIPES_USING[id]||[];if(!l.includes(r))l.push(r)})});
// what one material is worth to you: your Market price, else what an NPC pays; null when neither is known
const matPrice=id=>state.prices[id]>0?state.prices[id]:NPCSELL[id]!=null||state.npcPrices[id]!=null?npcPays(id):null;
// a recipe's materials' worth plus an NPC's fee: {z, unknown (how many materials have no price)}; none: nothing in it has a price
const recipeWorth=r=>r.mats.reduce((a,[id,n])=>{const p=matPrice(id);if(p==null)a.unknown++;else a.z+=p*n;return a},{z:r.fee||0,unknown:0});
// the NPC shops that sell it (data/shops.js): [[shop name, [[map, x, y], ...], price], ...], and the cheapest one's price
const SHOPS_OF={};(typeof NPC_SHOPS!=="undefined"?NPC_SHOPS:[]).forEach(([name,at,items])=>items.forEach(([id,z])=>(SHOPS_OF[id]=SHOPS_OF[id]||[]).push([name,at,z])));
const shopPrice=id=>SHOPS_OF[id]?Math.min(...SHOPS_OF[id].map(s=>s[2])):null;
// what a material costs you to get: your Market price, else an NPC shop's, else what an NPC pays (the simulators' cost of a try)
const buyPrice=id=>state.prices[id]>0?state.prices[id]:shopPrice(id)??matPrice(id);
const worthNone=(r,w)=>w.unknown===r.mats.length&&!r.fee;
// "(quest)" when the NPC's quest unlocks it, "(quest, Lv 40+)" when the quest has a level
const recipeQuest=r=>r.swap?` (${r.swap})`:r.quest?` (quest${r.qlv?`, Lv ${r.qlv}+`:""})`:"";
// who makes it, for the recipes an NPC makes: "JavaDullihan · morocc_in 146,99", "Marienne (quest) · prt_in 49,172" when her quest unlocks them,
// then who the quest starts with when that's someone else
// the skill that makes it, for what a player crafts with a skill rather than at an NPC: Arrows (Arrow Crafting), Brewing (Prepare
// Potion), a forged weapon (the Blacksmith's Smith skill for its type), Iron, Steel and the four elemental stones (the Blacksmith's
// Tempering and Enchanted Stone Craft), the four Elemental Converters, Holy Water, Poison Bottle. Shown with every job whose skill tree
// has it (data/skills.js): "Arrow Crafting skill · Archer, Hunter, Bard, Dancer". Oridecon and Star Crumb have no such skill: none
const RECIPE_SKILL={12114:"create-elemental-converter",12115:"create-elemental-converter",12116:"create-elemental-converter",
  12117:"create-elemental-converter",523:"aqua-benedicta",678:"create-deadly-poison",998:"iron-tempering",999:"steel-tempering",
  994:"enchanted-stone-craft",995:"enchanted-stone-craft",996:"enchanted-stone-craft",997:"enchanted-stone-craft"};
const SMITH_SKILL={dagger:"smith-dagger",sword_1h:"smith-sword",sword_2h:"smith-two-handed-sword",spear_1h:"smith-spear",spear_2h:"smith-spear",
  axe_1h:"smith-axe",axe_2h:"smith-axe",mace:"smith-mace",knuckle:"smith-knuckle"};
const recipeSkillOf=r=>{if(r.npc)return null;if(r.cat==="Arrows")return"arrow-crafting";if(r.cat==="Brewing")return"prepare-potion";
  if(r.type==="forge"){const e=typeof EQUIP!=="undefined"&&EQUIP.find(x=>x.id===r.id);return e&&SMITH_SKILL[e.type]||null}
  return RECIPE_SKILL[r.id]||null};
const SKILL_JOBS={};
const skillJobs=slug=>{if(SKILL_JOBS[slug])return SKILL_JOBS[slug];let name=slug;const jobs=[];
  for(const j in typeof SKILLS!=="undefined"?SKILLS:{})for(const t of SKILLS[j])for(const s of t.skills)if(s.slug===slug){name=s.name;if(!jobs.includes(j))jobs.push(j)}
  return SKILL_JOBS[slug]={name,jobs}};
// how a player makes it, when no NPC does: the skill and its jobs, or for a dish the cookbook it needs ("Uses Outdoor Cooking Kits")
const recipeSkill=r=>{if(r.book)return `Uses ${itemName(r.book)}`;const slug=recipeSkillOf(r);if(!slug)return"";const {name,jobs}=skillJobs(slug);return `${name} skill${jobs.length?` · ${jobs.join(", ")}`:""}`};
const recipeNpc=r=>r.npc?`${r.npc[0]}${recipeQuest(r)} · ${r.npc[1]}${r.start?` · starts with ${r.start[0]} · ${r.start[1]}`:""}`:"";
// a place as the game's Navigation command (/navi prontera 50/293): a click copies it, to paste in the game's chat
const recipeNaviAt=place=>{const at=String(place||"").replace(","," "),cmd=at?naviCmd(at):"";
  return cmd?` · <a href="#" class="navi mono" data-copynavi="${esc(cmd)}" title="Copy it, then paste it in the game's chat: the Navigation shows you the way">${esc(cmd)}</a>`:""};
// the same as HTML, each place as a link
const recipeNpcHtml=r=>r.npc?`${esc(r.npc[0])}${recipeQuest(r)}${recipeNaviAt(r.npc[1])}${r.start?`<br>starts with ${esc(r.start[0])}${recipeNaviAt(r.start[1])}`:""}`:"";
document.addEventListener("click",async e=>{const a=e.target.closest&&e.target.closest("[data-copynavi]");if(!a)return;e.preventDefault();const t=a.dataset.copynavi;
  try{await navigator.clipboard.writeText(t);showToast(`Copied ${t}: paste it in the game's chat.`)}
  // where the clipboard is refused: select it, try the older copy command, else leave it selected for Ctrl+C
  catch(err){const s=getSelection(),rg=document.createRange();rg.selectNodeContents(a);s.removeAllRanges();s.addRange(rg);
    let ok=false;try{ok=document.execCommand("copy")}catch(e2){}showToast(ok?`Copied ${t}: paste it in the game's chat.`:"Press Ctrl+C to copy it.")}});
const recipeMade=r=>`${itemName(r.id)}${r.n>1?` ×${fmtN(r.n)}`:""}`;
// "10 × Iron, 1 × Steel" with icons, each opening its details
const recipeMats=r=>r.mats.map(([id,n])=>`<span class="mat">${itemIcon(id,1,"il")}<span class="mono">${fmtN(n)}×</span> <a href="#" data-info="item:${id}">${esc(itemName(id))}</a></span>`).join("");
// the Forging category's notes, from the Tip Box's weapon crafting and Blacksmith ranking guides (data/tipbox.js TIPBOX_FORGING): the anvil
// to carry and the hammer each forge uses up (an item the client doesn't have, Emperium Anvil, as plain text; the guide's own name in the
// title where the item's is another: its Steel Hammer is the Iron Hammer), what a ranked or unranked Blacksmith's weapons come with,
// and the ranking points
const forgeTool=([id,name])=>id==null?`<span class="mat" title="The client has no item by this name yet">${esc(name)}</span>`
  :`<span class="mat"${itemName(id)!==name?` title="The guide calls it ${esc(name)}"`:""}>${itemIcon(id,1,"il")}<a href="#" data-info="item:${id}">${esc(itemName(id))}</a></span>`;
const orList=a=>a.length>1?`${a.slice(0,-1).join(", ")} or ${a[a.length-1]}`:a.join("");
function forgeNotesHtml(g){
  return `<p>Carry one anvil: ${orList(g.anvils.map(forgeTool))}. Each forge uses up one hammer: ${orList(g.hammers.map(forgeTool))}. The game then lists the weapons your materials can make.</p>
    <div class="forgeCols"><div><div class="affHead">Blacksmith ranking</div>
      <table class="affTable"><thead><tr><th>Blacksmith</th><th>Their crafted weapons</th></tr></thead><tbody>${g.ranks.map(([who,what])=>`<tr><td>${esc(who)}</td><td>${esc(what)}</td></tr>`).join("")}</tbody></table>
      <div class="note"><span class="mono">${esc(g.command)}</span> in the game's chat shows the top 10. <a href="#" data-gotab="affix" data-goto="affixGearCard">The forged weapons' random options</a> are on the Affixes tab.</div></div>
    <div><div class="affHead">Ranking points</div>
      <table class="affTable"><thead><tr><th>Points</th><th>For</th></tr></thead><tbody>${g.points.map(([n,what])=>`<tr><td class="mono">${fmtN(n)}</td><td>${esc(what)}</td></tr>`).join("")}</tbody></table>
      <div class="note">The guide doesn't name the additional materials. ${itemIcon(1000,1,"il")}<a href="#" data-info="item:1000">${esc(itemName(1000))}</a>'s in-game text only says it makes a crafted weapon more durable; what extra materials add on Global hasn't been reported yet.</div></div></div>`}
const RECIPEDB_D={q:"",cat:""};
const recipeDbF=()=>({...RECIPEDB_D,...state.recipeDb});
TABLES.recipeTable={def:["name",1],cols:{name:{t:r=>recipeMade(r)},cat:{t:r=>r.cat},lv:{n:r=>r.lv},n:{n:r=>r.n},
  mats:{t:r=>r.mats.map(([id])=>itemName(id)).join(" ")},worth:{n:r=>{const w=recipeWorth(r);return worthNone(r,w)?null:w.z}}}};
function recipeOk(r,f){const q=String(f.q||"").trim().toLowerCase();if(f.cat&&r.cat!==f.cat)return false;
  return !q||itemName(r.id).toLowerCase().includes(q)||("#"+r.id).includes(q)||recipeNpc(r).toLowerCase().includes(q)||recipeSkill(r).toLowerCase().includes(q)||r.mats.some(([id])=>itemName(id).toLowerCase().includes(q)||("#"+id)===q)}
function renderRecipes(){const f=recipeDbF();
  ROOTQ("[data-rcf]").forEach(x=>{if(document.activeElement!==x)x.value=f[x.dataset.rcf]??""});
  // the category buttons, each with how many of its recipes the search leaves
  const byQ=RECIPE_LIST.filter(r=>recipeOk(r,{...f,cat:""}));
  $("recipeCats").innerHTML=[["","All"],...RECIPE_CATS.map(c=>[c,c])].map(([v,n])=>`<button type="button" role="radio" data-rcat="${esc(v)}" aria-checked="${f.cat===v}">${esc(n)} <span class="note">${byQ.filter(r=>!v||r.cat===v).length}</span></button>`).join("");
  const fg=$("recipeForge");if(fg&&typeof TIPBOX_FORGING!=="undefined"){fg.hidden=f.cat!=="Forging";if(!fg.hidden&&!fg.dataset.drawn){$("recipeForgeBody").innerHTML=forgeNotesHtml(TIPBOX_FORGING);fg.dataset.drawn="1"}}
  const rows=tableRows("recipeTable",byQ.filter(r=>recipeOk(r,f)));
  $("recipeCount").textContent=`${rows.length} of ${RECIPE_LIST.length} recipes`;
  $("recipeTable").tBodies[0].innerHTML=rows.map(r=>{const w=recipeWorth(r);
    return `<tr><td class="name"><div class="dbName">${itemIcon(r.id)}<div><a href="#" data-info="item:${r.id}">${esc(itemName(r.id))}</a>${r.n>1?` <b class="mono">×${fmtN(r.n)}</b>`:""} <span class="note">#${r.id}</span></div></div></td>
      <td class="name l">${esc(r.cat)}${r.npc?`<div class="note">${recipeNpcHtml(r)}</div>`:recipeSkill(r)?`<div class="note">${esc(recipeSkill(r))}</div>`:""}</td><td>${r.lv??"–"}</td><td class="name l mats">${recipeMats(r)}</td>
      <td title="${w.unknown?`${w.unknown} material${w.unknown>1?"s have":" has"} no price: set one on the Market tab`:""}">${worthNone(r,w)?"–":fmtN(w.z)+(w.unknown?"+?":"")}${r.fee?`<div class="note">incl. ${fmtN(r.fee)} z fee</div>`:""}${r.n>1&&!worthNone(r,w)?`<div class="note">${(w.z/r.n).toFixed(w.z/r.n>=10?0:1)} each</div>`:""}</td></tr>`}).join("")
    ||'<tr><td colspan="5" class="name muted">No recipes match.</td></tr>'}
(function setupRecipes(){if(!$("recipeTable"))return;
  ROOTQ("[data-rcf]").forEach(x=>x.addEventListener("input",()=>{state.recipeDb={...recipeDbF(),[x.dataset.rcf]:x.value};save();renderRecipes()}));
  $("recipeCats").addEventListener("click",e=>{const b=e.target.closest("[data-rcat]");if(!b)return;state.recipeDb={...recipeDbF(),cat:b.dataset.rcat};save();renderRecipes()});
  $("recipeReset").addEventListener("click",()=>{state.recipeDb={...RECIPEDB_D};delete state.tsort.recipeTable;save();renderRecipes()});
  $("recipeTable").tHead.addEventListener("click",e=>{const th=e.target.closest("th[data-sk]");if(!th)return;
    const k=th.dataset.sk,[k0,d0]=tblSort("recipeTable"),col=TABLES.recipeTable.cols[k];state.tsort.recipeTable=[k,k===k0?-d0:col.n&&!col.asc?-1:1];save();renderRecipes()});
})();
