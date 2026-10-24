// ---- build simulator: base stats + job + gear -> the character fields the damage model reads ----
// Data: data/equipment.js (EQUIP, SETS), data/cards.js (CARDS), data/refine.js (REFINE), data/jobs.js (JOBDATA).
// Formulas follow the roz.prontera.info stat planner (Zero): status values, ×VIT/×INT HP/SP, %ATK on the gear side only,
// ASPD % pivoting on 195 with a 190 cap. Pure functions: everything comes in as arguments, nothing touches the page.
const BUILD=(()=>{
  // 2nd job -> 1st job
  const FIRST_OF={Knight:"Swordsman",Crusader:"Swordsman",Wizard:"Mage",Sage:"Mage",Hunter:"Archer",Bard:"Archer",Dancer:"Archer",Priest:"Acolyte",Monk:"Acolyte",Blacksmith:"Merchant",Alchemist:"Merchant",Assassin:"Thief",Rogue:"Thief"};
  const STAT6=["str","agi","vit","int","dex","luk"];
  // ASPD lost while a shield is worn, per job (RO樂園攻速計算機 2026-09-07, sheet "攻速懲罰表"). Assassins use
  // their left-hand row
  const SHIELD_ASPD={Swordsman:5,Mage:10,Archer:9,Acolyte:7,Merchant:5,Thief:6,Knight:5,Crusader:5,Wizard:8,Sage:3,
    Hunter:9,Bard:5,Dancer:5,Priest:3,Monk:3,Blacksmith:5,Alchemist:4,Assassin:6,Rogue:3};
  // Assassin dual wield: a dagger, one-handed sword or one-handed axe in each hand (the left one goes in the Shield row). The left
  // weapon adds a quarter of its own delay: base ASPD drops by floor(aspd_base / 4) with aspd_base Dagger 42, 1h sword 50, 1h axe 51
  // (rAthena renewal job_aspd.yml and status_base_amotion_pc; its Assassin row is the Zero table's 156 base and penalties)
  const DUAL_W=["Dagger","One-handed sword","One-handed axe"];
  const LEFT_ASPD={"Dagger":10,"One-handed sword":12,"One-handed axe":12};
  const dualOk=(job,right,left)=>job==="Assassin"&&DUAL_W.includes(right)&&DUAL_W.includes(left);
  // the gear grid; "takes" lists the item slots (prontera equip_slot) that may go in it
  const SLOTS=[
    {k:"weapon",label:"Weapon",takes:["weapon"]},{k:"shield",label:"Shield",takes:["shield"]},
    {k:"headTop",label:"Upper headgear",takes:["head_upper"]},{k:"headMid",label:"Middle headgear",takes:["head_middle"]},
    {k:"headLow",label:"Lower headgear",takes:["head_lower"]},{k:"armor",label:"Armor",takes:["armor"]},
    {k:"garment",label:"Garment",takes:["garment"]},{k:"shoes",label:"Shoes",takes:["footgear"]},
    {k:"acc1",label:"Accessory",takes:["accessory_1","accessory_2","accessory"]},{k:"acc2",label:"Accessory",takes:["accessory_1","accessory_2","accessory"]},
    {k:"ammo",label:"Arrows / ammo",takes:["ammo"]}];
  // card slot names per gear slot (cards' own "slot" field)
  const CARD_FOR={weapon:"weapon",shield:"shield",headTop:"head",headMid:"head",headLow:"head",armor:"armor",garment:"garment",shoes:"footgear",acc1:"accessory",acc2:"accessory"};
  const WTYPE={dagger:"Dagger",sword_1h:"One-handed sword",sword_2h:"Two-handed sword",spear_1h:"One-handed spear",spear_2h:"Two-handed spear",
    axe_1h:"One-handed axe",axe_2h:"Two-handed axe",mace:"One-handed mace",mace_2h:"Two-handed mace",staff_1h:"One-handed staff",staff_2h:"Two-handed staff",
    bow:"Bow",katar:"Katar",knuckle:"Knuckle",instrument:"Musical instrument",whip:"Whip",book:"Book"};
  const RANGED_W=["Bow","Musical instrument","Whip"];
  const RACE={formless:"Formless",undead:"Undead",brute:"Brute",plant:"Plant",insect:"Insect",fish:"Fish",demon:"Demon",demi_human:"Demi-Human",angel:"Angel",dragon:"Dragon"};
  const SIZE={small:"S",medium:"M",large:"L"};
  const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;

  const byId={};const index=()=>{if(byId.ready)return;byId.ready=true;
    (typeof EQUIP!=="undefined"?EQUIP:[]).forEach(x=>byId[x.id]=x);(typeof CARDS!=="undefined"?CARDS:[]).forEach(x=>byId[x.id]=x)};
  const item=id=>{index();return byId[id]||null};

  // job level bonus: +1 to a stat at each listed job level
  function jobBonus(job,jobLv){const d=(typeof JOBDATA!=="undefined"?JOBDATA:{})[job],o={};STAT6.forEach(k=>o[k]=0);if(!d)return o;
    for(const k in d.bonus)o[k]=d.bonus[k].filter(l=>l<=jobLv).length;return o}
  const curve=(job,kind,lv)=>{const d=(typeof JOBDATA!=="undefined"?JOBDATA:{})[job];const a=d&&d[kind];return a&&a.length?a[Math.min(a.length,Math.max(1,lv))-1]:null};
  // refine totals at +r: [ATK, MATK, DEF]; weapons use "weapon_lvN", armor "armor". An item with no schedule in a slot that
  // normally has none (accessories, middle/lower headgear) gets nothing here: its refine only counts in its own bonus lines
  const NO_SCHEDULE=["accessory","accessory_1","accessory_2","head_middle","head_lower","ammo"];
  function refineAt(it,r){if(!it||!r||typeof REFINE==="undefined")return [0,0,0];
    if(!REFINE[it.refine]&&(it.slot||[]).length&&(it.slot||[]).every(x=>NO_SCHEDULE.includes(x)))return [0,0,0];
    const key=REFINE[it.refine]?it.refine:(it.slot||[]).includes("weapon")?`weapon_lv${it.wlv||1}`:"armor";
    const t=REFINE[key]||REFINE.armor;return t&&t[r-1]?t[r-1]:[0,0,0]}

  // status values from total stats (verified in-game per the planner). FLEE reads as the status window shows it: every FLEE (stats,
  // gear, skills such as Improve Dodge) + Perfect Dodge (1 + LUK / 10 + gear), "147+1"
  function status(lv,s,ranged){const f=Math.floor;
    return {atk:f(lv/4+(ranged?s.dex+s.str/5:s.str+s.dex/5)+s.luk/3),matk:s.int+f(s.int/2)+f(s.dex/5)+f(s.luk/3)+f(lv/4),
      hit:175+lv+s.dex+f(s.luk/3),flee:100+lv+s.agi+f(s.luk/5),softDef:f(lv/2)+f(s.vit/2)+f(s.agi/5), // each part rounds down: Lv 63 VIT 5 AGI 100 shows 53 in game, not 54
      softMdef:Math.max(0,f(s.int+lv/4+(s.dex+s.vit)/5)),crit:1+s.luk*0.3+lv/100,aspdTerm:Math.sqrt(s.agi*s.agi/2+s.dex*s.dex/(ranged?7:5))/4}}

  // ---- bonus accumulation ----
  const blank=()=>({st:{str:0,agi:0,vit:0,int:0,dex:0,luk:0},stPct:{str:0,agi:0,vit:0,int:0,dex:0,luk:0},atk:0,matk:0,atkPct:0,matkPct:0,hit:0,flee:0,pd:0,crit:0,critDmg:0,aspd:0,aspdPct:0,aspdMod:0,
    hp:0,hpPct:0,sp:0,spPct:0,def:0,mdef:0,ranged:0,melee:0,skill:0,skillOf:{},vct:0,fct:0,acd:0,vctOf:{},fctOf:{},ignDef:0,ignMdef:0,
    ign:{def:{race:{},size:{},ele:{},kind:{}},mdef:{race:{},size:{},ele:{},kind:{}}},
    phys:{all:0,race:{},size:{},ele:{},kind:{},group:{}},magic:{all:0,race:{},size:{},ele:{},kind:{},group:{}},myEle:{},taken:{race:{},size:{},ele:{},kind:{}},exp:{all:0,race:{}},critRace:{},spCost:0,spRec:0,hpRec:0,wEle:null,unmodelled:[]});
  // lines that only matter for PvP survival, healing or status resistance: not part of the farming maths, so not reported either
  const QUIET=["resistance_percent","heal_amount_percent","item_heal_percent","sp_recovery_percent","hp_recovery_percent","perfect_hit","magic_damage_taken_percent","sp_per_hit","hp_per_hit"];
  const addTo=(o,k,v)=>{o[k]=(o[k]||0)+v};
  // monster groups ("against Boulder Dwarves") are kept by the text a member's name contains
  const GROUP={boulder_dwarf:"Boulder Dwarf"};
  const tgt=(kind,t)=>kind==="race"?RACE[t]||cap(t):kind==="size"?SIZE[t]||t:kind==="element"?cap(t):kind==="monster_group"?GROUP[t]||String(t).split("_").map(cap).join(" "):t;
  const bucket=kind=>kind==="race"?"race":kind==="size"?"size":kind==="element"?"ele":kind==="monster_kind"?"kind":kind==="monster_group"?"group":null;
  // one bonus line: [type, target kind, target, value, per N refines, skill, scaling skill]
  function apply(A,b,src){const [type,kind,target,value]=b;const v=+value||0;
    if(type==="sp_recovery_percent"&&!kind){A.spRec+=v;return true}
    if(type==="hp_recovery_percent"&&!kind){A.hpRec+=v;return true}
    if(QUIET.includes(type))return true;
    // "Fire Magical Damage +x%" boosts your own spells of that element; physical lines with an element target the monster's element
    if(type==="magic_damage_percent"&&kind==="element"){addTo(A.myEle,tgt(kind,target),v);return true}
    if(type==="exp_percent"&&!kind){A.exp.all+=v;return true}
    if(type==="damage_percent"&&!kind){A.phys.all+=v;return true}
    if(type==="magic_damage_percent"&&!kind){A.magic.all+=v;return true}
    if(type==="sp_cost_percent"&&!kind){A.spCost+=v;return true}
    if(STAT6.includes(type)){A.st[type]+=v;return true}
    if(/_percent$/.test(type)&&STAT6.includes(type.slice(0,-8))){A.stPct[type.slice(0,-8)]+=v;return true}
    if(type==="all_stats"){STAT6.forEach(k=>A.st[k]+=v);return true}
    // "When attacking Brute monsters, CRIT +7": counted only against that race
    if(type==="crit"&&kind==="race"){addTo(A.critRace,tgt(kind,target),v);return true}
    const flat={atk:"atk",matk:"matk",atk_percent:"atkPct",matk_percent:"matkPct",hit:"hit",flee:"flee",perfect_dodge:"pd",crit:"crit",crit_damage_percent:"critDmg",
      aspd:"aspd",aspd_percent:"aspdPct",aspd_mod:"aspdMod",hp:"hp",hp_percent:"hpPct",sp:"sp",sp_percent:"spPct",def:"def",mdef:"mdef",
      ranged_damage_percent:"ranged",melee_damage_percent:"melee"}[type];
    if(flat&&!kind){A[flat]+=v;return true}
    if(type==="attack_delay_percent"&&!kind){A.aspdPct-=v;return true} // −10% delay counts as +10% ASPD
    if(type==="after_cast_delay_percent"&&!kind){A.acd-=v;return true}
    // variable cast % cuts add up; of the fixed cast % cuts only the highest counts
    if(type==="cast_time_variable_percent"&&!kind){if(b[5])addTo(A.vctOf,b[5],-v);else A.vct-=v;return true}
    if(type==="cast_time_fixed_percent"&&!kind){const top=(o,k)=>{o[k]=-v>0?Math.max(o[k]||0,-v):(o[k]||0)-v};if(b[5])top(A.fctOf,b[5]);else top(A,"fct");return true}
    if(type==="skill_damage_percent"&&!kind){if(b[5])addTo(A.skillOf,b[5],v);else A.skill+=v;return true}
    if((type==="damage_percent"||type==="magic_damage_percent"||type==="physical_damage_percent")&&bucket(kind)){
      const ch=bucket(kind),t=tgt(kind,target);if(type!=="magic_damage_percent")addTo(A.phys[ch],t,v);if(type!=="physical_damage_percent"&&type!=="damage_percent")addTo(A.magic[ch],t,v);return true}
    // ignore DEF / MDEF: for every monster, or only against a race, size, element or boss / normal monsters (A.ign)
    if((type==="ignore_def_percent"||type==="ignore_mdef_percent")&&!kind){if(type==="ignore_def_percent")A.ignDef+=v;else A.ignMdef+=v;return true}
    if((type==="ignore_def_percent"||type==="ignore_mdef_percent")&&bucket(kind)&&bucket(kind)!=="group"){addTo(A.ign[type==="ignore_def_percent"?"def":"mdef"][bucket(kind)],tgt(kind,target),v);return true}
    if(type==="damage_taken_percent"&&bucket(kind)&&bucket(kind)!=="group"){addTo(A.taken[bucket(kind)],tgt(kind,target),v);return true}
    if(type==="exp_percent"&&kind==="race"){addTo(A.exp.race,tgt(kind,target),v);return true}
        if(type==="weapon_element"&&target){A.wEle=cap(target);return true}
    A.unmodelled.push(`${src}: ${type}${target?" "+target:""} ${v>0?"+":""}${v}`);return false}

  // random options typed by the player, e.g. "ATK +25, FLEE +20, MATK +3%" -> bonus lines
  const OPT={str:"str",agi:"agi",vit:"vit",int:"int",dex:"dex",luk:"luk",atk:"atk",matk:"matk",hit:"hit",flee:"flee",crit:"crit",critical:"crit",
    def:"def",mdef:"mdef",aspd:"aspd",maxhp:"hp",mhp:"hp",hp:"hp",maxsp:"sp",msp:"sp",sp:"sp"};
  const PCT={atk:"atk_percent",matk:"matk_percent",aspd:"aspd_percent",hp:"hp_percent",sp:"sp_percent",
    str:"str_percent",agi:"agi_percent",vit:"vit_percent",int:"int_percent",dex:"dex_percent",luk:"luk_percent"};
  // also the way the game and rozerodb name them: "Resistance to Demi-Human 7%", "Fire resistance increase 5%", "Phys Damage to Large targets +3%"
  function parseOptions(txt){const out=[],bad=[];String(txt||"").split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).forEach(p=>{
    const m=p.match(/^([a-z ]+?)\s*([+-]\s*\d+(?:\.\d+)?)\s*(%?)$/i);const k=m&&OPT[m[1].toLowerCase().replace(/\s+/g,"")];
    if(!k){const a=named(p);if(a)out.push(a);else bad.push(p);return}const v=parseFloat(m[2].replace(/\s/g,""));
    if(m[3]){if(PCT[k])out.push([PCT[k],null,null,v]);else bad.push(p)}else out.push([k,null,null,v])});return {lines:out,bad}}
  // an option by its affix name and a number: the bonus line it counts as (the value negated for a reduction), null when unknown
  function named(p){const m=p.match(/^(.+?)\s*:?\s*([+-]?)\s*(\d+(?:\.\d+)?)\s*(%?)$/);if(!m)return null;
    const n=m[1].trim().toLowerCase(),o=OPTIONS.find(x=>x.line&&!!x.pct===!!m[4]&&x.label.replace(/ %$/,"").toLowerCase()===n);if(!o)return null;
    const v=(m[2]==="-"?-1:1)*+m[3];return [...o.line,o.neg?-v:v]}
  // random options picked from lists in build mode: gear.opts = [{k, v}], up to OPT_MAX per item whatever the item. Typed lines a save
  // had from before the lists that don't match one are kept as text in gear.optsText when the rows replace them (still not understood)
  // (one item can roll 2 on one drop and 4 on the next). The list is rozerodb's affixes (data/affixes.js), one entry per
  // distinct affix with the bonus line apply() counts it as; line null = an affix the model has no use for (shown, but listed
  // under "Not counted"). neg lines store the value negated: "Resistance to Demon 5%" is damage taken −5%, "Variable Casting
  // reduction 5%" is the data's −5. gear: the min–max it rolls on each gear kind (all pools together)
  const OPT_MAX=5; // the most random options the game rolls on one item
  const RACE_BY=Object.fromEntries(Object.entries(RACE).map(([k,v])=>[v.toLowerCase(),k]));
  const ELES=["neutral","water","earth","fire","wind","poison","holy","shadow","ghost","undead"];
  // rozerodb gear type -> gear kinds (see optGear). Blacksmiths forge melee weapons; the Activation System's Physical Series
  // covers melee and ranged weapons
  const AFFIX_GEAR={"Melee Series":["melee"],"Ranged Series":["ranged"],"Magic Series":["magic"],"Physical Series":["melee","ranged"],
    "Forging Weapons":["melee"],"Armor":["armor"],"Garment":["garment"],"Shoes":["shoes"]};
  // rozerodb affix name -> [key, group, bonus line or null, neg]
  function affixOpt(name){const n=name.replace(/\s*\(%\)$/,"").trim();let m;const L=(t,kind,target)=>[t,kind||null,target||null];
    const flat={"ATK":["atk","Offense","atk"],"MATK":["matk","Offense","matk"],"ASPD":["aspd","Offense","aspd"],"CRI":["crit","Offense","crit"],"HIT":["hit","Offense","hit"],
      "FLEE":["flee","Defense","flee"],"DEF":["def","Defense","def"],"MDEF":["mdef","Defense","mdef"],"MaxHP":["hp","Defense","hp"],"MaxHP(MHP)":["hp","Defense","hp"],
      "MaxSP":["sp","Defense","sp"],"MaxSP(MSP)":["sp","Defense","sp"],"ASPD increase":["aspd_percent","Offense","aspd_percent"],
      "Critical Damage increase":["crit_damage_percent","Offense","crit_damage_percent"],"Long-range Physical Damage increase":["ranged_damage_percent","Offense","ranged_damage_percent"],
      "HP Recovery speed increase":["hp_recovery_percent","Healing","hp_recovery_percent"],"SP Recovery speed increase":["sp_recovery_percent","Healing","sp_recovery_percent"]}[n];
    const pct=/\(%\)$/.test(name);
    if(flat)return [pct&&!/_percent$/.test(flat[0])?flat[0]+"_percent":flat[0],flat[1],L(pct&&!/_percent$/.test(flat[2])?flat[2]+"_percent":flat[2])];
    if(/^Variable Casting reduction$/.test(n))return ["cast_time_variable_percent","Offense",L("cast_time_variable_percent"),true];
    if(n==="SP Consumption reduction")return ["sp_cost_percent","Offense",L("sp_cost_percent"),true];
    if(n==="Heal increase")return ["heal_percent","Healing",null];
    if(n==="Received Healing increase")return ["heal_received_percent","Healing",null];
    const race=r=>RACE_BY[r.toLowerCase()],ele=e=>ELES.includes(e.toLowerCase())?e.toLowerCase():null;
    if((m=n.match(/^(Phys|Magic) Damage to (.+) monsters$/))&&race(m[2]))return [(m[1]==="Phys"?"dmg":"mdmg")+"_race_"+race(m[2]),"Race",L(m[1]==="Phys"?"damage_percent":"magic_damage_percent","race",race(m[2]))];
    if((m=n.match(/^(Phys|Magic) Damage to (Boss|Normal) enemies$/)))return [(m[1]==="Phys"?"dmg":"mdmg")+"_kind_"+m[2].toLowerCase(),"Monster type",L(m[1]==="Phys"?"damage_percent":"magic_damage_percent","monster_kind",m[2].toLowerCase())];
    if((m=n.match(/^Phys Damage to (Small|Medium|Large) targets$/)))return ["dmg_size_"+m[1].toLowerCase(),"Size",L("damage_percent","size",m[1].toLowerCase())];
    if((m=n.match(/^Physical Damage to (.+) enemies$/))&&ele(m[1]))return ["dmg_ele_"+ele(m[1]),"Element",L("damage_percent","element",ele(m[1]))];
    // magic damage vs a monster's element: apply() has no line for it ("Fire magic damage" lines boost your own Fire spells)
    if((m=n.match(/^Magic Damage to (.+) enemies$/))&&ele(m[1]))return ["mdmg_ele_"+ele(m[1]),"Element",null];
    // ignore DEF / MDEF of a race, size, element or boss / normal monsters ("Ignore Dragon Magic Def", "Ignore Normal Enemy Phys Def")
    // "Undead element" / "Fire property" is the element, plain "Undead" the race
    if((m=n.match(/^Ignore (.+?)(?: (enemy|enemies|monsters?|targets?|size|element|property))? (Phys|Magic) Def$/i))){const t=m[3]==="Phys"?"ignore_def_percent":"ignore_mdef_percent",k=m[3]==="Phys"?"ign_def":"ign_mdef",w=m[1].toLowerCase(),byEle=/^(element|property)$/i.test(m[2]||"");
      if(w==="normal"||w==="boss")return [k+"_kind_"+w,"Monster type",L(t,"monster_kind",w)];if(!byEle&&race(m[1]))return [k+"_race_"+race(m[1]),"Race",L(t,"race",race(m[1]))];
      if(SIZE[w])return [k+"_size_"+w,"Size",L(t,"size",w)];if(ele(m[1]))return [k+"_ele_"+ele(m[1]),"Element",L(t,"element",ele(m[1]))]}
    if((m=n.match(/^Phys Damage from (.+) enemies reduction$/))&&ele(m[1]))return ["pres_ele_"+ele(m[1]),"Resist",L("damage_taken_percent","element",ele(m[1])),true];
    // monster spells aren't in the damage-taken model
    if((m=n.match(/^Magic Damage from (.+) enemies reduction$/))&&ele(m[1]))return ["mres_ele_"+ele(m[1]),"Resist",null];
    if((m=n.match(/^(.+) resistance increase$/))&&ele(m[1]))return ["res_ele_"+ele(m[1]),"Resist",L("damage_taken_percent","element",ele(m[1])),true];
    if((m=n.match(/^Resistance to (.+)$/))&&race(m[1]))return ["res_race_"+race(m[1]),"Resist",L("damage_taken_percent","race",race(m[1])),true];
    return ["affix_"+n.toLowerCase().replace(/[^a-z0-9]+/g,"_"),"Other",null]} // an affix added to rozerodb since: listed, not counted
  // options lists made by hand before data/affixes.js: kept so builds and share links saved with them still load and count
  const LEGACY=(()=>{const o=[],add=(g,k,label,type,kind,target,pct,neg)=>o.push({k,g,label,line:[type,kind||null,target||null],pct:!!pct,neg:!!neg});
    STAT6.forEach(k=>add("Stats",k,k.toUpperCase(),k));
    [["atk","ATK"],["matk","MATK"],["hit","HIT"],["crit","CRIT"],["aspd","ASPD"]].forEach(([k,l])=>add("Offense",k,l,k));
    [["atk_percent","ATK"],["matk_percent","MATK"],["aspd_percent","ASPD"],["crit_damage_percent","Critical damage"],["ranged_damage_percent","Ranged physical damage"],
      ["melee_damage_percent","Melee physical damage"],["damage_percent","Physical damage"],["magic_damage_percent","Magic damage"],["ignore_def_percent","Ignore DEF"],["ignore_mdef_percent","Ignore MDEF"]]
      .forEach(([k,l])=>add("Offense",k,l+" %",k,null,null,true));
    add("Offense","cast_time_variable_percent","Variable cast time −%","cast_time_variable_percent",null,null,true,true);
    add("Offense","after_cast_delay_percent","After-cast delay −%","after_cast_delay_percent",null,null,true,true);
    [["hp","Max HP"],["sp","Max SP"],["def","DEF"],["mdef","MDEF"],["flee","FLEE"]].forEach(([k,l])=>add("Defense",k,l,k));
    [["hp_percent","Max HP"],["sp_percent","Max SP"],["hp_recovery_percent","HP recovery"],["sp_recovery_percent","SP recovery"]].forEach(([k,l])=>add("Defense",k,l+" %",k,null,null,true));
    for(const r in RACE){add("Race","dmg_race_"+r,`Damage vs ${RACE[r]} %`,"damage_percent","race",r,true);add("Race","mdmg_race_"+r,`Magic damage vs ${RACE[r]} %`,"magic_damage_percent","race",r,true);
      add("Race","res_race_"+r,`Resist ${RACE[r]} %`,"damage_taken_percent","race",r,true,true)}
    for(const z in SIZE){add("Size","dmg_size_"+z,`Damage vs ${cap(z)} %`,"damage_percent","size",z,true);add("Size","mdmg_size_"+z,`Magic damage vs ${cap(z)} %`,"magic_damage_percent","size",z,true);
      add("Size","res_size_"+z,`Resist ${cap(z)} size %`,"damage_taken_percent","size",z,true,true)}
    ELES.forEach(e=>{add("Element","dmg_ele_"+e,`Damage vs ${cap(e)} monsters %`,"damage_percent","element",e,true);
      add("Element","mele_"+e,`${cap(e)} magic damage %`,"magic_damage_percent","element",e,true);add("Element","res_ele_"+e,`Resist ${cap(e)} %`,"damage_taken_percent","element",e,true,true)});
    [["normal","Normal"],["boss","Boss"]].forEach(([t,l])=>{add("Monster type","dmg_kind_"+t,`Damage vs ${l} monsters %`,"damage_percent","monster_kind",t,true);
      add("Monster type","mdmg_kind_"+t,`Magic damage vs ${l} monsters %`,"magic_damage_percent","monster_kind",t,true)});
    // ignore DEF / MDEF of a race, size, element or boss / normal monsters, named and keyed as affixOpt reads rozerodb's: the ones its
    // affix tables don't have yet (sizes, elements, boss) can still be picked, on every part
    const ign=(g,kind,t,l)=>[["def","Phys"],["mdef","Magic"]].forEach(([d,p])=>add(g,`ign_${d}_${{race:"race",size:"size",element:"ele",monster_kind:"kind"}[kind]}_${t}`,`Ignore ${l} ${p} Def %`,`ignore_${d}_percent`,kind,t,true));
    for(const r in RACE)ign("Race","race",r,RACE[r]);for(const z in SIZE)ign("Size","size",z,cap(z)+" size");ELES.forEach(e=>ign("Element","element",e,cap(e)+" element"));
    [["normal","Normal Enemy"],["boss","Boss Enemy"]].forEach(([t,l])=>ign("Monster type","monster_kind",t,l));
    return o})();
  // keys an affix replaced; none so far: each affix that means the same as a hand-made entry took over its key
  const OPT_ALIAS={};
  const OPTIONS=(()=>{const o=[],by={};
    ((typeof AFFIXES!=="undefined"&&AFFIXES.rows)||[]).forEach(([,type,,name,min,max,pct])=>{const [k,g,line,neg]=affixOpt(name);
      let x=by[k];if(!x){x=by[k]={k,g,label:name.replace(/\s*\(%\)$/,"")+(pct?" %":""),line,pct:!!pct,neg:!!neg,gear:{}};o.push(x)}
      (AFFIX_GEAR[type]||[]).forEach(gk=>{const r=x.gear[gk];x.gear[gk]=r?[Math.min(r[0],min),Math.max(r[1],max)]:[min,max]})});
    LEGACY.forEach(x=>{if(!by[x.k]&&!OPT_ALIAS[x.k]){by[x.k]={...x,g:"Other",gear:{}};o.push(by[x.k])}});return o})();
  const OPT_BY=Object.fromEntries(OPTIONS.map(x=>[x.k,x]));
  // the gear kind a row's item rolls options as: weapons by type (staves magic, bows / instruments / whips ranged, the rest
  // melee; a weapon in the Shield row too), else armor / garment / shoes; null for parts rozerodb lists no pool for. Books and
  // weapons with MATK (Encyclopedia, Bazerald) also roll the magic series: "melee+magic"
  function optGear(slot,it){if(it&&(it.slot||[]).includes("weapon")){const w=WTYPE[it.type];
      if(/staff/.test(it.type||""))return "magic";const k=RANGED_W.includes(w)?"ranged":"melee";return it.type==="book"||it.matk>0?k+"+magic":k}
    return {armor:"armor",garment:"garment",shoes:"shoes"}[slot]||null}
  // the options a row offers, with the min–max for its gear (over every kind it rolls as); every option when its gear has no
  // pool. Options rozerodb has no affix for ("Other": special enchants, like a dungeon's gear) go on every part
  function optChoices(slot,it){const gk=optGear(slot,it),ks=gk?gk.split("+"):[],other=x=>!Object.keys(x.gear).length;
    if(!ks.some(k=>OPTIONS.some(x=>x.gear[k])))return OPTIONS.map(x=>({...x,range:null}));
    return OPTIONS.filter(x=>other(x)||ks.some(k=>x.gear[k])).map(x=>{const rs=ks.map(k=>x.gear[k]).filter(Boolean);
      return {...x,range:rs.length?[Math.min(...rs.map(r=>r[0])),Math.max(...rs.map(r=>r[1]))]:null}})}
  const optKey=k=>OPT_ALIAS[k]||k;
  // the picked rows; a build saved before the lists keeps its typed text and is read as rows where it matches one
  function optRows(opts){if(Array.isArray(opts))return opts.filter(x=>x&&OPT_BY[optKey(x.k)]).map(x=>({...x,k:optKey(x.k)}));
    return parseOptions(opts).lines.map(([t,kd,tg,v])=>{const o=OPTIONS.find(x=>x.line&&x.line[0]===t&&x.line[1]===kd&&x.line[2]===tg);return o&&{k:o.k,v:o.neg?-v:v}}).filter(Boolean)}
  // bonus lines of the picked rows; off: the ones the model can't count (shown under "Not counted")
  function optLines(opts){if(!Array.isArray(opts))return {...parseOptions(opts),off:[]};const lines=[],off=[];
    optRows(opts).filter(x=>+x.v).forEach(x=>{const o=OPT_BY[x.k];if(o.line)lines.push([...o.line,o.neg?-x.v:+x.v]);else off.push(`${o.label.replace(/ %$/,"")} ${x.v}${o.pct?"%":""}`)});
    return {lines,bad:[],off}}
  // a row's options: the picked ones and any typed lines kept from before the lists
  function optLinesOf(o){const a=optLines(o.opts);if(!o.optsText)return a;const t=parseOptions(o.optsText);return {lines:[...a.lines,...t.lines],bad:[...a.bad,...t.bad],off:a.off}}
  // typed option lines that match no option (none for picked rows)
  const optBad=opts=>Array.isArray(opts)?[]:parseOptions(opts).bad;
  // costume enchant stones: one per costume slot, each only in its own slot
  const STONE_SLOTS=[{k:"upper",label:"Upper"},{k:"middle",label:"Middle"},{k:"lower",label:"Lower"},{k:"garment",label:"Garment"}];
  const stone=id=>(typeof STONES!=="undefined"?STONES:[]).find(x=>x.id===+id)||null;
  const tamingEgg=id=>(typeof TAMING_EGGS!=="undefined"?TAMING_EGGS:[]).find(x=>x.id===+id)||null;
  const stonesWorn=sel=>STONE_SLOTS.map(z=>stone((sel||{})[z.k])).filter((x,i)=>x&&x.slot===STONE_SLOTS[i].k);
  // does a bonus group apply? r: item refine, rs: combined refine of a set, lv: base level, cls: job slugs
  // ("Acolyte Class" in game covers Priest and Monk, so a 2nd job also matches its 1st job)
  const groupOn=(g,ctx)=>(g.r==null||ctx.refine>=g.r)&&(g.rs==null||ctx.refineSum>=g.rs)&&(g.lv==null||ctx.baseLv>=g.lv)&&(!g.cls||!g.cls.length||g.cls.includes(ctx.jobSlug)||g.cls.includes(ctx.firstSlug));
  function applyGroups(A,gs,ctx,src){(gs||[]).forEach(g=>{if(!groupOn(g,ctx))return;
    if(g.proc||g.text){A.unmodelled.push(`${src}: ${g.proc||g.text}`);}
    // "For every 10 BaseLv ... (up to BaseLv 50)": lvPer / lvMax on the group multiply its lines by the base level steps
    const lk=g.lvPer?Math.floor(Math.min(ctx.baseLv,g.lvMax||Infinity)/g.lvPer):1;
    (g.b||[]).forEach(b=>{const per=b[4];const k=(per?Math.floor(ctx.refine/per):1)*lk;if(k<=0)return;const bb=b.slice();bb[3]=(+b[3]||0)*k;apply(A,bb,src)})})}

  // ---- the whole build ----
  // b = {baseLv, jobLv, base:{str..luk}, gear:{slot:{id, refine, cards:[ids]}}, stones?, special?, extra?, hpBase?, spBase?}; job = "Knight"
  function compute(b,job,aspdBase){
    const A=blank(),lv=Math.max(1,+b.baseLv||1),jobLv=Math.max(1,+b.jobLv||1),ctxBase={baseLv:lv,jobSlug:String(job).toLowerCase(),firstSlug:String(FIRST_OF[job]||job).toLowerCase(),refineSum:0};
    const gear=b.gear||{},worn=[];let wpn=null,wpnL=null,shield=false,weaponAtk=0,gearAtk=0,gearMatk=0,refAtk=0,refMatk=0,refDef=0,gearDef=0,gearMdef=0;
    SLOTS.forEach(s=>{const g=gear[s.k];const it=g&&item(g.id);if(!it)return;const r=Math.max(0,+g.refine||0);
      if(s.k.startsWith("head")&&worn.some(w=>w.it===it&&w.slot.startsWith("head")))return; // a multi-slot headgear counts once (two of the same dagger or accessory are two items)
      worn.push({it,r,slot:s.k,cards:(g.cards||[]).map(item).filter(Boolean)});
      const [ra,rm,rd]=refineAt(it,r);
      if(s.k==="weapon"){wpn=it;weaponAtk=it.atk||0;refAtk+=ra;refMatk+=rm}else{gearAtk+=it.atk||0;refAtk+=ra;refMatk+=rm}
      // a weapon in the Shield row is the left hand (Assassin); its ATK shows on the gear side of the status window like the right one's
      if(s.k==="shield"){if((it.slot||[]).includes("weapon"))wpnL=it;else shield=true}gearMatk+=it.matk||0;gearDef+=it.def||0;gearMdef+=it.mdef||0;refDef+=rd});
    worn.forEach(w=>{const ctx={...ctxBase,refine:w.r};applyGroups(A,w.it.g,ctx,w.it.name);w.cards.forEach(c=>applyGroups(A,c.g,ctx,c.name));
      const o=optLinesOf(gear[w.slot]||{});o.lines.forEach(b=>apply(A,b,w.it.name+" option"));o.bad.forEach(x=>A.unmodelled.push(`${w.it.name} option not understood: ${x}`));o.off.forEach(x=>A.unmodelled.push(`${w.it.name} option not counted: ${x}`))});
    // costume enchant stones (data/stones.js): b.stones = {upper, middle, lower, garment} -> stone id, plus the sets they complete
    const st=stonesWorn(b.stones);st.forEach(x=>{(x.b||[]).forEach(l=>apply(A,l,x.name));if(x.off)A.unmodelled.push(`${x.name}: ${x.off}`)});
    const ids=st.map(x=>x.id);(typeof STONE_SETS!=="undefined"?STONE_SETS:[]).forEach(z=>{if(z.need.every(i=>ids.includes(i)))z.b.forEach(l=>apply(A,l,z.name))});
    // Taming Ring (Special Equipment, Accessory Right): b.special.ring = the pet egg enchant sealed in it (data/special.js)
    const egg=tamingEgg((b.special||{}).ring);if(egg){egg.b.forEach(l=>apply(A,l,`Taming Ring (${egg.name})`));if(egg.off)A.unmodelled.push(`Taming Ring (${egg.name}): ${egg.off}`)}
    // other special equipment the lists don't have: b.special.own = [{on, name, opts:[{k, v}]}], effects picked from the affix list
    ((b.special||{}).own||[]).forEach(x=>{if(!x||x.on===false)return;const nm=String(x.name||"").trim()||"Special equipment",o=optLinesOf(x);
      o.lines.forEach(l=>apply(A,l,nm));o.bad.forEach(y=>A.unmodelled.push(`${nm} not understood: ${y}`));o.off.forEach(y=>A.unmodelled.push(`${nm} not counted: ${y}`))});
    // consumables and buffs picked on the Character tab: plain bonus lines on top of the gear
    (b.extra||[]).forEach(x=>apply(A,x,"consumable"));
    // sets: every piece worn; "combined refine" sums the pieces' refines
    (typeof SETS!=="undefined"?SETS:[]).forEach(st=>{const ps=st.pieces.map(p=>worn.find(w=>w.it.slug===p));if(ps.some(p=>!p))return;
      applyGroups(A,st.g,{...ctxBase,refine:0,refineSum:ps.reduce((a,p)=>a+p.r,0)},st.name)});
    const jb=jobBonus(job,jobLv),base={},tot={};STAT6.forEach(k=>{base[k]=Math.max(1,+((b.base||{})[k])||1);tot[k]=base[k]+jb[k]+A.st[k];tot[k]+=Math.floor(tot[k]*A.stPct[k]/100)}); // "STR +10%": a share of the total stat, rounded down
    const weapon=wpn?WTYPE[wpn.type]||"Bare hands":"Bare hands",ranged=RANGED_W.includes(weapon),S=status(lv,tot,ranged),f=Math.floor;
    const lw=wpnL?WTYPE[wpnL.type]||null:null,dual=dualOk(job,weapon,lw);
    if(wpnL&&!dual)A.unmodelled.push(`${wpnL.name}: a left-hand weapon needs an Assassin with a dagger, one-handed sword or one-handed axe in each hand`);
    // ATK % isn't in the status window's ATK: it's passed on as atkPct, which the damage model adds next to the race / size cards
    const gearSide=f(weaponAtk+gearAtk+refAtk+A.atk);
    const matkTot=f((S.matk+gearMatk+refMatk+A.matk)*(1+A.matkPct/100));
    const hpBase=+b.hpBase>0?+b.hpBase:curve(job,"hp",lv),spBase=+b.spBase>0?+b.spBase:curve(job,"sp",lv);
    const maxHp=hpBase!=null?f((f(hpBase*(1+tot.vit/100))+A.hp)*(1+A.hpPct/100)):null,maxSp=spBase!=null?f((f(spBase*(1+tot.int/100))+A.sp)*(1+A.spPct/100)):null;
    const ab=aspdBase?aspdBase(job,weapon):null;let aspd=null;
    // Zero (RO樂園攻速計算機 2026-09-07, checked against a Lv 105 Sage in game):
    // ASPD1 = floor(base − shield penalty + stat term + potion/skill value × AGI/200); ASPD = floor(ASPD1 + (195 − ASPD1) × ASPD % + flat
    // gear ASPD), cap 190. "aspd_mod" lines carry the potion/skill values (Concentration Potion 4, Two-Hand Quicken 7...)
    if(ab!=null){const a1=f(ab-(shield?SHIELD_ASPD[job]||0:0)-(dual?LEFT_ASPD[lw]:0)+S.aspdTerm+A.aspdMod*tot.agi/200);aspd=Math.min(190,f(a1+(195-a1)*A.aspdPct/100+A.aspd))}
    const ammo=worn.find(w=>w.slot==="ammo"),arrowEl=weapon==="Bow"&&ammo&&ammo.it.el?cap(ammo.it.el):null; // bows shoot the arrow's element
    const fields={baseLv:lv,jobLv,weapon,wElem:arrowEl||A.wEle||(wpn&&wpn.el?cap(wpn.el):null)||"Neutral",
      st:{str:`${base.str}+${tot.str-base.str}`,agi:`${base.agi}+${tot.agi-base.agi}`,vit:`${base.vit}+${tot.vit-base.vit}`,dex:`${base.dex}+${tot.dex-base.dex}`,luk:`${base.luk}+${tot.luk-base.luk}`},
      intTxt:`${base.int}+${tot.int-base.int}`,atkTxt:`${S.atk}+${gearSide}`,wAtk:f(weaponAtk+(wpn?refineAt(wpn,(gear.weapon||{}).refine)[0]:0)),atkPct:A.atkPct,
      matkTxt:`${S.matk}+${matkTot-S.matk}`,hitTxt:`${S.hit}+${A.hit}`,fleeTxt:`${S.flee+A.flee}+${1+f(tot.luk/10)+A.pd}`,defTxt:`${S.softDef}+${gearDef+refDef+A.def}`,
      maxHp,maxSp,aspd,crit:Math.round((S.crit+A.crit)*10)/10,critDmg:A.critDmg,rangePct:ranged?A.ranged:A.melee,
      vctPct:A.vct,fctPct:A.fct,acdPct:A.acd,ignDef:A.ignDef,ignMdef:A.ignMdef,
      lw:dual?lw:"",lwAtk:dual?f((wpnL.atk||0)+refineAt(wpnL,(gear.shield||{}).refine)[0]):0,lwElem:dual&&wpnL.el?cap(wpnL.el):"Neutral"};
    return {fields,acc:A,shield,jobBonus:jb,total:tot,status:S,worn:worn.map(w=>({name:w.it.name,slot:w.slot,refine:w.r,cards:w.cards.map(c=>c.name)})),unmodelled:A.unmodelled}}

  // the equipment window names gear by its cards: "+7 Double Healing Shining Clip" is a +7 Shining Clip with two Vitata Cards.
  // Each card adds its name (affix in data/cards.js) before the item's, or after it (affixPos "suffix": the names starting with
  // "of ", "Boots of Health"); 2-4 copies of one card show as Double / Triple / Quadruple. Long names are cut off ("Hard Nordfeld
  // Soldier..."), so the item name may be only its start. Card names typed the usual way work too ("+9 Shining Clip Vitata Card").
  const TIMES={double:2,triple:3,quadruple:4};
  const normName=s=>String(s||"").toLowerCase().replace(/[’‘`]/g,"'").replace(/(\.\.\.|…)\s*$/,"").replace(/\s+/g," ").trim();
  // cards named one after another, as runs: "double healing hard" -> [{ids: [Vitata], n: 2}, {ids: [<Hard cards>], n: 1}]. ids holds
  // every card that goes by the name read (Poring and Lunatic Card are both "Lucky"); a cut-off "of ..." (cut: true) is the last thing
  // shown and holds every card it may be. null unless the whole text is card names. A card goes by its name in the equipment window
  // or its own name, with or without "Card" ("Healing", "Vitata", "vitata card")
  function cardRuns(text,cards,nameOf){const named=cards.flatMap(c=>[nameOf(c),c.name,(c.name||"").replace(/ card$/i,"")].map(n=>[normName(n),c.id]))
      .filter(x=>x[0]).sort((a,b)=>b[0].length-a[0].length);
    let s=normName(text);const out=[];
    while(s){const m=/^(double|triple|quadruple) /.exec(s),n=m?TIMES[m[1]]:1,r=m?s.slice(m[0].length):s,
        hit=named.find(([nm])=>r===nm||r.startsWith(nm+" "));
      if(!hit){const cut=!m&&r.startsWith("of ")&&named.filter(([nm])=>nm.startsWith(r));if(cut&&cut.length){out.push({ids:[...new Set(cut.map(x=>x[1]))],n:1,cut:true});break}return null}
      out.push({ids:[...new Set(named.filter(([nm])=>nm===hit[0]).map(x=>x[1]))],n});s=r.slice(hit[0].length).trim()}
    return out}
  // the cards read: "double healing hard" -> [Vitata, Vitata, <Hard card>], the first card of a shared name, and a cut-off "of ..."'s
  // card only when one fits (else it's left for the player to pick)
  const firstCards=runs=>runs.flatMap(x=>x.cut&&x.ids.length>1?[]:Array(x.n).fill(x.ids[0]));
  function readCardNames(text,cards,nameOf){const r=cardRuns(text,cards,nameOf);return r&&firstCards(r)}
  // every way to read the runs, one card per name (at most ALT_MAX)
  const ALT_MAX=12;
  const cardReadings=runs=>runs.reduce((acc,x)=>acc.flatMap(a=>x.ids.map(id=>[...a,...Array(x.n).fill(id)])).slice(0,ALT_MAX),[[]]);
  // "+9 Shark Family Muffler" -> {id, refine, cards}; the best item of the list whose name (or, cut off, its start) is in the text
  // with only card names around it. A slot count after the name ("Muffler [1]") keeps only items with that many slots. When the
  // name fits more than one reading (two copies of an item, two cards with one name), the others are in alts: [{id, refine, cards}]
  // (no alts when there's one). null when nothing fits
  function readGearName(text,items,cardsOf,nameOf){let s=normName(text),refine=null,slots=null;const rm=/^\+(\d+) ?/.exec(s);if(rm){refine=Math.min(20,+rm[1]);s=s.slice(rm[0].length)}
    const sm=/ ?\[(\d)\]$/.exec(s);if(sm){slots=+sm[1];s=s.slice(0,sm.index).trim()}
    if(!s)return null;const fits=[];
    for(const it of items){const n=normName(it.name);if(!n||slots!=null&&(it.slots||0)!==slots)continue;let pre,post,len,full=true;const at=(" "+s+" ").indexOf(" "+n+" ");
      if(at>=0){pre=s.slice(0,at);post=s.slice(at+n.length);len=n.length}
      else{full=false;const w=s.split(" ");let k=0;for(;k<w.length;k++){const rest=w.slice(k).join(" ");if(rest.length>=3&&n.startsWith(rest))break}
        if(k===w.length)continue;pre=w.slice(0,k).join(" ");post="";len=s.length-pre.length}
      const cs=cardsOf(it),a=pre.trim()?cardRuns(pre,cs,nameOf):[],b=post.trim()?cardRuns(post,cs,nameOf):[];if(!a||!b)continue;
      const runs=[...a,...b],named=runs.reduce((t,x)=>t+x.n,0);
      if(named&&!it.slots)continue; // cards named: not the slotless copy of an item
      // the copy with room for the most of the cards named wins ("Double Bloody Damascus": the 2-slot Damascus, not the 1-slot one)
      fits.push({score:(full?1e4:0)+Math.min(named,it.slots||0)*1e3+len,it,runs})}
    if(!fits.length)return null;
    const top=fits.filter(f=>f.score===Math.max(...fits.map(x=>x.score))),read=(it,cards)=>({id:it.id,refine,cards:cards.slice(0,it.slots||0)});
    const best=read(top[0].it,firstCards(top[0].runs)),seen=new Set([JSON.stringify(best)]),alts=[];
    for(const f of top)for(const cs of cardReadings(f.runs)){const r=read(f.it,cs),k=JSON.stringify(r);if(!seen.has(k)&&alts.length<ALT_MAX){seen.add(k);alts.push(r)}}
    return alts.length?{...best,alts}:best}

  return {SLOTS,CARD_FOR,WTYPE,STAT6,FIRST_OF,SHIELD_ASPD,DUAL_W,LEFT_ASPD,dualOk,item,jobBonus,refineAt,status,compute,curve,parseOptions,OPTIONS,OPT_MAX,optRows,optLines,optBad,optGear,optChoices,STONE_SLOTS,stone,stonesWorn,tamingEgg,readCardNames,readGearName}})();
if(typeof module!=="undefined")module.exports=BUILD;
