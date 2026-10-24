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
const infoSec=(h,body)=>body?`<div class="infoSec"><h3>${h}</h3>${body}</div>`:"";
// what a player and an NPC pay for an item, with a box to type the player price
function infoPrice(id){const npc=NPCSELL[id]!=null||state.npcPrices[id]!=null?npcPays(id):null;
  return `<div class="bar infoPrice"><label>Players pay<input class="w-lg" type="number" min="0" data-infoprice="${id}" value="${state.prices[id]>0?state.prices[id]:""}" placeholder="0"></label>
    <span class="note">${npc!=null?`NPC pays ${fmtN(npc)} z${ocMul()>1?" with Overcharge":""}`:"no NPC price"}${ITEMW[id]>0?` · ${fmtN(ITEMW[id])} weight`:""}</span></div>`}
// the monsters the farm tables know that drop it: chance, your chance, and where they spawn (or when they come)
function infoDroppers(id){const ds=ITEM_DROPS[id]||[];if(!ds.length)return "";
  return `<div class="infoList">${ds.slice(0,12).map(({m,ch})=>{const om=openMaps(m),a=mobArrives(m);
    return `<div>${infoLink("mob",m.id,m.name)}${BOSS_PILL(m)} <span class="note">Lv ${m.lv} · ${chTxt(ch)}${yourCh(m,ch)!==ch?` (you ${chTxt(yourCh(m,ch))})`:""} · ${om.length?`${esc(mapLabel(om[0][0]))} ≈${spN(om[0][1])}`:a?`none open · ${esc(a)}`:"no open map"}</span></div>`}).join("")}${ds.length>12?`<div class="note">and ${ds.length-12} more in Item info</div>`:""}</div>`}
// the recipes that make it and the ones that use it (js/recipes.js), each with its materials
const infoRecipe=r=>`<div class="recipe"><span>${infoLink("item",r.id,recipeMade(r))} <span class="note">${r.cat}${r.lv?` Lv ${r.lv}`:""}</span></span>${recipeMats(r)}</div>`;
function infoRecipes(id){const mk=RECIPES_MAKING[id]||[],us=RECIPES_USING[id]||[];
  return infoSec(`Made from${mk.length>1?` (${mk.length} ways)`:""}`,mk.length&&`<div class="infoList">${mk.slice(0,12).map(infoRecipe).join("")}${mk.length>12?`<div class="note">and ${mk.length-12} more on the Recipes tab</div>`:""}</div>`)
    +infoSec("Used in",us.length&&`<div class="infoList">${us.slice(0,12).map(infoRecipe).join("")}${us.length>12?`<div class="note">and ${us.length-12} more on the Recipes tab</div>`:""}</div>`)}
const recipeAct=id=>RECIPES_MAKING[id]||RECIPES_USING[id]?'<button type="button" data-infoact="recipes">Recipes</button>':"";

function popMob(m){const r=mobRow(m,walkSec()),om=openMaps(m),s=cur(),inS=s.mobIds.includes(m.id),a=mobArrives(m);
  const sub=`Lv ${m.lv} · ${m.el?`<span class="el ${m.el}">${m.el} ${m.elv}</span>`:"element –"} · ${m.size||"size –"} · ${m.race||"race –"}${BOSS_PILL(m)}${m.agg?' <span class="pill">aggressive</span>':""}`;
  const tiles=infoTile("HP",fmtN(m.hp),`DEF ${m.def??"–"} · MDEF ${m.mdef??"–"} · ATK ${m.atkMin??"–"}–${m.atkMax??"–"}`)
    +infoTile("EXP",fmtExp(m),m.expUnknown?"no EXP data yet":`job ${fmtN(m.job)} · you get ${fmtN(killExp(m))} / ${fmtN(killJobExp(m))}`)
    +infoTile(`You (${esc(state.job)})`,isFinite(r.sec)?r.sec.toFixed(1)+"s / kill":"can't hurt",`your hit ${Math.round(r.mult)}% · ${Math.round(r.hitc)}% land · you dodge ${r.dodge??"–"}%`)
    +infoTile("EXP / min",m.expUnknown?"?":r.epm?fmtN(r.epm):"–",r.hpm==null?"":`HP lost ~${fmtN(r.hpm)}/min`)
    +infoTile("Zeny / kill",hasLoot(m)?fmtN(r.zk):"–",penNote(m)||"no drop level penalty")
    +infoTile("Best map",om.length?mapCode(om[0][0]):"–",om.length?`${esc(mapName(om[0][0]))} ≈${spN(om[0][1])}`:a?`none open · comes with the ${esc(a)}`:"none open");
  const drops=(m.drops||[]).slice().sort((x,y)=>(y[1]??-1)-(x[1]??-1)).map(([id,ch])=>`<div>${itemIcon(id,1,"il")}${infoLink(infoKind(id),id,itemName(id))} <span class="note">${chTxt(ch)}${yourCh(m,ch)!==ch?` (you ${chTxt(yourCh(m,ch))})`:""}${npcSell(id)>0?` · NPC ${fmtN(npcPays(id))} z`:""}${state.prices[id]>0?` · players ${fmtN(state.prices[id])} z`:""}${looted(id)?"":" · not looted"}</span></div>`).join("");
  const maps=(SPAWN[m.id]||[]).slice().sort((x,y)=>y[1]-x[1]).map(([mp,n])=>`<div><a href="#" data-infomap="${esc(mp)}" class="mono">${mapCode(mp)}</a> <span class="note">${esc(mapName(mp))} · ≈${spN(n)}</span>${isClosed(mp)?` <span class="pill down">closed${mapArrives(mp)?` · ${esc(mapArrives(mp).split(", ")[1])}`:""}</span>`:""}</div>`).join("");
  return {ico:"",title:m.name,sub,
    body:`<div class="calc">${tiles}</div>${infoSec("Drops",drops&&`<div class="infoList">${drops}</div>`)}${infoSec("Spawns",maps&&`<div class="infoList">${maps}</div>`)}`,
    acts:`${inS?'<span class="pill up">In this session</span>':`<button type="button" class="primary" data-infoact="farm">${s.mobIds.length?"Also killing it":"Farming it now"}</button>`}
      <button type="button" data-infoact="mobinfo">Monster info</button><a class="ext" href="${dbUrl(m)}" target="_blank" rel="noopener">rozerodb ↗</a>`}}

function popItem(id){const name=itemName(id);
  return {ico:itemIcon(id,1.5),title:name,sub:`#${id} · ${GROUP_NAME[groupOf(id)]}${looted(id)?"":" (not looted)"}`,
    body:infoPrice(id)+infoSec("Dropped by",infoDroppers(id))+(ITEM_DROPS[id]?"":'<div class="note">No monster the farm tables know drops it.</div>')+infoRecipes(id),
    acts:(ITEM_DROPS[id]?'<button type="button" data-infoact="items">Item info</button>':"")+recipeAct(id)}}

function popGear(id){const it=BUILD.item(id),fx=fxOf(it),c=C(),txt=itemText(id),worn=wornIn(c,it.id);
  const stats=[it.lv?`Lv ${it.lv}+`:"",it.slots?`[${it.slots}] card slot${it.slots>1?"s":""}`:"no card slots",it.atk?`ATK ${it.atk}`:"",it.matk?`MATK ${it.matk}`:"",it.def?`DEF ${it.def}`:"",
    it.wlv?`weapon Lv ${it.wlv}`:"",it.el&&it.el!=="neutral"?`${fxCap(it.el)} element`:"",it.w!=null?`${it.w} weight`:""].filter(Boolean).join(" · ");
  const ok=eqPlaces(it,state.job).length&&wearsJob(it,state.job);
  return {ico:iconHtml("gear",id,1.5),title:it.name,sub:`${esc(gearKind(it))} · #${id} · ${esc(jobsTxt(it))}${worn.map(x=>` <span class="pill up">${x}</span>`).join("")}`,
    body:`<div class="note mono">${esc(stats)}</div>${infoSec("Effects",fx.length?`<div class="infoList">${fx.map(x=>`<div>${esc(x)}</div>`).join("")}</div>`:"")}${infoSec("In-game text",txt&&`<div class="infoText">${esc(txt)}</div>`)}
      ${infoSec("Where to get",`<div class="infoFrom">${fromHtml(id)}</div>`)}${infoRecipes(id)}${ITEM_DROPS[id]?infoPrice(id):""}`,
    acts:`<button type="button" class="primary" data-infoact="equip"${ok?"":` disabled title="${esc(eqPlaces(it,state.job).length?`A ${state.job} can't wear it`:"Not something you wear")}"`}>Equip</button><button type="button" data-infoact="equiptab">Equipment tab</button>${recipeAct(id)}`}}

function popCard(id){const x=BUILD.item(id),fx=fxOf(x),c=C(),txt=itemText(id),worn=wornIn(c,x.id,true);
  return {ico:iconHtml("card",id),title:x.name,sub:`${CARD_PART[cardPart(x)]||"–"} card · #${id}${cardName(x)?` · names gear "${esc(cardName(x))}"`:""}${worn.map(w=>` <span class="pill up">${w}</span>`).join("")}`,
    body:`${infoSec("Effects",fx.length?`<div class="infoList">${fx.map(l=>`<div>${esc(l)}</div>`).join("")}</div>`:"")}${infoSec("In-game text",txt&&`<div class="infoText">${esc(txt)}</div>`)}
      ${infoSec("Where to get",`<div class="infoFrom">${fromHtml(id)}</div>`)}${ITEM_DROPS[id]?infoPrice(id):""}`,
    acts:`<button type="button" class="primary" data-infoact="equip"${cardPart(x)?"":' disabled title="Not a card that goes in gear"'}>Equip</button><button type="button" data-infoact="cardtab">Cards tab</button>`}}

function drawInfo(){const [kind,id]=INFO[INFO.length-1],m=kind==="mob"&&MOB_BY_ID.get(+id);
  const v=kind==="mob"?(m?popMob(m):null):kind==="gear"&&BUILD.item(+id)?popGear(+id):kind==="card"&&BUILD.item(+id)?popCard(+id):popItem(id);
  if(!v){INFO.pop();return}
  $("infoDlgIco").innerHTML=v.ico;$("infoDlgTitle").textContent=v.title;$("infoDlgSub").innerHTML=v.sub;
  $("infoDlgBody").innerHTML=v.body;$("infoDlgActs").innerHTML=v.acts;$("infoBack").hidden=INFO.length<2;
  $("infoDlgBody").scrollTop=0}
// kind "mob" or "item" (an item that's gear or a card shows as one)
function openInfo(kind,id){if(kind!=="mob")kind=infoKind(id);
  const d=$("infoDlg");if(!d.open)INFO=[];const top=INFO[INFO.length-1];if(!top||top[0]!==kind||String(top[1])!==String(id))INFO.push([kind,id]);
  drawInfo();if(!d.open)d.showModal()}
function infoAct(a){const [kind,id]=INFO[INFO.length-1],d=$("infoDlg");
  if(a==="farm"){toggleSessMob(+id);state.calcMobId=null;save();renderAll();drawInfo();showToast(`${MOB_BY_ID.get(+id).name} is in your session.`);return}
  d.close();
  if(a==="mobinfo"){state.infoMobId=+id;save();showTab("mobinfo");scrollTo({top:0})}
  else if(a==="items"){state.infoItem=String(id);save();showTab("items");renderItems();$("itemTiles").scrollIntoView({behavior:"smooth",block:"nearest"})}
  else if(a==="equip")openEquip(kind==="card"?"card":"item",+id);
  else if(a==="equiptab"){state.eqDb={...EQDB_D,job:"",q:"#"+id};save();showTab("equip");scrollTo({top:0})}
  else if(a==="cardtab"){state.cardDb={...CARDDB_D,q:"#"+id};save();showTab("cards");scrollTo({top:0})}
  else if(a==="recipes"){state.recipeDb={...RECIPEDB_D,q:"#"+id};save();showTab("recipes");scrollTo({top:0})}}
(function setupInfo(){const d=$("infoDlg");
  // anywhere on the page (capture, so a row's own click doesn't also run)
  document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-info]");if(!a)return;e.preventDefault();e.stopPropagation();
    const i=a.dataset.info.indexOf(":");openInfo(a.dataset.info.slice(0,i),a.dataset.info.slice(i+1))},true);
  d.addEventListener("click",e=>{if(e.target===d){d.close();return}
    const b=e.target.closest("[data-infoact]");if(b){infoAct(b.dataset.infoact);return}
    const mp=e.target.closest("[data-infomap]");if(mp){e.preventDefault();d.close();state.map=mp.dataset.infomap;save();showTab("maps");renderMap();$("mapCard").scrollIntoView({behavior:"smooth",block:"start"})}});
  d.addEventListener("change",e=>{const i=e.target.closest("[data-infoprice]");if(!i)return;const id=i.dataset.infoprice,v=Math.max(0,num(i.value));
    if(v>0)state.prices[id]=v;else delete state.prices[id];save();renderAll()});
  $("infoBack").addEventListener("click",()=>{INFO.pop();drawInfo()});
  $("infoDlgClose").addEventListener("click",()=>d.close());
})();
