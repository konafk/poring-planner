// ---- Stylist tab (Simulators): a job's look in every clothes colour, hair style and hair colour the game client has, and its headgear
// and costumes, to try styles on any job. Saved per account in state.stylist = {job, sex, hair, color, dye, trans, gear: the normal
// headgear, cos: the costumes, each {upper, middle, lower, garment: item id}}; "Use as my look" copies the look (not what's worn) to the
// equipment window's (state.look), "Start from my look" brings yours in ----
// the look as it can be drawn: the job (yours, else Novice, when none is picked), its body (the transcendent one for a 2nd job with trans
// on), the gender it has (Bards are male, Dancers female), and how many hair styles, hair colours and clothes colours there are
function styleOf(){const S=JOB_SPRITES,t=state.stylist,job=S.body[t.job]?t.job:S.body[state.job]?state.job:"Novice";
  const canTrans=!!(EW_TRANS[job]&&S.trans&&S.trans[job]),tj=t.trans&&canTrans&&S.trans[job],bj=tj||S.body[job],sex=bj[t.sex]?t.sex:Object.keys(bj)[0];
  const pal=((S[tj?"transPal":"bodyPal"]||{})[job]||{})[sex],dyes=pal?pal.c.length:1,hairs=ewHairs(sex),hair=t.hair<=hairs?t.hair:1,colors=ewColors(sex,hair);
  return {job,trans:!!tj,canTrans,sex,one:Object.keys(bj).length<2,hair,hairs,color:t.color<colors?t.color:0,colors,dye:t.dye<dyes?t.dye:0,dyes,pal}}
let styPick=null;
// what can be worn: normal headgear (gear; normal garments show nothing on the character in game, so it has no garment slot) and
// costumes (cos), by slot, each with a look in the client (data/costumelooks.js), by name. A costume in a slot covers the headgear there
const STY_SLOTS=[["upper","Upper"],["middle","Middle"],["lower","Lower"],["garment","Garment"]];
const STY_KINDS=[["gear","Headgear"],["cos","Costume"]];
let STY_AT=["cos","upper"];
const styCosName=id=>((typeof CLIENT_ITEMS!=="undefined"&&CLIENT_ITEMS[id])||[])[0]||((typeof BUILD!=="undefined"&&BUILD.item(+id))||{}).name||`Item ${id}`;
// costumes' slots are data/costumes.js's, or data/costumelooks.js's for the few only the gear data has
const STY_COSTUMES=typeof COSTUME_LOOKS==="undefined"?{}:{...(typeof COSTUMES!=="undefined"?COSTUMES:{}),...COSTUME_LOOKS.cos};
const stySlotsOf=(kind,id)=>(kind==="cos"?STY_COSTUMES:COSTUME_LOOKS.gear)[id]||[];
const STY_COS=typeof COSTUME_LOOKS==="undefined"?{gear:{},cos:{}}:Object.fromEntries(STY_KINDS.map(([kind])=>[kind,Object.fromEntries(STY_SLOTS.map(([k])=>[k,
  Object.keys(kind==="cos"?STY_COSTUMES:COSTUME_LOOKS.gear).filter(id=>stySlotsOf(kind,id).includes(k)&&COSTUME_LOOKS.items[id]).sort((a,b)=>styCosName(a).localeCompare(styCosName(b)))]))]));
// whether a costume can be drawn on this look: headgear for the gender, a garment for the job's body (or its transcendent one) and gender
function styCosOk(id,v){const [kind,view]=COSTUME_LOOKS.items[id];
  if(kind==="h")return !!(COSTUME_LOOKS.head.at[view]||{})[v.sex];
  const b=COSTUME_LOOKS.robe.bodies[v.trans?v.job+"+":v.job];return !!(b&&(b.at[view]||{})[v.sex])}
// wear a piece (headgear or costume) in every slot it takes, taking off whatever of that kind was in them; or take it off when it's on
function styWear(kind,id){const c=state.stylist[kind],on=Object.values(c).includes(id);
  const off=x=>Object.keys(c).forEach(k=>{if(c[k]===x)delete c[k]});
  if(on){off(id);return}const sl=stySlotsOf(kind,id);sl.forEach(k=>{if(c[k])off(c[k])});sl.forEach(k=>{if(STY_SLOTS.some(([s])=>s===k))c[k]=id})}
function renderStyCos(v){const t=state.stylist,[kind,slot]=STY_AT,q=$("styCosQ").value.trim().toLowerCase();
  // a slot button per kind and slot, with what's worn there (a headgear with a costume in its highest slot is covered: greyed) and × to take it off
  $("stySlots").innerHTML=STY_KINDS.map(([kd,kn])=>`<div class="styKind"><b>${kn}</b>${STY_SLOTS.filter(([k])=>kd==="cos"||k!=="garment").map(([k,n])=>{const id=t[kd][k],
      covered=kd==="gear"&&id&&!!t.cos[["upper","middle","lower"].find(s=>stySlotsOf("gear",id).includes(s))];
      return `<span class="styslot"><button type="button" class="small" data-styslot="${kd},${k}" aria-pressed="${kind===kd&&slot===k}"${covered?` title="A costume covers it"`:""}>${n}: ${id?`<span class="${covered?"muted covered":""}">${esc(styCosName(id))}</span>`:'<span class="muted">none</span>'}</button>${id?`<button type="button" class="small" data-styoff="${kd},${k}" aria-label="Take off the ${n.toLowerCase()} ${kn.toLowerCase()}" title="Take it off">×</button>`:""}</span>`}).join("")}</div>`).join("");
  const all=STY_COS[kind][slot]||[],list=all.filter(id=>!q||styCosName(id).toLowerCase().includes(q)||id===q);
  $("styCosN").textContent=`${all.length} ${STY_SLOTS.find(([k])=>k===slot)[1].toLowerCase()} ${kind==="cos"?"costumes":"headgear"}`;
  $("styCosList").innerHTML=list.map(id=>{const ok=styCosOk(id,v),on=Object.values(t[kind]).includes(+id);
    return `<button type="button" class="styCos" data-stycos="${id}" aria-pressed="${on}"${ok||on?"":` disabled title="The game client has no look of it for a ${esc(v.trans?EW_TRANS[v.job]:v.job)}${v.one?"":` (${v.sex==="f"?"female":"male"})`}"`}>${itemIcon(+id)}<span>${esc(styCosName(id))}</span></button>`}).join("")||'<div class="note">Nothing matches.</div>'}
// one choice in a grid: its picture and number, pressed when it's the one in the look
const styOpt=(k,n,on,pic,label)=>`<button type="button" class="styOpt" data-sty${k}="${n}" aria-pressed="${on}" title="${esc(label)}">${pic}<span class="mono">${n}</span></button>`;
const styStage=(job,L,trans)=>`<span class="ewStage"><span class="ewFeet">${lookCanvas(job,L,trans)}</span></span>`;
function renderStylist(){if(typeof JOB_SPRITES==="undefined")return;const v=styleOf(),L={sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,cos:state.stylist.cos,gear:state.stylist.gear};
  (styPick=styPick||classPicker($("styJob"),[["Novice & 1st jobs",j=>!SECOND(j)],["2nd jobs",SECOND]].map(([g,f])=>[g,Object.keys(JOB_SPRITES.body).filter(f)]),
    j=>{state.stylist.job=j;save();renderStylist()},()=>{const w=styleOf();return [{sex:w.sex,hair:w.hair,color:w.color,dye:w.dye,trans:w.trans}]}))(v.job);
  $("styPreview").innerHTML=styStage(v.job,L,v.trans);
  $("stySex").innerHTML=["m","f"].map(s=>`<button type="button" class="small" data-stysex="${s}" aria-pressed="${v.sex===s}"${v.one&&v.sex!==s?` disabled title="${esc(v.job)}s are ${v.sex==="f"?"female":"male"} only"`:""}>${s==="f"?"♀ Female":"♂ Male"}</button>`).join("")+
    (v.canTrans?`<button type="button" class="small" data-stytrans="" aria-pressed="${v.trans}" title="${esc(`${EW_TRANS[v.job]} look: Ragnarok Zero has no transcendent jobs, so a ${v.job} can look like a ${EW_TRANS[v.job]}. A Costume Change Ticket switches the look in game`)}">${esc(EW_TRANS[v.job])} look</button>`:"");
  $("stySum").textContent=`${v.trans?EW_TRANS[v.job]:v.job} · clothes colour ${v.dye} of 0–${v.dyes-1} · hair style ${v.hair} of 1–${v.hairs} · hair colour ${v.color} of 0–${v.colors-1}`;
  // clothes colours on the whole look without its costumes (which can cover the clothes and reach past a tile; only the preview wears
  // them); hair styles (each in your hair colour, or its first where it has fewer) and hair colours as heads
  $("styDyes").innerHTML=Array.from({length:v.dyes},(_,d)=>styOpt("dye",d,d===v.dye,styStage(v.job,{...L,dye:d,cos:{},gear:{}},v.trans),d?`Clothes colour ${d}`:"Clothes colour 0: undyed")).join("");
  $("styHairs").innerHTML=Array.from({length:v.hairs},(_,i)=>i+1).map(n=>styOpt("hair",n,n===v.hair,headCanvas(v.sex,n,v.color<ewColors(v.sex,n)?v.color:0,2),`Hair style ${n}`)).join("");
  $("styColors").innerHTML=Array.from({length:v.colors},(_,c)=>styOpt("color",c,c===v.color,headCanvas(v.sex,v.hair,c,2),`Hair colour ${c}`)).join("");
  $("styDyeN").textContent=v.dyes;$("styHairN").textContent=v.hairs;$("styColorN").textContent=v.colors;
  if(typeof COSTUME_LOOKS!=="undefined")renderStyCos(v);
  drawLook($("styCard"))}
$("styCard").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;const t=state.stylist,v=styleOf(),d=b.dataset;
  // a choice keeps the rest of the look as it's drawn now (a new gender or job starts from the hair and colours that fit it)
  const keep=()=>Object.assign(t,{job:v.job,sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,trans:v.trans});
  if(d.stysex){keep();t.sex=d.stysex}else if(d.stytrans!=null){keep();t.trans=!v.trans}else if(d.stydye){keep();t.dye=+d.stydye}
  else if(d.styhair){keep();t.hair=+d.styhair}else if(d.stycolor){keep();t.color=+d.stycolor}
  else if(d.styslot){STY_AT=d.styslot.split(",");renderStyCos(v);return}
  else if(d.styoff){const [kd,k]=d.styoff.split(",");keep();styWear(kd,t[kd][k])}else if(d.stycos){keep();styWear(STY_AT[0],+d.stycos)}else return;
  save();renderStylist()});
$("styMine").addEventListener("click",()=>{state.stylist={job:state.job||"Novice",...state.look,cos:state.stylist.cos,gear:state.stylist.gear};save();renderStylist()});
$("styCosQ").addEventListener("input",()=>renderStyCos(styleOf()));
// each section folds away, remembered like a card (state.collapsed)
[["styFoldCos","Stylist: costumes"],["styFoldDye","Stylist: clothes colours"],["styFoldHair","Stylist: hair styles"],["styFoldColor","Stylist: hair colours"]].forEach(([id,key])=>{const d=$(id);d.open=!(state.collapsed||{})[key];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[key])return;if(d.open)delete c[key];else c[key]=true;save()})});
$("styUse").addEventListener("click",()=>{const v=styleOf();state.look={sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,trans:v.trans};save();
  if(typeof renderEquipWin==="function")renderEquipWin();showToast("Your character's look in the equipment window is now this one")});
