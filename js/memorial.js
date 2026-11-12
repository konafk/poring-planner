// ---- Memorial dungeons tab: the Jellostone tracker (fragments and stones you have, the stone being crafted and when it's ready), the
// Expedition, Contingent and Conqueror pieces you want and what they still need, the memorial dungeons and their rewards, and the
// memorial gear's enchants (data/memorial.js). Saved per account in state.jello: frag / stone {item id: count}, craft {id: Jellostone,
// due: ms} or none, want [MEM_LADDER keys], crystals (Faintly Glowing Crystals you have) ----
const DAY_MS=864e5,WEEKDAY=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const jello=()=>state.jello;
// the upgrades you want (MEM_LADDER rows)
const memWanted=()=>MEM_LADDER.filter(x=>jello().want.includes(x.key));
// Jellostones the wanted pieces take, by stone id
function jelloNeed(){const n={};JELLO.forEach(j=>n[j.stone[0]]=0);
  memWanted().forEach(x=>Object.entries(x.stones).forEach(([id,k])=>n[id]+=k));return n}
// crystals the wanted pieces take: [[crystal [id, name], how many]], Faintly Glowing Crystal first
const memCrystals=()=>{const m=new Map();memWanted().forEach(x=>m.set(x.crystals[1],[x.crystals,(m.has(x.crystals[1])?m.get(x.crystals[1])[1]:0)+x.crystals[2]]));return [...m.values()]};
// the Uses cell of an upgrade: its crystals and Jellostones
const memUses=x=>`<div>${x.crystals[2]} × ${memName(x.crystals)}</div>${Object.entries(x.stones).map(([id,k])=>`<div>${k} × ${memName(JELLO.find(j=>j.stone[0]===+id).stone)}</div>`).join("")}`;
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
  const nPieces=J.want.length,crys=memCrystals(),fg=crys.find(([c])=>c===EXPEDITION_CRYSTALS),cry=fg?fg[1]:0;
  $("jelloTiles").innerHTML=`<div class="tile"><div class="k">Jellostones short</div><div class="v mono">${nPieces?miss:"–"}</div><div class="s">${nPieces?`of ${need} for ${nPieces} piece${nPieces>1?"s":""}`:"tick the pieces you want below"}</div></div>
    <div class="tile"><div class="k">Fragments short</div><div class="v mono">${nPieces?fr:"–"}</div><div class="s">${JELLO_PER_STONE} make a stone</div></div>
    <div class="tile now"><div class="k">All stones by</div><div class="v mono">${rd==null?(nPieces?"now":"–"):rd===Infinity?"> 2 years":fmtD(rd)}</div><div class="s">${rd==null||rd===Infinity?"":`~${Math.ceil((rd-now)/DAY_MS)} days, a run a day from tomorrow`}</div></div>`;
  $("expRows").innerHTML=EXPEDITION.map(x=>`<tr${J.want.includes(x.id)?' class="sel"':""}><td><input type="checkbox" data-jwant="${x.id}"${J.want.includes(x.id)?" checked":""} aria-label="Want ${esc(x.name)}"></td>
    <td class="name">${memName([x.id,x.name])}</td><td class="name">${memName(x.from)}</td>
    <td class="name">${memUses({...x,crystals:EXPEDITION_CRYSTALS})}</td></tr>`).join("");
  $("expCrystals").value=J.crystals||"";
  $("expCryNote").textContent=cry?`${fmtN(cry)} ${EXPEDITION_CRYSTALS[1]} for the Expedition pieces you want (${EXPEDITION_CRYSTALS[2]} each)${cry>(J.crystals||0)?`: ${fmtN(cry-(J.crystals||0))} to go`:": you have them"}.`:"";
  renderLater();renderEnchants()}
// the Contingent or Conqueror pieces, by the rung picked (data/memorial.js LATER_RUNGS), and the crystals the ones you want take
function renderLater(){const J=jello(),r=LATER_RUNGS[$("laterRung").value]||LATER_RUNGS.contingent;
  $("laterRows").innerHTML=r.pieces.map(x=>{const on=J.want.includes(x.name);
    return `<tr${on?' class="sel"':""}><td><input type="checkbox" data-jwant="${esc(x.name)}"${on?" checked":""} aria-label="Want ${esc(x.name)}"></td>
    <td class="name">${esc(x.name)}</td><td>${x.branch}</td><td class="name">${memName(x.from)}</td><td class="name">${memUses({...x,crystals:r.crystals})}</td></tr>`}).join("");
  const later=memCrystals().filter(([c])=>c!==EXPEDITION_CRYSTALS);
  $("laterCryNote").textContent=later.length?`For the Contingent and Conqueror pieces you want: ${later.map(([c,n])=>`${fmtN(n)} ${c[1]}`).join(", ")}.`:""}
// an item with its icon, opening its details (a reward line with no item id, just its text)
const memName=([id,name])=>id?`${itemIcon(id,1,"il")}${infoLink(infoKind(id),id,name)}`:esc(name);
// an item in a reward list, with how many
const memItem=([id,name,n])=>`${memName([id,name])}${n?` <span class="note">${esc(n)}</span>`:""}`;
function renderMemorials(){
  $("memRows").innerHTML=MEMORIALS.map(m=>`<tr><td class="name"><b>${esc(m.name)}</b></td><td>${m.lv}</td><td class="name">${esc(m.npc)}<div>${naviTag(m.at)}</div></td>
    <td class="name">${m.normal.map(x=>`<div>${memItem(x)}</div>`).join("")}</td><td class="name">${m.hard?m.hard.map(x=>`<div>${memItem(x)}</div>`).join(""):"–"}</td></tr>`).join("");
  $("memNpcs").innerHTML=MEM_NPCS.map(([n,at,what])=>`<tr><td class="name"><b>${esc(n)}</b></td>
    <td>${[].concat(at).map(a=>`<div>${naviTag(a)}</div>`).join("")}</td><td class="name">${esc(what)}</td></tr>`).join("")}
// each Job Essence a gear's +9 armor rolls: {x: the essence, v: its %}
const memEssences=g=>{const m=MEM_ESSENCE[g];return ESSENCES.filter(x=>x.tier===m.tier).map(x=>({x,v:m.lv[/Lv\.(\d)$/.exec(x.name)[1]]})).filter(e=>e.v)};
const ENCH_HINT="One random enchant in card slot 4 for 100,000 zeny. Reset: 10,000,000 zeny (70%) or a Zelstar.";
function renderEnchants(){const g=$("enchGear").value||"subjugation",veg=g==="veggie";$("enchPool").disabled=veg;
  $("enchHint").textContent=veg?`One random line, on the one you're wearing, for ${fmtN(VEGGIE_ENCHANT.mats[0][2])} ${VEGGIE_ENCHANT.mats[0][1]} and ${fmtN(VEGGIE_ENCHANT.zeny)} zeny: ${VEGGIE_ENCHANT.ok}% success, a failure breaks it. A new line replaces the old one the same way. Lines as reported from other Zero servers, with no chances.`:ENCH_HINT;
  if(veg){$("enchFxHead").hidden=true;$("enchEssences").textContent="";
    $("enchRows").innerHTML=VEGGIE_ENCHANT.lines.map(l=>`<tr><td class="name">${esc(l)}</td><td>–</td></tr>`).join("");return}
  const p=$("enchPool").value||"low",rows=MEM_ENCHANT[g][p],armor=p==="armor";
  const line=(name,v,fx)=>`<tr><td class="name">${name}</td><td>${v}%</td>${armor?`<td class="name enchFx">${esc(fx)}</td>`:""}</tr>`;
  $("enchFxHead").hidden=!armor;
  $("enchRows").innerHTML=rows.map(([l,v])=>{if(l!=="essence")return line(esc(l),v,"");const es=memEssences(g),rest=Math.round((v-es.reduce((t,e)=>t+e.v,0))*1000)/1000;
    return es.map(e=>line(memName([e.x.id,e.x.name]),e.v,e.x.t)).join("")+(rest>0?line("Ninja's essences",rest,"Not in the game client"):"")}).join("");
  $("enchEssences").textContent=armor?`Job Essences together: ${rows.find(r=>r[0]==="essence")[1]}%. Pick the one you get from the Armor row's affix list on the Character tab.`:""}
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
  if(e.target.dataset.jwant){const k=e.target.dataset.jwant,id=/^\d+$/.test(k)?+k:k;J.want=J.want.filter(x=>x!==id);if(e.target.checked)J.want.push(id);jelloSave();return}
  if(e.target.id==="expCrystals"){J.crystals=Math.max(0,Math.round(num(e.target.value)));jelloSave()}});
$("laterCard").addEventListener("change",e=>{if(e.target.id==="laterRung"){renderLater();return}
  if(e.target.dataset.jwant){const J=jello(),k=e.target.dataset.jwant;J.want=J.want.filter(x=>x!==k);if(e.target.checked)J.want.push(k);jelloSave()}});
$("enchCard").addEventListener("change",e=>{if(e.target.id==="enchGear"||e.target.id==="enchPool")renderEnchants()});
// keep the craft countdown current while the tab is open
(function jelloLoop(){if(!$("jelloCard").hidden&&jello().craft)renderJello();setTimeout(jelloLoop,30000)})();
