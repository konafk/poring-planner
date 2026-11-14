// ---- Refine calculator (Simulators): what taking a piece of gear from one refine to another costs on average, with the official rates
// (data/refinerates.js). Each try is a step in a chain: a success goes up 1; a failure with the normal or Enriched ore destroys the
// piece (and its cards), so you start again on a new one at +0; with the HD ore (+7 and up, to +10) it goes down 1. The expected tries
// at each refine are the chain's expected visits from where you start, which give the ore, fees and pieces destroyed. "Cheapest" picks
// the ore for each try that makes the whole climb cheapest at your prices (policy iteration on the same chain). Saved per account in
// state.refcalc: slot (a piece of your gear it started from, or ""), type, from, to, plan, steps (the ore per try when you pick them:
// {refine it takes it to: "n" | "e" | "h"}), px (the prices you typed, by ore name) and base (a new piece's price) ----
const RC_TYPES=[["armor","Armor"],["weapon_lv1","Weapon Lv 1"],["weapon_lv2","Weapon Lv 2"],["weapon_lv3","Weapon Lv 3"],["weapon_lv4","Weapon Lv 4"]];
const RC_PLANS=[["n","Normal ore"],["e","Enriched ore"],["nh","Normal, HD from +7"],["eh","Enriched, HD from +7"],["best","Cheapest at your prices"],["custom","Pick each try's ore"]];
const RC_KIND={n:"normal",e:"Enriched",h:"HD"};
// the ores a try to +lv can use: HD only on armor and Lv 3–4 weapons, from +7
const rcOpts=(type,lv)=>["n","e",...(REFINE_ORE[type].h&&lv>REFINE_HD_FROM?["h"]:[])];
const rcOre=(type,o)=>REFINE_ORE[type][o];
const rcRate=(type,o,lv)=>REFINE_RATES[type][o==="e"?"e":"n"][lv-1]/100;
// a piece of your gear: its refine schedule (the build simulator's), as a calculator type
const rcTypeOf=it=>{const k=it&&(REFINE_RATES[it.refine]?it.refine:(it.slot||[]).includes("weapon")?`weapon_lv${it.wlv||1}`:"armor");return REFINE_RATES[k]?k:"armor"};
const rcGear=rc=>{const g=rc.slot&&(buildOf(C()).gear||{})[rc.slot];return g&&g.id&&BUILD.item(g.id)?{g,it:BUILD.item(g.id)}:null};
// one ore's price: what you typed here, else your Market price for it, else an NPC's; null when none is known
const rcDefPrice=(type,o)=>{const [id,,,npc]=rcOre(type,o);return id!=null&&state.prices[id]>0?state.prices[id]:npc};
const rcPrice=(type,o,rc=state.refcalc)=>{const v=rc.px[rcOre(type,o)[1]];return v!=null?v:rcDefPrice(type,o)};
// a new piece: what you typed, else your Market price for the piece of your gear picked; 0 when neither
const rcDefBase=rc=>{const x=rcGear(rc);return x&&state.prices[x.it.id]>0?state.prices[x.it.id]:null};
const rcBase=rc=>rc.base!=null?rc.base:rcDefBase(rc)??0;
// solve A x = b (a few rows: Gauss-Jordan with partial pivoting); null when it can't
function rcSolve(A,b){const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
    const d=M[c][c];if(Math.abs(d)<1e-12)return null;
    for(let r=0;r<n;r++)if(r!==c){const f=M[r][c]/d;if(f)for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
  return M.map((r,i)=>r[n]/r[i])}
// the chain: Q[j][k], the chance a try at +j leaves the gear at +k, for the refines below the target (a destroyed piece: a new one at +0)
function rcQ(type,to,plan){const Q=Array.from({length:to},()=>Array(to).fill(0));
  for(let j=0;j<to;j++){const o=plan[j+1],p=rcRate(type,o,j+1);if(j+1<to)Q[j][j+1]+=p;Q[j][o==="h"?j-1:0]+=1-p}
  return Q}
const rcI=(n,f)=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,k)=>(i===k?1:0)-f(i,k)));
// the ore for each try, {refine it takes it to: ore}
function rcPlan(rc=state.refcalc){const t=rc.type,out={};
  if(rc.plan==="best")return rcBest(rc);
  for(let lv=1;lv<=10;lv++){const ok=rcOpts(t,lv);
    const o=rc.plan==="custom"?rc.steps[lv]:rc.plan==="nh"||rc.plan==="eh"?(lv>REFINE_HD_FROM&&ok.includes("h")?"h":rc.plan[0]):rc.plan;
    out[lv]=ok.includes(o)?o:"n"}
  return out}
// Cheapest: start from the normal ore everywhere, then switch each try to the ore that makes the rest of the climb cheapest, until
// nothing changes. A try costs the fee, the ore, and a new piece when it breaks one; an ore with no price known isn't considered
function rcBest(rc){const {type,to}=rc,base=rcBase(rc),plan={};for(let lv=1;lv<=10;lv++)plan[lv]="n";
  const cost=(o,lv)=>{const px=rcPrice(type,o,rc);if(px==null&&o!=="n")return Infinity;return rcOre(type,o)[2]+(px||0)+(o==="h"?0:(1-rcRate(type,o,lv))*base)};
  for(let it=0;it<40;it++){const Q=rcQ(type,to,plan),V=rcSolve(rcI(to,(i,k)=>Q[i][k]),Array.from({length:to},(_,j)=>cost(plan[j+1],j+1)));if(!V)break;
    let changed=false;
    for(let j=0;j<to;j++){const lv=j+1;let bo=plan[lv],bv=Infinity;
      for(const o of rcOpts(type,lv)){const c=cost(o,lv);if(!isFinite(c))continue;const p=rcRate(type,o,lv);
        const v=c+p*(lv<to?V[lv]:0)+(1-p)*(o==="h"?V[j-1]:V[0]);if(v<bv-1e-6||(o===plan[lv]&&v<=bv+1e-6)){bv=v;bo=o}}
      if(bo!==plan[lv]){plan[lv]=bo;changed=true}}
    if(!changed)break}
  return plan}
// the climb from +from to +to with a plan: per try its expected count, and the totals; chance: this piece gets there without breaking
function rcCalc(rc=state.refcalc,plan=rcPlan(rc)){const {type,from,to}=rc,n=to;
  const Q=rcQ(type,to,plan),x=rcSolve(rcI(n,(i,k)=>Q[k][i]),Array.from({length:n},(_,i)=>i===from?1:0));
  const h=rcSolve(rcI(n,(j,k)=>{const o=plan[j+1],p=rcRate(type,o,j+1);return (k===j+1?p:0)+(o==="h"&&k===j-1?1-p:0)}),
    Array.from({length:n},(_,j)=>j+1===to?rcRate(type,plan[j+1],j+1):0));
  if(!x||!h)return null;
  const steps=x.map((v,j)=>{const lv=j+1,o=plan[lv],p=rcRate(type,o,lv),[id,name,fee]=rcOre(type,o),px=rcPrice(type,o,rc);
    return {lv,o,p,tries:v,id,name,fee,px,broke:o==="h"?0:v*(1-p)}});
  const ore={};steps.forEach(s=>{const x=ore[s.name]=ore[s.name]||{name:s.name,id:s.id,px:s.px,n:0};x.n+=s.tries});
  const sum=f=>steps.reduce((a,s)=>a+f(s),0),broke=sum(s=>s.broke),base=rcBase(rc);
  const fees=sum(s=>s.tries*s.fee),oreZ=sum(s=>s.px==null?0:s.tries*s.px),unpriced=Object.values(ore).filter(o=>o.px==null).map(o=>o.name);
  return {steps,plan,tries:sum(s=>s.tries),broke,chance:h[from],ore:Object.values(ore),fees,oreZ,pieceZ:broke*base,total:fees+oreZ+broke*base,unpriced}}
// what the refines add: the build simulator's table (data/refine.js) for the gear picked, else for the type
const rcGain=rc=>{const x=rcGear(rc),at=r=>r<1?[0,0,0]:x?BUILD.refineAt(x.it,r):(REFINE[rc.type]||[])[r-1]||[0,0,0];
  const a=at(rc.from),b=at(rc.to),d=b.map((v,i)=>v-a[i]);
  return rc.type==="armor"?`DEF +${d[2]}`:`ATK +${d[0]}${d[1]?` · MATK +${d[1]}`:""}`};
const rcN=v=>!isFinite(v)?"–":v<10?v.toFixed(2).replace(/\.?0+$/,""):v<1000?v.toFixed(1).replace(/\.0$/,""):fmtN(v);
const rcPct=v=>v>=.9995?"100%":v>=.1?`${(v*100).toFixed(0)}%`:v>=.001?`${+(v*100).toFixed(2)}%`:`${+(v*100).toPrecision(2)}%`;
let RC_PX_TYPE="";
// the price boxes, for the ores the type can use and a new piece: drawn again when the type or the gear picked changes
function rcPxRow(rc){const k=rc.type+"|"+rc.slot;if(RC_PX_TYPE===k)return;RC_PX_TYPE=k;const x=rcGear(rc);
  $("rcPx").innerHTML=Object.keys(REFINE_ORE[rc.type]).map(o=>{const [id,name]=rcOre(rc.type,o),d=rcDefPrice(rc.type,o),v=rc.px[name];
    return `<label title="One ${esc(name)}: empty takes ${d!=null?`${id!=null&&state.prices[id]>0?"your Market price":"an NPC's price"} (${fmtN(d)} z)`:"no price (none known: type one)"}">${esc(name)}<input class="w-md" type="number" min="0" step="1" data-rcpx="${esc(name)}" value="${v??""}" placeholder="${d!=null?fmtN(d):"price"}"></label>`}).join("")
    +`<label title="A new +0 piece, for each one a failure destroys: empty is ${x&&state.prices[x.it.id]>0?"your Market price for it":"0"}">New piece<input class="w-md" type="number" min="0" step="1" id="rcBase" value="${rc.base??""}" placeholder="${rcDefBase(rc)!=null?fmtN(rcDefBase(rc)):"0"}"></label>`}
function renderRefCalc(){const rc=state.refcalc,b=buildOf(C()),x=rcGear(rc);
  // your gear, the pieces that refine (weapons, armor, shields, headgear, garments, shoes: not accessories or ammo)
  $("rcSlot").innerHTML=`<option value="">Any piece</option>`+BUILD.SLOTS.filter(s=>!/^acc|ammo/.test(s.k)).map(s=>{const g=(b.gear||{})[s.k],it=g&&g.id&&BUILD.item(g.id);
    return it?`<option value="${s.k}">${esc(s.label)}: ${g.refine?`+${g.refine} `:""}${esc(it.name)}</option>`:""}).join("");
  $("rcSlot").value=x?rc.slot:"";$("rcType").value=rc.type;$("rcFrom").value=rc.from;$("rcTo").value=rc.to;$("rcPlan").value=rc.plan;
  rcPxRow(rc);
  const r=rcCalc(rc);if(!r){$("rcTiles").innerHTML="";$("rcRows").innerHTML="";$("rcNote").textContent="";return}
  const tile=(k,v,s)=>infoTile(k,v,s);
  $("rcTiles").innerHTML=tile("Tries",rcN(r.tries),`${fmtN(r.fees)} z in the Blacksmith's fees`)
    +tile("Pieces destroyed",rcN(r.broke),`this one gets there ${rcPct(r.chance)} of the time${r.broke>0?", its cards lost with it":""}`)
    +tile("Zeny",`${r.unpriced.length?"≥ ":""}${fmtN(r.total)}`,`fees ${fmtN(r.fees)} · ore ${r.unpriced.length?r.oreZ?`≥ ${fmtN(r.oreZ)}`:"?":fmtN(r.oreZ)}${r.broke>0?` · new pieces ${fmtN(r.pieceZ)}`:""}`)
    +r.ore.map(o=>tile(esc(o.name),rcN(o.n),o.px!=null?`${fmtN(o.px)} z each`:"no price: type one above")).join("");
  $("rcNote").innerHTML=`${x?`${itemIcon(x.it.id,1,"il")}${infoLink("item",x.it.id,x.it.name)}: `:""}+${rc.from} → +${rc.to} adds ${rcGain(rc)}. On average, counting the pieces a failure destroys${r.steps.some(s=>s.o==="h")?" and the refines HD ore loses":""}.`
    +(r.unpriced.length?` <span class="bad">No price for ${r.unpriced.map(esc).join(", ")}: type it above${rc.plan==="best"?" for Cheapest to weigh it":""}.</span>`:"")
    +(rc.plan==="best"&&Object.keys(REFINE_ORE[rc.type]).some(o=>o!=="n"&&rcPrice(rc.type,o,rc)==null)?` <span class="note">Cheapest only weighs the ores it has a price for.</span>`:"");
  $("rcRows").innerHTML=r.steps.map(s=>{const ok=rcOpts(rc.type,s.lv),before=s.lv<=rc.from;
    return `<tr class="${before?"muted":""}"${before?' title="Only after a failure destroys the piece: the new one starts at +0"':""}><td class="mono">+${s.lv-1} → +${s.lv}</td>
      <td class="l"><select data-rcstep="${s.lv}" aria-label="Ore for the try to +${s.lv}">${ok.map(o=>`<option value="${o}"${o===s.o?" selected":""}>${esc(rcOre(rc.type,o)[1])}</option>`).join("")}</select></td>
      <td>${rcPct(s.p)}</td><td class="l">${s.o==="h"?`back to +${s.lv-2}`:'<span class="bad">destroyed</span>'}</td><td>${rcN(s.tries)}</td>
      <td>${s.px==null?`≥ ${fmtN(s.tries*s.fee)}`:fmtN(s.tries*(s.fee+s.px))}</td></tr>`}).join("")}
// a refine from a piece of your gear (its slot): its type, refine, and the next refine up as the target
function openRefCalc(slot){const rc=state.refcalc,g=(buildOf(C()).gear||{})[slot],it=g&&g.id&&BUILD.item(g.id);if(!it)return;
  const from=Math.min(9,Math.max(0,Math.round(num(g.refine))));
  Object.assign(rc,{slot,type:rcTypeOf(it),from,to:Math.max(from+1,Math.min(10,rc.to)),base:null});save()}
(function setupRefCalc(){
  $("rcType").innerHTML=RC_TYPES.map(([k,n])=>`<option value="${k}">${n}</option>`).join("");
  $("rcFrom").innerHTML=Array.from({length:10},(_,i)=>`<option value="${i}">+${i}</option>`).join("");
  $("rcTo").innerHTML=Array.from({length:10},(_,i)=>`<option value="${i+1}">+${i+1}</option>`).join("");
  $("rcPlan").innerHTML=RC_PLANS.map(([k,n])=>`<option value="${k}">${n}</option>`).join("");
  const card=$("refCalcCard");
  card.addEventListener("change",e=>{const t=e.target,rc=state.refcalc;
    if(t.id==="rcSlot"){if(t.value)openRefCalc(t.value);else{rc.slot="";rc.base=null;save()}}
    else if(t.id==="rcType"){rc.type=t.value;rc.slot="";rc.base=null}
    else if(t.id==="rcFrom"){rc.from=+t.value;if(rc.to<=rc.from)rc.to=rc.from+1}
    else if(t.id==="rcTo"){rc.to=+t.value;if(rc.from>=rc.to)rc.from=rc.to-1}
    else if(t.id==="rcPlan"){if(t.value==="custom")rc.steps={...rcPlan(rc)};rc.plan=t.value}
    // picking one try's ore: the plan becomes your own, starting from what it was
    else if(t.dataset.rcstep){const p=rcPlan(rc);p[+t.dataset.rcstep]=t.value;rc.steps=p;rc.plan="custom"}
    else return;
    save();renderRefCalc()});
  card.addEventListener("input",e=>{const t=e.target,rc=state.refcalc,v=t.value.trim()===""?null:Math.max(0,Math.round(num(t.value)));
    if(t.dataset.rcpx!=null){if(v==null)delete rc.px[t.dataset.rcpx];else rc.px[t.dataset.rcpx]=v}
    else if(t.id==="rcBase")rc.base=v;else return;
    save();renderRefCalc()});
})();
