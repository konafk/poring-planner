// ---- shared prices and cloud backup: Discord login through a Supabase project (supabase/schema.sql, docs/shared-prices.md) ----
// url and key are the project's URL and its public (anon / publishable) key, from Project Settings, API. The key is meant to be
// public: the database's own rules decide what it can do. Never put the service_role (secret) key here. Blank: the feature is hidden.
const SHARED={url:"https://uhwcrqijwnrhoamyyqxc.supabase.co",key:"sb_publishable_ZhkoMeGKvKB2l4EgANdBbA_rKzpv-uc"};
const sharedOn=()=>!!(SHARED.url&&SHARED.key);
// the login: kept in its own storage key, apart from the accounts, so backups and share links never carry it
const AUTH_KEY="rozero-farm-planner-auth",PKCE_KEY="rozero-farm-planner-pkce";
let AUTH=null;try{AUTH=JSON.parse(localStorage.getItem(AUTH_KEY)||"null")}catch(e){}
if(!AUTH||typeof AUTH.access_token!=="string"||!AUTH.user)AUTH=null;
const authSave=a=>{AUTH=a;try{a?localStorage.setItem(AUTH_KEY,JSON.stringify(a)):localStorage.removeItem(AUTH_KEY)}catch(e){}};
// the name Discord gives the player (their display name, else their username)
const discordName=u=>{const m=(u&&u.user_metadata)||{};return String((m.custom_claims&&m.custom_claims.global_name)||m.full_name||m.name||m.user_name||"Discord player")};
const authOf=r=>({access_token:r.access_token,refresh_token:r.refresh_token,expires_at:r.expires_at||Math.floor(Date.now()/1000)+(+r.expires_in||3600),user:{id:r.user.id,name:discordName(r.user)}});
async function authRefresh(){const r=await fetch(`${SHARED.url}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SHARED.key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:AUTH.refresh_token})});
  if(!r.ok){authSave(null);renderShared();throw new Error("You were logged out. Log in with Discord again.")}authSave(authOf(await r.json()))}
// a call to the project: the public key always, the player's token when logged in (renewed a minute before it runs out)
async function sb(path,opt={}){if(!sharedOn())throw new Error("Shared prices aren't set up on this site");
  if(AUTH&&AUTH.expires_at*1000<Date.now()+60000)await authRefresh();
  const h={apikey:SHARED.key,"Content-Type":"application/json",...(opt.headers||{})};if(AUTH)h.Authorization="Bearer "+AUTH.access_token;
  const r=await fetch(SHARED.url+path,{...opt,headers:h});
  if(r.status===401&&AUTH){authSave(null);renderShared();throw new Error("You were logged out. Log in with Discord again.")}
  if(!r.ok){let m="";try{const j=await r.json();m=j.message||j.msg||j.error_description||""}catch(e){}throw new Error(m||`The server said ${r.status}`)}
  const t=await r.text();return t?JSON.parse(t):null} // a write with return=minimal answers with no body
// log in with Discord (OAuth with PKCE): Supabase sends the player back here with ?code=, swapped below for a token
async function login(){if(!sharedOn())return;
  const v=b64u.enc(crypto.getRandomValues(new Uint8Array(32))),c=b64u.enc(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))));
  try{sessionStorage.setItem(PKCE_KEY,JSON.stringify({v,tab:location.hash||"#"+state.tab}))}catch(e){}
  location.href=`${SHARED.url}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(location.origin+location.pathname)}&code_challenge=${c}&code_challenge_method=s256`}
async function authCallback(){if(!/[?&](code|error)=/.test(String(location.search||"")))return; // not coming back from Discord
  const q=new URLSearchParams(location.search),code=q.get("code"),err=q.get("error_description")||q.get("error");if(!code&&!err)return;
  let p={};try{p=JSON.parse(sessionStorage.getItem(PKCE_KEY)||"{}");sessionStorage.removeItem(PKCE_KEY)}catch(e){}
  try{history.replaceState(null,"",location.pathname+(p.tab||location.hash))}catch(e){}
  if(err){showToast("Discord login didn't work: "+err,6000);return}
  if(!p.v||!sharedOn())return;
  try{const r=await fetch(`${SHARED.url}/auth/v1/token?grant_type=pkce`,{method:"POST",headers:{apikey:SHARED.key,"Content-Type":"application/json"},body:JSON.stringify({auth_code:code,code_verifier:p.v})});
    if(!r.ok)throw 0;authSave(authOf(await r.json()));showToast(`Logged in as ${AUTH.user.name}`);if(p.tab)location.hash=p.tab;renderShared();loadShared(true);cloudInfo();syncCheck()}
  catch(e){showToast("Discord login didn't work. Try again.",6000)}}
async function logout(){try{if(AUTH)await fetch(`${SHARED.url}/auth/v1/logout`,{method:"POST",headers:{apikey:SHARED.key,Authorization:"Bearer "+AUTH.access_token}})}catch(e){}
  authSave(null);syncSave(null);SYNC_ASK=null;renderSyncAsk();renderShared();if(state.tab==="market")renderPrices()}

// a shared copy's slots from the server's columns (cards, enchant, egg), as the page keeps them (c, e, egg)
const sharedSlots=x=>({...(Array.isArray(x.cards)&&x.cards.length?{c:x.cards.map(Number)}:{}),...(x.enchant?{e:String(x.enchant)}:{}),...(x.egg?{egg:+x.egg}:{})});
// ---- shared prices of the picked server: item id → copies [{r, o, p, players, reports, newest (ms)}], the plain one first ----
const SHARED_P={};let SHARED_LOADING=null;
const sharedOf=id=>((SHARED_P[state.mktServer]||{}).rows||{})[id]||null;
const sharedPlain=id=>(sharedOf(id)||[]).find(x=>!x.r&&!x.o.length)||null;
async function loadShared(force){if(!sharedOn())return;const srv=state.mktServer,c=SHARED_P[srv];
  if(SHARED_LOADING||(!force&&c&&Date.now()-c.at<5*60000))return;
  SHARED_LOADING=sb("/rest/v1/rpc/shared_prices",{method:"POST",body:JSON.stringify({srv})}).then(rows=>{const by={};
      (rows||[]).forEach(x=>{(by[x.item_id]=by[x.item_id]||[]).push({r:+x.refine||0,o:Array.isArray(x.opts)?x.opts:[],...sharedSlots(x),p:+x.price,players:+x.players,reports:+x.reports,newest:Date.parse(x.newest)||null,sellers:+x.sellers||0,s:true})});
      Object.values(by).forEach(a=>a.sort((x,y)=>x.r-y.r||x.o.length-y.o.length||x.p-y.p));SHARED_P[srv]={at:Date.now(),rows:by,err:""}})
    .catch(e=>{SHARED_P[srv]={at:Date.now(),rows:(c||{}).rows||{},err:e.message}})
    .finally(()=>{SHARED_LOADING=null;if(state.tab==="market")renderPrices()})}
const sharedTxt=x=>`${x.players} players · ${x.reports} report${x.reports>1?"s":""}${x.newest?` · newest ${agoTxt(x.newest)}`:""}`;
// post this server's prices you typed (plain and copies) as reports. The database skips repeats from the last hour and anything past the daily limits
async function sharePrices(){const srv=state.mktServer,rows=[];
  for(const id in state.prices){if(state.prices[id]>0)rows.push({server:srv,item_id:+id,refine:0,opts:[],cards:[],enchant:null,egg:null,price:Math.round(state.prices[id]),selling:!!state.sell[id]});
    (state.priceVars[id]||[]).forEach(x=>{if(x.p>0)rows.push({server:srv,item_id:+id,refine:x.r,opts:x.o.map(o=>({k:o.k,v:o.v})),cards:(x.c||[]).filter(Boolean),enchant:x.e||null,egg:x.egg||null,price:Math.round(x.p),selling:!!x.sell})})}
  if(!rows.length){showToast("Type some prices first, then share them.");return}
  const sent=rows.slice(0,200);
  try{const r=await sb("/rest/v1/reports",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(sent)}),n=(r||[]).length;
    showToast(`Shared ${n} price${n===1?"":"s"}${n<rows.length?`; ${rows.length-n} skipped (shared in the last hour, or past today's limit)`:""}. Thanks!`,6000);loadShared(true)}
  catch(e){showToast("Couldn't share: "+e.message,6000)}}
let UNSHARE_ARMED=false;
async function unsharePrices(){if(!UNSHARE_ARMED){UNSHARE_ARMED=true;renderShared();setTimeout(()=>{UNSHARE_ARMED=false;renderShared()},4000);return}
  UNSHARE_ARMED=false;try{await sb(`/rest/v1/reports?user_id=eq.${encodeURIComponent(AUTH.user.id)}`,{method:"DELETE"});showToast("Your shared reports are deleted.");loadShared(true)}
  catch(e){showToast("Couldn't delete them: "+e.message,6000)}renderShared()}
// ---- selling: a price marked DM me (state.sell, or sell on a copy) is shared as selling, and buyers see who sells it ----
// unticking DM me on an item takes back your selling reports for it on this server, so buyers stop seeing you at once
async function unsell(id){if(!AUTH)return;
  try{await sb(`/rest/v1/reports?user_id=eq.${encodeURIComponent(AUTH.user.id)}&server=eq.${state.mktServer}&item_id=eq.${+id}&selling=is.true`,{method:"DELETE"});
    delete SELLERS[state.mktServer+":"+id];loadShared(true)}catch(e){showToast("Couldn't take back your listing: "+e.message,6000)}}
// the sellers of an item, shown under it: each one's Discord name, @username, copy, price and when, with a link to their profile
const SELLERS={},SELLERS_OPEN=new Set();
async function toggleSellers(id){const k=state.mktServer+":"+id;if(SELLERS_OPEN.has(k)){SELLERS_OPEN.delete(k);renderPrices();return}SELLERS_OPEN.add(k);renderPrices();
  try{SELLERS[k]=(await sb("/rest/v1/rpc/sellers",{method:"POST",body:JSON.stringify({srv:state.mktServer,item:+id})}))||[]}catch(e){SELLERS[k]={err:e.message}}renderPrices()}
function sellersHtml(id){const k=state.mktServer+":"+id;if(!SELLERS_OPEN.has(k))return "";const L=SELLERS[k];
  if(!L)return `<div class="mktSellerList note">Loading sellers…</div>`;if(L.err)return `<div class="mktSellerList note bad">Couldn't load sellers: ${esc(L.err)}</div>`;
  if(!L.length)return `<div class="mktSellerList note">Nobody sells it right now.</div>`;
  return `<div class="mktSellerList">${L.map(x=>{const id=/^\d+$/.test(x.discord_id||"")?x.discord_id:"";
    return `<div class="mktSeller"><b>${esc(x.discord_name||x.username||"Discord player")}</b>${x.username?` <span class="note">@${esc(x.username)}</span>`:""}
      ${(()=>{const v={r:+x.refine||0,o:Array.isArray(x.opts)?x.opts:[],...sharedSlots(x)};return copyBare(v)?"":`<span class="note">${esc(varTxt(v))}</span>`})()}<b class="mono">${fmtN(+x.price)} z</b><span class="note">${agoTxt(Date.parse(x.at))}</span>
      ${id?`<a class="small discordLink" href="https://discord.com/users/${id}" target="_blank" rel="noopener noreferrer" title="Opens their Discord profile, where you can message them">Message on Discord</a>`:""}</div>`}).join("")}
    <div class="note">Trade in game, and check the shop before you pay: the site only shows what sellers told it.</div></div>`}
// your empty prices (0) on this server take the shared price
function useShared(ids){let n=0;ids.forEach(id=>{const s=sharedPlain(id);if(s&&!(state.prices[id]>0)){state.prices[id]=s.p;n++}});if(n){save();renderAll()}renderPrices();return n}

// ---- cloud backup: the Copy backup text (every account), compressed, one per Discord account ----
let CLOUD={at:null,loaded:false},CLOUD_ARMED="";
async function cloudInfo(){if(!AUTH)return;try{const r=await sb("/rest/v1/backups?select=updated_at");CLOUD={at:r&&r[0]?Date.parse(r[0].updated_at):null,loaded:true}}catch(e){CLOUD={at:null,loaded:true,err:e.message}}renderShared()}
const cloudArm=k=>{CLOUD_ARMED=k;renderShared();setTimeout(()=>{if(CLOUD_ARMED===k){CLOUD_ARMED="";renderShared()}},4000)};
async function cloudSave(){if(CLOUD.at&&CLOUD_ARMED!=="save"){cloudArm("save");return}CLOUD_ARMED="";
  try{save();const data=await packShare(bkAllText());if(data.length>2e6){$("bkMsg").textContent="This backup is too big for the cloud. Use Copy backup instead.";return}
    await sb("/rest/v1/backups?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({user_id:AUTH.user.id,data})});
    $("bkMsg").textContent="Saved to the cloud.";cloudInfo();syncCheck()}catch(e){$("bkMsg").textContent="Couldn't save to the cloud: "+e.message;renderShared()}}
async function cloudLoad(){try{const r=await sb("/rest/v1/backups?select=data,updated_at");if(!r||!r[0]){$("bkMsg").textContent="There's no cloud backup yet.";return}
    $("bkText").value=await unpackShare(r[0].data);$("bkMsg").textContent=`Your cloud backup from ${new Date(Date.parse(r[0].updated_at)).toLocaleString("en-GB")} is in the box below. Click Restore from text (twice) to use it.`}
  catch(e){$("bkMsg").textContent="Couldn't load the cloud backup: "+e.message}}
async function cloudDelete(){if(CLOUD_ARMED!=="del"){cloudArm("del");return}CLOUD_ARMED="";
  try{await sb(`/rest/v1/backups?user_id=eq.${encodeURIComponent(AUTH.user.id)}`,{method:"DELETE"});$("bkMsg").textContent="Cloud backup deleted.";cloudInfo()}
  catch(e){$("bkMsg").textContent="Couldn't delete it: "+e.message}}

// ---- sync: while you're logged in, the cloud backup follows this browser's accounts. At login and on each page load: no cloud
// copy yet, this browser's goes up; no character here, the cloud's comes down; otherwise whichever side changed since the last
// sync wins, and when both did (or they never synced and differ) you choose. Changes then go up on their own (every 30 s), after
// a check that the cloud copy didn't change on another device meanwhile. SYNC: the last sync, {uid, at: the cloud copy's time
// (ms), h: this browser's accounts' hash then}, kept apart from the accounts like the login ----
const SYNC_KEY="rozero-farm-planner-sync";
let SYNC=null;try{SYNC=JSON.parse(localStorage.getItem(SYNC_KEY)||"null")}catch(e){}
const syncSave=x=>{SYNC=x;try{x?localStorage.setItem(SYNC_KEY,JSON.stringify(x)):localStorage.removeItem(SYNC_KEY)}catch(e){}};
let SYNC_ASK=null,SYNC_BUSY=false; // SYNC_ASK: the cloud copy waiting for your choice (nothing goes up meanwhile)
const textHash=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
// an account has a character once it has a job picked, a character saved or a logged entry
const acctsOf=t=>{try{const d=JSON.parse(t);return Array.isArray(d&&d.accounts)?d.accounts:[]}catch(e){return []}};
const hasChar=t=>acctsOf(t).some(a=>{const d=a&&a.data;return !!d&&(!!d.job||Object.keys(d.chars||{}).length>0||(d.sessions||[]).some(s=>s&&(s.entries||[]).length))});
// what to do: "up" (send this browser's), "down" (take the cloud's), "same" (note it as synced), "ask", or "none"
function syncPlan({local,cloud,cloudAt,base}){const lh=textHash(local);
  if(cloud==null)return hasChar(local)?"up":"none";
  if(base&&base.at===cloudAt)return base.h===lh?"none":"up";       // only this browser changed (or nothing did)
  if(cloud===local)return "same";
  if(!hasChar(local))return hasChar(cloud)?"down":"same";
  if(base&&base.h===lh)return "down";                               // only the cloud changed
  return "ask"}
// a line about one side for the choice: accounts, characters (jobs) and the last logged entry
function syncSummary(t){const as=acctsOf(t),jobs=[...new Set(as.flatMap(a=>Object.keys((a&&a.data&&a.data.chars)||{})))],
  last=Math.max(0,...as.flatMap(a=>((a&&a.data&&a.data.sessions)||[]).flatMap(s=>(s&&s.entries||[]).map(e=>+e.t||0))));
  return `${as.length} account${as.length===1?"":"s"}${jobs.length?` · ${jobs.slice(0,4).join(", ")}${jobs.length>4?"…":""}`:" · no character"}${last?` · last logged ${agoTxt(last)}`:""}`}
async function syncUp(text){const data=await packShare(text);if(data.length>2e6){showToast("Your accounts are too big for the cloud backup.",6000);return false}
  const r=await sb("/rest/v1/backups?on_conflict=user_id&select=updated_at",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({user_id:AUTH.user.id,data})});
  syncSave({uid:AUTH.user.id,at:Date.parse(r&&r[0]&&r[0].updated_at)||Date.now(),h:textHash(text)});CLOUD={at:SYNC.at,loaded:true};renderShared();return true}
function syncDown(ctext,at){const err=writeAccounts(JSON.parse(ctext));if(err){showToast(err,6000);return}
  syncSave({uid:AUTH.user.id,at,h:textHash(acctsText())});reloadView("Loaded your accounts from the cloud")}
async function syncCheck(){if(!AUTH||SYNC_ASK||SYNC_BUSY)return;SYNC_BUSY=true;
  try{const r=await sb("/rest/v1/backups?select=data,updated_at"),c=r&&r[0],local=acctsText(),at=c?Date.parse(c.updated_at):null;
    const base=SYNC&&SYNC.uid===AUTH.user.id?SYNC:null,cloud=c?(base&&base.at===at?null:await unpackShare(c.data)):null;
    const plan=c&&base&&base.at===at?(base.h===textHash(local)?"none":"up"):syncPlan({local,cloud,cloudAt:at,base});
    if(plan==="up")await syncUp(local);
    else if(plan==="down")syncDown(cloud,at);
    else if(plan==="same")syncSave({uid:AUTH.user.id,at,h:textHash(local)});
    else if(plan==="ask"){SYNC_ASK={cloud,at};renderSyncAsk()}}
  catch(e){}finally{SYNC_BUSY=false}}
// the choice when both sides changed: what each holds, and Use the cloud's / Keep this browser's / Decide later
function renderSyncAsk(){const el=$("syncAsk");if(!el)return;if(!SYNC_ASK){el.hidden=true;return}
  el.hidden=false;el.innerHTML=`<b>Your cloud backup and this browser have different accounts.</b>
    <div class="syncSides"><div><span class="note">Cloud (saved ${agoTxt(SYNC_ASK.at)})</span>${esc(syncSummary(SYNC_ASK.cloud))}</div><div><span class="note">This browser</span>${esc(syncSummary(acctsText()))}</div></div>
    <div class="bar"><button type="button" data-syncask="cloud">Use the cloud's</button><button type="button" data-syncask="local">Keep this browser's</button><button type="button" class="small ghost" data-syncask="later">Decide later</button></div>
    <span class="note">The one you don't pick is replaced. Copy backup on the Account tab keeps a copy of this browser's first.</span>`}
$("syncAsk").addEventListener("click",async e=>{const b=e.target.closest("[data-syncask]");if(!b||!SYNC_ASK)return;const k=b.dataset.syncask,a=SYNC_ASK;
  if(k==="cloud"){syncDown(a.cloud,a.at);return}
  $("syncAsk").hidden=true;if(k==="later"){showToast("Sync is paused until you choose (Account tab).");renderShared();return}
  SYNC_ASK=null;try{await syncUp(acctsText());showToast("Saved this browser's accounts to the cloud.")}catch(err){showToast("Couldn't save to the cloud: "+err.message,6000)}});
// every 30 s: send this browser's changes up, after checking the cloud copy didn't change elsewhere (else syncCheck decides)
async function syncTick(){setTimeout(syncTick,30000);if(!AUTH||SYNC_ASK||SYNC_BUSY||!SYNC||SYNC.uid!==AUTH.user.id||textHash(acctsText())===SYNC.h)return;
  try{const r=await sb("/rest/v1/backups?select=updated_at"),at=r&&r[0]?Date.parse(r[0].updated_at):null;if(at===SYNC.at){SYNC_BUSY=true;try{await syncUp(acctsText())}finally{SYNC_BUSY=false}}else syncCheck()}catch(e){}}
setTimeout(syncTick,30000);

// the login bars on the Market and Account tabs
function renderShared(){const on=sharedOn();["mktShare","cloudBar"].forEach(k=>{const el=$(k);if(el)el.hidden=!on});if(!on)return;
  const who=AUTH?`<span class="note">Logged in as <b>${esc(AUTH.user.name)}</b></span>`:"",out=AUTH?`<button type="button" class="small ghost" data-auth="logout">Log out</button>`:"";
  const inBtn=`<button type="button" class="discordBtn" data-auth="login">Log in with Discord</button>`,c=SHARED_P[state.mktServer];
  $("mktShare").innerHTML=`<div class="bar">${AUTH?`${who}<button type="button" data-shared="share" title="Post this server's prices you typed, so everyone sees them. Up to 200 a day">Share my prices</button><button type="button" class="small ${UNSHARE_ARMED?"danger":"ghost"}" data-shared="unshare">${UNSHARE_ARMED?"Click again to delete them":"Delete my shared reports"}</button>${out}`
      :`${inBtn}<span class="note">to share your prices. Everyone's prices show without logging in; yours always win.</span>`}
    <label class="bar grow mktEveryone"><input type="checkbox" data-shared="everyone"${state.mkt.everyone?" checked":""}> show everyone's items</label>
    <button type="button" class="small" data-shared="fill" title="Your items with no price take the shared one">Use shared for my blanks</button></div>
    ${c&&c.err?`<div class="note bad">Couldn't load shared prices: ${esc(c.err)}</div>`:""}`;
  $("cloudBar").innerHTML=AUTH?`${who}<button type="button" data-cloud="save">${CLOUD_ARMED==="save"?"Click again to replace the cloud copy":"Save to cloud"}</button><button type="button" data-cloud="load"${CLOUD.at?"":" disabled"}>Load from cloud</button>
      <button type="button" class="small ${CLOUD_ARMED==="del"?"danger":"ghost"}" data-cloud="del"${CLOUD.at?"":" disabled"}>${CLOUD_ARMED==="del"?"Click again to delete it":"Delete cloud copy"}</button>
      <span class="note">${SYNC_ASK?`Sync paused: <a href="#" data-cloud="ask">choose which accounts to keep</a>`:CLOUD.loaded?CLOUD.at?`synced ${agoTxt(CLOUD.at)}`:"no cloud copy yet":""}</span>${out}`
    :`${inBtn}<span class="note">to keep a backup of every account online, only yours to read, and load it on any device.</span>`}
ROOTQ("#mktShare,#cloudBar").forEach(el=>el.addEventListener("click",e=>{const a=e.target.closest("[data-auth]");if(a){a.dataset.auth==="login"?login():logout();return}
  const s=e.target.closest("[data-shared]");if(s&&s.dataset.shared!=="everyone"){const k=s.dataset.shared;
    if(k==="share")sharePrices();else if(k==="unshare")unsharePrices();else if(k==="fill"){const n=useShared(Object.keys(state.prices));showToast(n?`${n} price${n>1?"s":""} filled from the shared ones`:"No blanks with a shared price")}return}
  const c=e.target.closest("[data-cloud]");if(c){e.preventDefault();({save:cloudSave,load:cloudLoad,del:cloudDelete,ask:renderSyncAsk})[c.dataset.cloud]()}}));
$("mktShare").addEventListener("change",e=>{if(e.target.matches('[data-shared="everyone"]')){state.mkt.everyone=e.target.checked;save();renderPrices()}});
renderShared();if(sharedOn()){authCallback();if(AUTH){cloudInfo();syncCheck()}}
