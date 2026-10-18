// ---- EXP & formulas tab: EXP tables, the formulas the calculator uses (with your numbers), element and size tables ----
const yours=f=>{try{const v=f();return v==null||v===""||(typeof v==="number"&&!isFinite(v))?"–":v}catch(e){return "–"}};
// alts: the "Yours" values worked out with each other gear set (same rows, same order), each shown in a column of its own
function refFormulas(alts=[]){const vals=[],c=C(),m=calcMob(),ok=STATS.every(k=>statVal(c,k)!=null),d=ok?derived(c):null,lv=num(c.baseLv),ab=aspdBaseOf(c);
  const sv=k=>statVal(c,k),ranged=RANGED.includes(c.weapon),mn=m?` (${esc(m.name)})`:"",need=f=>m?f(m):null;
  const grp=t=>`<tr class="grp"><td colspan="${3+alts.length}">${t}</td></tr>`;
  // f is the formula, n an optional short note shown under it
  const R=(name,f,y,n)=>{const v=yours(y),k=vals.length;vals.push(v);
    return `<tr><td class="name">${name}</td><td class="f">${f}${n?`<div class="fn">${n}</div>`:""}</td><td>${v}</td>${alts.map(a=>{const x=a[k]??"–";return `<td${x!==v?' class="chg"':""}>${x}</td>`}).join("")}</tr>`};
  const html=grp("Status window")+
   R("Status ATK",ranged?"floor(BaseLv/4 + DEX + STR/5 + LUK/3)":"floor(BaseLv/4 + STR + DEX/5 + LUK/3)",()=>d&&d.atk,ranged?"bow, instrument, whip":"melee; ranged weapons swap STR and DEX")+
   R("Status MATK","floor(BaseLv/4) + INT + floor(INT/2) + floor(DEX/5) + floor(LUK/3)",()=>d&&d.matk)+
   R("HIT","175 + BaseLv + DEX + floor(LUK/3)",()=>d&&d.hit)+
   R("FLEE","100 + BaseLv + AGI + floor(LUK/5)",()=>d&&d.flee)+
   R("Soft DEF","floor(BaseLv/2) + floor(VIT/2) + floor(AGI/5)",()=>d&&d.def)+
   R("Soft MDEF","floor(INT + BaseLv/4 + (DEX + VIT)/5)",()=>ok&&sv("int")!=null?Math.floor(sv("int")+lv/4+(sv("dex")+sv("vit"))/5):null)+
   R("CRIT","1 + LUK × 0.3 + BaseLv/100",()=>d&&d.crit.toFixed(1),"doubled with a katar")+
   R("ASPD1",`floor(job + weapon base − shield penalty − left weapon penalty + √(AGI²/2 + DEX²/${ranged?7:5}) / 4 + potion/skill value × AGI/200)`,()=>{if(!d||ab==null)return null;const sp=shieldPen(c);return `${ab}${sp?` − ${sp}`:""} + ${d.aspdTerm.toFixed(1)} → ${Math.floor(ab-sp+d.aspdTerm)} (${esc(c.weapon)})`},`shield penalty for ${esc(state.job)}: ${BUILD.SHIELD_ASPD[state.job]??"?"}; Assassin left weapon: dagger 10, one-handed sword or axe 12 (in the weapon base shown); potion/skill values: Concentration 4, Awakening 6, Berserk 9, Two-Hand / Spear Quicken and Adrenaline Rush 7 (6 from a party Blacksmith), Study 0.5 per level`)+
   // status-window mode: the typed ASPD already has gear in it; potions and buffs ticked here come on top (see applyConsumables)
   R("ASPD","floor(ASPD1 + (195 − ASPD1) × ASPD % + flat ASPD)",()=>c.mode==="build"?aspdEff():`${num(c.aspd,170)} (status window)${aspdEff()!==num(c.aspd,170)?` → ${aspdEff()} with potion / buffs`:""}`,"cap 190; ASPD % includes attack delay reduction")+
   R("Max HP","floor((floor(job HP(BaseLv) × (1 + VIT/100)) + gear HP) × (1 + HP %))",()=>num(cf("maxHp"))>0?fmtN(num(cf("maxHp"))):null)+
   R("Max SP","floor((floor(job SP(BaseLv) × (1 + INT/100)) + gear SP) × (1 + SP %))",()=>num(cf("maxSp"))>0?fmtN(num(cf("maxSp"))):null)+
   grp("Speed")+
   R("Attacks per second","50 / (200 − ASPD)",()=>`${atkPerSec().toFixed(2)} at ASPD ${aspdEff()}`)+
   R("Variable cast time","cast × (1 − √((2 × DEX + INT) / 530)) × (1 − cast %)",()=>sv("dex")!=null?`× ${vctFactor().toFixed(3)}`:null,"none once 2 × DEX + INT ≥ 530")+
   R("Fixed cast time","(fixed cast − flat reduction) × (1 − fixed cast %)",()=>null)+
   R("Interrupted casts","cast takes (e^(λ × cast) − 1) / λ, λ = its hits landing on you per second",()=>noBreak()?"off: Phen / Bloody Butterfly":castEff()>castSec()+0.005?`${castSec().toFixed(2)} s → ${castEff().toFixed(2)} s`:null,"a hit restarts the cast; no SP is spent on it")+
   R("Time per skill use","max(cast time + max(after-cast delay × (1 − after-cast delay %), cooldown), 1 / attacks per second)",()=>`${useSec().toFixed(2)} s (${esc(c.a.name||"attack")})`)+
   R("Foresight (Sage)","the same with half the variable cast time, + max(Foresight's 1 s fixed cast, 1 / attacks per second) / 5",()=>fsUsed()?`${fsUseSec().toFixed(2)} s instead of ${plainUseSec().toFixed(2)} s`:null,"only when it saves time")+
   grp("Damage")+
   R("Weapon ATK",`weapon ATK × (1 + ${ranged?"DEX":"STR"}/200)`,()=>{const P=atkParts();return P.weapon?fmtN(P.weapon):null},"weapon ATK includes refine")+
   R("Physical damage","floor((((weapon ATK × size % + equipment ATK) × (post bonuses + ATK %) × element % + 2 × status ATK × Neutral %) × skill % + mastery ATK × Neutral %) × full bonuses × (1 + ranged/melee %) × (1 + skill damage %) × (4000 + DEF) / (4000 + 10 × DEF) − monster soft DEF)",()=>m&&c.a.type!=="magic"&&c.a.type!=="spellfist"?`${fmtN(dmgPerHit(m))} per hit${mn}`:null,"at least 1; skill damage % counts for skills only; ATK % isn't in the status window's ATK and isn't multiplied with the post bonuses; status ATK counts once for a skill while dual-wielding")+
   R("Dual wield (Assassin)","right hand × (50 + 10 × Righthand Mastery Lv)% + left hand × (30 + 10 × Lefthand Mastery Lv)%, each after DEF; the left hand uses its own weapon ATK, size and element with status ATK once",()=>m&&dualHit()?`${fmtN(dmgPerHit(m))} + ${fmtN(leftDmg(m))}${mn}`:null,"basic attacks only, skills use the right hand; Double Attack repeats the right hand; masteries count as Lv 5 without a skill tree")+
   R("Magic damage","floor((MATK × skill % × damage bonuses × (1 + skill damage %) × (1000 + MDEF) / (1000 + 10 × MDEF) − monster soft MDEF) × element %)",()=>m&&(c.a.type==="magic"||c.a.type==="spellfist")?`${fmtN(dmgPerHit(m))} per hit${mn}`:null,"at least 1")+
   R("Damage bonuses","post: (1 + race %) × (1 + size %) × (1 + element %) × (1 + boss/normal %) × (1 + all %) × (1 + name bonus %) × (1 + vs normal monsters %) × (1 + my attack element %); full: (1 + extra damage %) × (1 + skill passives and buffs %)",()=>{if(!m)return null;const g=c.a.type==="magic"||c.a.type==="spellfist",b=bonusParts(m,g);return `post × ${b.post.toFixed(2)}, full × ${b.full.toFixed(2)}${mn}`},"bonuses in the same category add; name bonus only when the name matches; vs normal monsters not on bosses; magic also × (1 + gear magic % of the spell's element)")+
   R("Ignore DEF / MDEF","DEF × (1 − ignore %)",()=>{const d=ignOf("def",m),md=ignOf("mdef",m);return d||md?`${fmtP(d)}% / ${fmtP(md)}%${m?mn:""}`:null},"before the DEF factor; gear that ignores it for a race, size, element or boss / normal counts against that monster only")+
   R("Monster soft DEF","floor((monster Lv + VIT) / 2)",()=>need(x=>`${mobSoftDef(x)}${mn}`))+
   R("Monster soft MDEF","floor((monster Lv + INT) / 4)",()=>need(x=>`${mobSoftMdef(x)}${mn}`))+
   R("Hit chance","100 + HIT − monster's 100%-hit value",()=>need(x=>`${Math.round(hitChance(x))}%${mn}`),"5–100%; magic always hits")+
   R("Critical hit","chance = CRIT + gear CRIT vs its race − monster LUK × 0.2; damage × 1.4 × (1 + crit damage %)",()=>c.a.type==="auto"?`${(critChance(m)*100).toFixed(1)}%${mn}`:null,"basic attacks only; always hits")+
   grp("Kill speed")+
   R("Uses per kill","ceil(monster HP / damage per use) / hit chance",()=>need(x=>{const u=usesPerKill(x);return isFinite(u)?`${u.toFixed(1)}${mn}`:null}),"crits and card auto-casts are averaged in")+
   R("Damage per second","damage per use × hit chance × targets / seconds per use",()=>need(x=>{const v=dpsOf(x);return v==null?null:`${fmtN(Math.round(v))}${mn}`}))+
   R("Time per kill","uses per kill × seconds per use / targets",()=>need(x=>{const t=fightSec(x);return isFinite(t)?`${t.toFixed(1)} s${mn}`:null}),"longer when you stop to rest for SP")+
   grp("Defence and SP")+
   R("Dodge","95 + FLEE − monster's 95%-flee value",()=>need(x=>dodge(x)==null?null:`${Math.round(dodge(x))}%${mn}`),"0–95%")+
   R("Damage taken","(monster ATK × (4000 + hard DEF) / (4000 + 10 × hard DEF) − soft DEF) × (1 + race %) × (1 + element %) × (1 + boss/normal %)",()=>need(x=>mobHitDmg(x)==null?null:`${fmtN(mobHitDmg(x))} per hit${mn}`),"% is your damage taken from its race, element and boss/normal; at least 1")+
   R("Hits you can take","floor(Max HP / damage taken per hit)",()=>need(x=>{const h=mobHitDmg(x),hp=num(cf("maxHp"));return h&&hp>0?`${fmtN(Math.floor(hp/h))}${mn}`:null}),"from full HP")+
   R("Monsters on you","aggressive or assisting: the number you set (2), else 1; from 3, FLEE × (1 − 10% × (n − 2)) and DEF × (1 − 5% × (n − 2))",()=>need(x=>`${fmtP(crowdN(x))} at once${crowdN(x)>2?`, FLEE −${Math.round((1-crowdFlee(crowdN(x)))*100)}%, DEF −${Math.round((1-crowdDef(crowdN(x)))*100)}%`:""}${mn}`),"each one swings at you")+
   R("Poison","poisonings a second a = monsters × 1 / (delay + 1 / (swings × rate)) × hit × 120% × (20% × Lv × (1 − VIT %) − (LUK + Lv gap) / 10 points); poisoned aD / (1 + aD) of the time, D = 60 s × (1 − 0.75% × VIT) − LUK / 10 s",()=>need(x=>x.poison?`${Math.round(poisonUp(x)*100)}% of the time, ${fmtN(poisonHpPerSec())} HP/s${mn}`:null),"2 + 1.5% of Max HP a second (not below 25%), no natural HP / SP regen, VIT DEF −25%; rAthena pre-renewal")+
   R("Perfect Dodge","1 + floor(LUK/10) + gear Perfect Dodge",()=>sv("luk")!=null?`${1+Math.floor(sv("luk")/10)} + gear`:null,"physical attacks only")+
   R("HP regen","floor(VIT/5) + max(1, floor(Max HP/200)) every 6 s, × (1 + HP Recovery %)",()=>`${fmtN(hpRegen6())} / 6 s`,"standing still; none at 70% weight or more")+
   R("Increase HP Recovery","floor(Lv × (5 + 0.2% of Max HP)) every 10 s, on top of natural regen",()=>ihrPer10()?`${fmtN(ihrPer10())} / 10 s`:null,"Swordsman, Knight, Crusader; none at 70% weight or more")+
   R("SP regen","1 + floor(Max SP/100) + floor(INT/6) every 8 s; from INT 120 also + floor((INT − 120)/2) + 4",()=>`${fmtN(spRegen8())} / 8 s`,"none at 70% weight or more")+
   R("Increase SP Recovery","floor(Lv × (3 + 0.2% of Max SP)) every 10 s, on top of natural regen",()=>isrPer10()?`${fmtN(isrPer10())} / 10 s`:null,"Mage, Wizard, Sage; none at 70% weight or more")+
   R("Overcharge / Discount","sell = floor(NPC price × (1 + Overcharge %)); buy = NPC price × (1 − Discount %)",()=>{const o=skRate("overcharge"),d=recDisc()?DISC_LV10:0;return o||d?`+${o}% / −${d}%`:null},"Lv 1–10: 7, 9, 11, 13, 15, 17, 19, 21, 23, 24%")+
   R("Max Weight","2000 + job bonus + 30 × STR + 200 × (Enlarge Weight Limit Lv + Increase Capacity Lv)",()=>{const w=maxWCalc(c),t=num(c.maxW);return w?`${fmtN(w.total)} (job +${w.jb})${t>0&&t!==w.total?` · using your ${fmtN(t)}`:""}`:t>0?`using your ${fmtN(t)}`:null},"only STR points you put in count, not job, gear or buff STR; Increase Capacity comes from the KP shop's Gym Membership")+
   R("Weight","kills per trip = (Max Weight × sell point − weight now) / weight per kill; time per kill = seconds per kill + town trip / kills per trip",()=>{if(!wOn())return "type your Max Weight";const t=m&&tripInfo(m,walkSec());return t&&t.wk>0?(isFinite(t.kills)?`${fmtN(Math.floor(t.kills))} kills a trip${mn}`:"sell first"):`${fmtN(num(c.curW))} / ${fmtN(maxWt(c))}`},"at 70% weight HP and SP don't regenerate; at 90% you can't attack or use skills")+
   grp("EXP")+
   R("Even Share party","share = floor(monster EXP × (100% + 10% × (members − 1)) / members)",()=>`${100+partyBonus()}% ÷ ${partyN()} = ${partyPct()}% each`,"same map, within 15 base levels; the game splits by damage dealt, so a kill can be 1 EXP off")+
   R("Base EXP per kill","floor(share of base EXP × (1 + gear EXP % + gear EXP % vs its race + EXP bonus %))",()=>need(x=>`${fmtN(killExp(x))}${mn}`),"bonuses add up, they don't multiply; EXP bonus % is items and buffs that say \"EXP +X%\"")+
   R("Job EXP per kill","floor(share of job EXP × (1 + gear EXP % + gear EXP % vs its race + Job EXP bonus %))",()=>need(x=>`${fmtN(killJobExp(x))}${mn}`),"only \"Job EXP +X%\" counts here, not \"EXP +X%\"")+
   R("EXP / hour","EXP per kill × 3600 / (fight seconds + walking seconds)",()=>null)+
   grp("Loot")+
   R("Drop level penalty","gap = monster Lv − base Lv",()=>need(x=>dropGap(x)==null?null:`gap ${String(dropGap(x)).replace("-","−")}: ${penNote(x)||"no penalty"}${mn}`),"−19 or more: none; −40 or less: drops −50%; −20 to −39 isn't in the official guide, so none is counted")+
   R("Zeny per kill","loot value × (1 + drop bonus %) × (1 − level penalty %) + Σ (player price − NPC price) × min(100%, chance × (1 + drop bonus %) × (1 − level penalty %))",()=>need(x=>`${fmtN(zenyKill(x))} z${mn}`),"Σ over drops you price; with an auto-loot group unticked, only drops you loot count")+
   R("Skill items per hour","(items per use × price + zeny per use) × uses per kill ÷ monsters hit × kills/hr + support casts per kill × items × price × kills/hr + ground buffs: 3600 ÷ (60 s × Lv) casts/hr × price",()=>need(x=>{const h=useHour(x,walkSec());return h?`${fmtN(h.z)} z/hr${mn}`:"–"}),"taken off every zeny/hr with SP items and the ASPD potion; price = yours, else the NPC price, less Discount")+
   R("Zeny Hunter walking","walking per kill × √(spawns you can hurt / spawns you hunt)",()=>`${walkSec().toFixed(1)}s with every monster hunted`,"the nearest target is about 1 / √density away")+
   R("Zeny Hunter teleporting","extra teleports per kill = spawns you can hurt / spawns you hunt − 1",()=>canTele()?`${teleSec()}s per teleport (${creamyOn()?"Creamy Card":"Teleport skill"})`:"off: no Creamy Card or Teleport skill, so you walk","only with a free teleport, never Fly Wings; \"no teleport\" maps only walk");
  return {html,vals}}
// Even Share by party size, with your base and job EXP per kill of the picked monster for each size
function renderPartyTable(m){const s=cur(),n0=partyN(s),known=m&&!m.expUnknown,sz=n=>({...s,partyN:n});
  $("refPartyNote").textContent=known?`per ${m.name} with your EXP bonuses`:"pick a monster to see your EXP per kill";
  $("refPartyTable").tHead.innerHTML=`<tr><th>Members</th><th>Party total</th><th>Each</th>${known?"<th>Base EXP</th><th>Job EXP</th>":""}</tr>`;
  $("refPartyTable").tBodies[0].innerHTML=Array.from({length:12},(_,i)=>i+1).map(n=>`<tr${n===n0?' class="sel"':""}><td>${n===1?"Solo":n}</td><td>${100+partyBonus(sz(n))}%</td><td>${partyPct(sz(n))}%</td>${known?`<td>${fmtN(killExp(m,sz(n)))}</td><td>${fmtN(killJobExp(m,sz(n)))}</td>`:""}</tr>`).join("")}
// ---- your gear vs the other gear set: the numbers that decide a farming spot, against the monster you picked and on the map ----
const refShown=()=>!$("refFormulas").closest("[data-tab]").hidden;
// the map compared: the Map planner's, else the monster's best open map, else the session's (as the HP and SP items use)
const cmpMap=()=>{let mp=mapKey(state.map);if(!MAPMOBS[mp])mp=mobMap(calcMob())||currentMap();return MAPMOBS[mp]?mp:null};
function gearStats(){const m=calcMob(),w=walkSec(),mp=cmpMap(),o={atk:sumStat(cf("atkTxt")),matk:sumStat(cf("matkTxt")),hit:sumStat(cf("hitTxt")),flee:sumStat(cf("fleeTxt")),
    crit:num(cf("crit")),aspd:aspdEff(),hp:num(cf("maxHp")),sp:num(cf("maxSp"))};
  if(m){const r=mobRow(m,w);Object.assign(o,{dmg:withEl(r.el2,()=>dmgPerHit(m)+(dualHit()?leftDmg(m):0)),dps:withEl(r.el2,()=>dpsOf(m)),hitc:r.hitc,uses:r.uses,
    sec:r.sec,epm:m.expUnknown?null:r.epm,zph:r.zph,hpm:r.hpm})}
  const s=mp&&mapStats(mp,w);if(s)Object.assign(o,{mapEpm:s.epm,mapNet:s.net});return o}
// [key, label, higher is better, decimals, "m": against the monster / "map": on the map]
const GEAR_CMP=[["atk","ATK",1],["matk","MATK",1],["hit","HIT",1],["flee","FLEE",1],["crit","CRIT",1],["aspd","ASPD",1],["hp","Max HP",1],["sp","Max SP",1],
  ["dmg","Damage per hit",1,0,"m"],["dps","Damage per second",1,0,"m"],["hitc","Hits that land %",1,0,"m"],["uses","Uses per kill",0,1,"m"],["sec","Kill time (s)",0,1,"m"],
  ["epm","EXP / min",1,0,"m"],["zph","Net zeny / hr",1,0,"m"],["hpm","HP lost / min",0,0,"m"],["mapEpm","EXP / min",1,0,"map"],["mapNet","Net zeny / hr (after healing)",1,0,"map"]];
const cmpFmt=(v,d)=>v==null||!isFinite(v)?"–":d?(+v).toFixed(d):fmtN(v);
// sets: [{i, x: the character with set i on}]. Each set's column shows its value and the change from your gear; the best of a row is bold
function renderGearCmp(sets){const c=C(),T=$("gearCmpTable");T.hidden=!sets.length;
  if(!sets.length){$("gearCmpNote").textContent=!refShown()?"":c.mode!=="build"?"Switch to Build from gear (Character tab) and set up another gear set to compare it with your gear here."
    :"Pick Set 1, 2 or 3 above the gear table (Character tab) and set up the gear you want to compare with yours.";T.tHead.innerHTML=T.tBodies[0].innerHTML="";return}
  const mine=gearStats(),oth=sets.map(s=>withSnap(s.x,gearStats)),m=calcMob(),mp=cmpMap(),n=sets.length+2;
  $("gearCmpNote").innerHTML=sets.map(s=>`<b>Set ${s.i+1}</b>: ${altDiffTxt(c,s.i)}`).join("<br>")+(m?"":"<br>Pick a monster to compare damage, kill time and EXP / min");
  T.tHead.innerHTML=`<tr><th></th><th>Your gear</th>${sets.map(s=>`<th>Set ${s.i+1}</th>`).join("")}</tr>`;
  let grp="";
  T.tBodies[0].innerHTML=GEAR_CMP.filter(([k])=>mine[k]!=null||oth.some(o=>o[k]!=null)).map(([k,label,up,dp,g])=>{
    const a=mine[k],all=[a,...oth.map(o=>o[k])].filter(v=>v!=null&&isFinite(v)),tol=dp?0.5*10**-dp:0.5;
    const best=all.length>1&&Math.max(...all)-Math.min(...all)>=tol?(up?Math.max(...all):Math.min(...all)):null,b=v=>best!=null&&v!=null&&Math.abs(v-best)<tol?' class="best"':"";
    const cell=v=>{const ok=a!=null&&v!=null&&isFinite(a)&&isFinite(v),diff=ok?v-a:null,same=ok&&Math.abs(diff)<tol;
      const pc=ok&&!same&&a?` (${diff>0?"+":""}${(diff/Math.abs(a)*100).toFixed(1)}%)`:"",cls=same||diff==null?"muted":(diff>0)===!!up?"good":"bad";
      return `<td${b(v)}>${cmpFmt(v,dp)}<div class="d ${cls}">${same?"same":diff==null?"–":`${diff>0?"+":""}${cmpFmt(diff,dp)}${pc}`}</div></td>`};
    const h=g&&g!==grp?`<tr class="grp"><td colspan="${n}">${g==="m"?`vs ${esc(m.name)}`:`On ${esc(mapLabel(mp))}`}</td></tr>`:"";if(g)grp=g;
    return `${h}<tr><td class="name">${label}</td><td${b(a)}>${cmpFmt(a,dp)}</td>${oth.map(o=>cell(o[k])).join("")}</tr>`}).join("")}
function renderRef(){const c=C(),m=calcMob(),blv=num(c.baseLv),jl=num(c.jobLv),per=m?killExp(m):0,jper=m?killJobExp(m):0;
  const kills=(e,p=per)=>p>0?fmtN(Math.ceil(e/p)):"–",kh=m?`<th>Kills of ${esc(m.name)}</th>`:"";
  // EXP to next compared with the level before, e.g. the Lv 68 row says how much more Lv 68 → 69 takes than Lv 67 → 68
  const inc=(e,p)=>{if(!(e>0&&p>0))return "–";const v=(e/p-1)*100;return `${v<0?"−":"+"}${Math.abs(v).toFixed(1)}%`},
    ih='<th title="EXP to next compared with the level before">vs prev Lv</th>';
  $("refExpNote").textContent=m?(m.expUnknown?`no EXP data for ${m.name} yet`:`${fmtN(per)} base / ${fmtN(jper)} job EXP per ${m.name}`):"Pick a monster to see kills per level";
  let tot=0;const base=Object.keys(EXP_TABLE).map(Number).sort((a,b)=>a-b).map(l=>{const e=EXP_TABLE[l],row=`<tr${l===blv?' class="sel"':""}><td>${l}</td><td>${fmtN(e)}</td><td>${inc(e,EXP_TABLE[l-1])}</td><td>${fmtN(tot)}</td>${m?`<td>${kills(e)}</td>`:""}</tr>`;tot+=e;return row}).join("");
  $("refBaseTable").tHead.innerHTML=`<tr><th>Lv</th><th>EXP to next</th>${ih}<th>Total</th>${kh}</tr>`;$("refBaseTable").tBodies[0].innerHTML=base;
  const tier=Object.hasOwn(JOB_EXP,state.refTier)?state.refTier:jobTier(),t=JOB_EXP[tier],mine=tier===jobTier();tot=0;
  ROOTQ("[data-reftier]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.reftier===tier)));
  $("refJobTable").tHead.innerHTML=`<tr><th>Job Lv</th><th>Job EXP to next</th>${ih}<th>Total</th>${kh}</tr>`;
  $("refJobTable").tBodies[0].innerHTML=t.map((e,i)=>{const row=`<tr${mine&&i+1===jl?' class="sel"':""}><td>${i+1}</td><td>${i+1<t.length?fmtN(e):"max"}</td><td>${i+1<t.length?inc(e,t[i-1]):"–"}</td><td>${fmtN(tot)}</td>${m?`<td>${i+1<t.length?kills(e,jper):"–"}</td>`:""}</tr>`;tot+=e;return row}).join("");
  renderPartyTable(m);
  // other gear sets (Build from gear): worked out only while this tab shows, since each runs the model again
  const sets=refShown()?altList(c).map(i=>({i,x:altChar(c,i)})):[],av=sets.map(s=>withSnap(s.x,()=>refFormulas().vals));
  $("refFormulas").tHead.innerHTML=`<tr><th>Value</th><th>Formula</th><th>Yours</th>${sets.map(s=>`<th>Set ${s.i+1}</th>`).join("")}</tr>`;
  $("refFormulas").classList.toggle("withalt",sets.length>0);$("refFormulas").tBodies[0].innerHTML=refFormulas(av).html;renderGearCmp(sets);
  const elv=Math.min(4,Math.max(1,num(state.refElv,1)));$("refElv").value=String(elv);const defs=Object.keys(ET),my=atkEl();
  $("refElemTable").tHead.innerHTML=`<tr><th>Attack ↓ / monster →</th>${defs.map(d=>`<th>${d} ${elv}</th>`).join("")}</tr>`;
  $("refElemTable").tBodies[0].innerHTML=AE.map((a,i)=>`<tr${a===my?' class="sel"':""}><td class="name"><span class="el ${a}">${a}</span></td>${defs.map(d=>{const v=ET[d][elv-1][i];return `<td class="${v>100?"good":v<100?"bad":"muted"}">${v}</td>`}).join("")}</tr>`).join("");
  $("refSizeTable").tBodies[0].innerHTML=Object.entries(WEAPONS).map(([w,v])=>`<tr${w===c.weapon?' class="sel"':""}><td class="name">${esc(w)}</td>${v.map(x=>`<td class="${x>100?"good":x<100?"bad":"muted"}">${x}</td>`).join("")}</tr>`).join("");
}
// scroll each EXP table so your level is in view (only works while the tab is showing)
const refScroll=()=>["refBaseTable","refJobTable"].forEach(id=>{const t=$(id),r=t.querySelector("tbody tr.sel"),w=t.parentElement;if(r&&w.clientHeight)w.scrollTop=Math.max(0,r.offsetTop-w.clientHeight/3)});
ROOTQ("[data-reftier]").forEach(b=>b.addEventListener("click",()=>{state.refTier=b.dataset.reftier;save();renderRef();refScroll()}));
$("refElv").addEventListener("change",e=>{state.refElv=+e.target.value;save();renderRef()});
