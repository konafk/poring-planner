// ---- build simulator: in "build" mode the stat fields are computed from base stats + gear (build.js) and shown read-only ----
// "Check against the game": [key, label, computed total]
// compared with what the build computes (BUILD_LAST), not with c, since typed Max HP / SP replace the computed ones
const CHECKS=[["atk","ATK",F=>sumStat(F.atkTxt)],["matk","MATK",F=>sumStat(F.matkTxt)],["hit","HIT",F=>sumStat(F.hitTxt)],["flee","FLEE",F=>parseFloat(String(F.fleeTxt).split("+")[0])||0],
  ["aspd","ASPD",F=>F.aspd],["def","DEF",F=>sumStat(F.defTxt)],["hp","Max HP",F=>F.maxHp],["sp","Max SP",F=>F.maxSp]];
const BUILT_IDS=["atkPct","atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","lw","lwAtk","lwElem","crit","critDmg","rangePct","skillPct","vctPct","fctPct","acdPct","ignDef","ignMdef","st_str","st_agi","st_vit","st_dex","st_luk","weapon","wElem"];
let BUILD_LAST=null;
const buildOf=c=>{if(!c.build)c.build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{}};return c.build};
// other gear sets, as many as you add (up to ALT_MAX; build.alts[i]: gear, stones, special like the build's own), worked out for the
// gear comparison (Character tab) and the EXP & formulas tab only. c.gearEdit "alt0"…: the gear table edits that set instead of your gear
const ALT_MAX=10;
const altN=c=>{const b=c.build;return b&&Array.isArray(b.alts)?Math.min(ALT_MAX,b.alts.length):0};
const altOf=(c,i)=>{const b=buildOf(c);if(!Array.isArray(b.alts))b.alts=[];let a=b.alts[i];if(!a||typeof a!=="object")a=b.alts[i]={};if(!a.gear||typeof a.gear!=="object")a.gear={};return a};
// the set the table edits: 0…altN−1, or −1 for your gear
const altIdx=(c=C())=>{const m=c.mode==="build"&&/^alt(\d+)$/.exec(c.gearEdit||"");return m&&+m[1]<altN(c)?+m[1]:-1};
const editAlt=(c=C())=>altIdx(c)>=0;
const gearSet=(c=C())=>editAlt(c)?altOf(c,altIdx(c)):buildOf(c);
function applyBuild(){const c=C();if(c.mode!=="build"){BUILD_LAST=null;c.bx=eqToBx(c);return}
  const r=BUILD.compute({...buildOf(c),baseLv:c.baseLv,jobLv:c.jobLv,extra:[...consLines().lines,...(SKFX?[...SKFX.stat,...SKFX.buffStat]:[]),...aspdBuffLines(c)]},state.job,aspdBase);BUILD_LAST=r;const F=r.fields,A=r.acc;
  // skill-specific gear lines count when the attack's name contains the skill
  const nm=String(c.a.name||"").toLowerCase(),match=o=>Object.entries(o).reduce((t,[k,v])=>t+(nm.includes(k.toLowerCase())?v:0),0);
  const top=o=>Object.entries(o).reduce((t,[k,v])=>nm.includes(k.toLowerCase())?Math.max(t,v):t,0); // fixed cast %: only the highest counts
  Object.assign(c,{atkTxt:F.atkTxt,matkTxt:F.matkTxt,hitTxt:F.hitTxt,fleeTxt:F.fleeTxt,defTxt:F.defTxt,intTxt:F.intTxt,wAtk:F.wAtk,crit:F.crit,critDmg:F.critDmg,
    atkPct:F.atkPct,rangePct:F.rangePct,skillPct:A.skill+match(A.skillOf),vctPct:F.vctPct+match(A.vctOf),fctPct:Math.max(F.fctPct,top(A.fctOf)),acdPct:F.acdPct,ignDef:F.ignDef,ignMdef:F.ignMdef,
    weapon:F.weapon,wElem:F.wElem,lw:F.lw,lwAtk:F.lwAtk,lwElem:F.lwElem,st:{...(c.st||{}),...F.st},bx:{phys:A.phys,magic:A.magic,myEle:A.myEle,taken:A.taken,exp:A.exp,critRace:A.critRace,spCost:A.spCost,spRec:A.spRec,hpRec:A.hpRec,ign:A.ign}});
  c.shield=r.shield;if(F.aspd!=null)c.aspd=F.aspd;if(F.maxHp!=null)c.maxHp=F.maxHp;if(F.maxSp!=null)c.maxSp=F.maxSp;
  // in-game Max HP / SP typed under "Check against the game" win: they include anything the build can't see (buffs, a stale job change)
  const ck=buildOf(c).check||{};if(num(ck.hp)>0)c.maxHp=num(ck.hp);if(num(ck.sp)>0)c.maxSp=num(ck.sp)}
// ---- consumables & buffs: the main stats as {str:{n, p}, ...} (+n and +n% of the total stat), then rows {on, name, eff} for
// anything else, typed like random options ("ATK +20, ASPD +10%") ----
const STAT6_UI=["str","agi","vit","int","dex","luk"];
// your own rows {on, name, eff}: other consumables (c.cons) and your own buffs from others (c.pbuffOwn), read like random options
const rowsOf=(c,key)=>{if(!Array.isArray(c[key]))c[key]=[];return c[key]};
const consOf=c=>rowsOf(c,"cons");
const OWN_LISTS=[{list:"consList",add:"consAdd",note:"consNote",key:"cons",what:"Consumable"},{list:"pbuffOwn",add:"pbuffAdd",note:"pbuffNote",key:"pbuffOwn",what:"Buff"}];
// older saves had AGI / DEX food among the buffs from others: move a ticked one into the stat table once
const consStatOf=c=>{if(!c.consStat||typeof c.consStat!=="object")c.consStat={};const pb=c.pbuffs||{};
  [["agiFood","agi"],["dexFood","dex"]].forEach(([k,st])=>{if(!pb[k])return;if(pb[k].on){const o=c.consStat[st]||(c.consStat[st]={});o.n=num(o.n)+Math.min(10,Math.max(1,num(pb[k].lv,10)))}delete pb[k]});
  return c.consStat};
// Blessing of Yggdrasil (World Tree Dew or Zelstar, 1 hour): all stats +7, ATK +30, MATK +30, HIT +5, FLEE +5 (in-game Yggdrasil Staff tooltip)
const YGG_FX=[...["str","agi","vit","int","dex","luk"].map(k=>[k,7]),["atk",30],["matk",30],["hit",5],["flee",5]];
// effect lines the status window can't show, read before the usual options (they count whether or not "add on top" is ticked):
// "SP +5% every 5s" / "HP +20 every 5 sec" / "SP +2/s" -> restored per second (sp_regen, sp_regen_pct of Max SP, same for HP),
// "SP consumption -10%" -> sp_cost_percent, "Fixed cast -30%" -> fct_percent (only the highest % cut counts), "Crit damage +5%" -> crit_dmg,
// "Ranged damage +5%" -> range_dmg (bows and other ranged weapons), "Magic damage +5%" -> magic_dmg,
// "Base/Job EXP +50%" -> exp_base / exp_job, "Recovery items +20%" -> rec_item_pct (HP and SP items restore more), "Heal received +20%" -> heal_pct, "Casting cannot be interrupted" -> no_break. "All stats +5" is the six stats;
// "ATK/MATK +30" and "Max HP/Max SP +5%" are split into one line each
const TIMED_RE=/^(max\s*hp|mhp|hp|max\s*sp|msp|sp)\s*\+\s*(\d+(?:\.\d+)?)\s*(%?)\s*(?:every|per|\/)\s*(\d+(?:\.\d+)?)?\s*s(?:ec(?:onds?)?)?$/i;
function parseCons(txt){const lines=[],rest=[],N="([+-]\\s*\\d+(?:\\.\\d+)?)";
  const one=p=>{p=p.trim();if(!p)return;let m;
    // written as on the item: "+7 All Stats" -> "All Stats +7"; no sign ("HIT/FLEE 30") -> +
    if((m=p.match(/^([+-]\s*\d+(?:\.\d+)?%?)\s+(.+)$/)))p=`${m[2]} ${m[1]}`;
    if(!/[+-]\s*\d/.test(p))p=p.replace(/\s(\d+(?:\.\d+)?%?)(\s*(?:every|per|\/).*)?$/i," +$1$2");
    if((m=p.match(TIMED_RE))){const k=/hp/i.test(m[1])?"hp":"sp";lines.push([k+(m[3]?"_regen_pct":"_regen"),null,null,parseFloat(m[2])/(m[4]?parseFloat(m[4]):1)]);return}
    const pct=(re,...ts)=>{const x=p.match(new RegExp(re+"\\s*"+N+"\\s*%$","i"));if(x)ts.forEach(t=>lines.push([t,null,null,parseFloat(x[1].replace(/\s/g,""))]));return !!x};
    if(pct("^(?:skill\\s*)?sp\\s*consumption","sp_cost_percent"))return;
    if(pct("^fixed\\s*cast(?:ing)?(?:\\s*time)?","fct_percent"))return;
    if(pct("^cri(?:t(?:ical)?)?\\s*(?:damage|dmg)","crit_dmg"))return;
    if(pct("^ranged(?:\\s*physical)?\\s*(?:damage|dmg)","range_dmg"))return;
    if(pct("^(?:all\\s*element\\s*)?magic(?:al)?\\s*(?:damage|dmg)","magic_dmg"))return;
    if(pct("^(?:incoming\\s*)?heal\\s*(?:and|&|\\/)\\s*recovery\\s*items?(?:\\s*effect)?","heal_pct","rec_item_pct"))return;
    if(pct("^(?:recovery|healing)\\s*items?(?:\\s*effect)?","rec_item_pct"))return;
    if(pct("^(?:incoming\\s*)?heal(?:\\s*received)?(?:\\s*effect)?","heal_pct"))return;
    if((m=p.match(/^(base|job|base\s*\/\s*job)\s*exp\s*([+-]\s*\d+(?:\.\d+)?)\s*%$/i))){const v=parseFloat(m[2].replace(/\s/g,""));
      if(/base/i.test(m[1]))lines.push(["exp_base",null,null,v]);if(/job/i.test(m[1]))lines.push(["exp_job",null,null,v]);return}
    if(/^cast(?:ing)?\s*(?:can\s*not|cannot|can't)\s*be\s*interrupted$/i.test(p)){lines.push(["no_break",null,null,1]);return}
    if((m=p.match(/^all\s*stats?\s*([+-]\s*\d+)$/i))){STAT6_UI.forEach(k=>rest.push(k+" "+m[1]));return}
    // "ATK/MATK +30", "Cri damage / ranged damage / magic damage +5%": each name gets the value
    if((m=p.match(/^([a-z ]+(?:\/[a-z ]+)+?)\s*([+-].*)$/i))){m[1].split("/").forEach(n=>one(n.trim()+" "+m[2]));return}
    rest.push(p)};
  String(txt||"").split(/[,;\n]+/).forEach(one);
  const o=BUILD.parseOptions(rest.join(","));return {lines:[...lines,...o.lines],bad:o.bad}}
// Ragnarok Zero event consumables (30 minutes each), added as rows you can edit; values from the in-game tooltips (Ragnarok Zero Global).
// note: what isn't counted
const CONS_PRESETS=[
  {name:"Challenge Drink",eff:"ATK/MATK +30, ATK/MATK +1%, HIT/FLEE +30, ASPD +1, SP consumption -5%, Fixed cast -30%"},
  {name:"Mimir's Well",eff:"Max SP +10%, SP consumption -10%"},
  {name:"Small Mana Potion",eff:"SP +5% every 5s"},
  {name:"Small Healing Potion",eff:"HP +5% every 5s"},
  {name:"Unlimited Drink",eff:"Max HP/Max SP +5%, Crit damage +5%, Ranged damage +5%, Magic damage +5%, Casting cannot be interrupted"},
  {name:"Premium Course Meal",eff:"All stats +5, ATK/MATK +20"},
  {name:"Enriched Abrasive",eff:"CRIT +30"},
  {name:"Growth Elixir",eff:"Base/Job EXP +50%"},
  {name:"Ale's Blessing",eff:"Recovery items +20%, Heal received +20%"}];
// stacking: stat food (the + column) and Blessing of Yggdrasil don't add up, the higher one counts per stat;
// course meals, event drinks and other rows stack on top
// clans (Ragnarok Zero Global; as iRO Wiki's Clan System has it): a buff that stays on while you're
// a member, two stats +1, Max HP +30 and Max SP +10. It stacks with food and Blessing of Yggdrasil. It can't be switched off, so a
// typed status window always has it: only build mode adds it
const CLANS={sword:{name:"Sword Clan",st:["str","vit"]},archwand:{name:"Arch Wand Clan",st:["int","dex"]},goldenmace:{name:"Golden Mace Clan",st:["luk","int"]},crossbow:{name:"Crossbow Clan",st:["dex","agi"]}};
const clanLines=c=>{const x=c.mode==="build"&&CLANS[c.clan];return x?[...x.st.map(k=>[k,null,null,1]),["hp",null,null,30],["sp",null,null,10]]:[]};
const clanEff=x=>`${x.st.map(k=>k.toUpperCase()+" +1").join(", ")}, Max HP +30, Max SP +10`;
const consLines=()=>{const lines=[],bad=[],cs=consStatOf(C()),ygg=Object.fromEntries(C().yggOn?YGG_FX:[]);
  Object.entries(ygg).forEach(([t,v])=>{if(!STAT6_UI.includes(t))lines.push([t,null,null,v])});
  STAT6_UI.forEach(k=>{const o=cs[k]||{},n=Math.max(num(o.n),ygg[k]||0);if(n)lines.push([k,null,null,n]);if(num(o.p))lines.push([k+"_percent",null,null,num(o.p)])});
  lines.push(...clanLines(C()));
  OWN_LISTS.forEach(L=>rowsOf(C(),L.key).filter(r=>r.on).forEach(r=>{const o=parseCons(r.eff);lines.push(...o.lines);bad.push(...o.bad.map(x=>`${r.name||L.what}: ${x}`))}));return {lines,bad}};
// ---- ASPD potions and buffs from others, from the RO樂園攻速計算機 sheet (2026-09-07, "增益"). "aspd_mod" is the sheet's potion/skill
// value: it adds value × AGI/200 to ASPD1 (see build.js). Who can drink them and from which base level (lv): rAthena item_db_usable ----
const ASPD_POT={conc:{name:"Concentration Potion",mod:4},awak:{name:"Awakening Potion",mod:6,lv:40,no:["Novice","Acolyte","Priest","Bard","Dancer"]},
  bers:{name:"Berserk Potion",mod:9,lv:85,only:["Mage","Merchant","Swordsman","Wizard","Blacksmith","Alchemist","Knight","Crusader","Rogue"]}};
const potJobOk=(k,job=state.job)=>{const p=ASPD_POT[k];return !!p&&!(p.no||[]).includes(job)&&(!p.only||p.only.includes(job))};
// below the potion's base level it can't be drunk (a blank base level doesn't hold it back)
const potLvOk=(k,lv=num(C().baseLv))=>{const p=ASPD_POT[k];return !p||!p.lv||!(lv>0)||lv>=p.lv};
const potOk=(k,job=state.job,lv)=>potJobOk(k,job)&&potLvOk(k,lv);
// the potion in use: the one picked, else the strongest this job can drink (older saves had a flat "+ASPD" box instead)
const potKey=c=>potOk(c.potType)?c.potType:["bers","awak","conc"].find(k=>potOk(k));
const AXE_MACE=["One-handed axe","Two-handed axe","One-handed mace","Two-handed mace"];
// lv: [min, max, default, label]; fx(level) -> bonus lines; eff: what it does, when the lines don't say it plainly; how: where the numbers come from.
// Skill values are Zero's in-game skill text (data/skills.js), which differs from classic RO for several of them
const PBUFF=[
  {k:"blessing",name:"Blessing",lv:[1,10,10],fx:l=>[["str",l],["int",l],["dex",l],["hit",2*l]]},
  {k:"clementia",name:"Clementia (Priest)",lv:[1,70,50,"Priest Job Lv"],fx:j=>{const v=10+Math.floor(j/10);return [["str",v],["int",v],["dex",v]]},
    how:"Blessing Lv 10 + Priest Job Lv/10"},
  {k:"incAgi",name:"Increase AGI",lv:[1,10,10],fx:l=>[["agi",2+l],["aspd_percent",l]]},
  // Angelus on Zero: Max HP +50 and VIT-based DEF +5% per level (the VIT / 2 part of soft DEF), 30 s × level, the caster's whole party
  {k:"angelus",name:"Angelus",lv:[1,10,10],fx:l=>[["hp",50*l],["vit_def_percent",5*l]],how:"Zero's skill text"},
  {k:"impositio",name:"Impositio Manus (Priest)",lv:[1,5,5],fx:l=>[["atk",5*l],["matk",5*l]],how:"Zero: ATK and MATK, not only weapon ATK"},
  {k:"assumptio",name:"Assumptio (Priest)",lv:[1,5,5],fx:l=>[["def",50*l],["heal_pct",2*l]],how:"Zero: flat DEF, not classic's half damage"},
  {k:"canto",name:"Canto Candidus (Priest)",fx:()=>[["agi",19],["aspd_percent",17]]},
  {k:"riff",name:"Impressive Riff (Bard)",lv:[1,10,10],fx:l=>[["aspd_percent",l===10?17:1+2*(l-1)]],how:"Zero: 17% at Lv 10, not the description's 20%"},
  {k:"adren",name:"Adrenaline Rush (from a Blacksmith)",w:AXE_MACE,lv:[1,5,5],fx:l=>[["aspd_mod",6],["aspd_percent",10],["hit",5+3*l]],how:"axes and maces; HIT +5 + 3 per level from Zero's skill text"}];
const pbuffOf=c=>{if(!c.pbuffs||typeof c.pbuffs!=="object")c.pbuffs={};return c.pbuffs};
const pbLv=(b,o)=>b.lv?Math.min(b.lv[1],Math.max(b.lv[0],num(o.lv,b.lv[2]))):0;
// what it does at level lv (the level you typed, else the default)
const PB_LABEL={aspd_percent:v=>`ASPD +${v}%`,aspd_mod:v=>`potion/skill value ${v}`,hp:v=>`Max HP +${v}`,vit_def_percent:v=>`VIT DEF +${v}%`,heal_pct:v=>`Heal received +${v}%`};
const pbEff=(b,lv=b.lv?b.lv[2]:0)=>b.eff||b.fx(lv).map(([t,v])=>PB_LABEL[t]?PB_LABEL[t](v):`${t.toUpperCase()} +${v}`).join(", ")+(b.how?` (${b.how})`:"");
// a buff counts when ticked and it fits your weapon. It doesn't stack with the same buff switched on in your Skills card, and
// Clementia replaces Blessing, Canto Candidus replaces Increase AGI
const PB_SELF={blessing:"blessing",incAgi:"increase-agility",angelus:"angelus",impositio:"impositio-manus",adren:"adrenaline-rush"},PB_OVER={blessing:"clementia",incAgi:"canto"};
const pbTicked=(k,c)=>!!(pbuffOf(c)[k]||{}).on;
const pbOn=(b,c)=>{if(!pbTicked(b.k,c)||(b.w&&!b.w.includes(c.weapon)))return false;const own=PB_SELF[b.k];
  if(own&&(c.buffs||{})[own]&&skLv(c,own))return false;return !(PB_OVER[b.k]&&pbTicked(PB_OVER[b.k],c))};
function aspdBuffLines(c=C()){const out=[];if(c.potOn){const k=potKey(c);if(k)out.push(["aspd_mod",null,null,ASPD_POT[k].mod])}
  PBUFF.forEach(b=>{if(pbOn(b,c))b.fx(pbLv(b,pbuffOf(c)[b.k])).forEach(([t,v])=>out.push([t,null,null,v]))});return out}
// one line type summed over the buffs from others that count (Assumptio's Heal received % for consSum)
const pbSum=(t,c=C())=>aspdBuffLines(c).reduce((a,b)=>a+(b[0]===t?b[3]:0),0);
// status-window mode: the typed numbers are read with consumables off, so their effect is added here into EFF (see cf).
// Unticking "addOnTop" says the typed numbers already include them, so nothing is added
const addOnTop=c=>c.mode!=="build"&&c.addOnTop!==false;
function applyConsumables(){EFF=null;const c=C();if(!addOnTop(c))return;const lines=[...consLines().lines,...(SKFX?SKFX.buffStat:[]),...aspdBuffLines(c)];if(!lines.length)return;
  const A={};lines.forEach(([t,,,v])=>A[t]=(A[t]||0)+v);const g=k=>A[k]||0,f=Math.floor;
  // stat buffs move status ATK / MATK / HIT / FLEE / DEF / CRIT / ASPD through the same formulas (only for stats you typed);
  // "STR +10%" is a share of the typed stat plus the flat bonuses, rounded down as in build.js
  const stAdd=k=>{const t=statVal(c,k);return g(k)+(t!=null?Math.floor((t+g(k))*g(k+"_percent")/100):0)};
  const tmp={...c,st:{...(c.st||{})},intTxt:c.intTxt};STATS.forEach(k=>{const v=stAdd(k);if(v&&statVal(c,k)!=null)tmp.st[k]=`${c.st[k]}+${v}`});
  {const v=stAdd("int");if(v)tmp.intTxt=`${c.intTxt||0}+${v}`}
  const b0=derived(c),b1=derived(tmp),d=k=>(b1[k]||0)-(b0[k]||0);
  const parts=t=>{const p=String(t||"0").split("+").map(x=>parseFloat(x)||0);return [p[0]||0,p.slice(1).reduce((a,x)=>a+x,0)]};
  const [as,ag]=parts(c.atkTxt),[ms,mg]=parts(c.matkTxt),[ds,dh]=parts(c.defTxt);
  // ATK % isn't in the status window: it goes to atkPct, which the damage model adds next to the race / size cards
  const atkSt=as+d("atk"),atkGear=ag+g("atk");
  const matkSt=ms+d("matk"),matkTot=f((matkSt+mg+g("matk"))*(1+g("matk_percent")/100));
  // ASPD as in build.js: stat term and potion/skill value × AGI/200 go into ASPD1, then ASPD % and flat ASPD, rounded down
  let aspd=num(c.aspd,170)+d("aspdTerm")+g("aspd_mod")*(statVal(tmp,"agi")||0)/200;aspd=Math.min(190,Math.floor(aspd+(195-aspd)*g("aspd_percent")/100+g("aspd")));
  const vit0=statVal(c,"vit"),vit1=statVal(tmp,"vit"),int0=statVal(c,"int"),int1=statVal(tmp,"int");
  // Angelus's VIT-based DEF % goes on the soft DEF (needs the VIT you typed)
  const vitDef=vit1!=null?BUILD.vitDefAdd(vit1,g("vit_def_percent")):0;
  const hp=num(c.maxHp)>0?f((num(c.maxHp)*(vit0!=null?(100+vit1)/(100+vit0):1)+g("hp"))*(1+g("hp_percent")/100)):c.maxHp;
  const sp=num(c.maxSp)>0?f((num(c.maxSp)*(100+int1)/(100+int0)+g("sp"))*(1+g("sp_percent")/100)):c.maxSp;
  EFF={atkTxt:`${atkSt}+${atkGear}`,matkTxt:`${matkSt}+${matkTot-matkSt}`,hitTxt:String(sumStat(c.hitTxt)+d("hit")+g("hit")),fleeTxt:String(sumStat(c.fleeTxt)+d("flee")+g("flee")),
    atkPct:num(c.atkPct)+g("atk_percent"),defTxt:`${ds+d("def")+vitDef}+${dh+g("def")}`,crit:num(c.crit)+d("crit")+g("crit"),aspd,maxHp:hp,maxSp:sp,st:tmp.st,intTxt:tmp.intTxt}}
function renderCons(){const c=C(),cs=consStatOf(c);
  $("consStats").tBodies[0].innerHTML=STAT6_UI.map(k=>{const o=cs[k]||{};return `<tr data-cs="${k}"><td>${k.toUpperCase()}</td>
    <td><input data-f="n" type="number" step="1" value="${esc(o.n??"")}" placeholder="0" aria-label="${k.toUpperCase()} +"></td>
    <td><input data-f="p" type="number" step="1" value="${esc(o.p??"")}" placeholder="0" aria-label="${k.toUpperCase()} +%"></td></tr>`}).join("");
  OWN_LISTS.forEach(L=>$(L.list).innerHTML=rowsOf(c,L.key).map((r,i)=>`<div class="eqrow" data-i="${i}">
    <input type="checkbox" data-f="on" ${r.on?"checked":""} aria-label="Use it">
    <input data-f="name" value="${esc(r.name||"")}" placeholder="name" class="w-2xl">
    <input data-f="eff" value="${esc(r.eff||"")}" placeholder="e.g. ATK +20, HIT +10, ASPD +10%" class="grow200">
    <button type="button" class="small danger" data-del aria-label="Remove">✕</button></div>`).join("")||(L.key==="cons"?'<div class="note">None yet.</div>':""));consNote()}
// redrawn on every render (job and weapon change what's allowed), except while you're typing in it
function renderAspdBuffs(){const c=C(),k=potKey(c),act=document.activeElement;$("consOff").hidden=c.mode==="build"||addOnTop(c);
  $("clanSel").value=CLANS[c.clan]?c.clan:"";$("clanInfo").textContent=(CLANS[c.clan]?clanEff(CLANS[c.clan]):"two stats +1, Max HP +30, Max SP +10")+(c.mode==="build"?"":" · build mode only: your status window already shows it");
  if(act!==$("potType"))$("potType").innerHTML=Object.entries(ASPD_POT).filter(([key])=>potJobOk(key)).map(([key,p])=>{const lvOk=potLvOk(key);
    return `<option value="${key}"${key===k?" selected":""}${lvOk?"":" disabled"}>${p.name} (${p.mod})${lvOk?"":` · Base Lv ${p.lv}+`}</option>`}).join("");
  if(!$("pbuffList").contains(act))$("pbuffList").innerHTML=PBUFF.map(b=>{const o=pbuffOf(c)[b.k]||{},off=b.w&&!b.w.includes(c.weapon),own=PB_SELF[b.k]&&(c.buffs||{})[PB_SELF[b.k]]&&skLv(c,PB_SELF[b.k]);
    return `<div class="eqrow" data-pb="${b.k}"><label class="bar pbName"><input type="checkbox" data-f="on" ${o.on?"checked":""}>${esc(b.name)}</label>
    ${b.lv?`<label class="bar">${b.lv[3]||"Lv"} <input data-f="lv" type="number" min="${b.lv[0]}" max="${b.lv[1]}" value="${pbLv(b,o)}" class="w-xs"></label>`:""}
    <span class="note"><span data-pbeff>${esc(pbEff(b,pbLv(b,o)))}</span>${off?' · <span class="warnc">not with this weapon</span>':own?" · on in your Skills card, counted there":""}</span></div>`}).join("")}
$("pbuffList").addEventListener("input",e=>{const f=e.target.dataset.f,row=e.target.closest("[data-pb]");if(!f||!row)return;const o=pbuffOf(C())[row.dataset.pb]||(pbuffOf(C())[row.dataset.pb]={});
  o[f]=f==="on"?e.target.checked:num(e.target.value);
  // the list isn't redrawn while you type in it, so the effect text follows the level here
  {const b=PBUFF.find(x=>x.k===row.dataset.pb),el=row.querySelector("[data-pbeff]");if(b&&el)el.textContent=pbEff(b,pbLv(b,o))}save();renderAll()});
$("clanSel").innerHTML=`<option value="">none</option>`+Object.entries(CLANS).map(([k,x])=>`<option value="${k}">${esc(x.name)}</option>`).join("");
$("clanSel").addEventListener("change",e=>{const c=C();if(e.target.value)c.clan=e.target.value;else delete c.clan;save();renderAll()});
$("addOnTop").addEventListener("change",e=>{C().addOnTop=e.target.checked;save();renderAll()});
$("potType").addEventListener("change",e=>{C().potType=e.target.value;save();renderAll()});
const consNote=()=>OWN_LISTS.forEach(L=>{const bad=rowsOf(C(),L.key).filter(r=>r.on).flatMap(r=>parseCons(r.eff).bad.map(x=>`${r.name||L.what}: ${x}`));
  $(L.note).innerHTML=bad.length?`<span class="bad">Not understood: ${bad.map(esc).join(", ")}</span>`:""});
$("consStats").addEventListener("input",e=>{const f=e.target.dataset.f,row=e.target.closest("[data-cs]");if(!f||!row)return;const cs=consStatOf(C());
  (cs[row.dataset.cs]||(cs[row.dataset.cs]={}))[f]=e.target.value===""?"":num(e.target.value);save();renderAll()});
$("consPreset").innerHTML='<option value="">+ event item…</option>'+CONS_PRESETS.map((p,i)=>`<option value="${i}" title="${esc(p.eff)}">${esc(p.name)}</option>`).join("");
$("consPreset").addEventListener("change",e=>{const p=CONS_PRESETS[+e.target.value];e.target.value="";if(!p)return;
  consOf(C()).push({on:true,name:p.name,eff:p.eff});save();renderCons();renderAll();if(p.note)$("consNote").innerHTML+=` <span class="muted">${esc(p.name)}: ${esc(p.note)}</span>`});
OWN_LISTS.forEach(L=>{
  $(L.add).addEventListener("click",()=>{rowsOf(C(),L.key).push({on:true,name:"",eff:""});save();renderCons();renderAll()});
  $(L.list).addEventListener("click",e=>{if(!e.target.closest("[data-del]"))return;rowsOf(C(),L.key).splice(+e.target.closest(".eqrow").dataset.i,1);save();renderCons();renderAll()});
  $(L.list).addEventListener("input",e=>{const f=e.target.dataset.f;if(!f)return;const r=rowsOf(C(),L.key)[+e.target.closest(".eqrow").dataset.i];
    r[f]=f==="on"?e.target.checked:e.target.value;save();renderAll();consNote()})});
// ---- equipment stats (status-window mode): the % lines from the game's Equipment Stats window, as rows {by, t, ch, v} ----
// [kind, label, has a Phys / Magic choice, flat (no %)]
const EQ_KINDS=[["race","Damage to race",true],["size","Damage to size",true],["ele","Damage to element",true],["kind","Damage to boss / normal",true],["group","Damage to monster group",true],
  ["all","Damage to all monsters",true],["myEle","Magic damage of an element (your spells)"],["critRace","CRIT when attacking race",false,true],["takenRace","Damage taken from race"],["takenSize","Damage taken from size"],["takenEle","Damage taken from element"],["takenKind","Damage taken from boss / normal"],
  ["ignRace","Ignore DEF / MDEF of race",true],["ignSize","Ignore DEF / MDEF of size",true],["ignEle","Ignore DEF / MDEF of element",true],["ignKind","Ignore DEF / MDEF of boss / normal",true],
  ["exp","EXP gained from monsters"],["expRace","EXP gained from race"],["spCost","Skill SP consumption"],["spRec","SP recovery (natural regen)"],["hpRec","HP recovery (natural regen)"]];
const EQ_TARGETS={race:()=>RACES,size:()=>[["S","Small"],["M","Medium"],["L","Large"]],ele:()=>AE,kind:()=>[["boss","Boss"],["normal","Normal"]],group:()=>[["Boulder Dwarf","Boulder Dwarves"]],
  ignRace:()=>RACES,ignSize:()=>EQ_TARGETS.size(),ignEle:()=>AE,ignKind:()=>EQ_TARGETS.kind(),myEle:()=>AE,critRace:()=>RACES,takenRace:()=>RACES,takenSize:()=>EQ_TARGETS.size(),takenEle:()=>AE,takenKind:()=>[["boss","Boss"],["normal","Normal"]],expRace:()=>RACES};
// older saves had one race / size / element box each; turn them into rows once
const eqOf=c=>{if(!Array.isArray(c.eq))c.eq=[];
  [["raceSel","racePct","raceType","race"],["sizeSel","sizePct","sizeType","size"],["elSel","elPct","elType","ele"]].forEach(([s,p,t,by])=>{
    if(c[s]&&num(c[p]))c.eq.push({by,t:c[s],ch:c[t]||"both",v:num(c[p])});delete c[s];delete c[p];delete c[t]});return c.eq};
const IGN_BY={ignRace:"race",ignSize:"size",ignEle:"ele",ignKind:"kind"};
function eqToBx(c){const o={phys:{all:0,race:{},size:{},ele:{},kind:{},group:{}},magic:{all:0,race:{},size:{},ele:{},kind:{},group:{}},myEle:{},critRace:{},taken:{race:{},size:{},ele:{},kind:{}},exp:{all:0,race:{}},spCost:0,spRec:0,hpRec:0,
    ign:{def:{race:{},size:{},ele:{},kind:{}},mdef:{race:{},size:{},ele:{},kind:{}}}};
  const add=(m,k,v)=>{m[k]=(m[k]||0)+v};
  eqOf(c).forEach(r=>{const v=num(r.v);if(!v)return;
    if(["race","size","ele","kind","group"].includes(r.by)){if(r.ch!=="magic")add(o.phys[r.by],r.t,v);if(r.ch!=="phys")add(o.magic[r.by],r.t,v)}
    else if(r.by==="all"){if(r.ch!=="magic")o.phys.all+=v;if(r.ch!=="phys")o.magic.all+=v}
    // ignore rows: Physical is DEF, Magic is MDEF
    else if(IGN_BY[r.by]){if(r.ch!=="magic")add(o.ign.def[IGN_BY[r.by]],r.t,v);if(r.ch!=="phys")add(o.ign.mdef[IGN_BY[r.by]],r.t,v)}
    else if(r.by==="myEle")add(o.myEle,r.t,v);else if(r.by==="critRace")add(o.critRace,r.t,v);else if(r.by.startsWith("taken"))add(o.taken[{takenRace:"race",takenSize:"size",takenEle:"ele",takenKind:"kind"}[r.by]],r.t,v);
    else if(r.by==="exp")o.exp.all+=v;else if(r.by==="expRace")add(o.exp.race,r.t,v);else if(r.by==="spCost")o.spCost+=v;else if(r.by==="spRec")o.spRec+=v;else if(r.by==="hpRec")o.hpRec+=v});return o}
// "Fill from gear": the lines the gear saved in Build from gear gives (gear, cards, affixes, stones, Taming Ring, other special
// equipment; not consumables or buffs), one row per bonus. A bonus with different physical and magic values gets a row for each
const setSaved=b=>{const sp=b.special||{};return Object.keys(b.gear||{}).length>0||Object.values(b.stones||{}).some(Boolean)||!!sp.ring||!!sp.shield||(sp.own||[]).length>0||Object.values(sp.costume||{}).some(Boolean)};
const gearSaved=c=>setSaved(c.build||{});
function gearEqRows(c){const A=BUILD.compute({...buildOf(c),baseLv:c.baseLv,jobLv:c.jobLv,extra:[]},state.job,aspdBase).acc,rows=[];
  const add=(by,t,v,ch="both")=>{v=Math.round(v*100)/100;if(v)rows.push({by,t,ch,v})};
  const both=(by,t,p,m)=>{if(p===m)add(by,t,p);else{add(by,t,p,"phys");add(by,t,m,"magic")}};
  ["race","size","ele","kind","group"].forEach(by=>new Set([...Object.keys(A.phys[by]),...Object.keys(A.magic[by])]).forEach(t=>both(by,t,A.phys[by][t]||0,A.magic[by][t]||0)));
  both("all","",A.phys.all,A.magic.all);
  Object.entries(IGN_BY).forEach(([by,k])=>new Set([...Object.keys(A.ign.def[k]),...Object.keys(A.ign.mdef[k])]).forEach(t=>both(by,t,A.ign.def[k][t]||0,A.ign.mdef[k][t]||0)));
  Object.entries(A.myEle).forEach(([t,v])=>add("myEle",t,v));Object.entries(A.critRace).forEach(([t,v])=>add("critRace",t,v));
  [["race","takenRace"],["size","takenSize"],["ele","takenEle"],["kind","takenKind"]].forEach(([k,by])=>Object.entries(A.taken[k]||{}).forEach(([t,v])=>add(by,t,v)));
  add("exp","",A.exp.all);Object.entries(A.exp.race).forEach(([t,v])=>add("expRace",t,v));
  add("spCost","",A.spCost);add("spRec","",A.spRec);add("hpRec","",A.hpRec);return rows}
function renderEq(){const c=C();$("eqPanel").hidden=c.mode==="build";const fill=$("eqFill");fill.disabled=!gearSaved(c);
  fill.title=fill.disabled?"Set up your gear in Build from gear first":"Replace these lines with the ones your gear in Build from gear gives";
  $("eqList").innerHTML=eqOf(c).map((r,i)=>{const k=EQ_KINDS.find(x=>x[0]===r.by)||EQ_KINDS[0],T=EQ_TARGETS[r.by];
    const opt=(v,l)=>`<option value="${esc(v)}" ${String(v)===String(r.t)?"selected":""}>${esc(l)}</option>`;
    return `<div class="eqrow" data-i="${i}"><select data-f="by">${EQ_KINDS.map(([v,l])=>`<option value="${v}" ${v===r.by?"selected":""}>${l}</option>`).join("")}</select>
      ${T?`<select data-f="t">${T().map(x=>Array.isArray(x)?opt(x[0],x[1]):opt(x,x)).join("")}</select>`:""}
      ${k[2]?`<select data-f="ch">${[["both","Phys + Magic"],["phys","Physical"],["magic","Magic"]].map(([v,l])=>`<option value="${v}" ${v===(r.ch||"both")?"selected":""}>${l}</option>`).join("")}</select>`:""}
      <input data-f="v" type="number" step="1" value="${esc(r.v??"")}" placeholder="${k[3]?"+":"%"}" aria-label="${k[3]?"Value":"Percent"}">${k[3]?"":" %"}
      <button type="button" class="small danger" data-del aria-label="Remove line">✕</button>${r.by==="exp"||r.by==="expRace"?'<span class="note warnc" data-eqmax></span>':""}</div>`}).join("")||'<div class="note">No lines yet.</div>'}
$("eqAdd").addEventListener("click",()=>{eqOf(C()).push({by:"race",t:RACES[0],ch:"both",v:""});save();renderEq();renderAll()});
$("eqFill").addEventListener("click",()=>{const c=C();if(!gearSaved(c))return;const rows=gearEqRows(c),had=eqOf(c).length;
  if(had&&!confirm(`Replace your ${had} Equipment stats line${had>1?"s":""} with the ${rows.length} your gear in Build from gear gives?`))return;
  c.eq=rows;save();renderEq();renderAll();
  $("eqFillNote").textContent=rows.length?`Filled ${rows.length} line${rows.length>1?"s":""} from your gear. Procs and lines Build from gear lists under "Not counted" aren't included.`:"Your gear in Build from gear has no lines for this list."});
$("eqList").addEventListener("click",e=>{if(e.target.closest("[data-del]")==null)return;const i=+e.target.closest(".eqrow").dataset.i;eqOf(C()).splice(i,1);save();renderEq();renderAll()});
$("eqList").addEventListener("change",e=>{const f=e.target.dataset.f;if(!f||f==="v")return;const r=eqOf(C())[+e.target.closest(".eqrow").dataset.i];r[f]=e.target.value;
  if(f==="by"){const T=EQ_TARGETS[r.by];const first=T&&T()[0];r.t=first==null?"":Array.isArray(first)?first[0]:first}save();renderEq();renderAll()});
$("eqList").addEventListener("input",e=>{if(e.target.dataset.f!=="v")return;eqOf(C())[+e.target.closest(".eqrow").dataset.i].v=e.target.value===""?"":num(e.target.value);save();renderAll()});
// item picker labels: the name, plus the id when two items share a name
const jobSlug=()=>state.job.toLowerCase();
// gear lists the job family ("swordsman" covers Knight and Crusader), so a 2nd job also matches its 1st job
const FIRST_OF=BUILD.FIRST_OF;
const canWear=it=>!it.jobs||!it.jobs.length||it.jobs.includes(jobSlug())||(FIRST_OF[state.job]&&it.jobs.includes(FIRST_OF[state.job].toLowerCase()));
const labelOf=(it,list)=>list.filter(x=>x.name===it.name).length>1?`${it.name} #${it.id}`:it.name;
const pickList=(list)=>{const m=new Map();list.forEach(it=>m.set(labelOf(it,list),it.id));return m};
let GEAR_LISTS={};
// an Assassin's Shield row also takes a left-hand dagger, one-handed sword or one-handed axe
const leftHandOk=it=>state.job==="Assassin"&&(it.slot||[]).includes("weapon")&&BUILD.DUAL_W.includes(BUILD.WTYPE[it.type]);
function gearChoices(slot){const s=BUILD.SLOTS.find(x=>x.k===slot);return (typeof EQUIP!=="undefined"?EQUIP:[]).filter(it=>((it.slot||[]).some(x=>s.takes.includes(x))||slot==="shield"&&leftHandOk(it))&&canWear(it))}
// cards follow the item: a weapon in the Shield row takes weapon cards
function cardChoices(slot,it){const cs=it&&(it.slot||[]).includes("weapon")?"weapon":BUILD.CARD_FOR[slot];return (typeof CARDS!=="undefined"?CARDS:[]).filter(c=>(c.slot||[]).some(x=>x===cs||x.startsWith(cs)))}
// the name a card gives its gear in the equipment window ("Healing" for Vitata Card; affix in data/cards.js), so the boxes also take
// what a screenshot shows
const cardName=c=>(c.affix??(BUILD.item(c.id)||{}).affix)||"";
const readGear=(slot,text,items)=>BUILD.readGearName(text,items||gearChoices(slot),it=>cardChoices(slot,it),cardName);
// random options: a list per option the item rolled, plus an empty one to add the next (any item takes up to OPT_MAX). Each list holds
// the affixes the row's gear rolls (BUILD.optChoices: a weapon by its type, also in the Shield row; every option for parts the database has
// no pool for), with its min–max on the value box. An option saved before that this gear can't roll stays, listed under "Saved"
const OPT_HTML={};
// rows replacing typed option text keep the typed lines that match no option (g.optsText), so none are lost
const optSet=(g,rows)=>{const bad=BUILD.optBad(g.opts);g.opts=rows;if(bad.length)g.optsText=[g.optsText,...bad].filter(Boolean).join(", ")};
// under the lists: the typed lines kept (not counted, with a remove link), and the limit once it's reached
const optKept=g=>[g.optsText,...BUILD.optBad(g.opts)].filter(Boolean).join(", ");
const optDrop=g=>{g.opts=BUILD.optRows(g.opts);delete g.optsText};
const optFoot=(g,n)=>(optKept(g)?`<div class="note">Kept as typed, not counted: ${esc(optKept(g))} · <a href="#" data-optsdrop>remove</a></div>`:"")+(n>=BUILD.OPT_MAX?`<div class="note">max ${BUILD.OPT_MAX} options (the most an item rolls)</div>`:"");
const optList=ch=>{const gs=[...new Set(ch.map(o=>o.g))];
  return gs.map(g=>`<optgroup label="${esc(g)}">${ch.filter(o=>o.g===g).map(o=>`<option value="${o.k}">${esc(o.label)}${o.range?` (${o.range[0]}${o.range[1]!==o.range[0]?"–"+o.range[1]:""})`:""}</option>`).join("")}</optgroup>`).join("")};
function optBoxes(slot,g,it){const ch=BUILD.optChoices(slot,it),gk=BUILD.optGear(slot,it)||"all",list=OPT_HTML[gk]||(OPT_HTML[gk]=optList(ch)),rows=BUILD.optRows(g.opts);
  const one=(x,i)=>{const o=x&&ch.find(c=>c.k===x.k),saved=x&&!o?BUILD.OPTIONS.find(c=>c.k===x.k):null,r=o&&o.range;
    return `<div class="opt"><select data-opt="${i}"><option value="">${x?"remove":"+ affix"}</option>${saved?`<optgroup label="Saved"><option value="${saved.k}">${esc(saved.label)}</option></optgroup>`:""}${list}</select>${x?`<input data-optv="${i}" type="number" step="any"${r?` min="${r[0]}" max="${r[1]}" placeholder="${r[0]}–${r[1]}" title="${esc(o.label)}: ${r[0]}–${r[1]}"`:""} value="${esc(x.v??"")}">`:""}</div>`};
  return `<div class="opts">${rows.map(one).join("")}${rows.length<BUILD.OPT_MAX?one(null,rows.length):""}${optFoot(g,rows.length)}</div>`}
// costume enchant stones: a list per costume slot, each stone with what it gives
const STONE_FX={str:"STR",agi:"AGI",vit:"VIT",int:"INT",dex:"DEX",luk:"LUK",crit:"CRIT",hit:"HIT",flee:"FLEE",def:"DEF",mdef:"MDEF",hp:"MaxHP",sp:"MaxSP",aspd:"ASPD",
  atk:"ATK",matk:"MATK",exp_percent:"EXP %",damage_percent:"Physical damage %",hp_recovery_percent:"HP recovery %",attack_delay_percent:"After-attack delay %",atk_percent:"ATK %",matk_percent:"MATK %",hp_percent:"MaxHP %",sp_percent:"MaxSP %",crit_damage_percent:"Critical damage %",cast_time_variable_percent:"Variable cast %"};
const stoneFx=x=>x.off&&!x.b.length?x.off:x.b.map(([t,k,g,v])=>{const l=k==="size"?`Damage vs ${g} %`:t==="damage_taken_percent"?`${g[0].toUpperCase()+g.slice(1)} resist %`:STONE_FX[t]||t,pc=/ %$/.test(l);
  if(t==="damage_taken_percent")v=-v;return `${l.replace(/ %$/,"")} ${v>0?"+":""}${v}${pc?"%":""}`}).join(", ");
// a stone goes on the costume in its slot: b.special.costume = {slot: costume id}, picked from the costumes that take the slot
// (data/costumes.js; names from data/clientitems.js). A costume that takes more than one slot (Upper / Middle) is in each of them
const costumeName=id=>(typeof CLIENT_ITEMS!=="undefined"&&CLIENT_ITEMS[id]||[])[0]||"";
const COSTUME_LISTS={};
const costumesFor=k=>COSTUME_LISTS[k]||(COSTUME_LISTS[k]=(typeof COSTUMES!=="undefined"?Object.entries(COSTUMES):[]).filter(([id,s])=>s.includes(k)&&costumeName(id))
  .map(([id])=>[costumeName(id),+id]).sort((a,b)=>a[0].localeCompare(b[0])));
function costumeLists(){if($("costumeLists").childElementCount)return;
  $("costumeLists").innerHTML=BUILD.STONE_SLOTS.map(z=>`<datalist id="cos_${z.k}">${costumesFor(z.k).map(([n])=>`<option value="${esc(n)}">`).join("")}</datalist>`).join("")}
// the Special Equipment table, a row a slot like the gear table: a costume per costume slot with its enchant stone, the Taming Ring
// (Special Equipment, Accessory Right: b.special.ring = the pet egg sealed in it, or true for the ring with no egg), the shadow shield
// (b.special.shield, an item id), then other special equipment
const shadowShields=()=>(typeof SHADOW_SHIELDS!=="undefined"?SHADOW_SHIELDS:[]).map(id=>BUILD.item(id)).filter(Boolean);
function renderStones(){const b=gearSet(),sel=b.stones||{},ring=(b.special||{}).ring,sh=(b.special||{}).shield,cos=(b.special||{}).costume||{},all=typeof STONES!=="undefined"?STONES:[],eggs=typeof TAMING_EGGS!=="undefined"?TAMING_EGGS:[];costumeLists();
  $("stoneRow").innerHTML=BUILD.STONE_SLOTS.map(z=>{const lo=z.label.toLowerCase();
    return `<tr><td>Costume ${lo}</td><td><div class="itemBox">${itemIcon(cos[z.k])}<input class="item" data-costume="${z.k}" list="cos_${z.k}" placeholder="none" title="The costume the ${lo} stone goes on" aria-label="Costume ${lo}" value="${esc(costumeName(cos[z.k]))}"></div></td>
    <td><div class="itemBox">${itemIcon(sel[z.k])}<select data-stone="${z.k}" aria-label="Costume ${lo} stone"><option value="">no stone</option>${all.filter(x=>x.slot===z.k)
    .map(x=>`<option value="${x.id}"${+sel[z.k]===x.id?" selected":""}>${esc(x.name.replace(/ \((Upper|Middle|Lower|Garment)\)$/,""))}: ${esc(stoneFx(x))}</option>`).join("")}</select></div></td><td></td></tr>`}).join("")+
    `<tr><td>Shield</td><td><div class="itemBox">${iconHtml("gear",sh)}<select data-shadow="shield" aria-label="Shadow shield"><option value="">none</option>${shadowShields().map(x=>`<option value="${x.id}"${+sh===x.id?" selected":""}>${esc(x.name)}: ${esc(stoneFx({b:(x.g||[]).flatMap(g=>g.b||[])}))}</option>`).join("")}</select></div></td><td></td><td></td></tr>
    <tr><td>Accessory right</td><td><div class="itemBox">${itemIcon(ring&&24966)}<select data-ringon="1" aria-label="Accessory right"><option value="">none</option><option value="1"${ring?" selected":""}>Taming Ring</option></select></div></td><td><div class="itemBox">${itemIcon(ring)}<select data-ring="1" aria-label="Taming Ring pet egg" title="${ring?"The pet egg sealed in the ring":"Picking an egg puts the Taming Ring on"}"><option value="">no egg</option>${eggs.map(x=>`<option value="${x.id}"${+ring===x.id?" selected":""}>${esc(x.name)}: ${esc([x.b.length?stoneFx({b:x.b}):"",x.off||""].filter(Boolean).join(", "))}</option>`).join("")}</select></div></td><td></td></tr>`;renderSpecialOwn()}
// other special equipment: rows {on, name, opts} in b.special.own, each with up to OPT_MAX effects from the full affix list
const specialOwn=()=>{const b=gearSet();b.special=b.special||{};if(!Array.isArray(b.special.own))b.special.own=[];return b.special.own};
function renderSpecialOwn(){$("specialOwn").innerHTML=specialOwn().map((x,i)=>`<tr data-i="${i}">
    <td><div class="ownOn"><label><input type="checkbox" data-f="on" ${x.on!==false?"checked":""} title="Wearing it"> Other</label><button type="button" class="small danger" data-del aria-label="Remove" title="Remove">✕</button></div></td>
    <td><div class="itemBox">${iconHtml("gear",null)}<input class="item" data-f="name" value="${esc(x.name||"")}" placeholder="name" aria-label="Name"></div></td><td></td><td>${optBoxes("special",x,null)}</td></tr>`).join("");
  specialOwn().forEach((x,i)=>BUILD.optRows(x.opts).forEach((o,j)=>{const el=$("specialOwn").querySelector(`[data-i="${i}"] [data-opt="${j}"]`);if(el)el.value=o.k}))}
$("specialAdd").addEventListener("click",()=>{specialOwn().push({on:true,name:"",opts:[]});save();renderSpecialOwn();renderAll();
  $("specialOwn").querySelector("tr:last-child [data-f=name]")?.focus()});
$("specialOwn").addEventListener("click",e=>{if(e.target.closest("[data-optsdrop]")){e.preventDefault();optDrop(specialOwn()[+e.target.closest("tr[data-i]").dataset.i]);save();renderSpecialOwn();renderAll();return}
  if(!e.target.closest("[data-del]"))return;specialOwn().splice(+e.target.closest("tr[data-i]").dataset.i,1);save();renderSpecialOwn();renderAll()});
$("specialOwn").addEventListener("change",e=>{if(e.target.dataset.opt==null)return;const row=e.target.closest("tr[data-i]"),x=specialOwn()[+row.dataset.i],rows=BUILD.optRows(x.opts),i=+e.target.dataset.opt,v=e.target.value;
  if(!v)rows.splice(i,1);else rows[i]={k:v,v:rows[i]?rows[i].v:""};optSet(x,rows);save();renderSpecialOwn();renderAll();
  if(v)$("specialOwn").querySelector(`[data-i="${row.dataset.i}"] [data-optv="${i}"]`)?.focus()});
$("specialOwn").addEventListener("input",e=>{const row=e.target.closest("tr[data-i]");if(!row)return;const x=specialOwn()[+row.dataset.i],f=e.target.dataset.f;
  if(f)x[f]=f==="on"?e.target.checked:e.target.value;
  else if(e.target.dataset.optv!=null){const rows=BUILD.optRows(x.opts),o=rows[+e.target.dataset.optv];if(!o)return;o.v=e.target.value===""?"":num(e.target.value);optSet(x,rows)}else return;
  save();renderAll()});
// redraw the rows (their icons), the box you changed keeping focus
const stonesRedraw=el=>{const f=["ringon","ring","shadow","costume","stone"].map(k=>el.dataset[k]!=null?`[data-${k}="${el.dataset[k]}"]`:null).find(Boolean);renderStones();if(f)$("stoneRow").querySelector(f)?.focus()};
$("stoneRow").addEventListener("change",e=>{const b=gearSet();
  // the ring on or off (off takes its egg with it); an egg puts the ring on, no egg leaves it on empty
  if(e.target.dataset.shadow){b.special=b.special||{};if(e.target.value)b.special.shield=+e.target.value;else delete b.special.shield;save();stonesRedraw(e.target);renderAll();return}
  if(e.target.dataset.ringon){b.special=b.special||{};if(!e.target.value)delete b.special.ring;else if(!b.special.ring)b.special.ring=true;save();stonesRedraw(e.target);renderAll();return}
  if(e.target.dataset.ring){b.special=b.special||{};const on=b.special.ring;if(e.target.value)b.special.ring=+e.target.value;else if(on)b.special.ring=true;save();stonesRedraw(e.target);renderAll();return}
  // a costume by its name; one that takes other slots too comes off what was in them, and goes in all of its slots
  if(e.target.dataset.costume){const k=e.target.dataset.costume,v=e.target.value.trim().toLowerCase(),hit=v&&costumesFor(k).find(([n])=>n.toLowerCase()===v);
    if(v&&!hit){renderStones();return}b.special=b.special||{};const cos=b.special.costume=b.special.costume||{},off=id=>Object.keys(cos).forEach(s=>{if(cos[s]===id)delete cos[s]});
    if(cos[k])off(cos[k]);if(hit){const sl=COSTUMES[hit[1]];sl.forEach(s=>{if(cos[s])off(cos[s])});sl.forEach(s=>cos[s]=hit[1])}
    if(!Object.keys(cos).length)delete b.special.costume;save();stonesRedraw(e.target);renderAll();return}
  const k=e.target.dataset.stone;if(!k)return;b.stones=b.stones||{};
  if(e.target.value)b.stones[k]=+e.target.value;else delete b.stones[k];save();stonesRedraw(e.target);renderAll()});
// ---- remembered gear: each item keeps the refine, cards and affixes it had when it last came off (build.mem by item id, the
// MEM_N newest), in any of your gear sets, so swapping a part out and back brings it back as it was. The item lists mark them ----
const MEM_N=100;
const memOf=c=>{const b=buildOf(c);if(!b.mem||typeof b.mem!=="object"||Array.isArray(b.mem))b.mem={};return b.mem};
// keep row g's refine, cards and affixes under its item; a +0 item with no cards or affixes has nothing to keep
function memKeep(c,g){if(!g||!g.id)return;const m=memOf(c),opts=BUILD.optRows(g.opts);delete m[g.id];
  if(num(g.refine)||(g.cards||[]).some(Boolean)||opts.length||g.optsText)m[g.id]=JSON.parse(JSON.stringify({refine:num(g.refine),cards:g.cards||[],opts,...(g.optsText||BUILD.optBad(g.opts).length?{optsText:[g.optsText,...BUILD.optBad(g.opts)].filter(Boolean).join(", ")}:{}),t:Date.now()}));
  Object.entries(m).sort((x,y)=>num(y[1].t)-num(x[1].t)).slice(MEM_N).forEach(([id])=>delete m[id])}
const memAll=(c,gear)=>Object.values(gear||{}).forEach(g=>memKeep(c,g));
// put item id in row g, the one there now remembered first: as it last was if remembered, else +0 with no cards or affixes
function gearPut(c,g,id){if(g.id===id)return;memKeep(c,g);const m=memOf(c)[id]||{};g.id=id;
  g.refine=num(m.refine);g.cards=[...(m.cards||[])];g.opts=JSON.parse(JSON.stringify(m.opts||[]));if(m.optsText)g.optsText=m.optsText;else delete g.optsText}
// "+7 · Vitata Card · 2 affixes"
const memTxt=m=>[num(m.refine)?`+${num(m.refine)}`:"",...(m.cards||[]).filter(Boolean).map(id=>(BUILD.item(id)||{}).name).filter(Boolean),
  ...(m.opts&&m.opts.length?[`${m.opts.length} affix${m.opts.length>1?"es":""}`]:[])].filter(Boolean).join(" · ");
// icons: gear and every other item from the game client, cards a thumbnail of their picture, monsters their sprite (data/icons.js, tools/export_icons.py); a
// cell of a sprite sheet each, the sheet set once as a CSS variable. scale draws it smaller (the gear table's card boxes); cls adds a
// class ("il": inline in a line of text). An item with no image gets an empty cell, so the names still line up
const ICON_AT={};
(typeof ICON_SHEETS!=="undefined"?Object.entries(ICON_SHEETS):[]).forEach(([k,s])=>{ICON_AT[k]={};s.ids.forEach((id,i)=>ICON_AT[k][id]=i);
  document.documentElement.style.setProperty(`--ico-${k}`,`url("${s.file}?v=${s.v}")`)});
function iconHtml(kind,id,scale=1,cls=""){const s=typeof ICON_SHEETS!=="undefined"&&ICON_SHEETS[kind],i=ICON_AT[kind]&&ICON_AT[kind][id];
  const size=s&&scale!==1?`width:${s.w*scale}px;height:${s.h*scale}px;`:"",c=`ico ico-${kind}${cls?" "+cls:""}`;
  if(!s||i==null)return `<span class="${c} none" aria-hidden="true"${size?` style="${size}"`:""}></span>`;
  const rows=Math.ceil(s.ids.length/s.cols),fit=scale!==1?`background-size:${s.cols*s.w*scale}px ${rows*s.h*scale}px;`:"";
  return `<span class="${c}" aria-hidden="true" style="${size}${fit}background-position:-${i%s.cols*s.w*scale}px -${Math.floor(i/s.cols)*s.h*scale}px"></span>`}
// any item by id: a card's picture at half size (as tall as an icon), else its gear or item icon
const itemIcon=(id,scale=1,cls="")=>ICON_AT.card&&ICON_AT.card[id]!=null?iconHtml("card",id,scale/2,cls)
  :iconHtml(ICON_AT.gear&&ICON_AT.gear[id]!=null?"gear":"item",id,scale,cls);
// a monster by id: its sprite at half size (as tall as an icon); scale 2 draws it full size (48 x 48)
const mobIcon=(id,scale=1,cls="")=>iconHtml("mob",id,scale/2,cls);
function renderGearTable(){const c=C(),b=gearSet(c),mem=memOf(c);GEAR_LISTS={};let lists="";
  const rows=BUILD.SLOTS.map(s=>{const g0=b.gear[s.k]||{},items=gearChoices(s.k),cards=cardChoices(s.k,g0.id&&BUILD.item(g0.id));GEAR_LISTS["g_"+s.k]=pickList(items);GEAR_LISTS["c_"+s.k]=pickList(cards);
    lists+=`<datalist id="gl_${s.k}">${[...GEAR_LISTS["g_"+s.k]].map(([n,id])=>`<option value="${esc(n)}"${mem[id]?` label="remembered: ${esc(memTxt(mem[id]))}"`:""}>`).join("")}</datalist><datalist id="cl_${s.k}">${[...GEAR_LISTS["c_"+s.k]].map(([n,id])=>{const p=cardName({id});return `<option value="${esc(n)}"${p?` label="${esc((BUILD.item(id)||{}).affixPos==="suffix"?"… "+p:p+" …")}"`:""}>`}).join("")}</datalist>`;
    const g=b.gear[s.k]||{},it=g.id&&BUILD.item(g.id),label=n=>{const x=BUILD.item(n);return x?labelOf(x,cards):""};
    const cardBoxes=it&&it.slots?Array.from({length:it.slots},(_,i)=>`<span class="cardBox">${iconHtml("card",g.cards&&g.cards[i],.5)}<input data-card="${i}" list="cl_${s.k}" placeholder="card" title="The card (Vitata), or the name it gives the item in game (Healing)" value="${esc(g.cards&&g.cards[i]?label(g.cards[i]):"")}"></span>`).join(""):"";
    const refinable=it&&s.k!=="ammo"; // every part: some accessories and headgear refine though the data has no schedule for them
    return `<tr data-slot="${s.k}"><td>${s.k==="shield"&&state.job==="Assassin"?"Shield / left hand":s.label}</td><td><div class="itemBox">${iconHtml("gear",it&&it.id)}<input class="item" list="gl_${s.k}" placeholder="${items.length?"none":"no items for this job"}" title="The item, or its name from the equipment window (+7 Healing Shining Clip) or with its cards (+7 Shining Clip Vitata): sets the refine and cards too" value="${esc(it?labelOf(it,items):"")}"></div></td>
      <td>${refinable?`<input class="ref" type="number" min="0" max="20" value="${num(g.refine)}">`:""}</td><td><div class="cards">${cardBoxes}</div></td>
      <td>${it?optBoxes(s.k,g,it):""}</td></tr>`}).join("");
  $("gearTable").tBodies[0].innerHTML=rows;$("gearLists").innerHTML=lists;renderStones();
  BUILD.SLOTS.forEach(s=>{const g=b.gear[s.k];if(g)BUILD.optRows(g.opts).forEach((x,i)=>{const el=$("gearTable").querySelector(`tr[data-slot="${s.k}"] [data-opt="${i}"]`);if(el)el.value=x.k})})}
// ---- the equipment window, drawn like the game's Equipped Items: your job's look (data/sprites.js, tools/export_sprites.py; gender and
// hair style per account, state.look) between two columns of slots in the game's order, each with its icon and its name as the game
// shows it. A slot opens its row of the table below. Special Equip holds the costume enchant stones, the Taming Ring and other special
// equipment ----
const EW_L=["headTop","headLow","weapon","garment","acc1"],EW_R=["headMid","armor","shield","shoes","acc2"];
let EW_TAB="normal";
// the sheets of job looks and of hair styles (palette indices, coloured with the clothes or hair colour's palette), drawn into the
// window's canvas once they load. Both are data: URLs (jobData, hairData), since reading their pixels is refused for an image from a
// file opened from disk
const ewImg=k=>typeof JOB_SPRITES!=="undefined"&&typeof Image!=="undefined"&&Object.assign(new Image(),{src:JOB_SPRITES[k+"Data"],onload:()=>drawLook()});
const EW_SHEET=ewImg("job"),EW_HAIR=ewImg("hair"),EW_PX=new Map();
// a loaded sheet's pixels, read once
const ewPx=im=>{if(!EW_PX.has(im)&&im&&im.complete&&im.naturalWidth){const c=document.createElement("canvas"),g=c.getContext("2d",{willReadFrequently:true});
  c.width=im.naturalWidth;c.height=im.naturalHeight;g.drawImage(im,0,0);EW_PX.set(im,g.getImageData(0,0,c.width,c.height))}return EW_PX.get(im)};
// a sprite's palette in one colour (data/sprites.js hairPal, bodyPal, transPal): index -> "rrggbb"
function ewPal(p,color){const hex=(s,k)=>s.slice(k*6,k*6+6),pal={};
  for(let k=0;k<p.i.length/2;k++)pal[parseInt(p.i.substr(k*2,2),16)]=hex(p.b,k);
  for(let k=0;k<p.d.length/2;k++)pal[parseInt(p.d.substr(k*2,2),16)]=hex(p.c[color],k);
  return pal}
const ewColors=(sex,n)=>((((typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES.hairPal)||{})[sex]||{})[n]||{c:[""]}).c.length;
// the clothes colours of the body drawn: the transcendent look's or the job's own (a Novice's for a job with no look)
const ewBodyPal=()=>{const S=JOB_SPRITES,tj=ewTrans(S),t=!!(state.look.trans&&tj),bj=t?tj:S.body[state.job]||S.body.Novice;
  return ((S[t?"transPal":"bodyPal"]||{})[t||S.body[state.job]?state.job:"Novice"]||{})[ewSex(bj)]};
// "+7 Double Healing Shining Clip": refine, then the cards' names before the item name (Double / Triple / Quadruple for repeats) or after it
function gameName(g){const it=g&&g.id&&BUILD.item(g.id);if(!it)return "";const pre=[],post=[],n={};
  (g.cards||[]).filter(Boolean).forEach(id=>{const c=BUILD.item(id)||{id},a=cardName(c);if(!a)return;n[a]=(n[a]||0)+1;
    if(n[a]===1)(c.affixPos==="suffix"||/^of /i.test(a)?post:pre).push(a)});
  const rep=a=>{const x=["","","Double ","Triple ","Quadruple "][n[a]]||"";return /^of /i.test(a)?"of "+x+a.slice(3):x+a};
  return [num(g.refine)?`+${num(g.refine)}`:"",...pre.map(rep),it.name,...post.map(rep)].filter(Boolean).join(" ")}
const ewSlot=(k,label,name,ico,right)=>`<button type="button" class="ewSlot${right?" r":""}${name?"":" empty"}" data-ewslot="${k}" title="${esc(`${label}: ${name||"empty"}`)}">${ico}<span class="ewName">${esc(name)}</span></button>`;
const ewNone=right=>`<div class="ewSlot empty none${right?" r":""}" aria-hidden="true"><span class="ico none"></span></div>`;
// the body at the feet, the head on the body's anchor; Bards are always male and Dancers female
const ewSex=bj=>bj[state.look.sex]?state.look.sex:Object.keys(bj)[0];
const ewHairs=sex=>Object.keys(((typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES.head)||{})[sex]||{}).length;
// Zero has no transcendent jobs, so a 2nd job can wear its transcendent job's look (data/sprites.js trans), switched in game with a
// Costume Change Ticket
const EW_TRANS={Knight:"Lord Knight",Crusader:"Paladin",Wizard:"High Wizard",Sage:"Professor",Hunter:"Sniper",Bard:"Clown",Dancer:"Gypsy",
  Priest:"High Priest",Monk:"Champion",Blacksmith:"Whitesmith",Alchemist:"Creator",Assassin:"Assassin Cross",Rogue:"Stalker"};
const ewTrans=S=>EW_TRANS[state.job]&&S.trans&&S.trans[state.job];
function lookHtml(){const S=typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES;if(!S)return "";const tj=ewTrans(S),bj=(state.look.trans&&tj)||S.body[state.job]||S.body.Novice,sex=ewSex(bj),b=bj[sex],hs=S.head[sex]||{},h=hs[state.look.hair]||hs[1];
  // body and head go into one canvas at the sprites' own size, which the page then scales: as separate boxes each rounded to the
  // screen's pixels on its own, so at some zooms the head sat a pixel off the body
  const parts=[[...b.slice(0,4),b[4],b[5]],...h?[[...h.slice(0,4),b[6]+h[4],b[7]+h[5]]]:[]];
  const L=Math.min(...parts.map(p=>p[4])),T=Math.min(...parts.map(p=>p[5])),R=Math.max(...parts.map(p=>p[4]+p[2])),B=Math.max(...parts.map(p=>p[5]+p[3]));
  const one=Object.keys(bj).length<2,hair=hs[state.look.hair]?state.look.hair:1,nc=ewColors(sex,hair),color=state.look.color<nc?state.look.color:0;
  const pal=S.hairPal&&S.hairPal[sex]&&S.hairPal[sex][hair],swatch=pal?pal.c[color].substr(pal.k*6,6):"";
  // clothes colour 0 is undyed, 1 and up the client's dyes for this body
  const bp=ewBodyPal(),nd=bp?bp.c.length:0,dye=state.look.dye<nd?state.look.dye:0,dyeSwatch=bp?bp.c[dye].substr(bp.k*6,6):"";
  const at=(p,l,t)=>[...p.slice(0,4),l-L,t-T].join(",");
  // Ragnarok Zero has no zeny stylist (iRO's): a new style or color after character creation takes a paid KP shop item (New Style
  // Coupon, 7622), and clothes color a Clothing Dye Coupon or Clothing Dye Coupon II (6046, 6047), the transcendent look's too
  const hairTip="changing it after character creation takes a paid KP shop item, such as a New Style Coupon";
  const dyeTip="a Clothing Dye Coupon or Clothing Dye Coupon II (KP shop) changes it, on the transcendent look too. The dye stays through a job change, but can look different on the new job";
  return `<div class="ewStage"><div class="ewFeet"><canvas class="ewPic" width="${R-L}" height="${B-T}" style="left:${L}px;top:${T}px" data-body="${at(b,b[4],b[5])}" data-dye="${dye}"${h?` data-head="${at(h,b[6]+h[4],b[7]+h[5])}" data-hair="${sex},${hair},${color}"`:""}></canvas></div></div>
    <div class="ewLook"><button type="button" class="small" data-ewsex="" ${one?`disabled title="${esc(state.job)}s are ${sex==="f"?"female":"male"} only"`:`title="Gender: ${sex==="f"?"female":"male"}"`} aria-label="Gender">${sex==="f"?"♀":"♂"}</button>
      <button type="button" class="small" data-ewhair="-1" aria-label="Previous hair style" title="Hair style: ${hairTip}">◀</button><span title="Hair style: ${hairTip}"><span class="ewHairW">Hair </span>${hair}</span><button type="button" class="small" data-ewhair="1" aria-label="Next hair style" title="Hair style: ${hairTip}">▶</button></div>
      ${nc>1?`<div class="ewLook"><button type="button" class="small" data-ewcolor="-1" aria-label="Previous hair color" title="Hair color: ${hairTip}">◀</button><span title="Hair color ${color} of 0–${nc-1}: ${hairTip}"><span class="ewSwatch" style="background:#${swatch}"></span><span class="ewHairW">Color </span>${color}</span><button type="button" class="small" data-ewcolor="1" aria-label="Next hair color" title="Hair color: ${hairTip}">▶</button></div>`:""}
      ${nd>1?`<div class="ewLook"><button type="button" class="small" data-ewdye="-1" aria-label="Previous clothes color" title="Clothes color: ${dyeTip}">◀</button><span title="Clothes color ${dye} of 0–${nd-1} (0 undyed): ${dyeTip}"><span class="ewSwatch" style="background:#${dyeSwatch}"></span><span class="ewHairW">Dye </span>${dye}</span><button type="button" class="small" data-ewdye="1" aria-label="Next clothes color" title="Clothes color: ${dyeTip}">▶</button></div>`:""}
      ${tj?`<div class="ewLook"><button type="button" class="small ewTrans" data-ewtrans="" aria-pressed="${!!state.look.trans}" title="${esc(`${EW_TRANS[state.job]} look: Ragnarok Zero has no transcendent jobs, so a ${state.job} can look like a ${EW_TRANS[state.job]}. A Costume Change Ticket switches the look in game`)}">Trans</button></div>`:""}`}
function renderEquipWin(){const el=$("equipWin"),c=C(),b=gearSet(c),i=altIdx(c),sp=EW_TAB==="special";
  const gearSlot=(k,right)=>{const g=b.gear[k],it=g&&g.id&&BUILD.item(g.id),s=BUILD.SLOTS.find(x=>x.k===k);
    return ewSlot(k,k==="shield"&&state.job==="Assassin"?"Shield / left hand":s.label,it?gameName(g):"",iconHtml("gear",it&&it.id),right)};
  // a costume slot: the costume with its stone, "[Costume] Chicken beak [STR Stone]" (or the stone alone, when no costume is picked)
  const stone=(k,right)=>{const id=(b.stones||{})[k],x=id&&(typeof STONES!=="undefined"?STONES:[]).find(s=>s.id===+id&&s.slot===k),
      c=((b.special||{}).costume||{})[k],cn=costumeName(c),sn=x?x.name.replace(/ \((Upper|Middle|Lower|Garment)\)$/,""):"";
    return ewSlot(k,`Costume ${k}`,cn?(sn?`${cn} [${sn}]`:cn):sn,itemIcon(cn?c:x&&x.id),right)};
  // costumes, stones and the Taming Ring (item 24966) are in the item icon sheet, not the gear one
  const ring=()=>{const id=(b.special||{}).ring,x=id&&(typeof TAMING_EGGS!=="undefined"?TAMING_EGGS:[]).find(e=>e.id===+id);
    return ewSlot("ring","Taming Ring",x?`Taming Ring [${x.name}]`:id?"Taming Ring":"",itemIcon(id&&24966),false)};
  // the shadow shield in the shield's place, as in game; other special equipment you wear in the right column's free slots
  const shield=()=>{const it=BUILD.item((b.special||{}).shield);return ewSlot("shield","Shield",it?it.name:"",iconHtml("gear",it&&it.id),true)};
  const own=((b.special||{}).own||[]).map((x,j)=>({x,j})).filter(o=>o.x.on!==false&&(o.x.name||"").trim()).slice(0,3),ownSlot=n=>own[n]?ewSlot("own"+own[n].j,"Special equipment",own[n].x.name.trim(),iconHtml("gear",null),true):ewNone(true);
  const L=sp?[stone("upper"),stone("lower"),ewNone(),stone("garment"),ring()]:EW_L.map(k=>gearSlot(k,false));
  const R=sp?[stone("middle",true),ownSlot(0),shield(),ownSlot(1),ownSlot(2)]:EW_R.map(k=>gearSlot(k,true));
  // arrows only for jobs that can hold a bow, or when some are set
  const ammo=!sp&&(b.gear.ammo&&b.gear.ammo.id||gearChoices("weapon").some(it=>BUILD.WTYPE[it.type]==="Bow"))?`<div class="ewAmmo">${gearSlot("ammo",false)}</div>`:"";
  const html=`<div class="ewHead"><span>Equipped Items</span>${i>=0?`<span class="ewSet">Set ${i+1}</span>`:""}</div>
    <div class="ewTabs" role="tablist">${[["normal","Normal Equip"],["special","Special Equip"]].map(([k,t])=>`<button type="button" role="tab" data-ewtab="${k}" aria-selected="${EW_TAB===k}">${t}</button>`).join("")}</div>
    <div class="ewBody"><div class="ewCol">${L.join("")}</div><div class="ewChar">${lookHtml()}</div><div class="ewCol">${R.join("")}</div>${ammo}</div>`;
  // the button you pressed keeps focus through the redraw
  const a=document.activeElement,f=a&&el.contains(a)?["ewtab","ewsex","ewhair","ewcolor","ewdye","ewtrans","ewslot"].map(k=>a.dataset[k]!=null?`[data-${k}="${a.dataset[k]}"]`:null).find(Boolean):null;
  if(renderEquipWin.html===html)return;renderEquipWin.html=html;el.innerHTML=html;drawLook();if(f)el.querySelector(f)?.focus()}
// the body [x,y,w,h on the sheet, x,y in the canvas] from the job sheet, each index coloured with the clothes colour's palette, then
// the head the same from the hair sheet with the hair colour's; once both sheets have loaded
function drawLook(){const c=$("equipWin").querySelector("canvas.ewPic"),bp=ewPx(EW_SHEET),hp=ewPx(EW_HAIR),body=ewBodyPal();if(!c||!bp||!hp||!body)return;
  const g=c.getContext("2d");g.clearRect(0,0,c.width,c.height);
  // through a canvas of its own: putImageData would replace the body under the head instead of drawing over it
  const paint=(px,at,pal)=>{const [x,y,w,h,l,t]=at.split(",").map(Number),img=g.createImageData(w,h);
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const s=((y+yy)*px.width+x+xx)*4,o=(yy*w+xx)*4,rgb=px.data[s+3]&&pal[px.data[s]];
      if(rgb){img.data[o]=parseInt(rgb.slice(0,2),16);img.data[o+1]=parseInt(rgb.slice(2,4),16);img.data[o+2]=parseInt(rgb.slice(4),16);img.data[o+3]=255}}
    const pc=document.createElement("canvas");pc.width=w;pc.height=h;pc.getContext("2d").putImageData(img,0,0);g.drawImage(pc,l,t)};
  paint(bp,c.dataset.body,ewPal(body,+c.dataset.dye));if(!c.dataset.head)return;
  const [sex,n,color]=c.dataset.hair.split(",");paint(hp,c.dataset.head,ewPal(JOB_SPRITES.hairPal[sex][n],+color))}
$("equipWin").addEventListener("click",e=>{const t=e.target.closest("button");if(!t||t.disabled)return;const L=state.look;
  if(t.dataset.ewtab){EW_TAB=t.dataset.ewtab;renderEquipWin();return}
  if(t.dataset.ewtrans!=null){L.trans=!L.trans;save();renderEquipWin();return}
  if(t.dataset.ewsex!=null){L.sex=L.sex==="f"?"m":"f";if(L.hair>ewHairs(L.sex))L.hair=1;save();renderEquipWin();return}
  if(t.dataset.ewhair){const S=JOB_SPRITES.body[state.job]||JOB_SPRITES.body.Novice,n=ewHairs(ewSex(S));if(n)L.hair=(L.hair-1+ +t.dataset.ewhair+n)%n+1;save();renderEquipWin();return}
  if(t.dataset.ewcolor){const S=JOB_SPRITES.body[state.job]||JOB_SPRITES.body.Novice,n=ewColors(ewSex(S),L.hair);if(n)L.color=((L.color<n?L.color:0)+ +t.dataset.ewcolor+n)%n;save();renderEquipWin();return}
  if(t.dataset.ewdye){const p=ewBodyPal(),n=p?p.c.length:0;if(n)L.dye=((L.dye<n?L.dye:0)+ +t.dataset.ewdye+n)%n;save();renderEquipWin();return}
  const k=t.dataset.ewslot;if(!k)return;
  const to=EW_TAB==="special"?(k==="ring"?$("stoneRow").querySelector("[data-ringon]"):k==="shield"?$("stoneRow").querySelector("[data-shadow]"):k.startsWith("own")?$("specialOwn").querySelector(`[data-i="${k.slice(3)}"] [data-f=name]`):$("stoneRow").querySelector(`[data-costume="${k}"]`))
    :$("gearTable").querySelector(`tr[data-slot="${k}"] input.item`);
  if(to){const d=to.closest("details");if(d)d.open=true;to.scrollIntoView({block:"center",behavior:"smooth"});to.focus({preventScroll:true})}});
// the Equipment and Special equipment tables fold away, remembered like a card (state.collapsed)
[["gearFold","Build from gear: equipment table"],["specialFold","Build from gear: special equipment table"]].forEach(([id,key])=>{const d=$(id);d.open=!(state.collapsed||{})[key];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[key])return;if(d.open)delete c[key];else c[key]=true;save()})});
function renderBuild(){const c=C(),on=c.mode==="build";
  if(on&&renderBuild.job!==state.job){renderBuild.job=state.job;renderGearTable()}if(!on)renderBuild.job=null;
  ROOTQ("[data-cmode]").forEach(x=>x.setAttribute("aria-checked",String(x.dataset.cmode===(on?"build":"status"))));
  $("buildPanel").hidden=!on;$("statNote").hidden=on;$("shieldRow").hidden=on;$("onTopWrap").hidden=on;$("addOnTop").checked=c.addOnTop!==false;BUILT_IDS.forEach(id=>{const el=$(id);el.disabled=on;if(on&&document.activeElement!==el)el.value=id.startsWith("st_")?(c.st||{})[id.slice(3)]??"":c[id]??""});
  $("modeNote").textContent=on?"Stats below are worked out from your base stats, job level and gear.":"Type the numbers from your in-game status window.";
  if(!on)return;renderAltBar(c);renderLoadouts(c);renderEquipWin();const b=buildOf(c);renderStatWin(c);
  const r=BUILD_LAST;if(!r)return;const jb=r.jobBonus;
  $("jobBonusNote").textContent=`Job Lv ${r.fields.jobLv} bonus: `+BUILD.STAT6.map(k=>`${k.toUpperCase()} +${jb[k]}`).join(" · ")+(BUILD.curve(state.job,"hp",num(c.baseLv))==null?" · no HP/SP table for this job, type Max HP/SP after switching back":"");
  // check against the game: type the in-game totals, see the difference per stat
  const ck=b.check||{},rows=CHECKS.map(([k,label,get])=>{const mine=get(r.fields),g=ck[k];const d=g!=null&&g!==""&&mine!=null?num(g)-mine:null;
    return `<label>${label}<span class="bar"><input data-ck="${k}" type="number" value="${esc(g??"")}" placeholder="${mine??"–"}" class="fill">${d==null?"":`<span class="${Math.abs(d)<0.5?"good":"bad"}">${d===0?"✓":(d>0?"+":"")+fmtP(+d.toFixed(1))}</span>`}</span></label>`}).join("");
  if(!$("checkGrid").contains(document.activeElement))$("checkGrid").innerHTML=rows;
  // cards the Character tab's Cards rows model: they count once ticked there
  // the other gear set's own notes while the table shows it
  const un=editAlt(c)?(x=>x?withSnap(x,()=>BUILD_LAST.unmodelled):[])(altChar(c,altIdx(c))):r.unmodelled;
  const inRow=x=>CARD_ROW.some(n=>x.startsWith(n+":")),tick=un.filter(inRow),rest=un.filter(x=>!inRow(x));
  $("buildNote").innerHTML=(rest.length?`<b>Not counted</b> (procs, conditional or unsupported lines):<br>${rest.map(esc).join("<br>")}`:"")+
    (tick.length?`${rest.length?"<br>":""}<b>Tick in the Cards rows</b> (Character tab, under the attack) to count: ${tick.map(x=>esc(x.split(":")[0])).join(", ")}`:"")}
const CARD_ROW=["Hunter Fly Card","Sidewinder Card","Creamy Card","Dracula Card","Dark Priest Card",...Object.values(KILL_SP).map(n=>n+" Card")];
// switching to build keeps a copy of the typed status-window values, and switching back restores them
const SNAP_KEYS=["shield","atkPct","atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","lw","lwAtk","lwElem","crit","critDmg","rangePct","skillPct","vctPct","fctPct","acdPct","ignDef","ignMdef","weapon","wElem","st"];
ROOTQ("[data-cmode]").forEach(x=>x.addEventListener("click",()=>{const c=C(),to=x.dataset.cmode,from=c.mode==="build"?"build":"status";if(to===from)return;
  if(to==="build")c.statusSnap=JSON.parse(JSON.stringify(Object.fromEntries(SNAP_KEYS.map(k=>[k,c[k]??null]))));
  else if(c.statusSnap){SNAP_KEYS.forEach(k=>{const v=c.statusSnap[k];if(v==null)delete c[k];else c[k]=v});delete c.statusSnap}
  c.mode=to;save();if(to==="build")renderGearTable();renderAll();syncChar()}));
// the status window, drawn like the game's: each base stat with − / +, what job and gear add to it, and what the next point costs;
// the status points left at this Base Lv under it, and the numbers the window shows beside the stats
const STAT_NAME=k=>k[0].toUpperCase()+k.slice(1);
function renderStatWin(c){const el=$("statWin"),b=buildOf(c),r=BUILD_LAST,lv=num(c.baseLv)||1,f=r&&r.fields;
  if(!el.firstChild)el.innerHTML=`<div class="ewHead">Status</div><div class="swBody"><div class="swStats">${BUILD.STAT6.map(k=>`<span class="swK">${STAT_NAME(k)}</span>
    <span class="swIn"><button type="button" data-bsd="${k}" data-d="-1" aria-label="Lower base ${k.toUpperCase()}" title="Shift: 10">−</button><input data-bs="${k}" type="number" min="1" max="99" aria-label="Base ${k.toUpperCase()}"><button type="button" data-bsd="${k}" data-d="1" aria-label="Raise base ${k.toUpperCase()}" title="Shift: 10">+</button></span>
    <span class="swAdd" data-bsadd="${k}"></span><span class="swCost" data-bscost="${k}"></span>`).join("")}</div><dl class="swDer"></dl></div><div class="swFoot"></div>`;
  let spent=0;BUILD.STAT6.forEach(k=>{const v=Math.max(1,num(b.base[k])||1),x=el.querySelector(`[data-bs="${k}"]`);spent+=BUILD.statSpent(v);
    if(document.activeElement!==x)x.value=b.base[k]??"";
    const jb=r?r.jobBonus[k]:0,add=r?r.total[k]-Math.max(1,num(b.base[k])||1):0,a=el.querySelector(`[data-bsadd="${k}"]`);
    a.textContent=r?`+ ${add}`:"";a.title=r?`Job Lv ${f.jobLv} +${jb} · gear and the rest +${add-jb}`:"";
    const cost=el.querySelector(`[data-bscost="${k}"]`);cost.textContent=v<99?BUILD.raiseCost(v):"–";cost.title=v<99?`${BUILD.raiseCost(v)} status points to raise ${k.toUpperCase()} to ${v+1}`:"";
    el.querySelectorAll(`[data-bsd="${k}"]`).forEach(x=>x.disabled=+x.dataset.d<0?v<=1:v>=99)});
  // the window's pairs: soft + hard, FLEE + Perfect Dodge, as the Character tab reads them
  const two=t=>t==null?"–":String(t).replace("+"," + "),S=r&&r.status;
  const der=[["Atk",f&&two(f.atkTxt)],["Def",f&&two(f.defTxt)],["Matk",f&&two(f.matkTxt)],["Mdef",S&&`${S.softMdef} + ${r.hardMdef}`],
    ["Hit",f&&String(f.hitTxt).split("+").reduce((a,x)=>a+num(x),0)],["Flee",f&&two(f.fleeTxt)],["Critical",f&&f.crit],["Aspd",f&&(f.aspd??"–")]];
  el.querySelector(".swDer").innerHTML=der.map(([k,v])=>`<dt>${k}</dt><dd>${v??"–"}</dd>`).join("");
  const tot=BUILD.statPoints(lv),left=tot-spent;
  el.querySelector(".swFoot").innerHTML=`<span>Status Point</span><b class="${left<0?"bad":""}">${left}</b><span class="note">${left<0?`${-left} over`:"left"} of ${tot} at Base Lv ${lv}</span>`}
const setBase=(k,v)=>{buildOf(C()).base[k]=Math.min(99,Math.max(1,v));save();renderAll()};
$("statWin").addEventListener("input",e=>{const x=e.target.closest("[data-bs]");if(x)setBase(x.dataset.bs,num(x.value)||1)});
$("statWin").addEventListener("click",e=>{const x=e.target.closest("[data-bsd]");if(!x)return;const k=x.dataset.bsd;
  setBase(k,(num(buildOf(C()).base[k])||1)+ +x.dataset.d*(e.shiftKey?10:1))});
const gearRead=(c,g,r)=>{gearPut(c,g,r.id);if(r.refine!=null)g.refine=r.refine;if(r.cards.length)g.cards=[...r.cards]};
// a name that fits more than one reading (two copies of an item, two cards with one name) fills the first; the others are buttons
// under the table until the next name is typed
let GEAR_ALTS=null;
const readTxt=r=>{const it=BUILD.item(r.id),n=new Map();r.cards.forEach(id=>n.set(id,(n.get(id)||0)+1));
  return `${it.name}${it.slots?` [${it.slots}]`:""} #${it.id}${n.size?": "+[...n].map(([id,x])=>`${(BUILD.item(id)||{}).name}${x>1?` ×${x}`:""}`).join(", "):""}`};
function gearAlts(k,txt,r){GEAR_ALTS=r&&r.alts?{k,list:[r,...r.alts]}:null;const el=$("gearAlts");el.hidden=!GEAR_ALTS;
  el.innerHTML=GEAR_ALTS?`“${esc(txt)}” fits more than one reading. Filled in: ${esc(readTxt(r))}. Or use: ${r.alts.map((a,i)=>`<button type="button" class="small" data-gearalt="${i+1}">${esc(readTxt(a))}</button>`).join(" ")}`:""}
$("gearAlts").addEventListener("click",e=>{const x=e.target.closest("[data-gearalt]");if(!x||!GEAR_ALTS)return;const c=C(),b=gearSet(c),k=GEAR_ALTS.k;
  gearRead(c,b.gear[k]||(b.gear[k]={}),GEAR_ALTS.list[+x.dataset.gearalt]);gearAlts(k,"",null);save();renderGearTable();renderAll()});
$("gearTable").addEventListener("change",e=>{const tr=e.target.closest("tr[data-slot]");if(!tr)return;const k=tr.dataset.slot,c=C(),b=gearSet(c),g=b.gear[k]||(b.gear[k]={});
  if(e.target.classList.contains("item")){const v=e.target.value.trim();const id=GEAR_LISTS["g_"+k].get(v);
    // not on the list: read it as the equipment window names it, refine and cards included (they win over what the item last had)
    const r=id==null&&v?readGear(k,v):null;
    if(!v){memKeep(c,g);delete b.gear[k]}else if(id!=null)gearPut(c,g,id);
    else if(r)gearRead(c,g,r);else{e.target.value=g.id?e.target.defaultValue:"";return}
    gearAlts(k,v,r);save();renderGearTable();renderAll();return}
  // picking an option keeps its value; "remove" drops it. The rows replace any text typed before the lists
  if(e.target.dataset.opt!=null){const rows=BUILD.optRows(g.opts),i=+e.target.dataset.opt,v=e.target.value;
    if(!v)rows.splice(i,1);else rows[i]={k:v,v:rows[i]?rows[i].v:""};optSet(g,rows);save();renderGearTable();renderAll();
    if(v)$("gearTable").querySelector(`tr[data-slot="${k}"] [data-optv="${i}"]`)?.focus();return}
  if(e.target.dataset.card!=null){const v=e.target.value.trim(),id=GEAR_LISTS["c_"+k].get(v),i=+e.target.dataset.card;g.cards=g.cards||[];
    if(!v)g.cards[i]=null;else if(id!=null)g.cards[i]=id;
    // the box's picture follows the card without redrawing the table, so the box you tab to keeps focus
    const ico=e.target.parentElement.querySelector(".ico");if(ico&&(!v||id!=null))ico.outerHTML=iconHtml("card",g.cards[i],.5);
    else{// card names as the game shows them ("Double Healing", or the whole item name): fill this box and the ones after it
      const it=BUILD.item(g.id),ids=BUILD.readCardNames(v,cardChoices(k,it),cardName)||(readGear(k,v,[it])||{}).cards;
      if(!ids||!ids.length){e.target.value="";return}ids.slice(0,Math.max(0,(it.slots||0)-i)).forEach((c,j)=>g.cards[i+j]=c);save();renderGearTable();renderAll();return}
    save();renderAll()}});
$("checkGrid").addEventListener("input",e=>{const k=e.target.dataset.ck;if(!k)return;const b=buildOf(C());b.check=b.check||{};
  if(e.target.value==="")delete b.check[k];else b.check[k]=num(e.target.value);save();renderAll();
  // refresh just the difference marks while typing, so the box keeps focus
  CHECKS.forEach(([kk,,get])=>{const inp=$("checkGrid").querySelector(`[data-ck="${kk}"]`),mark=inp.nextElementSibling,g=b.check[kk],mine=BUILD_LAST?get(BUILD_LAST.fields):null;
    const d=g!=null&&mine!=null?g-mine:null;if(mark)mark.remove();if(d!=null)inp.insertAdjacentHTML("afterend",`<span class="${Math.abs(d)<0.5?"good":"bad"}">${d===0?"✓":(d>0?"+":"")+fmtP(+d.toFixed(1))}</span>`)})});
// "remove" on the typed option lines kept from before the lists
$("gearTable").addEventListener("click",e=>{if(!e.target.closest("[data-optsdrop]"))return;e.preventDefault();const g=gearSet().gear[e.target.closest("tr").dataset.slot];if(!g)return;
  optDrop(g);save();renderGearTable();renderAll()});
$("gearTable").addEventListener("input",e=>{if(e.target.dataset.optv!=null){const g=gearSet().gear[e.target.closest("tr").dataset.slot];if(!g)return;
    const rows=BUILD.optRows(g.opts),x=rows[+e.target.dataset.optv];if(x){x.v=e.target.value===""?"":num(e.target.value);optSet(g,rows);save();renderAll()}return}
  if(!e.target.classList.contains("ref"))return;const k=e.target.closest("tr").dataset.slot;const g=gearSet().gear[k];if(!g)return;
  g.refine=Math.max(0,Math.min(20,num(e.target.value)));save();renderAll()});
// ---- other gear sets: + Add set adds one and Remove set takes it away; the gear table edits set i after "Set i" is picked. Your gear
// stays what the page works with, and Your gear vs other gear sets (Character tab, ref.js) works them all out side by side. "Swap" makes a set your gear (and yours
// that set), so you can switch back ----
const altSaved=(c,i)=>c.mode==="build"&&!!(c.build&&Array.isArray(c.build.alts)&&c.build.alts[i])&&setSaved(c.build.alts[i]);
// the sets with gear in them, by number
const altList=(c=C())=>Array.from({length:altN(c)},(_,i)=>i).filter(i=>altSaved(c,i));
// your character with set i on instead of your gear (base stats, skills and buffs stay); the in-game Max HP / SP typed
// under "Check against the game" are for your gear, so they don't count for it
const altChar=(c,i)=>{if(!altSaved(c,i))return null;const x=JSON.parse(JSON.stringify(c)),a=x.build.alts[i];
  x.build={...x.build,gear:a.gear||{},stones:a.stones||{},special:a.special||{},check:{}};delete x.build.alts;delete x.build.loadouts;delete x.build.mem;delete x.gearEdit;return x};
const SET_KEYS=["gear","stones","special"];
const setCopy=b=>JSON.parse(JSON.stringify(Object.fromEntries(SET_KEYS.map(k=>[k,b[k]||{}]))));
const gearTxt=g=>{const it=g&&g.id&&BUILD.item(g.id);if(!it)return "none";const n=(g.cards||[]).filter(Boolean).map(id=>(BUILD.item(id)||{}).name).filter(Boolean);
  return `${num(g.refine)?`+${num(g.refine)} `:""}${it.name}${n.length?` [${n.join(", ")}]`:""}`};
// what set i changes: "Weapon: Pike → +7 Zweihander" per gear row (affixes count as a change too), then the special equipment
function altDiff(c,i){const b=buildOf(c),a=altOf(c,i),g0=b.gear||{},g1=a.gear||{},same=(x,y)=>JSON.stringify(x||null)===JSON.stringify(y||null);
  const rows=BUILD.SLOTS.filter(s=>!same(g0[s.k],g1[s.k])).map(s=>`${esc(s.label)}: ${esc(gearTxt(g0[s.k]))} → <b>${esc(gearTxt(g1[s.k]))}</b>${gearTxt(g0[s.k])===gearTxt(g1[s.k])?" (affixes)":""}`);
  // an empty list of other special equipment is the same as none (a set the table never showed has none)
  const sp=x=>{const o={...(x||{})};if(Array.isArray(o.own)&&!o.own.length)delete o.own;return o};
  if(!same(b.stones||{},a.stones||{})||!same(sp(b.special),sp(a.special)))rows.push("Special equipment");return rows}
const altDiffTxt=(c,i)=>{const d=altDiff(c,i);return d.length?d.join(" · "):"same as your gear"};
function renderAltBar(c=C()){const i=altIdx(c),has=i>=0&&altSaved(c,i),list=altList(c),n=altN(c);
  $("gsetSeg").innerHTML=`<button type="button" role="radio" data-gset="mine" aria-checked="${i<0}">My gear</button>`+Array.from({length:n},(_,k)=>
    `<button type="button" role="radio" data-gset="${k}" aria-checked="${k===i}" title="Another set of gear, worked out next to yours in Your gear vs other gear sets (bottom of this tab)">Set ${k+1}${altSaved(c,k)?" ●":""}</button>`).join("");
  $("altAdd").disabled=n>=ALT_MAX;$("altAdd").title=n>=ALT_MAX?`Up to ${ALT_MAX} other sets`:"Add another set of gear to compare with yours";
  $("buildPanel").classList.toggle("altedit",i>=0);["altCopy","altSwap","altDel"].forEach(id=>$(id).hidden=i<0);$("altSwap").disabled=!has;
  $("altNote").innerHTML=i>=0?`<b>Editing set ${i+1}.</b> The page still works with your gear. `+(has?`${altDiffTxt(c,i)} · compare in Your gear vs other gear sets, at the bottom of this tab`:"Pick its gear below, or copy yours in and change a part.")
    :list.length?list.map(k=>`Set ${k+1}: ${altDiffTxt(c,k)}`).join("<br>")+"<br>Compare them in Your gear vs other gear sets, at the bottom of this tab":`Press + Add set for another set of gear, worked out next to yours in Your gear vs other gear sets, at the bottom of this tab.`}
$("gsetSeg").addEventListener("click",e=>{const x=e.target.closest("[data-gset]");if(!x)return;const c=C();if(x.dataset.gset==="mine")delete c.gearEdit;else c.gearEdit="alt"+x.dataset.gset;save();renderGearTable();renderAll()});
// add an empty set (its index, or −1 at ALT_MAX); remove set i, the ones after it moving up, its items remembered
function altAdd(c){const b=buildOf(c);if(!Array.isArray(b.alts))b.alts=[];if(b.alts.length>=ALT_MAX)return -1;b.alts.push({gear:{}});return b.alts.length-1}
function altDel(c,i){const b=buildOf(c);if(!Array.isArray(b.alts)||!b.alts[i])return;memAll(c,altOf(c,i).gear);b.alts.splice(i,1);delete c.gearEdit}
$("altAdd").addEventListener("click",()=>{const c=C(),i=altAdd(c);if(i<0)return;c.gearEdit="alt"+i;save();renderGearTable();renderAll()});
$("altCopy").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0)return;if(altSaved(c,i)&&altDiff(c,i).length&&!confirm(`Replace set ${i+1} with a copy of your gear?`))return;
  memAll(c,altOf(c,i).gear);buildOf(c).alts[i]=setCopy(buildOf(c));save();renderGearTable();renderAll()});
const altSwap=(c,i)=>{const b=buildOf(c),mine=setCopy(b),other=setCopy(altOf(c,i));Object.assign(b,other);b.alts[i]=mine};
$("altSwap").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0)return;altSwap(c,i);save();renderGearTable();renderAll()});
$("altDel").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0||altSaved(c,i)&&!confirm(`Remove set ${i+1}?${i+1<altN(c)?" The sets after it move up one.":""}`))return;altDel(c,i);save();renderGearTable();renderAll()});
// ---- saved loadouts: whole gear setups under a name (build.loadouts: {name, gear, stones, special}), to swap the table shown (your
// gear, or the set being edited) between them. Loading one remembers the items it takes off ----
const loadoutsOf=c=>{const b=buildOf(c);if(!Array.isArray(b.loadouts)||b.loadouts.some(x=>!x||typeof x!=="object"))b.loadouts=(Array.isArray(b.loadouts)?b.loadouts:[]).filter(x=>x&&typeof x==="object");return b.loadouts};
// a set's gear in a fixed form, for "is this the same gear": keys sorted, empty rows and trailing empty card boxes dropped
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const setKey=b=>{const x=setCopy(b);x.gear=Object.fromEntries(Object.entries(x.gear).filter(([,g])=>g&&g.id).map(([k,g])=>[k,{...g,cards:(g.cards||[]).map(id=>id||null).filter((id,i,a)=>a.slice(i).some(Boolean)),refine:num(g.refine)}]));return JSON.stringify(canon(x))};
// the loadout the table shows now, or −1
const loadoutAt=(c=C())=>{const k=setKey(gearSet(c));return loadoutsOf(c).findIndex(x=>setKey(x)===k)};
// save the table shown as loadout name (one with that name, in any case, is replaced); its index
function loadoutSave(c,name){const L=loadoutsOf(c),nm=String(name).trim(),i=L.findIndex(x=>String(x.name||"").toLowerCase()===nm.toLowerCase()),x={name:nm,...setCopy(gearSet(c))};
  if(i>=0){L[i]=x;return i}L.push(x);return L.length-1}
function loadoutLoad(c,i){const lo=loadoutsOf(c)[i];if(!lo)return;const s=gearSet(c);memAll(c,s.gear);Object.assign(s,setCopy(lo))}
const loadoutName=x=>String(x&&x.name||"").trim()||"(no name)";
function renderLoadouts(c=C()){const L=loadoutsOf(c),at=loadoutAt(c),pick=$("loadoutPick"),i=altIdx(c),memN=Object.keys(memOf(c)).length;
  if(document.activeElement!==pick){const was=pick.value;
    pick.innerHTML=L.length?L.map((x,j)=>`<option value="${j}">${esc(loadoutName(x))}${j===at?" (in the table)":""}</option>`).join(""):`<option value="">No saved loadouts</option>`;
    pick.value=L[+was]&&was!==""?was:String(at>=0?at:L.length?0:"")}
  $("loadoutLoad").textContent=i>=0?`Load into set ${i+1}`:"Wear it";["loadoutLoad","loadoutDel"].forEach(id=>$(id).disabled=!L.length);
  $("memClear").hidden=!memN;$("memClear").textContent=`Forget remembered items (${memN})`;
  $("loadoutNote").innerHTML=(at>=0?`The table is loadout <b>${esc(loadoutName(L[at]))}</b>. `:"")+
    `Gear you take off keeps its refine, cards and affixes: put it on again and they come back${memN?" (marked “remembered” in the item lists)":""}.`}
$("loadoutSave").addEventListener("click",()=>{const c=C(),L=loadoutsOf(c),at=loadoutAt(c),cur=L[+$("loadoutPick").value];
  const nm=prompt("Name this loadout",at>=0?loadoutName(L[at]):cur?loadoutName(cur):`Loadout ${L.length+1}`);if(nm==null||!nm.trim())return;
  const same=L.find(x=>String(x.name||"").toLowerCase()===nm.trim().toLowerCase());if(same&&setKey(same)!==setKey(gearSet(c))&&!confirm(`Replace loadout “${loadoutName(same)}” with the gear in the table?`))return;
  const j=loadoutSave(c,nm);save();renderAll();$("loadoutPick").value=String(j)});
$("loadoutLoad").addEventListener("click",()=>{const c=C(),j=+$("loadoutPick").value,lo=loadoutsOf(c)[j];if(!lo)return;
  // the table's gear goes unless a loadout has it (its items stay remembered either way)
  const s=gearSet(c),has=Object.values(s.gear||{}).some(g=>g&&g.id);
  if(has&&loadoutAt(c)<0&&setKey(s)!==setKey(lo)&&!confirm(`The gear in the table isn't saved as a loadout. Put “${loadoutName(lo)}” on anyway?`))return;
  loadoutLoad(c,j);save();renderGearTable();renderAll()});
$("loadoutDel").addEventListener("click",()=>{const c=C(),L=loadoutsOf(c),j=+$("loadoutPick").value;if(!L[j]||!confirm(`Delete loadout “${loadoutName(L[j])}”?`))return;L.splice(j,1);save();renderAll()});
$("memClear").addEventListener("click",()=>{const c=C();if(!confirm("Forget the refine, cards and affixes remembered for the gear you took off?"))return;buildOf(c).mem={};save();renderGearTable();renderAll()});
