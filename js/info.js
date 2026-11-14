// ---- the details popup: a monster, an item, a piece of gear or a card. Any element with data-info="mob:1002" or "item:909" opens it (gear
// and cards are items too: the popup tells them apart), as do the search's monster, item, gear and card results. Names inside it open
// theirs, and Back returns to the one before. Its buttons do what a click on the name used to: farm the monster, set an item's price,
// equip gear or a card, or open it in its own tab ----
let INFO=[];
const CARD_IDS=new Set((typeof CARDS!=="undefined"?CARDS:[]).map(c=>c.id));
const infoKind=id=>CARD_IDS.has(+id)?"card":BUILD.item(+id)?"gear":"item";
const infoLink=(kind,id,txt)=>`<a href="#" data-info="${kind}:${id}">${esc(txt)}</a>`;
const infoMobLink=(id,txt)=>MOB_BY_ID.has(+id)?infoLink("mob",id,txt):esc(txt);
const infoTile=(k,v,s,wide)=>`<div class="tile${wide?" wide":""}"><div class="k">${k}</div><div class="v mono">${v}</div>${s?`<div class="s">${s}</div>`:""}</div>`;
// a section of the popup: folds, and one you fold stays folded in every popup (state.collapsed "info:" + its heading, counts left out)
const infoSecKey=h=>"info:"+String(h).replace(/<[^>]+>/g,"").replace(/\s*\(.*\)\s*$/,"").trim();
const infoSec=(h,body)=>body?`<details class="infoSec" data-fold="${esc(infoSecKey(h))}"${(state.collapsed||{})[infoSecKey(h)]?"":" open"}><summary><h3>${h}</h3></summary>${body}</details>`:"";
// what an NPC pays for an item and its weight, a line in the details when either is known
function infoPrice(id){const npc=NPCSELL[id]!=null||state.npcPrices[id]!=null?npcPays(id):null;
  const t=[npc!=null?`NPC pays ${fmtN(npc)} z${ocMul()>1?" with Overcharge":""}`:"",ITEMW[id]>0?`${fmtN(ITEMW[id])} weight`:""].filter(Boolean).join(" · ");
  return t?`<div class="note infoPrice">${t}</div>`:""}
// the box to type what players pay, in the popup's bottom bar, only where that price counts: a drop of a monster the farm tables know
// (zeny per kill), a recipe material (the Recipes tab's worth), an HP / SP item or an elemental converter (their costs), or one
// already priced (so it can be cleared)
const priceCounts=id=>!!(ITEM_DROPS[id]||RECIPES_USING[id]||typeof RECOVERY!=="undefined"&&RECOVERY[id]||CONV_IDS.includes(+id)||state.prices[id]>0);
const infoPriceBox=id=>!priceCounts(id)?"":`<label class="infoPay priceIn">Players pay<input class="w-lg" type="number" min="0" data-infoprice="${id}" value="${state.prices[id]>0?state.prices[id]:""}" placeholder="0"></label>`;
// the monsters the farm tables know that drop it, best chance first: the chance (and yours, with your drop bonus and the level penalty),
// the zeny a kill brings from it (what an NPC or players pay, the way the farm tables count it), affixes a gear drop comes with, and
// the monster's best open map with its spawns (or when it comes). Every one of them: this is the item's list of droppers
function infoDroppers(id){const ds=ITEM_DROPS[id]||[];if(!ds.length)return "";
  return `<div class="infoList"><table class="matTable usedTable dropTable"><thead><tr><th>Monster</th><th>Chance</th><th title="the zeny a kill brings from this drop: what an NPC pays (or players, on the Market tab) × your chance, when you loot it">Zeny / kill</th><th>Best open map</th></tr></thead><tbody>${ds.map(({m,ch})=>{const om=openMaps(m),a=mobArrives(m),your=yourCh(m,ch),z=dropZ(m,id,ch),af=typeof dropAff==="function"?dropAff(id,m.id):0;
    const best=(DROPPERS[id]||{}).m===m;
    return `<tr><td class="name"><div class="dbName">${mobIcon(m.id,1,"il")}<div>${infoLink("mob",m.id,m.name)}${BOSS_PILL(m)}${best?' <span class="pill up" title="The best drop chance, bosses left out">best</span>':""}<div class="note">Lv ${m.lv}${af?` · ${affTxt(af)}`:""}</div></div></div></td>
      <td>${chTxt(ch)}${your!==ch?`<div class="note">you ${chTxt(your)}</div>`:""}</td>
      <td>${z>0?dropZTxt(z):"–"}</td>
      <td class="name">${om.length?`<span class="mono">${esc(mapCode(om[0][0]))}</span> <span class="note">≈${spN(om[0][1])}</span>${mapName(om[0][0])?`<div class="note">${esc(mapName(om[0][0]))}</div>`:""}`:`<span class="note">${a?`none open · ${esc(a)}`:"no open map"}</span>`}</td></tr>`}).join("")}</tbody></table></div>`}
// where else gear or a card comes from, beyond the monsters in Dropped by: the full drop lists' other monsters (MVPs), quests, exchanges
const infoFrom=id=>{const h=ITEM_DROPS[id]?(typeof otherSourcesHtml==="function"?otherSourcesHtml(id):""):fromHtml(id);return h?`<div class="infoFrom">${h}</div>`:""};
// the NPC shops that sell it (data/shops.js): price and every place it stands
function infoShops(id){const ss=SHOPS_OF[id]||[];if(!ss.length)return "";
  return `<div class="infoList">${ss.map(([name,at,z])=>`<div><b>${esc(name)}</b> <span class="note">${fmtN(z)} z · ${esc(at.map(([mp,x,y])=>`${mapName(mp)||mp} ${x},${y}`).join("; "))}</span></div>`).join("")}</div>`}
// the recipes that make it and the ones that use it (js/recipes.js), each with its materials
const recipeWhere=r=>`${esc(r.cat)}${r.lv?` Lv ${r.lv}`:""}${r.npc?` · ${recipeNpcHtml(r)}${r.fee?`, ${fmtN(r.fee)} z`:""}`:recipeSkill(r)?` · ${esc(recipeSkill(r))}`:""}`;
// Made from and Used in are tables of one row per recipe, led by what it makes: icon, name, how many, and where (craft, NPC, fee)
const recipeMakes=r=>`<td class="name"><div class="dbName">${itemIcon(r.id,1,"il")}<div>${infoLink("item",r.id,itemName(r.id))}${r.n>1?` <b class="mono">×${fmtN(r.n)}</b>`:""}<div class="note">${recipeWhere(r)}</div></div></div></td>`;
// then all its materials, the item itself among them
const infoRecipeTable=rs=>`<table class="matTable usedTable"><thead><tr><th>Makes</th><th>Materials</th></tr></thead><tbody>${rs.slice(0,12).map(r=>`<tr>${recipeMakes(r)}<td class="name l mats">${recipeMats(r)}</td></tr>`).join("")}</tbody></table>`;
function infoRecipes(id){const mk=RECIPES_MAKING[id]||[],us=RECIPES_USING[id]||[];
  return infoSec(`Made from${mk.length>1?` (${mk.length} ways)`:""}`,mk.length&&`<div class="infoList">${infoRecipeTable(mk)}${mk.length>12?`<div class="note">and ${mk.length-12} more on the Recipes tab</div>`:""}</div>`)
    +infoSec("Used in",us.length&&`<div class="infoList">${infoRecipeTable(us)}${us.length>12?`<div class="note">and ${us.length-12} more on the Recipes tab</div>`:""}</div>`)}
// the memorial dungeons whose reward box has it (data/memorial.js), and the weekday Poring Village gives a Jello Fragment
function infoMemorial(id){const j=JELLO.find(x=>x.frag[0]===+id);
  const rows=MEMORIALS.flatMap(m=>[["",m.normal],[" hard mode",m.hard||[]]].flatMap(([h,l])=>l.filter(x=>x[0]===+id)
    .map(x=>`<div><b>${esc(m.name)}</b>${h} <span class="note">${x[2]?`${esc(x[2])} · `:""}base Lv ${m.lv}</span></div>`)));
  if(j)rows.unshift(`<div><b>Poring Village</b> on ${WEEKDAY[j.day]} <span class="note">1 · base Lv 30, or from a ${esc(JELLO_BOX[1])} at the weekend</span></div>`);
  return rows.length?`<div class="infoList">${rows.join("")}</div>`:""}
// a link that opens the popup: #mob/1002, #item/909, #gear/1201 or #card/4001 (any item works as #item/, the popup tells gear and cards
// apart). The address bar shows the one that's open, and the page opened at one opens it over the tab you were on
const infoHash=(kind,id)=>`#${kind}/${id}`;
function hashInfo(h){const m=/^#(mob|item|gear|card)\/(\d+)$/i.exec(h||"");if(!m)return null;const kind=m[1].toLowerCase(),id=m[2];
  if(kind==="mob")return MOB_BY_ID.has(+id)?["mob",id]:null;
  return itemName(id)!=="#"+id||BUILD.item(+id)?[kind,id]:null}
const infoUrl=()=>{const [kind,id]=INFO[INFO.length-1];return location.origin+location.pathname+location.search+infoHash(kind,id)};
const recipeAct=id=>RECIPES_MAKING[id]||RECIPES_USING[id]?'<button type="button" data-infoact="recipes">Recipes</button>':"";

// a monster's details: its numbers, then yours against it (with a character), its drops, skills and spawns. Everything the old
// Monster info tab and the Monsters card's side panel showed
const MOB_SKILL_T=ms=>!ms?"–":ms>=36e5?`${+(ms/36e5).toFixed(1)}h`:ms>=6e4?`${+(ms/6e4).toFixed(1)} min`:`${+(ms/1000).toFixed(1)}s`;
function popMob(m){const r=mobRow(m,walkSec()),om=openMaps(m),s=cur(),inS=s.mobIds.includes(m.id),a=mobArrives(m),me=showMine(),dps=me?withEl(r.el2,()=>dpsOf(m)):null;
  const sub=`Lv ${m.lv} · ${m.el?`<span class="el ${m.el}">${m.el} ${m.elv}</span>`:"element –"} · ${m.size||"size –"} · ${m.race||"race –"}${BOSS_PILL(m)}${m.agg?' <span class="pill">aggressive</span>':""}`;
  const tiles=infoTile("HP",m.hp==null?"?":fmtN(m.hp),`DEF ${m.def??"–"} · MDEF ${m.mdef??"–"} · ATK ${m.atkMin??"–"}–${m.atkMax??"–"}${m.hit100?` · 100% hit at ${m.hit100} HIT`:""}${m.flee95?` · 95% flee at ${m.flee95} FLEE`:""}`)
    +infoTile("EXP",fmtExp(m),m.expUnknown?"no EXP data yet":`${m.expUnsure?"* unconfirmed, not checked in game yet · ":""}job ${m.jobUnknown?"?":fmtN(m.job)}${me?` · you get ${fmtN(killExp(m))} / ${m.jobUnknown?"?":fmtN(killJobExp(m))}`:""}`)
    +infoTile("Best map",om.length?esc(mapName(om[0][0])||mapCode(om[0][0])):"–",om.length?`${mapName(om[0][0])?mapCode(om[0][0])+" ":""}≈${spN(om[0][1])}`:a?`none open · comes with the ${esc(a)}`:"none open")
    +(me?infoTile(`You (${esc(state.job)})`,isFinite(r.sec)?r.sec.toFixed(1)+"s / kill":"can't hurt",`your hit ${Math.round(r.mult)}%${elTag(r.el2)}`)
      // damage per second while fighting it, with the element the EXP/min picks (as on the Character card); none for Spell Fist
      +(dps!=null&&isFinite(dps)?infoTile("Damage / s",fmtN(Math.round(dps)),`vs its ${m.hp==null?"?":fmtN(m.hp)} HP, misses included`):"")
      +infoTile("Zeny / kill",hasLoot(m)?fmtN(r.zk):"–",`${m.drops.length&&m.drops.every(([,ch])=>ch==null)?"no published drop rates yet · ":""}${penNote(m)||"no drop level penalty"}${num(state.dropBonus)?` · drop rate +${num(state.dropBonus)}%`:""}`)
      +mobYouTiles(m):"");
  // drops: best chance first, with your chance, what NPCs and players pay, and the zeny a kill it's worth to you
  const drops=(m.drops||[]).slice().sort((x,y)=>(y[1]??-1)-(x[1]??-1)).map(([id,ch])=>{const y=yourCh(m,ch),lt=looted(id);
    return `<tr class="${lt?"":"muted"}"><td class="name"><div class="dbName">${itemIcon(id,1,"il")}<div>${infoLink(infoKind(id),id,itemName(id))}<div class="note">${GROUP_NAME[groupOf(id)]}${lt?"":" · not looted"}${dropAff(id,m.id)?` · ${affTxt(dropAff(id,m.id))}`:""}</div></div></div></td>
      <td>${chTxt(ch)}${me&&y!==ch?`<div class="note">you ${chTxt(y)}</div>`:""}</td><td>${npcSell(id)>0?fmtN(npcPays(id)):"–"}</td><td>${state.prices[id]>0?fmtN(state.prices[id]):"–"}</td>${me?`<td>${lt?dropZTxt(dropZ(m,id,ch)):"0"}</td>`:""}</tr>`}).join("");
  const dropT=drops&&`<div class="scroll"><table class="matTable usedTable dropTable"><thead><tr><th>Item</th><th>Chance</th><th>NPC pays</th><th>Players pay</th>${me?"<th>Zeny / kill</th>":""}</tr></thead><tbody>${drops}</tbody></table></div>`;
  const skills=(m.skills||[]).map(([sid,st,lv,ch,cast,delay,cond,intr])=>`<tr><td class="name">${esc(MOBSKILLNAME[sid]||`skill ${sid}`)}</td><td class="name">${esc(st.toLowerCase())}</td><td>${lv}</td><td>${ch}%</td><td>${cast?MOB_SKILL_T(cast)+(intr?"":` <span class="note" title="hitting it doesn't stop the cast">uninterruptible</span>`):"instant"}</td><td>${MOB_SKILL_T(delay)}</td><td class="name">${esc(cond)||"–"}</td></tr>`).join("");
  const skillT=skills&&`<div class="scroll"><table class="matTable usedTable"><thead><tr><th>Skill</th><th>When</th><th>Lv</th><th>Chance</th><th>Cast</th><th>Delay</th><th>Condition</th></tr></thead><tbody>${skills}</tbody></table></div><div class="note">From kRO's tables; Global may differ.</div>`;
  // spawns: lit on the world map, then each map with the other monsters on it
  const sp=SPAWN[m.id]||[];
  const maps=sp.slice().sort((x,y)=>(y[1]??-1)-(x[1]??-1)).map(([mp,n])=>{const others=(MAPMOBS[mp]||[]).filter(x=>x.m.id!==m.id).sort((x,y)=>(y.n??-1)-(x.n??-1));
    return `<tr><td class="name"><a href="#" data-infomap="${esc(mp)}"${mapName(mp)?"":' class="mono"'}>${esc(mapName(mp)||mapCode(mp))}</a>${lockPill(mp)}${isClosed(mp)?` <span class="pill down">closed${mapArrives(mp)?` · ${esc(mapArrives(mp).split(", ")[1])}`:""}</span>`:""}${mapName(mp)?`<div class="note mono">${mapCode(mp)}</div>`:""}</td><td>≈${spN(n)}</td>
      <td class="name l">${others.map(x=>`<span class="mobChip">${mobIcon(x.m.id,1,"il")}${infoMobLink(x.m.id,x.m.name)} <span class="note">×${spN(x.n)}</span></span>`).join("")||"–"}</td></tr>`}).join("");
  const mapT=maps&&`<div class="worldMap" id="infoMobWorld"></div><div class="scroll"><table class="matTable usedTable"><thead><tr><th>Map</th><th>Spawns</th><th>Other monsters</th></tr></thead><tbody>${maps}</tbody></table></div>`;
  return {ico:mobIcon(m.id,2),title:m.name,sub,
    body:`<div class="calc">${tiles}</div>${infoSec("Drops",dropT)}${infoSec("Skills",skillT)}${infoSec("Spawns",mapT)}`,
    after:()=>{const w=$("infoMobWorld");if(w)worldMap(w,sp,k=>{$("infoDlg").close();openMap(k)})},
    acts:(inS?'<span class="pill up">In this session</span> <button type="button" data-infoact="unfarm">Remove from session</button>'
      :`<button type="button" class="primary" data-infoact="farm">${s.mobIds.length?"Also killing it":"Farming it now"}</button>`)+mineSwitch()}}

// an HP / SP recovery item (data/recovery.js): what it heals with your changes, the price the Consumables card uses and the cost per HP / SP
function infoHeal(id){if(!RECOVERY[id])return "";
  return `<div class="infoList">${recItems().filter(x=>x.id===String(id)).map(x=>{const u=x.kind.toUpperCase();
    const amt=x.pct!=null?`${x.pct}% of Max ${u}${x.avg>0?` (${fmtN(x.avg)} ${u})`:""}`:`${x.min===x.max?fmtN(x.min):`${fmtN(x.min)}–${fmtN(x.max)}`} ${u}${x.min===x.max&&x.avg===x.min?"":` (avg ${fmtSig(x.avg)})`}`;
    return `<div><b>${amt}</b>${x.aOk?"":' <span class="note" title="not measured in Zero yet: classic RO\'s amount">?</span>'} <span class="note">${x.price!=null?`${fmtN(x.price)} z (${REC_SRC[x.src]}) · ${x.per!=null?`${fmtSig(x.per)} z/${u}`:"–"}`:"no price: type what players pay"}</span></div>`}).join("")}</div>`}

// what's in a box (data/client.js's boxes). The client's selection boxes say what you pick from and how many; its other box table only
// lists what can come out, so the box's own text tells the rest: a scroll whose text says "something may appear" (and a costume enchant
// stone box) gives one at random, any other box all of them, and an amount is the one its text gives ("HD Elunium x23", "5 Bubble Gum",
// "Bubble Gum 5ea Box"), else 1 when it gives one item (a random box, a box of one thing) and unknown (null) when it gives several
const boxText=id=>(CLIENT.items[id]||[])[2]||(typeof ITEM_TEXT!=="undefined"&&ITEM_TEXT[id])||"";
const boxItemName=i=>((BUILD.item(i)||{}).name||itemName(i)).replace(/^\[Costume\] /,"");
function boxOf(id){const b=CLIENT.boxes[id];if(!b)return null;if(b[0]==="pick")return {kind:"pick",rows:b[1]};
  const t=boxText(id),kind=STONE_BOXES.includes(+id)||/something (may|might) (appear|pop out|manifest)/i.test(t)?"random":t||b[1].length===1?"all":"open";
  const amt=i=>{const n=boxItemName(i).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const m=t.match(new RegExp(n+"[^\\n,]*?[x×]\\s*(\\d[\\d,]*)","i"))||t.match(new RegExp("(\\d[\\d,]*)\\s*[x×]?\\s*"+n,"i"))
      ||b[1].length===1&&(t.match(/containing (\d[\d,]*)/i)||itemName(id).match(/(\d+)\s*ea\b/i));
    // named in the text with no amount ("[Blessing of Yggdrasil]"): one
    return m?+m[1].replace(/,/g,""):kind==="random"||b[1].length===1||new RegExp(n,"i").test(t)?1:null};
  return {kind,rows:b[1].map(([i,,r,h])=>[i,amt(i),r,h])}}
const BOX_KIND={pick:["You pick one:","you pick one"],random:["One of these, at random:","one at random"],all:["You get all of these:","comes with the rest"],open:["What can come out (the box has no text to say whether it gives all of them or one):","can come out"]};
// a box you get one of (at random, or picked) says so in the Amount column: one cell beside all of them when they come in the same
// amount ("Random 1 of these", "Pick 1 of these, ×10"), else each its amount under a "Pick 1 · amount" heading
function infoBox(id){const b=boxOf(id);if(!b)return "";const oneOf=b.kind==="random"||b.kind==="pick",n0=b.rows[0][1];
  const same=oneOf&&b.rows.length>1&&b.rows.every(r=>r[1]===n0)&&n0!=null,word=b.kind==="pick"?"Pick":"Random";
  return `${oneOf?"":`<div class="note">${BOX_KIND[b.kind][0]}</div>`}<div class="infoList"><table class="matTable usedTable"><thead><tr><th>Item</th><th>${oneOf&&!same?`${word} 1 · amount`:"Amount"}</th></tr></thead><tbody>${b.rows.map(([i,n,r,h],k)=>
    `<tr><td class="name"><div class="dbName">${itemIcon(i,1,"il")}<div>${infoLink(infoKind(i),i,`${r?`+${r} `:""}${(BUILD.item(i)||{}).name||itemName(i)}`)}${h?`<div class="note">${h} hours</div>`:""}</div></div></td>${same?k?"":`<td rowspan="${b.rows.length}" class="boxOne">${word} 1 of these${n0>1?`, ×${fmtN(n0)}`:""}</td>`:`<td>${n!=null?fmtN(n):'<span class="note" title="The box\'s text doesn\'t say how many">?</span>'}</td>`}</tr>`).join("")}</tbody></table></div>`}

// the boxes it comes out of, as a table: each box, and what you get of it there (how many, and whether you pick it, it's one at random
// among the box's items, or it comes with the rest)
function infoInBoxes(id){const bs=Object.keys(CLIENT.boxes).map(bid=>[bid,boxOf(bid)]).filter(([,b])=>b.rows.some(r=>r[0]===+id));if(!bs.length)return "";
  const get=(b,n)=>{const of=` <span class="note">of ${b.rows.length}</span>`;
    return b.kind==="random"?`Random 1${of}`:b.kind==="pick"?`${n>1?`${fmtN(n)}, if you pick it`:"Pick 1"}${of}`:b.kind==="open"?'<span class="note">may come out</span>'
      :n!=null?fmtN(n):'<span class="note" title="The box\'s text doesn\'t say how many">?</span>'};
  return `<div class="infoList"><table class="matTable usedTable"><thead><tr><th>Box</th><th>You get</th></tr></thead><tbody>${bs.map(([bid,b])=>
    `<tr><td class="name"><div class="dbName">${itemIcon(bid,1,"il")}${infoLink("item",bid,itemName(bid)||`#${bid}`)}</div></td><td class="name l">${get(b,b.rows.find(r=>r[0]===+id)[1])}</td></tr>`).join("")}</tbody></table></div>`}
// a costume enchant stone (data/stones.js): what it gives, the costume slot it goes in, and the sets it's part of
function infoStone(id){const x=(typeof STONES!=="undefined"?STONES:[]).find(s=>s.id===+id);if(!x)return "";
  const fx=[stoneFx(x),x.b.length&&x.off?x.off:""].filter(Boolean).join(", "),slot={upper:"upper headgear",middle:"middle headgear",lower:"lower headgear",garment:"garment"}[x.slot]||x.slot;
  const sets=(typeof STONE_SETS!=="undefined"?STONE_SETS:[]).filter(s=>s.need.includes(+id));
  return `<div class="infoList"><div><b>${esc(fx)}</b></div><div class="note">Goes in a costume ${esc(slot)}'s enchant slot; the Costume Enchant Master applies it.</div>
    ${sets.map(s=>`<div>Set: ${esc(s.name)} <span class="note">${esc(stoneFx(s))}</span></div>`).join("")}</div>`}

// the Enchant Stone Craft Box: any 5 of the costumes the official guide lists (data/costumes.js's COSTUME_CRAFT) give one of the
// four costume enchant stone boxes at random, and that box one random stone for its slot. A listed costume's card says it goes in
const CRAFT_BOX=104676,STONE_BOXES=[104675,104674,104673,104672];
// a costume's name; a few (Mr. Smile, Pagdaya) are only in the gear list, as they have stats
const craftName=i=>(BUILD.item(i)||{}).name||itemName(i);
const craftCostumes=()=>[...(typeof COSTUME_CRAFT!=="undefined"?COSTUME_CRAFT:[])].sort((a,b)=>craftName(a).localeCompare(craftName(b)));
function infoCraft(id){const box=i=>`${itemIcon(i,1,"il")}${infoLink("item",i,itemName(i)||`#${i}`)}`;
  if(+id===CRAFT_BOX){const cos=craftCostumes();if(!cos.length)return "";
    // the boxes it gives, and the costumes it takes with their costume slot, as tables
    const slot=i=>(costumeOf(i)||[]).map(s=>s[0].toUpperCase()+s.slice(1)).join(" / ")||"–";
    return `<div class="infoList"><div>Put in any 5 of the costumes below (not their Bound versions):</div>
      <table class="matTable usedTable"><thead><tr><th>Box</th><th>You get</th></tr></thead><tbody>${STONE_BOXES.map((i,k)=>`<tr><td class="name"><div class="dbName">${box(i)}</div></td>${k?"":`<td rowspan="${STONE_BOXES.length}" class="boxOne">Random 1 of these</td>`}</tr>`).join("")}</tbody></table>
      <div class="note">That box opens to one random enchant stone for its slot.</div></div>
      <h3>Costumes it takes (${cos.length})</h3><div class="infoList"><table class="matTable usedTable"><thead><tr><th>Costume</th><th>Slot</th></tr></thead><tbody>${cos.map(i=>`<tr><td class="name"><div class="dbName">${itemIcon(i,1,"il")}${infoLink(infoKind(i),i,craftName(i))}</div></td><td class="name l">${esc(slot(i))}</td></tr>`).join("")}</tbody></table></div>`}
  if(typeof COSTUME_CRAFT!=="undefined"&&COSTUME_CRAFT.includes(+id))
    return `<div class="infoList"><div>Any 5 of the listed costumes go in the ${box(CRAFT_BOX)} for one costume enchant stone box (Upper, Middle, Lower or Garment) at random.</div></div>`;
  return ""}

// the gear an affix-adding or upgrade item works on (data/client.js's upgrades, the client's [Target Item] list), as a table
function infoTargets(id){const ts=(typeof CLIENT!=="undefined"&&CLIENT.upgrades||{})[id];if(!ts||!ts.length)return "";
  return `<div class="infoList"><table class="matTable usedTable"><thead><tr><th>Item</th><th>Type</th></tr></thead><tbody>${ts.map(i=>{const it=BUILD.item(i);
    return `<tr><td class="name"><div class="dbName">${it?iconHtml("gear",i,1):itemIcon(i,1,"il")}${infoLink(infoKind(i),i,it?it.name:itemName(i))}</div></td><td class="name l">${esc(it?gearKind(it):clientCat(i)||"–")}</td></tr>`}).join("")}</tbody></table></div>`}
// and the other way: the items that work on this gear (an enchant scroll, an upgrade), each linking back to its details
function infoUpgradedBy(id){const us=Object.entries(typeof CLIENT!=="undefined"&&CLIENT.upgrades||{}).filter(([,ts])=>ts.includes(+id)).map(([u])=>+u);if(!us.length)return "";
  return `<div class="infoList"><table class="matTable usedTable"><thead><tr><th>Item</th><th>Type</th></tr></thead><tbody>${us.map(u=>
    `<tr><td class="name"><div class="dbName">${itemIcon(u,1,"il")}${infoLink(infoKind(u),u,itemName(u))}</div></td><td class="name l">${esc(clientCat(u)||"–")}</td></tr>`).join("")}</tbody></table></div>`}
function popItem(id){const name=itemName(id);
  return {ico:itemIcon(id,1.5),title:name,sub:`#${id} · ${ITEM_DROPS[id]||!clientCat(id)?`${GROUP_NAME[groupOf(id)]}${looted(id)?"":" (not looted)"}`:esc(clientCat(id))}`,
    body:infoSec("Heals",infoHeal(id))+infoSec("Enchant stone",infoStone(id))+infoSec("In-game text",typeof ITEM_TEXT!=="undefined"&&ITEM_TEXT[id]&&`<div class="infoText">${esc(ITEM_TEXT[id])}</div>`)
      +infoSec("Target items",infoTargets(id))+infoSec("Contents",infoBox(id))+infoSec("Comes in",infoInBoxes(id))+infoSec("Enchant Stone Craft Box",infoCraft(id))+infoPrice(id)+infoSec("Sold by",infoShops(id))+infoSec("Dropped by",infoDroppers(id))+infoSec("Other sources",ITEM_DROPS[id]?infoFrom(id):"")+infoSec("Memorial dungeons",infoMemorial(id))
      +(ITEM_DROPS[id]||infoMemorial(id)||infoInBoxes(id)?"":'<div class="note">No monster the farm tables know drops it.</div>')+infoRecipes(id),
    acts:recipeAct(id)+infoPriceBox(id)}}

function popGear(id){const it=BUILD.item(id),fx=fxOf(it),c=C(),txt=itemText(id),worn=wornIn(c,it.id);
  const stats=[it.lv?`Lv ${it.lv}+`:"",it.slots?`[${it.slots}] card slot${it.slots>1?"s":""}`:"no card slots",it.atk?`ATK ${it.atk}`:"",it.matk?`MATK ${it.matk}`:"",it.def?`DEF ${it.def}`:"",
    it.wlv?`weapon Lv ${it.wlv}`:"",it.el&&it.el!=="neutral"?`${fxCap(it.el)} element`:"",it.w!=null?`${it.w} weight`:""].filter(Boolean).join(" · ");
  const ok=eqPlaces(it,state.job).length&&wearsJob(it,state.job);
  return {ico:iconHtml("gear",id,1.5),title:it.name,sub:`${esc(gearKind(it))} · #${id} · ${esc(jobsTxt(it))}${worn.map(x=>` <span class="pill up">${esc(x)}</span>`).join("")}`,
    body:`<div class="note mono">${esc(stats)}</div>${infoSec("Effects",fx.length?`<div class="infoList">${fx.map(x=>`<div>${esc(x)}</div>`).join("")}</div>`:"")}${infoSec("In-game text",txt&&`<div class="infoText">${esc(txt)}</div>`)}
      ${infoSec("Dropped by",infoDroppers(id))}${infoSec(ITEM_DROPS[id]?"Other sources":"Where to get",infoFrom(id))}${infoSec("Enchant and upgrade items",infoUpgradedBy(id))}${infoSec("Affixes",typeof gearAffixHtml==="function"?gearAffixHtml(id):"")}${infoRecipes(id)}${ITEM_DROPS[id]?infoPrice(id):""}`,
    acts:`<button type="button" class="primary" data-infoact="equip"${ok?"":` disabled title="${esc(eqPlaces(it,state.job).length?`A ${state.job} can't wear it`:"Not something you wear")}"`}>Equip</button><button type="button" data-infoact="equiptab">Equipment tab</button>${recipeAct(id)}${infoPriceBox(id)}`}}

function popCard(id){const x=BUILD.item(id),fx=fxOf(x),c=C(),txt=itemText(id),worn=wornIn(c,x.id,true);
  return {ico:iconHtml("card",id),title:x.name,sub:`${CARD_PART[cardPart(x)]||"–"} card · #${id}${cardName(x)?` · names gear "${esc(cardName(x))}"`:""}${notInGamePill(id)}${worn.map(w=>` <span class="pill up">${esc(w)}</span>`).join("")}`,
    body:`${infoSec("Effects",fx.length?`<div class="infoList">${fx.map(l=>`<div>${esc(l)}</div>`).join("")}</div>`:"")}${infoSec("In-game text",txt&&`<div class="infoText">${esc(txt)}</div>`)}
      ${infoSec("Dropped by",infoDroppers(id))}${infoSec(ITEM_DROPS[id]?"Other sources":"Where to get",infoFrom(id))}${ITEM_DROPS[id]?infoPrice(id):""}`,
    acts:`<button type="button" class="primary" data-infoact="equip"${cardPart(x)?"":' disabled title="Not a card that goes in gear"'}>Equip</button><button type="button" data-infoact="cardtab">Cards tab</button>${infoPriceBox(id)}`}}

function drawInfo(){const [kind,id]=INFO[INFO.length-1],m=kind==="mob"&&MOB_BY_ID.get(+id);
  const v=kind==="mob"?(m?popMob(m):null):kind==="gear"&&BUILD.item(+id)?popGear(+id):kind==="card"&&BUILD.item(+id)?popCard(+id):popItem(id);
  if(!v){INFO.pop();return}
  $("infoDlgIco").innerHTML=v.ico;$("infoDlgTitle").textContent=v.title;$("infoDlgSub").innerHTML=v.sub;
  $("infoDlgBody").innerHTML=v.body;$("infoDlgActs").innerHTML=v.acts;if(v.after)v.after();$("infoBack").hidden=INFO.length<2;
  $("infoDlgBody").scrollTop=0;$("infoShare").href=infoUrl();
  try{history.replaceState(null,"",infoHash(kind,id))}catch(e){}}
// kind "mob" or "item" (an item that's gear or a card shows as one)
function openInfo(kind,id){if(kind!=="mob")kind=infoKind(id);
  const d=$("infoDlg");if(!d.open)INFO=[];const top=INFO[INFO.length-1];if(!top||top[0]!==kind||String(top[1])!==String(id))INFO.push([kind,id]);
  drawInfo();if(!d.open)d.showModal()}
function infoAct(a){const [kind,id]=INFO[INFO.length-1],d=$("infoDlg");
  if(a==="farm"||a==="unfarm"){toggleSessMob(+id);state.calcMobId=null;save();renderAll();drawInfo();showToast(`${MOB_BY_ID.get(+id).name} is ${a==="farm"?"in":"out of"} your session.`);return}
  d.close();
  if(a==="equip")openEquip(kind==="card"?"card":"item",+id);
  else if(a==="equiptab"){state.eqDb={...EQDB_D,job:"",q:"#"+id};save();showTab("equip");scrollTo({top:0})}
  else if(a==="cardtab"){state.cardDb={...CARDDB_D,q:"#"+id};save();showTab("cards");scrollTo({top:0})}
  else if(a==="recipes"){state.recipeDb={...RECIPEDB_D,q:"#"+id};save();showTab("recipes");scrollTo({top:0})}}
(function setupInfo(){const d=$("infoDlg");
  // anywhere on the page (capture, so a row's own click doesn't also run)
  document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-info]");if(!a)return;e.preventDefault();e.stopPropagation();
    const i=a.dataset.info.indexOf(":");openInfo(a.dataset.info.slice(0,i),a.dataset.info.slice(i+1))},true);
  d.addEventListener("click",e=>{if(e.target===d){d.close();return}
    if(e.target.closest("[data-gotab]")){d.close();return}// a link to a tab (its handler opens it)
    const b=e.target.closest("[data-infoact]");if(b){infoAct(b.dataset.infoact);return}
    const mp=e.target.closest("[data-infomap]");if(mp){e.preventDefault();d.close();openMap(mp.dataset.infomap)}});
  d.addEventListener("toggle",e=>{const s=e.target.closest&&e.target.closest("details.infoSec");if(!s||e.target!==s)return;
    const c=state.collapsed=state.collapsed||{},k=s.dataset.fold;if(s.open===!c[k])return;if(s.open)delete c[k];else c[k]=true;store.set(state)},true);
  d.addEventListener("change",e=>{const i=e.target.closest("[data-infoprice]");if(!i)return;const id=i.dataset.infoprice,v=Math.max(0,num(i.value));
    if(v>0)state.prices[id]=v;else delete state.prices[id];save();renderAll()});
  $("infoBack").addEventListener("click",()=>{INFO.pop();drawInfo()});
  $("infoDlgClose").addEventListener("click",()=>d.close());
  // closed: the address bar goes back to the tab's link
  d.addEventListener("close",()=>{if(d.open||!hashInfo(location.hash))return;const b=document.querySelector('[data-tabbtn][aria-selected="true"]');
    try{history.replaceState(null,"",location.pathname+location.search+(b?"#"+tabSlug(b.dataset.tabbtn):""))}catch(e){}});
  // Share: the phone's share sheet, else the link is copied (a plain click on the link; it can also be opened in a new tab)
  $("infoShare").addEventListener("click",async e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;e.preventDefault();
    const url=infoUrl(),lbl=$("infoShare").querySelector("span"),say=t=>{lbl.textContent=t;clearTimeout(lbl._t);lbl._t=setTimeout(()=>{lbl.textContent="Share"},2000)};
    if(navigator.share&&matchMedia("(pointer:coarse)").matches){try{await navigator.share({title:$("infoDlgTitle").textContent+" · Poring Planner",url});return}catch(err){if(err&&err.name==="AbortError")return}}
    try{await navigator.clipboard.writeText(url);say("Link copied")}catch(err){prompt("Copy this link:",url)}});
  addEventListener("hashchange",()=>{const x=hashInfo(location.hash);if(x)openInfo(...x)});
})();
