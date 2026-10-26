// ---- the Maps tab: every spawn map on the game's world map (render.js worldMap), its picture, its monsters, and a table of them all ----
// The map picked here is state.mapInfo (by source map code), apart from the Map planner's state.map; "Plan this map" hands it over
const mapInfoKey=()=>{const k=mapKey(state.mapInfo);return MAPMOBS[k]?k:mapKey(state.map)||Object.keys(MAPMOBS).sort((a,b)=>mapCode(a).localeCompare(mapCode(b)))[0]};
// a map's monsters, most spawns first ([map, null] counts sort last)
const mapInfoMobs=mp=>(MAPMOBS[mp]||[]).slice().sort((a,b)=>(b.n??-1)-(a.n??-1)||a.m.lv-b.m.lv);
const mapInfoLv=mp=>{const lv=(MAPMOBS[mp]||[]).filter(x=>!x.m.boss).map(x=>x.m.lv);return lv.length?[Math.min(...lv),Math.max(...lv)]:null};
const mapInfoOpenTxt=mp=>isClosed(mp)?`not open yet${mapArrives(mp)?` · ${mapArrives(mp)}`:""}`:lvLocked(mp)?`needs base Lv ${mapMinLv(mp)}`:"open";
const mapInfoPick=k=>{state.mapInfo=k;save();renderMapInfo()};
function renderMapInfo(){
  const mp=mapInfoKey(),q=$("mapInfoIn").value.trim().toLowerCase(),onlyOpen=$("mapInfoOpen").checked=!!state.mapInfoOpen;
  worldMap($("infoWorld"),mp,mapInfoPick);
  // the picked map: its picture, where it is, and its monsters
  const v=typeof MINIMAPS!=="undefined"&&MINIMAPS[mp],wi=worldOf(mp),lv=mapInfoLv(mp),mobs=mapInfoMobs(mp);
  $("mapInfoSel").innerHTML=`<div class="bar"><h3 class="grow">${esc(mapName(mp)||mapCode(mp))} <span class="note mono">${esc(mapCode(mp))}</span></h3>
    <button type="button" class="primary small" data-planmap="${esc(mp)}">Plan this map</button></div>
    <div class="mapInfoTop"><div class="mapInfoTxt">
    <div class="note">${esc(mapInfoOpenTxt(mp))} · ${wi>=0?`on the ${esc(WORLDMAPS[wi].name)} map`:"not on the game's world map yet"}${lv?` · monsters Lv ${lv[0]}${lv[1]>lv[0]?`–${lv[1]}`:""}`:""}${isRoomMap(mp)?" · room dungeon":""}</div>
    <div class="infoList mt">${mobs.map(({m,n})=>`<div>${mobIcon(m.id,1,"il")}${infoLink("mob",m.id,m.name)}${BOSS_PILL(m)} <span class="note">Lv ${m.lv} · ≈${spN(n)}${m.boss?"":` · ${fmtExp(m)} EXP`}</span></div>`).join("")||'<div class="note">No monsters listed.</div>'}</div></div>
    ${v?`<a class="mapPic" href="img/maps/${esc(mp)}.png?v=${v}" target="_blank" rel="noopener" title="The map from the game client's map window. Click for full size"><img src="img/maps/${esc(mp)}.png?v=${v}" alt="Map of ${esc(mapName(mp)||mapCode(mp))}" width="512" height="512"></a>`:`<div class="note">The game client has no picture of this map.</div>`}</div>`;
  // every map, narrowed by the search (code, name, or a monster on it) and to open maps
  const rows=Object.keys(MAPMOBS).filter(k=>(!onlyOpen||!isClosed(k))&&(!q||[k,mapCode(k),mapName(k),...(MAPNAMES[k]||[]).slice(2),...MAPMOBS[k].map(x=>x.m.name)].some(s=>String(s).toLowerCase().includes(q))))
    .sort((a,b)=>mapCode(a).localeCompare(mapCode(b)));
  $("mapInfoTable").querySelector("tbody").innerHTML=rows.map(k=>{const l=mapInfoLv(k),ns=MAPMOBS[k].map(x=>x.n),w=worldOf(k);
    return `<tr data-mapinfo="${esc(k)}" class="${k===mp?"sel":""}" style="cursor:pointer"><td class="mono">${esc(mapCode(k))}</td><td>${esc(mapName(k))}</td><td>${MAPMOBS[k].length}</td><td>${l?`${l[0]}${l[1]>l[0]?`–${l[1]}`:""}`:"–"}</td><td>${ns.some(n=>n==null)?"?":"≈"+ns.reduce((a,n)=>a+n,0)}</td><td>${w>=0?esc(WORLDMAPS[w].name):"–"}</td><td>${isClosed(k)?`<span class="pill down">not open yet</span>`:"open"}</td></tr>`}).join("");
  $("mapInfoNote").textContent=`${rows.length} of ${Object.keys(MAPMOBS).length} maps`}
// typing narrows the table; picking a map from the list (or typing its code or name in full) shows it
$("mapInfoIn").addEventListener("input",e=>{const k=mapKey(e.target.value);if(k&&MAPMOBS[k]&&k!==state.mapInfo){state.mapInfo=k;save()}renderMapInfo()});
$("mapInfoOpen").addEventListener("change",e=>{state.mapInfoOpen=e.target.checked;save();renderMapInfo()});
$("mapInfoCard").addEventListener("click",e=>{
  const r=e.target.closest("[data-mapinfo]");if(r&&!e.target.closest("a,button")){mapInfoPick(r.dataset.mapinfo);return}
  const p=e.target.closest("[data-planmap]");if(p){state.map=p.dataset.planmap;save();showTab("maps");renderMap();$("mapCard").scrollIntoView({block:"start"})}});
