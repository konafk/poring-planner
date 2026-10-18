// ---- build simulator: in "build" mode the stat fields are computed from base stats + gear (build.js) and shown read-only ----
// "Check against the game": [key, label, computed total]
// compared with what the build computes (BUILD_LAST), not with c, since typed Max HP / SP replace the computed ones
const CHECKS=[["atk","ATK",F=>sumStat(F.atkTxt)],["matk","MATK",F=>sumStat(F.matkTxt)],["hit","HIT",F=>sumStat(F.hitTxt)],["flee","FLEE",F=>sumStat(F.fleeTxt)],
  ["aspd","ASPD",F=>F.aspd],["def","DEF",F=>sumStat(F.defTxt)],["hp","Max HP",F=>F.maxHp],["sp","Max SP",F=>F.maxSp]];
const BUILT_IDS=["atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","lw","lwAtk","lwElem","crit","critDmg","rangePct","skillPct","vctPct","fctPct","acdPct","ignDef","ignMdef","st_str","st_agi","st_vit","st_dex","st_luk","weapon","wElem"];
let BUILD_LAST=null;
const buildOf=c=>{if(!c.build)c.build={base:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},gear:{}};return c.build};
// the other gear set (build.alt: gear, stones, special like the build's own), worked out for the EXP & formulas tab only.
// c.gearEdit "alt": the gear table edits it instead of your gear
const altOf=c=>{const b=buildOf(c);if(!b.alt||typeof b.alt!=="object")b.alt={};if(!b.alt.gear||typeof b.alt.gear!=="object")b.alt.gear={};return b.alt};
const editAlt=(c=C())=>c.mode==="build"&&c.gearEdit==="alt";
const gearSet=(c=C())=>editAlt(c)?altOf(c):buildOf(c);
function applyBuild(){const c=C();if(c.mode!=="build"){BUILD_LAST=null;c.bx=eqToBx(c);return}
  const r=BUILD.compute({...buildOf(c),baseLv:c.baseLv,jobLv:c.jobLv,extra:[...consLines().lines,...(SKFX?[...SKFX.stat,...SKFX.buffStat]:[]),...aspdBuffLines(c)]},state.job,aspdBase);BUILD_LAST=r;const F=r.fields,A=r.acc;
  // skill-specific gear lines count when the attack's name contains the skill
  const nm=String(c.a.name||"").toLowerCase(),match=o=>Object.entries(o).reduce((t,[k,v])=>t+(nm.includes(k.toLowerCase())?v:0),0);
  const top=o=>Object.entries(o).reduce((t,[k,v])=>nm.includes(k.toLowerCase())?Math.max(t,v):t,0); // fixed cast %: only the highest counts
  Object.assign(c,{atkTxt:F.atkTxt,matkTxt:F.matkTxt,hitTxt:F.hitTxt,fleeTxt:F.fleeTxt,defTxt:F.defTxt,intTxt:F.intTxt,wAtk:F.wAtk,crit:F.crit,critDmg:F.critDmg,
    rangePct:F.rangePct,skillPct:A.skill+match(A.skillOf),vctPct:F.vctPct+match(A.vctOf),fctPct:Math.max(F.fctPct,top(A.fctOf)),acdPct:F.acdPct,ignDef:F.ignDef,ignMdef:F.ignMdef,
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
// Blessing of Yggdrasil (World Tree Dew or Zelstar, 1 hour): all stats +7, ATK +30, MATK +30, HIT +5, FLEE +5 (in-game Yggdrasil Staff
// tooltip; Landgris ROCalculator has HIT / FLEE +30, which is wrong for Zero)
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
// Ragnarok Zero event consumables (30 minutes each), added as rows you can edit; values from the in-game tooltips (Ragnarok Zero Global),
// which win over Landgris ROCalculator where they differ (Premium Course Meal is ATK / MATK +20 there, not +30). note: what isn't counted
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
// stacking as in Landgris ROCalculator: stat food (the + column) and Blessing of Yggdrasil don't add up, the higher one counts per stat;
// course meals, event drinks and other rows stack on top
// clans (Ragnarok Zero Global; Midgard Hub's new player guide, the same as iRO Wiki's Clan System): a buff that stays on while you're
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
// lv: [min, max, default, label]; fx(level) -> bonus lines; eff: what it does, when the lines don't say it plainly; how: where the numbers come from
const PBUFF=[
  {k:"blessing",name:"Blessing",lv:[1,10,10],fx:l=>[["str",l],["int",l],["dex",l],["hit",2*l]]},
  {k:"clementia",name:"Clementia (Priest)",lv:[1,70,50,"Priest Job Lv"],fx:j=>{const v=10+Math.floor(j/10);return [["str",v],["int",v],["dex",v]]},
    how:"Blessing Lv 10 + Priest Job Lv/10"},
  {k:"incAgi",name:"Increase AGI",lv:[1,10,10],fx:l=>[["agi",2+l],["aspd_percent",l]]},
  {k:"angelus",name:"Angelus",lv:[1,10,10],fx:l=>[["hp",50*l]],how:"Zero's skill text; its VIT DEF +5% per level isn't counted"},
  {k:"canto",name:"Canto Candidus (Priest)",fx:()=>[["agi",19],["aspd_percent",17]]},
  {k:"riff",name:"Impressive Riff (Bard)",lv:[1,10,10],fx:l=>[["aspd_percent",l===10?20:1+2*(l-1)]]},
  {k:"adren",name:"Adrenaline Rush (from a Blacksmith)",w:AXE_MACE,fx:()=>[["aspd_mod",6],["aspd_percent",10]],eff:"potion/skill value 6, ASPD +10%; axes and maces"}];
const pbuffOf=c=>{if(!c.pbuffs||typeof c.pbuffs!=="object")c.pbuffs={};return c.pbuffs};
const pbLv=(b,o)=>b.lv?Math.min(b.lv[1],Math.max(b.lv[0],num(o.lv,b.lv[2]))):0;
// what it does at level lv (the level you typed, else the default)
const pbEff=(b,lv=b.lv?b.lv[2]:0)=>b.eff||b.fx(lv).map(([t,v])=>t==="aspd_percent"?`ASPD +${v}%`:t==="aspd_mod"?`potion/skill value ${v}`:t==="hp"?`Max HP +${v}`:`${t.toUpperCase()} +${v}`).join(", ")+(b.how?` (${b.how})`:"");
// a buff counts when ticked and it fits your weapon. It doesn't stack with the same buff switched on in your Skills card, and
// Clementia replaces Blessing, Canto Candidus replaces Increase AGI
const PB_SELF={blessing:"blessing",incAgi:"increase-agility",adren:"adrenaline-rush"},PB_OVER={blessing:"clementia",incAgi:"canto"};
const pbTicked=(k,c)=>!!(pbuffOf(c)[k]||{}).on;
const pbOn=(b,c)=>{if(!pbTicked(b.k,c)||(b.w&&!b.w.includes(c.weapon)))return false;const own=PB_SELF[b.k];
  if(own&&(c.buffs||{})[own]&&skLv(c,own))return false;return !(PB_OVER[b.k]&&pbTicked(PB_OVER[b.k],c))};
function aspdBuffLines(c=C()){const out=[];if(c.potOn){const k=potKey(c);if(k)out.push(["aspd_mod",null,null,ASPD_POT[k].mod])}
  PBUFF.forEach(b=>{if(pbOn(b,c))b.fx(pbLv(b,pbuffOf(c)[b.k])).forEach(([t,v])=>out.push([t,null,null,v]))});return out}
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
  const atkSt=as+d("atk"),atkGear=f((ag+g("atk"))*(1+g("atk_percent")/100));
  const matkSt=ms+d("matk"),matkTot=f((matkSt+mg+g("matk"))*(1+g("matk_percent")/100));
  // ASPD as in build.js: stat term and potion/skill value × AGI/200 go into ASPD1, then ASPD % and flat ASPD, rounded down
  let aspd=num(c.aspd,170)+d("aspdTerm")+g("aspd_mod")*(statVal(tmp,"agi")||0)/200;aspd=Math.min(190,Math.floor(aspd+(195-aspd)*g("aspd_percent")/100+g("aspd")));
  const vit0=statVal(c,"vit"),vit1=statVal(tmp,"vit"),int0=statVal(c,"int"),int1=statVal(tmp,"int");
  const hp=num(c.maxHp)>0?f((num(c.maxHp)*(vit0!=null?(100+vit1)/(100+vit0):1)+g("hp"))*(1+g("hp_percent")/100)):c.maxHp;
  const sp=num(c.maxSp)>0?f((num(c.maxSp)*(100+int1)/(100+int0)+g("sp"))*(1+g("sp_percent")/100)):c.maxSp;
  EFF={atkTxt:`${atkSt}+${atkGear}`,matkTxt:`${matkSt}+${matkTot-matkSt}`,hitTxt:String(sumStat(c.hitTxt)+d("hit")+g("hit")),fleeTxt:String(sumStat(c.fleeTxt)+d("flee")+g("flee")),
    defTxt:`${ds+d("def")}+${dh+g("def")}`,crit:num(c.crit)+d("crit")+g("crit"),aspd,maxHp:hp,maxSp:sp,st:tmp.st,intTxt:tmp.intTxt}}
function renderCons(){const c=C(),cs=consStatOf(c);
  $("consStats").tBodies[0].innerHTML=STAT6_UI.map(k=>{const o=cs[k]||{};return `<tr data-cs="${k}"><td>${k.toUpperCase()}</td>
    <td><input data-f="n" type="number" step="1" value="${esc(o.n??"")}" placeholder="0" aria-label="${k.toUpperCase()} +"></td>
    <td><input data-f="p" type="number" step="1" value="${esc(o.p??"")}" placeholder="0" aria-label="${k.toUpperCase()} +%"></td></tr>`}).join("");
  OWN_LISTS.forEach(L=>$(L.list).innerHTML=rowsOf(c,L.key).map((r,i)=>`<div class="eqrow" data-i="${i}">
    <input type="checkbox" data-f="on" ${r.on?"checked":""} aria-label="Use it" style="width:auto">
    <input data-f="name" value="${esc(r.name||"")}" placeholder="name" style="width:150px">
    <input data-f="eff" value="${esc(r.eff||"")}" placeholder="e.g. ATK +20, HIT +10, ASPD +10%" style="flex:1;min-width:200px">
    <button type="button" class="small danger" data-del aria-label="Remove">✕</button></div>`).join("")||(L.key==="cons"?'<div class="note">None yet.</div>':""));consNote()}
// redrawn on every render (job and weapon change what's allowed), except while you're typing in it
function renderAspdBuffs(){const c=C(),k=potKey(c),act=document.activeElement;$("consOff").hidden=c.mode==="build"||addOnTop(c);
  $("clanSel").value=CLANS[c.clan]?c.clan:"";$("clanInfo").textContent=(CLANS[c.clan]?clanEff(CLANS[c.clan]):"two stats +1, Max HP +30, Max SP +10")+(c.mode==="build"?"":" · build mode only: your status window already shows it");
  if(act!==$("potType"))$("potType").innerHTML=Object.entries(ASPD_POT).filter(([key])=>potJobOk(key)).map(([key,p])=>{const lvOk=potLvOk(key);
    return `<option value="${key}"${key===k?" selected":""}${lvOk?"":" disabled"}>${p.name} (${p.mod})${lvOk?"":` · Base Lv ${p.lv}+`}</option>`}).join("");
  if(!$("pbuffList").contains(act))$("pbuffList").innerHTML=PBUFF.map(b=>{const o=pbuffOf(c)[b.k]||{},off=b.w&&!b.w.includes(c.weapon),own=PB_SELF[b.k]&&(c.buffs||{})[PB_SELF[b.k]]&&skLv(c,PB_SELF[b.k]);
    return `<div class="eqrow" data-pb="${b.k}"><label class="bar" style="flex-direction:row;gap:6px;min-width:250px"><input type="checkbox" data-f="on" ${o.on?"checked":""} style="width:auto">${esc(b.name)}</label>
    ${b.lv?`<label class="bar" style="flex-direction:row;gap:4px">${b.lv[3]||"Lv"} <input data-f="lv" type="number" min="${b.lv[0]}" max="${b.lv[1]}" value="${pbLv(b,o)}" style="width:60px"></label>`:""}
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
  ["all","Damage to all monsters",true],["myEle","Magic damage of an element (your spells)"],["critRace","CRIT when attacking race",false,true],["takenRace","Damage taken from race"],["takenEle","Damage taken from element"],["takenKind","Damage taken from boss / normal"],
  ["ignRace","Ignore DEF / MDEF of race",true],["ignSize","Ignore DEF / MDEF of size",true],["ignEle","Ignore DEF / MDEF of element",true],["ignKind","Ignore DEF / MDEF of boss / normal",true],
  ["exp","EXP gained from monsters"],["expRace","EXP gained from race"],["spCost","Skill SP consumption"],["spRec","SP recovery (natural regen)"],["hpRec","HP recovery (natural regen)"]];
const EQ_TARGETS={race:()=>RACES,size:()=>[["S","Small"],["M","Medium"],["L","Large"]],ele:()=>AE,kind:()=>[["boss","Boss"],["normal","Normal"]],group:()=>[["Boulder Dwarf","Boulder Dwarves"]],
  ignRace:()=>RACES,ignSize:()=>EQ_TARGETS.size(),ignEle:()=>AE,ignKind:()=>EQ_TARGETS.kind(),myEle:()=>AE,critRace:()=>RACES,takenRace:()=>RACES,takenEle:()=>AE,takenKind:()=>[["boss","Boss"],["normal","Normal"]],expRace:()=>RACES};
// older saves had one race / size / element box each; turn them into rows once
const eqOf=c=>{if(!Array.isArray(c.eq))c.eq=[];
  [["raceSel","racePct","raceType","race"],["sizeSel","sizePct","sizeType","size"],["elSel","elPct","elType","ele"]].forEach(([s,p,t,by])=>{
    if(c[s]&&num(c[p]))c.eq.push({by,t:c[s],ch:c[t]||"both",v:num(c[p])});delete c[s];delete c[p];delete c[t]});return c.eq};
const IGN_BY={ignRace:"race",ignSize:"size",ignEle:"ele",ignKind:"kind"};
function eqToBx(c){const o={phys:{all:0,race:{},size:{},ele:{},kind:{},group:{}},magic:{all:0,race:{},size:{},ele:{},kind:{},group:{}},myEle:{},critRace:{},taken:{race:{},ele:{},kind:{}},exp:{all:0,race:{}},spCost:0,spRec:0,hpRec:0,
    ign:{def:{race:{},size:{},ele:{},kind:{}},mdef:{race:{},size:{},ele:{},kind:{}}}};
  const add=(m,k,v)=>{m[k]=(m[k]||0)+v};
  eqOf(c).forEach(r=>{const v=num(r.v);if(!v)return;
    if(["race","size","ele","kind","group"].includes(r.by)){if(r.ch!=="magic")add(o.phys[r.by],r.t,v);if(r.ch!=="phys")add(o.magic[r.by],r.t,v)}
    else if(r.by==="all"){if(r.ch!=="magic")o.phys.all+=v;if(r.ch!=="phys")o.magic.all+=v}
    // ignore rows: Physical is DEF, Magic is MDEF
    else if(IGN_BY[r.by]){if(r.ch!=="magic")add(o.ign.def[IGN_BY[r.by]],r.t,v);if(r.ch!=="phys")add(o.ign.mdef[IGN_BY[r.by]],r.t,v)}
    else if(r.by==="myEle")add(o.myEle,r.t,v);else if(r.by==="critRace")add(o.critRace,r.t,v);else if(r.by.startsWith("taken"))add(o.taken[{takenRace:"race",takenEle:"ele",takenKind:"kind"}[r.by]],r.t,v);
    else if(r.by==="exp")o.exp.all+=v;else if(r.by==="expRace")add(o.exp.race,r.t,v);else if(r.by==="spCost")o.spCost+=v;else if(r.by==="spRec")o.spRec+=v;else if(r.by==="hpRec")o.hpRec+=v});return o}
// "Fill from gear": the lines the gear saved in Build from gear gives (gear, cards, affixes, stones, Taming Ring, other special
// equipment; not consumables or buffs), one row per bonus. A bonus with different physical and magic values gets a row for each
const setSaved=b=>{const sp=b.special||{};return Object.keys(b.gear||{}).length>0||Object.values(b.stones||{}).some(Boolean)||!!sp.ring||(sp.own||[]).length>0};
const gearSaved=c=>setSaved(c.build||{});
function gearEqRows(c){const A=BUILD.compute({...buildOf(c),baseLv:c.baseLv,jobLv:c.jobLv,extra:[]},state.job,aspdBase).acc,rows=[];
  const add=(by,t,v,ch="both")=>{v=Math.round(v*100)/100;if(v)rows.push({by,t,ch,v})};
  const both=(by,t,p,m)=>{if(p===m)add(by,t,p);else{add(by,t,p,"phys");add(by,t,m,"magic")}};
  ["race","size","ele","kind","group"].forEach(by=>new Set([...Object.keys(A.phys[by]),...Object.keys(A.magic[by])]).forEach(t=>both(by,t,A.phys[by][t]||0,A.magic[by][t]||0)));
  both("all","",A.phys.all,A.magic.all);
  Object.entries(IGN_BY).forEach(([by,k])=>new Set([...Object.keys(A.ign.def[k]),...Object.keys(A.ign.mdef[k])]).forEach(t=>both(by,t,A.ign.def[k][t]||0,A.ign.mdef[k][t]||0)));
  Object.entries(A.myEle).forEach(([t,v])=>add("myEle",t,v));Object.entries(A.critRace).forEach(([t,v])=>add("critRace",t,v));
  [["race","takenRace"],["ele","takenEle"],["kind","takenKind"]].forEach(([k,by])=>Object.entries(A.taken[k]).forEach(([t,v])=>add(by,t,v)));
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
// the name a card gives its gear in the equipment window ("Healing" for Vitata Card), so the boxes also take what a screenshot shows
const cardName=c=>typeof CARDNAMES!=="undefined"&&CARDNAMES[c.id]||"";
const readGear=(slot,text,items)=>BUILD.readGearName(text,items||gearChoices(slot),it=>cardChoices(slot,it),cardName);
// random options: a list per option the item rolled, plus an empty one to add the next (any item takes up to OPT_MAX). Each list holds
// the affixes the row's gear rolls (BUILD.optChoices: a weapon by its type, also in the Shield row; every option for parts rozerodb has
// no pool for), with its min–max on the value box. An option saved before that this gear can't roll stays, listed under "Saved"
const OPT_HTML={};
const optList=ch=>{const gs=[...new Set(ch.map(o=>o.g))];
  return gs.map(g=>`<optgroup label="${esc(g)}">${ch.filter(o=>o.g===g).map(o=>`<option value="${o.k}">${esc(o.label)}${o.range?` (${o.range[0]}${o.range[1]!==o.range[0]?"–"+o.range[1]:""})`:""}</option>`).join("")}</optgroup>`).join("")};
function optBoxes(slot,g,it){const ch=BUILD.optChoices(slot,it),gk=BUILD.optGear(slot,it)||"all",list=OPT_HTML[gk]||(OPT_HTML[gk]=optList(ch)),rows=BUILD.optRows(g.opts);
  const one=(x,i)=>{const o=x&&ch.find(c=>c.k===x.k),saved=x&&!o?BUILD.OPTIONS.find(c=>c.k===x.k):null,r=o&&o.range;
    return `<div class="opt"><select data-opt="${i}"><option value="">${x?"remove":"+ affix"}</option>${saved?`<optgroup label="Saved"><option value="${saved.k}">${esc(saved.label)}</option></optgroup>`:""}${list}</select>${x?`<input data-optv="${i}" type="number" step="any"${r?` min="${r[0]}" max="${r[1]}" placeholder="${r[0]}–${r[1]}" title="${esc(o.label)}: ${r[0]}–${r[1]}"`:""} value="${esc(x.v??"")}">`:""}</div>`};
  return `<div class="opts">${rows.map(one).join("")}${rows.length<BUILD.OPT_MAX?one(null,rows.length):""}</div>`}
// costume enchant stones: a list per costume slot, each stone with what it gives
const STONE_FX={str:"STR",agi:"AGI",vit:"VIT",int:"INT",dex:"DEX",luk:"LUK",crit:"CRIT",hit:"HIT",flee:"FLEE",def:"DEF",mdef:"MDEF",hp:"MaxHP",sp:"MaxSP",aspd:"ASPD",
  atk:"ATK",matk:"MATK",damage_percent:"Physical damage %",hp_recovery_percent:"HP recovery %",attack_delay_percent:"After-attack delay %",atk_percent:"ATK %",matk_percent:"MATK %",hp_percent:"MaxHP %",sp_percent:"MaxSP %",crit_damage_percent:"Critical damage %",cast_time_variable_percent:"Variable cast %"};
const stoneFx=x=>x.off&&!x.b.length?x.off:x.b.map(([t,k,g,v])=>{const l=k==="size"?`Damage vs ${g} %`:t==="damage_taken_percent"?`${g[0].toUpperCase()+g.slice(1)} resist %`:STONE_FX[t]||t,pc=/ %$/.test(l);
  if(t==="damage_taken_percent")v=-v;return `${l.replace(/ %$/,"")} ${v>0?"+":""}${v}${pc?"%":""}`}).join(", ");
// the Taming Ring (Special Equipment, Accessory Right) holds one pet egg enchant; "none" = no ring or an empty one
function renderStones(){const b=gearSet(),sel=b.stones||{},ring=(b.special||{}).ring,all=typeof STONES!=="undefined"?STONES:[],eggs=typeof TAMING_EGGS!=="undefined"?TAMING_EGGS:[];
  $("stoneRow").innerHTML=BUILD.STONE_SLOTS.map(z=>`<label>Costume ${z.label.toLowerCase()} stone<select data-stone="${z.k}"><option value="">none</option>${all.filter(x=>x.slot===z.k)
    .map(x=>`<option value="${x.id}"${+sel[z.k]===x.id?" selected":""}>${esc(x.name.replace(/ \((Upper|Middle|Lower|Garment)\)$/,""))}: ${esc(stoneFx(x))}</option>`).join("")}</select></label>`).join("")+
    `<label>Taming Ring pet egg<select data-ring="1"><option value="">none</option>${eggs.map(x=>`<option value="${x.id}"${+ring===x.id?" selected":""}>${esc(x.name)}: ${esc([x.b.length?stoneFx({b:x.b}):"",x.off||""].filter(Boolean).join(", "))}</option>`).join("")}</select></label>`;renderSpecialOwn()}
// other special equipment: rows {on, name, opts} in b.special.own, each with up to OPT_MAX effects from the full affix list
const specialOwn=()=>{const b=gearSet();b.special=b.special||{};if(!Array.isArray(b.special.own))b.special.own=[];return b.special.own};
function renderSpecialOwn(){$("specialOwn").innerHTML=specialOwn().map((x,i)=>`<div class="eqrow" data-i="${i}">
    <input type="checkbox" data-f="on" ${x.on!==false?"checked":""} aria-label="Wearing it" style="width:auto">
    <input data-f="name" value="${esc(x.name||"")}" placeholder="name" style="width:180px">${optBoxes("special",x,null)}
    <button type="button" class="small danger" data-del aria-label="Remove">✕</button></div>`).join("");
  specialOwn().forEach((x,i)=>BUILD.optRows(x.opts).forEach((o,j)=>{const el=$("specialOwn").querySelector(`[data-i="${i}"] [data-opt="${j}"]`);if(el)el.value=o.k}))}
$("specialAdd").addEventListener("click",()=>{specialOwn().push({on:true,name:"",opts:[]});save();renderSpecialOwn();renderAll();
  $("specialOwn").querySelector(".eqrow:last-child [data-f=name]")?.focus()});
$("specialOwn").addEventListener("click",e=>{if(!e.target.closest("[data-del]"))return;specialOwn().splice(+e.target.closest(".eqrow").dataset.i,1);save();renderSpecialOwn();renderAll()});
$("specialOwn").addEventListener("change",e=>{if(e.target.dataset.opt==null)return;const row=e.target.closest(".eqrow"),x=specialOwn()[+row.dataset.i],rows=BUILD.optRows(x.opts),i=+e.target.dataset.opt,v=e.target.value;
  if(!v)rows.splice(i,1);else rows[i]={k:v,v:rows[i]?rows[i].v:""};x.opts=rows;save();renderSpecialOwn();renderAll();
  if(v)$("specialOwn").querySelector(`[data-i="${row.dataset.i}"] [data-optv="${i}"]`)?.focus()});
$("specialOwn").addEventListener("input",e=>{const row=e.target.closest(".eqrow");if(!row)return;const x=specialOwn()[+row.dataset.i],f=e.target.dataset.f;
  if(f)x[f]=f==="on"?e.target.checked:e.target.value;
  else if(e.target.dataset.optv!=null){const rows=BUILD.optRows(x.opts),o=rows[+e.target.dataset.optv];if(!o)return;o.v=e.target.value===""?"":num(e.target.value);x.opts=rows}else return;
  save();renderAll()});
$("stoneRow").addEventListener("change",e=>{const b=gearSet();
  if(e.target.dataset.ring){b.special=b.special||{};if(e.target.value)b.special.ring=+e.target.value;else delete b.special.ring;save();renderAll();return}
  const k=e.target.dataset.stone;if(!k)return;b.stones=b.stones||{};
  if(e.target.value)b.stones[k]=+e.target.value;else delete b.stones[k];save();renderAll()});
function renderGearTable(){const c=C(),b=gearSet(c);GEAR_LISTS={};let lists="";
  const rows=BUILD.SLOTS.map(s=>{const g0=b.gear[s.k]||{},items=gearChoices(s.k),cards=cardChoices(s.k,g0.id&&BUILD.item(g0.id));GEAR_LISTS["g_"+s.k]=pickList(items);GEAR_LISTS["c_"+s.k]=pickList(cards);
    lists+=`<datalist id="gl_${s.k}">${[...GEAR_LISTS["g_"+s.k].keys()].map(n=>`<option value="${esc(n)}">`).join("")}</datalist><datalist id="cl_${s.k}">${[...GEAR_LISTS["c_"+s.k]].map(([n,id])=>{const p=cardName({id});return `<option value="${esc(n)}"${p?` label="${esc(p)}"`:""}>`}).join("")}</datalist>`;
    const g=b.gear[s.k]||{},it=g.id&&BUILD.item(g.id),label=n=>{const x=BUILD.item(n);return x?labelOf(x,cards):""};
    const cardBoxes=it&&it.slots?Array.from({length:it.slots},(_,i)=>`<input data-card="${i}" list="cl_${s.k}" placeholder="card" title="The card (Vitata), or the name it gives the item in game (Healing)" value="${esc(g.cards&&g.cards[i]?label(g.cards[i]):"")}">`).join(""):"";
    const refinable=it&&s.k!=="ammo"; // every part: some accessories and headgear refine though the data has no schedule for them
    return `<tr data-slot="${s.k}"><td>${s.k==="shield"&&state.job==="Assassin"?"Shield / left hand":s.label}</td><td><input class="item" list="gl_${s.k}" placeholder="${items.length?"none":"no items for this job"}" title="The item, or its name from the equipment window (+7 Healing Shining Clip) or with its cards (+7 Shining Clip Vitata): sets the refine and cards too" value="${esc(it?labelOf(it,items):"")}"></td>
      <td>${refinable?`<input class="ref" type="number" min="0" max="20" value="${num(g.refine)}">`:""}</td><td><div class="cards">${cardBoxes}</div></td>
      <td>${it?optBoxes(s.k,g,it):""}</td></tr>`}).join("");
  $("gearTable").tBodies[0].innerHTML=rows;$("gearLists").innerHTML=lists;renderStones();
  BUILD.SLOTS.forEach(s=>{const g=b.gear[s.k];if(g)BUILD.optRows(g.opts).forEach((x,i)=>{const el=$("gearTable").querySelector(`tr[data-slot="${s.k}"] [data-opt="${i}"]`);if(el)el.value=x.k})})}
function renderBuild(){const c=C(),on=c.mode==="build";
  if(on&&renderBuild.job!==state.job){renderBuild.job=state.job;renderGearTable()}if(!on)renderBuild.job=null;
  ROOTQ("[data-cmode]").forEach(x=>x.setAttribute("aria-checked",String(x.dataset.cmode===(on?"build":"status"))));
  $("buildPanel").hidden=!on;$("statNote").hidden=on;$("shieldRow").hidden=on;$("onTopWrap").hidden=on;$("addOnTop").checked=c.addOnTop!==false;BUILT_IDS.forEach(id=>{const el=$(id);el.disabled=on;if(on&&document.activeElement!==el)el.value=id.startsWith("st_")?(c.st||{})[id.slice(3)]??"":c[id]??""});
  $("modeNote").textContent=on?"Stats below are worked out from your base stats, job level and gear.":"Type the numbers from your in-game status window.";
  if(!on)return;renderAltBar(c);const b=buildOf(c);ROOTQ("[data-bs]").forEach(x=>{if(document.activeElement!==x)x.value=b.base[x.dataset.bs]??""});
  const r=BUILD_LAST;if(!r)return;const jb=r.jobBonus;
  $("jobBonusNote").textContent=`Job Lv ${r.fields.jobLv} bonus: `+BUILD.STAT6.map(k=>`${k.toUpperCase()} +${jb[k]}`).join(" · ")+(BUILD.curve(state.job,"hp",num(c.baseLv))==null?" · no HP/SP table for this job, type Max HP/SP after switching back":"");
  // check against the game: type the in-game totals, see the difference per stat
  const ck=b.check||{},rows=CHECKS.map(([k,label,get])=>{const mine=get(r.fields),g=ck[k];const d=g!=null&&g!==""&&mine!=null?num(g)-mine:null;
    return `<label>${label}<span class="bar"><input data-ck="${k}" type="number" value="${esc(g??"")}" placeholder="${mine??"–"}" style="flex:1;min-width:0">${d==null?"":`<span class="${Math.abs(d)<0.5?"good":"bad"}">${d===0?"✓":(d>0?"+":"")+fmtP(+d.toFixed(1))}</span>`}</span></label>`}).join("");
  if(!$("checkGrid").contains(document.activeElement))$("checkGrid").innerHTML=rows;
  // cards the Character tab's Cards rows model: they count once ticked there
  // the other gear set's own notes while the table shows it
  const un=editAlt(c)?(x=>x?withSnap(x,()=>BUILD_LAST.unmodelled):[])(altChar(c)):r.unmodelled;
  const inRow=x=>CARD_ROW.some(n=>x.startsWith(n+":")),tick=un.filter(inRow),rest=un.filter(x=>!inRow(x));
  $("buildNote").innerHTML=(rest.length?`<b>Not counted</b> (procs, conditional or unsupported lines):<br>${rest.map(esc).join("<br>")}`:"")+
    (tick.length?`${rest.length?"<br>":""}<b>Tick in the Cards rows</b> (Character tab, under the attack) to count: ${tick.map(x=>esc(x.split(":")[0])).join(", ")}`:"")}
const CARD_ROW=["Hunter Fly Card","Sidewinder Card","Creamy Card","Dracula Card","Dark Priest Card",...Object.values(KILL_SP).map(n=>n+" Card")];
// switching to build keeps a copy of the typed status-window values, and switching back restores them
const SNAP_KEYS=["shield","atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","lw","lwAtk","lwElem","crit","critDmg","rangePct","skillPct","vctPct","fctPct","acdPct","ignDef","ignMdef","weapon","wElem","st"];
ROOTQ("[data-cmode]").forEach(x=>x.addEventListener("click",()=>{const c=C(),to=x.dataset.cmode,from=c.mode==="build"?"build":"status";if(to===from)return;
  if(to==="build")c.statusSnap=JSON.parse(JSON.stringify(Object.fromEntries(SNAP_KEYS.map(k=>[k,c[k]??null]))));
  else if(c.statusSnap){SNAP_KEYS.forEach(k=>{const v=c.statusSnap[k];if(v==null)delete c[k];else c[k]=v});delete c.statusSnap}
  c.mode=to;save();if(to==="build")renderGearTable();renderAll();syncChar()}));
ROOTQ("[data-bs]").forEach(x=>x.addEventListener("input",()=>{buildOf(C()).base[x.dataset.bs]=num(x.value)||1;save();renderAll()}));
$("gearTable").addEventListener("change",e=>{const tr=e.target.closest("tr[data-slot]");if(!tr)return;const k=tr.dataset.slot,b=gearSet(),g=b.gear[k]||(b.gear[k]={});
  if(e.target.classList.contains("item")){const v=e.target.value.trim();const id=GEAR_LISTS["g_"+k].get(v);
    // not on the list: read it as the equipment window names it, refine and cards included
    const r=id==null&&v?readGear(k,v):null;
    if(!v){delete b.gear[k]}else if(id!=null){if(g.id!==id){g.id=id;g.cards=[];g.refine=0}}
    else if(r){if(r.refine!=null)g.refine=r.refine;else if(g.id!==r.id)g.refine=0;if(g.id!==r.id||r.cards.length)g.cards=r.cards;g.id=r.id}else{e.target.value=g.id?e.target.defaultValue:"";return}
    save();renderGearTable();renderAll();return}
  // picking an option keeps its value; "remove" drops it. The rows replace any text typed before the lists
  if(e.target.dataset.opt!=null){const rows=BUILD.optRows(g.opts),i=+e.target.dataset.opt,v=e.target.value;
    if(!v)rows.splice(i,1);else rows[i]={k:v,v:rows[i]?rows[i].v:""};g.opts=rows;save();renderGearTable();renderAll();
    if(v)$("gearTable").querySelector(`tr[data-slot="${k}"] [data-optv="${i}"]`)?.focus();return}
  if(e.target.dataset.card!=null){const v=e.target.value.trim(),id=GEAR_LISTS["c_"+k].get(v),i=+e.target.dataset.card;g.cards=g.cards||[];
    if(!v)g.cards[i]=null;else if(id!=null)g.cards[i]=id;
    else{// card names as the game shows them ("Double Healing", or the whole item name): fill this box and the ones after it
      const it=BUILD.item(g.id),ids=BUILD.readCardNames(v,cardChoices(k,it),cardName)||(readGear(k,v,[it])||{}).cards;
      if(!ids||!ids.length){e.target.value="";return}ids.slice(0,Math.max(0,(it.slots||0)-i)).forEach((c,j)=>g.cards[i+j]=c);save();renderGearTable();renderAll();return}
    save();renderAll()}});
$("checkGrid").addEventListener("input",e=>{const k=e.target.dataset.ck;if(!k)return;const b=buildOf(C());b.check=b.check||{};
  if(e.target.value==="")delete b.check[k];else b.check[k]=num(e.target.value);save();renderAll();
  // refresh just the difference marks while typing, so the box keeps focus
  CHECKS.forEach(([kk,,get])=>{const inp=$("checkGrid").querySelector(`[data-ck="${kk}"]`),mark=inp.nextElementSibling,g=b.check[kk],mine=BUILD_LAST?get(BUILD_LAST.fields):null;
    const d=g!=null&&mine!=null?g-mine:null;if(mark)mark.remove();if(d!=null)inp.insertAdjacentHTML("afterend",`<span class="${Math.abs(d)<0.5?"good":"bad"}">${d===0?"✓":(d>0?"+":"")+fmtP(+d.toFixed(1))}</span>`)})});
$("gearTable").addEventListener("input",e=>{if(e.target.dataset.optv!=null){const g=gearSet().gear[e.target.closest("tr").dataset.slot];if(!g)return;
    const rows=BUILD.optRows(g.opts),x=rows[+e.target.dataset.optv];if(x){x.v=e.target.value===""?"":num(e.target.value);g.opts=rows;save();renderAll()}return}
  if(!e.target.classList.contains("ref"))return;const k=e.target.closest("tr").dataset.slot;const g=gearSet().gear[k];if(!g)return;
  g.refine=Math.max(0,Math.min(20,num(e.target.value)));save();renderAll()});
// ---- the other gear set: the gear table edits it after "Other gear set" is picked; your gear stays what the page works with, and the
// EXP & formulas tab works both out side by side. "Swap" makes it your gear (and yours the other set), so you can switch back ----
const altSaved=c=>c.mode==="build"&&!!(c.build&&c.build.alt)&&setSaved(c.build.alt);
// your character with the other set on instead of your gear (base stats, skills and buffs stay); the in-game Max HP / SP typed
// under "Check against the game" are for your gear, so they don't count for it
const altChar=(c=C())=>{if(!altSaved(c))return null;const x=JSON.parse(JSON.stringify(c)),a=x.build.alt;
  x.build={...x.build,gear:a.gear||{},stones:a.stones||{},special:a.special||{},check:{}};delete x.build.alt;delete x.gearEdit;return x};
const SET_KEYS=["gear","stones","special"];
const setCopy=b=>JSON.parse(JSON.stringify(Object.fromEntries(SET_KEYS.map(k=>[k,b[k]||{}]))));
const gearTxt=g=>{const it=g&&g.id&&BUILD.item(g.id);if(!it)return "none";const n=(g.cards||[]).filter(Boolean).map(id=>(BUILD.item(id)||{}).name).filter(Boolean);
  return `${num(g.refine)?`+${num(g.refine)} `:""}${it.name}${n.length?` [${n.join(", ")}]`:""}`};
// what the other set changes: "Weapon: Pike → +7 Zweihander" per gear row (affixes count as a change too), then the special equipment
function altDiff(c=C()){const b=buildOf(c),a=altOf(c),g0=b.gear||{},g1=a.gear||{},same=(x,y)=>JSON.stringify(x||null)===JSON.stringify(y||null);
  const rows=BUILD.SLOTS.filter(s=>!same(g0[s.k],g1[s.k])).map(s=>`${esc(s.label)}: ${esc(gearTxt(g0[s.k]))} → <b>${esc(gearTxt(g1[s.k]))}</b>${gearTxt(g0[s.k])===gearTxt(g1[s.k])?" (affixes)":""}`);
  if(!same(b.stones||{},a.stones||{})||!same(b.special||{},a.special||{}))rows.push("Special equipment");return rows}
function renderAltBar(c=C()){const alt=editAlt(c),has=altSaved(c);
  ROOTQ("[data-gset]").forEach(x=>x.setAttribute("aria-checked",String((x.dataset.gset==="alt")===alt)));$("buildPanel").classList.toggle("altedit",alt);
  $("altSwap").disabled=!has;const d=has?altDiff(c):[];
  $("altNote").innerHTML=(alt?"<b>Editing the other gear set.</b> The page still works with your gear. ":"")+
    (has?(d.length?d.join(" · "):"Same as your gear")+" · compare them on the EXP &amp; formulas tab":alt?"Pick its gear below, or copy yours in and change a part.":"A second set of gear, worked out next to yours on the EXP &amp; formulas tab.")}
ROOTQ("[data-gset]").forEach(x=>x.addEventListener("click",()=>{const c=C();if(x.dataset.gset==="alt")c.gearEdit="alt";else delete c.gearEdit;save();renderGearTable();renderAll()}));
$("altCopy").addEventListener("click",()=>{const c=C();if(altSaved(c)&&altDiff(c).length&&!confirm("Replace the other gear set with a copy of your gear?"))return;
  buildOf(c).alt=setCopy(buildOf(c));save();renderGearTable();renderAll()});
const altSwap=(c=C())=>{const b=buildOf(c),mine=setCopy(b),other=setCopy(altOf(c));Object.assign(b,other);b.alt=mine};
$("altSwap").addEventListener("click",()=>{altSwap();save();renderGearTable();renderAll()});
