// ---- EXP tables tab: base and job EXP per level, every base table the game has used and two of them side by side, party share.
// Formulas tab: the formulas the calculator uses (with your numbers), element and size tables ----
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
   R("Soft DEF","floor(BaseLv/2) + floor(VIT/2 + AGI/5)",()=>d&&d.def)+
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
   R("Magic damage","floor((MATK × (1 + MATK %) × skill % × damage bonuses × (1 + skill damage %) × (1000 + MDEF) / (1000 + 10 × MDEF) − monster soft MDEF) × element %)",()=>m&&(c.a.type==="magic"||c.a.type==="spellfist")?`${fmtN(dmgPerHit(m))} per hit${mn}`:null,"at least 1")+
   R("Hit low – high (Duple Light, Spell Fist)","low: the hit alone; high: every proc on the same hit (Duple Light's physical and magic orbs; Spell Fist's bolt and Hindsight's); average: each proc × its chance",()=>{const r=m&&hitRange(m);return r?`${fmtN(r.avg)} average, ${fmtN(r.lo)}–${fmtN(r.hi)} (${r.parts.map(([n,v])=>`${n} ${fmtN(v)}`).join(" + ")})${mn}`:null},"a hit that lands, no crit; the Duple Light physical orb rolls to hit again (counted at its hit chance in the average), the magic orb comes 50% of the time, Spell Fist Lv × 5% of swings")+
   R("Damage bonuses","post: (1 + race %) × (1 + size %) × (1 + element %) × (1 + boss/normal %) × (1 + all %) × (1 + name bonus %) × (1 + vs normal monsters %) × (1 + my attack element %); full: (1 + extra damage %) × (1 + skill passives and buffs %)",()=>{if(!m)return null;const g=c.a.type==="magic"||c.a.type==="spellfist",b=bonusParts(m,g);return `post × ${b.post.toFixed(2)}, full × ${b.full.toFixed(2)}${mn}`},"bonuses in the same category add; name bonus only when the name matches; vs normal monsters not on bosses; magic also × (1 + gear magic % of the spell's element)")+
   R("Ignore DEF / MDEF","DEF × (1 − ignore %)",()=>{const d=ignOf("def",m),md=ignOf("mdef",m);return d||md?`${fmtP(d)}% / ${fmtP(md)}%${m?mn:""}`:null},"before the DEF factor; gear that ignores it for a race, size, element or boss / normal counts against that monster only")+
   R("Monster soft DEF","floor((monster Lv + VIT) / 2)",()=>need(x=>`${mobSoftDef(x)}${mn}`))+
   R("Monster soft MDEF","floor((monster Lv + INT) / 4)",()=>need(x=>`${mobSoftMdef(x)}${mn}`))+
   R("Hit chance","100 + HIT − monster's 100%-hit value",()=>need(x=>`${Math.round(hitChance(x))}%${mn}`),"5–100%; magic always hits")+
   R("Critical hit","chance = CRIT + gear CRIT vs its race − monster LUK × 0.2; damage × 1.4 × (1 + crit damage %)",()=>c.a.type==="auto"||c.a.critHalf?`${(critChance(m)*100).toFixed(1)}%${mn}`:null,"basic attacks, plus Cannon Spear (your CRIT), Focused Arrow Strike and Soul Destroyer (half your CRIT), which get half the crit damage %; always hits")+
   grp("Kill speed")+
   R("Uses per kill","whole hits until the damage reaches the monster's HP (each a hit, a crit × 1.4 or a miss) / share of uses that land",()=>need(x=>{const u=usesPerKill(x);return isFinite(u)?`${u.toFixed(1)}${mn}`:null}),"1,085 HP at 300 a hit: 4 hits, 3 if two crit; card auto-casts are averaged into each hit")+
   R("Damage per second","damage per use × hit chance × targets / seconds per use",()=>need(x=>{const v=dpsOf(x);return v==null?null:`${fmtN(Math.round(v))}${mn}`}))+
   R("Time per kill","uses per kill × seconds per use / targets",()=>need(x=>{const t=fightSec(x);return isFinite(t)?`${t.toFixed(1)} s${mn}`:null}),"longer when you stop to rest for SP")+
   grp("Defence and SP")+
   R("Dodge","95 + FLEE − monster's 95%-flee value",()=>need(x=>dodge(x)==null?null:`${Math.round(dodge(x))}%${mn}`),"0–95%")+
   R("Damage taken","(monster ATK × (4000 + hard DEF) / (4000 + 10 × hard DEF) − soft DEF) × (1 + race %) × (1 + size %) × (1 + element %) × (1 + boss/normal %)",()=>need(x=>mobHitDmg(x)==null?null:`${fmtN(mobHitDmg(x))} per hit${mn}`),"% is your damage taken from its race, size, element and boss/normal, each cut counting down to −70% at most; at least 1")+
   R("Hits you can take","floor(Max HP / damage taken per hit)",()=>need(x=>{const h=mobHitDmg(x),hp=num(cf("maxHp"));return h&&hp>0?`${fmtN(Math.floor(hp/h))}${mn}`:null}),"from full HP")+
   R("Monsters on you","aggressive or assisting: the number you set (2), else 1; from 3, FLEE × (1 − 10% × (n − 2)) and DEF × (1 − 5% × (n − 2))",()=>need(x=>`${fmtP(crowdN(x))} at once${crowdN(x)>2?`, FLEE −${Math.round((1-crowdFlee(crowdN(x)))*100)}%, DEF −${Math.round((1-crowdDef(crowdN(x)))*100)}%`:""}${mn}`),"each one swings at you")+
   R("Poison","poisonings a second a = monsters × 1 / (delay + 1 / (swings × rate)) × hit × 120% × (20% × Lv × (1 − VIT %) − (LUK + Lv gap) / 10 points); poisoned aD / (1 + aD) of the time, D = 60 s × (1 − 0.75% × VIT) − LUK / 10 s",()=>need(x=>x.poison?`${Math.round(poisonUp(x)*100)}% of the time, ${fmtN(poisonHpPerSec())} HP/s${mn}`:null),"2 + 1.5% of Max HP a second (not below 25%), no natural HP / SP regen, VIT DEF −25%; rAthena pre-renewal")+
   R("Perfect Dodge","1 + floor(LUK/10) + gear Perfect Dodge",()=>sv("luk")!=null?`${1+Math.floor(sv("luk")/10)} + gear`:null,"physical attacks only; counts up to 70 at most")+
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
   R("Walking past skipped monsters (by zeny)","walking per kill × √(spawns you can hurt / spawns you hunt)",()=>`${walkSec().toFixed(1)}s with every monster hunted`,"the nearest target is about 1 / √density away")+
   R("Teleporting past skipped monsters (by zeny)","extra teleports per kill = spawns you can hurt / spawns you hunt − 1",()=>canTele()?`${teleSec()}s per teleport (${creamyOn()?"Creamy Card":"Teleport skill"})`:"off: no Creamy Card or Teleport skill, so you walk","only with a free teleport, never Fly Wings; \"no teleport\" maps only walk");
  return {html,vals}}
// Even Share by party size, with your base and job EXP per kill of the picked monster for each size
function renderPartyTable(m){const s=cur(),n0=partyN(s),known=m&&!m.expUnknown,sz=n=>({...s,partyN:n});
  $("refPartyNote").textContent=known?`per ${m.name} with your EXP bonuses`:"pick a monster to see your EXP per kill";
  $("refPartyTable").tHead.innerHTML=`<tr><th>Members</th><th>Party total</th><th>Each</th>${known?"<th>Base EXP</th><th>Job EXP</th>":""}</tr>`;
  $("refPartyTable").tBodies[0].innerHTML=Array.from({length:12},(_,i)=>i+1).map(n=>`<tr${n===n0?' class="sel"':""}><td>${n===1?"Solo":n}</td><td>${100+partyBonus(sz(n))}%</td><td>${partyPct(sz(n))}%</td>${known?`<td>${fmtN(killExp(m,sz(n)))}</td><td>${fmtN(killJobExp(m,sz(n)))}</td>`:""}</tr>`).join("")}
// ---- your gear vs the other gear set: the numbers that decide a farming spot, against the monster you picked and on the map ----
const refShown=()=>!$("refFormulas").closest("[data-tab]").hidden;
// the map compared: the session's (Where to farm), else the monster's best open map (as the HP and SP items use)
const cmpMap=()=>{let mp=currentMap();if(!MAPMOBS[mp])mp=mobMap(calcMob());return MAPMOBS[mp]?mp:null};
function gearStats(){const m=calcMob(),w=walkSec(),mp=cmpMap(),o={atk:sumStat(cf("atkTxt")),matk:matkOf(),hit:sumStat(cf("hitTxt")),flee:sumStat(cf("fleeTxt")),
    crit:num(cf("crit")),aspd:aspdEff(),hp:num(cf("maxHp")),sp:num(cf("maxSp"))};
  // Duple Light and Spell Fist: the average hit, with its low and high (hitRange)
  if(m){const r=mobRow(m,w),hr=withEl(r.el2,()=>hitRange(m));if(hr)Object.assign(o,{dmgLo:hr.lo,dmgHi:hr.hi});
    Object.assign(o,{dmg:hr?hr.avg:withEl(r.el2,()=>dmgPerHit(m)+(dualHit()?leftDmg(m):0)),dps:withEl(r.el2,()=>dpsOf(m)),hitc:r.hitc,uses:r.uses,
    sec:r.sec,epm:m.expUnknown?null:r.epm,zph:r.zph,hpm:r.hpm})}
  const s=mp&&mapStats(mp,w);if(s)Object.assign(o,{mapEpm:s.epm,mapNet:s.net});return o}
// [key, label, higher is better, decimals, "m": against the monster / "map": on the map]
const GEAR_CMP=[["atk","ATK",1],["matk","MATK",1],["hit","HIT",1],["flee","FLEE",1],["crit","CRIT",1],["aspd","ASPD",1],["hp","Max HP",1],["sp","Max SP",1],
  ["dmg","Damage per hit",1,0,"m"],["dps","Damage per second",1,0,"m"],["hitc","Hits that land %",1,0,"m"],["uses","Uses per kill",0,1,"m"],["sec","Kill time (s)",0,1,"m"],
  ["epm","EXP / min",1,0,"m"],["zph","Net zeny / hr",1,0,"m"],["hpm","HP lost / min",0,0,"m"],["mapEpm","EXP / min",1,0,"map"],["mapNet","Net zeny / hr (after healing)",1,0,"map"]];
const cmpFmt=(v,d)=>v==null||!isFinite(v)?"–":d?(+v).toFixed(d):fmtN(v);
// the other gear sets (Build from gear) next to your gear, on the Character tab: worked out only while that tab shows, since each set runs
// the model again. Each set's column shows its value and the change from your gear; the best of a row is bold
const gearCmpShown=()=>!$("gearCmpCard").closest("[data-tab]").hidden;
// With no other set yet it shows your gear's numbers alone
function renderGearCmp(){const c=C(),T=$("gearCmpTable"),shown=gearCmpShown(),sets=shown?altList(c).map(i=>({i,x:altChar(c,i)})):[];T.hidden=!shown;
  if(!shown){$("gearCmpNote").textContent="";T.tHead.innerHTML=T.tBodies[0].innerHTML="";return}
  const mine=gearStats(),oth=sets.map(s=>withSnap(s.x,gearStats)),m=calcMob(),mp=cmpMap(),n=sets.length+2;
  $("gearCmpNote").innerHTML=sets.length?sets.map(s=>`<b>${esc(altName(c,s.i))}</b>: ${altDiffTxt(c,s.i)}`).join("<br>"):c.mode==="build"?"+ Add set above the gear table to compare another set with yours.":"";
  T.tHead.innerHTML=`<tr><th></th><th>Your gear</th>${sets.map(s=>`<th>${esc(altName(c,s.i))}</th>`).join("")}</tr>`;
  let grp="";
  T.tBodies[0].innerHTML=GEAR_CMP.filter(([k])=>mine[k]!=null||oth.some(o=>o[k]!=null)).map(([k,label,up,dp,g])=>{
    const a=mine[k],all=[a,...oth.map(o=>o[k])].filter(v=>v!=null&&isFinite(v)),tol=dp?0.5*10**-dp:0.5;
    const best=all.length>1&&Math.max(...all)-Math.min(...all)>=tol?(up?Math.max(...all):Math.min(...all)):null,b=v=>best!=null&&v!=null&&Math.abs(v-best)<tol?' class="best"':"";
    // Damage per hit with a low and a high (Duple Light, Spell Fist): the average, then "low–high" under it
    const rng=x=>k==="dmg"&&x.dmgLo!=null?`<div class="d muted" title="Low: no proc · high: every proc on the same hit">${fmtN(x.dmgLo)}–${fmtN(x.dmgHi)}</div>`:"";
    const cell=(v,o)=>{const ok=a!=null&&v!=null&&isFinite(a)&&isFinite(v),diff=ok?v-a:null,same=ok&&Math.abs(diff)<tol;
      const pc=ok&&!same&&a?` (${diff>0?"+":""}${(diff/Math.abs(a)*100).toFixed(1)}%)`:"",cls=same||diff==null?"muted":(diff>0)===!!up?"good":"bad";
      return `<td${b(v)}>${cmpFmt(v,dp)}${rng(o)}<div class="d ${cls}">${same?"same":diff==null?"–":`${diff>0?"+":""}${cmpFmt(diff,dp)}${pc}`}</div></td>`};
    const h=g&&g!==grp?`<tr class="grp"><td colspan="${n}">${g==="m"?`vs ${esc(m.name)}`:`On ${esc(mapLabel(mp))}`}</td></tr>`:"";if(g)grp=g;
    return `${h}<tr><td class="name">${label}</td><td${b(a)}>${cmpFmt(a,dp)}${rng(mine)}</td>${oth.map(o=>cell(o[k],o)).join("")}</tr>`}).join("")}
// every base EXP table, oldest first: the ones in EXP_TABLE_LOG, then the current one. key: what state.expVer / expCmp hold; name: for
// the column heads; label: for the pickers, with the dates it was in use (each change came at a maintenance, dated in UTC)
function expVersions(){const d=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}),L=EXP_TABLE_LOG;
  const old=L.map((x,i)=>{const name=i?`${d(L[i-1].until)} – ${d(x.until)}`:`Before ${d(x.until)}`;return {key:String(i),table:x.table,name,label:name,note:x.note}});
  return [...old,{key:"cur",table:EXP_TABLE,name:"Current",label:L.length?`Current (since ${d(L[L.length-1].until)})`:"Current"}]}
// how a table grows: runs of levels where each level takes about the same multiple of the one before, and the single-level jumps
// between them ([{from,to,x}], from Lv 2). The tables are rounded to 100 EXP, so the low levels wobble round their multiple: a level
// stays in the run while its multiple is within 0.03 of the level before's, and a run's x is its average (geometric) multiple
function expGrowth(t){const ls=Object.keys(t).map(Number).filter(l=>t[l]>0&&t[l-1]>0).sort((a,b)=>a-b),out=[];
  for(const l of ls){const r=t[l]/t[l-1],g=out[out.length-1];
    if(g&&g.to===l-1&&Math.abs(r-g.last)<=0.03){g.to=l;g.last=r}else out.push({from:l,to:l,last:r})}
  return out.map(g=>({from:g.from,to:g.to,x:(t[g.to]/t[g.from-1])**(1/(g.to-g.from+1))}))}
// "Lv 2–50 ×1.15 each · Lv 51 ×5 · …"
const expGrowthTxt=t=>expGrowth(t).map(g=>`Lv ${g.from}${g.to>g.from?`–${g.to}`:""} ×${+g.x.toFixed(2)}${g.to>g.from?" each":""}`).join(" · ");
// past the older table's last level (top): the newer table's next level against it, then how the rest grow, e.g. "Past Lv 70 of
// Before 12 Nov 2026 (568,722,300): Current Lv 71 takes 577,729,800, ×1.02 that (+1.6%), then Lv 72–80 ×1.05 each. Lv 80: ×1.58 (+57.6%)"
function expPastTxt(O,N,top,on,nn){const p=O[top],ls=Object.keys(N).map(Number).filter(l=>l>top&&N[l]>0).sort((a,b)=>a-b),f=ls[0],e=ls[ls.length-1];
  const sub={};for(const l of ls)sub[l]=N[l];const rest=expGrowthTxt(sub);
  return `Past Lv ${top} of ${on} (${fmtN(p)} EXP): ${nn} Lv ${f} takes ${fmtN(N[f])}, ×${+(N[f]/p).toFixed(2)} that (${expPct(N[f],p)})`+
    (rest?`, then ${rest}`:"")+(e>f?`. Lv ${e}: ×${+(N[e]/p).toFixed(2)} (${expPct(N[e],p)})`:"")}
// "+20.0%" / "−87.6%": e against p, "–" without both
const expPct=(e,p)=>{if(!(e>0&&p>0))return "–";const v=(e/p-1)*100;return `${v<0?"−":"+"}${Math.abs(v).toFixed(1)}%`};
function renderExp(){const c=C(),m=calcMob(),blv=num(c.baseLv),jl=num(c.jobLv),per=m?killExp(m):0,jper=m?killJobExp(m):0;
  const kills=(e,p=per)=>e>0&&p>0?fmtN(Math.ceil(e/p)):"–",kh=m?`<th>Kills of ${esc(m.name)}</th>`:"";
  // EXP to next compared with the level before, e.g. the Lv 68 row says how much more Lv 68 → 69 takes than Lv 67 → 68
  const ih='<th title="EXP to next compared with the level before">vs prev Lv</th>';
  $("refExpNote").textContent=m?(m.expUnknown?`no EXP data for ${m.name} yet`:`${fmtN(per)} base / ${fmtN(jper)} job EXP per ${m.name}`):"Pick a monster to see kills per level";
  // the table picked (the current one unless you pick another) and the one it's compared with (none unless picked)
  const vs=expVersions(),v=vs.find(x=>x.key===state.expVer)||vs[vs.length-1],w=vs.find(x=>x.key===state.expCmp&&x!==v)||null;
  const opt=x=>`<option value="${esc(x.key)}">${esc(x.label)}</option>`;
  $("expVer").innerHTML=vs.map(opt).join("");$("expVer").value=v.key;
  $("expCmp").innerHTML=`<option value="">Nothing</option>`+vs.filter(x=>x!==v).map(opt).join("");$("expCmp").value=w?w.key:"";
  $("expVer").disabled=$("expCmp").disabled=vs.length<2;
  const lvs=t=>Object.keys(t).map(Number),sel=l=>l===blv?' class="sel"':"";
  if(!w){let tot=0;const A=v.table;
    $("refBaseTable").tHead.innerHTML=`<tr><th>Lv</th><th>EXP to next</th>${ih}<th>Total</th>${kh}</tr>`;
    $("refBaseTable").tBodies[0].innerHTML=lvs(A).sort((a,b)=>a-b).map(l=>{const e=A[l],row=`<tr${sel(l)}><td>${l}</td><td>${fmtN(e)}</td><td>${expPct(e,A[l-1])}</td><td>${fmtN(tot)}</td>${m?`<td>${kills(e)}</td>`:""}</tr>`;tot+=e;return row}).join("");
    $("expCmpNote").hidden=true;
    $("expGrowth").innerHTML=`<b>How it grows</b> (each level's EXP against the level before's): ${esc(expGrowthTxt(A))}`;
  }else{
    // side by side, the older table first; Change is the newer one against the older. Kills are for the table you picked
    const [o,n]=vs.indexOf(v)<vs.indexOf(w)?[v,w]:[w,v],O=o.table,N=n.table,all=[...new Set([...lvs(O),...lvs(N)])].sort((a,b)=>a-b);
    let to=0,tn=0;const cell=x=>x>0?fmtN(x):"–";
    $("refBaseTable").tHead.innerHTML=`<tr><th>Lv</th><th>${esc(o.name)}</th><th>${esc(n.name)}</th><th title="${esc(n.name)} against ${esc(o.name)}">Change</th><th>Total, ${esc(o.name)}</th><th>Total, ${esc(n.name)}</th>${m?`<th>Kills of ${esc(m.name)} (${esc(v.name)})</th>`:""}</tr>`;
    // the levels the newer table adds past the older one's last: their Change is against that last level (Current Lv 71–80 against
    // the Lv 70 before 12 November 2026), so you see how far past the old cap each one takes
    const oTop=Math.max(0,...lvs(O).filter(l=>O[l]>0)),past=l=>!(O[l]>0)&&N[l]>0&&l>oTop&&O[oTop]>0;
    const chg=(a,b,l)=>a>0&&b>0?(a===b?"same":expPct(b,a)):past(l)?`${expPct(b,O[oTop])} <span class="muted">vs Lv ${oTop}</span>`:a>0?"gone":"new";
    $("refBaseTable").tBodies[0].innerHTML=all.map(l=>{const a=O[l],b=N[l],r=past(l)?O[oTop]:a,ch=r>0&&b>0?b<r?"good":b>r?"bad":"muted":"muted";
      const tip=past(l)?` title="${esc(n.name)} Lv ${l} against Lv ${oTop}, the last level of ${esc(o.name)}"`:"";
      const row=`<tr${sel(l)}><td>${l}</td><td>${cell(a)}</td><td>${cell(b)}</td><td class="${ch}"${tip}>${chg(a,b,l)}</td><td>${a>0?fmtN(to):"–"}</td><td>${b>0?fmtN(tn):"–"}</td>${m?`<td>${kills(v.table[l])}</td>`:""}</tr>`;
      if(a>0)to+=a;if(b>0)tn+=b;return row}).join("");
    // the levels both tables have, from Lv 1 without a gap: what reaching the level past them took in each
    let top=0,so=0,sn=0;while(O[top+1]>0&&N[top+1]>0){top++;so+=O[top];sn+=N[top]}
    const nt=lvs(N).length-lvs(O).length;
    $("expCmpNote").innerHTML=top?`Lv 1 → ${top+1}: <b>${fmtN(so)}</b> EXP (${esc(o.name)}) → <b>${fmtN(sn)}</b> (${esc(n.name)}), ${expPct(sn,so)}`+
      (nt>0?`. ${esc(n.name)} goes ${nt} level${nt>1?"s":""} further`:nt<0?`. ${esc(o.name)} went ${-nt} level${nt<-1?"s":""} further`:"")+
      (past(oTop+1)?`<br>${esc(expPastTxt(O,N,oTop,o.name,n.name))}`:""):"";
    $("expCmpNote").hidden=!top;
    $("expGrowth").innerHTML=`<b>How each grows</b> (each level's EXP against the level before's):<br>${esc(o.name)}: ${esc(expGrowthTxt(O))}<br>${esc(n.name)}: ${esc(expGrowthTxt(N))}`;
  }
  const tier=Object.hasOwn(JOB_EXP,state.refTier)?state.refTier:jobTier(),t=JOB_EXP[tier],mine=tier===jobTier();let tot=0;
  ROOTQ("[data-reftier]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.reftier===tier)));
  $("refJobTable").tHead.innerHTML=`<tr><th>Job Lv</th><th>Job EXP to next</th>${ih}<th>Total</th>${kh}</tr>`;
  $("refJobTable").tBodies[0].innerHTML=t.map((e,i)=>{const row=`<tr${mine&&i+1===jl?' class="sel"':""}><td>${i+1}</td><td>${i+1<t.length?fmtN(e):"max"}</td><td>${i+1<t.length?expPct(e,t[i-1]):"–"}</td><td>${fmtN(tot)}</td>${m?`<td>${i+1<t.length?kills(e,jper):"–"}</td>`:""}</tr>`;tot+=e;return row}).join("");
  renderPartyTable(m);
}
function renderRef(){const c=C(),m=calcMob();
  // other gear sets (Build from gear): worked out only while this tab shows, since each runs the model again
  const sets=refShown()?altList(c).map(i=>({i,x:altChar(c,i)})):[],av=sets.map(s=>withSnap(s.x,()=>refFormulas().vals));
  $("refFormulas").tHead.innerHTML=`<tr><th>Value</th><th>Formula</th><th>Yours</th>${sets.map(s=>`<th>${esc(altName(c,s.i))}</th>`).join("")}</tr>`;
  $("refFormulas").classList.toggle("withalt",sets.length>0);$("refFormulas").tBodies[0].innerHTML=refFormulas(av).html;renderGearCmp();
  const elv=Math.min(4,Math.max(1,num(state.refElv,1)));$("refElv").value=String(elv);const defs=Object.keys(ET),my=atkEl();
  $("refElemTable").tHead.innerHTML=`<tr><th>Attack ↓ / monster →</th>${defs.map(d=>`<th>${d} ${elv}</th>`).join("")}</tr>`;
  $("refElemTable").tBodies[0].innerHTML=AE.map((a,i)=>`<tr${a===my?' class="sel"':""}><td class="name"><span class="el ${a}">${a}</span></td>${defs.map(d=>{const v=ET[d][elv-1][i];return `<td class="${v>100?"good":v<100?"bad":"muted"}">${v}</td>`}).join("")}</tr>`).join("");
  $("refSizeTable").tBodies[0].innerHTML=Object.entries(WEAPONS).map(([w,v])=>`<tr${w===c.weapon?' class="sel"':""}><td class="name">${esc(w)}</td>${v.map(x=>`<td class="${x>100?"good":x<100?"bad":"muted"}">${x}</td>`).join("")}</tr>`).join("");
}
// scroll each EXP table so your level is in view (only works while the tab is showing)
const expScroll=()=>["refBaseTable","refJobTable"].forEach(id=>{const t=$(id),r=t.querySelector("tbody tr.sel"),w=t.parentElement;if(r&&w.clientHeight)w.scrollTop=Math.max(0,r.offsetTop-w.clientHeight/3)});
ROOTQ("[data-reftier]").forEach(b=>b.addEventListener("click",()=>{state.refTier=b.dataset.reftier;save();renderExp();expScroll()}));
$("expVer").addEventListener("change",e=>{state.expVer=e.target.value;save();renderExp();expScroll()});
$("expCmp").addEventListener("change",e=>{state.expCmp=e.target.value;save();renderExp();expScroll()});
$("refElv").addEventListener("change",e=>{state.refElv=+e.target.value;save();renderRef()});
