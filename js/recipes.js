// ---- the Recipes tab: what each craft (forging, brewing, arrow crafting, cooking) uses up, from rozerodb's Recipes page, and what the
// Alchemy Lab NPCs make for a fee (Mixture, Counteragent, Dyestuffs) from its Alchemy Lab guide (data/recipes.js).
// Search also matches the materials, so a drop finds what it turns into. Every item opens its details (js/info.js), which list the
// recipes that make it and the ones that use it ----
const RECIPE_LIST=typeof RECIPES!=="undefined"?RECIPES:[];
const RECIPE_CATS=["Forging","Brewing","Arrows","Cooking","Misc","Mixture & Counteragent","Dye Making"];
// by item id: the recipes that make it, and the ones it's a material of
const RECIPES_MAKING={},RECIPES_USING={};
RECIPE_LIST.forEach(r=>{(RECIPES_MAKING[r.id]=RECIPES_MAKING[r.id]||[]).push(r);
  r.mats.forEach(([id])=>{const l=RECIPES_USING[id]=RECIPES_USING[id]||[];if(!l.includes(r))l.push(r)})});
// what one material is worth to you: your Market price, else what an NPC pays; null when neither is known
const matPrice=id=>state.prices[id]>0?state.prices[id]:NPCSELL[id]!=null||state.npcPrices[id]!=null?npcPays(id):null;
// a recipe's materials' worth plus an NPC's fee: {z, unknown (how many materials have no price)}; none: nothing in it has a price
const recipeWorth=r=>r.mats.reduce((a,[id,n])=>{const p=matPrice(id);if(p==null)a.unknown++;else a.z+=p*n;return a},{z:r.fee||0,unknown:0});
const worthNone=(r,w)=>w.unknown===r.mats.length&&!r.fee;
// who makes it, for the recipes an NPC makes: "JavaDullihan · morocc_in 146,99"
const recipeNpc=r=>r.npc?`${r.npc[0]} · ${r.npc[1]}`:"";
const recipeMade=r=>`${itemName(r.id)}${r.n>1?` ×${fmtN(r.n)}`:""}`;
// "10 × Iron, 1 × Steel" with icons, each opening its details
const recipeMats=r=>r.mats.map(([id,n])=>`<span class="mat">${itemIcon(id,1,"il")}<span class="mono">${fmtN(n)}×</span> <a href="#" data-info="item:${id}">${esc(itemName(id))}</a></span>`).join("");
const RECIPEDB_D={q:"",cat:""};
const recipeDbF=()=>({...RECIPEDB_D,...state.recipeDb});
TABLES.recipeTable={def:["name",1],cols:{name:{t:r=>recipeMade(r)},cat:{t:r=>r.cat},lv:{n:r=>r.lv},n:{n:r=>r.n},
  mats:{t:r=>r.mats.map(([id])=>itemName(id)).join(" ")},worth:{n:r=>{const w=recipeWorth(r);return worthNone(r,w)?null:w.z}}}};
function recipeOk(r,f){const q=String(f.q||"").trim().toLowerCase();if(f.cat&&r.cat!==f.cat)return false;
  return !q||itemName(r.id).toLowerCase().includes(q)||("#"+r.id).includes(q)||recipeNpc(r).toLowerCase().includes(q)||r.mats.some(([id])=>itemName(id).toLowerCase().includes(q)||("#"+id)===q)}
function renderRecipes(){const f=recipeDbF();
  ROOTQ("[data-rcf]").forEach(x=>{if(document.activeElement!==x)x.value=f[x.dataset.rcf]??""});
  // the category buttons, each with how many of its recipes the search leaves
  const byQ=RECIPE_LIST.filter(r=>recipeOk(r,{...f,cat:""}));
  $("recipeCats").innerHTML=[["","All"],...RECIPE_CATS.map(c=>[c,c])].map(([v,n])=>`<button type="button" role="radio" data-rcat="${esc(v)}" aria-checked="${f.cat===v}">${esc(n)} <span class="note">${byQ.filter(r=>!v||r.cat===v).length}</span></button>`).join("");
  const rows=tableRows("recipeTable",byQ.filter(r=>recipeOk(r,f)));
  $("recipeCount").textContent=`${rows.length} of ${RECIPE_LIST.length} recipes`;
  $("recipeTable").tBodies[0].innerHTML=rows.map(r=>{const w=recipeWorth(r);
    return `<tr><td class="name"><div class="dbName">${itemIcon(r.id)}<div><a href="#" data-info="item:${r.id}">${esc(itemName(r.id))}</a>${r.n>1?` <b class="mono">×${fmtN(r.n)}</b>`:""} <span class="note">#${r.id}</span></div></div></td>
      <td class="name l">${esc(r.cat)}${r.npc?`<div class="note">${esc(recipeNpc(r))}</div>`:""}</td><td>${r.lv??"–"}</td><td class="name l mats">${recipeMats(r)}</td>
      <td title="${w.unknown?`${w.unknown} material${w.unknown>1?"s have":" has"} no price: set one on the Market tab`:""}">${worthNone(r,w)?"–":fmtN(w.z)+(w.unknown?"+?":"")}${r.fee?`<div class="note">incl. ${fmtN(r.fee)} z fee</div>`:""}${r.n>1&&!worthNone(r,w)?`<div class="note">${(w.z/r.n).toFixed(w.z/r.n>=10?0:1)} each</div>`:""}</td></tr>`}).join("")
    ||'<tr><td colspan="5" class="name muted">No recipes match.</td></tr>'}
(function setupRecipes(){if(!$("recipeTable"))return;
  ROOTQ("[data-rcf]").forEach(x=>x.addEventListener("input",()=>{state.recipeDb={...recipeDbF(),[x.dataset.rcf]:x.value};save();renderRecipes()}));
  $("recipeCats").addEventListener("click",e=>{const b=e.target.closest("[data-rcat]");if(!b)return;state.recipeDb={...recipeDbF(),cat:b.dataset.rcat};save();renderRecipes()});
  $("recipeReset").addEventListener("click",()=>{state.recipeDb={...RECIPEDB_D};delete state.tsort.recipeTable;save();renderRecipes()});
  $("recipeTable").tHead.addEventListener("click",e=>{const th=e.target.closest("th[data-sk]");if(!th)return;
    const k=th.dataset.sk,[k0,d0]=tblSort("recipeTable"),col=TABLES.recipeTable.cols[k];state.tsort.recipeTable=[k,k===k0?-d0:col.n&&!col.asc?-1:1];save();renderRecipes()});
})();
