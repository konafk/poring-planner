// ---- What's new tab: the latest game update's highlights (data/news.js). The floors draw their monsters from the spawn data the
// planner uses (MAPMOBS), every bar on one scale; monster and card names open the details popup, map names the Maps tab ----
const newsUpdate=n=>ROADMAP.find(u=>u.name===n.name);
// an item's icon and name, opening its details (the costume tag left off: the group says what they are)
const newsItemLink=id=>`<a href="#" data-info="item:${id}">${itemIcon(id,1,"il")}${esc(itemName(id).replace(/^\[Costume\] /,""))}</a>`;
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
function renderNews(){
  const n=NEWS[0];if(!n)return;const u=newsUpdate(n);
  $("newsHead").innerHTML=`<div class="eyebrow">${esc(u?upWhen(u):n.when)} · game update</div><h2>${esc(n.name)}</h2><p>${esc(n.intro)}</p>`;
  $("newsTower").innerHTML=newsFloors(n);$("newsTowerNote").textContent=n.floorNote;
  $("newsBosses").innerHTML=n.bosses.map(([nm,lv,mp,card,id])=>{const c=itemInfo(card),fl=(n.floors.find(f=>f[0]===mp)||[])[1];
    return `<div class="newsCard"><div class="note">${esc(fl||"")} · Lv ${lv}</div><b>${infoMobLink(id,nm)}</b><a href="#" data-info="item:${card}">${itemIcon(card,1,"il")}${esc(nm)} Card</a>${c&&c.t?`<p>${esc(c.t)}</p>`:""}</div>`}).join("");
  $("newsBossNote").textContent=n.bossNote;
  $("newsGear").innerHTML=n.gear.map(([id,nm,t])=>`<div class="newsItem"><b>${id?`<a href="#" data-info="item:${id}">${esc(nm)}</a>`:esc(nm)}</b><span>${esc(t)}</span></div>`).join("");
  const cb=n.collab;$("newsCollabCard").hidden=!cb;
  if(cb){$("newsCollabTitle").textContent=cb.name;$("newsCollabIntro").textContent=cb.intro;
    $("newsCollab").innerHTML=cb.groups.map(([g,rows])=>`<div class="newsGrp"><div class="secHead">${esc(g)}</div><div class="newsList">${rows.map(([ids,nm,t])=>`<div class="newsItem"><b>${ids.length?ids.map(newsItemLink).join(" · "):esc(nm)}</b><span>${esc(t)}</span></div>`).join("")}</div></div>`).join("")}
  $("newsEvents").innerHTML=n.events.map(([nm,k,t])=>`<div class="newsItem"><b>${esc(nm)} <span class="pill ${k==="ended"?"":"up"}">${k==="ended"?"Ended":"New"}</span></b><span>${esc(t)}</span></div>`).join("")+
    n.town.map(t=>`<div class="newsItem"><b>In town</b><span>${esc(t)}</span></div>`).join("");
}
// Home: a link to the tab while the latest update is under a month old
function newsBanner(){
  const n=NEWS[0],el=$("homeNews");if(!el)return;const age=n?(new Date(todayISO())-new Date(n.when))/864e5:1e9;
  el.hidden=!(age>=0&&age<31);if(el.hidden)return;
  el.innerHTML=`<span class="pill up">New in game</span><b>${esc(n.name)}</b><span>${esc(n.intro.split(": ")[0])}.</span><span aria-hidden="true">→</span>`;
}
