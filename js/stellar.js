// ---- Stellar tab: the ★ weapons on Global's client. Each takes 100 ★ Forging Certificates of its own weapon: Workshop Apprentice
// Nariya gives one for each monster-drop copy of that weapon (100 Book for ★ Book). The copies you still need, the monster you'd get
// them fastest from, and the Activation routes with your refine after (data/stellar.js). Saved per account in state.stellar: have
// {★ weapon id: its certificates plus copies of its weapon you have}, refine (your weapon's) ----
const STAR_W=EQUIP.filter(x=>x.name.startsWith("★ ")&&(x.slot||[]).includes("weapon")).sort((a,b)=>a.name.localeCompare(b.name));
const STAR_CERTS=STAR_ROUTES[0].cert[0];
// the weapons a ★ one's certificates come from: the ones of the same name (Book for ★ Book) that monsters drop
const starSrc=s=>EQUIP.filter(x=>x.name===s.name.slice(2)&&(x.slot||[]).includes("weapon")&&(itemInfo(x.id).d||[]).length);
// every monster (MVPs aside) on those weapons' drop lists: m (null when the monster tables don't have it), ds [[weapon id, chance % or
// null]], per: copies a kill gives you (the published chances, with your drop bonus and level penalty), unk: a chance isn't published
function starMobs(s){const by=new Map();
  starSrc(s).forEach(x=>(itemInfo(x.id).d||[]).forEach(([id,name,lv,kind,ch])=>{if(kind==="mvp")return;
    const o=by.get(id)||{id,name,lv,m:MOB_BY_ID.get(id)||null,ds:[]};o.ds.push([x.id,ch]);by.set(id,o)}));
  return [...by.values()].map(o=>({...o,per:o.ds.reduce((a,[,ch])=>ch==null?a:a+(o.m?yourCh(o.m,ch):ch)/100,0),unk:o.ds.some(d=>d[1]==null)}))}
// one you can farm: a normal monster (not Boss class) the monster tables have, on an open map
const starFarm=o=>o.m&&!o.m.boss&&openMaps(o.m).length;
// the one that gives you the most copies an hour at your kill speed (fight + walk); null when none has a published chance
function starBest(s,w=walkSec()){let best=null;
  starMobs(s).forEach(o=>{if(!(o.per>0)||!starFarm(o))return;const r=mobRow(o.m,w);if(!r||!isFinite(r.tot)||!(r.tot>0))return;
    const ph=o.per*3600/r.tot;if(!best||ph>best.ph)best={...o,ph,kph:3600/r.tot}});
  return best}
// a place ("prontera 272 264") as the game's Navigation command: /navi prontera 272/264
const starNavi=at=>{const [mp,x,y]=at.split(" ");return y?`/navi ${mp} ${x}/${y}`:`/navi ${mp}`};
const starLeft=s=>Math.max(0,STAR_CERTS-(state.stellar.have[s.id]||0));
const starDur=h=>h>0?fmtDur(h).split("\n")[0]:"done";
const starMob=o=>`${o.m?mobIcon(o.id,1,"il")+infoLink("mob",o.id,o.name):esc(o.name)}`;
const starDrops=o=>o.ds.map(([id,ch])=>`<div>${itemIcon(id,1,"il")}${infoLink("gear",id,BUILD.item(id).name)} <span class="note">${chTxt(ch)}${o.m&&ch!=null&&yourCh(o.m,ch)!==ch?` (you ${chTxt(yourCh(o.m,ch))})`:""}</span></div>`).join("");
// the best monster, then the others on an open map whose chance isn't published; with no best, every one that drops it and why it can't be timed
function starHow(s,b){const all=starMobs(s),open=all.filter(starFarm),unk=open.filter(o=>!(o.per>0)&&(!b||o.id!==b.id));
  const list=os=>os.map(o=>`<div>${starMob(o)} <span class="note">Lv ${o.lv}${o.m&&openMaps(o.m).length?` · ${mapCode(openMaps(o.m)[0][0])}`:""}</span></div>`).join("");
  if(b)return `${starMob(b)} <span class="note">Lv ${b.lv} · ${mapCode(openMaps(b.m)[0][0])}</span>${starDrops(b)}
    <span class="note">${pct(b.per*100)} a kill for you · ${fmtN(b.kph)} kills/hr</span>${unk.length?`<div class="note">No published rate:</div>${list(unk)}`:""}`;
  if(unk.length)return `<span class="note">No published drop rate yet, so no time:</span>${list(unk)}`;
  if(all.length)return `<span class="note">None on an open map you can farm:</span>${list(all)}`;
  return '<span class="note">No monster drops it</span>'}
function renderStar(){const S=state.stellar,w=walkSec();
  $("starRows").innerHTML=STAR_W.map(s=>{const left=starLeft(s),b=left?starBest(s,w):null,src=starSrc(s);
    return `<tr><td class="name">${itemIcon(s.id,1,"il")}${infoLink("gear",s.id,s.name)}<div class="note">${esc(BUILD.WTYPE[s.type]||"")}</div></td>
      <td class="name">${src.length?src.map(x=>`<div>${itemIcon(x.id,1,"il")}${infoLink("gear",x.id,x.name)} <span class="note">${x.slots} slot${x.slots===1?"":"s"}</span></div>`).join(""):'<span class="note">–</span>'}</td>
      <td><input class="w-xs" type="number" min="0" step="1" data-starhave="${s.id}" value="${S.have[s.id]||""}" placeholder="0" aria-label="${esc(s.name)} certificates you have"></td>
      <td>${left?left:'<span class="pill up">done</span>'}</td><td class="name">${left?starHow(s,b):"–"}</td>
      <td class="mono">${b?b.ph.toFixed(2):"–"}</td><td class="mono">${b?starDur(left/b.ph):left?"–":"done"}</td></tr>`}).join("");
  $("starRefine").value=S.refine||"";
  $("starRoutes").innerHTML=STAR_ROUTES.map(r=>`<tr><td class="name">${esc(r.name)}${r.tw?' <span class="pill">Taiwan</span>':""}</td><td>−${r.refine}</td>
    <td class="name">${r.cert[0]} ${esc(r.cert[1])}</td><td>${r.frag}</td><td class="mono">${S.refine?`+${S.refine} → +${Math.max(0,S.refine-r.refine)}`:"–"}</td></tr>`).join("");
  $("starNpcs").innerHTML=STAR_NPCS.map(([n,at,what])=>`<tr><td class="name"><b>${esc(n)}</b></td><td class="mono"><span class="navi" title="Type it in the game's chat: the Navigation shows you the way">${esc(starNavi(at))}</span></td><td class="name">${esc(what)}</td></tr>`).join("")}
$("starCard").addEventListener("input",e=>{const t=e.target.dataset.starhave;if(t==null)return;
  const v=Math.max(0,Math.round(num(e.target.value)));if(v)state.stellar.have[t]=v;else delete state.stellar.have[t];save()});
$("starCard").addEventListener("change",e=>{if(e.target.dataset.starhave!=null)renderStar()});
$("starRefine").addEventListener("change",e=>{state.stellar.refine=Math.min(20,Math.max(0,Math.round(num(e.target.value))));save();renderStar()});
