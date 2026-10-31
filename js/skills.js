// ---- skill tree: learned levels per character in c.skills = {slug: level}, from data/skills.js (roz.prontera.info planner) ----
// a 1st or 2nd job has Basic Skill Lv 9 from its Novice days (and may have learned First Aid and Play Dead, the Novice quest skills): as
// in the game's skill window, the Novice skills sit in the 1st-job tree's first column, which its own skills leave free, and take none of
// its points (nov). Basic Skill can't be lowered there (def)
const NOV_TREES={};
const treesOf=job=>{const t=(typeof SKILLS!=="undefined"&&SKILLS[job])||[];if(job==="Novice")return t;
  return NOV_TREES[job]||(NOV_TREES[job]=(()=>{const nov=t.find(x=>x.job==="Novice"),r=t.filter(x=>x.job!=="Novice");if(!nov||!r.length)return r;
    const taken=new Set(r[0].skills.map(x=>x.slot)),add=nov.skills.filter(x=>!taken.has(x.slot)).map(x=>({...x,nov:true,...x.slug==="basic-skill"?{def:true}:{}}));
    return [{...r[0],skills:[...add,...r[0].skills]},...r.slice(1)]})())};
const SK_CACHE={};
// every skill a job can learn, by slug (1st-job tree included); tier = which tree it sits in
const skOf=job=>SK_CACHE[job]||(SK_CACHE[job]=(()=>{const m={};treesOf(job).forEach((t,ti)=>t.skills.forEach(s=>{if(!m[s.slug])m[s.slug]={...s,tier:ti}}));return m})());
// skills the job change gives ("def" in the data: the 1st-job quest skills, Redemptio) are always learned, at their max level
const SK_GIVEN={};
const givenOf=job=>SK_GIVEN[job]||(SK_GIVEN[job]=Object.values(skOf(job)).filter(s=>s.def));
const grantSkills=(L,job)=>{for(const s of givenOf(job))if((L[s.slug]||0)<s.max)L[s.slug]=s.max;return L};
const learned=(c,job=state.job)=>{if(!c.skills||typeof c.skills!=="object")c.skills={};return grantSkills(c.skills,job)};
// a tree is set once you learn a skill of the job that it doesn't simply get
const hasTree=(c,job=state.job)=>{const S=skOf(job);return Object.entries(c.skills||{}).some(([k,v])=>v>0&&S[k]&&!S[k].def)};
const skLv=(c,slug,job=state.job)=>{const s=skOf(job)[slug];return s&&s.def?s.max:(c.skills||{})[slug]||0};
// raising a skill raises what it needs; lowering is refused while a learned skill still needs the old level
// (job: the tree to use, your character's by default; the Skill tree tab passes the job it plans)
function raiseSkill(c,slug,lv,job=state.job){const s=skOf(job)[slug];if(!s)return;lv=Math.max(0,Math.min(s.max,lv));const L=learned(c,job);if((L[slug]||0)>=lv)return;L[slug]=lv;(s.pre||[]).forEach(([p,n])=>raiseSkill(c,p,n,job))}
function lowerSkill(c,slug,lv,job=state.job){const S=skOf(job),L=learned(c,job);if(S[slug]&&S[slug].def&&lv<S[slug].max)return [`${S[slug].name} ${S[slug].nov?"is learned as a Novice":"comes with the job change"}`];
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
function levelPreset(p,c){if(p.type==="spellfist")return sgPreset(p,c);const s=presetSkill(p),a={...p};if(!s||!hasTree(c))return {a};const lv=skLv(c,s.slug);if(lv>=s.max)return {a,lv,s};if(lv<=0)return {a,lv:0,s};
  const hi=skRow(s,s.max),lo=skRow(s,lv),k=i=>hi[i]&&lo[i]!=null?lo[i]/hi[i]:null;
  if(k(1)!=null)a.pct=Math.round(p.pct*k(1));if(k(2)!=null)a.hits=Math.round(p.hits*k(2)*100)/100;if(lo[0]!=null)a.sp=lo[0];
  const cHi=(hi[3]||0)+(hi[4]||0),cLo=(lo[3]||0)+(lo[4]||0);if(cHi>0){const f=cLo/cHi;a.cast=Math.round(num(p.cast)*f*100)/100;if(p.vct!=null)a.vct=p.vct*f;if(p.fct!=null)a.fct=p.fct*f}
  const dHi=Math.max(hi[5]||0,hi[6]||0),dLo=Math.max(lo[5]||0,lo[6]||0);if(dHi>0)a.delay=Math.round(num(p.delay)*dLo/dHi*100)/100;
  if(p.gcd!=null&&hi[5])a.gcd=p.gcd*(lo[5]||0)/hi[5];if(p.cd!=null&&hi[6])a.cd=p.cd*(lo[6]||0)/hi[6];
  if(p.meleeLv1&&lv===1)a.rng=false;
  // zeny per use follows the level's "Zeny Cost: 300Z" (Mammonite: 100 × Lv)
  if(p.zeny!=null){const z=String(lo[7]).match(/Zeny Cost:?\s*([\d,]+)/i);if(z)a.zeny=+z[1].replace(/,/g,"")}
  a.name=/Lv\s*\d+/.test(p.name)?p.name.replace(/Lv\s*\d+/,"Lv"+lv):`${p.name} Lv${lv}`;return {a,lv,s}}
// Sage's Spell Fist and Hindsight attacks: named with their levels (learned ones with a skill tree, else Sage options); lv 0 when one isn't learned
function sgPreset(p,c){const a={...p},g={...SAGE_D,...(c.sage||{})},t=hasTree(c),lvOf=(slug,k)=>t?skLv(c,slug):Math.max(0,num(g[k]));
  const lv=[];a.name=p.name.replace(/Spell Fist Lv\d+/,()=>{const n=lvOf("spell-fist","sfLv");lv.push(n);return "Spell Fist Lv"+n}).replace(/Hindsight Lv\d+/,()=>{const n=lvOf("hindsight","hsLv");lv.push(n);return "Hindsight Lv"+n});
  return {a,lv:Math.min(...lv),s:true,named:true}}
const refreshPreset=c=>{if(c.preset>=0){const p=JOBS[state.job].p[c.preset];if(p)c.a=levelPreset(p,c).a}};
// the skill check corrected four presets' damage % (Grimtooth 300%, the Monk combo's knuckle and STR, Acid Bomb's monster VIT, Axe Boomerang's
// weight) and moved cast times and delays to the in-game table: saved characters still on a preset take the new numbers at their learned level
// V5: cooldown and after-cast delay are kept apart (after-cast delay % only cuts the after-cast delay) and follow the learned level;
// V6: Throw Spirit Sphere 2400% at Lv5; V8: Excruciating Palm's 200 HP,
// Throw Spirit Sphere back to Global's 1600%, and the four V7 timings back to Global's; V7: Brandish Spear, Rapid Smiting, Axe Boomerang and Power Swing take the client's cast and delays, and Magnum Break, Cannon Spear
// and Napalm Vulcan their cooldown and after-cast delay apart, as the table has them
(function presetsV8(){if(state.presetsV8)return;state.presetsV8=true;const job=state.job;
  for(const j in state.chars){const c=state.chars[j],p=JOBS[j]&&c&&c.preset>=0&&JOBS[j].p[c.preset];if(p){state.job=j;c.a=levelPreset(p,c).a}}state.job=job;save()})();
// Double Attack is worked out from the skill (a.da: dagger only, the learned level) instead of 1.5 hits averaged into the Thief basic attack
// and Rogue's Shadow Spell presets: characters on one, and session snapshots taken on one, take the new preset
(function daV1(){if(state.daV1)return;state.daV1=true;const job=state.job,fix=(j,c)=>{const p=JOBS[j]&&c&&c.a&&c.preset>=0&&JOBS[j].p[c.preset];if(p&&p.da){state.job=j;c.a=levelPreset(p,c).a}};
  for(const j in state.chars)fix(j,state.chars[j]);state.sessions.forEach(s=>[s.snap,...(s.snapHist||[])].forEach(x=>{if(x)fix(s.job||job,x.c)}));state.job=job;save()})();
// Sage: Hindsight moved from the on / auto boxes in Sage options to its own attacks. A Spell Fist character with Hindsight on takes
// "Spell Fist + Hindsight"; every Sage preset takes its new name with its levels
(function sageHsV1(){if(state.sageHsV1)return;state.sageHsV1=true;const c=state.chars&&state.chars.Sage;if(!c)return;const s=c.sage||{};
  if(c.preset===0&&s.hsOn)c.preset=JOBS.Sage.p.findIndex(p=>p.type==="spellfist"&&p.sf!==false&&p.hs);delete s.hsOn;delete s.hsAuto;delete s.hsWorth;
  const p=c.preset>=0&&JOBS.Sage.p[c.preset];if(p)c.a=levelPreset(p,c).a;save()})();
// passives: values come from the skill's own description at the learned level; this table only says what they need.
// any: bonus lines that count with any weapon (Music / Dance Lessons' Max SP %, checked on a Dancer with no whip)
const SK_PASSIVE={"sword-mastery":{w:["Dagger","One-handed sword"]},"two-handed-sword-mastery":{w:["Two-handed sword"]},"spear-mastery":{w:["One-handed spear","Two-handed spear"]},
  "mace-mastery":{w:["One-handed mace","Two-handed mace"]},"axe-mastery":{w:["One-handed axe","Two-handed axe"]},"axe-mastery-2":{w:["One-handed axe","Two-handed axe"]},
  "katar-mastery":{w:["Katar"]},"advanced-katar-mastery":{w:["Katar"]},"iron-fists":{w:["Knuckle","Bare hands"]},"study":{w:["Book"]},"music-lessons":{w:["Musical instrument"],any:["sp_percent"]},
  "dance-lessons":{w:["Whip"],any:["sp_percent"]},"weaponry-research":{},"demon-bane":{races:["Undead","Demon"]},"beastbane":{races:["Brute","Insect"]},"owls-eye":{},"vultures-eye":{},
  "improve-dodge":{},"flee":{},"faith":{},"soul-drain":{},"meditation":{},"spiritual-thrift":{},"plagiarism":{},"hilt-binding":{}};
// self-buffs you can switch on; added on top of the status window like consumables
const SK_BUFF={"two-hand-quicken":{w:["Two-handed sword"]},"spear-quicken":{w:["One-handed spear","Two-handed spear"]},"adrenaline-rush":{w:["One-handed axe","Two-handed axe","One-handed mace","Two-handed mace"]},
  "power-thrust":{},"improve-concentration":{},"increase-agility":{},"blessing":{},"angelus":{},"falcon-eyes":{},"fury":{},"impositio-manus":{},"endow-quake":{},"endow-tsunami":{},
  "endow-tornado":{},"endow-blaze":{},"volcano":{},"deluge":{},"whirlwind":{},"battle-theme":{},"lady-luck":{},"focus-ballet":{},"perfect-tablature":{}};
// ASPD the skill descriptions leave out, from the RO樂園攻速計算機 sheet ("增益"): potion/skill value (× AGI/200 into ASPD1) and ASPD %.
// Study's "ASPD +x%" is really a potion/skill value: a flat 4 at any level on Zero (the sheet's Book of Evolution, books only).
// Falcon Eyes is True Sight (SN_SIGHT, the sheet's 狙殺瞄準): its description leaves out the +5 to every stat
const SK_ASPD={"two-hand-quicken":l=>[["aspd_mod",null,null,7],["aspd_percent",null,null,10]],"spear-quicken":l=>[["aspd_mod",null,null,7],["aspd_percent",null,null,10]],
  "adrenaline-rush":l=>[["aspd_mod",null,null,7],["aspd_percent",null,null,10]],"study":()=>[["aspd_mod",null,null,4]],
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
  // Angelus: "VIT-based Defense +50%, HP +500"; Battle Theme: "DEF +75."
  if((m=d.match(/VIT-based Defense\s*\+(\d+)%/i)))stat("vit_def_percent",+m[1]);
  if((m=d.match(/(?:^|,\s*)HP\s*\+(\d+)(?![\d%])/)))stat("hp",+m[1]);
  if((m=d.match(/\bDEF\s*\+(\d+)(?![\d%])/)))stat("def",+m[1]);
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
    // the data's bonus lines (s.g) only for what the level's description doesn't give: Improve Dodge Lv10 is FLEE +30 (+40 after
    // the 2nd job), not that plus its per-level lines; Hilt Binding's STR +1 is only a line
    const got=new Set(fx.stat.map(b=>b[0]));(isBuff?out.buffStat:out.stat).push(...fx.stat);(s.g||[]).forEach(g=>(g.b||[]).forEach(b=>{if(!got.has(b[0]))(isBuff?out.buffStat:out.stat).push(b)}))};
  for(const k in SK_PASSIVE)take(k,SK_PASSIVE[k],false);for(const k in SK_BUFF)if((c.buffs||{})[k])take(k,SK_BUFF[k],true);return out}
// Sage options follow the skill tree when one is set: Spell Fist, Hindsight, Double Bolt and bolt levels are the learned ones
const SG_BOLT={Fire:"fire-bolt",Water:"cold-bolt",Wind:"lightning-bolt"};
function sageFromTree(c){if(state.job!=="Sage"||!hasTree(c))return false;const g=G();
  g.sfLv=skLv(c,"spell-fist");g.hsLv=skLv(c,"hindsight");const db=skLv(c,"double-bolt");if(db)g.dbLv=db;else g.dbOn=false;
  // your ticked bolts stay as chosen; unlearned ones are skipped in sfBolts(), and the bolt level is the lowest learned one in use
  const lv=Object.keys(SG_BOLT).filter(el=>g.bolts[el]&&skLv(c,SG_BOLT[el])).map(el=>skLv(c,SG_BOLT[el]));g.boltLv=lv.length?Math.min(...lv):1;return true}
let SKFX=null; // skillEffects(C()) for this render
const masteryFor=m=>num(C().mastery)+(SKFX?SKFX.mastery.filter(x=>!x.races||x.races.includes(m.race)).reduce((a,x)=>a+x.v,0):0);
// the trees of a job with learned levels L (Skills card and Skill tree tab); jobLv lifts the 2nd-job tree's points past the data's Job Lv 60,
// up to the 2nd-job cap of Job Lv 70 (69 points; 1st jobs stop at Job Lv 50, the data's 49 points)
const JOB_MAX2=70;
const treePts=(job,t,ti,jobLv)=>t.points!=null&&ti===treesOf(job).length-1&&SECOND(job)?Math.max(t.points,Math.min(JOB_MAX2,num(jobLv))-1):t.points;
// quest skills ("free" in the data) and the Novice skills in a 1st-job tree cost none of its points; the ones the job change gives can't be lowered
const treeUsed=(t,L)=>t.skills.reduce((a,s)=>a+(s.free||s.nov?0:L[s.slug]||0),0);
// each tree's points used and had: as in game, a 2nd job's points can also go on its 1st-job skills, so what the 1st-job tree uses past
// its own points (from) comes out of the 2nd-job tree's (spill). n: what counts against the tree's own points; over: past them in all
function treeTally(job,L,jobLv){const trees=treesOf(job),T=trees.map((t,ti)=>({used:treeUsed(t,L),pts:treePts(job,t,ti,jobLv),from:0,spill:0}));
  const a=T[T.length-2],b=T[T.length-1];if(SECOND(job)&&a&&a.pts!=null&&b.pts!=null&&a.used>a.pts){a.from=a.used-a.pts;b.spill=a.from}
  T.forEach(x=>{x.n=x.used-x.from+x.spill;x.over=x.pts!=null&&x.n>x.pts?x.n-x.pts:0});if(a&&b&&b.over)a.over=b.over;return T}
const tallyTxt=(x,trees,ti)=>x.from?`${x.used} / ${x.pts} (${x.from} of ${trees[ti+1].job}'s)`:x.spill?`${x.used} + ${x.spill} in ${trees[ti-1].job} = ${x.n} / ${x.pts}`:`${x.used}${x.pts!=null?" / "+x.pts:""}`;
function treesHtml(job,L,jobLv){const trees=treesOf(job),T=treeTally(job,L,jobLv);
  return trees.length?trees.map((t,ti)=>{const rows=Math.ceil((Math.max(0,...t.skills.map(s=>s.slot))+1)/7);
    const cells=Array.from({length:rows*7},(_,i)=>{const s=t.skills.find(x=>x.slot===i);if(!s)return '<div class="sk empty"></div>';const lv=L[s.slug]||0;
      return `<div class="sk${lv?" on":""}${s.passive?" pas":""}${s.free?" quest":""}" data-sk="${s.slug}">${s.nov&&s.def?'<span class="qtag" title="Learned as a Novice (Lv 9 to change job): no points of this job">Novice</span>':s.def?'<span class="qtag" title="Given at the job change: no skill points">Job</span>':s.free?'<span class="qtag" title="Quest skill: no skill points">Quest</span>':""}${iconHtml("skill",s.slug)}<button type="button" class="nm" data-act="max"${s.def?" disabled":""}>${esc(s.name)}</button>
        <div class="lv"><button type="button" data-act="dn" aria-label="Lower"${s.def?" disabled":""}>−</button><span class="mono">${num(lv)}/${s.max}</span><button type="button" data-act="up" aria-label="Raise"${s.def?" disabled":""}>+</button></div></div>`}).join("");
    return `<div class="tree"><div class="bar"><b>${esc(t.job)}</b><span class="note${T[ti].over?" bad":""}">${tallyTxt(T[ti],trees,ti)} points</span></div><div class="skgrid">${cells}</div></div>`}).join(""):'<div class="note">No skill tree data for this job.</div>'}
function renderSkills(){const c=C(),L=learned(c),S=skOf(state.job);
  $("skillTrees").innerHTML=treesHtml(state.job,L,c.jobLv);
  const buffs=Object.keys(SK_BUFF).filter(k=>S[k]&&skLv(c,k)>0);
  $("buffList").innerHTML=buffs.length?`<span class="note">Self-buffs while farming (read your status window with them off):</span> `+buffs.map(k=>`<label class="bar"><input type="checkbox" data-buff="${k}" ${(c.buffs||{})[k]?"checked":""}> ${iconHtml("skill",k,1,"il")}${esc(S[k].name)} <span class="muted">${esc(skRow(S[k],skLv(c,k))[7].replace(/(?:,\s*)?Duration:?\s*[^,]*,?\s*/i,""))}</span>${SK_BUFF[k].w&&!SK_BUFF[k].w.includes(c.weapon)?` <span class="warnc">(needs ${esc(SK_BUFF[k].w.join(" / "))})</span>`:""}</label>`).join(""):"";
  ROOTQ("#preset option").forEach(o=>{const p=JOBS[state.job].p[+o.value];if(!p)return;const r=levelPreset(p,c);o.textContent=r.s&&(hasTree(c)||r.named)?(r.lv?r.a.name:`${p.name} (not learned)`):p.name})}
// hover or focus a skill: what it does, what it needs, and what its learned and next levels give
// (one tooltip per tree: tip and card are its elements, job and L the tree it shows)
function showSkTipIn(tip,card,job,L,cell){const t=$(tip.id),s=cell&&skOf(job)[cell.dataset.sk];tip.slug=s?s.slug:null;if(!s){t.hidden=true;return}
  const S=skOf(job),lv=L[s.slug]||0,fx=l=>skRow(s,l)[7],line=l=>fx(l)?`<div><span class="note">Lv ${l}${l>lv?" (next)":""}:</span> ${esc(fx(l))}</div>`:"",
    pre=(s.pre||[]).filter(([p])=>S[p]).map(([p,n])=>`<span class="${(L[p]||0)>=n?"":"warnc"}">${esc(S[p].name)} Lv ${n}</span>`);
  t.innerHTML=`<div class="bar">${iconHtml("skill",s.slug)}<b>${esc(s.name)}</b><span class="note">${s.passive?"Passive":"Active"}${s.nov&&s.def?" · Learned as a Novice, no points":s.def?" · Given at the job change":s.free?" · Quest skill, no points":""} · Lv ${lv}/${s.max}</span></div>`+
    (s.desc?`<p>${esc(s.desc)}</p>`:"")+(pre.length?`<div><span class="note">Needs:</span> ${pre.join(", ")}</div>`:"")+(lv?line(lv):"")+(lv<s.max?line(lv+1):"");
  t.hidden=false;const box=$(card).getBoundingClientRect(),r=cell.getBoundingClientRect(),h=t.offsetHeight,
    up=r.bottom+h+8>innerHeight&&r.top-h-8>0;
  t.style.left=Math.max(8,Math.min(r.left-box.left,box.width-t.offsetWidth-8))+"px";t.style.top=(up?r.top-box.top-h-6:r.bottom-box.top+6)+"px"}
// hover, focus and the − / + / name buttons of a tree; act(slug, "up" | "dn" | "max") changes the level and redraws, and returns why it couldn't
function wireTree(gridId,tip,card,job,L,act){const g=$(gridId),show=cell=>showSkTipIn(tip,card,job(),L(),cell);
  g.addEventListener("mouseover",e=>{const cell=e.target.closest("[data-sk]");if(cell&&cell.dataset.sk!==tip.slug)show(cell)});
  g.addEventListener("mouseleave",()=>show(null));
  g.addEventListener("focusin",e=>show(e.target.closest("[data-sk]")));
  g.addEventListener("focusout",e=>{if(!g.contains(e.relatedTarget))show(null)});
  g.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const slug=b.closest("[data-sk]").dataset.sk;act(slug,b.dataset.act);show(g.querySelector(`[data-sk="${slug}"]`))})}
// − / + / name: one level down or up; the name maxes it, or clears it when it's maxed
function stepSkill(c,slug,act,job){const s=skOf(job)[slug],lv=skLv(c,slug,job);
  if(act==="up")raiseSkill(c,slug,lv+1,job);else if(act==="dn")return lowerSkill(c,slug,lv-1,job);else if(lv<s.max)raiseSkill(c,slug,s.max,job);else return lowerSkill(c,slug,0,job);return null}
const SK_TIP={id:"skTip",slug:null};
wireTree("skillTrees",SK_TIP,"skillCard",()=>state.job,()=>learned(C()),(slug,act)=>{const c=C(),why=stepSkill(c,slug,act,state.job);
  $("skillNote").textContent=why?why.join(" · "):"";refreshPreset(c);save();renderSkills();syncChar();renderAll()});
$("skReset").addEventListener("click",()=>{const c=C();c.skills={};c.buffs={};refreshPreset(c);$("skillNote").textContent="";save();renderSkills();syncChar();renderAll()});
$("buffList").addEventListener("change",e=>{const k=e.target.dataset.buff;if(!k)return;const c=C();c.buffs=c.buffs||{};c.buffs[k]=e.target.checked;save();renderAll()});

// ---- Skill tree tab (Simulators): try any job's tree without a character. state.skPlan = {job, jobLv: {job: Lv, blank = 70}, skills: {job: {slug: level}}};
// it never touches your characters unless you press "Use on my character" ----
// cleaned once per save it comes from (an imported backup brings its own)
const SKP_OK=new WeakSet();
const skPlan=()=>{if(SKP_OK.has(state.skPlan))return state.skPlan;const p=state.skPlan=objOr(state.skPlan);SKP_OK.add(p);if(!SKILLS[p.job])p.job=SKILLS[state.job]?state.job:"Novice";p.jobLv=objOr(p.jobLv);p.skills=objOr(p.skills);
  p.skills=Object.fromEntries(Object.entries(p.skills).filter(([j])=>SKILLS[j]).map(([j,L])=>[j,Object.fromEntries(Object.entries(objOr(L)).filter(([k,v])=>skOf(j)[k]&&+v>0).map(([k,v])=>[k,Math.min(skOf(j)[k].max,Math.round(+v))]))]));return p};
const planOf=()=>{const p=skPlan();return {skills:grantSkills(p.skills[p.job]||(p.skills[p.job]={}),p.job)}};
const SKP_TIP={id:"skpTip",slug:null};
// the Job picker: each job's look and icon (classPicker, js/build-ui.js), made the first time the tab draws
let skpPick=null;
// fresh: the Job button's looks get new random hair (each time the tab opens)
function renderSkPlan(fresh){const p=skPlan(),job=p.job,L=planOf().skills,trees=treesOf(job),mine=state.chars[job],second=SECOND(job),jl=p.jobLv[job]||JOB_MAX2;
  (skpPick=skpPick||classPicker($("skpJob"),[["Novice & 1st jobs",j=>!SECOND(j)],["2nd jobs",SECOND]].map(([g,f])=>[g,Object.keys(SKILLS).filter(f)]),
    j=>{skPlan().job=j;$("skpNote").textContent="";save();renderSkPlan()}))(job,fresh);$("skpJobLvWrap").hidden=!second;$("skpJobLv").value=p.jobLv[job]||"";$("skpJobLv").placeholder=String(JOB_MAX2);
  // a 2nd job: who changes you to it and where (data/jobmasters.js)
  const jm=JOB_MASTERS[job];$("skpMaster").hidden=!jm;$("skpMaster").innerHTML=jm?`Job change: <b>${esc(jm[0])}</b>, ${esc(jm[1])} ${naviTag(jm[2])}`:"";
  $("skpTrees").innerHTML=treesHtml(job,L,jl);$("skpTip").hidden=true;SKP_TIP.slug=null;
  // what the plan takes: points per tree and the job level each tree needs (one point a job level after the first)
  // a 1st-job tree that borrows the 2nd job's points is full, and the 2nd job's job level counts what it lent
  const T=treeTally(job,L,jl),parts=trees.map((t,ti)=>{const x=T[ti];if(x.pts==null)return "";const left=x.pts-x.n,own=x.used-x.from;
    return `<span class="${x.over?"bad":""}"><b>${esc(t.job)}</b> ${esc(tallyTxt(x,trees,ti))}${x.over?` (${x.over} over)`:left>0?` · ${left} left`:" · full"}${x.n?` · Job Lv ${Math.min(own,x.pts)+x.spill+1}`:""}</span>`}).filter(Boolean);
  $("skpSum").innerHTML=parts.join(" <span class=\"muted\">·</span> ");
  $("skpLoad").hidden=!(mine&&hasTree(mine,job));$("skpUse").hidden=!mine;$("skpUse").textContent=`Use on my ${job}`;$("skpLoad").textContent=`Load my ${job}'s`}
wireTree("skpTrees",SKP_TIP,"skpCard",()=>skPlan().job,()=>planOf().skills,(slug,act)=>{const why=stepSkill(planOf(),slug,act,skPlan().job);
  $("skpNote").textContent=why?why.join(" · "):"";save();renderSkPlan()});
$("skpJobLv").addEventListener("change",e=>{const p=skPlan(),v=Math.min(JOB_MAX2,Math.round(num(e.target.value)));if(v>0)p.jobLv[p.job]=v;else delete p.jobLv[p.job];save();renderSkPlan()});
$("skpReset").addEventListener("click",()=>{const p=skPlan();p.skills[p.job]={};$("skpNote").textContent="";save();renderSkPlan()});
$("skpLoad").addEventListener("click",()=>{const p=skPlan(),c=state.chars[p.job];if(!c)return;p.skills[p.job]={...(c.skills||{})};if(c.jobLv)p.jobLv[p.job]=num(c.jobLv);$("skpNote").textContent="";save();renderSkPlan()});
// copy the plan to your character of this job (the one the Character tab keeps for it); its switched-on buffs that aren't learned any more go off
$("skpUse").addEventListener("click",()=>{const p=skPlan(),job=p.job,c=state.chars[job];if(!c)return;const L=planOf().skills;
  if(hasTree(c,job)&&JSON.stringify(c.skills)!==JSON.stringify(L)&&!confirm(`Replace your ${job}'s learned skills with this tree?`))return;
  c.skills={...L};c.buffs=Object.fromEntries(Object.entries(c.buffs||{}).filter(([k,v])=>v&&L[k]>0));
  const cur=state.job;state.job=job;refreshPreset(c);state.job=cur;save();if(job===state.job){renderSkills();syncChar();renderAll()}renderSkPlan();
  showToast(`Your ${job} now has this skill tree`)});
