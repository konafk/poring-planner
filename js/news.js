// ---- What's new tab: the latest game update's highlights (data/news.js). The floors draw their monsters from the spawn data the
// planner uses (MAPMOBS), every bar on one scale; monster and card names open the details popup, map names the Map card ----
const newsUpdate=n=>ROADMAP.find(u=>u.name===n.name);
// an item's icon and name, opening its details (the costume tag left off: the group says what they are); gear itemName doesn't know passes its name
const newsItemLink=(id,nm)=>`<a href="#" data-info="item:${id}">${itemIcon(id,1,"il")}${esc((nm||itemName(id)).replace(/^\[Costume\] /,""))}</a>`;
function newsFloors(n){
  const bossIds=new Set(n.bosses.map(b=>b[4])),plain=mp=>(MAPMOBS[mp]||[]).filter(x=>!x.m.mvp&&!bossIds.has(x.m.id));
  const rows=n.floors.filter(f=>!f.ground).map(([mp])=>plain(mp)),max=Math.max(1,...rows.flat().map(x=>x.n||0));
  const boss={};n.bosses.forEach(([nm,lv,mp,,id])=>(boss[mp]=boss[mp]||[]).push([nm,lv,id]));
  return n.floors.map(f=>{
    if(f.ground)return `<div class="newsGround"><a href="#" data-navito="${esc(f.ground)}">${esc(mapName(f.ground)||f.ground)}</a><span>ground level</span></div>`;
    const [mp,tag]=f,list=plain(mp).sort((a,b)=>(b.n||0)-(a.n||0)||a.m.lv-b.m.lv);
    const mobs=list.map(({m,n:c})=>`<div class="newsMob">${mobIcon(m.id,1,"il")}<a href="#" data-info="mob:${m.id}">${esc(m.name)}</a><span class="note">Lv ${m.lv}</span>
      <span class="newsBar" aria-hidden="true"><i style="width:${Math.max(1.5,(c||0)/max*100).toFixed(1)}%"></i></span><span class="mono">${spN(c)}</span></div>`).join("");
    const bs=(boss[mp]||[]).map(([nm,lv,id])=>`<a href="#" class="pill newsBoss"${MOB_BY_ID.has(id)?` data-info="mob:${id}"`:""}>${mobIcon(id,.7,"il")}${esc(nm)} <span class="mono">Lv ${lv}</span></a>`).join("");
    return `<div class="newsFloor${tag.startsWith("B")?" under":""}"><div class="newsTag mono">${esc(tag)}</div><div class="newsRows">
      <a href="#" class="newsMap" data-navito="${esc(mp)}">${esc(mapName(mp)||mapCode(mp))} <span class="mono">${esc(mapCode(mp))}</span></a>${mobs}${bs?`<div class="newsBosses">${bs}</div>`:""}</div></div>`}).join("")}
// the tab: the update's head, then its sections (Clock Tower, an event, ...), each its heading and cards. The newest update shows
// first; the row of tabs at the top of the page goes back to an earlier one (NEWS_PICK: its date, for this visit only)
let NEWS_PICK=null;
function renderNews(){
  const n=NEWS.find(x=>x.when===NEWS_PICK)||NEWS[0];if(!n)return;const u=newsUpdate(n),secs=n.sections||[];
  const tabs=$("newsUpdates");tabs.hidden=NEWS.length<2;
  tabs.innerHTML=NEWS.map(x=>`<button type="button" role="tab" aria-selected="${x===n}" data-newspick="${esc(x.when)}">${esc(x.name)}<span>${+x.when.slice(8)} ${MONTHS[+x.when.slice(5,7)-1]}</span></button>`).join("");
  tabs.querySelectorAll("[data-newspick]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.newspick===n.when)return;
    NEWS_PICK=b.dataset.newspick;renderNews();$("newsUpdates").querySelector(`[data-newspick="${NEWS_PICK}"]`)?.focus()}));
  $("newsHead").innerHTML=`<div class="eyebrow">${esc(u?upWhen(u):n.when)} · game update</div><h2>${esc(n.name)}</h2><p>${esc(n.intro)}</p>`;
  const floorTitle=n.floorTitle||"The tower, floor by floor";$("newsFloorsCard").querySelector("h2").textContent=floorTitle;
  $("newsTower").innerHTML=newsFloors(n);$("newsTowerNote").textContent=[n.floorNote,n.bossNote].filter(Boolean).join(" ");
  // the card with bossGroup lists the field bosses' cards first: the client's text, which floor and boss
  const bossRows=()=>n.bosses.map(([nm,lv,mp,card])=>{const c=itemInfo(card),fl=(n.floors.find(f=>f[0]===mp)||[])[1];return [[card],`${nm} Card`,`${fl?fl+", ":""}from ${nm} (Lv ${lv}).${c&&c.t?" "+c.t:""}`]});
  const card=cb=>{const groups=cb.bossGroup?[[cb.bossGroup,bossRows()],...cb.groups]:cb.groups;
    return `<section class="card newsCollabCard" id="${cb.id}" data-tab="news"><h2>${esc(cb.name)}</h2>${cb.intro?`<p class="note newsIntro">${esc(cb.intro)}</p>`:""}
    <div class="newsCollab">${groups.map(([g,rows])=>`<div class="newsGrp"><div class="secHead">${esc(g)}</div><div class="newsList">${rows.map(([ids,nm,t])=>`<div class="newsItem"><b>${ids.length?ids.map(id=>newsItemLink(id,ids.length===1&&nm)).join("<br>"):esc(nm)}</b><span>${esc(t)}</span></div>`).join("")}</div></div>`).join("")}</div></section>`};
  // the floors card is in the page: it goes back by the head while the sections are drawn again, then into its section
  const fl=$("newsFloorsCard");$("newsHead").after(fl);document.querySelectorAll(".newsSec").forEach(el=>el.remove());
  fl.insertAdjacentHTML("afterend",secs.map(([k,nm,intro])=>`<section class="newsSec" id="newsSec-${esc(k)}" data-tab="news"><div class="newsSecHead"><h2>${esc(nm)}</h2>${intro?`<p>${esc(intro)}</p>`:""}</div>
    ${(n.cards||[]).filter(cb=>cb.sec===k).map(card).join("")}</section>`).join(""));
  const home=secs.find(x=>x[3]);if(home)$("newsSec-"+home[0]).querySelector(".newsSecHead").after(fl);
  // each section folds from its heading, remembered like a card (state.collapsed, by "news:" and its name)
  document.querySelectorAll(".newsSec").forEach(sec=>{const h=sec.querySelector(".newsSecHead h2"),key="news:"+h.textContent.trim();
    h.tabIndex=0;h.setAttribute("role","button");
    const set=v=>{sec.classList.toggle("collapsed",v);h.setAttribute("aria-expanded",String(!v))};set(!!state.collapsed[key]);
    const flip=()=>{const v=!sec.classList.contains("collapsed");if(v)state.collapsed[key]=true;else delete state.collapsed[key];save();set(v)};
    h.addEventListener("click",flip);h.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip()}})});
  document.querySelectorAll(".newsCollabCard").forEach(foldCard);
  // the quick nav: each section, its cards under it (shown for the section you're reading, or opened with its toggle)
  $("newsNav").innerHTML=secs.map(([k,nm,,floors])=>{
    const subs=[...(floors?[["newsFloorsCard",floorTitle]]:[]),...(n.cards||[]).filter(cb=>cb.sec===k).map(cb=>[cb.id,cb.name])];
    return `<div class="newsNavGrp"><div class="newsNavRow"><a href="#" class="newsNavSec" data-newsto="newsSec-${esc(k)}">${esc(nm)}</a>${subs.length?`<button type="button" class="newsNavTog" aria-expanded="false" aria-label="${esc(nm)}: its parts"></button>`:""}</div>
      <div class="newsNavSubs">${subs.map(([id,t])=>`<a href="#" class="newsNavSub" data-newsto="${esc(id)}">${esc(t)}</a>`).join("")}</div></div>`}).join("");
  newsSpy()}
// narrower screens show the nav as a row: a section's toggle opens its cards in a dropdown (#newsNavDrop, on the page itself so the
// row's scrolling doesn't cut it off); wider ones show them under the section in the nav
const NEWS_ROW=typeof matchMedia==="function"?matchMedia("(max-width:1359px)"):{matches:false,addEventListener(){}};
function newsNavSync(){const nav=$("newsNav");if(!nav)return;
  nav.querySelectorAll(".newsNavGrp").forEach(g=>{const show=g.classList.contains("open")||g.classList.contains("cur")&&!g.classList.contains("shut");
    g.classList.toggle("show",show);const t=g.querySelector(".newsNavTog");if(t)t.setAttribute("aria-expanded",String(NEWS_ROW.matches?g===NEWS_DROP:show))})}
let NEWS_DROP=null;
function newsDrop(g){const d=$("newsNavDrop");NEWS_DROP=g||null;
  if(!g){d.hidden=true;newsNavSync();return}
  d.innerHTML=g.querySelector(".newsNavSubs").innerHTML;d.hidden=false;
  const r=g.querySelector(".newsNavRow").getBoundingClientRect();d.style.top=`${Math.round(r.bottom+6)}px`;
  d.style.left=`${Math.round(Math.max(8,Math.min(r.left,innerWidth-d.offsetWidth-8)))}px`;newsNavSync()}
// the quick nav's link to what you're reading: the last one whose top has passed a third of the way down the window; its section is
// the current one (open in the nav)
function newsSpy(){const nav=$("newsNav");if(!nav||nav.closest("[data-tab]").hidden)return;let on=null;
  for(const a of nav.querySelectorAll("a[data-newsto]")){const t=$(a.dataset.newsto);if(t&&t.offsetParent&&(!on||t.getBoundingClientRect().top<=innerHeight*.3))on=a}
  nav.querySelectorAll("a").forEach(a=>a.toggleAttribute("aria-current",a===on));
  const g=on&&on.closest(".newsNavGrp");
  nav.querySelectorAll(".newsNavGrp").forEach(x=>{if((x===g)!==x.classList.contains("cur")){x.classList.toggle("cur",x===g);x.classList.remove("shut")}});newsNavSync();
  const sec=g&&g.querySelector(".newsNavSec");
  if(sec&&nav.scrollWidth>nav.clientWidth)nav.scrollTo({left:sec.parentElement.parentElement.offsetLeft-nav.clientWidth/2+sec.offsetWidth/2})}
(function setupNewsNav(){const nav=$("newsNav");if(!nav)return;let raf=0;
  const d=document.createElement("div");d.id="newsNavDrop";d.className="newsNavDrop";d.hidden=true;d.setAttribute("role","menu");document.body.append(d);
  addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;newsSpy()})},{passive:true});
  // a link opens its section and card if they're folded, then goes there
  const go=e=>{const a=e.target.closest("a[data-newsto]");if(!a)return;e.preventDefault();newsDrop(null);const t=$(a.dataset.newsto);if(!t)return;
    const sec=t.closest(".newsSec.collapsed");if(sec)sec.querySelector(".newsSecHead h2").click();
    if(t.classList.contains("collapsed"))t.querySelector("h2[aria-expanded]")?.click();
    t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth",block:"start"})};
  d.addEventListener("click",go);
  nav.addEventListener("click",e=>{const b=e.target.closest(".newsNavTog");if(!b)return go(e);const g=b.closest(".newsNavGrp");
    if(NEWS_ROW.matches)return newsDrop(NEWS_DROP===g?null:g);
    // wider: open or shut its cards in the nav (the current section's are open until shut)
    if(g.classList.contains("show")){g.classList.remove("open");g.classList.add("shut")}else{g.classList.add("open");g.classList.remove("shut")}newsNavSync()});
  // the dropdown shuts on a click elsewhere, Esc, the row scrolling, or the screen changing size
  document.addEventListener("click",e=>{if(NEWS_DROP&&!e.target.closest(".newsNavTog")&&!d.contains(e.target))newsDrop(null)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&NEWS_DROP)newsDrop(null)});
  nav.addEventListener("scroll",()=>{if(NEWS_DROP)newsDrop(null)},{passive:true});
  addEventListener("resize",()=>{if(NEWS_DROP)newsDrop(null)});NEWS_ROW.addEventListener("change",()=>{newsDrop(null)});
})();
// a highlight's days (each [first, last], UTC+0 like the event posts) as they stand today: what's on now or next, null once they're over
function newsWhen(on){
  const t=typeof ROADMAP_TODAY==="string"?ROADMAP_TODAY:new Date().toISOString().slice(0,10),r=on.find(([,b])=>b>=t);if(!r)return null;
  const day=d=>`${+d.slice(8)} ${MONTHS[+d.slice(5,7)-1]}`,[a,b]=r;
  return a<=t?{now:true,text:`On now, until ${day(b)}`}:{now:false,text:`Next: ${a.slice(0,7)===b.slice(0,7)?+a.slice(8):day(a)} to ${day(b)}`}}
const newsMark=m=>m.startsWith("mob:")?mobIcon(+m.slice(4)):m.startsWith("item:")?itemIcon(+m.slice(5)):esc(m);
// Home's What's new card, under the search: the level cap now and the next update on the roadmap (a link to it), and while the latest
// update is under a month old, that update with its highlights (each opens its part of the tab, and goes once its days are over)
function newsBanner(){
  const n=NEWS[0],el=$("homeNews");if(!el)return;const age=n?(new Date(todayISO())-new Date(n.when))/864e5:1e9;
  const nx=ROADMAP.find(u=>!upOut(u)),cap=capNow();
  const next=[cap&&`<b>Level cap ${esc(capTxt(cap))}</b>`,nx&&`Next: ${esc(nx.name)}, ${esc(upWhen(nx))}`].filter(Boolean).join('<span aria-hidden="true">·</span>');
  const nextA=next?`<a href="#Roadmap" class="homeNext" id="homeNext" data-gotab="roadmap">${next}<span aria-hidden="true">→</span></a>`:"";
  el.hidden=false;
  if(!(age>=0&&age<31)){el.innerHTML=`<div class="homeNewsHead"><div><div class="eyebrow">Roadmap</div>${nextA}</div><button type="button" data-gotab="news">What's new →</button></div>`;return}
  const u=newsUpdate(n),tiles=n.highlights.map(([nm,t,mark,to,on])=>{const w=on?newsWhen(on):null;if(on&&!w)return "";
    return `<button type="button" class="tool" data-gotab="news" data-goto="${esc(to)}"><span class="toolIc">${newsMark(mark)}</span><span class="toolTxt"><b>${esc(nm)}</b>${w?`<span class="pill${w.now?" up":""}">${esc(w.text)}</span>`:""}</span></button>`}).join("");
  el.innerHTML=`<div class="homeNewsHead"><div><div class="eyebrow">What's new · ${esc(u?upWhen(u):n.when)}</div><h2 id="homeNewsTitle">${esc(n.name)}</h2>${nextA}</div><button type="button" data-gotab="news">See everything →</button></div><div class="toolGrid">${tiles}</div>`;
}
