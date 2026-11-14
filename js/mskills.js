// ---- Monster skills tab: the skills monsters use (data/mobskills.js, MOBSKILL by monster) the other way round: each skill, the
// monsters that use it, and how each one does (when, at what level and chance, its cast and delay, and what sets it off). The kinds
// are the planner's own grouping, by what the skill does to you, shown under its name and to filter by; a skill the list below doesn't name is Other.
// Filters per account (state.msk: q the text, which matches a skill's or a monster's name; kind; open: hide monsters with no open
// map), the sort in state.tsort.mskTable, and which skills are open (their When and how often) for this visit only ----
const MSK_KINDS={
  ail:["Ailments","Puts a status on you (Stun, Poison, Silence, Freeze, Sleep…) or weakens you"],
  atk:["Physical attacks","Hits harder than a normal attack, more than once, or from range"],
  mag:["Magic and elemental","Magic, or an attack of an element"],
  sum:["Summons","Calls more monsters"],
  buf:["Self buffs and heals","Heals itself, changes its element, or makes itself harder to hit or kill"],
  brk:["Gear breaks","Breaks or takes off your gear"],
  mov:["Moves","Teleports, jumps back or pulls you in"],
  trap:["Traps","Lays traps on the ground"],
  oth:["Other","Emotes, and the rest"]};
const MSK_KIND_OF=(()=>{const k={};Object.entries({
  ail:[6,15,16,30,76,78,92,110,140,149,159,176,177,178,179,180,181,182,200,203,206,207,289,342,405,659,673,735,751,752,757,759,760,763,764],
  atk:[5,7,42,46,47,52,56,57,58,59,136,137,148,152,158,160,170,171,172,173,174,199,229,250,253,379,397,406,740,741],
  mag:[13,14,17,18,19,20,21,80,83,84,85,86,89,90,91,183,184,185,186,187,188,189,190,191,192,202,338,339,340,341,347,658,706,708,720,731,733,736,739,750,768,2216],
  sum:[196,209,352],
  buf:[8,12,25,28,29,51,60,61,111,114,135,161,162,164,165,167,168,169,201,204,205,231,249,252,332,348,349,350,353,361,687,743,753,754],
  brk:[343,344,345,346,476],
  mov:[26,150,264,331,747,748,755],
  trap:[115,117,119,120,121,123],
}).forEach(([kind,ids])=>ids.forEach(i=>k[i]=kind));return k})();
const mskKind=sid=>MSK_KIND_OF[sid]||"oth";
const mskName=sid=>MOBSKILLNAME[sid]||`skill ${sid}`;
// names two skills share (Stone Curse the spell and the hit, Hiding): those rows show the skill's id too
const MSK_SHARED=(()=>{const n={};Object.keys(MOBSKILLNAME).forEach(sid=>{const x=mskName(sid);n[x]=(n[x]||0)+1});return new Set(Object.keys(n).filter(x=>n[x]>1))})();
// a monster in the skill lists: the monster tables' when it's there, else the client's name and level
const mskMob=id=>{const m=MOB_BY_ID.get(+id),c=typeof CLIENT!=="undefined"&&CLIENT.mobLv&&CLIENT.mobLv[id];
  return {id:+id,m,name:m?m.name:c?c[0]:`#${id}`,lv:m?m.lv:c?c[1]:null}};
// every skill, with each monster that uses it and its rows for it (a monster can use a skill in more than one way)
let MSK_LIST=null;
function mskList(){if(MSK_LIST)return MSK_LIST;const by={};
  Object.entries(MOBSKILL).forEach(([mid,rows])=>rows.forEach(r=>{const s=by[r[0]]=by[r[0]]||{};(s[mid]=s[mid]||[]).push(r)}));
  return MSK_LIST=Object.entries(by).map(([sid,mobs])=>({sid:+sid,name:mskName(sid),kind:mskKind(+sid),
    mobs:Object.entries(mobs).map(([mid,rows])=>({...mskMob(mid),rows})).sort((a,b)=>(a.lv??999)-(b.lv??999)||a.name.localeCompare(b.name))}))}
// a monster you can meet now: it spawns on a map that's open
const mskOpen=x=>!!x.m&&openMaps(x.m).length>0;
// what the filters leave of a skill: its monsters that pass them, or null when the skill doesn't show. Text that's in the skill's
// name keeps all its monsters; otherwise it picks the monsters by name
function mskShown(s,f=state.msk){if(f.kind&&s.kind!==f.kind)return null;
  let mobs=f.open?s.mobs.filter(mskOpen):s.mobs;const q=(f.q||"").trim().toLowerCase();
  if(q&&!s.name.toLowerCase().includes(q))mobs=mobs.filter(x=>x.name.toLowerCase().includes(q));
  return mobs.length?mobs:null}
const MSK_OPENED=new Set();
TABLES.mskTable={def:["name",1],cols:{name:{t:r=>r.s.name},n:{n:r=>r.mobs.length}}};
const mskChip=x=>`<span class="mobChip">${mobIcon(x.id,1,"il")}${infoMobLink(x.id,x.name)}${x.lv!=null?` <span class="note">Lv ${x.lv}</span>`:""}</span>`;
// one way a monster uses it: when, the skill's level, chance, cast (and whether a hit stops it), delay and what sets it off
const mskUse=([,st,lv,ch,cast,delay,cond,intr])=>`<td class="name">${esc(st.toLowerCase())}</td><td>${lv}</td><td>${ch}%</td>
  <td>${cast?MOB_SKILL_T(cast)+(intr?"":` <span class="note" title="hitting it doesn't stop the cast">uninterruptible</span>`):"instant"}</td><td>${MOB_SKILL_T(delay)}</td><td class="name">${esc(cond)||"–"}</td>`;
const mskHow=mobs=>`<div class="scroll"><table class="matTable usedTable mskHow"><thead><tr><th>Monster</th><th>When</th><th title="the skill's level">Lv</th><th title="each time it can, while in that state">Chance</th><th>Cast</th><th title="before it uses it again">Delay</th><th>Condition</th></tr></thead><tbody>${
  mobs.map(x=>x.rows.map((r,i)=>`<tr>${i?"":`<td class="name" rowspan="${x.rows.length}">${mskChip(x)}</td>`}${mskUse(r)}</tr>`).join("")).join("")}</tbody></table></div>`;
function renderMsk(){const f=state.msk,all=mskList();
  const rows=sortRows("mskTable",all.map(s=>({s,mobs:mskShown(s,f)})).filter(r=>r.mobs));
  $("mskRows").innerHTML=rows.map(({s,mobs})=>{const k=MSK_KINDS[s.kind],open=MSK_OPENED.has(s.sid);
    return `<tr><td class="name"><b>${esc(s.name)}</b>${MSK_SHARED.has(s.name)?` <span class="note">#${s.sid}</span>`:""}
      <div><span class="pill" title="${esc(k[1])}">${esc(k[0])}</span></div></td><td class="mono">${mobs.length}</td>
      <td class="name l"><div class="mskMobs">${mobs.map(mskChip).join("")}</div>
        <details class="mskMore" data-msk="${s.sid}"${open?" open":""}><summary>When and how often</summary>${open?mskHow(mobs):""}</details></td></tr>`}).join("")
    ||`<tr><td colspan="3" class="note">No skill matches these filters.${f.open?' <a href="#" id="mskAll">Show monsters with no open map too</a>':""}</td></tr>`;
  const mobs=new Set(rows.flatMap(r=>r.mobs.map(x=>x.id)));
  $("mskNote").textContent=`${rows.length} of ${all.length} skills · ${mobs.size} monsters`;
  $("mskQ").value=f.q;$("mskKind").value=f.kind;$("mskOpen").checked=f.open}
// a skill's own row, from anywhere (a monster's details): the tab with its name typed and every kind
function openMsk(sid){state.msk={...state.msk,q:mskName(sid),kind:""};MSK_OPENED.add(+sid);save();showTab("mskill");scrollTo({top:0})}
(function setupMsk(){if(state.msk.kind&&!MSK_KINDS[state.msk.kind])state.msk.kind="";
  $("mskKind").innerHTML=`<option value="">Every kind</option>`+Object.entries(MSK_KINDS).map(([k,[n,d]])=>`<option value="${k}" title="${esc(d)}">${esc(n)}</option>`).join("");
  $("mskQ").addEventListener("input",()=>{state.msk.q=$("mskQ").value;save();renderMsk()});
  $("mskCard").addEventListener("change",e=>{
    if(e.target.id==="mskKind"){state.msk.kind=e.target.value;save();renderMsk()}
    if(e.target.id==="mskOpen"){state.msk.open=e.target.checked;save();renderMsk()}});
  $("mskCard").addEventListener("click",e=>{if(e.target.id==="mskAll"){e.preventDefault();state.msk.open=false;save();renderMsk()}});
  // When and how often: drawn when opened, and remembered while the page is open
  $("mskCard").addEventListener("toggle",e=>{const d=e.target;if(!d.matches||!d.matches("details.mskMore"))return;const sid=+d.dataset.msk;
    if(d.open){MSK_OPENED.add(sid);if(!d.querySelector("table")){const s=mskList().find(x=>x.sid===sid);d.insertAdjacentHTML("beforeend",mskHow(mskShown(s)||[]))}}
    else MSK_OPENED.delete(sid)},true);
  $("mskTable").tHead.addEventListener("click",e=>{const th=e.target.closest("th[data-sk]");if(!th)return;
    const k=th.dataset.sk,[k0,d0]=tblSort("mskTable"),col=TABLES.mskTable.cols[k];state.tsort.mskTable=[k,k===k0?-d0:col.n&&!col.asc?-1:1];save();renderMsk()});
})();
