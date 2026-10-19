// ---- tabs: show one group of sections at a time; the last one opened is remembered in state.tab (Character first for new players) ----
// local: show it in this browser tab only, without saving it (a reload that keeps this tab's view)
function showTab(t,local){
  if(t==="data")t="acct";// Backup now lives on the Account tab
  if(![...document.querySelectorAll("[data-tabbtn]")].some(b=>b.dataset.tabbtn===t))t="char";
  document.querySelectorAll("[data-tab]").forEach(el=>el.hidden=el.dataset.tab!==t);
  document.querySelectorAll("[data-tabbtn]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tabbtn===t)));
  if(!local&&state.tab!==t){state.tab=t;save()}
  if(t==="ref"){renderRef();refScroll()}
  if(t==="char")renderGearCmp();
  // renderAll only draws these while their tab is showing
  if(t==="maps")renderHunt();if(t==="market")renderPrices();if(t==="mobinfo")renderMobInfo();if(t==="items")renderItems();
}
document.querySelectorAll("[data-tabbtn]").forEach(b=>b.addEventListener("click",()=>{showTab(b.dataset.tabbtn);scrollTo({top:0})}));
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
// ---- full width: a per-device display choice kept outside the account saves (index.html applies it before the page draws) ----
(function setupWide(){
  const KEY_WIDE="rozero-farm-planner-wide",btn=$("wideBtn");
  const set=v=>{document.documentElement.classList.toggle("wide",v);btn.setAttribute("aria-pressed",String(v))};
  set(document.documentElement.classList.contains("wide"));
  btn.addEventListener("click",()=>{const v=btn.getAttribute("aria-pressed")!=="true";set(v);try{v?localStorage.setItem(KEY_WIDE,"1"):localStorage.removeItem(KEY_WIDE)}catch(e){}});
})();
// ---- start ----
syncClosed();syncChar();renderAll();resetForm();
if(VIEW){if(VIEW.drafts)for(const id in VIEW.drafts)if(["fPct","fJob","pasteBox"].includes(id)&&typeof VIEW.drafts[id]==="string")$(id).value=VIEW.drafts[id];
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
