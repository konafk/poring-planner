// ---- Stellar tab: the ★ weapons on Global's client grouped by weapon type (a ★ Forging Certificate is per type), the certificates
// each type still needs for an activation and the monster you'd get them fastest from, and the Activation routes with your refine after
// (data/stellar.js). Saved per account in state.stellar: have {weapon type: certificates plus monster-drop weapons of it you have},
// refine (your weapon's) ----
const STAR_W=EQUIP.filter(x=>x.name.startsWith("★ ")&&(x.slot||[]).includes("weapon"));
const STAR_TYPES=[...new Set(STAR_W.map(x=>x.type))].sort((a,b)=>BUILD.WTYPE[a].localeCompare(BUILD.WTYPE[b]));
const STAR_CERTS=STAR_ROUTES[0].cert[0];
// weapon type by item id, for every weapon that isn't a ★ one
const DROP_W=Object.fromEntries(EQUIP.filter(x=>(x.slot||[]).includes("weapon")&&!x.name.startsWith("★")).map(x=>[x.id,x.type]));
// the monsters (bosses aside) that drop a weapon of type t, with the certificates a kill gives you: each drop's chance with your drop
// bonus and level penalty. unk: one of its drops has no published rate yet
function starMobs(t){return MOBS.filter(m=>!m.boss&&(m.drops||[]).some(([id])=>DROP_W[id]===t)).map(m=>{const ds=m.drops.filter(([id])=>DROP_W[id]===t);
  return {m,ds,per:ds.reduce((a,[,ch])=>ch==null?a:a+Math.min(100,ch*dropMul()*penMul(m))/100,0),unk:ds.some(d=>d[1]==null)}})}
// the one that gives you the most certificates an hour at your kill speed (fight + walk), on a map that's open; null when none can
function starBest(t,w=walkSec()){let best=null;
  starMobs(t).forEach(x=>{if(!(x.per>0)||!openMaps(x.m).length)return;const r=mobRow(x.m,w);if(!r||!isFinite(r.tot)||!(r.tot>0))return;
    const ph=x.per*3600/r.tot;if(!best||ph>best.ph)best={...x,ph,kph:3600/r.tot}});
  return best}
const starLeft=t=>Math.max(0,STAR_CERTS-(state.stellar.have[t]||0));
const starDur=h=>h>0?fmtDur(h).split("\n")[0]:"done";
function renderStar(){const S=state.stellar,w=walkSec();
  $("starRows").innerHTML=STAR_TYPES.map(t=>{const left=starLeft(t),b=left?starBest(t,w):null,mp=b&&openMaps(b.m)[0][0];
    const wpns=STAR_W.filter(x=>x.type===t).map(x=>infoLink("gear",x.id,x.name)).join("<br>");
    const how=!left?"–":b?`${infoLink("mob",b.m.id,b.m.name)} <span class="note">Lv ${b.m.lv} · ${mapCode(mp)}<br>${pct(b.per*100)} a kill · ${fmtN(b.kph)} kills/hr</span>`
      :`<span class="note">${starMobs(t).length?"none you can farm on an open map":"no monster drops one"}</span>`;
    return `<tr><td class="name">${esc(BUILD.WTYPE[t])}</td><td class="name">${wpns}</td>
      <td><input class="w-xs" type="number" min="0" step="1" data-starhave="${t}" value="${S.have[t]||""}" placeholder="0" aria-label="${esc(BUILD.WTYPE[t])} certificates you have"></td>
      <td>${left?left:'<span class="pill up">done</span>'}</td><td class="name">${how}</td>
      <td class="mono">${b?b.ph.toFixed(2):"–"}</td><td class="mono">${b?starDur(left/b.ph):left?"–":"done"}</td></tr>`}).join("");
  $("starRefine").value=S.refine||"";
  $("starRoutes").innerHTML=STAR_ROUTES.map(r=>`<tr><td class="name">${esc(r.name)}${r.tw?' <span class="pill">Taiwan</span>':""}</td><td>−${r.refine}</td>
    <td class="name">${r.cert[0]} ${esc(r.cert[1])}</td><td>${r.frag}</td><td class="mono">${S.refine?`+${S.refine} → +${Math.max(0,S.refine-r.refine)}`:"–"}</td></tr>`).join("");
  $("starNpcs").innerHTML=STAR_NPCS.map(([n,at,what])=>`<tr><td class="name"><b>${esc(n)}</b></td><td class="mono">${esc(at)}</td><td class="name">${esc(what)}</td></tr>`).join("")}
$("starCard").addEventListener("input",e=>{const t=e.target.dataset.starhave;if(t==null)return;
  const v=Math.max(0,Math.round(num(e.target.value)));if(v)state.stellar.have[t]=v;else delete state.stellar.have[t];save()});
$("starCard").addEventListener("change",e=>{if(e.target.dataset.starhave!=null)renderStar()});
$("starRefine").addEventListener("change",e=>{state.stellar.refine=Math.min(20,Math.max(0,Math.round(num(e.target.value))));save();renderStar()});
