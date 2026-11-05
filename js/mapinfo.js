// ---- the Map card's map facts (Monsters & maps tab, render.js renderMap): towns as well as spawn maps, a dungeon's All floors, and
// the folded list of every map. The map picked is state.map; state.mapAll is the floor a dungeon's All floors was opened from ----
const mapInfoMaps=()=>[...Object.keys(MAPMOBS),...(typeof TOWNS==="undefined"?[]:Object.keys(TOWNS))];
const mobsLv=l=>{const lv=l.filter(x=>!x.m.boss).map(x=>x.m.lv);return lv.length?[Math.min(...lv),Math.max(...lv)]:null};
const mapInfoLv=mp=>mobsLv(MAPMOBS[mp]||[]);
// a dungeon's monsters over all its floors, lowest level first, each with its counts added up: unknown if any floor's count is
const dunMobs=d=>{const by=new Map();d.floors.forEach(([k])=>(MAPMOBS[k]||[]).forEach(({m,n})=>{const x=by.get(m.id);if(x)x.n=x.n==null||n==null?null:x.n+n;else by.set(m.id,{m,n})}));
  return [...by.values()].sort((a,b)=>a.m.lv-b.m.lv||a.m.name.localeCompare(b.m.name))};
// spawn counts added up, or ? when any isn't known
const spSum=ns=>ns.some(n=>n==null)?"?":"≈"+ns.reduce((a,n)=>a+n,0);
const lvTxt=lv=>lv?` · monsters Lv ${lv[0]}${lv[1]>lv[0]?`–${lv[1]}`:""}`:"";
const mapInfoMobList=(mobs,none)=>`<div class="infoList mt">${mobs.map(({m,n})=>`<div>${mobIcon(m.id,1,"il")}${infoLink("mob",m.id,m.name)}${BOSS_PILL(m)} <span class="note">Lv ${m.lv} · ≈${spN(n)}${m.boss?"":` · ${fmtExp(m)} EXP`}</span></div>`).join("")||`<div class="note">${none}</div>`}</div>`;
// the dungeon showing All floors: only while the floor it was opened from is the map picked
const mapDun=mp=>state.mapAll&&state.mapAll===mp?dunOf(mp):null;
const mapInfoDunHtml=d=>{const mobs=dunMobs(d),shut=d.floors.filter(f=>isClosed(f[0])).length;
  return `<div class="bar"><h3 class="grow">${esc(d.n)} <span class="note">All floors</span></h3><button type="button" class="small" data-mapallx>Just this floor</button></div>
    <div class="note">${d.floors.length} floors${shut?` (${shut} not open yet)`:""}${lvTxt(mobsLv(mobs))} · ${spSum(mobs.map(x=>x.n))} spawns</div>
    ${mapInfoMobList(mobs,"No monsters listed.")}`};
const mapInfoOpenTxt=mp=>isClosed(mp)?`not open yet${mapArrives(mp)?` · ${mapArrives(mp)}`:""}`:lvLocked(mp)?`needs base Lv ${mapMinLv(mp)}`:"open";
// the line under the map box: its name, whether it's open, the world map it's on, its monsters' levels
const mapFactsTxt=mp=>{const wi=worldOf(mp);
  return [mapName(mp)||"",isTown(mp)?"town":mapInfoOpenTxt(mp),wi>=0?`on the ${WORLDMAPS[wi].name} map`:"not on the game's world map yet"].filter(Boolean).join(" · ")+lvTxt(mapInfoLv(mp))
    +(isRoomMap(mp)?` · room dungeon: one map cut into small rooms, so monsters crowd into yours (a possible rampage of ${ROOM_CROWD} unless you change it)`:"")};
// a map picked anywhere on the page: open it here (the tab, the card); a floor's All floors with all
function openMap(k,all){state.map=k;state.mapAll=all?k:null;save();if(state.tab!=="maps")showTab("maps");renderMap();$("mapCard").scrollIntoView({behavior:"smooth",block:"start"})}
// Every map: narrowed by the search (code, name, a monster on it, or "town") and to open maps. Drawn while it's open
function renderMapList(){const d=$("mapInfoMore");if(!d)return;const onlyOpen=$("mapInfoOpen").checked=!!state.mapInfoOpen,all=mapInfoMaps();
  if(!d.open){$("mapInfoNote").textContent=`${all.length} maps and towns`;return}
  const q=String($("mapInfoIn").value).trim().toLowerCase(),mp=mapKey(state.map),dun=mapDun(mp);
  const rows=all.filter(k=>(!onlyOpen||!isClosed(k))&&(!q||[k,mapCode(k),mapName(k),...(MAPNAMES[k]||[]).slice(2),...(MAPMOBS[k]||[]).map(x=>x.m.name),isTown(k)?"town":""].some(s=>String(s).toLowerCase().includes(q))))
    .sort((a,b)=>mapCode(a).localeCompare(mapCode(b)));
  $("mapInfoTable").querySelector("tbody").innerHTML=rows.map(k=>{const l=mapInfoLv(k),ns=(MAPMOBS[k]||[]).map(x=>x.n),w=worldOf(k);
    return `<tr data-mapinfo="${esc(k)}" class="${(dun?dun.floors.some(f=>f[0]===k):k===mp)?"sel":""}"><td class="mono">${esc(mapCode(k))}</td><td>${esc(mapName(k))}</td><td>${isTown(k)?"town":ns.length}</td><td>${l?`${l[0]}${l[1]>l[0]?`–${l[1]}`:""}`:"–"}</td><td>${ns.length?spSum(ns):"–"}</td><td>${w>=0?esc(WORLDMAPS[w].name):"–"}</td><td>${isClosed(k)?`<span class="pill down">not open yet</span>`:"open"}</td></tr>`}).join("")
    ||`<tr><td colspan="7" class="name muted">No maps match.</td></tr>`;
  $("mapInfoNote").textContent=`${rows.length} of ${all.length}`}
$("mapInfoMore").addEventListener("toggle",renderMapList);
$("mapInfoIn").addEventListener("input",renderMapList);
$("mapInfoOpen").addEventListener("change",e=>{state.mapInfoOpen=e.target.checked;save();renderMapList()});
$("mapCard").addEventListener("click",e=>{
  const r=e.target.closest("[data-mapinfo]");if(r&&!e.target.closest("a,button")){openMap(r.dataset.mapinfo);return}
  if(e.target.closest("[data-mapallx]")){state.mapAll=null;save();renderMap()}});
