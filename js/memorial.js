// ---- Memorial dungeons tab: the Jellostone tracker (fragments and stones you have, the stone being crafted and when it's ready), the
// Expedition pieces you want and what they still need, the memorial dungeons and their rewards, and the memorial gear's enchants
// (data/memorial.js). Saved per account in state.jello: frag / stone {item id: count}, craft {id: Jellostone, due: ms} or none,
// want [Expedition item ids], crystals (Faintly Glowing Crystals you have) ----
const DAY_MS=864e5,WEEKDAY=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const jello=()=>state.jello;
// Jellostones the wanted Expedition pieces take, by stone id
function jelloNeed(){const n={};JELLO.forEach(j=>n[j.stone[0]]=0);
  EXPEDITION.filter(x=>jello().want.includes(x.id)).forEach(x=>Object.entries(x.stones).forEach(([id,k])=>n[id]+=k));return n}
// what's still missing per type: stones (after the ones you have and the one crafting) and the fragments for them
function jelloShort(){const J=jello(),need=jelloNeed();
  return JELLO.map(j=>{const s=j.stone[0],f=j.frag[0],stones=Math.max(0,need[s]-(J.stone[s]||0)-(J.craft&&J.craft.id===s?1:0));
    return {j,need:need[s],stones,frags:Math.max(0,stones*JELLO_PER_STONE-(J.frag[f]||0))}})}
// the day the last stone you're missing is ready, going on one Poring Village run a day from tomorrow (a weekday gives its own
// fragment, a weekend day's box one of the five at random, counted as a fifth of each) and one stone crafting at a time.
// null when nothing is missing, Infinity when it takes over two years
function jelloReady(now=Date.now()){const J=jello(),short=jelloShort(),left={},f={};
  short.forEach(x=>{left[x.j.stone[0]]=x.stones;f[x.j.stone[0]]=J.frag[x.j.frag[0]]||0});
  if(!short.some(x=>x.stones))return null;
  let free=J.craft?Math.max(now,J.craft.due):now,last=free;const day0=new Date(now);day0.setHours(12,0,0,0);
  // queue a craft for every 5 fragments in hand that a missing stone needs (the type missing most first), each after the one before
  const craft=t=>{for(;;){const s=JELLO.map(j=>j.stone[0]).filter(s=>left[s]>0&&f[s]>=JELLO_PER_STONE-1e-9).sort((a,b)=>left[b]-left[a])[0];
    if(s==null)return;f[s]-=JELLO_PER_STONE;left[s]--;free=Math.max(free,t)+JELLO_CRAFT_DAYS*DAY_MS;last=free}};
  craft(now);
  for(let i=1;i<=730;i++){if(!Object.values(left).some(v=>v>0))return last;
    const t=day0.getTime()+i*DAY_MS,j=JELLO.find(x=>x.day===new Date(t).getDay());
    if(j)f[j.stone[0]]+=1;else JELLO.forEach(x=>f[x.stone[0]]+=1/JELLO.length);
    craft(t)}
  return Object.values(left).some(v=>v>0)?Infinity:last}
const durTxt=ms=>{if(ms<=0)return "ready";const h=Math.ceil(ms/36e5),d=Math.floor(h/24);return d?`${d}d ${h%24}h`:`${h}h`};
function renderJello(){const J=jello(),now=Date.now(),wd=new Date(now).getDay(),today=JELLO.find(j=>j.day===wd),short=jelloShort();
  $("jelloToday").innerHTML=`Today is ${WEEKDAY[wd]} (this device's clock): Poring Village gives ${today?`a ${itemIcon(today.frag[0],1,"il")}<b>${esc(today.frag[1])}</b>`:`a ${itemIcon(JELLO_BOX[0],1,"il")}<b>${esc(JELLO_BOX[1])}</b> (one of the five fragments)`}.`;
  $("jelloRows").innerHTML=short.map(({j,need,stones,frags})=>{const s=j.stone[0],f=j.frag[0],have=J.frag[f]||0;
    return `<tr${today===j?' class="sel"':""}><td class="name">${WEEKDAY[j.day]}</td><td class="name">${memName(j.frag)}</td>
      <td><input class="w-xs" type="number" min="0" step="1" data-jfrag="${f}" value="${have||""}" placeholder="0" aria-label="${esc(j.frag[1])} you have"> <button type="button" class="small" data-jadd="${f}" title="Add one">+1</button></td>
      <td class="name">${memName(j.stone)}</td><td><input class="w-xs" type="number" min="0" step="1" data-jstone="${s}" value="${J.stone[s]||""}" placeholder="0" aria-label="${esc(j.stone[1])} you have"></td>
      <td>${need||"–"}</td><td>${stones?`<span class="pill down">${stones} stone${stones>1?"s":""}</span> ${frags} fragments`:need?'<span class="pill up">done</span>':"–"}</td>
      <td><button type="button" class="small" data-jcraft="${s}"${J.craft||have<JELLO_PER_STONE?" disabled":""} title="Use ${JELLO_PER_STONE} fragments and start the ${JELLO_CRAFT_DAYS}-day craft">Craft</button></td></tr>`}).join("");
  const c=J.craft,cs=c&&JELLO.find(j=>j.stone[0]===c.id);
  $("jelloCraft").innerHTML=cs?`Crafting <b>${esc(cs.stone[1])}</b>: ${c.due<=now?'<span class="pill up">ready</span>':`ready in ${durTxt(c.due-now)}`}
      <label class="bar">ready at <input type="datetime-local" data-jdue value="${dtLocal(c.due)}" title="Set it to the time the game shows, if you started earlier"></label>
      <button type="button" class="small primary" data-jcollect>Collect</button> <button type="button" class="small danger" data-jcancel title="Give the ${JELLO_PER_STONE} fragments back">Cancel</button>`
    :`No stone crafting. One at a time, ${JELLO_CRAFT_DAYS} days each, at the Memory Craftsman's Workshop.`;
  const need=Object.values(jelloNeed()).reduce((a,b)=>a+b,0),miss=short.reduce((a,x)=>a+x.stones,0),fr=short.reduce((a,x)=>a+x.frags,0),rd=jelloReady(now);
  const nPieces=J.want.length,cry=EXPEDITION_CRYSTALS[2]*nPieces;
  $("jelloTiles").innerHTML=`<div class="tile"><div class="k">Jellostones short</div><div class="v mono">${nPieces?miss:"–"}</div><div class="s">${nPieces?`of ${need} for ${nPieces} piece${nPieces>1?"s":""}`:"tick the pieces you want below"}</div></div>
    <div class="tile"><div class="k">Fragments short</div><div class="v mono">${nPieces?fr:"–"}</div><div class="s">${JELLO_PER_STONE} make a stone</div></div>
    <div class="tile now"><div class="k">All stones by</div><div class="v mono">${rd==null?(nPieces?"now":"–"):rd===Infinity?"> 2 years":fmtD(rd)}</div><div class="s">${rd==null||rd===Infinity?"":`~${Math.ceil((rd-now)/DAY_MS)} days, a run a day from tomorrow`}</div></div>`;
  $("expRows").innerHTML=EXPEDITION.map(x=>`<tr${J.want.includes(x.id)?' class="sel"':""}><td><input type="checkbox" data-jwant="${x.id}"${J.want.includes(x.id)?" checked":""} aria-label="Want ${esc(x.name)}"></td>
    <td class="name">${memName([x.id,x.name])}</td><td class="name">${memName(x.from)}</td>
    <td class="name"><div>${EXPEDITION_CRYSTALS[2]} × ${memName(EXPEDITION_CRYSTALS)}</div>${Object.entries(x.stones).map(([id,k])=>`<div>${k} × ${memName(JELLO.find(j=>j.stone[0]===+id).stone)}</div>`).join("")}</td></tr>`).join("");
  $("expCrystals").value=J.crystals||"";
  $("expCryNote").textContent=nPieces?`${fmtN(cry)} ${EXPEDITION_CRYSTALS[1]} for them (${EXPEDITION_CRYSTALS[2]} each)${cry>(J.crystals||0)?`: ${fmtN(cry-(J.crystals||0))} to go`:": you have them"}.`:"";
  renderEnchants()}
// an item with its icon, opening its details (a reward line with no item id, just its text)
const memName=([id,name])=>id?`${itemIcon(id,1,"il")}${infoLink(infoKind(id),id,name)}`:esc(name);
// an item in a reward list, with how many
const memItem=([id,name,n])=>`${memName([id,name])}${n?` <span class="note">${esc(n)}</span>`:""}`;
function renderMemorials(){
  $("memRows").innerHTML=MEMORIALS.map(m=>`<tr><td class="name"><b>${esc(m.name)}</b></td><td>${m.lv}</td><td class="name">${esc(m.npc)}<div>${naviTag(m.at)}</div></td>
    <td class="name">${m.normal.map(x=>`<div>${memItem(x)}</div>`).join("")}</td><td class="name">${m.hard?m.hard.map(x=>`<div>${memItem(x)}</div>`).join(""):"–"}</td></tr>`).join("");
  $("memNpcs").innerHTML=MEM_NPCS.map(([n,at,what])=>`<tr><td class="name"><b>${esc(n)}</b></td>
    <td>${[].concat(at).map(a=>`<div>${naviTag(a)}</div>`).join("")}</td><td class="name">${esc(what)}</td></tr>`).join("")}
function renderEnchants(){const g=$("enchGear").value||"subjugation",p=$("enchPool").value||"low",rows=MEM_ENCHANT[g][p];
  $("enchRows").innerHTML=rows.map(([l,v])=>`<tr><td class="name">${l==="spirit"?"A job spirit (below)":esc(l)}</td><td>${v}%</td></tr>`).join("");
  $("enchSpirits").innerHTML=p==="armor"?MEM_SPIRITS[g].map(s=>`<div>${esc(s)}</div>`).join(""):""}
function renderMem(){renderJello();renderMemorials()}
const jelloSave=()=>{save();renderJello()};
$("jelloCard").addEventListener("input",e=>{const J=jello(),d=e.target.dataset,v=Math.max(0,Math.round(num(e.target.value)));
  if(d.jfrag){J.frag[d.jfrag]=v;save();return}if(d.jstone){J.stone[d.jstone]=v;save();return}});
$("jelloCard").addEventListener("change",e=>{const J=jello(),d=e.target.dataset;
  if(d.jfrag!=null||d.jstone!=null){renderJello();return}
  if(d.jdue!=null&&J.craft){const t=new Date(e.target.value).getTime();if(Number.isFinite(t))J.craft.due=t;jelloSave()}});
$("jelloCard").addEventListener("click",e=>{const J=jello(),b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.jadd){J.frag[d.jadd]=(J.frag[d.jadd]||0)+1;jelloSave();return}
  if(d.jcraft){const j=JELLO.find(x=>x.stone[0]===+d.jcraft),f=j.frag[0];if(J.craft||(J.frag[f]||0)<JELLO_PER_STONE)return;
    J.frag[f]-=JELLO_PER_STONE;J.craft={id:j.stone[0],due:Date.now()+JELLO_CRAFT_DAYS*DAY_MS};jelloSave();return}
  if(d.jcollect!=null&&J.craft){J.stone[J.craft.id]=(J.stone[J.craft.id]||0)+1;delete J.craft;jelloSave();showToast("Jellostone collected");return}
  if(d.jcancel!=null&&J.craft){const j=JELLO.find(x=>x.stone[0]===J.craft.id);J.frag[j.frag[0]]=(J.frag[j.frag[0]]||0)+JELLO_PER_STONE;delete J.craft;jelloSave()}});
$("expCard").addEventListener("change",e=>{const J=jello();
  if(e.target.dataset.jwant){const id=+e.target.dataset.jwant;J.want=J.want.filter(x=>x!==id);if(e.target.checked)J.want.push(id);jelloSave();return}
  if(e.target.id==="expCrystals"){J.crystals=Math.max(0,Math.round(num(e.target.value)));jelloSave()}});
$("enchCard").addEventListener("change",e=>{if(e.target.id==="enchGear"||e.target.id==="enchPool")renderEnchants()});
// keep the craft countdown current while the tab is open
(function jelloLoop(){if(!$("jelloCard").hidden&&jello().craft)renderJello();setTimeout(jelloLoop,30000)})();
