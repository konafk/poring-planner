// ---- tabs: show one group of sections at a time; the last one opened is remembered in state.tab (Home first for new players) ----
// local: show it in this browser tab only, without saving it (a reload that keeps this tab's view)
// the heading over each tab: its sidebar group, its name and what it's for
const TAB_DESC={
  home:"What the planner does, where you left off, and every tool in it.",
  char:"Your job, stats, gear and attack: everything the damage, EXP and zeny numbers work from.",
  track:"Log your EXP as you farm to see your real EXP/hr, when you'll level and how far your goals are.",
  maps:"The best maps for your character by EXP or zeny, and one click to farm one. Then the map planner and every monster.",
  star:"Not open in game yet (Taiwan Zero data). The ★ Forging Certificates each ★ weapon needs, where you'd farm its weapon fastest, and what Activation costs.",
  mem:"Jellostones from Poring Village, the Expedition gear they upgrade to, and the memorial dungeons' rewards and enchants.",
  news:"The latest game update: what spawns on its new maps, its bosses and cards, its gear and its events.",
  roadmap:"Ragnarok Zero Global's release roadmap: when each update comes, its level cap, and which maps and monsters are open now.",
  mobinfo:"Drops, spawn maps and your numbers against any monster.",
  items:"Every drop: who drops it, where they spawn and what it's worth to you.",
  mapinfo:"Every map on the game's world map: its picture, the monsters on it and when it opens.",
  equip:"Every weapon and piece of armor: filter by type, job, level, card slots and stats, and put it in any of your gear sets.",
  skilltree:"Try any job's skill tree without a character: points per tree, the job level it needs, and what each skill does.",
  stylist:"Every job's clothes colours, hair styles and hair colours from the game client: try a look, then put it on your character.",
  cards:"Every card and what it does: filter by the gear it goes in, and slot it into your gear or another gear set.",
  brew:"Prepare Potion's chance for every potion with your stats, what a potion costs counting the failures, and a run of tries rolled the server's way.",
  cook:"Every dish's chance with each cooking kit for your stats, cook mastery, and a run of tries rolled the server's way.",
  recipes:"What every forge, brew, arrow, cooking, NPC and memorial recipe uses up.",
  market:"The prices players pay, and a timer that tells you when to go sell.",
  ref:"EXP tables, party share, the element and size tables, and every formula with your numbers in it.",
  acct:"Back up every account, restore one, or share it as a link. Everything is saved in this browser only.",
};
function showHero(t){
  const b=document.querySelector(`[data-tabbtn="${t}"]`);if(!b)return;
  let g=b.previousElementSibling;while(g&&!g.classList.contains("navGrp"))g=g.previousElementSibling;
  $("heroGrp").textContent=g?g.textContent:"";$("heroTitle").textContent=b.querySelector("span").textContent;$("heroDesc").textContent=TAB_DESC[t]||"";
}
// a link to a tab: #memorial-dungeons (its name, any case) or #mem (its key); the address bar always shows the open tab's link, in
// lower case. A name goes before a key: #maps is the Maps tab, not Monsters & maps (key maps)
const tabSlug=t=>document.querySelector(`[data-tabbtn="${t}"] span`).textContent.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function hashTab(){let h="";try{h=decodeURIComponent(location.hash.slice(1)).toLowerCase()}catch(e){}if(!h)return null;
  const bs=[...document.querySelectorAll("[data-tabbtn]")],b=bs.find(b=>tabSlug(b.dataset.tabbtn)===h)||bs.find(b=>b.dataset.tabbtn===h);
  return b?b.dataset.tabbtn:null}
function showTab(t,local){rowPass(()=>showTab0(t,local))}
function showTab0(t,local){
  if(t==="data")t="acct";// the old Data tab is the Account tab
  if(![...document.querySelectorAll("[data-tabbtn]")].some(b=>b.dataset.tabbtn===t))t="home";
  // a card can sit on several tabs (data-tab="maps mobinfo mapinfo"): the Monsters card goes under Monster info there, under the Maps card on Maps, and back under the Map planner on Monsters & maps
  document.querySelectorAll("[data-tab]").forEach(el=>el.hidden=!el.dataset.tab.split(" ").includes(t));TAB_ON=t;
  if(t==="mobinfo")$("mobInfoCard").after($("mobCard"));else if(t==="mapinfo")$("mapInfoCard").after($("mobCard"));else if(t==="maps")$("mapCard").after($("mobCard"));
  // the Monsters card keeps to the Maps tab's map there (renderMapInfo draws it) and has every monster again on the other two
  if(t==="mobinfo"||t==="maps")renderMobs();
  document.querySelectorAll("[data-tabbtn]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tabbtn===t)));
  // Home has its own heading (the hero) instead of the page heading
  showHero(t);document.querySelector(".pageHead").hidden=t==="home";$("startCard").classList.toggle("offTab",!["home","char","track","maps"].includes(t));
  // not save(): the open tab changes no card, so it leaves GEN (and the cards already drawn) alone
  if(!local&&state.tab!==t){state.tab=t;store.set(state)}
  // not over a share link (#s=…) that loadShareLink hasn't read yet
  if(location.hash!=="#"+tabSlug(t)&&!location.hash.startsWith("#s="))try{history.replaceState(null,"",location.pathname+location.search+"#"+tabSlug(t))}catch(e){}
  // Where to farm (its best spots show on Home too) after the tab has drawn. At load renderAll draws it just after this
  if(DREW_ALL&&(t==="home"||t==="maps"))farmLater();
  if(t==="home")renderHome();if(t==="news")renderNews();if(t==="ref"){renderRef();refScroll()}
  if(t==="char")renderGearCmp();
  // the Session charts were drawn while hidden (no width to measure): redraw them at the width they now have
  if(t==="track"){const c=$("chart");if(+c.clientWidth&&chartW(c)!==c.viewBox.baseVal.width)setTimeout(renderTracker)}
  // renderAll only draws these while their tab is showing; the big ones again only when something was saved since
  if(t==="market")renderPrices();if(t==="mobinfo")redraw("mobinfo",renderMobInfo);if(t==="items")redraw("items",renderItems);if(t==="equip")redraw("equip",renderEquipDb);if(t==="cards")redraw("cards",renderCardDb);if(t==="recipes")redraw("recipes",renderRecipes);if(t==="brew")renderBrew();if(t==="cook")renderCook();if(t==="mem")renderMem();if(t==="star")renderStar();if(t==="skilltree")renderSkPlan(true);if(t==="stylist")renderStylist();if(t==="mapinfo")renderMapInfo();
}
// opening Home or Monsters & maps after a change: pricing every map for Where to farm takes a few hundred ms, so the tab shows first
// with the cards as they were (dimmed), and they're redrawn just after that paint (or after 300 ms where no frame comes, as in a
// background tab). Nothing to do when they're up to date
function farmLater(){const els=[$("farmCard"),$("homeSpots")],due=()=>DRAWN.best!==GEN||TAB_ON==="maps"&&DRAWN.hunt!==GEN;if(!due())return;
  els.forEach(el=>el.classList.add("stale"));let done=false;
  const go=()=>{if(done)return;done=true;els.forEach(el=>el.classList.remove("stale"));if((TAB_ON!=="home"&&TAB_ON!=="maps")||!due())return;
    rowPass(()=>{redraw("best",renderBest);if(TAB_ON==="maps")redraw("hunt",renderHunt);if(TAB_ON==="home")renderHome()})};
  if(typeof requestAnimationFrame==="function")requestAnimationFrame(()=>setTimeout(go));setTimeout(go,300)}
document.querySelectorAll("[data-tabbtn]").forEach(b=>b.addEventListener("click",()=>{showTab(b.dataset.tabbtn);scrollTo({top:0})}));
// a link to another tab (data-gotab="roadmap")
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-gotab]");if(!a)return;e.preventDefault();showTab(a.dataset.gotab);
  // data-goto: a part of that tab, not its top
  const to=a.dataset.goto&&$(a.dataset.goto);if(to)(to.closest(".card")||to).scrollIntoView({block:"start"});else scrollTo({top:0})});
// a popup link (#mob/1002) opens over the tab you were on once the page is drawn (showTab puts the tab's link in the address bar first)
const INFO_AT=hashInfo(location.hash);
{const h=hashTab();showTab(h||VIEW&&VIEW.tab||state.tab||"home",!h&&!!VIEW)}
addEventListener("hashchange",()=>{const t=hashTab();if(t){showTab(t);scrollTo({top:0})}});
// ---- Home tab: the hero's numbers and next update, where you left off, and a card for every other tab (from the sidebar, so it
// keeps up with it) ----
(function setupHome(){
  let grp="",html="";
  for(const el of document.querySelector(".tabs").children){
    if(el.classList.contains("navGrp")){html+=`${grp?"</div></div>":""}<div class="toolGrp"><div class="secHead">${esc(el.textContent)}</div><div class="toolGrid">`;grp=el.textContent;continue}
    const t=el.dataset.tabbtn;if(!t||t==="home")continue;
    html+=`<button type="button" class="tool" data-gotab="${t}"><span class="toolIc">${el.querySelector("svg").outerHTML}</span><span class="toolTxt"><b>${esc(el.querySelector("span").textContent)}</b><span>${esc(TAB_DESC[t]||"")}</span></span></button>`}
  $("homeTools").innerHTML=html+(grp?"</div></div>":"");
  const n=[[MOBS.length,"monsters"],[Object.keys(MAPMOBS).length,"spawn maps"],[allItemIds().length,"items"],[typeof CARDS!=="undefined"?CARDS.length:0,"cards"],[Object.keys(RECIPES_MAKING).length,"recipes"]];
  $("homeCounts").innerHTML=n.filter(([v])=>v).map(([v,k])=>`<div><b>${fmtN(v)}</b><span>${k}</span></div>`).join("");
  $("homeSearch").addEventListener("click",()=>$("searchBtn").click());
})();
function renderHome(){
  const nx=ROADMAP.find(u=>!upOut(u)),cap=capNow();
  $("homeNext").innerHTML=[cap&&`<b>Level cap ${esc(capTxt(cap))}</b>`,nx&&`Next: ${esc(nx.name)}, ${esc(upWhen(nx))}`].filter(Boolean).join('<span aria-hidden="true">·</span>')+'<span aria-hidden="true">→</span>';
  newsBanner();
  const c=C(),set=charSet(c),s=cur(),ms=sessMobs(s),smp=sessMap(s),max=atMaxLv();
  $("homeCharBtn").textContent=set?"Open Character":"Set up your character";
  // a new player has the get started card instead
  $("homeNowCard").hidden=!set&&!ms.length;if($("homeNowCard").hidden)return;
  const tile=(k,v,sub,tab,now)=>`<button type="button" class="tile${now?" now":""}" data-gotab="${tab}"><div class="k">${k}</div><div class="v">${esc(v)}</div><div class="s">${esc(sub)}</div></button>`;
  // what the planner works out for your character on the map you're farming, not what you've logged
  const est=set&&smp?mapStats(smp,walkSec()):null,why=!set?"Set up your character":!smp?"Farm a map for an estimate":"No estimate for this map";
  $("homeTiles").innerHTML=
    tile("Character",noChar()?"–":state.job,set?[c.baseLv&&`Base ${c.baseLv}`,c.jobLv&&`Job ${c.jobLv}`,c.a&&c.a.name].filter(Boolean).join(" · "):"Not set up yet","char",true)+
    tile("Farming",smp?mapCode(smp):ms.length===1?ms[0].name:ms.length?`${ms.length} monsters`:"–",smp?mapName(smp):ms.length?s.name:"Pick a spot below","maps",true)+
    tile("EXP / min there",max?"Max level":est?fmtN(est.epm):"–",max?"EXP no longer counts":est?"planner estimate":why,"maps")+
    tile("Zeny / hr there",est?fmtN(est.net):"–",est?"net, planner estimate":why,"maps");
  $("homeNowNote").textContent="";
  // the best maps for EXP (zeny at the max level) as Where to farm ranks them
  const sm=smp;
  $("homeSpots").innerHTML=set&&SPOT_EXP.length?`<div class="secHead">${max?"Best for zeny":"Best for EXP"} right now</div>`+SPOT_EXP.map(r=>`<div class="spot${r.mp===sm?" on":""}"><span class="spotN">${r.rank}</span>
    <div class="spotTxt"><div><b class="mono">${mapCode(r.mp)}</b> <span class="note">${esc(mapName(r.mp))}</span></div><div class="spotV">${max?`<b>${fmtN(r.net)}</b> z/hr net`:`<b>${fmtN(r.epm)}</b> EXP / min · ${fmtN(r.net)} z/hr net`}</div></div>${farmBtn(r)}</div>`).join(""):"";
}
// ---- collapsible cards: click a heading (or Enter/Space on it) to fold the card; saved by heading text ----
(function setupCollapse(){
  if(!state.collapsed)state.collapsed={};
  document.querySelectorAll(".card:not(#acctCard)").forEach(card=>{const h=card.querySelector(":scope>h2, :scope>.bar>h2");if(!h)return;
    const head=h.parentElement===card?h:h.parentElement;head.classList.add("cardHead");const key=h.textContent.trim();
    h.tabIndex=0;h.setAttribute("role","button");
    const set=v=>{card.classList.toggle("collapsed",v);h.setAttribute("aria-expanded",String(!v))};set(!!state.collapsed[key]);
    const flip=()=>{const v=!card.classList.contains("collapsed");state.collapsed[key]=v;if(!v)delete state.collapsed[key];save();set(v)};
    h.addEventListener("click",flip);h.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip()}})});
})();
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
  showTab(g);scrollTo({top:0})}));
$("startHide").addEventListener("click",()=>{try{localStorage.setItem(KEY_START,"1")}catch(e){}renderStart()});
// ---- search (Ctrl+K or /): tabs, a few actions, every monster, dropped item and map; Enter opens it where it lives ----
(function setupJump(){
  const dlg=$("jump"),inp=$("jumpInput"),list=$("jumpList");let hits=[],at=0;
  const tabName=t=>document.querySelector(`[data-tabbtn="${t}"] span`).textContent;
  const go=(tab,fn)=>()=>{showTab(tab);scrollTo({top:0});if(fn)setTimeout(fn,30)};
  const ACTIONS=[
    {k:"Action",name:"Log EXP",meta:"top bar · L",run:()=>openQuickLog(true),ok:()=>!atMaxLv()},
    {k:"Action",name:"Switch theme",meta:"auto → light → dark",run:()=>$("themeBtn").click()},
    {k:"Action",name:"Show or hide hints",meta:"help text under the cards",run:()=>$("hintBtn").click()},
    {k:"Action",name:"New session",meta:"Session tab",run:()=>$("newSession").click()}];
  let ALL=null;
  const build=()=>ALL=[
    ...[...document.querySelectorAll("[data-tabbtn]")].map(b=>({k:"Tab",name:tabName(b.dataset.tabbtn),meta:TAB_DESC[b.dataset.tabbtn]||"",run:go(b.dataset.tabbtn)})),
    ...ACTIONS,
    ...MOBS.map(m=>({k:"Monster",name:m.name,meta:`Lv ${m.lv}${m.el?` · ${m.el} ${m.elv}`:""}${m.race?` · ${m.race}`:""}${m.mvp?" · MVP":m.boss||m.mini?" · boss":""}${MOB_VARIANT[m.id]?" · "+MOB_VARIANT[m.id]:""}`,mob:m.id,
      run:()=>openInfo("mob",m.id)})),
    ...Object.keys(ITEM_DROPS).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · dropped by ${ITEM_DROPS[id].length}`,ico:id,
      run:()=>openInfo("item",id)})),
    // crafted items no monster drops (potions, arrows, food, forged weapons that aren't in the gear list)
    ...Object.keys(RECIPES_MAKING).filter(id=>!ITEM_DROPS[id]&&!BUILD.item(+id)).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · ${RECIPES_MAKING[id][0].cat.toLowerCase()} recipe`,ico:id,
      run:()=>openInfo("item",id)})),
    // every other item in the client, the memorial ones and the recovery and skill items (Mithril Ore, Jello Fragments, costumes)
    ...allItemIds().filter(id=>!ITEM_DROPS[id]&&!RECIPES_MAKING[id]).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · ${MEM_ITEMN[id]?"memorial item":(clientCat(id)||"item").toLowerCase()}`,ico:id,
      run:()=>openInfo("item",id)})),
    ...(typeof EQUIP!=="undefined"?EQUIP:[]).filter(it=>(it.slot||[]).length).map(it=>({k:"Gear",name:it.name,meta:`#${it.id} · ${gearKind(it)}${it.slots?` [${it.slots}]`:""}`,ico:it.id,
      run:()=>openInfo("item",it.id)})),
    ...(typeof CARDS!=="undefined"?CARDS:[]).map(x=>({k:"Card",name:x.name,meta:`#${x.id} · ${CARD_PART[cardPart(x)]||"–"}${cardName(x)?` · ${cardName(x)}`:""}${notInGame(x.id)?" · not in game yet":""}`,ico:x.id,
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
  const open=()=>{if(dlg.open)return;inp.value="";draw();dlg.showModal();inp.focus()};
  $("searchBtn").addEventListener("click",open);
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
// ---- sidebar groups: a group's heading folds its tabs away (the open tab stays showing; style.css), per device like full width ----
(function setupNavFold(){
  const KEY_FOLD="rozero-farm-planner-navfold",grps=[...document.querySelectorAll(".tabs .navGrp")];
  let shut=[];try{shut=JSON.parse(localStorage.getItem(KEY_FOLD))||[]}catch(e){}
  const set=(g,open)=>{g.setAttribute("aria-expanded",String(open));
    for(let b=g.nextElementSibling;b&&!b.classList.contains("navGrp");b=b.nextElementSibling)b.classList.toggle("navHid",!open)};
  grps.forEach(g=>{set(g,!shut.includes(g.textContent));g.addEventListener("click",()=>{set(g,g.getAttribute("aria-expanded")!=="true");
    try{localStorage.setItem(KEY_FOLD,JSON.stringify(grps.filter(x=>x.getAttribute("aria-expanded")==="false").map(x=>x.textContent)))}catch(e){}})});
})();
// ---- hints: the help text under the cards, on by default, per device like full width ----
(function setupHints(){
  const KEY_HINTS="rozero-farm-planner-hints",btn=$("hintBtn");
  const set=v=>{document.documentElement.classList.toggle("nohints",!v);btn.setAttribute("aria-pressed",String(v));btn.querySelector("span").textContent=`Hints: ${v?"on":"off"}`};
  set(!document.documentElement.classList.contains("nohints"));
  btn.addEventListener("click",()=>{const v=btn.getAttribute("aria-pressed")!=="true";set(v);try{v?localStorage.removeItem(KEY_HINTS):localStorage.setItem(KEY_HINTS,"0")}catch(e){}});
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
  addEventListener("storage",e=>{if(e.storageArea!==localStorage)return;
    if(e.key===null||e.key===ACCT_KEY)STALE=true;
    else if(e.key===acctKey(accts.active)){if(e.newValue===LAST_RAW)return;newer=true}
    else return;
    if(!document.hidden)refresh()});
  document.addEventListener("visibilitychange",()=>{if((STALE||newer)&&!document.hidden)refresh()});
})();
if(VIEW&&VIEW.toast)showToast(String(VIEW.toast));
(function tripLoop(){tickTrip();setTimeout(tripLoop,1000)})();
loadShareLink();addEventListener("hashchange",loadShareLink);
if(INFO_AT)openInfo(...INFO_AT);
