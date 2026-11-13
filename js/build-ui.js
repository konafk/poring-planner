// ---- build simulator: in "build" mode the stat fields are computed from base stats + gear (build.js) and shown read-only ----
// "Check against the game": [key, label, computed total]
// compared with what the build computes (BUILD_LAST), not with c, since typed Max HP / SP replace the computed ones
const CHECKS=[["atk","ATK",F=>sumStat(F.atkTxt)],["matk","MATK",F=>sumStat(F.matkTxt)],["hit","HIT",F=>sumStat(F.hitTxt)],["flee","FLEE",F=>parseFloat(String(F.fleeTxt).split("+")[0])||0],
  ["aspd","ASPD",F=>F.aspd],["def","DEF",F=>sumStat(F.defTxt)],["hp","Max HP",F=>F.maxHp],["sp","Max SP",F=>F.maxSp]];
const BUILT_IDS=["atkPct","atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","lw","lwAtk","lwElem","crit","critDmg","rangePct","skillPct","vctPct","fctPct","acdPct","ignDef","ignMdef","st_str","st_agi","st_vit","st_dex","st_luk","weapon","wElem"];
let BUILD_LAST=null;
const buildOf=c=>{if(!c.build)c.build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{}};const b=c.build;if(!b.base)b.base={str:1,agi:1,vit:1,int:1,dex:1,luk:1};if(!b.gear)b.gear={};return b};
// other gear sets, as many as you add (up to ALT_MAX, state.js; build.alts[i]: gear, stones, special like the build's own, and a name), worked
// out for the gear comparison (Character tab) and the Formulas tab only. c.gearEdit "alt0"…: the gear table edits that set instead of your gear
const altN=c=>{const b=c.build;return b&&Array.isArray(b.alts)?Math.min(ALT_MAX,b.alts.length):0};
const altOf=(c,i)=>{const b=buildOf(c);if(!Array.isArray(b.alts))b.alts=[];let a=b.alts[i];if(!a||typeof a!=="object")a=b.alts[i]={};if(!a.gear||typeof a.gear!=="object")a.gear={};return a};
// the set the table edits: 0…altN−1, or −1 for your gear
// set i's name: the one you gave it, else "Set 3"
const altName=(c,i)=>{const b=c.build,a=b&&Array.isArray(b.alts)&&b.alts[i];return String(a&&a.name||"").trim()||`Set ${i+1}`};
const altIdx=(c=C())=>{const m=c.mode==="build"&&/^alt(\d+)$/.exec(c.gearEdit||"");return m&&+m[1]<altN(c)?+m[1]:-1};
const editAlt=(c=C())=>altIdx(c)>=0;
const gearSet=(c=C())=>editAlt(c)?altOf(c,altIdx(c)):buildOf(c);
function applyBuild(){const c=C();if(c.mode!=="build"){BUILD_LAST=null;c.bx=eqToBx(c);return}
  const r=BUILD.compute({...buildOf(c),baseLv:c.baseLv,jobLv:c.jobLv,skills:learned(c),extra:[...consLines().lines,...(SKFX?[...SKFX.stat,...SKFX.buffStat]:[]),...aspdBuffLines(c)]},state.job,aspdBase);BUILD_LAST=r;const F=r.fields,A=r.acc;
  // skill-specific gear lines count when the attack's name contains the skill
  const nm=String(c.a.name||"").toLowerCase(),match=o=>Object.entries(o).reduce((t,[k,v])=>t+(nm.includes(k.toLowerCase())?v:0),0);
  const top=o=>Object.entries(o).reduce((t,[k,v])=>nm.includes(k.toLowerCase())?Math.max(t,v):t,0); // fixed cast %: only the highest counts
  Object.assign(c,{atkTxt:F.atkTxt,matkTxt:F.matkTxt,hitTxt:F.hitTxt,fleeTxt:F.fleeTxt,defTxt:F.defTxt,intTxt:F.intTxt,wAtk:F.wAtk,crit:F.crit,critDmg:F.critDmg,
    atkPct:F.atkPct,rangePct:isRangedHit(c.a,F.weapon)?A.ranged:A.melee,skillPct:A.skill+match(A.skillOf),vctPct:F.vctPct+match(A.vctOf),fctPct:Math.max(F.fctPct,top(A.fctOf)),acdPct:F.acdPct,ignDef:F.ignDef,ignMdef:F.ignMdef,
    weapon:F.weapon,wElem:F.wElem,lw:F.lw,lwAtk:F.lwAtk,lwElem:F.lwElem,st:{...(c.st||{}),...F.st},bx:{phys:A.phys,magic:A.magic,dist:{melee:A.melee,ranged:A.ranged},myEle:A.myEle,taken:A.taken,exp:A.exp,critRace:A.critRace,spCost:A.spCost,spRec:A.spRec,hpRec:A.hpRec,ign:A.ign}});
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
const ASPD_POT={conc:{id:645,name:"Concentration Potion",mod:4},awak:{id:656,name:"Awakening Potion",mod:6,lv:40,no:["Novice","Acolyte","Priest","Bard","Dancer"]},
  bers:{id:657,name:"Berserk Potion",mod:9,lv:85,only:["Mage","Merchant","Swordsman","Wizard","Blacksmith","Alchemist","Knight","Crusader","Rogue"]}};
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
  {k:"angelus",name:"Angelus",lv:[1,10,10],fx:l=>[["hp",50*l],["vit_def_percent",5*l]]},
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
  // the potion in use, its icon opening its details like the other item names
  $("potIcon").innerHTML=k?`<a href="#" data-info="item:${ASPD_POT[k].id}" title="${esc(ASPD_POT[k].name)}">${itemIcon(ASPD_POT[k].id)}</a>`:"";
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
function gearEqRows(c){const A=BUILD.compute({...buildOf(c),baseLv:c.baseLv,jobLv:c.jobLv,skills:learned(c),extra:[]},state.job,aspdBase).acc,rows=[];
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
  $("eqFillNote").textContent=rows.length?`Filled ${rows.length} line${rows.length>1?"s":""} from your gear (procs and "Not counted" lines left out).`:"Your gear in Build from gear has no lines for this list."});
$("eqList").addEventListener("click",e=>{if(e.target.closest("[data-del]")==null)return;const i=+e.target.closest(".eqrow").dataset.i;eqOf(C()).splice(i,1);save();renderEq();renderAll()});
$("eqList").addEventListener("change",e=>{const f=e.target.dataset.f;if(!f||f==="v")return;const r=eqOf(C())[+e.target.closest(".eqrow").dataset.i];r[f]=e.target.value;
  if(f==="by"){const T=EQ_TARGETS[r.by];const first=T&&T()[0];r.t=first==null?"":Array.isArray(first)?first[0]:first}save();renderEq();renderAll()});
$("eqList").addEventListener("input",e=>{if(e.target.dataset.f!=="v")return;eqOf(C())[+e.target.closest(".eqrow").dataset.i].v=e.target.value===""?"":num(e.target.value);save();renderAll()});
const jobSlug=()=>state.job.toLowerCase();
// gear lists the job family ("swordsman" covers Knight and Crusader), so a 2nd job also matches its 1st job
const FIRST_OF=BUILD.FIRST_OF;
const canWear=it=>!it.jobs||!it.jobs.length||it.jobs.includes(jobSlug())||(FIRST_OF[state.job]&&it.jobs.includes(FIRST_OF[state.job].toLowerCase()));
// item picker labels: the name; when two items share a name, the slot count as the game writes it ("Arc Wand [1]", "Arc Wand [2]").
// Copies alike in everything but the id (Damascus 1222 and 510137) share the label and the list keeps the first; the id is added only
// when same-named, same-slot items differ
const itemKey=it=>JSON.stringify({...it,id:0,slug:0,jobs:[...new Set(it.jobs||[])].sort()});
const labelOf=(it,list)=>{const same=list.filter(x=>x.name===it.name);if(same.length<2)return it.name;
  const n=it.slots||0,l=n?`${it.name} [${n}]`:it.name,k=itemKey(it);return same.some(x=>(x.slots||0)===n&&itemKey(x)!==k)?`${l} #${it.id}`:l};
const pickList=(list)=>{const m=new Map();list.forEach(it=>{const l=labelOf(it,list);if(!m.has(l))m.set(l,it.id)});return m};
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
  const one=(x,i)=>{const o=x&&ch.find(c=>c.k===x.k),saved=x&&!o?BUILD.OPTIONS.find(c=>c.k===x.k):null,r=o&&o.range,ess=(o||saved||{}).ess;
    return `<div class="opt"><select data-opt="${i}"><option value="">${x?"remove":"+ affix"}</option>${saved?`<optgroup label="Saved"><option value="${saved.k}">${esc(saved.label)}</option></optgroup>`:""}${list}</select>${x&&!ess?`<input data-optv="${i}" type="number" step="any"${r?` min="${r[0]}" max="${r[1]}" placeholder="${r[0]}–${r[1]}" title="${esc(o.label)}: ${r[0]}–${r[1]}"`:""} value="${esc(x.v??"")}">`:""}</div>${ess?`<div class="note essFx">${esc(ess.t)}</div>`:""}`};
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
    `<tr><td>Shadow shield</td><td><div class="itemBox">${iconHtml("gear",sh)}<select data-shadow="shield" aria-label="Shadow shield"><option value="">none</option>${shadowShields().map(x=>`<option value="${x.id}"${+sh===x.id?" selected":""}>${esc(x.name)}: ${esc(stoneFx({b:(x.g||[]).flatMap(g=>g.b||[])}))}</option>`).join("")}</select></div></td><td></td><td></td></tr>
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
// a two-handed weapon takes both hands, so it and the Shield row (shield or left-hand weapon) can't both be worn: putting one on
// takes the other off, remembered, as the game does. k is the row just filled
const twoHandOn=gear=>{const w=gear&&gear.weapon&&BUILD.item(gear.weapon.id);return !!w&&BUILD.twoHanded(BUILD.WTYPE[w.type])};
function handsFree(c,gear,k){if(k!=="weapon"&&k!=="shield"||!twoHandOn(gear)||!(gear.shield&&gear.shield.id))return;
  const off=k==="weapon"?"shield":"weapon";memKeep(c,gear[off]);delete gear[off]}
// "+7 · Vitata Card · 2 affixes"
const memTxt=m=>[num(m.refine)?`+${num(m.refine)}`:"",...(m.cards||[]).filter(Boolean).map(id=>(BUILD.item(id)||{}).name).filter(Boolean),
  ...(m.opts&&m.opts.length?[`${m.opts.length} affix${m.opts.length>1?"es":""}`]:[])].filter(Boolean).join(" · ");
// icons: gear and every other item from the game client, cards a thumbnail of their picture, monsters their sprite (data/icons.js, tools/export_icons.py); a
// cell of a sprite sheet each, the sheet set once as a CSS variable. scale draws it smaller (the gear table's card boxes); cls adds a
// class ("il": inline in a line of text). An item with no image gets an empty cell, so the names still line up
const ICON_AT={};
// job icons from the game client (data/sprites.js icons, tools/export_sprites.py), by job name
if(typeof ICON_SHEETS!=="undefined"&&typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES.icons)ICON_SHEETS.job=JOB_SPRITES.icons;
(typeof ICON_SHEETS!=="undefined"?Object.entries(ICON_SHEETS):[]).forEach(([k,s])=>{ICON_AT[k]={};s.ids.forEach((id,i)=>ICON_AT[k][id]=i);
  document.documentElement.style.setProperty(`--ico-${k}`,`url("${s.file}?v=${s.v}")`)});
function iconHtml(kind,id,scale=1,cls=""){
  // what the client has no picture for (data/client.js) has the database's
  if(ICON_AT[kind+"Db"]&&(ICON_AT[kind]||{})[id]==null&&ICON_AT[kind+"Db"][id]!=null)kind+="Db";
  const s=typeof ICON_SHEETS!=="undefined"&&ICON_SHEETS[kind],i=ICON_AT[kind]&&ICON_AT[kind][id];
  const size=s&&scale!==1?`width:${s.w*scale}px;height:${s.h*scale}px;`:"",c=`ico ico-${kind}${cls?" "+cls:""}`;
  if(!s||i==null)return `<span class="${c} none" aria-hidden="true"${size?` style="${size}"`:""}></span>`;
  // an hd sheet (data/client.js) holds each picture at hd times its size: always drawn at the cell size, so it's sharp on high-DPI screens
  const rows=Math.ceil(s.ids.length/s.cols),fit=scale!==1||s.hd?`background-size:${s.cols*s.w*scale}px ${rows*s.h*scale}px;`:"";
  return `<span class="${c}" aria-hidden="true" style="${size}${fit}background-position:-${i%s.cols*s.w*scale}px -${Math.floor(i/s.cols)*s.h*scale}px"></span>`}
// any item by id: a card's picture at half size (as tall as an icon), else its gear or item icon
const hasIcon=(k,id)=>[k,k+"Db"].some(x=>ICON_AT[x]&&ICON_AT[x][id]!=null);
const itemIcon=(id,scale=1,cls="")=>hasIcon("card",id)?iconHtml("card",id,scale/2,cls)
  :iconHtml(hasIcon("gear",id)?"gear":"item",id,scale,cls);
// a monster by id: its sprite at half size (as tall as an icon); scale 2 draws it full size (48 x 48)
const mobIcon=(id,scale=1,cls="")=>iconHtml("mob",id,scale/2,cls);
function renderGearTable(){const c=C(),b=gearSet(c),mem=memOf(c);GEAR_LISTS={};let lists="";
  const rows=BUILD.SLOTS.map(s=>{const g0=b.gear[s.k]||{},items=gearChoices(s.k),cards=cardChoices(s.k,g0.id&&BUILD.item(g0.id));GEAR_LISTS["g_"+s.k]=pickList(items);GEAR_LISTS["c_"+s.k]=pickList(cards);
    lists+=`<datalist id="gl_${s.k}">${[...GEAR_LISTS["g_"+s.k]].map(([n,id])=>`<option value="${esc(n)}"${mem[id]?` label="remembered: ${esc(memTxt(mem[id]))}"`:""}>`).join("")}</datalist><datalist id="cl_${s.k}">${[...GEAR_LISTS["c_"+s.k]].map(([n,id])=>{const p=cardName({id});return `<option value="${esc(n)}"${p?` label="${esc((BUILD.item(id)||{}).affixPos==="suffix"?"… "+p:p+" …")}"`:""}>`}).join("")}</datalist>`;
    const g=b.gear[s.k]||{},it=g.id&&BUILD.item(g.id),label=n=>{const x=BUILD.item(n);return x?labelOf(x,cards):""};
    const cardBoxes=it&&it.slots?Array.from({length:it.slots},(_,i)=>`<span class="cardBox">${iconHtml("card",g.cards&&g.cards[i],.5)}<input data-card="${i}" list="cl_${s.k}" placeholder="card" title="The card (Vitata), or the name it gives the item in game (Healing)" value="${esc(g.cards&&g.cards[i]?label(g.cards[i]):"")}"></span>`).join(""):"";
    const refinable=it&&s.k!=="ammo"; // every part: some accessories and headgear refine though the data has no schedule for them
    // under a two-handed weapon the Shield row is closed; a shield saved there before stays editable so it can be taken off
    const both=s.k==="shield"&&twoHandOn(b.gear),w2=both&&BUILD.item(b.gear.weapon.id),off=both&&!it;
    return `<tr data-slot="${s.k}"${both?' class="bothHands"':""}><td>${s.k==="shield"&&state.job==="Assassin"?"Shield / left hand":s.label}${both?`<div class="note">${it?"not counted: ":""}${esc(w2.name)} takes both hands</div>`:""}</td><td><div class="itemBox">${iconHtml("gear",it&&it.id)}<input class="item" list="gl_${s.k}" placeholder="${off?"two-handed weapon":items.length?"none":"no items for this job"}" title="${off?esc(`${w2.name} is two-handed: take it off to use a shield${state.job==="Assassin"?" or a left-hand weapon":""}`):"The item, or its name from the equipment window (+7 Healing Shining Clip) or with its cards (+7 Shining Clip Vitata): sets the refine and cards too"}" value="${esc(it?labelOf(it,items):"")}"${off?" disabled":""}></div></td>
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
// window's canvas and the Skill tree's class picker once they load. Both are data: URLs (jobData, hairData), since reading their
// pixels is refused for an image from a file opened from disk
const ewImg=k=>typeof JOB_SPRITES!=="undefined"&&typeof Image!=="undefined"&&Object.assign(new Image(),{src:JOB_SPRITES[k+"Data"],onload:()=>drawLook(document)});
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
// what a look shows of what it wears (data/costumelooks.js): its headgear views in the order the client stacks them (lower, upper,
// middle) and its garment's view. Each headgear slot shows, as in game, the costume in it, else the normal headgear (L.gear); a piece in
// two or three slots shows from its highest (upper, middle, lower) and leaves the others empty, so a costume in that slot hides all of
// it. The garment is the costume one, else the normal one
function wornOf(L){const CL=typeof COSTUME_LOOKS!=="undefined"&&COSTUME_LOOKS,cos=L.cos||{},gear=L.gear||{},look=id=>CL&&id&&CL.items[id];
  const slotsOf=id=>(typeof COSTUMES!=="undefined"&&COSTUMES[id])||(CL&&(CL.cos[id]||CL.gear[id]))||[];
  const shown=k=>{for(const w of [cos,gear])if(w[k])return ["upper","middle","lower"].find(s=>slotsOf(w[k]).includes(s))===k?w[k]:null;return null};
  const r=look(cos.garment||gear.garment);
  return {head:["lower","upper","middle"].map(shown).map(look).filter(x=>x&&x[0]==="h").map(x=>x[1]),robe:r&&r[0]==="r"?r[1]:null}}
// what a gear set (gearSet's) wears, as a look's {gear, cos}: its headgear and garment (one that's a costume, "[Costume] ...", with the
// costumes) and the costumes in Special equipment, each in every slot it takes, a later one taking off what was in them. Pieces the
// client has no look for are left out
function wornFromSet(b){const CL=typeof COSTUME_LOOKS!=="undefined"&&COSTUME_LOOKS,w={gear:{},cos:{}};if(!CL||!b)return w;
  const cosSlots=id=>(typeof COSTUMES!=="undefined"&&COSTUMES[id])||CL.cos[id];
  const put=(kind,id)=>{const c=w[kind],sl=(kind==="cos"?cosSlots(id):CL.gear[id])||[];
    sl.forEach(k=>{const o=c[k];if(o)Object.keys(c).forEach(s=>{if(c[s]===o)delete c[s]})});
    sl.forEach(k=>{if(["upper","middle","lower","garment"].includes(k))c[k]=id})};
  const ids=a=>[...new Set(a.map(x=>+x).filter(x=>x&&CL.items[x]))];
  ids(["headTop","headMid","headLow","garment"].map(k=>((b.gear||{})[k]||{}).id)).forEach(id=>put(cosSlots(id)?"cos":"gear",id));
  ids(Object.values((b.special||{}).costume||{})).forEach(id=>put("cos",id));
  return w}
// the body a look is drawn with (data/sprites.js): the job's own (a Novice's for a job with no look), its transcendent look (trans, a 2nd
// job's), riding the Halter Lead's mount (ride), or both, where the client has it. set: the body per gender; pal: its clothes colours'
// set; key: "<job>", "<job>+", "<job>~" or "<job>+~", as the garment sheets and animated looks name it
const LOOK_SETS={"":"body","+":"trans","~":"ride","+~":"rideTrans"};
function lookBody(job,trans,ride){const S=JOB_SPRITES,j=S.body[job]?job:"Novice",t=!!(trans&&EW_TRANS[j]&&(S.trans||{})[j]);
  const r=!!(ride&&(S[t?"rideTrans":"ride"]||{})[j]),sfx=(t?"+":"")+(r?"~":""),set=LOOK_SETS[sfx];
  return {job:j,trans:t,ride:r,key:j+sfx,set:S[set][j],pal:set+"Pal"}}
// a job's look as a canvas placed from the feet (in an .ewFeet), painted by drawLook once the sheets load: L is a look like state.look
// ({sex, hair, color, dye}, cos: the costumes worn and gear: the normal headgear and garment, each {upper, middle, lower, garment: item
// id}, ride: on the Halter Lead's mount), trans a 2nd job's transcendent look. A job with no look of its own (or no look for the gender)
// takes the Novice's, or its one gender's
function lookCanvas(job,L,trans){const S=typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES;if(!S)return "";
  const lb=lookBody(job,trans,L.ride),bj=lb.set,sex=bj[L.sex]?L.sex:Object.keys(bj)[0],b=bj[sex],
    hs=S.head[sex]||{},hair=hs[L.hair]?L.hair:1,h=hs[hair],pk=lb.pal,pj=lb.job;
  // what it wears (wornOf): headgear on the head anchor, the garment from the feet on this body's garment sheet, behind the body: the
  // look stands facing you, which the client always draws with the garment behind (its spreditinfo layer tables)
  const CL=typeof COSTUME_LOOKS!=="undefined"&&COSTUME_LOOKS,w=wornOf(L),rk=lb.key;
  const acc=w.head.map(v=>(CL.head.at[v]||{})[sex]).filter(Boolean),rs=w.robe&&CL.robe.bodies[rk],ra=rs&&(rs.at[w.robe]||{})[sex];
  // body and head go into one canvas at the sprites' own size, which the page then scales: as separate boxes each rounded to the
  // screen's pixels on its own, so at some zooms the head sat a pixel off the body
  const parts=[[...b.slice(0,4),b[4],b[5]],...h?[[...h.slice(0,4),b[6]+h[4],b[7]+h[5]]]:[],...acc.map(a=>[...a.slice(0,4),b[6]+a[4],b[7]+a[5]]),...ra?[ra]:[]];
  const l=Math.min(...parts.map(p=>p[4])),t=Math.min(...parts.map(p=>p[5])),r=Math.max(...parts.map(p=>p[4]+p[2])),bt=Math.max(...parts.map(p=>p[5]+p[3]));
  const at=(p,x,y)=>[...p.slice(0,4),x-l,y-t].join(","),bp=((S[pk]||{})[pj]||{})[sex],dye=bp&&L.dye<bp.c.length?L.dye:0,color=L.color<ewColors(sex,hair)?L.color:0;
  return `<canvas class="ewPic" width="${r-l}" height="${bt-t}" style="left:${l}px;top:${t}px" data-body="${at(b,b[4],b[5])}" data-pal="${pk},${pj},${sex}" data-dye="${dye}"${h?` data-head="${at(h,b[6]+h[4],b[7]+h[5])}" data-hair="${sex},${hair},${color}"`:""}`+
    `${acc.length?` data-acc="${acc.map(a=>at(a,b[6]+a[4],b[7]+a[5])).join(";")}"`:""}${ra?` data-robe="${rk},${at(ra,ra[4],ra[5])}"`:""}></canvas>`}
// the look as drawn now: the body (the transcendent look's with Trans on), its gender, and the hair style, hair colour and clothes
// colour that fit it (an out-of-range one shows as the first)
function ewLookNow(){const S=JOB_SPRITES,tj=ewTrans(S),bj=(state.look.trans&&tj)||S.body[state.job]||S.body.Novice,sex=ewSex(bj),hs=S.head[sex]||{};
  const hair=hs[state.look.hair]?state.look.hair:1,nc=ewColors(sex,hair),color=state.look.color<nc?state.look.color:0;
  // clothes colour 0 is undyed, 1 and up the client's dyes for this body
  const bp=ewBodyPal(),nd=bp?bp.c.length:0,dye=state.look.dye<nd?state.look.dye:0;
  return {S,tj,bj,sex,one:Object.keys(bj).length<2,hair,nh:ewHairs(sex),nc,color,bp,nd,dye}}
// Ragnarok Zero has no zeny stylist (iRO's): a new style or color after character creation takes a paid KP shop item (New Style
// Coupon, 7622), and clothes color a Clothing Dye Coupon or Clothing Dye Coupon II (6046, 6047), the transcendent look's too
const EW_HAIR_TIP="Changing it after character creation takes a paid KP shop item, such as a New Style Coupon.";
const EW_DYE_TIP="A Clothing Dye Coupon or Clothing Dye Coupon II (KP shop) changes it, on the transcendent look too. The dye stays through a job change, but can look different on the new job.";
// which grid of choices is open under the Look panel (EW_PICK: "hair", "color", "dye" or null): a button per choice beats stepping
// through 40-odd hair styles one at a time
let EW_PICK=null;
const ewChev='<svg class="ic ewChev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
// the character in the window, wearing what the tab shows
function lookHtml(worn){return typeof JOB_SPRITES==="undefined"?"":`<div class="ewStage"><div class="ewFeet">${lookCanvas(state.job,{...state.look,...worn},state.look.trans)}</div></div>`}
// the Look panel beside the window: gender (M / F; the one a job doesn't have greyed out, Bards are male only and Dancers female), a 2nd
// job's own look or its transcendent job's, then a button for hair style, hair colour and clothes dye that opens the grid of them all
function ewLookCtl(){const S=typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES;if(!S)return "";const v=ewLookNow();
  const pal=S.hairPal&&S.hairPal[v.sex]&&S.hairPal[v.sex][v.hair],swatch=pal?pal.c[v.color].substr(pal.k*6,6):"",dyeSwatch=v.bp?v.bp.c[v.dye].substr(v.bp.k*6,6):"";
  const radio=(k,x,on,label,extra="")=>`<button type="button" role="radio" data-ew${k}="${x}" aria-checked="${on}"${extra}>${esc(label)}</button>`;
  const sexBtn=s=>radio("sex",s,v.sex===s,s==="f"?"F":"M",v.one&&v.sex!==s?` disabled title="${esc(state.job)}s are ${v.sex==="f"?"female":"male"} only"`:` title="${s==="f"?"Female":"Male"}"`);
  const row=(label,ctl)=>`<span class="ewLbl">${label}</span>${ctl}`;
  const open=(k,label,val,sw)=>row(label,`<button type="button" class="small ewOpen" data-ewopen="${k}" aria-expanded="${EW_PICK===k}" aria-controls="ewPicker" aria-label="${label} ${val}: pick from all of them">${sw?`<span class="ewSwatch" style="background:#${sw}"></span>`:""}<span>${val}</span>${ewChev}</button>`);
  return `<div class="ewSide"><div class="ewSideHead">Look</div><div class="ewRows">
    ${row("Gender",`<span class="seg segSm" role="radiogroup" aria-label="Gender">${sexBtn("m")}${sexBtn("f")}</span>`)}
    ${v.tj?row("Job look",`<span class="seg segSm" role="radiogroup" aria-label="Job look" title="${esc(`Ragnarok Zero has no transcendent jobs, so a ${state.job} can look like a ${EW_TRANS[state.job]}. A Costume Change Ticket switches the look in game`)}">${radio("trans",0,!state.look.trans,state.job)}${radio("trans",1,!!state.look.trans,EW_TRANS[state.job])}</span>`):""}
    ${open("hair","Hair style",v.hair,"")}${v.nc>1?open("color","Hair color",v.color,swatch):""}${v.nd>1?open("dye","Clothes dye",v.dye,dyeSwatch):""}</div></div>`}
// the open grid, across under the window and the Look panel: every hair style (in your hair colour, or its first where it has fewer), every
// hair colour on your hair style, or every clothes colour on the whole look without its costumes. A pick shows on the character at
// once and leaves the grid open to try the next
function ewPicker(){const k=EW_PICK,S=typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES;if(!k||!S)return "";const v=ewLookNow();
  const n={hair:v.nh,color:v.nc,dye:v.nd}[k];if(!(n>1))return "";
  const opt=(x,on,pic,label)=>`<button type="button" class="styOpt" data-ewpick="${k},${x}" aria-pressed="${on}" title="${esc(label)}">${pic}<span class="mono">${x}</span></button>`;
  const grid=k==="hair"?Array.from({length:n},(_,i)=>i+1).map(h=>opt(h,h===v.hair,headCanvas(v.sex,h,v.color<ewColors(v.sex,h)?v.color:0,2),`Hair style ${h}`))
    :k==="color"?Array.from({length:n},(_,c)=>opt(c,c===v.color,headCanvas(v.sex,v.hair,c,2),`Hair color ${c}`))
    :Array.from({length:n},(_,d)=>opt(d,d===v.dye,`<span class="ewStage"><span class="ewFeet">${lookCanvas(state.job,{...state.look,dye:d,cos:{},gear:{}},state.look.trans)}</span></span>`,d?`Clothes color ${d}`:"Clothes color 0: undyed"));
  const [title,cur,lo]={hair:["Hair style",v.hair,1],color:["Hair color",v.color,0],dye:["Clothes dye",v.dye,0]}[k];
  return `<div class="ewPicker" id="ewPicker" role="group" aria-label="${title}"><div class="ewPickHead"><b>${title}</b><span class="note">${cur} of ${lo}–${lo+n-1}${k==="dye"?" (0 undyed)":""}</span>
      <button type="button" class="small ewPickX" data-ewclose="" aria-label="Close">✕</button></div>
    <p class="note ewPickTip">${k==="dye"?EW_DYE_TIP:EW_HAIR_TIP}</p>
    <div class="styGrid ${k==="dye"?"styLooks":"styHeads"} ewPickGrid">${grid.join("")}</div></div>`}
// what the character in the window wears, as in game: on Normal Equip its headgear and garment, on Special Equip the costumes over them
function ewWorn(b,sp){const w=wornFromSet(b);if(!sp)w.cos={};return w}
function renderEquipWin(){const el=$("equipWin"),c=C(),b=gearSet(c),i=altIdx(c),sp=EW_TAB==="special";
  const gearSlot=(k,right)=>{const g=b.gear[k],it=g&&g.id&&BUILD.item(g.id),s=BUILD.SLOTS.find(x=>x.k===k);
    // a two-handed weapon fills the shield slot too, as in game (a shield saved there before shows instead, not counted)
    if(k==="shield"&&!it&&twoHandOn(b.gear))return ewSlot("weapon",`${s.label} (two-handed weapon)`,gameName(b.gear.weapon),iconHtml("gear",b.gear.weapon.id),right).replace('class="ewSlot','class="ewSlot both');
    return ewSlot(k,k==="shield"&&state.job==="Assassin"?"Shield / left hand":s.label,it?gameName(g):"",iconHtml("gear",it&&it.id),right)};
  // a costume slot: the costume with its stone, "[Costume] Chicken beak [STR Stone]" (or the stone alone, when no costume is picked)
  const stone=(k,right)=>{const id=(b.stones||{})[k],x=id&&(typeof STONES!=="undefined"?STONES:[]).find(s=>s.id===+id&&s.slot===k),
      c=((b.special||{}).costume||{})[k],cn=costumeName(c),sn=x?x.name.replace(/ \((Upper|Middle|Lower|Garment)\)$/,""):"";
    return ewSlot(k,`Costume ${k}`,cn?(sn?`${cn} [${sn}]`:cn):sn,itemIcon(cn?c:x&&x.id),right)};
  // costumes, stones and the Taming Ring (item 24966) are in the item icon sheet, not the gear one
  const ring=()=>{const id=(b.special||{}).ring,x=id&&(typeof TAMING_EGGS!=="undefined"?TAMING_EGGS:[]).find(e=>e.id===+id);
    return ewSlot("ring","Taming Ring",x?`Taming Ring [${x.name}]`:id?"Taming Ring":"",itemIcon(id&&24966),false)};
  // the shadow shield in the shield's place, as in game; other special equipment you wear in the right column's free slots
  const shield=()=>{const id=(b.special||{}).shield,it=id&&BUILD.item(id);return ewSlot("shield","Shadow shield",it?it.name:"",iconHtml("gear",it&&it.id),true)};
  const own=((b.special||{}).own||[]).map((x,j)=>({x,j})).filter(o=>o.x.on!==false&&(o.x.name||"").trim()).slice(0,3),ownSlot=n=>own[n]?ewSlot("own"+own[n].j,"Special equipment",own[n].x.name.trim(),iconHtml("gear",null),true):ewNone(true);
  const L=sp?[stone("upper"),stone("lower"),ewNone(),stone("garment"),ring()]:EW_L.map(k=>gearSlot(k,false));
  const R=sp?[stone("middle",true),ownSlot(0),shield(),ownSlot(1),ownSlot(2)]:EW_R.map(k=>gearSlot(k,true));
  // arrows only for jobs that can hold a bow, or when some are set
  const ammo=!sp&&(b.gear.ammo&&b.gear.ammo.id||gearChoices("weapon").some(it=>BUILD.WTYPE[it.type]==="Bow"))?`<div class="ewAmmo">${gearSlot("ammo",false)}</div>`:"";
  const html=`<div class="equipWin"><div class="ewHead"><span>Equipped Items</span>${i>=0?`<span class="ewSet">${esc(altName(c,i))}</span>`:""}</div>
    <div class="ewTabs" role="tablist">${[["normal","Normal Equip"],["special","Special Equip"]].map(([k,t])=>`<button type="button" role="tab" data-ewtab="${k}" aria-selected="${EW_TAB===k}">${t}</button>`).join("")}</div>
    <div class="ewBody"><div class="ewCol">${L.join("")}</div><div class="ewChar">${lookHtml(ewWorn(b,sp))}</div><div class="ewCol">${R.join("")}</div>${ammo}</div></div>${ewLookCtl()}${ewPicker()}`;
  // the button you pressed keeps focus through the redraw, and the open grid its scroll
  const a=document.activeElement,f=a&&el.contains(a)?["ewtab","ewsex","ewopen","ewpick","ewtrans","ewslot"].map(k=>a.dataset[k]!=null?`[data-${k}="${a.dataset[k]}"]`:null).find(Boolean):null;
  if(renderEquipWin.html===html)return;renderEquipWin.html=html;const g=el.querySelector(".ewPickGrid"),top=g&&g.scrollTop;
  el.innerHTML=html;drawLook(el);const g2=el.querySelector(".ewPickGrid");if(g2&&top)g2.scrollTop=top;if(f)el.querySelector(f)?.focus({preventScroll:true})}
// a hair style on its own (the Stylist's hair grids), drawn k times its size, painted by drawLook like a look's canvas
function headCanvas(sex,hair,color,k=1){const h=typeof JOB_SPRITES!=="undefined"&&(JOB_SPRITES.head[sex]||{})[hair];if(!h)return "";
  return `<canvas class="ewPic lookHead" width="${h[2]}" height="${h[3]}" style="width:${h[2]*k}px;height:${h[3]*k}px" data-head="${[...h.slice(0,4),0,0].join(",")}" data-hair="${sex},${hair},${color}"></canvas>`}
// the costume sheets (data/costumelooks.js: "head", or a body's garment sheet by job), each loaded the first time a look wears one; the
// looks are painted again once it has
const COS_IMG=new Map();
function costumeImg(key){const CL=typeof COSTUME_LOOKS!=="undefined"&&COSTUME_LOOKS,s=CL&&(key==="head"?CL.head:CL.robe.bodies[key]);if(!s)return null;
  if(!COS_IMG.has(key))COS_IMG.set(key,Object.assign(new Image(),{onload:()=>drawLook(document),src:`${s.file}?v=${s.v}`}));return COS_IMG.get(key)}
// each look's canvas in root (lookCanvas, headCanvas): the body [x,y,w,h on the sheet, x,y in the canvas] from the job sheet, each index
// coloured with the clothes colour's palette, then the head the same from the hair sheet with the hair colour's; once both sheets have
// loaded. Costumes are drawn from their sheets as they are: a garment behind the body, headgear over the head
function drawLook(root){const bp=ewPx(EW_SHEET),hp=ewPx(EW_HAIR);if(!bp||!hp)return;
  root.querySelectorAll("canvas.ewPic").forEach(c=>{const [k,j,s]=(c.dataset.pal||"").split(","),body=k&&((JOB_SPRITES[k]||{})[j]||{})[s];if(body||!c.dataset.body)paintLook(c,bp,hp,body)})}
function paintLook(c,bp,hp,body){const g=c.getContext("2d");g.clearRect(0,0,c.width,c.height);
  // through a canvas of its own: putImageData would replace the body under the head instead of drawing over it
  const paint=(px,at,pal)=>{const [x,y,w,h,l,t]=at.split(",").map(Number),img=g.createImageData(w,h);
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const s=((y+yy)*px.width+x+xx)*4,o=(yy*w+xx)*4,rgb=px.data[s+3]&&pal[px.data[s]];
      if(rgb){img.data[o]=parseInt(rgb.slice(0,2),16);img.data[o+1]=parseInt(rgb.slice(2,4),16);img.data[o+2]=parseInt(rgb.slice(4),16);img.data[o+3]=255}}
    const pc=document.createElement("canvas");pc.width=w;pc.height=h;pc.getContext("2d").putImageData(img,0,0);g.drawImage(pc,l,t)};
  const sheet=(im,at)=>{if(!im||!im.complete||!im.naturalWidth)return;const [x,y,w,h,l,t]=at.map(Number);g.drawImage(im,x,y,w,h,l,t,w,h)};
  const robe=c.dataset.robe&&c.dataset.robe.split(",");
  if(robe)sheet(costumeImg(robe[0]),robe.slice(1,7));
  if(c.dataset.body)paint(bp,c.dataset.body,ewPal(body,+c.dataset.dye));
  if(c.dataset.head){const [sex,n,color]=c.dataset.hair.split(",");paint(hp,c.dataset.head,ewPal(JOB_SPRITES.hairPal[sex][n],+color))}
  if(c.dataset.acc){const im=costumeImg("head");c.dataset.acc.split(";").forEach(a=>sheet(im,a.split(",")))}}
$("equipWin").addEventListener("click",e=>{const t=e.target.closest("button");if(!t||t.disabled)return;const L=state.look;
  if(t.dataset.ewtab){EW_TAB=t.dataset.ewtab;renderEquipWin();return}
  if(t.dataset.ewtrans){L.trans=t.dataset.ewtrans==="1";save();renderEquipWin();return}
  if(t.dataset.ewsex){if(L.sex===t.dataset.ewsex)return;L.sex=t.dataset.ewsex;if(L.hair>ewHairs(L.sex))L.hair=1;save();renderEquipWin();return}
  if(t.dataset.ewopen){EW_PICK=EW_PICK===t.dataset.ewopen?null:t.dataset.ewopen;renderEquipWin();
    if(EW_PICK)$("ewPicker")?.scrollIntoView({block:"nearest",behavior:"smooth"});return}
  if(t.dataset.ewclose!=null){const k=EW_PICK;EW_PICK=null;renderEquipWin();$("equipWin").querySelector(`[data-ewopen="${k}"]`)?.focus();return}
  if(t.dataset.ewpick){const [k,x]=t.dataset.ewpick.split(",");L[k]=+x;save();renderEquipWin();return}
  const k=t.dataset.ewslot;if(!k)return;
  const to=EW_TAB==="special"?(k==="ring"?$("stoneRow").querySelector("[data-ringon]"):k==="shield"?$("stoneRow").querySelector("[data-shadow]"):k.startsWith("own")?$("specialOwn").querySelector(`[data-i="${k.slice(3)}"] [data-f=name]`):$("stoneRow").querySelector(`[data-costume="${k}"]`))
    :$("gearTable").querySelector(`tr[data-slot="${k}"] input.item`);
  if(to){const d=to.closest("details");if(d)d.open=true;to.scrollIntoView({block:"center",behavior:"smooth"});to.focus({preventScroll:true})}});
// Escape closes the open grid, back to its button
$("equipWin").addEventListener("keydown",e=>{if(e.key!=="Escape"||!EW_PICK)return;e.preventDefault();const k=EW_PICK;EW_PICK=null;renderEquipWin();$("equipWin").querySelector(`[data-ewopen="${k}"]`)?.focus()});
// ---- class picker (the Skill tree's Job): a button with the job's look, icon and name that opens every job's in groups, like a list
// of classes to pick from. Each job shows its male and female look side by side (a Bard only male, a Dancer only female), undyed, each
// with a random hair style and colour, rolled each time you open the tab (the button and the list show the same). groups: [[heading,
// [job…]]…]; onPick(job) when another job is picked; mine(job), if given, is the looks the button shows instead (the Stylist's look).
// Returns set(job, fresh), which shows that job on the button (fresh: roll new hair) ----
// hair styles left out of the roll, as they read as the other gender's: long male styles, short and spiky female ones
const CP_HAIR_SKIP={m:[14,31,36,38,39],f:[22,24,26,29,30,31,32,35,42]};
function classPicker(el,groups,onPick,mine){let cur=null,shown="",looks={};
  const rnd=j=>{const S=typeof JOB_SPRITES!=="undefined"&&JOB_SPRITES,bj=S&&(S.body[j]||S.body.Novice);if(!bj)return [];
    return ["m","f"].filter(s=>bj[s]).map(sex=>{const ok=Array.from({length:ewHairs(sex)},(_,i)=>i+1).filter(n=>!CP_HAIR_SKIP[sex].includes(n)),
        hair=ok.length?ok[Math.floor(Math.random()*ok.length)]:1;
      return {sex,hair,color:Math.floor(Math.random()*ewColors(sex,hair)),dye:0}})};
  const lookOf=j=>looks[j]||(looks[j]=rnd(j));
  // the pair stands a little apart, from the feet: male on the left
  const look=(j,Ls)=>`<span class="ewStage cpPair">${Ls.map((L,i)=>`<span class="ewFeet" style="left:${Ls.length<2?50:i?66:34}%">${lookCanvas(j,L,L.trans)}</span>`).join("")}</span>`;
  el.classList.add("classPick");
  el.innerHTML=`<button type="button" class="cpBtn" aria-haspopup="listbox" aria-expanded="false"></button><div class="cpPop" role="listbox" aria-label="Job" hidden></div>`;
  const btn=el.firstChild,pop=el.lastChild;
  const close=focus=>{if(pop.hidden)return;pop.hidden=true;btn.setAttribute("aria-expanded","false");if(focus)btn.focus()};
  // drawn as it opens, in the hair rolled when the tab opened
  const open=()=>{pop.innerHTML=groups.map(([g,js])=>`<div class="cpGrp">${esc(g)}</div><div class="cpGrid">${js.map(j=>
      `<button type="button" role="option" class="cpOpt" data-job="${esc(j)}" aria-selected="${j===cur}">${look(j,lookOf(j))}${iconHtml("job",j,.8)}<span class="cpName">${esc(j)}</span></button>`).join("")}</div>`).join("");
    // as wide as fits between the picker and the window's right edge
    pop.style.width=Math.max(220,Math.min(760,innerWidth-el.getBoundingClientRect().left-16))+"px";
    pop.hidden=false;btn.setAttribute("aria-expanded","true");drawLook(pop);(pop.querySelector('[aria-selected="true"]')||pop.querySelector(".cpOpt")).focus()};
  btn.addEventListener("click",()=>pop.hidden?open():close());
  pop.addEventListener("click",e=>{const o=e.target.closest(".cpOpt");if(!o)return;close(true);if(o.dataset.job!==cur)onPick(o.dataset.job)});
  // arrows move through the jobs as they're laid out (up and down to the nearest in the row above or below), Home / End to the first
  // and last; Escape closes
  pop.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();close(true);return}
    const os=[...pop.querySelectorAll(".cpOpt")],i=os.indexOf(document.activeElement);if(i<0)return;
    const box=o=>o.getBoundingClientRect(),mid=o=>box(o).left+box(o).width/2,r=box(os[i]),dn=e.key==="ArrowDown";let n=-1;
    if(e.key==="ArrowLeft")n=i-1;else if(e.key==="ArrowRight")n=i+1;else if(e.key==="Home")n=0;else if(e.key==="End")n=os.length-1;
    else if(dn||e.key==="ArrowUp"){const by=os.filter(o=>dn?box(o).top>=r.bottom-1:box(o).bottom<=r.top+1);if(!by.length){e.preventDefault();return}
      const y=(dn?Math.min:Math.max)(...by.map(o=>box(o).top)),row=by.filter(o=>Math.abs(box(o).top-y)<2);
      n=os.indexOf(row.reduce((a,o)=>Math.abs(mid(o)-mid(os[i]))<Math.abs(mid(a)-mid(os[i]))?o:a))}
    else return;
    e.preventDefault();if(os[n])os[n].focus()});
  document.addEventListener("click",e=>{if(!el.contains(e.target))close()});
  el.addEventListener("focusout",e=>{if(e.relatedTarget&&!el.contains(e.relatedTarget))close()});
  return (job,fresh)=>{if(fresh)looks={};const html=`${look(job,mine?mine(job):lookOf(job))}${iconHtml("job",job)}<span class="cpName"><span class="cpLbl">Job</span>${esc(job)}</span><svg class="ic cpChev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
    cur=job;btn.setAttribute("aria-label",`Job: ${job}`);if(shown===html)return;shown=html;btn.innerHTML=html;drawLook(btn);
    // a look taller or wider than one on foot (riding the Halter Lead's mount) is drawn smaller, to fit the button: 94px above the
    // feet and 47px to each side at the stage's scale (.7)
    const cs=[...btn.querySelectorAll(".ewFeet canvas")],px=(c,k)=>parseFloat(c.style[k])||0;
    const up=Math.max(...cs.map(c=>-px(c,"top"))),side=Math.max(...cs.map(c=>Math.max(-px(c,"left"),px(c,"left")+c.width))),k=Math.min(1,94/up,47/side);
    if(k<1)btn.querySelectorAll(".ewFeet").forEach(f=>f.style.transform=`scale(${(.7*k).toFixed(3)})`)}}
// Build from gear's Status, Gear, Equipment and Special equipment panels fold away, remembered like a card (state.collapsed)
[["buildStatFold","Build from gear: status"],["gsetFold","Build from gear: gear sets"],["gearFold","Build from gear: equipment table"],["specialFold","Build from gear: special equipment table"]].forEach(([id,key])=>{const d=$(id);d.open=!(state.collapsed||{})[key];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[key])return;if(d.open)delete c[key];else c[key]=true;save()})});
// Attack details (damage %, cast time, delay, mastery…) starts folded: the Attack picker fills them in, and its line says what it
// does. Opened once, it stays open (state.collapsed["Attack details"] === false)
{const d=$("atkPanel"),key="Attack details";d.open=(state.collapsed||{})[key]===false;
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===(c[key]===false))return;if(d.open)c[key]=false;else delete c[key];save()})}
function renderBuild(){const c=C(),on=c.mode==="build";
  if(on&&renderBuild.job!==state.job){renderBuild.job=state.job;renderGearTable()}if(!on)renderBuild.job=null;
  ROOTQ("[data-cmode]").forEach(x=>x.setAttribute("aria-checked",String(x.dataset.cmode===(on?"build":"status"))));
  $("buildPanel").hidden=!on;$("statNote").hidden=on;$("shieldRow").hidden=on;$("onTopWrap").hidden=on;$("addOnTop").checked=c.addOnTop!==false;BUILT_IDS.forEach(id=>{const el=$(id);el.disabled=on;if(on&&document.activeElement!==el)el.value=id.startsWith("st_")?(c.st||{})[id.slice(3)]??"":c[id]??""});
  // Build from gear has its own status window: the typed Status card keeps only SP regen, the one box it still takes
  {const p=$("statPanel"),sp=$("spRegen");p.querySelectorAll(".form,.form>label").forEach(x=>x.classList.toggle("buildOff",on&&!x.contains(sp)));
    p.querySelector("summary .note").textContent=on?"leave it on auto, or type the tick you measured":"";
    p.querySelector("summary b").textContent=on?"SP regen":"Status"}
  if(!on)return;renderAltBar(c);renderEquipWin();const b=buildOf(c);renderStatWin(c);
  const r=BUILD_LAST;if(!r)return;const jb=r.jobBonus;
  $("jobBonusNote").textContent=`Job Lv ${r.fields.jobLv} bonus: `+BUILD.STAT6.map(k=>`${k.toUpperCase()} +${jb[k]}`).join(" · ")+(BUILD.curve(state.job,"hp",num(c.baseLv))==null?" · no HP/SP table for this job, type Max HP/SP after switching back":"");
  // check against the game: type the in-game totals, see the difference per stat
  const ck=b.check||{},rows=CHECKS.map(([k,label,get])=>{const mine=get(r.fields),g=ck[k];const d=g!=null&&g!==""&&mine!=null?num(g)-mine:null;
    return `<label>${label}<span class="bar"><input data-ck="${k}" type="number" value="${esc(g??"")}" placeholder="${mine??"–"}" class="fill">${d==null?"":`<span class="${Math.abs(d)<0.5?"good":"bad"}">${d===0?"✓":(d>0?"+":"")+fmtP(+d.toFixed(1))}</span>`}</span></label>`}).join("");
  if(!$("checkGrid").contains(document.activeElement))$("checkGrid").innerHTML=rows;
  // cards the Character tab's Cards rows model from your gear: listed as counted there, not as missing
  // the other gear set's own notes while the table shows it
  const un=editAlt(c)?(x=>x?withSnap(x,()=>BUILD_LAST.unmodelled):[])(altChar(c,altIdx(c))):r.unmodelled;
  const inRow=x=>CARD_ROW.some(n=>x.startsWith(n+":"))&&(state.job==="Sage"||!x.startsWith("Dark Priest Card:")),
    inRows=[...new Set(un.filter(inRow).map(x=>x.split(":")[0]))],rest=un.filter(x=>!inRow(x));
  $("buildNote").innerHTML=(rest.length?`<b>Not counted</b> (procs, conditional or unsupported lines):<br>${rest.map(esc).join("<br>")}`:"")+
    (inRows.length?`${rest.length?"<br>":""}<b>Counted in the Cards rows</b> (Character tab, under the attack): ${inRows.map(esc).join(", ")}`:"")}
const CARD_ROW=["Vitata Card","Phen Card","Bloody Butterfly Card","Hunter Fly Card","Sidewinder Card","Creamy Card","Dracula Card","Dark Priest Card",...Object.values(KILL_SP).map(n=>n+" Card")];
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
  gearRead(c,b.gear[k]||(b.gear[k]={}),GEAR_ALTS.list[+x.dataset.gearalt]);handsFree(c,b.gear,k);gearAlts(k,"",null);save();renderGearTable();renderAll()});
$("gearTable").addEventListener("change",e=>{const tr=e.target.closest("tr[data-slot]");if(!tr)return;const k=tr.dataset.slot,c=C(),b=gearSet(c),g=b.gear[k]||(b.gear[k]={});
  if(e.target.classList.contains("item")){const v=e.target.value.trim();const id=GEAR_LISTS["g_"+k].get(v);
    // not on the list: read it as the equipment window names it, refine and cards included (they win over what the item last had)
    const r=id==null&&v?readGear(k,v):null;
    if(!v){memKeep(c,g);delete b.gear[k]}else if(id!=null)gearPut(c,g,id);
    else if(r)gearRead(c,g,r);else{e.target.value=g.id?e.target.defaultValue:"";return}
    if(v)handsFree(c,b.gear,k);gearAlts(k,v,r);save();renderGearTable();renderAll();return}
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
// stays what the page works with, and Compare gear (Character tab, ref.js) works them all out side by side. "Swap" makes a set your gear (and yours
// that set), so you can switch back ----
const altSaved=(c,i)=>c.mode==="build"&&!!(c.build&&Array.isArray(c.build.alts)&&c.build.alts[i])&&setSaved(c.build.alts[i]);
// the sets with gear in them, by number
const altList=(c=C())=>Array.from({length:altN(c)},(_,i)=>i).filter(i=>altSaved(c,i));
// your character with set i on instead of your gear (base stats, skills and buffs stay); the in-game Max HP / SP typed
// under "Check against the game" are for your gear, so they don't count for it
const altChar=(c,i)=>{if(!altSaved(c,i))return null;const x=JSON.parse(JSON.stringify(c)),a=x.build.alts[i];
  x.build={...x.build,gear:a.gear||{},stones:a.stones||{},special:a.special||{},check:{}};delete x.build.alts;delete x.build.loadouts;delete x.build.setName;delete x.build.mem;delete x.gearEdit;return x};
const SET_KEYS=["gear","stones","special"];
const setCopy=b=>JSON.parse(JSON.stringify(Object.fromEntries(SET_KEYS.map(k=>[k,b[k]||{}]))));
const gearTxt=g=>{const it=g&&g.id&&BUILD.item(g.id);if(!it)return "none";const n=(g.cards||[]).filter(Boolean).map(id=>(BUILD.item(id)||{}).name).filter(Boolean);
  return `${num(g.refine)?`+${num(g.refine)} `:""}${it.name}${n.length?` [${n.join(", ")}]`:""}`};
// what set i changes: "Weapon: Pike → +7 Zweihander" per gear row (affixes count as a change too), then the special equipment.
// short: only what the set has, "Weapon → +7 Zweihander"
function altDiff(c,i,short){const b=buildOf(c),a=altOf(c,i),g0=b.gear||{},g1=a.gear||{},same=(x,y)=>JSON.stringify(x||null)===JSON.stringify(y||null);
  const rows=BUILD.SLOTS.filter(s=>!same(g0[s.k],g1[s.k])).map(s=>short?`${esc(s.label)} → ${esc(gearTxt(g1[s.k]))}`:`${esc(s.label)}: ${esc(gearTxt(g0[s.k]))} → <b>${esc(gearTxt(g1[s.k]))}</b>${gearTxt(g0[s.k])===gearTxt(g1[s.k])?" (affixes)":""}`);
  // an empty list of other special equipment is the same as none (a set the table never showed has none)
  const sp=x=>{const o={...(x||{})};if(Array.isArray(o.own)&&!o.own.length)delete o.own;return o};
  if(!same(b.stones||{},a.stones||{})||!same(sp(b.special),sp(a.special)))rows.push("Special equipment");return rows}
const altDiffTxt=(c,i)=>{const d=altDiff(c,i);return d.length?d.join(" · "):"same as your gear"};
function renderAltBar(c=C()){const i=altIdx(c),has=i>=0&&altSaved(c,i),list=altList(c),n=altN(c),b=buildOf(c),mine=String(b.setName||"").trim(),memN=Object.keys(memOf(c)).length;
  const wait=(Array.isArray(b.loadouts)?b.loadouts:[]).map(x=>String(x&&x.name||"").trim()||"(no name)");
  $("gsetSeg").innerHTML=`<button type="button" role="radio" data-gset="mine" aria-checked="${i<0}"${mine?` title="You swapped on ${esc(mine)}"`:""}>My gear${mine?` (${esc(mine)})`:""}</button>`+Array.from({length:n},(_,k)=>
    `<button type="button" role="radio" data-gset="${k}" aria-checked="${k===i}" title="Set ${k+1}: another set of gear, worked out next to yours in Compare gear (bottom of this tab)">${esc(altName(c,k))}${altSaved(c,k)?" ●":""}</button>`).join("");
  $("altAdd").disabled=n>=ALT_MAX;$("altAdd").title=n>=ALT_MAX?`Up to ${ALT_MAX} other sets`:"Add another set of gear to compare with yours";
  $("buildPanel").classList.toggle("altedit",i>=0);// the set's buttons stay put on your gear (greyed out), so the rows below don't move as you pick sets
  ["altRename","altCopy","altSwap","altDel"].forEach(id=>$(id).disabled=i<0);$("altSwap").disabled=!has;
  $("memClear").hidden=!memN;$("memClear").textContent=`Forget remembered items (${memN})`;
  // one line, so the gear window below doesn't move as you pick a set: what the set changes (the full text on hover), or on your gear a
  // pointer to Compare gear, which lists every set's changes
  const note=$("altNote"),cmp="side by side in Compare gear, at the bottom of this tab";
  note.innerHTML=i>=0?`<b>Editing ${esc(altName(c,i))}:</b> `+(has?altDiff(c,i,true).join(" · ")||"same as your gear":"empty. Pick its gear below, or copy yours in")
    // saved loadouts from before they became sets, that didn't fit in ALT_MAX sets (state.js loadoutsIn)
    :wait.length?`<span class="bad">${wait.length} saved loadout${wait.length>1?"s":""} didn't fit in the ${ALT_MAX} sets: ${wait.map(esc).join(", ")}. Remove a set and ${wait.length>1?"they come":"it comes"} in as one.</span>`
    :list.length?`Your gear and ${list.length} other set${list.length>1?"s":""}, ${cmp}`:"";
  note.title=i>=0?`${note.textContent}\nThe page still works with your gear. This set is ${cmp}.`:note.textContent}
$("gsetSeg").addEventListener("click",e=>{const x=e.target.closest("[data-gset]");if(!x)return;const c=C();if(x.dataset.gset==="mine")delete c.gearEdit;else c.gearEdit="alt"+x.dataset.gset;save();renderGearTable();renderAll()});
// add an empty set (its index, or −1 at ALT_MAX); remove set i, the ones after it moving up, its items remembered
function altAdd(c){const b=buildOf(c);if(!Array.isArray(b.alts))b.alts=[];if(b.alts.length>=ALT_MAX)return -1;b.alts.push({gear:{}});return b.alts.length-1}
function altDel(c,i){const b=buildOf(c);if(!Array.isArray(b.alts)||!b.alts[i])return;memAll(c,altOf(c,i).gear);b.alts.splice(i,1);delete c.gearEdit;loadoutsIn(b)}
// name set i (blank: back to "Set i+1")
function altRename(c,i,name){const a=altOf(c,i),nm=String(name||"").trim().slice(0,SET_NAME_MAX);if(nm)a.name=nm;else delete a.name}
$("altAdd").addEventListener("click",()=>{const c=C(),i=altAdd(c);if(i<0)return;c.gearEdit="alt"+i;save();renderGearTable();renderAll()});
$("altRename").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0)return;const a=altOf(c,i);
  const nm=prompt(`Name set ${i+1} (“Farm”, “Boss”). Leave it blank for “Set ${i+1}”.`,String(a.name||"").trim());if(nm==null)return;altRename(c,i,nm);save();renderAll()});
$("altCopy").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0)return;if(altSaved(c,i)&&altDiff(c,i).length&&!confirm(`Replace ${altName(c,i)} with a copy of your gear?`))return;
  // the set keeps its name
  const nm=altOf(c,i).name;memAll(c,altOf(c,i).gear);buildOf(c).alts[i]={...(nm?{name:nm}:{}),...setCopy(buildOf(c))};save();renderGearTable();renderAll()});
// the name goes with the gear: the set's name is your gear's (build.setName) while you wear it, and your gear's goes to the set
const altSwap=(c,i)=>{const b=buildOf(c),mine=setCopy(b),a=altOf(c,i),other=setCopy(a),nm=[b.setName,a.name].map(x=>String(x||"").trim());
  Object.assign(b,other);b.alts[i]={...(nm[0]?{name:nm[0]}:{}),...mine};if(nm[1])b.setName=nm[1];else delete b.setName};
$("altSwap").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0)return;altSwap(c,i);save();renderGearTable();renderAll()});
$("altDel").addEventListener("click",()=>{const c=C(),i=altIdx(c);if(i<0||altSaved(c,i)&&!confirm(`Remove ${altName(c,i)}?${i+1<altN(c)?" The sets after it move up one.":""}`))return;altDel(c,i);save();renderGearTable();renderAll()});
$("memClear").addEventListener("click",()=>{const c=C();if(!confirm("Forget the refine, cards and affixes remembered for the gear you took off?"))return;buildOf(c).mem={};save();renderGearTable();renderAll()});
