// ---- skill tree: learned levels per character in c.skills = {slug: level}, from data/skills.js (roz.prontera.info planner) ----
const treesOf=job=>(typeof SKILLS!=="undefined"&&SKILLS[job])||[];
const SK_CACHE={};
// every skill a job can learn, by slug (Novice and 1st-job trees included); tier = which tree it sits in
const skOf=job=>SK_CACHE[job]||(SK_CACHE[job]=(()=>{const m={};treesOf(job).forEach((t,ti)=>t.skills.forEach(s=>{if(!m[s.slug])m[s.slug]={...s,tier:ti}}));return m})());
const learned=c=>{if(!c.skills||typeof c.skills!=="object")c.skills={};return c.skills};
const hasTree=c=>Object.values(c.skills||{}).some(v=>v>0);
const skLv=(c,slug)=>(c.skills||{})[slug]||0;
// raising a skill raises what it needs; lowering is refused while a learned skill still needs the old level
function raiseSkill(c,slug,lv){const s=skOf(state.job)[slug];if(!s)return;lv=Math.max(0,Math.min(s.max,lv));const L=learned(c);if((L[slug]||0)>=lv)return;L[slug]=lv;(s.pre||[]).forEach(([p,n])=>raiseSkill(c,p,n))}
function lowerSkill(c,slug,lv){const S=skOf(state.job),L=learned(c);
  const why=Object.keys(L).filter(k=>L[k]>0&&S[k]).flatMap(k=>(S[k].pre||[]).filter(([p,n])=>p===slug&&n>lv).map(([,n])=>`${S[k].name} needs ${S[slug].name} Lv ${n}`));
  if(why.length)return why;if(lv<=0)delete L[slug];else L[slug]=lv;return null}
// level rows: [SP, damage %, hits, variable cast ms, fixed cast ms, after-cast delay ms, cooldown ms, description]
const skRow=(s,lv)=>{const r=(s.lv||[])[lv-1]||[];const m=String(r[7]||"").match(/(\d+)\s*hits?\b|Hits:\s*(\d+)/i);const hits=r[2]!=null?r[2]:m?+(m[1]||m[2]):null;
  return [r[0],r[1],hits,r[3],r[4],r[5],r[6],r[7]||""]};
// attack presets are max-level; with a skill tree they scale to the learned level using the data's level rows
const SK_ALIAS={"frost driver":"frost-diver"};
const normSk=x=>String(x).toLowerCase().replace(/\(.*?\)/g,"").replace(/\blv\s*\d+\b/g,"").replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
function presetSkill(p){if(!p||p.type==="spellfist"||/^(copied:|basic attack|combo)/i.test(p.name))return null;const S=skOf(state.job),n=normSk(p.name);
  const slug=SK_ALIAS[n]||Object.keys(S).find(k=>normSk(S[k].name)===n)||Object.keys(S).find(k=>n.startsWith(normSk(S[k].name)));return slug?S[slug]:null}
function levelPreset(p,c){const s=presetSkill(p),a={...p};if(!s||!hasTree(c))return {a};const lv=skLv(c,s.slug);if(lv>=s.max)return {a,lv,s};if(lv<=0)return {a,lv:0,s};
  const hi=skRow(s,s.max),lo=skRow(s,lv),k=i=>hi[i]&&lo[i]!=null?lo[i]/hi[i]:null;
  if(k(1)!=null)a.pct=Math.round(p.pct*k(1));if(k(2)!=null)a.hits=Math.round(p.hits*k(2)*100)/100;if(lo[0]!=null)a.sp=lo[0];
  const cHi=(hi[3]||0)+(hi[4]||0),cLo=(lo[3]||0)+(lo[4]||0);if(cHi>0){const f=cLo/cHi;a.cast=Math.round(num(p.cast)*f*100)/100;if(p.vct!=null)a.vct=p.vct*f;if(p.fct!=null)a.fct=p.fct*f}
  const dHi=Math.max(hi[5]||0,hi[6]||0),dLo=Math.max(lo[5]||0,lo[6]||0);if(dHi>0)a.delay=Math.round(num(p.delay)*dLo/dHi*100)/100;
  // zeny per use follows the level's "Zeny Cost: 300Z" (Mammonite: 100 × Lv)
  if(p.zeny!=null){const z=String(lo[7]).match(/Zeny Cost:?\s*([\d,]+)/i);if(z)a.zeny=+z[1].replace(/,/g,"")}
  a.name=/Lv\s*\d+/.test(p.name)?p.name.replace(/Lv\s*\d+/,"Lv"+lv):`${p.name} Lv${lv}`;return {a,lv,s}}
const refreshPreset=c=>{if(c.preset>=0){const p=JOBS[state.job].p[c.preset];if(p)c.a=levelPreset(p,c).a}};
// the skill check corrected four presets' damage % (Grimtooth 300%, the Monk combo's knuckle and STR, Acid Bomb's monster VIT, Axe Boomerang's
// weight) and moved cast times and delays to the in-game table: saved characters still on a preset take the new numbers at their learned level
(function presetsV4(){if(state.presetsV4)return;state.presetsV4=true;const job=state.job;
  for(const j in state.chars){const c=state.chars[j],p=JOBS[j]&&c&&c.preset>=0&&JOBS[j].p[c.preset];if(p){state.job=j;c.a=levelPreset(p,c).a}}state.job=job;save()})();
// passives: values come from the skill's own description at the learned level; this table only says what they need.
// any: bonus lines that count with any weapon (Music / Dance Lessons' Max SP %, checked on a Dancer with no whip)
const SK_PASSIVE={"sword-mastery":{w:["Dagger","One-handed sword"]},"two-handed-sword-mastery":{w:["Two-handed sword"]},"spear-mastery":{w:["One-handed spear","Two-handed spear"]},
  "mace-mastery":{w:["One-handed mace","Two-handed mace"]},"axe-mastery":{w:["One-handed axe","Two-handed axe"]},"axe-mastery-2":{w:["One-handed axe","Two-handed axe"]},
  "katar-mastery":{w:["Katar"]},"advanced-katar-mastery":{w:["Katar"]},"iron-fists":{w:["Knuckle","Bare hands"]},"study":{w:["Book"]},"music-lessons":{w:["Musical instrument"],any:["sp_percent"]},
  "dance-lessons":{w:["Whip"],any:["sp_percent"]},"weaponry-research":{},"demon-bane":{races:["Undead","Demon"]},"beastbane":{races:["Brute","Insect"]},"owls-eye":{},"vultures-eye":{},
  "improve-dodge":{},"flee":{},"faith":{},"soul-drain":{},"meditation":{},"spiritual-thrift":{},"plagiarism":{},"hilt-binding":{}};
// self-buffs you can switch on; added on top of the status window like consumables
const SK_BUFF={"two-hand-quicken":{w:["Two-handed sword"]},"spear-quicken":{w:["One-handed spear","Two-handed spear"]},"adrenaline-rush":{w:["One-handed axe","Two-handed axe","One-handed mace","Two-handed mace"]},
  "power-thrust":{},"improve-concentration":{},"increase-agility":{},"blessing":{},"falcon-eyes":{},"fury":{},"impositio-manus":{},"endow-quake":{},"endow-tsunami":{},
  "endow-tornado":{},"endow-blaze":{},"volcano":{},"deluge":{},"whirlwind":{},"battle-theme":{},"lady-luck":{},"focus-ballet":{},"perfect-tablature":{}};
// ASPD the skill descriptions leave out, from the RO樂園攻速計算機 sheet ("增益"): potion/skill value (× AGI/200 into ASPD1) and ASPD %.
// Study's "ASPD +x%" is really a potion/skill value of 0.5 per level (the sheet's Book of Evolution, books only).
// Falcon Eyes is True Sight (SN_SIGHT, the sheet's 狙殺瞄準): its description leaves out the +5 to every stat
const SK_ASPD={"two-hand-quicken":l=>[["aspd_mod",null,null,7],["aspd_percent",null,null,10]],"spear-quicken":l=>[["aspd_mod",null,null,7],["aspd_percent",null,null,10]],
  "adrenaline-rush":l=>[["aspd_mod",null,null,7],["aspd_percent",null,null,10]],"study":l=>[["aspd_mod",null,null,0.5*l]],
  "falcon-eyes":l=>["str","agi","vit","int","dex","luk"].map(k=>[k,null,null,5])};
const SECOND=job=>!["Novice",...FIRST_JOBS].includes(job);
// description -> effects: {mastery, pct (physical damage %), spCost, myEle {el: %} (your spells of that element), physEle {el: %} (your physical
// attacks of that element), stat: bonus lines (shown in the status window)}
function skillFx(desc,c){const d=String(desc||""),o={mastery:0,pct:0,spCost:0,myEle:{},physEle:{},stat:[]},stat=(k,v)=>o.stat.push([k,null,null,v]);let m;
  // "Fire Damage +20%", "Fire Magical Damage +5%" and "Critical Damage +20%" are read further down; they aren't a damage bonus on every hit
  const gen=d.replace(/(?:Fire|Water|Wind|Earth)(?: Magical)? Damage\s*\+\d+(?:\.\d+)?%|Critical Damage\s*\+\d+(?:\.\d+)?%/gi,"");
  if((m=gen.match(/Damage(?: Increase)?:?\s*\+(\d+(?:\.\d+)?)%/i))||(m=gen.match(/^Self:\s*\+(\d+)%/i)))o.pct+=+m[1];
  else if((m=gen.match(/(?:Damage|ATK):?\s*\+(\d+)(?![\d.%])/i))&&!/ATK\/MATK/i.test(gen)&&!/Bonus vs/i.test(gen))o.mastery+=+m[1];
  if((m=d.match(/ATK\/MATK\s*\+(\d+)/i))){stat("atk",+m[1]);stat("matk",+m[1])}
  d.replace(/((?:STR|AGI|VIT|INT|DEX|LUK)(?:,\s*(?:STR|AGI|VIT|INT|DEX|LUK))*)\s*\+(\d+)(%?)/g,(_,ks,v,pc)=>{ks.split(/,\s*/).forEach(k=>{k=k.toLowerCase();
    const add=pc?Math.floor((statVal(c,k)||0)*v/100):+v;if(add)stat(k,add)})});
  if((m=d.match(/\bHIT(?: Rate)?\s*\+(\d+)/i)))stat("hit",+m[1]);
  if((m=d.match(/\bCRIT\s*\+(\d+(?:\.\d+)?)/i)))stat("crit",+m[1]);
  const fl=[...d.matchAll(/FLEE\s*\+(\d+)/gi)].map(x=>+x[1]);if(fl.length)stat("flee",SECOND(state.job)?fl[fl.length-1]:fl[0]);
  if((m=d.match(/\bMHP\s*\+(\d+)(?![\d%])/i)))stat("hp",+m[1]);if((m=d.match(/\bMHP\s*\+(\d+)%/i)))stat("hp_percent",+m[1]);
  if((m=d.match(/(?:Max SP|MSP)\s*\+(\d+)%/i)))stat("sp_percent",+m[1]);
  if((m=d.match(/ASPD:?\s*\+(\d+(?:\.\d+)?)%/i)))stat("aspd_percent",+m[1]);if((m=d.match(/After Attack Delay\s*-(\d+)%/i)))stat("aspd_percent",+m[1]);
  if((m=d.match(/Critical Damage\s*\+(\d+)%/i)))stat("crit_damage_percent",+m[1]);
  if((m=d.match(/SP Consumption\s*-(\d+)%/i)))o.spCost-=+m[1];
  // an element's "Damage" bonus counts for spells and physical attacks of that element; a "Magical Damage" one only for spells
  d.replace(/(Fire|Water|Wind|Earth)( Magical)? Damage\s*\+(\d+)%/g,(_,el,mag,v)=>{o.myEle[el]=(o.myEle[el]||0)+ +v;if(!mag)o.physEle[el]=(o.physEle[el]||0)+ +v});
  return o}
// all effects from learned passives and switched-on buffs, for the current weapon
function skillEffects(c){const out={mastery:[],pct:0,spCost:0,myEle:{},physEle:{},stat:[],buffStat:[]};if(!hasTree(c))return out;const S=skOf(state.job),w=c.weapon;
  const take=(slug,cond,isBuff)=>{const s=S[slug],lv=skLv(c,slug);if(!s||lv<=0)return;const off=cond.w&&!cond.w.includes(w);if(off&&!cond.any)return;const fx=skillFx(skRow(s,lv)[7],c);
    if(off){(isBuff?out.buffStat:out.stat).push(...fx.stat.filter(b=>cond.any.includes(b[0])));return}
    if(SK_ASPD[slug]){if(slug==="study")fx.stat=fx.stat.filter(b=>b[0]!=="aspd_percent");fx.stat.push(...SK_ASPD[slug](lv))}
    if(fx.mastery)out.mastery.push({v:fx.mastery,races:cond.races||null});out.pct+=fx.pct;out.spCost+=fx.spCost;for(const k in fx.myEle)out.myEle[k]=(out.myEle[k]||0)+fx.myEle[k];for(const k in fx.physEle)out.physEle[k]=(out.physEle[k]||0)+fx.physEle[k];
    (isBuff?out.buffStat:out.stat).push(...fx.stat);(s.g||[]).forEach(g=>(g.b||[]).forEach(b=>(isBuff?out.buffStat:out.stat).push(b)))};
  for(const k in SK_PASSIVE)take(k,SK_PASSIVE[k],false);for(const k in SK_BUFF)if((c.buffs||{})[k])take(k,SK_BUFF[k],true);return out}
// Sage options follow the skill tree when one is set: Spell Fist, Hindsight, Double Bolt and bolt levels are the learned ones
const SG_BOLT={Fire:"fire-bolt",Water:"cold-bolt",Wind:"lightning-bolt"};
function sageFromTree(c){if(state.job!=="Sage"||!hasTree(c))return false;const g=G();
  g.sfLv=skLv(c,"spell-fist");g.hsLv=skLv(c,"hindsight");if(!g.hsLv)g.hsOn=false;const db=skLv(c,"double-bolt");if(db)g.dbLv=db;else g.dbOn=false;
  // your ticked bolts stay as chosen; unlearned ones are skipped in sfBolts(), and the bolt level is the lowest learned one in use
  const lv=Object.keys(SG_BOLT).filter(el=>g.bolts[el]&&skLv(c,SG_BOLT[el])).map(el=>skLv(c,SG_BOLT[el]));g.boltLv=lv.length?Math.min(...lv):1;return true}
let SKFX=null; // skillEffects(C()) for this render
const masteryFor=m=>num(C().mastery)+(SKFX?SKFX.mastery.filter(x=>!x.races||x.races.includes(m.race)).reduce((a,x)=>a+x.v,0):0);
// quest skills cost no points; the data marks most ("free"), these it misses
const SK_QUEST=["create-elemental-converter"];
function renderSkills(){const c=C(),L=learned(c),S=skOf(state.job),trees=treesOf(state.job);
  $("skillTrees").innerHTML=trees.length?trees.map((t,ti)=>{const used=t.skills.reduce((a,s)=>a+(s.free||SK_QUEST.includes(s.slug)?0:L[s.slug]||0),0);
    // the 2nd-job tree's points follow your job level past the data's Job Lv 60 (one point per level after the first)
    const pts=t.points!=null&&ti===trees.length-1&&SECOND(state.job)?Math.max(t.points,num(c.jobLv)-1):t.points;const rows=Math.ceil((Math.max(0,...t.skills.map(s=>s.slot))+1)/7);
    const cells=Array.from({length:rows*7},(_,i)=>{const s=t.skills.find(x=>x.slot===i);if(!s)return '<div class="sk empty"></div>';const lv=L[s.slug]||0,d=skRow(s,Math.max(1,lv))[7];
      return `<div class="sk${lv?" on":""}${s.passive?" pas":""}" data-sk="${s.slug}" title="${esc(s.name)} Lv${Math.max(1,lv)}${d?": "+esc(d):""}"><button type="button" class="nm" data-act="max">${esc(s.name)}</button>
        <div class="lv"><button type="button" data-act="dn" aria-label="Lower">−</button><span class="mono">${num(lv)}/${s.max}</span><button type="button" data-act="up" aria-label="Raise">+</button></div></div>`}).join("");
    return `<div class="tree"><div class="bar"><b>${esc(t.job)}</b><span class="note${pts!=null&&used>pts?" bad":""}">${used}${pts!=null?" / "+pts:""} points</span></div><div class="skgrid">${cells}</div></div>`}).join(""):'<div class="note">No skill tree data for this job.</div>';
  const buffs=Object.keys(SK_BUFF).filter(k=>S[k]&&skLv(c,k)>0);
  $("buffList").innerHTML=buffs.length?`<span class="note">Self-buffs while farming (read your status window with them off):</span> `+buffs.map(k=>`<label class="bar" style="flex-direction:row;gap:4px"><input type="checkbox" data-buff="${k}" ${(c.buffs||{})[k]?"checked":""} style="width:auto"> ${esc(S[k].name)} <span class="muted">${esc(skRow(S[k],skLv(c,k))[7].replace(/Duration:[^,]*,?\s*/i,""))}</span>${SK_BUFF[k].w&&!SK_BUFF[k].w.includes(c.weapon)?` <span class="warnc">(needs ${esc(SK_BUFF[k].w.join(" / "))})</span>`:""}</label>`).join(""):"";
  ROOTQ("#preset option").forEach(o=>{const p=JOBS[state.job].p[+o.value];if(!p)return;const r=levelPreset(p,c);o.textContent=r.s&&hasTree(c)?(r.lv?r.a.name:`${p.name} (not learned)`):p.name})}
$("skillTrees").addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const slug=b.closest("[data-sk]").dataset.sk,c=C(),s=skOf(state.job)[slug],lv=skLv(c,slug);let why=null;
  if(b.dataset.act==="up")raiseSkill(c,slug,lv+1);else if(b.dataset.act==="dn")why=lowerSkill(c,slug,lv-1);else if(lv<s.max)raiseSkill(c,slug,s.max);else why=lowerSkill(c,slug,0);
  $("skillNote").textContent=why?why.join(" · "):"";refreshPreset(c);save();renderSkills();syncChar();renderAll()});
$("skMax").addEventListener("click",()=>{const c=C();treesOf(state.job).forEach(t=>t.skills.forEach(s=>raiseSkill(c,s.slug,s.max)));refreshPreset(c);save();renderSkills();syncChar();renderAll()});
$("skReset").addEventListener("click",()=>{const c=C();c.skills={};c.buffs={};refreshPreset(c);$("skillNote").textContent="";save();renderSkills();syncChar();renderAll()});
$("buffList").addEventListener("change",e=>{const k=e.target.dataset.buff;if(!k)return;const c=C();c.buffs=c.buffs||{};c.buffs[k]=e.target.checked;save();renderAll()});
