// ---- Daily quests tab: every daily an NPC gives, from the game client (data/dailies.js): the level its NPC's dialogue asks for, the
// task, where it sends you and where the NPC stands, with a tick for each one you've done today. Every daily resets at 04:00 UTC+0, so
// a "day" here runs from one 04:00 UTC to the next. The ticks are per character (C().daily: {day: that day as YYYY-MM-DD, done: [the
// dailies' ids]}): a tick from an earlier day doesn't count, and goes the next time you tick one. The filters are per account
// (state.dailyHideDone: hide the ones done today; state.dailyLv: the range of daily levels to show). A level above your character's
// shows in red. A daily whose NPC
// the game's Navigation doesn't place yet (live false) is future content: its row shows only with Future content on ----
const DAILY_RESET_H=4;
// the day a time belongs to, in the game's daily reset: 03:59 UTC is still yesterday
const dailyDay=(t=Date.now())=>new Date(t-DAILY_RESET_H*36e5).toISOString().slice(0,10);
// the next reset after t (ms)
const dailyNext=(t=Date.now())=>Date.parse(dailyDay(t)+"T00:00:00Z")+(24+DAILY_RESET_H)*36e5;
// the dailies done today by the character you're on (ids)
const dailyDone=(c=C())=>{const d=c.daily;return d&&d.day===dailyDay()&&Array.isArray(d.done)?d.done.filter(i=>DAILIES.some(x=>x.id===i)):[]};
function dailyTick(id,on){const c=C(),done=dailyDone(c).filter(i=>i!==id);if(on)done.push(id);c.daily={day:dailyDay(),done};save()}
// a daily your level allows: one with no level in the client counts as allowed
const dailyLvOk=(q,lv=num(C().baseLv))=>q.lv==null||!(lv>0)||lv>=q.lv;
// a daily in the level range picked (state.dailyLv): one with no level in the client always shows
const dailyLvIn=(q,r=state.dailyLv)=>q.lv==null||!r||((r.from==null||q.lv>=r.from)&&(r.to==null||q.lv<=r.to));
// a place in the quest log ("gef_dun02 106 132"), its map as players know it, and when a closed map opens
const dailyMap=at=>mapKey(at.split(" ")[0]);
const dailyPlace=(name,at)=>{const mp=dailyMap(at),soon=mapArrives(mp),nm=mapName(mp);
  return `<div>${esc(name)}${nm&&nm!==name?` <span class="note">${esc(nm.replace(/, the .*$/,""))}</span>`:""}${soon?` <span class="pill down" title="Not open yet: comes with the ${esc(soon)}">${esc(soon)}</span>`:""}</div><div>${naviTag(at)}</div>`};
const dailyMob=id=>{const m=MOB_BY_ID.get(id),c=CLIENT.mobLv&&CLIENT.mobLv[id],name=m?m.name:c?c[0]:`#${id}`,lv=m?m.lv:c?c[1]:null;
  return `<span class="nowrap">${mobIcon(id,1,"il")}${infoMobLink(id,name)}${lv!=null?` <span class="note">Lv ${lv}</span>`:""}</span>`};
const dailyIn=ms=>{const h=Math.floor(ms/36e5),m=Math.ceil(ms%36e5/6e4);return h?`${h}h ${m}m`:`${m}m`};
function renderDailyClock(){const n=dailyNext(),t=new Date(n).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  $("dailyReset").textContent=`Resets at 04:00 UTC+0 (${t} your time) · in ${dailyIn(n-Date.now())}`}
// the list's columns to sort by (a header click; state.tsort.dailyTable): ties keep the default order, level then NPC
let DAILY_DREW="",DAILY_DONE=new Set();
TABLES.dailyTable={def:["lv",1],cols:{done:{n:q=>DAILY_DONE.has(q.id)?1:0},lv:{n:q=>q.lv,asc:1},title:{t:q=>q.title},
  where:{t:q=>(q.where||[]).map(([n,at])=>mapName(dailyMap(at))||n).join(", ")},npc:{t:q=>q.npc[0]}}};
function renderDaily(){const c=C(),lv=num(c.baseLv),done=new Set(dailyDone(c)),hide=state.dailyHideDone,range=state.dailyLv;
  DAILY_DREW=dailyDay();DAILY_DONE=done;renderDailyClock();
  const rows=sortRows("dailyTable",[...DAILIES].sort((a,b)=>(a.lv??999)-(b.lv??999)||a.npc[0].localeCompare(b.npc[0])||a.id-b.id));
  const shown=rows.filter(q=>(!hide||!done.has(q.id))&&dailyLvIn(q,range));
  $("dailyRows").innerHTML=shown.map(q=>{const off=q.live===false,ok=dailyLvOk(q,lv),d=done.has(q.id);
    return `<tr class="${off?"future":""}${d?" dailyDone":""}">
      <td><input type="checkbox" data-daily="${q.id}" ${d?"checked":""} aria-label="${esc(q.title)} done today"></td>
      <td class="mono">${q.lv!=null?`<span class="${ok?"":"bad"}" title="${ok?"":"Above your level"}">${q.lv}</span>`:'<span class="note" title="The NPC\'s dialogue in the client gives no level">–</span>'}</td>
      <td class="name"><b>${esc(q.title)}</b>${off?' <span class="pill down" title="In the game client, but the game\'s Navigation doesn\'t place its NPC yet: an update to come, or an event that ended">Not in game yet</span>':""}
        <div class="note">${esc(q.task)}</div>${(q.mobs||[]).length?`<div>${q.mobs.map(dailyMob).join(" · ")}</div>`:""}</td>
      <td class="name">${(q.where||[]).map(([n,at])=>dailyPlace(n,at)).join("")||'<span class="note">–</span>'}</td>
      <td class="name">${q.npc[1]?dailyPlace(q.npc[0],q.npc[1]):esc(q.npc[0])}</td></tr>`}).join("")
    ||`<tr><td colspan="5" class="note">${hide||range.from!=null||range.to!=null?"None left with these filters.":"No daily quests."}</td></tr>`;
  const live=DAILIES.filter(q=>q.live!==false),left=live.filter(q=>dailyLvOk(q,lv)&&!done.has(q.id));
  $("dailyNote").textContent=`${done.size} done today · ${left.length} left${lv>0?` for your Lv ${lv} ${state.job}`:""}`;
  $("dailyHide").checked=hide;$("dailyLvFrom").value=range.from??"";$("dailyLvTo").value=range.to??""}
$("dailyCard").addEventListener("change",e=>{const id=e.target.dataset.daily;
  if(id!=null){dailyTick(+id,e.target.checked);renderDaily();return}
  if(e.target.id==="dailyHide"){state.dailyHideDone=e.target.checked;save();renderDaily()}
  if(e.target.id==="dailyLvFrom"||e.target.id==="dailyLvTo"){const b=v=>v.trim()===""?null:Math.max(1,Math.round(num(v,1)));
    let f=b($("dailyLvFrom").value),t=b($("dailyLvTo").value);if(f!=null&&t!=null&&f>t)[f,t]=[t,f];
    state.dailyLv={from:f,to:t};save();renderDaily()}});
$("dailyTable").tHead.addEventListener("click",e=>{const th=e.target.closest("th[data-sk]");if(!th)return;
  const k=th.dataset.sk,[k0,d0]=tblSort("dailyTable"),col=TABLES.dailyTable.cols[k];state.tsort.dailyTable=[k,k===k0?-d0:col.n&&!col.asc?-1:1];save();renderDaily()});
// while the tab is open: the countdown, and the ticks clear when the day turns
(function dailyTimer(){setTimeout(()=>{if(TAB_ON==="daily"){if(DAILY_DREW!==dailyDay())renderDaily();else renderDailyClock()}dailyTimer()},30000)})();
