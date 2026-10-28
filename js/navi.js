// ---- the game's Navigation (data/navi.js, tools/export_navi.py): each map's NPCs and ways out on its picture, the towns' Kafra teleports,
// and the walk to a spawn map from your save town (state.saveTown; blank: whichever town is nearest). Distances are the client's, in cells
const naviOn=()=>typeof NAVI_ROUTES!=="undefined";
const naviName=c=>mapName(c)||(typeof NAVI_NAMES!=="undefined"&&NAVI_NAMES[c])||c;
// a map the page has: a spawn map or a town
const naviKnown=c=>!!(MAPMOBS[c]||isTown(c));
// seconds a cell takes at normal walking speed (150 ms; Increase AGI and speed potions are faster)
const NAVI_CELL_S=0.15;
const naviTime=cells=>{const s=cells*NAVI_CELL_S;return s<60?`${Math.max(1,Math.round(s))}s`:`${Math.round(s/60)} min`};
// the towns whose Kafra Employee teleports you to map k
const naviKafraFrom=k=>Object.keys(typeof NAVI_KAFRA==="undefined"?{}:NAVI_KAFRA).filter(t=>isTown(t)&&NAVI_KAFRA[t].includes(k));
// the shortest way from your save town to spawn map mp, on foot from the town itself or from where its Kafra teleports you:
// {start, cells, steps, kafra (the town you teleport from, or null), from (your save town, or null when it gets nowhere near mp)}
function naviRoute(mp,from=state.saveTown){
  const rs=naviOn()&&NAVI_ROUTES[mp];if(!rs||!rs.length)return null;
  const mk=([start,cells,steps],via)=>({start,cells,steps,kafra:via});
  if(from){const r=rs.find(([s])=>s===from||(NAVI_KAFRA[from]||[]).includes(s));if(r)return {...mk(r,r[0]===from?null:from),from}}
  // nearest start: a town, or a map some town's Kafra teleports you to
  const r=rs.find(([s])=>isTown(s)||naviKafraFrom(s).length);if(!r)return null;
  return {...mk(r,isTown(r[0])?null:naviKafraFrom(r[0])[0]),from:null}}
// a map name that opens it (on the Maps tab, or in the Map planner when the map's there): only maps the page has. code: with its code too
// (several fields share a name)
const naviLink=(c,code)=>{const t=esc(naviName(c))+(code?` <span class="note mono">${esc(mapCode(c))}</span>`:"");return naviKnown(c)?`<a href="#" data-navito="${esc(c)}">${t}</a>`:t};
// a list of maps by name, with the codes of the ones that share a name
const naviLinks=cs=>{const n={};cs.forEach(c=>n[naviName(c)]=(n[naviName(c)]||0)+1);return cs.map(c=>naviLink(c,n[naviName(c)]>1)).join(" · ")};
const naviStepTxt=([,x,y,npc])=>npc?`talk to ${npc} at ${x}, ${y}`:`portal at ${x}, ${y}`;
// the walk as a chain of maps: the start, each map you cross (rooms of one map as one), then mp
function naviSteps(mp,r){
  const groups=[];r.steps.forEach(st=>{const g=groups[groups.length-1];if(g&&g.map===st[0])g.out.push(st);else groups.push({map:st[0],out:[st]})});
  return `<ol class="naviSteps">${groups.map(g=>`<li title="${esc(g.out.map(naviStepTxt).join(", then "))}">${naviLink(g.map)} <span class="note">${esc(naviStepTxt(g.out[g.out.length-1]))}</span></li>`).join("")}<li><b>${esc(naviName(mp))}</b></li></ol>`}
const naviTownSel=()=>`<select data-savetown aria-label="Save town"><option value="">nearest town</option>${Object.entries(TOWNS).sort((a,b)=>a[1].localeCompare(b[1])).map(([k,n])=>`<option value="${esc(k)}"${k===state.saveTown?" selected":""}>${esc(n)}</option>`).join("")}</select>`;
// "Getting there" for spawn map mp: from your save town (picked here), the Kafra teleport if any, the walk and its maps
function naviRouteHtml(mp){
  if(!naviOn()||!MAPMOBS[mp])return "";
  const r=naviRoute(mp),sel=`<label class="bar naviFrom">from ${naviTownSel()}</label>`;
  if(!r)return `<div class="naviRoute"><div class="bar"><b>Getting there</b>${sel}</div><div class="note">${NAVI_SIZE[mp]?"The game's Navigation has no way in to this map (an NPC or quest takes you there).":"The game's Navigation doesn't have this map yet."}</div></div>`;
  const far=state.saveTown&&!r.from?`<div class="note">None of ${esc(TOWNS[state.saveTown])}'s ways (on foot or by its Kafra) is among the nearest to this map; the nearest:</div>`:"";
  const kafra=r.kafra?`Kafra teleport from ${naviLink(r.kafra)} to ${naviLink(r.start)}, then walk`:r.steps.length?`walk from ${naviLink(r.start)}`:"";
  return `<div class="naviRoute"><div class="bar"><b>Getting there</b>${sel}</div>${far}
    <div>${kafra} <span class="note">≈${fmtN(r.cells)} cells, about ${naviTime(r.cells)} on foot</span></div>${naviSteps(mp,r)}</div>`}
// where cell x, y of map mp is on its picture, in %: the client draws the map in the middle of its square picture, keeping its shape, north up
function naviAt(mp,x,y){const [w,h]=(typeof NAVI_SIZE!=="undefined"&&NAVI_SIZE[mp])||[0,0],m=Math.max(w,h);if(!m)return null;return [((m-w)/2+x)/m*100,((m-h)/2+h-y)/m*100]}
const NAVI_KIND={k:"Kafra Employee",s:"shop",w:"sends you to another map"};
// markers over mp's picture: its ways out (click: that map) and the NPCs worth finding (Kafra, shops, NPCs that send you somewhere; on a map
// with few NPCs, all of them)
function naviMarks(mp){
  if(!naviOn())return "";
  const at=(x,y)=>{const p=naviAt(mp,x,y);return p?`left:${p[0].toFixed(2)}%;top:${p[1].toFixed(2)}%`:null};
  const npcs=NAVI_NPCS[mp]||[],few=npcs.length<=8;
  const ws=(NAVI_WARPS[mp]||[]).map(([x,y,to,npc])=>{const s=at(x,y);if(!s)return "";const t=`${npc?`${npc}: `:""}${to===mp?"another part of this map":`to ${naviName(to)}`} (${x}, ${y})`;
    // doors into buildings and other maps the page doesn't have: smaller, so the ways to fields, dungeons and towns stand out
    return naviKnown(to)&&to!==mp?`<button type="button" class="naviMark warp" style="${s}" data-navito="${esc(to)}" title="${esc(t)}" aria-label="${esc(t)}"></button>`:`<span class="naviMark warp minor" style="${s}" title="${esc(t)}"></span>`});
  const ns=npcs.filter(n=>few||n[3]).map(([n,x,y,k])=>{const s=at(x,y);return s?`<span class="naviMark npc ${k||""}" style="${s}" title="${esc(`${n}${k&&NAVI_KIND[k]&&k!=="k"?` (${NAVI_KIND[k]})`:""} (${x}, ${y})`)}"></span>`:""});
  return `<div class="naviMarks">${ns.join("")}${ws.join("")}</div>`}
// the lists under the picture: where the Kafra teleports you, the ways out, the NPCs (the ones worth finding first)
function naviLists(mp){
  if(!naviOn())return "";
  const ws=[...new Set((NAVI_WARPS[mp]||[]).map(w=>w[2]).filter(t=>t!==mp))].sort((a,b)=>naviName(a).localeCompare(naviName(b)));
  const kaf=(NAVI_KAFRA[mp]||[]).filter(t=>t!==mp).sort((a,b)=>naviName(a).localeCompare(naviName(b)));
  const npcs=(NAVI_NPCS[mp]||[]).slice().sort((a,b)=>(a[3]?0:1)-(b[3]?0:1)||a[0].localeCompare(b[0]));
  const npcLi=([n,x,y,k])=>`<li class="${k?"":"note"}"><span class="naviDot npc ${k||""}"></span>${esc(n)} <span class="note">${x}, ${y}${k&&k!=="k"?` · ${NAVI_KIND[k]}`:""}</span></li>`;
  return `${kaf.length?`<div class="mt"><b>Kafra teleports to</b> <span class="note">(for a fee)</span> ${naviLinks(kaf)}</div>`:""}
    ${ws.length?`<div class="mt"><b>Ways out</b> <span class="naviDot warp"></span> ${naviLinks(ws)}</div>`:""}
    ${npcs.length?`<details class="more naviNpcs mt"${npcs.length<=8?" open":""}><summary>NPCs here <span class="note">${npcs.length}</span></summary><ul class="naviList">${npcs.map(npcLi).join("")}</ul></details>`:""}`}
// the picture with its markers (a link to the full size one under them)
const naviPic=(mp,v,cls="")=>`<div class="naviPic ${cls}"><a class="mapPic" href="img/maps/${esc(mp)}.png?v=${v}" target="_blank" rel="noopener" title="The map from the game client's map window. Click for full size"><img src="img/maps/${esc(mp)}.png?v=${v}" alt="Map of ${esc(mapName(mp)||mapCode(mp))}" width="512" height="512"></a>${naviMarks(mp)}</div>`;
// picking a save town re-draws both places that show the way; clicking a map's name opens it: in the Map planner when it's a spawn map
// clicked there, else on the Maps tab
document.addEventListener("change",e=>{const s=e.target.closest("[data-savetown]");if(!s)return;
  if(s.value)state.saveTown=s.value;else delete state.saveTown;save();renderMap();if(state.tab==="mapinfo")renderMapInfo()});
document.addEventListener("click",e=>{const a=e.target.closest("[data-navito]");if(!a)return;e.preventDefault();const k=a.dataset.navito;
  if(a.closest("#mapCard")&&MAPMOBS[k]){planPick(k);return}
  state.mapInfo=k;save();if(state.tab!=="mapinfo")showTab("mapinfo");renderMapInfo();$("mapInfoSel").scrollIntoView({block:"nearest"})});
