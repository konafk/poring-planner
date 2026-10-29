// ---- the Maps tab: every spawn map and town on the game's world map (render.js worldMap), its picture with its NPCs and ways out, the way
// there from the nearest town (navi.js), its monsters, and a table of them all ----
// The map picked here is state.mapInfo (by source map code), apart from the Map planner's state.map; "Plan this map" hands a spawn map over
const mapInfoMaps=()=>[...Object.keys(MAPMOBS),...(typeof TOWNS==="undefined"?[]:Object.keys(TOWNS))];
const mapInfoKey=()=>{const k=mapKey(state.mapInfo);return MAPMOBS[k]||isTown(k)?k:mapKey(state.map)||Object.keys(MAPMOBS).sort((a,b)=>mapCode(a).localeCompare(mapCode(b)))[0]};
// a map's monsters, most spawns first ([map, null] counts sort last)
const mapInfoMobs=mp=>(MAPMOBS[mp]||[]).slice().sort((a,b)=>(b.n??-1)-(a.n??-1)||a.m.lv-b.m.lv);
const mapInfoLv=mp=>{const lv=(MAPMOBS[mp]||[]).filter(x=>!x.m.boss).map(x=>x.m.lv);return lv.length?[Math.min(...lv),Math.max(...lv)]:null};
const mapInfoOpenTxt=mp=>isClosed(mp)?`not open yet${mapArrives(mp)?` · ${mapArrives(mp)}`:""}`:lvLocked(mp)?`needs base Lv ${mapMinLv(mp)}`:"open";
const mapInfoPick=k=>{state.mapInfo=k;save();renderMapInfo()};
function renderMapInfo(){
  const mp=mapInfoKey(),q=$("mapInfoIn").value.trim().toLowerCase(),onlyOpen=$("mapInfoOpen").checked=!!state.mapInfoOpen;
  worldMap($("infoWorld"),mp,mapInfoPick,true);
  // the picked map: its picture, where it is, and its monsters
  const v=typeof MINIMAPS!=="undefined"&&MINIMAPS[mp],wi=worldOf(mp),lv=mapInfoLv(mp),mobs=mapInfoMobs(mp);
  $("mapInfoSel").innerHTML=`<div class="bar"><h3 class="grow">${esc(mapName(mp)||mapCode(mp))} <span class="note mono">${esc(mapCode(mp))}</span></h3>
    ${isTown(mp)?"":`<button type="button" class="primary small" data-planmap="${esc(mp)}">Plan this map</button>`}</div>
    ${v?naviPic(mp,v):`<div class="note">The game client has no picture of this map.</div>`}
    <div class="note">${isTown(mp)?"town":esc(mapInfoOpenTxt(mp))} · ${wi>=0?`on the ${esc(WORLDMAPS[wi].name)} map`:"not on the game's world map yet"}${lv?` · monsters Lv ${lv[0]}${lv[1]>lv[0]?`–${lv[1]}`:""}`:""}${isRoomMap(mp)?" · room dungeon":""}</div>
    ${naviRouteHtml(mp)}${naviLists(mp)}
    <div class="infoList mt">${mobs.map(({m,n})=>`<div>${mobIcon(m.id,1,"il")}${infoLink("mob",m.id,m.name)}${BOSS_PILL(m)} <span class="note">Lv ${m.lv} · ≈${spN(n)}${m.boss?"":` · ${fmtExp(m)} EXP`}</span></div>`).join("")||`<div class="note">${isTown(mp)?"A town: no monsters.":"No monsters listed."}</div>`}</div>`;
  // every map, narrowed by the search (code, name, a monster on it, or "town") and to open maps
  const all=mapInfoMaps(),rows=all.filter(k=>(!onlyOpen||!isClosed(k))&&(!q||[k,mapCode(k),mapName(k),...(MAPNAMES[k]||[]).slice(2),...(MAPMOBS[k]||[]).map(x=>x.m.name),isTown(k)?"town":""].some(s=>String(s).toLowerCase().includes(q))))
    .sort((a,b)=>mapCode(a).localeCompare(mapCode(b)));
  $("mapInfoTable").querySelector("tbody").innerHTML=rows.map(k=>{const l=mapInfoLv(k),ns=(MAPMOBS[k]||[]).map(x=>x.n),w=worldOf(k);
    return `<tr data-mapinfo="${esc(k)}" class="${k===mp?"sel":""}" style="cursor:pointer"><td class="mono">${esc(mapCode(k))}</td><td>${esc(mapName(k))}</td><td>${isTown(k)?"town":ns.length}</td><td>${l?`${l[0]}${l[1]>l[0]?`–${l[1]}`:""}`:"–"}</td><td>${!ns.length?"–":ns.some(n=>n==null)?"?":"≈"+ns.reduce((a,n)=>a+n,0)}</td><td>${w>=0?esc(WORLDMAPS[w].name):"–"}</td><td>${isClosed(k)?`<span class="pill down">not open yet</span>`:"open"}</td></tr>`}).join("");
  $("mapInfoNote").textContent=`${rows.length} of ${all.length} maps`;
  // the Monsters card under this one keeps to the picked map
  renderMobs()}
// typing narrows the table (opening the Map list, hidden at first, so the narrowing shows); picking a map from the list (or typing its code
// or name in full) shows it
$("mapInfoIn").addEventListener("input",e=>{const k=mapKey(e.target.value),hit=k&&(MAPMOBS[k]||isTown(k));if(hit&&k!==state.mapInfo){state.mapInfo=k;save()}
  if(e.target.value.trim()&&!hit)$("mapInfoMore").open=true;renderMapInfo()});
$("mapInfoOpen").addEventListener("change",e=>{state.mapInfoOpen=e.target.checked;save();renderMapInfo()});
$("mapInfoCard").addEventListener("click",e=>{
  const r=e.target.closest("[data-mapinfo]");if(r&&!e.target.closest("a,button")){mapInfoPick(r.dataset.mapinfo);return}
  const p=e.target.closest("[data-planmap]");if(p){state.map=p.dataset.planmap;save();showTab("maps");renderMap();$("mapCard").scrollIntoView({block:"start"})}});
