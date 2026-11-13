// ---- Stylist tab (Simulators): a job's look in every clothes colour, hair style and hair colour the game client has, and its headgear
// and costumes, to try styles on any job, standing or riding the Halter Lead's mount. Saved per account in state.stylist = {job, sex,
// hair, color, dye, trans, ride, gear: the normal
// headgear, cos: the costumes, each {upper, middle, lower, garment: item id}}; "Use as my look" copies the look (not what's worn) to the
// equipment window's (state.look), "Start from my look" brings yours in ----
// the look as it can be drawn: the job (yours, else Novice, when none is picked), its body (the transcendent one for a 2nd job with trans
// on), riding the Halter Lead's mount (ride, each with its own clothes colours), the gender it has (Bards are male, Dancers female), and
// how many hair styles, hair colours and clothes colours there are
function styleOf(){const S=JOB_SPRITES,t=state.stylist,job=S.body[t.job]?t.job:S.body[state.job]?state.job:"Novice";
  const canTrans=!!(EW_TRANS[job]&&S.trans&&S.trans[job]),lb=lookBody(job,t.trans,t.ride),bj=lb.set,sex=bj[t.sex]?t.sex:Object.keys(bj)[0];
  const pal=((S[lb.pal]||{})[job]||{})[sex],dyes=pal?pal.c.length:1,hairs=ewHairs(sex),hair=t.hair<=hairs?t.hair:1,colors=ewColors(sex,hair);
  return {job,trans:lb.trans,canTrans,ride:lb.ride,canRide:!!((S[lb.trans?"rideTrans":"ride"]||{})[job]),key:lb.key,sex,one:Object.keys(bj).length<2,
    hair,hairs,color:t.color<colors?t.color:0,colors,dye:t.dye<dyes?t.dye:0,dyes,pal}}
// the Halter Lead's mount for each job's branch, as the client draws it
const STY_MOUNT={Novice:"Poring",Swordsman:"Peco Peco",Knight:"lion",Crusader:"lion",Mage:"fox",Wizard:"fox",Sage:"fox",Archer:"ostrich",
  Hunter:"ostrich",Bard:"ostrich",Dancer:"ostrich",Acolyte:"alpaca",Priest:"alpaca",Monk:"alpaca",Merchant:"boar",Blacksmith:"boar",
  Alchemist:"boar",Thief:"Cerberus",Assassin:"Cerberus",Rogue:"Cerberus"};
const styName=v=>(v.trans?EW_TRANS[v.job]:v.job)+(v.ride?` on a ${STY_MOUNT[v.job]||"mount"}`:"");
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
  const b=COSTUME_LOOKS.robe.bodies[v.key];return !!(b&&(b.at[view]||{})[v.sex])}
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
    return `<button type="button" class="styCos" data-stycos="${id}" aria-pressed="${on}"${ok||on?"":` disabled title="The game client has no look of it for a ${esc(styName(v))}${v.one?"":` (${v.sex==="f"?"female":"male"})`}"`}>${itemIcon(+id)}<span>${esc(styCosName(id))}</span></button>`}).join("")||'<div class="note">Nothing matches.</div>'}
// the preview's animation (js/lookanim.js): the action and direction (not saved), when the action started, and the frame it asked for
const STY_ANIM={act:"stand",dir:0,t0:0,raf:0};
// one frame of the preview: the look as it is now, doing the action; the still look stays in view while a piece it needs loads
function styAnimTick(now){STY_ANIM.raf=0;const c=$("styAnimCanvas");if(!c||$("styCard").hidden)return;
  const v=styleOf(),o={job:v.job,trans:v.trans,ride:v.ride,sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,worn:wornOf({cos:state.stylist.cos,gear:state.stylist.gear})};
  const g=c.getContext("2d");g.clearRect(0,0,c.width,c.height);
  const ok=lookAnimDraw(g,o,STY_ANIM.act,STY_ANIM.dir,now-STY_ANIM.t0,c.width/2,c.height-32,styAnimRun);
  c.hidden=!ok;const s=$("styPreview").querySelector(".ewStage");if(s)s.hidden=ok;
  styAnimCtl(v);if(ok)styAnimRun()}
// the next frame in 40 ms (the client's frames last 100 ms or more), on a timer rather than animation frames, which some embedded
// browsers hold back
function styAnimRun(){if(!STY_ANIM.raf&&typeof performance!=="undefined")STY_ANIM.raf=setTimeout(()=>styAnimTick(performance.now()),40)}
// under the preview: turn left or right, and the actions the look's body has (stand, walk, sit and attack until its file loads, and
// those still, for a file exported before the rest were added); drawn again when that changes. An action the body lacks falls back
// to standing. The actions go in rows of a kind, on one grid: moving about, the three attack motions (numbered), and the rest of a fight
const STY_ACT_ROWS=[["Move",["stand","walk","sit","pickup"]],["Attack",["attack","attack2","attack3"]],["Battle",["ready","cast","hurt","dead"]]];
function styAnimCtl(v,anim=true){const acts=lookActs(LOOKS[`body/${v.key}-${v.sex}`])||LOOK_ACTS.filter(([k])=>["stand","walk","sit","attack"].includes(k));
  if(!acts.some(([k])=>k===STY_ANIM.act))STY_ANIM.act="stand";const has=Object.fromEntries(acts);
  const btn=k=>{const n=has[k],m=/^Attack (\d)$/.exec(n);return `<button type="button" role="radio" data-styact="${k}" aria-checked="${STY_ANIM.act===k}"${m?` aria-label="${n}" title="${n}"`:""}>${m?m[1]:n}</button>`};
  const html=anim?`<span class="styTurn"><button type="button" class="small" data-styturn="1" aria-label="Turn left" title="Turn">⟲</button><span class="note styDir" title="Facing">${LOOK_DIRS[STY_ANIM.dir]}</span><button type="button" class="small" data-styturn="-1" aria-label="Turn right" title="Turn">⟳</button></span>`+
    `<span class="seg styActs" role="radiogroup" aria-label="Animation">${STY_ACT_ROWS.map(([g,ks])=>{const on=ks.filter(k=>has[k]);
      return on.length?`<span class="styActRow"><span class="styActLab">${g}</span>${on.map(btn).join("")}</span>`:""}).join("")}</span>`:"";
  if(STY_ANIM.ctl===html)return;STY_ANIM.ctl=html;
  const el=$("styAnimCtl"),a=document.activeElement,f=a&&el.contains(a)&&a.dataset.styact;el.innerHTML=html;
  if(f)el.querySelector(`[data-styact="${f}"]`)?.focus()}
// one choice in a grid: its picture and number, pressed when it's the one in the look
const styOpt=(k,n,on,pic,label)=>`<button type="button" class="styOpt" data-sty${k}="${n}" aria-pressed="${on}" title="${esc(label)}">${pic}<span class="mono">${n}</span></button>`;
const styStage=(job,L,trans)=>`<span class="ewStage"><span class="ewFeet">${lookCanvas(job,L,trans)}</span></span>`;
function renderStylist(){if(typeof JOB_SPRITES==="undefined")return;const v=styleOf(),L={sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,ride:v.ride,cos:state.stylist.cos,gear:state.stylist.gear};
  (styPick=styPick||classPicker($("styJob"),[["Novice & 1st jobs",j=>!SECOND(j)],["2nd jobs",SECOND]].map(([g,f])=>[g,Object.keys(JOB_SPRITES.body).filter(f)]),
    j=>{state.stylist.job=j;save();renderStylist()},()=>{const w=styleOf();return [{sex:w.sex,hair:w.hair,color:w.color,dye:w.dye,trans:w.trans,ride:w.ride}]}))(v.job);
  // the still look, then the animated one over it once its pieces load (where the client's frames were exported)
  const anim=typeof LOOK_FILES!=="undefined"&&LOOK_HAS[`body/${v.key}-${v.sex}`];
  $("styPreview").innerHTML=styStage(v.job,L,v.trans)+(anim?'<canvas id="styAnimCanvas" class="styAnim" width="180" height="200" hidden></canvas>':"");
  STY_ANIM.ctl=null;styAnimCtl(v,anim);
  if(anim)styAnimRun();
  $("stySex").innerHTML=`<span class="seg" role="radiogroup" aria-label="Gender">${["m","f"].map(s=>`<button type="button" role="radio" data-stysex="${s}" aria-checked="${v.sex===s}"${v.one&&v.sex!==s?` disabled title="${esc(v.job)}s are ${v.sex==="f"?"female":"male"} only"`:` title="${s==="f"?"Female":"Male"}"`}>${s==="f"?"F":"M"}</button>`).join("")}</span>`+
    // a 2nd job's own look or its transcendent job's, side by side
    (v.canTrans?`<span class="seg" role="radiogroup" aria-label="Look" title="${esc(`Ragnarok Zero has no transcendent jobs, so a ${v.job} can look like a ${EW_TRANS[v.job]}. A Costume Change Ticket switches the look in game`)}">${[[0,v.job],[1,EW_TRANS[v.job]]].map(([x,n])=>`<button type="button" role="radio" data-stytrans="${x}" aria-checked="${v.trans===!!x}">${esc(n)}</button>`).join("")}</span>`:"")+
    (v.canRide?`<span class="seg" role="radiogroup" aria-label="Halter Lead" title="${esc(`Halter Lead: rides a ${STY_MOUNT[v.job]||"mount"}. The Halter Lead (from a Boarding Halter Box) lets every job ride a mount of its branch, with its own clothes colours`)}">${[[0,"On foot"],[1,"Halter Lead"]].map(([x,n])=>`<button type="button" role="radio" data-styride="${x}" aria-checked="${v.ride===!!x}">${n}</button>`).join("")}</span>`:"");
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
  const keep=()=>Object.assign(t,{job:v.job,sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,trans:v.trans,ride:v.ride});
  if(d.stysex){keep();t.sex=d.stysex}else if(d.stytrans){keep();t.trans=d.stytrans==="1"}else if(d.styride){keep();t.ride=d.styride==="1"}else if(d.stydye){keep();t.dye=+d.stydye}
  else if(d.styhair){keep();t.hair=+d.styhair}else if(d.stycolor){keep();t.color=+d.stycolor}
  else if(d.styslot){STY_AT=d.styslot.split(",");renderStyCos(v);return}
  else if(d.styturn){STY_ANIM.dir=(STY_ANIM.dir+ +d.styturn+8)%8;renderStylist();return}
  else if(d.styact){STY_ANIM.act=d.styact;STY_ANIM.t0=performance.now();renderStylist();return}
  else if(d.styoff){const [kd,k]=d.styoff.split(",");keep();styWear(kd,t[kd][k])}else if(d.stycos){keep();styWear(STY_AT[0],+d.stycos)}else return;
  save();renderStylist()});
// "Start from my look": your job and look, and what your character wears in the gear set the Character tab shows: its headgear and
// garment (one that's a costume, "[Costume] ...", goes in the costume row) and the costumes in Special equipment. Pieces the client
// has no look for are left out
function styFromMine(){const b=state.job&&typeof gearSet==="function"?gearSet(C()):null;
  const w=wornFromSet(b);state.stylist={job:state.job||"Novice",...state.look,ride:!!state.stylist.ride,cos:w.cos,gear:w.gear}}
$("styMine").addEventListener("click",()=>{styFromMine();save();renderStylist()});
$("styCosQ").addEventListener("input",()=>renderStyCos(styleOf()));
// each section folds away, remembered like a card (state.collapsed)
[["styFoldCos","Stylist: costumes"],["styFoldDye","Stylist: clothes colours"],["styFoldHair","Stylist: hair styles"],["styFoldColor","Stylist: hair colours"]].forEach(([id,key])=>{const d=$(id);d.open=!(state.collapsed||{})[key];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[key])return;if(d.open)delete c[key];else c[key]=true;save()})});
$("styUse").addEventListener("click",()=>{const v=styleOf();state.look={sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,trans:v.trans};save();
  if(typeof renderEquipWin==="function")renderEquipWin();showToast("Your character's look in the equipment window is now this one")});
