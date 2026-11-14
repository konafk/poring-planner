// ---- render: character ----
// card tick boxes: a card's numbers only show while it's ticked
const syncCardOpts=()=>ROOTQ(".cdItem").forEach(r=>{const b=r.querySelector('input[type="checkbox"][data-cd]'),o=r.querySelector(".cdOpts");if(b&&o)o.hidden=!b.checked});
// in build mode the Cards rows follow your gear: a box is ticked when the card is slotted, and locked; Hunter Fly's and Dracula's
// copies are the ones in your gear. Status window mode shows your own ticks
const syncCardRows=()=>{const c=C(),b=c.mode==="build",cd=CRD(),ks=killSpOn(),why="Build mode: on when this card is slotted in your gear";
  ROOTQ('input[type="checkbox"][data-cd]').forEach(i=>{i.checked=b?cdOn(i.dataset.cd):!!cd[i.dataset.cd];i.disabled=b;i.title=b?why:""});
  [["hfN",HUNTER_FLY],["dracN",DRACULA]].forEach(([k,id])=>ROOTQ(`[data-cd="${k}"]`).forEach(i=>{i.disabled=b;
    if(b)i.value=cardsInGear(c,[id]);else if(document.activeElement!==i)i.value=cd[k]??""}));
  ROOTQ("[data-cdkill]").forEach(i=>{i.checked=ks.includes(i.dataset.cdkill);i.disabled=b;i.title=b?why:""});
  syncCardOpts()};
// status-window mode: a two-handed weapon closes the shield tick box and the left hand
function handsUi(c){const both=BUILD.twoHanded(c.weapon);$("shield").checked=!!c.shield&&!both;$("shield").disabled=both;$("lw").disabled=both;
  $("shieldNote").textContent=both?`${c.weapon}: it takes both hands, so no shield${state.job==="Assassin"?" or left-hand weapon":""}`:`${state.job} shield penalty: ASPD −${BUILD.SHIELD_ASPD[state.job]??"?"}${state.job==="Assassin"?"; it replaces a left-hand weapon":""}. Ticking or unticking moves the ASPD above`}
const syncChar=()=>{
  const c=C();$("job").value=noChar()?"":state.job;renderEq();renderCons();
  $("preset").innerHTML=JOBS[state.job].p.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join("")+'<option value="-1">Custom</option>';
  $("preset").value=String(c.preset??0);renderSkills();
  ["baseLv","jobLv","atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","fctSec","normalPct","myElPct","ignDef","ignMdef","mastery","rangePct","skillPct","crit","critDmg","fixedShare","vctPct","fctPct","acdPct","dmgBonus","atkPct","nameSel","namePct","itemSp","itemPrice","itemHp","itemHpPrice","mobInterval","hitScale"].forEach(k=>$(k).value=c[k]??"");["curW","maxW","gymLv"].forEach(k=>$(k).value=num(c[k])>0?c[k]:"");$("townMin").value=c.townMin??3;$("sellAt").value=num(c.sellAt)>0?c.sellAt:"";$("wAtk").value=num(c.wAtk)>0?c.wAtk:"";
  $("spRegen").value=num(c.spRegen)>0?c.spRegen:"";$("hpRegen6").value=num(c.hpRegen6)>0?c.hpRegen6:"";
  $("weapon").value=c.weapon;$("wElem").value=c.wElem;$("dualRow").hidden=state.job!=="Assassin";$("lw").value=c.lw||"";$("lwElem").value=c.lwElem||"Neutral";$("lwAtk").value=num(c.lwAtk)>0?c.lwAtk:"";handsUi(c);$("nameType").value=c.nameType||"phys";$("autoSp").checked=!!c.autoSp;{const o=`<option value="">none</option><option value="auto">best per monster / map</option>${convEls().map(el=>`<option value="${el}">${/converter/.test(convName(el))?convName(el):`${el} · ${convName(el)}`}</option>`).join("")}`;if($("convSel").innerHTML!==o)$("convSel").innerHTML=o}$("convSel").value=!c.converters?"":convFixed()||"auto";$("potOn").checked=!!c.potOn;$("potPrice").value=c.potPrice??2200;$("potMin").value=c.potMin??30;potInfo();$("yggOn").checked=!!c.yggOn;$("convNote").textContent=c.converters&&c.a.el!=="W"?"(this attack has its own element, so these don't change it)":"";
  const a=c.a;$("aType").value=a.type;$("aPct").value=a.pct;$("aHits").value=a.hits;$("aElem").value=a.el;$("aCast").value=a.cast;$("aDelay").value=a.delay;$("aSp").value=a.sp;$("aTargets").value=a.targets;$("aZeny").value=a.zeny||"";$("cartW").value=c.cartW||"";$("cartWrap").hidden=!num(a.cart);
  {const ac=AC();$("acSpell").innerHTML=Object.keys(AC_SPELLS).map(n=>`<option>${esc(n)}</option>`).join("");$("acOn").checked=!!ac.on;$("acSpell").value=ac.spell;$("acLv").value=ac.lv;$("acPct").value=ac.pct}
  $("bonus").value=state.bonus;$("jobBonus").value=num(state.jobBonus);
  {const cd=CRD();ROOTQ("[data-cd]").forEach(i=>{const k=i.dataset.cd;if(i.type!=="checkbox")i.value=cd[k]??""})}
  $("dpWrap").hidden=state.job!=="Sage";
  $("killSpBoxes").innerHTML=Object.entries(KILL_SP).map(([r,n])=>`<label class="bar"><input type="checkbox" data-cdkill="${esc(r)}"> <b>${esc(n)}</b> (${esc(r)})</label>`).join("");
  syncCardRows();
  $("ecRow").hidden=!EC_JOBS.includes(state.job);{const e=ECO();ROOTQ("[data-ec]").forEach(i=>{const k=i.dataset.ec;if(i.type==="checkbox")i.checked=!!e[k];else i.value=e[k]??""})}
  $("sagePanel").hidden=state.job!=="Sage";if(state.job==="Sage"){const g=G();ROOTQ("[data-sg]").forEach(i=>{const k=i.dataset.sg;if(i.type==="checkbox")i.checked=!!g[k];else i.value=g[k]??""});ROOTQ("[data-sgbolt]").forEach(i=>i.checked=!!g.bolts[i.dataset.sgbolt])}STATS.forEach(k=>$("st_"+k).value=(c.st&&c.st[k])||"");renderStatNote();
  if(typeof secNavSync==="function")secNavSync();
};
// EXP gear lines at the max base level: base EXP no longer counts (gear EXP still raises job EXP until the max job level)
const eqMaxNote=()=>{const t=!atMaxLv()?"":num(C().jobLv)>=jobMax()?"Max level: no effect":"Max level: no effect on base EXP (still raises job EXP)";ROOTQ("[data-eqmax]").forEach(el=>el.textContent=t)};
// the picked monster: how many are on you, what that does to FLEE and DEF, and how much of the time it keeps you poisoned
function crowdInfo(){const c=C(),m=calcMob();if(document.activeElement!==$("crowd"))$("crowd").value=c.crowd??"";
  if(!m){$("crowdInfo").textContent="";return}const n=crowdN(m),pz=poisonUp(m);
  $("crowdInfo").textContent=`vs ${m.name}: ${m.agg||m.assist?`${m.agg?"aggressive":"assists its kind"}, possible rampage of ${fmtP(n)}`:"fights you alone"}${n>2?` (FLEE −${Math.round((1-crowdFlee(n))*100)}%, DEF −${Math.round((1-crowdDef(n))*100)}%)`:""}${m.poison?` · poisons you ${Math.round(pz*100)}% of the time: −${fmtN(poisonHpPerSec())} HP/s, no HP or SP regen then`:""}`}
// Your numbers starts with what you farm for: the time a kill takes, damage per second, EXP and zeny on the session's map or monster
// (the bottom dock on narrower screens shows only these). The attack's own numbers (time per attack or cast, SP) follow them; walking
// is in the kill time's line, and where it comes from in its tooltip
function charOutTiles(){const m=calcMob(),tile=(k,v,sub,tip)=>`<div class="tile out"${tip?` title="${esc(tip)}"`:""}><div class="k">${k}</div><div class="v mono">${v}</div><div class="s">${sub}</div></div>`;
  const dpsTile=(d,sub)=>d!=null&&isFinite(d)?tile("Damage / s",fmtN(Math.round(d)),sub):"";
  const far='<a href="#session" data-gotab="track" data-goto="farmCard">Where to farm</a>';
  if(!charSet())return `<div class="tile out wide"><div class="k">No stats yet</div><div class="s">Fill in your stats below to see your kill time, EXP and zeny</div></div>`;
  if(!m)return `<div class="tile out wide"><div class="k">No monster picked</div><div class="s">Press "Farm here" in ${far} on the Session tab to see your kill time, EXP and zeny</div></div>`;
  // a whole map farmed (Farm here) and no one monster picked: the map's mix, the numbers Where to farm ranked it by
  {const ss=cur(),mp=sessMap(ss),r=!state.calcMobId&&sessMobs(ss).length>1&&mp?mapStats(mp,walkSec()):null;
    if(r&&isFinite(r.secT))return tile(`on ${esc(mapName(mp)||mapCode(mp))}`,`${r.secT.toFixed(1)}s`,`a kill: ${r.sec.toFixed(1)}s fighting + ${(r.secT-r.sec).toFixed(1)}s walking${r.sell>0.05?" and selling":""}`,walkSrcTxt())+
      dpsTile(mapDps(mp,walkSec(),r.el2),"while fighting, averaged over the map's monsters, misses included")+
      tile("EXP / min",fmtN(r.epm),`${fmtN(r.epk)} EXP a kill`)+tile("Zeny / hr",fmtN(r.net),"net: loot after HP and SP items")}
  const r=mobRow(m,walkSec());if(!r||!isFinite(r.tot))return `<div class="tile out wide"><div class="k">vs ${esc(m.name)}</div><div class="v mono">can't hurt it</div><div class="s">Check your attack and its element</div></div>`;
  // damage per second while fighting it, with the element the EXP/min picks (none for Spell Fist, which has no single damage per use)
  const dps=withEl(r.el2,()=>dpsOf(m));
  return tile(`vs ${esc(m.name)}`,`${r.tot.toFixed(1)}s`,`a kill: ${r.sec.toFixed(1)}s fighting + ${(r.tot-r.sec).toFixed(1)}s walking`,walkSrcTxt())+
    dpsTile(dps,`vs its ${fmtN(m.hp)} HP, misses included`)+
    tile("EXP / min",m.expUnknown?"?":fmtN(r.epm)+(m.expUnsure?"*":""),m.expUnknown?"no EXP data for it yet":`${m.expUnsure?"* EXP unconfirmed · ":""}job ${fmtN(r.jpm)} / min`)+
    tile("Zeny / hr",fmtN(r.zph),"loot after skill and SP items")}
function renderChar(){renderAspdBuffs();potInfo();eqMaxNote();crowdInfo();
  // weapon endows vs the monster you picked: the element-table rate of each one, and the one the EXP/min picks
  // the items in use, each with its icon and what players pay for it (bought from players), and how many an hour; skills (Enchant Poison) with
  // their SP. Not while you type in a price
  if(!$("convItems").contains(document.activeElement))$("convItems").innerHTML=C().converters?(convFixed()?[convFixed()]:convEls()).map(el=>{
    if(!CONV_ITEMS[el])return `<span class="muted"><span class="el ${el}">${el}</span> Enchant Poison Lv ${convSkLv(el)}: 20 SP every ${15+15*convSkLv(el)} s</span>`;
    const ids=CONV_ITEMS[el].ids,hr=convUsesHr(el);
    return `<span class="bar"><span class="el ${el}">${el}</span>${ids.map(id=>`<label class="bar"><a href="#" data-info="item:${id}" title="${esc(itemName(id))}">${itemIcon(id)}</a><input class="w-md" type="number" min="0" step="100" data-convprice="${id}" value="${state.prices[id]>0?state.prices[id]:""}" placeholder="price" aria-label="${esc(itemName(id))}: what players pay"> z</label>`).join("")}<span class="muted">${CONV_ITEMS[el].min} min, ${hr} / hr${convPrice(el)>0?`: ${fmtN(hr*convPrice(el))} z/hr`:""}</span></span>`}).join("")
    +`<span class="muted">items from players</span>`:"";
  {const m=convOn()&&calcMob();$("convInfo").innerHTML=m?`vs ${esc(m.name)} (${m.el||"Neutral"} ${m.elv||1}): ${convAll().map(el=>elRateHtml(el,elemMult(m,el))).join(" · ")} → ${convFixed()?`using ${convFixed()}`:`best ${esc(mobRow(m,walkSec()).el2)}`}`:""}
  if(typeof renderStatNote==="function")renderStatNote();
  const c=C(),a=c.a,p=JOBS[state.job].p[c.preset];
  $("atkSummary").textContent=a.type==="spellfist"?`· ${[sfOn()?`Spell Fist Lv ${G().sfLv}: ${Math.round(sfChance()*100)}% per attack, ${sfPct()}% MATK`:"",hsOnNow()?`Hindsight Lv ${hsLvN()}: ${Math.round(hsChance()*100)}% per attack, a Lv ${hsBoltLv()} bolt`:""].filter(Boolean).join(" · ")||"Spell Fist and Hindsight off"} with ${sfBolts().map(b=>({Fire:"Fire",Water:"Cold",Wind:"Lightning"})[b]).join(" / ")||"no"} bolts`:`· ${a.type==="magic"?"Magic":a.type==="auto"?"Basic attacks":"Physical"} ${a.pct}% × ${a.hits} ${atkEl()}${a.targets>1?` · ${a.targets} targets`:""}${p&&p.note?` · ${p.note}`:""}`;
  {const ac=AC(),s=acSpell(),basic=a.type==="auto"||a.type==="spellfist";$("acInfo").innerHTML=ac.on?(basic?`${s.pct}% × ${s.hits} ${s.el} MATK (Lv ${s.lv}), no SP`:'<span class="bad">only procs on basic attacks: pick a basic attack or Spell Fist</span>'):""}
  if(a.type==="spellfist")$("atkSummary").textContent+=` · each attack also lands its physical hit (ATK, weapon element)`;
  // base-level skills: what the BaseLv/100 factor does at your level (Soul Destroyer, Axe Tornado and Triangle Shot miss the Lv100 check)
  if(a.blv){const lv=num(c.baseLv,99);$("atkSummary").textContent+=a.blvBug?` · Zero bug: this skill takes × base level / 100 below Lv100 too (× ${lv}/100 at Lv ${lv}): ${Math.round(pctEff())}% per hit`
    :` · base level only raises it above Lv100${lv>100?` (× ${lv}/100)`:", so no change at Lv "+lv}: ${Math.round(pctEff())}% per hit`}
  // shield skills: what the shield adds to the skill %. Build mode shows the Shield row's weight and refine in the boxes, read-only
  {const b=c.mode==="build",s=shieldWR(c);$("shieldWrap").hidden=!a.shw;
    [["shieldW",s.w],["shieldRef",s.r]].forEach(([id,v])=>{const el=$(id);el.disabled=b;if(document.activeElement!==el)el.value=b&&!s.name||!b&&!v?"":v})}
  // weapon weight (Axe Boomerang), same read-only rule in build mode
  {const b=c.mode==="build",w=weaponW(c),el=$("weaponW");$("weaponWWrap").hidden=!a.wgt;el.disabled=b;if(document.activeElement!==el)el.value=b&&!w.name||!b&&!w.w?"":w.w;
    if(a.wgt)$("atkSummary").textContent+=c.mode==="build"&&!w.name?" · no weapon in the Weapon row, so no weight bonus":` · ${w.name?w.name+": ":""}weapon weight +${w.w}%: ${Math.round(pctEff())}% per hit`}
  if(a.mvit)$("atkSummary").textContent+=` · + ${a.mvit} × the monster's VIT %`;
  if(a.wpct&&a.wpct[c.weapon])$("atkSummary").textContent+=` · ${c.weapon}: +${a.wpct[c.weapon]}%`;
  if(a.shw){const s=shieldWR(c);$("atkSummary").textContent+=c.mode==="build"&&!s.name?" · no shield in the Shield row, so no shield bonus"
    :` · ${s.name?s.name+": ":""}shield weight ${s.w} + 4 × refine ${s.r} = +${shieldPct(c)}%: ${Math.round(pctEff())}% per hit`}
  if(dualOn()){const h=handPct();$("atkSummary").textContent+=a.type==="auto"?` · dual wield: right hand ${h.right}% + left ${c.lw} ${h.left}% (${leftEl()})`:" · dual wield: skills use the right hand only"}
  const us=useSec(),need=spNeedPerSec()*60,reg=regenPerSec()*60,ips=itemsPerSec(),rf=restFactor();
  {const oc=skRate("overcharge");$("mercNote").textContent=oc?`Overcharge: NPCs pay you +${oc}%`:""}
  renderUseItems();
  {const p=recPick("sp");$("spItemUse").innerHTML=p?`<b>${esc(p.name)}</b> (${fmtSig(p.avg)} SP, ${fmtSig(p.price)} z${p.auto?", cheapest":""})`:REC().spItem==="none"?'<span class="muted">no SP item (None): you rest</span>':""}
  $("itemInfo").textContent=c.autoSp?(ips>0?`≈ ${(ips*60).toFixed(1)} items/min · ${fmtN(ips*3600*spItemPrice())} z/hr`:"not needed: regen covers it"):"";
  const atk=a.type==="magic"||a.type==="spellfist"?`MATK ${fmtN(sumStat(c.matkTxt))}`:`ATK ${fmtN(sumStat(c.atkTxt))}`;
  syncCardRows();
  {const cd=CRD(),m=calcMob(),k0=SG_MOB;SG_MOB=m;try{const hf=hfHpPerSec(),hs=m?healsPerSec(m):0,sh=m?healShare(m):0,parts=[];
    {const k=hfCards(),lbl=`Hunter Fly${k>1?` ×${k}`:""}${cardsInGear(c,[HUNTER_FLY])>0?" (from your gear)":""}`;
      const hp=[];if(k)hp.push(hf>0?`${lbl} heals ~${fmtN(hf*60)} HP/min`:`${lbl}: only physical attacks trigger it`);if(hpRecPct())hp.push(`HP recovery +${hpRecPct()}% from gear`);
      $("hpCardInfo").innerHTML=hp.join(" · ");
      $("hpInfo").textContent=`${fmtN(hpRegen6())} per 6s${ihrPer10()?` + ${ihrPer10()} per 10s (Increase HP Recovery)`:""}${consHPPerSec()>0?` + ${fmtSig(consHPPerSec()*60)}/min from consumables`:""} = ${fmtN(hpRegenPerSec(null)*60)} HP/min${hf>0?`, + ${fmtN(hf*60)} from Hunter Fly`:""}`}
    if(cdOn("vitata"))parts.push((vitInGear(c)?"Vitata SP cost from your gear":`SP cost +${num(cd.spBonus)}%`)+(hs>0?` · vs ${esc(m.name)}: Heal ${(hs*60).toFixed(1)} casts/min${sh>=1?` <span class="bad">(can't keep up: more than all of your time)</span>`:` (${Math.round(sh*100)}% of your time not attacking)`}`:""));
    if(cdOn("creamy"))parts.push("Creamy: Where to farm (by zeny) teleports past monsters you skip");
    if(cdOn("phen")||cdOn("bbfly"))parts.push(c.mode==="build"?"Phen / Bloody Butterfly in your gear: casts aren't interrupted":`casts aren't interrupted · cast +${vctCards()}%`);
    if(cdOn("daSF"))parts.push(a.type!=="auto"&&a.type!=="spellfist"?"Side Winder: only basic attacks":daSkill().ch>=num(cd.daPct)/100?"Side Winder: Double Attack's chance is higher, nothing added":`Side Winder: +${num(cd.daPct)}% hits`);
    $("cardInfo").innerHTML=parts.join(" · ");
    const sp=[],dr=dracSPPerSec(),dp=dpSPPerSec(),ks=killSPPerSec();
    {const k=dracCards();if(k)sp.push(`Dracula${k>1?` ×${k}`:""}${cardsInGear(c,[DRACULA])>0?" (from your gear)":""} ~${fmtN(dr*60)} SP/min`)}
    if(cdOn("dpOn")&&state.job==="Sage")sp.push(dp>0?`Dark Priest ~${fmtN(dp*60)} SP/min`:"Dark Priest: only physical attacks");
    const kl=killSpOn();if(kl.length)sp.push(!m?"pick a monster to see the SP per kill":ks>0?`vs ${esc(m.name)}: +5 SP a kill ≈ ${fmtN(ks*60)} SP/min`:`no +5 SP per kill vs ${esc(m.name)}${isSF()?" (not with Spell Fist)":isRangedHit()?" (melee only)":kl.includes(m.race)?"":` (${esc(m.race||"?")})`}`);
    if(spRecPct())sp.push(`SP recovery +${spRecPct()}% from gear`);
    $("spCardInfo").innerHTML=sp.join(" · ")}finally{SG_MOB=k0}}
  if(ecOn()){const m=calcMob(),k0=SG_MOB;SG_MOB=m;try{const d=m?defense(m):null;
    $("ecInfo").textContent=d?`vs ${m.name}: −${d.red}% damage at SP ${d.label}, ${fmtN(d.ecSP*60)} SP/min on hits taken`:"pick a monster to see the damage cut"}finally{SG_MOB=k0}}else $("ecInfo").textContent=""
  if(state.job==="Sage"){const g=G(),m=calcMob(),d=m?((k)=>{SG_MOB=m;try{return defense(m)}finally{SG_MOB=k}})(SG_MOB):null;
    $("sageInfo").innerHTML=`${g._note?esc(g._note)+" · ":""}Upkeep ${fmtN(sgUpkeep()*60)} SP/min · Hindsight ${fmtN(hsFullSP()*60)} SP/min${hsChance()>0?` (${Math.round(hsChance()*100)}% chance, Lv ${hsBoltLv()} bolt${dbChance()>0?`, +${Math.round(dbChance()*100)}% Double Bolt`:""})`:" (off)"}`+
      (d?` · vs ${esc(m.name)}: defence ${fmtN(d.extra*60)} SP/min, HP lost ${fmtN(d.hp*60)}/min`:" · pick a monster to see damage taken")+
      ` · SP items ${sgItemsOn()?`${(sgItemsPerSec()*60).toFixed(1)}/min ≈ ${fmtN(sgItemsPerSec()*3600*spItemPrice())} z/hr`:"off (Hindsight off)"}`}
  if(state.job==="Sage"){const t=a.type;$("fsInfo").textContent=!G().fsOn?"":hasTree(c)&&!skLv(c,"foresight")?"not learned":t!=="magic"&&t!=="phys"||!(castSec(0)<castSec())?"only for attacks with a variable cast time"
    :fsUsed()?`saves ${(plainUseSec()-fsUseSec()).toFixed(2)} s per cast (${plainUseSec().toFixed(2)} → ${fsUseSec().toFixed(2)} s, its own cast included)`:`not worth it: ${fsUseSec().toFixed(2)} s per cast with it vs ${plainUseSec().toFixed(2)} s without`}
  $("charTiles").innerHTML=charOutTiles()+`<div class="tile det"><div class="k">${a.type==="auto"||a.type==="spellfist"?"Time per attack":"Time per cast"}</div><div class="v mono">${us.toFixed(2)}s</div><div class="s">${a.type==="auto"||a.type==="spellfist"?`ASPD ${aspdEff()}${c.potOn?" (potion)":""} · ${atkPerSec().toFixed(2)} hits/s${critChance()>0?` · ${Math.round(critChance()*100)}% crits`:""}`:`cast ${castSec().toFixed(2)}s${castSec()<num(a.cast)?` (base ${num(a.cast)}s)`:""}${fsUsed()?`, ${castSec(0.5).toFixed(2)}s with Foresight (+ ${(fsCastSec()/FS_USES).toFixed(2)}s a cast for Foresight's own)`:""}${castEff()>castSec()+0.005?` <span class="warnc">≈ ${castEff().toFixed(2)}s with hits interrupting it</span>`:""} + delay ${delaySec().toFixed(2)}s${castEff()+delaySec()<1/atkPerSec()?" · held by your attack interval (ASPD), not cast + delay":""}${critChance()>0?` · ${Math.round(critChance()*100)}% crits`:""}`} · ${atk}</div></div>
   <div class="tile det ${need>reg&&!c.autoSp?"":"now"}"><div class="k">SP use vs regen</div><div class="v mono">${fmtN(need)} / ${fmtN(reg)}</div><div class="s">per minute · regen ${spRegen8()} per 8s${isrPer10()?` + ${isrPer10()} per 10s (Increase SP Recovery)`:""}${consSPPerSec()>0?` + ${fmtSig(consSPPerSec()*60)}/min from consumables`:""}${a.type==="spellfist"?(ips>0?` · ${(ips*60).toFixed(1)} SP items/min`:hsChance()>0&&hsSustain()<1?` · <span class="bad">Hindsight fires ${Math.round(hsSustain()*100)}% as often</span>`:""):need>reg?(c.autoSp?` · items cover ${fmtN(need-reg)}/min`:` · <span class="bad">you rest ${Math.round((1-1/rf)*100)}% of the time</span>`):""}</div></div>`;
}

// items skills use up: casts per kill for this job's support skills and a price box for every item in play (c.supCasts, c.itemPrices,
// saved per job); the boxes are only rebuilt when the set of items changes, so typing in one keeps its focus
const qtyTxt=n=>n%1?n.toFixed(1):String(n);
function renderUseItems(){const c=C(),a=c.a,ui=useItems(),sup=supShown(),fb=Object.keys(FIELD_ITEM).filter(k=>skLv(c,k)>0);
  const ids=[...new Set([...ui.map(x=>x.id),...sup.flatMap(s=>s.items.map(([n])=>CONS_ID[n])),...fb.map(k=>CONS_ID[FIELD_ITEM[k]])])].filter(Boolean);
  const box=$("useItems"),key=ids.join()+"|"+sup.map(s=>s.key).join(),lab='class="bar"';
  if(box.dataset.key!==key){box.dataset.key=key;
    const row=(h,x)=>`<div class="bar full"><span>${h}</span>${x}</div>`;
    box.innerHTML=(sup.length?row("Support skills, casts per kill:",sup.map(s=>`<label ${lab} title="How many times you cast it per kill (e.g. 0.5 = every other kill); each cast uses ${esc(s.items.map(([n,q])=>`${n} ×${q}`).join(" + "))}. Its cast time isn't counted">${esc(s.name)} <input type="number" min="0" step="0.5" data-supk="${s.key}" class="w-xs" placeholder="0"></label>`).join("")):"")
      +(ids.length?row("Skill item prices:",ids.map(id=>`<label ${lab} title="Blank: the NPC price, ${fmtN(consNpc(id))} z (rAthena; check it in game). Type what you pay, e.g. a market price">${esc(consName(id))} <input type="number" min="0" step="1" data-iprice="${id}" class="w-md" placeholder="${consNpc(id)}"> z</label>`).join("")):"")}
  box.querySelectorAll("[data-supk]").forEach(i=>{if(document.activeElement!==i)i.value=supCasts(i.dataset.supk)||""});
  box.querySelectorAll("[data-iprice]").forEach(i=>{if(document.activeElement!==i){const v=(c.itemPrices||{})[i.dataset.iprice];i.value=v!=null&&v!==""?v:""}});
  box.hidden=!ids.length&&!sup.length;
  // the line: what one use takes, support casts and ground buffs, then per hour against the monster you picked
  const parts=[],m=calcMob();
  if(ui.length||num(a.zeny))parts.push(`${[...ui.map(x=>`${esc(consName(x.id))} ×${qtyTxt(x.qty)}`),...(num(a.zeny)?[`${fmtN(num(a.zeny))} z`]:[])].join(" + ")} per ${a.type==="auto"?"attack":"cast"}${ui.length?` (${fmtN(useZeny())} z)`:""}${usesArrows()&&!ARROW_OF[atkEl()]?" (no arrow of that element: counted as plain Arrows)":""}`);
  supOf().filter(s=>supCasts(s.key)>0).forEach(s=>parts.push(`${esc(s.name)} ${qtyTxt(supCasts(s.key))}× per kill: ${s.items.map(([n,q])=>`${esc(n)} ×${qtyTxt(q*supCasts(s.key))}`).join(" + ")}`));
  fieldBuffs().forEach(f=>parts.push(`${esc(skOf(state.job)[f.k].name)}: a ${esc(consName(f.id))} every ${fmtN(60/f.perHr)} min`));
  if(parts.length){const h=m?useHour(m,walkSec()):null,mw=maxWt();
    parts.push(!m?"pick a monster to see the cost per hour":!h?`can't hurt ${esc(m.name)}`:`vs ${esc(m.name)}: ~${fmtN(h.z)} z/hr${h.items.length?` (${h.items.map(x=>`${fmtN(x.n)} ${esc(consName(x.id))}`).join(", ")})`:""}, taken off zeny/hr`
      +(h.w>0?` · uses ~${h.w<10?h.w.toFixed(1):fmtN(h.w)} weight/hr${mw>0?`; restock every ${fmtDur(mw/h.w).split("\n").pop()} (Max Weight ${fmtN(mw)})`:""}`:""))}
  $("useInfo").innerHTML=parts.join(" · ")}
// ---- render: Consumables: the HP / SP item picks and every item's cost per HP / SP, and uses per hour on a map ----
const fmtSig=n=>n==null||!isFinite(n)?"n/a":n>=100?fmtN(n):String(+n.toPrecision(3));
const fmtQty=n=>n==null||!isFinite(n)?"–":n<10?n.toFixed(1):fmtN(n);
const REC_SRC={disc:"Discount",npc:"NPC",player:"players"};
// the item value a one-box amount (an item that heals a fixed amount) shows as its placeholder
const REC_BASE={amt:"min",spAmt:"spMin"};
// the map uses per hour are worked out on: the session's (Where to farm), else the picked monster's best open map. HP lost / min and SP short per hour there
function recNeed(){let mp=currentMap();if(!MAPMOBS[mp])mp=mobMap(calcMob());if(!MAPMOBS[mp])return null;
  const w=walkSec(),r=mapStats(mp,w);return {mp,hpm:r?r.hpi:null,loss:r?r.hpm:null,sp:r?mapSpShort(mp,w,r.el2):0}}
function renderRecovery(){const R=REC(),need=recNeed(),pick={hp:recPick("hp"),sp:recPick("sp")},ch={hp:recCheapest("hp"),sp:recCheapest("sp")};
  const opts=kind=>`<option value="auto">Auto (cheapest${ch[kind]?": "+esc(ch[kind].name):""})</option><option value="none">None</option>`+recItems(kind).filter(x=>recShown(x,R[kind==="hp"?"hpItem":"spItem"])).map(x=>`<option value="${x.id}">${esc(x.name)}${x.per==null?" (no price)":""}</option>`).join("")+'<option value="custom">Custom (type it)</option>';
  $("recHp").innerHTML=opts("hp");$("recHp").value=R.hpItem==="custom"||R.hpItem==="none"||recFor(R.hpItem,"hp")?R.hpItem:"auto";
  $("recSp").innerHTML=opts("sp");$("recSp").value=R.spItem==="custom"||R.spItem==="none"||recFor(R.spItem,"sp")?R.spItem:"auto";
  $("recHp").title=pick.hp&&pick.hp.want?`${pick.hp.want.name} has no price, so the cheapest is used`:"";$("recSp").title=pick.sp&&pick.sp.want?`${pick.sp.want.name} has no price, so the cheapest is used`:"";
  $("recCustom").hidden=R.spItem!=="custom";$("recCustomHp").hidden=R.hpItem!=="custom";$("recDisc").checked=recDisc();
  $("recNote").textContent=need?`${state.job} on ${mapCode(need.mp)}: ${need.loss==null?"HP loss unknown":`${fmtN(need.loss)} HP lost/min${need.loss>0&&vitHeals()?" (your Vitata Heals cover it)":""}`} · ${fmtN(need.sp/60)} SP/min short`+` · using ${pick.hp?pick.hp.name:"no HP item"} and ${pick.sp?pick.sp.name:"no SP item"}`:"pick a monster or a map (Map planner) to see uses per hour";
  // don't rebuild the box you're typing in; the table catches up when you leave it
  const f=document.activeElement;if(f&&f.tagName==="INPUT"&&$("recTable").tBodies[0].contains(f))return;
  const all=recItems(),shown=all.filter(x=>recShown(x,(pick[x.kind]||{}).id));$("recAll").checked=recAll();$("recAllN").textContent=all.length>shown.length?`${all.length-shown.length} more`:"";
  const rows=tableRows("recTable",shown.map(x=>{const n=!need||!(x.avg>0)?null:x.kind==="hp"?(need.hpm==null?null:need.hpm*60/x.avg):need.sp/x.avg;
    return {...x,uph:n,zph:n!=null&&x.price!=null?n*x.price:null,wph:n!=null?n*x.w:null}}));
  const inp=(x,k,v,w)=>`<input type="number" min="0" step="any" data-rid="${x.id}" data-rk="${k}" value="${v??""}" placeholder="${k==="player"||RECOVERY[x.id][REC_BASE[k]||k]==null?"n/a":RECOVERY[x.id][REC_BASE[k]||k]}" aria-label="${esc(x.name)} ${k}" style="width:${w}px">`;
  $("recTable").querySelector("tbody").innerHTML=rows.map(x=>{const use=pick[x.kind]&&pick[x.kind].id===x.id,u=x.kind.toUpperCase();
    return `<tr><td class="name">${itemIcon(x.id,1,"il")}<a href="#" data-info="item:${x.id}"><b>${esc(x.name)}</b></a>${use?' <span class="pill">in use</span>':""}${x.edited?` <a href="#" data-rreset="${x.id}">reset</a>`:""}</td><td>${u}</td>
      <td class="nowrap">${x.pct!=null?`${inp(x,"pct",x.pct,60)}% of Max ${u} <b${x.avg>0?"":` title="set your Max ${u} in the Character tab"`}>${x.avg>0?fmtN(x.avg):"?"}</b>`
        :x.min===x.max?inp(x,x.sp?"spAmt":"amt",x.min,56):`${inp(x,x.sp?"spMin":"min",x.min,56)}–${inp(x,x.sp?"spMax":"max",x.max,56)}`}${x.pct!=null||x.min===x.max&&x.avg===x.min?"":` <b>${fmtSig(x.avg)}</b>`}${x.aOk?"":' <span title="not measured in Zero yet: classic RO\'s amount">?</span>'}</td>
      <td class="nowrap">${inp(x,x.src||"player",x.price,72)} <span class="note">${x.src?REC_SRC[x.src]:"no price"}</span></td>
      <td>${x.per==null?"n/a":`<b>${fmtSig(x.per)}</b> z/${u}`}</td>
      <td class="nowrap">${x.perW==null?"–":fmtSig(x.perW)} <span class="note">per ${inp(x,"w",x.w,52)}${x.wOk?"":' <span title="weight not checked in game yet">?</span>'}</span></td>
      <td>${fmtQty(x.uph)}</td><td>${x.per==null?"n/a":x.zph==null?"–":fmtN(x.zph)}</td><td>${fmtQty(x.wph)}</td></tr>`}).join("")}
// ---- render: tracker ----
function renderSessions(){const none=!state.sessions.length;
  $("sessionSel").innerHTML=none?'<option value="">No session yet</option>':state.sessions.map(s=>`<option value="${esc(s.id)}" ${s.id===state.current?"selected":""}>${esc(s.name)}</option>`).join("");
  // nothing to rename or delete until logging EXP, Farm here or New session starts one
  ["sessionSel","editSession","renameSession","delSession"].forEach(id=>$(id).disabled=none);
  // the Map card's own pick (Monsters & maps): the session Farm here and Farming it now go to, or a new one
  $("mapSessSel").innerHTML=(none?'<option value="">No session yet</option>':state.sessions.map(s=>`<option value="${esc(s.id)}" ${s.id===cur().id?"selected":""}>${esc(s.name)}</option>`).join(""))+'<option value="+new">+ New session</option>'}
// ---- get started: its steps shown on Home until they're done (or hidden), each ticked off as you do it ----
const KEY_START="rozero-farm-planner-start-hidden";
// the character is set up: built from gear once a base stat is raised or a piece of gear is on (a new character starts in build mode
// with neither), or all six stats typed. Until then a monster's details leave out your numbers against it
const charSet=(c=C())=>c.mode==="build"?!!c.build&&(Object.values(c.build.base||{}).some(v=>num(v)>1)||Object.values(c.build.gear||{}).some(g=>g&&g.id))
  :STATS.every(k=>statVal(c,k)!=null);
// no character yet: a new visitor who hasn't picked a job (state.noJob) or set one up; the calculators use a Novice meanwhile
const noChar=()=>!!state.noJob&&!charSet();
// Game data (Monsters & maps, the monster popup) can leave your character's numbers out, to look a monster or map up as the game has
// it: the My numbers switch (state.hideMine, per account)
const showMine=()=>charSet()&&state.hideMine!==true;
const mineSwitch=()=>charSet()?`<label class="bar mineSw" title="Your kill time, damage, EXP and zeny against each monster"><input type="checkbox" data-mine${state.hideMine===true?"":" checked"}> My numbers</label>`:"";
const NO_CHAR_TXT="Set up your character on the Character tab to see your kill time, EXP / min and zeny a kill";
function renderStart(){const box=$("startCard"),c=C(),s=cur(),n=s.entries.length;
  // any session counts, so a new, empty session doesn't bring the card back; once both are done it stays away
  const done={char:charSet(c),mob:state.sessions.some(x=>(x.mobIds||[]).length)};
  let off=false;try{off=localStorage.getItem(KEY_START)==="1";if(!off&&Object.values(done).every(Boolean)){localStorage.setItem(KEY_START,"1");off=true}}catch(e){}
  box.hidden=off||Object.values(done).every(Boolean);
  box.querySelectorAll("[data-step]").forEach(li=>li.classList.toggle("done",!!done[li.dataset.step]));
  // the Session tab's tiles wait for the first entry instead of showing nine dashes
  $("tCurLv").closest(".tiles").classList.toggle("noData",!n)}
// ---- top bar trend: EXP %/hr between this session's entries (paused time left out), and its average ----
function renderSpark(s,st){const box=$("ctxRate"),es=[...s.entries].sort((a,b)=>a.t-b.t);box.hidden=!st||es.length<2;if(box.hidden)return;
  const y=es.map(e=>e.lv*100+e.pct),rates=[];for(let i=1;i<es.length;i++){const dh=activeH(s,es[i-1].t,es[i].t);if(dh>0)rates.push((y[i]-y[i-1])/dh)}
  const r=rates.slice(-12),lo=Math.min(0,...r),hi=Math.max(...r,lo+1e-9),X=i=>r.length<2?36:2+i*(68/(r.length-1)),Y=v=>20-(v-lo)/(hi-lo)*17;
  const line=r.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  $("spark").innerHTML=`<polyline points="${line}" fill="none" stroke="url(#sparkG)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><defs><linearGradient id="sparkG"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-2)"/></linearGradient></defs>`+(r.length?`<circle cx="${X(r.length-1)}" cy="${Y(r[r.length-1])}" r="2.2" style="fill:var(--accent-2)"/>`:"");
  $("ctxRateV").textContent=`${pct(st.avgPct)}/hr`}
function renderTracker(){renderStart();
  // at the max base level base EXP stops counting, so the quick Log EXP box (the + button, L) goes away
  document.documentElement.classList.toggle("maxLv",atMaxLv());$("dieItem").checked=!!state.dieItem;$("dieBtn").textContent=`Died −${diePct()}%`;
  const s=cur(),st=stats(s);renderSpark(s,st);
  if(document.activeElement!==$("partyN"))$("partyN").value=partyN(s);$("partyBonus").value=partyBonus(s);
  $("partyNote").textContent=partyN(s)>1?`Each kill gives you ${partyPct(s)}% of its EXP (party of ${partyN(s)}). Even Share only works within 15 base levels.`:"";
  const pz=openPause(s);$("pauseBtn").textContent=pz?"Resume":"Pause";$("pauseBtn").classList.toggle("primary",!!pz);$("pauseNote").hidden=!pz;
  if(pz)$("pauseNote").textContent=`Paused since ${fmtT(pz.from)}; time away isn't counted. Resume or log an entry when back.`;
  const ms=sessMobs(s),maps=sessMaps(s),auto=sessMapAuto(s),smp=sessMap(s);
  // the session's monsters' maps, then every other open map (picking one of those farms it, with its monsters: farmMap)
  {const sel=$("sessMapSel"),of=ms.length>1?x=>` · ${x[1]} of ${ms.length} monsters`:()=>"";
    const other=Object.keys(MAPMOBS).filter(k=>!isClosed(k)&&!maps.some(x=>x[0]===k)&&!(k===s.map&&smp===k)).sort((a,b)=>mapLabel(a).localeCompare(mapLabel(b)));
    sel.innerHTML=(!maps.length?`<option value="">${ms.length?"No open map for these monsters":"Pick a map"}</option>`
      :`<option value="">Auto: ${esc(mapLabel(auto))}</option>`+maps.map(x=>`<option value="${esc(x[0])}">${esc(mapLabel(x[0]))}${of(x)} · ≈${spN(x[2])} spawns</option>`).join(""))
      +(s.map&&smp===s.map&&!maps.some(x=>x[0]===s.map)?`<option value="${esc(s.map)}">${esc(mapLabel(s.map))}${isClosed(s.map)?" · not open":""}</option>`:"")
      +(other.length?`<optgroup label="Other open maps">${other.map(k=>`<option value="${esc(k)}">${esc(mapLabel(k))}</option>`).join("")}</optgroup>`:"");
    sel.value=s.map&&smp===s.map?s.map:""}
  // the monsters on the session's map (and any the session hunts that don't spawn there), each with + Session / − Session
  {const on=MAPMOBS[smp]?[...MAPMOBS[smp]].sort((a,b)=>(b.n??-1)-(a.n??-1)):[],ids=new Set(s.mobIds);
    const rows=[...on,...ms.filter(m=>!on.some(x=>x.m.id===m.id)).map(m=>({m,n:null,off:true}))];
    $("sessMobHead").innerHTML=!smp?`Pick a map in Farming on or on the world map to see its monsters.`
      :`<b>Monsters on ${esc(mapName(smp)||mapCode(smp))}</b> · hunting ${ms.length} of ${on.length}`;
    $("sessMobTable").closest(".scroll").hidden=!rows.length;
    $("sessMobTable").querySelector("tbody").innerHTML=rows.map(({m,n,off})=>{const inS=ids.has(m.id);
      return `<tr class="${inS?"sel":""}" style="${isSkipped(m)?"opacity:.55":""}"><td class="name">${mobIcon(m.id,1,"il")}<a href="#" data-info="mob:${m.id}">${esc(m.name)}</a>${BOSS_PILL(m)}${off?' <span class="note">not on this map</span>':""}</td><td>${off?"–":`≈${spN(n)}`}</td><td>${m.lv}</td><td>${fmtExp(m)}</td><td><button type="button" class="small${inS?"":" primary"}" data-sessmob="${m.id}">${inS?"− Session":"+ Session"}</button></td></tr>`}).join("")}
  // the folded part of the Log EXP card says what it's set to, so you know without opening it
  {const n=partyN(s),bits=[];
    if(n>1)bits.push(`party of ${n}`);if($("fTime").dataset.auto!=="1"||$("fDate").dataset.auto!=="1")bits.push("time set by hand");if(state.dieItem)bits.push("death item");
    $("logMoreMeta").textContent=bits.join(" · ")}
  const lastE=[...s.entries].sort((a,b)=>a.t-b.t).pop();
  if(lastE){$("tCurLv").textContent=`Lv ${lastE.lv}`;$("tCurLvS").textContent=lvExp(lastE.lv)?`${fmtN(lvExp(lastE.lv))} EXP to level`:"Lv outside EXP table";
    $("tCurPct").textContent=pct(lastE.pct,1);$("tCurPctS").textContent=`logged ${fmtT(lastE.t)}`}
  else{$("tCurLv").textContent="–";$("tCurPct").textContent="–";$("tCurLvS").textContent="Log an entry below";$("tCurPctS").textContent=""}
  if(!st){["tAvg","tRecent","tLevel","tNext"].forEach(id=>$(id).textContent="–");["tAvgS","tRecentS","tLevelS","tNextS"].forEach(id=>$(id).textContent="Log at least two entries");$("tNextK").textContent="To next level";$("tRecentK").textContent="Last interval"}
  else{
    $("tAvg").textContent=pct(st.avgPct);$("tAvgS").textContent=`${fmtN(st.avgRaw/60)} EXP/min over ${st.spanMin} min`;
    $("tRecentK").textContent=`Last ${st.recentMin} min`;$("tRecent").textContent=pct(st.recPct);const diff=st.recPct-st.avgPct;
    $("tRecentS").innerHTML=`${fmtN(st.recRaw/60)} EXP/min · <span class="pill ${diff>=0?"up":"down"}">${diff>=0?"+":""}${diff.toFixed(2)}% vs avg</span>`;
    $("tLevel").textContent=fmtDur(st.fullH);$("tLevelS").textContent=lvExp(st.last.lv)?`${fmtN(st.L)} EXP at Lv ${st.last.lv}`:"Lv outside EXP table, using %";
    $("tNextK").textContent=`To Lv ${st.last.lv+1}`;$("tNext").textContent=fmtDur(st.nextH);$("tNextS").textContent=`${(100-st.last.pct).toFixed(1)}% left`}
  const p=sessionPace(s);
  if(p){$("tPace").textContent=`${fmtN(p.kph)}/hr`;$("tPaceS").textContent=`${p.obs.toFixed(1)}s per kill`+(isFinite(p.fight)?(p.obs<p.fight?` · faster than the model's ${p.fight.toFixed(1)}s fight, so check your ATK/MATK`:` · ~${p.fight.toFixed(1)}s fighting + ~${p.walk.toFixed(1)}s walking`):"");
    $("tPaceS").title=s.snap?`Fight time with the stats ${s.snap.est?"you had when this session was first worked out":`you had when you last logged (${fmtD(s.snap.at)} ${fmtT(s.snap.at)})`}${s.snapHist&&s.snapHist.length?", and for the entries before a change, the stats they were logged with":""}; changing them later doesn't move this session's walking`:""}
  else{$("tPace").textContent="–";$("tPaceS").textContent="Needs a monster and 2+ entries"}
  if(p){const zk=p.zk,gross=p.kph*zk,cost=itemsPerSec()*3600*spItemPrice()+hourCostHr()+p.kph*p.mix.avg(skillZeny);$("tZeny").textContent=fmtN(gross-cost);$("tZenyS").textContent=`${fmtN(gross)} z loot`+(cost>0?` − ${fmtN(cost)} z SP items, potions & skill items`:"")+` · ${fmtN(zk)} z/kill`}
  else{$("tZeny").textContent="–";$("tZenyS").textContent="Needs a monster and 2+ entries"}
  const j=jobRate(s);
  if(j&&num(C().jobLv)>=jobMax()){$("tJob").textContent="Max";$("tJobS").textContent=`Job Lv ${jobMax()} is the max for ${state.job}`}
  else if(j){const need=jobNeed();$("tJob").textContent=pct(j.rate);$("tJobS").textContent=`${fmtDur((100-j.last)/j.rate)} to Job Lv ${num(C().jobLv)?num(C().jobLv)+1:"next"}`+(need?` · ≈ ${fmtN(j.rate/100*need)} job EXP/hr`:" · set your job level for job EXP/hr")}else{$("tJob").textContent="–";$("tJobS").textContent="Add Job EXP % to 2+ entries"}
  renderChart(s);renderLog(s);renderCompare();renderGoalChart(renderGoal(s,st),renderJobGoal(s));renderTrip(s);
}
// ---- sell timer: counts down to the session's sell point and rings (sound, notification, tab title); ticked every second by start.js ----
const fmtClock=ms=>{const t=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t/60)%60,x=String(t%60).padStart(2,"0");return h?`${h}:${String(m).padStart(2,"0")}:${x}`:`${m}:${x}`};
const BASE_TITLE=String(document.title||"Poring Planner");
const tripPhase=(s,now=Date.now())=>!s.trip?"none":openPause(s)?"paused":now>=tripDue(s)-tripEarly()?"due":"run";
function renderTrip(s=cur()){const c=C(),act=document.activeElement;
  [["tripW","curW"],["tripMax","maxW"]].forEach(([id,k])=>{if(act!==$(id))$(id).value=num(c[k])>0?c[k]:""});
  {const w=maxWCalc(c);["maxW","tripMax"].forEach(id=>$(id).placeholder=w?String(w.total):"off")}
  if(act!==$("tripAt"))$("tripAt").value=num(c.sellAt)>0?c.sellAt:"";if(act!==$("tripTownMin"))$("tripTownMin").value=c.townMin??3;
  if(act!==$("tripEarly"))$("tripEarly").value=num(state.tripEarly)>0?state.tripEarly:"";
  $("tripSound").checked=state.tripSound!==false;$("tripNotify").checked=state.tripNotify===true;
  if(act!==$("tripMin"))$("tripMin").value=num(state.tripMin)>0?state.tripMin:"";
  const t=wOn()?sessTrip(s):null,town=Math.max(0,num(c.townMin,3)),typed=num(state.tripMin)>0,ms=sessMobs(s);let len="–",lenS,runs="–",runsS="";
  const auto=t&&t.wk>0&&t.kills>=1&&isFinite(t.min)?t.min:null;
  $("tripFor").textContent=`${s.name}${ms.length?` · ${ms.map(m=>m.name).join(", ")}`:" · no monster picked"}`;
  $("tripMin").placeholder=auto?String(Math.round(auto)):"auto";
  if(!wOn())lenS="Type your Max Weight to work it out, or type the minutes a trip takes";
  else if(!t)lenS=ms.length?"You can't hurt the session's monsters with this attack; type the minutes a trip takes":"Pick where you're farming (Where to farm → Farm here), or type the minutes a trip takes";
  else if(!(t.wk>0))lenS="Their drops weigh nothing, so you never fill up";
  else if(!(t.kills>=1))lenS=`<span class="bad">Your starting weight is already at your sell point (${fmtP(sellPct())}%)</span>`;
  else lenS=`~${fmtN(Math.floor(t.kills))} kills · ${t.wk.toFixed(1)} weight a kill · ${fmtN(Math.max(0,maxWt(c)*t.at/100-num(c.curW)))} weight of room: ${fmtN(num(c.curW))} you start with → ${fmtN(maxWt(c)*t.at/100)} (${fmtP(t.at)}%)${t.fell?' · <span class="bad">no regen past 70% and you need SP, so you sell at 70%</span>':""}`;
  if(typed)lenS=`typed${auto?` · worked out: ${fmtDur(auto/60)}`:""}`;
  const min=typed?num(state.tripMin):auto;
  if(min>0){len=fmtDur(min/60);const cyc=min+town;runs=`${(60/cyc).toFixed(1)}/hr`;runsS=`${fmtP(town)} min each · ${Math.round(town/cyc*100)}% of your time in town`}
  $("tripLen").textContent=len;$("tripLenS").innerHTML=lenS;$("tripRuns").textContent=runs;$("tripRunsS").textContent=runsS;
  TRIP_OK=min>0;renderTripBtns(s);tickTrip();
}
function renderTripBtns(s=cur()){const ph=tripPhase(s);TRIP_PHASE=ph;
  $("tripBtns").innerHTML=ph==="none"?`<button type="button" class="primary" data-trip="go"${TRIP_OK?"":" disabled"}>Start</button>`
    :`<button type="button" class="${ph==="due"?"primary":""}" data-trip="go"${TRIP_OK?"":" disabled"}>${ph==="due"?"Back from town: next trip":"Restart"}</button><button type="button" data-trip="stop">Stop</button>`}
let TRIP_OK=false,TRIP_PHASE=null,TRIP_RING={id:null,n:0,at:0},TRIP_CTX=null;
const tripAudio=()=>{try{if(!TRIP_CTX){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;TRIP_CTX=new A()}if(TRIP_CTX.state==="suspended")TRIP_CTX.resume();return TRIP_CTX}catch(e){return null}};
// three short beeps
function tripBeep(){const a=tripAudio();if(!a)return;const t0=a.currentTime+0.05;
  [0,0.3,0.6].forEach(d=>{const o=a.createOscillator(),g=a.createGain();o.type="square";o.frequency.value=880;g.gain.setValueAtTime(0.0001,t0+d);
    g.gain.exponentialRampToValueAtTime(0.15,t0+d+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t0+d+0.22);o.connect(g);g.connect(a.destination);o.start(t0+d);o.stop(t0+d+0.25)})}
function tripAlarm(s){if(state.tripSound!==false)tripBeep();
  if(state.tripNotify===true&&typeof Notification!=="undefined"&&Notification.permission==="granted")
    try{new Notification("Time to sell",{body:`${s.name}: you should be at your sell point. Go to town and sell or store.`,tag:"rozero-sell"})}catch(e){}}
// rings once when a trip is due (and again each minute, up to 5 times, while this page stays open); paused sessions don't ring
function tickTrip(){const now=Date.now(),s=cur();
  state.sessions.forEach(x=>{if(tripPhase(x,now)!=="due")return;
    if(!x.trip.rang){x.trip.rang=true;save();TRIP_RING={id:x.id,n:1,at:now};tripAlarm(x)}
    else if(TRIP_RING.id===x.id&&TRIP_RING.n<5&&now-TRIP_RING.at>=6e4){TRIP_RING.n++;TRIP_RING.at=now;if(state.tripSound!==false)tripBeep()}});
  const ph=tripPhase(s,now),el=$("tripClock");if(ph!==TRIP_PHASE)renderTripBtns(s);
  if(ph==="none"){el.textContent="–";el.className="v mono";$("tripK").textContent="Next sell";$("tripS").textContent=TRIP_OK?"Press Start when you leave town":"";document.title=BASE_TITLE;return}
  const due=tripDue(s),left=due-now,early=tripEarly();
  el.textContent=ph==="paused"?"Paused":left>0?fmtClock(left):"Sell now";el.className="v mono"+(ph==="due"?left>0?" warnc":" bad":"");
  $("tripK").textContent=ph==="due"?"Time to sell":"Next sell";
  $("tripS").textContent=`sell point at ${fmtT(due)}${early?` · rings at ${fmtT(due-early)}`:""} · left town ${fmtT(s.trip.from)}${ph==="paused"?" · session paused: the clock waits until you Resume (Session tab) or press Restart":""}`;
  document.title=(ph==="due"?"⏰ Sell now · ":ph==="run"?`${fmtClock(left)} · `:"")+BASE_TITLE}
// charts draw at the width they're shown at (340–800 units), so their 11px labels stay 11px on a phone instead of shrinking
const chartW=el=>{const w=+el.clientWidth;return w?Math.max(340,Math.min(800,Math.round(w))):800};
let EXP_PTS=[];
function renderChart(s){
  const svg=$("chart"),es=[...s.entries].sort((a,b)=>a.t-b.t);const W=chartW(svg),H=W<600?260:340,pl=52,pr=18,pt=16,pb=34;EXP_PTS=[];
  // no entries: a short strip with the hint instead of an empty 340-high chart
  svg.setAttribute("viewBox",`0 0 ${W} ${es.length?H:70}`);svg.classList.toggle("empty",!es.length);
  if(!es.length){svg.innerHTML=`<text x="${W/2}" y="40" text-anchor="middle">No entries yet: log your EXP % to ${W<600?"see":"draw"} your progress</text>`;return}
  const base=es[0].lv;const y=es.map(e=>(e.lv-base)*100+e.pct);let lo=Math.min(...y),hi=Math.max(...y);
  const span=Math.max(hi-lo,2),step=niceStep(span/4);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
  const n=es.length,t0=es[0].t,t1=es[n-1].t,act=t=>activeH(s,t0,t),actSpan=act(t1);const XT=t=>n===1||actSpan<=0?(pl+W-pr)/2:pl+act(t)/actSpan*(W-pl-pr),X=i=>XT(es[i].t);const Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  const multi=es[n-1].lv!==base;let g="";
  for(let v=lo;v<=hi+1e-9;v+=step){const lvl=base+Math.floor(v/100),q=((v%100)+100)%100;g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)" stroke-dasharray="4 4"/><text x="${pl-8}" y="${Y(v)+4}" text-anchor="end">${multi?`${lvl}·${fmtP(q)}`:`${fmtP(v)}%`}</text>`}
  // over more than one day, a label shows the date where the day changes
  const md=multiDay(es),gap=md?84:48;let lastX=-1e9;const labs=[];es.forEach((e,i)=>{const x=X(i);if(x-lastX>=gap){labs.push(i);lastX=x}});
  if(labs[labs.length-1]!==n-1){if(n>1&&X(n-1)-X(labs[labs.length-1])<gap)labs.pop();labs.push(n-1)}
  labs.forEach((i,k)=>{const d=md&&(k===0||dayKey(es[i].t)!==dayKey(es[labs[k-1]].t));g+=`<text x="${X(i)}" y="${H-10}" text-anchor="${d&&n>1&&i===n-1?"end":"middle"}">${d?fmtD(es[i].t)+" ":""}${fmtT(es[i].t)}</text>`});
  // paused time is squeezed out of the x-axis; a dashed line marks where each pause was (one after the last entry sits on the right edge).
  // labels that would overlap drop to a lower row (up to 3); with no room left the line keeps its times as a tooltip. Click one to edit it
  const rowEnd=[-1e9,-1e9,-1e9],when=t=>`${md?fmtD(t)+" ":""}${fmtT(t)}`;
  (s.pauses||[]).map((p,i)=>({p,i})).filter(({p})=>p.from>=t0).forEach(({p,i})=>{const x=XT(Math.min(p.from,t1)),txt=`paused ${fmtAway(p)}`;
    const tip=`<title>Paused ${when(p.from)} → ${p.to!=null?when(p.to):"now"} · ${fmtAway(p)}${p.to!=null?"":" so far"} (click to edit)</title>`;
    g+=`<g class="pauseMark" data-pedit="${i}">${tip}<line x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}" stroke="var(--warn)" stroke-dasharray="3 4"/><line x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}" stroke="transparent" stroke-width="12"/></g>`;
    const w=txt.length*6.7,end=x+4+w>W-pr,a=end?x-4-w:x+4,r=rowEnd.findIndex(e=>a>=e+6);if(r<0)return;rowEnd[r]=a+w;
    g+=`<text class="pauseMark" data-pedit="${i}" x="${end?x-4:x+4}" y="${pt+10+r*13}" text-anchor="${end?"end":"start"}" style="fill:var(--warn)">${tip}${txt}</text>`});
  const pts=y.map((v,i)=>`${X(i)},${Y(v)}`).join(" ");
  // the brand gradient along the line, fading out under it
  g=`<defs><linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.26"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient>
    <linearGradient id="expLine" gradientUnits="userSpaceOnUse" x1="${pl}" x2="${W-pr}" y1="0" y2="0"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-2)"/></linearGradient></defs>`+g;
  g+=`<polygon points="${X(0)},${H-pb} ${pts} ${X(n-1)},${H-pb}" fill="url(#expFill)" stroke="none"/><polyline points="${pts}" fill="none" stroke="url(#expLine)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  g+=`<line id="expHair" y1="${pt}" y2="${H-pb}" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/>`;
  // hover readout: the entry, and the %/hr from the one before it (paused time left out)
  EXP_PTS=y.map((v,i)=>{const e=es[i],dh=i?act(e.t)-act(es[i-1].t):0,rate=i&&dh>0?(v-y[i-1])/dh:null;
    return {x:X(i),y:Y(v),tip:`<b>Lv ${esc(e.lv)} · ${esc(e.pct)}%</b>${e.jpct!=null?` · job ${esc(e.jpct)}%`:""}<br>${md?fmtD(e.t)+" ":""}${fmtT(e.t)}${rate!=null?` · ${rate>=0?"+":""}${rate.toFixed(2)}%/hr since the last entry`:" · first entry"}${e.died?`<br>💀 died −${esc(e.died)}%`:""}`}});
  y.forEach((v,i)=>{const tip=`<title>${md?fmtD(es[i].t)+" ":""}${fmtT(es[i].t)} · Lv ${esc(es[i].lv)} ${esc(es[i].pct)}%${es[i].died?` · died −${esc(es[i].died)}%`:""}</title>`;
    g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${i===n-1?5.5:3.5}" fill="${es[i].died?"var(--bad)":i===n-1?"var(--accent-2)":"var(--accent)"}" stroke="var(--surface)" stroke-width="2">${tip}</circle>`;
    // a death: a skull beside the point
    if(es[i].died){const r=X(i)+22<=W-pr;g+=`<text class="deathMark" x="${r?X(i)+9:X(i)-9}" y="${Y(v)+4}" text-anchor="${r?"start":"end"}">💀${tip}</text>`}});
  svg.innerHTML=g;
}
function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x)));const f=x/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function fmtP(v){return Number.isInteger(v)?String(v):v.toFixed(1)}
// how long a pause lasted (or has lasted so far): 7h 50m
const fmtAway=p=>{const m=Math.round(((p.to??Date.now())-p.from)/6e4);return m>=60?`${Math.floor(m/60)}h${m%60?` ${m%60}m`:""}`:`${m}m`};
// a time as a datetime-local input value, in local time
const dtLocal=t=>{const d=new Date(t),p=x=>String(x).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
// a place ("prontera 272 264") as the game's Navigation command, /navi prontera 272/264, to select and paste in the game's chat
const naviCmd=at=>{const [mp,x,y]=at.split(" ");return y?`/navi ${mp} ${x}/${y}`:`/navi ${mp}`};
const naviTag=at=>`<span class="navi mono" title="Type it in the game's chat: the Navigation shows you the way">${esc(naviCmd(at))}</span>`;
// the row being edited in the entries table: {sid, t} for an entry, {sid, p: index in s.pauses} for a pause
let LOG_EDIT=null;
// entries and pauses, newest first: a pause is a row of its own at the time it started; ✎ turns a row into inputs
function renderLog(s){
  const es=[...s.entries].sort((a,b)=>a.t-b.t);const base=es.length?es[0].lv:0,ps=s.pauses||[],md=multiDay([...es,...ps.map(p=>({t:p.from}))].sort((a,b)=>a.t-b.t)),jl=entryJobLvs(s);
  const ed=LOG_EDIT&&LOG_EDIT.sid===s.id?LOG_EDIT:null,when=t=>`${md?fmtD(t)+" ":""}${fmtT(t)}`;
  const btns=(edit,del,what)=>`<td class="acts"><button class="small" ${edit} aria-label="Edit ${what}" title="Edit ${what}">✎</button> <button class="small danger" ${del} aria-label="Delete ${what}" title="Delete ${what}">✕</button></td>`;
  const saveBtns='<td class="acts" colspan="2"><button class="small primary" data-save>Save</button> <button class="small" data-cancel>Cancel</button></td>';
  const inN=(f,v,a)=>`<input type="number" data-f="${f}" value="${v??""}" ${a}>`;
  const rows=es.map((e,i)=>{
    if(ed&&ed.t===e.t)return {t:e.t,k:0,h:`<tr class="editRow"><td><input type="datetime-local" data-f="t" value="${dtLocal(e.t)}" aria-label="Time"></td>
      <td class="nowrap">B ${inN("lv",e.lv,'min="1" max="99" step="1" aria-label="Base level"')} J ${inN("jlv",jl.get(e),'min="1" max="70" step="1" placeholder="?" aria-label="Job level"')}</td>
      <td class="nowrap">${inN("pct",e.pct,'min="0" max="100" step="0.01" aria-label="EXP %"')} <label class="note" title="Ticked: this is your EXP after a death, so the drop to it isn't counted as EXP lost per hour"><input type="checkbox" data-f="died"${e.died?" checked":""}> 💀 died</label></td><td>${inN("jpct",e.jpct,'min="0" max="100" step="0.01" placeholder="–" aria-label="Job EXP %"')}</td>${saveBtns}</tr>`};
    let rate="";if(e.died)rate=`<span class="pill down" title="A death: the EXP it cost isn't counted against your EXP/hr">💀 died −${esc(e.died)}%</span>`;else if(i>0){const q=es[i-1],h=activeH(s,q.t,e.t);rate=h>=1/60?pct((cumulative(e,base)-cumulative(q,base))/h/(lvExp(e.lv,e.t)||100)*100):`<span title="under a minute of unpaused time since the last entry">–</span>`}
    return {t:e.t,k:0,h:`<tr data-t="${esc(e.t)}"><td>${e.died?'<span title="died">💀</span> ':""}${when(e.t)}</td><td>B${esc(e.lv)}${jl.get(e)?`/J${esc(jl.get(e))}`:""}</td><td>${e.pct.toFixed(1)}%</td><td>${e.jpct!=null?e.jpct.toFixed(1)+"%":"–"}</td><td>${rate}</td>${btns(`data-edit="${esc(e.t)}"`,`data-del="${esc(e.t)}"`,"entry")}</tr>`}});
  ps.forEach((p,i)=>rows.push({t:p.from,k:1,h:ed&&ed.p===i?`<tr class="pauseRow editRow"><td colspan="4">Paused from <input type="datetime-local" data-f="from" value="${dtLocal(p.from)}" aria-label="Paused from">
      to <input type="datetime-local" data-f="to" value="${p.to!=null?dtLocal(p.to):""}" aria-label="Paused until"> <span class="note">empty: still paused</span></td>${saveBtns}</tr>`
    :`<tr class="pauseRow"><td colspan="5">Paused ${when(p.from)} → ${p.to!=null?when(p.to):"now"} · ${fmtAway(p)}${p.to!=null?"":" so far"}</td>${btns(`data-pedit="${i}"`,`data-pdel="${i}"`,"pause")}</tr>`}));
  $("logTable").querySelector("tbody").innerHTML=rows.sort((a,b)=>a.t-b.t||a.k-b.k).map(r=>r.h).reverse().join("")
    ||`<tr><td colspan="6" class="name muted">No entries yet. Add your current level and EXP %.</td></tr>`;
  $("setupNote").textContent=s.job&&s.job!==state.job?`This session was logged as ${s.job}. Switch Job to ${s.job} to see its pace and walking time.`:"";
}
function renderCompare(){
  const all=state.sessions.map(s=>{const st=stats(s);if(!st)return null;const ms=sessMobs(s),mix=sessMix(s);const kph=mix&&st.avgRaw>0&&mix.avg(m=>m.exp)>0?st.avgRaw/mix.avg(m=>killExp(m,s)):null;return {s,st,ms,kph}}).filter(Boolean);
  const rows=tableRows("cmpTable",all).map(({s,st,ms,kph})=>
    `<tr data-sid="${esc(s.id)}" class="${s.id===state.current?"sel":""}"><td class="name">${esc(s.name)}</td><td class="name">${esc(s.job||"–")}</td><td class="name">${ms.length?ms.map(m=>esc(m.name)).join(", "):"–"}</td><td>${fmtD(st.es[0].t)} ${fmtT(st.es[0].t)}</td><td>${st.spanMin} min</td><td title="% of the EXP base Lv ${esc(st.last.lv)} needs, gained per hour"><b>${pct(st.avgPct)}</b> <span class="muted">at B${esc(st.last.lv)}</span></td><td>${fmtN(st.avgRaw/60)}</td><td>${kph?fmtN(kph):"–"}</td><td>${kph?(3600/kph).toFixed(1)+"s":"–"}</td><td>${st.deaths?`<span title="${st.deaths} death${st.deaths>1?"s":""} logged">💀 ${st.deaths}</span>`:"–"}</td></tr>`);
  $("cmpTable").querySelector("tbody").innerHTML=rows.join("")||`<tr><td colspan="10" class="name muted">${all.length?"No sessions match the filters.":"Sessions with 2+ entries show up here."}</td></tr>`;
}
function renderGoal(s,st){
  const tiles=$("goalTiles"),goal=Math.min(MAX_BASE_LV,num(state.goalLv)||GOAL_TOP_LV);$("goalLv").max=MAX_BASE_LV;if(document.activeElement!==$("goalLv"))$("goalLv").value=goal;
  if(!st||st.avgRaw<=0){tiles.innerHTML='<div class="note">Log 2+ entries with EXP going up to see goal estimates.</div>';$("goalNote").textContent="";return}
  const curLv=st.last.lv;
  if(goal<=curLv){tiles.innerHTML=`<div class="note">You're already Lv ${curLv}. Pick a higher level.</div>`;$("goalNote").textContent="";return}
  let need=lvExp(curLv)?lvExp(curLv)*(1-st.last.pct/100):null;for(let l=curLv+1;l<goal&&need!=null;l++)need=lvExp(l)?need+lvExp(l):null;
  if(need==null){tiles.innerHTML=`<div class="note">The EXP each level needs is only known up to Lv ${GOAL_TOP_LV-1} so far, so pick a goal up to Lv ${GOAL_TOP_LV}.</div>`;$("goalNote").textContent="";return}
  const hrs=need/st.avgRaw;
  $("goalNote").textContent=`at your ${pct(st.avgPct)}/hr average`;
  tiles.innerHTML=`<div class="tile"><div class="k">EXP still needed</div><div class="v mono">${fmtN(need)}</div><div class="s">from Lv ${curLv} ${st.last.pct.toFixed(1)}% to Lv ${goal}</div></div>
   <div class="tile"><div class="k">Farming time</div><div class="v mono">${fmtDur(hrs)}</div><div class="s">at ${fmtN(st.avgRaw)} EXP/hr</div></div>
   <div class="tile now"><div class="k">Reach Lv ${goal}</div><div class="v mono">${new Date(Date.now()+hrs*36e5).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div><div class="s">farming non-stop from now</div></div>`;
  // one straight run per level at the average rate, flatter as levels need more EXP
  const p=st.last.pct,pts=[{h:0,v:curLv+p/100,now:`Lv ${curLv} ${p.toFixed(1)}%`}];let h=lvExp(curLv)*(1-p/100)/st.avgRaw,each=h;
  for(let l=curLv+1;l<=goal;l++){pts.push({h,v:l,lv:l,each});if(l<goal){each=lvExp(l)/st.avgRaw;h+=each}}
  return {pts,lo:curLv,hi:goal,name:"Lv",color:"var(--accent)"};
}
// job level goal: job EXP still needed at the job EXP/hr you farm at your current job level
function renderJobGoal(s){
  const tiles=$("goalJobTiles"),wrap=$("goalJobWrap");wrap.hidden=true;
  const t=JOB_EXP[jobTier()],cap=t.length,jl=num(C().jobLv),j=jobRate(s),need0=jobNeed();
  const msg=m=>{tiles.innerHTML=`<div class="note">${m}</div>`};
  const goal=Math.min(cap,num(state.goalJobLv)||cap),gi=$("goalJobLv");gi.max=cap;if(document.activeElement!==gi)gi.value=goal;
  if(!jl)return msg("Set your job level on the Character tab to see job level estimates.");
  if(jl===cap)return msg(`Job Lv ${cap} is the max for ${state.job}.`);
  if(!j||j.rate<=0)return msg("Log Job EXP % on 2+ entries to see job level estimates.");
  if(!need0)return msg(`Job Lv ${jl} is outside the ${state.job} job EXP table (up to Job Lv ${cap}).`);
  if(goal<=jl)return msg(`You're already Job Lv ${jl}. Pick a higher job level.`);
  const rate=j.rate/100*need0,at=x=>new Date(Date.now()+x*36e5).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),dur=x=>fmtDur(x).split("\n")[0];
  let need=need0*(1-j.last/100),rows=[];rows.push({lv:jl+1,each:need/rate,h:need/rate});
  for(let l=jl+1;l<goal;l++){need+=t[l-1];const each=t[l-1]/rate;rows.push({lv:l+1,each,h:rows[rows.length-1].h+each})}
  const hrs=need/rate;
  tiles.innerHTML=`<div class="tile"><div class="k">Job EXP still needed</div><div class="v mono">${fmtN(need)}</div><div class="s">from Job Lv ${jl} ${j.last.toFixed(1)}% to Job Lv ${goal}</div></div>
   <div class="tile"><div class="k">Farming time</div><div class="v mono">${fmtDur(hrs)}</div><div class="s">at ${fmtN(rate)} job EXP/hr</div></div>
   <div class="tile now"><div class="k">Reach Job Lv ${goal}</div><div class="v mono">${at(hrs)}</div><div class="s">farming non-stop from now</div></div>`;
  const tb=$("goalJobTable");wrap.hidden=false;
  tb.tHead.innerHTML=`<tr><th>Job level</th><th>Time for this level</th><th>Total farming</th><th>Reached, farming non-stop</th></tr>`;
  tb.tBodies[0].innerHTML=rows.map(q=>`<tr><td class="name">Job Lv ${q.lv}</td><td>${dur(q.each)}</td><td>${dur(q.h)}</td><td>${at(q.h)}</td></tr>`).join("");
  return {pts:[{h:0,v:jl+j.last/100,now:`Job Lv ${jl} ${j.last.toFixed(1)}%`},...rows.map(q=>({h:q.h,v:q.lv,lv:q.lv,each:q.each}))],lo:jl,hi:goal,name:"Job Lv",color:"var(--accent-2)"};
}
// projected base level (left axis) and job level (right axis) over farming hours at the average rates.
// Each level-up gets the date you would reach it farming non-stop from now.
let GOAL_PTS=[];
function renderGoalChart(base,job){
  const sers=[base,job].filter(Boolean);$("goalViz").hidden=!sers.length;$("goalWrap").hidden=!base;GOAL_PTS=[];if(!sers.length)return;
  const svg=$("goalChart");const W=chartW(svg),H=W<600?220:260,pl=base?52:18,pr=job?62:18,pt=24,pb=34;svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
  const now=Date.now();
  const dur=x=>fmtDur(x).split("\n")[0];
  const at=x=>new Date(now+x*36e5).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  const hi=Math.max(...sers.map(S=>S.pts[S.pts.length-1].h))||1;const X=x=>pl+x/hi*(W-pl-pr),YS=S=>v=>pt+(S.hi-v)/(S.hi-S.lo)*(H-pt-pb);
  let g="";
  // level gridlines and labels: base on the left, job on the right
  sers.forEach(S=>{const Y=YS(S),ls=Math.max(1,Math.ceil((S.hi-S.lo)/6)),left=S===base;
    for(let l=S.lo;l<=S.hi;l+=ls)g+=(S===sers[0]?`<line x1="${pl}" x2="${W-pr}" y1="${Y(l)}" y2="${Y(l)}" stroke="var(--grid)" stroke-dasharray="4 4"/>`:"")+`<text x="${left?pl-8:W-pr+8}" y="${Y(l)+4}" text-anchor="${left?"end":"start"}" style="fill:${S.color}">${left?"Lv":"Job"} ${l}</text>`});
  const xs=niceStep(hi/5);for(let i=0;i*xs<=hi+1e-9;i++){const x=i*xs;if(X(x)>W-pr-30&&x<hi)continue;g+=`<text x="${X(x)}" y="${H-10}" text-anchor="middle">${fmtP(+x.toFixed(2))}h</text>`}
  g+=`<line id="goalHair" y1="${pt}" y2="${H-pb}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/>`;
  sers.forEach((S,si)=>{const Y=YS(S),pts=S.pts,end=pts[pts.length-1];
    pts.forEach((q,i)=>{q.x=X(q.h);q.y=Y(q.v);q.eta=at(q.h);
      q.tip=i?`<b>${S.name} ${q.lv}</b><br>${dur(q.each)} for this level · ${dur(q.h)} total<br>${q.eta} farming non-stop`:`<b>Now</b><br>${q.now}`});
    const line=pts.map(q=>`${q.x},${q.y}`).join(" ");
    if(S===base)g+=`<defs><linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs><polygon points="${X(0)},${H-pb} ${line} ${end.x},${H-pb}" fill="url(#goalFill)" stroke="none"/>`;
    g+=`<polyline points="${line}" fill="none" stroke="${S.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(pts.length<=30)pts.forEach((q,i)=>{g+=`<circle cx="${q.x}" cy="${q.y}" r="${i&&i<pts.length-1?4:5.5}" fill="${S.color}" stroke="var(--surface)" stroke-width="2"/>`});
    // end label: right of the point when there's room, else above it (first line) or below it (second) so they don't collide
    const lab=`${S.name} ${S.hi} · ${dur(end.h)}`;
    g+=end.x<W-pr-200?`<text x="${end.x+10}" y="${end.y+4}" style="fill:var(--fg)">${lab}</text>`:`<text x="${end.x-8}" y="${si?end.y+20:end.y-10}" text-anchor="end" style="fill:var(--fg)">${lab}</text>`;
    GOAL_PTS.push(...pts)});
  svg.innerHTML=g;
  if(base){const t=$("goalTable");
    t.tHead.innerHTML=`<tr><th>Level</th><th>Time for this level</th><th>Total farming</th><th>Reached, farming non-stop</th></tr>`;
    t.tBodies[0].innerHTML=base.pts.slice(1).map(q=>`<tr><td class="name">Lv ${q.lv}</td><td>${dur(q.each)}</td><td>${dur(q.h)}</td><td>${q.eta}</td></tr>`).join("")}
}
// hover the goal chart: snap to the nearest level-up on either line and show its tooltip
(function goalHover(){
  const svg=$("goalChart"),tip=$("goalTip");
  const hide=()=>{tip.hidden=true;const hr=$("goalHair");if(hr)hr.setAttribute("visibility","hidden")};
  svg.addEventListener("pointermove",e=>{if(!GOAL_PTS.length)return;const r=svg.getBoundingClientRect(),k=r.width/svg.viewBox.baseVal.width,px=(e.clientX-r.left)/k,py=(e.clientY-r.top)/k;
    const d=q=>Math.hypot(q.x-px,(q.y-py)/2),q=GOAL_PTS.reduce((a,b)=>d(b)<d(a)?b:a);
    const hr=$("goalHair");hr.setAttribute("x1",q.x);hr.setAttribute("x2",q.x);hr.setAttribute("visibility","visible");
    tip.innerHTML=q.tip;tip.hidden=false;const w=tip.offsetWidth/2;tip.style.left=Math.min(Math.max(q.x*k,w),r.width-w)+"px";tip.style.top=q.y*k+"px"});
  svg.addEventListener("pointerleave",hide);
})();
// hover the EXP chart: snap to the nearest entry in time
(function expHover(){
  const svg=$("chart"),tip=$("chartTip");
  const hide=()=>{tip.hidden=true;const hr=$("expHair");if(hr)hr.setAttribute("visibility","hidden")};
  svg.addEventListener("pointermove",e=>{if(!EXP_PTS.length)return;const r=svg.getBoundingClientRect(),k=r.width/svg.viewBox.baseVal.width,px=(e.clientX-r.left)/k;
    const q=EXP_PTS.reduce((a,b)=>Math.abs(b.x-px)<Math.abs(a.x-px)?b:a),hr=$("expHair");
    hr.setAttribute("x1",q.x);hr.setAttribute("x2",q.x);hr.setAttribute("visibility","visible");
    tip.innerHTML=q.tip;tip.hidden=false;const w=tip.offsetWidth/2;tip.style.left=Math.min(Math.max(q.x*k,w),r.width-w)+"px";tip.style.top=q.y*k+"px"});
  svg.addEventListener("pointerleave",hide);
})();
// a window that changes width redraws the Session tab's charts at their new size
(function chartResize(){let w=typeof innerWidth==="number"?innerWidth:0,t=0;addEventListener("resize",()=>{clearTimeout(t);t=setTimeout(()=>{if(Math.abs(innerWidth-w)<40)return;w=innerWidth;
  if(!$("chart").closest("[data-tab]").hidden)renderTracker()},150)})})();

// ---- render: monsters ----
const calcMob=()=>MOBS.find(m=>m.id===(state.calcMobId||cur().mobIds[0]));
// " MVP" / " mini boss" / " boss" after a monster's name in filter and sort text, so "mini" in a Monster filter lists the mini bosses
const bossTag=m=>(m.mvp?" MVP":m.mini?" mini boss":m.boss?" boss":"")+(MOB_VARIANT[m.id]?" "+MOB_VARIANT[m.id]:"");
const colText=(m,k)=>k==="name"?m.name+bossTag(m):k==="el"?(m.el||"")+" "+(m.elv||""):k==="size"?({S:"small S",M:"medium M",L:"large L"}[m.size]||""):k==="race"?(m.race||""):k==="topN"?m.om.map(x=>[x[0],...(MAPNAMES[x[0]]||[])].join(" ")).join(" "):null;
const colNum=(m,k)=>{if(["name","el","size","race"].includes(k))return null;if(m.expUnknown&&["exp","ratio","epm"].includes(k))return null;if(k==="dodge")return m.dodge;if(k==="hpm")return m.hpm;if(k==="zk"||k==="zph")return hasLoot(m)?m[k]:null;const v=m[k];return typeof v==="number"&&!isFinite(v)?null:v};
function matchF(expr,n,text){
  expr=String(expr).trim().toLowerCase();if(!expr)return true;
  const parts=expr.split(/\s+or\s+|\||,/).map(x=>x.trim()).filter(Boolean);if(parts.length>1)return parts.some(p=>matchF(p,n,text));
  const blank=n==null||(typeof n==="number"&&!isFinite(n));
  if(/^(-|–|blank|empty|none)$/.test(expr))return blank&&!text;
  let m;
  if(m=expr.match(/^(<=|>=|<|>|=)\s*(-?\d+(?:\.\d+)?)%?$/)){const v=+m[2];if(blank)return false;return m[1]==="<"?n<v:m[1]==="<="?n<=v:m[1]===">"?n>v:m[1]===">="?n>=v:n==v}
  if(m=expr.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/)){if(blank)return false;return n>=+m[1]&&n<=+m[2]}
  if(/^-?\d+(?:\.\d+)?$/.test(expr)&&!blank&&!text)return n==+expr;
  return String(text??n??"").toLowerCase().includes(expr);
}
// the Element / Race / Size / Boss dropdowns: does monster m pass f ({el, race, size, boss})? Boss: noboss leaves out Boss class (the farming
// tables' default), normal also mini bosses, mini lists the mini bosses, mvp the MVPs, boss the Boss-class monsters that are neither
const MOBF_BOSS=[["","Any"],["noboss","No bosses"],["normal","Normal only"],["mini","Mini bosses"],["mvp","MVPs"],["boss","Bosses"]];
const mobFOk=(m,f)=>(!f.el||m.el===f.el)&&(!f.race||m.race===f.race)&&(!f.size||m.size===f.size)
  &&(f.boss==="noboss"?!m.boss:f.boss==="normal"?!m.boss&&!m.mini:f.boss==="mini"?m.mini:f.boss==="mvp"?m.mvp:f.boss==="boss"?m.boss&&!m.mini&&!m.mvp:true);
const mobOpt=m=>`<option value="${esc(m.name)}">Lv ${m.lv} · ${fmtExp(m)} EXP${m.mvp?" · MVP":m.mini?" · mini boss":m.boss?" · boss":""}${MOB_VARIANT[m.id]?" · "+MOB_VARIANT[m.id]:""}</option>`;
const isMagicAtk=()=>C().a.type==="magic"||C().a.type==="spellfist";
function renderMobs(){
  const w=walkSec(),me=showMine();$("mobMine").innerHTML=mineSwitch();
  const shown=m=>mobFOk(m,state.mobF)&&!(state.hideClosed&&!openMaps(m).length);
  const row=m=>{const om=openMaps(m);return {...m,om,topN:om.length?om[0][1]:0,ratio:m.hp>0?m.exp/m.hp:0,...mobRow(m,w)}};
  const F=state.filters,fOk=m=>Object.entries(F).every(([k,v])=>!v||matchF(v,colNum(m,k),colText(m,k)));
  let rows=MOBS.filter(shown).map(row).filter(fOk);
  // nothing left: how many the dropdowns or Hide monsters with no open map leave out, with a way to show them
  const hid=rows.length?0:MOBS.filter(m=>!shown(m)).map(row).filter(fOk).length;
  const k=state.sort,d=state.dir;const sv=m=>{const v=k==="name"||k==="el"||k==="size"||k==="race"?colText(m,k):colNum(m,k);return v==null||v===""?null:v};
  rows.sort((a,b)=>{const x=sv(a),y=sv(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x>y?1:x<y?-1:0)*d});
  document.querySelectorAll("#mobTable th").forEach(th=>th.classList.toggle("on",th.dataset.k===k));
  const sel=(calcMob()||{}).id;
  const nTxt=Object.values(F).some(v=>v)||MOBS.some(m=>!shown(m))?`${rows.length} of ${MOBS.length} monsters`:`${rows.length} monsters`;
  $("mobNote").textContent=!me?`${nTxt} · set up your character for your kill time, EXP / min and zeny`:nTxt;
  $("mobTable").querySelector("tbody").innerHTML=rows.slice(0,400).map(m=>`<tr data-id="${m.id}" class="${m.id===sel?"sel":""}"><td class="name"><a href="#" data-info="mob:${m.id}" aria-label="${esc(m.name)} details">${mobIcon(m.id,1,"il")}</a><a href="#" data-info="mob:${m.id}">${esc(m.name)}</a>${BOSS_PILL(m)}${isSkipped(m)?' <span class="pill down">skipped</span>':""}</td><td>${m.lv}</td><td>${m.el?`<span class="el ${m.el}">${m.el} ${m.elv}</span>`:"–"}</td><td>${m.size||"–"}</td><td class="name">${m.race||"–"}</td><td>${m.hp==null?"?":fmtN(m.hp)}</td><td>${fmtExp(m)}</td><td>${m.expUnknown?"?":m.ratio.toFixed(2)}</td>
    <td class="${m.mult>100?"good":m.mult<=0?"bad":""}">${m.mult<=0?"can't hurt":Math.round(m.mult)+"%"}${elTag(m.el2)}</td><td class="${m.hitc>=95?"good":m.hitc>=70?"warnc":"bad"}">${Math.round(m.hitc)}%</td><td>${isFinite(m.uses)?m.uses.toFixed(1):"–"}</td>
    <td class="${m.sec<=3?"good":m.sec<=8?"warnc":"bad"}">${isFinite(m.sec)?m.sec.toFixed(1)+"s":"–"}</td><td><b>${m.epm?fmtN(m.epm):"–"}</b></td>
    <td class="${m.dodge==null?"":m.dodge>=70?"good":m.dodge>=40?"warnc":"bad"}">${m.dodge==null?"–":m.dodge+"%"}</td><td>${m.hpm==null?"–":fmtN(m.hpm)}</td><td>${hasLoot(m)?fmtN(m.zk):"–"}</td><td>${hasLoot(m)&&isFinite(m.sec)?fmtN(m.zph):"–"}</td>
    <td class="name">${m.om.length?`<span class="map" title="${esc(m.om.map(x=>mapLabel(x[0])+" ≈"+spN(x[1])).join(", "))}"><b>${mapCode(m.om[0][0])}</b><span>≈${spN(m.om[0][1])}</span></span>`:noneOpen(m)}</td><td></td></tr>`).join("")
    ||`<tr><td colspan="19" class="name muted">No monsters match these filters.${hid?` ${hid} more ${hid===1?"monster matches":"monsters match"} outside the Element, Race, Size and Boss dropdowns or Hide monsters with no open map: <a href="#" id="showAllMobs">show every monster</a>.`:""}</td></tr>`;
  $("mobTable").classList.toggle("noChar",!me);
}
// selling trips spread over each kill (weight); hidden when it rounds to nothing
const sellTxt=(s,pre,post="")=>s>=0.05&&isFinite(s)?`${pre}${s.toFixed(1)}s${post}`:s===Infinity?`${pre}<span class="bad">over your sell point</span>`:"";
function weightTile(m){const t=tripInfo(m,walkSec());if(!t)return "";const c=C(),at=sellPct();
  const pctNow=maxWt(c)?Math.round(num(c.curW)/maxWt(c)*100):0;
  const v=!(t.wk>0)?"–":isFinite(t.kills)?`${fmtN(Math.floor(t.kills))} kills`:'<span class="bad">sell first</span>';
  return `<div class="tile"><div class="k">Weight · sell at ${t.fell?70:fmtP(at)}%</div><div class="v mono">${v}</div><div class="s">${t.wk>0?`${t.wk.toFixed(1)} weight per kill`:"its drops weigh nothing"}${isFinite(t.kills)&&t.wk>0?` · ${fmtDur(t.min/60)} a trip + ${fmtN(num(c.townMin,3))} min to town`:""} · start at ${pctNow}%${t.fell?' · <span class="bad">no regen past 70% and you need SP, so you sell at 70%</span>':""}</div></div>`}
// a monster's numbers for your character, for its details popup (js/info.js): EXP / min, per kill, defence, farming without items, weight
function mobYouTiles(m){const r=mobRow(m,walkSec()),L=lvExp(num(C().baseLv))||null;
  return `<div class="tile now"><div class="k">EXP / min</div><div class="v mono">${m.expUnknown?"?":r.epm?fmtN(r.epm)+(m.expUnsure?"*":""):"–"}</div><div class="s">${m.expUnknown?"EXP unknown (no data yet) · ":m.expUnsure?"* EXP unconfirmed · ":""}${r.el2&&convOn()?`with ${esc(convWith(r.el2))} · `:""}${isFinite(r.sec)?r.sec.toFixed(1)+"s fight + "+walkSec().toFixed(1)+"s walk"+sellTxt(r.tot-r.sec-walkSec()," + "," selling"):"can't hurt it"}${L&&r.epm?` · ~${pct(r.epm*60/L*100)}/hr at Lv ${C().baseLv}`:""}</div></div>
   <div class="tile"><div class="k">Per kill</div><div class="v mono">${isFinite(r.uses)?r.uses.toFixed(1):"–"} uses</div><div class="s">${fmtN(withEl(r.el2,()=>dmgPerHit(m)))}${dualHit()?` + ${fmtN(withEl(r.el2,()=>leftDmg(m)))} left hand`:""} per hit · ${Math.round(r.hitc)}% land · ${fmtN(num(C().a.sp)*spCostMul()*r.uses/targets())} SP</div></div>
   <div class="tile" title="${esc(hpTip(r))}"><div class="k">Defence</div><div class="v mono">${r.hpm==null?"–":fmtN(r.hpm)}</div><div class="s">HP lost/min${r.hpm>0&&vitHeals()?" (your Heals cover it)":""}${r.pz>0.005?` · poisoned ${Math.round(r.pz*100)}%`:""}${crowdN(m)>1?` · rampage of ${fmtP(crowdN(m))}`:""} · you dodge ${r.dodge??"–"}%</div></div>
${withEl(r.el2,()=>susTile(susMob(m,walkSec()),"vs "+esc(m.name)))}
${weightTile(m)}`}
// a monster that is a version of another (data/client.js): "Boss Bathory", "Enhanced Owl Duke"
const VARIANT_PILL=id=>{const v=MOB_VARIANT[id];return v?` <span class="pill" title="${esc(v.replace(" "," version of "))}">${esc(v)}</span>`:""};
const BOSS_PILL=m=>(m.mvp?' <span class="pill mvp" title="MVP: Boss class, boss / normal bonuses count it as a boss">MVP</span>':m.mini?` <span class="pill" title="One per map on a long respawn · ${m.boss?"Boss class: boss / normal bonuses count it as a boss":"not Boss class: boss / normal bonuses count it as normal"}">mini boss</span>`:m.boss?' <span class="pill">boss</span>':"")+VARIANT_PILL(m.id);
// Farm without items (susCalc): the % in its colour, with what goes in and out on hover
const susPct=s=>`${Math.floor(Math.min(100,s.score))}%`;
const susTip=s=>{if(!s)return "";const f=v=>fmtN(v),h=s.heal,i=s.ind;
  return [`Farm without items: ${susPct(s)} (${s.label})${s.known?"":" · some monsters have no ATK data, so their hits aren't counted"}`,
    `HP: lose ${f(s.hpOutM)}/min, back ${f(s.hpInM)}/min${s.hfM>=0.5?` (Hunter Fly ${f(s.hfM)})`:""}${s.healsM>0?` + ${h.name} ×${fmtQty(s.healsM)}/min = ${f(s.healM)}`:h?` · ${h.name} ready`:" · no Heal"} → ${Math.floor(s.hpCov)}% covered`,
    `SP: use ${f(s.spOutM)}/min, back ${f(s.spInM)}/min${s.cardM>=0.5?` (cards ${f(s.cardM)})`:""}${s.indsM>0?` + ${i.name} ×${fmtQty(s.indsM)}/min = ${f(s.indM)}`:""} → ${Math.floor(s.spCov)}% covered`,
    s.rest>0?(isFinite(s.rest)?`Sit ~${s.rest.toFixed(1)}s a kill to catch up (standing regen)`:"No regen to catch up with"):"",
    s.mob>1?`Rampage of ${s.mob} monsters: their hits add up, FLEE −${Math.round((1-crowdFlee(s.mob))*100)}%, DEF −${Math.round((1-crowdDef(s.mob))*100)}%`:"",
    s.burst>=0.5?`One kill can take ${Math.round(s.burst*100)}% of your Max HP before regen catches up`:""].filter(Boolean).join("\n")};
const susCell=s=>s?`<span class="${s.cls}" title="${esc(susTip(s))}"><b>${susPct(s)}</b></span>`:"–";
const susTile=(s,where)=>s?`<div class="tile" title="${esc(susTip(s))}"><div class="k">Farm without items</div><div class="v mono ${s.cls}">${susPct(s)}</div><div class="s"><span class="${s.cls}">${s.label}</span>${where?" "+where:""} · HP ${Math.floor(s.hpCov)}% · SP ${Math.floor(s.spCov)}% covered${s.healsM>0?` · ${s.heal.name} ×${fmtQty(s.healsM)}/min`:""}${s.indsM>0?` · ${s.ind.name} ×${fmtQty(s.indsM)}/min`:""}${s.rest>0&&isFinite(s.rest)?` · sit ~${s.rest.toFixed(1)}s/kill`:""}${s.mob>1?` · rampage of ${s.mob}`:""}${s.burst>=0.5?` · <span class="${s.burst>=1?"bad":"warnc"}">a kill takes ${Math.round(s.burst*100)}% HP</span>`:""}</div></div>`:"";
// a map with a possible rampage: several monsters attacking you together (Map planner setting)
const mobbedPill=mp=>mobbedOf(mp)>1?` <span class="pill down" title="Possible rampage: ${mobbedOf(mp)} monsters attacking you together (set in the Map planner): more hits, FLEE −${Math.round((1-crowdFlee(mobbedOf(mp)))*100)}%, DEF −${Math.round((1-crowdDef(mobbedOf(mp)))*100)}%">×${mobbedOf(mp)} rampage</span>`:"";
// the EXP Hunter's Heal cost / hr: which items and how many an hour
const healTip=r=>{const h=recPick("hp"),s=recPick("sp");return [r.hpm==null?"HP: no damage data":r.hpm>0&&vitHeals()?`HP: your Vitata Heals cover ${fmtN(r.hpm)}/min (SP and time, no HP items)`:r.hpZ>0&&h?`HP: ${h.name} ×${fmtQty(r.hpHr)}/hr = ${fmtN(r.hpZ)} z`:r.hpm>0&&!h?"HP: no HP item":"HP: none lost",
  r.spHr>0&&s?`SP: ${s.name} ×${fmtQty(r.spHr)}/hr = ${fmtN(r.spZ)} z`:!s?"SP: no SP item (you rest)":itemsOnNow()?"SP: regen covers it":"SP: no SP items (auto-use off, you rest)"].join("\n")};
// the Zeny Hunter's Costs / hr: healing as above, plus the ASPD potion and ground buffs
const costTip=r=>healTip(r)+(r.other>=0.5?`\n${["ASPD potion",fieldBuffs().length&&"ground buffs",convOn()&&"weapon element items"].filter(Boolean).join(", ")}: ${fmtN(r.other)} z`:"");
const UNK_PILL=' <span class="pill down" title="No EXP data for it yet, so it\'s left out of EXP / min">EXP ?</span>';
// the EXP Hunter's tooltips: what a kill's seconds are made of and where the walking comes from; the HP a minute taken, regen and healing
const secTip=r=>`${r.sec.toFixed(1)}s fighting + ${r.walk.toFixed(1)}s walking${r.sell>=0.05?` + ${r.sell.toFixed(1)}s of selling trips`:""} per kill${r.cal?`\ncalibrated to your logs (×${r.cal.toFixed(2)}): ~${r.secT.toFixed(1)}s a kill`:""}\n${walkSrcTxt()}`;
const hpTip=r=>r.hpm==null?"no damage data":`${fmtN(r.hpt)} HP/min taken from hits${r.psn>0.5?` and poison (${fmtN(r.psn)} of it)`:""}, ${fmtN(Math.max(0,r.hpt-r.hpm))} back from HP regen${hfCards()?" and Hunter Fly":""}${r.hpm>0?vitHeals()?"; your Vitata Heals cover the rest (no HP items)":"; HP items cover the rest":""}${r.pz>0.005?`\npoisoned ${Math.round(r.pz*100)}% of the time: no natural HP or SP regen then`:""}`;
const tripTxt=h=>h==null?"–":fmtDur(h).split("\n").pop();
// under the EXP and Zeny Hunters: how many rows are over the max sec / kill, and the maps your level can't enter yet
const huntLimTxt=rows=>{const n=rows.filter(r=>r.slow).length,lk=Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)&&lvLocked(mp));
  return esc((n?` · ${n} over ${maxSecKill()}s / kill ranked last`:"")+(lk.length?` · ${lk.map(mp=>`${mapCode(mp)} needs Lv ${mapMinLv(mp)}`).join(", ")}`:""))};
// ---- render: Where to farm (the best spots, then one ranking by EXP or by zeny) ----
// the top 3 maps by EXP (renderBest) and by zeny (renderHunt), with a Farm here button each
let SPOT_EXP=[],SPOT_ZENY=[];
// every map each ranking ranked (by EXP, by zeny), for the numbers on Where to farm's world map
const FARM_RANKED={exp:[],zeny:[]};
const top3=rows=>rows.filter(r=>r.rank<=3).sort((a,b)=>a.rank-b.rank);
// the monsters Farm here hunts: the zeny table's picks on that map, else every monster there but bosses and skipped ones
const farmIds=r=>r.earn?r.earn.map(x=>x.m.id):mapHuntIds(r.mp);
// a map as players know it: its name first, the map code after it (just the code when it has no name)
const mapTitle=mp=>mapName(mp)?`<b>${esc(mapName(mp))}</b> <span class="note mono">${mapCode(mp)}</span>`:`<b class="mono">${mapCode(mp)}</b>`;
const farmBtn=r=>{const s=cur(),ids=farmIds(r),here=sessMap(s)===r.mp;
  return here&&ids.length===s.mobIds.length&&ids.every(id=>s.mobIds.includes(id))?'<span class="pill">✓ farming</span>'
    :`${here?'<span class="pill">current</span> ':""}<button type="button" class="small farmBtn" data-farm="${esc(r.mp)}" data-ids="${ids.join(",")}" title="Make ${esc(mapCode(r.mp))} the session's map, hunting ${ids.length} of its monsters">Farm here</button>`};
function renderSpots(){const max=atMaxLv(),sm=sessMap(cur());
  const mobs=r=>(r.earn?r.earn.map(x=>x.m):MAPMOBS[r.mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).sort((a,b)=>b.n-a.n).map(x=>x.m)).slice(0,3).map(m=>esc(m.name)).join(", ");
  const col=(head,rows,val)=>`<div class="spotCol"><div class="secHead">${head}</div>${rows.length?rows.map(r=>`<div class="spot${r.mp===sm?" on":""}"><span class="spotN">${r.rank}</span>
    <div class="spotTxt"><div>${mapTitle(r.mp)}</div><div class="spotV">${val(r)}</div><div class="note">${mobs(r)}</div></div>${farmBtn(r)}</div>`).join("")
    :'<div class="note">No open maps match.</div>'}</div>`;
  // at the max base level EXP no longer counts: only the zeny column
  $("spots").innerHTML=(max?"":col("Best for EXP",SPOT_EXP,r=>`<b>${fmtN(r.epm)}</b> EXP / min · ${fmtN(r.net)} z/hr net`))+col("Best for zeny",SPOT_ZENY,r=>`<b>${fmtN(r.net)}</b> z/hr net${r.epm!=null?` · ${fmtN(r.epm)} EXP / min`:""}`);
  $("spots").classList.toggle("one",max);
  // folded, its line still names the best map of each, then the ranking below (syncFarm)
  const best=(rows,by)=>rows[0]?`${by}: ${mapName(rows[0].mp)||mapCode(rows[0].mp)}`:"";
  $("rankSum").dataset.best=[!max&&best(SPOT_EXP,"EXP"),best(SPOT_ZENY,"zeny")].filter(Boolean).join(" · ");
  renderFarmWorld()}
// Where to farm's Best maps (the best spots, then the ranking) folds, remembered like a card (state.collapsed). The ranking's top 3
// are the best spots' cards just above it, so the table in its own order with no filter on starts after them (its first row says so);
// sort by a column or filter it to see them in the table
const RANK_FOLD="Where to farm: ranking";
{const d=$("rankMore");if(d){d.open=!(state.collapsed||{})[RANK_FOLD];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[RANK_FOLD])return;if(d.open)delete c[RANK_FOLD];else c[RANK_FOLD]=true;save()})}}
const inSpots=id=>{const [k,d]=tblSort(id),[k0,d0]=sortDef(id);return k===k0&&d===d0&&!activeFilters(id).length};
// the rows the table shows (the top N, less the best spots' 3 while those show) and its first row saying where they went
const spotRows=(id,rows,on,lim,head)=>{const top=filterRows(id,rows).slice(0,lim),n=on?top.filter(r=>r.rank<=3).length:0;
  if(!n)return {rows:sortRows(id,top),note:""};
  return {rows:sortRows(id,top.filter(r=>r.rank>3)),note:`<tr class="spotsNote"><td colspan="18" class="name muted">#1–${n} are in ${head} above · sort by a column to list them here too</td></tr>`}};
// Where to farm's world map: every spawn map (not towns), the session's lit; a click farms that map with its monsters (farmMap, as Farm here).
// The maps the ranking shows (Show) carry their rank, the top 3 picked out; their box's tooltip gives the rank and the EXP / min or zeny / hr
const WORLD_FARM_FOLD="Where to farm: world map";
{const d=$("farmWorldMore");if(d){d.open=!(state.collapsed||{})[WORLD_FARM_FOLD];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[WORLD_FARM_FOLD])return;if(d.open)delete c[WORLD_FARM_FOLD];else c[WORLD_FARM_FOLD]=true;save()})}}
const farmPick=k=>{if(!MAPMOBS[k]){showToast(`${mapName(k)||mapCode(k)} has no monsters to farm`);return}
  farmMap(k);showToast(`Farming ${mapCode(k)} in "${cur().name}"${isClosed(k)?" (not open yet)":""}: log your EXP as you go`)};
function renderFarmWorld(){const el=$("farmWorld");if(!el||typeof WORLDMAPS==="undefined")return;
  const s=cur(),mp=MAPMOBS[sessMap(s)]?sessMap(s):null,z=state.farmBy==="zeny"||atMaxLv(),lim=num($("farmN").value,10);
  worldMap(el,mp,farmPick,false);
  const rk={};(FARM_RANKED[z?"zeny":"exp"]||[]).forEach(r=>{if(r.mp&&r.rank<=lim)rk[r.mp]=r});
  el.querySelectorAll(".wmBox[data-wm],.wmDot[data-wm]").forEach(b=>{if(b.dataset.t0==null)b.dataset.t0=b.title;
    const best=b.dataset.wm.split(",").map(k=>rk[k]).filter(Boolean).sort((a,c)=>a.rank-c.rank)[0];
    if(b.classList.contains("wmDot")||!best){delete b.dataset.rank;b.classList.remove("top")}else{b.dataset.rank=best.rank;b.classList.toggle("top",best.rank<=3)}
    b.title=b.dataset.t0+(best?`\n#${best.rank} ${z?`· ${fmtN(best.net)} z/hr net`:`· ${fmtN(best.epm)} EXP / min`}`:"")+"\nClick to farm here"});
  const n=Object.keys(rk).length;
  $("farmWorldSum").textContent=[mp&&`${mapName(mp)||mapCode(mp)} lit`,n&&`top ${n} by ${z?"zeny":"EXP"} numbered`].filter(Boolean).join(" · ")}
// show the ranking picked (by EXP or by zeny) and only its options; More options' line says what they're set to
function syncFarm(){const by=state.farmBy==="zeny"?"zeny":"exp",z=by==="zeny",maps=state.huntMode!=="mobs";
  // no character yet: a note in place of rankings worked out for a Novice
  $("farmCard").classList.toggle("noChar",!charSet());
  ROOTQ("[data-farmby]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.farmby===by)));
  $("bestWrap").hidden=z;$("huntWrap").hidden=!z;$("bestBasis").hidden=z;$("huntBasis").hidden=!z;$("huntModeSeg").hidden=!z;
  $("bestMinWrap").hidden=z;$("calWrap").hidden=z;["huntMinWrap","huntLvWrap","huntPenWrap","teleWrap"].forEach(id=>$(id).hidden=!z);$("huntAutoWrap").hidden=!z||!maps;
  {const n=num($("farmN").value,10);$("rankSum").textContent=[$("rankSum").dataset.best,`ranked by ${z?"zeny":"EXP"}${z&&!maps?", single monsters":""} · ${n>=1000?"all":"top "+n}`].filter(Boolean).join(" · ")}
  const off=LOOT_GROUPS.filter(([g])=>!looted0(g)).map(([,n])=>n.toLowerCase());
  $("farmMoreSum").textContent=[`min ${num($(z?"huntMin":"bestMin").value)} monsters`,`max ${maxSecKill()||"∞ "}s / kill`,!z&&state.calOn&&"calibrated",
    z&&huntLvTxt().replace(/^ · hunting /,""),z&&maps&&state.huntAuto&&"best-paying only",off.length&&`not looting ${off.join(", ")}`].filter(Boolean).join(" · ")}
function renderBest(){
  const min=num($("bestMin").value),lim=num($("farmN").value,10);const w=walkSec();const s=cur(),st=stats(s);const curMap=currentMap(),max=atMaxLv();
  const curEpm=curMap?sessEpm(s,w):null,cal=calInfo(w),k=state.calOn&&cal.k?cal.k:null;
  const rows=Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)&&!lvLocked(mp)).map(mp=>mapStats(mp,w)).filter(r=>r&&r.N>=min);
  const sameJob=(s.job||state.job)===state.job;
  // rank every open map by EXP / min (Net zeny / hr at the max level), then filter, keep the top N and sort by the picked column.
  // Projected is worked out before the calibration, as it's already scaled to your session
  rows.forEach(r=>{r.proj=st&&sameJob&&curEpm?st.avgPct*r.epm/curEpm:null;r.logged=cal.maps[r.mp]||null;if(k)calApply(r,k)});
  rankRows(rows,max?r=>r.net:r=>r.epm);SPOT_EXP=top3(rows);FARM_RANKED.exp=rows;
  const sp=spotRows("bestTable",rows,!max&&inSpots("bestTable"),lim,"Best for EXP"),shown=sp.rows;
  $("bestBasis").innerHTML=(max?`<b>Max level: EXP doesn't matter</b> · ranked by Net zeny / hr · `:"")+esc(`${state.job} · ${C().a.name||"attack"} · ${convOn()?convLabel("per map"):atkEl()} · walking ~${w.toFixed(1)}s/kill`+(curEpm&&st?` · compared with your session on ${mapCode(curMap)} at ${pct(st.avgPct)}/hr`:""))+(k?` · <b>calibrated ×${k.toFixed(2)}</b>`:"")+huntLimTxt(rows);
  $("calOn").checked=!!state.calOn;$("calOn").disabled=!cal.k&&!state.calOn;
  $("calNote").textContent=cal.k?`×${cal.k.toFixed(2)}: median of real ÷ projected kills over ${cal.n} session${cal.n>1?"s":""} longer than 60 min`:`needs a ${state.job} session longer than 60 min`;
  {const c=C(),mw=maxWt(c),hid=(state.hideCols||{}).bestTable||[];$("bestWeight").hidden=["Weight / kill","Weight / hr","Town trip every"].every(n=>hid.includes(n));$("bestWeight").textContent=mw>0?`Weight columns assume ${fmtN(num(c.curW))} / ${fmtN(mw)} weight now, selling at ${fmtP(sellPct())}% (${fmtN(mw*sellLim())}) with ${fmtN(num(c.townMin,3))} min to town and back · drops × your drop rate${num(state.dropBonus)?` +${num(state.dropBonus)}%`:""} and the level penalty, auto-looted groups only`
    :"Weight columns: type your Max Weight on the Character tab (or the sell timer) to see town trips"}
  $("bestTable").querySelector("tbody").innerHTML=sp.note+(shown.map(r=>{
    const main=MAPMOBS[r.mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>`<div>${mobIcon(x.m.id,1,"il")}${esc(x.m.name)} <span class="note">×${x.n}</span>${BOSS_PILL(x.m)}${x.m.expUnknown?UNK_PILL:""}</div>`).join("");
    const proj=r.proj,L=r.logged;
    return `<tr data-map="${r.mp}" class="${r.mp===curMap?"sel":""}"><td>${r.rank}</td><td class="name">${mapTitle(r.mp)}${mobbedPill(r.mp)}${slowPill(r)}${elTag(r.el2)} ${farmBtn(r)}</td><td class="name mainmobs">${main}</td><td${max?' class="muted" title="Max level: base EXP no longer counts"':""}><b>${fmtN(r.epm)}</b></td><td title="${esc(secTip(r))}">${r.sec.toFixed(1)}s + ${r.walk.toFixed(1)}s${sellTxt(r.sell," + ")}${r.cal?` <span class="note">≈${r.secT.toFixed(1)}s</span>`:""}</td><td>${fmtN(r.epk)}</td><td>${fmtN(r.zb)}</td><td title="${esc(healTip(r))}">${r.heal>=0.5?fmtN(r.heal):"–"}</td><td class="${r.net>0?"good":"bad"}"><b>${fmtN(r.net)}</b></td><td title="${esc(hpTip(r))}">${r.hpm==null?"–":fmtN(r.hpm)}</td><td>${susCell(r.sus)}</td><td>${r.skip?`<span class="pill down" title="${esc(r.skipNames.join(", "))}">${r.skip}</span>`:"–"}</td><td>≈${r.N}</td><td>${proj==null?"–":"~"+proj.toFixed(1)+"%/hr"}</td>
      <td title="${L?esc(L.tip):"no session of this job logged here"}">${L?`<span class="${L.ratio<0.9?"warnc":L.ratio>1.1?"good":""}">${L.ratio.toFixed(2)}×</span> <span class="note">${L.list.length} log${L.list.length>1?"s":""}</span>`:"–"}</td>
      <td>${fmtQty(r.wk)}</td><td>${fmtQty(r.wph)}</td><td title="${r.trip==null?"":esc(`about ${fmtN(wRoom(sellLim())/r.wk)} kills to your sell point, then ${fmtN(num(C().townMin,3))} min to town and back`)}">${wOn()?tripTxt(r.trip):"–"}</td></tr>`}).join("")
    ||(sp.note?"":'<tr><td colspan="18" class="name muted">No open maps match.</td></tr>'));
  renderSpots();syncFarm();
}
// ---- render: Where to farm, by zeny ----
// the memorial items' names (data/memorial.js): reward boxes, Jello Fragments, Jellostones, the Subjugation Team / Expedition gear,
// Mithril and the Oath rings and earrings
const MEM_ITEMN={};
if(typeof JELLO!=="undefined")[...MEMORIALS.flatMap(m=>[...m.normal,...(m.hard||[])]),...JELLO.flatMap(j=>[j.frag,j.stone]),JELLO_BOX,
  EXPEDITION_CRYSTALS,...EXPEDITION.flatMap(x=>[[x.id,x.name],x.from]),...MEM_CRAFTS.flatMap(x=>[[x.id,x.name],...x.mats])].forEach(([id,name])=>{if(id)MEM_ITEMN[id]=name});
const CLIENT_ITEM=typeof CLIENT_ITEMS!=="undefined"?CLIENT_ITEMS:{};
// drops first, then the recipe, memorial, recovery and skill item tables, then the client's catalog, for the items no monster drops
const itemName=id=>ITEMN[id]||(typeof RECIPE_ITEMN!=="undefined"&&RECIPE_ITEMN[id])||MEM_ITEMN[id]||(RECOVERY[id]||{}).name||(CONSUM[id]||[])[0]
  ||(CLIENT_ITEM[id]||[])[0]||"#"+id;
// the client catalog's category for an item (data/clientitems.js): "Consumable", "Costume", "Material"…; "" when it isn't in it
const clientCat=id=>(CLIENT_ITEM[id]||[])[1]||"";
const CLIENT_CATS=[...new Set(Object.values(CLIENT_ITEM).map(x=>x[1]))].sort();
// a drop chance for display: "?" when there's no published rate (data/loot.js null)
const chTxt=ch=>ch==null?"?":ch+"%";
// each drop with its chance, NPC price and any market price; the level penalty leads when it applies
const npcTag=id=>npcSell(id)>0?`NPC ${fmtN(npcSell(id))} z`:"";
const dropNames=m=>(penNote(m)?penNote(m)+" · ":"")+(m.drops||[]).map(([id,ch])=>`${itemName(id)} ${chTxt(ch)}${[npcTag(id),state.prices[id]>0?`players ${fmtN(state.prices[id])} z`:"",looted(id)?"":"not looted"].filter(Boolean).map(x=>` (${x})`).join("")}`).join(", ");
// a monster's whole drop list: chance after your drop bonus and the level penalty, and what each adds per kill; drops you don't loot sink to the bottom
const dropZTxt=z=>z>=10?fmtN(z):z>0&&z<0.01?"<0.01":z.toFixed(z>=1?1:2);
const dropList=m=>(m.drops||[]).map(([id,ch])=>({id,ch,z:dropZ(m,id,ch),on:looted(id)})).sort((a,b)=>b.on-a.on||b.z-a.z)
  .map(d=>`<div class="drop${d.on?"":" off"}">${itemIcon(d.id,1,"il")}<a href="#" data-info="item:${esc(d.id)}" title="${d.ch==null?"no published drop rate":d.ch+"% base"}${npcSell(d.id)>0?` · NPC pays ${fmtN(npcSell(d.id))} z`:""} · click for details and its price">${esc(itemName(d.id))}</a> <span class="note">${chTxt(yourCh(m,d.ch))} · ${d.on?dropZTxt(d.z)+" z/kill":"not looted"}${ITEMW[d.id]>0?` · ${fmtN(ITEMW[d.id])} wt each`:""}</span>${state.prices[d.id]>0?` <b>${fmtN(state.prices[d.id])} z</b>`:""}</div>`).join("");
// a map's monsters, hunted ones first; click one to stop or start hunting it
const huntPicker=(r,w)=>`<div class="note">hunting ${r.earn.length} of ${r.mobs.length}${r.tele?` · teleport ~${r.tele.toFixed(1)}×/kill`:r.walk>w*1.01?` · walk ${r.walk.toFixed(1)}s/kill`:""}${r.manual?` · set by you · <a href="#" data-hreset="${esc(r.mp)}">reset</a>`:state.huntAuto?" · best-paying":""}${canTele()?` · <a href="#" data-notele="${esc(r.mp)}" title="Which maps block teleport isn't known: click to mark this one">${noTele(r.mp)?"no teleport":"teleport ok"}</a>`:""}</div>`
  +r.mobs.map(x=>`<div>${x.lvOut?`<span class="hpick off" title="${esc(dropNames(x.m))} · Lv ${x.m.lv}: passed by, outside your level filter">✕ ${esc(x.m.name)}</span>`
    :`<a href="#" class="hpick${x.on?"":" off"}" data-hpick="${esc(r.mp)}" data-hmob="${x.m.id}" title="${esc(dropNames(x.m))} · click to ${x.on?"pass it by":"hunt it"}">${x.on?"✓":"✕"} ${esc(x.m.name)}</a>`}${BOSS_PILL(x.m)} <span class="note">×${spN(x.n)} · Lv ${x.m.lv} · ${fmtN(x.zk)} z · ${fmtQty(x.wk)} wt${dropPenalty(x.m)?` · drops −${dropPenalty(x.m)}%`:""}${x.lvOut?" · Lv filter":""}</span></div>`).join("");
// ---- Market: your prices for the server you play on, sorted into the in-game market's categories ----
// the best drop chance of each item (bosses left out): tagged "best" in the details popup's Dropped by
const DROPPERS={};MOBS.forEach(m=>(m.drops||[]).forEach(([id,ch])=>{const d=DROPPERS[id];if(!m.boss&&(!d||ch>d.ch))DROPPERS[id]={m,ch}}));
// gear and cards by id, for their names, card slots and category
const MKT_GEAR={};(typeof EQUIP!=="undefined"?EQUIP:[]).forEach(e=>{if(e.id!=null)MKT_GEAR[e.id]=e});(typeof CARDS!=="undefined"?CARDS:[]).forEach(c=>{MKT_GEAR[c.id]=Object.assign({card:true},c)});
// an item's name as the market shows it, card slots included ("Katar [2]")
const mktName=id=>{const g=MKT_GEAR[id],n=ITEMN[id]||(g&&g.name)||itemName(id);return g&&g.slots&&!/\[\d\]$/.test(n)?`${n} [${g.slots}]`:n};
const MKT_CATS=[["","All"],["cons","Consumables"],["etc","Etc."],["weapon","Weapons"],["armor","Armor"],["card","Cards"],["ench","Enchants"],["cost","Costumes"],["pet","Pets"],["box","Boxes"]];
const MKT_CLIENT={Consumable:"cons",Costume:"cost","Enchant Stone":"ench","Pet Egg":"pet","Pet Equipment":"pet","Taming Item":"pet","Package/Box":"box"};
const MKT_GROUP={w:"weapon",a:"armor",u:"cons",c:"card",o:"cost"};
const mktCat=id=>{const g=MKT_GEAR[id];if(g)return g.card?"card":g.type||(g.slot||[]).includes("weapon")?"weapon":"armor";
  return MKT_CLIENT[clientCat(id)]||(ITEMTYPE[id]&&MKT_GROUP[ITEMTYPE[id]])||"etc"};
// zeny as typed: "1,500,000", "1.5m", "450k" or "450kz"; null when blank, NaN when it isn't a price
const parseZ=s=>{s=String(s??"").trim().toLowerCase().replace(/[,\s_]/g,"").replace(/z$/,"");if(!s)return null;
  const m=s.match(/^(\d+(?:\.\d+)?|\.\d+)([km]?)$/);return m?Math.round(+m[1]*(m[2]==="m"?1e6:m[2]==="k"?1e3:1)):NaN};
// zeny short: 1.5m, 450k, 900
const zShort=n=>{const f=(v,u)=>(+v.toFixed(v>=100?0:v>=10?1:2))+u;return n>=1e6?f(n/1e6,"m"):n>=1e3?f(n/1e3,"k"):String(Math.round(n))};
const agoTxt=t=>{const m=(Date.now()-t)/60000;return m<1?"just now":m<60?`${Math.floor(m)} min ago`:m<1440?`${Math.floor(m/60)} h ago`:m<1440*30?`${Math.floor(m/1440)} day${m<2880?"":"s"} ago`:fmtD(t)};
// note when each price changed and what it was before: a change within a minute of the last one is the same edit, so it keeps that edit's old price
function stampPrices(now=Date.now()){let ch=false;const seen=state.priceSeen;
  for(const id in seen)if(!(id in state.prices)){delete seen[id];ch=true}
  for(const id in state.priceVars)if(!(id in state.prices)){delete state.priceVars[id];ch=true}
  for(const id in state.sell)if(!(id in state.prices)){delete state.sell[id];ch=true}
  for(const id in state.prices){const p=state.prices[id],s=seen[id];if(s&&s[2]===p)continue;ch=true;
    if(!s){seen[id]=[now,null,p];continue}
    const same=s[0]!=null&&now-s[0]<60000;seen[id]=[now,same?s[1]:s[2]>0?s[2]:null,p]}
  if(ch)save();return ch}
// the change from the price before it, in %; null with none to compare
const priceMove=id=>{const s=state.priceSeen[id],p=state.prices[id];return s&&s[1]>0&&p>0&&s[1]!==p?(p-s[1])/s[1]*100:null};
// refine and affixes: only weapons and armor (not cards) have them. A row's affixes are the ones its gear rolls (BUILD.optChoices)
const mktGearOnly=id=>{const g=MKT_GEAR[id];return g&&!g.card?g:null};
const mktSlot=g=>{const s=g.slot||[];return s.includes("weapon")?"weapon":s.includes("footgear")?"shoes":s.includes("garment")?"garment":s.includes("armor")?"armor":s[0]||""};
const MKT_OPT_BY=()=>MKT_OPT_BY.m||(MKT_OPT_BY.m=Object.fromEntries(BUILD.OPTIONS.map(o=>[o.k,o])));
const optTxt=x=>{const o=MKT_OPT_BY()[x.k];return o?`${o.label.replace(/ %$/,"")}${x.v!=null?` ${x.v>0?"+":""}${x.v}${o.pct?"%":""}`:""}`:x.k};
// what's in a copy's slots: cards (one per card slot; a costume's one slot holds the enchant stone on it, data/stones.js), the slot 4
// enchant of Subjugation Team and Expedition armor, garments and shoes (data/memorial.js MEM_ENCHANT, a line such as "STR +1"), and
// the pet egg sealed in a Taming Ring (data/special.js)
const TAMING_RING="24966";
const slotKind=s=>s.startsWith("head")?"head":s.startsWith("accessory")?"accessory":s; // head cards fit any headgear, accessory cards either ring slot
const MKT_CARDS={};
const cardsFor=g=>{const ks=[...new Set((g.slot||[]).map(slotKind))].sort().join();return MKT_CARDS[ks]||(MKT_CARDS[ks]=(typeof CARDS!=="undefined"?CARDS:[])
  .filter(c=>(c.slot||[]).some(x=>ks.split(",").includes(slotKind(x)))).sort((a,b)=>a.name.localeCompare(b.name)))};
const memKind=g=>{const m=/^(Subjugation|Expedition)/.exec(g.name||""),s=g.slot||[],part=s.includes("armor")?"armor":s.includes("garment")?"garment":s.includes("footgear")?"shoes":null;
  return m&&part&&typeof MEM_ENCHANT!=="undefined"?{set:m[1].toLowerCase(),part}:null};
const enchantsFor=g=>{const k=g&&memKind(g);if(!k)return [];const P=MEM_ENCHANT[k.set];return [...new Set([...P.low,...P[k.part]].map(x=>x[0]).filter(x=>x!=="essence"))]};
const EGGS=()=>typeof TAMING_EGGS!=="undefined"?TAMING_EGGS:[];
// a costume's positions (data/costumes.js, e.g. ["upper"]) and the enchant stones that fit them
const costumeOf=id=>typeof COSTUMES!=="undefined"&&COSTUMES[id]||null;
const stonesFor=id=>{const ps=costumeOf(id)||[];return (typeof STONES!=="undefined"?STONES:[]).filter(s=>ps.includes(s.slot)).sort((a,b)=>a.name.localeCompare(b.name))};
// copies are for weapons and armor (refine, cards, affixes), costumes (an enchant stone) and the Taming Ring (its egg)
const copyable=id=>!!mktGearOnly(id)||id===TAMING_RING||!!costumeOf(id);
const slotCount=id=>{const g=mktGearOnly(id);return g?g.slots||0:costumeOf(id)?1:0};
const slotName=id=>(MKT_GEAR[id]||{}).name||((typeof STONES!=="undefined"?STONES:[]).find(s=>s.id===+id)||{}).name||itemName(id);
const cardTxt=c=>{const n={};(c||[]).filter(Boolean).forEach(id=>{const x=slotName(id);n[x]=(n[x]||0)+1});return Object.entries(n).map(([x,k])=>k>1?`${x} ×${k}`:x)};
const eggTxt=id=>(EGGS().find(e=>e.id===+id)||{}).name||"#"+id;
const slotTxt=x=>[...cardTxt(x.c),...(x.e?[x.e]:[]),...(x.egg?[eggTxt(x.egg)]:[])];
const varTxt=x=>[x.r?`+${x.r}`:"",...slotTxt(x),...x.o.map(optTxt)].filter(Boolean).join(" · ")||"+0";
// a new copy, or the one the Add item popup is filling in: with as many empty slots as the gear (or costume) has
const newCopy=id=>{const n=slotCount(id);return {r:0,o:[],...(n?{c:Array(n).fill(null)}:{}),p:0,t:null}};
const copyBare=x=>!x.r&&!x.o.length&&!(x.c||[]).some(Boolean)&&!x.e&&!x.egg;
// every copy priced for an item: yours (the plain one, +0 with nothing in its slots and no affixes, then the others) and the shared ones (s: true)
const sharedCopies=id=>typeof sharedOf==="function"&&sharedOf(id)||[];
// how many players sell an item and let buyers DM them
const sellerN=id=>sharedCopies(id).reduce((a,x)=>a+(x.sellers||0),0);
const ownCopies=id=>id in state.prices?[{r:0,o:[],p:state.prices[id]||0,i:-1},...(state.priceVars[id]||[]).map((x,i)=>({...x,i}))]:[];
const listings=id=>[...ownCopies(id),...sharedCopies(id)];
// does a copy have the Refine ≥, every affix asked for (at least its value; any value when none is typed) and what's typed in
// Card / enchant / egg (every comma-separated part somewhere in its slots)?
const mktSlotQ=()=>(state.mkt.slot||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
const mktFilterOn=()=>state.mkt.refine!=null||state.mkt.opts.some(x=>x.k)||mktSlotQ().length>0;
const listingOk=x=>{const m=state.mkt,sq=mktSlotQ(),st=slotTxt(x).join(" | ").toLowerCase();
  return (m.refine==null||x.r>=m.refine)&&m.opts.filter(f=>f.k).every(f=>x.o.some(o=>o.k===f.k&&(f.v==null||(o.v??0)>=f.v)))&&sq.every(q=>st.includes(q))};
// the price a row sorts and filters by: its cheapest priced copy that fits the filters (the plain price when none are on)
const mktBest=id=>listings(id).filter(x=>x.p>0&&listingOk(x)).sort((a,b)=>a.p-b.p)[0]||null;
const mktPrice=id=>{const b=mktBest(id);return b?b.p:null};
// an item's type within its category, for the Type lists: a weapon's weapon type, armor's part ("" for anything else)
const ITEM_PARTS={head_upper:"Upper headgear",head_middle:"Middle headgear",head_lower:"Lower headgear",armor:"Armor",shield:"Shield",garment:"Garment",footgear:"Shoes",accessory:"Accessory"};
const itemSub=id=>{const g=MKT_GEAR[id];if(!g||g.card)return "";const c=mktCat(id);
  return c==="weapon"?g.type||"":c==="armor"?((g.slot||[]).map(s=>s.startsWith("accessory")?"accessory":s).find(s=>ITEM_PARTS[s])||""):""};
const subTypes=cat=>cat==="weapon"?Object.keys(BUILD.WTYPE).map(t=>[t,BUILD.WTYPE[t]]):cat==="armor"?Object.entries(ITEM_PARTS):[];
// logged in to the shared prices (js/shared.js)
const loggedIn=()=>typeof AUTH!=="undefined"&&!!AUTH;
const OPT_REFINES=n=>Array.from({length:n+1},(_,i)=>i);
// a copy's boxes: refine, a button per slot (its card or stone, with its icon) or for the egg, the slot 4 enchant and the affixes. pre
// names their data attributes: "v" on a list row (data-vr, data-vslot="c:0"…), "a" in the Add item popup. key says which copy the
// slot picker (PICK) is open for: "a", or "v:<item id>:<copy>"
let PICK=null; // {key, kind: "c" a card or stone slot, "egg", j: the slot, q: what's typed in its search}
const slotItems=(id,kind)=>kind==="egg"?EGGS():costumeOf(id)?stonesFor(id):cardsFor(mktGearOnly(id));
function slotPickList(id,kind,q,pre){q=(q||"").trim().toLowerCase();const L=slotItems(id,kind).filter(it=>!q||it.name.toLowerCase().includes(q));
  return `<button type="button" class="slotOpt" data-${pre}pick=""><span class="note">Empty</span></button>`+L.slice(0,60).map(it=>`<button type="button" class="slotOpt" data-${pre}pick="${it.id}">${itemIcon(it.id)}<span>${esc(it.name)}</span></button>`).join("")
    +(L.length>60?`<div class="note slotMore">${fmtN(L.length-60)} more: type to narrow</div>`:L.length?"":`<div class="note slotMore">Nothing matches.</div>`)}
function copyFields(id,x,pre,key){const g=mktGearOnly(id),ench=enchantsFor(g),out=[],n=slotCount(id),cos=!!costumeOf(id);
  const btn=(kind,j,val,label)=>{const on=PICK&&PICK.key===key&&PICK.kind===kind&&PICK.j===j;
    return `<button type="button" class="slotBtn${on?" on":""}" data-${pre}slot="${kind}:${j}" aria-expanded="${on}">${val?`${itemIcon(val)}<span>${esc(kind==="egg"?eggTxt(val):slotName(val))}</span>`:`<span class="note">${label}</span>`}</button>`};
  if(g)out.push(`<select data-${pre}r aria-label="Refine">${OPT_REFINES(20).map(r=>`<option value="${r}"${r===x.r?" selected":""}>+${r}</option>`).join("")}</select>`);
  const slots=[...Array.from({length:n},(_,j)=>btn("c",j,(x.c||[])[j],cos?"Enchant stone: none":`Card ${j+1}: empty`)),...(id===TAMING_RING?[btn("egg",0,x.egg,"Egg: none")]:[])];
  if(slots.length)out.push(`<span class="mktSlots">${slots.join("")}</span>`);
  if(PICK&&PICK.key===key)out.push(`<div class="slotPick"><input type="search" data-${pre}pq value="${esc(PICK.q)}" placeholder="Search ${PICK.kind==="egg"?"eggs":cos?"stones":"cards"}" aria-label="Search"><div class="slotList">${slotPickList(id,PICK.kind,PICK.q,pre)}</div></div>`);
  if(ench.length)out.push(`<select data-${pre}e aria-label="Enchant (slot 4)"><option value="">no enchant</option>${ench.map(e=>`<option${x.e===e?" selected":""}>${esc(e)}</option>`).join("")}</select>`);
  if(g){const ch=BUILD.optChoices(mktSlot(g),g),list=optList(ch);
    const opt=(o,j)=>{const c=o&&ch.find(c=>c.k===o.k),r=c&&c.range;
      return `<span class="mktOpt"><select data-${pre}ok="${j}" aria-label="Affix"><option value="">${o?"remove":"+ affix"}</option>${o&&!c?`<option value="${esc(o.k)}">${esc(optTxt({k:o.k,v:null}))}</option>`:""}${list}</select>${o?`<input class="mono" data-${pre}ov="${j}" inputmode="decimal" value="${o.v??""}" placeholder="${r?`${r[0]}–${r[1]}`:"value"}" aria-label="Affix value"><button type="button" class="small ghost" data-${pre}odel="${j}" title="Remove this affix" aria-label="Remove this affix">✕</button>`:""}</span>`};
    out.push(`<span class="mktOpts">${x.o.map(opt).join("")}${x.o.length<BUILD.OPT_MAX?opt(null,x.o.length):""}</span>`)}
  return out.join("")}
function copyPicks(el,x,pre){x.o.forEach((o,j)=>{const s=el.querySelector(`[data-${pre}ok="${j}"]`);if(s)s.value=o.k})}
// a change in one of a copy's lists or boxes; false when el isn't one of them
function copyChange(x,el,pre){const d=el.dataset;
  if(`${pre}r` in d)x.r=+el.value;
  else if(`${pre}e` in d){if(el.value)x.e=el.value;else delete x.e}
  else if(`${pre}ok` in d){const j=+d[pre+"ok"];if(el.value)x.o[j]={k:el.value,v:x.o[j]?x.o[j].v:null};else x.o.splice(j,1)}
  else if(`${pre}ov` in d){const v=parseFloat(el.value);x.o[+d[pre+"ov"]].v=Number.isFinite(v)?v:null}
  else return false;
  return true}
// a click in a copy's boxes: a slot button opens (or closes) its picker, a picked card / stone / egg goes in, ✕ removes an affix;
// false when it wasn't one of them
function copyClick(x,el,pre,key){
  const sb=el.closest(`[data-${pre}slot]`);if(sb){const [kind,j]=sb.dataset[pre+"slot"].split(":");PICK=PICK&&PICK.key===key&&PICK.kind===kind&&PICK.j===+j?null:{key,kind,j:+j,q:""};return true}
  const pk=el.closest(`[data-${pre}pick]`);if(pk&&PICK&&PICK.key===key){const v=pk.dataset[pre+"pick"];
    if(PICK.kind==="egg"){if(v)x.egg=+v;else delete x.egg}else{x.c=x.c||[];x.c[PICK.j]=v?+v:null}PICK=null;return true}
  const od=el.closest(`[data-${pre}odel]`);if(od){x.o.splice(+od.dataset[pre+"odel"],1);return true}
  return false}
// typing in a picker's search narrows its list without rebuilding the box you're typing in
function copySearch(id,el,pre){if(!PICK||!el.matches(`[data-${pre}pq]`))return false;PICK.q=el.value;el.parentNode.querySelector(".slotList").innerHTML=slotPickList(id,PICK.kind,PICK.q,pre);return true}
function mktVarRow(id,x){const hit=mktFilterOn()&&listingOk(x);
  return `<div class="mktVar${hit?" hit":""}" data-var="${esc(id)}:${x.i}">${copyFields(id,x,"v",`v:${id}:${x.i}`)}
    <span class="mktPrice"><input class="mono" inputmode="decimal" data-vp value="${x.p>0?fmtN(x.p):""}" placeholder="price" aria-label="Price of this copy"><span class="mktZ">z</span>${x.p>=1e3?`<div class="note mono">${zShort(x.p)}</div>`:""}</span>
    <span class="note mktAgo">${x.t?agoTxt(x.t):""}</span>${loggedIn()?`<label class="mktSell" title="You sell this copy at this price: buyers can message you about it on Discord. Untick to take it back"><input type="checkbox" data-vsell${x.sell?" checked":""}> DM</label>`:""}
    <button type="button" class="small ghost" data-vdel title="Remove this copy" aria-label="Remove this copy">✕</button></div>`}
// the Add item popup: the item picked (its icon, name and Change) and its copy boxes (ADD_COPY: its refine, slots, enchant, egg and
// affixes so far). ADD_PICKED: the item picked, copyable or not
let ADD_COPY=null,ADD_ID=null,ADD_PICKED=null;
function renderAddCopy(id){ADD_PICKED=id||null;const pk=$("addPicked"),box=$("priceCopy");
  pk.hidden=!id;pk.innerHTML=id?`<span class="mktIc">${itemIcon(id)}</span><div class="grow"><b>${esc(mktName(id))}</b><div class="note">#${esc(id)} · ${esc((MKT_CATS.find(([k])=>k===mktCat(id))||[])[1]||"")}</div></div><button type="button" class="small" data-addchange>Change</button>`:"";
  $("priceItem").closest("label").hidden=!!id;$("addCats").hidden=!!id;if(id)$("addTypeBar").hidden=true;
  if(!id||!copyable(id)){ADD_ID=ADD_COPY=null;box.hidden=true;box.innerHTML="";return}
  if(id!==ADD_ID){ADD_ID=id;ADD_COPY=newCopy(id);if(PICK&&PICK.key==="a")PICK=null}
  box.hidden=false;box.innerHTML=`<span class="note">${id===TAMING_RING?"Egg":costumeOf(id)?"Enchant stone":"Refine, slots and affixes"} (optional: leave them empty for the plain price)</span>${copyFields(id,ADD_COPY,"a","a")}`;copyPicks(box,ADD_COPY,"a")}
// the items the list can show right now (category and Type applied), for the search box's suggestions
let MKT_POOL=[];
// the Market page's two tabs, Market and My market: renderPrices draws whichever is open, so everything that changes a price just calls it
function renderPrices(){stampPrices();if(typeof loadShared==="function")loadShared();if(typeof renderShared==="function")renderShared();
  ROOTQ("#mktSrv,#mineSrv").forEach(el=>{el.innerHTML=MKT_SERVERS.map(([k,n])=>`<button type="button" role="radio" data-srv="${k}" aria-checked="${k===state.mktServer}">${n}</button>`).join("")});
  // the page's own two tabs: Market (browse) and My market (mine), one card each
  const mine=state.mkt.pane==="mine";$("marketCard").hidden=mine;$("mineCard").hidden=!mine;
  ROOTQ("#mktPanes [data-pane]").forEach(b=>b.setAttribute("aria-selected",String((b.dataset.pane==="mine")===mine)));
  if(mine)renderMine();else renderMarket()}
// Market: what players posted on this server (the shared prices), read only: each item's lowest price and the median, its sellers
// to DM, and the shared refined / carded copies under it. Your own prices that aren't posted show too, as "yours"
function renderMarket(){
  // what players posted on this server, and your favourites even while nobody sells them (your own unposted prices are on My market)
  const mk=state.mkt,fav=new Set(state.mktFav),q=mk.q.trim().toLowerCase(),fOn=mktFilterOn();
  const ids=[...new Set([...state.mktFav,...Object.keys(typeof SHARED_P!=="undefined"?(SHARED_P[state.mktServer]||{}).rows||{}:{})])];
  const cnt={"":ids.length};ids.forEach(id=>{const c=mktCat(id);cnt[c]=(cnt[c]||0)+1});
  $("mktCats").innerHTML=MKT_CATS.filter(([k])=>!k||cnt[k]||mk.cat===k).map(([k,n])=>`<button type="button" class="mktCat" data-mktcat="${k}" aria-pressed="${mk.cat===k}">${n} <span>${cnt[k]||0}</span></button>`).join("");
  mktFilterBoxes();
  const seenT=id=>{const s=sharedPlain(id);return Math.max(s&&s.newest||0,(state.priceSeen[id]||[])[0]||0)};
  const pr={};ids.forEach(id=>pr[id]=mktPrice(id));
  const SORT={recent:(a,b)=>seenT(b)-seenT(a),low:(a,b)=>(pr[a]??Infinity)-(pr[b]??Infinity),high:(a,b)=>(pr[b]??-1)-(pr[a]??-1),
    move:(a,b)=>Math.abs(priceMove(b)??-1)-Math.abs(priceMove(a)??-1),name:()=>0};
  // Type for weapons and armor, and the item picked from the search box's suggestions (mk.item), shown with its icon and ✕
  const subs=subTypes(mk.cat);$("mktTypeL").hidden=!subs.length;$("mktType").innerHTML=`<option value="">Any</option>`+subs.map(([k,n])=>`<option value="${k}"${mk.type===k?" selected":""}>${esc(n)}</option>`).join("");
  $("mktItemChip").hidden=!mk.item;$("mktItemChip").innerHTML=mk.item?`<span class="mktIc">${itemIcon(mk.item)}</span><b>${esc(mktName(mk.item))}</b><button type="button" class="small ghost" data-mktitemx aria-label="Show every item again">✕</button>`:"";
  $("mktFavOnly").setAttribute("aria-pressed",String(mk.favOnly));$("mktFavOnly").innerHTML=`★ Favourites <span>${fmtN(fav.size)}</span>`;
  MKT_POOL=ids.filter(id=>(!mk.cat||mktCat(id)===mk.cat)&&(!mk.type||itemSub(id)===mk.type)&&(!mk.favOnly||fav.has(id)));
  const rows=MKT_POOL.filter(id=>(!mk.item||id===mk.item)&&(!q||mktName(id).toLowerCase().includes(q)||("#"+id).includes(q))
      &&(!fOn||pr[id]!=null)&&(mk.max==null||!(pr[id]>mk.max)))
    .sort((a,b)=>SORT[mk.sort](a,b)||mktName(a).localeCompare(mktName(b)));
  $("mktList").innerHTML=rows.map(id=>{const npc=NPCSELL[id],best=fOn?mktBest(id):null,sp=typeof sharedPlain==="function"?sharedPlain(id):null,
      sc=sharedCopies(id).filter(x=>x!==sp),f=fav.has(id);
    return `<div class="mktItem"><div class="mktRow mktRowF"><button type="button" class="mktFav${f?" on":""}" data-fav="${esc(id)}" aria-pressed="${f}" title="${f?"Remove from your favourites":"Add to your favourites: kept on the list even when nobody sells it, and shown with ★ Favourites"}" aria-label="Favourite">${f?"★":"☆"}</button><span class="mktIc">${itemIcon(id)}</span>
      <div class="mktName"><a href="#" data-info="item:${esc(id)}">${esc(mktName(id))}</a>
        <div class="note">${[best?`<b class="mktFit">cheapest fit ${esc(varTxt(best))}: ${fmtN(best.p)} z</b>`:"",sp&&sp.newest?`newest ${agoTxt(sp.newest)}`:"",npc!=null?`NPC pays ${fmtN(npc)} z`:"",`#${esc(id)}`,
          sellerN(id)?`<a href="#" data-sellers="${esc(id)}" class="mktSellers">${sellerN(id)} seller${sellerN(id)>1?"s":""} · DM</a>`:""].filter(Boolean).join(" · ")}</div></div>
      <div class="mktPrice mktSharedP" title="${sp?esc(sharedTxt(sp)):""}"><b class="mono">${sp?fmtN(sp.p):"–"}</b><span class="mktZ">z</span><div class="note">${sp?`lowest · median ${zShort(sp.med)} · ${sp.players} player${sp.players>1?"s":""}`:sc.length?"only refined / carded copies":"nobody sells it now"}</div></div>
      <div class="mktMove"></div></div>
      ${sc.length?`<div class="mktVars">${sc.map(x=>`<div class="mktVar shared${fOn&&listingOk(x)?" hit":""}" title="${esc(sharedTxt(x))}"><span>${esc(varTxt(x))}</span><span class="mktPrice"><b class="mono">${fmtN(x.p)}</b><span class="mktZ">z</span></span><span class="note mktAgo">median ${zShort(x.med)} · ${x.players} player${x.players>1?"s":""}</span></div>`).join("")}</div>`:""}${typeof sellersHtml==="function"?sellersHtml(id):""}</div>`}).join("")
    ||`<div class="note muted mktEmpty">${mk.favOnly&&!fav.size?"No favourites yet: click an item's ☆ to add it.":ids.length?"No items match these filters.":"Nobody has posted an item on this server yet. Post yours on the My market tab."}</div>`}
// My market: your prices on this server (the ones every zeny figure uses), each with its copies, DM and ✕; and what you posted
function renderMine(){const f=document.activeElement;if(typeof renderMyPosts==="function")renderMyPosts();
  if(f&&f.tagName==="INPUT"&&$("mineList").contains(f))return;// don't rebuild the box you're typing in
  const ids=Object.keys(state.prices).sort((a,b)=>((state.priceSeen[b]||[])[0]||0)-((state.priceSeen[a]||[])[0]||0)||mktName(a).localeCompare(mktName(b)));
  $("mineList").innerHTML=ids.map(id=>{const p=state.prices[id],t=(state.priceSeen[id]||[])[0],mv=priceMove(id),npc=NPCSELL[id],g=mktGearOnly(id),vs=ownCopies(id).slice(1),
      sp=typeof sharedPlain==="function"?sharedPlain(id):null;
    return `<div class="mktItem"><div class="mktRow"><span class="mktIc">${itemIcon(id)}</span>
      <div class="mktName"><a href="#" data-info="item:${esc(id)}">${esc(mktName(id))}</a>
        <div class="note">${[sp?`<span class="mktShared" title="${esc(sharedTxt(sp))}">everyone: lowest ${zShort(sp.p)} · median ${zShort(sp.med)} · ${sp.players} player${sp.players>1?"s":""}</span>`:"",t?`<span title="${esc(new Date(t).toLocaleString("en-GB"))}">updated ${agoTxt(t)}</span>`:"",npc!=null?`NPC pays ${fmtN(npc)} z`:"",`#${esc(id)}`,
          loggedIn()?`<label class="mktSell" title="You sell it at this price: buyers can message you about it on Discord. Untick to take it back"><input type="checkbox" data-sell="${esc(id)}"${state.sell[id]?" checked":""}> DM</label>`:"",
          copyable(id)?`<a href="#" data-varadd="${esc(id)}" title="Price a copy with a refine, cards, an enchant (stone), an egg or affixes. The plain price stays the one every zeny figure uses">${g?"+ refine / slots / affixes":costumeOf(id)?"+ enchant stone":"+ egg"}</a>`:""].filter(Boolean).join(" · ")}</div></div>
      <div class="mktPrice"><input class="mono" inputmode="decimal" data-price="${esc(id)}" value="${p>0?fmtN(p):""}" placeholder="price" aria-label="What players pay for ${esc(mktName(id))}" title="${g?"+0, empty slots, no affixes. ":""}Zeny; 450k = 450,000, 1.5m = 1,500,000">
        <span class="mktZ">z</span>${p>=1e3?`<div class="note mono">${zShort(p)}</div>`:""}</div>
      <div class="mktMove">${mv==null?"":`<span class="pill ${mv>0?"up":"down"}" title="was ${fmtN(state.priceSeen[id][1])} z">${mv>0?"▲":"▼"} ${Math.abs(mv)>=10?Math.round(Math.abs(mv)):Math.abs(mv).toFixed(1)}%</span>`}</div>
      <button type="button" class="small ghost" data-unprice="${esc(id)}" title="Remove this item and its copies, and take back their posts" aria-label="Remove ${esc(mktName(id))}">✕</button></div>
      ${copyable(id)&&vs.length?`<div class="mktVars">${vs.map(x=>mktVarRow(id,x)).join("")}</div>`:""}</div>`}).join("")
    ||`<div class="note muted mktEmpty">No prices yet. Click + Add item, or a drop in Where to farm, Monster info or Item info.</div>`;
  // a select's picked option, set after the list is in (the lists are shared, so no option carries "selected")
  ROOTQ("#mineList [data-var]").forEach(el=>{const [id,i]=el.dataset.var.split(":"),x=(state.priceVars[id]||[])[+i];if(x)copyPicks(el,x,"v")})}
// the Refine ≥ list and a row per random option wanted, each with the least value
let MKT_OPT_LIST=null;
function mktFilterBoxes(){const f=document.activeElement;if(f&&f.tagName==="INPUT"&&$("mktOptF").contains(f))return;const m=state.mkt;
  $("mktRef").innerHTML=`<option value="">any</option>`+OPT_REFINES(15).slice(1).map(r=>`<option value="${r}"${m.refine===r?" selected":""}>+${r}</option>`).join("");
  MKT_OPT_LIST=MKT_OPT_LIST||optList(BUILD.OPTIONS.filter(o=>!o.ess).map(o=>({...o,range:null})));
  $("mktOptF").innerHTML=m.opts.map((x,i)=>`<span class="mktOpt"><select data-fok="${i}" aria-label="Affix / slot option"><option value="">pick an option</option>${MKT_OPT_LIST}</select><input class="mono" data-fov="${i}" inputmode="decimal" value="${x.v??""}" placeholder="at least" aria-label="Least value"><button type="button" class="small ghost" data-fodel="${i}" aria-label="Remove this option">✕</button></span>`).join("")
    +`<button type="button" class="small" data-foadd>+ Add affix / slot option</button>`;
  m.opts.forEach((x,i)=>{const s=$("mktOptF").querySelector(`[data-fok="${i}"]`);if(s)s.value=x.k});
  if(document.activeElement!==$("mktSlotQ"))$("mktSlotQ").value=m.slot}
// ---- render: Monster info and Item info ----
const GROUP_NAME=Object.fromEntries(LOOT_GROUPS);
const groupOf=id=>ITEMTYPE[id]||"e";
const yourCh=(m,ch)=>ch==null?null:+Math.min(100,ch*dropMul()*penMul(m)).toFixed(2);
// Compare sessions, Monster info, Item info, Market and the two Hunter tables: click a header (th data-sk) to sort, type in the row under it (data-tf) to filter, with the Monsters table's filters.
// Each column reads a row as a number (n: sorting, <, >, ranges) and/or as text (t: text filters, and sorting when there's no n); asc: a number column whose first click sorts low to high; def is the starting sort
const mapTxt=mp=>`${mapCode(mp)} ${mapName(mp)}${isClosed(mp)?" closed":""}`;
const TABLES={
  itemTable:{def:["npc",-1],cols:{name:{t:r=>itemName(r.id)+" #"+r.id},group:{t:r=>itemGroupTxt(r.id)},npc:{n:r=>r.npc},pl:{n:r=>r.pl},best:{n:r=>r.b?r.b.ch:null,t:r=>r.b?r.b.m.name:""},nz:{n:r=>r.nz},sp:{n:r=>r.sp?r.sp.n:null,t:r=>r.sp?`${mapTxt(r.sp.mp)} ${r.sp.m.name}`:""},cnt:{n:r=>r.cnt}}},
  bestTable:{def:["epm",-1],cols:{rank:{n:r=>r.rank,asc:1},mp:{t:r=>mapTxt(r.mp)},main:{t:r=>MAPMOBS[r.mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).map(x=>x.m.name).join(", ")},epm:{n:r=>r.epm},secT:{n:r=>r.secT,asc:1},epk:{n:r=>r.epk},zph:{n:r=>r.zb},heal:{n:r=>r.heal,asc:1},net:{n:r=>r.net},hpm:{n:r=>r.hpm,asc:1},sus:{n:r=>r.sus?r.sus.score:null,t:r=>r.sus?r.sus.label:""},skip:{n:r=>r.skip,asc:1},N:{n:r=>r.N},proj:{n:r=>r.proj},
    log:{n:r=>r.logged?r.logged.ratio:null,t:r=>r.logged?r.logged.list.map(x=>x.s.name).join(", "):""},wk:{n:r=>r.wk,asc:1},wph:{n:r=>r.wph,asc:1},trip:{n:r=>r.trip}}},
  huntTable:{def:["net",-1],cols:{wk:{n:r=>r.wk,asc:1},wph:{n:r=>r.wph,asc:1},rank:{n:r=>r.rank,asc:1},name:{t:r=>r.mp?mapTxt(r.mp):`${r.m.name} Lv ${r.m.lv}`},from:{t:r=>r.mp?r.earn.map(x=>x.m.name).join(", "):[mapTxt(openMaps(r.m)[0][0]),...(r.m.drops||[]).map(([id])=>itemName(id))].join(", ")},net:{n:r=>r.net},loot:{n:r=>r.loot},cost:{n:r=>r.cost,asc:1},kph:{n:r=>r.kph},zk:{n:r=>r.zk},epm:{n:r=>r.epm},hpm:{n:r=>r.hpm,asc:1}}},
  cmpTable:{def:["when",-1],cols:{name:{t:r=>r.s.name},job:{t:r=>r.s.job||""},mobs:{t:r=>[...r.ms.map(m=>m.name),sessMap(r.s)?mapTxt(sessMap(r.s)):""].join(", ")},when:{n:r=>r.st.es[0].t,t:r=>`${fmtD(r.st.es[0].t)} ${fmtT(r.st.es[0].t)}`},
    len:{n:r=>r.st.spanMin},pct:{n:r=>r.st.avgPct,t:r=>`B${r.st.last.lv}`},epm:{n:r=>r.st.avgRaw/60},kph:{n:r=>r.kph},spk:{n:r=>r.kph?3600/r.kph:null,asc:1},die:{n:r=>r.st.deaths,asc:1}}},
  recTable:{def:["per",1],cols:{name:{t:r=>r.name},kind:{t:r=>r.kind.toUpperCase()},avg:{n:r=>r.avg},price:{n:r=>r.price},per:{n:r=>r.per,asc:1},perW:{n:r=>r.perW},uph:{n:r=>r.uph,asc:1},zph:{n:r=>r.zph,asc:1},wph:{n:r=>r.wph,asc:1}}},
};
// at the max base level the EXP Hunter keeps a sort of its own ("bestTable@max"), Net zeny / hr until you pick another column
const sortKey=id=>id==="bestTable"&&atMaxLv()?"bestTable@max":id;
const sortDef=id=>id==="bestTable"&&atMaxLv()?["net",-1]:TABLES[id].def;
const tblSort=id=>{const s=state.tsort[sortKey(id)];return s&&Object.hasOwn(TABLES[id].cols,s[0])?s:sortDef(id)};
// the column filters typed under a table's headers that are on (a hidden column's included), as [key, column name, filter]
const activeFilters=id=>Object.entries(state.tfilt[id]||{}).filter(([k,v])=>v&&Object.hasOwn(TABLES[id].cols,k)).map(([k,v])=>{const th=document.querySelector(`#${id} th[data-sk="${k}"]`);
  return [k,(th&&th.textContent||k).trim(),v]});
// "Filters on: … [clear]" above a table while any of its filters is on, so rows a filter hides never go missing without a word
function filterChip(id){const t=$(id);if(!t||!t.parentNode)return;const host=t.closest(".scroll")||t;let el=$(id+"Chip");
  if(!el){el=document.createElement("div");el.id=id+"Chip";el.className="note fchip";host.parentNode.insertBefore(el,host)}
  const F=activeFilters(id);el.hidden=!F.length;
  el.innerHTML=F.length?`<span class="pill down">Filters on</span> ${F.map(([,n,v])=>`<b>${esc(n)}</b> ${esc(v)}`).join(" · ")} <a href="#" data-tfclear="${id}">clear</a>`:""}
const filterRows=(id,rows)=>{const T=TABLES[id],F=state.tfilt[id]||{};filterChip(id);
  return rows.filter(r=>Object.entries(F).every(([k,v])=>{const c=Object.hasOwn(T.cols,k)&&T.cols[k];return !v||!c||matchF(v,c.n?c.n(r):null,c.t?c.t(r):null)}))};
const tableRows=(id,rows)=>sortRows(id,filterRows(id,rows));
function sortRows(id,rows){
  const [k,d]=tblSort(id),c=TABLES[id].cols[k];
  const val=r=>{const v=c.n?c.n(r):c.t(r).toLowerCase();return v==null||v===""||(typeof v==="number"&&!isFinite(v))?null:v};
  // the hunters' "too slow" rows stay after the rest in the table's default sort; pick a column to see them in place
  const slow=k===sortDef(id)[0]&&rows.some(r=>r.slow);
  rows.sort((a,b)=>{if(slow&&!!a.slow!==!!b.slow)return a.slow?1:-1;const x=val(a),y=val(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x>y?1:x<y?-1:0)*d});
  ROOTQ(`#${id} th[data-sk]`).forEach(th=>th.classList.toggle("on",th.dataset.sk===k));
  return rows;
}
// every monster that drops each item, best chance first
const ITEM_DROPS={};MOBS.forEach(m=>(m.drops||[]).forEach(([id,ch])=>(ITEM_DROPS[id]=ITEM_DROPS[id]||[]).push({m,ch})));
Object.values(ITEM_DROPS).forEach(l=>l.sort((a,b)=>b.ch-a.ch));
// what an NPC pays for one drop, times your chance of it a kill: null with no NPC price or no published rate
const npcZ=(m,id,ch)=>{const y=yourCh(m,ch);return y==null||(NPCSELL[id]==null&&state.npcPrices[id]==null)?null:npcPays(id)*y/100};
// the most NPC zeny a kill of any monster that drops it gives
// every item that isn't gear or a card (those have their own tabs), for Item info's All items and search: the drops (gear and cards
// included), the client's catalog, and the recipe, memorial, recovery and skill items
let ALL_ITEM_IDS=null;
const allItemIds=()=>ALL_ITEM_IDS||(ALL_ITEM_IDS=[...new Set([ITEM_DROPS,CLIENT_ITEM,typeof RECIPE_ITEMN!=="undefined"?RECIPE_ITEMN:{},MEM_ITEMN,RECOVERY,CONSUM]
  .flatMap(o=>Object.keys(o)))].filter(id=>ITEM_DROPS[id]||!BUILD.item(+id)));
// Item info's category of an item: Card or Weapon / Armor for cards and gear (the client's catalog leaves most of them out), else the
// catalog's; and the categories, in order
let ITEM_CARD_IDS=null;
const itemInfoCat=id=>(ITEM_CARD_IDS||(ITEM_CARD_IDS=new Set((typeof CARDS!=="undefined"?CARDS:[]).map(c=>+c.id)))).has(+id)?"Card":BUILD.item(+id)?(BUILD.item(+id).type?"Weapon":"Armor"):clientCat(id);
const itemInfoCats=()=>[...new Set([...CLIENT_CATS,"Weapon","Armor"])].sort((a,b)=>a.localeCompare(b));
// Item info's list: every item, gear and cards too (they open their own details)
let ITEM_INFO_IDS=null;
const itemInfoIds=()=>ITEM_INFO_IDS||(ITEM_INFO_IDS=[...new Set([...allItemIds(),...(typeof EQUIP!=="undefined"?EQUIP:[]).filter(it=>(it.slot||[]).length).map(it=>String(it.id)),
  ...(typeof CARDS!=="undefined"?CARDS:[]).map(c=>String(c.id))])]);
// Item info's Group column: a drop's auto-loot group, else the client catalog's category
const itemGroupTxt=id=>ITEM_DROPS[id]?GROUP_NAME[groupOf(id)]+(looted(id)?"":" not looted"):itemInfoCat(id)||"–";
const bestNpcZ=id=>ITEM_DROPS[id].reduce((b,{m,ch})=>{const z=npcZ(m,id,ch);return z!=null&&(b==null||z>b)?z:b},null);
// the most of one monster that drops it on one open map, bosses left out: {n, mp, m} or null
const mostSpawns=id=>ITEM_DROPS[id].reduce((b,{m})=>{const om=!m.boss&&openMaps(m)[0];return om&&(!b||om[1]>b.n)?{n:om[1],mp:om[0],m}:b},null);
function renderItems(){
  // Where to get (gear-db.js): MVP / mini boss / normal monster drops, quests
  const fv=state.itemFrom||"",fromOk=id=>!fv||typeof itemFromOk!=="function"||itemFromOk(id,fv);
  // Items: the monster drops (""), every item ("all"), or one of the client catalog's categories
  const show=state.itemShow||"",pool=show?itemInfoIds().filter(id=>show==="all"||itemInfoCat(id)===show):Object.keys(ITEM_DROPS);
  const ids=pool.filter(id=>fromOk(id)).sort((a,b)=>itemName(a).localeCompare(itemName(b)));
  const hit=tableRows("itemTable",ids.map(id=>{const d=ITEM_DROPS[id];
    return {id,b:d?d[0]:null,npc:NPCSELL[id]==null?null:npcPays(id),pl:state.prices[id]>0?state.prices[id]:null,nz:d?bestNpcZ(id):null,sp:d?mostSpawns(id):null,cnt:d?d.length:0}}));
  $("itemCount").textContent=`${fmtN(hit.length)} item${hit.length===1?"":"s"}`;
  $("itemTable").tBodies[0].innerHTML=hit.slice(0,300).map(({id,b,npc,pl,nz,sp,cnt})=>`<tr data-item="${esc(id)}"><td class="name"><a href="#" data-info="${infoKind(id)}:${esc(id)}" aria-label="${esc(itemName(id))} details">${itemIcon(id,1,"il")}</a><a href="#" data-info="${infoKind(id)}:${esc(id)}">${esc(itemName(id))}</a> <span class="note">#${esc(id)}</span></td><td class="name">${ITEM_DROPS[id]?`${GROUP_NAME[groupOf(id)]}${looted(id)?"":' <span class="note">not looted</span>'}`:esc(itemInfoCat(id)||"–")}</td><td>${npc==null?"–":fmtN(npc)}</td><td>${pl!=null?fmtN(pl):`<a href="#" data-pitem="${esc(id)}">set</a>`}</td><td class="name">${b?`${esc(b.m.name)} <span class="note">${chTxt(b.ch)}</span>`:'<span class="note">no monster</span>'}</td><td>${nz==null?"–":dropZTxt(nz)}</td><td class="name" title="${sp?esc(`${sp.m.name} on ${mapLabel(sp.mp)}`):""}">${sp?`≈${spN(sp.n)} <span class="note">${esc(sp.m.name)} · ${mapCode(sp.mp)}</span>`:cnt?'<span class="note">none open</span>':"–"}</td><td>${cnt||"–"}</td></tr>`).join("")
    +(hit.length>300?`<tr><td colspan="8" class="name muted">${hit.length-300} more: narrow the list with the filters under its headings</td></tr>`:"")
    ||'<tr><td colspan="8" class="name muted">No items match.</td></tr>';
}
// Weight / hr's tooltip: how long until you reach your sell point, and the loot zeny each weight point brings
const huntWTip=r=>{const room=wOn()?wRoom(sellLim()):0,z=r.wk>0?`${fmtN(r.zk/r.wk)} z of loot per weight`:"its drops weigh nothing";
  return !(r.wph>0)?z:!wOn()?`${z}\nType your Max Weight to see when you fill up`:`${z}\nfills your ${fmtN(room)} weight of room to ${fmtP(sellPct())}% in ~${fmtDur(room/r.wph).split("\n").pop().replace("~","")}`};
// the level filter for the basis line: " · hunting Lv 40–60, skipping drop-penalty monsters", or "" when it's off
const huntLvTxt=()=>{const a=state.huntMinLv,b=state.huntMaxLv,p=[a!=null&&b!=null?`Lv ${a}–${b}`:a!=null?`Lv ${a}+`:b!=null?`Lv ${b} and below`:"",state.huntNoPen?"skipping drop-penalty monsters":""].filter(Boolean);
  return p.length?` · hunting ${p.join(", ")}`:""};
function renderHunt(){
  const mode=state.huntMode==="mobs"?"mobs":"maps",lim=num($("farmN").value,10),min=num($("huntMin").value),w=walkSec();
  ROOTQ("[data-hunt]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.hunt===mode)));$("huntAutoWrap").hidden=mode!=="maps";$("huntAuto").checked=state.huntAuto;
  ROOTQ("[data-loot]").forEach(i=>i.checked=looted0(i.dataset.loot));$("huntMinWrap").firstChild.textContent=mode==="maps"?"Min monsters on map":"Min spawns on its map";
  const rows=mode==="maps"?Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)&&!lvLocked(mp)).map(mp=>huntMap(mp,w,min)).filter(r=>r&&r.N>=min)
    :MOBS.filter(m=>!m.boss&&!isSkipped(m)&&huntLvOk(m)&&hasLoot(m)&&openMaps(m).length&&openMaps(m)[0][1]>=min).map(m=>huntMob(m,w)).filter(Boolean);
  // rank everything by net zeny / hr, then filter, keep the top N and sort by the picked column
  rankRows(rows,r=>r.net);
  // the best spots are maps: in single-monster mode they're worked out on their own
  if(mode==="maps"){SPOT_ZENY=top3(rows);FARM_RANKED.zeny=rows}
  else{const mr=Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)&&!lvLocked(mp)).map(mp=>huntMap(mp,w,min)).filter(r=>r&&r.N>=min);rankRows(mr,r=>r.net);SPOT_ZENY=top3(mr);FARM_RANKED.zeny=mr}
  const sp=spotRows("huntTable",rows,mode==="maps"&&inSpots("huntTable"),lim,"Best for zeny"),shown=sp.rows;
  $("huntBasis").textContent=`${state.job} · ${C().a.name||"attack"} · ${convOn()?convLabel("by zeny"):atkEl()} · walking ~${w.toFixed(1)}s/kill`+(num(state.dropBonus)?` · drop rate +${num(state.dropBonus)}%`:"")+(num(C().baseLv)>39?` · drops −50% from monsters Lv ${num(C().baseLv)-40} and below`:"")+huntLvTxt();$("huntBasis").innerHTML+=huntLimTxt(rows);
  const sel=currentMap(),selMob=(calcMob()||{}).id;
  $("huntTable").querySelector("tbody").innerHTML=sp.note+(shown.map(r=>{
    const name=r.mp?`${mapTitle(r.mp)}${mobbedPill(r.mp)}${slowPill(r)} ${farmBtn(r)}`:`${mobIcon(r.m.id,1,"il")}<b title="${esc(dropNames(r.m))}"><a href="#" data-info="mob:${r.m.id}">${esc(r.m.name)}</a></b>${BOSS_PILL(r.m)} <span class="note">Lv ${r.m.lv}</span>${slowPill(r)}`;
    const from=r.mp?huntPicker(r,w)+(r.skip?`<div class="note" title="${esc(r.skipNames.join(", "))}">can't hurt ${r.skip}</div>`:"")
      :(()=>{const om=openMaps(r.m);return `<div><span class="mono">${mapCode(om[0][0])}</span> <span class="note">≈${spN(om[0][1])}${penNote(r.m)?` · ${esc(penNote(r.m))}`:""}</span></div>${dropList(r.m)}`})();
    return `<tr ${r.mp?`data-map="${r.mp}"`:`data-id="${r.m.id}"`} class="${(r.mp&&r.mp===sel)||(r.m&&r.m.id===selMob)?"sel":""}"><td>${r.rank}</td><td class="name">${name}${elTag(r.el2)}</td><td class="name mainmobs">${from}</td><td class="${r.net>0?"good":"bad"}"><b>${fmtN(r.net)}</b></td><td>${fmtN(r.loot)}</td><td title="${esc(costTip(r))}">${r.cost>0?fmtN(r.cost):"–"}</td><td>${fmtN(r.kph)}</td><td>${fmtN(r.zk)}</td><td>${fmtQty(r.wk)}</td><td title="${esc(huntWTip(r))}">${fmtQty(r.wph)}</td><td>${r.epm==null?"?":fmtN(r.epm)}</td><td>${r.hpm==null?"–":fmtN(r.hpm)}</td></tr>`}).join("")
    ||(sp.note?"":`<tr><td colspan="12" class="name muted">${mode==="maps"?"No open maps match.":"No open monsters you can hurt."}${huntLvTxt()?" Try widening the level filter.":""}</td></tr>`));
  renderSpots();syncFarm();
}
// the Roadmap card: each update with its level cap, what it adds and its regions (click one to mark it open or closed)
const regionBtn=r=>{const c=regionClosed(r),own=state.regions[r.id]!=null;return `<button type="button" class="map ${c?"off":""}" data-region="${r.id}" title="${c?"Closed":"Open"}${own?` (your call: the roadmap says ${upOut(r.up)?"open":"closed"})`:" (follows the roadmap)"}. Click to mark ${c?"open":"closed"}"><b>${c?"✕":"✓"} ${r.name}</b>${own?"<span>yours</span>":""}</button>`};
const syncClosed=()=>{$("closedMaps").value=state.closed.join(", ");
  const nx=ROADMAP.find(u=>!upOut(u)),cap=capNow();
  $("roadmapNote").textContent=[cap&&`level cap now ${capTxt(cap)}`,nx&&`next: ${nx.name} (${upWhen(nx)})`].filter(Boolean).join(" · ");
  // one row per month (or half year); a month with more than one update gets a sub-row each, with its day before its name.
  // A collaboration event ("Collaboration event: Gatchaman" in add) and a guess at what it is (maybe) also go under the update's name
  const grp=[];ROADMAP.forEach(u=>{const k=upHalf(u)?u.when:u.when.slice(0,7),g=grp[grp.length-1];if(g&&g.k===k)g.ups.push(u);else grp.push({k,ups:[u]})});
  $("regions").innerHTML=grp.map(({ups})=>ups.map((u,i)=>{const nm=Object.keys(MAPMOBS).filter(mp=>{const r=regionOf(mp);return r&&r.up===u}).length,
      clb=u.add.filter(a=>a.startsWith("Collaboration event: ")).map(a=>a.slice(21)),many=ups.length>1,nxt=ups.find(x=>!upOut(x));
    const when=i?"":`<td class="name"${many?` rowspan="${ups.length}"`:""}><b>${many?`${MONTHS[+u.when.slice(5,7)-1]} ${u.when.slice(0,4)}`:upWhen(u)}</b>${(s=>s?`<div class="note">${s}</div>`:"")(nxt?upStatus(nxt):"out")}</td>`;
    return `<tr class="${upOut(u)?"muted":u===nx?"sel":""}${i?" sub":""}">${when}<td class="name"><b>${many&&u.when.length>7?`${+u.when.slice(8)} ${MONTHS[+u.when.slice(5,7)-1]}: `:""}${esc(u.name)}</b>${clb.map(c=>`<div class="note">Collab: ${esc(c)}</div>`).join("")}${u.maybe?`<div class="note">Maybe: ${esc(u.maybe)}?</div>`:""}</td><td>${u.cap?capTxt(u.cap):"–"}</td>
    <td class="name">${u.add.map(esc).join("<br>")}</td><td class="name"><div class="maps">${REGIONS.filter(r=>r.up===u).map(regionBtn).join("")}</div>${nm?`<div class="note">${nm} map${nm>1?"s":""}</div>`:""}</td></tr>`}).join("")).join("");
  const shut=REGIONS.filter(regionClosed);
  $("closedNote").innerHTML=shut.length?`Not open yet: ${shut.map(r=>esc(r.name)).join(", ")} (<a href="#" data-gotab="roadmap">Roadmap tab</a>).`:""};
// "none open", with the update that opens one of the monster's maps
const noneOpen=m=>{const a=mobArrives(m);return `<span class="note"${a?` title="comes with the ${esc(a)}"`:""}>none open${a?` · ${esc(a.split(", ")[1])}`:""}</span>`};
// converters / Spell Fist bolts against every monster on the map: the element-table rate of each option, the map's EXP/min with it,
// and what the picked one can't hurt or is resisted by
function convCheck(mp,w,r){const sf=C().a.type==="spellfist",opts=sf?elOptions().filter(Boolean):convOn()?convAll():[];if(opts.length<2)return "";const tag=!sf&&convFixed()?"in use":"best";
  const mobs=MAPMOBS[mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).sort((a,b)=>b.n-a.n);if(!mobs.length)return "";
  const rows=opts.map(el=>{const s=withEl(el,()=>mapStats0(mp,w));return `<tr class="${r&&el===r.el2?"sel":""}"><td class="name"><span class="el ${el}">${el}</span>${!sf&&el===C().wElem?' <span class="note">weapon</span>':""}${r&&el===r.el2?` <span class="pill">${tag}</span>`:""}</td>
    ${mobs.map(x=>{const v=elemMult(x.m,el);return `<td class="${elRateCls(v)}">${elRateTxt(v)}</td>`}).join("")}<td>${s?fmtN(s.epm):"–"}${s&&s.skip?` <span class="warnc">skips ${esc(s.skipNames.join(", "))}</span>`:""}</td></tr>`}).join("");
  const el=r&&r.el2,bad=el?mobs.filter(x=>elemMult(x.m,el)<100):[];
  const warn=bad.length?`<div class="warnc">With ${el}: ${bad.map(x=>{const v=elemMult(x.m,el);return `${esc(x.m.name)} (${x.m.el} ${x.m.elv}) ${v}%`}).join(" · ")}</div>`:"";
  return `<div class="note mt"><b>${sf?"Spell Fist bolts":"Weapon elements"} vs these monsters</b> · element table rate (Reference tab): <span class="good">above 100%</span>, <span class="warnc">below</span>, <span class="bad">0% ✕ none</span>${sf||isMagicAtk()?"":"; it applies to your weapon ATK, status ATK always hits as Neutral"}</div>
  <div class="scroll"><table class="convtab"><thead><tr><th>${sf?"Bolt":"Element"}</th>${mobs.map(x=>`<th>${esc(x.m.name)}<br><span class="el ${x.m.el||"Neutral"}">${x.m.el||"Neutral"} ${x.m.elv||1}</span></th>`).join("")}<th>EXP / min</th></tr></thead><tbody>${rows}</tbody></table></div>${warn}`}
// ---- the client's world maps (data/minimaps.js WORLDMAPS: Midgard, Nordfeld) with a box on each spawn map and map mp lit, drawn into el
// (the Map planner's, the Maps tab's). It turns to the world mp is on when mp changes; the buttons over it turn to another. Floors of one
// dungeon share a box, so clicking it lists them, like the game's world map, and pick(map) gets the one clicked; a dungeon with one floor
// picks it straight away. With all ({pick, d}, the Maps tab's) the list starts with All floors, all.pick(map) gets a floor of it, and all.d is the
// dungeon showing all its floors, if any. Towns get a box only with towns.
// Monster info gives a list of spawns ([map, count, ...], as in SPAWN) for mp: all of them are lit, it turns to the world with the most,
// and only lit boxes click, picking the box's map with the most spawns
const worldOf=mp=>typeof WORLDMAPS==="undefined"?-1:WORLDMAPS.findIndex(w=>w.maps[mp]);
// the world with the most of these spawns (a map with no count from the client adds none, so those only break a tie), -1 with none on a world
const worldMost=rows=>{const n={},c={};rows.forEach(([k,v])=>{const w=worldOf(k);if(w>=0){n[w]=(n[w]||0)+(v||0);c[w]=(c[w]||0)+1}});
  return Object.keys(n).map(Number).sort((a,b)=>n[b]-n[a]||c[b]-c[a]||a-b)[0]??-1};
// the dungeon a map is a floor of
const dunOf=mp=>{for(const W of typeof WORLDMAPS==="undefined"?[]:WORLDMAPS){const d=(W.dun||[]).find(x=>x.floors.some(f=>f[0]===mp));if(d)return d}return null};
// the list of dungeon d's floors, beside its box and on the side with room; clicking its box again closes it
function wmFloors(el,W,d,fs){
  const list=el.querySelector(".wmFloors"),[x1,y1,x2,y2]=d.box,p=(v,n)=>(v/n*100).toFixed(2)+"%";
  const open=list.dataset.d===d.box.join();wmFloorsClose(el);if(open)return;
  list.dataset.d=d.box.join();list.hidden=false;
  list.style.cssText=`${x1+x2<W.w?`left:${p(x1,W.w)}`:`right:${p(W.w-x2,W.w)}`};${y2<W.h*.55?`top:${p(y2,W.h)}`:`bottom:${p(W.h-y1,W.h)}`}`;
  const all=el._all,whole=all&&all.d===d;
  list.innerHTML=`<div class="wmFloorsHead">${esc(d.n)}</div>${all?`<button type="button" data-wmall="${esc(fs.some(f=>f[0]===el._mp)?el._mp:fs[0][0])}" class="${whole?"on":""}"><span>All floors</span><span class="note">${d.lv?`Lv ${esc(d.lv)}`:""}</span></button>`:""}${fs.map(([k,n,lv])=>`<button type="button" data-wmf="${esc(k)}" class="${k===el._mp&&!whole?"on":""}" title="${esc(`${mapCode(k)} ${mapName(k)}`)}"><span>${esc(n||mapName(k)||mapCode(k))}</span><span class="note">${isClosed(k)?"not open":lv?`Lv ${esc(lv)}`:""}</span></button>`).join("")}`;
  (list.querySelector(".on")||list.querySelector("button")).focus({preventScroll:true})}
function wmFloorsClose(el){const list=el.querySelector(".wmFloors");list.hidden=true;delete list.dataset.d}
// an image's src, set once the image is on screen: the Map planner draws its world map (480 KB) and map picture into the Monsters &
// maps tab as the page loads, and Chrome fetches an image given its src then even with the tab hidden and loading="lazy"
let PIC_IO=null;
function picSrc(img,u){if(img.getAttribute("src")===u){delete img.dataset.src;return}
  if(typeof IntersectionObserver==="undefined"||img.getClientRects().length){img.src=u;delete img.dataset.src;return}
  img.dataset.src=u;(PIC_IO=PIC_IO||new IntersectionObserver(es=>es.forEach(e=>{const t=e.target;if(e.isIntersecting&&t.dataset.src){t.src=t.dataset.src;delete t.dataset.src;PIC_IO.unobserve(t)}}),{rootMargin:"300px"})).observe(img)}
function worldMap(el,mp,pick,towns,all){
  if(typeof WORLDMAPS==="undefined"||!WORLDMAPS.length){el.hidden=true;return}
  if(!el.firstChild){el.innerHTML=`<div class="bar wmWorlds">${WORLDMAPS.map((w,i)=>`<button type="button" class="small" data-wmw="${i}">${esc(w.name)}</button>`).join("")}</div><div class="wmPic"><img alt=""><div class="wmBoxes"></div><div class="wmFloors" hidden></div></div><div class="note wmNote"></div>`;
    el.addEventListener("click",e=>{const t=e.target.closest("[data-wmw],[data-wm],[data-wmf],[data-wmall]");if(!t){wmFloorsClose(el);return}
      if(t.dataset.wmall!=null){wmFloorsClose(el);el._all.pick(t.dataset.wmall);return}
      if(t.dataset.wmf!=null){wmFloorsClose(el);el._pick(t.dataset.wmf);return}
      if(t.dataset.wmw!=null){wmFloorsClose(el);el.dataset.w=t.dataset.wmw;worldMap(el,el._mp,el._pick,el._towns,el._all);return}
      const ks=t.dataset.wm.split(",");
      if(Array.isArray(el._mp)){const k=el._lit.find(x=>ks.includes(x));if(k)el._pick(k);return}
      const W=WORLDMAPS[+el.dataset.w],d=(W.dun||[]).find(x=>x.box.join()===W.maps[ks[0]].join());
      const fs=d?d.floors.filter(f=>ks.includes(f[0])):[];
      if(fs.length>1){wmFloors(el,W,d,fs);return}
      wmFloorsClose(el);el._pick(ks[(ks.indexOf(el._mp)+1)%ks.length])});
    document.addEventListener("click",e=>{if(!el.contains(e.target))wmFloorsClose(el)});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")wmFloorsClose(el)})}
  const many=Array.isArray(mp),lit=many?mp.slice().sort((a,b)=>(b[1]??-1)-(a[1]??-1)).map(r=>r[0]):[mp],key=lit.join(),turn=many?worldMost(mp):worldOf(mp);
  if(key!==el._key&&turn>=0||el.dataset.w==null)el.dataset.w=Math.max(0,turn);
  el._mp=mp;el._lit=lit;el._key=key;el._pick=pick;el._towns=towns;el._all=all;
  const W=WORLDMAPS[+el.dataset.w],img=el.querySelector("img"),bx=el.querySelector(".wmBoxes");
  if(el.dataset.drawn!==el.dataset.w){el.dataset.drawn=el.dataset.w;Object.assign(img,{alt:`World map of ${W.name}`,width:W.w,height:W.h});picSrc(img,`${W.file}?v=${W.v}`);
    const at={};Object.entries(W.maps).forEach(([k,r])=>{if(towns||!isTown(k))(at[r.join()]=at[r.join()]||[]).push(k)});
    // a dungeon's box is its name plate, which can sit well away from it: a line runs to a marker on the dungeon's spot
    const dun=Object.fromEntries((W.dun||[]).map(d=>[d.box.join(),d])),p=(v,n)=>(v/n*100).toFixed(2)+"%",mid=(a,b)=>(a+b)/2;
    const pos=([x1,y1,x2,y2])=>`left:${p(x1,W.w)};top:${p(y1,W.h)};width:${p(x2-x1,W.w)};height:${p(y2-y1,W.h)}`;
    const groups=Object.entries(at).map(([key,ks])=>({ks,d:dun[key],wm:esc(ks.join()),title:esc([...(dun[key]?[dun[key].n+(dun[key].lv?` · Lv ${dun[key].lv}`:"")]:[]),...ks.map(k=>`${mapCode(k)} ${mapName(k)}`)].join("\n"))}));
    bx.innerHTML=`<svg class="wmLines" viewBox="0 0 ${W.w} ${W.h}" preserveAspectRatio="none" aria-hidden="true">${groups.filter(g=>g.d).map(({d,wm})=>`<line data-wm="${wm}" x1="${mid(d.box[0],d.box[2])}" y1="${mid(d.box[1],d.box[3])}" x2="${mid(d.at[0],d.at[2])}" y2="${mid(d.at[1],d.at[3])}" vector-effect="non-scaling-stroke"/>`).join("")}</svg>`
      +groups.map(({ks,d,wm,title})=>`<button type="button" class="wmBox${ks.every(isTown)?" town":""}${d?" dun":""}" data-wm="${wm}" style="${pos(W.maps[ks[0]])}" title="${title}">${d?`<span>${esc(d.n)}</span>`:""}</button>${d?`<button type="button" class="wmDot" data-wm="${wm}" style="${pos(d.at)}" title="${title}" aria-label="${esc(d.n)}"></button>`:""}`).join("")}
  el.querySelectorAll("[data-wmw]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.wmw===el.dataset.w)));
  bx.querySelectorAll("[data-wm]").forEach(b=>{const ks=b.dataset.wm.split(","),on=ks.some(k=>lit.includes(k));b.classList.toggle("on",on);b.classList.toggle("closed",ks.every(isClosed));if(b.tagName==="BUTTON")b.disabled=many&&!on});
  if(many){const here=+el.dataset.w,maps=c=>`${c} ${c>1?"maps":"map"}`,on=i=>lit.filter(k=>worldOf(k)===i),off=on(-1);
    el.querySelector(".wmNote").textContent=[on(here).length?`${maps(on(here).length)} lit. Click a lit box to open that map in the Map planner.`:"",
      ...WORLDMAPS.map((w,i)=>i!==here&&on(i).length?`${maps(on(i).length)} on the ${w.name} map.`:""),
      off.length?`Not on the game's world map: ${off.map(k=>`${mapName(k)||mapCode(k)}${mapArrives(k)?` (${mapArrives(k)})`:""}`).join(", ")}.`:""].filter(Boolean).join(" ");return}
  const nm=mp&&(all&&all.d?all.d.n:mapName(mp)||mapCode(mp)),wi=worldOf(mp);
  el.querySelector(".wmNote").textContent=!mp?"":wi===+el.dataset.w?"":wi>=0?`${nm} is on the ${WORLDMAPS[wi].name} map`:`${nm} isn't on the game's world map: ${mapArrives(mp)?`its region comes with the ${mapArrives(mp)}`:"the game doesn't draw it there"}`}
// the Map planner's world map: folds, remembered like a card (state.collapsed)
const WORLD_FOLD="Map planner: world map";
{const d=$("worldMore");if(d){d.open=!(state.collapsed||{})[WORLD_FOLD];
  d.addEventListener("toggle",()=>{const c=state.collapsed=state.collapsed||{};if(d.open===!c[WORLD_FOLD])return;if(d.open)delete c[WORLD_FOLD];else c[WORLD_FOLD]=true;save()})}}
const planPick=k=>{state.map=k;state.mapAll=null;save();renderMap()};
const planPickAll=k=>{state.map=state.mapAll=k;save();renderMap()};
function renderMap(){
  let mp=mapKey(state.map);const mob=calcMob(),me=showMine();$("mapMine").innerHTML=mineSwitch();
  if(!MAPMOBS[mp]&&!isTown(mp))mp=mobMap(mob)||Object.keys(MAPMOBS).sort((a,b)=>mapCode(a).localeCompare(mapCode(b)))[0];
  const dun=mapDun(mp);
  if(document.activeElement!==$("mapInput"))$("mapInput").value=mp?mapCode(mp):"";$("mapName").textContent=mp?mapFactsTxt(mp):"";
  ROOTQ("#mapCard .charOnly").forEach(x=>x.hidden=!me);$("mapTable").classList.toggle("noChar",!me);
  $("mapDun").innerHTML=dun?mapInfoDunHtml(dun):"";$("mapNavi").innerHTML=typeof naviLists==="function"?naviLists(mp):"";
  // the map's picture from the client (data/minimaps.js, tools/export_minimaps.py), asked for with its checksum so a new one isn't read from an old cache
  {const a=$("mapPic"),v=typeof MINIMAPS!=="undefined"&&mp&&MINIMAPS[mp];$("mapPicWrap").hidden=!v;if(v){const u=`img/maps/${mp}.png?v=${v}`;if(a.getAttribute("src")!==u){picSrc(a,u);a.alt=`Map of ${mapName(mp)||mapCode(mp)}`}}
   // its NPCs and ways out on it, and the way there from the nearest town (navi.js)
   if(typeof naviMarks==="function"){$("mapMarks").innerHTML=v?naviMarks(mp):"";$("mapRoute").innerHTML=naviRouteHtml(mp)}}
  worldMap($("planWorld"),mp,planPick,true,{pick:planPickAll,d:dun});{const wi=worldOf(mp);$("worldSum").textContent=!mp?"":wi>=0?`${WORLDMAPS[wi].name}, ${mapName(mp)||mapCode(mp)} lit`:"not on it yet"}
  // Advanced (the map's own rampage): folded; its heading shows a number set for this map
  $("mobbedRow").hidden=!me||!MAPMOBS[mp];$("mobbedSum").textContent=MAPMOBS[mp]&&(state.mobbed||{})[mp]!=null?`${state.mobbed[mp]} monsters attacking at once`:"";
  {const b=$("mobbedIn");b.disabled=!MAPMOBS[mp];b.placeholder=MAPMOBS[mp]?(mobbedDef(mp)?String(mobbedDef(mp)):"Auto"):"";if(document.activeElement!==b)b.value=MAPMOBS[mp]&&(state.mobbed||{})[mp]!=null?state.mobbed[mp]:""}
  {const b=$("mapToSess"),s=cur(),here=!!MAPMOBS[mp]&&sessMap(s)===mp,ids=MAPMOBS[mp]?mapHuntIds(mp):[],same=here&&ids.length===s.mobIds.length&&ids.every(id=>s.mobIds.includes(id));
    // on another map than the session's: a link back to it
    {const k=MAPMOBS[sessMap(s)]?sessMap(s):null,a=$("mapBack");a.hidden=!k||k===mp;if(k){a.dataset.map=k;a.textContent=`Back to ${mapName(k)||mapCode(k)}`;a.title=`The session's map: ${mapLabel(k)}`}}
    // one button: make this the session's map (or, on it already, hunt all its monsters); greyed out once it's exactly that
    b.dataset.map=mp||"";b.disabled=!MAPMOBS[mp]||same;b.textContent=same?"✓ Session's map":here?"Hunt all its monsters":"Farm here";
    b.title=same?`Session "${s.name}" farms this map and all its monsters`:here?`Session "${s.name}" is on this map with ${s.mobIds.length} of its monsters: hunt all of them (not bosses or skipped ones)`
      :"Makes this the current session's map, and its monsters the ones you hunt here (not bosses or skipped ones), weighted by their spawns like this planner"}
  renderMapList();$("mapTableWrap").hidden=!MAPMOBS[mp];
  if(!MAPMOBS[mp]){$("mapTiles").innerHTML=`<div class="note">${isTown(mp)?"A town: no monsters.":"Pick a map to see its monsters."}</div>`;$("mapConv").innerHTML="";$("mapTable").querySelector("tbody").innerHTML="";return}
  const w=walkSec(),r=mapStats(mp,w);const L=lvExp(num(C().baseLv));const st=stats(cur());const L2=st?st.L:L;
  $("mapTiles").innerHTML=!me?`${charSet()?"":`<div class="note noCharNote">${NO_CHAR_TXT} on this map. <a href="#" data-gotab="char">Open Character</a></div>`}${isClosed(mp)?`<div class="note bad">This map is marked as not open yet${mapArrives(mp)?`: it comes with the ${esc(mapArrives(mp))}`:""}.</div>`:""}`
   :r?`<div class="tile now"><div class="k">Average EXP / min</div><div class="v mono">${fmtN(r.epm)}</div><div class="s">weighted by spawn counts${r.el2&&convOn()?` · with ${esc(convWith(r.el2))}`:""}${r.skip?` · skips ${r.skip} you can't hurt`:""}${r.unk?` · leaves out ${esc(r.unkNames.join(", "))} (EXP unknown)`:""}</div></div>
   <div class="tile" title="${esc(walkSrcTxt())}"><div class="k">Kills / hr</div><div class="v mono">${fmtN(3600/r.secT)}</div><div class="s">${r.sec.toFixed(1)}s fight + ${r.walk.toFixed(1)}s walk${sellTxt(r.sell," + "," selling")}</div></div>
   <div class="tile"><div class="k">EXP / hr</div><div class="v mono">${L2?pct(r.epm*60/L2*100):fmtN(r.epm*60)}</div><div class="s">${L2?`1 level in ${fmtDur(L2/(r.epm*60))}`:`set Base level 1–${MAX_BASE_LV} for %`}</div></div>
   <div class="tile"><div class="k">Zeny / hr</div><div class="v mono">${fmtN(r.zph)}</div><div class="s">net${r.zcost>=0.5?` of ~${fmtN(r.zcost)} z SP items, potions &amp; skill items`:""}${r.hpm==null?"":` · HP lost ~${fmtN(r.hpm)}/min`}</div></div>
   ${susTile(r.sus,"on "+mapCode(mp))}${isClosed(mp)?`<div class="note bad">This map is marked as not open yet${mapArrives(mp)?`: it comes with the ${esc(mapArrives(mp))}`:""}.</div>`:""}${lvLocked(mp)?`<div class="note bad">You need base Lv ${mapMinLv(mp)} to enter this map.</div>`:""}`
   :MAPMOBS[mp].every(x=>x.m.boss||x.m.expUnknown||isSkipped(x.m))?'<div class="note bad">No EXP data yet for the monsters here.</div>':'<div class="note bad">Your attack can\'t hurt anything here.</div>';
  $("mapConv").innerHTML=me?convCheck(mp,w,r):"";
  const tot=MAPMOBS[mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).reduce((a,x)=>a+x.n,0)||1;
  $("mapTable").querySelector("tbody").innerHTML=withMobbed(mp,()=>MAPMOBS[mp].slice().sort((a,b)=>b.n-a.n).map(({m,n})=>{const x=r&&r.el2?withEl(r.el2,()=>mobRow0(m,w)):mobRow(m,w);
    return `<tr data-id="${m.id}" class="${cur().mobIds.includes(m.id)?"sel":""}" style="${isSkipped(m)?"opacity:.55":""}"><td class="name">${mobIcon(m.id,1,"il")}<a href="#" data-info="mob:${m.id}">${esc(m.name)}</a> <button type="button" class="small" data-sessmob="${m.id}">${cur().mobIds.includes(m.id)?"− Session":"+ Session"}</button>${BOSS_PILL(m)}${m.boss?"":` <button type="button" class="small" data-skip="${m.id}">${isSkipped(m)?"Unskip":"Skip"}</button>`}</td><td>≈${spN(n)}</td><td>${m.boss?"–":isSkipped(m)?"skipped":Math.round(n/tot*100)+"%"}</td><td>${m.lv}</td><td>${m.el?`<span class="el ${m.el}">${m.el} ${m.elv}</span>`:"–"}</td><td>${(el=>elRateHtml(el,elemMult(m,el)))((r&&r.el2)||x.el2||atkEl())}</td><td>${m.size||"–"}</td><td>${m.race||"–"}</td><td class="${x.mult>100?"good":x.mult<=0?"bad":""}">${x.mult<=0?"can't hurt":Math.round(x.mult)+"%"}</td><td>${isFinite(x.sec)?x.sec.toFixed(1)+"s":"–"}</td><td>${fmtExp(m)}</td><td>${m.boss?"–":susCell(withEl((r&&r.el2)||x.el2,()=>susMob(m,w)))}</td></tr>`}).join(""));
}
// the open tab (showTab sets it) and the GEN each tab's heavy cards were drawn at: renderAll draws only the open tab's (Where to farm
// and the Monsters table took ~150 ms on every Character edit while hidden), and opening a tab redraws them only after a save
let TAB_ON=null,DREW_ALL=false;const DRAWN={};
const draw=(k,f)=>{DRAWN[k]=GEN;f()},redraw=(k,f)=>{if(DRAWN[k]!==GEN)draw(k,f)};
function renderAll(){rowPass(renderAll0)}
function renderAll0(){stampPrices();SKFX=skillEffects(C());const sgTree=sageFromTree(C());ROOTQ('[data-sg="sfLv"],[data-sg="boltLv"],[data-sg="hsLv"],[data-sg="dbLv"]').forEach(i=>{i.disabled=sgTree;i.title=sgTree?"Set by the Skills card":""});ROOTQ("[data-sgbolt]").forEach(i=>i.disabled=sgTree&&!skLv(C(),SG_BOLT[i.dataset.sgbolt]));applyBuild();applyConsumables();renderBuild();hsCompare();renderSessions();renderChar();renderTracker();const t=TAB_ON;if(t==="maps")renderMobs();if(t==="track"||t==="home")draw("best",renderBest);renderRecovery();if(t==="track")draw("hunt",renderHunt);if(t==="market")renderPrices();if(t==="items")draw("items",renderItems);if(t==="equip"&&typeof renderEquipDb==="function")draw("equip",renderEquipDb);if(t==="cards"&&typeof renderCardDb==="function")draw("cards",renderCardDb);renderMap();renderRef();renderExp();if(t==="home"&&typeof renderHome==="function")renderHome();snapEst();DREW_ALL=true}

