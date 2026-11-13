// ---- tabs: show one group of sections at a time; the last one opened is remembered in state.tab (Home first for new players) ----
// local: show it in this browser tab only, without saving it (a reload that keeps this tab's view)
// the heading over each tab: its sidebar group, its name and what it's for
const TAB_DESC={
  home:"What the planner does, where you left off, and every tool in it.",
  char:"Your job, stats, gear and attack: everything the damage, EXP and zeny numbers work from. Back up or share the account at the bottom.",
  track:"Where to farm for your character, then log your EXP as you farm to see your real EXP/hr, when you'll level and how far your goals are.",
  maps:"Every map and monster: any map with its picture, NPCs and monsters, and every monster's drops, skills and spawns. With a character, your numbers against them.",
  star:"Not open in game yet (Taiwan Zero data). The ★ Forging Certificates each ★ weapon needs, where you'd farm its weapon fastest, and what Activation costs.",
  mem:"Jellostones from Poring Village, the Expedition gear they upgrade to, and the memorial dungeons' rewards and enchants.",
  news:"The latest game update: what spawns on its new maps, its bosses and cards, its gear and its events.",
  roadmap:"Ragnarok Zero Global's release roadmap: when each update comes, its level cap, and which maps and monsters are open now.",
  items:"Every drop: who drops it, where they spawn and what it's worth to you.",
  equip:"Every weapon and piece of armor: filter by type, job, level, card slots and stats, and put it in any of your gear sets.",
  skilltree:"Try any job's skill tree without a character: points per tree, the job level it needs, and what each skill does.",
  stylist:"Every job's clothes colours, hair styles and hair colours from the game client: try a look, then put it on your character.",
  affix:"The items that add a random option (affix) to gear: the gear each one works on, and the affixes players have seen it add.",
  cards:"Every card and what it does: filter by the gear it goes in, and slot it into your gear or another gear set.",
  brew:"Prepare Potion's chance for every potion with your stats, what a potion costs counting the failures, and a run of tries rolled the server's way.",
  cook:"Every dish's chance with each cooking kit for your stats, cook mastery, and a run of tries rolled the server's way.",
  recipes:"What every forge, brew, arrow, cooking, NPC and memorial recipe uses up.",
  market:"What players posted on your server (Skadi, Odin or Loki), with each item's lowest price, median and sellers to DM; and on My market, your own items, posts and prices.",
  exp:"Base and job EXP to each level, with kills of your monster per level. Every base table the game has used stays here: pick one and compare it with another.",
  ref:"Party share, the element and size tables, and every formula with your numbers in it.",
};
function showHero(t){
  const b=document.querySelector(`[data-tabbtn="${t}"]`);if(!b)return;
  const g=b.closest(".navSec");
  $("heroGrp").textContent=g?g.querySelector(".navGrp").textContent:"";$("heroTitle").textContent=b.querySelector("span").textContent;$("heroDesc").textContent=TAB_DESC[t]||"";
}
// a link to a tab: #memorial-dungeons (its name, any case) or #mem (its key); the address bar always shows the open tab's link, in
// lower case. A name goes before a key. The old Monster info and Maps tabs' links (#monster-info, #maps) open Monsters & maps,
// the old Account tab's (#account) Character, and the old EXP & formulas tab's (#exp-formulas) Formulas
const OLD_TAB={"monster-info":"maps",mobinfo:"maps",mapinfo:"maps",account:"char",acct:"char","exp-formulas":"ref"};
const tabSlug=t=>document.querySelector(`[data-tabbtn="${t}"] span`).textContent.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function hashTab(){let h="";try{h=decodeURIComponent(location.hash.slice(1)).toLowerCase()}catch(e){}if(!h)return null;
  const bs=[...document.querySelectorAll("[data-tabbtn]")],b=bs.find(b=>tabSlug(b.dataset.tabbtn)===h)||bs.find(b=>b.dataset.tabbtn===h);
  return b?b.dataset.tabbtn:OLD_TAB[h]||null}
function showTab(t,local){rowPass(()=>showTab0(t,local))}
function showTab0(t,local){
  if(t==="data"||t==="acct")t="char";// the old Data and Account tabs: the account and its backup are on the Character tab
  if(t==="mobinfo"||t==="mapinfo")t="maps";// the old Monster info and Maps tabs are Monsters & maps (a monster's details are its popup)
  if(![...document.querySelectorAll("[data-tabbtn]")].some(b=>b.dataset.tabbtn===t))t="home";
  document.querySelectorAll("[data-tab]").forEach(el=>el.hidden=!el.dataset.tab.split(" ").includes(t));TAB_ON=t;
  if(t==="maps")renderMobs();
  document.querySelectorAll("[data-tabbtn]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tabbtn===t)));
  // Home has its own heading (the hero) instead of the page heading
  // the get started card lives on Home only, so Character and Session open on their own tools (on a phone it filled the first screen)
  showHero(t);document.querySelector(".pageHead").hidden=t==="home";$("startCard").classList.toggle("offTab",t!=="home");
  // on phones the row of tabs scrolls sideways: keep the open one in view
  {const b=document.querySelector(`[data-tabbtn="${t}"]`),bar=b&&b.parentElement;if(bar&&bar.scrollWidth>bar.clientWidth)bar.scrollTo({left:b.offsetLeft-bar.clientWidth/2+b.offsetWidth/2})}
  // not save(): the open tab changes no card, so it leaves GEN (and the cards already drawn) alone
  if(!local&&state.tab!==t){state.tab=t;store.set(state)}
  // not over a share link (#s=…) that loadShareLink hasn't read yet
  if(location.hash!=="#"+tabSlug(t)&&!location.hash.startsWith("#s="))try{history.replaceState(null,"",location.pathname+location.search+"#"+tabSlug(t))}catch(e){}
  // Where to farm (its best spots show on Home too) after the tab has drawn. At load renderAll draws it just after this
  if(DREW_ALL&&(t==="home"||t==="track"))farmLater();
  if(t==="home")renderHome();if(t==="news")renderNews();if(t==="ref")renderRef();if(t==="exp"){renderExp();expScroll()}
  if(t==="char")renderGearCmp();
  // the Session charts were drawn while hidden (no width to measure): redraw them at the width they now have
  if(t==="track"){const c=$("chart");if(+c.clientWidth&&chartW(c)!==c.viewBox.baseVal.width)setTimeout(renderTracker)}
  // renderAll only draws these while their tab is showing; the big ones again only when something was saved since
  if(t==="market")renderPrices();if(t==="items")redraw("items",renderItems);if(t==="equip")redraw("equip",renderEquipDb);if(t==="cards")redraw("cards",renderCardDb);if(t==="recipes")redraw("recipes",renderRecipes);if(t==="brew")renderBrew();if(t==="cook")renderCook();if(t==="mem")renderMem();if(t==="star")renderStar();if(t==="affix")renderAffixItems();if(t==="skilltree")renderSkPlan(true);if(t==="stylist")renderStylist();
  // the section links, once the tab's cards are drawn (a card can hide as it draws, as the Market's two panes do)
  pageNav(t);
}
// opening Home or Session after a change: pricing every map for Where to farm takes a few hundred ms, so the tab shows first
// with the cards as they were (dimmed), and they're redrawn just after that paint (or after 300 ms where no frame comes, as in a
// background tab). Nothing to do when they're up to date
function farmLater(){const els=[$("farmCard")],due=()=>DRAWN.best!==GEN||TAB_ON==="track"&&DRAWN.hunt!==GEN;if(!due())return;
  els.forEach(el=>el.classList.add("stale"));let done=false;
  const go=()=>{if(done)return;done=true;els.forEach(el=>el.classList.remove("stale"));if(!["home","track"].includes(TAB_ON)||!due())return;
    rowPass(()=>{redraw("best",renderBest);if(TAB_ON==="track")redraw("hunt",renderHunt);if(TAB_ON==="home")renderHome()})};
  if(typeof requestAnimationFrame==="function")requestAnimationFrame(()=>setTimeout(go));setTimeout(go,300)}
document.querySelectorAll("[data-tabbtn]").forEach(b=>b.addEventListener("click",()=>{showTab(b.dataset.tabbtn);scrollTo({top:0})}));
// a link to another tab (data-gotab="roadmap")
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-gotab]");if(!a)return;e.preventDefault();showTab(a.dataset.gotab);
  // data-goto: a part of that tab, not its top
  const to=a.dataset.goto&&$(a.dataset.goto);if(!to){scrollTo({top:0});return}
  // a What's new section folded away opens first
  const sec=to.closest(".newsSec.collapsed");if(sec)sec.querySelector(".newsSecHead h2").click();
  const card=to.closest(".card.collapsed");if(card)card.querySelector("h2[aria-expanded]")?.click();
  (to.closest(".card")||to).scrollIntoView({block:"start"})});
// a popup link (#mob/1002) opens over the tab you were on once the page is drawn (showTab puts the tab's link in the address bar first)
const INFO_AT=hashInfo(location.hash);
// ---- every other tab's section links, as on Character and What's new (which have their own): the headings of the tab's cards, beside
// them on wide screens and a row of links above them on narrower ones; jump to one (opening it if folded), the one you're reading marked.
// Home and tabs of a single card have none ----
const PAGE_NAV_OFF=new Set(["home","char","news"]);
let PAGE_SECS=[];
const secHeading=el=>el.querySelector(":scope>h2, :scope>.bar>h2");
function pageNav(t){soloFold();const nav=$("pageNav");if(!nav)return;const wrap=nav.parentNode;
  const shown=el=>!el.hidden&&getComputedStyle(el).display!=="none";
  // a card's heading, or the headings of the cards inside a row of them (the Session tab's charts)
  const secs=PAGE_NAV_OFF.has(t)?[]:[...wrap.children].filter(el=>el.dataset.tab&&shown(el)).flatMap(el=>{const h=secHeading(el);
    return h?[[el,h]]:[...el.querySelectorAll(":scope>.card")].map(c=>[c,secHeading(c)]).filter(x=>x[1])});
  const on=secs.length>1;nav.hidden=!on;wrap.classList.toggle("hasPageNav",on);PAGE_SECS=on?secs.map(x=>x[0]):[];if(!on){nav.innerHTML="";if(typeof navSubs==="function")navSubs();return}
  secs.forEach(([el],i)=>{if(!el.id)el.id=`sec-${t}-${i}`});
  nav.innerHTML=`<span class="secHead">On this tab</span>`+secs.map(([el,h])=>`<a href="#${el.id}" data-psec="${el.id}">${esc(h.textContent.trim())}</a>`).join("");
  if(typeof navSubs==="function")navSubs();
  // beside the cards from the one under the heading down
  nav.style.gridRow=`2 / span ${Math.max(1,[...wrap.children].filter(el=>el!==nav&&!el.classList.contains("pageHead")&&shown(el)).length)}`;
  pageSpy()}
function pageSpy(){const nav=$("pageNav");if(!nav||nav.hidden)return;const links=[...nav.querySelectorAll("a")];let on=null;
  links.forEach((a,i)=>{if(!on||PAGE_SECS[i].getBoundingClientRect().top<=innerHeight*.3)on=a});
  links.forEach(a=>a.toggleAttribute("aria-current",a===on));
  if(on&&nav.scrollWidth>nav.clientWidth)nav.scrollTo({left:on.offsetLeft-nav.clientWidth/2+on.offsetWidth/2});
  if(typeof navSubSpy==="function")navSubSpy()}
{let raf=0;addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;pageSpy()})},{passive:true})}
$("pageNav").addEventListener("click",e=>{const a=e.target.closest("[data-psec]");if(!a)return;e.preventDefault();openCard($(a.dataset.psec))});
// the page hides its cards until it has loaded (index.html), so the first tab's sections are found once it has
if(document.readyState==="loading")addEventListener("DOMContentLoaded",()=>pageNav(TAB_ON));
// after a reload for another tab's save (VIEW) the tab it showed isn't saved again: that save would reload the other tab in turn
{const h=hashTab();showTab(h||VIEW&&VIEW.tab||state.tab||"home",!!VIEW)}
addEventListener("hashchange",()=>{const t=hashTab();if(t){showTab(t);scrollTo({top:0})}});
// ---- Home tab: the hero's numbers and next update, where you left off, and a card for every other tab (from the sidebar, so it
// keeps up with it) ----
(function setupHome(){
  let html="";
  for(const sec of document.querySelectorAll(".tabs .navSec")){
    html+=`<div class="toolGrp"><div class="secHead">${esc(sec.querySelector(".navGrp").textContent)}</div><div class="toolGrid">`;
    for(const el of sec.querySelectorAll("[data-tabbtn]")){const t=el.dataset.tabbtn;
      html+=`<button type="button" class="tool" data-gotab="${t}"><span class="toolIc">${el.querySelector("svg").outerHTML}</span><span class="toolTxt"><b>${esc(el.querySelector("span").textContent)}</b><span class="hint">${esc(TAB_DESC[t]||"")}</span></span></button>`}
    html+="</div></div>"}
  $("homeTools").innerHTML=html;
})();
function renderHome(){
  newsBanner();
  $("homeCharBtn").textContent=charSet(C())?"Open Character":"Set up your character";
}
// ---- collapsible cards: click a heading (or Enter/Space on it) to fold the card; saved by heading text. A card that's the only
// one showing on its tab doesn't fold (soloFold): it shows even if you folded it before, and its heading goes when it only says the
// tab's name again (Roadmap, Item info, Brewing simulator…), the rest of its row (counts, buttons) staying ----
function foldCard(card){const h=card.querySelector(":scope>h2, :scope>.bar>h2");if(!h||h.classList.contains("foldHead"))return;
    if(!state.collapsed)state.collapsed={};
    const head=h.parentElement===card?h:h.parentElement;head.classList.add("cardHead");h.classList.add("foldHead");const key=h.textContent.trim();
    const set=v=>{card.classList.toggle("collapsed",v);h.setAttribute("aria-expanded",String(!v))};
    const flip=()=>{if(card.classList.contains("solo"))return;const v=!card.classList.contains("collapsed");state.collapsed[key]=v;if(!v)delete state.collapsed[key];save();set(v)};
    card.foldSolo=solo=>{card.classList.toggle("solo",solo);
      const tab=$("heroTitle").textContent.trim().toLowerCase(),name=key.toLowerCase();h.hidden=solo&&(name===tab||name.startsWith(tab+" "));
      if(solo){card.classList.remove("collapsed");h.removeAttribute("aria-expanded");h.removeAttribute("role");h.removeAttribute("tabindex")}
      else{h.tabIndex=0;h.setAttribute("role","button");set(!!state.collapsed[key])}};
    card.foldSolo(false);
    h.addEventListener("click",flip);h.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip()}})}
function soloFold(){const cards=[...document.querySelectorAll(".foldHead")].map(h=>h.closest(".card")),solo=cards.filter(c=>c.getClientRects().length);
  cards.forEach(c=>{const v=solo.length===1&&c===solo[0];if(c.classList.contains("solo")!==v)c.foldSolo(v)})}
document.querySelectorAll(".card:not(#acctCard):not(#newsHead)").forEach(foldCard);
// go to a card on the open tab, unfolding it
function openCard(c){if(c.classList.contains("collapsed"))c.querySelector("h2[aria-expanded]")?.click();c.scrollIntoView({behavior:"smooth",block:"start"})}
// ---- Character tab's section links: jump to a section (opening it if folded), mark the one you're reading, and hide the links of
// sections that are hidden (Gear outside build mode, Equipment stats in it, Sage options for other jobs) ----
(function setupSecNav(){
  const links=[...document.querySelectorAll("[data-sec]")],tgt=a=>$(a.dataset.sec);if(!links.length)return;
  const sync=()=>links.forEach(a=>{const t=tgt(a);a.hidden=!t||t.hidden||!!t.closest("[hidden]:not([data-tab])")});
  links.forEach(a=>a.addEventListener("click",e=>{e.preventDefault();const t=tgt(a);if(!t)return;
    if(t.tagName==="DETAILS")t.open=true;
    const card=t.closest(".card.collapsed");if(card)card.querySelector("h2[aria-expanded]")?.click();
    t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth",block:"start"})}));
  // the section you're reading: the last one whose top has passed a third of the way down the window
  let raf=0;const spy=()=>{raf=0;if($("charCard").closest("[data-tab]").hidden)return;let on=null;
    for(const a of links)if(!a.hidden&&(!on||tgt(a).getBoundingClientRect().top<=innerHeight*.3))on=a;
    links.forEach(a=>a.toggleAttribute("aria-current",a===on));
    // as a row of links (narrower screens) keep the marked one in view
    const nav=on&&on.parentElement;if(nav&&nav.scrollWidth>nav.clientWidth)nav.scrollTo({left:on.offsetLeft-nav.clientWidth/2+on.offsetWidth/2})};
  addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(spy)},{passive:true});
  const mo=new MutationObserver(()=>{sync();spy()});
  links.forEach(a=>{const t=tgt(a);if(t)for(let e=t;e&&!e.dataset?.tab;e=e.parentElement)mo.observe(e,{attributes:true,attributeFilter:["hidden"]})});
  sync();spy();
})();
// ---- get started card: its buttons take you to each step; × hides it in this browser ----
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",e=>{const g=b.dataset.go;
  if(g==="log"){e.stopPropagation();openQuickLog(true);return}
  // Find a spot: Where to farm, on the Session tab
  if(g==="farm"){showTab("track");openCard($("farmCard"));return}
  showTab(g);scrollTo({top:0})}));
$("startHide").addEventListener("click",()=>{try{localStorage.setItem(KEY_START,"1")}catch(e){}renderStart()});
// ---- search (Ctrl+K or /): tabs, a few actions, every monster, dropped item and map; Enter opens it where it lives ----
(function setupJump(){
  const dlg=$("jump"),inp=$("jumpInput"),list=$("jumpList");let hits=[],at=0;
  const tabName=t=>document.querySelector(`[data-tabbtn="${t}"] span`).textContent;
  const go=(tab,fn)=>()=>{showTab(tab);scrollTo({top:0});if(fn)setTimeout(fn,30)};
  const ACTIONS=[
    {k:"Action",name:"Log EXP",meta:"+ button · L",run:()=>openQuickLog(true),ok:()=>!atMaxLv()},
    {k:"Action",name:"Switch theme",meta:"auto → light → dark",run:()=>$("themeBtn").click()},
    {k:"Action",name:"Show or hide hints",meta:"help text under the cards",run:()=>$("hintBtn").click()},
    {k:"Action",name:"Show or hide future content",meta:"Contingent and Conqueror gear",run:()=>$("futureBtn").click()},
    {k:"Action",name:"New session",meta:"Session tab",run:()=>$("newSession").click()}];
  let ALL=null;
  // gear and cards are listed once, as Gear or Card (with what drops them), not again as an Item
  const GC=new Set([...(typeof EQUIP!=="undefined"?EQUIP:[]).filter(it=>(it.slot||[]).length).map(it=>String(it.id)),...(typeof CARDS!=="undefined"?CARDS:[]).map(x=>String(x.id))]);
  const dropTxt=id=>ITEM_DROPS[id]?` · dropped by ${ITEM_DROPS[id].length}`:"";
  const build=()=>ALL=[
    ...[...document.querySelectorAll("[data-tabbtn]")].map(b=>({k:"Tab",name:tabName(b.dataset.tabbtn),meta:TAB_DESC[b.dataset.tabbtn]||"",run:go(b.dataset.tabbtn)})),
    ...ACTIONS,
    ...MOBS.map(m=>({k:"Monster",name:m.name,meta:`Lv ${m.lv}${m.el?` · ${m.el} ${m.elv}`:""}${m.race?` · ${m.race}`:""}${m.mvp?" · MVP":m.boss||m.mini?" · boss":""}${MOB_VARIANT[m.id]?" · "+MOB_VARIANT[m.id]:""}`,mob:m.id,
      run:()=>openInfo("mob",m.id)})),
    ...Object.keys(ITEM_DROPS).filter(id=>!GC.has(id)).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · dropped by ${ITEM_DROPS[id].length}`,ico:id,
      run:()=>openInfo("item",id)})),
    // crafted items no monster drops (potions, arrows, food, forged weapons that aren't in the gear list)
    ...Object.keys(RECIPES_MAKING).filter(id=>!ITEM_DROPS[id]&&!BUILD.item(+id)&&!GC.has(id)).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · ${RECIPES_MAKING[id][0].cat.toLowerCase()} recipe`,ico:id,
      run:()=>openInfo("item",id)})),
    // every other item in the client, the memorial ones and the recovery and skill items (Mithril Ore, Jello Fragments, costumes)
    ...allItemIds().filter(id=>!ITEM_DROPS[id]&&!RECIPES_MAKING[id]&&!GC.has(String(id))).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · ${MEM_ITEMN[id]?"memorial item":(clientCat(id)||"item").toLowerCase()}`,ico:id,
      run:()=>openInfo("item",id)})),
    ...(typeof EQUIP!=="undefined"?EQUIP:[]).filter(it=>(it.slot||[]).length).map(it=>({k:"Gear",name:it.name,meta:`#${it.id} · ${gearKind(it)}${it.slots?` [${it.slots}]`:""}${dropTxt(it.id)}`,ico:it.id,
      run:()=>openInfo("item",it.id)})),
    ...(typeof CARDS!=="undefined"?CARDS:[]).map(x=>({k:"Card",name:x.name,meta:`#${x.id} · ${CARD_PART[cardPart(x)]||"–"}${cardName(x)?` · ${cardName(x)}`:""}${notInGame(x.id)?" · not in game yet":""}${dropTxt(x.id)}`,ico:x.id,
      run:()=>openInfo("item",x.id)})),
    ...Object.keys(MAPNAMES).map(mp=>({k:"Map",name:mapName(mp)||mapCode(mp),meta:mapCode(mp),alt:mp,
      run:go("maps",()=>{state.map=mp;save();renderMap();$("mapCard").scrollIntoView({behavior:"smooth",block:"start"})})}))];
  // best first: the name starts with it, then a word in it does, then it's anywhere (name, map code, item #id)
  const score=(x,q)=>{const n=x.name.toLowerCase(),o=(x.meta+" "+(x.alt||"")).toLowerCase();
    return n===q?0:n.startsWith(q)?1:(" "+n).includes(" "+q)?2:n.includes(q)?3:o.includes(q)?4:9};
  const draw=()=>{const q=inp.value.trim().toLowerCase();if(!ALL)build();
    hits=q?ALL.filter(x=>!x.ok||x.ok()).map(x=>[score(x,q),x]).filter(([v])=>v<9).sort((a,b)=>a[0]-b[0]||a[1].name.length-b[1].name.length).slice(0,40).map(([,x])=>x)
      :ALL.filter(x=>(x.k==="Tab"||x.k==="Action")&&(!x.ok||x.ok()));
    at=0;list.innerHTML=hits.length?hits.map((x,i)=>`<button type="button" role="option" class="jr" data-i="${i}" aria-selected="${i===at}"><span class="jk k${x.k}">${x.k}</span><span class="jn">${x.mob!=null?mobIcon(x.mob,1,"il"):x.ico!=null?itemIcon(x.ico,1,"il"):""}${esc(x.name)}</span><span class="jm">${esc(x.meta)}</span></button>`).join("")
      :`<div class="jEmpty">Nothing matches “${esc(inp.value.trim())}”.</div>`};
  const mark=()=>list.querySelectorAll(".jr").forEach((b,i)=>{b.setAttribute("aria-selected",String(i===at));if(i===at)b.scrollIntoView({block:"nearest"})});
  const pick=i=>{const x=hits[i];if(!x)return;dlg.close();x.run()};
  // q: text already typed (Home's search bar hands over what you type there)
  const open=(q="")=>{if(dlg.open)return;inp.value=typeof q==="string"?q:"";draw();dlg.showModal();inp.focus()};
  // Home's search bar: a click or a key in it opens the search with what's typed
  {const hs=$("homeSearch");hs.addEventListener("click",()=>{open(hs.value);hs.value=""});
   hs.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();open(hs.value+(e.key==="Enter"?"":e.key));hs.value=""}})}
  $("searchBtn").addEventListener("click",()=>open());
  inp.addEventListener("input",draw);
  inp.addEventListener("keydown",e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(hits.length){at=(at+(e.key==="ArrowDown"?1:hits.length-1))%hits.length;mark()}}
    else if(e.key==="Enter"){e.preventDefault();pick(at)}});
  list.addEventListener("click",e=>{const b=e.target.closest(".jr");if(b)pick(+b.dataset.i)});
  list.addEventListener("pointermove",e=>{const b=e.target.closest(".jr");if(b&&+b.dataset.i!==at){at=+b.dataset.i;mark()}});
  dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
  addEventListener("keydown",e=>{const a=document.activeElement,typing=a&&(/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)||a.isContentEditable);
    if((e.key==="k"||e.key==="K")&&(e.ctrlKey||e.metaKey)){e.preventDefault();dlg.open?dlg.close():open()}
    else if(e.key==="/"&&!typing&&!e.ctrlKey&&!e.metaKey){e.preventDefault();open()}});
})();
// ---- Settings menu (sidebar): hints, theme and full width. The ⋯ menu code in events.js opens and closes it; its items keep it open ----
// ---- full width: a per-device display choice kept outside the account saves (index.html applies it before the page draws) ----
(function setupWide(){
  const KEY_WIDE="rozero-farm-planner-wide",btn=$("wideBtn");
  const set=v=>{document.documentElement.classList.toggle("wide",v);btn.setAttribute("aria-pressed",String(v));btn.querySelector("span").textContent=`Full width: ${v?"on":"off"}`};
  set(document.documentElement.classList.contains("wide"));
  btn.addEventListener("click",()=>{const v=btn.getAttribute("aria-pressed")!=="true";set(v);try{v?localStorage.setItem(KEY_WIDE,"1"):localStorage.removeItem(KEY_WIDE)}catch(e){}});
})();
// ---- compact sidebar: icons only, per device like full width ----
(function setupCompact(){
  const KEY_COMPACT="rozero-farm-planner-compact",btn=$("sideBtn");
  const set=v=>{document.documentElement.classList.toggle("compact",v);btn.setAttribute("aria-pressed",String(v));
    btn.querySelector("span").textContent=v?"Expand sidebar":"Compact sidebar";btn.title=v?"Show the sidebar's labels":"Shrink the sidebar to icons"};
  set(document.documentElement.classList.contains("compact"));
  btn.addEventListener("click",()=>{const v=btn.getAttribute("aria-pressed")!=="true";set(v);try{v?localStorage.setItem(KEY_COMPACT,"1"):localStorage.removeItem(KEY_COMPACT)}catch(e){}});
})();
// ---- the main nav's levels. A desktop window (from 1024px): the sidebar, with the open tab's group listed and the open tab's sections
// under it (the cards' headings, which the page's own section links then leave to it); another group's heading unfolds it in place
// (remembered per device, like full width); the compact sidebar keeps its column of icons. A narrower window or a phone: Home and a
// menu for each group along the top ----
const KEY_NAVOPEN="rozero-farm-planner-navopen";
// functions, not consts: the first tab shows (pageNav, navSubs) before this part of the file has run
function navBig(){return typeof matchMedia==="function"&&matchMedia("(min-width:1024px)").matches}
function navSide(){return navBig()}
function navTop(){return !navBig()}
let NAV_OPENED=0;
function navClose(except){document.querySelectorAll(".tabs .navSec.open").forEach(s=>{if(s===except)return;s.classList.remove("open");s.querySelector(".navGrp").setAttribute("aria-expanded","false");navPop(s.querySelector(".navItems"),false)})}
// an open menu along the top goes in the top layer (a manual popover): the row it hangs from scrolls sideways, and iOS Safari clips a
// fixed child of a scrolling box to that box, so the menu showed as a sliver under the row. Only while open: the sidebar's groups are
// the same elements, and a popover that isn't showing is hidden
function navPop(m,on){if(!m||typeof m.showPopover!=="function")return;
  if(on){m.setAttribute("popover","manual");try{m.showPopover()}catch(e){}}
  else if(m.hasAttribute("popover")){try{m.hidePopover()}catch(e){}m.removeAttribute("popover")}}
// the open tab's sections under it in the sidebar: copies of the page's section links (Character's own, or the other tabs'); a click goes
// through the page's link, so it jumps and opens a folded card the same way, and the one you're reading is marked as there
// each group heading's aria-expanded: is its group showing (the sidebar) or its menu open (along the top)
function navAria(){document.querySelectorAll(".tabs .navSec").forEach(s=>{const items=s.querySelector(".navItems");
  s.querySelector(".navGrp").setAttribute("aria-expanded",String(navSide()?getComputedStyle(items).display!=="none":s.classList.contains("open")))})}
function navSubs(){const old=document.querySelector(".tabs .navSubs");if(old)old.remove();
  // a tab opened in a folded group unfolds it
  document.querySelectorAll(".tabs .navSec.shut").forEach(s=>s.classList.remove("shut"));if(typeof getComputedStyle==="function")navAria();
  const b=document.querySelector('.tabs [aria-selected="true"]');if(!b||!navSide()||document.documentElement.classList.contains("compact"))return;
  const t=b.dataset.tabbtn,src=t==="char"?document.querySelector('.secNav[aria-label="Character sections"]'):t==="news"?null:$("pageNav");
  const links=src&&!src.hidden?[...src.querySelectorAll("a")].filter(a=>!a.hidden):[];if(links.length<2)return;
  const d=document.createElement("div");d.className="navSubs";d.setAttribute("aria-label",`${b.querySelector("span").textContent} sections`);
  d.innerHTML=links.map((a,i)=>`<a href="${esc(a.getAttribute("href")||"#")}" data-navsub="${i}">${esc(a.textContent)}</a>`).join("");
  d._src=links;b.after(d);navSubSpy()}
// the Character tab's section links (fixed in the page): a card your job hasn't (Sage) or that's hidden leaves its link out, on the
// page and in the sidebar
let SEC_SHOWN="";
function secNavSync(){const nav=document.querySelector('.secNav[aria-label="Character sections"]');if(!nav)return;
  const as=[...nav.querySelectorAll("a[data-sec]")];as.forEach(a=>{const el=$(a.dataset.sec);a.hidden=!el||!!el.closest("[hidden]")});
  const k=as.map(a=>a.hidden?0:1).join("");if(k!==SEC_SHOWN){SEC_SHOWN=k;if(typeof navSubs==="function")navSubs()}}
function navSubSpy(){const d=document.querySelector(".tabs .navSubs");if(!d)return;d.querySelectorAll("a").forEach((a,i)=>a.toggleAttribute("aria-current",!!d._src[i]&&d._src[i].hasAttribute("aria-current")))}
(function setupNav(){
  const tabs=document.querySelector(".tabs");
  tabs.addEventListener("click",e=>{
    const sub=e.target.closest("[data-navsub]");if(sub){e.preventDefault();const d=sub.parentNode,a=d._src&&d._src[+sub.dataset.navsub];if(a)a.click();return}
    const g=e.target.closest(".navGrp");
    if(!g){if(e.target.closest("[data-tabbtn]"))navClose();return}
    const sec=g.parentNode;
    // the sidebar: the heading folds or unfolds its group in place
    if(navSide()){if(document.documentElement.classList.contains("compact"))return;
      if(sec.querySelector('[aria-selected="true"]'))sec.classList.toggle("shut");else sec.classList.toggle("exp");navAria();
      try{localStorage.setItem(KEY_NAVOPEN,JSON.stringify([...document.querySelectorAll(".tabs .navSec.exp")].map(s=>s.querySelector(".navGrp").textContent)))}catch(e){}
      return}
    const open=!sec.classList.contains("open");navClose(sec);if(open)NAV_OPENED=Date.now();sec.classList.toggle("open",open);g.setAttribute("aria-expanded",String(open));
    // fixed under its heading, as the row along the top scrolls (and would clip it)
    if(open){const r=g.getBoundingClientRect(),m=sec.querySelector(".navItems");navPop(m,true);
      m.style.left=`${Math.round(Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8)))}px`;m.style.top=`${Math.round(r.bottom+6)}px`}});
  {let open=[];try{open=JSON.parse(localStorage.getItem(KEY_NAVOPEN))||[]}catch(e){}
   document.querySelectorAll(".tabs .navSec").forEach(s=>s.classList.toggle("exp",open.includes(s.querySelector(".navGrp").textContent)))}
  document.addEventListener("pointerdown",e=>{if(!e.target.closest(".tabs .navSec"))navClose()},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")navClose()});
  addEventListener("resize",()=>{navClose();navSubs()});
  // scrolling moves a menu's heading away from it: the menu closes, but not for the scroll that brought the heading into view to open it
  const onScroll=()=>{if(Date.now()-NAV_OPENED>400)navClose()};
  tabs.addEventListener("scroll",onScroll,{passive:true});
  addEventListener("scroll",()=>{if(navTop())onScroll()},{passive:true});
  if(typeof matchMedia==="function")matchMedia("(min-width:1024px)").addEventListener("change",()=>{navClose();navSubs()});
  // the compact sidebar switched: the nav changes shape (the page's other classes, as scrolling's, don't)
  {const cls=document.documentElement.classList,shape=()=>String(cls.contains("compact"));let was=shape();
   if(typeof MutationObserver==="function")new MutationObserver(()=>{if(shape()===was)return;was=shape();navClose();navSubs()}).observe(document.documentElement,{attributes:true,attributeFilter:["class"]})}
  navSubs();
  {let raf=0;addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;navSubSpy()})},{passive:true})}
})();
// ---- hints: the help text under the cards, off by default, per device like full width ----
(function setupHints(){
  const KEY_HINTS="rozero-farm-planner-hints",btn=$("hintBtn");
  const set=v=>{document.documentElement.classList.toggle("nohints",!v);btn.setAttribute("aria-pressed",String(v));btn.querySelector("span").textContent=`Hints: ${v?"on":"off"}`};
  set(!document.documentElement.classList.contains("nohints"));
  btn.addEventListener("click",()=>{const v=btn.getAttribute("aria-pressed")!=="true";set(v);try{v?localStorage.setItem(KEY_HINTS,"1"):localStorage.removeItem(KEY_HINTS)}catch(e){}});
})();
// ---- colour theme: auto (follows the device) → light → dark, per device like full width ----
(function setupTheme(){
  const KEY_THEME="rozero-farm-planner-theme",btn=$("themeBtn"),root=document.documentElement,NEXT={auto:"light",light:"dark",dark:"auto"};
  const set=t=>{t==="auto"?delete root.dataset.theme:root.dataset.theme=t;btn.querySelector("span").textContent=`Theme: ${t}`;
    btn.title=t==="auto"?"Colour theme: follows your device":`Colour theme: always ${t}`};
  set(root.dataset.theme||"auto");
  btn.addEventListener("click",()=>{const t=NEXT[root.dataset.theme||"auto"];set(t);try{t==="auto"?localStorage.removeItem(KEY_THEME):localStorage.setItem(KEY_THEME,t)}catch(e){}});
})();
// ---- start ----
syncClosed();syncChar();renderAll();resetForm();
if(VIEW){if(VIEW.drafts)for(const id in VIEW.drafts)if(["fPct","fJob","pasteBox"].includes(id)&&typeof VIEW.drafts[id]==="string")$(id).value=VIEW.drafts[id];
  if($("pasteBox").value)$("pasteMore").open=true;
  if(VIEW.y>0)scrollTo({top:VIEW.y})}
// ---- other browser tabs: when another tab saves this account it reloads with that save (at once if it's showing, else when you come
// back to it; a save of its own before then merges, see state.js). A change to the account list makes it stop saving and reload ----
(function syncTabs(){let newer=false;
  const refresh=()=>reloadView("Updated from another tab");
  // a save that only changed the page tab open there (and its revision): nothing to reload for, so this tab takes it as read
  const bare=raw=>{try{const o=JSON.parse(raw);delete o.tab;delete o.rev;return JSON.stringify(o)}catch(e){return null}};
  const onlyTab=raw=>{const a=bare(raw);return a!=null&&a===bare(LAST_RAW)};
  addEventListener("storage",e=>{if(e.storageArea!==localStorage)return;
    if(e.key===null||e.key===ACCT_KEY)STALE=true;
    else if(e.key===acctKey(accts.active)){if(e.newValue===LAST_RAW)return;
      if(!newer&&onlyTab(e.newValue)){LAST_RAW=e.newValue;state.rev=revOf(JSON.parse(e.newValue));return}
      newer=true}
    else return;
    if(!document.hidden)refresh()});
  document.addEventListener("visibilitychange",()=>{if((STALE||newer)&&!document.hidden)refresh()});
})();
if(VIEW&&VIEW.toast)showToast(String(VIEW.toast));
(function tripLoop(){tickTrip();setTimeout(tripLoop,1000)})();
loadShareLink();addEventListener("hashchange",loadShareLink);
if(INFO_AT)openInfo(...INFO_AT);
// a skill link (#skill/knight/bowling-bash): the Skill tree tab on that job, its details pinned
if(SKILL_AT)openSkill(...SKILL_AT);
// ---- phones: the Log EXP + button slides away while you scroll down (it sat over the Farm here buttons) and back when you scroll up ----
(function fabScroll(){if(typeof scrollY!=="number"||typeof requestAnimationFrame!=="function")return;let y=scrollY,raf=0;
  addEventListener("scroll",()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const d=scrollY-y;
    if(Math.abs(d)<8)return;document.documentElement.classList.toggle("scrollDown",d>0&&scrollY>80);y=scrollY})},{passive:true})})();
