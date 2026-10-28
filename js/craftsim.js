// ---- the Recipes tab's Brewing and Cooking simulators: the chance each Brewing recipe (data/recipes.js) / Cooking recipe (data/cookbooks.js) works for your
// stats, what a potion or dish costs you counting the failures, and a run of tries rolled the server's way. Formulas: rAthena's
// skill_produce_mix (pre-renewal), which roz.prontera.info's Crafting Calculator uses for brewing too; not measured on Zero Global.
// Both add a random term to the rate itself on every try, so a recipe has a worst, an average and a best chance.
// Rates are in 1/100 of a percent (10000 = 100%); a try works when a roll of 0–9999 is under the rate, so it's always 0.01% to 100%.
// Saved per account in state.craftSim = {brew: {...}, cook: {...}}: a stat left empty takes your character's ----
// a dish's level (its cookbook's): 12041–12070 are STR, INT, VIT, AGI, DEX, LUK dishes Lv 1–5 in turn, 12071–12100 Lv 6–10
const dishLv=id=>id<12071?(id-12041)%5+1:(id-12071)%5+6;
// the potions by name, the dishes by level
const BREW_RECIPES=RECIPE_LIST.filter(r=>r.cat==="Brewing").sort((a,b)=>itemName(a.id).localeCompare(itemName(b.id)));
const COOK_RECIPES=RECIPE_LIST.filter(r=>r.cat==="Cooking").sort((a,b)=>dishLv(a.id)-dishLv(b.id)||a.id-b.id);
const MEDICINE_BOWL=7134;
// the manual each potion needs in your inventory (not used up)
const BREW_MANUAL={501:7144,503:7144,504:7144,505:7144,605:7144,606:7144,7142:7144,545:7133,546:7133,547:7133,970:7127,7135:7128,
  7136:7129,7137:7130,7138:7131,7139:7132,12118:7434,12119:7434,12120:7434,12121:7434};
// each potion's difficulty: the rates its random term can add, all as likely. k = 1…100 (1…50 for Yellow Slim)
const rngList=(n,f)=>Array.from({length:n},(_,i)=>f(i+1));
// Red, Yellow and White Potion +20% and 0.1–10%, Alcohol +10% and 0.1–10%, the four bottles 0.1–10%, Yellow Slim Potion −0.1 to −5%,
// White Slim Potion and Glistening Coat −0.1 to −10%; the rest nothing
const BREW_GROUPS=[[[501,503,504],rngList(100,k=>2000+k*10)],[[970],rngList(100,k=>1000+k*10)],[[7135,7136,7137,7138],rngList(100,k=>k*10)],
  [[546],rngList(50,k=>-k*10)],[[547,7139],rngList(100,k=>-k*10)]];
const brewMods=id=>(BREW_GROUPS.find(g=>g[0].includes(id))||[,[0]])[1];
const BREW_KEYS={jobLv:[1,70],int:[1,999],dex:[1,999],luk:[1,999],pp:[0,10],pr:[0,10],hom:[0,5]};
const COOK_KEYS={baseLv:[1,99],dex:[1,999],luk:[1,999],mastery:[0,1999]};
// the cooking kits Global's client has, by the level they cook at (rAthena's 14 and 15, Royal and Fantastic, aren't in it)
const COOK_KITS=[[12125,11],[12126,12],[12127,13]];
const COOKBOOK=lv=>7471+lv; // Lv.1 Cookbook (7472) … Lv.10 Cookbook (7481)
// what a dish does, from its in-game text ("STR +1")
const dishFx=id=>((typeof ITEM_TEXT!=="undefined"&&ITEM_TEXT[id]||"").match(/\b(STR|AGI|VIT|INT|DEX|LUK) \+\d+/)||[""])[0];
// your character's numbers for the empty boxes: Prepare Potion and Potion Research from an Alchemist's skill tree, else maxed
const isAlch=()=>state.job==="Alchemist"&&hasTree(C());
function craftMine(){const c=C(),st=k=>statVal(c,k)||1;
  return {jobLv:num(c.jobLv,1)||1,baseLv:num(c.baseLv,1)||1,int:st("int"),dex:st("dex"),luk:st("luk"),
    pp:isAlch()?skLv(c,"prepare-potion"):10,pr:isAlch()?skLv(c,"potion-research"):10,hom:0,mastery:0}}
// the numbers in use: what you typed, else your character's
const craftVals=(kind,keys)=>{const m=craftMine(),t=state.craftSim[kind];return Object.fromEntries(Object.keys(keys).map(k=>[k,t[k]!=null?t[k]:m[k]]))};
const brewVals=()=>craftVals("brew",BREW_KEYS);
const cookVals=()=>({...craftVals("cook",COOK_KEYS),kit:state.craftSim.cook.kit||COOK_KITS[0][1]});
const rateCap=x=>Math.min(10000,Math.max(1,x));
// a list of equally likely rates as {lo, hi, avg} chances 0–1
const chanceOf=rs=>{const cs=rs.map(rateCap);return {lo:Math.min(...cs)/10000,hi:Math.max(...cs)/10000,avg:cs.reduce((a,x)=>a+x,0)/cs.length/10000}};
// Prepare Potion: Potion Research 0.5% a level, Prepare Potion 3%, Job Lv 0.2%, INT 0.1% every 2, DEX and LUK 0.1%, Change Instruction 1%
const brewBase=v=>v.pr*50+v.pp*300+v.jobLv*20+Math.floor(v.int/2)*10+v.dex*10+v.luk*10+v.hom*100;
const brewRates=(v,id)=>brewMods(id).map(m=>brewBase(v)+m);
const brewChance=(v,id)=>chanceOf(brewRates(v,id));
// cooking: the kit 12% a level over 10, base level and DEX 0.2%, LUK 0.1%, the dish's level −4% each, −5% for each ingredient after the
// first, a random 6–29% (higher and narrower with cook mastery) and a random −1 to −4%. A kit of level 15 or more always works
function cookRates(v,r,kit=v.kit){if(kit>=15)return [10000];const m=v.mastery,lo=6+Math.floor(m/80),span=30+5*Math.floor(m/400)-lo;
  const base=1200*(kit-10)+20*(v.baseLv+1)+20*(v.dex+1)-400*dishLv(r.id)-10*(100-v.luk+1)-500*(r.mats.length-1),out=[];
  for(let a=0;a<Math.max(1,span);a++)for(let b=1;b<=4;b++)out.push(base+100*(a+lo)-100*b);
  return out}
const cookChance=(v,r,kit)=>chanceOf(cookRates(v,r,kit));
// cook mastery after a dish: up 5, 10, 20… on a success (Lv 1–2, 3–4, 5–6 dishes…), down 1, 5, 10… on a failure; 0 to 1999
const cookMastery=(m,r,ok)=>{const b=1<<Math.floor((dishLv(r.id)-1)/2);return Math.min(1999,Math.max(0,ok?m+b*5:m-b-(b>>1)*3))};
// roll n tries: each takes one of the rates at random, then a roll of 0–9999 under it. rnd: 0 ≤ x < 1 (Math.random)
const pick=(xs,rnd)=>xs[Math.floor(rnd()*xs.length)];
function brewRoll(v,id,n,rnd=Math.random){const rs=brewRates(v,id);let ok=0;for(let i=0;i<n;i++)if(Math.floor(rnd()*10000)<rateCap(pick(rs,rnd)))ok++;return {ok,fail:n-ok}}
function cookRoll(v,r,n,rnd=Math.random){let m=v.mastery,ok=0;
  for(let i=0;i<n;i++){const w=Math.floor(rnd()*10000)<rateCap(pick(cookRates({...v,mastery:m},r),rnd));if(w)ok++;m=cookMastery(m,r,w)}
  return {ok,fail:n-ok,mastery:m}}
// what a try uses up: the materials and the Medicine Bowl or cooking kit, each at buyPrice; {z, unknown} as recipeWorth
const tryCost=(r,extra)=>{const ms=[...r.mats,[extra,1]],w=ms.reduce((a,[id,n])=>{const p=buyPrice(id);if(p==null)a.unknown++;else a.z+=p*n;return a},{z:r.fee||0,unknown:0});
  return {...w,none:w.unknown===ms.length}};
const zTxt=(w,mul=1)=>w.none?"–":fmtN(w.z*mul)+(w.unknown?"+?":"");
const craftChTxt=c=>c.lo===c.hi?pct(c.avg*100,1):`${pct(c.avg*100,1)}<div class="note">${pct(c.lo*100,1)}–${pct(c.hi*100,1)}</div>`;
// one row's money: a try's cost, a made item's cost (tries per success × a try), and what the item's worth
function craftMoney(r,extra,c){const w=tryCost(r,extra),p=matPrice(r.id),unkTip=w.unknown?` title="${w.unknown} item${w.unknown>1?"s have":" has"} no price: set one on the Market tab"`:"";
  return `<td${unkTip}>${zTxt(w)}</td><td${unkTip}>${c.avg>0?zTxt(w,1/c.avg):"–"}</td><td>${p!=null?fmtN(p):"–"}</td>`}
// an NPC shop: its name, price and the towns it stands in (the first few, all of them on hover)
const shopTxt=(name,at,z)=>`<span title="${esc(at.map(([mp,x,y])=>`${mapLabel(mp)} ${x},${y}`).join(" · "))}">${esc(name)}</span> <span class="note">${fmtN(z)} z · ${esc(at.slice(0,3).map(a=>(mapName(a[0])||a[0]).split(",")[0]).join(", "))}${at.length>3?` +${at.length-3} more`:""}</span>`;
const itemCell=(id,sub)=>`<td class="name"><div class="dbName">${itemIcon(id)}<div>${infoLink("item",id,itemName(id))}${sub?`<div class="note">${sub}</div>`:""}</div></div></td>`;
const craftInput=(kind,k,v,mine,label,title)=>`<label title="${esc(title||"")}">${label}<input class="w-xs" type="number" min="${(kind==="brew"?BREW_KEYS:COOK_KEYS)[k][0]}" max="${(kind==="brew"?BREW_KEYS:COOK_KEYS)[k][1]}" step="1" data-csim="${kind}.${k}" value="${state.craftSim[kind][k]??""}" placeholder="${mine[k]}"></label>`;
function renderBrew(){const v=brewVals(),m=craftMine(),S=state.craftSim.brew;
  $("brewIn").innerHTML=[["jobLv","Job Lv"],["int","INT"],["dex","DEX"],["luk","LUK"],["pp","Prepare Potion","skill level, 0–10"],["pr","Potion Research","skill level, 0–10"],
    ["hom","Change Instruction","your Vanilmirth's skill level, 0–5 (0 with no Vanilmirth out)"]].map(([k,l,t])=>craftInput("brew",k,v,m,l,t||"your total, gear and buffs included")).join("");
  $("brewRows").innerHTML=BREW_RECIPES.map(r=>{const c=brewChance(v,r.id),mn=BREW_MANUAL[r.id];
    return `<tr${r.id===S.id?' class="sel"':""}>${itemCell(r.id,mn?`needs ${esc(itemName(mn))}`:"")}<td class="name l mats">${recipeMats(r)}</td><td>${craftChTxt(c)}</td><td class="mono">${c.avg>0?(1/c.avg).toFixed(2):"–"}</td>${craftMoney(r,MEDICINE_BOWL,c)}</tr>`}).join("");
  const id=S.id||BREW_RECIPES[0].id;$("brewPick").innerHTML=BREW_RECIPES.map(r=>`<option value="${r.id}"${r.id===id?" selected":""}>${esc(itemName(r.id))}</option>`).join("");
  $("brewN").value=S.n||100;$("brewCalc").textContent=`${brewBase(v)/100}% before the potion's own difficulty`}
function renderCook(){const v=cookVals(),m=craftMine(),S=state.craftSim.cook;
  $("cookIn").innerHTML=[["baseLv","Base Lv"],["dex","DEX"],["luk","LUK"]].map(([k,l])=>craftInput("cook",k,v,m,l,"your total, gear and buffs included")).join("")
    +craftInput("cook","mastery",v,{mastery:0},"Cook mastery","hidden: 0 for a new cook, up to 1999. Each dish you make raises it and each you burn lowers it")
    +`<label>Kit<select data-csim="cook.kit">${COOK_KITS.map(([id,lv])=>`<option value="${lv}"${lv===v.kit?" selected":""}>${esc(itemName(id))}</option>`).join("")}</select></label>`;
  $("cookHead").innerHTML=`<th>Dish</th><th class="l">Ingredients</th>${COOK_KITS.map(([id,lv])=>`<th${lv===v.kit?' class="sel"':""} title="the chance with ${esc(itemName(id))}">${esc(itemName(id).replace(/ Cooking Kit$/,""))}</th>`).join("")}<th title="tries a dish takes with your kit">Tries / dish</th><th title="the ingredients and one kit, at your Market price, else the Cooking Ingredient Trader's, else what an NPC pays">Cost / try</th><th title="Cost / try × tries a dish takes">Cost / dish</th><th title="your Market price, else what an NPC pays">Worth</th>`;
  const kitId=COOK_KITS.find(k=>k[1]===v.kit)[0];
  $("cookRows").innerHTML=COOK_RECIPES.map(r=>{const c=cookChance(v,r);
    return `<tr${r.id===S.id?' class="sel"':""}>${itemCell(r.id,`${esc(dishFx(r.id))} · Lv ${dishLv(r.id)} · needs ${esc(itemName(COOKBOOK(dishLv(r.id))))}`)}<td class="name l mats">${recipeMats(r)}</td>
      ${COOK_KITS.map(([,lv])=>`<td${lv===v.kit?' class="sel"':""}>${craftChTxt(cookChance(v,r,lv))}</td>`).join("")}<td class="mono">${c.avg>0?(1/c.avg).toFixed(2):"–"}</td>${craftMoney(r,kitId,c)}</tr>`}).join("");
  const id=S.id||COOK_RECIPES[0].id;$("cookPick").innerHTML=COOK_RECIPES.map(r=>`<option value="${r.id}"${r.id===id?" selected":""}>${esc(itemName(r.id))} (Lv ${dishLv(r.id)})</option>`).join("");
  $("cookN").value=S.n||100;
  $("cookBooks").innerHTML=[1,2,3,4,5,6,7,8,9,10].map(lv=>{const id=COOKBOOK(lv),ds=COOK_RECIPES.filter(r=>dishLv(r.id)===lv),dr=ITEM_DROPS[id]||[];
    const from=[...(SHOPS_OF[id]||[]).map(([name,at,z])=>shopTxt(name,at,z)),
      ...dr.slice(0,3).map(({m,ch})=>`${infoLink("mob",m.id,m.name)} <span class="note">${chTxt(ch)}</span>`)].filter(Boolean);
    return `<tr>${itemCell(id,ds.length?`${ds.length} dish${ds.length>1?"es":""}`:"")}<td class="name fx">${ds.length?ds.map(r=>infoLink("item",r.id,itemName(r.id))).join(", "):'<span class="note">none in the recipe list</span>'}</td>
      <td class="name from">${from.length?from.join(", ")+(dr.length>3?` <span class="note">and ${dr.length-3} more</span>`:""):'<span class="note">no source known yet</span>'}</td><td class="mono">${npcSell(id)>0?`${fmtN(npcPays(id))} z`:"–"}</td></tr>`}).join("")}
// a run's result line: made / failed, against the average, and the zeny it came to when the prices are known
function craftRunTxt(r,extra,n,res,c,more=""){const w=tryCost(r,extra),p=matPrice(r.id),net=p!=null&&!w.none&&!w.unknown?res.ok*p-n*w.z:null;
  return `<b>${fmtN(res.ok)}</b> ${esc(itemName(r.id))} from ${fmtN(n)} tries, ${fmtN(res.fail)} failed <span class="note">(${fmtN(c.avg*n)} on average)</span>${more}`
    +(w.none?"":` · used up ${zTxt(w,n)} z`)+(net!=null?` · ${net>=0?"+":"−"}${fmtN(Math.abs(net))} z after selling them`:"")}
(function setupCraftSim(){if(!$("brewCard"))return;
  const setV=(el)=>{const [kind,k]=el.dataset.csim.split("."),keys=kind==="brew"?BREW_KEYS:COOK_KEYS,t=state.craftSim[kind];
    if(k==="kit"){t.kit=+el.value}else if(el.value.trim()===""||!isFinite(+el.value))delete t[k];else t[k]=Math.min(keys[k][1],Math.max(keys[k][0],Math.round(+el.value)))};
  ["brewCard","cookCard"].forEach(id=>{$(id).addEventListener("change",e=>{if(!e.target.dataset.csim)return;setV(e.target);save();id==="brewCard"?renderBrew():renderCook()})});
  $("brewMine").addEventListener("click",()=>{state.craftSim.brew={id:state.craftSim.brew.id,n:state.craftSim.brew.n};save();renderBrew()});
  $("cookMine").addEventListener("click",()=>{const S=state.craftSim.cook;state.craftSim.cook={id:S.id,n:S.n,kit:S.kit,mastery:S.mastery};save();renderCook()});
  const runN=el=>Math.min(10000,Math.max(1,Math.round(num(el.value,100))||100));
  $("brewPick").addEventListener("change",e=>{state.craftSim.brew.id=+e.target.value;save();renderBrew();$("brewRun").innerHTML=""});
  $("cookPick").addEventListener("change",e=>{state.craftSim.cook.id=+e.target.value;save();renderCook();$("cookRun").innerHTML=""});
  $("brewN").addEventListener("change",e=>{state.craftSim.brew.n=runN(e.target);save()});
  $("cookN").addEventListener("change",e=>{state.craftSim.cook.n=runN(e.target);save()});
  $("brewGo").addEventListener("click",()=>{const r=BREW_RECIPES.find(x=>x.id===+$("brewPick").value)||BREW_RECIPES[0],n=runN($("brewN")),v=brewVals();
    $("brewRun").innerHTML=craftRunTxt(r,MEDICINE_BOWL,n,brewRoll(v,r.id,n),brewChance(v,r.id),` · ${fmtN(n)} Medicine Bowls`)});
  $("cookGo").addEventListener("click",()=>{const r=COOK_RECIPES.find(x=>x.id===+$("cookPick").value)||COOK_RECIPES[0],n=runN($("cookN")),v=cookVals(),res=cookRoll(v,r,n);
    const kitId=COOK_KITS.find(k=>k[1]===v.kit)[0];
    $("cookRun").innerHTML=craftRunTxt(r,kitId,n,res,cookChance(v,r),` · ${fmtN(n)} ${esc(itemName(kitId))}s · cook mastery ${fmtN(v.mastery)} → ${fmtN(res.mastery)}`)});
})();
