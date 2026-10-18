// ---- attack model ----
let EL_OVR=null;
const atkEl=()=>{const a=C().a;if(a.type==="spellfist")return EL_OVR||sfBolts()[0]||"Fire";return a.el==="W"?(EL_OVR||C().wElem):a.el};
// elemental converters (Fire/Water/Earth/Wind) change the weapon element for basic attacks and weapon-element skills. One is on at
// a time: c.convEl picks it, or "" to try each (and your weapon's own element) and take the best per monster / map
const CONV_ELS=["Fire","Water","Earth","Wind"];
const convOn=()=>!!C().converters&&C().a.el==="W";
const convFixed=()=>CONV_ELS.includes(C().convEl)?C().convEl:"";
const convAll=()=>[...new Set([C().wElem,...CONV_ELS])];
const convLabel=by=>convFixed()?`${convFixed()} converter`:`best converter ${by}`;
const elOptions=()=>C().a.type==="spellfist"?(sfBolts().length?sfBolts():[null]):convOn()?(convFixed()?[convFixed()]:convAll()):[null];
const withEl=(el,fn)=>{const k=EL_OVR;EL_OVR=el;try{return fn()}finally{EL_OVR=k}};
const elTag=el=>el&&(convOn()||C().a.type==="spellfist")?` <span class="el ${el}">${el}</span>`:"";
// element-table rate of an attack element against a monster (Reference tab): green above 100%, amber below, red when it can't hurt
const elRateCls=v=>v<=0?"bad":v>100?"good":v<100?"warnc":"";
const elRateTxt=v=>v<=0?"0% ✕":v+"%";
const elRateHtml=(el,v)=>`<span class="el ${el}">${el}</span> <span class="${elRateCls(v)}">${elRateTxt(v)}</span>`;
// ASPD potion adds a flat bonus to your status window ASPD (Zero cap 190); its cost counts against zeny/hr
// damage maths read cf(k): the typed (or built) stat plus consumables, see applyConsumables
let EFF=null;const cf=k=>EFF&&EFF[k]!==undefined?EFF[k]:C()[k];
// the potion and buffs reach ASPD through their bonus lines (build-ui.js aspdBuffLines), so cf("aspd") already has them
const aspdEff=()=>Math.min(190,Math.max(100,num(cf("aspd"),170)));
// Merchant line: Overcharge raises what NPCs pay you, Discount cuts what NPCs charge you; Lv 1–10 give 7, 9, … 23, 24% in Zero,
// read from the learned level's description in data/skills.js ("Markup rate: 24%", "Discount rate: 24%")
const skRate=slug=>{const lv=skLv(C(),slug);if(!lv)return 0;for(const t of SKILLS[state.job]||[])for(const s of t.skills)if(s.slug===slug){const r=String((s.lv[lv-1]||[])[7]||"").match(/(\d+)%/);return r?+r[1]:0}return 0};
const ocMul=()=>1+skRate("overcharge")/100;
// Discount only helps with what you buy from an NPC: untick "from NPCs" when you buy SP items and potions from players
// Discount on what you buy from NPCs (ASPD potion, skill items, Custom HP / SP items): the account's Buy with Discount box, taken as
// a Merchant on the account with Discount Lv 10 (−24%) buying for every character. Recovery items use their measured Discount prices
const DISC_LV10=24;
const discMul=()=>recDisc()?1-DISC_LV10/100:1;
const potOnlyHr=()=>C().potOn&&num(C().potMin)>0?60/num(C().potMin)*num(C().potPrice)*discMul():0;
// zeny per hour spent on the ASPD potion (consumables carry no price; Blessing of Yggdrasil's items come from the KP shop)
const potCostHr=()=>potOnlyHr();
// zeny per hour that doesn't depend on kills: the ASPD potion and Sage ground buffs (SP items come on top, see huntCostHr)
const hourCostHr=()=>potCostHr()+fieldCostHr();
const atkPerSec=()=>{const a=aspdEff();return 1000/((200-a)*20)};
// seconds per use: basic attacks follow ASPD; skills take cast + delay but can't beat your attack speed
// variable cast time factor: 1 − sqrt((2·DEX + INT) / 530), 0 at 530 (uses your DEX if typed)
const vctFactor=()=>{const c=C();const dex=statVal(c,"dex");if(dex==null)return 1;return Math.max(0,1-Math.sqrt((2*dex+statVal(c,"int"))/530))};
// a card ticked in the Cards rows that build mode already has in your gear (its own lines count from there)
const cardInGear=(c,ids)=>c.mode==="build"&&Object.values((c.build&&c.build.gear)||{}).some(g=>g&&(g.cards||[]).some(id=>ids.includes(+id)));
// how many copies of these cards build mode's gear holds (every slot, both hands); 0 outside build mode
const cardsInGear=(c,ids)=>c.mode!=="build"?0:Object.values((c.build&&c.build.gear)||{}).reduce((n,g)=>n+(g?(g.cards||[]).filter(id=>ids.includes(+id)).length:0),0);
// Phen (4077) and Bloody Butterfly (4327) Cards: casts can't be interrupted, variable cast +25% / +30%
const PHEN=4077,BBFLY=4327;
const noBreak=()=>{const cd=CRD();return !!(cd.phen||cd.bbfly)||cardInGear(C(),[PHEN,BBFLY])||consSum("no_break")>0};
// fixed cast % cut: only the highest one counts (the box, or a consumable such as Challenge Drink)
const fctPctEff=()=>Math.max(num(C().fctPct),-consSum("fct_percent"));
const vctCards=()=>{const cd=CRD(),c=C();return (cd.phen&&!cardInGear(c,[PHEN])?25:0)+(cd.bbfly&&!cardInGear(c,[BBFLY])?30:0)};
// vk: share of the variable cast left (Foresight halves it)
const castSec=(vk=1)=>{const c=C(),a=c.a,vp=num(c.vctPct)-vctCards();
  if(a.fct!=null||a.vct!=null)return Math.max(0,num(a.vct)*vctFactor()*(1-vp/100))*vk+Math.max(0,(num(a.fct)-num(c.fctSec))*(1-fctPctEff()/100));
  const base=num(a.cast),f=Math.min(100,Math.max(0,num(c.fixedShare)))/100;
  return Math.max(0,base*(1-f)*vctFactor()*(1-vp/100))*vk+Math.max(0,(base*f-num(c.fctSec))*(1-fctPctEff()/100))};
// a hit that lands while you cast interrupts it and you start again (SP is only spent on a cast that finishes). With λ hits landing per
// second from the monster in play, a T-second cast takes (e^(λT) − 1)/λ on average. Not with Phen or Bloody Butterfly
const castEff=(T=castSec())=>{if(T<=0||noBreak())return T;const l=hitsOnYou(SG_MOB||calcMob());return l>0?Math.expm1(l*T)/l:T};
// delay after a skill: the longer of the after-cast delay (cut by after-cast delay %) and the skill's own cooldown (the % doesn't touch it).
// Presets carry both (a.gcd, a.cd); a typed "Delay after" is an after-cast delay
const delaySec=()=>{const a=C().a,k=1-num(C().acdPct)/100;
  return a.cd!=null||a.gcd!=null?Math.max(0,num(a.gcd)*k,num(a.cd)):Math.max(0,num(a.delay)*k)};
// your attack interval runs from the start of the cast: a skill takes cast + delay or the attack interval, whichever is longer
const useSec=()=>{const a=C().a;if(a.type==="auto"||a.type==="spellfist")return 1/atkPerSec();const u=plainUseSec();return fsUsed()?fsUseSec():u};
const plainUseSec=()=>Math.max(castEff()+delaySec(),1/atkPerSec(),0.1);
// Foresight (Sage, Sage options): the next 5 casts take half their variable cast time, for a cast of its own every 5 (Zero's skill data:
// 1 s fixed, 1 SP), cut like any fixed cast and interrupted like any cast. Only used when it saves time
const FS_USES=5;
const fsRow=()=>skRowOf("foresight",1)||[1,null,null,0,1000];
const fsCastSec=()=>{const r=fsRow(),c=C();return Math.max(castEff(Math.max(0,num(r[3])/1000*vctFactor()*(1-(num(c.vctPct)-vctCards())/100))+Math.max(0,(num(r[4])/1000-num(c.fctSec))*(1-fctPctEff()/100))),1/atkPerSec())};
const fsUseSec=()=>Math.max(castEff(castSec(0.5))+delaySec(),1/atkPerSec(),0.1)+fsCastSec()/FS_USES;
const fsAble=()=>{const c=C(),t=c.a.type;return state.job==="Sage"&&!!G().fsOn&&(t==="magic"||t==="phys")&&castSec(0)<castSec()&&(!hasTree(c)||skLv(c,"foresight")>0)};
const fsUsed=()=>fsAble()&&fsUseSec()<plainUseSec();
// base-level skills: × BaseLv/100 only above Lv100, except the three Zero skills missing that check (blvBug, see game.js)
// cart skills (Cart Revolution): +a.cart % per 8,000 cart weight, capped at a full 8,000 cart
// shield skills (a.shw: Shield Boomerang, Rapid Smiting): + shield weight + 4 × shield refine %. Build mode reads the Shield row
// (a left-hand weapon doesn't count); otherwise the Shield weight / refine boxes
const shieldWR=(c=C())=>{if(c.mode==="build"){const g=((c.build&&c.build.gear)||{}).shield,it=g&&g.id&&BUILD.item(g.id);
    return it&&(it.slot||[]).includes("shield")?{w:num(it.w),r:num(g.refine),name:it.name}:{w:0,r:0,name:""}}
  return {w:Math.max(0,num(c.shieldW)),r:Math.max(0,num(c.shieldRef))}};
const shieldPct=(c=C())=>{const s=shieldWR(c);return s.w+4*s.r};
// weapon-weight skills (a.wgt: Axe Boomerang): + weapon weight %, from the Weapon row in build mode, otherwise the Weapon weight box
const weaponW=(c=C())=>{if(c.mode==="build"){const g=((c.build&&c.build.gear)||{}).weapon,it=g&&g.id&&BUILD.item(g.id);return it?{w:num(it.w),name:it.name}:{w:0,name:""}}
  return {w:Math.max(0,num(c.weaponW))}};
// a.wpct: extra % with a weapon type (Raging Quadruple Blow doubles with a knuckle); a.mvit: + N × the monster's VIT % (Acid Bomb), only when m is given
const pctEff=m=>{const c=C(),a=c.a;let p=a.asura?(8+Math.floor(num(cf("maxSp"))/10))*100:num(a.pct);(a.sadd||[]).forEach(([k,f])=>{const v=statVal(c,k);if(v!=null)p+=v*f});if(num(a.cart))p+=num(a.cart)*Math.min(8000,Math.max(0,num(c.cartW)))/8000;if(a.shw)p+=shieldPct(c);
  if(a.wgt)p+=weaponW(c).w;if(a.wpct)p+=num(a.wpct[c.weapon]);if(m&&a.mvit)p+=num(a.mvit)*num(m.vit);if(!a.blv)return p;const lv=num(c.baseLv,99);return p*(a.blvBug?lv:Math.max(100,lv))/100};
const targets=()=>Math.max(1,num(C().a.targets,1));
// magic: true for magic damage (spells, Spell Fist, Shadow Spell auto-casts). Each race / size / element / name bonus is
// physical-only, magic-only or both (race / size / element default to both, as before the setting existed)
// In build mode gear adds per-race / size / element / boss-normal maps (build.js); the manual boxes add into the same category
// monster groups ("against Boulder Dwarves +30%"): each group counts once against monsters whose name contains it
const groupMul=(B,m)=>Object.entries(B.group||{}).reduce((k,[g,v])=>String(m.name||"").toLowerCase().includes(g.toLowerCase())?k*(1+v/100):k,1);
// damage bonuses in two groups. post: race, size, monster element, boss / normal, monster name, "all" and your attack element %, which on a
// physical hit only scale weapon + equipment ATK (each its own multiplier); full: the extra damage %, consumables' ranged / magic %
// and skill passives' damage % (Power Thrust, Advanced Katar Mastery), on the whole hit. Spells take both on the whole hit
const bonusParts=(m,magic=false)=>{const c=C();let post=1,full=1+num(c.dmgBonus)/100;
  const on=t=>t==="both"||(t==="magic")===magic;
  const nm=String(c.nameSel||"").trim().toLowerCase();if(nm&&on(c.nameType||"phys")&&String(m.name).toLowerCase().includes(nm))post*=1+num(c.namePct)/100;
  const B=c.bx?(magic?c.bx.magic:c.bx.phys):null,el=m.el||"Neutral";
  if(B)post*=(1+(B.race[m.race]||0)/100)*(1+(B.size[m.size]||0)/100)*(1+(B.ele[el]||0)/100)*(1+(B.all||0)/100)*(1+(B.kind[m.boss?"boss":"normal"]||0)/100)*groupMul(B,m);
  if(!m.boss)post*=1+num(c.normalPct)/100;
  post*=1+num(c.myElPct)/100;if(magic&&c.bx)post*=1+((c.bx.myEle||{})[atkEl()]||0)/100;
  // consumables: magic damage % (Unlimited Drink) on spells, ranged damage % on physical attacks with a ranged weapon
  full*=1+consSum(magic?"magic_dmg":RANGED.includes(c.weapon)?"range_dmg":"")/100;
  // learned passives and buffs: physical damage % (Advanced Katar Mastery, Power Thrust), element % for spells (Endow, Volcano...)
  // and, for an element's plain "Damage" bonus (Volcano, Deluge, Whirlwind), for physical attacks of that element too
  if(SKFX){if(!magic){full*=1+SKFX.pct/100;post*=1+(SKFX.physEle[atkEl()]||0)/100}else post*=1+(SKFX.myEle[atkEl()]||0)/100}return {post,full}};
const bonusMul=(m,magic=false)=>{const b=bonusParts(m,magic);return b.post*b.full};
// build mode: gear EXP bonus % (plus vs a monster's race), and damage taken from its race / element / boss-normal kind
const expGear=m=>{const c=C();return c.bx?(c.bx.exp.all||0)+((c.bx.exp.race||{})[m.race]||0):0};
// your EXP per kill: your Even Share cut (rounded down), then every EXP bonus added together, not multiplied (10% + 10% is ×1.20,
// matching the in-game kills noted at partyN). Gear EXP counts for base and job EXP; an item's "EXP +X%" is base EXP only and
// only "Job EXP +X%" raises job EXP (checked in game: a Captain with 10% gear gave +10% to both, an "EXP +10%" item +10% base only)
const partyCut=(v,s=cur())=>Math.floor(v*(100+partyBonus(s))/100/partyN(s));
const killExp=(m,s=cur())=>Math.floor(partyCut(m.exp,s)*(1+(expGear(m)+num(state.bonus)+consSum("exp_base"))/100));
const killJobExp=(m,s=cur())=>Math.floor(partyCut(m.job,s)*(1+(expGear(m)+num(state.jobBonus)+consSum("exp_job"))/100));
const takenMul=m=>{const c=C();if(!c.bx)return 1;const t=c.bx.taken;return (1+(t.race[m.race]||0)/100)*(1+(t.ele[m.el||"Neutral"]||0)/100)*(1+(t.kind[m.boss?"boss":"normal"]||0)/100)};
// ignore DEF / MDEF %: lowers the monster's hard defence before the (4000+DEF)/(4000+10·DEF) or (1000+MDEF)/(1000+10·MDEF) factor
// ignOf: the plain ignore % plus gear that ignores it only against the monster's race, size, element or boss / normal (bx.ign)
const ignOf=(k,m)=>{const c=C(),I=c.bx&&c.bx.ign&&c.bx.ign[k];let v=num(c[k==="def"?"ignDef":"ignMdef"]);
  if(I&&m)v+=(I.race[m.race]||0)+(I.size[m.size]||0)+(I.ele[m.el||"Neutral"]||0)+(I.kind[m.boss?"boss":"normal"]||0);return Math.min(100,Math.max(0,v))};
const effDef=m=>(m.def||0)*(1-ignOf("def",m)/100);
const effMdef=m=>(m.mdef||0)*(1-ignOf("mdef",m)/100);
// Formulas from roz.prontera.info/mechanics (Ragnarok Zero, renewal core)
// ATK is "status + gear" as in the status window. The gear side is the weapon (×(1 + STR or DEX / 200)) and equipment ATK (eq); with
// dual wield the left weapon too. ATK % isn't in the window: it comes from atkPct (gear in build mode, the ATK % box, consumables)
const atkParts=()=>{const p=String(cf("atkTxt")||"0").split("+").map(x=>parseFloat(x)||0);const st=p[0]||0,gear=p.slice(1).reduce((x,y)=>x+y,0);
  const w=num(C().wAtk)>0?Math.min(num(C().wAtk),gear):gear,lw=dualOn()?Math.min(num(C().lwAtk),Math.max(0,gear-w)):0;
  // weapon ATK +0.5% per STR (melee) or DEX (bow, instrument, whip)
  const c=C(),main=statVal(c,RANGED.includes(c.weapon)?"dex":"str");const wb=main!=null?1+main/200:1;
  return {st,gear,weapon:w*wb,left:lw*wb,eq:Math.max(0,gear-w-lw)}};
// one hand's ATK before the skill %: post ATK (weapon ATK × size penalty + equipment ATK) × the post bonuses, plus post ATK × ATK %
// (added, not multiplied with the cards), all × the weapon's element; then status ATK × Neutral, outside the cards and ATK %
const handAtk=(m,w,wType,el,front)=>{const P=atkParts(),post=w*sizeMod(m,wType)/100+P.eq;
  return post*(bonusParts(m).post+num(cf("atkPct"))/100)*elemMult(m,el)/100+front*elemMult(m,"Neutral")/100};
// status ATK counts twice; a skill while dual-wielding counts it once (basic attacks: right hand twice, left hand once)
const frontAtk=()=>atkParts().st*(dualOn()&&C().a.type!=="auto"?1:2);
// ---- Assassin dual wield (rAthena renewal battle.cpp; its ASPD table is the Zero one, see BUILD.LEFT_ASPD) ----
// a basic attack hits with both hands: the right × Righthand Mastery (50 + 10 × Lv)%, the left × Lefthand Mastery (30 + 10 × Lv)%,
// after DEF. The left hand's status ATK isn't doubled, Double Attack repeats only the right hand, and skills use the right hand only.
// Without a skill tree both masteries count as Lv 5 (100% / 80%)
const dualOn=(c=C())=>BUILD.dualOk(state.job,c.weapon,c.lw);
const handPct=()=>{const c=C(),t=hasTree(c),lv=k=>t?skLv(c,k):5;return {right:50+10*lv("righthand-mastery"),left:30+10*lv("lefthand-mastery")}};
const dualHit=()=>dualOn()&&C().a.type==="auto";
const leftEl=()=>EL_OVR||C().lwElem||"Neutral";
const mobSoftDef=m=>Math.max(0,Math.floor(((m.lv||0)+(m.vit||0))/2));
const mobSoftMdef=m=>Math.max(0,Math.floor(((m.lv||0)+(m.int||0))/4));
// "Your hit %": skill % after element, size and your bonuses, as a share of your full ATK (before monster DEF/MDEF)
const hitPctOf=m=>{const a=C().a;if(a.falcon)return elemMult(m,"Neutral");if(a.type==="spellfist")return sgPct()*elemMult(m,atkEl())/100*bonusMul(m,true);if(a.type==="magic")return pctEff(m)*elemMult(m,atkEl())/100*bonusMul(m,true);
  const P=atkParts(),tot=P.weapon+P.eq+frontAtk();if(tot<=0)return 0;
  return pctEff(m)*handAtk(m,P.weapon,C().weapon,atkEl(),frontAtk())/tot*bonusParts(m).full};
// hit chance = 100 + your HIT − the monster's "100% hit" value, 5–100%; magic always lands
const hitChance=m=>{if(C().a.type==="magic"||C().a.type==="spellfist"||C().a.falcon||C().a.mr)return 100;if(m.hit100==null)return 95;return Math.max(5,Math.min(100,100+sumStat(cf("hitTxt"))-m.hit100))};
function dmgPerHit(m){
  const a=C().a;if(a.type==="spellfist")return sfOn()?sfHit(m,atkEl()):hsHit(m,atkEl());if(a.mr)return mrHit(m);if(a.falcon==="assault")return faHit(m);if(a.falcon)return blitzHit(m,Math.round(num(a.hits,5)));
  if(a.type==="magic"){const el=elemMult(m,atkEl())/100;if(el<=0)return 0;const md=effMdef(m);return Math.max(1,Math.floor((sumStat(cf("matkTxt"))*pctEff(m)/100*bonusMul(m,true)*(1+num(C().skillPct)/100)*(1000+md)/(1000+10*md)-mobSoftMdef(m))*el))}
  const P=atkParts(),d=physDmg(m,handAtk(m,P.weapon,C().weapon,atkEl(),frontAtk()));
  return dualHit()&&d>0?Math.max(1,Math.floor(d*handPct().right/100)):d}
// one physical hit from a hand's ATK (handAtk: the post bonuses and element are in it), × skill %, then the full bonuses and DEF
function physDmg(m,pool){if(pool<=0)return 0;
  const c=C(),a=c.a,skill=a.type!=="auto";const rng=(1+num(c.rangePct)/100)*(skill?1+num(c.skillPct)/100:1);
  // mastery ATK (flat, from passive skills) is added after the skill ratio, before the full bonuses and DEF; race / size cards don't scale it
  const df=effDef(m);return Math.max(1,Math.floor((pool*pctEff(m)/100+masteryFor(m)*elemMult(m,"Neutral")/100)*bonusParts(m).full*rng*(4000+df)/(4000+10*df)-mobSoftDef(m)))}
// the left hand's hit on a dual-wield basic attack (0 otherwise): its own weapon, size and element, status ATK once
function leftDmg(m){if(!dualHit())return 0;const P=atkParts(),d=physDmg(m,handAtk(m,P.left,C().lw,leftEl(),P.st));
  return d>0?Math.max(1,Math.floor(d*handPct().left/100)):0}
// damage of one use before hit and crit: every hit of the attack, plus the left hand once
// Side Winder adds its double attack to basic attacks, right hand only, unless you learned Double Attack (the card then follows the skill)
const swMul=()=>C().a.type==="auto"&&!skLv(C(),"double-attack")?daFactor():1;
const perUse=m=>{const a=C().a,h=a.sizeHits?a.sizeHits[{S:0,M:1,L:2}[m.size]??1]:num(a.hits,1);return dmgPerHit(m)*Math.max(0.01,h)*swMul()+leftDmg(m)};
// crits (basic attacks only): chance = CRIT (doubled with a katar) − monster LUK × 0.2, always hit, × 1.4 × (1 + crit damage %)
// m: the monster, for gear CRIT that only counts against its race (Cruiser Card: CRIT +7 vs Brute)
const critRace=m=>{const c=C();return m&&c.bx&&c.bx.critRace?num(c.bx.critRace[m.race]):0};
// a.critHalf: a skill that crits with your CRIT and gets half of a crit's extra damage (Cannon Spear on Zero)
const critChance=m=>{const c=C();if((c.a.type!=="auto"&&!c.a.critHalf)||c.a.mr)return 0;return Math.min(100,Math.max(0,(num(cf("crit"))+critRace(m))*(c.weapon==="Katar"?2:1)-(m&&m.luk||0)*0.2))/100};
// uses needed per kill: whole hits that land, spread over misses
// average damage of one use: hits that land (crits always do, × 1.4 × (1 + crit damage %)) plus auto-casts: card and scroll auto-casts
// only proc on swings that connect, Auto Shadow Spell (free) procs on a miss too, like Spell Fist and Hindsight
const procPerUse=m=>acDmg(m)*acChance()+dlDmg(m)+autoBlitzDmg(m);
const procFree=m=>ssDmg(m)*SS_CHANCE;
// Duple Light (Priest, Zero): each melee basic attack that hits adds a physical orb ((500 + 50 × Lv)% ATK, the weapon's element and size
// penalty, rolling to hit again) and, DL_MAGIC of the time, a magic orb ((800 + 80 × Lv)% MATK, Neutral, always hits). No base-level scaling.
// Recast every 60 + 30 × Lv s for 50 + 5 × Lv SP. The orb chances (100% / 50%, measured at Lv10) are the same at every level: Zero's skill
// text, like the in-game tooltip, changes only the damage % and the duration with the level, and gives no chance
const DL_PHYS=1,DL_MAGIC=0.5;
const dlLv=(c=C())=>!c.a.dl?0:hasTree(c)?skLv(c,"duple-light"):10;
const dlDmg=m=>{const lv=dlLv();if(!lv)return 0;const o={...C().a,dl:false,hits:1,sadd:[]};
  const phys=withAtk({...o,name:"Duple Light",type:"phys",pct:500+50*lv,el:"W"},()=>dmgPerHit(m)*hitChance(m)/100);
  const mag=withAtk({...o,name:"Duple Light",type:"magic",pct:800+80*lv,el:"Neutral"},()=>dmgPerHit(m));
  return phys*DL_PHYS+mag*DL_MAGIC};
// Blitz Beat (Hunter falcon), per hit: (AGI/2 + DEX/10) × 2 + 6 × Steel Crow Lv + 20 × Blitz Beat Lv, as a Neutral hit that always lands
// and ignores DEF and your damage bonuses. Auto Blitz: LUK/3 % on each basic attack that hits, at Lv (Job Lv + 9)/10 up to the learned Lv
// (rAthena renewal). Steel Crow and Blitz Beat count as Lv 10 / 5 without a skill tree
const blitzBase=lv=>{const c=C(),st=k=>num(statVal(c,k)),sc=hasTree(c)?skLv(c,"steel-crow"):10;return (Math.floor(st("agi")/2)+Math.floor(st("dex")/10))*2+6*sc+20*lv};
const blitzHit=(m,lv)=>{const e=elemMult(m,"Neutral")/100;return e<=0?0:Math.max(1,Math.floor(blitzBase(lv)*e))};
// Falcon Assault (Zero skill data): one hit of the Blitz Beat hit (at Falcon Assault's Lv) / 10 × 5 × (5 + 50 + base Lv / 5), like Blitz Beat
// otherwise. TODO: the client text says "+100% per level"; how it scales below Lv5 isn't confirmed. Lv5 without a skill tree
const faLv=(c=C())=>hasTree(c)&&skLv(c,"falcon-assault")>0?skLv(c,"falcon-assault"):5;
const faHit=m=>{const e=elemMult(m,"Neutral")/100;return e<=0?0:Math.max(1,Math.floor(blitzBase(faLv())/10*5*(55+num(C().baseLv,99)/5)*e))};
const autoBlitzLv=(c=C())=>!c.a.autoBlitz?0:Math.min(hasTree(c)?skLv(c,"blitz-beat"):5,Math.floor((num(c.jobLv,50)+9)/10));
const autoBlitzDmg=m=>{const n=autoBlitzLv();return n?Math.min(1,num(statVal(C(),"luk"))/300)*blitzHit(m,n)*n:0};
// Martyr's Reckoning (Crusader): each basic attack hits for 9% of Max HP × (0.9 + 0.1 × Lv) and costs 9% of Max HP (selfHpPerSec);
// it always hits, ignores DEF and your damage bonuses, takes the Neutral element table. 100 SP per cast for 5 attacks. Lv5 without a skill tree
const mrHit=m=>{const c=C(),e=elemMult(m,"Neutral")/100,lv=hasTree(c)&&skLv(c,"martyrs-reckoning")>0?skLv(c,"martyrs-reckoning"):5;
  return e<=0?0:Math.max(1,Math.floor(0.09*num(cf("maxHp"))*(0.9+0.1*lv)*e))};
const dlUpkeep=()=>{const lv=dlLv();return lv?(50+5*lv)*spCostMul()/(60+30*lv):0};
const critMul=()=>{const k=1.4*(1+(num(C().critDmg)+consSum("crit_dmg"))/100);return C().a.critHalf?1+(k-1)/2:k};
const useAvg=(m,per,proc,free=0)=>{const cr=critChance(m),hc=hitChance(m)/100;return per*(cr*critMul()+(1-cr)*hc)+proc*(cr+(1-cr)*hc)+free};
const dpsOf=m=>{if(isSF())return null;return useAvg(m,perUse(m),procPerUse(m),procFree(m))*targets()/useSec()};
function usesPerKill(m){if(isSF()){const d=sfPerAttack(m);return d>0?Math.ceil(m.hp/d):Infinity}const per=perUse(m),proc=procPerUse(m),free=procFree(m);if(per<=0&&proc<=0&&free<=0)return Infinity;
  // Shadow Spell and card auto-casts are averaged into each attack
  if(critChance(m)>0||proc>0||free>0)return Math.max(1,m.hp/useAvg(m,per,proc,free));
  return Math.ceil(m.hp/per)/(hitChance(m)/100)}
// SP: a use costs SP; natural regen is 1 + MaxSP/100 + INT/6 per 8s, + (INT − 120)/2 + 4 from INT 120 (roz.prontera.info), unless typed
// "SP Recovery +x%" from gear (Eggyra, Sohee, Merman Cards…) raises it by x%; a typed regen already has it
const spRecPct=()=>{const c=C();return c.bx?num(c.bx.spRec):0};
const spRegen8=()=>{if(num(C().spRegen)>0)return num(C().spRegen);const i=statVal(C(),"int");const r=1+Math.floor(num(cf("maxSp"))/100)+Math.floor(i/6)+(i>=120?Math.floor((i-120)/2)+4:0);
  return spRecPct()?Math.floor(r*(1+spRecPct()/100)):r};
// HP: natural regen is floor(VIT/5) + max(1, floor(MaxHP/200)) per 6s (rAthena, not checked in game), unless typed;
// "HP Recovery +x%" from gear (Muka, Zombie, Wooden Golem, Merman Cards…) raises it by x%; a typed regen already has it
const hpRecPct=()=>{const c=C();return c.bx?num(c.bx.hpRec):0};
const hpRegen6=()=>{if(num(C().hpRegen6)>0)return num(C().hpRegen6);const r=Math.floor((statVal(C(),"vit")||0)/5)+Math.max(1,Math.floor(num(cf("maxHp"))/200));
  return hpRecPct()?Math.floor(r*(1+hpRecPct()/100)):r};
// gear "SP consumption +x%" (build mode) scales the SP each use costs
// Vitata Card's +25% counts when ticked, unless build mode already has the card in your gear
const vitInGear=c=>cardInGear(c,[4053]);
const vitPct=()=>CRD().vitata&&!vitInGear(C())?num(CRD().spBonus):0;
// consumables' lines the status window doesn't show (parseCons in build-ui.js): "SP consumption −x%" and HP / SP restored over time
// (only your own rows make them; summed once per change of those rows, as regen is asked for on every monster)
let CONS_SUM={k:null,v:{}};
const consSum=t=>{const c=C(),rows=OWN_LISTS.flatMap(L=>rowsOf(c,L.key)).filter(r=>r.on),k=rows.map(r=>r.eff).join("\n");
  if(CONS_SUM.k!==k){const v={};rows.forEach(r=>parseCons(r.eff).lines.forEach(([x,,,n])=>v[x]=(v[x]||0)+num(n)));CONS_SUM={k,v}}return CONS_SUM.v[t]||0};
const spCostMul=()=>{const c=C();return Math.max(0,1+(c.bx?num(c.bx.spCost):0)/100+(SKFX?SKFX.spCost:0)/100+vitPct()/100+consSum("sp_cost_percent")/100)};
// SP / HP per second from consumables such as Small Mana Potion (5% of Max SP every 5 s); like cards it keeps going when you're overweight
const consSPPerSec=()=>consSum("sp_regen")+consSum("sp_regen_pct")*num(cf("maxSp"))/100;
const consHPPerSec=()=>consSum("hp_regen")+consSum("hp_regen_pct")*num(cf("maxHp"))/100;
// Increase SP Recovery (Mage, Wizard, Sage; Skills card): every 10 s, Lv × (3 + 0.2% of Max SP) on top of natural regen (Zero's skill data)
const isrPer10=()=>{const l=skLv(C(),"increase-sp-recovery");return l>0?Math.floor(l*(3+num(cf("maxSp"))*0.002)):0};
// Increase HP Recovery (Swordsman, Knight, Crusader; Skills card): every 10 s, Lv × (5 + 0.2% of Max HP) on top of natural regen (Zero's skill data)
const ihrPer10=()=>{const l=skLv(C(),"increase-hp-recovery");return l>0?Math.floor(l*(5+num(cf("maxHp"))*0.002)):0};
// HP back per second: natural regen and Increase HP Recovery (stop when you're overweight) plus HP-over-time consumables, which keep going
// m: the monster in play, whose poison stops natural regen and Increase HP Recovery part of the time (poisonUp)
const hpRegenPerSec=(m=SG_MOB||calcMob())=>(REGEN_OFF?0:(hpRegen6()/6+ihrPer10()/10)*(1-poisonUp(m)))+consHPPerSec();
// SP the attack itself costs per second (Spell Fist: its upkeep); defSP adds Energy Coat and Vitata's heals against the monster in play
// Guillotine Fist spends all your SP (Max SP each use), whatever SP cost cuts you have
const skillSPPerSec=()=>(C().a.asura?num(cf("maxSp")):(num(C().a.sp)+(fsUsed()?num(fsRow()[0])/FS_USES:0))*spCostMul())/useSec()+dlUpkeep();
// HP you spend yourself per second: Martyr's Reckoning 9% of Max HP per attack, a.hpCost per use (Excruciating Palm)
const selfHpPerSec=()=>{const a=C().a;return a.mr?0.09*num(cf("maxHp"))/useSec():num(a.hpCost)/useSec()};
const spNeedPerSec=()=>isSF()?sgUpkeep()+defSP()+hsFullSP()*hsSustain():skillSPPerSec()+defSP();
// SP back per second: natural regen and Increase SP Recovery (stop when you're overweight) plus SP from cards and consumables, which keep going
const regenPerSec=(m=SG_MOB||calcMob())=>(REGEN_OFF?0:(spRegen8()/8+isrPer10()/10)*(1-poisonUp(m)))+cardSPPerSec()+consSPPerSec();
// items per second when auto SP items are on (covers the gap); otherwise you rest, which stretches fight time
// the SP item is the one picked in Consumables (spItemAmt: SP it restores, spItemPrice: what it costs)
const itemsPerSec=()=>isSF()?sgItemsPerSec():C().autoSp&&spItemAmt()>0?Math.max(0,spNeedPerSec()-regenPerSec())/spItemAmt():0;
const restFactor=()=>{if(isSF())return 1;if(C().autoSp&&spItemAmt()>0)return 1;const need=spNeedPerSec(),r=regenPerSec();return need>r&&r>0?need/r:need>0&&r<=0?Infinity:1};
const rawFight=m=>{const u=usesPerKill(m);return isFinite(u)?u*useSec()/targets():Infinity};
// raw: rawFight(m) when the caller already has it
const fightSec=(m,raw)=>{const f=healShare(m);return f>=1?Infinity:(raw??rawFight(m))*restFactor()/(1-f)};
// damage taken: monster ATK through your DEF, its hit chance on you, a swing every interval times "swings reach you"
const defParts=()=>{const p=String(cf("defTxt")||"0").split("+").map(x=>parseFloat(x)||0);return {soft:p[0]||0,hard:p.slice(1).reduce((a,b)=>a+b,0)}};
// ---- crowds and poison (rAthena pre-renewal: conf/battle/battle.conf, status.cpp, skills/npc/poisonattack.cpp) ----
// monsters on you at once: aggressive monsters, and ones that join a fight their kind is in (assist, data/mobskills.js), gang up:
// c.crowd of them (2 unless you change it; others 1). Each one swings at you, and from 3 at once FLEE drops 10% and DEF (gear and
// VIT) 5% per monster past 2
// A map can set its own count for every monster on it (Map planner: state.mobbed). RO Zero's maps are towns, fields and dungeons, and
// dungeons come in two kinds: normal ones, and room dungeons, one big map cut into small rooms (Labyrinth Forest 1F and 3F, 5×5 rooms;
// Sunken Ship's cabins), where the monsters crowd into the room you're in and several hit you together whatever they are. Room
// dungeons (ROOM_MAPS) start at ROOM_CROWD; other maps have no count of their own. MOBBED is the count for the map being worked out
// (withMobbed), null when it has none. ROOM_MAPS are the spawn maps with 8 or more warps back into the same map (room to room) in
// rAthena's warp scripts (npc/warps): Labyrinth Forest 1F 59 and 3F 57, Sunken Ship 1F 20 and 2F 10, Kunlun's Immortal's Chess
// Terrace 20, Sphinx B5F 8. Clock Tower 4F (5), Glast Heim Castle 1F, Sewer Tunnel 2F and Sphinx B3F (4) have only a few, and
// Labyrinth Forest 2F none. rAthena has no warps for Izlude Shipwreck, so it isn't known
const CROWD_D=2;
const ROOM_MAPS=["maz_d01","maz_d03","tre_d01","tre_d02","gon_d02","sp_d05"],ROOM_CROWD=3;
const isRoomMap=mp=>ROOM_MAPS.includes(mp);
const mobbedDef=mp=>isRoomMap(mp)?ROOM_CROWD:null;
const mobbedOf=mp=>{const v=(state.mobbed||{})[mp];return v!=null?Math.min(12,Math.max(1,Math.round(num(v)))):mobbedDef(mp)};
let MOBBED=null;
const withMobbed=(mp,fn)=>{const k=MOBBED;MOBBED=mp?mobbedOf(mp):null;try{return fn()}finally{MOBBED=k}};
const crowdN=m=>{if(MOBBED!=null&&m)return MOBBED;if(!m||!(m.agg||m.assist))return 1;const v=C().crowd;return v==null||v===""?CROWD_D:Math.max(1,num(v,1))};
const crowdFlee=n=>Math.max(0,1-0.1*Math.max(0,n-2));
const crowdDef=n=>Math.max(0,1-0.05*Math.max(0,n-2));
// dodge = 95 + your FLEE (less the crowd penalty) − the monster's "95% flee" value, 0–95%
const dodge=m=>m.flee95==null?null:Math.max(0,Math.min(95,95+sumStat(cf("fleeTxt"))*crowdFlee(crowdN(m))-m.flee95));
// Poison Attack (NPC_POISON, data/mobskills.js): a monster tries it on rate/10000 of its swings, then waits its delay; it hits at 120%
// of the monster's hit chance and poisons on 20% × skill level, less VIT % and (LUK + your Lv − its Lv) / 10 points. Poison lasts
// 60 s × (1 − 0.75% per VIT) − LUK / 10 s and a new one doesn't refresh it, so you're poisoned aD / (1 + aD) of the time (a: poisonings
// a second, D: seconds each). Poisoned: 2 + 1.5% of Max HP lost a second (it stops at 25% HP), no natural HP or SP regen, VIT DEF −25%
const POISON_S=60;
function poisonUp(m){const p=m&&m.poison;if(!p||m.atkMin==null)return 0;const c=C(),vit=Math.min(100,statVal(c,"vit")||0),luk=statVal(c,"luk")||0;
  const A=swingsOnYou(m),dg=dodge(m);if(!(A>0))return 0;
  const uses=crowdN(m)/(p[2]/1000+1/(A*p[1]/10000)),hit=Math.min(1,(dg==null?1:(100-dg)/100)*1.2);
  const ch=Math.max(0,0.2*p[0]*(1-vit/100)-(luk+num(c.baseLv)-num(m.lv))/1000),D=Math.max(0,POISON_S*(1-0.0075*vit)-luk/10),a=uses*hit*ch;
  return a*D/(1+a*D)}
const poisonHpPerSec=()=>2+Math.floor(num(cf("maxHp"))*3/200);
const mobHitDmg=m=>{if(m.atkMin==null)return null;const {soft,hard}=defParts(),k=crowdDef(crowdN(m)),s=soft*k*(1-0.25*poisonUp(m)),h=hard*k;
  return Math.max(1,((m.atkMin+m.atkMax)/2*(4000+h)/(4000+10*h)-s)*takenMul(m))};
// HP lost per minute: what the monster's hits take (after Energy Coat) less Hunter Fly and HP regen (hpRegenPerSec), already in defense().
// Ranged and magic attackers count the same hits: aggressive monsters and ones that walk up to you while you cast still reach you
// (× "swings reach you"). hpItemsPerMin is what HP items must cover: with Vitata your Heal casts cover it (paid in SP and time, see
// healsPerSec), so none; hpTakenPerMin is the damage before regen
// d: defense(m) when the caller already has it
const hpLossPerMin=(m,d=defense(m))=>d?d.hp*60:null;
const vitHeals=()=>CRD().vitata&&healHpEff()>0;
const hpItemsPerMin=(m,d=defense(m))=>d?vitHeals()?0:d.hp*60:null;
const hpTakenPerMin=(m,d=defense(m))=>d?(d.taken+d.psn+d.self)*60:null;
// pz: share of the time poisoned, psn: HP a minute it drains
const poisonOf=(m,d=defense(m))=>d?{pz:d.pz,psn:d.psn*60}:{pz:0,psn:0};
// ---- Sage: Spell Fist and Hindsight on basic attacks (bolt choice, Double Bolt, SP items; Energy Coat from ECO(), Vitata, Hunter Fly and Side Winder from CRD()) ----
// the attack picks which of the two are on: a.sf (Spell Fist, on unless false) and a.hs (Hindsight)
const SAGE_D={sfLv:10,boltLv:10,bolts:{Fire:true,Water:true,Wind:true},hsLv:10,dbOn:false,dbLv:5,fsOn:false};
const G=()=>{const c=C();if(!c.sage)c.sage={};for(const k in SAGE_D)if(c.sage[k]==null)c.sage[k]=JSON.parse(JSON.stringify(SAGE_D[k]));return c.sage};
const isSF=()=>C().a.type==="spellfist";
let HS_OVR=null; // Hindsight forced on/off while comparing
const withHs=(v,fn)=>{const k=HS_OVR;HS_OVR=v;try{return fn()}finally{HS_OVR=k}};
const hsOnNow=()=>HS_OVR!=null?HS_OVR:!!C().a.hs;
const sfOn=()=>C().a.sf!==false;
const sfBolts=()=>["Fire","Water","Wind"].filter(b=>G().bolts[b]&&(state.job!=="Sage"||!hasTree(C())||skLv(C(),SG_BOLT[b])>0));
// Spell Fist: Lv × 5% proc chance on each basic attack, hit or miss; damage in the bolt's element (checked in game)
const sfChance=()=>sfOn()?Math.min(10,Math.max(0,num(G().sfLv)))*5/100:0;
// Spell Fist %: 100 × bolt Lv + 100 × Spell Fist Lv. The bolt is worked out first at 100% (its MDEF steps included), then × that %
const sfPct=()=>100*Math.min(10,Math.max(1,num(G().boltLv,10)))+100*Math.min(10,Math.max(1,num(G().sfLv,10)));
const sfHit=(m,el)=>Math.floor(magicDmg(m,100,el)*sfPct()/100);
const magicDmg=(m,pct,el,addMatk=0)=>{const e=elemMult(m,el)/100;if(e<=0||pct<=0)return 0;const md=effMdef(m);return Math.max(1,Math.floor(((sumStat(cf("matkTxt"))+addMatk)*pct/100*bonusMul(m,true)*(1+num(C().skillPct)/100)*(1000+md)/(1000+10*md)-mobSoftMdef(m))*e))};
// Hindsight: Lv × 2% chance per attack to auto-cast a bolt at half its level (100% MATK per hit); costs 2/3 of the bolt's SP
const hsLvN=()=>Math.min(10,Math.max(0,num(G().hsLv)));
const hsChance=()=>hsOnNow()?hsLvN()*2/100:0;
const hsBoltLv=()=>Math.floor(hsLvN()/2);
const hsHit=(m,el)=>hsBoltLv()*magicDmg(m,100,el);
// the % one proc deals: Spell Fist's, or the Hindsight bolt's when Spell Fist is off
const sgPct=()=>sfOn()?sfPct():100*hsBoltLv();
const sgSpMult=()=>1+(CRD().vitata?num(CRD().spBonus):0)/100; // Vitata Card: +25% SP cost
const hsProcSP=()=>(10+2*hsBoltLv())*2/3*sgSpMult();
// Double Bolt (needs Hindsight): (30 + 10 × Lv)% chance the auto-cast bolt fires again; recast every 90 s for 35 + 5 × Lv SP
const dbLvN=()=>Math.min(5,Math.max(1,num(G().dbLv,5)));
const dbChance=()=>hsOnNow()&&G().dbOn?(30+10*dbLvN())/100:0;
// Spell Fist upkeep: 76 SP plus a bolt every 300 s
const sgUpkeep=()=>(sfOn()?(76+30)*sgSpMult()/300:0)+(hsOnNow()&&G().dbOn?(35+5*dbLvN())*sgSpMult()/90:0);
// Side Winder Card: chance for a basic attack to hit twice; under Spell Fist the 2nd hit procs it too
const daFactor=()=>CRD().daSF?1+num(CRD().daPct)/100:1;
// Hunter Fly Card: each physical attack has a 5% chance to restore 100 HP/s for 5 s (refreshes, doesn't stack). Basic attacks
// and Spell Fist swing at your ASPD, physical skills once per use; spells don't trigger it
const physAtkPerSec=()=>{const t=C().a.type;return t==="auto"||t==="spellfist"?atkPerSec():t==="phys"&&!C().a.falcon?1/useSec():0};
// copies worn: build mode counts them in the gear (and then they count as ticked), else the box (1–4) when ticked
const HUNTER_FLY=27266,DRACULA=27268;
const cardCopies=(id,on,n)=>{const g=cardsInGear(C(),[id]);return g>0?g:on?Math.min(4,Math.max(1,Math.round(num(n,1)))):0};
const hfCards=()=>cardCopies(HUNTER_FLY,CRD().hfOn,CRD().hfN),dracCards=()=>cardCopies(DRACULA,CRD().dracOn,CRD().dracN);
// k copies: each rolls on every attack until one procs, and the restore doesn't add up (not checked in game),
// so the effect runs 1 − (1 − p)^(k × attacks in its window) of the time
const procUptime=(p,k,n)=>1-Math.pow(1-p,k*n);
const hfHpPerSec=()=>{const k=hfCards();if(!k)return 0;return procUptime(num(CRD().hfPct)/100,k,physAtkPerSec()*5)*num(CRD().hfHp)};
// SP from cards, against the monster in play:
// Dracula Card: each physical or magic attack has a 10% chance to restore 20 SP/s for 7 s (refreshes, doesn't stack); copies as Hunter Fly
const dracSPPerSec=()=>{const cd=CRD(),k=dracCards();if(!k)return 0;const n=(isSF()||C().a.type==="auto"?atkPerSec():1/useSec())*7;return procUptime(num(cd.dracPct)/100,k,n)*num(cd.dracSp)};
// Dark Priest Card (Sage only): 1 SP each time a physical attack hits, so crits and hits that land
const dpSPPerSec=()=>{if(!CRD().dpOn||state.job!=="Sage")return 0;const r=physAtkPerSec();if(!r)return 0;const m=SG_MOB||calcMob();if(!m)return r;
  return r*withAtk(isSF()?BASIC:C().a,()=>{const cr=critChance(m),hc=hitChance(m)/100;return cr+(1-cr)*hc})};
// +5 SP per kill (Nereid, Tri-Joint… Cards) when a melee physical attack kills that race: counted over the time spent fighting it.
// Not with Spell Fist, where the killing blow is as likely to be the bolt
const killSPPerSec=()=>{const cd=CRD(),m=SG_MOB||calcMob(),t=C().a.type;if(!m||!cd.killSp.includes(m.race)||isSF()||(t!=="auto"&&t!=="phys")||RANGED.includes(C().weapon))return 0;
  const f=rawFight(m);return isFinite(f)&&f>0?5/f:0};
const cardSPPerSec=()=>dracSPPerSec()+dpSPPerSec()+killSPPerSec();
// Energy Coat: damage cut and SP per hit taken (% of Max SP) depend on how full your SP is
const EC_BANDS=[[30,3,"100–81%"],[24,2.5,"80–61%"],[18,2,"60–41%"],[12,1.5,"40–21%"],[6,1,"20–1%"]];
const hsFullSP=()=>atkPerSec()*hsChance()*hsProcSP();
const sgItemsOn=()=>!NO_ITEMS&&hsOnNow()&&spItemAmt()>0; // SP items go with Hindsight
// damage taken, any attack: Energy Coat (Mage, Wizard, Sage), HP back (Hunter Fly, HP regen, consumables) and Vitata's heals. Energy Coat's cut and SP per hit depend on
// how full your SP is: the fullest band your regen can hold after the attack's own SP, else where SP items keep it, else nearly empty
// NO_ITEMS: worked out as if you carry no SP items (Farm without items, see susKill)
let NO_ITEMS=false;
const itemsOnNow=()=>isSF()?sgItemsOn():!NO_ITEMS&&!!C().autoSp&&spItemAmt()>0;
// its hits that land on you per second: a swing every interval, times "swings reach you", less what you dodge
// swingsOnYou: one monster's swings that reach you a second; hitsOnYou: every monster on you, less what you dodge
const swingsOnYou=m=>!m||m.atkMin==null?0:Math.max(0,num(C().hitScale,1))/Math.max(.3,num(C().mobInterval,1.5));
const hitsOnYou=m=>{if(!m||m.atkMin==null)return 0;const dg=dodge(m);return crowdN(m)*swingsOnYou(m)*(dg==null?1:(100-dg)/100)};
function defense(m){
  const raw=mobHitDmg(m);if(raw==null)return null;const hits=hitsOnYou(m);
  const sf=isSF(),max=num(cf("maxSp")),ec=ecOn(),hpBack=hfHpPerSec()+hpRegenPerSec(m),regen=regenPerSec(m),up=sf?sgUpkeep():skillSPPerSec(),hs=sf?hsFullSP():0,spMul=sf?sgSpMult():spCostMul();
  // pz: share of the time you're poisoned, psn: HP a second it drains (Energy Coat doesn't cut it)
  const pz=poisonUp(m),psn=pz*poisonHpPerSec(),self=selfHpPerSec(); // self: HP your own attack spends
  const band=i=>{const red=ec?EC_BANDS[i][0]:0,ecSP=ec?hits*EC_BANDS[i][1]/100*max:0,taken=raw*(1-red/100)*hits,hp=Math.max(0,taken+psn+self-hpBack),cd=CRD(),healSP=cd.vitata&&healHpEff()>0?hp/healHpEff()*num(cd.healSp)*spMul:0;return {i,red,ecSP,healSP,hp,taken,pz,psn,self,label:ec?EC_BANDS[i][2]:""}};
  const cost=b=>up+b.ecSP+b.healSP;
  let b=null;for(let i=0;i<5;i++){const x=band(i);if(cost(x)+hs<=regen){b=x;break}}
  // fb: no band fits your regen, so SP items (or none) set it
  if(!b){const p=num(ECO().spPct,50);b={...(itemsOnNow()?band(p>80?0:p>60?1:p>40?2:p>20?3:4):band(4)),fb:true}}
  return {...b,extra:b.ecSP+b.healSP};
}
// Vitata Card gives Heal Lv1, which you cast yourself rather than an automatic heal: each cast (no cast time, 0.3 s after-cast delay,
// or an attack's worth of time if that's longer) is time you aren't attacking. healShare is that share of your time; at 100% you can't keep up
const HEAL_DELAY=0.3;
const healSec=()=>Math.max(HEAL_DELAY,1/atkPerSec());
// HP one Vitata Heal gives you: the box, + "Heal received +x%" from consumables (Ale's Blessing)
const healHpEff=()=>num(CRD().healHp)*(1+consSum("heal_pct")/100);
const healsPerSec=m=>{const cd=CRD();if(!cd.vitata||!(healHpEff()>0))return 0;const hp=(defense(m)||{}).hp;return hp>0?hp/healHpEff():0};
const healShare=m=>healsPerSec(m)*healSec();
let SG_MOB=null; // monster the SP balance is worked out against
const defSP=()=>{const m=SG_MOB||calcMob();const d=m?defense(m):null;return d?d.extra:0};
const sgItemsPerSec=()=>sgItemsOn()?Math.max(0,sgUpkeep()+defSP()+hsFullSP()-regenPerSec())/spItemAmt():0;
// without SP items, Hindsight only fires as often as spare regen pays for
const hsSustain=()=>{const f=hsFullSP();if(f<=0||sgItemsOn())return 1;return Math.max(0,Math.min(1,(regenPerSec()-sgUpkeep()-defSP())/f))};
// the basic attack under Spell Fist still deals its own physical hit: weapon element, size, DEF, HIT and crits, plus card auto-casts
const withAtk=(a,fn)=>{const c=C(),k=c.a;c.a=a;try{return fn()}finally{c.a=k}};
const sfPhys=m=>withAtk(BASIC,()=>withEl(null,()=>useAvg(m,dmgPerHit(m),procPerUse(m))));
const sfMagic=m=>{const el=atkEl();return sfChance()*sfHit(m,el)*daFactor()+hsChance()*hsSustain()*hsHit(m,el)*(1+dbChance())};
const sfPerAttack=m=>sfMagic(m)+sfPhys(m)*daFactor();
// Hindsight vs none on the session's map, as a note in Sage options: the extra EXP and what the extra SP items cost per 1% (after the extra loot)
function hsCompare(){
  const g=G();if(!isSF()||!hsLvN()){g._note="";return}
  const mp=currentMap()||(calcMob()&&(openMaps(calcMob())[0]||[])[0]);if(!mp||!MAPMOBS[mp]){g._note="";return}
  const L=lvExp(num(C().baseLv))||lvExp(62);const w=walkSec();
  const top=MAPMOBS[mp].filter(x=>!x.m.boss&&!isSkipped(x.m)&&!x.m.expUnknown&&x.m.atkMin!=null).sort((a,b)=>b.n-a.n)[0];const mm=top?top.m:null;
  const run=v=>withHs(v,()=>{const k=SG_MOB;SG_MOB=mm;try{return {r:mapStats(mp,w),items:sgItemsPerSec()}}finally{SG_MOB=k}});
  const on=run(true),off=run(false);if(!on.r||!off.r){g._note="";return}
  const costHr=(on.items-off.items)*3600*spItemPrice(),gain=(on.r.epm-off.r.epm)*60/L*100,net=costHr-(on.r.zg-off.r.zg),per=gain>0?net/gain:Infinity;
  g._note=`Hindsight on ${mapCode(mp)}: ${gain<=0?"no EXP gain":`+${gain.toFixed(2)}%/hr EXP, ${net<=0?"the extra loot pays for its SP items":`~${fmtN(per)} z per 1% EXP in SP items`}`}`;
}
// ---- Farm without items: can your own recovery keep up with what a monster or map costs you, with no HP or SP items? ----
// Per kill: the HP it takes off you while you fight it (its ATK through your DEF, its hits that get past your FLEE, Energy Coat's cut)
// against HP back over fight + walk (natural regen and Increase HP Recovery, HP-over-time consumables, Hunter Fly while you attack),
// and the SP your attack and Energy Coat use against SP back (natural regen and Increase SP Recovery, consumables, SP cards while you attack).
// Spare SP pays for Heal when HP falls short, spare HP for Indulge when SP falls short. The % is the share of what you use that comes back
// (the lower of HP and SP): green 100% and no kill takes half your Max HP, yellow 50% or more (you sit now and then), red below that or
// when one kill can take all your HP before regen catches up and you have no Heal
const skRowOf=(slug,lv)=>{for(const t of SKILLS[state.job]||[])for(const s of t.skills)if(s.slug===slug)return s.lv[Math.min(lv,s.lv.length)-1]||null;return null};
// Heal (Acolyte, Priest, Monk, Crusader) at its learned level: (BaseLv + INT) / 5 × 3 × Lv + MATK, × Heal received % (rAthena's renewal
// formula, not checked in game), SP from Zero's skill data. Without it, Vitata's Heal Lv1 (the HP / SP boxes on the Cards card). null: no Heal
function healOpt(){const lv=skLv(C(),"heal");
  if(lv>0){const r=skRowOf("heal",lv);return {name:`Heal Lv${lv}`,hp:(Math.floor((num(C().baseLv)+(statVal(C(),"int")||0))/5)*3*lv+sumStat(cf("matkTxt")))*(1+consSum("heal_pct")/100),sp:num(r?r[0]:10+3*lv)*spCostMul()}}
  return CRD().vitata&&healHpEff()>0?{name:"Vitata's Heal Lv1",hp:healHpEff(),sp:num(CRD().healSp)*(isSF()?sgSpMult():spCostMul())}:null}
// Indulge (Sage) at its learned level: 10% of Max HP for (10 × Lv)% of that as SP, less the Lv SP it costs (the 10% is classic RO's,
// not checked in game). null: not learned, or it can't give SP back
function indulgeOpt(){const lv=skLv(C(),"indulge");if(!(lv>0))return null;const hp=num(cf("maxHp"))*0.1,r=skRowOf("indulge",lv),sp=hp*lv/10-num(r?r[0]:lv)*spCostMul();
  return sp>0?{name:`Indulge Lv${lv}`,hp,sp}:null}
// one kill of m with w seconds walking: HP and SP out and back, fight time F being the attacking alone (no resting or heals).
// burst: HP lost over the fight alone (regen and Hunter Fly during it taken off). raw: rawFight(m) worked out with SP items as they are, which
// is the same without them unless Spell Fist's Hindsight runs on SP items; d0: defense(m) likewise, the same unless SP items set Energy Coat's band
function susKill(m,w,raw,d0){const k=SG_MOB,ki=NO_ITEMS;SG_MOB=m;const same=raw!=null&&!(isSF()&&sgItemsOn());NO_ITEMS=true;try{
  // poison (poisonUp) drains HP over the whole kill, walking too, and stops natural regen part of the time
  const F=same?raw:rawFight(m);if(!isFinite(F))return null;const d=same&&d0!==undefined&&!(d0&&d0.fb&&ecOn())?d0:defense(m),T=F+w,hpBack=hpRegenPerSec(m),spBack=(REGEN_OFF?0:(spRegen8()/8+isrPer10()/10)*(1-poisonUp(m)))+consSPPerSec();
  const hpOut=d?d.taken*F+d.psn*T:0,hf=hfHpPerSec()*F,spOut=(isSF()?sgUpkeep()*T+hsFullSP()*hsSustain()*F:skillSPPerSec()*F)+(d?d.ecSP*F:0);
  return {F,T,hpOut,hpIn:hf+hpBack*T,hf,spOut,spIn:cardSPPerSec()*F+spBack*T,card:cardSPPerSec()*F,hpBack,spBack,burst:Math.max(0,hpOut-hf-hpBack*F),known:!!d,dodge:dodge(m)}}
  finally{SG_MOB=k;NO_ITEMS=ki}}
// kills: [{k: susKill, n: spawns}] (a map's monsters, or one with n 1). Adds them up per kill, lets Heal and Indulge trade what's spare, and grades it
function susCalc(kills){const L=kills.filter(x=>x.k);if(!L.length)return null;const W=L.reduce((a,x)=>a+x.n,0),sum=f=>L.reduce((a,x)=>a+x.n*f(x.k),0)/W;
  const T=sum(k=>k.T),hpOut=sum(k=>k.hpOut),hpIn=sum(k=>k.hpIn),spOut=sum(k=>k.spOut),spIn=sum(k=>k.spIn),maxHp=num(cf("maxHp"));
  const h=healOpt(),ind=indulgeOpt();let hpS=hpIn-hpOut,spS=spIn-spOut,heals=0,inds=0;
  if(hpS<0&&h&&spS>0){heals=Math.min(-hpS/h.hp,spS/h.sp);hpS+=heals*h.hp;spS-=heals*h.sp}
  if(spS<0&&ind&&hpS>0){inds=Math.min(-spS/ind.sp,hpS/ind.hp);spS+=inds*ind.sp;hpS-=inds*ind.hp}
  const hpCov=hpOut>0?Math.max(0,1+Math.min(0,hpS)/hpOut):1,spCov=spOut>0?Math.max(0,1+Math.min(0,spS)/spOut):1,score=Math.min(hpCov,spCov)*100;
  // what's still short you sit out: seconds a kill, at your regen
  const hpBack=sum(k=>k.hpBack),spBack=sum(k=>k.spBack),rest=Math.max(hpS<0?(hpBack>0?-hpS/hpBack:Infinity):0,spS<0?(spBack>0?-spS/spBack:Infinity):0);
  const burst=h||!(maxHp>0)?0:Math.max(...L.map(x=>x.k.burst))/maxHp,known=L.every(x=>x.k.known);
  const cls=score>=99.95&&burst<0.5?"good":score>=50&&burst<1?"warnc":"bad";
  const pm=v=>v/T*60;
  return {mob:MOBBED,score,hpCov:hpCov*100,spCov:spCov*100,cls,label:cls==="good"?"keeps up":cls==="warnc"?"with rests":"needs items",burst,rest,known,T,
    hpOutM:pm(hpOut),hpInM:pm(hpIn),hfM:pm(sum(k=>k.hf)),spOutM:pm(spOut),spInM:pm(spIn),cardM:pm(sum(k=>k.card)),
    heal:h,healsM:pm(heals),healM:pm(heals*(h?h.hp:0)),ind,indsM:pm(inds),indM:pm(inds*(ind?ind.sp:0))}}
const susMob=(m,w)=>susCalc([{k:susKill(m,w),n:1}]);

// drop rate bonus % scales every drop chance
// ---- items skills use up (catalysts, arrows; data/consumables.js) and the zeny they cost ----
// price: the one you typed for the item (c.itemPrices, saved per job like the SP item price), else its NPC buy price, less Discount from NPCs
const CONS_ID={};Object.entries(CONSUM).forEach(([id,[n]])=>CONS_ID[n]=id);
const consName=id=>(CONSUM[id]||[])[0]||"#"+id;
const consNpc=id=>num((CONSUM[id]||[])[1]);
const consPrice=id=>{const v=(C().itemPrices||{})[id];return (v!=null&&v!==""?num(v):consNpc(id))*discMul()};
const consW=id=>num((CONSUM[id]||[])[2]);
// bows, instruments and whips fire arrows: one per basic attack, a.arrows per use of a skill. The arrow is the attack's element
const ARROW_WEAPONS=["Bow","Musical instrument","Whip"];
const ARROW_OF={Neutral:"Arrow",Fire:"Fire Arrow",Water:"Crystal Arrow",Earth:"Stone Arrow",Wind:"Arrow of Wind",Holy:"Silver Arrow",Shadow:"Arrow of Shadow",Ghost:"Immaterial Arrow",Poison:"Poison Arrow"};
const usesArrows=(a=C().a)=>ARROW_WEAPONS.includes(C().weapon)&&(a.type==="auto"||num(a.arrows)>0);
// [{id, qty}] one use of the attack takes
function useItems(a=C().a){const out=[],add=(name,qty)=>{const id=CONS_ID[name];if(id&&qty>0)out.push({id,qty})};
  (a.consumes||[]).forEach(x=>add(x.item,num(x.qty,1)));if(usesArrows(a))add(ARROW_OF[atkEl()]||"Arrow",a.type==="auto"?1:num(a.arrows));return out}
// zeny one use costs: its zeny (Mammonite) plus the items it uses up
const useZeny=()=>num(C().a.zeny)+useItems().reduce((t,x)=>t+x.qty*consPrice(x.id),0);
// support casts (traps, Stone Curse, Bomb: SUPPORT in game.js) for this job, and the items they take per kill at the casts per kill you typed.
// supShown: the ones to offer; with a skill tree only learned skills (or ones you already typed casts for)
const supOf=()=>SUPPORT.filter(s=>s.jobs.includes(state.job));
const supShown=()=>{const c=C();return supOf().filter(s=>!hasTree(c)||skLv(c,s.sk||s.key)>0||supCasts(s.key)>0)};
const supCasts=k=>Math.max(0,num((C().supCasts||{})[k]));
const supItemsKill=()=>supOf().flatMap(s=>s.items.map(([n,q])=>({id:CONS_ID[n],qty:q*supCasts(s.key)}))).filter(x=>x.id&&x.qty>0);
// zeny skills cost per kill: zeny per use × uses per kill, shared across monsters hit, plus support casts
const skillZeny=m=>{const sup=supItemsKill().reduce((t,x)=>t+x.qty*consPrice(x.id),0),z=useZeny();if(!z)return sup;const u=usesPerKill(m);return (isFinite(u)?z*u/targets():0)+sup};
// what the attack, support casts and ground buffs use up in an hour on one monster farmed on its own (fight + walk + selling trips):
// items [{id, n per hour, z zeny, w weight}], zeny per hour (items + skill zeny such as Mammonite) and weight per hour
function useHour(m,w){const r=mobRow(m,w);if(!r||!isFinite(r.tot)||!(r.tot>0))return null;const kph=3600/r.tot,per={};let skz=0;
  const add=(id,n)=>{if(n>0)per[id]=(per[id]||0)+n};
  withEl(r.el2,()=>{const u=usesPerKill(m);if(!isFinite(u))return;const uph=u/targets()*kph;useItems().forEach(x=>add(x.id,x.qty*uph));skz=num(C().a.zeny)*uph});
  supItemsKill().forEach(x=>add(x.id,x.qty*kph));fieldBuffs().forEach(f=>add(f.id,f.perHr));
  const items=Object.entries(per).map(([id,n])=>({id,n,z:n*consPrice(id),w:n*consW(id)}));
  return {kph,items,el:r.el2,skz,z:skz+items.reduce((t,x)=>t+x.z,0),w:items.reduce((t,x)=>t+x.w,0)}}
// Sage ground buffs you switched on (FIELD_ITEM in game.js): an item every 60 s × level, as zeny per hour like the ASPD potion
const fieldBuffs=()=>{const c=C();return Object.keys(FIELD_ITEM).filter(k=>(c.buffs||{})[k]&&skLv(c,k)>0).map(k=>({k,id:CONS_ID[FIELD_ITEM[k]],perHr:60/skLv(c,k)}))};
const fieldCostHr=()=>fieldBuffs().reduce((t,f)=>t+f.perHr*consPrice(f.id),0);
// ---- recovery items (data/recovery.js): HP and SP items priced per HP / SP ----
// per character (chars.<Job>.recovery): the HP and SP item you use ("auto" = the cheapest per HP / SP that has a price; "none" = no item;
// "custom" = the restores / costs boxes next to it) and your own min / max / weight / prices per item (overrides).
// Per account (state.recovery.discount, on by default): buy at the Discount price, since a Merchant on the account can buy for the others
const REC_D={hpItem:"auto",spItem:"auto",overrides:{}};
const REC=()=>{const c=C();if(!c.recovery||typeof c.recovery!=="object")c.recovery={};const r=c.recovery;for(const k in REC_D)if(r[k]==null||typeof r[k]!==typeof REC_D[k])r[k]=JSON.parse(JSON.stringify(REC_D[k]));return r};
const recDisc=()=>!state.recovery||state.recovery.discount!==false;
const REC_IDS=Object.keys(RECOVERY);
// HP / SP items restore more with a consumable such as Ale's Blessing (+20%)
const recMul=()=>1+consSum("rec_item_pct")/100;
// one item with your changes: avg restored (min and max averaged, × recMul), the price used (Discount or NPC price, else the player price; null = n/a),
// zeny per HP / SP and HP / SP per weight
function recItem(id){const b=RECOVERY[id];if(!b)return null;const o=REC().overrides[id]||{},v=k=>o[k]!=null?o[k]:b[k];
  const min=num(v("min")),max=Math.max(min,num(v("max"))),avg=(min+max)/2*recMul(),w=num(v("w")),npc=v("npc"),disc=v("disc"),player=v("player");
  const src=npc!=null?(recDisc()&&disc!=null?"disc":"npc"):player!=null?"player":null,price=src?{disc,npc,player}[src]:null;
  return {id,name:b.name,kind:b.kind,min,max,avg,w,wOk:b.wOk!==false,npc,disc,player,src,price,per:price!=null&&avg>0?price/avg:null,perW:w>0?avg/w:null,edited:Object.keys(o).length>0}}
const recItems=kind=>REC_IDS.filter(id=>!kind||RECOVERY[id].kind===kind).map(recItem);
const recCheapest=kind=>recItems(kind).filter(x=>x.per!=null).sort((a,b)=>a.per-b.per)[0]||null;
// the item in use: the one you picked when it has a price, else the cheapest (auto, with want = a picked item that has no price); null with "none"
function recPick(kind){const k=REC()[kind==="hp"?"hpItem":"spItem"];if(k==="none")return null;
  if(k==="custom"){const c=C(),hp=kind==="hp",avg=num(hp?c.itemHp:c.itemSp)*recMul(),price=num(hp?c.itemHpPrice:c.itemPrice)*discMul();
    return {id:"custom",name:`Custom ${kind.toUpperCase()} item`,kind,avg,price,per:avg>0?price/avg:null,custom:true}}
  const it=RECOVERY[k]&&RECOVERY[k].kind===kind?recItem(k):null;if(it&&it.per!=null)return it;const ch=recCheapest(kind);return ch?{...ch,auto:true,want:it}:null}
const spItemAmt=()=>{const p=recPick("sp");return p?num(p.avg):0};
const spItemPrice=()=>{const p=recPick("sp");return p?num(p.price):0};
// HP items to make up an HP loss per minute: items per hour (n), zeny per hour (z) and the item (p)
const hpHeal=hpm=>{const p=recPick("hp");if(!p||!(hpm>0)||!(p.avg>0))return {n:0,z:0,p};const n=hpm*60/p.avg;return {n,z:n*num(p.price),p}};
// SP your attack is short of per hour on a map (SP use less regen and cards), weighted by spawns and time like HP lost / min. It's what SP items
// would cover; they're only bought with "auto-use when needed" on (Sage: with Hindsight), else you rest
function mapSpShort(mp,w,el){let s=0,t=0;withMobbed(mp,()=>withEl(el,()=>(MAPMOBS[mp]||[]).forEach(({m,n})=>{if(m.boss||isSkipped(m)||m.expUnknown)return;const r=mobRow0(m,w);if(!isFinite(r.tot))return;
  const k=SG_MOB;SG_MOB=m;try{s+=n*r.tot*Math.max(0,spNeedPerSec()-regenPerSec())}finally{SG_MOB=k}t+=n*r.tot})));return t?s/t*3600:0}
// zeny per kill: the exported loot value (rozerodb, NPC prices) scaled by your drop rate bonus. A drop you sell to players
// counts at the market price you typed instead: the loot value already holds its NPC price, so the market price adds only what
// it beats the NPC price by. Its chance is scaled by the drop bonus and the level penalty, capped at 100%
const dropMul=()=>1+num(state.dropBonus)/100;
// NPC sell price: the one you typed, else rozerodb's (data/prices.js), else 0
const npcSell=id=>{const v=state.npcPrices[id];return v!=null&&v!==""?num(v):num(NPCSELL[id])};
// drop rate cut by level gap = monster Lv − your base Lv (official guide, roz.mygnjoy.com/en/intro/guide/11): "~ -19" no penalty,
// "-40 ~" 50% reduction. The guide gives nothing for −20 to −39 (pct null), so that band counts as no cut and is flagged as unknown
const DROP_PEN=[{min:-19,pct:0},{min:-39,pct:null},{min:-Infinity,pct:50}];
const dropGap=m=>m.lv>0&&num(C().baseLv)>0?m.lv-num(C().baseLv):null;
const dropBand=m=>{const g=dropGap(m);return g==null?DROP_PEN[0]:DROP_PEN.find(b=>g>=b.min)};
const dropPenalty=m=>dropBand(m).pct||0;
const penMul=m=>1-dropPenalty(m)/100;
// "drops −50% (Lv gap −45)" for the UI, or "" with no penalty
const penNote=m=>{const b=dropBand(m),g=String(dropGap(m)).replace("-","−");return b.pct?`drops −${b.pct}% (Lv gap ${g})`:b.pct===null?`drop penalty unknown (Lv gap ${g}), counted as none`:""};
// what an NPC actually pays you, with Overcharge (the game rounds down per item)
const npcPays=id=>Math.floor(npcSell(id)*ocMul());
const marketGain=id=>{const p=state.prices[id];return p>0?Math.max(0,p-npcPays(id)):0};
// auto-loot (in-game Looting tab): the item groups you pick up (data/itemtypes.js); a drop left on the ground earns nothing.
// The game can limit weapons and armor to ones with N+ random options; how often a drop rolls that many isn't known, so here they're all or nothing
const LOOT_GROUPS=[["w","Weapons"],["a","Armor"],["u","Consumable"],["c","Cards"],["e","Miscellaneous"],["o","Costume"]];
const looted0=g=>(state.autoLoot||{})[g]!==false;
const looted=id=>looted0(ITEMTYPE[id]||"e");
// the exported loot value holds every drop at rozerodb's NPC price; when you leave some behind, the ones you loot are added up instead
const lootVal=m=>m.loot==null?0:(m.drops||[]).every(([id])=>looted(id))?m.loot:(m.drops||[]).reduce((a,[id,ch])=>looted(id)?a+num(NPCSELL[id])*ch/100:a,0);
// the guide doesn't give an order: chance × drop bonus × level penalty, then the 100% cap
const marketVal=m=>(m.drops||[]).reduce((a,[id,ch])=>{const g=looted(id)?marketGain(id):0;return g>0?a+g*Math.min(100,ch*dropMul()*penMul(m))/100:a},0);
const hasLoot=m=>m.loot!=null||marketVal(m)>0;
const zenyKill=m=>lootVal(m)*ocMul()*dropMul()*penMul(m)+marketVal(m);
// one drop's share of zeny per kill (0 if you don't loot it); over all drops they add up to zenyKill, give or take rozerodb's rounding
const dropZ=(m,id,ch)=>looted(id)?num(NPCSELL[id])*ocMul()*ch/100*dropMul()*penMul(m)+marketGain(id)*Math.min(100,ch*dropMul()*penMul(m))/100:0;

// ---- maps ----
const REGIONS=[
 {id:"ct",name:"Clock Tower",when:"Oct 2026",pre:["c_tower","tow_d","alde_dun"]},
 {id:"gh",name:"Glast Heim",when:"Dec 2026",pre:["gl_","glast_"]},
 {id:"lu",name:"Lutie",when:"Jan 2027",pre:["xma_"]},
 {id:"go",name:"Gonryun",when:"Mar 2027",pre:["gon_"]},
 {id:"lo",name:"Louyang",when:"Apr 2027",pre:["lou_"]},
 {id:"ay",name:"Ayothaya",when:"Apr 2027",pre:["ayo_"]},
 {id:"am",name:"Amatsu",when:"May 2027",pre:["ama_"]},
 {id:"ju",name:"Juno",when:"Jun 2027",pre:["yun_"]},
 {id:"tu",name:"Turtle Island",when:"TBA",pre:["tur_"]},
 {id:"nf",name:"Niflheim",when:"not on roadmap",pre:["nif_","niflheim"]},
 {id:"um",name:"Umbala",when:"not on roadmap",pre:["um_"]}];
const regionOf=map=>REGIONS.find(r=>r.pre.some(p=>map.toLowerCase().startsWith(p)));
// map names: SPAWN and saves use rozerodb codes (sp_d05); data/maps.js has the in-game code and name (in_sphinx5 · Sphinx B5F) and other codes
const mapCode=mp=>(MAPNAMES[mp]||[])[0]||mp;
const mapName=mp=>(MAPNAMES[mp]||[])[1]||"";
const mapLabel=mp=>mapName(mp)?`${mapCode(mp)} (${mapName(mp)})`:mapCode(mp);
// any code, or a name only one map has, back to the rozerodb code
const MAPALIAS={};{const byName={};Object.entries(MAPNAMES).forEach(([k,[g,n,...rest]])=>{[k,g,...rest].forEach(a=>MAPALIAS[a.toLowerCase()]=k);const l=n.toLowerCase();byName[l]=l in byName?null:k});
  Object.entries(byName).forEach(([n,k])=>{if(k&&!(n in MAPALIAS))MAPALIAS[n]=k})}
const mapKey=s=>{const t=String(s??"").trim().toLowerCase();return MAPALIAS[t]||t};
const isClosed=map=>{const r=regionOf(map);return (r&&state.regions[r.id]!==false)||state.closed.some(c=>mapKey(c)===mapKey(map))};
const openMaps=m=>(SPAWN[m.id]||[]).filter(x=>!isClosed(x[0])).sort((a,b)=>b[1]-a[1]);
// monsters you skip (e.g. ones that stun you): left out of map averages, you walk past them
const isSkipped=m=>!!(state.skipMobs&&state.skipMobs.includes(m.id));
// rozerodb has no EXP for some monsters yet (Myst, Isis, Anubis...): shown as "?" and left out of EXP averages
const fmtExp=m=>m.expUnknown?"?":fmtN(m.exp);
const MAPMOBS={};
Object.entries(SPAWN).forEach(([id,arr])=>{const m=MOBS.find(x=>x.id===+id);if(!m)return;arr.forEach(([mp,n])=>{(MAPMOBS[mp]=MAPMOBS[mp]||[]).push({m,n})})});

// ---- tracker math ----
function cumulative(e,base){let total=0;for(let l=base;l<e.lv;l++)total+=lvExp(l)||100;return total+(e.pct/100)*(lvExp(e.lv)||100)}
// pausing: s.pauses=[{from,to}] (to missing while paused); paused time is left out of every rate, EXP gained is still counted
// EXP % lost on death: 10%, halved by the shop's death penalty item
const diePct=()=>state.dieItem?5:10;
const openPause=s=>(s.pauses||[]).find(p=>p.to==null);
const pausedMs=(s,a,b)=>(s.pauses||[]).reduce((x,p)=>x+Math.max(0,Math.min(b,p.to??Date.now())-Math.max(a,p.from)),0);
const activeH=(s,a,b)=>(b-a-pausedMs(s,a,b))/36e5;
// logging an entry after a pause started means you're back
const autoResume=(s,t)=>{const p=openPause(s);if(p&&t>=p.from)p.to=Math.max(p.from,t)};
// a death (entry.died: the EXP % it cost) isn't negative EXP/hr: the drop to that entry is given back, up to the penalty. With the
// Died button the entry before it is your EXP just before dying, so that pair adds nothing; a pasted death after EXP gained keeps the gain
const deathBack=(e,q,base)=>{if(!e.died)return 0;const pen=e.died/100*(lvExp(e.lv)||100),d=cumulative(e,base)-cumulative(q,base);return e.t-q.t<=6e4?Math.min(pen,Math.max(0,-d)):pen};
// EXP gained from es[i] to es[j] (sorted), with deaths given back; never below 0 across a death
function gained(es,i,j,base){let x=0;for(let k=i+1;k<=j;k++){const d=cumulative(es[k],base)-cumulative(es[k-1],base);x+=es[k].died?Math.max(0,d+deathBack(es[k],es[k-1],base)):d}return x}
function stats(s){
  const es=[...s.entries].sort((a,b)=>a.t-b.t);if(es.length<2)return null;
  // the recent rate runs from the newest entry at least a minute (unpaused) before the last, so a death logged a second after your EXP doesn't blow it up
  const base=es[0].lv,n=es.length-1,last=es[n],pi=es.slice(0,-1).map((e,i)=>i).reverse().find(i=>activeH(s,es[i].t,last.t)>=1/60)??n-1,prev=es[pi];const hrs=(a,b)=>activeH(s,a.t,b.t);
  if(hrs(es[0],last)<=0)return null;
  const avgRaw=gained(es,0,n,base)/hrs(es[0],last);const recRaw=hrs(prev,last)>0?gained(es,pi,n,base)/hrs(prev,last):0;const L=lvExp(last.lv)||100;
  return {es,last,prev,avgRaw,recRaw,avgPct:avgRaw/L*100,recPct:recRaw/L*100,L,recentMin:Math.round(hrs(prev,last)*60),spanMin:Math.round(hrs(es[0],last)*60),
    fullH:avgRaw>0?L/avgRaw:Infinity,nextH:avgRaw>0?L*(1-last.pct/100)/avgRaw:Infinity,deaths:es.filter(e=>e.died).length};
}
// pace and walking only make sense for sessions of the job you have selected (fight time uses its attack)
// a session's monsters are weighted by their spawn counts on the session's map: the open map where most of them spawn (ties: more spawns)
const sessMobs=s=>s.mobIds.map(id=>MOBS.find(m=>m.id===id)).filter(Boolean);
const sessMap=s=>{const k={},tot={};sessMobs(s).forEach(m=>openMaps(m).forEach(([mp,n])=>{k[mp]=(k[mp]||0)+1;tot[mp]=(tot[mp]||0)+n}));
  let best=null;for(const mp in k)if(best==null||k[mp]>k[best]||(k[mp]===k[best]&&tot[mp]>tot[best]))best=mp;return best};
const spawnOn=(m,mp)=>((SPAWN[m.id]||[]).find(x=>x[0]===mp)||[])[1]||1;
// keep(m) drops monsters from the mix (and re-weights the rest); if it would drop all of them the full list is kept
function sessMix(s,keep){const mp=sessMap(s);let list=sessMobs(s).map(m=>({m,w:spawnOn(m,mp)}));const kn=list.filter(x=>!x.m.expUnknown);if(kn.length)list=kn;if(keep){const k=list.filter(x=>keep(x.m));if(k.length)list=k}
  const W=list.reduce((a,x)=>a+x.w,0);if(!W)return null;
  const avg=f=>list.reduce((a,x)=>a+x.w*f(x.m),0)/W;return {list,W,mp,avg}}
function pace0(s,same){
  // with this job's attack, monsters you can't hurt aren't being killed, so they're left out of the mix
  const st=stats(s);const mix=sessMix(s,same?m=>isFinite(bestFight(m)):null);if(!st||!mix||st.avgRaw<=0||!(mix.avg(m=>m.exp)>0))return null;
  const kph=st.avgRaw/mix.avg(m=>killExp(m,s));const obs=3600/kph;const fight=same?mix.avg(bestFight):NaN;
  return {kph,obs,fight,walk:isFinite(fight)&&obs>=fight?obs-fight:null,mix,st};
}
// ---- a session's stats: the character as it was when you logged its entries (s.snap = {at, c}), so its fight time and the walking
// worked out from it don't move when you change gear or stats afterwards (that only changes fight time). A session saved before
// snapshots takes the stats you have when it's first worked out (est) ----
// (gear bonuses, bx, are worked out again from the gear lines or Build from gear when it's used; the other gear set isn't kept)
const charSnap=(c=C())=>{const o=JSON.parse(JSON.stringify(c));delete o.bx;delete o.gearEdit;if(o.build){delete o.build.alt;delete o.build.alts}if(o.sage)delete o.sage._note;return o};
const snapSession=s=>{if((s.job||state.job)===state.job)s.snap={at:Date.now(),c:charSnap()}};
// sessions of this job with a pace and no snapshot yet take the stats you have now, after renderAll has worked everything out
const snapEst=()=>{let n=0;state.sessions.forEach(s=>{if(!s.snap&&(s.job||state.job)===state.job&&stats(s)){s.snap={at:Date.now(),c:charSnap(),est:true};n++}});if(n)save()};
// the model with a copy of a session's snapshot swapped in: redoes what renderAll works out from it (not Hindsight auto: the snapshot
// keeps the choice it had), then puts yours back as it was. Unlike build-ui.js withChar it leaves the snapshot untouched
function withSnap(c,fn){const job=state.job,real=state.chars[job],k={SKFX,EFF,BUILD_LAST};state.chars[job]=JSON.parse(JSON.stringify(c));
  try{SKFX=skillEffects(C());sageFromTree(C());applyBuild();applyConsumables();return fn()}
  finally{state.chars[job]=real;SKFX=k.SKFX;EFF=k.EFF;BUILD_LAST=k.BUILD_LAST}}
// what the walking depends on besides the snapshot: the entries, pauses, monsters, party and EXP bonus
const calKey=s=>[s.snap?s.snap.at:0,s.mobIds.join("."),sessMap(s),partyN(s),num(state.bonus),...s.entries.map(e=>`${e.t}:${e.lv}:${e.pct}:${e.died||0}`),...(s.pauses||[]).map(p=>`${p.from}-${p.to??""}`)].join("|");
// a session's pace with its own stats, worked out once and kept on it (s.walk = {key, sec, fight, kph}); null for another job's session
// Until a session has a snapshot (one saved before them) it follows your stats; renderAll then gives it one (snapEst)
function sessCal(s){if((s.job||state.job)!==state.job||!stats(s))return null;const key=calKey(s);if(s.walk&&s.walk.key===key)return s.walk;
  if(!s.snap){const p=pace0(s,true);return {key,sec:p&&p.walk!=null?p.walk:null,fight:p&&isFinite(p.fight)?p.fight:null,kph:p?p.kph:null}}
  const p=withSnap(s.snap.c,()=>pace0(s,true));
  s.walk={key,sec:p&&p.walk!=null?p.walk:null,fight:p&&isFinite(p.fight)?p.fight:null,kph:p?p.kph:null};return s.walk}
function sessionPace(s){const same=(s.job||state.job)===state.job,p=pace0(s,false);if(!p)return null;
  const k=same?sessCal(s):null,mix=same?sessMix(s,m=>isFinite(bestFight(m))):p.mix;
  return k?{...p,kph:k.kph,obs:3600/k.kph,fight:k.fight??NaN,walk:k.sec,zk:mix.avg(zenyKill),mix,cal:true}:{...p,zk:mix.avg(zenyKill)}}
// the current session's walking time; without one, the first other session of this job that has one. s: the session it's calibrated from
const walkInfo=()=>{const c=cur();for(const s of [c,...state.sessions.filter(x=>x!==c)]){const k=sessCal(s);if(k&&k.sec!=null)return {sec:Math.max(1,k.sec),s}}return {sec:2,s:null}};
const walkSec=()=>walkInfo().sec;
// for tooltips: "walk calibrated from <session>" (with when its stats were taken), or why it's 2s
const walkSrcTxt=()=>{const {s}=walkInfo();return s?`walk calibrated from ${s.name}${s.snap&&s.snap.est?" (with the stats you had when it was first worked out)":s.snap?` (stats from ${fmtD(s.snap.at)} ${fmtT(s.snap.at)})`:""}`:"walk 2s until a session of this job has a pace"};
// job EXP needed for your current job level (Novice / 1st / 2nd job table)
const FIRST_JOBS=["Swordsman","Mage","Archer","Acolyte","Merchant","Thief"];
const jobTier=(job=state.job)=>job==="Novice"?"novice":FIRST_JOBS.includes(job)?"first":"second";
// each table has one entry per job level and the last level is the max (Novice Job Lv 10, per the official guide), so the max level needs nothing
const jobMax=(tier=jobTier())=>JOB_EXP[tier].length;
const jobNeed=()=>{const l=num(C().jobLv);const t=JOB_EXP[jobTier()];return l>=1&&l<t.length?t[l-1]:null};
// job EXP gained per active hour, in % of the newest entry's job level. With each entry's job level known (entryJobLvs) a level-up counts
// the job EXP it really took; without, a Job EXP % drop of 50+ is a level-up and a smaller one is EXP lost (a death) or a typo, so it counts
// as a loss and a mistyped entry cancels out with the next one instead of adding a whole level
function jobRate(s){
  const es=[...s.entries].filter(e=>e.jpct!=null).sort((a,b)=>a.t-b.t);if(es.length<2)return null;
  const t=JOB_EXP[jobTier(s.job||state.job)],jl=entryJobLvs(s),need=l=>l>=1&&l<t.length?t[l-1]:null;
  const cum=e=>{const l=jl.get(e);if(!need(l))return null;let x=0;for(let i=1;i<l;i++)x+=t[i-1];return x+need(l)*e.jpct/100};
  const L=need(jl.get(es[es.length-1]));
  let gain=0;for(let i=1;i<es.length;i++){const a=es[i-1],b=es[i],ca=cum(a),cb=cum(b);let d;
    if(L&&ca!=null&&cb!=null&&jl.get(b)>=jl.get(a))d=(cb-ca)/L*100;else{d=b.jpct-a.jpct;if(d<=-50)d+=100}gain+=d}
  const h=activeH(s,es[0].t,es[es.length-1].t);return h>0?{rate:gain/h,last:es[es.length-1].jpct,h}:null;
}
// each entry's job level (Map entry -> level), read across every session of the same job in time order, as they're one character:
// entries logged from the form keep the one you had; the rest follow from the nearest known one, a Job EXP % drop of 50+ being a level-up.
// With none saved at all, the newest entry of your current job is your current job level.
function entryJobLvs(s){
  const job=s.job||state.job,es=state.sessions.filter(x=>(x.job||state.job)===job).flatMap(x=>x.entries).sort((a,b)=>a.t-b.t);
  const jl=es.map(e=>e.jlv>0?e.jlv:null),up=(a,b)=>a&&b&&a.jpct-b.jpct>=50;
  if(es.length&&!jl.some(Boolean)&&job===state.job&&num(C().jobLv)>0)jl[es.length-1]=num(C().jobLv);
  let k=null,pj=null;es.forEach((e,i)=>{if(jl[i]==null&&k!=null)jl[i]=k+(e.jpct!=null&&up(pj,e)?1:0);if(jl[i]!=null)k=jl[i];if(e.jpct!=null)pj=e});
  k=null;let nj=null;for(let i=es.length-1;i>=0;i--){const e=es[i];if(jl[i]==null&&k!=null)jl[i]=Math.max(1,k-(e.jpct!=null&&up(e,nj)?1:0));if(jl[i]!=null)k=jl[i];if(e.jpct!=null)nj=e}
  return new Map(es.map((e,i)=>[e,jl[i]]))}
// ---- weight: at 70% of Max Weight HP and SP stop regenerating, at 90% you can't attack or use skills (official guide) ----
// a trip ends at your sell point (up to 70% keeps regen, past it carries more but fights with no regen); then you go to town and back
const W_NOREGEN=0.7,W_STOP=0.9;
let REGEN_OFF=false;
const withRegenOff=fn=>{const k=REGEN_OFF;REGEN_OFF=true;try{return fn()}finally{REGEN_OFF=k}};
// weight picked up per kill: each drop you loot (auto loot) × its weight (data/weights.js) × its chance, with your drop bonus and the level-gap penalty
const dropW=(m,id,ch)=>looted(id)?(ITEMW[id]||0)*Math.min(100,ch*dropMul()*penMul(m))/100:0;
const weightKill=m=>(m.drops||[]).reduce((a,[id,ch])=>a+dropW(m,id,ch),0);
// Max Weight (roz.prontera.info stat planner): 2000 + job bonus + 30 per STR point you put in (job, gear and buff STR don't count)
// + 200 per level of Enlarge Weight Limit (Merchant) and of Increase Capacity (taught by the KP shop's Gym Membership, kept forever)
const JOB_WEIGHT={Novice:0,Swordsman:800,Mage:200,Archer:600,Acolyte:400,Merchant:800,Thief:400,Knight:800,Crusader:800,Wizard:400,Sage:400,
  Hunter:700,Bard:600,Dancer:600,Priest:600,Monk:600,Blacksmith:1000,Alchemist:400,Assassin:400,Rogue:400};
const baseStr=c=>c.mode==="build"?num(buildOf(c).base.str):parseFloat(String((c.st||{}).str??"").split("+")[0]);
function maxWCalc(c=C()){const s=baseStr(c),jb=JOB_WEIGHT[state.job],lv=skLv(c,"enlarge-weight-limit")+Math.min(10,Math.max(0,num(c.gymLv)));
  return s>0&&jb!=null?{jb,total:2000+jb+30*s+200*lv}:null}
// the Max Weight in use: what you typed, else the one worked out above (0 = weight off)
const maxWt=(c=C())=>num(c.maxW)>0?num(c.maxW):(maxWCalc(c)||{total:0}).total;
const wOn=()=>maxWt()>0;
const wRoom=lim=>Math.max(0,maxWt()*lim-num(C().curW));
const townSec=()=>Math.max(0,num(C().townMin,3))*60;
// selling past 70% only pays when you can keep fighting with no regen (no SP needed, or SP items on)
// the sell point is any % up to 90 (65% stops a loop before regen stops); blank or 0 means 70%
const sellPct=()=>{const v=num(C().sellAt);return v>0?Math.min(W_STOP*100,v):70};
const sellLim=()=>sellPct()/100;
function tripParts(m,tot,w){const lim=sellLim(),rA=wRoom(Math.min(lim,W_NOREGEN));let rB=0,totB=tot;
  if(lim>W_NOREGEN){totB=withRegenOff(()=>fightSec(m))+w;if(isFinite(totB))rB=Math.max(0,wRoom(lim)-rA)}return {rA,rB,totB}}
// past 70% with no way to keep fighting (no regen, you need SP and have no SP items): the trip stops at 70%
const sellFell=(rA,rB)=>sellLim()>W_NOREGEN&&rB<=0&&wRoom(sellLim())>rA;
// seconds per kill with selling trips: kills up to 70% (or your sell point) at your normal pace, then 70% to the sell point at the no-regen pace, plus the town trip spread
// over the trip's kills. It's linear in weight per kill, so the spawn-weighted map averages still add up
function tripTot(m,tot,w){if(!wOn()||!isFinite(tot))return tot;const wk=weightKill(m);if(!(wk>0))return tot;
  const {rA,rB,totB}=tripParts(m,tot,w);if(rA+rB<=0)return Infinity;return (rA*tot+(rB?rB*totB:0))/(rA+rB)+townSec()*wk/(rA+rB)}
// one trip on this monster alone: kills, minutes farming, and whether a sell point past 70% fell back to 70%
function tripInfo(m,w){const k=SG_MOB;SG_MOB=m;try{if(!wOn())return null;const wk=weightKill(m),tot=fightSec(m)+w;if(!(wk>0)||!isFinite(tot))return {wk,kills:Infinity};
  const {rA,rB,totB}=tripParts(m,tot,w);return {wk,kills:(rA+rB)/wk,min:(rA*tot+(rB?rB*totB:0))/wk/60,fell:sellFell(rA,rB)}}finally{SG_MOB=k}}
function mobRow0(m,w){const kSG=SG_MOB;SG_MOB=m;try{return mobRow00(m,w)}finally{SG_MOB=kSG}}
function mobRow00(m,w){
  const raw=rawFight(m),sec=fightSec(m,raw),def=defense(m),tot=tripTot(m,sec+w,w),epk=killExp(m),jpk=killJobExp(m),ok=isFinite(tot)&&tot>0;
  // zk: zeny per kill after what the skills use up; hc: SP items, ASPD potion and ground buffs per hour; zph: net zeny per hour
  // sph: SP items per hour (what huntCostHr counts)
  const zc=skillZeny(m),zk=zenyKill(m)-zc,sph=itemsPerSec()*3600,hc=sph*spItemPrice()+hourCostHr();
  return {sec,tot,epm:ok?epk/tot*60:0,epk,jpm:ok?jpk/tot*60:0,jpk,hitc:hitChance(m),mult:hitPctOf(m),uses:usesPerKill(m),dodge:dodge(m),hpm:hpLossPerMin(m,def),hpi:hpItemsPerMin(m,def),hpt:hpTakenPerMin(m,def),...poisonOf(m,def),zk,zc,hc,sph,zph:ok?zk/tot*3600-hc:0,raw,def};
}
// map averages, weighted by spawn counts; monsters you can't hurt are skipped (you walk past them). With the map's monsters on you at once
const mapStats0=(mp,w)=>withMobbed(mp,()=>mapStats00(mp,w));
function mapStats00(mp,w){
  const list=(MAPMOBS[mp]||[]).filter(x=>!x.m.boss&&!isSkipped(x.m));let N=0,n=0,exp=0,time=0,fight=0,z=0,zc=0,hc=0,spi=0,hp=0,hpi=0,hpt=0,pz=0,psn=0,hpN=0,wt=0;const skip=[],unk=[],sus=[];
  list.forEach(({m,n:c})=>{N+=c;if(m.expUnknown){unk.push(m.name);return}const r=mobRow0(m,w);if(!isFinite(r.sec)){skip.push(m.name);return}
    n+=c;sus.push({k:susKill(m,w,r.raw,r.def),n:c});exp+=c*r.epk;time+=c*r.tot;fight+=c*r.sec;z+=c*r.zk;zc+=c*r.zc;hc+=c*r.hc*r.tot;spi+=c*r.sph*r.tot;wt+=c*weightKill(m);if(r.hpm!=null){hp+=c*r.hpm*r.tot;hpi+=c*r.hpi*r.tot;hpt+=c*r.hpt*r.tot;pz+=c*r.pz*r.tot;psn+=c*r.psn*r.tot;hpN+=c*r.tot}});
  if(!n)return null;
  // zg: zeny / hr after skill items and zeny; zph also takes off SP items, the ASPD potion and ground buffs (per monster, over the time spent on it)
  // healing (Recovery items): SP items (spHr a hour, spZ zeny) and HP items for the HP lost (hpHr, hpZ). zb: zeny / hr before healing, net: after it
  // weight: wk picked up a kill, wph an hour, trip the hours from leaving town to leaving it again (null with weight off or weightless drops)
  const zg=z/time*3600,hcHr=hc/time,hpm=hpN?hp/hpN:null,hpiM=hpN?hpi/hpN:null,spHr=spi/time,spZ=spHr*spItemPrice(),hh=hpHeal(hpiM),wk=wt/n,room=wOn()?wRoom(sellLim()):0;
  return {mp,N,epm:exp/time*60,secT:time/n,sec:fight/n,walk:w,sell:time/n-fight/n-w,epk:exp/n,zg,zph:zg-hcHr,zcost:zc/time*3600+hcHr,hpm,hpi:hpiM,hpt:hpN?hpt/hpN:null,pz:hpN?pz/hpN:0,psn:hpN?psn/hpN:0,skip:skip.length,skipNames:skip,unk:unk.length,unkNames:unk,
    spHr,spZ,hpHr:hh.n,hpZ:hh.z,heal:hh.z+spZ,zb:zg-hcHr+spZ,net:zg-hcHr-hh.z,wk,wph:wt/time*3600,trip:wk>0&&room>0?room/wk*(time/n)/3600:null,sus:susCalc(sus)};
}
// best converter per monster (by EXP/min) and one converter per map
function mobRow(m,w){let best=null;elOptions().forEach(el=>{const r=withEl(el,()=>mobRow0(m,w));r.el2=el;if(!best||r.epm>best.epm)best=r});return best}
function mapStats(mp,w){let best=null;elOptions().forEach(el=>{const r=withEl(el,()=>mapStats0(mp,w));if(r){r.el2=el;if(!best||r.epm>best.epm)best=r}});return best}
// fight time with the best converter or bolt, its SP balance against that monster (not the one you have picked)
const bestFight=m=>mobRow(m,0).sec;
const currentMap=()=>sessMap(cur());
// EXP/min for just the session's monsters (spawn-weighted, fight + walk), best converter like mapStats; the baseline for "Projected"
function sessEpm(s,w){const mix=sessMix(s);if(!mix)return null;let best=null;
  elOptions().forEach(el=>{const v=withEl(el,()=>{let e=0,t=0;mix.list.forEach(({m,w:c})=>{const r=mobRow0(m,w);if(!isFinite(r.sec))return;e+=c*r.epk;t+=c*r.tot});return t>0?e/t*60:0});if(best==null||v>best)best=v});
  return best||null}
// ---- real vs projected: each logged session of this job against what the EXP Hunter projects for it: kills / hr at the walking in
// use (w), with the session's own stats (s.snap), monsters and spawn weights, the converter or bolt that kills fastest ----
const PROJ={};
function sessProj(s,w){const c=sessCal(s);if(!c||!(c.kph>0))return null;const key=calKey(s)+"|"+w.toFixed(4),o=PROJ[s.id];if(o&&o.key===key)return o.v;
  const f=()=>{const mix=sessMix(s,m=>isFinite(bestFight(m)));if(!mix)return null;let best=null;
    elOptions().forEach(el=>{const t=withEl(el,()=>mix.list.reduce((a,{m,w:n})=>a+n*mobRow0(m,w).tot,0))/mix.W;if(isFinite(t)&&t>0&&(best==null||3600/t>best))best=3600/t});return best};
  const kph=s.snap?withSnap(s.snap.c,f):f(),v=kph?{real:c.kph,proj:kph,ratio:c.kph/kph}:null;PROJ[s.id]={key,v};return v}
const median=a=>{const b=[...a].sort((x,y)=>x-y),h=b.length>>1;return !b.length?null:b.length%2?b[h]:(b[h-1]+b[h])/2};
// k: the median of real ÷ projected over sessions longer than 60 min (n of them), which can calibrate the EXP Hunter (state.calOn);
// maps: per map, its sessions, their median ratio and a tooltip
function calInfo(w){const out={k:null,n:0,maps:{}},rs=[];
  state.sessions.forEach(s=>{const p=sessProj(s,w);if(!p)return;const st=stats(s),mp=sessMap(s);if(st.spanMin>60)rs.push(p.ratio);
    if(mp)(out.maps[mp]||(out.maps[mp]={list:[]})).list.push({s,st,...p})});
  out.k=median(rs);out.n=rs.length;
  for(const mp in out.maps){const m=out.maps[mp];m.ratio=median(m.list.map(x=>x.ratio));
    m.tip=m.list.map(x=>`${x.s.name} (${x.st.spanMin} min): ${fmtN(x.real)} kills/hr logged vs ${fmtN(x.proj)} projected = ${x.ratio.toFixed(2)}×`).join("\n")+"\nprojected with each session's own stats and the walking in use"}
  return out}
// the calibration on one EXP Hunter row: kills come k times as fast, so EXP / min, loot and weight per hour scale by k; HP and SP
// per hour and the hourly costs (SP items, the ASPD potion, ground buffs, HP items) don't
function calApply(r,k){const hc=r.zg-r.zph;r.epm*=k;r.secT/=k;r.zg*=k;r.zph=r.zg-hc;r.zb=r.zph+r.spZ;r.net=r.zph-r.hpZ;r.wph*=k;if(r.trip!=null)r.trip/=k;r.cal=k}
// ---- sell timer: how long the session's monsters take to fill you from the weight you have now to your sell point ----
// spawn-weighted like the session pace: weight and seconds per kill are averaged over the mix, so minutes = room / weight per kill ×
// seconds per kill (past 70% at the no-regen pace; if one monster can't keep fighting there, the trip stops at 70%)
function sessTrip(s,w=walkSec()){if(!wOn())return null;const mix=sessMix(s,m=>isFinite(bestFight(m)));if(!mix)return null;
  let wk=0,tA=0,tB=0,rA=0,rB=Infinity;
  mix.list.forEach(({m,w:c})=>{const el=mobRow(m,w).el2,k=SG_MOB;SG_MOB=m;try{withEl(el,()=>{const tot=fightSec(m)+w,p=tripParts(m,tot,w);
    rA=p.rA;rB=Math.min(rB,p.rB);wk+=c*weightKill(m);tA+=c*tot;tB+=c*p.totB})}finally{SG_MOB=k}});
  wk/=mix.W;tA/=mix.W;tB/=mix.W;if(!isFinite(tA))return null;
  const fell=sellFell(rA,rB),at=fell?70:sellPct();
  if(!(wk>0))return {wk,kills:Infinity,min:Infinity,at,fell};
  return {wk,kills:(rA+rB)/wk,min:(rA*tA+(rB?rB*tB:0))/wk/60,at,fell}}
// a running timer is s.trip={from,due} (ms); time the session spends paused is added on, since you aren't picking anything up then
const tripDue=s=>s.trip?s.trip.due+pausedMs(s,s.trip.from,Date.now()):null;
const tripEarly=()=>Math.max(0,num(state.tripEarly))*6e4;
// minutes one trip takes: the ones you typed (state.tripMin), else the ones worked out above; null when neither is there
const tripMinutes=s=>{if(num(state.tripMin)>0)return num(state.tripMin);const t=sessTrip(s);return t&&t.wk>0&&t.kills>=1&&isFinite(t.min)?t.min:null};
// Start / Back from town: you're out farming again, so a pause left open while you sold ends now (else the timer would sit on "Paused")
function startTrip(s,now=Date.now()){const min=tripMinutes(s);if(!(min>0))return false;const p=openPause(s);if(p)p.to=now;
  s.trip={from:now,due:now+min*6e4};return true}


// ---- Zeny Hunter: maps and monsters ranked by net zeny per hour ----
// loot per hour (with your drop bonus, less skill costs such as Mammonite, catalysts and arrows) minus HP and SP items, the ASPD potion and ground buffs.
// Unlike the EXP rankings, monsters with no EXP in rozerodb still count here: they drop loot all the same
// SP items per hour against a monster (spItemsHr), and the SP items, ASPD potion and ground buffs per hour (huntCostHr). The hunters add HP items
// for the HP lost (huntCosts: hpHr, hpZ, spHr, spZ, other, cost = all of them)
const spItemsHr=m=>{const k=SG_MOB;SG_MOB=m||null;try{return itemsPerSec()*3600}finally{SG_MOB=k}};
const huntCostHr=m=>spItemsHr(m)*spItemPrice()+hourCostHr();
// hpi: HP lost / min that HP items cover (hpItemsPerMin)
const huntCosts=(m,hpi)=>{const spHr=spItemsHr(m),spZ=spHr*spItemPrice(),other=hourCostHr(),hh=hpHeal(hpi);return {hpi,hpHr:hh.n,hpZ:hh.z,spHr,spZ,other,cost:hh.z+spZ+other}};
// the monsters you hunt on a map (in-game Monster tab): state.huntOff[map] lists the ones you pass by, set by hand in the Zeny Hunter.
// "Best-paying only" (state.huntAuto) picks for the maps you haven't set: monsters ranked by zeny per second (fight + walk), keeping as many
// as give the most net zeny/hr while still hunting at least minN spawns (the Zeny Hunter's "Min monsters on map"): a rare spawn is
// rarely waiting for you, and nothing here knows respawn times. Passing monsters by thins out your targets: the next one is about
// 1/√density away, so walking per kill grows by √(monsters you can hurt / ones you hunt)
// Or teleport past them, but only with a free teleport (a Creamy Card or the Teleport skill): Fly Wings cost too much to burn one
// on every landing, so without one you walk. Not on maps you've marked "no teleport" either (rozerodb has no map flags).
// Each landing finds a hunted monster about hunted/all of the time, so a kill takes all/hunted − 1 extra jumps of state.teleSec
// seconds each. Each pick uses whichever of the two nets more.
// Kill time includes selling trips (tripTot), like every other ranking
const huntOffOf=mp=>(state.huntOff||{})[mp];
const killTot=(m,sec,walk)=>{const k=SG_MOB;SG_MOB=m;try{return tripTot(m,sec+walk,walk)}finally{SG_MOB=k}};
const noTele=mp=>(state.noTele||[]).includes(mp);
const CREAMY=4040;
const creamyOn=()=>!!CRD().creamy||cardInGear(C(),[CREAMY]);
const canTele=()=>creamyOn()||skLv(C(),"teleport")>0;
const teleSec=()=>state.teleSec==null?1:num(state.teleSec);
// the Zeny Hunter's level filter: monsters outside its Lv range (state.huntMinLv / huntMaxLv, null = any), or with a drop level penalty
// when "Skip drop-penalty monsters" is on (state.huntNoPen), aren't ranked on their own and are passed by on a map, like ones you untick there
const huntLvOk=m=>(state.huntMinLv==null||m.lv>=state.huntMinLv)&&(state.huntMaxLv==null||m.lv<=state.huntMaxLv)&&!(state.huntNoPen&&dropPenalty(m)>0);
const huntMap0=(mp,w,minN=0)=>withMobbed(mp,()=>huntMap00(mp,w,minN));
function huntMap00(mp,w,minN){
  const list=(MAPMOBS[mp]||[]).filter(x=>!x.m.boss&&!isSkipped(x.m));const N=list.reduce((a,x)=>a+x.n,0);
  const rows=list.map(({m,n})=>({m,n,r:mobRow0(m,0)})),ok=rows.filter(x=>isFinite(x.r.sec)),skip=rows.filter(x=>!isFinite(x.r.sec)).map(x=>x.m.name);
  const all=ok.reduce((a,x)=>a+x.n,0);if(!all)return null;
  const at0=(h,n,walk,tele)=>{let time=0,z=0,exp=0,expT=0,hp=0,hpi=0,hpN=0,wt=0;
    h.forEach(({m,n:c,r})=>{const tot=killTot(m,r.sec,walk);time+=c*tot;z+=c*r.zk;wt+=c*weightKill(m);if(!m.expUnknown){exp+=c*r.epk;expT+=c*tot}if(r.hpm!=null){hp+=c*r.hpm*tot;hpi+=c*r.hpi*tot;hpN+=c*tot}});
    const top=h.reduce((a,x)=>!a||x.n>a.n?x:a,null),kph=n/time*3600,loot=z/time*3600,hc=huntCosts(top.m,hpN?hpi/hpN:null);
    return {mp,N,n,walk,tele,kph,secT:time/n,loot,...hc,hpm:hpN?hp/hpN:null,net:loot-hc.cost,zk:z/n,wk:wt/n,wph:wt/time*3600,epm:expT?exp/expT*60:null,skip:skip.length,skipNames:skip,
      earn:h.map(({m,n,r})=>({m,n,zk:r.zk})).sort((a,b)=>b.n*b.zk-a.n*a.zk)}};
  const at=h=>{const n=h.reduce((a,x)=>a+x.n,0);if(!n)return null;const walked=at0(h,n,w*Math.sqrt(all/n),0);
    if(n>=all||!canTele()||noTele(mp))return walked;const jumps=all/n-1,tp=at0(h,n,w+jumps*teleSec(),jumps);return tp.net>walked.net?tp:walked};
  // the ones the level filter lets you hunt; a map with none of them drops out. A pick of yours that hunts none of them falls back to the rest
  const lvOk=ok.filter(x=>huntLvOk(x.m)),off=huntOffOf(mp);let best;if(!lvOk.length)return null;
  if(off){best=at(lvOk.filter(x=>!off.includes(x.m.id)));if(best)best.manual=true}
  if(!best&&state.huntAuto){const rank=lvOk.slice().sort((a,b)=>b.r.zk/(b.r.sec+w)-a.r.zk/(a.r.sec+w));
    for(let k=1;k<=rank.length;k++){const r=at(rank.slice(0,k));if(r&&(r.n>=Math.min(minN,all)||k===rank.length)&&(!best||r.net>best.net))best=r}}
  if(!best)best=at(lvOk);
  if(!best)return null;
  // every monster you can hurt here, hunted or not, for the picker; lvOut: the level filter passes it by
  const on=new Set(best.earn.map(x=>x.m.id));best.mobs=ok.map(({m,n,r})=>({m,n,zk:r.zk,wk:weightKill(m),on:on.has(m.id),lvOut:!huntLvOk(m)})).sort((a,b)=>b.on-a.on||a.lvOut-b.lvOut||b.n*b.zk-a.n*a.zk);
  return best;
}
// one monster farmed on its own: its zeny per kill over fight + walk time. Both hunters also give the weight you pick up a kill (wk) and an hour (wph)
function huntMob0(m,w){const r=mobRow0(m,w);if(!isFinite(r.sec)||!(r.tot>0))return null;const loot=r.zk/r.tot*3600,hc=huntCosts(m,r.hpi),wk=weightKill(m);
  return {m,kph:3600/r.tot,secT:r.tot,loot,...hc,hpm:r.hpm,net:loot-hc.cost,zk:r.zk,wk,wph:wk*3600/r.tot,epm:m.expUnknown?null:r.epm}}
// best converter (or Spell Fist bolt) by net zeny rather than EXP
const bestBy=(fn,k)=>{let best=null;elOptions().forEach(el=>{const r=withEl(el,fn);if(r){r.el2=el;if(!best||r[k]>best[k])best=r}});return best};
const huntMap=(mp,w,minN)=>bestBy(()=>huntMap0(mp,w,minN),"net");
const huntMob=(m,w)=>bestBy(()=>huntMob0(m,w),"net");
