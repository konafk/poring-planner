// ---- tabs: show one group of sections at a time; the last one opened is remembered in state.tab (Character first for new players) ----
// local: show it in this browser tab only, without saving it (a reload that keeps this tab's view)
// the heading over each tab: its sidebar group, its name and what it's for
const TAB_DESC={
  char:"Your job, stats, gear and attack: everything the damage, EXP and zeny numbers work from.",
  track:"Log your EXP as you farm to see your real EXP/hr, when you'll level and how far your goals are.",
  maps:"Find where to farm: every monster against your attack, the EXP and Zeny Hunter rankings, and the map planner.",
  roadmap:"Ragnarok Zero Global's release roadmap: when each update comes, its level cap, and which maps and monsters are open now.",
  mobinfo:"Drops, spawn maps and your numbers against any monster.",
  items:"Every drop: who drops it, where they spawn and what it's worth to you.",
  equip:"Every weapon and piece of armor: filter by type, job, level, card slots and stats, and put it in any of your gear sets.",
  cards:"Every card and what it does: filter by the gear it goes in, and slot it into your gear or another gear set.",
  market:"The prices players pay, and a timer that tells you when to go sell.",
  ref:"EXP tables, party share, the element and size tables, and every formula with your numbers in it.",
  acct:"Back up every account, restore one, or share it as a link. Everything is saved in this browser only.",
};
function showHero(t){
  const b=document.querySelector(`[data-tabbtn="${t}"]`);if(!b)return;
  let g=b.previousElementSibling;while(g&&!g.classList.contains("navGrp"))g=g.previousElementSibling;
  $("heroGrp").textContent=g?g.textContent:"";$("heroTitle").textContent=b.querySelector("span").textContent;$("heroDesc").textContent=TAB_DESC[t]||"";
}
function showTab(t,local){
  if(t==="data")t="acct";// the old Data tab is the Account tab
  if(![...document.querySelectorAll("[data-tabbtn]")].some(b=>b.dataset.tabbtn===t))t="char";
  document.querySelectorAll("[data-tab]").forEach(el=>el.hidden=el.dataset.tab!==t);
  document.querySelectorAll("[data-tabbtn]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tabbtn===t)));
  showHero(t);$("startCard").classList.toggle("offTab",!["char","track","maps"].includes(t));
  if(!local&&state.tab!==t){state.tab=t;save()}
  if(t==="ref"){renderRef();refScroll()}
  if(t==="char")renderGearCmp();
  // the Session charts were drawn while hidden (no width to measure): redraw them at the width they now have
  if(t==="track"){const c=$("chart");if(+c.clientWidth&&chartW(c)!==c.viewBox.baseVal.width)setTimeout(renderTracker)}
  // renderAll only draws these while their tab is showing
  if(t==="maps")renderHunt();if(t==="market")renderPrices();if(t==="mobinfo")renderMobInfo();if(t==="items")renderItems();if(t==="equip")renderEquipDb();if(t==="cards")renderCardDb();
}
document.querySelectorAll("[data-tabbtn]").forEach(b=>b.addEventListener("click",()=>{showTab(b.dataset.tabbtn);scrollTo({top:0})}));
// a link to another tab (data-gotab="roadmap")
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-gotab]");if(!a)return;e.preventDefault();showTab(a.dataset.gotab);scrollTo({top:0})});
showTab(VIEW&&VIEW.tab||state.tab||"char",!!VIEW);
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
  showTab(g);scrollTo({top:0});if(g==="maps")setTimeout(()=>$("mobInput").focus({preventScroll:true}),50)}));
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
    ...MOBS.map(m=>({k:"Monster",name:m.name,meta:`Lv ${m.lv}${m.el?` · ${m.el} ${m.elv}`:""}${m.race?` · ${m.race}`:""}${m.boss||m.mini?" · boss":""}`,
      run:()=>openInfo("mob",m.id)})),
    ...Object.keys(ITEM_DROPS).map(id=>({k:"Item",name:itemName(id),meta:`#${id} · dropped by ${ITEM_DROPS[id].length}`,
      run:()=>openInfo("item",id)})),
    ...(typeof EQUIP!=="undefined"?EQUIP:[]).filter(it=>(it.slot||[]).length).map(it=>({k:"Gear",name:it.name,meta:`#${it.id} · ${gearKind(it)}${it.slots?` [${it.slots}]`:""}`,
      run:()=>openInfo("item",it.id)})),
    ...(typeof CARDS!=="undefined"?CARDS:[]).map(x=>({k:"Card",name:x.name,meta:`#${x.id} · ${CARD_PART[cardPart(x)]||"–"}${cardName(x)?` · ${cardName(x)}`:""}`,
      run:()=>openInfo("item",x.id)})),
    ...Object.keys(MAPNAMES).map(mp=>({k:"Map",name:mapName(mp)||mapCode(mp),meta:mapCode(mp),alt:mp,
      run:go("maps",()=>{state.map=mp;save();renderMap();$("mapCard").scrollIntoView({behavior:"smooth",block:"start"})})}))];
  // best first: the name starts with it, then a word in it does, then it's anywhere (name, map code, item #id)
  const score=(x,q)=>{const n=x.name.toLowerCase(),o=(x.meta+" "+(x.alt||"")).toLowerCase();
    return n===q?0:n.startsWith(q)?1:(" "+n).includes(" "+q)?2:n.includes(q)?3:o.includes(q)?4:9};
  const draw=()=>{const q=inp.value.trim().toLowerCase();if(!ALL)build();
    hits=q?ALL.filter(x=>!x.ok||x.ok()).map(x=>[score(x,q),x]).filter(([v])=>v<9).sort((a,b)=>a[0]-b[0]||a[1].name.length-b[1].name.length).slice(0,40).map(([,x])=>x)
      :ALL.filter(x=>(x.k==="Tab"||x.k==="Action")&&(!x.ok||x.ok()));
    at=0;list.innerHTML=hits.length?hits.map((x,i)=>`<button type="button" role="option" class="jr" data-i="${i}" aria-selected="${i===at}"><span class="jk k${x.k}">${x.k}</span><span class="jn">${esc(x.name)}</span><span class="jm">${esc(x.meta)}</span></button>`).join("")
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
