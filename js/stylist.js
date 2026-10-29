// ---- Stylist tab (Simulators): a job's look in every clothes colour, hair style and hair colour the game client has, to try styles on
// any job. Saved per account in state.stylist = {job, sex, hair, color, dye, trans}; "Use as my look" copies it to the equipment
// window's look (state.look), and "Start from my look" brings yours in ----
// the look as it can be drawn: the job (yours, else Novice, when none is picked), its body (the transcendent one for a 2nd job with trans
// on), the gender it has (Bards are male, Dancers female), and how many hair styles, hair colours and clothes colours there are
function styleOf(){const S=JOB_SPRITES,t=state.stylist,job=S.body[t.job]?t.job:S.body[state.job]?state.job:"Novice";
  const canTrans=!!(EW_TRANS[job]&&S.trans&&S.trans[job]),tj=t.trans&&canTrans&&S.trans[job],bj=tj||S.body[job],sex=bj[t.sex]?t.sex:Object.keys(bj)[0];
  const pal=((S[tj?"transPal":"bodyPal"]||{})[job]||{})[sex],dyes=pal?pal.c.length:1,hairs=ewHairs(sex),hair=t.hair<=hairs?t.hair:1,colors=ewColors(sex,hair);
  return {job,trans:!!tj,canTrans,sex,one:Object.keys(bj).length<2,hair,hairs,color:t.color<colors?t.color:0,colors,dye:t.dye<dyes?t.dye:0,dyes,pal}}
let styPick=null;
// one choice in a grid: its picture and number, pressed when it's the one in the look
const styOpt=(k,n,on,pic,label)=>`<button type="button" class="styOpt" data-sty${k}="${n}" aria-pressed="${on}" title="${esc(label)}">${pic}<span class="mono">${n}</span></button>`;
const styStage=(job,L,trans)=>`<span class="ewStage"><span class="ewFeet">${lookCanvas(job,L,trans)}</span></span>`;
function renderStylist(){if(typeof JOB_SPRITES==="undefined")return;const v=styleOf(),L={sex:v.sex,hair:v.hair,color:v.color,dye:v.dye};
  (styPick=styPick||classPicker($("styJob"),[["Novice & 1st jobs",j=>!SECOND(j)],["2nd jobs",SECOND]].map(([g,f])=>[g,Object.keys(JOB_SPRITES.body).filter(f)]),
    j=>{state.stylist.job=j;save();renderStylist()},()=>{const w=styleOf();return [{sex:w.sex,hair:w.hair,color:w.color,dye:w.dye,trans:w.trans}]}))(v.job);
  $("styPreview").innerHTML=styStage(v.job,L,v.trans);
  $("stySex").innerHTML=["m","f"].map(s=>`<button type="button" class="small" data-stysex="${s}" aria-pressed="${v.sex===s}"${v.one&&v.sex!==s?` disabled title="${esc(v.job)}s are ${v.sex==="f"?"female":"male"} only"`:""}>${s==="f"?"♀ Female":"♂ Male"}</button>`).join("")+
    (v.canTrans?`<button type="button" class="small" data-stytrans="" aria-pressed="${v.trans}" title="${esc(`${EW_TRANS[v.job]} look: Ragnarok Zero has no transcendent jobs, so a ${v.job} can look like a ${EW_TRANS[v.job]}. A Costume Change Ticket switches the look in game`)}">${esc(EW_TRANS[v.job])} look</button>`:"");
  $("stySum").textContent=`${v.trans?EW_TRANS[v.job]:v.job} · clothes colour ${v.dye} of 0–${v.dyes-1} · hair style ${v.hair} of 1–${v.hairs} · hair colour ${v.color} of 0–${v.colors-1}`;
  // clothes colours on the whole look; hair styles (each in your hair colour, or its first where it has fewer) and hair colours as heads
  $("styDyes").innerHTML=Array.from({length:v.dyes},(_,d)=>styOpt("dye",d,d===v.dye,styStage(v.job,{...L,dye:d},v.trans),d?`Clothes colour ${d}`:"Clothes colour 0: undyed")).join("");
  $("styHairs").innerHTML=Array.from({length:v.hairs},(_,i)=>i+1).map(n=>styOpt("hair",n,n===v.hair,headCanvas(v.sex,n,v.color<ewColors(v.sex,n)?v.color:0,2),`Hair style ${n}`)).join("");
  $("styColors").innerHTML=Array.from({length:v.colors},(_,c)=>styOpt("color",c,c===v.color,headCanvas(v.sex,v.hair,c,2),`Hair colour ${c}`)).join("");
  $("styDyeN").textContent=v.dyes;$("styHairN").textContent=v.hairs;$("styColorN").textContent=v.colors;
  drawLook($("styCard"))}
$("styCard").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;const t=state.stylist,v=styleOf(),d=b.dataset;
  // a choice keeps the rest of the look as it's drawn now (a new gender or job starts from the hair and colours that fit it)
  const keep=()=>Object.assign(t,{job:v.job,sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,trans:v.trans});
  if(d.stysex){keep();t.sex=d.stysex}else if(d.stytrans!=null){keep();t.trans=!v.trans}else if(d.stydye){keep();t.dye=+d.stydye}
  else if(d.styhair){keep();t.hair=+d.styhair}else if(d.stycolor){keep();t.color=+d.stycolor}else return;
  save();renderStylist()});
$("styMine").addEventListener("click",()=>{state.stylist={job:state.job||"Novice",...state.look};save();renderStylist()});
$("styUse").addEventListener("click",()=>{const v=styleOf();state.look={sex:v.sex,hair:v.hair,color:v.color,dye:v.dye,trans:v.trans};save();
  if(typeof renderEquipWin==="function")renderEquipWin();showToast("Your character's look in the equipment window is now this one")});
