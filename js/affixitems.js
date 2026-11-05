// ---- Affixes tab: the items that add random options (affixes) to gear, the gear each one works on (the client's list,
// CLIENT.upgrades) and what they roll (players' reports, data/affixitems.js). Static: drawn once, the first time the tab opens ----
const affixRange=(lo,hi)=>lo==null?`up to +${hi}`:lo===hi?`+${lo}`:`+${lo}–${hi}`;
// the item's in-game text without the gear it lists (shown below it, as "[Target Items]" or "★ Chain" lines) or its weight
const affixItemText=id=>{const t=(CLIENT.items[id]||[])[2]||(typeof ITEM_TEXT!=="undefined"&&ITEM_TEXT[id])||"";
  return t.split(/\n\[Target Items?\]/)[0].split("\n").filter(l=>l&&!/^★|^Weight\s*:/.test(l))};
// gear names: the equipment data's (★ weapons) before the item lists'
const affixName=id=>(BUILD.item(id)||{}).name||itemName(id);
const ORDINAL=["1st","2nd","3rd","4th","5th"];
// a list's rows: the reported values, then the lines seen with no value
const affixRows=l=>[...l.rolls.map(([a,lo,hi])=>`<tr><td>${esc(a)}</td><td class="mono">${affixRange(lo,hi)}</td></tr>`),
  ...l.seen.map(a=>`<tr><td>${esc(a)}</td><td class="muted">seen, value not reported yet</td></tr>`)].join("");
function affixItemBlock(id,targets){const rep=AFFIX_ITEMS[id];
  const gear=[...new Set(targets)].map(g=>`<li class="dbName">${itemIcon(g)}${infoLink("item",g,affixName(g))}</li>`).join("");
  // one affix from each list: a heading row over each list's rows
  const rows=!rep?"":rep.slots?rep.slots.map((l,i)=>`<tr class="wayRow"><td colspan="2">${ORDINAL[i]} affix: one of these</td></tr>${affixRows(l)}`).join(""):affixRows(rep);
  const count=rep&&rep.slots?`<div class="note">Each use gives <b>${rep.slots.length} affixes</b>, one from each list.</div>`:"";
  return `<div class="affItem"><div class="bar"><div class="dbName grow">${itemIcon(id)}<h3>${infoLink("item",id,affixName(id))}</h3></div>${rep?`<span class="pill" title="Players' reports: the game client doesn't say what it rolls">player reports</span>`:""}</div>
    ${affixItemText(id).map(l=>`<div class="note">${esc(l)}</div>`).join("")}
    <div class="affCols"><div><div class="affHead">Works on</div><ul class="affGear">${gear}</ul></div>
    ${rep?`<div><div class="affHead">Affixes it can add</div>${count}<div class="scroll"><table class="affTable"><thead><tr><th>Affix</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
      :`<div><div class="affHead">Affixes it can add</div><div class="note">None reported yet.</div></div>`}</div></div>`}
// ---- gear that drops with affixes: the pool a piece rolls from (data/affixes.js, the community database's Affixes Simulator) ----
// Weapon series: bows, instruments and whips are ranged, staves magic, the rest (books too: not checked) melee
const AFF_SERIES=t=>/^(bow|instrument|whip|gun)/.test(t)?"Ranged Series":/^staff/.test(t)?"Magic Series":"Melee Series";
const AFF_SLOT={armor:"Armor",garment:"Garment",footgear:"Shoes"};
const AFF_POOL={monsterDrop:"Monster drops",mvp:"MVP drops",blacksmith:"Forged weapons"};
const AFF_TYPE={"Melee Series":"melee weapons","Ranged Series":"ranged weapons","Magic Series":"staves","Forging Weapons":"weapons a Blacksmith forges",Armor:"armor",Garment:"garments",Shoes:"shoes"};
// [pool, gear type] for a piece of gear, or null: a weapon a Blacksmith forges the forging pool; a weapon an MVP drops the MVP pool;
// any other weapon, armor, garment or shoes a monster drops the monster drop pool. Headgear, shields and accessories have none
function gearAffixPool(it){if(!it||typeof AFFIXES==="undefined")return null;const s=(it.slot||[])[0];
  if(s==="weapon"&&(RECIPES_MAKING[it.id]||[]).some(r=>r.cat==="Forging"))return ["blacksmith","Forging Weapons"];
  const d=itemInfo(it.id).d||[];if(!d.length&&!(ITEM_DROPS[it.id]||[]).length)return null;
  if(s==="weapon")return [d.some(r=>r[3]==="mvp")?"mvp":"monsterDrop",AFF_SERIES(it.type||"")];
  return AFF_SLOT[s]?["monsterDrop",AFF_SLOT[s]]:null}
// a pool's lists, one per affix it can have, in order
const affixLists=(pool,type)=>{const l={};AFFIXES.rows.filter(r=>r[0]===pool&&r[1]===type).forEach(r=>(l[r[2]]=l[r[2]]||[]).push(r));
  return Object.keys(l).sort((a,b)=>a-b).map(k=>l[k])};
const affixPoolRows=(pool,type)=>affixLists(pool,type).map((l,i)=>`<tr class="wayRow"><td colspan="2">${ORDINAL[i]} affix: one of these</td></tr>`
  +l.map(r=>`<tr><td>${esc(r[3].replace(/ \(%\)$/,""))}</td><td class="mono">+${r[4]===r[5]?r[4]:`${r[4]}–${r[5]}`}${r[6]?"%":""}</td></tr>`).join("")).join("");
// a piece of gear's affixes, for its details: the pool it drops with, and what the items that add affixes to it roll
function gearAffixHtml(id){const it=BUILD.item(id),p=gearAffixPool(it),out=[];
  if(p){const n=affixLists(...p).length;
    out.push(`<div class="note">${AFF_POOL[p[0]]}: as ${AFF_TYPE[p[1]]||p[1]}, it can come with up to ${n} random affixes, one from each list (the community database's tables).</div>
      <details class="affDetails"><summary>The ${n} lists</summary><div class="scroll"><table class="affTable"><thead><tr><th>Affix</th><th>Value</th></tr></thead><tbody>${affixPoolRows(...p)}</tbody></table></div></details>`)}
  Object.entries((typeof CLIENT!=="undefined"&&CLIENT.upgrades)||{}).filter(([u,ts])=>ts.includes(+id)&&AFFIX_ITEMS[u]).forEach(([u])=>{const rep=AFFIX_ITEMS[u];
    const rows=rep.slots?rep.slots.map((l,i)=>`<tr class="wayRow"><td colspan="2">${ORDINAL[i]} affix: one of these</td></tr>${affixRows(l)}`).join(""):affixRows(rep);
    out.push(`<div class="note">With ${itemIcon(u,1,"il")}${infoLink("item",u,itemName(u))}, as players have seen it roll:</div>
      <details class="affDetails"><summary>${rep.slots?`${rep.slots.length} affixes, one from each list`:"One of these"}</summary><div class="scroll"><table class="affTable"><thead><tr><th>Affix</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div></details>`)});
  return out.join("")}
// the Affixes tab's card of them: each pool and gear type, the gear in it and its lists
function affixGearBlocks(){const by={};(typeof EQUIP!=="undefined"?EQUIP:[]).forEach(it=>{const p=gearAffixPool(it);if(p)(by[p.join("|")]=by[p.join("|")]||[]).push(it)});
  const order=[..."Melee Series|Ranged Series|Magic Series|Armor|Garment|Shoes".split("|").map(t=>["monsterDrop",t]),...["Melee Series","Ranged Series","Magic Series"].map(t=>["mvp",t]),["blacksmith","Forging Weapons"]];
  return order.filter(p=>by[p.join("|")]).map(p=>{const g=by[p.join("|")].sort((a,b)=>a.name.localeCompare(b.name)),n=affixLists(...p).length;
    return `<div class="affItem"><div class="bar"><h3 class="grow">${AFF_POOL[p[0]]} · ${esc(AFF_TYPE[p[1]]||p[1])}</h3><span class="pill">up to ${n} affixes</span></div>
    <div class="affCols"><div><div class="affHead">Gear (${g.length})</div><ul class="affGear affGearLong">${g.map(it=>`<li class="dbName">${iconHtml("gear",it.id,1)}${infoLink("gear",it.id,it.name)}</li>`).join("")}</ul></div>
    <div><div class="affHead">Affixes it can come with</div><div class="scroll"><table class="affTable"><thead><tr><th>Affix</th><th>Value</th></tr></thead><tbody>${affixPoolRows(...p)}</tbody></table></div></div></div></div>`}).join("")}
let AFFIX_DRAWN=false;
function renderAffixItems(){if(AFFIX_DRAWN)return;AFFIX_DRAWN=true;const ups=(typeof CLIENT!=="undefined"&&CLIENT.upgrades)||{};
  // newest first (the highest item id)
  const ids=Object.keys(ups).map(Number).sort((a,b)=>b-a),rep=ids.filter(i=>AFFIX_ITEMS[i]),rest=ids.filter(i=>!AFFIX_ITEMS[i]);
  $("affixItems").innerHTML=rep.map(i=>affixItemBlock(i,ups[i])).join("");
  if($("affixGear"))$("affixGear").innerHTML=affixGearBlocks();
  $("affixMore").innerHTML=rest.map(i=>affixItemBlock(i,ups[i])).join("")}
