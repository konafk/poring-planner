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
let AFFIX_DRAWN=false;
function renderAffixItems(){if(AFFIX_DRAWN)return;AFFIX_DRAWN=true;const ups=(typeof CLIENT!=="undefined"&&CLIENT.upgrades)||{};
  // newest first (the highest item id)
  const ids=Object.keys(ups).map(Number).sort((a,b)=>b-a),rep=ids.filter(i=>AFFIX_ITEMS[i]),rest=ids.filter(i=>!AFFIX_ITEMS[i]);
  $("affixItems").innerHTML=rep.map(i=>affixItemBlock(i,ups[i])).join("");
  $("affixMore").innerHTML=rest.map(i=>affixItemBlock(i,ups[i])).join("")}
