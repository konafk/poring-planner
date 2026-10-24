// ---- storage ----
const $=id=>document.getElementById(id);
const ROOTQ=sel=>[...document.querySelectorAll(sel)];
const KEY="rozero-farm-planner-v1";
// accounts: each one keeps its own full save; the first uses the original key so older saves carry over
const ACCT_KEY="rozero-farm-planner-accounts";
// a reload because another browser tab saved (see start.js) keeps this tab's account, page tab, scroll and unsent log entry
const VIEW_KEY="rozero-farm-planner-view";
const VIEW=(()=>{let v=null;try{v=JSON.parse(sessionStorage.getItem(VIEW_KEY));sessionStorage.removeItem(VIEW_KEY)}catch(e){}return v&&typeof v==="object"?v:null})();
const accts=(()=>{let a=null;try{a=JSON.parse(localStorage.getItem(ACCT_KEY))}catch(e){}
  if(!a||!Array.isArray(a.list)||!a.list.length)a={list:[{id:"a0",name:"Account 1"}],active:"a0"};
  if(VIEW&&a.list.some(x=>x.id===VIEW.acct))a.active=VIEW.acct;
  if(!a.list.some(x=>x.id===a.active))a.active=a.list[0].id;return a})();
// STALE: another tab changed the account list (or this tab found a newer save, below); it writes nothing more and reloads
let STALE=false;
const saveAccts=()=>{if(STALE)return;try{localStorage.setItem(ACCT_KEY,JSON.stringify(accts))}catch(e){}};
const acctKey=id=>id==="a0"?KEY:KEY+":"+id;
// ---- other browser tabs: each tab writes its whole save, so a tab left open on an old copy would wipe what another one logged.
// Every save carries a revision (state.rev), one more than the save it replaces, and the tab keeps the text it last read or wrote
// (LAST_RAW). When storage holds anything else at its next save, another tab (or another tool) wrote since: it doesn't overwrite
// that. The log entries and pauses this tab added since (by time; KNOWN holds the ones storage already had) go into the newer
// save, then the tab reloads with it and says "Updated from another tab" (start.js also reloads when the storage event fires) ----
let LAST_RAW=null,KNOWN=new Set();
const revOf=v=>Number.isFinite(+(v&&v.rev))?+v.rev:0;
const readRaw=()=>{try{return localStorage.getItem(acctKey(accts.active))}catch(e){return null}};
const knownOf=v=>new Set((v&&Array.isArray(v.sessions)?v.sessions:[]).flatMap(s=>[String(s.id),...(s.entries||[]).map(e=>s.id+"@"+e.t),...(s.pauses||[]).map(p=>s.id+"#"+p.from)]));
// reload this tab with what's in storage, keeping its account, page tab, scroll and unsent log entry, and a message to show after it
function reloadView(toast){try{const drafts={};["fPct","fJob","pasteBox"].forEach(id=>{const el=$(id);if(el&&el.value)drafts[id]=el.value});
    sessionStorage.setItem(VIEW_KEY,JSON.stringify({acct:accts.active,tab:document.querySelector('[data-tabbtn][aria-selected="true"]')?.dataset.tabbtn,y:scrollY,drafts,toast}))}catch(e){}
  location.reload()}
function mergeNewer(v,raw){STALE=true;let o=null;try{o=JSON.parse(raw)}catch(e){}
  if(o&&typeof o==="object"&&Array.isArray(o.sessions)){let n=0;
    v.sessions.forEach(s=>{const os=o.sessions.find(x=>x&&String(x.id)===s.id);
      if(!os){if(!KNOWN.has(s.id)&&s.entries.length){o.sessions.push(s);n++}return}// a session started in this tab
      if(!Array.isArray(os.entries))os.entries=[];const ts=new Set(os.entries.map(e=>+(e&&e.t)));
      s.entries.forEach(e=>{if(!KNOWN.has(s.id+"@"+e.t)&&!ts.has(e.t)){os.entries.push(e);n++}});os.entries.sort((a,b)=>a.t-b.t);
      const ps=(s.pauses||[]).filter(p=>!KNOWN.has(s.id+"#"+p.from));if(ps.length){if(!Array.isArray(os.pauses))os.pauses=[];const fs=new Set(os.pauses.map(p=>+(p&&p.from)));
        ps.forEach(p=>{if(!fs.has(p.from)){os.pauses.push(p);n++}});os.pauses.sort((a,b)=>a.from-b.from)}});
    if(n){o.rev=Math.max(revOf(o),revOf(v))+1;try{localStorage.setItem(acctKey(accts.active),JSON.stringify(o))}catch(e){}}}
  reloadView("Updated from another tab")}
const store={get(){LAST_RAW=readRaw();let v=null;try{v=JSON.parse(LAST_RAW)}catch(e){}return v},
  set(v){if(STALE)return;const raw=readRaw();if(raw!==LAST_RAW){mergeNewer(v,raw);return}
    v.rev=revOf(v)+1;const txt=JSON.stringify(v);try{localStorage.setItem(acctKey(accts.active),txt);LAST_RAW=txt;KNOWN=knownOf(v)}catch(e){}}};
let state=store.get()||{};
if(!Array.isArray(state.sessions)||!state.sessions.length)state.sessions=[{id:"s"+Date.now(),name:"New session",mobIds:[],entries:[]}];
// sessions hold a list of monsters (one map, plus the aggressive ones you end up killing); older saves had a single mobId
state.sessions.forEach(s=>{if(!Array.isArray(s.mobIds))s.mobIds=s.mobId!=null?[s.mobId]:[];delete s.mobId});
// saves can come from a pasted backup: keep ids and names as text and log entries as numbers, dropping entries that aren't
state.sessions.forEach(s=>{s.id=String(s.id);s.name=String(s.name??"Session");s.mobIds=s.mobIds.map(Number).filter(Number.isFinite);if(s.job!=null)s.job=String(s.job);if(s.map!=null&&(typeof s.map!=="string"||!s.map))delete s.map;
  s.entries=(Array.isArray(s.entries)?s.entries:[]).map(e=>{const o={t:+(e&&e.t),lv:+(e&&e.lv),pct:+(e&&e.pct)};if(e&&e.jpct!=null&&e.jpct!==""&&isFinite(+e.jpct))o.jpct=+e.jpct;if(e&&+e.jlv>0)o.jlv=+e.jlv;if(e&&+e.died>0)o.died=+e.died;return o})
    .filter(e=>Number.isFinite(e.t)&&Number.isFinite(e.lv)&&Number.isFinite(e.pct));
  if(s.trip!=null)s.trip=s.trip&&Number.isFinite(+s.trip.from)&&Number.isFinite(+s.trip.due)?{from:+s.trip.from,due:+s.trip.due,...(s.trip.rang===true?{rang:true}:{})}:undefined;
  if(s.pauses!=null)s.pauses=(Array.isArray(s.pauses)?s.pauses:[]).filter(p=>p&&Number.isFinite(+p.from)&&(p.to==null||Number.isFinite(+p.to))).map(p=>p.to==null?{from:+p.from}:{from:+p.from,to:+p.to});
  // the character as it was when entries were logged (model.js charSnap), and the walking worked out from it: a character object and numbers
  if(s.snap!=null)s.snap=s.snap&&typeof s.snap==="object"&&s.snap.c&&typeof s.snap.c==="object"&&!Array.isArray(s.snap.c)&&Number.isFinite(+s.snap.at)?{at:+s.snap.at,c:s.snap.c,...(s.snap.est===true?{est:true}:{})}:undefined;
  // stats the session was logged with before a change (oldest first; t: the newest entry each covers)
  if(s.snapHist!=null)s.snapHist=(Array.isArray(s.snapHist)?s.snapHist:[]).filter(x=>x&&Number.isFinite(+x.t)&&x.c&&typeof x.c==="object"&&!Array.isArray(x.c)).map(x=>({t:+x.t,c:x.c}));
  if(s.walk!=null){const w=s.walk,n=x=>x==null||!Number.isFinite(+x)?null:+x;s.walk=w&&typeof w==="object"&&typeof w.key==="string"?{key:w.key,sec:n(w.sec),fight:n(w.fight),kph:n(w.kph)}:undefined}});
// what storage already holds (see mergeNewer)
KNOWN=knownOf(state);
// new accounts start as Novice; change it on the Character tab
if(!JOBS[state.job])state.job="Novice";
if(!state.chars||typeof state.chars!=="object")state.chars={};
// per character: learned skill levels and the build-mode "Check against the game" values are numbers; anything else is dropped
const numMap=o=>Object.fromEntries(Object.entries(o&&typeof o==="object"?o:{}).map(([k,v])=>[k,v===""||v==null?NaN:+v]).filter(([,v])=>Number.isFinite(v)));
for(const j in state.chars){let c=state.chars[j];if(!c||typeof c!=="object"){delete state.chars[j];continue}
  // "Try other gear" kept a copy of the character to go back to (c.trial.base): the copy is your character again, and the gear you were
  // trying is the first other gear set (build.alts)
  if(c.trial){const t=c.trial.base,b=c.build;delete c.trial;if(t&&typeof t==="object"&&!Array.isArray(t)){
    if(b&&b.gear&&t.build&&typeof t.build==="object")t.build.alts=[{gear:b.gear,stones:b.stones||{},special:b.special||{}}];state.chars[j]=c=t}}
  // one other gear set (build.alt, the table editing it: gearEdit "alt") became a list (build.alts, "alt0"…). The list was three
  // sets that were always there, so empty ones at its end go, unless the table is editing one
  if(c.build&&typeof c.build==="object"){const b=c.build;if(b.alt){if(!Array.isArray(b.alts)&&typeof b.alt==="object")b.alts=[b.alt];delete b.alt}
    if(b.alts!=null&&!Array.isArray(b.alts))delete b.alts;
    if(b.alts){b.alts=b.alts.map(a=>a&&typeof a==="object"&&!Array.isArray(a)?a:{gear:{}});const ed=/^alt(\d+)$/.exec(c.gearEdit||""),keep=ed?+ed[1]:-1;
      const empty=a=>!Object.keys(a.gear||{}).length&&!Object.values(a.stones||{}).some(Boolean)&&!(a.special&&(a.special.ring||(a.special.own||[]).length));
      while(b.alts.length&&b.alts.length-1>keep&&empty(b.alts[b.alts.length-1]))b.alts.pop()}}
  if(c.gearEdit==="alt")c.gearEdit="alt0";
  // "HP back per minute" (hpRegen) became "HP regen per 6s" (hpRegen6, blank = worked out): a typed value carries over as 10 ticks a minute
  if(c.hpRegen!=null){const v=+c.hpRegen;if(v>0&&c.hpRegen6==null)c.hpRegen6=Math.max(1,Math.round(v/10));delete c.hpRegen}
  if(c.skills!=null)c.skills=Object.fromEntries(Object.entries(numMap(c.skills)).map(([k,v])=>[k,Math.max(0,Math.round(v))]).filter(([,v])=>v>0));
  if(c.build&&typeof c.build==="object"&&c.build.check!=null)c.build.check=numMap(c.build.check);
  // your price per skill item (item id → zeny) and support casts per kill: numbers of 0 or more
  if(c.itemPrices!=null)c.itemPrices=Object.fromEntries(Object.entries(numMap(c.itemPrices)).filter(([k,v])=>/^\d+$/.test(k)&&v>=0));
  if(c.supCasts!=null)c.supCasts=Object.fromEntries(Object.entries(numMap(c.supCasts)).filter(([,v])=>v>=0));
  // recovery items (the Consumables card): the HP / SP item picked (text: an item id, "auto", "none" or "custom") and your values per item
  // (numbers of 0 or more). A save from before it with its own SP item typed (not the 37 SP for 200 z default) keeps that as the Custom SP item
  if(c.recovery==null&&((c.itemSp!=null&&+c.itemSp!==37)||(c.itemPrice!=null&&+c.itemPrice!==200)))c.recovery={spItem:"custom"};
  if(c.recovery!=null){const r=c.recovery&&typeof c.recovery==="object"&&!Array.isArray(c.recovery)?c.recovery:{},o=r.overrides&&typeof r.overrides==="object"?r.overrides:{},keys=(x,ks)=>Object.fromEntries(Object.entries(numMap(x)).filter(([k,v])=>ks.includes(k)&&v>=0));
    c.recovery={hpItem:typeof r.hpItem==="string"?r.hpItem:"auto",spItem:typeof r.spItem==="string"?r.spItem:"auto",
      overrides:Object.fromEntries(Object.entries(o).filter(([id])=>Object.hasOwn(RECOVERY,id)).map(([id,x])=>[id,keys(x,["min","max","w","npc","disc","player"])]).filter(([,x])=>Object.keys(x).length))}}}
// market prices you typed for items, and optionally what an NPC pays for them (item id → zeny); numbers only, so a pasted backup can't put anything else in
state.prices=Object.fromEntries(Object.entries(numMap(state.prices)).filter(([k,v])=>/^\d+$/.test(k)&&v>=0)); // keys are item ids
state.npcPrices=Object.fromEntries(Object.entries(numMap(state.npcPrices)).filter(([k,v])=>v>=0&&k in state.prices));
// auto-loot groups you switched off (true/false by group), and per map the monsters the Zeny Hunter passes by (monster ids)
state.autoLoot=Object.fromEntries(Object.entries(state.autoLoot&&typeof state.autoLoot==="object"?state.autoLoot:{}).filter(([k,v])=>/^[waueco]$/.test(k)&&typeof v==="boolean"));
state.huntOff=Object.fromEntries(Object.entries(state.huntOff&&typeof state.huntOff==="object"?state.huntOff:{}).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[String(k),v.map(Number).filter(Number.isFinite)]));
state.huntAuto=state.huntAuto===true;
state.farmBy=state.farmBy==="zeny"?"zeny":"exp";
// the Zeny Hunter's level filter: a monster Lv range (whole numbers, null = any) and "Skip drop-penalty monsters" (true/false)
["huntMinLv","huntMaxLv"].forEach(k=>{state[k]=state[k]!=null&&state[k]!==""&&Number.isFinite(+state[k])?Math.round(+state[k]):null});
state.huntNoPen=state.huntNoPen===true;
// the EXP Hunter's "Calibrate to my logs" (model.js calInfo)
state.calOn=state.calOn===true;
// sort ([column, 1 or -1]) and column filters (text) of the Monster info, Item info, Market and Hunter tables, by table id
const objOr=o=>o&&typeof o==="object"&&!Array.isArray(o)?o:{};
state.tsort=Object.fromEntries(Object.entries(objOr(state.tsort)).filter(([,v])=>Array.isArray(v)&&typeof v[0]==="string"&&(v[1]===1||v[1]===-1)));
// the Hunter tables kept their sort in bestSort/huntSort before they moved to tsort
[["bestTable","bestSort","bestDir"],["huntTable","huntSort","huntDir"]].forEach(([id,k,d])=>{if(typeof state[k]==="string"&&!state.tsort[id])state.tsort[id]=[state[k],state[d]===1?1:-1];delete state[k];delete state[d]});
state.tfilt=Object.fromEntries(Object.entries(objOr(state.tfilt)).map(([k,v])=>[k,Object.fromEntries(Object.entries(objOr(v)).filter(([,x])=>typeof x==="string"))]));
// the Equipment, Cards and Recipes tabs' filters: {key: text as typed}
if(state.itemFrom!=null&&typeof state.itemFrom!=="string")delete state.itemFrom; // Item info's Where to get filter
["eqDb","cardDb","recipeDb"].forEach(k=>{if(state[k]!=null)state[k]=Object.fromEntries(Object.entries(objOr(state[k])).filter(([,x])=>typeof x==="string"))});
state.noTele=(Array.isArray(state.noTele)?state.noTele:[]).map(String);
// possible rampage per map (monsters attacking you together) (Map planner): whole numbers 1–12
state.mobbed=Object.fromEntries(Object.entries(numMap(state.mobbed)).map(([k,v])=>[k,Math.min(12,Math.max(1,Math.round(v)))]));
// per account: buy at the Discount price (on unless switched off): recovery items, the ASPD potion, skill items and Custom HP / SP items
state.recovery={discount:!(state.recovery&&state.recovery.discount===false)};
// the Memorials tab's Jellostone tracker (memorial.js): whole counts of 0 or more by fragment / stone id, the stone crafting
// ({id, due: ms}), the Expedition pieces you want (item ids) and your Faintly Glowing Crystals
{const j=objOr(state.jello),cnt=(o,ids)=>Object.fromEntries(Object.entries(numMap(o)).filter(([k,v])=>ids.includes(+k)&&v>=0).map(([k,v])=>[k,Math.round(v)]).filter(([,v])=>v>0)),
  stones=JELLO.map(x=>x.stone[0]),c=objOr(j.craft);
  state.jello={frag:cnt(j.frag,JELLO.map(x=>x.frag[0])),stone:cnt(j.stone,stones),want:[...new Set((Array.isArray(j.want)?j.want:[]).map(Number))].filter(id=>EXPEDITION.some(x=>x.id===id)),
    crystals:Number.isFinite(+j.crystals)&&+j.crystals>0?Math.round(+j.crystals):0,...(stones.includes(+c.id)&&Number.isFinite(+c.due)?{craft:{id:+c.id,due:+c.due}}:{})}}
// the Stellar tab (stellar.js): certificates you have by weapon type (whole counts above 0) and your weapon's refine (0 to 20)
{const t=objOr(state.stellar),r=Math.round(+t.refine);
  state.stellar={have:Object.fromEntries(Object.entries(numMap(t.have)).filter(([k,v])=>/^[a-z0-9_]+$/.test(k)&&v>=1).map(([k,v])=>[k,Math.round(v)])),refine:Number.isFinite(r)?Math.min(20,Math.max(0,r)):0}}
delete state.flyPrice;
["teleSec","tripEarly","tripMin"].forEach(k=>{if(state[k]!=null&&!(Number.isFinite(+state[k])&&+state[k]>=0))delete state[k]});
if(!state.current||!state.sessions.some(s=>s.id===state.current))state.current=state.sessions[0].id;
// Element / Race / Size / Boss dropdowns: the Monsters card's (mobF) and Monster info's (infoF), {key: value}
["mobF","infoF"].forEach(k=>{if(state[k]!=null)state[k]=Object.fromEntries(Object.entries(objOr(state[k])).filter(([,x])=>typeof x==="string"))});
const D={bonus:0,jobBonus:0,minLv:1,maxLv:99,hideClosed:true,filters:{},mobF:{boss:"noboss"},infoF:{},sort:"epm",dir:-1,regions:{},closed:[],maxSec:60};
for(const k in D)if(state[k]==null)state[k]=JSON.parse(JSON.stringify(D[k]));
const save=()=>store.set(state);
const C=()=>{if(!state.chars[state.job])state.chars[state.job]=charDefault(state.job);const c=state.chars[state.job];
  {const p=c.preset>=0&&JOBS[state.job]&&JOBS[state.job].p[c.preset];if(p&&c.a){if(p.zeny!=null&&c.a.zeny==null)c.a.zeny=p.zeny;if(p.cart!=null&&c.a.cart==null)c.a.cart=p.cart;if(p.consumes&&c.a.consumes==null)c.a.consumes=p.consumes;if(p.arrows!=null&&c.a.arrows==null)c.a.arrows=p.arrows;if(p.blvBug&&c.a.blvBug==null)c.a.blvBug=p.blvBug;if(p.shw&&c.a.shw==null)c.a.shw=p.shw}}const d=charDefault(state.job);for(const k in d)if(c[k]==null)c[k]=d[k];if(!c.a)c.a={...d.a};return c};
const cur=()=>state.sessions.find(s=>s.id===state.current)||state.sessions[0];

// skills v2: presets now come from the data; reset each saved job to its first preset
(function weaponsV2(){if(state.weaponsV2)return;state.weaponsV2=true;for(const j in state.chars){const c=state.chars[j];if(c&&WREN[c.weapon])c.weapon=WREN[c.weapon]}save()})();
(function sfV2(){if(state.sfV2)return;state.sfV2=true;const c=state.chars&&state.chars.Sage;if(c&&c.preset>=0&&c.preset<3){c.a={...JOBS.Sage.p[c.preset]}}save()})();
(function sfV3(){if(state.sfV3)return;state.sfV3=true;const c=state.chars&&state.chars.Sage;if(c){c.preset=0;c.a={...JOBS.Sage.p[0]}}save()})();
(function skillsV3(){if(state.skillsV3)return;state.skillsV3=true;for(const j in state.chars){if(!JOBS[j])continue;const c=state.chars[j];if(c.preset==null||c.preset>=0){c.preset=Math.min(c.preset||0,JOBS[j].p.length-1);c.a={...JOBS[j].p[c.preset]}}}save()})();
(function skillsV2(){if(state.skillsV2)return;state.skillsV2=true;for(const j in state.chars){if(!JOBS[j]){delete state.chars[j];continue}const c=state.chars[j];if(c.preset==null||c.preset>=0){c.preset=0;c.a={...JOBS[j].p[0]}}}save()})();
// Vitata, Hunter Fly and Side Winder moved from Sage options (c.sage, where Vitata defaulted on) to c.cards, for every job
(function cardsV1(){if(state.cardsV1)return;state.cardsV1=true;for(const j in state.chars){const c=state.chars[j],s=c&&c.sage;if(!s||typeof s!=="object")continue;
  if(j==="Sage"&&!c.cards){c.cards={};for(const k in CARD_D)c.cards[k]=s[k]!=null?s[k]:k==="vitata"?true:CARD_D[k]}for(const k in CARD_D)delete s[k]}save()})();
// Energy Coat and "SP items at x% SP" moved from Sage options (c.sage, where Energy Coat defaulted on) to c.ec, for Mages and Wizards too
(function ecV1(){if(state.ecV1)return;state.ecV1=true;for(const j in state.chars){const c=state.chars[j],s=c&&c.sage;if(!s||typeof s!=="object")continue;
  if(j==="Sage"&&!c.ec)c.ec={on:s.ecOn!=null?!!s.ecOn:true,spPct:s.autoSpPct!=null?s.autoSpPct:EC_D.spPct};delete s.ecOn;delete s.autoSpPct}save()})();
// ---- helpers ----
// a short message at the bottom of the screen
let TOAST_T=0;
function showToast(msg,ms=4000){const el=$("toast");if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(TOAST_T);TOAST_T=setTimeout(()=>{el.hidden=true},ms)}
const sumStat=v=>String(v??"").split("+").reduce((a,x)=>a+(parseFloat(x)||0),0);
const fmtN=n=>isFinite(n)?Math.round(n).toLocaleString("en-GB"):"–";
const fmtT=t=>new Date(t).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
const fmtD=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
const dayKey=t=>new Date(t).toDateString();
// entries sorted by time that run over more than one calendar day show their date as well as the time
const multiDay=es=>es.length>1&&dayKey(es[0].t)!==dayKey(es[es.length-1].t);
const pct=(n,d=2)=>isFinite(n)?n.toFixed(d)+"%":"–";
function fmtDur(h){if(!isFinite(h)||h<0)return "–";const m=Math.round(h*60),hh=Math.floor(m/60),mm=m%60;if(hh>=24){const d=Math.floor(hh/24);return `~${d}d ${hh%24}h ${mm}m\n~${hh}h ${mm}m`}return hh?`~${hh}h ${mm}m`:`~${mm}m`}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
const num=(v,d=0)=>{const x=+v;return isFinite(x)?x:d};
const lvExp=lv=>EXP_TABLE[lv]||null;
// the server's base level cap: raise it when a patch does. At it base EXP no longer counts, so the EXP Hunter ranks by zeny
const MAX_BASE_LV=70;
const atMaxLv=()=>num(C().baseLv)>=MAX_BASE_LV;
// Even Share: a kill gives the party 100% + 10% per member beyond the first, split evenly (110% for 2, 120% for 3 ... 210% for 12),
// for base and job EXP alike. Checked in game with +20% EXP: Boulder Dwarf Captain (32,822) → 15,753 each for 3 members, 12,800 for 4;
// Squad Leader (33,361) → 22,017 for 2. The game shares EXP by damage dealt, so a kill can come out 1 EXP off
const partyN=(s=cur())=>Math.min(12,Math.max(1,Math.round(num(s&&s.partyN,1))));
const partyBonus=(s=cur())=>10*(partyN(s)-1);
const partyPct=(s=cur())=>Math.floor((100+partyBonus(s))/partyN(s));  // each member's whole % of a kill, for display

