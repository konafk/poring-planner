// ---- the game's Navigation (data/navi.js, tools/export_navi.py): each map's NPCs and ways out on its picture, the towns' Kafra teleports,
// and the walk to a spawn map from the nearest town (or from where a town's Kafra teleports you). Distances are the client's, in cells
const naviOn=()=>typeof NAVI_ROUTES!=="undefined";
// an MVP's room (b_gef_f03, b_pry_d04…): the Navigation's own map, reached from a field or floor; the page lists the MVP on that map (by
// the room's code without b_, or else the spawn map with a way into it), so the room stands for it
let NAVI_BOSS=null;
const naviBoss=c=>{if(!/^b_/.test(c)||typeof NAVI_WARPS==="undefined")return null;
  if(!NAVI_BOSS){NAVI_BOSS={};Object.entries(NAVI_WARPS).forEach(([mp,ws])=>ws.forEach(w=>{if(/^b_/.test(w[2])&&MAPMOBS[mp]&&!NAVI_BOSS[w[2]])NAVI_BOSS[w[2]]=mp}))}
  const k=mapKey(c.slice(2));return MAPMOBS[k]?k:NAVI_BOSS[c]||null};
// the MVP whose room c is: the MVP on the map it stands for
const naviMvp=c=>{const b=naviBoss(c);return b?MOBS.find(m=>m.mvp&&(SPAWN[m.id]||[]).some(x=>x[0]===b)):null};
const naviName=c=>{if(naviBoss(c)){const m=naviMvp(c);return m?`${m.name}'s room`:`${mapName(naviBoss(c))||NAVI_NAMES[c]||c} MVP room`}
  return mapName(c)||(typeof NAVI_NAMES!=="undefined"&&NAVI_NAMES[c])||c};
// a map the page has: a spawn map, a town, or an MVP's room (it opens the map the page lists the MVP on)
const naviKnown=c=>!!(MAPMOBS[c]||isTown(c)||naviBoss(c));
// what a link to c opens: an MVP's room opens the MVP's details (its spawns, drops and skills), any other map the map
const naviAttr=c=>{const m=naviMvp(c);return m?`data-info="mob:${m.id}"`:`data-navito="${esc(naviBoss(c)||c)}"`};
// seconds a cell takes at normal walking speed (150 ms; Increase AGI and speed potions are faster)
const NAVI_CELL_S=0.15;
const naviTime=cells=>{const s=cells*NAVI_CELL_S;return s<60?`${Math.max(1,Math.round(s))}s`:`${Math.round(s/60)} min`};
// the towns whose Kafra Employee teleports you to map k
const naviKafraFrom=k=>Object.keys(typeof NAVI_KAFRA==="undefined"?{}:NAVI_KAFRA).filter(t=>isTown(t)&&NAVI_KAFRA[t].includes(k));
// the shortest way to spawn map mp, on foot from a town or from where a town's Kafra teleports you:
// {start, cells, steps, kafra (the towns whose Kafra teleports you to start; empty when start is a town)}
function naviRoute(mp){
  const rs=naviOn()&&NAVI_ROUTES[mp];if(!rs||!rs.length)return null;
  const r=rs.find(([s])=>isTown(s)||naviKafraFrom(s).length);if(!r)return null;
  const [start,cells,steps]=r;return {start,cells,steps,kafra:isTown(start)?[]:naviKafraFrom(start)}}
// a map name that opens it in the Map card (Monsters & maps tab): only maps the page has. code: with its code too
// (several fields share a name)
const naviLink=(c,code)=>{const t=esc(naviName(c))+(code?` <span class="note mono">${esc(mapCode(c))}</span>`:"");return naviKnown(c)?`<a href="#" ${naviAttr(c)}>${t}</a>`:t};
// a list of maps by name, with the codes of the ones that share a name
const naviLinks=cs=>{const n={};cs.forEach(c=>n[naviName(c)]=(n[naviName(c)]||0)+1);return cs.map(c=>naviLink(c,n[naviName(c)]>1)).join(" · ")};
const naviStepTxt=([,x,y,npc])=>npc?`talk to ${npc} at ${x}, ${y}`:`portal at ${x}, ${y}`;
// the walk as a chain of maps: the start, each map you cross (rooms of one map as one), then mp
function naviSteps(mp,r){
  const groups=[];r.steps.forEach(st=>{const g=groups[groups.length-1];if(g&&g.map===st[0])g.out.push(st);else groups.push({map:st[0],out:[st]})});
  return `<ol class="naviSteps">${groups.map(g=>`<li title="${esc(g.out.map(naviStepTxt).join(", then "))}">${naviLink(g.map)} <span class="note">${esc(naviStepTxt(g.out[g.out.length-1]))}</span></li>`).join("")}<li><b>${esc(naviName(mp))}</b></li></ol>`}
// the maps mp's portals and NPCs lead to, by name
const naviWays=mp=>[...new Set((NAVI_WARPS[mp]||[]).map(w=>w[2]).filter(t=>t!==mp))].sort((a,b)=>naviName(a).localeCompare(naviName(b)));
// the Map planner's Getting there (open at first) and NPCs here (folded at first) remember being opened or folded, in state.collapsed:
// true is folded, false is opened when it starts folded
const NAVI_FOLD_ROUTE="Map planner: getting there",NAVI_FOLD_NPCS="Map planner: NPCs here";
const mapFoldOpen=(k,def)=>{const v=(state.collapsed||{})[k];return def?v!==true:v===false};
document.addEventListener("toggle",e=>{const d=e.target;if(!d.dataset||!d.dataset.mapfold)return;const k=d.dataset.mapfold,def=k===NAVI_FOLD_ROUTE,c=state.collapsed=state.collapsed||{};
  if(d.open===mapFoldOpen(k,def))return;if(d.open===def)delete c[k];else c[k]=!d.open;save()},true);
// "Getting there" for spawn map mp: the Kafra teleport if any, the walk and its maps, then its other ways out (not the map you came in from)
function naviRouteHtml(mp){
  if(!naviOn()||!MAPMOBS[mp])return "";
  const r=naviRoute(mp),from=r&&r.steps.length?r.steps[r.steps.length-1][0]:null,ws=naviWays(mp).filter(t=>t!==from);
  const out=ws.length?`<div class="mt"><span class="naviDot warp"></span> ${from?"Other ways out":"Ways out"}: ${naviLinks(ws)}</div>`:"";
  const sec=body=>`<details class="more naviRoute" data-mapfold="${NAVI_FOLD_ROUTE}"${mapFoldOpen(NAVI_FOLD_ROUTE,true)?" open":""}><summary>Getting there</summary>${body}</details>`;
  if(!r)return sec(`<div class="note">${NAVI_SIZE[mp]?"The game's Navigation has no way in to this map (an NPC or quest takes you there).":"The game's Navigation doesn't have this map yet."}</div>${out}`);
  const how=r.kafra.length?`Kafra teleport to ${naviLink(r.start)} <span class="note">(from ${naviLinks(r.kafra)})</span>, then walk`:r.steps.length?`walk from ${naviLink(r.start)}`:"";
  return sec(`
    <div>${how} <span class="note" title="${esc(`≈${fmtN(r.cells)} cells walked (a cell is one square of the game's map grid), at normal walking speed: ${NAVI_CELL_S} s a cell`)}">about ${naviTime(r.cells)} on foot</span></div>${naviSteps(mp,r)}${out}`)}
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
    return naviKnown(to)&&to!==mp?`<button type="button" class="naviMark warp" style="${s}" ${naviAttr(to)} title="${esc(t)}" aria-label="${esc(t)}"></button>`:`<span class="naviMark warp minor" style="${s}" title="${esc(t)}"></span>`});
  const ns=npcs.filter(n=>few||n[3]).map(([n,x,y,k])=>{const s=at(x,y);return s?`<span class="naviMark npc ${k||""}" style="${s}" title="${esc(`${n}${k&&NAVI_KIND[k]&&k!=="k"?` (${NAVI_KIND[k]})`:""} (${x}, ${y})`)}"></span>`:""});
  return `<div class="naviMarks">${ns.join("")}${ws.join("")}</div>`}
// the lists under the picture: where the Kafra teleports you, the ways out (a spawn map's are under Getting there), the NPCs (the ones
// worth finding first)
function naviLists(mp){
  if(!naviOn())return "";
  const ws=naviRouteHtml(mp)?[]:naviWays(mp);
  const kaf=(NAVI_KAFRA[mp]||[]).filter(t=>t!==mp).sort((a,b)=>naviName(a).localeCompare(naviName(b)));
  const npcs=(NAVI_NPCS[mp]||[]).slice().sort((a,b)=>(a[3]?0:1)-(b[3]?0:1)||a[0].localeCompare(b[0]));
  const npcLi=([n,x,y,k])=>`<li class="${k?"":"note"}"><span class="naviDot npc ${k||""}"></span>${esc(n)} <span class="note">${x}, ${y}${k&&k!=="k"?` · ${NAVI_KIND[k]}`:""}</span></li>`;
  return `${kaf.length?`<div class="mt"><b>Kafra teleports to</b> <span class="note">(for a fee)</span> ${naviLinks(kaf)}</div>`:""}
    ${ws.length?`<div class="mt"><b>Ways out</b> <span class="naviDot warp"></span> ${naviLinks(ws)}</div>`:""}
    ${npcs.length?`<details class="more naviNpcs mt" data-mapfold="${NAVI_FOLD_NPCS}"${mapFoldOpen(NAVI_FOLD_NPCS,false)?" open":""}><summary>NPCs here <span class="note">${npcs.length}</span></summary><ul class="naviList">${npcs.map(npcLi).join("")}</ul></details>`:""}`}
// the picture with its markers: only the markers click
const naviPic=(mp,v,cls="")=>`<div class="naviPic ${cls}"><div class="mapPic" title="The map from the game client's map window. Click a red square to go to that map"><img src="img/maps/${esc(mp)}.png?v=${v}" alt="Map of ${esc(mapName(mp)||mapCode(mp))}" width="512" height="512"></div>${naviMarks(mp)}</div>`;
// clicking a map's name opens it in the Map card (Monsters & maps tab; mapinfo.js): in place when clicked there
document.addEventListener("click",e=>{const a=e.target.closest("[data-navito]");if(!a)return;e.preventDefault();const k=a.dataset.navito;
  if(a.closest("#mapCard")){planPick(k);return}
  if($("infoDlg").open)$("infoDlg").close();openMap(k)});
