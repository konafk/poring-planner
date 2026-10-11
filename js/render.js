// ---- render: character ----
// card tick boxes: a card's numbers only show while it's ticked
const syncCardOpts=()=>ROOTQ(".cdItem").forEach(r=>{const b=r.querySelector('input[type="checkbox"][data-cd]'),o=r.querySelector(".cdOpts");if(b&&o)o.hidden=!b.checked});
const syncChar=()=>{
  const c=C();$("job").value=state.job;renderEq();renderCons();
  $("preset").innerHTML=JOBS[state.job].p.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join("")+'<option value="-1">Custom</option>';
  $("preset").value=String(c.preset??0);renderSkills();
  ["baseLv","jobLv","atkTxt","matkTxt","hitTxt","fleeTxt","aspd","defTxt","maxHp","maxSp","intTxt","wAtk","fctSec","normalPct","myElPct","ignDef","ignMdef","mastery","rangePct","skillPct","crit","critDmg","fixedShare","vctPct","fctPct","acdPct","dmgBonus","nameSel","namePct","itemSp","itemPrice","itemHp","itemHpPrice","mobInterval","hitScale"].forEach(k=>$(k).value=c[k]??"");["curW","maxW","gymLv"].forEach(k=>$(k).value=num(c[k])>0?c[k]:"");$("townMin").value=c.townMin??3;$("sellAt").value=num(c.sellAt)>0?c.sellAt:"";$("wAtk").value=num(c.wAtk)>0?c.wAtk:"";
  $("spRegen").value=num(c.spRegen)>0?c.spRegen:"";$("hpRegen6").value=num(c.hpRegen6)>0?c.hpRegen6:"";
  $("weapon").value=c.weapon;$("wElem").value=c.wElem;$("dualRow").hidden=state.job!=="Assassin";$("lw").value=c.lw||"";$("lwElem").value=c.lwElem||"Neutral";$("lwAtk").value=num(c.lwAtk)>0?c.lwAtk:"";$("shield").checked=!!c.shield;$("shieldNote").textContent=`${state.job} shield penalty: ASPD −${BUILD.SHIELD_ASPD[state.job]??"?"}${state.job==="Assassin"?"; it replaces a left-hand weapon":""}. Ticking or unticking moves the ASPD above`;$("nameType").value=c.nameType||"phys";$("autoSp").checked=!!c.autoSp;$("convSel").value=!c.converters?"":convFixed()||"auto";$("potOn").checked=!!c.potOn;$("potPrice").value=c.potPrice??2200;$("potMin").value=c.potMin??30;potInfo();$("yggOn").checked=!!c.yggOn;$("convNote").textContent=c.converters&&c.a.el!=="W"?"(this attack has its own element, so converters don't change it)":"";
  const a=c.a;$("aType").value=a.type;$("aPct").value=a.pct;$("aHits").value=a.hits;$("aElem").value=a.el;$("aCast").value=a.cast;$("aDelay").value=a.delay;$("aSp").value=a.sp;$("aTargets").value=a.targets;$("aZeny").value=a.zeny||"";$("cartW").value=c.cartW||"";$("cartWrap").hidden=!num(a.cart);
  {const ac=AC();$("acSpell").innerHTML=Object.keys(AC_SPELLS).map(n=>`<option>${esc(n)}</option>`).join("");$("acOn").checked=!!ac.on;$("acSpell").value=ac.spell;$("acLv").value=ac.lv;$("acPct").value=ac.pct}
  $("bonus").value=state.bonus;$("jobBonus").value=num(state.jobBonus);
  {const cd=CRD();ROOTQ("[data-cd]").forEach(i=>{const k=i.dataset.cd;if(i.type==="checkbox")i.checked=!!cd[k];else i.value=cd[k]??""})}
  syncCardOpts();
  $("dpWrap").hidden=state.job!=="Sage";
  {const ks=CRD().killSp;$("killSpBoxes").innerHTML=Object.entries(KILL_SP).map(([r,n])=>`<label class="bar" style="flex-direction:row;gap:4px"><input type="checkbox" data-cdkill="${esc(r)}" style="width:auto"${ks.includes(r)?" checked":""}> <b>${esc(n)}</b> (${esc(r)})</label>`).join("")}
  $("ecRow").hidden=!EC_JOBS.includes(state.job);{const e=ECO();ROOTQ("[data-ec]").forEach(i=>{const k=i.dataset.ec;if(i.type==="checkbox")i.checked=!!e[k];else i.value=e[k]??""})}
  $("sagePanel").hidden=state.job!=="Sage";if(state.job==="Sage"){const g=G();ROOTQ("[data-sg]").forEach(i=>{const k=i.dataset.sg;if(i.type==="checkbox")i.checked=!!g[k];else i.value=g[k]??""});ROOTQ("[data-sgbolt]").forEach(i=>i.checked=!!g.bolts[i.dataset.sgbolt]);$("sg_hsOn").disabled=!!g.hsAuto}STATS.forEach(k=>$("st_"+k).value=(c.st&&c.st[k])||"");renderStatNote();
};
function renderChar(){renderAspdBuffs();potInfo();
  // converters vs the monster you picked: the element-table rate of each one, and the one the EXP/min picks
  {const m=convOn()&&calcMob();$("convInfo").innerHTML=m?`vs ${esc(m.name)} (${m.el||"Neutral"} ${m.elv||1}): ${convAll().map(el=>elRateHtml(el,elemMult(m,el))).join(" · ")} → ${convFixed()?`using ${convFixed()}`:`best ${esc(mobRow(m,walkSec()).el2)}`}`:""}
  if(typeof renderStatNote==="function")renderStatNote();
  const c=C(),a=c.a,p=JOBS[state.job].p[c.preset];
  $("jobNote").textContent=`Settings are saved per job · ${Object.keys(state.chars).length} job${Object.keys(state.chars).length===1?"":"s"} set up`;
  $("atkSummary").textContent=a.type==="spellfist"?`· Spell Fist Lv ${G().sfLv}: ${Math.round(sfChance()*100)}% per attack, ${sfPct()}% MATK with ${sfBolts().map(b=>({Fire:"Fire",Water:"Cold",Wind:"Lightning"})[b]).join(" / ")||"no"} bolts`:`· ${a.type==="magic"?"Magic":a.type==="auto"?"Basic attacks":"Physical"} ${a.pct}% × ${a.hits} ${atkEl()}${a.targets>1?` · ${a.targets} targets`:""}${p&&p.note?` · ${p.note}`:""}`;
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
  {const cd=CRD(),m=calcMob(),k0=SG_MOB;SG_MOB=m;try{const hf=hfHpPerSec(),hs=m?healsPerSec(m):0,sh=m?healShare(m):0,parts=[];
    {const k=hfCards(),lbl=`Hunter Fly${k>1?` ×${k}`:""}${cardsInGear(c,[HUNTER_FLY])>0?" (from your gear)":""}`;
      const hp=[];if(k)hp.push(hf>0?`${lbl} heals ~${fmtN(hf*60)} HP/min`:`${lbl}: only physical attacks trigger it`);if(hpRecPct())hp.push(`HP recovery +${hpRecPct()}% from gear`);
      $("hpCardInfo").innerHTML=hp.join(" · ");
      $("hpInfo").textContent=`${fmtN(hpRegen6())} per 6s${ihrPer10()?` + ${ihrPer10()} per 10s (Increase HP Recovery)`:""}${consHPPerSec()>0?` + ${fmtSig(consHPPerSec()*60)}/min from consumables`:""} = ${fmtN(hpRegenPerSec()*60)} HP/min${hf>0?`, + ${fmtN(hf*60)} from Hunter Fly`:""}`}
    if(cd.vitata)parts.push((vitInGear(c)?"Vitata SP cost from your gear":`SP cost +${num(cd.spBonus)}%`)+(hs>0?` · vs ${esc(m.name)}: Heal ${(hs*60).toFixed(1)} casts/min${sh>=1?` <span class="bad">(can't keep up: more than all of your time)</span>`:` (${Math.round(sh*100)}% of your time not attacking)`}`:""));
    if(cd.creamy)parts.push("Creamy: the Zeny Hunter teleports past monsters you skip");
    if(noBreak())parts.push(cd.phen||cd.bbfly?`casts aren't interrupted${vctCards()?` · cast +${vctCards()}%`:" · cast time from your gear"}`:"Phen / Bloody Butterfly in your gear: casts aren't interrupted");
    if(cd.daSF)parts.push(a.type!=="auto"&&a.type!=="spellfist"?"Side Winder: only basic attacks":swMul()===1&&a.type==="auto"?"Side Winder: follows your learned Double Attack":`Side Winder: +${num(cd.daPct)}% hits`);
    $("cardInfo").innerHTML=parts.join(" · ");
    const sp=[],dr=dracSPPerSec(),dp=dpSPPerSec(),ks=killSPPerSec();
    {const k=dracCards();if(k)sp.push(`Dracula${k>1?` ×${k}`:""}${cardsInGear(c,[DRACULA])>0?" (from your gear)":""} ~${fmtN(dr*60)} SP/min`)}
    if(cd.dpOn&&state.job==="Sage")sp.push(dp>0?`Dark Priest ~${fmtN(dp*60)} SP/min`:"Dark Priest: only physical attacks");
    if(cd.killSp.length)sp.push(!m?"pick a monster to see the SP per kill":ks>0?`vs ${esc(m.name)}: +5 SP a kill ≈ ${fmtN(ks*60)} SP/min`:`no +5 SP per kill vs ${esc(m.name)}${isSF()?" (not with Spell Fist)":RANGED.includes(c.weapon)?" (melee only)":cd.killSp.includes(m.race)?"":` (${esc(m.race||"?")})`}`);
    if(spRecPct())sp.push(`SP recovery +${spRecPct()}% from gear`);
    $("spCardInfo").innerHTML=sp.join(" · ")}finally{SG_MOB=k0}}
  if(ecOn()){const m=calcMob(),k0=SG_MOB;SG_MOB=m;try{const d=m?defense(m):null;
    $("ecInfo").textContent=d?`vs ${m.name}: −${d.red}% damage at SP ${d.label}, ${fmtN(d.ecSP*60)} SP/min on hits taken`:"pick a monster to see the damage cut"}finally{SG_MOB=k0}}else $("ecInfo").textContent=""
  if(state.job==="Sage"){const g=G(),m=calcMob(),d=m?((k)=>{SG_MOB=m;try{return defense(m)}finally{SG_MOB=k}})(SG_MOB):null;
    $("sageInfo").innerHTML=`${g._note?esc(g._note)+" · ":""}Upkeep ${fmtN(sgUpkeep()*60)} SP/min · Hindsight ${fmtN(hsFullSP()*60)} SP/min${hsChance()>0?` (${Math.round(hsChance()*100)}% chance, Lv ${hsBoltLv()} bolt${dbChance()>0?`, +${Math.round(dbChance()*100)}% Double Bolt`:""})`:" (off)"}`+
      (d?` · vs ${esc(m.name)}: defence ${fmtN(d.extra*60)} SP/min, HP lost ${fmtN(d.hp*60)}/min`:" · pick a monster to see damage taken")+
      ` · SP items ${sgItemsOn()?`${(sgItemsPerSec()*60).toFixed(1)}/min ≈ ${fmtN(sgItemsPerSec()*3600*spItemPrice())} z/hr`:"off (Hindsight off)"}`}
  $("charTiles").innerHTML=`<div class="tile"><div class="k">Per use</div><div class="v mono">${us.toFixed(2)}s</div><div class="s">${a.type==="auto"||a.type==="spellfist"?`ASPD ${aspdEff()}${c.potOn?" (potion)":""} · ${atkPerSec().toFixed(2)} hits/s${critChance()>0?` · ${Math.round(critChance()*100)}% crits`:""}`:`cast ${castSec().toFixed(2)}s${castSec()<num(a.cast)?` (base ${num(a.cast)}s)`:""}${castEff()>castSec()+0.005?` <span class="warnc">≈ ${castEff().toFixed(2)}s with hits interrupting it</span>`:""} + delay ${delaySec().toFixed(2)}s${delaySec()<1/atkPerSec()?" · motion (ASPD) longer than delay":""}${critChance()>0?` · ${Math.round(critChance()*100)}% crits`:""}`} · ${atk}</div></div>
   <div class="tile ${need>reg&&!c.autoSp?"":"now"}"><div class="k">SP use vs regen</div><div class="v mono">${fmtN(need)} / ${fmtN(reg)}</div><div class="s">per minute · regen ${spRegen8()} per 8s${isrPer10()?` + ${isrPer10()} per 10s (Increase SP Recovery)`:""}${consSPPerSec()>0?` + ${fmtSig(consSPPerSec()*60)}/min from consumables`:""}${a.type==="spellfist"?(ips>0?` · ${(ips*60).toFixed(1)} SP items/min`:hsChance()>0&&hsSustain()<1?` · <span class="bad">Hindsight fires ${Math.round(hsSustain()*100)}% as often</span>`:""):need>reg?(c.autoSp?` · items cover ${fmtN(need-reg)}/min`:` · <span class="bad">you rest ${Math.round((1-1/rf)*100)}% of the time</span>`):""}</div></div>
   <div class="tile"><div class="k">Walking per kill</div><div class="v mono">${walkSec().toFixed(1)}s</div><div class="s">learned from your ${state.job} logs (2s until then)</div></div>`;
}

// items skills use up: casts per kill for this job's support skills and a price box for every item in play (c.supCasts, c.itemPrices,
// saved per job); the boxes are only rebuilt when the set of items changes, so typing in one keeps its focus
const qtyTxt=n=>n%1?n.toFixed(1):String(n);
function renderUseItems(){const c=C(),a=c.a,ui=useItems(),sup=supShown(),fb=Object.keys(FIELD_ITEM).filter(k=>skLv(c,k)>0);
  const ids=[...new Set([...ui.map(x=>x.id),...sup.flatMap(s=>s.items.map(([n])=>CONS_ID[n])),...fb.map(k=>CONS_ID[FIELD_ITEM[k]])])].filter(Boolean);
  const box=$("useItems"),key=ids.join()+"|"+sup.map(s=>s.key).join(),lab='class="bar" style="flex-direction:row;gap:4px"';
  if(box.dataset.key!==key){box.dataset.key=key;
    const row=(h,x)=>`<div class="bar" style="flex-basis:100%"><span>${h}</span>${x}</div>`;
    box.innerHTML=(sup.length?row("Support skills, casts per kill:",sup.map(s=>`<label ${lab} title="How many times you cast it per kill (e.g. 0.5 = every other kill); each cast uses ${esc(s.items.map(([n,q])=>`${n} ×${q}`).join(" + "))}. Its cast time isn't counted">${esc(s.name)} <input type="number" min="0" step="0.5" data-supk="${s.key}" style="width:56px" placeholder="0"></label>`).join("")):"")
      +(ids.length?row("Skill item prices:",ids.map(id=>`<label ${lab} title="Blank: the NPC price, ${fmtN(consNpc(id))} z (rAthena; check it in game). Type what you pay, e.g. a market price">${esc(consName(id))} <input type="number" min="0" step="1" data-iprice="${id}" style="width:72px" placeholder="${consNpc(id)}"> z</label>`).join("")):"")}
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
// the map uses per hour are worked out on: the Map planner's, else the picked monster's best open map, else the session's. HP lost / min and SP short per hour there
function recNeed(){let mp=mapKey(state.map);if(!MAPMOBS[mp]){const m=calcMob(),om=m?openMaps(m):[];mp=om.length?om[0][0]:currentMap()}if(!MAPMOBS[mp])return null;
  const w=walkSec(),r=mapStats(mp,w);return {mp,hpm:r?r.hpm:null,sp:r?mapSpShort(mp,w,r.el2):0}}
function renderRecovery(){const R=REC(),need=recNeed(),pick={hp:recPick("hp"),sp:recPick("sp")},ch={hp:recCheapest("hp"),sp:recCheapest("sp")};
  const opts=kind=>`<option value="auto">Auto (cheapest${ch[kind]?": "+esc(ch[kind].name):""})</option><option value="none">None</option>`+recItems(kind).map(x=>`<option value="${x.id}">${esc(x.name)}${x.per==null?" (no price)":""}</option>`).join("")+'<option value="custom">Custom (type it)</option>';
  $("recHp").innerHTML=opts("hp");$("recHp").value=R.hpItem==="custom"||R.hpItem==="none"||(RECOVERY[R.hpItem]&&RECOVERY[R.hpItem].kind==="hp")?R.hpItem:"auto";
  $("recSp").innerHTML=opts("sp");$("recSp").value=R.spItem==="custom"||R.spItem==="none"||(RECOVERY[R.spItem]&&RECOVERY[R.spItem].kind==="sp")?R.spItem:"auto";
  $("recHp").title=pick.hp&&pick.hp.want?`${pick.hp.want.name} has no price, so the cheapest is used`:"";$("recSp").title=pick.sp&&pick.sp.want?`${pick.sp.want.name} has no price, so the cheapest is used`:"";
  $("recCustom").hidden=R.spItem!=="custom";$("recCustomHp").hidden=R.hpItem!=="custom";$("recDisc").checked=recDisc();
  $("recNote").textContent=need?`${state.job} on ${mapCode(need.mp)}: ${need.hpm==null?"HP loss unknown":`${fmtN(need.hpm)} HP lost/min`} · ${fmtN(need.sp/60)} SP/min short`+` · using ${pick.hp?pick.hp.name:"no HP item"} and ${pick.sp?pick.sp.name:"no SP item"}`:"pick a monster or a map (Map planner) to see uses per hour";
  // don't rebuild the box you're typing in; the table catches up when you leave it
  const f=document.activeElement;if(f&&f.tagName==="INPUT"&&$("recTable").tBodies[0].contains(f))return;
  const rows=tableRows("recTable",recItems().map(x=>{const n=!need||!(x.avg>0)?null:x.kind==="hp"?(need.hpm==null?null:need.hpm*60/x.avg):need.sp/x.avg;
    return {...x,uph:n,zph:n!=null&&x.price!=null?n*x.price:null,wph:n!=null?n*x.w:null}}));
  const inp=(x,k,v,w)=>`<input type="number" min="0" step="any" data-rid="${x.id}" data-rk="${k}" value="${v??""}" placeholder="${k==="player"||RECOVERY[x.id][k]==null?"n/a":RECOVERY[x.id][k]}" aria-label="${esc(x.name)} ${k}" style="width:${w}px">`;
  $("recTable").querySelector("tbody").innerHTML=rows.map(x=>{const use=pick[x.kind]&&pick[x.kind].id===x.id,u=x.kind.toUpperCase();
    return `<tr><td class="name"><b>${esc(x.name)}</b>${use?' <span class="pill">in use</span>':""}${x.edited?` <a href="#" data-rreset="${x.id}">reset</a>`:""}</td><td>${u}</td>
      <td class="nowrap">${inp(x,"min",x.min,56)}–${inp(x,"max",x.max,56)} <b>${fmtSig(x.avg)}</b></td>
      <td class="nowrap">${inp(x,x.src||"player",x.price,72)} <span class="note">${x.src?REC_SRC[x.src]:"no price"}</span></td>
      <td>${x.per==null?"n/a":`<b>${fmtSig(x.per)}</b> z/${u}`}</td>
      <td class="nowrap">${x.perW==null?"–":fmtSig(x.perW)} <span class="note">per ${inp(x,"w",x.w,52)}${x.wOk?"":' <span title="weight not checked in game yet">?</span>'}</span></td>
      <td>${fmtQty(x.uph)}</td><td>${x.per==null?"n/a":x.zph==null?"–":fmtN(x.zph)}</td><td>${fmtQty(x.wph)}</td></tr>`}).join("")}
// ---- render: tracker ----
function renderSessions(){$("sessionSel").innerHTML=state.sessions.map(s=>`<option value="${esc(s.id)}" ${s.id===state.current?"selected":""}>${esc(s.name)}</option>`).join("")}
function renderTracker(){$("dieItem").checked=!!state.dieItem;$("dieBtn").textContent=`Died −${diePct()}%`;
  const s=cur(),st=stats(s);
  if(document.activeElement!==$("partyN"))$("partyN").value=partyN(s);$("partyBonus").value=partyBonus(s);
  $("partyNote").textContent=partyN(s)>1?`Each kill gives you ${partyPct(s)}% of its EXP (party of ${partyN(s)}). Even Share only works within 15 base levels.`:"";
  $("title").textContent=`${s.name} · ${state.job}`;
  const pz=openPause(s);$("pauseBtn").textContent=pz?"Resume":"Pause";$("pauseBtn").classList.toggle("primary",!!pz);$("pauseNote").hidden=!pz;
  if(pz)$("pauseNote").textContent=`Paused since ${fmtT(pz.from)}; time away isn't counted. Resume or log an entry when back.`;
  const ms=sessMobs(s),mob=ms.length===1?ms[0]:null;
  $("subtitle").innerHTML=ms.length>1?`Farming ${ms.map(m=>esc(m.name)).join(", ")}${sessMap(s)?` on ${esc(mapLabel(sessMap(s)))}`:""} · weighted by spawn counts`:mob?`Farming ${esc(mob.name)} · Lv ${mob.lv} · ${mob.el?`<span class="el ${mob.el}">${mob.el} ${mob.elv}</span> · `:""}${mob.size||""} ${mob.race||""} · ${fmtExp(mob)} base EXP · <a href="${dbUrl(mob)}" target="_blank" rel="noopener">rozerodb ↗</a>`:"Pick a monster in the Monsters &amp; maps tab and press \"Farming this now\"";
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
  if(p){$("tPace").textContent=`${fmtN(p.kph)}/hr`;$("tPaceS").textContent=`${p.obs.toFixed(1)}s per kill`+(isFinite(p.fight)?(p.obs<p.fight?` · faster than the model's ${p.fight.toFixed(1)}s fight, so check your ATK/MATK`:` · ~${p.fight.toFixed(1)}s fighting + ~${p.walk.toFixed(1)}s walking`):"")}
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
const BASE_TITLE=String(document.title||"Rozero Farm Planner");
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
  else if(!t)lenS=ms.length?"You can't hurt the session's monsters with this attack; type the minutes a trip takes":"Pick what you're farming (Monsters & maps → click a monster → Farming this now), or type the minutes a trip takes";
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
  if(ph==="none"){el.textContent="–";el.className="v mono";$("tripK").textContent="Next sell";$("tripS").textContent=TRIP_OK?"Press Start when you leave town":"Needs a trip length: see One trip";document.title=BASE_TITLE;return}
  const due=tripDue(s),left=due-now,early=tripEarly();
  el.textContent=ph==="paused"?"Paused":left>0?fmtClock(left):"Sell now";el.className="v mono"+(ph==="due"?left>0?" warnc":" bad":"");
  $("tripK").textContent=ph==="due"?"Time to sell":"Next sell";
  $("tripS").textContent=`sell point at ${fmtT(due)}${early?` · rings at ${fmtT(due-early)}`:""} · left town ${fmtT(s.trip.from)}${ph==="paused"?" · session paused: the clock waits until you Resume (Session tab) or press Restart":""}`;
  document.title=(ph==="due"?"⏰ Sell now · ":ph==="run"?`${fmtClock(left)} · `:"")+BASE_TITLE}
function renderChart(s){
  const svg=$("chart"),es=[...s.entries].sort((a,b)=>a.t-b.t);const W=800,H=340,pl=52,pr=18,pt=16,pb=34;
  if(!es.length){svg.innerHTML=`<text x="${W/2}" y="${H/2}" text-anchor="middle">No entries yet</text>`;return}
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
  g+=`<polygon points="${X(0)},${H-pb} ${pts} ${X(n-1)},${H-pb}" fill="var(--accent-soft)" stroke="none"/><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.25" stroke-linejoin="round"/>`;
  y.forEach((v,i)=>{g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${i===n-1?5.5:4}" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"><title>${md?fmtD(es[i].t)+" ":""}${fmtT(es[i].t)} · Lv ${esc(es[i].lv)} ${esc(es[i].pct)}%</title></circle>`});
  svg.innerHTML=g;
}
function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x)));const f=x/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function fmtP(v){return Number.isInteger(v)?String(v):v.toFixed(1)}
// how long a pause lasted (or has lasted so far): 7h 50m
const fmtAway=p=>{const m=Math.round(((p.to??Date.now())-p.from)/6e4);return m>=60?`${Math.floor(m/60)}h${m%60?` ${m%60}m`:""}`:`${m}m`};
// a time as a datetime-local input value, in local time
const dtLocal=t=>{const d=new Date(t),p=x=>String(x).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
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
      <td>${inN("pct",e.pct,'min="0" max="100" step="0.01" aria-label="EXP %"')}</td><td>${inN("jpct",e.jpct,'min="0" max="100" step="0.01" placeholder="–" aria-label="Job EXP %"')}</td>${saveBtns}</tr>`};
    let rate="";if(e.died)rate=`<span class="pill down">died −${esc(e.died)}%</span>`;else if(i>0){const q=es[i-1],h=activeH(s,q.t,e.t);rate=h>=1/60?pct((cumulative(e,base)-cumulative(q,base))/h/(lvExp(e.lv)||100)*100):`<span title="under a minute of unpaused time since the last entry">–</span>`}
    return {t:e.t,k:0,h:`<tr data-t="${esc(e.t)}" style="cursor:default"><td>${when(e.t)}</td><td>B${esc(e.lv)}${jl.get(e)?`/J${esc(jl.get(e))}`:""}</td><td>${e.pct.toFixed(1)}%</td><td>${e.jpct!=null?e.jpct.toFixed(1)+"%":"–"}</td><td>${rate}</td>${btns(`data-edit="${esc(e.t)}"`,`data-del="${esc(e.t)}"`,"entry")}</tr>`}});
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
    `<tr data-sid="${esc(s.id)}" class="${s.id===state.current?"sel":""}"><td class="name">${esc(s.name)}</td><td class="name">${esc(s.job||"–")}</td><td class="name">${ms.length?ms.map(m=>esc(m.name)).join(", "):"–"}</td><td>${fmtD(st.es[0].t)} ${fmtT(st.es[0].t)}</td><td>${st.spanMin} min</td><td title="% of the EXP base Lv ${esc(st.last.lv)} needs, gained per hour"><b>${pct(st.avgPct)}</b> <span class="muted">at B${esc(st.last.lv)}</span></td><td>${fmtN(st.avgRaw/60)}</td><td>${kph?fmtN(kph):"–"}</td><td>${kph?(3600/kph).toFixed(1)+"s":"–"}</td></tr>`);
  $("cmpTable").querySelector("tbody").innerHTML=rows.join("")||`<tr><td colspan="9" class="name muted">${all.length?"No sessions match the filters.":"Sessions with 2+ entries show up here."}</td></tr>`;
}
function renderGoal(s,st){
  const tiles=$("goalTiles"),goal=Math.min(70,num(state.goalLv)||70);if(document.activeElement!==$("goalLv"))$("goalLv").value=goal;
  if(!st||st.avgRaw<=0){tiles.innerHTML='<div class="note">Log 2+ entries with EXP going up to see goal estimates.</div>';$("goalNote").textContent="";return}
  const curLv=st.last.lv;
  if(goal<=curLv){tiles.innerHTML=`<div class="note">You're already Lv ${curLv}. Pick a higher level.</div>`;$("goalNote").textContent="";return}
  let need=lvExp(curLv)?lvExp(curLv)*(1-st.last.pct/100):null;for(let l=curLv+1;l<goal&&need!=null;l++)need=lvExp(l)?need+lvExp(l):null;
  if(need==null){tiles.innerHTML='<div class="note">The EXP table covers Lv 1 to 70, so pick a goal up to Lv 71.</div>';$("goalNote").textContent="";return}
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
  return {pts:[{h:0,v:jl+j.last/100,now:`Job Lv ${jl} ${j.last.toFixed(1)}%`},...rows.map(q=>({h:q.h,v:q.lv,lv:q.lv,each:q.each}))],lo:jl,hi:goal,name:"Job Lv",color:"var(--good)"};
}
// projected base level (left axis) and job level (right axis) over farming hours at the average rates.
// Each level-up gets the date you would reach it farming non-stop from now.
let GOAL_PTS=[];
function renderGoalChart(base,job){
  const sers=[base,job].filter(Boolean);$("goalViz").hidden=!sers.length;$("goalWrap").hidden=!base;GOAL_PTS=[];if(!sers.length)return;
  const svg=$("goalChart");const W=800,H=260,pl=base?52:18,pr=job?62:18,pt=24,pb=34;
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
    if(S===base)g+=`<polygon points="${X(0)},${H-pb} ${line} ${end.x},${H-pb}" fill="var(--accent-soft)" stroke="none"/>`;
    g+=`<polyline points="${line}" fill="none" stroke="${S.color}" stroke-width="2" stroke-linejoin="round"/>`;
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
  svg.addEventListener("pointermove",e=>{if(!GOAL_PTS.length)return;const r=svg.getBoundingClientRect(),k=r.width/800,px=(e.clientX-r.left)/k,py=(e.clientY-r.top)/k;
    const d=q=>Math.hypot(q.x-px,(q.y-py)/2),q=GOAL_PTS.reduce((a,b)=>d(b)<d(a)?b:a);
    const hr=$("goalHair");hr.setAttribute("x1",q.x);hr.setAttribute("x2",q.x);hr.setAttribute("visibility","visible");
    tip.innerHTML=q.tip;tip.hidden=false;const w=tip.offsetWidth/2;tip.style.left=Math.min(Math.max(q.x*k,w),r.width-w)+"px";tip.style.top=q.y*k+"px"});
  svg.addEventListener("pointerleave",hide);
})();

// ---- render: monsters ----
const calcMob=()=>MOBS.find(m=>m.id===(state.calcMobId||cur().mobIds[0]));
// " mini boss" / " boss" after a monster's name in filter and sort text, so "mini" in a Monster filter lists the mini bosses
const bossTag=m=>m.mini?" mini boss":m.boss?" boss":"";
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
const isMagicAtk=()=>C().a.type==="magic"||C().a.type==="spellfist";
function renderMobs(){
  const w=walkSec();const lvMin=num(state.minLv),lvMax=num(state.maxLv)||999;
  let rows=MOBS.filter(m=>!m.boss&&m.lv>=lvMin&&m.lv<=lvMax&&!(state.hideClosed&&SPAWN[m.id]&&!openMaps(m).length)).map(m=>{const om=openMaps(m);return {...m,om,topN:om.length?om[0][1]:0,ratio:m.hp>0?m.exp/m.hp:0,...mobRow(m,w)}});
  const F=state.filters;rows=rows.filter(m=>Object.entries(F).every(([k,v])=>!v||matchF(v,colNum(m,k),colText(m,k))));
  const k=state.sort,d=state.dir;const sv=m=>{const v=k==="name"||k==="el"||k==="size"||k==="race"?colText(m,k):colNum(m,k);return v==null||v===""?null:v};
  rows.sort((a,b)=>{const x=sv(a),y=sv(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x>y?1:x<y?-1:0)*d});
  document.querySelectorAll("#mobTable th").forEach(th=>th.classList.toggle("on",th.dataset.k===k));
  const sel=(calcMob()||{}).id;
  $("mobNote").textContent=`${rows.length} monsters · ${state.job} · ${isMagicAtk()?"MATK":"ATK"} ${fmtN(sumStat(isMagicAtk()?C().matkTxt:C().atkTxt))} · ${convOn()?convLabel("per monster"):atkEl()}`;
  $("mobTable").querySelector("tbody").innerHTML=rows.slice(0,400).map(m=>`<tr data-id="${m.id}" class="${m.id===sel?"sel":""}"><td class="name">${esc(m.name)}${BOSS_PILL(m)}${isSkipped(m)?' <span class="pill down">skipped</span>':""}</td><td>${m.lv}</td><td>${m.el?`<span class="el ${m.el}">${m.el} ${m.elv}</span>`:"–"}</td><td>${m.size||"–"}</td><td class="name">${m.race||"–"}</td><td>${fmtN(m.hp)}</td><td>${fmtExp(m)}</td><td>${m.expUnknown?"?":m.ratio.toFixed(2)}</td>
    <td class="${m.mult>100?"good":m.mult<=0?"bad":""}">${m.mult<=0?"can't hurt":Math.round(m.mult)+"%"}${elTag(m.el2)}</td><td class="${m.hitc>=95?"good":m.hitc>=70?"warnc":"bad"}">${Math.round(m.hitc)}%</td><td>${isFinite(m.uses)?m.uses.toFixed(1):"–"}</td>
    <td class="${m.sec<=3?"good":m.sec<=8?"warnc":"bad"}">${isFinite(m.sec)?m.sec.toFixed(1)+"s":"–"}</td><td><b>${m.epm?fmtN(m.epm):"–"}</b></td>
    <td class="${m.dodge==null?"":m.dodge>=70?"good":m.dodge>=40?"warnc":"bad"}">${m.dodge==null?"–":m.dodge+"%"}</td><td>${m.hpm==null?"–":fmtN(m.hpm)}</td><td>${hasLoot(m)?fmtN(m.zk):"–"}</td><td>${hasLoot(m)&&isFinite(m.sec)?fmtN(m.zph):"–"}</td>
    <td class="name">${m.om.length?`<span class="map" title="${esc(m.om.map(x=>mapLabel(x[0])+" ≈"+x[1]).join(", "))}"><b>${mapCode(m.om[0][0])}</b><span>≈${m.om[0][1]}</span></span>`:'<span class="note">none open</span>'}</td><td><a href="${dbUrl(m)}" target="_blank" rel="noopener" title="rozerodb">↗</a></td></tr>`).join("")
    ||'<tr><td colspan="19" class="name muted">No monsters match these filters.</td></tr>';
  renderMobTiles();
}
// selling trips spread over each kill (weight); hidden when it rounds to nothing
const sellTxt=(s,pre,post="")=>s>=0.05&&isFinite(s)?`${pre}${s.toFixed(1)}s${post}`:s===Infinity?`${pre}<span class="bad">over your sell point</span>`:"";
function weightTile(m){const t=tripInfo(m,walkSec());if(!t)return "";const c=C(),at=sellPct();
  const pctNow=maxWt(c)?Math.round(num(c.curW)/maxWt(c)*100):0;
  const v=!(t.wk>0)?"–":isFinite(t.kills)?`${fmtN(Math.floor(t.kills))} kills`:'<span class="bad">sell first</span>';
  return `<div class="tile"><div class="k">Weight · sell at ${t.fell?70:fmtP(at)}%</div><div class="v mono">${v}</div><div class="s">${t.wk>0?`${t.wk.toFixed(1)} weight per kill`:"its drops weigh nothing"}${isFinite(t.kills)&&t.wk>0?` · ${fmtDur(t.min/60)} a trip + ${fmtN(num(c.townMin,3))} min to town`:""} · start at ${pctNow}%${t.fell?' · <span class="bad">no regen past 70% and you need SP, so you sell at 70%</span>':""}</div></div>`}
function renderMobTiles(){
  const m=calcMob();if(!m){$("mobTiles").innerHTML='<div class="note">Click a monster to see it here.</div>';return}
  const r=mobRow(m,walkSec());const s=cur();const L=lvExp(num(C().baseLv))||null;const om=openMaps(m);
  $("mobTiles").innerHTML=`<div class="tile now"><div class="k">${esc(m.name)} · Lv ${m.lv}</div><div class="v mono">${r.epm?fmtN(r.epm):"–"}</div><div class="s">${m.expUnknown?"EXP unknown (no data yet) · ":""}EXP/min${r.el2&&convOn()?` with ${r.el2} converter`:""} · ${isFinite(r.sec)?r.sec.toFixed(1)+"s fight + "+walkSec().toFixed(1)+"s walk"+sellTxt(r.tot-r.sec-walkSec()," + "," selling"):"can't hurt it"}${L&&r.epm?` · ~${pct(r.epm*60/L*100)}/hr at Lv ${C().baseLv}`:""}</div></div>
   <div class="tile"><div class="k">Per kill</div><div class="v mono">${isFinite(r.uses)?r.uses.toFixed(1):"–"} uses</div><div class="s">${fmtN(withEl(r.el2,()=>dmgPerHit(m)))}${dualHit()?` + ${fmtN(withEl(r.el2,()=>leftDmg(m)))} left hand`:""} per hit · ${Math.round(r.hitc)}% land · ${fmtN(num(C().a.sp)*spCostMul()*r.uses/targets())} SP</div></div>
   <div class="tile"><div class="k">Defence</div><div class="v mono">${r.hpm==null?"–":fmtN(r.hpm)}</div><div class="s">HP lost/min · you dodge ${r.dodge??"–"}% · DEF ${m.def??"–"} · MDEF ${m.mdef??"–"}</div></div>
${weightTile(m)}
   <div class="tile"><div class="k">Maps</div><div class="v mono">${om.length?mapCode(om[0][0]):"–"}</div><div class="s">${om.length?om.slice(0,4).map(x=>`${esc(mapLabel(x[0]))} ≈${x[1]}`).join(" · "):"none open"} · <a href="${dbUrl(m)}" target="_blank" rel="noopener">rozerodb ↗</a></div></div>
   <div class="bar" style="grid-column:1/-1">${s.mobIds.includes(m.id)?'<span class="pill up">In this session</span> <button type="button" class="small" id="dropMobBtn">Remove from session</button>':`<button type="button" class="primary" id="useMobBtn">${s.mobIds.length?`Also killing ${esc(m.name)}`:`Farming ${esc(m.name)} now`}</button>`}</div>`;
  const b=$("useMobBtn");if(b)b.addEventListener("click",()=>{toggleSessMob(m.id);state.calcMobId=null;save();renderAll()});
  const d=$("dropMobBtn");if(d)d.addEventListener("click",()=>{toggleSessMob(m.id);save();renderAll()});
}
const BOSS_PILL=m=>m.mini?` <span class="pill" title="One per map on a long respawn · ${m.boss?"Boss class: boss / normal bonuses count it as a boss":"not Boss class: boss / normal bonuses count it as normal"}">mini boss</span>`:m.boss?' <span class="pill">boss</span>':"";
// the EXP Hunter's Heal cost / hr: which items and how many an hour
const healTip=r=>{const h=recPick("hp"),s=recPick("sp");return [r.hpm==null?"HP: no damage data":r.hpZ>0&&h?`HP: ${h.name} ×${fmtQty(r.hpHr)}/hr = ${fmtN(r.hpZ)} z`:r.hpm>0&&!h?"HP: no HP item":"HP: none lost",
  r.spHr>0&&s?`SP: ${s.name} ×${fmtQty(r.spHr)}/hr = ${fmtN(r.spZ)} z`:!s?"SP: no SP item (you rest)":itemsOnNow()?"SP: regen covers it":"SP: no SP items (auto-use off, you rest)"].join("\n")};
// the Zeny Hunter's Costs / hr: healing as above, plus the ASPD potion and ground buffs
const costTip=r=>healTip(r)+(r.other>=0.5?`\nASPD potion${fieldBuffs().length?", ground buffs":""}: ${fmtN(r.other)} z`:"");
const UNK_PILL=' <span class="pill down" title="No EXP data for it yet, so it\'s left out of EXP / min">EXP ?</span>';
function renderBest(){
  const min=num($("bestMin").value),lim=num($("bestN").value,10);const w=walkSec();const s=cur(),st=stats(s);const curMap=currentMap();
  const curEpm=curMap?sessEpm(s,w):null;
  const rows=Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)).map(mp=>mapStats(mp,w)).filter(r=>r&&r.N>=min);
  const sameJob=(s.job||state.job)===state.job;
  // rank every open map by EXP / min, then filter, keep the top N and sort by the picked column
  rows.sort((a,b)=>b.epm-a.epm);rows.forEach((r,i)=>{r.rank=i+1;r.proj=st&&sameJob&&curEpm?st.avgPct*r.epm/curEpm:null});
  const shown=sortRows("bestTable",filterRows("bestTable",rows).slice(0,lim));
  $("bestBasis").textContent=`${state.job} · ${C().a.name||"attack"} · ${convOn()?convLabel("per map"):atkEl()} · walking ~${w.toFixed(1)}s/kill`+(curEpm&&st?` · compared with your session on ${mapCode(curMap)} at ${pct(st.avgPct)}/hr`:"");
  $("bestTable").querySelector("tbody").innerHTML=shown.map(r=>{
    const main=MAPMOBS[r.mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>`<div>${esc(x.m.name)} <span class="note">×${x.n}</span>${BOSS_PILL(x.m)}${x.m.expUnknown?UNK_PILL:""}</div>`).join("");
    const proj=r.proj;
    return `<tr data-map="${r.mp}" class="${r.mp===curMap?"sel":""}"><td>${r.rank}</td><td class="name"><b class="mono">${mapCode(r.mp)}</b> <span class="note">${esc(mapName(r.mp))}</span>${r.mp===curMap?' <span class="pill">current</span>':""}${elTag(r.el2)}</td><td class="name mainmobs">${main}</td><td><b>${fmtN(r.epm)}</b></td><td>${r.sec.toFixed(1)}s + ${r.walk.toFixed(1)}s${sellTxt(r.sell," + ")}</td><td>${fmtN(r.epk)}</td><td>${fmtN(r.zb)}</td><td title="${esc(healTip(r))}">${r.heal>=0.5?fmtN(r.heal):"–"}</td><td class="${r.net>0?"good":"bad"}"><b>${fmtN(r.net)}</b></td><td>${r.hpm==null?"–":fmtN(r.hpm)}</td><td>${r.skip?`<span class="pill down" title="${esc(r.skipNames.join(", "))}">${r.skip}</span>`:"–"}</td><td>≈${r.N}</td><td>${proj==null?"–":"~"+proj.toFixed(1)+"%/hr"}</td></tr>`}).join("")
    ||'<tr><td colspan="13" class="name muted">No open maps match.</td></tr>';
}
// ---- render: Zeny Hunter ----
const itemName=id=>ITEMN[id]||"#"+id;
// a drop chance for display: "?" when there's no published rate (data/loot.js null)
const chTxt=ch=>ch==null?"?":ch+"%";
// each drop with its chance, NPC price and any market price; the level penalty leads when it applies
const npcTag=id=>npcSell(id)>0?`NPC ${fmtN(npcSell(id))} z`:"";
const dropNames=m=>(penNote(m)?penNote(m)+" · ":"")+(m.drops||[]).map(([id,ch])=>`${itemName(id)} ${chTxt(ch)}${[npcTag(id),state.prices[id]>0?`players ${fmtN(state.prices[id])} z`:"",looted(id)?"":"not looted"].filter(Boolean).map(x=>` (${x})`).join("")}`).join(", ");
// a monster's whole drop list: chance after your drop bonus and the level penalty, and what each adds per kill; drops you don't loot sink to the bottom
const dropZTxt=z=>z>=10?fmtN(z):z>0&&z<0.01?"<0.01":z.toFixed(z>=1?1:2);
const dropList=m=>(m.drops||[]).map(([id,ch])=>({id,ch,z:dropZ(m,id,ch),on:looted(id)})).sort((a,b)=>b.on-a.on||b.z-a.z)
  .map(d=>`<div class="drop${d.on?"":" off"}"><a href="#" data-pitem="${esc(d.id)}" title="${d.ch==null?"no published drop rate":d.ch+"% base"}${npcSell(d.id)>0?` · NPC pays ${fmtN(npcSell(d.id))} z`:""} · click to set a market price">${esc(itemName(d.id))}</a> <span class="note">${chTxt(yourCh(m,d.ch))} · ${d.on?dropZTxt(d.z)+" z/kill":"not looted"}${ITEMW[d.id]>0?` · ${fmtN(ITEMW[d.id])} wt each`:""}</span>${state.prices[d.id]>0?` <b>${fmtN(state.prices[d.id])} z</b>`:""}</div>`).join("");
// a map's monsters, hunted ones first; click one to stop or start hunting it
const huntPicker=(r,w)=>`<div class="note">hunting ${r.earn.length} of ${r.mobs.length}${r.tele?` · teleport ~${r.tele.toFixed(1)}×/kill`:r.walk>w*1.01?` · walk ${r.walk.toFixed(1)}s/kill`:""}${r.manual?` · set by you · <a href="#" data-hreset="${esc(r.mp)}">reset</a>`:state.huntAuto?" · best-paying":""}${canTele()?` · <a href="#" data-notele="${esc(r.mp)}" title="Which maps block teleport isn't known: click to mark this one">${noTele(r.mp)?"no teleport":"teleport ok"}</a>`:""}</div>`
  +r.mobs.map(x=>`<div>${x.lvOut?`<span class="hpick off" title="${esc(dropNames(x.m))} · Lv ${x.m.lv}: passed by, outside your level filter">✕ ${esc(x.m.name)}</span>`
    :`<a href="#" class="hpick${x.on?"":" off"}" data-hpick="${esc(r.mp)}" data-hmob="${x.m.id}" title="${esc(dropNames(x.m))} · click to ${x.on?"pass it by":"hunt it"}">${x.on?"✓":"✕"} ${esc(x.m.name)}</a>`}${BOSS_PILL(x.m)} <span class="note">×${x.n} · Lv ${x.m.lv} · ${fmtN(x.zk)} z · ${fmtQty(x.wk)} wt${dropPenalty(x.m)?` · drops −${dropPenalty(x.m)}%`:""}${x.lvOut?" · Lv filter":""}</span></div>`).join("");
// market prices: one row per priced item with its best drop chance
const DROPPERS={};MOBS.forEach(m=>(m.drops||[]).forEach(([id,ch])=>{const d=DROPPERS[id];if(!m.boss&&(!d||ch>d.ch))DROPPERS[id]={m,ch}}));
function renderPrices(){
  const f=document.activeElement;if(f&&f.tagName==="INPUT"&&$("priceTable").tBodies[0].contains(f))return;// don't rebuild the box you're typing in (a focused Remove button is fine)
  const ids=Object.keys(state.prices).sort((a,b)=>itemName(a).localeCompare(itemName(b)));
  const rows=tableRows("priceTable",ids.map(id=>({id,pl:state.prices[id]||null,npc:state.npcPrices[id]??NPCSELL[id]??null,d:DROPPERS[id]})));
  $("priceTable").querySelector("tbody").innerHTML=rows.map(({id,d})=>`<tr><td class="name">${esc(itemName(id))} <span class="note">#${esc(id)}</span></td><td><input type="number" min="0" step="100" data-price="${esc(id)}" value="${state.prices[id]||""}" placeholder="zeny" style="width:120px"></td><td><input type="number" min="0" step="1" data-npc="${esc(id)}" value="${state.npcPrices[id]??""}" placeholder="${NPCSELL[id]!=null?fmtN(NPCSELL[id])+" (NPC)":"0"}" title="${NPCSELL[id]!=null?`NPC price ${fmtN(NPCSELL[id])} z; type to override`:"no NPC price known; counts as 0"}" style="width:130px"></td><td class="name">${d?`${esc(d.m.name)} <span class="note">${d.ch}%</span>`:"–"}</td><td><button type="button" class="small" data-unprice="${esc(id)}">Remove</button></td></tr>`).join("")
    ||`<tr><td colspan="5" class="name muted">${ids.length?"No prices match these filters.":"No market prices yet. Add an item above, or click a drop in the Monsters list."}</td></tr>`;
}
// ---- render: Monster info and Item info ----
const GROUP_NAME=Object.fromEntries(LOOT_GROUPS);
const groupOf=id=>ITEMTYPE[id]||"e";
const yourCh=(m,ch)=>ch==null?null:+Math.min(100,ch*dropMul()*penMul(m)).toFixed(2);
// Compare sessions, Monster info, Item info, Market and the two Hunter tables: click a header (th data-sk) to sort, type in the row under it (data-tf) to filter, with the Monsters table's filters.
// Each column reads a row as a number (n: sorting, <, >, ranges) and/or as text (t: text filters, and sorting when there's no n); asc: a number column whose first click sorts low to high; def is the starting sort
const mapTxt=mp=>`${mapCode(mp)} ${mapName(mp)}${isClosed(mp)?" closed":""}`;
const TABLES={
  mobInfoDrops:{def:["z",-1],cols:{name:{t:r=>itemName(r.id)+" #"+r.id},group:{t:r=>GROUP_NAME[groupOf(r.id)]+(looted(r.id)?"":" not looted")},ch:{n:r=>r.ch},your:{n:r=>r.your},npc:{n:r=>r.npc},pl:{n:r=>r.pl},z:{n:r=>r.z}}},
  mobInfoMaps:{def:["n",-1],cols:{map:{t:r=>mapTxt(r.mp)},n:{n:r=>r.n},others:{t:r=>r.others.map(x=>x.m.name).join(", ")}}},
  itemTable:{def:["npc",-1],cols:{name:{t:r=>itemName(r.id)+" #"+r.id},group:{t:r=>GROUP_NAME[groupOf(r.id)]+(looted(r.id)?"":" not looted")},npc:{n:r=>r.npc},pl:{n:r=>r.pl},best:{n:r=>r.b.ch,t:r=>r.b.m.name},nz:{n:r=>r.nz},sp:{n:r=>r.sp?r.sp.n:null,t:r=>r.sp?`${mapTxt(r.sp.mp)} ${r.sp.m.name}`:""},cnt:{n:r=>r.cnt}}},
  itemDropTable:{def:["ch",-1],cols:{name:{t:r=>r.m.name+bossTag(r.m)},lv:{n:r=>r.m.lv},ch:{n:r=>r.ch},your:{n:r=>r.your},nz:{n:r=>r.nz},z:{n:r=>r.z},sp:{n:r=>r.om.length?r.om[0][1]:null},map:{t:r=>r.om.length?mapTxt(r.om[0][0]):""}}},
  bestTable:{def:["epm",-1],cols:{rank:{n:r=>r.rank,asc:1},mp:{t:r=>mapTxt(r.mp)},main:{t:r=>MAPMOBS[r.mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).map(x=>x.m.name).join(", ")},epm:{n:r=>r.epm},secT:{n:r=>r.secT,asc:1},epk:{n:r=>r.epk},zph:{n:r=>r.zb},heal:{n:r=>r.heal,asc:1},net:{n:r=>r.net},hpm:{n:r=>r.hpm,asc:1},skip:{n:r=>r.skip,asc:1},N:{n:r=>r.N},proj:{n:r=>r.proj}}},
  huntTable:{def:["net",-1],cols:{wk:{n:r=>r.wk,asc:1},wph:{n:r=>r.wph,asc:1},rank:{n:r=>r.rank,asc:1},name:{t:r=>r.mp?mapTxt(r.mp):`${r.m.name} Lv ${r.m.lv}`},from:{t:r=>r.mp?r.earn.map(x=>x.m.name).join(", "):[mapTxt(openMaps(r.m)[0][0]),...(r.m.drops||[]).map(([id])=>itemName(id))].join(", ")},net:{n:r=>r.net},loot:{n:r=>r.loot},cost:{n:r=>r.cost,asc:1},kph:{n:r=>r.kph},zk:{n:r=>r.zk},epm:{n:r=>r.epm},hpm:{n:r=>r.hpm,asc:1}}},
  cmpTable:{def:["when",-1],cols:{name:{t:r=>r.s.name},job:{t:r=>r.s.job||""},mobs:{t:r=>[...r.ms.map(m=>m.name),sessMap(r.s)?mapTxt(sessMap(r.s)):""].join(", ")},when:{n:r=>r.st.es[0].t,t:r=>`${fmtD(r.st.es[0].t)} ${fmtT(r.st.es[0].t)}`},
    len:{n:r=>r.st.spanMin},pct:{n:r=>r.st.avgPct,t:r=>`B${r.st.last.lv}`},epm:{n:r=>r.st.avgRaw/60},kph:{n:r=>r.kph},spk:{n:r=>r.kph?3600/r.kph:null,asc:1}}},
  recTable:{def:["per",1],cols:{name:{t:r=>r.name},kind:{t:r=>r.kind.toUpperCase()},avg:{n:r=>r.avg},price:{n:r=>r.price},per:{n:r=>r.per,asc:1},perW:{n:r=>r.perW},uph:{n:r=>r.uph,asc:1},zph:{n:r=>r.zph,asc:1},wph:{n:r=>r.wph,asc:1}}},
  priceTable:{def:["name",1],cols:{name:{t:r=>itemName(r.id)+" #"+r.id},pl:{n:r=>r.pl},npc:{n:r=>r.npc},best:{n:r=>r.d?r.d.ch:null,t:r=>r.d?r.d.m.name:""}}},
};
const tblSort=id=>{const s=state.tsort[id];return s&&Object.hasOwn(TABLES[id].cols,s[0])?s:TABLES[id].def};
const filterRows=(id,rows)=>{const T=TABLES[id],F=state.tfilt[id]||{};
  return rows.filter(r=>Object.entries(F).every(([k,v])=>{const c=Object.hasOwn(T.cols,k)&&T.cols[k];return !v||!c||matchF(v,c.n?c.n(r):null,c.t?c.t(r):null)}))};
const tableRows=(id,rows)=>sortRows(id,filterRows(id,rows));
function sortRows(id,rows){
  const [k,d]=tblSort(id),c=TABLES[id].cols[k];
  const val=r=>{const v=c.n?c.n(r):c.t(r).toLowerCase();return v==null||v===""||(typeof v==="number"&&!isFinite(v))?null:v};
  rows.sort((a,b)=>{const x=val(a),y=val(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x>y?1:x<y?-1:0)*d});
  ROOTQ(`#${id} th[data-sk]`).forEach(th=>th.classList.toggle("on",th.dataset.sk===k));
  return rows;
}
const infoMob=()=>MOBS.find(m=>m.id===state.infoMobId)||calcMob()||MOBS.find(m=>m.id===1002);
function renderMobInfo(){
  const m=infoMob();if(!m)return;
  if(document.activeElement!==$("mobInfoInput"))$("mobInfoInput").value=m.name;
  $("mobInfoDb").href=dbUrl(m);
  const r=mobRow(m,walkSec());
  $("mobInfoTiles").innerHTML=`<div class="tile now"><div class="k">${esc(m.name)} · Lv ${m.lv}</div><div class="v mono">${fmtN(m.hp)} HP</div><div class="s">${m.el?`${m.el} ${m.elv}`:"element –"} · ${m.size||"size –"} · ${m.race||"race –"}${m.mini?" · mini boss":""}${m.boss?" · Boss class":""}${m.agg?" · aggressive":""}</div></div>
   <div class="tile"><div class="k">EXP</div><div class="v mono">${fmtExp(m)}</div><div class="s">${m.expUnknown?"no EXP data for it yet":`job ${fmtN(m.job)} · you get ${fmtN(killExp(m))} / ${fmtN(killJobExp(m))} job a kill`}</div></div>
   <div class="tile"><div class="k">Stats</div><div class="v mono">DEF ${m.def??"–"} · MDEF ${m.mdef??"–"}</div><div class="s">ATK ${m.atkMin??"–"}–${m.atkMax??"–"} · VIT ${m.vit??"–"} · INT ${m.int??"–"}${m.hit100?` · 100% hit at ${m.hit100} HIT`:""}${m.flee95?` · 95% flee at ${m.flee95} FLEE`:""}</div></div>
   <div class="tile"><div class="k">You vs it (${esc(state.job)})</div><div class="v mono">${isFinite(r.sec)?r.sec.toFixed(1)+"s / kill":"can't hurt"}</div><div class="s">your hit ${Math.round(r.mult)}%${elTag(r.el2)} · ${Math.round(r.hitc)}% land · you dodge ${r.dodge??"–"}%${r.hpm==null?"":` · HP lost ~${fmtN(r.hpm)}/min`}</div></div>
   <div class="tile"><div class="k">EXP / min</div><div class="v mono">${m.expUnknown?"?":r.epm?fmtN(r.epm):"–"}</div><div class="s">${m.expUnknown?"":`job ${r.jpm?fmtN(r.jpm):"–"} / min · `}fight + ${walkSec().toFixed(1)}s walking per kill</div></div>
   <div class="tile"><div class="k">Zeny / kill</div><div class="v mono">${hasLoot(m)?fmtN(r.zk):"–"}</div><div class="s">${m.drops.length&&m.drops.every(([,ch])=>ch==null)?"no published drop rates yet · ":""}${penNote(m)||"no drop level penalty"}${num(state.dropBonus)?` · drop rate +${num(state.dropBonus)}%`:""}</div></div>`;
  const drops=(m.drops||[]).map(([id,ch])=>({id,ch,your:yourCh(m,ch),npc:NPCSELL[id]==null?null:npcPays(id),pl:state.prices[id]>0?state.prices[id]:null,z:looted(id)?dropZ(m,id,ch):0})).sort((a,b)=>b.ch-a.ch);
  $("mobInfoDrops").tBodies[0].innerHTML=tableRows("mobInfoDrops",drops).map(d=>`<tr class="${looted(d.id)?"":"muted"}"><td class="name"><a href="#" data-pitem="${esc(d.id)}" title="click to set a market price">${esc(itemName(d.id))}</a> <span class="note">#${esc(d.id)}</span></td><td class="name">${GROUP_NAME[groupOf(d.id)]}${looted(d.id)?"":" (not looted)"}</td><td>${chTxt(d.ch)}</td><td>${chTxt(d.your)}</td><td>${d.npc==null?"–":fmtN(d.npc)}</td><td>${d.pl==null?"–":fmtN(d.pl)}</td><td>${looted(d.id)?dropZTxt(d.z):"0"}</td></tr>`).join("")
    ||`<tr><td colspan="7" class="name muted">${drops.length?"No drops match these filters.":"No known drops."}</td></tr>`;
  const maps=(SPAWN[m.id]||[]).map(([mp,n])=>({mp,n,others:(MAPMOBS[mp]||[]).filter(x=>x.m.id!==m.id).sort((a,b)=>b.n-a.n)}));
  $("mobInfoMaps").tBodies[0].innerHTML=tableRows("mobInfoMaps",maps).map(({mp,n,others})=>`<tr data-map="${esc(mp)}"><td class="name"><b class="mono">${mapCode(mp)}</b> <span class="note">${esc(mapName(mp))}</span>${isClosed(mp)?' <span class="pill down">closed</span>':""}</td><td>≈${n}</td><td class="name">${others.slice(0,5).map(x=>`${esc(x.m.name)} <span class="note">×${x.n}</span>`).join(", ")||"–"}</td></tr>`).join("")
    ||`<tr><td colspan="3" class="name muted">${maps.length?"No maps match these filters.":"No spawns known."}</td></tr>`;
}
// every monster that drops each item, best chance first
const ITEM_DROPS={};MOBS.forEach(m=>(m.drops||[]).forEach(([id,ch])=>(ITEM_DROPS[id]=ITEM_DROPS[id]||[]).push({m,ch})));
Object.values(ITEM_DROPS).forEach(l=>l.sort((a,b)=>b.ch-a.ch));
// what an NPC pays for one drop, times your chance of it a kill: null with no NPC price or no published rate
const npcZ=(m,id,ch)=>{const y=yourCh(m,ch);return y==null||(NPCSELL[id]==null&&state.npcPrices[id]==null)?null:npcPays(id)*y/100};
// the most NPC zeny a kill of any monster that drops it gives
const bestNpcZ=id=>ITEM_DROPS[id].reduce((b,{m,ch})=>{const z=npcZ(m,id,ch);return z!=null&&(b==null||z>b)?z:b},null);
// the most of one monster that drops it on one open map, bosses left out: {n, mp, m} or null
const mostSpawns=id=>ITEM_DROPS[id].reduce((b,{m})=>{const om=!m.boss&&openMaps(m)[0];return om&&(!b||om[1]>b.n)?{n:om[1],mp:om[0],m}:b},null);
function renderItems(){
  const q=$("itemSearch").value.trim().toLowerCase(),g=$("itemGroup").value;
  const ids=Object.keys(ITEM_DROPS).filter(id=>(!g||groupOf(id)===g)&&(!q||itemName(id).toLowerCase().includes(q)||("#"+id).includes(q))).sort((a,b)=>itemName(a).localeCompare(itemName(b)));
  const hit=tableRows("itemTable",ids.map(id=>({id,b:ITEM_DROPS[id][0],npc:NPCSELL[id]==null?null:npcPays(id),pl:state.prices[id]>0?state.prices[id]:null,nz:bestNpcZ(id),sp:mostSpawns(id),cnt:ITEM_DROPS[id].length})));
  const sel=state.infoItem&&ITEM_DROPS[state.infoItem]?String(state.infoItem):null;
  $("itemTable").tBodies[0].innerHTML=hit.slice(0,300).map(({id,b,npc,pl,nz,sp,cnt})=>`<tr data-item="${esc(id)}" class="${id===sel?"sel":""}"><td class="name">${esc(itemName(id))} <span class="note">#${esc(id)}</span></td><td class="name">${GROUP_NAME[groupOf(id)]}${looted(id)?"":' <span class="note">not looted</span>'}</td><td>${npc==null?"–":fmtN(npc)}</td><td>${pl!=null?fmtN(pl):`<a href="#" data-pitem="${esc(id)}">set</a>`}</td><td class="name">${esc(b.m.name)} <span class="note">${chTxt(b.ch)}</span></td><td>${nz==null?"–":dropZTxt(nz)}</td><td class="name" title="${sp?esc(`${sp.m.name} on ${mapLabel(sp.mp)}`):""}">${sp?`≈${sp.n} <span class="note">${esc(sp.m.name)} · ${mapCode(sp.mp)}</span>`:'<span class="note">none open</span>'}</td><td>${cnt}</td></tr>`).join("")
    +(hit.length>300?`<tr><td colspan="8" class="name muted">${hit.length-300} more: narrow the search</td></tr>`:"")
    ||'<tr><td colspan="8" class="name muted">No items match.</td></tr>';
  $("itemDroppers").hidden=!sel;
  if(!sel){$("itemTiles").innerHTML='<div class="note">Click an item to see every monster that drops it.</div>';$("itemDropTable").tBodies[0].innerHTML="";return}
  const ds=ITEM_DROPS[sel],open=ds.filter(d=>!d.m.boss&&openMaps(d.m).length);
  $("itemTiles").innerHTML=`<div class="tile now"><div class="k">${esc(itemName(sel))} · #${esc(sel)}</div><div class="v mono">${NPCSELL[sel]==null&&state.npcPrices[sel]==null?"–":fmtN(npcPays(sel))+" z"}</div><div class="s">NPC pays${skRate("overcharge")?` with Overcharge +${skRate("overcharge")}%`:""}${state.npcPrices[sel]!=null?" (your price)":NPCSELL[sel]==null?" (no NPC price)":""} · ${GROUP_NAME[groupOf(sel)]}${looted(sel)?"":" · not auto looted"}</div></div>
   <div class="tile"><div class="k">Players pay</div><div class="v mono">${state.prices[sel]>0?fmtN(state.prices[sel])+" z":"–"}</div><div class="s"><a href="#" data-pitem="${esc(sel)}">${state.prices[sel]>0?"change":"set"} on the Market tab</a></div></div>
   <div class="tile"><div class="k">Best open source</div><div class="v mono">${open.length?esc(open[0].m.name):"–"}</div><div class="s">${open.length?`${chTxt(open[0].ch)} · Lv ${open[0].m.lv} · ${esc(mapLabel(openMaps(open[0].m)[0][0]))}`:"no monster on an open map drops it"}</div></div>`;
  const drs=tableRows("itemDropTable",ds.map(({m,ch})=>({m,ch,your:yourCh(m,ch),nz:npcZ(m,sel,ch),z:dropZ(m,sel,ch),om:openMaps(m)})));
  $("itemDropTable").tBodies[0].innerHTML=drs.map(({m,ch,your,nz,z,om})=>`<tr data-id="${m.id}"><td class="name">${esc(m.name)}${BOSS_PILL(m)}</td><td>${m.lv}</td><td>${chTxt(ch)}</td><td>${chTxt(your)}</td><td>${nz==null?"–":dropZTxt(nz)}</td><td>${dropZTxt(z)}</td><td>${om.length?"≈"+om[0][1]:"–"}</td><td class="name">${om.length?`<span class="mono">${mapCode(om[0][0])}</span> <span class="note">${esc(mapName(om[0][0]))}</span>`:'<span class="note">none open</span>'}</td></tr>`).join("")
    ||'<tr><td colspan="8" class="name muted">No monsters match these filters.</td></tr>';
}
// Weight / hr's tooltip: how long until you reach your sell point, and the loot zeny each weight point brings
const huntWTip=r=>{const room=wOn()?wRoom(sellLim()):0,z=r.wk>0?`${fmtN(r.zk/r.wk)} z of loot per weight`:"its drops weigh nothing";
  return !(r.wph>0)?z:!wOn()?`${z}\nType your Max Weight to see when you fill up`:`${z}\nfills your ${fmtN(room)} weight of room to ${fmtP(sellPct())}% in ~${fmtDur(room/r.wph).split("\n").pop().replace("~","")}`};
// the level filter for the basis line: " · hunting Lv 40–60, skipping drop-penalty monsters", or "" when it's off
const huntLvTxt=()=>{const a=state.huntMinLv,b=state.huntMaxLv,p=[a!=null&&b!=null?`Lv ${a}–${b}`:a!=null?`Lv ${a}+`:b!=null?`Lv ${b} and below`:"",state.huntNoPen?"skipping drop-penalty monsters":""].filter(Boolean);
  return p.length?` · hunting ${p.join(", ")}`:""};
function renderHunt(){
  const mode=state.huntMode==="mobs"?"mobs":"maps",lim=num($("huntN").value,10),min=num($("huntMin").value),w=walkSec();
  ROOTQ("[data-hunt]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.hunt===mode)));$("huntAutoWrap").hidden=mode!=="maps";$("huntAuto").checked=state.huntAuto;
  ROOTQ("[data-loot]").forEach(i=>i.checked=looted0(i.dataset.loot));$("huntMinWrap").firstChild.textContent=mode==="maps"?"Min monsters on map":"Min spawns on its map";
  const rows=mode==="maps"?Object.keys(MAPMOBS).filter(mp=>!isClosed(mp)).map(mp=>huntMap(mp,w,min)).filter(r=>r&&r.N>=min)
    :MOBS.filter(m=>!m.boss&&!isSkipped(m)&&huntLvOk(m)&&hasLoot(m)&&openMaps(m).length&&openMaps(m)[0][1]>=min).map(m=>huntMob(m,w)).filter(Boolean);
  // rank everything by net zeny / hr, then filter, keep the top N and sort by the picked column
  rows.sort((a,b)=>b.net-a.net);rows.forEach((r,i)=>r.rank=i+1);
  const shown=sortRows("huntTable",filterRows("huntTable",rows).slice(0,lim));
  $("huntBasis").textContent=`${state.job} · ${C().a.name||"attack"} · ${convOn()?convLabel("by zeny"):atkEl()} · walking ~${w.toFixed(1)}s/kill`+(num(state.dropBonus)?` · drop rate +${num(state.dropBonus)}%`:"")+(num(C().baseLv)>39?` · drops −50% from monsters Lv ${num(C().baseLv)-40} and below`:"")+huntLvTxt();
  const top=[...shown].sort((a,b)=>b.net-a.net)[0];
  $("huntTiles").innerHTML=top?`<div class="tile now"><div class="k">Best ${mode==="maps"?"map":"monster"} for zeny</div><div class="v mono">${mode==="maps"?mapCode(top.mp):esc(top.m.name)}</div><div class="s">${fmtN(top.net)} z/hr net${top.el2&&convOn()?` · bring ${top.el2} converters`:""}${mode==="maps"?` · ${esc(mapName(top.mp))}`:` · on ${esc(mapLabel(openMaps(top.m)[0][0]))}`}</div></div>
   <div class="tile"><div class="k">Per hour</div><div class="v mono">${fmtN(top.kph)} kills</div><div class="s">${fmtN(top.loot)} z loot · ${fmtN(top.zk)} z/kill · ${fmtQty(top.wph)} weight${(()=>{const p=(top.m?[top.m]:top.earn.map(x=>x.m)).filter(m=>penNote(m));return p.length?` · ${esc(p.length===1?`${p[0].name}: ${penNote(p[0])}`:`level penalty on ${p.map(m=>m.name).join(", ")}`)}`:""})()}</div></div>
   <div class="tile"><div class="k">Costs / hr</div><div class="v mono">${fmtN(top.cost)}</div><div class="s">HP items ${fmtN(top.hpZ)} z, SP items ${fmtN(top.spZ)} z${top.other>=0.5?`, ASPD potion${fieldBuffs().length?", ground buffs":""} ${fmtN(top.other)} z`:""}${useZeny()||supItemsKill().length?" (skill items and zeny are taken off each kill)":""}</div></div>`:"";
  const sel=currentMap(),selMob=(calcMob()||{}).id;
  $("huntTable").querySelector("tbody").innerHTML=shown.map(r=>{
    const name=r.mp?`<b class="mono">${mapCode(r.mp)}</b> <span class="note">${esc(mapName(r.mp))}</span>${r.mp===sel?' <span class="pill">current</span>':""}`:`<b title="${esc(dropNames(r.m))}">${esc(r.m.name)}</b>${BOSS_PILL(r.m)} <span class="note">Lv ${r.m.lv}</span>`;
    const from=r.mp?huntPicker(r,w)+(r.skip?`<div class="note" title="${esc(r.skipNames.join(", "))}">can't hurt ${r.skip}</div>`:"")
      :(()=>{const om=openMaps(r.m);return `<div><span class="mono">${mapCode(om[0][0])}</span> <span class="note">≈${om[0][1]}${penNote(r.m)?` · ${esc(penNote(r.m))}`:""}</span></div>${dropList(r.m)}`})();
    return `<tr ${r.mp?`data-map="${r.mp}"`:`data-id="${r.m.id}"`} class="${(r.mp&&r.mp===sel)||(r.m&&r.m.id===selMob)?"sel":""}"><td>${r.rank}</td><td class="name">${name}${elTag(r.el2)}</td><td class="name mainmobs">${from}</td><td class="${r.net>0?"good":"bad"}"><b>${fmtN(r.net)}</b></td><td>${fmtN(r.loot)}</td><td title="${esc(costTip(r))}">${r.cost>0?fmtN(r.cost):"–"}</td><td>${fmtN(r.kph)}</td><td>${fmtN(r.zk)}</td><td>${fmtQty(r.wk)}</td><td title="${esc(huntWTip(r))}">${fmtQty(r.wph)}</td><td>${r.epm==null?"?":fmtN(r.epm)}</td><td>${r.hpm==null?"–":fmtN(r.hpm)}</td></tr>`}).join("")
    ||`<tr><td colspan="12" class="name muted">${mode==="maps"?"No open maps match.":"No open monsters you can hurt."}${huntLvTxt()?" Try widening the level filter.":""}</td></tr>`;
}
const syncClosed=()=>{$("closedMaps").value=state.closed.join(", ");
  $("regions").innerHTML=REGIONS.map(r=>{const c=state.regions[r.id]!==false;return `<button type="button" class="map ${c?"off":""}" data-region="${r.id}" title="${c?"Closed. Click to mark open":"Open. Click to mark closed"}"><b>${c?"✕":"✓"} ${r.name}</b><span>${r.when}</span></button>`}).join("")};
// converters / Spell Fist bolts against every monster on the map: the element-table rate of each option, the map's EXP/min with it,
// and what the picked one can't hurt or is resisted by
function convCheck(mp,w,r){const sf=C().a.type==="spellfist",opts=sf?elOptions().filter(Boolean):convOn()?convAll():[];if(opts.length<2)return "";const tag=!sf&&convFixed()?"in use":"best";
  const mobs=MAPMOBS[mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).sort((a,b)=>b.n-a.n);if(!mobs.length)return "";
  const rows=opts.map(el=>{const s=withEl(el,()=>mapStats0(mp,w));return `<tr class="${r&&el===r.el2?"sel":""}"><td class="name"><span class="el ${el}">${el}</span>${!sf&&el===C().wElem?' <span class="note">weapon</span>':""}${r&&el===r.el2?` <span class="pill">${tag}</span>`:""}</td>
    ${mobs.map(x=>{const v=elemMult(x.m,el);return `<td class="${elRateCls(v)}">${elRateTxt(v)}</td>`}).join("")}<td>${s?fmtN(s.epm):"–"}${s&&s.skip?` <span class="warnc">skips ${esc(s.skipNames.join(", "))}</span>`:""}</td></tr>`}).join("");
  const el=r&&r.el2,bad=el?mobs.filter(x=>elemMult(x.m,el)<100):[];
  const warn=bad.length?`<div class="warnc">With ${el}: ${bad.map(x=>{const v=elemMult(x.m,el);return `${esc(x.m.name)} (${x.m.el} ${x.m.elv}) ${v}%`}).join(" · ")}</div>`:"";
  return `<div class="note" style="margin-top:8px"><b>${sf?"Spell Fist bolts":"Converters"} vs these monsters</b> · element table rate (Reference tab): <span class="good">above 100%</span>, <span class="warnc">below</span>, <span class="bad">0% ✕ none</span>${sf||isMagicAtk()?"":"; it applies to your weapon ATK, status ATK always hits as Neutral"}</div>
  <div class="scroll"><table class="convtab"><thead><tr><th>${sf?"Bolt":"Converter"}</th>${mobs.map(x=>`<th>${esc(x.m.name)}<br><span class="el ${x.m.el||"Neutral"}">${x.m.el||"Neutral"} ${x.m.elv||1}</span></th>`).join("")}<th>EXP / min</th></tr></thead><tbody>${rows}</tbody></table></div>${warn}`}
function renderMap(){
  let mp=mapKey(state.map);const mob=calcMob();
  if(!mp&&mob){const om=openMaps(mob);if(om.length)mp=om[0][0]}
  $("mapInput").value=mp?mapCode(mp):"";$("mapName").textContent=mapName(mp);
  if(!MAPMOBS[mp]){$("mapTiles").innerHTML='<div class="note">Pick a map to see how this job does there.</div>';$("mapTable").querySelector("tbody").innerHTML="";return}
  const w=walkSec(),r=mapStats(mp,w);const L=lvExp(num(C().baseLv));const st=stats(cur());const L2=st?st.L:L;
  $("mapTiles").innerHTML=r?`<div class="tile now"><div class="k">Average EXP / min</div><div class="v mono">${fmtN(r.epm)}</div><div class="s">weighted by spawn counts${r.el2&&convOn()?` · bring ${r.el2} converters`:""}${r.skip?` · skips ${r.skip} you can't hurt`:""}${r.unk?` · leaves out ${esc(r.unkNames.join(", "))} (EXP unknown)`:""}</div></div>
   <div class="tile"><div class="k">Kills / hr</div><div class="v mono">${fmtN(3600/r.secT)}</div><div class="s">${r.sec.toFixed(1)}s fight + ${r.walk.toFixed(1)}s walk${sellTxt(r.sell," + "," selling")}</div></div>
   <div class="tile"><div class="k">EXP / hr</div><div class="v mono">${L2?pct(r.epm*60/L2*100):fmtN(r.epm*60)}</div><div class="s">${L2?`1 level in ${fmtDur(L2/(r.epm*60))}`:"set Base level 1–70 for %"}</div></div>
   <div class="tile"><div class="k">Zeny / hr</div><div class="v mono">${fmtN(r.zph)}</div><div class="s">net${r.zcost>=0.5?` of ~${fmtN(r.zcost)} z SP items, potions &amp; skill items`:""}${r.hpm==null?"":` · HP lost ~${fmtN(r.hpm)}/min`}</div></div>${isClosed(mp)?'<div class="note bad">This map is marked as not open yet.</div>':""}`
   :MAPMOBS[mp].every(x=>x.m.boss||x.m.expUnknown||isSkipped(x.m))?'<div class="note bad">No EXP data yet for the monsters here.</div>':'<div class="note bad">Your attack can\'t hurt anything here.</div>';
  $("mapConv").innerHTML=convCheck(mp,w,r);
  const tot=MAPMOBS[mp].filter(x=>!x.m.boss&&!isSkipped(x.m)).reduce((a,x)=>a+x.n,0)||1;
  $("mapTable").querySelector("tbody").innerHTML=MAPMOBS[mp].slice().sort((a,b)=>b.n-a.n).map(({m,n})=>{const x=r&&r.el2?withEl(r.el2,()=>mobRow0(m,w)):mobRow(m,w);
    return `<tr data-id="${m.id}" class="${cur().mobIds.includes(m.id)?"sel":""}" style="${isSkipped(m)?"opacity:.55":""}"><td class="name">${esc(m.name)} <button type="button" class="small" data-sessmob="${m.id}">${cur().mobIds.includes(m.id)?"− Session":"+ Session"}</button>${BOSS_PILL(m)}${m.boss?"":` <button type="button" class="small" data-skip="${m.id}">${isSkipped(m)?"Unskip":"Skip"}</button>`}</td><td>≈${n}</td><td>${m.boss?"–":isSkipped(m)?"skipped":Math.round(n/tot*100)+"%"}</td><td>${m.lv}</td><td>${m.el?`<span class="el ${m.el}">${m.el} ${m.elv}</span>`:"–"}</td><td>${(el=>elRateHtml(el,elemMult(m,el)))((r&&r.el2)||x.el2||atkEl())}</td><td>${m.size||"–"}</td><td class="${x.mult>100?"good":x.mult<=0?"bad":""}">${x.mult<=0?"can't hurt":Math.round(x.mult)+"%"}</td><td>${isFinite(x.sec)?x.sec.toFixed(1)+"s":"–"}</td><td>${fmtExp(m)}</td></tr>`}).join("");
}
function renderAll(){SKFX=skillEffects(C());const sgTree=sageFromTree(C());ROOTQ('[data-sg="sfLv"],[data-sg="boltLv"],[data-sg="hsLv"],[data-sg="dbLv"]').forEach(i=>{i.disabled=sgTree;i.title=sgTree?"Set by the Skills card":""});ROOTQ("[data-sgbolt]").forEach(i=>i.disabled=sgTree&&!skLv(C(),SG_BOLT[i.dataset.sgbolt]));applyBuild();applyConsumables();renderBuild();applyHsAuto();renderSessions();renderChar();renderTracker();renderMobs();renderBest();renderRecovery();if(state.tab==="maps")renderHunt();if(state.tab==="market")renderPrices();if(state.tab==="mobinfo")renderMobInfo();if(state.tab==="items")renderItems();renderMap();renderRef()}

