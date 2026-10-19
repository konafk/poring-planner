// ---- Equipment and Cards tabs: every item in data/equipment.js and data/cards.js, filtered and sorted, with an Equip button that
// asks which gear set (your gear or one of the other gear sets, build.js / build-ui.js) it goes in, and for a card which item and card slot ----
// what a bonus line's type reads as; a type ending in _percent shows a %
const FX_LABEL={str:"STR",agi:"AGI",vit:"VIT",int:"INT",dex:"DEX",luk:"LUK",all_stats:"All stats",atk:"ATK",matk:"MATK",hit:"HIT",flee:"FLEE",crit:"CRIT",
  perfect_dodge:"Perfect Dodge",perfect_hit:"Perfect HIT",def:"DEF",mdef:"MDEF",hp:"MaxHP",sp:"MaxSP",aspd:"ASPD",aspd_mod:"ASPD",atk_percent:"ATK",matk_percent:"MATK",
  hp_percent:"MaxHP",sp_percent:"MaxSP",aspd_percent:"ASPD",crit_damage_percent:"Critical damage",cast_time_variable_percent:"Variable cast time",
  cast_time_fixed_percent:"Fixed cast time",after_cast_delay_percent:"After-cast delay",attack_delay_percent:"After-attack delay",damage_percent:"Physical damage",
  physical_damage_percent:"Physical damage",magic_damage_percent:"Magic damage",ranged_damage_percent:"Ranged physical damage",melee_damage_percent:"Melee physical damage",
  skill_damage_percent:"Skill damage",damage_taken_percent:"Damage taken",magic_damage_taken_percent:"Magic damage taken",resistance_percent:"Resistance",
  exp_percent:"EXP",heal_amount_percent:"Heal power",item_heal_percent:"Recovery from items",heal_received_percent:"Heal received",sp_recovery_percent:"SP recovery",
  hp_recovery_percent:"HP recovery",sp_cost_percent:"SP cost",ignore_def_percent:"Ignore DEF",ignore_mdef_percent:"Ignore MDEF",sp_per_hit:"SP per hit",hp_per_hit:"HP per hit"};
const fxCap=s=>String(s||"").split("_").map(w=>w&&w[0].toUpperCase()+w.slice(1)).join(" ").replace("Demi Human","Demi-Human");
// one bonus line [type, target kind, target, value, per N refines, skill, scaling skill] -> "Physical damage vs Demon +10%"
function fxLine([t,kind,target,v,per,skill,scale]){
  if(t==="weapon_element")return `Weapon element ${fxCap(target)}`;
  const pct=/_percent$/.test(t),stat=pct&&BUILD.STAT6.includes(t.slice(0,-8))?t.slice(0,-8).toUpperCase():null,T=fxCap(target);
  let l=stat||FX_LABEL[t]||fxCap(t.replace(/_percent$/,""));
  if(kind==="element"&&t==="magic_damage_percent")l=`${T} magic damage`;
  else if(kind==="status")l=`Resistance to ${T}`;
  else if(kind==="monster_kind")l+=target==="boss"?" vs Boss":" vs normal monsters";
  else if(kind&&(t==="damage_taken_percent"||t==="magic_damage_taken_percent"))l+=` from ${T}`;
  else if(kind)l+=` vs ${T}${kind==="size"?" size":""}`;
  if(skill)l=`${skill}: ${l}`;
  return `${l} ${+v>0?"+":""}${v}${pct||stat?"%":""}${per?` per${+per>1?` ${per}`:""} refine${+per>1?"s":""}`:""}${scale?` per ${scale} level`:""}`}
// a bonus group: its condition, then its lines or text
function fxGroup(g){const when=[g.r!=null?`at +${g.r}`:"",g.rs!=null?`combined refine +${g.rs}`:"",g.lv!=null?`base Lv ${g.lv}+`:"",
    g.cls&&g.cls.length?[...new Set(g.cls)].map(fxCap).join(" / "):"",g.lvPer?`per ${g.lvPer} base Lv${g.lvMax?` (to Lv ${g.lvMax})`:""}`:""].filter(Boolean).join(", ");
  const body=(g.b||[]).length?g.b.map(fxLine).join(", "):g.proc||g.text||"";return body?(when?`${when}: `:"")+body:""}
const fxOf=it=>(it&&it.g||[]).map(fxGroup).filter(Boolean);
// the jobs that wear it, as the app names them: "All jobs" when every 1st job does (a 2nd job wears its 1st job's gear)
const DB_JOBS=Object.keys(JOBS);
const wearsJob=(it,job)=>!it.jobs||!it.jobs.length||it.jobs.includes(job.toLowerCase())||!!(FIRST_OF[job]&&it.jobs.includes(FIRST_OF[job].toLowerCase()));
function jobsTxt(it){if(!it.jobs||!it.jobs.length)return "All jobs";const firsts=DB_JOBS.filter(j=>FIRST_OF[j]===undefined&&j!=="Novice");
  if(firsts.every(j=>it.jobs.includes(j.toLowerCase())))return it.jobs.includes("novice")?"All jobs":"All but Novice";
  const ns=DB_JOBS.filter(j=>it.jobs.includes(j.toLowerCase()));return ns.length?ns.join(", "):"Other jobs"}
// what kind of gear it is: the weapon type, or the parts it covers
const PART={head_upper:"Upper",head_middle:"Middle",head_lower:"Lower",armor:"Armor",shield:"Shield",garment:"Garment",footgear:"Shoes",accessory:"Accessory",accessory_1:"Accessory",accessory_2:"Accessory",ammo:"Arrows / ammo"};
function gearKind(it){const s=it.slot||[];if(s.includes("weapon"))return BUILD.WTYPE[it.type]||"Weapon";
  const h=s.filter(x=>x.startsWith("head_"));if(h.length)return `${h.map(x=>PART[x]).join(" / ")} headgear`;
  return [...new Set(s.map(x=>PART[x]||fxCap(x)))].join(" / ")||"–"}
// the Type filter: "" all, "w:" every weapon, "w:<type>", "a:" everything else, "s:<part>"
function typeOk(it,v){if(!v)return true;const s=it.slot||[],[k,x]=v.split(":");
  if(k==="w")return s.includes("weapon")&&(!x||it.type===x);
  if(k==="a")return s.length>0&&!s.includes("weapon")&&(!x||(x==="accessory"?s.some(y=>y.startsWith("accessory")):s.includes(x)));
  return true}
// the Equipment tab's filters (state.eqDb, strings as typed) -> does item it pass
function eqDbOk(it,f,job){const n=k=>f[k]!==""&&f[k]!=null&&isFinite(+f[k])?+f[k]:null,q=String(f.q||"").trim().toLowerCase();
  if(!typeOk(it,f.type))return false;
  if(f.el&&(!(it.slot||[]).includes("weapon")||(it.el||"neutral")!==f.el))return false;
  const j=f.job==="mine"?job:f.job;if(j&&!wearsJob(it,j))return false;
  if(n("lvMin")!=null&&(it.lv||0)<n("lvMin"))return false;if(n("lvMax")!=null&&(it.lv||0)>n("lvMax"))return false;
  if(f.slots==="1+"?!(it.slots>0):f.slots!==""&&f.slots!=null&&(it.slots||0)!==+f.slots)return false;
  for(const k of ["atk","matk","def"])if(n(k)!=null&&(it[k]||0)<n(k))return false;
  if(!fromOk(it.id,f.from))return false;
  return !q||[it.name,"#"+it.id,fxOf(it).join(" "),itemText(it.id),fromTxt(it.id)].some(x=>x.toLowerCase().includes(q))}
// cards: where they go ("head" for any headgear, "accessory" for either hand)
const CARD_PART={weapon:"Weapon",shield:"Shield",head:"Headgear",armor:"Armor",garment:"Garment",footgear:"Shoes",accessory:"Accessory"};
const cardPart=c=>{const s=(c.slot||[])[0]||"";return s.startsWith("head")?"head":s.startsWith("accessory")?"accessory":s};
// an item's in-game text and where to get it (data/iteminfo.js, tools/export_iteminfo.py): t description, d the monsters that drop
// it [[id, name, level, "mvp" | "mini" | "normal", drop %]] best rate first, q the quests that give it
const itemInfo=id=>typeof ITEM_INFO!=="undefined"&&ITEM_INFO[id]||{};
const itemText=id=>itemInfo(id).t||"";
const FROM_TAG={mvp:"MVP",mini:"mini boss"};
const fromTxt=id=>[...(itemInfo(id).d||[]).map(([,n,lv,k,ch])=>`${n} Lv ${lv}${FROM_TAG[k]?` (${FROM_TAG[k]})`:""}${ch!=null?` ${ch}%`:""}`),
  ...(itemInfo(id).q||[]).map(q=>`Quest: ${q}`)].join(", ");
// the Where to get filter: "mvp", "mini", "normal" (a monster of that kind drops it), "quest", "none" (no known source)
const fromOk=(id,v)=>{const x=itemInfo(id),d=x.d||[];return !v||(v==="none"?!d.length&&!(x.q||[]).length:v==="quest"?!!(x.q||[]).length:d.some(r=>r[3]===v))};
// the column: each monster (a link to Monster info when the farm tables know it), its level, MVP / mini boss and drop %, then quests
const MOB_BY_ID=new Map(MOBS.map(m=>[m.id,m]));
const fromHtml=id=>[...(itemInfo(id).d||[]).map(([mid,n,lv,k,ch])=>`${MOB_BY_ID.has(mid)?`<a href="#" data-mob="${mid}">${esc(n)}</a>`:esc(n)} <span class="note">Lv ${lv}${ch!=null?` · ${ch}%`:""}</span>${FROM_TAG[k]?` <span class="pill${k==="mvp"?" mvp":""}">${FROM_TAG[k]}</span>`:""}`),
  ...(itemInfo(id).q||[]).map(q=>`<span class="pill">quest</span> ${esc(q)}`)].join("<br>")||'<span class="muted">no known source</span>';
const FROM_OPTS=`<option value="">Any</option><option value="mvp">MVP drop</option><option value="mini">Mini boss drop</option><option value="normal">Normal monster drop</option><option value="quest">Quest</option><option value="none">No known source</option>`;
function cardDbOk(c,f){const q=String(f.q||"").trim().toLowerCase();if(f.slot&&cardPart(c)!==f.slot)return false;if(!fromOk(c.id,f.from))return false;
  return !q||c.name.toLowerCase().includes(q)||("#"+c.id).includes(q)||cardName(c).toLowerCase().includes(q)||fromTxt(c.id).toLowerCase().includes(q)||itemText(c.id).toLowerCase().includes(q)||fxOf(c).join(" ").toLowerCase().includes(q)}

// ---- putting gear on: set i is your gear (−1) or other gear set i ----
const setAt=(c,i)=>i<0?buildOf(c):altOf(c,i);
const setLabel=i=>i<0?"My gear":`Set ${i+1}`;
const slotLabel=k=>k==="acc1"?"Accessory 1":k==="acc2"?"Accessory 2":(BUILD.SLOTS.find(s=>s.k===k)||{}).label||k;
// where item it can go for job: a list of places, each the gear rows it fills (a multi-slot headgear fills every row it covers;
// an accessory goes in either; an Assassin's dagger, one-handed sword or axe in either hand)
function eqPlaces(it,job){const s=it.slot||[];if(!s.length)return [];
  if(s.includes("weapon"))return job==="Assassin"&&BUILD.DUAL_W.includes(BUILD.WTYPE[it.type])?[["weapon"],["shield"]]:[["weapon"]];
  if(s.some(x=>x.startsWith("accessory")))return [["acc1"],["acc2"]];
  const rows=BUILD.SLOTS.filter(x=>x.takes.some(t=>s.includes(t))).map(x=>x.k);
  return rows.length?rows[0].startsWith("head")?[rows]:[[rows[0]]]:[]}
const placeLabel=(rows,it)=>rows[0]==="shield"&&(it.slot||[]).includes("weapon")?"Left hand":rows[0]==="weapon"&&eqPlaces(it,state.job).length>1?"Right hand":rows.map(slotLabel).join(" + ");
// put item id in set i's rows: the first row's item is remembered as it comes off (gearPut), the other rows take a copy; a multi-slot
// headgear that comes off leaves every row it was in
function eqPut(c,i,rows,id){const s=setAt(c,i);if(!s.gear||typeof s.gear!=="object")s.gear={};
  rows.forEach(k=>{const old=s.gear[k];if(old&&old.id&&k.startsWith("head"))BUILD.SLOTS.forEach(x=>{if(x.k.startsWith("head")&&!rows.includes(x.k)&&s.gear[x.k]&&s.gear[x.k].id===old.id)delete s.gear[x.k]})});
  const g0=s.gear[rows[0]]||(s.gear[rows[0]]={});gearPut(c,g0,id);
  rows.slice(1).forEach(k=>{const g=s.gear[k];if(g&&g.id!==id)memKeep(c,g);s.gear[k]=JSON.parse(JSON.stringify(g0))})}
// every card box card can go in: set, row, box and the card there now (a multi-slot headgear counts once)
function cardTargets(c,card){const out=[];
  for(let i=-1;i<altN(c);i++){const s=i<0?c.build||{}:altOf(c,i),gear=s.gear||{},seen=[];
    BUILD.SLOTS.forEach(x=>{const g=gear[x.k],it=g&&g.id&&BUILD.item(g.id);if(!it||!it.slots||x.k==="ammo"||seen.includes(it.id)&&x.k.startsWith("head"))return;
      if(x.k.startsWith("head"))seen.push(it.id);
      if(!cardChoices(x.k,it).some(y=>y.id===card.id))return;
      for(let j=0;j<it.slots;j++)out.push({set:i,row:x.k,box:j,g,it,cur:(g.cards||[])[j]||null})})}
  return out}
// card id in card box j of set i's row (and in the other rows of that multi-slot headgear)
function cardPut(c,i,row,j,id){const s=setAt(c,i),g=s.gear&&s.gear[row];if(!g||!g.id)return;g.cards=g.cards||[];while(g.cards.length<j)g.cards.push(null);g.cards[j]=id;
  if(row.startsWith("head"))BUILD.SLOTS.forEach(x=>{const h=s.gear[x.k];if(x.k!==row&&x.k.startsWith("head")&&h&&h.id===g.id)h.cards=[...g.cards]})}
// the sets item / card id is in now: ["My gear", "Set 2"]
function wornIn(c,id,card){const b=c.build;if(!b)return [];const has=s=>Object.values(s&&s.gear||{}).some(g=>g&&(card?(g.cards||[]).includes(id):g.id===id));
  return [-1,...Array.from({length:altN(c)},(_,i)=>i)].filter(i=>has(i<0?b:b.alts[i])).map(setLabel)}

// ---- the Equipment tab ----
const EQDB_D={q:"",type:"",el:"",job:"mine",lvMin:"",lvMax:"",slots:"",atk:"",matk:"",def:"",from:""};
const eqDbF=()=>({...EQDB_D,...state.eqDb});
TABLES.equipTable={def:["name",1],cols:{name:{t:r=>r.it.name},id:{n:r=>r.it.id,asc:1},type:{t:r=>gearKind(r.it)},lv:{n:r=>r.it.lv||0},slots:{n:r=>r.it.slots||0},
  atk:{n:r=>r.it.atk||0},matk:{n:r=>r.it.matk||0},def:{n:r=>r.it.def||0},w:{n:r=>r.it.w||0,asc:1},jobs:{t:r=>jobsTxt(r.it)},from:{t:r=>fromTxt(r.it.id)},fx:{t:r=>r.fx.join(" ")}}};
TABLES.cardTable={def:["name",1],cols:{name:{t:r=>r.c.name},id:{n:r=>r.c.id,asc:1},part:{t:r=>CARD_PART[cardPart(r.c)]||"–"},nm:{t:r=>cardName(r.c)},from:{t:r=>fromTxt(r.c.id)},fx:{t:r=>r.fx.join(" ")}}};
const EQ_SORTS=[["name:1","Name A–Z"],["name:-1","Name Z–A"],["lv:-1","Highest Lv"],["lv:1","Lowest Lv"],["atk:-1","Highest ATK"],["matk:-1","Highest MATK"],
  ["def:-1","Highest DEF"],["slots:-1","Most card slots"],["w:1","Lightest"],["id:1","ID"]];
const wornPills=(c,id,card)=>wornIn(c,id,card).map(x=>` <span class="pill up">${x}</span>`).join("");
const eqBtn=(k,id,ok,why)=>`<button type="button" class="small" data-eq${k}="${id}"${ok?"":` disabled title="${esc(why)}"`}>Equip</button>`;
function renderEquipDb(){const c=C(),f=eqDbF(),all=typeof EQUIP!=="undefined"?EQUIP:[];
  ROOTQ("[data-eqf]").forEach(x=>{if(document.activeElement!==x)x.value=f[x.dataset.eqf]??""});
  const mine=$("eqDbJob").querySelector('option[value="mine"]');if(mine)mine.textContent=`Your job (${state.job})`;
  const [k,d]=tblSort("equipTable"),sv=`${k}:${d}`;$("eqDbSort").value=EQ_SORTS.some(x=>x[0]===sv)?sv:"";
  const rows=tableRows("equipTable",all.filter(it=>eqDbOk(it,f,state.job)).map(it=>({it,fx:fxOf(it)})));
  $("eqDbCount").textContent=`${rows.length} of ${all.length} items`;
  $("equipTable").tBodies[0].innerHTML=rows.slice(0,400).map(({it,fx})=>{const pl=eqPlaces(it,state.job),ok=pl.length&&wearsJob(it,state.job);
    return `<tr data-eqrow="${it.id}"><td class="name"><div class="dbName">${iconHtml("gear",it.id)}<div>${eqBtn("item",it.id,ok,!pl.length?"Not something you wear":`A ${state.job} can't wear it`)} ${esc(it.name)} <span class="note">#${it.id}</span>${wornPills(c,it.id)}</div></div></td><td class="name l kind">${esc(gearKind(it))}${it.wlv?` <span class="note">Lv ${it.wlv}</span>`:""}${it.el&&it.el!=="neutral"?` <span class="el ${fxCap(it.el)}">${fxCap(it.el)}</span>`:""}</td>
      <td>${it.lv||"–"}</td><td>${it.slots?`[${it.slots}]`:"–"}</td><td>${it.atk||"–"}</td><td>${it.matk||"–"}</td><td>${it.def||"–"}</td><td>${it.w!=null?it.w:"–"}</td>
      <td class="name l jobs">${esc(jobsTxt(it))}</td><td class="name l from">${fromHtml(it.id)}</td>
      <td class="name fx">${fx.map(esc).join("<br>")||'<span class="muted">–</span>'}${itemText(it.id)?`<details class="desc"><summary>In-game text</summary>${esc(itemText(it.id))}</details>`:""}</td></tr>`}).join("")
    +(rows.length>400?`<tr><td colspan="11" class="name muted">${rows.length-400} more: narrow the filters</td></tr>`:"")
    ||'<tr><td colspan="11" class="name muted">No equipment matches these filters.</td></tr>'}
// ---- the Cards tab ----
const CARDDB_D={q:"",slot:"",from:""};
const cardDbF=()=>({...CARDDB_D,...state.cardDb});
function renderCardDb(){const c=C(),f=cardDbF(),all=typeof CARDS!=="undefined"?CARDS:[];
  ROOTQ("[data-cdf]").forEach(x=>{if(document.activeElement!==x)x.value=f[x.dataset.cdf]??""});
  const rows=tableRows("cardTable",all.filter(x=>cardDbOk(x,f)).map(x=>({c:x,fx:fxOf(x)})));
  $("cardDbCount").textContent=`${rows.length} of ${all.length} cards`;
  $("cardTable").tBodies[0].innerHTML=rows.map(({c:x,fx})=>`<tr data-cdrow="${x.id}"><td class="name"><div class="dbName">${iconHtml("card",x.id)}<div>${eqBtn("card",x.id,!!cardPart(x),"Not a card that goes in gear")} ${esc(x.name)} <span class="note">#${x.id}</span>${wornPills(c,x.id,true)}</div></div></td>
      <td class="name l">${CARD_PART[cardPart(x)]||"–"}</td><td class="name l">${esc(cardName(x))||"–"}</td>
      <td class="name l from">${fromHtml(x.id)}</td><td class="name fx">${itemText(x.id)?esc(itemText(x.id)):fx.map(esc).join("<br>")||'<span class="muted">–</span>'}</td></tr>`).join("")
    ||'<tr><td colspan="5" class="name muted">No cards match these filters.</td></tr>'}

// ---- the Equip dialog: pick the gear set (and the place, or for a card the card slot) ----
let EQ_DLG=null;
const gearNow=g=>g&&g.id?esc(gearTxt(g)):'<span class="muted">empty</span>';
function openEquip(kind,id){const it=BUILD.item(id);if(!it)return;EQ_DLG={kind,id};drawEquip();if(!$("eqDlg").open)$("eqDlg").showModal()}
function drawEquip(){const c=C(),{kind,id}=EQ_DLG,it=BUILD.item(id),sets=[-1,...Array.from({length:altN(c)},(_,i)=>i)];
  $("eqDlgTitle").textContent=`Equip ${it.name}`;$("eqDlgIco").innerHTML=iconHtml(kind==="item"?"gear":"card",id);
  const lv=kind==="item"&&it.lv>num(c.baseLv)?` · needs base Lv ${it.lv} (you're Lv ${num(c.baseLv)})`:"";
  $("eqDlgSub").textContent=(kind==="item"?`${gearKind(it)}${it.slots?` [${it.slots}]`:""}`:`${CARD_PART[cardPart(it)]||""} card`)+lv;
  const mode=c.mode==="build"?"":`<div class="note">This switches the Character tab to <b>Build from gear</b>, so your stats are worked out from your gear. The status window values you typed come back if you switch back.</div>`;
  let body="";
  if(kind==="item"){const pl=eqPlaces(it,state.job);
    if(!pl.length)body=`<div class="note">This isn't something you wear.</div>`;
    else if(!wearsJob(it,state.job))body=`<div class="note bad">A ${esc(state.job)} can't wear it (${esc(jobsTxt(it))}). Pick another job on the Character tab to equip it there.</div>`;
    else body=`<div class="note">Which gear set?</div><div class="eqPicks">${sets.map(i=>{const s=i<0?c.build||{}:altOf(c,i),g=s.gear||{};
        return `<div class="eqSet"><b>${setLabel(i)}</b>${pl.map(rows=>`<button type="button" class="eqPick" data-set="${i}" data-rows="${rows.join(",")}"><span>${pl.length>1||rows.length>1?esc(placeLabel(rows,it))+": ":""}${rows.map(k=>gearNow(g[k])).filter((x,j,a)=>a.indexOf(x)===j).join(" / ")}</span><span class="to">→ ${esc(it.name)}</span></button>`).join("")}</div>`}).join("")}
      ${altN(c)<ALT_MAX?`<div class="eqSet"><b>New set</b><button type="button" class="eqPick" data-new="1"><span>Add Set ${altN(c)+1} with only this on</span><span class="to">→ ${esc(it.name)}</span></button></div>`:""}</div>`}
  else{const ts=cardTargets(c,it),part=CARD_PART[cardPart(it)]||"gear";
    if(!cardPart(it))body=`<div class="note">This card doesn't go in gear.</div>`;
    else body=`<div class="note">Which gear set and card slot?</div><div class="eqPicks">${sets.map(i=>{const t=ts.filter(x=>x.set===i);
        return `<div class="eqSet"><b>${setLabel(i)}</b>${t.length?t.map(x=>`<button type="button" class="eqPick" data-set="${i}" data-row="${x.row}" data-box="${x.box}"><span>${iconHtml("gear",x.it.id)}${esc(slotLabel(x.row))}: ${num(x.g.refine)?`+${num(x.g.refine)} `:""}${esc(x.it.name)} · slot ${x.box+1}: ${x.cur?esc((BUILD.item(x.cur)||{}).name||"?"):'<span class="muted">empty</span>'}</span><span class="to">→ ${esc(it.name)}</span></button>`).join("")
          :`<span class="note">No ${esc(part.toLowerCase())} with a card slot. <a href="#" data-eqfind="${cardPart(it)}">Find one</a></span>`}</div>`}).join("")}</div>`}
  $("eqDlgBody").innerHTML=mode+body}
// the Equipment tab's Type filter for a card's part: the gear it goes in, with a slot
const CARD_TYPE={weapon:"w:",shield:"a:shield",head:"a:head_upper",armor:"a:armor",garment:"a:garment",footgear:"a:footgear",accessory:"a:accessory"};
function equipPick(b){const c=C(),{kind,id}=EQ_DLG,it=BUILD.item(id);
  if(c.mode!=="build")document.querySelector('[data-cmode="build"]')?.click();
  let i=+b.dataset.set,where;
  if(kind==="item"){let rows=(b.dataset.rows||"").split(",").filter(Boolean);
    if(b.dataset.new){i=altAdd(c);if(i<0)return;rows=eqPlaces(it,state.job)[0]}
    eqPut(c,i,rows,id);where=placeLabel(rows,it)}
  else{cardPut(c,i,b.dataset.row,+b.dataset.box,id);where=`${slotLabel(b.dataset.row)}, card slot ${+b.dataset.box+1}`}
  save();renderGearTable();renderAll();$("eqDlg").close();
  showToast(`${it.name} is on in ${setLabel(i)} (${where}). See it under Gear on the Character tab.`)}
$("eqDlgBody").addEventListener("click",e=>{const f=e.target.closest("[data-eqfind]");
  if(f){e.preventDefault();state.eqDb={...EQDB_D,type:CARD_TYPE[f.dataset.eqfind]||"",slots:"1+"};save();$("eqDlg").close();showTab("equip");scrollTo({top:0});return}
  const b=e.target.closest(".eqPick");if(b)equipPick(b)});
$("eqDlgClose").addEventListener("click",()=>$("eqDlg").close());
$("eqDlg").addEventListener("click",e=>{if(e.target===$("eqDlg"))$("eqDlg").close()});
// ---- filters, sorting and the Equip buttons ----
(function setupGearDb(){
  const wt=[...new Set((typeof EQUIP!=="undefined"?EQUIP:[]).map(x=>x.type).filter(Boolean))].sort((a,b)=>BUILD.WTYPE[a].localeCompare(BUILD.WTYPE[b]));
  $("eqDbType").innerHTML=`<option value="">All equipment</option><optgroup label="Weapons"><option value="w:">All weapons</option>${wt.map(t=>`<option value="w:${t}">${esc(BUILD.WTYPE[t])}</option>`).join("")}</optgroup>`+
    `<optgroup label="Armor"><option value="a:">All armor</option>${[["head_upper","Upper headgear"],["head_middle","Middle headgear"],["head_lower","Lower headgear"],["armor","Armor"],["shield","Shield"],["garment","Garment"],["footgear","Shoes"],["accessory","Accessory"],["ammo","Arrows / ammo"]]
      .map(([k,n])=>`<option value="a:${k}">${n}</option>`).join("")}</optgroup>`;
  $("eqDbEl").innerHTML=`<option value="">Any</option>${["neutral","water","earth","fire","wind","poison","holy","shadow","ghost","undead"].map(e=>`<option value="${e}">${fxCap(e)}</option>`).join("")}`;
  $("eqDbJob").innerHTML=`<option value="">Any job</option><option value="mine">Your job</option>${DB_JOBS.map(j=>`<option>${j}</option>`).join("")}`;
  $("eqDbSort").innerHTML=`<option value="" hidden>By column</option>${EQ_SORTS.map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}`;
  ROOTQ(".fromSel").forEach(x=>x.innerHTML=FROM_OPTS);
  $("cardDbSlot").innerHTML=`<option value="">Any</option>${Object.entries(CARD_PART).map(([k,n])=>`<option value="${k}">${n}</option>`).join("")}`;
  ROOTQ("[data-eqf]").forEach(x=>x.addEventListener("input",()=>{state.eqDb={...eqDbF(),[x.dataset.eqf]:x.value};save();renderEquipDb()}));
  ROOTQ("[data-cdf]").forEach(x=>x.addEventListener("input",()=>{state.cardDb={...cardDbF(),[x.dataset.cdf]:x.value};save();renderCardDb()}));
  $("eqDbSort").addEventListener("change",e=>{const [k,d]=e.target.value.split(":");if(!k)return;state.tsort.equipTable=[k,+d];save();renderEquipDb()});
  $("eqDbReset").addEventListener("click",()=>{state.eqDb={...EQDB_D};delete state.tsort.equipTable;save();renderEquipDb()});
  $("cardDbReset").addEventListener("click",()=>{state.cardDb={...CARDDB_D};delete state.tsort.cardTable;save();renderCardDb()});
  [["equipTable",renderEquipDb],["cardTable",renderCardDb]].forEach(([id,render])=>$(id).tHead.addEventListener("click",e=>{const th=e.target.closest("th[data-sk]");if(!th)return;
    const k=th.dataset.sk,[k0,d0]=tblSort(id),col=TABLES[id].cols[k];state.tsort[id]=[k,k===k0?-d0:col.n&&!col.asc?-1:1];save();render()}));
  // a monster in Where to get opens it in Monster info; the In-game text folds open without equipping
  const dbLink=e=>{const m=e.target.closest("[data-mob]");if(m){e.preventDefault();state.infoMobId=+m.dataset.mob;save();showTab("mobinfo");scrollTo({top:0});return true}
    return !!e.target.closest("details.desc")};
  // a click anywhere on a row equips it, unless the item can't be worn
  $("equipTable").tBodies[0].addEventListener("click",e=>{if(dbLink(e))return;const tr=e.target.closest("tr[data-eqrow]"),b=tr&&tr.querySelector("[data-eqitem]");if(b&&!b.disabled)openEquip("item",+tr.dataset.eqrow)});
  $("cardTable").tBodies[0].addEventListener("click",e=>{if(dbLink(e))return;const tr=e.target.closest("tr[data-cdrow]"),b=tr&&tr.querySelector("[data-eqcard]");if(b&&!b.disabled)openEquip("card",+tr.dataset.cdrow)});
})();
