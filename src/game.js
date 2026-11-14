// Shadow Oath — game code, extracted verbatim from the single-file sample (v0-sample).
// Phase 1b will carve this into modules along the existing section markers.
import * as THREE from 'three';
import {accountDialog} from './account-ui.js';
import {FIELD_LESSONS, fieldLesson, advanceFieldLesson, chargeImpact, isFieldPrologue, fieldsAreRestored} from './verdant.js';
import {PARABELLUM, PARABELLUM_JOB, planParabellum} from './parabellum.js';
import {refineOre, COMBINE, combine, combineMax, refineBonus, nextRefineMilestone} from './refine.js';
import {planAuto, AUTO_MAX, AUTO_REFRESH, AUTO_REFRESH_OPTIONS} from './autoplan.js';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

"use strict";
/* ================= UTIL ================= */
const $=s=>document.querySelector(s);
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const dxz=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angDiff=(a,b)=>{let d=(a-b)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d;};
const turnTo=(a,b,k)=>a+angDiff(b,a)*Math.min(1,k);
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function seeded(seed){let s=seed*9973+17;return ()=>(s=(s*16807)%2147483647)/2147483647;}

/* ================= HEROES & CLASSES ================= */
const HEROES={L:{name:'Lambo',hair:0x2b1a10,style:'spiky',icon:'🧑'},C:{name:'Calliope',hair:0xe0559b,style:'long',icon:'👩'}};
const HAIRSTYLES=[['spiky','Spiky'],['short','Short'],['long','Long'],['pony','Ponytail']];
const HAIRCOLS=[0x2b1a10,0x6a3a1a,0x1a1a1a,0xf0d060,0xd8d8e0,0xe0559b,0x3a5ad8,0xc82a2a,0x3aa860];
const SKINS=[0xffe0c8,0xf2c8a0,0xe0b088,0xc08860,0x8a5a3a];
const OUTFITS=[null,0x8a1a2a,0x1a5a3a,0x2a2a2a,0xd8d8e0,0x5a2d8e,0xc87a1a,0x2a6ab8];
const FACTIONS=[{k:'vongola',n:'Vongola',e:'🔥',c:'#ff8a2a',d:'Sky flames and unbreakable family bonds'},{k:'shimon',n:'Shimon',e:'⛰️',c:'#c8553a',d:'Earth-shakers who never forget a grudge'},{k:'uchiha',n:'Uchiha',e:'👁️',c:'#e0303a',d:'Sharp eyes and burning pride'},{k:'dclan',n:'D Clan',e:'⚓',c:'#4a9ae8',d:'Free spirits who laugh at fate'}];
const facOf=s=>FACTIONS.find(f=>f.k===(s&&s.fac));
const DIFF=[{n:'Story',dmg:.45,hp:.65,d:'Relaxed: enemies hit softer and die faster'},{n:'Normal',dmg:.75,hp:.85,d:'A fair challenge for most players'},{n:'Soulslike',dmg:1,hp:1,d:'Brutal: bosses can kill you in 3 hits'}];
const CLASSES={
 knight:{n:'Knight',ic:'🛡️',role:'Sword & Shield · Tank',wt:'sword',shield:1,col:0x2f5fa8,col2:0x2a2f45,ranged:0,reach:2.5,aspd:.62,hpM:1.3,spM:.8,
  base:{str:9,agi:4,vit:8,int:2,dex:4,luk:3},main:s=>s.str,desc:'Huge HP and defense. Wide cleaves and a long parry window.',
  sk:[{n:'Bash',e:'💥',t:'strike',m:2.6,sp:9,cd:1.6,c:0xffb347,poise:35,d:'Crushing blow that staggers normal enemies'},{n:'Endure',e:'🛡️',t:'buff',k:'dr',v:.3,dur:10,sp:18,cd:20,c:0x8fd3ff,d:'Take less damage for a while'},{n:'Magnum Break',e:'🔥',t:'aoe',r:4.5,m:2.0,sp:22,cd:5,c:0xff6a2a,d:'Fiery explosion around you'},{n:'Shield Charge',e:'🛡️',t:'strike',m:3.2,stun:2,sp:24,cd:7,c:0xbfe8ff,poise:60,d:'Shield slam that stuns the target'},{n:'Bowling Bash',e:'🌪️',t:'aoe',r:5.2,m:3.0,kb:1,sp:30,cd:6,c:0xffd27a,d:'Ultimate: sweeping strike that sends enemies flying'}],ps:[{n:'Sword Mastery',e:'🗡️',k:'atkp',v:3,d:'+3% attack per level'},{n:'Vitality',e:'❤️',k:'hpp',v:4,d:'+4% max HP per level'},{n:'Iron Skin',e:'🧱',k:'defp',v:1.5,d:'-1.5% damage taken per level'},{n:'Second Wind',e:'🌬️',k:'stap',v:6,d:'+6% stamina regen, cheaper actions'}]},
 assassin:{n:'Assassin',ic:'🗡️',role:'Dual Katars · Speed',wt:'katar',shield:0,col:0x3a2a52,col2:0x1c1426,ranged:0,reach:2.1,aspd:.42,hpM:1.0,spM:.9,crit:.1,dual:1,
  base:{str:6,agi:10,vit:5,int:2,dex:5,luk:5},main:s=>s.agi*.75+s.str*.6,desc:'Lightning-fast double-blade combos, high crits, cheap rolls.',
  sk:[{n:'Sonic Blow',e:'⚡',t:'multi',hits:8,m:.55,sp:16,cd:3,c:0xd28aff,d:'Eight lightning-fast slashes'},{n:'Enchant Poison',e:'☠️',t:'buff',k:'atk',v:.3,dur:14,sp:20,cd:20,c:0x7dff6a,d:'Venom on your blades: more attack'},{n:'Shadow Spin',e:'🌀',t:'aoe',r:4.2,m:2.1,sp:22,cd:5,c:0xb06aff,d:'Whirl of blades around you'},{n:'Grimtooth',e:'🩸',t:'strike',m:3.8,crit:1,sp:22,cd:6,c:0xff4a8a,poise:40,d:'A guaranteed critical stab'},{n:'Venom Splasher',e:'💣',t:'aoeT',r:5,m:4.0,sp:36,cd:8,c:0x7dff6a,d:'Ultimate: poison bomb on the target'}],ps:[{n:'Katar Mastery',e:'🗡️',k:'atkp',v:3,d:'+3% attack per level'},{n:'Lethal Edge',e:'✦',k:'critp',v:2,d:'+2% critical chance per level'},{n:'Fleet Foot',e:'👟',k:'stap',v:6,d:'+6% stamina regen, cheaper rolls'},{n:'Blood Dance',e:'🩸',k:'lsp',v:1,d:'+1% lifesteal per level'}]},
 priest:{n:'Priest',ic:'✝️',role:'Mace & Shield · Holy',wt:'mace',shield:1,col:0xf0ece0,col2:0x8a7a4a,ranged:0,reach:2.4,aspd:.62,hpM:1.0,spM:1.45,robe:1,magicSk:1,
  base:{str:4,agi:4,vit:6,int:9,dex:5,luk:4},main:s=>s.int*.75+s.str*.55,desc:'Heals itself and smites with holy magic. Spells count as magic.',
  sk:[{n:'Holy Light',e:'✨',t:'strike',rng:1,m:3.0,sp:11,cd:1.5,c:0xfff2a0,d:'Bolt of holy light'},{n:'Heal',e:'💚',t:'heal',v:.25,sp:18,cd:6,c:0x7dff9a,d:'Restore HP'},{n:'Kyrie Eleison',e:'🛡️',t:'buff',k:'dr',v:.35,dur:10,sp:24,cd:22,c:0xbfe8ff,d:'Holy barrier reduces damage taken'},{n:'Judex',e:'⚖️',t:'aoe',r:4.5,m:2.6,stun:1.5,sp:26,cd:6,c:0xffe08a,d:'Judgment around you; stuns'},{n:'Magnus Exorcismus',e:'✝️',t:'aoeT',r:6,m:3.6,sp:36,cd:7,c:0xfff2a0,d:'Ultimate: holy cross erupts at the target'}],ps:[{n:'Blessing',e:'🙏',k:'hpp',v:4,d:'+4% max HP per level'},{n:'Divine Favor',e:'📿',k:'smult',v:4,d:'+4% skill power per level'},{n:'Meditation',e:'🧘',k:'spp',v:10,d:'+10% SP regen per level'},{n:'Soul Drain',e:'🔮',k:'slsp',v:1,d:'+1% spell siphon per level'}]},
 wizard:{n:'Wizard',ic:'🔮',role:'Staff · Ranged Magic',wt:'staff',shield:0,col:0x5b2d8e,col2:0x2a1a40,ranged:1,range:13,aspd:.7,hpM:.85,spM:1.7,robe:1,magic:1,magicSk:1,
  base:{str:2,agi:4,vit:4,int:11,dex:6,luk:3},main:s=>s.int,desc:'Devastating magic from long range. Fragile up close. All damage is magic.',
  sk:[{n:'Fire Bolt',e:'☄️',t:'strike',rng:1,m:3.4,sp:11,cd:1.4,c:0xff7a2a,d:'Hurl a bolt of fire'},{n:'Frost Nova',e:'❄️',t:'aoe',r:5.5,m:2.0,stun:2,sp:26,cd:6,c:0x8fe3ff,d:'Freeze everything around you'},{n:'Lightning Bolt',e:'⚡',t:'multi',hits:3,m:1.5,rng:1,sp:18,cd:2.5,c:0xbfe8ff,d:'Three fast lightning strikes'},{n:'Energy Coat',e:'🫧',t:'buff',k:'dr',v:.3,dur:12,sp:26,cd:22,c:0xb98cff,d:'Mana shield reduces damage'},{n:'Meteor Storm',e:'☄️',t:'aoeT',r:7,m:4.4,sp:44,cd:9,c:0xff5a2a,d:'Ultimate: meteors rain on the target'}],ps:[{n:'Mystic Amplification',e:'🔮',k:'smult',v:4,d:'+4% skill power per level'},{n:'Mana Well',e:'💧',k:'spp',v:10,d:'+10% SP regen per level'},{n:'Quick Cast',e:'⏱️',k:'cdr',v:4,d:'-4% skill cooldowns per level'},{n:'Soul Drain',e:'🩸',k:'slsp',v:1,d:'+1% spell siphon per level'}]},
 archer:{n:'Archer',ic:'🏹',role:'Bow · Ranged',wt:'bow',shield:0,col:0x3f7a3a,col2:0x4a3a22,ranged:1,range:14,aspd:.52,hpM:.95,spM:1,
  base:{str:4,agi:7,vit:5,int:3,dex:10,luk:5},main:s=>s.dex*.9+s.str*.25,desc:'Rains arrows from afar. Gets huge value from Gold and S-Tier bows.',
  sk:[{n:'Double Strafe',e:'🎯',t:'multi',hits:2,m:1.8,rng:1,sp:9,cd:1.2,c:0xffe08a,d:'Fire two arrows'},{n:'Improve Concentration',e:'🧠',t:'buff',k:'aspd',v:.3,dur:14,sp:18,cd:20,c:0xffe08a,d:'Attack faster for a while'},{n:'Arrow Shower',e:'🌧️',t:'aoeT',r:5,m:2.3,sp:20,cd:5,c:0xffe08a,d:'Arrows rain on the target area'},{n:'Charge Arrow',e:'💨',t:'strike',rng:1,m:3.0,kb:1,sp:16,cd:4,c:0xffffff,poise:50,d:'Heavy arrow that staggers'},{n:'Blitz Beat',e:'🦅',t:'multi',hits:5,m:1.1,rng:1,sp:30,cd:6,c:0x9fd8ff,d:'Ultimate: your falcon strikes five times'}],ps:[{n:'Bow Mastery',e:'🏹',k:'atkp',v:3,d:'+3% attack per level'},{n:'Vulture\'s Eye',e:'👁️',k:'critp',v:2,d:'+2% critical chance per level'},{n:'Owl\'s Eye',e:'🦉',k:'aspp',v:3,d:'+3% attack speed per level'},{n:'Steady Hands',e:'🤲',k:'stap',v:6,d:'+6% stamina regen per level'}]},
 smith:{n:'Blacksmith',ic:'⚒️',role:'Axe & Shield · Forge',wt:'axe',shield:1,col:0x8a5a2b,col2:0x3a2a1a,ranged:0,reach:2.5,aspd:.7,hpM:1.2,spM:.9,
  base:{str:9,agi:4,vit:7,int:3,dex:6,luk:3},main:s=>s.str,desc:'Heavy hits. +15% refine success and 25% cheaper forging.',
  sk:[{n:'Mammonite',e:'💰',t:'strike',m:4.2,zeny:1,sp:8,cd:1.6,c:0xffd76a,poise:30,d:'Spend zeny for a huge hit'},{n:'Adrenaline Rush',e:'🔥',t:'buff',k:'aspd',v:.35,dur:14,sp:22,cd:24,c:0xff6a3a,d:'Swing much faster'},{n:'Hammerfall',e:'🔨',t:'aoe',r:5,m:1.8,stun:2.5,sp:24,cd:6,c:0xffb347,d:'Smash the ground, stunning nearby enemies'},{n:'Power Thrust',e:'💪',t:'buff',k:'atk',v:.4,dur:12,sp:26,cd:24,c:0xff8a3a,d:'Greatly increase attack'},{n:'Cart Revolution',e:'🛒',t:'aoe',r:4.8,m:3.2,kb:1,sp:28,cd:6,c:0xffd27a,d:'Ultimate: spin and send enemies flying'}],ps:[{n:'Axe Mastery',e:'🪓',k:'atkp',v:3,d:'+3% attack per level'},{n:'Hilt Binding',e:'❤️',k:'hpp',v:4,d:'+4% max HP per level'},{n:'Weapon Research',e:'🔬',k:'critp',v:2,d:'+2% critical chance per level'},{n:'Toughness',e:'🧱',k:'defp',v:1.5,d:'-1.5% damage taken per level'}]}
};
const SK_TIER=[0,0,5,5,12],PS_TIER=[0,5,5,12],SK_MAX=10;
CLASSES.acrobat={n:'Acrobat',ic:'🪀',role:'Twin Yoyos · Mid-range Trickster',wt:'yoyo',shield:0,col:0x9a2848,col2:0x2a2038,ranged:1,range:8.5,aspd:.46,hpM:1.0,spM:1.0,crit:.08,yoyo:1,
  base:{str:6,agi:6,vit:5,int:2,dex:9,luk:5},main:s=>s.dex*.7+s.str*.55,desc:'Whips twin yoyos out and back at mid range. Fast, critical, and can turn zeny into damage.',
  sk:[{n:'Cross Line',e:'🪀',t:'multi',hits:2,m:1.7,rng:1,sp:9,cd:1.3,c:0xff6a9a,d:'Both yoyos cross through the target'},{n:'Perfect Block',e:'🤸',t:'buff',k:'dr',v:.3,dur:10,sp:18,cd:20,c:0x9fd8ff,d:'Tumble away from blows: take less damage'},{n:'Deadly Swing',e:'🌀',t:'aoe',r:5,m:2.1,sp:22,cd:5,c:0xff6a9a,d:'Swing both yoyos in a full circle around you'},{n:'Pulling',e:'🪢',t:'strike',rng:1,m:2.6,pull:1,stun:1.5,sp:20,cd:7,c:0xffd76a,poise:50,d:'Wrap the string around a foe, yank it to you and stun it'},{n:'Yoyo Storm',e:'🎡',t:'multi',hits:6,m:1.0,rng:1,sp:32,cd:7,c:0xff4a8a,d:'Ultimate: a storm of six rapid yoyo strikes'}],
  ps:[{n:'Yoyo Mastery',e:'🪀',k:'atkp',v:3,d:'+3% attack per level'},{n:'Sharp Eye',e:'👁️',k:'critp',v:2,d:'+2% critical chance per level'},{n:'Nimble Feet',e:'🤸',k:'stap',v:6,d:'+6% stamina regen, cheaper rolls'},{n:'Bleeding Edge',e:'🩸',k:'lsp',v:1,d:'+1% lifesteal per level'}]};
const CLS_ORDER=['knight','assassin','priest','wizard','archer','smith','acrobat'];

/* ================= ITEMS ================= */
const WN={sword:['Training Sword','Steel Sword','Sunforged Blade','Frostbrand','Dawnbreaker','Voidrender'],katar:['Jur','Twin Katar','Sandstorm Katar','Frost Fang','Nightreaper','Void Talons'],mace:['Wooden Mace','Iron Mace','Sun Morningstar','Glacier Mace','Seraph Mace','Void Judgment'],staff:['Oak Staff','Crystal Rod','Sun Staff','Glacier Staff','Starfall Staff','Void Scepter'],yoyo:['Wooden Yoyo','Steel Yoyo','Sunwheel','Frost Wheel','Eclipse Wheel','Void Spinner'],bow:['Short Bow','Composite Bow','Desert Longbow','Frost Bow','Eclipse Bow','Void Piercer'],axe:['Hand Axe','Battle Axe','Sun Hammer','Glacier Axe','Titan Hammer','Void Cleaver']};
const AN=['Cotton Tunic','Leather Jacket','Desert Mail','Frost Plate','Shadowguard Armor','Void Aegis'],HN=['Bandana','Iron Cap','Horned Helm','Frost Crown','Dread Helm','Void Crown'],SN=['Buckler','Guard','Sun Shield','Frost Aegis','Shadow Bulwark','Void Wall'];
const LHN=['Cloth Mask','Leather Visor','Iron Muffler','Frost Veil','Dread Mask','Void Shroud'];
const FN=['Worn Sandals','Leather Boots','Iron Greaves','Frost Treads','Shadow Striders','Void Walkers'];
const RNm=['Copper Band','Silver Loop','Golden Signet','Crimson Seal','Void Ring','Eclipse Ring'];
const WATK=[10,24,42,66,98,140],ADEF=[3,7,12,18,26,36],AHP=[15,45,90,150,240,360],HDEF=[1,3,6,9,13,18],SDEF=[2,5,9,14,20,28],LHDEF=[1,2,4,6,9,13],FDEF=[1,3,5,8,12,16];
const RMUL=[1,1.35,1.8,2.6],RNAME=['Normal','Silver','Gold','S-Tier'],RCOL=[0xc8c8c8,0xdfeaff,0xffc23a,0xff2020],RCSS=['#d8d8d8','#cfe3ff','#ffc93a','#ff3b3b'];
const SLOTN={w:'Weapon',s:'Off-hand',a:'Armor',h:'Headgear',l:'Lower Headgear',f:'Footgear',r:'Accessory',r2:'Accessory 2'},SLOTI={w:'🗡️',s:'🛡️',a:'🥋',h:'⛑️',l:'🎭',f:'👢',r:'💍',r2:'📿'};
// Eight equip slots; items have seven slot types, because accessories fill two.
// SLOTOF maps an equip slot to the item slot it accepts.
const EQSLOTS=['w','s','a','h','l','f','r','r2'];
const SLOTOF={w:'w',s:'s',a:'a',h:'h',l:'l',f:'f',r:'r',r2:'r'};
const slotsFor=it=>EQSLOTS.filter(k=>SLOTOF[k]===it.slot);
const freeSlotFor=it=>{const ks=slotsFor(it);return ks.find(k=>!S.eq[k])||ks[0]||null;};
const AFFIX={
 ls:{n:'Lifesteal',d:'heals % of physical damage dealt',v:[2,3.5,5,8],u:'%'},
 sls:{n:'Spell Siphon',d:'heals % of magic damage dealt',v:[3,5,7,11],u:'%'},
 crit:{n:'Keen',d:'critical chance',v:[2,4,6,10],u:'%'},
 hp:{n:'Vigor',d:'max HP',v:[5,8,12,18],u:'%'},
 sta:{n:'Endurance',d:'stamina regen',v:[10,18,26,40],u:'%'},
 zeny:{n:'Greed',d:'zeny from kills',v:[10,20,35,60],u:'%'},
 def:{n:'Warding',d:'damage taken reduced',v:[2,4,6,9],u:'%'},
 sp:{n:'Mana',d:'SP regen',v:[20,35,50,80],u:'%'},
};
const AFX_RING=['ls','sls','crit','hp','sta','zeny','def','sp'],AFX_WPN=['ls','sls','crit','zeny'];
const POT={red:{n:'Red Potion',hp:.3,price:40,c:'#e33'},orange:{n:'Orange Potion',hp:.55,price:120,c:'#f80'},white:{n:'White Potion',hp:.9,price:320,c:'#f4f4f4'},blue:{n:'Blue Potion',sp:.5,price:150,c:'#38f'}};
const POT_MAX=5;
const ORE={ori:{n:'Oridecon',e:'🔷',d:'Refines weapons'},elu:{n:'Elunium',e:'🔶',d:'Refines armor, helms, shields, rings'},
 eori:{n:'Enriched Oridecon',e:'💠',d:'Refines weapons to +11–+15 · or combine 10 Oridecon',mul:11},eelu:{n:'Enriched Elunium',e:'🔆',d:'Refines gear to +11–+15 · or combine 10 Elunium',mul:11},
 mori:{n:'Mithril Oridecon',e:'💎',d:'Refines weapons to +16–+20 · combine 20 Enriched Oridecon',shop:false},melu:{n:'Mithril Elunium',e:'✴️',d:'Refines gear to +16–+20 · combine 20 Enriched Elunium',shop:false}};
const REF_RATE=[1,1,1,1,.9,.75,.6,.45,.35,.28,.22,.18,.15,.12,.1,.08,.065,.05,.04,.03];
// Elden Ring style: 1 stat point per level, each stat caps at 99, 6 stats x 99 = level 594
const BAG_MAX=150;
const REF_MAX=20,LV_MAX=594,PROT_PRICE=6000,STAT_MAX=99,STAT_JOB=[99,110,135,155],STAT_W=3.4,EXP_RATE=.7;

/* ================= MONSTER POOL ================= */
const MOBS={
 blob:{n:'Jellopop',m:'blob',col:0xff8fb1,s:1,spd:1.8,r:.6,hpM:.8,atkM:.8,loot:['Sticky Jelly','🫧']},
 bunny:{n:'Thornbunny',m:'bunny',col:0xd9c3a5,s:1,spd:2.8,r:.6,hpM:.85,atkM:.9,lunge:1,loot:['Bunny Fluff','🧶']},
 beetle:{n:'Field Beetle',m:'beetle',col:0x3b6b2a,s:1,spd:2.2,r:.7,hpM:1.2,atkM:1,aggro:1,shield:1,loot:['Beetle Shell','🪲']},
 eggsac:{n:'Brood Eggs',m:'eggsac',col:0xd8d0b8,s:1,spd:0,r:1.1,hpM:.45,atkM:0,egg:1,loot:['Spider Silk','🕸️']},
 mushroom:{n:'Sporeling',m:'mushroom',col:0xc23b3b,s:1.1,spd:1.8,r:.7,hpM:1.1,atkM:1,loot:['Spore Cap','🍄']},
 wolf:{n:'Shade Wolf',m:'wolf',col:0x3a3f55,s:1.1,spd:4,r:.8,hpM:.95,atkM:1.1,aggro:1,lunge:1,loot:['Wolf Fang','🦷']},
 spider:{n:'Webweaver',m:'spider',col:0x2a2030,s:1,spd:2.6,r:.9,hpM:1,atkM:1,aggro:1,ranged:10,loot:['Spider Silk','🕸️']},
 lantern:{n:'Will-o-Wisp',m:'wisp',col:0x8ad8ff,s:1,spd:3,r:.6,hpM:.7,atkM:1.1,ranged:9,fly:1,loot:['Wisp Ember','🔥']},
 frog:{n:'Bog Croaker',m:'blob',col:0x4a7a3a,s:1.3,spd:2.2,r:.8,hpM:1.3,atkM:1,lunge:1,loot:['Bog Tongue','👅']},
 hollow:{n:'Hollow Soldier',m:'soldier',col:0x5a5a66,s:1,spd:2.6,r:.75,hpM:1.2,atkM:1.1,aggro:1,shield:1,loot:['Rusted Badge','🎖️']},
 archer:{n:'Hollow Archer',m:'soldier',col:0x4a5a3a,s:1,spd:2.4,r:.7,hpM:.85,atkM:1.1,aggro:1,ranged:12,bow:1,loot:['Broken Arrow','🏹']},
 scorpion:{n:'Sand Scorpion',m:'scorpion',col:0xb5762b,s:1.1,spd:2.6,r:.9,hpM:1.1,atkM:1,loot:['Scorpion Tail','🦂']},
 snake:{n:'Dune Viper',m:'snake',col:0x7a8a2a,s:1.2,spd:3.6,r:.8,hpM:.9,atkM:1.15,aggro:1,lunge:1,loot:['Viper Scale','🐍']},
 mummy:{n:'Wrapped Dead',m:'mummy',col:0xd8cfb0,s:1.1,spd:1.8,r:.8,hpM:1.4,atkM:1.1,aggro:1,loot:['Old Bandage','🩹']},
 skeleton:{n:'Tomb Skeleton',m:'skeleton',col:0xe8e0d0,s:1,spd:2.8,r:.75,hpM:.9,atkM:1.15,aggro:1,loot:['Bone Shard','🦴']},
 imp:{n:'Ember Imp',m:'imp',col:0xc83a1a,s:.9,spd:3.6,r:.6,hpM:.75,atkM:1.1,aggro:1,ranged:8,fly:1,loot:['Imp Horn','😈']},
 lavagolem:{n:'Magma Golem',m:'golem',col:0x5a2a1a,s:1,spd:1.6,r:1.1,hpM:1.6,atkM:1.25,aggro:1,shield:1,em:0xff5a1a,loot:['Magma Core','🌋']},
 salamander:{n:'Salamander',m:'wolf',col:0xd8552a,s:1.2,spd:3.4,r:.9,hpM:1.1,atkM:1.1,aggro:1,lunge:1,loot:['Fire Scale','🔥']},
 troll:{n:'Bridge Troll',m:'oni',col:0x5a6a3a,s:1.4,spd:2.2,r:1.1,hpM:1.7,atkM:1.3,aggro:1,loot:['Troll Tooth','🦷']},
 bat:{n:'Frost Bat',m:'bat',col:0x6fa8d6,s:1,spd:4,r:.8,hpM:.8,atkM:1,aggro:1,fly:1,loot:['Frost Wing','❄️']},
 bear:{n:'Cave Bear',m:'bear',col:0xe8eef2,s:1.4,spd:2.6,r:1,hpM:1.5,atkM:1.2,lunge:1,loot:['Thick Pelt','🧥']},
 golem:{n:'Ice Golem',m:'golem',col:0x9fd8ff,s:1,spd:1.6,r:1.1,hpM:1.6,atkM:1.2,aggro:1,ranged:11,shield:1,loot:['Golem Core','💎']},
 yeti:{n:'Yeti',m:'bear',col:0xf4f4ff,s:1.6,spd:2.4,r:1.1,hpM:1.8,atkM:1.3,aggro:1,loot:['Yeti Fur','🧊']},
 monk:{n:'Fallen Monk',m:'soldier',col:0x8a6a3a,s:1,spd:2.8,r:.75,hpM:1.1,atkM:1.2,aggro:1,lunge:1,robe:1,loot:['Prayer Bead','📿']},
 wyvern:{n:'Wyvernling',m:'dragon',col:0x6fb0d8,s:.55,spd:3.4,r:1.1,hpM:1.4,atkM:1.2,aggro:1,fly:1,ranged:10,loot:['Wyvern Scale','🐉']},
 leech:{n:'Blight Leech',m:'snake',col:0x3a4a2a,s:1.1,spd:3,r:.8,hpM:1,atkM:1.1,aggro:1,lunge:1,loot:['Blight Sac','🟢']},
 ghoul:{n:'Marsh Ghoul',m:'mummy',col:0x6a7a5a,s:1.1,spd:2.4,r:.8,hpM:1.3,atkM:1.2,aggro:1,loot:['Ghoul Claw','🧟']},
 wraith:{n:'Wraith',m:'wraith',col:0x5a4a7a,s:1.1,spd:3,r:.8,hpM:1,atkM:1.1,aggro:1,ranged:11,fly:1,loot:['Ectoplasm','🌫️']},
 royalguard:{n:'Fallen Royal Guard',m:'soldier',col:0x8a7a2a,s:1.1,spd:2.6,r:.8,hpM:1.5,atkM:1.25,aggro:1,shield:1,loot:['Royal Crest','👑']},
 oni:{n:'Oni Guard',m:'oni',col:0xb33a2a,s:1.3,spd:2.4,r:1,hpM:1.5,atkM:1.3,aggro:1,loot:['Oni Horn','📯']},
 vampire:{n:'Night Stalker',m:'vampire',col:0x2a1a2a,s:1.15,spd:3.4,r:.9,hpM:1.1,atkM:1.3,aggro:1,lunge:1,loot:['Vampire Fang','🩸']},
 eye:{n:'Watcher',m:'eye',col:0x8a2aa0,s:1,spd:2.6,r:.7,hpM:.8,atkM:1.2,aggro:1,ranged:12,fly:1,loot:['Watcher Lens','👁️']},
 stormbird:{n:'Storm Roc',m:'bat',col:0x5a6a9a,s:1.5,spd:4.2,r:1,hpM:1.2,atkM:1.2,aggro:1,fly:1,lunge:1,loot:['Storm Feather','🪶']},
 darkknight:{n:'Shadow Knight',m:'soldier',col:0x2a2238,s:1.15,spd:2.8,r:.85,hpM:1.6,atkM:1.35,aggro:1,shield:1,em:0x5a1a9a,loot:['Dark Sigil','🖤']},
 voidling:{n:'Voidling',m:'blob',col:0x1a0a2a,s:1.1,spd:3,r:.7,hpM:1.1,atkM:1.3,aggro:1,lunge:1,em:0x6a1aff,loot:['Void Shard','🟣']},
};
const BOSSES={
 boar:{n:'Warthog King',m:'boar',col:0x7a4a2a,s:2.4,spd:3.4,r:2,sp:['slam','charge','combo'],roar:'grunt'},
 treant:{n:'Elder Treant',m:'treant',col:0x5a3a22,s:1.5,spd:2,r:2.3,sp:['slam','nova','roots'],roar:'deep'},
 spiderq:{n:'Broodmother',m:'spider',col:0x1a1020,s:2.6,spd:3,r:2.3,sp:['slam','bolts','combo','nova','webs','eggs'],roar:'screech',lantern:1},
 towerknight:{n:'Tower Knight Aldric',m:'bigknight',col:0x4a4a58,s:2.2,spd:2.6,r:1.9,sp:['sweep','slam','combo','charge'],shield:1,roar:'deep'},
 scorpionking:{n:'Scorpion Emperor',m:'scorpion',col:0x8a4a1a,s:2.6,spd:3,r:2.3,sp:['combo','slam','bolts','sweep'],roar:'screech'},
 pharaoh:{n:'Sand Pharaoh Nekhet',m:'pharaoh',col:0xe8dcc0,s:2.3,spd:2.6,r:2,sp:['slam','nova','combo','bolts','summon'],roar:'deep'},
 magmalord:{n:'Magma Lord',m:'golem',col:0x4a1a0a,s:2.4,spd:2,r:2.4,sp:['slam','nova','meteor','sweep'],em:0xff4a0a,roar:'deep'},
 bridgetroll:{n:'Gorm the Bridge Troll',m:'oni',col:0x4a5a2a,s:2.6,spd:2.6,r:2.2,sp:['combo','slam','charge','jump'],roar:'grunt'},
 frostwyrm:{n:'Frost Wyrm',m:'dragon',col:0x7fc8ff,s:1.5,spd:3,r:2.6,sp:['slam','nova','bolts','meteor','sweep'],roar:'dragon'},
 serpent:{n:'Lake Serpent Ymir',m:'snake',col:0x2a6a8a,s:3,spd:3.6,r:2.4,sp:['charge','combo','bolts','nova'],roar:'screech'},
 abbot:{n:'Abbot Varro',m:'pharaoh',col:0xd8d0c0,s:2,spd:2.8,r:1.8,sp:['bolts','meteor','summon','nova','combo'],robe:1,roar:'deep'},
 bonewyrm:{n:'Bone Wyrm',m:'dragon',col:0xe8e0d0,s:1.6,spd:3.2,r:2.7,sp:['sweep','bolts','jump','meteor','slam'],roar:'dragon'},
 marshhorror:{n:'The Marsh Horror',m:'blob',col:0x1a3a2a,s:4,spd:2.2,r:2.6,sp:['nova','slam','roots','summon'],em:0x2aff6a,roar:'deep'},
 fallenking:{n:'Fallen King Osric',m:'bigknight',col:0x6a5a2a,s:2.3,spd:2.8,r:1.9,sp:['combo','sweep','jump','charge','nova'],roar:'deep'},
 lich:{n:'Lich Mortis',m:'wraith',col:0x3a2a5a,s:2.4,spd:2.6,r:2,sp:['bolts','meteor','summon','nova','roots'],roar:'screech'},
 stormroc:{n:'Tempest Roc',m:'bat',col:0x4a5a9a,s:3.4,spd:4.4,r:2.4,sp:['jump','charge','bolts','sweep','nova'],fly:1,roar:'screech'},
 gatewarden:{n:'Gate Warden',m:'golem',col:0x2a2238,s:2.6,spd:2.2,r:2.5,sp:['slam','sweep','charge','nova','combo'],em:0x8a2aff,roar:'deep'},
 shadowtwin:{n:'Shadow Twin',m:'shadowhero',col:0x1a1026,s:1.6,spd:3.6,r:1.4,sp:['combo','jump','charge','bolts','sweep'],roar:'whisper'},
 malgrath:{n:'Lord Malgrath',m:'demon',col:0x221a2e,s:2.5,spd:3.2,r:2.2,sp:['slam','nova','combo','bolts','meteor','sweep','jump'],roar:'demon'},
 voidmalgrath:{n:'Malgrath, Void Ascendant',m:'demon',col:0x0a0612,s:3,spd:3.4,r:2.6,sp:['slam','nova','combo','bolts','meteor','sweep','jump','summon','charge'],em:0x8a2aff,final:1,roar:'demon'},
};

/* ================= BIOMES / DECOR DEFS ================= */
const B={
 fields:{sky:[0x6fb0e8,0xd8ecff],fog:[55,135],g1:0x5c9a44,g2:0x3f7a30,hs:0xffffff,hg:0x4a6a30,sun:[0xfff2d0,1.1,[25,45,20]],pc:0xffc0d8,ps:.25,pv:[.3,-.4,.2],amp:1.6,
  dec:[['tree',55,{trunk:0x6b4a2a,leaf:0x3f8a3a},.9,1.5],['flower',90,{stem:0x3a7a2a,bloom:0xffd84a},.8,1.3],['flower',60,{stem:0x3a7a2a,bloom:0xff7aa8},.8,1.3],['rock',25,{rock:0x8a8a80},.6,1.4],['grass',140,{grass:0x5aa840},.8,1.5]],wall:['tree',80,{trunk:0x5b3a1a,leaf:0x2f6a2a},1.8,2.6]},
 woods:{sky:[0x3a5a4a,0x9ac8a8],fog:[28,90],g1:0x2f5d33,g2:0x22462a,hs:0xbfe8c8,hg:0x1a2a1a,sun:[0xd0ffd8,.7,[-20,40,10]],pc:0xd8ff6a,ps:.22,pv:[.2,.15,.1],glowP:1,amp:2,
  dec:[['pine',80,{trunk:0x4a3020,leaf:0x1f4a2a},.9,1.7],['mush',40,{stem:0xe8dcc0,cap:0xc23b3b},.8,1.6],['log',18,{wood:0x5a3a22},.8,1.2],['rock',25,{rock:0x5a6a5a},.6,1.4],['grass',80,{grass:0x2f6a2a},.8,1.4]],wall:['pine',100,{trunk:0x3a2416,leaf:0x173a20},1.8,2.8]},
 mire:{sky:[0x1c2a3a,0x4a6a7a],fog:[20,70],g1:0x3a4a3a,g2:0x2a3a30,hs:0x8ab8c8,hg:0x101a14,sun:[0x9ad8ff,.5,[10,30,-20]],pc:0x8ad8ff,ps:.3,pv:[.1,.3,.1],glowP:1,night:1,water:0x1a3a4a,amp:.8,
  dec:[['reed',120,{grass:0x5a7a3a},.9,1.6],['deadtree',35,{wood:0x2a2a26},.9,1.5],['lantern',24,{post:0x3a2a1a,glass:0x8ad8ff},.9,1.1],['mush',30,{stem:0xc8d8c0,cap:0x5ab8c8},.8,1.4],['rock',20,{rock:0x4a5a4a},.6,1.2]],wall:['deadtree',80,{wood:0x1a1a18},1.8,2.6]},
 watchtower:{sky:[0x7a8aa8,0xd8c8b8],fog:[45,125],g1:0x6a7a4a,g2:0x55663a,hs:0xffffff,hg:0x4a4a3a,sun:[0xffe8c8,1,[30,40,-10]],pc:0xd8d8c8,ps:.15,pv:[1.2,0,.3],amp:2.4,
  dec:[['ruin',40,{stone:0x8a8a80},.9,1.6],['pillar',14,{stone:0x9a9a90},.7,1.1],['tree',30,{trunk:0x6b4a2a,leaf:0x4f8a3a},.9,1.4],['grass',100,{grass:0x6aa040},.8,1.4],['banner',16,{post:0x4a3a2a,cloth:0x8a2a2a},.9,1.2]],wall:['ruin',70,{stone:0x6a6a62},1.8,2.6]},
 desert:{sky:[0xd8a860,0xf8e0b0],fog:[45,125],g1:0xb8924e,g2:0x9a763a,hs:0xffe8c0,hg:0x6a4a2a,sun:[0xffe0b0,1.15,[40,50,0]],pc:0xf0d9a0,ps:.15,pv:[2.2,.05,.4],amp:2.2,
  dec:[['cactus',45,{cac:0x5a8a3a},.8,1.4],['dune',25,{sand:0xcfa660},.8,1.6],['bone',30,{bone:0xf0e8d8},.8,1.3],['pillar',14,{stone:0xc8a878},.6,1.2],['rock',20,{rock:0xa88a5a},.6,1.5]],wall:['bigrock',60,{rock:0xb08a52},1,1.6]},
 tomb:{sky:[0x2a1a10,0x6a4a30],fog:[22,75],g1:0x6a5a3a,g2:0x4a3a28,hs:0xffd8a0,hg:0x2a1a10,sun:[0xffb060,.6,[0,30,20]],pc:0xffc060,ps:.2,pv:[.05,.4,.05],glowP:1,night:1,amp:.5,
  dec:[['pillar',40,{stone:0xa88a58},.8,1.3],['sarco',20,{stone:0x8a7a4a},.9,1.2],['torch',36,{post:0x3a2a1a,flame:0xff9a3a},.9,1.2],['bone',30,{bone:0xd8d0c0},.8,1.3],['statue',12,{stone:0xb89a68},.9,1.3]],wall:['pillar',70,{stone:0x5a4a30},1.8,2.6]},
 volcano:{sky:[0x3a1a10,0xa84a20],fog:[25,85],g1:0x3a2a28,g2:0x2a1a18,hs:0xff9a60,hg:0x3a1a10,sun:[0xff8040,.8,[-30,35,10]],pc:0xff7a2a,ps:.25,pv:[.2,1.2,.2],glowP:1,amp:2.6,
  dec:[['lavarock',50,{rock:0x3a2a28,lava:0xff5a1a},.8,1.6],['rock',40,{rock:0x4a3a38},.6,1.5],['deadtree',20,{wood:0x1a1010},.9,1.4],['bone',16,{bone:0x8a7a70},.8,1.2]],wall:['bigrock',60,{rock:0x3a2a28},1.1,1.8]},
 bridge:{sky:[0x4a3a5a,0xd88a60],fog:[40,120],g1:0x4a4048,g2:0x3a3038,hs:0xffc8a0,hg:0x2a2030,sun:[0xffa060,.9,[-40,25,-10]],pc:0xffa060,ps:.15,pv:[.8,.2,.2],amp:3,
  dec:[['pillar',36,{stone:0x3a3038},.9,1.5],['ruin',30,{stone:0x4a4048},.8,1.4],['torch',30,{post:0x2a2028,flame:0xffa040},.9,1.2],['chain',24,{metal:0x6a6a70},.9,1.3],['rock',25,{rock:0x4a4048},.6,1.4]],wall:['pillar',70,{stone:0x2a2028},2,2.8]},
 frost:{sky:[0x6a9ac0,0xd8ecf8],fog:[30,95],g1:0xbcd2e0,g2:0x8eaec4,hs:0xd0e8f8,hg:0x4a6a80,sun:[0xd0e8ff,.8,[20,40,20]],pc:0xffffff,ps:.22,pv:[.3,-1.5,.2],amp:2,
  dec:[['crystal',45,{cry:0x8fd8ff},.8,1.8],['rock',35,{rock:0xc8dce8},.6,1.5],['snowpine',30,{trunk:0x4a3a30,leaf:0xdfeef5},.9,1.4]],wall:['crystal',80,{cry:0x6fb8e8},2,3.4]},
 glacier:{sky:[0x4a7aa8,0xc8e0f0],fog:[40,120],g1:0xa8c8d8,g2:0x7aa0b8,hs:0xe0f0ff,hg:0x3a5a70,sun:[0xe8f4ff,.9,[30,45,0]],pc:0xffffff,ps:.25,pv:[.6,-1.2,.3],water:0x3a7a9a,amp:1.2,
  dec:[['snowpine',50,{trunk:0x4a3a30,leaf:0xe8f0f5},.9,1.5],['rock',30,{rock:0xb8ccd8},.6,1.5],['crystal',20,{cry:0xaee8ff},.8,1.4],['dock',8,{wood:0x5a4a3a},1,1.2]],wall:['crystal',70,{cry:0x8fc8e8},2.2,3.4]},
 monastery:{sky:[0x5a5a8a,0xe8d8c8],fog:[35,105],g1:0xc8d0d8,g2:0x9aa8b8,hs:0xffffff,hg:0x4a4a5a,sun:[0xfff0d8,1,[-20,45,20]],pc:0xffffff,ps:.2,pv:[.2,-1,.1],amp:1.4,
  dec:[['pillar',36,{stone:0xd8d0c0},.9,1.4],['ruin',30,{stone:0xb8b0a0},.8,1.4],['statue',16,{stone:0xd8d0c0},.9,1.3],['torch',24,{post:0x4a3a2a,flame:0xffd080},.9,1.2],['snowpine',20,{trunk:0x4a3a30,leaf:0xe8f0f5},.9,1.4]],wall:['pillar',70,{stone:0x9a9aa0},2,2.8]},
 spine:{sky:[0x2a3a5a,0x8ab0d0],fog:[30,100],g1:0x6a7a8a,g2:0x4a5a6a,hs:0xc8e0ff,hg:0x2a3a4a,sun:[0xd8e8ff,.8,[40,30,-30]],pc:0xffffff,ps:.3,pv:[1.8,-1,.5],amp:3.4,
  dec:[['bone',50,{bone:0xd8d0c8},1.2,2.4],['ribcage',14,{bone:0xd8d0c8},1,1.6],['crystal',25,{cry:0x8fd8ff},.8,1.5],['rock',40,{rock:0x6a7a8a},.7,1.6]],wall:['bigrock',60,{rock:0x4a5a6a},1.1,1.8]},
 marsh:{sky:[0x1a2a1a,0x4a6a3a],fog:[18,65],g1:0x2a3a22,g2:0x1a2a18,hs:0x8ab880,hg:0x0a1a0a,sun:[0x9aff7a,.45,[0,30,20]],pc:0x7aff5a,ps:.25,pv:[.05,.2,.05],glowP:1,night:1,water:0x1a2a10,amp:.7,
  dec:[['reed',120,{grass:0x3a5a2a},.9,1.6],['deadtree',45,{wood:0x1a1a14},1,1.7],['mush',40,{stem:0x8a9a70,cap:0x7aff5a},.8,1.5],['rock',20,{rock:0x3a4a3a},.6,1.2]],wall:['deadtree',80,{wood:0x0a0a08},2,2.8]},
 capital:{sky:[0x2a2a3a,0x8a6a7a],fog:[30,100],g1:0x4a4a52,g2:0x3a3a42,hs:0xc8b8d8,hg:0x2a2a30,sun:[0xd8b8a0,.7,[-30,35,-10]],pc:0xd8c8e8,ps:.15,pv:[.4,.1,.2],amp:1,
  dec:[['ruin',60,{stone:0x5a5a62},.9,1.8],['pillar',30,{stone:0x6a6a72},.9,1.6],['statue',18,{stone:0x7a7a82},.9,1.4],['banner',20,{post:0x3a3a40,cloth:0x4a2a5a},.9,1.2],['torch',20,{post:0x2a2a30,flame:0xb08aff},.9,1.2]],wall:['ruin',70,{stone:0x3a3a40},2,3]},
 catacomb:{sky:[0x100a14,0x3a2a3a],fog:[18,60],g1:0x3a3038,g2:0x2a2028,hs:0x8a7a9a,hg:0x100a10,sun:[0x9a7aff,.5,[10,30,20]],pc:0xb08aff,ps:.2,pv:[.05,.3,.05],glowP:1,night:1,amp:.4,
  dec:[['grave',60,{stone:0x5a5068},.8,1.3],['pillar',30,{stone:0x4a4058},.8,1.3],['candle',50,{wax:0xe8dcc0,flame:0xb08aff},.8,1.4],['bone',30,{bone:0xc8c0b8},.8,1.2],['sarco',16,{stone:0x4a4050},.9,1.2]],wall:['pillar',70,{stone:0x2a2030},1.8,2.6]},
 storm:{sky:[0x1a1a2a,0x5a6a8a],fog:[30,100],g1:0x4a5060,g2:0x3a4050,hs:0xb8c8e8,hg:0x1a1a2a,sun:[0xc8d8ff,.7,[-40,40,0]],pc:0xffffff,ps:.3,pv:[3,-.5,.8],amp:4,
  dec:[['rock',60,{rock:0x5a6070},.8,1.9],['bigrock',20,{rock:0x4a5060},.6,1],['deadtree',25,{wood:0x2a2a30},.9,1.5],['crystal',16,{cry:0xb8d8ff},.8,1.4]],wall:['bigrock',60,{rock:0x3a4050},1.2,2]},
 walls:{sky:[0x1a1226,0x5a3a6a],fog:[28,95],g1:0x2e2538,g2:0x241d31,hs:0xb8a0e0,hg:0x1a1020,sun:[0xb08aff,.65,[20,35,-20]],pc:0xff7a3a,ps:.2,pv:[.1,1.2,.1],glowP:1,night:1,amp:.8,
  dec:[['pillar',30,{stone:0x4a4058},.8,1.3],['ruin',30,{stone:0x3a3048},.9,1.6],['torch',40,{post:0x2a2030,flame:0xff7a3a},.9,1.3],['chain',24,{metal:0x5a5a60},.9,1.3],['banner',18,{post:0x2a2030,cloth:0x5a1a2a}]],wall:['pillar',70,{stone:0x2e2838},2,2.8]},
 court:{sky:[0x0a0a16,0x4a2a5a],fog:[25,90],g1:0x2a1a30,g2:0x1a1020,hs:0xc090ff,hg:0x100a1a,sun:[0xb060ff,.7,[-20,40,10]],pc:0xd06aff,ps:.25,pv:[.1,.8,.1],glowP:1,night:1,amp:.6,
  dec:[['pillar',36,{stone:0x3a2a48},.9,1.5],['statue',20,{stone:0x4a3a58},.9,1.4],['candle',50,{wax:0xd8c8e8,flame:0xd06aff},.9,1.5],['banner',24,{post:0x2a1a30,cloth:0x6a1a4a},.9,1.2],['crystal',16,{cry:0xb06aff},.8,1.3]],wall:['pillar',70,{stone:0x1a1020},2,3]},
 throne:{sky:[0x0a0612,0x6a1a3a],fog:[25,90],g1:0x1a0e1a,g2:0x2a1222,hs:0xff8ab0,hg:0x0a0610,sun:[0xff6a9a,.8,[0,40,20]],pc:0xff4a8a,ps:.3,pv:[.1,.6,.1],glowP:1,night:1,amp:.4,
  dec:[['pillar',40,{stone:0x2a1a2a},.9,1.6],['torch',40,{post:0x1a0a1a,flame:0xff4a8a},.9,1.3],['statue',24,{stone:0x3a2a3a},.9,1.5],['chain',30,{metal:0x4a4050},.9,1.4]],wall:['pillar',70,{stone:0x1a0a1a},2.2,3.2]},
 rift:{sky:[0x000000,0x2a0a4a],fog:[22,85],g1:0x120a1e,g2:0x1e0e2e,hs:0x9a6aff,hg:0x050208,sun:[0x9a4aff,.9,[0,50,0]],pc:0xb06aff,ps:.35,pv:[0,1.5,0],glowP:1,night:1,stars:1,amp:1.2,
  dec:[['crystal',60,{cry:0x8a2aff},.9,2.2],['voidrock',40,{rock:0x1a0a2a,lava:0x8a2aff},.8,1.6],['pillar',20,{stone:0x1a0a2a},.9,1.8]],wall:['crystal',80,{cry:0x5a1aaa},2.4,3.8]},
};

/* ================= CHAPTERS ================= */
// quest types: hunt{mob,n} gather{mob,item,n} shrines{n} survive{t}
const ACTS=['Act I · The Lowlands','Act II · The Scorched South','Act III · The Frozen North','Act IV · The Shadowlands','Act V · The Shadow Keep'];
const CHS=[
{name:'Verdant Fields',b:'fields',mobs:['blob','bunny','beetle'],boss:'boar',npc:{n:'Elder Rowan',ic:'🧙',hat:'hood',col:0x6a5a8a},
 quest:{t:'hunt',mob:'bunny',n:10,title:'Thinning the Herd'},
 intro:[['N','In the peaceful village of Lumen lived two inseparable adventurers: {H} and {P}.'],['N','One night, under a blood-red moon, the sky tore open...'],['M','At last. The one with starlight in their heart. You will be MINE.'],['P','{H}! Help me!'],['H','{P}!! Let {P} go!'],['M','If you want {P} back, cross my twenty lands and reach the Shadow Keep... if you survive.'],['N','With a flash of dark fire, Lord Malgrath vanished, and {P} with him.'],['H','Hold on, {P}. I don\'t care how many monsters stand in my way. I\'m coming for you.']],
 qs:[['E','{H}... you cannot fight Malgrath as you are. The mist to the north hides his first lieutenant, the Warthog King, but the mist will not part for the weak.'],['E','Prove yourself. The Thornbunnies have overrun our fields; slay ten of them and return to me.'],['E','Remember: watch your enemy, not your buttons. Dodge through red circles. Parry the strike you can read, and your riposte will crush them. Rest at the golden grace when you must; it refills your flask, but it also wakes the monsters.']],
 qp:[['E','Not yet, child. Ten bunnies. Their pelts will also make a fine cloak.']],
 qd:[['E','You fight well for one so young. The mist to the north is open. Beyond it waits the Warthog King. He is slow, but his charge will break you if you stand still.'],['H','I\'m ready.']],
 outro:[['N','Among the Warthog King\'s hoard, something glimmers... {P}\'s hair ribbon!'],['PL','"{H}... they\'re dragging me east, through the Whispering Woods. — {P}"']]},
{name:'Whispering Woods',b:'woods',mobs:['mushroom','wolf','spider'],boss:'treant',npc:{n:'Mira the Huntress',ic:'🏹',hat:'hood',col:0x3a6a3a},
 quest:{t:'gather',mob:'spider',item:'Spider Silk',n:6,title:'Silk for the Snare'},
 intro:[['N','The Whispering Woods. The trees murmur with a voice that is not their own.'],['H','Shadow magic... Malgrath has corrupted this whole forest.']],
 qs:[['Q','Stay low, stranger. The Elder Treant has gone mad and his roots have swallowed the only road east.'],['Q','I can weave a snare strong enough to hold him still, but I need six Spider Silk from the Webweavers. Careful: they spit from range. Roll when you see them rear back.']],
 qp:[['Q','Six silks. Count them. The Webweavers nest deeper in the woods.']],
 qd:[['Q','Perfect. I have woven three silk snares in his clearing beyond the mist. Lure him onto the glowing silk and it will bind him.'],['Q','While the silk holds, his stance breaks easily. Punish him then. And mind his roots: they tangle your feet. Roll through them.'],['Q','Your friend passed here two nights ago, carried by shadows toward the lantern marsh.']],
 outro:[['T','Thank you, little one... the shadow has lifted from my roots.'],['T','The dark lord took {P} south, through the Mire of Lanterns.']]},
{name:'Mire of Lanterns',b:'mire',mobs:['frog','lantern','leech'],boss:'spiderq',npc:{n:'Pell the Lantern Keeper',ic:'🏮',hat:'cap',col:0x5a7a8a},
 quest:{t:'shrines',n:3,title:'Relight the Lanterns'},
 intro:[['N','Fog swallows the path. Blue lights drift between the dead trees, and some of them are not lanterns.'],['PE','...{H}... follow the lights...']],
 qs:[['Q','You hear it too, don\'t you? The Broodmother sings to lost travellers and eats what answers.'],['Q','The three great lanterns kept her at bay for a hundred years. Relight them, and the mist to her nest will open. Stand at each lantern and hold still while it kindles.']],
 qp:[['Q','The lanterns are dark. Find them by their stone pillars and kindle each one.']],
 qd:[['Q','Light returns to the mire! Follow the warm stones; they will always lead you back to safe ground.'],['Q','The Broodmother waits beyond the mist. She lays her webs in long lanes: step out of them or roll through. And break her eggs before they hatch.']],
 outro:[['N','In the Broodmother\'s nest, a torn piece of a map: the Ruined Watchtower, circled in dark ink.'],['H','That\'s where they\'re taking {P}.']]},
{name:'Ruined Watchtower',b:'watchtower',mobs:['hollow','archer','wolf'],boss:'towerknight',npc:{n:'Captain Dorne',ic:'⚔️',hat:'helm',col:0x7a2a2a},
 quest:{t:'survive',time:60,title:'Hold the Gate'},
 intro:[['N','The old border fortress. Its garrison still stands guard, long after their deaths.'],['H','Hollow soldiers. They still remember how to raise a shield.']],
 qs:[['Q','You! Living one! The Tower Knight holds the gate, and his hollows attack my camp every hour.'],['Q','Stand with me at the signal fire and hold the line for one minute. Break the hollows\' guard with heavy attacks, or strike them from behind. Then I\'ll open the gate for you.']],
 qp:[['Q','Go to the signal fire east of here and stand your ground until the wave breaks!']],
 qd:[['Q','By the gods, you held. The gate is yours. Aldric was my captain once. His sweep covers the whole bridge... roll INTO it, not away.'],['Q','He spoke of a prisoner with starlight eyes, taken south across the sands.']],
 outro:[['N','Tower Knight Aldric kneels as the shadow leaves his armour.'],['TK','Forgive me... The south. The Pharaoh of the sunken city serves Malgrath now. Your friend is there.']]},
{name:'Sunken Desert',b:'desert',mobs:['scorpion','snake','mummy'],boss:'scorpionking',npc:{n:'Zafira the Nomad',ic:'🐪',hat:'wrap',col:0xc8a060},
 quest:{t:'hunt',mob:'snake',n:12,title:'Viper Season'},
 intro:[['N','Act II. Heat shimmers over endless dunes. Somewhere beneath the sand, old kings stir.'],['H','{P}... I can almost feel you. Keep fighting. I\'m getting closer.']],
 qs:[['Q','Water is life, and the Dune Vipers have poisoned every well between here and the tomb.'],['Q','Slay twelve of them. They lunge far: dodge sideways, not back. Then the Scorpion Emperor\'s mist will open to you.']],
 qp:[['Q','Twelve vipers. The wells will not clean themselves.']],
 qd:[['Q','The wells run clear. The Emperor is beyond the mist. His tail strikes twice in a row, so never roll early.']],
 outro:[['N','Beneath the Emperor\'s carapace lies a sealed stairway, going down into the Pharaoh\'s tomb.']]},
{name:'Pharaoh\'s Tomb',b:'tomb',mobs:['skeleton','mummy','imp'],boss:'pharaoh',npc:{n:'Imhet the Scholar',ic:'📜',hat:'cap',col:0xd8c8a0},
 quest:{t:'shrines',n:3,title:'Break the Three Seals'},
 intro:[['N','Torchlight on gold. The dead of a whole dynasty line the walls, and they are all awake.']],
 qs:[['Q','Fascinating! You\'re alive! Nekhet, the Sand Pharaoh, sealed himself in with three wards.'],['Q','Break the seals at the three altars and his chamber will open. He summons his dead; kill the skeletons first or they\'ll surround you.']],
 qp:[['Q','The altars glow faintly in the dark. Three of them. Hold your ground on each.']],
 qd:[['Q','The wards are broken! Nekhet throws bolts in a fan: stand close and dodge through, or stand far and step aside.']],
 outro:[['F','Impossible... Malgrath promised me eternity...'],['N','The Pharaoh\'s crown shatters, revealing a key of black glass.'],['PL','"{H}, they\'re taking me over the fire mountain. Hurry. — {P}"']]},
{name:'Ashen Volcano',b:'volcano',mobs:['imp','salamander','lavagolem'],boss:'magmalord',npc:{n:'Brakk the Smith',ic:'⚒️',hat:'cap',col:0x8a4a2a},
 quest:{t:'gather',mob:'lavagolem',item:'Magma Core',n:4,title:'Cores for the Forge'},
 intro:[['N','The ground burns. Rivers of fire carve the mountain, and something enormous breathes beneath it.']],
 qs:[['Q','You want to cross the Magma Lord\'s caldera? Then you\'ll need armour that doesn\'t melt.'],['Q','Bring me four Magma Cores from the golems. They block from the front. Heavy attacks break their guard, or circle behind them.']],
 qp:[['Q','Four cores. The golems are slow but they hit like my hammer.']],
 qd:[['Q','Good. I\'ve tempered your gear against the heat. The Magma Lord\'s meteors leave red marks before they land. Never stand still in his arena.']],
 outro:[['N','As the Magma Lord cools into stone, the far side of the caldera reveals a bridge of black glass over the abyss.']]},
{name:'Obsidian Bridge',b:'bridge',mobs:['troll','hollow','imp'],boss:'bridgetroll',npc:{n:'The Hermit',ic:'🧓',hat:'hood',col:0x4a4a5a},
 quest:{t:'survive',time:75,title:'The Toll'},
 intro:[['N','A bridge a mile long, and Gorm the troll at the end of it. Nobody has paid his toll and lived.']],
 qs:[['Q','Hehe. Gorm takes his toll in bones. His children swarm the bridge whenever a traveller stops to rest.'],['Q','Light the beacon at the midpoint and stay by it. Survive their swarm and Gorm himself will come to see who is making all the noise.']],
 qp:[['Q','The beacon, traveller. Stand by it and don\'t die. Simple.']],
 qd:[['Q','You\'re still breathing! Gorm jumps, you know. When his shadow grows under your feet, roll. Don\'t block, roll.']],
 outro:[['N','Gorm topples into the abyss. Beyond the bridge, the air turns cold, and the first snow begins to fall.'],['H','The Frozen North. {P}, I\'m halfway there.']]},
{name:'Frost Caverns',b:'frost',mobs:['bat','bear','golem'],boss:'frostwyrm',npc:{n:'Ylva the Ice Witch',ic:'🧊',hat:'wizard',col:0x6a9ad8},
 quest:{t:'hunt',mob:'golem',n:8,title:'Shattered Cores'},
 intro:[['N','Act III. The Frost Caverns. Every breath turns to ice.'],['PE','...{H}... is that you...? It\'s so cold...']],
 qs:[['Q','The Wyrm sleeps in the heart of the glacier, and the Ice Golems are its dreams made solid.'],['Q','Shatter eight golems and the Wyrm will wake angry. Angry is good. Angry is reckless.']],
 qp:[['Q','Eight golems. Their beams hurt. Side-step them.']],
 qd:[['Q','It stirs. The Frost Wyrm sweeps its tail low and breathes high. Learn which is coming, and the fight is yours.']],
 outro:[['N','The Wyrm falls, and the wall of ice behind it melts into a vast frozen lake.']]},
{name:'Glacier Lake',b:'glacier',mobs:['bat','yeti','wyvern'],boss:'serpent',npc:{n:'Oskar the Fisherman',ic:'🎣',hat:'cap',col:0x3a5a7a},
 quest:{t:'gather',mob:'wyvern',item:'Wyvern Scale',n:5,title:'Bait for Ymir'},
 intro:[['N','A lake so wide the far shore is a rumour. Under the ice, something long and old is moving.']],
 qs:[['Q','Ymir won\'t surface for a little fish like you. But she\'ll come for wyvern meat.'],['Q','Bring me five Wyvern Scales. The wyvernlings dive on you; dodge when they tuck their wings.']],
 qp:[['Q','Five scales. The wyverns roost near the crystals.']],
 qd:[['Q','That\'ll draw her. Ymir charges across the ice; dodge late, she corrects her aim.']],
 outro:[['N','Ymir sinks beneath the ice. On the far shore, bells ring from a monastery buried in snow.']]},
{name:'Snowbound Monastery',b:'monastery',mobs:['monk','hollow','bat'],boss:'abbot',npc:{n:'Abbess Sera',ic:'🕯️',hat:'hood',col:0xd8d0c8},
 quest:{t:'shrines',n:3,title:'The Three Bells'},
 intro:[['N','The monks of the mountain once guarded the pass. Now they guard Malgrath\'s secrets.']],
 qs:[['Q','Varro was our Abbot before the shadow took him. He has sealed the sanctum with silence.'],['Q','Ring the three bells on the terraces. Each takes a moment; the fallen monks will try to stop you.']],
 qp:[['Q','Three bells. Hold your ground beside each until it rings.']],
 qd:[['Q','The bells sound. Varro summons his flock and calls fire from the sky. Kill the flock, then punish him while he chants.']],
 outro:[['AB','The light... I remember... the girl with starlight eyes... they carried her up the Wyrm\'s Spine.'],['H','Then that\'s where I climb.']]},
{name:'Wyrm\'s Spine',b:'spine',mobs:['wyvern','skeleton','yeti'],boss:'bonewyrm',npc:{n:'Kael the Wyrm-Rider',ic:'🐉',hat:'helm',col:0x5a7a9a},
 quest:{t:'hunt',mob:'wyvern',n:10,title:'Clear the Skies'},
 intro:[['N','A mountain made of the bones of a dragon older than the world. The wind here has teeth.']],
 qs:[['Q','The Bone Wyrm nests at the summit. Nothing climbs while the wyvernlings own the sky.'],['Q','Ten of them. Then the way to the summit\'s mist is yours.']],
 qp:[['Q','Ten wyvernlings. Lock on; they\'re fast.']],
 qd:[['Q','The sky is clear. The Bone Wyrm has no flesh to stagger, so parry its bites and strike its skull when it lands.']],
 outro:[['N','The Bone Wyrm collapses into the mountain it was made of. Below, the Shadowlands spread out like a bruise.'],['PL','"{H}... I can see the Keep from here. I\'m scared. — {P}"']]},
{name:'Blighted Marsh',b:'marsh',mobs:['leech','ghoul','frog'],boss:'marshhorror',npc:{n:'Nyx the Alchemist',ic:'⚗️',hat:'wizard',col:0x4a7a3a},
 quest:{t:'gather',mob:'leech',item:'Blight Sac',n:6,title:'Poison for Poison'},
 intro:[['N','Act IV. The Shadowlands begin in a marsh that eats light. Everything here is hungry.']],
 qs:[['Q','The Marsh Horror is the marsh. You can\'t kill it with steel alone.'],['Q','Bring me six Blight Sacs from the leeches and I\'ll brew a venom that makes it bleed. Its roots burst from below: keep moving.']],
 qp:[['Q','Six sacs. The leeches lunge; punish them after they miss.']],
 qd:[['Q','Coat your weapon in this. The Horror will stagger far more easily now. Break it and tear it apart.']],
 outro:[['N','The Horror dissolves into the bog. Above the mist, broken towers rise: the Fallen Capital.']]},
{name:'Fallen Capital',b:'capital',mobs:['royalguard','wraith','hollow'],boss:'fallenking',npc:{n:'Queen Elara\'s Ghost',ic:'👻',hat:'crown',col:0xc8b8e8},
 quest:{t:'survive',time:80,title:'The Last Court'},
 intro:[['N','A city that once ruled the world, emptied in a single night when its king knelt to Malgrath.']],
 qs:[['Q','My husband Osric opened the gates to the shadow. His guards still obey him.'],['Q','Stand at the throne square and ring the court bell. The guards will come for you. Survive them, and Osric will have no one left to hide behind.']],
 qp:[['Q','The throne square, south-east. Hold it.']],
 qd:[['Q','It is done. Osric leaps and sweeps in long combos. Wait for the last swing before you punish him. Free him, please.']],
 outro:[['N','The Fallen King\'s crown rolls into the dust. The queen\'s ghost smiles once, and fades.']]},
{name:'Cursed Catacombs',b:'catacomb',mobs:['skeleton','wraith','vampire'],boss:'lich',npc:{n:'Gravekeeper Sol',ic:'⚰️',hat:'hood',col:0x3a3a4a},
 quest:{t:'shrines',n:3,title:'Smother the Phylacteries'},
 intro:[['N','The dead of twenty kingdoms, stacked to the ceiling, and all of them whispering one name.']],
 qs:[['Q','Lich Mortis cannot die while his three phylacteries burn. I\'ve watched them for forty years.'],['Q','Smother them. Each takes time, and the dead will not let you work in peace.']],
 qp:[['Q','Three phylacteries, deep in the catacombs. Stand on each until its flame dies.']],
 qd:[['Q','Mortis is mortal at last. He teleports and summons. Ignore the summons if you can reach him; he is fragile when his stance breaks.']],
 outro:[['N','The Lich\'s robes fall empty. Beyond the catacombs, thunder rolls over the Storm Peaks.']]},
{name:'Storm Peaks',b:'storm',mobs:['stormbird','eye','golem'],boss:'stormroc',npc:{n:'Taro the Storm Monk',ic:'⛩️',hat:'cap',col:0x6a6a8a},
 quest:{t:'hunt',mob:'eye',n:10,title:'Blind the Watchers'},
 intro:[['N','The last mountains before the Keep. Malgrath\'s eyes float in the storm, watching every path.']],
 qs:[['Q','Nothing reaches the Keep unseen while the Watchers float. Blind ten of them.'],['Q','They fire from far. Close the distance behind rocks and roll through their beams.']],
 qp:[['Q','Ten Watchers. They hover near the crystals.']],
 qd:[['Q','The storm is blind. The Tempest Roc dives from above; when the wind screams, roll.']],
 outro:[['N','The Roc crashes into the peaks. Below, lit by lightning: the outer walls of the Shadow Keep.'],['H','I\'m here, {P}. I\'m finally here.']]},
{name:'Outer Walls',b:'walls',mobs:['darkknight','oni','wraith'],boss:'gatewarden',npc:{n:'Vance the Rebel Knight',ic:'🛡️',hat:'helm',col:0x5a3a6a},
 quest:{t:'gather',mob:'darkknight',item:'Dark Sigil',n:5,title:'Sigils of Passage'},
 intro:[['N','Act V. The Shadow Keep. Walls black as the space between stars.']],
 qs:[['Q','Another living soul! I\'ve been fighting these walls alone for a month.'],['Q','The Gate Warden only opens for those who carry five Dark Sigils. Take them from the Shadow Knights. Break their guard with heavy blows.']],
 qp:[['Q','Five sigils. The Shadow Knights patrol the ramparts.']],
 qd:[['Q','The Warden will open the gate... then try to kill you. Its sweeps are slow; wait, then punish.']],
 outro:[['N','The Gate Warden crumbles. The inner court lies open, and a voice like {P}\'s calls from within.']]},
{name:'Court of Shadows',b:'court',mobs:['vampire','darkknight','eye'],boss:'shadowtwin',npc:{n:'A Whisper in the Dark',ic:'🌑',hat:'hood',col:0x1a1026},
 quest:{t:'survive',time:90,title:'Face the Reflection'},
 intro:[['N','The inner court. Mirrors line every wall, and none of them show your reflection.'],['P','{H}!! I\'m here! Over here!'],['H','{P}?! Wait... there are two of you...']],
 qs:[['Q','Clever hero. Malgrath made a copy of your friend from stolen starlight. It thinks it IS {P}.'],['Q','Stand in the mirror circle and endure what the mirrors send. Then the false one will come to you.']],
 qp:[['Q','The mirror circle, to the east. Endure.']],
 qd:[['Q','Now it comes. It fights like your friend would. Do not hesitate. The real {P} is beyond the throne.']],
 outro:[['ST','...I... I only wanted... to go home too...'],['N','The Shadow Twin dissolves into starlight that drifts toward the throne room.'],['H','I\'m sorry. I\'ll finish this for both of you.']]},
{name:'Throne of Night',b:'throne',mobs:['oni','darkknight','voidling'],boss:'malgrath',npc:{n:'Vance the Rebel Knight',ic:'🛡️',hat:'helm',col:0x5a3a6a},
 quest:{t:'hunt',mob:'voidling',n:12,title:'Seal the Breach'},
 intro:[['N','The throne room. A blood moon hangs in a torn sky, and {P} hangs in a cage of light above the throne.'],['P','{H}! You came... you really came...'],['M','Touching. Vance, is that you behind the hero? Did you bring my gate key back?']],
 qs:[['Q','He\'s opening the rift NOW. Voidlings pour out of it every minute.'],['Q','Kill twelve of them to weaken the breach, and the mist to his throne will tear open. Then it\'s you and him.']],
 qp:[['Q','Twelve voidlings. Fast! The rift widens!']],
 qd:[['Q','It\'s holding! Go! Malgrath mixes every move you\'ve seen. Trust your eyes, not your rhythm.']],
 outro:[['M','No... this is not... how it ends...'],['N','Malgrath falls, but the blood moon splits open. His body rises again, wreathed in void, and drags {P}\'s cage through the rift.'],['H','NO! {P}! I\'m coming!']]},
{name:'The Void Rift',b:'rift',mobs:['voidling','eye','darkknight'],boss:'voidmalgrath',npc:{n:'{P}\'s Voice',ic:'💫',hat:'none',col:0xffd0e8,voice:1},
 quest:{t:'shrines',n:3,title:'Starlight Anchors'},
 intro:[['N','Chapter 20. There is no ground here, only memory. The rift is made of every place you have walked.'],['P','{H}... I can feel you. My starlight is scattered in three anchors. Gather it and I can open the cage from inside.']],
 qs:[['P','Three anchors. Stand in each one and hold on. The void will fight you for them.']],
 qp:[['P','Keep going. I\'m right here with you.']],
 qd:[['P','I\'m free of the cage! But he\'s still between us. End it, {H}. End it together.']],
 outro:[['M','This light... it\'s too strong...'],['N','The Void Ascendant crumbles into dust, and the rift goes quiet.'],['P','{H}!! You really came for me... through twenty lands...'],['H','I promised, didn\'t I? I\'ll always come for you.'],['P','Then let\'s go home. Together.'],['N','And so {H} and {P} returned to Lumen, their bond stronger than any darkness.']]},
];
const SPK={E:['Elder Rowan','🧙'],M:['Lord Malgrath','😈'],T:['Elder Treant','🌳'],F:['Sand Pharaoh','💀'],TK:['Tower Knight Aldric','🛡️'],AB:['Abbot Varro','🕯️'],ST:['Shadow Twin','🌑'],N:['','']};
function chLevel(c){return 1+c*3;}


function statMax(s){s=s||S;return STAT_JOB[(s&&s.job)||0]||STAT_MAX;}
/* RO-style stat economy. Each level grants STAT_PTS points, and raising a stat
   from v to v+1 costs 2+floor(v/10) of them — so the 90s cost ~11 each and the
   escalating price IS the soft cap, visible to the player instead of hidden in
   formulas. Remaining points are DERIVED (earned minus spent), never stored:
   old saves self-heal and respec is just resetting stats to class base. */
const STAT_PTS=4;
const stCost=v=>2+Math.floor(v/10);
function stCostN(v,n){let t=0;for(let i=0;i<n;i++)t+=stCost(v+i);return t;}
function ptsEarned(lv){return (lv-1)*STAT_PTS;}
function ptsSpent(st,ck){const b=CLASSES[ck||S.cls].base;let t=0;
 for(const k in st)for(let v=(b[k]||0);v<st[k];v++)t+=stCost(v);return t;}
function ptsLeft(){return Math.max(0,ptsEarned(S.lv)-ptsSpent(S.st));}
/* What one more point in k buys right now, as a compact label. */
function statDelta(k){const a=stats();S.st[k]++;const b=stats();S.st[k]--;const o=[];
 if(b.atk>a.atk)o.push('ATK +'+(b.atk-a.atk));
 if(b.mhp>a.mhp)o.push('HP +'+(b.mhp-a.mhp));
 if(b.msp>a.msp)o.push('SP +'+(b.msp-a.msp));
 if(b.def>a.def)o.push('DEF +'+(b.def-a.def));
 if(b.crit>a.crit)o.push('Crit +'+Math.round((b.crit-a.crit)*100)+'%');
 if(b.flee>a.flee)o.push('Flee +'+((b.flee-a.flee)*100).toFixed(1)+'%');
 if(b.aspdM>a.aspdM)o.push('Spd +'+(b.aspdM-a.aspdM).toFixed(2));
 if(b.msta>a.msta)o.push('Sta +'+(b.msta-a.msta));
 return o.slice(0,3).join(' · ');}
/* ================= JOBS (4 per class) + per-job skill trees ================= */
const JOB_LV=[1,99,300,500];
const JOBS={
 knight:['Knight','Lord Knight','Royal Guard','Imperial Guard'],
 assassin:['Assassin','Blade','Executioner','Shadow Reaper'],
 priest:['Priest','High Priest','Arch Bishop','Cardinal'],
 wizard:['Wizard','High Wizard','Sorcerer','Elementor'],
 archer:['Archer','Sniper','Ranger','Windhawk'],
 smith:['Blacksmith','Whitesmith','Mechanic','Meister'],
 acrobat:['Acrobat','Jester','Clown','Grimoire'],
};
const JOB_COL={knight:0x6aa8ff,assassin:0xb04aff,priest:0xfff0a0,wizard:0x6ad8ff,archer:0x8aff7a,smith:0xff8a2a,acrobat:0xff5a8a};
const EL={fire:['🔥','Fire','#ff7a3a'],ice:['❄️','Ice','#8fe3ff'],lightning:['⚡','Lightning','#ffe14d'],wind:['🌪️','Wind','#9affc8'],earth:['🪨','Earth','#c8a06a'],holy:['✨','Holy','#fff2a0'],shadow:['🌑','Shadow','#b06aff']};
// a = active skill, p = passive. req = points already spent in THIS job's tree
const A=(job,req,n,e,t,o,d)=>Object.assign({n,e,t,job,req,d},o);
const P=(job,req,n,e,k,v,d)=>({n,e,k,v,job,req,d});
const JOB_SKILLS={
 knight:{a:[
  A(0,30,'Spear Boomerang','🪃','strike',{rng:1,m:2.8,sp:14,cd:2.4,c:0xc8d8ff,el:'wind',poise:30},'Throw your spear at a distant foe'),
  A(1,0,'Spiral Pierce','🌀','multi',{hits:5,m:.95,sp:22,cd:4,c:0x9fd0ff,el:'earth'},'Five drilling spear thrusts'),
  A(1,0,'Aura Blade','💠','buff',{k:'atk',v:.32,dur:16,sp:26,cd:24,c:0x8fd3ff},'Wrap your weapon in aura'),
  A(1,10,'Brandish Spear','🔱','aoe',{r:5,m:2.6,kb:1,sp:28,cd:6,c:0xc8d8ff,el:'wind'},'Wide sweep that knocks enemies back'),
  A(1,10,'Concentration','🎯','buff',{k:'aspd',v:.3,dur:14,sp:22,cd:22,c:0xffd76a},'Faster attacks'),
  A(1,25,'Clashing Spiral','💫','strike',{m:5.2,sp:34,cd:7,c:0x9fd0ff,el:'earth',poise:60},'A spiraling charge that shatters guards'),
  A(1,40,'Valkyrie Charge','🐎','aoe',{r:7,m:6.5,stun:1.5,kb:1,sp:60,cd:40,c:0xff3030,el:'fire',ult:1},'ULTIMATE · Ride through everything'),
  A(2,0,'Shield Press','🛡️','strike',{m:4.6,stun:1.5,sp:24,cd:5,c:0xb8c8ff,el:'earth',poise:60},'Slam with your shield'),
  A(2,0,'Prestige','👑','buff',{k:'dr',v:.35,dur:16,sp:30,cd:26,c:0xffe08a},'Take much less damage'),
  A(2,10,'Banding','⚜️','aoe',{r:6,m:3,stun:1,sp:34,cd:7,c:0xfff2a0,el:'holy'},'Holy shockwave around you'),
  A(2,10,'Overbrand','⚔️','multi',{hits:3,m:2.4,sp:30,cd:5,c:0xc8d8ff,el:'earth'},'Three crushing spear blows'),
  A(2,25,'Genesis Ray','🌟','aoeT',{r:5,m:4.4,sp:42,cd:8,c:0xfff2a0,el:'holy'},'Pillar of holy light on the target'),
  A(2,40,'Earth Drive','🌋','aoe',{r:8,m:8.5,stun:2,sp:70,cd:45,c:0xc8a06a,el:'earth',ult:1},'ULTIMATE · Split the earth with your shield'),
  A(3,0,'Shield Shooting','🎇','strike',{rng:1,m:6.5,sp:40,cd:5,c:0xfff2a0,el:'holy'},'Hurl your blazing shield'),
  A(3,0,'Cross Rain','✝️','aoe',{r:7,m:4.2,sp:48,cd:8,c:0xfff2a0,el:'holy'},'Holy spears rain around you'),
  A(3,8,'Imperial Pressure','💥','multi',{hits:4,m:2.8,sp:46,cd:6,c:0x6aa8ff,el:'earth'},'Four imperial strikes'),
  A(3,18,'Grand Judgement','⚖️','aoeT',{r:6,m:6.2,sp:58,cd:10,c:0xfff2a0,el:'holy'},'Judge an area with holy fire'),
  A(3,30,'Awakening: Aegis','🔆','buff',{k:'awk',v:.6,dur:20,sp:80,cd:75,c:0x6aa8ff},'AWAKEN · Huge ATK, speed and defense for 20s'),
  A(3,45,'Judgement Cross','✨','aoe',{r:10,m:12,stun:2.5,sp:100,cd:60,c:0xfff2a0,el:'holy',ult:1},'ULTIMATE · A cross of light burns the battlefield'),
 ],p:[
  P(1,0,'Spear Mastery','🔱','atkp',2.5,'+2.5% attack per level'),P(1,10,'Faith','🙏','hpp',3,'+3% max HP per level'),P(1,20,'Cavalier','🐴','stap',4,'+4% stamina regen per level'),P(1,30,'Guardian Will','🧱','defp',1,'-1% damage taken per level'),
  P(2,0,'Royal Guard','🛡️','defp',1,'-1% damage taken per level'),P(2,10,'Inspiration','🎺','atkp',2.5,'+2.5% attack per level'),P(2,20,'Rebellion','🔥','critp',1.2,'+1.2% crit per level'),P(2,30,'Shield Spell','💠','hpp',3,'+3% max HP per level'),
  P(3,0,'Hallowed Ground','⛪','defp',1,'-1% damage taken per level'),P(3,10,'Imperial Spirit','👑','hpp',3,'+3% max HP per level'),P(3,20,'Godly Will','⚡','atkp',3,'+3% attack per level'),P(3,30,'Unbreakable','🗿','stap',5,'+5% stamina regen per level')]},
 assassin:{a:[
  A(0,30,'Cloaking Strike','👤','strike',{m:3.4,sp:14,cd:2.2,c:0x9a6aff,el:'shadow',poise:30},'Strike from the shadows'),
  A(1,0,'Soul Destroyer','💀','strike',{m:4.6,sp:24,cd:4,c:0xb04aff,el:'shadow',poise:40},'Rip at the enemy\'s soul'),
  A(1,0,'Deadly Poison','☠️','buff',{k:'atk',v:.4,dur:16,sp:28,cd:24,c:0x7dff6a},'Coat your blades in deadly venom'),
  A(1,10,'Phantom Rush','🌪️','multi',{hits:6,m:.95,sp:24,cd:3.5,c:0xd28aff,el:'wind'},'Six phantom slashes'),
  A(1,10,'Meteor Assault','☄️','aoe',{r:5,m:3.2,stun:.8,sp:32,cd:6,c:0xb04aff,el:'shadow'},'Burst of blades all around you'),
  A(1,25,'Shadow Step','👣','buff',{k:'aspd',v:.35,dur:14,sp:24,cd:22,c:0x9a6aff},'Move and strike faster'),
  A(1,40,'Thousand Cuts','🗡️','multi',{hits:16,m:.75,sp:60,cd:38,c:0xff3a6a,el:'shadow',ult:1},'ULTIMATE · Sixteen blinding slashes'),
  A(2,0,'Cross Impact','❌','multi',{hits:7,m:1.4,sp:34,cd:5,c:0xd28aff,el:'shadow'},'Seven cross-shaped cuts'),
  A(2,0,'Hallucination Walk','🌫️','buff',{k:'dr',v:.35,dur:14,sp:30,cd:26,c:0x9a6aff},'Become hard to hit'),
  A(2,10,'Rolling Cutter','🌀','aoe',{r:4.5,m:3.8,sp:34,cd:5,c:0xd28aff,el:'wind'},'Spin through enemies'),
  A(2,10,'Cross Ripper','🪃','aoeT',{r:5,m:4.6,sp:40,cd:7,c:0x9affc8,el:'wind'},'Throw spinning blades at an area'),
  A(2,25,'Dark Illusion','🌑','strike',{m:7.2,sp:44,cd:7,c:0x6a2aaa,el:'shadow',poise:50},'Teleport behind and stab'),
  A(2,40,'Guillotine','⚰️','strike',{m:22,sp:80,cd:45,c:0xff2a4a,el:'shadow',poise:100,ult:1},'ULTIMATE · One cut to end it'),
  A(3,0,'Shadow Exceed','🌘','multi',{hits:8,m:2,sp:46,cd:6,c:0xb04aff,el:'shadow'},'Eight strikes through the dark'),
  A(3,0,'Abyss Dagger','🔪','aoeT',{r:6,m:6,sp:52,cd:8,c:0x6a2aaa,el:'shadow'},'Rain of abyssal daggers'),
  A(3,8,'Shadow Crow','🐦‍⬛','aoe',{r:6,m:5,stun:1,sp:52,cd:8,c:0x3a1a5a,el:'shadow'},'A storm of shadow crows'),
  A(3,18,'Eternal Slash','♾️','multi',{hits:10,m:1.6,sp:58,cd:8,c:0xff3a6a,el:'wind'},'Ten slashes that never stop'),
  A(3,30,'Awakening: Night','🌌','buff',{k:'awk',v:.65,dur:20,sp:80,cd:75,c:0xb04aff},'AWAKEN · Huge ATK, speed and defense for 20s'),
  A(3,45,'Reaper\'s Requiem','💀','aoe',{r:10,m:13,stun:2,sp:100,cd:60,c:0x8a2aff,el:'shadow',ult:1},'ULTIMATE · The reaper harvests everything nearby'),
 ],p:[
  P(1,0,'Advanced Katar','🗡️','atkp',2.5,'+2.5% attack per level'),P(1,10,'Lethal Focus','🎯','critp',1.2,'+1.2% crit per level'),P(1,20,'Swift Blades','💨','aspp',2,'+2% attack speed per level'),P(1,30,'Blood Thirst','🩸','lsp',.5,'+0.5% lifesteal per level'),
  P(2,0,'Executioner\'s Edge','⚔️','atkp',3,'+3% attack per level'),P(2,10,'Killer Instinct','👁️','critp',1.5,'+1.5% crit per level'),P(2,20,'Vampiric Blade','🩸','lsp',.5,'+0.5% lifesteal per level'),P(2,30,'Ghost Walk','👻','stap',5,'+5% stamina regen per level'),
  P(3,0,'Reaper\'s Mark','☠️','atkp',3,'+3% attack per level'),P(3,10,'Death Sense','💀','critp',1.5,'+1.5% crit per level'),P(3,20,'Night Speed','🌙','aspp',2.5,'+2.5% attack speed per level'),P(3,30,'Soul Eater','👻','lsp',.6,'+0.6% lifesteal per level')]},
 priest:{a:[
  A(0,30,'Lex Divina','📜','strike',{rng:1,m:3.2,stun:1.2,sp:14,cd:2.4,c:0xfff2a0,el:'holy'},'Holy word that stuns'),
  A(1,0,'Sanctus Ray','🌟','aoeT',{r:5.5,m:4.2,sp:30,cd:6,c:0xfff2a0,el:'holy'},'Holy rays fall on an area'),
  A(1,0,'Assumptio','🛡️','buff',{k:'dr',v:.4,dur:16,sp:30,cd:26,c:0xfff2a0},'Divine protection'),
  A(1,10,'Holy Chain','⛓️','multi',{hits:3,m:1.5,rng:1,sp:22,cd:3,c:0xfff2a0,el:'holy'},'Three chains of light'),
  A(1,10,'Renovatio','💖','heal',{v:.35,sp:34,cd:9,c:0x7dff9a},'Big heal'),
  A(1,25,'Lex Aeterna','📖','strike',{rng:1,m:5.2,sp:34,cd:5,c:0xfff2a0,el:'holy'},'Eternal holy word'),
  A(1,40,'Holy Cross Pillar','✝️','aoe',{r:8,m:8,stun:1.5,sp:70,cd:40,c:0xfff2a0,el:'holy',ult:1},'ULTIMATE · Pillars of the holy cross'),
  A(2,0,'Adoramus','🕊️','multi',{hits:4,m:1.7,rng:1,sp:34,cd:4,c:0xfff2a0,el:'holy'},'Four bolts of divine light'),
  A(2,0,'Epiclesis','🌳','buff',{k:'atk',v:.4,dur:16,sp:34,cd:26,c:0x7dff9a},'Spirit of the holy tree'),
  A(2,10,'Judex Wave','🌊','aoe',{r:7,m:4.5,sp:40,cd:7,c:0xfff2a0,el:'holy'},'Wave of holy judgement'),
  A(2,10,'Coluceo Heal','💗','heal',{v:.45,sp:44,cd:10,c:0x7dff9a},'Powerful heal'),
  A(2,25,'Duple Lux','💡','strike',{rng:1,m:7,sp:44,cd:6,c:0xfff2a0,el:'holy'},'Twin lights pierce the enemy'),
  A(2,40,'Oratio Sanctum','⛪','aoeT',{r:8,m:11,sp:80,cd:45,c:0xfff2a0,el:'holy',ult:1},'ULTIMATE · Heaven answers your prayer'),
  A(3,0,'Arbitrium','⚖️','aoeT',{r:6,m:7,sp:54,cd:8,c:0xfff2a0,el:'holy'},'Final arbitration'),
  A(3,0,'Pneumaticus','🫧','heal',{v:.6,sp:60,cd:12,c:0x7dff9a},'Full holy restoration'),
  A(3,8,'Petitio','🙏','multi',{hits:5,m:2,rng:1,sp:50,cd:6,c:0xfff2a0,el:'holy'},'Five sacred strikes'),
  A(3,18,'Framen','🔥','aoe',{r:8,m:6,stun:1,sp:60,cd:9,c:0xffd76a,el:'fire'},'Sacred flames around you'),
  A(3,30,'Awakening: Seraph','😇','buff',{k:'awk',v:.6,dur:20,sp:80,cd:75,c:0xfff2a0},'AWAKEN · Huge ATK, speed and defense for 20s'),
  A(3,45,'Divine Judgement','🌞','aoe',{r:11,m:14,stun:2,sp:110,cd:60,c:0xfff2a0,el:'holy',ult:1},'ULTIMATE · The sky itself judges your enemies'),
 ],p:[
  P(1,0,'Mace Mastery','🔨','atkp',2.5,'+2.5% attack per level'),P(1,10,'Holy Power','✨','smult',3,'+3% skill damage per level'),P(1,20,'Prayer','🙏','spp',8,'+8% SP regen per level'),P(1,30,'Sanctity','🛡️','defp',1,'-1% damage taken per level'),
  P(2,0,'Arch Faith','✝️','smult',3,'+3% skill damage per level'),P(2,10,'Blessed Body','💪','hpp',3,'+3% max HP per level'),P(2,20,'Clear Mind','🧠','spp',8,'+8% SP regen per level'),P(2,30,'Holy Siphon','🕯️','slsp',.5,'+0.5% magic lifesteal per level'),
  P(3,0,'Cardinal Grace','👑','smult',4,'+4% skill damage per level'),P(3,10,'Divine Shell','🛡️','defp',1,'-1% damage taken per level'),P(3,20,'Saint\'s Body','💖','hpp',4,'+4% max HP per level'),P(3,30,'Swift Prayer','⏳','cdr',2,'-2% cooldowns per level')]},
 wizard:{a:[
  A(0,30,'Jupitel Thunder','⚡','strike',{rng:1,m:4,sp:16,cd:2.2,c:0xffe14d,el:'lightning',kb:1},'A ball of thunder'),
  A(1,0,'Storm Gust','🌨️','aoeT',{r:5.5,m:3.6,stun:1.5,sp:34,cd:6,c:0x8fe3ff,el:'ice'},'Freezing blizzard'),
  A(1,0,'Amplify Magic','🔮','buff',{k:'atk',v:.4,dur:16,sp:30,cd:26,c:0xb98cff},'Empower your spells'),
  A(1,10,'Napalm Vulcan','🔥','multi',{hits:4,m:1.5,rng:1,sp:26,cd:3,c:0xff7a2a,el:'fire'},'Four fireballs'),
  A(1,10,'Lord of Vermilion','🌩️','aoeT',{r:6,m:4.2,sp:40,cd:7,c:0xffe14d,el:'lightning'},'Lightning storm'),
  A(1,25,'Heaven\'s Drive','🪨','aoeT',{r:5,m:4.8,sp:36,cd:6,c:0xc8a06a,el:'earth'},'Earth spikes erupt'),
  A(1,40,'Gravitation Field','🌀','aoeT',{r:7,m:9,stun:2,sp:80,cd:42,c:0x9a6aff,el:'earth',ult:1},'ULTIMATE · Crush everything with gravity'),
  A(2,0,'Varetyr Spear','🌪️','strike',{rng:1,m:7,sp:40,cd:5,c:0x9affc8,el:'wind'},'Spear of storm'),
  A(2,0,'Spell Fist','👊','buff',{k:'aspd',v:.35,dur:14,sp:30,cd:24,c:0xff7a2a},'Channel spells through your staff'),
  A(2,10,'Diamond Dust','💎','aoe',{r:6.5,m:4.5,stun:1.5,sp:44,cd:8,c:0x8fe3ff,el:'ice'},'Ice explodes around you'),
  A(2,10,'Psychic Wave','🌊','aoeT',{r:6,m:5,sp:46,cd:7,c:0xb98cff,el:'lightning'},'Waves of pure mana'),
  A(2,25,'Earth Grave','⛰️','aoeT',{r:5,m:5.6,sp:44,cd:7,c:0xc8a06a,el:'earth'},'Stone graves rise'),
  A(2,40,'Comet','☄️','aoeT',{r:9,m:13,sp:100,cd:50,c:0xff5a2a,el:'fire',ult:1},'ULTIMATE · Call down a comet'),
  A(3,0,'Crimson Rock','🔥','aoeT',{r:6,m:7,sp:56,cd:8,c:0xff5a2a,el:'fire'},'A burning meteor rock'),
  A(3,0,'Frozen Slash','❄️','multi',{hits:4,m:2.4,rng:1,sp:50,cd:6,c:0x8fe3ff,el:'ice'},'Four freezing blades'),
  A(3,8,'Thunder Storm','⛈️','aoeT',{r:7,m:7,sp:60,cd:9,c:0xffe14d,el:'lightning'},'Endless lightning'),
  A(3,18,'Elemental Veil','🌈','buff',{k:'dr',v:.35,dur:16,sp:50,cd:28,c:0x8fe3ff},'A shield of all elements'),
  A(3,30,'Awakening: Elemental','🌠','buff',{k:'awk',v:.65,dur:20,sp:90,cd:75,c:0x6ad8ff},'AWAKEN · Fire, ice and lightning flow through you'),
  A(3,45,'Astral Strike','🌌','aoe',{r:11,m:15,stun:2,sp:120,cd:60,c:0x9a6aff,el:'lightning',ult:1},'ULTIMATE · Bring down the stars'),
 ],p:[
  P(1,0,'High Magic','✨','smult',3,'+3% skill damage per level'),P(1,10,'Mana Flow','💧','spp',8,'+8% SP regen per level'),P(1,20,'Soul Siphon','🔮','slsp',.5,'+0.5% magic lifesteal per level'),P(1,30,'Fast Cast','⏳','cdr',2,'-2% cooldowns per level'),
  P(2,0,'Sorcery','📕','smult',3,'+3% skill damage per level'),P(2,10,'Arcane Body','💠','hpp',3,'+3% max HP per level'),P(2,20,'Spirit Well','💧','spp',8,'+8% SP regen per level'),P(2,30,'Elemental Mind','🧠','critp',1,'+1% crit per level'),
  P(3,0,'Elemental Mastery','🌈','smult',4,'+4% skill damage per level'),P(3,10,'Mana Shield','🛡️','defp',1,'-1% damage taken per level'),P(3,20,'Star Siphon','🌠','slsp',.6,'+0.6% magic lifesteal per level'),P(3,30,'Timeless','⌛','cdr',2,'-2% cooldowns per level')]},
 archer:{a:[
  A(0,30,'Arrow Repel','🏹','strike',{rng:1,m:3.4,kb:1,sp:14,cd:2.2,c:0xffe08a,el:'wind',poise:40},'An arrow that knocks back'),
  A(1,0,'Sharp Shooting','🎯','strike',{rng:1,m:6,sp:28,cd:4,c:0x9affc8,el:'wind'},'A piercing critical shot'),
  A(1,0,'True Sight','👁️','buff',{k:'atk',v:.35,dur:16,sp:26,cd:24,c:0xffe08a},'See every weak spot'),
  A(1,10,'Falcon Assault','🦅','multi',{hits:5,m:1.4,rng:1,sp:28,cd:4,c:0xffe08a,el:'wind'},'Your falcon strikes five times'),
  A(1,10,'Wind Walk','💨','buff',{k:'aspd',v:.35,dur:14,sp:24,cd:22,c:0x9affc8},'Fast as the wind'),
  A(1,25,'Arrow Storm','🌧️','aoeT',{r:5,m:4.2,sp:36,cd:6,c:0xffe08a,el:'wind'},'A storm of arrows'),
  A(1,40,'Hawk Dive','🦅','aoeT',{r:7,m:10,sp:80,cd:42,c:0x9affc8,el:'wind',ult:1},'ULTIMATE · A flock of hawks dives'),
  A(2,0,'Aimed Bolt','🎯','multi',{hits:5,m:1.9,rng:1,sp:36,cd:5,c:0xffe08a},'Five aimed bolts'),
  A(2,0,'Fear Breeze','🍃','buff',{k:'aspd',v:.45,dur:14,sp:32,cd:26,c:0x9affc8},'Fire much faster'),
  A(2,10,'Arrow Rain','🌧️','aoeT',{r:6,m:5,sp:44,cd:7,c:0xffe08a,el:'wind'},'Arrows rain down'),
  A(2,10,'Cluster Bomb','💣','aoeT',{r:4,m:6,stun:1,sp:42,cd:7,c:0xff7a2a,el:'fire'},'An exploding trap'),
  A(2,25,'Camouflage','🌿','buff',{k:'dr',v:.3,dur:14,sp:30,cd:26,c:0x8aff7a},'Blend into the land'),
  A(2,40,'Warg Strike','🐺','strike',{rng:1,m:24,sp:90,cd:45,c:0xffffff,poise:100,ult:1},'ULTIMATE · Your warg mauls the target'),
  A(3,0,'Gale Storm','🌪️','aoeT',{r:7,m:7,sp:56,cd:8,c:0x9affc8,el:'wind'},'A tornado of arrows'),
  A(3,0,'Crescive Bolt','➹','strike',{rng:1,m:10,sp:56,cd:6,c:0xffe08a,el:'wind'},'A bolt that grows stronger in flight'),
  A(3,8,'Hawk Rush','🦅','multi',{hits:6,m:2,rng:1,sp:52,cd:6,c:0xffe08a,el:'wind'},'Six hawk strikes'),
  A(3,18,'Wind Sign','🍃','buff',{k:'atk',v:.4,dur:16,sp:48,cd:28,c:0x9affc8},'Wind blesses your arrows'),
  A(3,30,'Awakening: Tempest','🌀','buff',{k:'awk',v:.65,dur:20,sp:80,cd:75,c:0x8aff7a},'AWAKEN · Huge ATK, speed and defense for 20s'),
  A(3,45,'Tempest Rain','⛈️','aoeT',{r:10,m:15,sp:110,cd:60,c:0x9affc8,el:'wind',ult:1},'ULTIMATE · The sky becomes arrows'),
 ],p:[
  P(1,0,'Vulture\'s Eye','🦅','atkp',2.5,'+2.5% attack per level'),P(1,10,'Hawk Eyes','👁️','critp',1.2,'+1.2% crit per level'),P(1,20,'Quick Draw','💨','aspp',2,'+2% attack speed per level'),P(1,30,'Light Feet','👣','stap',4,'+4% stamina regen per level'),
  P(2,0,'Main Ranger','🏹','atkp',3,'+3% attack per level'),P(2,10,'Wild Instinct','🐺','critp',1.5,'+1.5% crit per level'),P(2,20,'Survival','🌿','hpp',3,'+3% max HP per level'),P(2,30,'Rapid Fire','⏳','cdr',2,'-2% cooldowns per level'),
  P(3,0,'Wind Mastery','🌪️','atkp',3,'+3% attack per level'),P(3,10,'Calm Wind','🍃','aspp',2.5,'+2.5% attack speed per level'),P(3,20,'Eagle Eye','🦅','critp',1.5,'+1.5% crit per level'),P(3,30,'Nature\'s Gift','🌿','lsp',.5,'+0.5% lifesteal per level')]},
 smith:{a:[
  A(0,30,'Cart Quake','🛒','aoe',{r:4.5,m:2.4,stun:.8,sp:16,cd:4,c:0xc8a06a,el:'earth'},'Slam your cart into the ground'),
  A(1,0,'Cart Termination','💰','strike',{m:6,zeny:1,sp:26,cd:4,c:0xffd76a,poise:50},'Smash with a cart full of zeny'),
  A(1,0,'Maximize Power','💪','buff',{k:'aspd',v:.3,dur:14,sp:26,cd:22,c:0xff6a3a},'Swing with full power'),
  A(1,10,'Meltdown','🔥','multi',{hits:3,m:2,sp:28,cd:4,c:0xff7a2a,el:'fire'},'Molten triple blow'),
  A(1,10,'Weapon Perfection','⚒️','buff',{k:'dr',v:.25,dur:16,sp:26,cd:24,c:0xffd76a},'Perfect stance'),
  A(1,25,'Hammer Down','🔨','aoeT',{r:4.5,m:4.6,stun:1,sp:36,cd:6,c:0xc8a06a,el:'earth'},'Giant hammer falls'),
  A(1,40,'Mammonite Storm','🪙','aoe',{r:7,m:9,zeny:1,sp:70,cd:42,c:0xffd76a,ult:1},'ULTIMATE · A storm of golden coins'),
  A(2,0,'Axe Tornado','🌪️','aoe',{r:5.5,m:4.5,sp:36,cd:5,c:0x9affc8,el:'wind'},'Spin your axe like a tornado'),
  A(2,0,'Mech Overdrive','⚙️','buff',{k:'aspd',v:.45,dur:14,sp:34,cd:26,c:0xff8a2a},'Overclock your machine'),
  A(2,10,'Arm Cannon','💥','strike',{rng:1,m:7,sp:44,cd:5,c:0xff7a2a,el:'fire'},'Fire your arm cannon'),
  A(2,10,'Flame Launcher','🔥','aoeT',{r:5,m:5,sp:44,cd:7,c:0xff5a2a,el:'fire'},'Flamethrower blast'),
  A(2,25,'Knuckle Boost','👊','multi',{hits:4,m:2.3,sp:40,cd:5,c:0xffd76a,el:'earth'},'Rocket punches'),
  A(2,40,'Self Destruct','💣','aoe',{r:9,m:14,stun:2,sp:100,cd:55,c:0xff3a1a,el:'fire',ult:1},'ULTIMATE · Overload your mech in a huge blast'),
  A(3,0,'Spark Blaster','⚡','aoeT',{r:6,m:7,sp:56,cd:8,c:0xffe14d,el:'lightning'},'Electric blast'),
  A(3,0,'Triple Laser','🔴','multi',{hits:3,m:3.5,rng:1,sp:52,cd:6,c:0xff3a1a,el:'fire'},'Three laser beams'),
  A(3,8,'Power Swing','🪓','strike',{m:11,sp:56,cd:6,c:0xffd76a,poise:70},'A colossal swing'),
  A(3,18,'Mighty Smash','🔨','aoe',{r:7,m:6,stun:1,sp:60,cd:9,c:0xc8a06a,el:'earth'},'Shatter the ground'),
  A(3,30,'Awakening: Titan','🗿','buff',{k:'awk',v:.65,dur:20,sp:80,cd:75,c:0xff8a2a},'AWAKEN · Huge ATK, speed and defense for 20s'),
  A(3,45,'Atomic Forge','☢️','aoe',{r:11,m:16,stun:2,sp:120,cd:60,c:0xff8a2a,el:'fire',ult:1},'ULTIMATE · Forge a sun and drop it'),
 ],p:[
  P(1,0,'Hilt Mastery','🪓','atkp',2.5,'+2.5% attack per level'),P(1,10,'Skin Tempering','🔥','defp',1,'-1% damage taken per level'),P(1,20,'Ore Sense','💰','zenp',4,'+4% zeny per level'),P(1,30,'Iron Will','💪','hpp',3,'+3% max HP per level'),
  P(2,0,'Mech Mastery','⚙️','atkp',3,'+3% attack per level'),P(2,10,'Steel Plating','🛡️','defp',1,'-1% damage taken per level'),P(2,20,'Hot Barrel','🔥','critp',1.2,'+1.2% crit per level'),P(2,30,'Reactor','⚡','stap',5,'+5% stamina regen per level'),
  P(3,0,'Meister\'s Craft','🔨','atkp',3,'+3% attack per level'),P(3,10,'Titan Body','🗿','hpp',4,'+4% max HP per level'),P(3,20,'Overheat','🔥','aspp',2,'+2% attack speed per level'),P(3,30,'Golden Touch','🪙','zenp',5,'+5% zeny per level')]},
 acrobat:{a:[
  A(0,30,'Snitch','🪙','strike',{rng:1,m:3.4,sp:14,cd:2.2,c:0xffd76a,poise:30},'A sly strike that shakes coins loose'),
  A(1,0,'Hit of Zeny','💰','strike',{rng:1,m:13,zeny:5,sp:30,cd:5,c:0xffd24a,poise:70},'ONE devastating hit paid for in zeny. The more you are worth, the harder it lands'),
  A(1,0,'Critical Swing','🎯','buff',{k:'atk',v:.32,dur:16,sp:24,cd:22,c:0xff6a9a},'Every swing aims for the weak spot'),
  A(1,10,'Multi-Stab','🗡️','multi',{hits:6,m:1.3,rng:1,sp:28,cd:4,c:0xb06aff,el:'shadow'},'Six stabbing yoyo strikes'),
  A(1,10,'Escape','💨','buff',{k:'aspd',v:.35,dur:14,sp:24,cd:22,c:0x9affc8},'Light on your feet: attack much faster'),
  A(1,25,'Vital Stab','❤️‍🔥','strike',{rng:1,m:8,pull:0,sp:36,cd:6,c:0xff4a6a,el:'fire',poise:60},'A burning strike at the heart'),
  A(1,40,'Zeny Strike','🪙','aoeT',{r:6.5,m:9,zeny:8,sp:70,cd:40,c:0xffd24a,ult:1},'ULTIMATE · Giant coins crash down on the area'),
  A(2,0,'Juggling Blades','🤹','multi',{hits:5,m:2.2,rng:1,sp:34,cd:4,c:0x9affc8,el:'wind'},'Juggle five bladed yoyos into the target'),
  A(2,0,'Trick Mirror','🪞','buff',{k:'dr',v:.32,dur:16,sp:30,cd:24,c:0xbfe8ff},'Mirror images soak up blows'),
  A(2,10,'Spinning Wheel','🎡','aoe',{r:6.5,m:5,sp:40,cd:5,c:0x9affc8,el:'wind'},'A giant wheel of spinning yoyos'),
  A(2,10,'Marionette','🪢','aoeT',{r:5,m:5,stun:1.5,sp:44,cd:8,c:0xb06aff,el:'shadow'},'Shadow strings bind everything in the area'),
  A(2,25,'Jack in the Box','🎁','aoeT',{r:5.5,m:7.5,sp:50,cd:7,c:0xff7a2a,el:'fire'},'A surprise that explodes'),
  A(2,40,'Grand Circus','🎪','aoe',{r:9.5,m:13,stun:1.5,sp:100,cd:50,c:0xff4a8a,el:'lightning',ult:1},'ULTIMATE · The whole ring erupts in lights'),
  A(3,0,'Cursed Page','📕','strike',{rng:1,m:9.5,sp:50,cd:4,c:0xb06aff,el:'shadow',poise:50},'Hurl a cursed page of the grimoire'),
  A(3,0,'Tome Barrage','📚','multi',{hits:6,m:2.7,rng:1,sp:56,cd:6,c:0xb06aff,el:'shadow'},'Six pages cut like razors'),
  A(3,8,'Hit of Fortune','👑','strike',{rng:1,m:24,zeny:12,sp:60,cd:9,c:0xffd24a,poise:90},'ONE hit worth a king\'s ransom'),
  A(3,18,'Black Chapter','📖','aoeT',{r:7,m:8.5,sp:64,cd:8,c:0x8a2aff,el:'shadow'},'Open the forbidden chapter'),
  A(3,30,'Awakening: Joker','🃏','buff',{k:'awk',v:.65,dur:20,sp:80,cd:75,c:0xff4a8a},'AWAKEN · Huge ATK, speed and defense for 20s'),
  A(3,45,'Final Chapter','☠️','aoeT',{r:11,m:17,stun:2,sp:120,cd:60,c:0x8a2aff,el:'shadow',ult:1},'ULTIMATE · The last page ends everything'),
 ],p:[
  P(1,0,'Jester\'s Edge','🪀','atkp',2.5,'+2.5% attack per level'),P(1,10,'Lucky Coin','🪙','zenp',4,'+4% zeny per level'),P(1,20,'Fatal Aim','🎯','critp',1.5,'+1.5% crit per level'),P(1,30,'Quick Hands','🤹','aspp',2.5,'+2.5% attack speed per level'),
  P(2,0,'Showmanship','🎪','atkp',3,'+3% attack per level'),P(2,10,'Tumbler','🤸','defp',1,'-1% damage taken per level'),P(2,20,'Encore','⏱️','cdr',2.5,'-2.5% skill cooldowns per level'),P(2,30,'Crowd Pleaser','❤️','hpp',3,'+3% max HP per level'),
  P(3,0,'Forbidden Lore','📕','atkp',3,'+3% attack per level'),P(3,10,'Ink Blood','🩸','lsp',.5,'+0.5% lifesteal per level'),P(3,20,'Last Laugh','🃏','critp',1.5,'+1.5% crit per level'),P(3,30,'Midas','👑','zenp',5,'+5% zeny per level')]},
};
// 1st-job skills keep their old slots (so old saves still work); new skills are appended after them
for(const k in CLASSES){const C=CLASSES[k];C.sk.forEach((s,i)=>{s.job=0;s.req=[0,0,8,8,20][i]||0;});C.ps.forEach((s,i)=>{s.job=0;s.req=[0,8,8,20][i]||0;});
 const J=JOB_SKILLS[k];if(J){C.sk.push(...J.a);C.ps.push(...J.p);}}
// Priest support buffs. Appended LAST so every saved skill index (S.sk 'aN', S.bar,
// S.parabellum) keeps pointing at the same skill. bon(lv) = temporary bonuses granted;
// stat bonuses count like allocated points. mx = per-skill max level (default SK_MAX).
// The old passive in slot p0 was also called Blessing; it keeps its +HP effect as Faith.
Object.assign(CLASSES.priest.ps[0],{n:'Faith',e:'🕯️'});
CLASSES.priest.sk.push(
 A(0,0,'Blessing','🙏','buff',{k:'bless',pty:1,sp:24,cd:18,dur:60,c:0xfff2a0,bon:lv=>({str:4+lv,int:4+lv,dex:2+lv,hit:8+2*lv})},'Party buff · Holy blessing: temporarily raises STR, INT, DEX and Hit'),
 A(0,8,'Increase Agility','🪽','buff',{k:'incagi',pty:1,sp:18,cd:18,dur:60,c:0x9affc8,bon:lv=>({agi:9+lv,aspd:(14+lv)/100,mspd:(9+lv)/100})},'Party buff · Temporarily raises AGI, attack speed and movement speed'),
 A(0,20,'Gloria','🎺','buff',{k:'gloria',pty:1,sp:30,cd:40,dur:30,c:0xffd76a,mx:5,bon:lv=>({luk:8*lv,crit:.02*lv})},'Party buff · Hymn of glory: temporarily raises LUK and critical chance'));
// first-job elements
(()=>{const m={'Magnum Break':'fire','Fire Bolt':'fire','Frost Nova':'ice','Lightning Bolt':'lightning','Meteor Storm':'fire','Holy Light':'holy','Judex':'holy','Magnus Exorcismus':'holy','Venom Splasher':'shadow','Grimtooth':'shadow','Shadow Spin':'shadow','Hammerfall':'earth','Arrow Shower':'wind','Charge Arrow':'wind','Blitz Beat':'wind'};
 for(const k in CLASSES)CLASSES[k].sk.forEach(s=>{if(m[s.n]&&!s.el)s.el=m[s.n];});})();
// monster element by land: [weak to, resists]
const LAND_EL={fields:['fire','earth'],woods:['fire','wind'],mire:['fire','earth'],watchtower:['lightning','shadow'],desert:['ice','fire'],tomb:['holy','shadow'],volcano:['ice','fire'],bridge:['lightning','earth'],frost:['fire','ice'],glacier:['fire','ice'],monastery:['shadow','holy'],spine:['fire','ice'],marsh:['lightning','earth'],capital:['lightning','holy'],catacomb:['holy','shadow'],storm:['earth','wind'],walls:['lightning','earth'],court:['holy','shadow'],throne:['holy','shadow'],rift:['holy','shadow']};
SPK.JM=['Job Master Orin','🎓'];

/* ===== Innate ability: one built-in passive per class, grows with each job advancement ===== */
const INNATE={
 knight:{n:'Balanced Stance',e:'⚖️',v:[8,10,12,15],d:v=>`+${v}% ATK and +${v}% DEF`},
 assassin:{n:'Evasion',e:'💨',v:[12,15,18,22],d:v=>`${v}% Flee: chance to completely evade an attack`},
 wizard:{n:'Arcane Ward',e:'🔮',v:[25,30,35,40],d:v=>`Magic DEF: -${v}% damage from spells and magic`},
 smith:{n:'Mighty Arm',e:'💪',v:[12,15,18,22],d:v=>`+${v}% ATK`},
 archer:{n:'Eagle Eye',e:'🎯',v:[5,7,9,12],d:v=>`Hit rate: +${v}% crit, shots pierce enemy shields and halve enemy Flee`},
 acrobat:{n:'Fortune\'s Favor',e:'🪙',v:[10,15,20,30],d:v=>`+${v}% zeny found, zeny skills cost ${v}% less, +${Math.round(v/3)}% crit`},
 priest:{n:'Divine Grace',e:'✨',v:[12,15,18,22],d:v=>`Magic ATK: +${v}% skill damage and healing`}};
function innV(c,s){s=s||S;return s&&s.cls===c&&INNATE[c]?INNATE[c].v[s.job||0]/100:0;}
function innHtml(){const I=INNATE[S.cls];if(!I)return '';const j=S.job||0;return `<div class="card" style="border-color:#e8c26a"><div class="ttl" style="margin:0">${I.e} Innate · ${I.n}</div>${I.d(I.v[j])}${j<3?` <small style="color:#a99cc0">(next job: ${I.d(I.v[j+1])})</small>`:''}</div>`;}
/* ================= NEW WORLD ARC · ELDORIA · CHAPTERS 21-50 ================= */
// speakers
Object.assign(SPK,{W:['Wensly','🛡️'],KE:['Kendra','👑'],LU:['Lucas','⚔️'],ET:['Ethan','🔮'],KM:['Kamara','🗡️'],KI:['Kim','😜'],IS:['Isaac','🔥'],
 AU:['Aurora','🧝‍♀️'],RG:['Reginaldo','🧝‍♂️'],AV:['Ava','👸'],IK:['Ishkafar','🌌'],ART:['King Arthur','👑'],MOHG:['Mohg, the Blasphemy King','🩸'],IFR:['King Ifrit','🔥'],
 DIA:['The Diamond King','💎'],VES:['The Twilight King','🌆'],ZEN:['The Sky King','☁️'],VAL:['The Iron King','⚙️'],SYL:['The Shadow King','🌑'],ICE:['The Ice King','❄️'],DRA:['The Dragon King','🐉']});
ACTS.push('Act VI · Eldoria: The Journey Begins','Act VII · The Ancient Secrets','Act VIII · The Kingdoms of Eldoria','Act IX · The Forbidden Territory','Act X · A New Dawn');
function actOf(c){return c<20?Math.floor(c/4):c<25?5:c<30?6:c<40?7:c<48?8:9;}

/* ---- kingdom lands (built from the existing land styles) ---- */
const bc=(base,o)=>Object.assign({},B[base],o);
Object.assign(B,{
 eldrift:bc('rift',{sky:[0x1a0a3a,0x6a4aa8],fog:[30,100],g1:0x2a2a4a,g2:0x1e1e36,hs:0xb8a0ff,night:0,stars:1}),
 frontier:bc('fields',{sky:[0xd89a6a,0xf8d8b0],g1:0x7a8a4a,g2:0x5a6a38,sun:[0xffc890,1,[30,25,20]],pc:0xffd8a0}),
 arthur:bc('monastery',{sky:[0xe8c88a,0xfff2d0],g1:0xc8b878,g2:0xa89858,sun:[0xfff0c0,1.15,[20,50,20]],pc:0xffe8a0}),
 cathedral:bc('court',{sky:[0x1a0608,0x6a1a1a],g1:0x2a1010,g2:0x1a0808,hs:0xff8a8a,sun:[0xff4a4a,.7,[0,40,20]],pc:0xff3a3a}),
 mohg:bc('throne',{sky:[0x14020a,0x8a0a1a],g1:0x2a0a10,g2:0x3a0a14,sun:[0xff2a3a,.85,[10,40,10]],pc:0xff2a3a}),
 archive:bc('capital',{sky:[0x0a1030,0x3a4a8a],g1:0x2a3048,g2:0x1e2438,hs:0x9ab0ff,sun:[0x8aa8ff,.75,[-20,40,10]],pc:0x8aa8ff,glowP:1}),
 ifrit:bc('volcano',{sky:[0x5a1a08,0xff8a3a],sun:[0xffa050,1,[-20,40,10]],pc:0xffaa3a}),
 elven:bc('woods',{sky:[0x2a5a6a,0xa8e8d8],g1:0x2f6a4a,g2:0x225238,hs:0xc8ffe8,sun:[0xd8fff0,.85,[10,45,10]],pc:0xaaffee}),
 diamble:bc('glacier',{sky:[0x3a8ab8,0xd8f8ff],g1:0x9ad8e8,g2:0x6ab8d0,water:0,pc:0xaef8ff,sun:[0xe8ffff,1.1,[30,50,0]]}),
 memory:bc('monastery',{sky:[0xf0e0c8,0xfff8ec],fog:[25,90],g1:0xd8d0b8,g2:0xb8b098,pc:0xfff2d0,ps:.3,glowP:1}),
 vesper:bc('court',{sky:[0x3a1a4a,0xd88a6a],g1:0x3a2a40,g2:0x2a1e32,sun:[0xffa070,.85,[-40,20,0]],night:0,pc:0xffb080}),
 zenith:bc('storm',{sky:[0x6aa8e8,0xe8f4ff],g1:0x8a9ab0,g2:0x6a7a90,hs:0xffffff,sun:[0xffffff,1.1,[20,60,10]],pc:0xffffff,amp:4.2}),
 valdran:bc('walls',{sky:[0x3a3a42,0x8a8a92],g1:0x4a4a52,g2:0x3a3a42,hs:0xd8d8e0,sun:[0xffd0a0,.8,[30,35,-10]],night:0,pc:0xffa040}),
 sylthar:bc('catacomb',{sky:[0x05030a,0x1e0e2e],g1:0x1e1626,g2:0x140e1a,pc:0x8a4aff}),
 auroraice:bc('frost',{sky:[0x0a2a3a,0x4ad8a8],g1:0x9ab8c8,g2:0x7a98a8,night:1,pc:0x7affd8,glowP:1,sun:[0x9affe8,.6,[10,40,10]]}),
 draken:bc('volcano',{sky:[0x1a0404,0x6a1008],g1:0x2a1412,g2:0x1a0a08,sun:[0xff3a1a,.8,[0,40,10]],pc:0xff4a1a}),
 alliance:bc('capital',{sky:[0x4a2a3a,0xd8a080],sun:[0xffb080,.85,[-30,25,0]],pc:0xffd0a0}),
 forbid:bc('rift',{sky:[0x0a0010,0x3a0a2a],g1:0x1a0a14,g2:0x12060e,pc:0xff4aaa}),
 gravity:bc('rift',{sky:[0x02000a,0x2a1a5a],amp:4.5,pc:0x9a8aff,ps:.45}),
 oathland:bc('monastery',{sky:[0x5a7a6a,0xe8f0d8],g1:0x8aa878,g2:0x6a8858,pc:0xd8ffd0}),
 forbidgate:bc('walls',{sky:[0x0a0010,0x4a1a5a],pc:0xb04aff}),
 dawn:bc('fields',{sky:[0xffb080,0xfff0d8],sun:[0xffd8a0,1.2,[40,18,10]],pc:0xffe8b0,g1:0x6aa04a}),
});
/* ---- monsters of Eldoria ---- */
const mc=(base,o)=>Object.assign({},MOBS[base],o);
Object.assign(MOBS,{
 riftjelly:mc('blob',{n:'Rift Jelly',col:0x8a4aff,em:0x6a1aff,loot:['Rift Gel','🟣']}),
 voidhound:mc('wolf',{n:'Void Hound',col:0x2a1a4a,em:0x8a2aff,loot:['Void Fang','🦷']}),
 bandit:mc('hollow',{n:'Eldorian Bandit',col:0x6a4a2a,loot:['Stolen Coin','🪙']}),
 banditarcher:mc('archer',{n:'Bandit Archer',col:0x5a4a2a,loot:['Fletching','🪶']}),
 sentry:mc('royalguard',{n:'Arthurian Sentry',col:0xd8b04a,loot:['Golden Crest','🛡️']}),
 cherub:mc('imp',{n:'Fallen Cherub',col:0xf0e0c0,em:0xfff2a0,loot:['Torn Halo','😇']}),
 acolyte:mc('monk',{n:'Blood Acolyte',col:0x8a1a2a,loot:['Blood Rosary','📿']}),
 bloodknight:mc('darkknight',{n:'Blood Knight',col:0x5a0a14,em:0xff1a3a,loot:['Blood Sigil','🩸']}),
 tome:mc('lantern',{n:'Living Tome',col:0x6a8aff,loot:['Torn Page','📄']}),
 spellgolem:mc('golem',{n:'Spell Golem',col:0x4a5a9a,em:0x6a8aff,loot:['Rune Core','🔷']}),
 ifritspawn:mc('imp',{n:'Ifrit Spawn',col:0xff6a1a,loot:['Living Ember','🔥']}),
 magmaknight:mc('lavagolem',{n:'Magma Knight',col:0x6a2a1a,loot:['Molten Plate','🌋']}),
 sprite:mc('lantern',{n:'Forest Sprite',col:0x9affc8,loot:['Sprite Dust','✨']}),
 elfguard:mc('archer',{n:'Elven Sentinel',col:0x8ad8a8,loot:['Elven Arrow','🏹']}),
 diamondgolem:mc('golem',{n:'Diamond Golem',col:0xbfefff,em:0x9fe8ff,loot:['Raw Diamond','💎']}),
 prismbat:mc('bat',{n:'Prism Bat',col:0xaee8ff,loot:['Prism Wing','🦇']}),
 memwisp:mc('lantern',{n:'Memory Wisp',col:0xfff2d0,loot:['Faded Memory','🕯️']}),
 duskstalker:mc('vampire',{n:'Dusk Stalker',col:0x4a2a5a,loot:['Dusk Fang','🌆']}),
 zenithhawk:mc('stormbird',{n:'Zenith Hawk',col:0x9ac8ff,loot:['Sky Feather','🪶']}),
 cloudspirit:mc('lantern',{n:'Cloud Spirit',col:0xe8f4ff,loot:['Cloud Wisp','☁️']}),
 ironlegion:mc('hollow',{n:'Iron Legionnaire',col:0x7a7a82,hpM:1.4,loot:['Iron Gear','⚙️']}),
 cogspider:mc('spider',{n:'Cog Spider',col:0x8a7a5a,loot:['Brass Cog','⚙️']}),
 shade:mc('wraith',{n:'Sylthar Shade',col:0x1a1026,em:0x6a1aff,loot:['Shadow Silk','🌑']}),
 frostfang:mc('wolf',{n:'Frost Fang',col:0xd8f0ff,loot:['Ice Fang','❄️']}),
 drakeling:mc('wyvern',{n:'Drakeling',col:0xc83a1a,loot:['Drake Scale','🐉']}),
 dragonknight:mc('royalguard',{n:'Dragon Knight',col:0x8a2a1a,em:0xff4a1a,loot:['Dragon Crest','🛡️']}),
 gravwisp:mc('lantern',{n:'Gravity Wisp',col:0xb06aff,em:0x8a4aff,loot:['Gravity Mote','🌀']}),
 voidtemplar:mc('darkknight',{n:'Void Templar',col:0x1a0a2a,em:0x8a2aff,loot:['Void Sigil','🟣']}),
 soulwisp:mc('wraith',{n:'Soul Wisp',col:0xd8c8ff,loot:['Lost Soul','👻']}),
 chainanchor:{n:'Chain Anchor',m:'golem',col:0x5a5a62,em:0xc8c8ff,s:1.4,spd:0,r:1.2,hpM:3,atkM:.01,shield:0,loot:['Broken Chain','⛓️']},
});
/* ---- kings, guardians and Ishkafar ---- */
Object.assign(BOSSES,{
 riftsentinel:{n:'Rift Sentinel',m:'golem',col:0x3a1a5a,s:2.4,spd:2.2,r:2.4,sp:['slam','nova','bolts','sweep'],em:0x8a2aff,roar:'deep'},
 frontguard:{n:'Corrupted Frontier Guardian',m:'bigknight',col:0x5a4a3a,s:2.2,spd:2.8,r:1.9,sp:['sweep','slam','combo','charge'],shield:1,em:0x8a2aff,roar:'deep'},
 kingarthur:{el:['shadow','holy'],n:'King Arthur',m:'bigknight',col:0xd8b04a,s:2.3,spd:3,r:1.9,sp:['combo','sweep','jump','charge','cross'],em:0xfff2a0,roar:'deep'},
 blasherald:{el:['holy','shadow'],n:'Herald of Blasphemy',m:'demon',col:0x6a1a1a,s:2.1,spd:3,r:2,sp:['slam','bolts','combo','nova'],em:0xff2a2a,roar:'demon'},
 mohg:{el:['holy','fire'],n:'Mohg, the Blasphemy King',m:'demon',col:0x5a0a14,s:2.8,spd:3,r:2.4,sp:['slam','nova','rain','combo','sweep','jump','summon'],em:0xff1a3a,roar:'demon'},
 archguard:{el:['lightning','earth'],n:'Archive Guardian',m:'golem',col:0x2a3a6a,s:2.4,spd:2.2,r:2.4,sp:['bolts','nova','slam','spiral'],em:0x6a8aff,roar:'deep'},
 ifrit:{el:['ice','fire'],n:'King Ifrit, the Fire King',m:'oni',col:0xc83a1a,s:2.7,spd:2.8,r:2.2,sp:['combo','slam','rain','meteor','charge'],em:0xff6a1a,roar:'grunt'},
 ancientguard:{el:['fire','earth'],n:'The Ancient Guardian',m:'treant',col:0x8a8a7a,s:1.7,spd:2.2,r:2.4,sp:['slam','roots','nova','cross'],em:0x9affc8,roar:'deep'},
 diamondking:{el:['earth','ice'],n:'The Diamond King',m:'golem',col:0x9fe8ff,s:2.6,spd:2.2,r:2.5,sp:['slam','bolts','cross','sweep','nova'],em:0x6fd8ff,shield:1,roar:'deep'},
 memsentinel:{el:['holy','shadow'],n:'The Memory Sentinel',m:'wraith',col:0xe8e0d0,s:2.4,spd:2.8,r:2,sp:['bolts','spiral','nova','roots'],roar:'whisper'},
 twilightking:{el:['holy','shadow'],n:'The Twilight King',m:'vampire',col:0x3a1a4a,s:2.4,spd:3.6,r:1.8,sp:['combo','jump','charge','bolts','spiral'],roar:'whisper'},
 skyking:{el:['earth','wind'],n:'The Sky King',m:'bat',col:0x8ab0e8,s:3.6,spd:4.4,r:2.4,sp:['jump','charge','bolts','rain','sweep'],fly:1,roar:'screech'},
 ironking:{el:['lightning','earth'],n:'The Iron King',m:'bigknight',col:0x6a6a72,s:2.6,spd:2.6,r:2,sp:['sweep','slam','combo','charge','cross'],shield:1,em:0x9a9aaa,roar:'deep'},
 shadowking:{el:['holy','shadow'],n:'The Shadow King',m:'wraith',col:0x1a1026,s:2.6,spd:3,r:2,sp:['bolts','spiral','summon','cross','nova'],em:0x6a1aff,roar:'whisper'},
 iceking:{el:['fire','ice'],n:'The Ice King',m:'dragon',col:0xbfe8ff,s:1.7,spd:3,r:2.6,sp:['nova','bolts','meteor','sweep','rain'],em:0x6fd8ff,roar:'dragon'},
 dragonking:{el:['ice','fire'],n:'The Dragon King',m:'dragon',col:0x8a1a10,s:1.9,spd:3.2,r:2.8,sp:['slam','meteor','rain','sweep','jump','nova'],em:0xff4a1a,roar:'dragon'},
 traitor:{n:'Commander Vorn, the Traitor',m:'bigknight',col:0x2a2a30,s:2.3,spd:3.2,r:1.9,sp:['combo','charge','sweep','jump'],em:0xff3a3a,roar:'deep'},
 warden:{n:'Warden Gaol',m:'oni',col:0x4a4a52,s:2.6,spd:2.6,r:2.2,sp:['slam','charge','combo','roots'],em:0x8a8aff,roar:'grunt'},
 royalguardian:{el:['shadow','holy'],n:'The Last Royal Guardian',m:'bigknight',col:0xe8e0d0,s:2.4,spd:3,r:1.9,sp:['combo','sweep','cross','nova','jump'],em:0xfff2a0,shield:1,roar:'deep'},
 gatekeeper:{el:['holy','shadow'],n:'The Forbidden Gatekeeper',m:'golem',col:0x2a2238,s:2.8,spd:2.2,r:2.6,sp:['slam','sweep','cross','rain','charge'],em:0xb04aff,roar:'deep'},
 // Forbidden Territory: co-op encounters (mech = the teamwork rule)
 twinkael:{n:'Executioner Kael',m:'bigknight',col:0x8a1a1a,s:2.1,spd:3.2,r:1.8,sp:['combo','charge','sweep','jump'],em:0xff3a3a,roar:'deep',mech:{t:'twin',need:2}},
 twinseth:{n:'Executioner Seth',m:'bigknight',col:0x1a2a8a,s:2.1,spd:3.2,r:1.8,sp:['combo','bolts','sweep','cross'],em:0x3a6aff,roar:'deep',mech:{t:'twin',need:2}},
 chaincolossus:{n:'The Colossus of Chains',m:'colossus',col:0x4a4a52,s:2.8,spd:1.8,r:2.6,sp:['slam','cross','rain','sweep','combo'],em:0xc8c8ff,roar:'deep',mech:{t:'chains',need:3}},
 soulqueen:{el:['holy','shadow'],n:'The Soul Queen',m:'seraph',col:0x6a4a8a,s:2.4,spd:3.2,r:2,sp:['spiral','bolts','rain','cross'],em:0xd06aff,fly:1,roar:'whisper',mech:{t:'channel',need:3}},
 calflame:{el:['ice','fire'],n:'Calamity of Flame',m:'golem',col:0x5a1a0a,s:2.2,spd:2.6,r:2.2,sp:['slam','rain','nova'],em:0xff5a1a,roar:'deep',mech:{t:'trio',need:3}},
 calfrost:{el:['fire','ice'],n:'Calamity of Frost',m:'golem',col:0x9fd8ff,s:2.2,spd:2.6,r:2.2,sp:['slam','bolts','spiral'],em:0x6fd8ff,roar:'deep',mech:{t:'trio',need:3}},
 calstorm:{el:['earth','lightning'],n:'Calamity of Storms',m:'golem',col:0x3a4a6a,s:2.2,spd:2.6,r:2.2,sp:['slam','cross','bolts'],em:0xffe14d,roar:'deep',mech:{t:'trio',need:3}},
 sealwarden:{n:'The Seal Warden',m:'colossus',col:0x8a7a3a,s:2.6,spd:2,r:2.5,sp:['slam','spiral','cross','nova'],em:0xffd76a,roar:'deep',mech:{t:'seals',need:5}},
 trialchamp:{n:'Champion of Trials',m:'bigknight',col:0xa82a2a,s:2.4,spd:3,r:1.9,sp:['combo','sweep','jump','charge','cross'],em:0xffb040,roar:'deep',mech:{t:'sync',need:3}},
 gravchamp:{n:'The Gravity-Forged Champion',m:'demon',col:0x2a1a3a,s:2.5,spd:3,r:2.2,sp:['grav','slam','rain','combo','spiral'],em:0x8a4aff,roar:'demon',mech:{t:'sync',need:2}},
 jailer:{n:'Ishkafar\'s Jailer',m:'oni',col:0x2a2a3a,s:2.7,spd:2.6,r:2.3,sp:['slam','charge','roots','combo','grav'],em:0x6a6aff,roar:'grunt',mech:{t:'sync',need:3}},
 ishkafar:{n:'Ishkafar, the Dark Wizard',m:'pharaoh',col:0x1a0a2a,s:2.7,spd:3,r:2.2,robe:1,sp:['grav','rain','spiral','cross','bolts','nova','summon','grav'],em:0x8a4aff,roar:'demon',final:1,mech:{t:'sync',need:5}},
});
/* ---- chapters 21-50 ---- */
const NPC_={W:{n:'Wensly',ic:'🛡️',hat:'helm',col:0x8a8a9a},KE:{n:'Kendra',ic:'👑',hat:'crown',col:0xd8b04a},LU:{n:'Lucas',ic:'⚔️',hat:'helm',col:0x6a4a2a},ET:{n:'Ethan',ic:'🔮',hat:'wizard',col:0x2a4aa8},
 KM:{n:'Kamara',ic:'🗡️',hat:'cap',col:0x7a3a5a},KI:{n:'Kim',ic:'😜',hat:'wrap',col:0xc83a3a},IS:{n:'Isaac',ic:'🔥',hat:'helm',col:0xa82a2a},AU:{n:'Aurora',ic:'🧝‍♀️',hat:'crown',col:0xd8e8f0},
 RG:{n:'Reginaldo',ic:'🧝‍♂️',hat:'hood',col:0xe8e0c8},EM:{n:'Echo of {M}',ic:'🕯️',hat:'hood',col:0xfff2d0}};
const L_=a=>a.map(x=>[x[0],x[1]]);
const CH=(name,b,mobs,boss,npc,quest,intro,qs,qp,qd,outro)=>({name,b,mobs,boss,npc:NPC_[npc],quest,intro:L_(intro),qs:L_(qs),qp:L_(qp),qd:L_(qd),outro:L_(outro)});
CHS.push(
CH('Beyond Lumen','eldrift',['riftjelly','voidhound','gravwisp'],'riftsentinel','W',{t:'hunt',mob:'voidhound',n:12,title:'Echoes of the Rift'},
 [['N','Malgrath was gone. But the Void Rift never truly closed.'],['N','Its last light folded into a passage, and beyond it lay an ancient continent: Eldoria, the New World.'],['P','{H}... do you feel that? Something is pulling at the rift.'],['W','Heroes of Lumen! Forgive me for coming like this. I am Wensly, a knight of Eldoria.'],['W','Our Empress, Ava, has been taken by Ishkafar, a Dark Wizard who bends gravity itself. I came through the rift to find the ones who defeated Malgrath.']],
 [['W','Void Hounds crossed with you. If we leave them, they will hunt the villages on this shore.'],['KE','Then we kill them. All of them. I am not standing still while my sister is in chains.'],['W','This is Kendra, Ava\'s younger sister. Slay twelve Void Hounds, and I will show you the road.']],
 [['KE','Twelve hounds. Every one we slay is one step closer to Ava.']],
 [['W','Well fought. The rift\'s guardian blocks the way inland. It is a Rift Sentinel, born from what Malgrath left behind.'],['KE','Then let\'s break it.']],
 [['W','The shore is safe. Beyond it lies the frontier, and the first of Eldoria\'s ten kingdoms.'],['P','We came to save the world once, {H}. I guess we do it again.']]),
CH('The Empress Taken','frontier',['bandit','banditarcher','voidhound'],'frontguard','LU',{t:'gather',mob:'bandit',item:'Stolen Supply Crate',n:8,title:'The Frontier\'s Burden'},
 [['N','The frontier town of Ashveil stood half-empty. Its people whispered about the night the sky turned upside down.'],['KE','This is where they took her. Ava stopped here to protect the townsfolk... and Ishkafar lifted her into the sky like a feather.'],['LU','Hey! You there, are you the heroes from the rift? Name\'s Lucas. Future greatest warrior of the New World!']],
 [['LU','Bandits took the town\'s supplies the moment the guards fell. Help me get them back, and I\'ll prove I\'m worth taking along!'],['LU','Eight crates. The bandits stuffed them in their camps all over the hills.']],
 [['LU','Keep going! I counted three crates near the old mill.']],
 [['LU','That\'s all of them! Now the real problem: the Frontier Guardian. Ishkafar\'s magic turned him against us. He guards the road to the kingdoms.'],['W','Free him from that curse, and the road is ours. Lucas, stay behind them.'],['LU','Behind? I\'m going first!']],
 [['W','The guardian\'s heart held this. An Eldorian Seal. The kingdoms will open their gates to whoever carries it.'],['LU','So... I\'m coming with you, right? Right?'],['P','Ha. Welcome to the team, Lucas.']]),
CH('Castle Arthur','arthur',['sentry','cherub','bandit'],'kingarthur','KM',{t:'hunt',mob:'cherub',n:12,title:'The Golden Court'},
 [['N','Castle Arthur rose above the clouds of gold, the oldest kingdom of Eldoria.'],['KM','Stop! I mean, hello. I am Kamara. I am going to be a knight of this castle one day.'],['KM','But something is wrong. The angels of the court have fallen, and King Arthur no longer opens his doors.']],
 [['KM','The Fallen Cherubs attack anyone who comes near the throne. Real knights protect people. Help me clear twelve of them?'],['KM','I will stay close. I am not scared. Mostly.']],
 [['KM','Watch their dive. They telegraph it, just like a duel.']],
 [['KM','The doors are opening! King Arthur will see you... but he will test you first. He tests everyone.'],['ART','Strangers from beyond the rift. If you would walk my kingdoms, prove your blade is worthy of Eldoria.']],
 [['ART','Enough. You fight like those who have lost something precious.'],['ART','I was too proud to see it. Ishkafar\'s gravity is crushing the old royal order, one throne at a time. The Blasphemy King of Castle Mohg was the first to kneel to him.'],['KM','Your Majesty... may I go with them?'],['ART','Go, young one. Learn what it means to protect others. That is what makes a knight.']]),
CH('The Blasphemy Throne','cathedral',['acolyte','bloodknight','cherub'],'blasherald','KI',{t:'shrines',n:3,title:'Desecrated Altars'},
 [['N','The road east led to a cathedral drowned in red light.'],['KI','Boo! Ha! You should\'ve seen your face. I\'m Kim. I scout these ruins for fun.'],['KI','But nothing\'s been fun since the acolytes came. They worship the Blasphemy King, Mohg.']],
 [['KI','Three altars around the cathedral feed blood magic to Mohg\'s castle. Light the holy flames on them, and his herald will come out to stop us!'],['KI','I\'ll throw rocks at the acolytes. That\'s helping. Totally.']],
 [['KI','Two more altars! I left marks on the trees so you won\'t get lost. You\'re welcome.']],
 [['KI','The altars are burning clean! Uh-oh. Something big is coming out of the cathedral.'],['W','The Herald of Blasphemy. Mohg\'s voice in the world. Be careful.']],
 [['W','The herald carried a letter, sealed with gravity runes. Ishkafar wrote it. He promised Mohg the throne of the Empress in exchange for his loyalty.'],['KE','So the kings are being bought... or broken.'],['KI','I\'m coming too. You need someone fun on this team.']]),
CH('Castle Mohg','mohg',['bloodknight','acolyte','voidhound'],'mohg','W',{t:'survive',time:60,title:'The Blood Siege'},
 [['N','Castle Mohg. The first kingdom to fall to Ishkafar\'s promises.'],['MOHG','Little lambs from beyond the rift. You walk into my house carrying the Empress\'s hope?'],['MOHG','Ishkafar promised me her crown. I only need to drown this land in blood first.']],
 [['W','The castle\'s blood beacon calls his knights from every hill. Light our counter-beacon by the walls and hold until the siege breaks.'],['W','After every ruler you defeat, we learn more of Ishkafar\'s plan. Mohg knows a great deal.']],
 [['W','Hold the line at the beacon. The knights will break against it.']],
 [['W','The siege is broken. Mohg is alone now. Steel yourselves; the Blasphemy King does not fight with honor.']],
 [['MOHG','Ishkafar... you promised...'],['W','Look here. Mohg\'s records. Ishkafar is gathering power from every kingdom he breaks, storing it somewhere in the deep lands.'],['W','We need someone who understands gravity magic. There is a young mage at the Grand Archive.']]),
CH('The Mage\'s Archive','archive',['tome','spellgolem','gravwisp'],'archguard','ET',{t:'gather',mob:'tome',item:'Gravity Codex Page',n:10,title:'Pages of Gravity'},
 [['N','The Grand Archive held every spell ever written in Eldoria, and one very tired mage.'],['ET','Oh! Visitors. Please don\'t touch the floating books, they bite. I\'m Ethan.'],['ET','I have spent three years studying one thing: how Ishkafar bends gravity. And I think I am close.']],
 [['ET','The Living Tomes stole the pages of the Gravity Codex. Ten pages. With them I can explain how his magic works.'],['ET','Please be gentle with the books. They\'re... well, they\'re attacking you, but still.']],
 [['ET','Each page is a piece of the formula. I need them all.']],
 [['ET','I see it now. Ishkafar\'s gravity can\'t be broken by one strike, however strong. Only by many strikes landing at the same moment.'],['ET','Remember that. It will matter at the end. Now, the Archive Guardian has awakened. It guards the deepest shelves.']],
 [['ET','The guardian kept a map of the deep lands! The Forbidden Territory. That is where Ishkafar hides.'],['ET','I\'m coming with you. Someone has to keep you from walking into a gravity trap.'],['LU','Finally, a mage on the team!']]),
CH('Castle Ifrit','ifrit',['ifritspawn','magmaknight','imp'],'ifrit','IS',{t:'hunt',mob:'ifritspawn',n:15,title:'Embers of the Fire King'},
 [['N','Castle Ifrit burned day and night, its king made of living flame.'],['IS','You must be the ones Wensly talks about. I\'m Isaac. I protect the villages at the foot of this volcano.'],['IS','Ifrit\'s spawn are burning the farms. My friends and I can\'t hold them alone.']],
 [['IS','Fifteen of the Ifrit Spawn. If we drive them back, the villagers can escape.'],['IS','Lucas, Kim, Kamara, follow my lead! Ethan, cover us!'],['KI','Who made him the boss?'],['KM','He did. And honestly... it works.']],
 [['IS','Keep pushing! Don\'t let them reach the farms!']],
 [['IS','The villages are safe. Now the king himself. He has not been the same since Ishkafar visited.']],
 [['IFR','My flames... they were never mine to give away...'],['IS','He\'s free of the curse. The Fire King gave us a Flame Ward. It will protect us in the deep lands.'],['W','Isaac. You lead well. The young ones listen to you.']]),
CH('The Elven Sanctuary','elven',['sprite','elfguard','frostfang'],'ancientguard','AU',{t:'shrines',n:3,title:'The Three Moon Wells'},
 [['N','Hidden in an endless forest was the Elven Sanctuary, older than any kingdom.'],['AU','We have waited a long time for you, children of Lumen. I am Aurora.'],['RG','And I am Reginaldo. We are the Grand Elders. We remember what the kingdoms have forgotten.']],
 [['AU','Rekindle the three Moon Wells around the sanctuary. When they shine, we will open the memory of Eldoria to you.'],['RG','The forest\'s guardians will test you. Do not hate them; they only protect what is sacred.']],
 [['AU','The wells answer only to those who keep going.']],
 [['RG','The wells shine again. Now the Ancient Guardian awakens. It must judge whether you are ready for the truth.']],
 [['AU','You are ready. Ishkafar\'s power is older than the kingdoms: gravity, the force that holds the world together.'],['RG','He wants the Empress because her bloodline anchors the ten kingdoms. With Ava, he could pull the whole continent into his hand.'],['RG','And there is more. Something about your own past, children. But you must find it yourselves. Go to Castle Diamble first.']]),
CH('Castle Diamble','diamble',['diamondgolem','prismbat','frostfang'],'diamondking','KE',{t:'gather',mob:'diamondgolem',item:'Prism Key Fragment',n:8,title:'The Prism Key'},
 [['N','Castle Diamble shone like a frozen star, its walls made of living diamond.'],['KE','Ava loved this place. She said the Diamond King was the only ruler who never lied to her.'],['KE','But now his gates are sealed with crystal, and I can hear something crying inside.']],
 [['KE','The Prism Key was shattered and sewn into the Diamond Golems. We need eight fragments to open the gate.'],['KE','I know I\'m not as strong as you yet. But I will not fall behind. Not this time.']],
 [['KE','Keep going. Ava never gave up on anyone. I won\'t give up on her.']],
 [['KE','The gate is open. The Diamond King... his armor reflects attacks. Hit him when he\'s winding up.']],
 [['DIA','Kendra... little princess... forgive me. He made me watch them...'],['KE','Watch who? What did he make you watch?'],['DIA','The two women from beyond the rift. Long ago. Ishkafar came for their children, and they stood in his way...'],['P','{H}... he\'s talking about our mothers.']]),
CH('The Lost Memories','memory',['memwisp','soulwisp','gravwisp'],'memsentinel','EM',{t:'shrines',n:3,title:'Fragments of the Past'},
 [['N','Beyond Diamble lay a quiet field where memories drifted like snow.'],['P','I remember now. The night our mothers didn\'t come home. Everyone said it was a storm.'],['N','A soft light took shape in the field. A gentle voice, from very long ago.'],['EM','My child... if this memory reaches you, then you have grown strong.']],
 [['EM','This is only an echo, a piece of me the field held onto. Light the three keepsake lanterns, and I will show you what happened.'],['N','The echo was warm, but it was only a memory. {M} and {PM} were gone.']],
 [['EM','Find the lanterns. Each one holds a moment I wanted you to see.']],
 [['EM','Ishkafar came to Lumen for you two. He felt the starlight in your hearts, even as babies.'],['EM','{PM} and I stood in front of your cradles. We could not defeat him... but we hid you from his sight. It was enough.'],['EM','Something guards this memory and will not let it go. Be brave, my child. Like we were.']],
 [['EM','You are free to remember now. Never carry our deaths as a weight. Carry our love as a sword.'],['P','Mom...'],['N','The echo faded into light. {H} and {P} stood together for a long while before anyone spoke.'],['IS','Then we fight for them too. For Essa and Liza. Every one of us.']]),
CH('Castle Vesper','vesper',['duskstalker','soulwisp','bloodknight'],'twilightking','W',{t:'hunt',mob:'duskstalker',n:15,title:'The Endless Dusk'},
 [['N','In Castle Vesper the sun had been setting for seven years and never went down.'],['VES','A kingdom without night or day. Isn\'t it beautiful? Ishkafar froze my sun, and in return I never grow old.']],
 [['W','The Dusk Stalkers hunt anyone who walks in the twilight. Thin their numbers and the king will have to face us.'],['W','Ethan says Vesper\'s frozen sun is feeding power to the Forbidden Territory.']],
 [['W','Stay in the light. The stalkers are strongest in the shadows.']],
 [['W','The Twilight King waits on his balcony. He moves faster than his shadow. Watch his dives.']],
 [['VES','The sun... it\'s finally setting...'],['ET','Vesper\'s stored power just vanished. It flowed east, toward the sky. Toward Castle Zenith.']]),
CH('Castle Zenith','zenith',['zenithhawk','cloudspirit','prismbat'],'skyking','KI',{t:'gather',mob:'zenithhawk',item:'Sky Feather',n:10,title:'Wings of Zenith'},
 [['N','Castle Zenith floated above the clouds, held up by Ishkafar\'s gravity.'],['KI','Woooow! We\'re walking on clouds! Okay, nobody push me.'],['KI','I scouted ahead. The Sky King\'s hawks carry the feathers that keep the bridges up. We need them to reach his tower.']],
 [['KI','Ten Sky Feathers! And no, I\'m not afraid of heights. That shaking is excitement.']],
 [['KI','Grab the feathers before they float away!']],
 [['KI','The bridge to the Sky King is up! Careful, he dives like a storm.']],
 [['ZEN','The ground... finally calls me back...'],['KI','I\'ll admit it. That was scary. But I\'d do it again with you guys.'],['W','Two kingdoms freed in a row. The people are starting to believe again.']]),
CH('Castle Valdran','valdran',['ironlegion','cogspider','ironlegion'],'ironking','LU',{t:'survive',time:60,title:'The Iron March'},
 [['N','Castle Valdran never stopped working. Its forges built armies for whoever paid.'],['LU','The Iron King\'s legion is marching on the free villages. Ishkafar bought every soldier.'],['LU','This is it. The kind of fight I always dreamed about. Let me show you what I can do.']],
 [['LU','We light the warning beacon at the ridge and hold until the villages evacuate. Nobody gets past us.'],['LU','Stand with me. No retreat.']],
 [['LU','Hold the ridge! Light the beacon!']],
 [['LU','The villagers are safe. Now let\'s go knock on the Iron King\'s door.']],
 [['VAL','No army... can stand against what Ishkafar is building...'],['LU','We just did.'],['W','You have become a true warrior, Lucas.'],['LU','Heh. I told you. Greatest warrior of the New World. Well... second, after these two.']]),
CH('Castle Sylthar','sylthar',['shade','voidtemplar','soulwisp'],'shadowking','ET',{t:'shrines',n:3,title:'Lights in the Shadow'},
 [['N','Castle Sylthar was a kingdom of illusions. Paths that vanished. Doors that led back where you started.'],['ET','The Shadow King hides behind false paths. But illusions need light to exist. I can break them with the right spell.']],
 [['ET','Help me light three Truth Lanterns around the castle. Their light will strip away the illusions.'],['ET','If you see two of me... the one complaining about the cold is the real one.']],
 [['ET','The lanterns reveal the true path. Keep going.']],
 [['ET','The illusions are breaking. There! The real Shadow King. Strike before he hides again.']],
 [['SYL','You see through shadows... you will see through his...'],['ET','His throne room had prison records. Ava is alive. She\'s held somewhere beyond the Gate of the Forbidden.'],['KE','Alive... she\'s alive!']]),
CH('Castle Aurora','auroraice',['frostfang','yeti','prismbat'],'iceking','KM',{t:'hunt',mob:'frostfang',n:15,title:'The Frozen Oath'},
 [['N','Castle Aurora slept under green northern lights and endless snow.'],['KM','The Ice King\'s wolves have trapped a village in the pass. Real knights protect the helpless. That\'s the first lesson King Arthur taught me.'],['KM','I want to lead this one. If you\'ll let me.']],
 [['KM','Fifteen Frost Fangs. I\'ll hold the village gate. You hunt them in the snow.'],['IS','You\'ve got this, Kamara.']],
 [['KM','The villagers are counting on us. Keep going!']],
 [['KM','The pass is clear! Everyone made it out. Now... the Ice King.']],
 [['ICE','A child... with the heart of a knight...'],['KM','I didn\'t do it for glory. I did it because they needed someone.'],['W','Then you are already a knight, Kamara. The title is just a formality.']]),
CH('Castle Draken','draken',['drakeling','dragonknight','magmaknight'],'dragonking','IS',{t:'gather',mob:'dragonknight',item:'Dragon Key Shard',n:10,title:'Key of the Last Kingdom'},
 [['N','Castle Draken was the last kingdom between Eldoria and the Forbidden Territory.'],['IS','The Dragon King guards the only key to the deep lands. He has never been beaten.'],['IS','So we\'ll be the first.']],
 [['IS','His knights carry pieces of the key. Ten shards. We take them, we assemble the key, and we face the king.']],
 [['IS','Every shard matters. Let\'s keep moving.']],
 [['IS','The key is whole. The Dragon King has smelled it already. Here he comes!']],
 [['DRA','I guarded that key for a thousand years... take it. And end him.'],['IS','The road to the Forbidden Territory is open. But the kingdoms we freed are arguing. Some want to hide. Some want revenge.'],['W','Then they need someone to bring them together.']]),
CH('The Broken Alliance','alliance',['bandit','ironlegion','voidtemplar'],'traitor','IS',{t:'hunt',mob:'voidtemplar',n:15,title:'Rally the Kingdoms'},
 [['N','The freed kingdoms met in the ruins of the old capital. It did not go well.'],['IS','Enough! While you argue, Ishkafar grows stronger!'],['IS','Lucas, Ethan, Kamara, Kim. Show them what we\'ve done together.']],
 [['IS','The Void Templars are attacking the council. Drive them out, and the kingdoms will see we can stand together.'],['LU','On your word, Isaac!'],['KI','Just this once, I\'ll follow orders.']],
 [['IS','Protect the council! Don\'t let them break us apart!']],
 [['IS','Commander Vorn. He sold the council\'s location to Ishkafar. He\'s the one who let the templars in.']],
 [['IS','The alliance stands. Ten kingdoms, one banner.'],['W','Isaac, they followed your voice today. Not mine.'],['KE','Wensly. I found something in Vorn\'s orders. A trail. To Ava.']]),
CH('The Empress\'s Trail','mire',['ghoul','leech','soulwisp'],'warden','KE',{t:'gather',mob:'ghoul',item:'Ava\'s Torn Ribbon',n:6,title:'Ribbons in the Mire'},
 [['N','The trail led into a mire where the ground itself sank toward the east.'],['KE','Ava wore white ribbons in her hair. She would leave them behind on purpose, so I could find her. She always did.'],['W','I knew the prison existed. A floating keep inside the Forbidden Territory. I was not strong enough to reach it alone.']],
 [['KE','The ghouls took her ribbons. Six of them. Please.']],
 [['KE','Each ribbon is a message. "I\'m still here."']],
 [['KE','I have them all. The Prison Warden patrols this mire. He knows the way to the keep.']],
 [['KE','"Kendra, don\'t cry. Come get me." That\'s what she wrote on the last ribbon.'],['KE','I\'m not crying. I\'m coming, Ava.'],['W','The road to the prison goes through the Gate of the Forbidden. First, the Elders.']]),
CH('The Last Kingdom\'s Oath','oathland',['elfguard','sentry','dragonknight'],'royalguardian','RG',{t:'shrines',n:3,title:'The Oath Stones'},
 [['N','At the edge of Eldoria the Elders waited by three ancient oath stones.'],['RG','Beyond this point, ordinary strength is no longer enough.'],['AU','Ishkafar\'s gravity can be broken only by many hearts striking as one. Ethan has told you this. Now you must believe it.']],
 [['RG','Renew the three Oath Stones. Each one binds a kingdom\'s promise to stand with you.']],
 [['AU','The stones remember every promise ever made here.']],
 [['RG','The oaths are renewed. The Last Royal Guardian must judge whether the alliance is worthy to enter.']],
 [['AU','The guardian accepts you. The Forbidden Territory will open.'],['RG','But hear this. From here on, the enemies are built to crush lone heroes. Bring friends. Fight together. If you have no one, your companions will stand beside you.'],['IS','We\'ll be there. All of us.']]),
CH('The Gate of the Forbidden','forbidgate',['voidtemplar','gravwisp','shade'],'gatekeeper','W',{t:'survive',time:60,title:'Hold the Gate'},
 [['N','A wall of black stone split the world. Behind it, the sky bent like water.'],['W','The Gate of the Forbidden. Every knight who tried to pass it alone was crushed.'],['W','This is the last battle you can fight alone. Beyond the gate, we stand together or not at all.']],
 [['W','The gate opens only when its beacon burns long enough. Light it and hold against Ishkafar\'s forces.']],
 [['W','Hold! The gate is waking!']],
 [['W','The gate is open, but its keeper remains.']],
 [['W','We are through. Listen carefully, all of you.'],['W','From here, each enemy needs teamwork. Ethan, Isaac, Lucas, Kamara and Kim will fight beside anyone who has no party. Friends who join you online will always count for more.'],['ET','I\'ll explain each trick as we go. Promise.']]),
CH('The Twin Executioners','forbid',['voidtemplar','bloodknight','shade'],'twinkael','IS',{t:'hunt',mob:'voidtemplar',n:12,title:'Linked Souls'},
 [['N','The Forbidden Territory. The air itself was heavy.'],['ET','Two executioners guard the first pass. Their souls are linked. Kill one, and the other revives it within moments.'],['IS','So we split up. Two teams. Both fall together, or neither does.']],
 [['IS','Clear the templars first so we have room to fight.']],
 [['IS','Keep the templars busy.']],
 [['ET','Remember: when one executioner falls, the other must fall within ten seconds. Bring a partner, or let one of us take the second one.']],
 [['IS','Two teams, one victory. That\'s how the new generation fights.'],['KM','My arms are shaking. But we did it together.']]),
CH('The Colossus of Chains','bridge',['ironlegion','voidtemplar','cogspider'],'chaincolossus','LU',{t:'hunt',mob:'ironlegion',n:12,title:'Break the Chains'},
 [['N','A giant stood in the canyon, bound by enormous chains to three anchors.'],['LU','The chains make it unbreakable. While they hold, nothing can hurt it.'],['ET','Break all three anchors at nearly the same time, within twelve seconds. Otherwise they rebuild themselves.']],
 [['LU','Clear the legion first. Then we split up, one anchor each.']],
 [['LU','More soldiers! Push through!']],
 [['ET','Three anchors, three fighters. Coordinate, then strike the colossus while it\'s free.']],
 [['LU','Three anchors, three heroes, one giant down. I could get used to this.']]),
CH('The Soul Queen','court',['soulwisp','shade','duskstalker'],'soulqueen','KE',{t:'hunt',mob:'soulwisp',n:12,title:'Freed Souls'},
 [['N','In a palace of floating souls waited a queen who had forgotten her own name.'],['KE','The Soul Queen. She steals souls for Ishkafar. Ava could be next if we fail.'],['ET','She will try to harvest every soul in the arena at once. Interrupt her, and it takes three of us hitting her together.']],
 [['KE','Free twelve trapped soul wisps. Every soul we free is one she can\'t use.']],
 [['KE','There are more souls! Keep going!']],
 [['ET','When she starts Soul Harvest, three of us must hit her during the cast. Otherwise the whole arena takes the blow.']],
 [['KE','She\'s gone. And the souls are flying home.'],['KE','Ava... we\'re close now. I can feel it.']]),
CH('The Three Calamities','storm',['zenithhawk','magmaknight','frostfang'],'calflame','KI',{t:'hunt',mob:'magmaknight',n:12,title:'Before the Storm'},
 [['N','Three calamities ruled this valley: flame, frost and storm.'],['KI','Okay, so they protect each other. When they\'re close together, almost nothing hurts them.'],['ET','We have to pull them apart. Different fighters, different calamities. Keep them away from each other.']],
 [['KI','Thin out the Magma Knights first. I\'ll scout the calamities\' lair.']],
 [['KI','Keep going, I\'ll keep watching the valley.']],
 [['ET','Three calamities, three groups. Drag them apart before you strike.']],
 [['KI','Flame, frost and storm, all down. Do I get to be leader next time?'],['IS','Next time, Kim. Maybe.']]),
CH('The Five Seals','eldrift',['gravwisp','voidtemplar','soulwisp'],'sealwarden','ET',{t:'hunt',mob:'gravwisp',n:15,title:'Practice Gravity'},
 [['N','Five ancient seals ringed an arena of floating stone.'],['ET','This is a trial, a rehearsal for Ishkafar. Five seals. Five fighters must stand on them at the same time.'],['ET','While all five are held, the Seal Warden loses its protection. Learn this well. The final battle works the same way: five hearts, one moment.']],
 [['ET','First, scatter the Gravity Wisps. Then we practice.']],
 [['ET','Their gravity pulls are a warm-up for his.']],
 [['ET','Five seals around the arena. Stand on all five together for a few seconds. Then strike the Warden while the seals are broken.']],
 [['ET','Perfect. Five hearts, one moment. That is how we beat him.'],['IS','We\'re ready. All of us.']]),
CH('Isaac, Leader of the New Generation','watchtower',['dragonknight','voidtemplar','ironlegion'],'trialchamp','IS',{t:'survive',time:60,title:'Isaac\'s Stand'},
 [['N','Ishkafar\'s champion challenged the alliance to a test of leadership.'],['IS','He says the new generation will scatter without the old kings. Let\'s prove him wrong.'],['IS','Lucas, front. Kamara, protect the flank. Kim, scout. Ethan, support. We hold the beacon together.']],
 [['IS','Light the beacon and hold. This time, I\'m standing at the front.']],
 [['IS','Hold the line! Together!']],
 [['IS','The Champion of Trials. Three of us strike together, or the champion shrugs it off.']],
 [['W','Isaac. From this day on, you lead the new generation of Eldoria.'],['IS','I\'ll lead. But I only stand here because of them.'],['LU','Ha. Don\'t get sentimental on us now.']]),
CH('The Gravity Front','gravity',['gravwisp','voidtemplar','shade'],'gravchamp','ET',{t:'hunt',mob:'gravwisp',n:15,title:'Bending Ground'},
 [['N','Ruins floated in the air. The ground tilted under every step.'],['ET','We\'re inside Ishkafar\'s gravity field now. His champion will pull you toward it. Roll out when you feel the pull!'],['ET','Two of us striking together can break its shield.']],
 [['ET','The wisps are the field\'s anchors. Break fifteen and the gravity weakens.']],
 [['ET','Steady... the floor is moving again.']],
 [['ET','The champion is here. When it pulls, dodge away from the center.']],
 [['ET','The field is collapsing. I can see the prison keep floating ahead!'],['KE','Ava!']]),
CH('The Empress\'s Prison','catacomb',['voidtemplar','shade','soulwisp'],'jailer','KE',{t:'shrines',n:3,title:'Unbind the Keep'},
 [['N','The prison keep floated above an abyss. And inside a cage of light, the Empress.'],['AV','Kendra...? No. You shouldn\'t be here. He wants you to come!'],['KE','I don\'t care. I came to take you home.']],
 [['KE','Three gravity locks bind the cage. Break them, and his jailer will come for us.'],['W','I will stay with you, Kendra. Whatever happens.']],
 [['AV','Hurry... his gravity grows stronger every hour.']],
 [['KE','The locks are broken! The jailer is coming.'],['ET','Three of us must strike together. Go!']],
 [['N','The cage cracked... but it did not open. A voice filled the sky.'],['IK','Clever children. You reached my prison. But the Empress\'s chains are tied to my heart.'],['IK','Come to my sanctum. Bring all your friends. It won\'t be enough.'],['W','Gather everyone. Five of us, at least. This is the battle we prepared for.']]),
CH('Ishkafar, the Dark Wizard','gravity',['voidtemplar','gravwisp','soulwisp'],'ishkafar','W',{t:'hunt',mob:'voidtemplar',n:10,title:'The Last Approach'},
 [['N','Ishkafar\'s sanctum floated at the heart of the Forbidden Territory.'],['IK','Children of Essa and Liza. I took your mothers, and I will take you.'],['P','You will not take anyone else. Not ever again.'],['ET','Remember everything. He can\'t be hurt by lonely strikes. Five of us must hit him at the same moment.']],
 [['W','Clear the path to the sanctum. Then we go in together.']],
 [['W','Push through!']],
 [['W','This is it. Five fighters, one heart. Friends, and companions to fill any empty place.'],['IS','For Ava. For Essa and Liza. For Eldoria.']],
 [['IK','Impossible... no single blade could reach me...'],['P','We were never single blades.'],['N','Ishkafar\'s gravity collapsed. Far away, the cage of light shattered.']]),
CH('A New Dawn','dawn',['bunny','blob','sprite'],null,'KE',{t:'shrines',n:3,title:'Lanterns for the Lost'},
 [['N','For the first time in years, the sun rose over all of Eldoria.'],['AV','Kendra!'],['KE','Ava! Ava, you\'re free... I promised, didn\'t I?'],['AV','You did. My brave little sister.']],
 [['KE','The people want to light three memorial lanterns. One for those we lost.'],['KE','And one each for Essa and Liza. Without them, none of us would be here.']],
 [['KE','The last lanterns are near the hills.']],
 [['AV','Heroes of Lumen. Eldoria will never forget you.'],['W','The kingdoms will rebuild. And they will have strong protectors.'],['AV','Isaac, the people chose you to lead the new generation. Will you accept?'],['IS','I will. With all of them beside me.']],
 []),
);
CHS[49].finale=[['P','{H}... do you think they can see us? Our moms?'],['N','The lanterns rose into the morning sky, burning gold.'],['H','I think they always could.'],['AV','Rest now, heroes. But know this: the rift showed us more than Eldoria. There are other worlds out there.'],['N','The New World Arc ends. But the oath lives on, in every world.']];
// level scale for the new world: reaches the top levels near chapter 100
const _chL0=chLevel;chLevel=c=>c<20?_chL0(c):Math.round(58+(c-19)*5.4);
// how many fighters each forbidden boss expects (companions fill the gap)
CHS.forEach((c,i)=>{if(c.boss&&BOSSES[c.boss]&&BOSSES[c.boss].mech)c.party=BOSSES[c.boss].mech.need;});
/* ================= RENDERER & QUALITY ================= */
const T=THREE;if(T.ColorManagement)T.ColorManagement.legacyMode=false;
const cv=$('#c');
const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isMobile=isIOS||/Android|Mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>1;
if(isIOS)document.body.classList.add('ios');
let QUAL=(()=>{try{return localStorage.getItem('so_qual')||(isMobile?'medium':'high')}catch(e){return 'medium'}})();
const Q=()=>({low:{dpr:1,shadow:0,bloom:0,parts:120,sh:0},medium:{dpr:isIOS?2:1.5,shadow:1024,bloom:isMobile&&!isIOS?0:1,parts:220,sh:1},high:{dpr:2,shadow:2048,bloom:1,parts:320,sh:1}}[QUAL]);
const R=new T.WebGLRenderer({canvas:cv,antialias:QUAL!=='low',powerPreference:'high-performance'});
R.outputEncoding=T.sRGBEncoding;R.shadowMap.type=T.PCFSoftShadowMap;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
const scene=new T.Scene();
const cam=new T.PerspectiveCamera(50,1,.1,500);
const hemi=new T.HemisphereLight(0xffffff,0x445544,.7);scene.add(hemi);
const sun=new T.DirectionalLight(0xffffff,1);scene.add(sun);scene.add(sun.target);
sun.shadow.camera.near=1;sun.shadow.camera.far=140;sun.shadow.bias=-.0015;sun.shadow.normalBias=.03;
const amb=new T.AmbientLight(0xffffff,.12);scene.add(amb);
// Rim light. The sky renders near-black (#07060c), so a dim cool backlight is what
// separates a character's silhouette from the background. Repositioned each frame in
// updateCam() to sit behind whatever the camera is framing.
const rim=new T.DirectionalLight(0xaecbff,.5);scene.add(rim);scene.add(rim.target);
let world=new T.Group();scene.add(world);
let W=1,H=1;
function applyQuality(){const q=Q();document.body.classList.toggle('fx-glass',QUAL==='high');R.setPixelRatio(Math.min(window.devicePixelRatio||1,q.dpr));R.shadowMap.enabled=!!q.shadow;sun.castShadow=!!q.shadow;if(q.shadow){sun.shadow.mapSize.set(q.shadow,q.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
 const s=q.shadow?(QUAL==='high'?34:26):0;sun.shadow.camera.left=-s;sun.shadow.camera.right=s;sun.shadow.camera.top=s;sun.shadow.camera.bottom=-s;sun.shadow.camera.updateProjectionMatrix();
 scene.traverse(o=>{if(o.material&&o.material.needsUpdate!==undefined)o.material.needsUpdate=true;});resize();}
function setQuality(q){QUAL=q;try{localStorage.setItem('so_qual',q)}catch(e){}applyQuality();}
function resize(){const vv=window.visualViewport;W=Math.round(vv?vv.width:innerWidth)||innerWidth;H=Math.round(vv?vv.height:innerHeight)||innerHeight;document.documentElement.style.setProperty('--visible-height',H+'px');document.documentElement.style.setProperty('--visible-top',(vv?.offsetTop||0)+'px');R.setSize(W,H,false);cam.aspect=W/H;cam.fov=W<H?64:50;cam.updateProjectionMatrix();PF.resize();}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,250));if(window.visualViewport)visualViewport.addEventListener('resize',resize);
// iOS: block page bounce / pinch / double-tap zoom, but keep menus scrollable
document.addEventListener('touchmove',e=>{if(e.touches.length>1||!e.target.closest('.mc,.mside,.selp,textarea,#selScr,#titleScr,#trade'))e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('contextmenu',e=>e.preventDefault());

/* ================= GEOMETRY HELPERS ================= */
const geoC={};const geo=(k,f)=>geoC[k]||(geoC[k]=f());
// Silhouette smoothing. Every call site passes explicit segment counts and most are
// 4-8 — hexagonal-prism cylinders and 4-sided pyramid cones — which is what made
// models read as blocky. Floor the count in proportion to radius: anything big enough
// to register as a silhouette gets rounded, while small details (gem facets, wires,
// spikes, eyes) keep their deliberate low-poly look.
const SEG=(r,s)=>{r=Math.abs(r);return r<.12?s:Math.max(s,Math.min(28,Math.round(12+r*10)));};
const BOX=(w,h,d)=>geo(`b${w}_${h}_${d}`,()=>new T.BoxGeometry(w,h,d));
const SPH=(r,a=10,b=8)=>{a=SEG(r,a);b=Math.max(b,Math.round(a*.6));return geo(`s${r}_${a}_${b}`,()=>new T.SphereGeometry(r,a,b));};
const HEMI=(r)=>{const a=SEG(r,12),b=Math.max(6,Math.round(a*.5));return geo(`hs${r}_${a}`,()=>new T.SphereGeometry(r,a,b,0,Math.PI*2,0,Math.PI*.55));};
const CYL=(a,b,h,s=8)=>{s=SEG(Math.max(Math.abs(a),Math.abs(b)),s);return geo(`c${a}_${b}_${h}_${s}`,()=>new T.CylinderGeometry(a,b,h,s));};
const CONE=(r,h,s=8)=>{s=SEG(r,s);return geo(`k${r}_${h}_${s}`,()=>new T.ConeGeometry(r,h,s));};
const ICO=(r,d=0)=>geo(`i${r}_${d}`,()=>new T.IcosahedronGeometry(r,d));
const DOD=(r)=>geo(`d${r}`,()=>new T.DodecahedronGeometry(r,0));
const OCT=(r)=>geo(`o${r}`,()=>new T.OctahedronGeometry(r,0));
const TOR=(r,t,arc=Math.PI*2)=>geo(`t${r}_${t}_${arc}`,()=>new T.TorusGeometry(r,t,10,24,arc));
const RING=(a,b)=>geo(`r${a}_${b}`,()=>new T.RingGeometry(a,b,40));
const CIRC=(r)=>geo(`ci${r}`,()=>new T.CircleGeometry(r,40));
const PLANE=geo('pl',()=>new T.PlaneGeometry(1,1));
// flatShading now defaults to false. Hard-edged facets on every character, monster and
// NPC were the main source of the blocky look. Terrain is unaffected (the ground mesh
// builds its own flat-shaded material), and ICO/DOD/OCT bake flat normals into the
// geometry itself, so crystals and gems stay faceted regardless. Opt back in per-call
// with mat(col,{flatShading:true}).
function mat(c,o){return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75,metalness:.05,flatShading:false},o||{}));}
const basic=(c,o)=>new T.MeshBasicMaterial(Object.assign({color:c},o||{}));
function mesh(g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;return o;}
function grp(x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);return g;}
function radTex(a,b){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
const SHADOW_T=radTex('rgba(0,0,0,.45)','rgba(0,0,0,0)'),GLOW_T=radTex('rgba(255,255,255,1)','rgba(255,255,255,0)');
const shadowMat=new T.MeshBasicMaterial({map:SHADOW_T,transparent:true,depthWrite:false});
function addShadow(root,r){const s=new T.Mesh(PLANE,shadowMat);s.rotation.x=-Math.PI/2;s.position.y=.04;s.scale.set(r*2.6,r*2.6,1);s.castShadow=false;root.add(s);return s;}
function glowSprite(c,s){const sp=new T.Sprite(new T.SpriteMaterial({map:GLOW_T,color:c,blending:T.AdditiveBlending,depthWrite:false,transparent:true}));sp.scale.set(s,s,s);return sp;}
const _v=new T.Vector3();
function toScreen(x,y,z){_v.set(x,y,z).project(cam);return {x:(_v.x*.5+.5)*W,y:(-_v.y*.5+.5)*H,vis:_v.z<1&&_v.z>-1};}

/* ================= TERRAIN ================= */
const AR={x:0,z:-44,r:15};// boss arena
let TER={amp:1.5,seed:1};
function gY(x,z){const a=TER.amp;if(!a)return 0;const d0=Math.hypot(x,z),dA=Math.hypot(x-AR.x,z-AR.z);const f=smooth(7,16,d0)*smooth(AR.r+3,AR.r+11,dA);
 const s=TER.seed;const h=(Math.sin(x*.09+s)*Math.cos(z*.075+s*.7)+.55*Math.sin(x*.19+z*.13+s*2)+.3*Math.sin((x-z)*.31+s))*.55;return Math.max(-a*.4,h*a)*f+ (d0>66?(d0-66)*.5:0);}
function gN(x,z,out){const e=.4;const hx=gY(x+e,z)-gY(x-e,z),hz=gY(x,z+e)-gY(x,z-e);out.set(-hx,2*e,-hz).normalize();return out;}

/* ================= SKY ================= */
const skyMat=new T.ShaderMaterial({uniforms:{top:{value:new T.Color(0x3060a0)},bot:{value:new T.Color(0xd0e0f0)},sunDir:{value:new T.Vector3(0,1,0)},sunCol:{value:new T.Color(0xffffff)},stars:{value:0}},
 vertexShader:`varying vec3 vP;void main(){vP=position;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w;}`,
 fragmentShader:`uniform vec3 top,bot,sunDir,sunCol;uniform float stars;varying vec3 vP;float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
 void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=mix(bot,top,smoothstep(-.05,.45,h));float s=max(0.,dot(d,normalize(sunDir)));c+=sunCol*(pow(s,600.)*1.5+pow(s,8.)*.25);
 if(stars>0.){vec3 g=floor(d*140.);float st=step(.995,hash(g))*smoothstep(0.,.2,h);c+=vec3(st)*stars;}gl_FragColor=vec4(c,1.);}`,side:T.BackSide,depthWrite:false,fog:false});
const sky=new T.Mesh(new T.SphereGeometry(300,24,12),skyMat);sky.renderOrder=-10;sky.castShadow=false;scene.add(sky);

/* ================= WIND SWAY ================= */
const windU={value:0};
function swayMat(m,amt){m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;sh.uniforms.uAmt={value:amt};sh.vertexShader='uniform float uTime;uniform float uAmt;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 #ifdef USE_INSTANCING
 vec3 wp=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
 #else
 vec3 wp=vec3(0.);
 #endif
 float sw=sin(uTime*1.7+wp.x*.35+wp.z*.27)*uAmt*max(0.,position.y);transformed.x+=sw;transformed.z+=sw*.5;`);};m.customProgramCacheKey=()=>'sway'+amt;return m;}

/* ================= POST FX (bloom + vignette) ================= */
const PF={on:false,rt:null,b1:null,b2:null,init(){this.oc=new T.OrthographicCamera(-1,1,1,-1,0,1);this.qs=new T.Scene();this.quad=new T.Mesh(new T.PlaneGeometry(2,2),null);this.qs.add(this.quad);
 const vs=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
 this.mBright=new T.ShaderMaterial({uniforms:{t:{value:null},th:{value:.75}},vertexShader:vs,fragmentShader:`uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec4 c=texture2D(t,vUv);float l=dot(c.rgb,vec3(.3,.59,.11));gl_FragColor=vec4(c.rgb*smoothstep(th,th+.45,l),1.);}`,depthTest:false,depthWrite:false});
 this.mBlur=new T.ShaderMaterial({uniforms:{t:{value:null},dir:{value:new T.Vector2(1,0)},res:{value:new T.Vector2(1,1)}},vertexShader:vs,fragmentShader:`uniform sampler2D t;uniform vec2 dir,res;varying vec2 vUv;void main(){vec2 o=dir/res;vec4 c=texture2D(t,vUv)*.227;c+=(texture2D(t,vUv+o*1.38)+texture2D(t,vUv-o*1.38))*.316;c+=(texture2D(t,vUv+o*3.23)+texture2D(t,vUv-o*3.23))*.07;gl_FragColor=c;}`,depthTest:false,depthWrite:false});
 this.mComp=new T.ShaderMaterial({uniforms:{t:{value:null},b:{value:null},str:{value:.9},vig:{value:.35},flash:{value:0}},vertexShader:vs,fragmentShader:`uniform sampler2D t,b;uniform float str,vig,flash;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb+texture2D(b,vUv).rgb*str;vec2 q=vUv-.5;c*=1.-dot(q,q)*vig*2.;c+=flash;gl_FragColor=vec4(c,1.);
 #include <encodings_fragment>
 }`,depthTest:false,depthWrite:false});},
 resize(){if(!this.oc)return;const q=Q();this.on=!!q.bloom;if(!this.on)return;const pr=Math.min(window.devicePixelRatio||1,q.dpr);const w=Math.floor(W*pr),h=Math.floor(H*pr);if(this.rt)this.rt.dispose(),this.b1.dispose(),this.b2.dispose();
  this.rt=new T.WebGLRenderTarget(w,h,{depthBuffer:true,samples:QUAL==='high'?2:0});this.b1=new T.WebGLRenderTarget(w>>2,h>>2);this.b2=new T.WebGLRenderTarget(w>>2,h>>2);this.mBlur.uniforms.res.value.set(w>>2,h>>2);},
 render(flash){if(!this.on||!this.rt){R.setRenderTarget(null);R.render(scene,cam);return;}R.setRenderTarget(this.rt);R.render(scene,cam);
  this.quad.material=this.mBright;this.mBright.uniforms.t.value=this.rt.texture;R.setRenderTarget(this.b1);R.render(this.qs,this.oc);
  this.quad.material=this.mBlur;this.mBlur.uniforms.t.value=this.b1.texture;this.mBlur.uniforms.dir.value.set(1,0);R.setRenderTarget(this.b2);R.render(this.qs,this.oc);
  this.mBlur.uniforms.t.value=this.b2.texture;this.mBlur.uniforms.dir.value.set(0,1);R.setRenderTarget(this.b1);R.render(this.qs,this.oc);
  this.quad.material=this.mComp;this.mComp.uniforms.t.value=this.rt.texture;this.mComp.uniforms.b.value=this.b1.texture;this.mComp.uniforms.flash.value=flash||0;R.setRenderTarget(null);R.render(this.qs,this.oc);}};
PF.init();

/* ================= PARTICLES ================= */
const PS={n:0,max:320,mesh:null,p:[],init(){this.max=Q().parts;const g=new T.BoxGeometry(.12,.12,.12);const m=new T.MeshBasicMaterial({color:0xffffff});this.mesh=new T.InstancedMesh(g,m,this.max);this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.castShadow=false;
  this.col=new T.InstancedBufferAttribute(new Float32Array(this.max*3),3);this.mesh.instanceColor=this.col;this.p=[];for(let i=0;i<this.max;i++)this.p.push({life:0});this.d=new T.Object3D();scene.add(this.mesh);this.hideAll();},
 hideAll(){this.d.scale.setScalar(0);this.d.updateMatrix();for(let i=0;i<this.max;i++)this.mesh.setMatrixAt(i,this.d.matrix);this.mesh.instanceMatrix.needsUpdate=true;},
 burst(x,y,z,n,col,o){o=o||{};const c=new T.Color(col);for(let k=0;k<n;k++){const p=this.p[this.n];this.n=(this.n+1)%this.max;const a=rnd(0,6.28),e=rnd(-.3,1),sp=(o.sp||4)*rnd(.4,1.2);
  p.x=x+rnd(-.2,.2);p.y=y+rnd(-.2,.2);p.z=z+rnd(-.2,.2);p.vx=Math.cos(a)*sp*(1-Math.abs(e)*.5);p.vz=Math.sin(a)*sp*(1-Math.abs(e)*.5);p.vy=(o.up||3)*rnd(.3,1.3)+e;p.life=p.ml=(o.life||.6)*rnd(.6,1.3);p.s=(o.s||1)*rnd(.6,1.4);p.g=o.g===undefined?12:o.g;p.r=c.r;p.gc=c.g;p.b=c.b;p.spin=rnd(0,6);}},
 update(dt){const d=this.d;let any=false;for(let i=0;i<this.max;i++){const p=this.p[i];if(p.life<=0){if(p.shown){d.scale.setScalar(0);d.updateMatrix();this.mesh.setMatrixAt(i,d.matrix);p.shown=false;any=true;}continue;}
  p.life-=dt;p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const gy=gY(p.x,p.z);if(p.y<gy+.05){p.y=gy+.05;p.vy*=-.3;p.vx*=.6;p.vz*=.6;}
  const f=clamp(p.life/p.ml,0,1);d.position.set(p.x,p.y,p.z);d.rotation.set(p.spin+p.life*5,p.spin,0);d.scale.setScalar(p.s*f);d.updateMatrix();this.mesh.setMatrixAt(i,d.matrix);this.col.setXYZ(i,p.r,p.gc,p.b);p.shown=true;any=true;}
  if(any){this.mesh.instanceMatrix.needsUpdate=true;this.col.needsUpdate=true;}}};
PS.init();

/* ================= WEAPON TRAIL ================= */
class Trail{constructor(col,n=14){this.n=n;this.pts=[];const g=new T.BufferGeometry();this.pos=new Float32Array(n*2*3);this.al=new Float32Array(n*2);g.setAttribute('position',new T.BufferAttribute(this.pos,3));g.setAttribute('aA',new T.BufferAttribute(this.al,1));
 const idx=[];for(let i=0;i<n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}g.setIndex(idx);
 this.m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{col:{value:new T.Color(col)}},vertexShader:`attribute float aA;varying float vA;void main(){vA=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 col;varying float vA;void main(){gl_FragColor=vec4(col+vec3(.3)*vA,vA*.85);}`,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));this.m.frustumCulled=false;this.m.castShadow=false;this.active=false;scene.add(this.m);this.fade=0;}
 setColor(c){this.m.material.uniforms.col.value.setHex(c);}
 push(a,b){this.pts.unshift([a.clone(),b.clone()]);if(this.pts.length>this.n)this.pts.pop();this.active=true;this.fade=1;}
 update(dt){if(!this.active)return;if(this.pts.length&&this.fade<1)this.pts.pop();this.fade=Math.max(0,this.fade-dt*3);const L=this.pts.length;
  for(let i=0;i<this.n;i++){const p=this.pts[Math.min(i,L-1)]||[new T.Vector3(),new T.Vector3()];this.pos.set([p[0].x,p[0].y,p[0].z,p[1].x,p[1].y,p[1].z],i*6);const a=L?(1-i/L)*this.fade:0;this.al[i*2]=a;this.al[i*2+1]=a;}
  this.m.geometry.attributes.position.needsUpdate=true;this.m.geometry.attributes.aA.needsUpdate=true;if(!L){this.active=false;}}
 end(){this.fade=.99;}}
/* ================= EQUIPMENT MODELS ================= */
function rarMat(rar,ref,extra){const col=RCOL[rar];const em=new T.Color(rar===3?0x7a0000:rar===2?0x3a2400:0x000000);if(ref>=4)em.lerp(new T.Color(col),Math.min(.7,(ref-3)*.1));
 return mat(col,Object.assign({metalness:rar>=1?.8:.4,roughness:rar>=1?.25:.5,emissive:em},extra||{}));}
function buildWeapon(wt,it){
 const g=new T.Group();const t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref),dark=mat(0x3a2a20),acc=mat(t>=2?0xd8a93a:0x8a8a8a,{metalness:.7,roughness:.3});const gem=basic(RCOL[it.rar]);
 if(wt==='sword'){const L=.95+t*.14,w=.11+t*.025;g.add(mesh(CYL(.04,.045,.24,6),dark,0,-.02,0));g.add(mesh(BOX(.36+t*.05,.07,.09),acc,0,.12,0));
  g.add(mesh(BOX(w,L,.035),M,0,.15+L/2,0));const tip=mesh(CONE(w*.72,.22,4),M,0,.15+L+.11,0);tip.rotation.y=Math.PI/4;g.add(tip);
  if(t>=3)g.add(mesh(OCT(.07),gem,0,.12,.06));if(t>=4){g.add(mesh(BOX(.1,.3,.05),acc,.24,.22,0));g.add(mesh(BOX(.1,.3,.05),acc,-.24,.22,0));}if(t>=5){g.add(mesh(BOX(.03,L*.8,.05),gem,0,.15+L/2,0));}g.userData.tip=.15+L+.2;}
 else if(wt==='katar'){const L=.5+t*.08;g.add(mesh(BOX(.2,.12,.08),dark,0,0,0));g.add(mesh(BOX(.1+t*.015,L,.035),M,0,.06+L/2,0));const tp=mesh(CONE(.075,.18,4),M,0,.06+L+.09,0);tp.rotation.y=Math.PI/4;g.add(tp);if(t>=2)g.add(mesh(BOX(.04,L*.7,.03),M,.1,.06+L*.35,0));if(t>=3)g.add(mesh(OCT(.05),gem,0,.03,.05));g.userData.tip=.06+L+.15;}
 else if(wt==='mace'){g.add(mesh(CYL(.035,.04,.75,6),dark,0,.2,0));const hs=.14+t*.025;g.add(mesh(t>=2?DOD(hs):ICO(hs),M,0,.62,0));if(t>=2)for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const c=mesh(CONE(.05,.16+t*.02,4),M,Math.cos(a)*hs,.62,Math.sin(a)*hs);c.rotation.z=-Math.PI/2;c.rotation.y=-a;g.add(c);}if(t>=3)g.add(mesh(OCT(.07),gem,0,.62+hs+.05,0));g.userData.tip=.85;}
 else if(wt==='staff'){const L=1.7+t*.12;g.add(mesh(CYL(.035,.045,L,6),mat(t>=3?0x3a3a5a:0x6b4a2a),0,L/2-.6,0));const orb=mesh(SPH(.12+t*.02,10,8),basic(RCOL[it.rar]),0,L-.45,0);g.add(orb);g.add(glowSprite(RCOL[it.rar],.7+t*.1).translateY(L-.45));
  if(t>=1)g.add(mesh(TOR(.17+t*.02,.02),acc,0,L-.45,0));if(t>=3){const c=mesh(TOR(.25,.025,Math.PI),M,0,L-.4,0);g.add(c);}g.userData.tip=L-.45;}
 else if(wt==='yoyo'){const r=.17+t*.014;const dk=geo('yoD'+t,()=>new T.CylinderGeometry(r,r*.78,.05,16));[-1,1].forEach(s=>{const d=mesh(dk,M,s*.04,0,0);d.rotation.z=s*Math.PI/2;g.add(d);g.add(mesh(SPH(.05,8,6),t>=3?gem:acc,s*.075,0,0));});g.add(mesh(CYL(.03,.03,.1,6),dark,0,0,0).rotateZ(Math.PI/2));
  if(t>=1){const rim=mesh(TOR(r,.016),acc,0,0,0);rim.rotation.y=Math.PI/2;g.add(rim);}if(t>=2)for(let i=0;i<(t>=4?8:4);i++){const a=i/(t>=4?8:4)*6.283;const b=mesh(CONE(.035,.13+t*.012,4),M,0,Math.cos(a)*(r+.05),Math.sin(a)*(r+.05));b.rotation.x=a;g.add(b);}g.userData.tip=r+.1;g.userData.yoyo=1;}
 else if(wt==='bow'){const r=.6+t*.05;const arc=mesh(TOR(r,.04+t*.005,Math.PI*1.1),M,0,0,0);arc.rotation.z=-Math.PI*.55;g.add(arc);g.add(mesh(BOX(.012,r*1.95,.012),basic(0xeeeeee),-.05,0,0));g.add(mesh(BOX(.08,.22,.08),dark,r*.05,0,0));if(t>=2){g.add(mesh(OCT(.07),gem,r*.95,0,0));}if(t>=4){g.add(mesh(CONE(.06,.3,4),M,r*.3,r*.9,0));g.add(mesh(CONE(.06,.3,4),M,r*.3,-r*.9,0));}g.rotation.y=Math.PI/2;g.userData.tip=0;}
 else if(wt==='axe'){const L=.9+t*.08;g.add(mesh(CYL(.04,.045,L,6),dark,0,L/2-.15,0));if(t<2){const b=mesh(BOX(.05,.36+t*.05,.38),M,0,L-.3,.18);g.add(b);g.add(mesh(BOX(.05,.12,.12),M,0,L-.3,-.06));}
  else{g.add(mesh(BOX(.34+t*.04,.32+t*.04,.5+t*.05),M,0,L-.25,0));g.add(mesh(BOX(.4+t*.04,.08,.56+t*.05),acc,0,L-.25,0));if(t>=3)g.add(mesh(OCT(.08),gem,0,L-.25,.3+t*.03));}g.userData.tip=L+.1;}
 if(it.rar===3||it.ref>=7||it.tier>=6){const sp=glowSprite(it.tier>=6?0xb04aff:it.rar===3?0xff2020:RCOL[it.rar],it.ref>=15?2.4:it.tier>=6?1.8:1.2);sp.position.y=(g.userData.tip||.5)*.6;sp.material.opacity=.55;g.add(sp);g.userData.aura=sp;}
 return g;}
function buildShield(it){const g=new T.Group(),t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref),acc=mat(t>=2?0xd8a93a:0x7a7a7a,{metalness:.7,roughness:.3});
 if(t<3){const s=.3+t*.05;const d=mesh(CYL(s,s,.08,t>=1?8:10),M,0,0,0);d.rotation.z=Math.PI/2;g.add(d);const r=mesh(TOR(s,.03),acc);r.rotation.y=Math.PI/2;g.add(r);g.add(mesh(SPH(.08,6,5),acc,-.06,0,0));}
 else{g.add(mesh(BOX(.08,.8+t*.05,.55),M,0,0,0));g.add(mesh(BOX(.1,.85+t*.05,.1),acc,-.01,0,0));g.add(mesh(BOX(.1,.1,.6),acc,-.01,.1,0));if(t>=4)g.add(mesh(OCT(.08),basic(RCOL[it.rar]),-.07,.1,0));}return g;}
/* Lower headgear: masks, visors and mufflers over the lower face. Sized to sit
   just proud of the head sphere (radius .4, front at +z) so it reads from outside
   rather than disappearing inside the skull. */
function buildLowerHead(it){
 const g=new T.Group(),t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref),acc=mat(t>=2?0xd8a93a:0x8a8a8a,{metalness:.7,roughness:.3});
 if(t===0){g.add(mesh(BOX(.34,.18,.08),M,0,-.12,.3));}
 else if(t===1){g.add(mesh(BOX(.46,.11,.06),M,0,.05,.33));g.add(mesh(BOX(.1,.07,.05),acc,0,.05,.36));}
 else{
  const m=mesh(SPH(.29,14,12),M,0,-.1,.14);m.scale.set(1.08,.66,1.0);g.add(m);
  const r=mesh(TOR(.27,.024),acc,0,.03,.1);r.rotation.x=Math.PI/2;g.add(r);
  if(t>=3)g.add(mesh(OCT(.055),basic(RCOL[it.rar]),0,-.12,.36));
  if(t>=4)[-1,1].forEach(sd=>{const sp=mesh(CONE(.04,.16,6),M,sd*.25,-.02,.1);sp.rotation.z=sd*-.7;g.add(sp);});
  if(t>=5){const gs=glowSprite(RCOL[it.rar],.6);gs.position.set(0,-.06,.3);g.add(gs);}
 }
 return g;
}
/* Footgear. Layers over the foot the rig already builds (a squashed sphere on the
   knee group at y -.37), adding a sole and a shin cuff rather than replacing it. */
function buildBoots(it){
 const g=new T.Group(),t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref),acc=mat(t>=2?0xd8a93a:0x8a8a8a,{metalness:.7,roughness:.3});
 g.add(mesh(BOX(.21,.05,.32),M,0,-.44,.05));
 g.add(mesh(CYL(.105,.125,.17,12),M,0,-.24,0));
 if(t>=1){const r=mesh(TOR(.108,.018),acc,0,-.16,0);r.rotation.x=Math.PI/2;g.add(r);}
 if(t>=2)g.add(mesh(BOX(.18,.15,.07),M,0,-.31,.11));
 if(t>=3)g.add(mesh(OCT(.045),basic(RCOL[it.rar]),0,-.23,.11));
 if(t>=4)[-1,1].forEach(sd=>{const sp=mesh(CONE(.035,.13,5),M,sd*.07,-.2,-.07);sp.rotation.x=-2.2;g.add(sp);});
 if(t>=5){const gs=glowSprite(RCOL[it.rar],.5);gs.position.set(0,-.38,.05);g.add(gs);}
 return g;
}
function buildHelm(it){const g=new T.Group(),t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref);
 if(t===0){const b=mesh(TOR(.43,.06),M,0,.13,0);b.rotation.x=Math.PI/2;g.add(b);g.add(mesh(BOX(.12,.16,.08),M,0,.12,-.45));}
 else if(t===1){g.add(mesh(HEMI(.47),M,0,.02,0));g.add(mesh(BOX(.06,.3,.06),M,0,.05,.44));}
 else if(t===2){g.add(mesh(HEMI(.48),M,0,.02,0));[-1,1].forEach(s=>{const h=mesh(CONE(.08,.5,6),mat(0xf0e8d8),s*.42,.25,0);h.rotation.z=-s*1.0;g.add(h);});}
 else if(t===3){g.add(mesh(CYL(.4,.37,.2,8),M,0,.32,0));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.add(mesh(CONE(.06,.25,4),M,Math.sin(a)*.38,.52,Math.cos(a)*.38));}g.add(mesh(OCT(.07),basic(RCOL[it.rar]),0,.32,.4));}
 else{g.add(mesh(SPH(.5,10,8),M,0,.02,-.02));g.add(mesh(BOX(.62,.08,.1),basic(RCOL[it.rar]===0xc8c8c8?0x9a6aff:RCOL[it.rar]),0,0,.44));[-1,1].forEach(s=>{const h=mesh(CONE(.1,.7,6),mat(t>=5?0x3a1a5a:0x2a2030),s*.48,.45,0);h.rotation.z=-s*.6;g.add(h);});}return g;}
function tatter(w,h,n,m,seed){const g=new T.Group();let r=seed||7;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280;};
 for(let i=0;i<n;i++){const hh=h*(.72+rnd()*.28),x=-w/2+w*(i+.5)/n;const st=mesh(BOX(w/n*1.08,hh,.03),m,x,-hh/2,(rnd()-.5)*.02);st.rotation.z=(rnd()-.5)*.06;g.add(st);
  const tip=mesh(CONE(w/n*.55,.12,3),m,x,-hh-.05,0);tip.rotation.z=Math.PI;tip.scale.z=.2;g.add(tip);}return g;}
function buildArmor(it,robe){const g=new T.Group(),t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref);
 if(t>=1||it.rar>=1){const cu=mesh(SPH(.3,14,10),M,0,.5,.03);cu.scale.set(1.02,1.25,.72);g.add(cu);const pl=mesh(SPH(.24,12,8),M,0,.22,.05);pl.scale.set(1.05,.6,.8);g.add(pl);
  for(let i=0;i<3;i++){const ln=mesh(TOR(.24-i*.01,.012),M,0,.32+i*.09,.03);ln.rotation.x=Math.PI/2;ln.scale.y=.72;g.add(ln);}}
 if(t>=2)[-1,1].forEach(s=>{for(let k=0;k<(t>=4?3:2);k++){const p=mesh(SPH(.17-k*.02+t*.01,10,8),M,s*(.37+k*.02),.74-k*.09,0);p.scale.set(1.1,.55,1.05);p.rotation.z=-s*.35;g.add(p);}
  if(t>=4){const sp=mesh(CONE(.045,.22,5),M,s*.42,.88,0);sp.rotation.z=-s*.4;g.add(sp);}});
 if(t>=3){const cg=new T.Group();cg.position.set(0,.76,-.2);cg.add(tatter(.66,1.25,7,mat(it.rar===3?0x5a0a0a:it.rar===2?0x5a4410:t>=5?0x24102e:0x2a2238,{roughness:.95}),t*13));g.add(cg);g.userData.cape=cg;}return g;}

/* ================= HERO RIG ================= */
function buildHero(hk,ck,eqv,opt){opt=opt||{};
 const C=CLASSES[ck],H0=HEROES[hk],cu=opt.cust||{};const Hh={hair:cu.hair!=null?cu.hair:H0.hair,style:cu.style||H0.style};const dark=opt.dark;
 const root=new T.Group(),pivot=grp(0,.9,0),body=grp(0,-.9,0);root.add(pivot);pivot.add(body);
 const mk=(c,o)=>dark?mat(0x1a1026,Object.assign({emissive:0x4a1a8a,emissiveIntensity:.6},o||{})):mat(c,o);
 const skin=mk(cu.skin!=null?cu.skin:0xf2c8a0),cloth=mk(cu.outfit!=null?cu.outfit:C.col),cloth2=mk(C.col2),boot=mk(0x3a2a20),hair=mk(Hh.hair),eyeM=basic(dark?0xd06aff:0x1a1010),white=basic(0xffffff);
 const SPP=(r,a,b,p0,p1,t0,t1)=>geo(`sp${r}_${t1}`,()=>new T.SphereGeometry(r,a,b,p0,p1,t0,t1));const CYO=(a,b,h,n)=>geo(`co${a}_${b}_${h}`,()=>new T.CylinderGeometry(a,b,h,n,1,true));
 // ---- Elden-Ring style: realistic proportions, muted weathered palette, layered gear ----
 const mute=(c,ks=.55,kl=.72)=>{const o=new T.Color(c),h={};o.getHSL(h);o.setHSL(h.h,h.s*ks,h.l*kl);return o.getHex();};
 const cl1=mk(mute(cu.outfit!=null?cu.outfit:C.col),{roughness:.92}),cl2=mk(mute(C.col2,.5,.8),{roughness:.95});
 const lim=(g,r1,r2,len,m,y0)=>{g.add(mesh(CYL(r1,r2,len,10),m,0,y0-len/2,0));g.add(mesh(SPH(r2*1.02,10,8),m,0,y0-len,0));return g;};
 const gold=mk(0xb08a3a,{metalness:.45,roughness:.5,emissive:0x1a1000}),steel=mk(0x8a9098,{metalness:.55,roughness:.45}),dsteel=mk(0x4a4e56,{metalness:.5,roughness:.55}),
  leather=mk(0x4a3424,{roughness:.9}),dkl=mk(0x241a14,{roughness:.9}),fur=mk(0x4a3c32,{roughness:1}),cream=mk(0xc8bea4,{roughness:.95}),shade=basic(0x07060a);
 const K=ck==='knight',A=ck==='assassin',P=ck==='priest',W=ck==='wizard',R=ck==='archer',Sm=ck==='smith',J=ck==='acrobat';
 const legM=K?steel:cl2;
 const legs=[],knees=[];[-1,1].forEach(s=>{const l=grp(s*.13,.82,0);lim(l,.11,.085,.4,cl2,0);const k=grp(0,-.39,0);lim(k,.085,.07,.36,cl2,0);
  if(K){k.add(mesh(CYL(.1,.085,.3,10),steel,0,-.17,.01));k.add(mesh(SPH(.085,8,6),steel,0,0,.06));const kp=mesh(CONE(.05,.1,5),steel,0,.02,.12);kp.rotation.x=1.4;k.add(kp);}
  else{for(let i=0;i<4;i++){const w=mesh(TOR(.083-i*.003,.012),leather,0,-.1-i*.06,0);w.rotation.x=Math.PI/2;k.add(w);}}
  const bt=mesh(SPH(.11,10,8),K?dsteel:dkl,0,-.37,.045);bt.scale.set(.9,.6,1.55);k.add(bt);k.add(mesh(CYL(.09,.1,.14,10),K?dsteel:dkl,0,-.3,0));
  l.add(k);body.add(l);legs.push(l);knees.push(k);});
 const torso=grp(0,.82,0);body.add(torso);
 const hip=mesh(CYL(.23,.25,.2,12),cl2,0,.04,0);hip.scale.z=.72;torso.add(hip);
 const chest=mesh(CYL(.29,.2,.62,12),cl1,0,.44,0);chest.scale.z=.62;torso.add(chest);
 const sh=mesh(SPH(.29,12,8),cl1,0,.72,0);sh.scale.set(1.05,.38,.62);torso.add(sh);
 torso.add(mesh(CYL(.065,.075,.14,8),skin,0,.86,0));
 const belt=mesh(CYL(.245,.245,.07,12),dkl,0,.14,0);belt.scale.z=.74;torso.add(belt);torso.add(mesh(BOX(.08,.07,.03),gold,0,.14,.19));
 // skirts / tassets
 if(C.robe){const sk=mesh(CYL(.25,.46,.86,12),cl1,0,-.32,0);sk.scale.z=.78;torso.add(sk);const hem=mesh(CYL(.465,.465,.05,12),P?gold:cl2,0,-.73,0);hem.scale.z=.78;torso.add(hem);}
 else if(K){const cm=mesh(CYO(.25,.32,.34,14),dsteel,0,-.1,0);cm.scale.z=.78;torso.add(cm);[-1,1].forEach(s=>{const ts=mesh(BOX(.2,.26,.03),steel,s*.14,-.06,.19);ts.rotation.z=s*.12;ts.rotation.x=-.12;torso.add(ts);});}
 else{const fl=tatter(.3,.42,3,cl1,5);fl.position.set(0,.1,.2);torso.add(fl);const fb=tatter(.36,.48,4,cl1,9);fb.position.set(0,.1,-.19);torso.add(fb);}
 // fur / cloth mantle on shoulders
 const collar=(m,n,r)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const c=mesh(CONE(.07,.2,4),m,Math.sin(a)*r,.8,Math.cos(a)*r*.75);c.rotation.x=Math.cos(a)*.9;c.rotation.z=-Math.sin(a)*.9;torso.add(c);}};
 // ---- class outfits ----
 if(K){const bp=mesh(SPH(.27,14,10),steel,0,.47,.05);bp.scale.set(1.05,1.2,.66);torso.add(bp);torso.add(mesh(BOX(.03,.4,.03),dsteel,0,.48,.23));
  const tab=tatter(.26,.6,2,mk(0x5a1a1a,{roughness:.95}),3);tab.position.set(0,.18,.21);torso.add(tab);torso.add(mesh(ICO(.045),gold,0,.12,.22));
  if(!(eqv.a&&eqv.a.tier>=3)){const cg=grp(0,.76,-.19);cg.add(tatter(.62,1.25,6,mk(0x4a1414,{roughness:.95}),11));torso.add(cg);root.userData.capeG=cg;}}
 if(A){collar(cl2,10,.2);const cg=grp(0,.76,-.18);cg.add(tatter(.5,1.05,6,cl2,17));torso.add(cg);root.userData.capeG=cg;
  [-1,1].forEach(s=>{const st=mesh(BOX(.04,.66,.02),leather,s*.09,.44,.19);st.rotation.z=s*.55;torso.add(st);});
  [-1,1].forEach(s=>{const dg=mesh(BOX(.035,.24,.04),dsteel,s*.24,.06,.06);dg.rotation.z=s*.35;torso.add(dg);torso.add(mesh(BOX(.06,.03,.05),gold,s*.21,.17,.06));});}
 if(P){[-1,1].forEach(s=>torso.add(mesh(BOX(.06,1.3,.02),gold,s*.1,-.05,.19)));const sun=grp(0,.5,.21);sun.add(mesh(TOR(.06,.012),gold));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const ry=mesh(BOX(.012,.05,.01),gold,Math.sin(a)*.09,Math.cos(a)*.09,0);ry.rotation.z=-a;sun.add(ry);}torso.add(sun);
  const bd=mesh(TOR(.2,.014),mk(0x6a4a2a),0,.62,.03);bd.rotation.x=1.25;torso.add(bd);const cg=grp(0,.76,-.18);cg.add(tatter(.56,1.3,5,cream,23));torso.add(cg);root.userData.capeG=cg;}
 if(W){const col=mesh(CYO(.2,.3,.26,12),cl2,0,.86,-.03);col.scale.z=.8;torso.add(col);const sash=tatter(.12,.9,1,mk(0x2a3a6a),2);sash.position.set(.08,.15,.2);torso.add(sash);
  const bk=mesh(BOX(.15,.2,.06),mk(0x3a2216),.24,.06,.1);torso.add(bk);torso.add(mesh(ICO(.035),basic(0x7fb8ff),.24,.08,.135));
  const cg=grp(0,.76,-.17);cg.add(tatter(.58,1.45,6,cl2,29));torso.add(cg);root.userData.capeG=cg;}
 if(R){const vest=mesh(CYL(.3,.23,.5,12),leather,0,.44,0);vest.scale.z=.66;torso.add(vest);collar(cl1,9,.2);
  const q=grp(.15,.55,-.23);q.rotation.z=-.35;q.add(mesh(CYL(.07,.06,.6,8),dkl));for(let i=0;i<5;i++){q.add(mesh(CYL(.008,.008,.3,4),mk(0x8a7a5a),(i-2)*.025,.42,0));const fl=mesh(BOX(.01,.08,.03),mk(0x6a2a1a),(i-2)*.025,.58,0);q.add(fl);}torso.add(q);
  const cg=grp(0,.76,-.2);cg.add(tatter(.6,1.15,6,cl1,31));torso.add(cg);root.userData.capeG=cg;}
 if(J){const jr=mk(0x8a2040,{roughness:.9}),jb=mk(0x1c1a2c,{roughness:.9});for(let r=0;r<3;r++)for(let c=0;c<3;c++){const d=mesh(BOX(.11,.11,.02),(r+c)%2?jr:jb,(c-1)*.13,.3+r*.14,.185+(c===1?.012:0));d.rotation.z=Math.PI/4;torso.add(d);}
  collar(cream,11,.19);[-1,1].forEach(s=>{const st=mesh(BOX(.035,.62,.02),dkl,s*.1,.44,.2);st.rotation.z=s*.5;torso.add(st);torso.add(mesh(BOX(.1,.12,.07),leather,s*.24,.06,.08));});
  const cg=grp(0,.76,-.18);cg.add(tatter(.5,.8,5,jr,41));torso.add(cg);root.userData.capeG=cg;for(let i=0;i<4;i++)torso.add(mesh(SPH(.035,6,5),gold,-.18+i*.12,.04,.2));}
 if(Sm){const ap=tatter(.4,.78,2,leather,4);ap.position.set(0,.55,.2);torso.add(ap);torso.add(mesh(BOX(.42,.05,.03),dkl,0,.55,.2));collar(fur,12,.22);
  [-1,1].forEach(s=>{const st=mesh(BOX(.04,.4,.02),dkl,s*.16,.62,.17);st.rotation.z=s*.25;torso.add(st);});for(let i=0;i<3;i++)torso.add(mesh(BOX(.04,.12,.04),steel,-.2+i*.07,.06,.19));
  const hm=grp(.26,.05,.05);hm.rotation.z=.2;hm.add(mesh(CYL(.015,.015,.3,5),leather,0,-.1,0));hm.add(mesh(BOX(.12,.07,.07),dsteel,0,.05,0));torso.add(hm);}
 // ---- head (smaller, realistic face) ----
 const head=grp(0,1.08,0);head.scale.setScalar(.62);torso.add(head);const sk0=mesh(SPH(.4,16,14),skin);sk0.scale.set(.92,1.08,.98);head.add(sk0);
 const jaw=mesh(SPH(.3,12,10),skin,0,-.17,.06);jaw.scale.set(.95,.85,.95);head.add(jaw);head.add(mesh(CONE(.06,.14,4),skin,0,-.04,.4).rotateX(Math.PI/2));
 [-1,1].forEach(s=>{head.add(mesh(SPH(.045,8,6),dark?basic(0xd06aff):basic(0x1a1210),s*.14,.0,.35));const br=mesh(BOX(.15,.035,.05),hair,s*.14,.08,.36);br.rotation.z=-s*.1;head.add(br);head.add(mesh(SPH(.07,6,5),skin,s*.37,-.03,0));});
 head.add(mesh(BOX(.12,.02,.02),mk(0x7a4a40),0,-.22,.35));
 const helmed=!!eqv.h||K||A||P||R||J;
 if(!helmed||Sm||W){
 if(Hh.style==='spiky'){head.add(mesh(HEMI(.43),hair,0,.03,-.03));for(let i=0;i<7;i++){const a=(i/7)*Math.PI*1.6-Math.PI*.3;const c=mesh(CONE(.1,.32,5),hair,Math.sin(a)*.24,.28,Math.cos(a)*.18-.12);c.rotation.x=-Math.cos(a)*.6-.5;c.rotation.z=-Math.sin(a)*.6;head.add(c);}}
 else if(Hh.style==='short'){head.add(mesh(HEMI(.435),hair,0,.04,-.02));const bk=mesh(SPH(.4,10,8),hair,0,-.02,-.1);bk.scale.set(1,.95,.9);head.add(bk);}
 else{head.add(mesh(HEMI(.445),hair,0,.03,-.02));const hb=mesh(geo('hairbk',()=>new T.CylinderGeometry(.38,.44,.95,12,1,true,Math.PI*.55,Math.PI*.9)),hair,0,-.3,-.04);hb.material=hb.material.clone();hb.material.side=T.DoubleSide;head.add(hb);root.userData.hairBack=hb;}}
 // class headgear when no helmet item
 const hood=(m,deep)=>{const h=mesh(SPP(.5,14,10,0,Math.PI*2,0,Math.PI*.58),m,0,.05,-.07);h.rotation.x=-.3;head.add(h);const sd=mesh(SPH(.36,12,8),shade,0,.02,.12);sd.scale.set(.95,.95,.6);if(deep)head.add(sd);
  const dr=mesh(CYO(.42,.62,.5,12),m,0,-.42,-.05);head.add(dr);};
 if(!eqv.h){
  if(K){const hm=mesh(SPH(.47,14,12),steel,0,.03,0);hm.scale.set(.95,1.12,1.02);head.add(hm);head.add(mesh(BOX(.5,.04,.1),shade,0,.02,.42));head.add(mesh(BOX(.04,.2,.06),shade,0,-.14,.45));
   head.add(mesh(BOX(.05,.5,.62),dsteel,0,.3,0));}
  else if(A){hood(cl2,true);const mask=mesh(SPH(.34,12,8),mk(0x16121a),0,-.18,.1);mask.scale.set(1.05,.5,.95);head.add(mask);}
  else if(P){hood(cream,false);const ci=mesh(TOR(.4,.03),gold,0,.15,.05);ci.rotation.x=1.3;head.add(ci);}
  else if(R){hood(cl1,true);const sc=mesh(SPH(.33,12,8),cl2,0,-.2,.1);sc.scale.set(1.05,.45,.95);head.add(sc);}
  else if(W){const hat=grp(0,.3,0);hat.rotation.z=.08;const br=mesh(CYL(.85,.85,.03,18),cl2,0,0,0);hat.add(br);const c1=mesh(CYL(.2,.38,.45,12),cl2,0,.24,0);hat.add(c1);const c2=mesh(CONE(.2,.6,10),cl2,.08,.72,-.06);c2.rotation.z=-.35;c2.rotation.x=-.2;hat.add(c2);
   hat.add(mesh(CYL(.385,.385,.07,14),gold,0,.06,0));for(let i=0;i<5;i++){const a=i/5*Math.PI*2;hat.add(mesh(OCT(.03),basic(0x9fcfff),Math.sin(a)*.6,.03,Math.cos(a)*.6));}head.add(hat);}
  else if(J){const jr=mk(0x8a2040,{roughness:.9}),jb=mk(0x1c1a2c,{roughness:.9});const cw=mesh(SPP(.47,14,10,0,Math.PI*2,0,Math.PI*.6),jb,0,.05,-.03);cw.rotation.x=-.2;head.add(cw);
   [-1,1].forEach(s=>{const hn=grp(s*.26,.34,-.05);hn.rotation.z=-s*.75;const c1=mesh(CYL(.1,.16,.4,8),s>0?jr:jb,0,.18,0);hn.add(c1);const c2=mesh(CONE(.1,.42,8),s>0?jr:jb,s*.07,.52,0);c2.rotation.z=-s*.9;hn.add(c2);hn.add(mesh(SPH(.06,8,6),gold,s*.34,.56,0));head.add(hn);});
   const mask=mesh(SPH(.36,14,10),mk(0xd8d0c0,{roughness:.6}),0,-.03,.07);mask.scale.set(.95,1.05,.9);head.add(mask);[-1,1].forEach(s=>{const e=mesh(SPH(.06,8,6),shade,s*.13,.01,.38);e.scale.set(1.3,.55,.5);e.rotation.z=s*.35;head.add(e);head.add(mesh(BOX(.03,.14,.02),mk(0x8a2040),s*.13,-.12,.39));});const gr=mesh(TOR(.1,.014,Math.PI),shade,0,-.17,.37);gr.rotation.z=Math.PI;head.add(gr);
   const rf=mesh(TOR(.3,.07),cream,0,-.36,.02);rf.rotation.x=Math.PI/2;head.add(rf);}
  else if(Sm){const band=mesh(TOR(.41,.04),leather,0,.17,0);band.rotation.x=Math.PI/2;head.add(band);[-1,1].forEach(s=>{const g=mesh(CYL(.08,.08,.07,10),dsteel,s*.13,.26,.36);g.rotation.x=Math.PI/2-.4;head.add(g);const ln=mesh(CYL(.06,.06,.075,10),basic(0xd89a3a),s*.13,.26,.37);ln.rotation.x=Math.PI/2-.4;head.add(ln);});}}
 // ---- arms ----
 const arms=[],fores=[],hands=[];[-1,1].forEach(s=>{const a=grp(s*.34,.72,0);
  a.add(mesh(SPH(.11,10,8),K?steel:cl1,0,0,0));lim(a,.085,.07,.32,cl1,-.02);
  if(K){for(let k=0;k<3;k++){const pd=mesh(SPP(.17-k*.015,10,8,0,Math.PI*2,0,Math.PI*.55),steel,s*.02*k,.06-k*.07,0);pd.scale.set(1.05,.8,1);pd.rotation.z=-s*.25;a.add(pd);}a.add(mesh(TOR(.15,.015),gold,0,.07,0).rotateX(Math.PI/2));}
  if(Sm||R){const fp=mesh(SPH(.15,8,6),Sm?fur:leather,0,.04,0);fp.scale.set(1.1,.7,1);a.add(fp);}
  if(C.robe){const sl=mesh(CYO(.09,.2,.38,10),cl1,0,-.44,0);a.add(sl);}
  const f=grp(0,-.35,0);lim(f,.07,.06,.3,Sm?skin:cl1,0);
  if(K){f.add(mesh(CYL(.08,.085,.22,10),steel,0,-.18,0));f.add(mesh(SPH(.08,8,6),steel,0,0,-.04));}
  else if(A||R||J){f.add(mesh(CYL(.075,.08,.18,10),leather,0,-.2,0));}
  else if(Sm){f.add(mesh(CYL(.1,.11,.16,10),leather,0,-.26,0));}
  const hd=mesh(SPH(.07,10,8),K?dsteel:(Sm||A||R)?dkl:skin,0,-.33,0);hd.scale.set(1,1.15,.9);f.add(hd);
  const hg=grp(0,-.35,.02);f.add(hg);a.add(f);torso.add(a);arms.push(a);fores.push(f);hands.push(hg);});
 const M={root,pivot,body,torso,head,legL:legs[0],legR:legs[1],kneeL:knees[0],kneeR:knees[1],armL:arms[0],armR:arms[1],foreL:fores[0],foreR:fores[1],handL:hands[0],handR:hands[1],cls:ck,eqG:{}};
 if(eqv.w){if(C.wt==='katar'){const a=buildWeapon('katar',eqv.w),b=buildWeapon('katar',eqv.w);a.rotation.x=Math.PI/2;b.rotation.x=Math.PI/2;M.handR.add(a);M.handL.add(b);M.eqG.w=a;M.eqG.w2=b;}
  else if(C.wt==='yoyo'){const a=buildWeapon('yoyo',eqv.w),b=buildWeapon('yoyo',eqv.w);a.position.y=-.1;b.position.y=-.1;M.handR.add(a);M.handL.add(b);M.eqG.w=a;M.eqG.w2=b;}
  else if(C.wt==='bow'){const b=buildWeapon('bow',eqv.w);b.position.z=.05;M.handL.add(b);M.eqG.w=b;}
  else{const w=buildWeapon(C.wt,eqv.w);w.rotation.x=C.wt==='staff'?.15:Math.PI/2*.85;M.handR.add(w);M.eqG.w=w;}}
 if(eqv.s&&C.shield){const s=buildShield(eqv.s);s.position.x=-.12;M.handL.add(s);M.eqG.s=s;}
 if(eqv.h)head.add(buildHelm(eqv.h));
 if(eqv.l)head.add(buildLowerHead(eqv.l));
 if(eqv.f)knees.forEach(k=>k.add(buildBoots(eqv.f)));
 if(eqv.a){const ar=buildArmor(eqv.a,C.robe);torso.add(ar);M.cape=ar.userData.cape;}
 if(!M.cape&&root.userData.capeG)M.cape=root.userData.capeG;
 jobDecor(M,ck,opt.job||0,dark);
 addShadow(root,.55);
 const best=[eqv.w,eqv.a,eqv.h,eqv.s,eqv.l,eqv.f].filter(Boolean);const top=best.reduce((m,i)=>Math.max(m,i.rar===3?3:i.ref>=7?2:0),0);
 if(top||dark){const rg=mesh(RING(.7,.95),basic(dark?0x8a2aff:top===3?0xff1010:0xffd76a,{transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide}),0,.05,0);rg.rotation.x=-Math.PI/2;rg.castShadow=false;root.add(rg);M.aura=rg;}
 if(dark){root.add(glowSprite(0x7a2aff,3).translateY(1.2));}
 root.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 return M;}

/* ================= MONSTER MODELS ================= */
function eyes(g,y,z,sep,sz,glow){const m=glow?basic(glow):basic(0x111111);g.add(mesh(SPH(sz,6,5),m,-sep,y,z));g.add(mesh(SPH(sz,6,5),m,sep,y,z));}
function legBox(parent,x,y,z,w,h,m){const l=grp(x,y,z);l.add(mesh(BOX(w,h,w),m,0,-h/2,0));parent.add(l);return l;}
function quad(o){const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(o.col),M2=mat(o.col2||new T.Color(o.col).multiplyScalar(.7).getHex());
 const [bw,bh,bl]=o.b,leg=o.leg;body.add(mesh(BOX(bw,bh,bl),M,0,leg+bh/2,0));
 const head=grp(0,leg+bh*.85,bl/2+o.hs*.3);body.add(head);head.add(mesh(BOX(o.hs,o.hs*.9,o.hs),M));if(o.snout)head.add(mesh(BOX(o.hs*.55,o.hs*.45,o.hs*.6),M2,0,-o.hs*.15,o.hs*.7));
 eyes(head,o.hs*.15,o.hs*.51,o.hs*.25,o.hs*.08,o.eye);
 if(o.ears==='cone')[-1,1].forEach(s=>head.add(mesh(CONE(o.hs*.18,o.hs*.45,4),M,s*o.hs*.3,o.hs*.6,-o.hs*.1)));
 if(o.ears==='long')[-1,1].forEach(s=>{const e=mesh(BOX(o.hs*.18,o.hs*1.1,o.hs*.1),M,s*o.hs*.22,o.hs*.9,-o.hs*.1);e.rotation.z=s*.15;head.add(e);});
 if(o.ears==='round')[-1,1].forEach(s=>head.add(mesh(SPH(o.hs*.18,6,5),M,s*o.hs*.38,o.hs*.5,-o.hs*.1)));
 if(o.tusk)[-1,1].forEach(s=>{const t=mesh(CONE(o.hs*.08,o.hs*.45,5),mat(0xf5ecd8),s*o.hs*.25,-o.hs*.1,o.hs*1.0);t.rotation.x=-.6;head.add(t);});
 if(o.crown){const cr=mat(0xffc93a,{metalness:.8,roughness:.3,emissive:0x442200});head.add(mesh(CYL(o.hs*.38,o.hs*.36,o.hs*.2,8),cr,0,o.hs*.55,0));for(let i=0;i<5;i++){const a=i/5*Math.PI*2;head.add(mesh(CONE(o.hs*.07,o.hs*.2,4),cr,Math.sin(a)*o.hs*.35,o.hs*.72,Math.cos(a)*o.hs*.35));}}
 if(o.tail){const t=mesh(BOX(o.tail[0],o.tail[0],o.tail[1]),M,0,leg+bh*.8,-bl/2-o.tail[1]/2);t.rotation.x=.5;body.add(t);}
 if(o.mane)body.add(mesh(BOX(bw*1.1,bh*.6,bl*.35),M2,0,leg+bh*.9,bl*.3));
 const legs=[];const lw=o.lw||bw*.25;[[-1,1],[1,-1],[1,1],[-1,-1]].forEach(([sx,sz])=>legs.push(legBox(body,sx*bw*.32,leg,sz*bl*.32,lw,leg,M2)));
 return {root,body,legs,head};}
function humanoid(o){const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(o.col,o.em?{emissive:o.em,emissiveIntensity:.5}:{}),Sk=mat(o.skin||o.col),D=mat(o.col2||0x222222);const sc=o.scale||1;
 const legs=[legBox(body,-.17,.72,0,.24,.72,o.robe?M:D),legBox(body,.17,.72,0,.24,.72,o.robe?M:D)];
 body.add(mesh(BOX(.72,.82,.44),M,0,1.12,0));if(o.robe)body.add(mesh(CYL(.38,.6,.9,8),M,0,.45,0));
 const head=grp(0,1.82,0);body.add(head);if(o.skull){head.add(mesh(BOX(.5,.55,.5),Sk));head.add(mesh(BOX(.4,.2,.3),Sk,0,-.3,.1));}else head.add(mesh(SPH(.34,10,8),Sk));eyes(head,.03,.28,.12,.06,o.eye);
 if(o.horns)[-1,1].forEach(s=>{const h=mesh(CONE(.08*o.horns,.5*o.horns,6),mat(0x2a2020),s*.25,.38,0);h.rotation.z=-s*.5;head.add(h);});
 if(o.helm){head.add(mesh(SPH(.4,8,6),D,0,.05,0));head.add(mesh(BOX(.5,.14,.2),D,0,-.05,.3));if(o.helm===2)head.add(mesh(BOX(.08,.5,.3),mat(0x8a1a1a),0,.4,0));}
 if(o.hood){const hd=mesh(CONE(.42,.9,7),M,0,.25,0);head.add(hd);}
 if(o.wizhat){head.add(mesh(CYL(.45,.45,.04,10),M,0,.3,0));head.add(mesh(CONE(.3,.9,7),M,0,.7,0));}
 if(o.cap)head.add(mesh(HEMI(.37),D,0,.08,0));
 if(o.wrap){head.add(mesh(BOX(.75,.3,.75),D,0,.2,0));}
 if(o.crown){const cr=mat(0xffc93a,{metalness:.8,emissive:0x442200});head.add(mesh(CYL(.32,.3,.14,8),cr,0,.32,0));for(let i=0;i<5;i++){const a=i/5*Math.PI*2;head.add(mesh(CONE(.05,.16,4),cr,Math.sin(a)*.3,.45,Math.cos(a)*.3));}}
 if(o.nemes){const g=mat(0xffc93a,{metalness:.8,roughness:.3});head.add(mesh(BOX(.62,.3,.56),g,0,.18,-.02));[-1,1].forEach(s=>head.add(mesh(BOX(.16,.6,.3),mat(0x2b4fa0),s*.33,-.2,-.05)));head.add(mesh(CONE(.08,.22,4),g,0,.4,.25));}
 if(o.bandage)for(let i=0;i<5;i++)body.add(mesh(BOX(.75,.05,.47),D,0,.8+i*.17,0));
 if(o.cape){const c=mesh(BOX(.8,1.5,.06),mat(o.cape),0,1.0,-.26);c.rotation.x=.08;body.add(c);}
 if(o.collar)[-1,1].forEach(s=>{const c=mesh(BOX(.06,.4,.3),mat(o.cape||0x111111),s*.3,1.65,-.05);c.rotation.z=s*.3;body.add(c);});
 if(o.pauld)[-1,1].forEach(s=>{const p=mesh(SPH(.25,7,5),mat(o.col2||0x111111,{metalness:.6,roughness:.4}),s*.48,1.5,0);p.scale.set(1.2,.8,1);body.add(p);body.add(mesh(CONE(.07,.35,4),mat(0x111111),s*.52,1.75,0));});
 if(o.wings){[-1,1].forEach(s=>{const w=mesh(BOX(.7,.04,.5),mat(o.col2||0x331111),s*.5,1.5,-.2);w.rotation.y=s*.4;body.add(w);root.userData.wings=root.userData.wings||[];root.userData.wings.push(w);});}
 const arms=[];[-1,1].forEach(s=>{const a=grp(s*.47,1.48,0);a.add(mesh(BOX(.2,.72,.22),o.armSkin?Sk:M,0,-.34,0));body.add(a);arms.push(a);});
 if(o.weapon){const w=new T.Group();w.position.y=-.72;arms[1].add(w);const met=mat(0x9a9aa0,{metalness:.7,roughness:.3});
  if(o.weapon==='club'){w.add(mesh(CYL(.06,.14,1.2,6),mat(0x5a3a22),0,.5,0));for(let i=0;i<4;i++)w.add(mesh(CONE(.05,.15,4),met,Math.sin(i*1.6)*.13,.85,Math.cos(i*1.6)*.13));w.rotation.x=1.1;}
  if(o.weapon==='sword'){w.add(mesh(BOX(.06,.2,.06),mat(0x3a2a20),0,.05,0));w.add(mesh(BOX(.3,.05,.08),met,0,.17,0));w.add(mesh(BOX(.1,.9,.03),met,0,.65,0));w.rotation.x=1.3;}
  if(o.weapon==='great'){w.add(mesh(BOX(.1,.3,.1),mat(0x111111),0,.1,0));w.add(mesh(BOX(.6,.08,.12),mat(0x4a2a6a),0,.28,0));const b=mesh(BOX(.22,2.2,.05),mat(0x2a1a3a,{emissive:0x5a1a9a,metalness:.7,roughness:.3}),0,1.4,0);w.add(b);w.add(glowSprite(0x9a4aff,1.6).translateY(1.4));w.rotation.x=1.2;}
  if(o.weapon==='greatsword'){w.add(mesh(BOX(.1,.3,.1),mat(0x2a2a30),0,.1,0));w.add(mesh(BOX(.7,.08,.14),mat(0xd8a93a,{metalness:.7}),0,.28,0));w.add(mesh(BOX(.26,2.4,.06),met,0,1.5,0));w.rotation.x=1.25;}
  if(o.weapon==='staff'){w.add(mesh(CYL(.04,.04,2.2,6),mat(0xffc93a,{metalness:.8}),0,.6,0));w.add(mesh(TOR(.15,.04),mat(0xffc93a,{metalness:.8}),0,1.8,0));w.add(glowSprite(0x6ad8ff,.8).translateY(1.8));}
  if(o.weapon==='claw'){[-1,0,1].forEach(i=>w.add(mesh(CONE(.03,.3,4),mat(0xdddddd),i*.06,-.1,.05)));}
  if(o.weapon==='bow'){const b=mesh(TOR(.55,.035,Math.PI*1.1),mat(0x6a4a2a));b.rotation.z=-Math.PI*.55;w.add(b);w.add(mesh(BOX(.012,1.05,.012),basic(0xeeeeee),-.05,0,0));w.rotation.x=-1.4;}
  if(o.weapon==='scythe'){w.add(mesh(CYL(.04,.04,2.2,6),mat(0x2a1a2a),0,.6,0));const bl=mesh(BOX(.05,.12,1.2),met,0,1.6,.5);w.add(bl);}}
 if(o.shieldM){const s=new T.Group();s.position.set(-.1,-.5,.1);arms[0].add(s);const sm=mat(o.shieldCol||0x6a5a4a,{metalness:.5,roughness:.4});const d=mesh(BOX(.08,.8,.6),sm);s.add(d);s.add(mesh(BOX(.1,.85,.08),mat(0xd8a93a,{metalness:.7}),-.01,0,0));root.userData.shield=s;}
 if(o.armsFwd)arms.forEach(a=>a.rotation.x=-1.3);
 root.scale.setScalar(sc);return {root,body,legs,arms,head,human:1};}
const MB={
 blob:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const b=mesh(SPH(.6,14,10),mat(d.col,{roughness:.35,emissive:d.em||0,emissiveIntensity:.6}),0,.5,0);b.scale.set(1,.85,1);body.add(b);eyes(body,.58,.5,.18,.07,d.em?0xffffff:0);body.add(mesh(SPH(.09,6,5),basic(0xffffff),-.2,.78,.38));const l=mesh(CONE(.09,.3,4),mat(0x4caf50),0,1.05,0);l.rotation.z=.4;body.add(l);return {root,body,squash:b};},
 bunny:d=>quad({col:d.col,b:[.6,.5,.75],leg:.25,hs:.5,ears:'long',tail:[.18,.18],lw:.14}),
 beetle:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const sh=mesh(SPH(.6,10,8),mat(d.col,{metalness:.5,roughness:.3}),0,.45,0);sh.scale.set(1,.6,1.25);body.add(sh);body.add(mesh(BOX(.04,.4,1.4),basic(0x1a2a10),0,.62,0));const h=grp(0,.4,.75);body.add(h);h.add(mesh(SPH(.28,8,6),mat(0x1a1a1a)));eyes(h,.08,.24,.12,.05,0xffd040);const hr=mesh(CONE(.08,.5,5),mat(0x1a1a1a),0,.25,.2);hr.rotation.x=.7;h.add(hr);
  const legs=[];for(let i=0;i<6;i++){const s=i<3?-1:1,z=(i%3-1)*.4;const l=grp(s*.5,.35,z);const m=mesh(BOX(.5,.06,.06),mat(0x1a1a1a),s*.22,-.12,0);m.rotation.z=s*.5;l.add(m);body.add(l);legs.push(l);}return {root,body,legs,bug:1};},
 mushroom:d=>{const root=new T.Group(),body=new T.Group();root.add(body);body.add(mesh(CYL(.25,.32,.6,8),mat(0xe8dcc0),0,.3,0));body.add(mesh(HEMI(.6),mat(d.col),0,.55,0));for(let i=0;i<6;i++){const a=i/6*Math.PI*2;body.add(mesh(SPH(.08,5,4),basic(0xffffff),Math.sin(a)*.4,.8,Math.cos(a)*.4));}eyes(body,.38,.25,.1,.05);return {root,body,hop:1};},
 wolf:d=>quad({col:d.col,b:[.6,.6,1.3],leg:.55,hs:.55,snout:1,ears:'cone',tail:[.15,.7],eye:0xff4040,mane:1}),
 spider:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col);let lant=null;
  if(d.lantern){// Broodmother: a lantern-like abdomen. Ribbed cage over a glowing sac that lures prey.
   const glow=0x8ad8ff,g=grp(0,.95,-.62);body.add(g);const sac=mesh(SPH(.62,12,10),basic(glow,{transparent:true,opacity:.55}),0,0,0);sac.scale.set(1,1.05,1.15);g.add(sac);
   const core=glowSprite(glow,2.6);g.add(core);const rib=mat(0x2a1a30,{metalness:.3,roughness:.5});
   for(let i=0;i<6;i++){const r=mesh(TOR(.64,.035),rib);r.rotation.y=i/6*Math.PI;r.scale.set(1,1.05,1.15);g.add(r);}
   const cap=mesh(CONE(.3,.32,6),rib,0,.66,0);g.add(cap);const hook=mesh(TOR(.1,.025),rib,0,.86,0);g.add(hook);lant={g,sac,core};}
  else body.add(mesh(SPH(.6,10,8),M,0,.8,-.5));body.add(mesh(SPH(.38,8,6),M,0,.7,.3));for(let i=0;i<6;i++)body.add(mesh(SPH(.05,5,4),basic(0xff2020),(i%3-1)*.1,.85+(i>2?.08:0),.65));
  body.add(mesh(SPH(.15,6,5),mat(0x8a1a1a),0,1.2,-.6));const legs=[];for(let i=0;i<8;i++){const s=i<4?-1:1,z=(i%4)*.22-.3;const l=grp(s*.3,.75,z);const m=mesh(BOX(1.1,.06,.06),M,s*.5,.15,0);m.rotation.z=-s*.5;l.add(m);const m2=mesh(BOX(.06,.8,.06),M,s*.95,-.3,0);l.add(m2);body.add(l);legs.push(l);}
  if(lant)return {root,body,legs,bug:1,lantern:lant,anim:(t,m)=>{const cast=m.state==='cast'||m.state==='windup',p2=m.phase===2;
   const pulse=1+Math.sin(t*(p2?6:2.5))*.12+(cast?.35:0);lant.core.scale.setScalar(2.6*pulse);lant.sac.material.opacity=.45+(cast?.3:0)+Math.sin(t*2.5)*.08;
   const col=p2?0xff7a5a:0x8ad8ff;if(lant.sac.material.color.getHex()!==col){lant.sac.material.color.setHex(col);lant.core.material.color.setHex(col);}
   lant.g.rotation.z=Math.sin(t*1.3)*.08;}};
  return {root,body,legs,bug:1};},
 eggsac:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const shell=basic(0xe8e0c8,{transparent:true,opacity:.85}),web=basic(0xf4f0ff,{transparent:true,opacity:.6});
  const eggs=[[0,.45,0,.5],[.45,.32,.2,.36],[-.4,.3,.25,.38],[.15,.3,-.42,.34],[-.25,.85,-.1,.3]].map(([x,y,z,r])=>{const e=mesh(SPH(r,10,8),shell,x,y,z);e.scale.y=1.2;body.add(e);return e;});
  const inner=glowSprite(0x9affc8,1.6);inner.position.y=.5;body.add(inner);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,w=mesh(BOX(.02,1.3,.02),web,Math.sin(a)*.5,.6,Math.cos(a)*.5);w.rotation.set(Math.cos(a)*.5,0,Math.sin(a)*.5);body.add(w);}
  return {root,body,anim:(t,m)=>{const left=m.hatchT??EGG_HATCH-((G.t-(m.bornT??(m.bornT=G.t)))),near=clamp(1-left/EGG_HATCH,0,1);
   eggs.forEach((e,i)=>{const k=1+Math.sin(t*(3+near*9)+i)*(.03+near*.06);e.scale.set(k,1.2*k,k);});inner.material.opacity=.35+near*.65;body.rotation.z=near>.7?Math.sin(t*30)*.04:0;}};},
 wisp:d=>{const root=new T.Group(),body=grp(0,1.4,0);root.add(body);body.add(mesh(SPH(.32,10,8),basic(d.col)));body.add(glowSprite(d.col,2.4));for(let i=0;i<4;i++){const s=mesh(SPH(.1,6,5),basic(d.col),0,-.3-i*.2,-.2-i*.15);body.add(s);}eyes(body,.05,.28,.1,.05,0x111133);return {root,body,fly:1};},
 soldier:d=>humanoid({col:d.col,col2:new T.Color(d.col).multiplyScalar(.6).getHex(),skin:d.robe?0x8a7a6a:0x5a5a60,eye:d.em?0xd06aff:0xffd040,helm:d.robe?0:1,hood:d.robe?1:0,weapon:d.bow?'bow':'sword',shieldM:d.shield,shieldCol:d.col,em:d.em,robe:d.robe}),
 skeleton:d=>humanoid({col:d.col,col2:d.col,skin:d.col,skull:1,eye:0xff6040,weapon:'sword',armSkin:1}),
 imp:d=>{const o=humanoid({col:d.col,skin:d.col,col2:0x3a1a1a,horns:.8,eye:0xffe040,wings:1,armSkin:1,scale:.7});o.fly=1;return o;},
 scorpion:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{metalness:.3});body.add(mesh(BOX(.7,.32,1.0),M,0,.38,0));eyes(body,.5,.5,.12,.05,0x220000);
  [-1,1].forEach(s=>{const a=grp(s*.35,.4,.45);a.add(mesh(BOX(.15,.15,.5),M,0,0,.25));a.add(mesh(BOX(.3,.15,.3),M,0,0,.6));a.add(mesh(BOX(.08,.12,.25),M,s*.1,0,.85));a.rotation.y=-s*.3;body.add(a);});
  const tail=[];let y=.45,z=-.5;for(let i=0;i<5;i++){const sg=mesh(SPH(.16-i*.012,6,5),M,0,y,z);body.add(sg);tail.push(sg);y+=.22;z-=.12-i*.07;}body.add(mesh(CONE(.07,.3,5),mat(0x2a1a0a),0,y,z+.15));
  const legs=[];for(let i=0;i<6;i++){const s=i<3?-1:1,zz=(i%3-1)*.3;const l=grp(s*.35,.3,zz);const m=mesh(BOX(.45,.05,.05),M,s*.2,-.1,0);m.rotation.z=s*.5;l.add(m);body.add(l);legs.push(l);}return {root,body,legs,bug:1};},
 snake:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col),segs=[];for(let i=0;i<8;i++){const s=mesh(SPH(.24-i*.015,8,6),i%2?M:mat(new T.Color(d.col).multiplyScalar(.7).getHex()),0,.22,-i*.32);s.scale.y=.8;body.add(s);segs.push(s);}const h=grp(0,.3,.3);body.add(h);h.add(mesh(BOX(.32,.22,.4),M));eyes(h,.08,.18,.1,.04,0xffd040);h.add(mesh(BOX(.03,.02,.25),basic(0xff3060),0,-.05,.3));return {root,body,segs,head:h};},
 mummy:d=>humanoid({col:d.col,col2:new T.Color(d.col).multiplyScalar(.75).getHex(),eye:0x6aff6a,bandage:1,armsFwd:1}),
 bat:d=>{const root=new T.Group(),body=grp(0,1.5,0);root.add(body);const M=mat(d.col);body.add(mesh(SPH(.35,8,6),M));eyes(body,.05,.3,.12,.05,0xff3030);[-1,1].forEach(s=>body.add(mesh(CONE(.08,.25,4),M,s*.15,.35,0)));const wings=[];[-1,1].forEach(s=>{const w=grp(s*.25,0,0);const m=mesh(BOX(1.0,.04,.6),mat(new T.Color(d.col).multiplyScalar(.6).getHex()),s*.5,0,0);w.add(m);body.add(w);wings.push(w);});return {root,body,wings,fly:1};},
 bear:d=>quad({col:d.col,b:[.95,.85,1.5],leg:.6,hs:.65,snout:1,ears:'round',lw:.3,col2:new T.Color(d.col).multiplyScalar(.8).getHex()}),
 golem:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{metalness:.2,roughness:.3,emissive:d.em||0x0a2a3a,emissiveIntensity:d.em?.7:1});const legs=[legBox(body,-.3,.8,0,.42,.8,M),legBox(body,.3,.8,0,.42,.8,M)];body.add(mesh(BOX(1.2,1,.8),M,0,1.3,0));const h=grp(0,2.0,.05);body.add(h);h.add(mesh(BOX(.5,.42,.5),M));eyes(h,.02,.26,.12,.06,d.em||0x6affff);
  for(let i=0;i<4;i++){const c=mesh(CONE(.15,.6,5),mat(0xcff4ff,{emissive:d.em||0x2a6a8a}),(i-1.5)*.3,1.9,-.35);c.rotation.x=-.4;body.add(c);}const arms=[];[-1,1].forEach(s=>{const a=grp(s*.78,1.7,0);a.add(mesh(BOX(.4,1.1,.42),M,0,-.5,0));body.add(a);arms.push(a);});return {root,body,legs,arms,human:1};},
 wraith:d=>{const root=new T.Group(),body=grp(0,.4,0);root.add(body);const M=mat(d.col,{transparent:true,opacity:.82,emissive:0x1a0a2a});const robe=mesh(CONE(.6,1.7,8),M,0,.9,0);robe.rotation.x=Math.PI;body.add(robe);body.add(mesh(SPH(.38,8,6),mat(0x1a1024),0,1.9,0));eyes(body,1.92,.3,.12,.06,0xb06aff);
  const arms=[];[-1,1].forEach(s=>{const a=grp(s*.45,1.5,.1);a.add(mesh(BOX(.14,.7,.14),M,0,-.3,0));a.rotation.x=-1;body.add(a);arms.push(a);});body.add(glowSprite(0x8a4aff,2).translateY(1.2));return {root,body,arms,fly:1,human:1};},
 oni:d=>humanoid({col:d.col,skin:d.col,col2:0x3a2a1a,horns:1.2,weapon:'club',eye:0xffd040,armSkin:1}),
 vampire:d=>humanoid({col:0x1a1018,skin:0xd8d0d8,col2:0x2a0a10,cape:0x7a0a1a,collar:1,eye:0xff2020,weapon:'claw'}),
 eye:d=>{const root=new T.Group(),body=grp(0,1.6,0);root.add(body);body.add(mesh(SPH(.5,12,10),mat(0xf0e8e8)));body.add(mesh(SPH(.26,8,6),basic(d.col),0,0,.36));body.add(mesh(SPH(.12,6,5),basic(0x000000),0,0,.52));body.add(glowSprite(d.col,1.6));for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const t=mesh(CONE(.06,.7,4),mat(0x4a2a5a),Math.cos(a)*.4,-.4,Math.sin(a)*.4);t.rotation.x=Math.PI;t.rotation.z=Math.cos(a)*.4;body.add(t);}return {root,body,fly:1};},
 boar:d=>quad({col:d.col,b:[1,.9,1.5],leg:.5,hs:.75,snout:1,ears:'cone',tusk:1,crown:1,tail:[.1,.4],eye:0xff3030,mane:1,lw:.28}),
 treant:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const Wd=mat(d.col),Dk=mat(new T.Color(d.col).multiplyScalar(.5).getHex()),L=mat(0x2f6a2a),ember=d.em||0xffa03a;
  body.add(mesh(CYL(.7,1.0,3.2,8),Wd,0,1.8,0));
  // hollow chest: a dark cavity framed by split bark, with the corrupted heart glowing inside
  const hollow=mesh(SPH(.42,10,8),basic(0x0e0805),0,1.9,.72);hollow.scale.set(1,1.4,.4);body.add(hollow);
  const rim=mesh(TOR(.44,.1),Dk,0,1.9,.84);rim.scale.set(1,1.4,1);body.add(rim);
  const core=glowSprite(ember,1.6);core.position.set(0,1.9,.95);body.add(core);const heart=mesh(OCT(.17),basic(ember),0,1.9,.9);body.add(heart);
  eyes(body,2.8,.62,.25,.1,0xffe040);body.add(mesh(BOX(.5,.1,.1),basic(0x111111),0,2.5,.7));
  const legs=[];for(let i=0;i<3;i++){const a=i/3*Math.PI*2;const l=grp(Math.sin(a)*.6,.4,Math.cos(a)*.6);const c=mesh(CONE(.3,.9,5),Wd,0,-.2,0);c.rotation.x=Math.PI;l.add(c);body.add(l);legs.push(l);}
  // left: a short leafy branch arm
  const armL=grp(-.8,2.9,0);const bL=mesh(CYL(.12,.2,1.8,6),Wd,-.5,-.6,0);bL.rotation.z=-.6;armL.add(bL);armL.add(mesh(ICO(.55),L,-1.0,-1.4,0));body.add(armL);
  // right: a long gnarled ROOT arm in three bent segments that drags its claws on the ground
  const armR=grp(.85,2.8,0);body.add(armR);const segs=[];let par=armR,py=0;
  [[.38,.3,1.25,.7],[.3,.22,1.15,-.25],[.22,.14,1.05,-.35]].forEach(([r0,r1,len,bend])=>{const g=grp(0,py,0);g.rotation.z=bend;g.userData.bz=bend;par.add(g);g.add(mesh(CYL(r1,r0,len,6),Wd,0,-len/2,0));g.add(mesh(SPH(r0*1.15,6,5),Dk,0,0,0));
   const tw=mesh(CONE(.07,.5,4),Dk,r0*.9,-len*.5,0);tw.rotation.z=-1;g.add(tw);g.add(mesh(ICO(r0*.7),L,-r0*.6,-len*.35,r0*.4));segs.push(g);par=g;py=-len;});
  const claw=grp(0,py,0);par.add(claw);for(let i=0;i<4;i++){const c=mesh(CONE(.12,.85,4),Dk,(i-1.5)*.14,-.3,0);c.rotation.set(Math.PI,0,(i-1.5)*.35);claw.add(c);}
  const crown=grp(0,0,0);body.add(crown);crown.add(mesh(ICO(1.3),L,0,3.8,0));crown.add(mesh(ICO(.9),L,.8,3.4,.3));crown.add(mesh(ICO(.9),L,-.8,3.5,-.2));
  // Mira's silk: wraps that appear while the Treant is snared
  const silkM=basic(0xf4f0ff,{transparent:true,opacity:.85});const wraps=[1.0,1.4,2.75].map((y,i)=>{const w=mesh(TOR(.95-i*.08,.05),silkM,0,y,0);w.rotation.x=Math.PI/2+(i-1)*.25;w.visible=false;body.add(w);return w;});
  return {root,body,legs,arms:[armL,armR],human:1,anim:(t,m)=>{
   const w=m.state==='windup'?1-m.wT/m.wu:0,snared=m.snareT>0&&m.stun>0,hurt=m.stag>0||snared;
   segs.forEach((g,i)=>g.rotation.z=g.userData.bz+Math.sin(t*(1.6+i*.5)+i)*(.06+i*.04)-w*(i?.35:0)+(m.lunge>0?.2:0));
   crown.rotation.z=Math.sin(t*.8)*.04;crown.rotation.x=Math.cos(t*.6)*.03;
   const pulse=(m.phase===2?1.35:1)*(1+Math.sin(t*(m.phase===2?7:3.5))*.12)+w*.6+(hurt?.5:0);core.scale.setScalar(1.1*pulse);heart.scale.setScalar(pulse);
   wraps.forEach((x,i)=>{x.visible=snared;if(snared)x.rotation.z=t*(i%2?1.5:-1.5);});
   body.rotation.z=snared?Math.sin(t*28)*.025:0;if(hurt)body.rotation.x=-.22;else body.rotation.x=0;}};},
 pharaoh:d=>humanoid({col:d.robe?d.col:0x2b4fa0,skin:d.robe?0xd8c8b8:d.col,col2:0xe8dcc0,skull:!d.robe,nemes:!d.robe,hood:!!d.robe,robe:1,weapon:'staff',eye:d.robe?0xffd040:0x40e0ff,armSkin:1}),
 bigknight:d=>humanoid({col:d.col,col2:0x2a2a30,skin:0x1a1a20,eye:0xff8040,helm:2,pauld:1,weapon:'greatsword',shieldM:1,shieldCol:d.col,cape:0x4a1a1a,em:d.em}),
 dragon:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{metalness:.3,roughness:.4}),Bm=mat(0xe0f4ff);const b=mesh(SPH(1.2,12,10),M,0,2,0);b.scale.set(1,.85,1.5);body.add(b);const bl=mesh(SPH(1,10,8),Bm,0,1.7,.3);bl.scale.set(.9,.7,1.2);body.add(bl);
  const neck=grp(0,2.4,1.4);body.add(neck);for(let i=0;i<3;i++)neck.add(mesh(SPH(.5-i*.05,8,6),M,0,i*.45,i*.35));const h=grp(0,1.5,1.3);neck.add(h);h.add(mesh(BOX(.8,.6,1.1),M));h.add(mesh(BOX(.6,.35,.6),M,0,-.12,.75));eyes(h,.15,.55,.25,.08,0x40e0ff);[-1,1].forEach(s=>{const hr=mesh(CONE(.1,.8,5),Bm,s*.3,.45,-.4);hr.rotation.x=-.9;h.add(hr);});
  const wings=[];[-1,1].forEach(s=>{const w=grp(s*.8,2.7,.2);const m=mesh(BOX(3.2,.08,1.8),mat(new T.Color(d.col).multiplyScalar(.75).getHex(),{transparent:true,opacity:.9}),s*1.6,0,-.3);w.add(m);const bn=mesh(CYL(.08,.08,3.2,5),M,s*1.6,.05,.55);bn.rotation.z=Math.PI/2;w.add(bn);body.add(w);wings.push(w);});
  for(let i=0;i<5;i++)body.add(mesh(SPH(.5-i*.08,7,5),M,0,1.7-i*.15,-1.6-i*.6));const legs=[];[[-1,1],[1,-1],[1,1],[-1,-1]].forEach(([sx,sz])=>legs.push(legBox(body,sx*.8,1.1,sz*.8,.35,1.1,M)));return {root,body,legs,wings,head:h,neck};},
 demon:d=>{const o=humanoid({col:d.col,col2:0x3a2a4a,skin:0x5a3a6a,horns:2,cape:0x2a0a3a,pauld:1,weapon:'great',eye:0xd06aff,collar:1,em:d.em,wings:d.em?1:0});o.body.add(glowSprite(d.em?0xb04aff:0x7a2aff,d.em?5:3).translateY(1.4));return o;},
 shadowhero:d=>{const o=buildHero(S?(S.hero==='L'?'C':'L'):'C',S?(S.hero==='L'?'knight':'priest'):'priest',{w:{tier:3,rar:3,ref:5,slot:'w'},a:{tier:3,rar:3,ref:0,slot:'a'},s:{tier:3,rar:3,ref:0,slot:'s'}},{dark:1});o.human=1;o.legs=[o.legL,o.legR];o.arms=[o.armL,o.armR];o.heroRig=1;return o;},
};
function buildMob(d){const o=MB[d.m](d);o.root.scale.setScalar(d.s||1);o.mats=[];const cs=QUAL==='high'||!!d.boss;o.root.traverse(c=>{if(c.isMesh){c.castShadow=cs;if(c.material.isMeshStandardMaterial)o.mats.push(c.material);}});addShadow(o.root,d.r/(d.s||1));
 const tr=mesh(RING(.85,1),basic(0xff2020,{transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),0,.06,0);tr.rotation.x=-Math.PI/2;tr.castShadow=false;tr.scale.setScalar(d.r*1.6/(d.s||1));o.root.add(tr);o.tel=tr;
 if(d.em&&!o.heroRig){for(const m of o.mats){if(!m.emissive.getHex()){m.emissive.setHex(d.em);m.emissiveIntensity=.45;}}}
 const bb=new T.Box3().setFromObject(o.root);o.h=bb.max.y/(d.s||1);return o;}

/* ================= NPC ================= */
function buildNPC(n){const o=humanoid({col:n.col,col2:new T.Color(n.col).multiplyScalar(.6).getHex(),skin:0xf2c8a0,hood:n.hat==='hood',wizhat:n.hat==='wizard',cap:n.hat==='cap',helm:n.hat==='helm'?1:0,wrap:n.hat==='wrap',crown:n.hat==='crown',robe:n.hat==='hood'||n.hat==='wizard',armSkin:0});
 if(n.n==='Mira the Huntress'){const silk=mat(0xeee8f4,{roughness:.6}),wood=mat(0x5a3e24);
  // one-shoulder cape, swept to her left side
  const cape=mesh(BOX(.55,1.2,.05),mat(0x8a4a24,{side:T.DoubleSide}),-.16,1.3,-.24);cape.rotation.set(.12,0,.2);o.root.add(cape);o.root.add(mesh(SPH(.09,6,5),mat(0xc8a050,{metalness:.6}),.12,1.82,-.12));
  const mantle=mesh(BOX(.36,.14,.5),mat(0x8a4a24),-.22,1.74,0);mantle.rotation.z=.35;o.root.add(mantle);
  const strap=mesh(BOX(.07,1.0,.04),mat(0x5a3a1e),0,1.4,.27);strap.rotation.z=-.7;o.root.add(strap);
  // silk spool on her right hip
  const sp=grp(.44,1.0,.12);sp.scale.setScalar(1.3);sp.rotation.x=Math.PI/2;sp.add(mesh(CYL(.13,.13,.04,10),wood,0,.09,0),mesh(CYL(.13,.13,.04,10),wood,0,-.09,0),mesh(CYL(.1,.1,.16,10),silk));o.root.add(sp);
  const thread=mesh(CYL(.008,.008,.5,3),silk,.42,.78,.1);thread.rotation.z=.3;o.root.add(thread);
  // longbow on her back
  const bow=mesh(new T.TorusGeometry(.62,.028,5,18,Math.PI),wood,.04,1.4,-.3);bow.rotation.z=-Math.PI/2+.25;o.root.add(bow);const str=mesh(BOX(.01,1.22,.01),silk,-.1,1.38,-.3);str.rotation.z=.25;o.root.add(str);o.root.userData.mira=1;}
 if(n.n==='Pell the Lantern Keeper'){const wood=mat(0x5a4632),iron=mat(0x2e2a26,{metalness:.5,roughness:.5});
  // a long pole over the right shoulder, the lantern hanging from its tip
  const pole=grp(.28,1.55,.05);pole.rotation.set(-.5,0,-.35);o.root.add(pole);pole.add(mesh(CYL(.035,.045,2.6,6),wood,0,1.1,0));
  const hang=grp(0,2.35,0);pole.add(hang);const lamp=grp(0,-.42,0);hang.add(lamp);lamp.add(mesh(CYL(.005,.005,.36,3),iron,0,.22,0));
  lamp.add(mesh(CYL(.16,.18,.05,6),iron,0,.02,0),mesh(CONE(.2,.16,6),iron,0,.26,0));
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;lamp.add(mesh(BOX(.025,.42,.025),iron,Math.sin(a)*.15,.02,Math.cos(a)*.15));}
  const fl=mesh(SPH(.09,6,5),basic(0xffc860),0,.02,0);lamp.add(fl);const gl=glowSprite(0xffb050,2.2);gl.position.y=.02;lamp.add(gl);
  o.body.rotation.x=.14;o.root.userData.pell={hang,gl,body:o.body};}
 if(n.n==='Elder Rowan'){const staff=grp(.65,0,0);staff.add(mesh(CYL(.055,.08,2.5,6),mat(0x61472e),0,1.25,0));staff.add(mesh(TOR(.22,.055),mat(0x61472e),.15,2.5,0));staff.add(mesh(OCT(.12),basic(0xffd76a),.32,2.12,0));o.root.add(staff);}
 if(n.voice){o.root.traverse(c=>{if(c.isMesh){c.material=c.material.clone();c.material.transparent=true;c.material.opacity=.45;if(c.material.isMeshStandardMaterial){c.material.emissive=new T.Color(0xff8ac0);c.material.emissiveIntensity=.5;}}});o.body.add(glowSprite(0xffb0d8,3).translateY(1.2));}
 const mk=mesh(OCT(.16),basic(0xffd76a),0,2.9,0);mk.castShadow=false;o.root.add(mk);o.mark=mk;o.root.traverse(c=>{if(c.isMesh)c.castShadow=true;});addShadow(o.root,.6);return o;}
/* ================= DECOR DEFINITIONS ================= */
// [geometry fn, color key, x,y,z, rx,ry,rz, sx,sy,sz]
const DEC={
 tree:[[()=>CYL(.2,.3,1.6,6),'trunk',0,.8,0],[()=>ICO(1.2),'leaf',0,2.3,0],[()=>ICO(.85),'leaf',.45,2.9,.1]],
 pine:[[()=>CYL(.15,.22,1,6),'trunk',0,.5,0],[()=>CONE(1.15,1.8,7),'leaf',0,1.7,0],[()=>CONE(.85,1.4,7),'leaf',0,2.6,0],[()=>CONE(.5,1,7),'leaf',0,3.3,0]],
 snowpine:[[()=>CYL(.15,.22,1,6),'trunk',0,.5,0],[()=>CONE(1.15,1.8,7),'leaf',0,1.7,0],[()=>CONE(.85,1.4,7),'leaf',0,2.6,0],[()=>CONE(.5,1,7),'leaf',0,3.3,0]],
 rock:[[()=>DOD(.8),'rock',0,.35,0,0,0,0,1,.7,1]],
 bigrock:[[()=>DOD(2.4),'rock',0,1,0,0,0,0,1,.9,1.2]],
 flower:[[()=>CYL(.025,.025,.32,4),'stem',0,.16,0],[()=>SPH(.13,6,5),'bloom',0,.34,0]],
 grass:[[()=>CONE(.1,.5,4),'grass',0,.25,0],[()=>CONE(.08,.4,4),'grass',.15,.2,.05],[()=>CONE(.08,.42,4),'grass',-.12,.21,-.06]],
 reed:[[()=>CYL(.03,.04,1.6,4),'grass',0,.8,0],[()=>CYL(.03,.04,1.3,4),'grass',.18,.65,.1,0,0,.15],[()=>CYL(.06,.06,.3,5),'grass',0,1.7,0]],
 mush:[[()=>CYL(.08,.1,.32,6),'stem',0,.16,0],[()=>HEMI(.28),'cap',0,.28,0]],
 log:[[()=>CYL(.3,.3,2.4,7),'wood',0,.3,0,0,0,Math.PI/2]],
 cactus:[[()=>CYL(.25,.28,2.1,7),'cac',0,1.05,0],[()=>CYL(.14,.14,.8,6),'cac',.42,1.3,0],[()=>CYL(.14,.14,.7,6),'cac',-.42,1.5,0],[()=>CYL(.14,.14,.4,6),'cac',.26,.95,0,0,0,Math.PI/2],[()=>CYL(.14,.14,.4,6),'cac',-.26,1.15,0,0,0,Math.PI/2]],
 dune:[[()=>SPH(3,10,6),'sand',0,0,0,0,0,0,1,.28,1.7]],
 bone:[[()=>CYL(.06,.06,.9,5),'bone',0,.08,0,0,0,Math.PI/2],[()=>SPH(.1,5,4),'bone',.45,.08,0],[()=>SPH(.1,5,4),'bone',-.45,.08,0]],
 ribcage:[[()=>TOR(1.6,.12,Math.PI),'bone',0,.2,0,0,0,0],[()=>TOR(1.4,.11,Math.PI),'bone',0,.2,.9,0,0,0],[()=>TOR(1.2,.1,Math.PI),'bone',0,.2,-.9,0,0,0],[()=>CYL(.15,.15,3,6),'bone',0,.2,0,Math.PI/2,0,0]],
 pillar:[[()=>CYL(.5,.6,4,8),'stone',0,2,0],[()=>BOX(1.5,.35,1.5),'stone',0,4.15,0],[()=>BOX(1.5,.35,1.5),'stone',0,.17,0]],
 ruin:[[()=>BOX(2.6,2.2,.6),'stone',0,1.1,0],[()=>BOX(.6,1.2,.6),'stone',1.4,2.6,0],[()=>BOX(.9,.5,.9),'stone',-1.8,.25,.6]],
 statue:[[()=>BOX(1.2,.6,1.2),'stone',0,.3,0],[()=>CYL(.35,.4,1.6,8),'stone',0,1.4,0],[()=>SPH(.4,8,6),'stone',0,2.5,0],[()=>BOX(1.1,.25,.4),'stone',0,2.05,0]],
 sarco:[[()=>BOX(1.2,.8,2.4),'stone',0,.4,0],[()=>BOX(1.3,.2,2.5),'stone',0,.9,0]],
 crystal:[[()=>CONE(.4,2,5),'cry',0,1,0],[()=>CONE(.28,1.4,5),'cry',.42,.6,.15,0,0,-.45],[()=>CONE(.25,1.1,5),'cry',-.35,.5,-.1,0,0,.5]],
 grave:[[()=>BOX(.65,.95,.16),'stone',0,.47,0],[()=>BOX(.8,.14,.32),'stone',0,.07,0]],
 candle:[[()=>CYL(.08,.08,.5,6),'wax',0,.25,0],[()=>SPH(.08,5,4),'flame',0,.57,0]],
 torch:[[()=>CYL(.07,.09,2.2,6),'post',0,1.1,0],[()=>SPH(.18,6,5),'flame',0,2.35,0]],
 lantern:[[()=>CYL(.07,.09,2.6,6),'post',0,1.3,0],[()=>BOX(.4,.5,.4),'glass',0,2.7,0]],
 deadtree:[[()=>CYL(.15,.32,3.2,5),'wood',0,1.6,0],[()=>CYL(.05,.1,1.4,4),'wood',.45,2.4,0,0,0,-.85],[()=>CYL(.05,.1,1.1,4),'wood',-.4,2.0,0,0,0,.9]],
 banner:[[()=>CYL(.06,.06,3.2,5),'post',0,1.6,0],[()=>BOX(.7,1.4,.05),'cloth',.4,2.4,0]],
 lavarock:[[()=>DOD(1),'rock',0,.4,0,0,0,0,1,.7,1],[()=>DOD(.5),'lava',.3,.5,.3]],
 voidrock:[[()=>DOD(1),'rock',0,.4,0,0,0,0,1,.7,1],[()=>OCT(.5),'lava',0,1.2,0]],
 chain:[[()=>CYL(.25,.35,1.2,6),'metal',0,.6,0],[()=>TOR(.3,.06),'metal',0,1.5,0,Math.PI/2,0,0],[()=>TOR(.3,.06),'metal',.3,2.0,0,0,Math.PI/2,0]],
 dock:[[()=>BOX(2,.2,5),'wood',0,.3,0],[()=>CYL(.12,.12,1,5),'wood',.9,.2,2.3],[()=>CYL(.12,.12,1,5),'wood',-.9,.2,-2.3]],
};
const GLOWKEYS={cry:1,flame:1,glass:1,lava:1};const SWAY={leaf:.12,grass:.2,bloom:.1,stem:.15,cac:.03};const NOSHADOW={grass:1,flower:1,reed:1,candle:1,bone:1};
let DECOR_OBS=[];// obstacles for spawn avoidance
function addDecor(type,n,cols,s0,s1,ring,sr){
 const parts=DEC[type];if(!parts)return;const ims=parts.map(p=>{const k=p[1];let m=mat(cols[k],GLOWKEYS[k]?{emissive:cols[k],emissiveIntensity:k==='flame'?1.6:k==='lava'?1.4:.5,roughness:.2}:{});if(SWAY[k]&&Q().sh)swayMat(m,SWAY[k]);const im=new T.InstancedMesh(p[0](),m,n);im.castShadow=!NOSHADOW[type]&&!!Q().shadow;im.receiveShadow=true;world.add(im);return im;});
 const O=new T.Object3D(),Qo=new T.Object3D(),M=new T.Matrix4();let placed=0;
 for(let i=0;i<n;i++){let x,z,ok=false,k=0;
  if(ring){const a=i/n*Math.PI*2+(sr()-.5)*.06,r=66+sr()*10;x=Math.cos(a)*r;z=Math.sin(a)*r;ok=true;}
  else{while(!ok&&++k<12){const a=sr()*Math.PI*2,r=Math.sqrt(sr())*62;x=Math.cos(a)*r;z=Math.sin(a)*r;ok=Math.hypot(x,z)>9&&Math.hypot(x-AR.x,z-AR.z)>AR.r+5&&!(Math.abs(x)<4&&z<0&&z>AR.z)&&!G.pois.some(p=>Math.hypot(p.x-x,p.z-z)<p.r);}}
  if(!ok)continue;const sc=s0+sr()*(s1-s0);O.position.set(x,gY(x,z)-.1,z);O.rotation.set(0,sr()*6.28,0);O.scale.setScalar(sc);O.updateMatrix();
  parts.forEach((p,j)=>{Qo.position.set(p[2],p[3],p[4]);Qo.rotation.set(p[5]||0,p[6]||0,p[7]||0);Qo.scale.set(p[8]||1,p[9]||1,p[10]||1);Qo.updateMatrix();M.multiplyMatrices(O.matrix,Qo.matrix);ims[j].setMatrixAt(placed,M);});
  if(!ring&&!NOSHADOW[type]&&type!=='mush'&&type!=='candle')DECOR_OBS.push({x,z,r:sc*(type==='bigrock'?2.4:type==='ruin'?1.6:type==='dune'?0:.5)});placed++;}
 ims.forEach(im=>{im.count=placed;im.instanceMatrix.needsUpdate=true;});}

/* ================= WORLD ================= */
function buildWorld(c){
 scene.remove(world);world.traverse(o=>{if(o.geometry&&!Object.values(geoC).includes(o.geometry))o.geometry.dispose();});world=new T.Group();scene.add(world);DECOR_OBS=[];
 const ch=CHS[c],b=B[ch.b];const sr=seeded(c+1);TER.amp=b.amp||1.5;TER.seed=c*1.37;
 scene.fog=new T.Fog(b.sky[1],b.fog[0],b.fog[1]);skyMat.uniforms.top.value.setHex(b.sky[0]);skyMat.uniforms.bot.value.setHex(b.sky[1]);skyMat.uniforms.stars.value=b.night?1:0;
 hemi.color.setHex(b.hs);hemi.groundColor.setHex(b.hg);sun.color.setHex(b.sun[0]);sun.intensity=b.sun[1]*1.3;const sp=b.sun[2];sun.position.set(sp[0],sp[1],sp[2]);skyMat.uniforms.sunDir.value.set(sp[0],sp[1],sp[2]);skyMat.uniforms.sunCol.value.setHex(b.sun[0]);
 R.toneMappingExposure=b.night?.95:1.05;
 // POIs
 G.pois=[{x:0,z:0,r:7},{x:AR.x,z:AR.z,r:AR.r+5},{x:0,z:-28,r:4}];
 if(c===0&&!G.dg){for(const l of FIELD_LESSONS)G.pois.push({x:l.x,z:l.z,r:5});G.pois.push({x:-18,z:12,r:4},{x:-10,z:9,r:5});}
 const q=ch.quest;G.shr=[];
 if(q.t==='shrines'){const base=sr()*6.28;for(let i=0;i<q.n;i++){let a=base+i/q.n*Math.PI*2,r=30+sr()*16;const dz=Math.sin(a);if(dz<-.5){a+=Math.PI*.5;}const x=Math.cos(a)*r,z=Math.sin(a)*r;G.shr.push({x,z,lit:0,prog:0});G.pois.push({x,z,r:4});}}
 if(q.t==='survive'){const a=sr()*Math.PI*.8+Math.PI*.1;G.beacon={x:Math.cos(a)*26,z:Math.sin(a)*22+4};G.pois.push({x:G.beacon.x,z:G.beacon.z,r:5});}
 // ground
 const seg=QUAL==='low'?60:96;const pg=new T.PlaneGeometry(190,190,seg,seg);const pos=pg.attributes.position,cols=[],c1=new T.Color(b.g1),c2=new T.Color(b.g2),tc=new T.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),zz=-pos.getY(i);const y=gY(x,zz);pos.setZ(i,y);let n=(Math.sin(x*.13)+Math.sin(zz*.11+1)+Math.sin((x+zz)*.07+2)+Math.sin(x*.41-zz*.37)*.4)/3.4*.5+.5;n=clamp(n+y*.08,0,1);tc.copy(c1).lerp(c2,n);const rr=Math.hypot(x,zz);if(rr>66)tc.multiplyScalar(.55);if(Math.hypot(x-AR.x,zz-AR.z)<AR.r)tc.multiplyScalar(.85);cols.push(tc.r,tc.g,tc.b);}
 pg.setAttribute('color',new T.Float32BufferAttribute(cols,3));pg.computeVertexNormals();
 const gm=new T.Mesh(pg,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));gm.rotation.x=-Math.PI/2;gm.receiveShadow=true;gm.castShadow=false;world.add(gm);G.ground=gm;
 // water
 if(b.water){const wm=new T.Mesh(new T.PlaneGeometry(400,400),new T.MeshStandardMaterial({color:b.water,transparent:true,opacity:.75,roughness:.15,metalness:.3}));wm.rotation.x=-Math.PI/2;wm.position.y=-.45;wm.receiveShadow=true;wm.castShadow=false;world.add(wm);G.water=wm;}else G.water=null;
 // decor
 for(const d of b.dec)addDecor(d[0],d[1],d[2],d[3],d[4],0,sr);addDecor(b.wall[0],b.wall[1],b.wall[2],b.wall[3],b.wall[4],1,sr);
 // arena ring
 const arR=mesh(RING(AR.r-.3,AR.r+.3),basic(0x000000,{transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),AR.x,gY(AR.x,AR.z)+.06,AR.z);arR.rotation.x=-Math.PI/2;arR.castShadow=false;world.add(arR);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const x=AR.x+Math.cos(a)*(AR.r+1.2),z=AR.z+Math.sin(a)*(AR.r+1.2);if(Math.abs(angDiff(a,Math.PI/2))<.35)continue;const p=mesh(CYL(.35,.45,3.2,6),mat(0x2a2230),x,gY(x,z)+1.6,z);world.add(p);const f=mesh(SPH(.16,6,5),basic(0xff7a3a),x,gY(x,z)+3.5,z);f.castShadow=false;world.add(f);world.add(glowSprite(0xff7a3a,1.6).translateX(x).translateY(gY(x,z)+3.5).translateZ(z));}
 // fog gate
 const fgY=gY(0,-28);const fg=grp(0,fgY,-28);const fm=new T.Mesh(new T.PlaneGeometry(7,5),new T.MeshBasicMaterial({color:0x8a98b0,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide,fog:false}));fm.position.y=2.5;fm.castShadow=false;fg.add(fm);
 [-3.6,3.6].forEach(x=>{fg.add(mesh(BOX(.7,5.4,.7),mat(0x3a3040),x,2.7,0));fg.add(mesh(BOX(.9,.6,.9),mat(0x4a4050),x,5.6,0));});fg.add(mesh(BOX(8,.5,.8),mat(0x3a3040),0,5.6,0));
 const fgl=glowSprite(0xffffff,3.5);fgl.position.y=2.5;fgl.material.opacity=.3;fg.add(fgl);world.add(fg);G.fog={g:fg,m:fm,gl:fgl};
 // grace
 const gr=grp(0,gY(0,0),0);gr.add(mesh(CYL(.25,.35,.3,8),mat(0x8a7a5a),0,.15,0));const beam=mesh(geo('gbeam',()=>new T.CylinderGeometry(.35,.35,7,10,1,true)),basic(0xffd76a,{transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),0,3.5,0);beam.castShadow=false;gr.add(beam);
 const gs=glowSprite(0xffd76a,2.6);gs.position.y=1;gr.add(gs);const gl=new T.PointLight(0xffc860,1.8,16);gl.position.y=1.5;gr.add(gl);const rg=mesh(RING(1.6,1.9),basic(0xffd76a,{transparent:true,opacity:.4,side:T.DoubleSide,depthWrite:false}),0,.05,0);rg.rotation.x=-Math.PI/2;rg.castShadow=false;gr.add(rg);world.add(gr);G.graceObj={gs,beam};
 // NPC
 const n=ch.npc;const nm=buildNPC(n);nm.root.position.set(3.6,gY(3.6,1.4),1.4);nm.root.rotation.y=Math.atan2(0-3.6,4-1.4);world.add(nm.root);G.npc={x:3.6,z:1.4,m:nm,d:n};
 // shrines
 G.shrObj=[];for(const s of G.shr){const g=grp(s.x,gY(s.x,s.z),s.z);g.add(mesh(CYL(1.2,1.4,.4,8),mat(0x5a5068),0,.2,0));g.add(mesh(CYL(.3,.4,1.6,6),mat(0x6a6078),0,1.2,0));const bowl=mesh(CYL(.6,.3,.4,8),mat(0x4a4058),0,2.1,0);g.add(bowl);
  const fl=glowSprite(0x8ad8ff,2.5);fl.position.y=2.6;fl.material.opacity=.15;g.add(fl);const flm=mesh(SPH(.25,6,5),basic(0x8ad8ff),0,2.5,0);flm.visible=false;flm.castShadow=false;g.add(flm);const ring=mesh(RING(2.2,2.5),basic(0x8ad8ff,{transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),0,.06,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;g.add(ring);world.add(g);G.shrObj.push({g,fl,flm,ring});}
 // beacon
 G.beaconObj=null;if(G.beacon){const bc=G.beacon;const g=grp(bc.x,gY(bc.x,bc.z),bc.z);g.add(mesh(CYL(.9,1.1,.4,8),mat(0x5a4a3a),0,.2,0));g.add(mesh(CYL(.12,.14,3.2,6),mat(0x4a3a2a),0,1.8,0));const fl=glowSprite(0xff9a3a,3);fl.position.y=3.6;g.add(fl);const ring=mesh(RING(5.6,6),basic(0xff9a3a,{transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),0,.06,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;g.add(ring);world.add(g);G.beaconObj={g,fl,ring};}
 // hostage cage (throne chapter)
 G.cage=null;if(c===18||(c===19&&!S.cleared[19])||c===47||(c===48&&!S.cleared[48])){const cz=AR.z-10;const cg=grp(0,gY(0,cz)+(c===18||c===47?4:0),cz);const pm=c>=47?buildHero('C','priest',{a:{tier:4,rar:3,ref:0,slot:'a'}},{cust:{style:'long',hair:0xe8c070,outfit:0xf4f0ff}}):buildHero(partnerKey(),partnerKey()==='L'?'knight':'priest',{w:{tier:2,rar:2,ref:0,slot:'w'},a:{tier:1,rar:1,ref:0,slot:'a'},s:{tier:1,rar:1,ref:0,slot:'s'}});cg.add(pm.root);
  const bm=mat(0x8a7aa0,{metalness:.8,roughness:.3,emissive:0x5a2a9a,emissiveIntensity:.5});for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cg.add(mesh(CYL(.05,.05,3,5),bm,Math.cos(a)*1.3,1.5,Math.sin(a)*1.3));}cg.add(mesh(CYL(1.45,1.45,.15,12),bm,0,3,0));cg.add(mesh(CYL(1.45,1.45,.15,12),bm,0,.07,0));cg.add(glowSprite(0xff7ac0,4).translateY(1.2));world.add(cg);G.cage=cg;G.cageModel=pm;}
 // particles
 const n2=Q().parts*.8|0,pp=new Float32Array(n2*3);for(let i=0;i<n2;i++){pp[i*3]=rnd(-35,35);pp[i*3+1]=rnd(0,14);pp[i*3+2]=rnd(-35,35);}
 const pgeo=new T.BufferGeometry();pgeo.setAttribute('position',new T.BufferAttribute(pp,3));const pts=new T.Points(pgeo,new T.PointsMaterial({color:b.pc,size:b.ps,map:GLOW_T,transparent:true,depthWrite:false,blending:b.glowP?T.AdditiveBlending:T.NormalBlending,opacity:.85}));pts.frustumCulled=false;world.add(pts);G.parts=pts;
 fieldLandmarks(c);woodsLandmarks(c);mireLandmarks(c);
 // lock marker
 G.lockMk=mesh(RING(.9,1.05),basic(0xff3030,{transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false}));G.lockMk.rotation.x=-Math.PI/2;G.lockMk.visible=false;G.lockMk.castShadow=false;world.add(G.lockMk);
 G.lockDia=mesh(OCT(.18),basic(0xff3030));G.lockDia.visible=false;G.lockDia.castShadow=false;world.add(G.lockDia);
 // bloodstain
 G.bloodObj=null;if(S.blood&&S.blood.ch===c){mkBlood(S.blood.x,S.blood.z);}
}
function mkBlood(x,z){if(G.bloodObj)world.remove(G.bloodObj);const g=grp(x,gY(x,z),z);const r=mesh(CIRC(.9),basic(0x7a1a2a,{transparent:true,opacity:.7,depthWrite:false}),0,.07,0);r.rotation.x=-Math.PI/2;r.castShadow=false;g.add(r);const gl=glowSprite(0xffd76a,2.2);gl.position.y=.8;g.add(gl);const bm=mesh(geo('bbeam',()=>new T.CylinderGeometry(.2,.3,5,8,1,true)),basic(0xffd76a,{transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide}),0,2.5,0);bm.castShadow=false;g.add(bm);world.add(g);G.bloodObj=g;}
/* ================= SAVE STATE (3 slots) ================= */
const SKEY='shadowoath3d_v2';
let S=null,SLOT=0;
const skey=i=>{const b=(typeof FB!=='undefined'&&FB.uid)?SKEY+'@'+FB.uid:SKEY;return i?b+'_'+i:b;};
const CLOUD={db:null,uid:null,ready:false,busy:false,pend:null,lastCore:'',saves:[null,null,null],err:''};
const cdoc=i=>CLOUD.db.doc('data/users/'+CLOUD.uid+'/'+(i?'save'+i:'save'));
function saveCore(){const ts=S.ts,pl=S.play;S.ts=0;S.play=0;const c=JSON.stringify(S);S.ts=ts;S.play=pl;return c;}
function save(force){if(!S)return false;S.ts=Date.now();const j=JSON.stringify(S);let ok=false;try{localStorage.setItem(skey(SLOT),j);localStorage.setItem(SKEY+'_last',''+SLOT);ok=true}catch(e){}
 try{if(window.pywebview&&window.pywebview.api&&window.pywebview.api.save_game)window.pywebview.api.save_game(j,SLOT);}catch(e){}
 const core=SLOT+'|'+saveCore();if(CLOUD.ready&&(force||core!==CLOUD.lastCore))cloudPush(SLOT,j,core);
 if(FB.uid){if(force)FB.lastCore[SLOT]='';fbSave(SLOT,j,core);lbUpdate();}return ok||CLOUD.ready||!!FB.uid;}
function cloudPush(i,j,core){if(CLOUD.busy){CLOUD.pend=[i,j,core];return;}CLOUD.busy=true;
 const body=j===null?null:{save:j,ts:Date.now(),lv:S?S.lv:0};
 (j===null?cdoc(i).delete():cdoc(i).set(body)).then(()=>{if(core)CLOUD.lastCore=core;CLOUD.err='';},e=>{CLOUD.err=(e&&e.code)||'error';if(e&&['revoked','not_granted','capability_disabled','capability_removed','invalid_argument'].includes(e.code))CLOUD.ready=false;})
 .finally(()=>{CLOUD.busy=false;if(CLOUD.pend){const p=CLOUD.pend;CLOUD.pend=null;cloudPush(p[0],p[1],p[2]);}});}
function loadLocal(i){try{const s=localStorage.getItem(skey(i));return s?JSON.parse(s):null}catch(e){return null}}
let DESK=[null,null,null];
function loadSave(i){if(i===undefined)i=SLOT;const c=(FB.uid?[loadLocal(i),FB.saves[i]]:[loadLocal(i),CLOUD.saves[i],DESK[i]]).filter(Boolean);if(!c.length)return null;return c.reduce((a,b)=>(b.ts||0)>(a.ts||0)?b:a);}
function deleteSlot(i){try{localStorage.removeItem(skey(i))}catch(e){}if(FB.uid){fbDelete(i);return;}CLOUD.saves[i]=null;if(CLOUD.ready)cloudPush(i,null,'');DESK[i]=null;try{if(window.pywebview)window.pywebview.api.delete_game(i);}catch(e){}}
function lastSlot(){try{return +(localStorage.getItem(SKEY+'_last')||0)}catch(e){return 0}}
window.addEventListener('pywebviewready',async()=>{try{for(let i=0;i<3;i++){const j=await window.pywebview.api.load_game(i);if(j)DESK[i]=JSON.parse(j);}if(typeof refreshTitle==='function'&&G.mode==='title')refreshTitle();}catch(e){}});
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rj)=>setTimeout(()=>rj({code:'timeout'}),ms))]);
async function cloudInit(){try{let w=0;while(!(window.claude&&window.claude.use)&&w<20){await new Promise(r=>setTimeout(r,250));w++;}if(!(window.claude&&window.claude.use))return;
 const db=await claude.use('db'),user=await claude.use('user');if(!db||!user)return;const id=await user.id();if(!id)return;CLOUD.db=db;CLOUD.uid=id;
 for(let i=0;i<3;i++){try{const snap=await withTimeout(cdoc(i).get(),10000);if(snap.exists){CLOUD.saves[i]=JSON.parse(snap.data().save);}}catch(e){}}
 CLOUD.ready=true;if(typeof refreshTitle==='function')refreshTitle();
 if(S&&G.mode==='game'){const cs=CLOUD.saves[SLOT];if(cs&&(cs.ts||0)>(S.ts||0)+5000)toast('☁ A newer cloud save exists. Return to title to load it.',3500);else save(true);}}catch(e){CLOUD.err=(e&&e.code)||'error';}}
function saveStatus(){if(FB.uid)return '🌐 Account: '+FB.name+' · '+(FB.saveState?.[SLOT]==='pending'?'Syncing…':FB.saveState?.[SLOT]==='error'?'Sync failed. Keep a save-code backup.':FB.saveState?.[SLOT]==='synced'?'Last upload confirmed':'Sync not yet confirmed');if(window.pywebview)return '💾 Saving to Documents/ShadowOath';return CLOUD.ready?(CLOUD.err?'☁ Cloud save: retrying ('+CLOUD.err+')':'☁ Cloud save ON: progress is stored in your Claude account'):'💾 Saving on this device';}
const heroName=s=>{s=s||S;return (s&&s.cust&&s.cust.name)||HEROES[s.hero].name;};
const partnerName=s=>{s=s||S;return (s&&s.cust&&s.cust.pname)||HEROES[s.hero==='L'?'C':'L'].name;};
const diff=()=>DIFF[NET.on&&NET.diff!=null?NET.diff:S&&S.diff!=null?S.diff:2];
function exportCode(){return btoa(unescape(encodeURIComponent(JSON.stringify(S))));}
function importCode(code){try{const s=JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/\s+/g,'')))));if(s&&(s.v===2||s.v===3)&&s.cls&&CLASSES[s.cls])return s;}catch(e){}return null;}
function newItem(slot,tier,rar,ref,af){return {id:S.nid++,slot,tier,rar,ref:ref||0,af:af||null};}
function freshSave(hk,ck,cust,df){
 S={v:5,hero:hk,cls:ck,cust:cust||null,diff:df==null?1:df,skp:0,sk:{a0:1},bar:[0,null,null,null,null,null],parabellum:[],fields:{version:1,stage:0,counts:{},keepsake:false},job:0,lv:1,exp:0,st:Object.assign({},CLASSES[ck].base),pts:0,zeny:150,pots:{red:3,orange:0,white:0,blue:1},loot:{},ore:{ori:2,elu:2,eori:0,eelu:0,mori:0,melu:0},items:[],eq:{w:null,s:null,a:null,h:null,l:null,f:null,r:null,r2:null},nid:1,ch:0,unlocked:0,cleared:[],q:[],flask:3,blood:null,auto:0,autoEq:1,ngp:0,done:0,music:1,sfx:1,play:0};
 for(let i=0;i<CHS.length;i++){S.cleared.push(0);S.q.push({s:0,p:0,shr:[0,0,0]});}
 const w=newItem('w',0,0),a=newItem('a',0,0),f=newItem('f',0,0);S.items.push(w,a,f);S.eq.w=w.id;S.eq.a=a.id;S.eq.f=f.id;
 if(CLASSES[ck].shield){const s=newItem('s',0,0);S.items.push(s);S.eq.s=s.id;}
}
const need=lv=>Math.floor(12*Math.pow(lv,1.8)+20);
const itemById=id=>S.items.find(i=>i.id===id);
const C_=()=>CLASSES[S.cls];
const partnerKey=()=>S.hero==='L'?'C':'L';
const fmt=s=>s.replace(/\{H\}/g,heroName()).replace(/\{P\}/g,partnerName()).replace(/\{M\}/g,momOf(S.hero)).replace(/\{PM\}/g,momOf(partnerKey()));
function iAtk(it){return Math.round(WATK[it.tier]*RMUL[it.rar]*(1+.1*it.ref)+it.ref*3);}
function iDef(it){if(it.slot==='r')return 0;const T0={a:ADEF,h:HDEF,s:SDEF,l:LHDEF,f:FDEF}[it.slot];if(!T0)return 0;const b=T0[Math.min(it.tier,T0.length-1)];return Math.round(b*RMUL[it.rar]*(1+.1*it.ref)+it.ref);}
function iHp(it){return it.slot==='a'?Math.round(AHP[it.tier]*RMUL[it.rar]*(1+.08*it.ref)):0;}
function afVal(it){if(!it.af)return 0;return AFFIX[it.af.k].v[it.rar]*(1+it.ref*.06);}
/* What an incoming item would actually replace. If any compatible slot is free
   it is a strict gain; otherwise it displaces the weakest occupant. Reading
   S.eq[it.slot] only ever looked at the FIRST accessory slot, so a ring was
   judged against r even when r2 sat empty. */
function curFor(it){const ks=slotsFor(it);if(!ks.length)return null;
 if(ks.some(k=>!S.eq[k]))return null;
 let w=null;for(const k of ks){const o=itemById(S.eq[k]);if(o&&(!w||iScore(o)<iScore(w)))w=o;}return w;}
function iScore(it){if(it.slot==='r')return afVal(it)*(it.af&&(it.af.k==='ls'||it.af.k==='sls')?3:1)+it.rar*2;return it.slot==='w'?iAtk(it)*(1+it.rar*.05)+(it.af?4:0):iDef(it)*3+iHp(it)*.3;}
function iPrice(it){return Math.round((it.tier+1)*(it.tier+1)*25*[1,2.5,6,15][it.rar]*(1+it.ref*.3));}
function iName(it){const tv=a=>a[Math.min(it.tier,a.length-1)];const b=it.slot==='w'?tv(WN[C_().wt]):it.slot==='a'?tv(AN):it.slot==='h'?tv(HN):it.slot==='s'?tv(SN):it.slot==='l'?tv(LHN):it.slot==='f'?tv(FN):(it.af?AFFIX[it.af.k].n+' '+tv(RNm):tv(RNm));return b+(it.ref?' +'+it.ref:'');}
function iStat(it){let s='';if(it.slot==='w'){s='ATK +'+iAtk(it);if(it.rar===2)s+=' · Crit +4%';if(it.rar===3)s+=' · Crit +8%';}else if(it.slot==='r'){s='';}else{s='DEF +'+iDef(it);if(it.slot==='a')s+=' · HP +'+iHp(it);if(it.rar===3)s+=' · Dmg taken -6%';}
 if(it.af){const A=AFFIX[it.af.k];s+=(s?' · ':'')+`<span class="af">${A.n} +${afVal(it).toFixed(1)}${A.u} ${A.d}</span>`;}return s;}
const iHtml=it=>`<span class="rt r${it.rar}">${RNAME[it.rar]}</span><b class="r${it.rar}">${iName(it)}</b>`;
function eqItems(){const o={};for(const k in S.eq)o[k]=S.eq[k]?itemById(S.eq[k]):null;return o;}
function afSum(k){let v=0;for(const it of Object.values(eqItems()))if(it&&it.af&&it.af.k===k)v+=afVal(it);return v/100;}
// stats above 99 still help, but speed-type effects grow slower (soft cap)
const sc=v=>v<=99?v:99+(v-99)*.25;
// each point you add counts STAT_W times (so 1 point per level still feels strong)
// buffed stat points count like allocated ones (x STAT_W) and may exceed the stat cap
function capSt(s){const o={},b=C_().base,x=buffSt(),R=refSt();for(const k in s){const v=Math.min(statMax(),s[k]),bb=Math.min(v,b[k]||0);o[k]=bb+(v-bb+(x[k]||0))*STAT_W+R;}return o;}
// refine milestones: each equipped item at +10/+12/+15 gives +5/+10/+15 to ALL stats (counted once)
function refSt(){let v=0;for(const it of Object.values(eqItems()))if(it)v+=refineBonus(it.ref||0);return v;}
// temporary bonuses from active buffs (Blessing, Increase Agility, Gloria)
const BST=['str','agi','vit','int','dex','luk'];
function buffSt(){const o={str:0,agi:0,vit:0,int:0,dex:0,luk:0};for(const n in hero.buffs)for(const k of BST)o[k]+=hero.buffs[n][k]||0;return o;}
function buffSum(f){let v=0;for(const n in hero.buffs)v+=hero.buffs[n][f]||0;return v;}
// Party buffs (pty:1): online, the caster broadcasts skill key + level on the current
// area's event channel (so only the same map hears it); party members within
// PARTY_BUFF_R recompute the bonus locally from the level, never from sent numbers.
const PARTY_BUFF_R=20;
function partyBuffOut(sk){if(!NET.on||!FB.pt)return;
 netEmit({y:'pbf',k:sk.k,lv:sk.lvl,pt:FB.pt,x:+hero.x.toFixed(1),z:+hero.z.toFixed(1),n:FB.name});
 const near=myParty().filter(u=>u!==FB.uid&&NET.peers[u]&&livePeer(NET.peers[u])&&dxz(hero,NET.peers[u])<=PARTY_BUFF_R).length;
 if(near)log(`${sk.e} ${sk.n} shared with ${near} party member${near>1?'s':''}`);}
function partyBuffIn(e){if(!FB.pt||e.pt!==FB.pt||hero.dead||G.mode!=='game')return;
 if(!(Math.hypot(hero.x-(+e.x),hero.z-(+e.z))<=PARTY_BUFF_R))return;
 const b=CLASSES.priest.sk.find(s=>s.pty&&s.k===e.k);if(!b)return;
 const lv=clamp(Math.round(+e.lv)||1,1,b.mx||SK_MAX),bon=b.bon(lv),dur=Math.round(b.dur*(1+.06*(lv-1)));
 hero.buffs[b.k]=Object.assign({v:0,t:dur},bon);
 txt(hero.x,hero.y+2.6,hero.z,b.e+' '+b.n,'#'+new T.Color(b.c).getHexString(),true);
 log(`${b.e} ${b.n} Lv${lv} from ${esc(String(e.n||'party').slice(0,16))} (${dur}s) · ${bonText(bon)}`);sfx('buff');}
// Heal = (Magic ATK x skill power + INT x 4) x Divine Grace. Magic ATK is the base that
// magic skills scale from (ATK x skill power multiplier); INT includes buffs and refine bonuses.
const HEAL_INT=4;
function matk(st){st=st||G.st||stats();return Math.round(st.atk*st.smult);}
function healAmt(v,st){st=st||G.st||stats();const int=(S.st.int||0)+buffSt().int+refSt();return Math.round((matk(st)*v+int*HEAL_INT)*(1+innV('priest')));}
function bonText(b){const L={str:'STR',agi:'AGI',int:'INT',dex:'DEX',luk:'LUK',hit:'Hit'},a=[];
 for(const k in b){if(L[k])a.push(L[k]+' +'+b[k]);else if(k==='aspd')a.push('Atk Spd +'+Math.round(b[k]*100)+'%');else if(k==='mspd')a.push('Move +'+Math.round(b[k]*100)+'%');else if(k==='crit')a.push('Crit +'+Math.round(b[k]*100)+'%');}
 return a.join(' · ');}
function stats(){
 const C=C_(),st=capSt(S.st),lv=S.lv,eq=eqItems(),w=eq.w,a=eq.a,h=eq.h,s=eq.s,Bf=hero.buffs;
 let sRed=afSum('def');[a,h,s,eq.l,eq.f].forEach(i=>{if(i&&i.rar===3)sRed+=.06;});
 return {
  atk:Math.round((6+C.main(st)*1.7+lv*1.2+(w?iAtk(w):0))*(1+(Bf.atk?Bf.atk.v:0)+(Bf.awk?Bf.awk.v:0))*(1+psVal('atkp'))*(1+innV('knight')+innV('smith'))),
  mhp:Math.round(((50+lv*9+st.vit*8)*C.hpM+(a?iHp(a):0))*(1+afSum('hp')+psVal('hpp'))),
  msp:Math.round((20+lv*2+st.int*4)*C.spM),
  msta:Math.round(100+sc(st.agi)*.5+sc(st.vit)*.5),
  staR:(42+sc(st.agi)*.3)*(1+afSum('sta')+psVal('stap')),staC:1-psVal('stap')*.5,
  def:Math.round((st.vit*.7+['a','h','s','l','f'].reduce((n,k)=>n+(eq[k]?iDef(eq[k]):0),0))*(1+innV('knight'))),
  aspdM:Math.min(2.4,(1+sc(st.agi)*.012+sc(st.dex)*.004)*(1+(Bf.aspd?Bf.aspd.v:0)+(Bf.awk?Bf.awk.v*.4:0))*(1+psVal('aspp'))*(1+buffSum('aspd'))),
  // Hit: each point = 1% chance to pierce a guarding enemy's block (max 50%)
  hit:Math.round(buffSum('hit')),
  // Flee: raw allocated AGI (not the x3.4 combat weight) at .2%/pt, capped 20%;
  // the Assassin innate stacks on top, keeping them the evasion class (up to 42%).
  flee:Math.min(.2,((S.st.agi||0)+buffSt().agi+refSt())*.002)+innV('assassin'),
  crit:Math.min(.6,.03+sc(st.luk)*.004+sc(st.agi)*.001+(C.crit||0)+(w&&w.rar===2?.04:0)+(w&&w.rar===3?.08:0)+afSum('crit')+psVal('critp')+innV('archer')+innV('acrobat')/3+buffSum('crit')),
  ls:afSum('ls')+psVal('lsp'),sls:afSum('sls')+psVal('slsp'),zenyM:1+afSum('zeny')+psVal('zenp')+innV('acrobat'),spR:(.8+st.int*.08)*(1+afSum('sp')+psVal('spp')),
  red:Math.min(.6,sRed+(Bf.dr?Bf.dr.v:0)+(Bf.awk?.15:0)+psVal('defp')),
  spd:Math.min(9.5,6.3+sc(st.agi)*.03)*(1+buffSum('mspd')),
  smult:(1+st.int*.011+C.main(st)*.003)*(1+psVal('smult'))*(1+innV('priest'))
 };
}
// above Lv 60 monsters grow more gently (players grow mostly through gear, refines and skills there)
function mobDef(key,lv){const p=MOBS[key];const k=lv/60;const hp=Math.round((lv<=60?60+lv*lv*.9+lv*16:4260*Math.pow(k,.9))*p.hpM),atk=Math.round((lv<=60?10+lv*3+lv*lv*.07:442*Math.pow(k,1.1))*p.atkM);
 return Object.assign({},p,{key,lv,hp,atk,def:Math.round(lv<=60?lv*.9:54+(lv-60)*.3),exp:Math.round(6+lv*lv*.6+lv*3),z:[Math.round(lv*1.2+2),Math.round(lv*3+5)],loot:[p.loot[0],p.loot[1],lv*2+5,.45]});}
function bossDef(key,lv){const p=BOSSES[key];const m=mobDef('blob',lv);return Object.assign({},p,{key,lv,hp:Math.round(m.hp*9.5/.8),atk:Math.round(m.atk*1.6/.8),def:Math.round(lv<=60?lv*1.2:72+(lv-60)*.4),exp:Math.round(m.exp*45),z:[lv*60,lv*90],aggro:1,ad:1.6,loot:[p.n+' Remnant','🏆',lv*40,1],boss:1});}

/* ================= GAME STATE ================= */
const G={mode:'title',t:0,ts:1,mobs:[],projs:[],drops:[],fx:[],texts:[],boss:null,st:null,shake:0,hitstop:0,flash:0,spawnT:0,lightHeld:false,saveT:0,hudT:0,tab:'status',bagF:'all',pois:[],shr:[],shrObj:[],gate:'sealed',bossFight:false,intro:null,surv:null,zoom:1,slow:0,int:null,chan:null,cams:0};
const hero={x:0,z:4,y:0,face:Math.PI,hp:1,sp:1,sta:100,state:'idle',actT:0,actDur:1,hitDone:false,combo:0,comboT:0,iframe:false,parryOn:false,lock:null,engage:null,dest:null,buffs:{},cd:[0,0,0],lastHit:-99,staDelay:0,dead:false,deadT:0,rollDir:0,rollDist:0,queued:null,castIdx:0,castDone:false,potT:0,model:null,moveAmt:0,flask:3,trail:null,swingCol:0xffffff};

/* ================= UI HELPERS ================= */
let toastTO=null;function toast(m,ms=1800){const t=$('#toast');t.innerHTML=m;t.style.display='block';clearTimeout(toastTO);toastTO=setTimeout(()=>t.style.display='none',ms);}
function log(m){const l=$('#log'),d=document.createElement('div');d.innerHTML=m;l.appendChild(d);while(l.children.length>5)l.removeChild(l.firstChild);setTimeout(()=>d.remove(),5000);}
let banTO=null;function banner(a,b,ms=2600){$('#bn1').textContent=a;$('#bn2').textContent=b||'';const bn=$('#banner');bn.style.opacity=1;clearTimeout(banTO);banTO=setTimeout(()=>bn.style.opacity=0,ms);}
let bigTO=null;function bigText(t,col,ms=2600){const b=$('#bigT');b.textContent=t;b.style.color=col;b.style.textShadow='0 0 20px '+col;$('#big').style.opacity=1;clearTimeout(bigTO);bigTO=setTimeout(()=>$('#big').style.opacity=0,ms);}
function txt(x,y,z,s,c,big){const el=document.createElement('div');el.className='ft'+(big?' big':'');el.textContent=s;el.style.color=c;$('#fl').appendChild(el);G.texts.push({x:x+rnd(-.3,.3),y,z,el,t:0});}
function titleCard(c){banner('Chapter '+(c+1)+': '+CHS[c].name,ACTS[actOf(c)]+' · Recommended Lv '+chLevel(c)+'+',3400);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('show',s.id===id));}
function showGameUI(v){['#hud','#ctrl','#joyHint'].forEach(s=>$(s).classList.toggle('hide',!v));document.body.classList.toggle('ingame',v);if(!v){$('#bInt').style.display='none';if(G.partnerLbl)G.partnerLbl.style.display='none';}}

/* ================= DIALOG ================= */
let dlgQ=[],dlgCb=null,dlgOpen=false;
function story(lines,cb){if(!lines||!lines.length){if(cb)cb();return;}dlgQ=lines.slice();dlgCb=cb||null;dlgOpen=true;$('#dlg').classList.add('show');G.lightHeld=false;nextDlg();}
function nextDlg(){
 if(!dlgQ.length){dlgOpen=false;$('#dlg').classList.remove('show');const cb=dlgCb;dlgCb=null;if(cb)cb();return;}
 const [code,text]=dlgQ.shift();let name='',por='',narr=false;sfx('ui');
 if(code==='H'){name=heroName();por=CLASSES[S.cls].ic;}
 else if(code==='P'||code==='PE'){name=partnerName()+(code==='PE'?' (echo)':'');por=HEROES[partnerKey()].icon;}
 else if(code==='PL'){name=partnerName()+"'s note";por='📜';}
 else if(code==='Q'){const n=CHS[S.ch].npc;name=fmt(n.n);por=n.ic;}
 else if(code==='EM'){name='Echo of '+momOf(S.hero);por='🕯️';}
 else{const s=SPK[code]||['',''];name=s[0];por=s[1];narr=code==='N';}
 $('#dPor').style.display=narr?'none':'';$('#dPor').textContent=por;$('#dName').textContent=name;const dt=$('#dText');dt.textContent=fmt(text);dt.className=narr?'narr':'';
}
$('#dlg').addEventListener('click',nextDlg);

/* ================= HERO MODEL ================= */
function eqVisFromSave(){return eqItems();}
function rebuildHero(){if(hero.model)world.remove(hero.model.root);NET.infoDirty=true;hero.model=buildHero(S.hero,S.cls,eqVisFromSave(),{cust:S.cust,job:S.job||0});world.add(hero.model.root);const w=eqItems().w;hero.swingCol=w?(w.rar===3?0xff4040:w.rar===2?0xffd060:w.rar===1?0xcfe3ff:0xffffff):0xffffff;if(hero.trail)hero.trail.setColor(hero.swingCol);syncHero();}
function syncHero(){const r=hero.model.root;hero.y=gY(hero.x,hero.z);r.position.set(hero.x,hero.y,hero.z);r.rotation.y=hero.face;}

/* ================= ENTITIES ================= */
function mkMob(d,x,z,boss){if(!d._dm){d=Object.assign({},d,{_dm:1,hp:Math.max(1,Math.round(d.hp*diff().hp))});}const mdl=buildMob(d);mdl.root.position.set(x,gY(x,z),z);world.add(mdl.root);
 return {id:netMid(),el:d.el||LAND_EL[CHS[G.dg&&G.dg.wc!=null?G.dg.wc:S.ch].b]||null,d,x,z,face:rnd(0,6.28),hp:d.hp,mhp:d.hp,r:d.r,boss,mdl,state:'wander',wT:0,wu:0,cd:rnd(.5,1.5),agg:false,wx:x,wz:z,wt:rnd(1,4),flash:0,dead:false,deadT:0,stag:0,stun:0,ripT:0,poise:0,ph:rnd(0,6),moving:false,spT:rnd(2,4),phase:1,combo:0,lunge:0,bar:null,guard:!!d.shield,gb:0};}
function chMobDefs(c){const base=chLevel(c)+S.ngp*20;return CHS[c].mobs.map((k,i)=>mobDef(k,base+i*2));}
function spawnMob(near){if(prologueActive())return;const c=S.ch,defs=chMobDefs(c);const ps=NET.on?players():[];const P=near&&ps.length?ps[ri(0,ps.length-1)]:hero;const w=[5,4,3];let r=Math.random()*12,d=defs[0];for(let i=0;i<3;i++){if((r-=w[i])<0){d=defs[i];break;}}
 let x,z,k=0;do{const a=rnd(0,Math.PI*2),rr=near?rnd(12,30):rnd(14,52);x=clamp((near?P.x:0)+Math.cos(a)*rr,-58,58);z=clamp((near?P.z:0)+Math.sin(a)*rr,-58,58);}while((Math.hypot(x-hero.x,z-hero.z)<11||ps.some(q=>Math.hypot(x-q.x,z-q.z)<11)||Math.hypot(x,z)<10||Math.hypot(x,z)>60||Math.hypot(x-AR.x,z-AR.z)<AR.r+4||G.pois.some(p=>Math.hypot(p.x-x,p.z-z)<p.r*.8))&&++k<40);
 if(k>=40)return;G.mobs.push(mkMob(d,x,z,false));}
function spawnWave(n,x,z,force){if(isPuppet()&&!force){netEmit({y:'wave',n,x:Math.round(x),z:Math.round(z)});return;}const defs=chMobDefs(S.ch);for(let i=0;i<n;i++){const d=defs[ri(0,2)];const a=rnd(0,6.28),r=rnd(9,13);const m=mkMob(d,x+Math.cos(a)*r,z+Math.sin(a)*r,false);m.agg=true;m.wave=1;G.mobs.push(m);fxRing(m.x,m.z,2,0xff6a3a,.5);}}
function spawnAdds(b,n){const defs=chMobDefs(S.ch);for(let i=0;i<n;i++){const d=defs[0];const a=rnd(0,6.28);const m=mkMob(d,b.x+Math.cos(a)*5,b.z+Math.sin(a)*5,false);m.agg=true;m.add=1;m.hp=m.mhp=Math.round(m.mhp*.6);G.mobs.push(m);fxRing(m.x,m.z,2,0x9a4aff,.5);}}
function removeMob(m){if(m.bar){m.bar.remove();m.bar=null;}world.remove(m.mdl.root);}
function respawnMobs(){if(NET.on)return;G.mobs.forEach(removeMob);G.mobs=[];G.boss=null;for(let i=0;i<mobMax();i++)spawnMob(false);fieldEncounter();}
const mobMax=()=>({low:12,medium:15,high:18}[QUAL])+(NET.on?4*Math.min(3,Object.values(NET.peers).filter(livePeer).length):0);
const nearest=(maxd,from)=>{from=from||hero;let b=null,bd=maxd;for(const m of G.mobs){if(m.dead)continue;const d=dxz(from,m)-m.r;if(d<bd){bd=d;b=m;}}return b;};

function loadChapter(c,keepHp,dg){G.inArena=false;G.dg=dg||null;G.intro=null;$('#cine').style.opacity=0;
 G.mobs.forEach(removeMob);G.texts.forEach(t=>t.el.remove());G.fx.forEach(f=>world.remove(f.m));G.projs.forEach(p=>world.remove(p.m));G.drops.forEach(d=>world.remove(d.g));
 S.ch=c;G.mobs=[];G.projs=[];G.drops=[];G.fx=[];G.texts=[];G.boss=null;G.bossFight=false;G.surv=null;G.chan=null;hero.lock=null;hero.engage=null;hero.dest=null;
 buildWorld(G.dg&&G.dg.wc!=null?G.dg.wc:c);hero.x=0;hero.z=4;hero.face=Math.PI;hero.dead=false;hero.state='idle';
 G.st=stats();if(!keepHp){hero.hp=G.st.mhp;hero.sp=G.st.msp;hero.flask=S.flask;}hero.sta=G.st.msta;
 rebuildHero();const onl=FB.uid&&FB.online&&FB.avail&&!prologueActive();if(!onl&&!G.dg)for(let i=0;i<mobMax();i++)spawnMob(false);G.spawnT=3;G.introDone=0;
 G.gate=S.q[c].s>=3||S.cleared[c]?'open':'sealed';updateGate();snapCam();musicFor(c,false);if(G.dg)dgSetup();jmSpawn();alliesClear();G.pull=null;sealBuild();
 if(onl)netJoin(c);else netLeave();fieldEncounter();setupFieldPartner();
}
function updateGate(){const f=G.fog;if(!f)return;const open=G.gate==='open';f.m.material.color.setHex(open?0x9fd0ff:0x707a88);f.m.material.opacity=open?.45:.3;f.gl.material.color.setHex(open?0x8ad8ff:0x444444);f.gl.material.opacity=open?.45:.15;}

/* ================= FX ================= */
function fxRing(x,z,r,col,dur=.45,y){const m=mesh(RING(.8,1),basic(col,{transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}),x,(y===undefined?gY(x,z):y)+.1,z);m.rotation.x=-Math.PI/2;m.castShadow=false;world.add(m);G.fx.push({k:'ring',m,r,t:0,dur});}
function fxSlash(x,z,face,col,big,reach){const g=geo('slash',()=>new T.RingGeometry(.75,1,24,1,-Math.PI*.38,Math.PI*.76));const m=mesh(g,basic(col,{transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}),x,gY(x,z)+1.1,z);m.rotation.x=-Math.PI/2;m.rotation.z=face-Math.PI/2;const s=(reach||2.4)*(big?1.15:1);m.scale.set(s,s,1);m.castShadow=false;world.add(m);G.fx.push({k:'slash',m,t:0,dur:big?.3:.18});}
function fxSpark(x,y,z,col,s=1.5){const sp=glowSprite(col,s);sp.position.set(x,y,z);world.add(sp);G.fx.push({k:'spark',m:sp,t:0,dur:.3,s});}
function fxDecal(x,z,r,dur,col,onEnd,arc){const g=grp(x,gY(x,z)+.08,z);const og=arc?geo('arcR'+arc.toFixed(2),()=>new T.RingGeometry(.94,1,40,1,-arc/2,arc)):RING(.94,1);const fg=arc?geo('arcC'+arc.toFixed(2),()=>new T.CircleGeometry(1,40,-arc/2,arc)):CIRC(1);
 const o=mesh(og,basic(col,{transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false}));o.rotation.x=-Math.PI/2;o.scale.setScalar(r);o.castShadow=false;g.add(o);const f=mesh(fg,basic(col,{transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide}));f.rotation.x=-Math.PI/2;f.castShadow=false;g.add(f);if(arc!==undefined){g.rotation.y=arc===undefined?0:0;}world.add(g);const e={k:'decal',m:g,f,r,x,z,t:0,dur,onEnd};G.fx.push(e);return e;}
function fxMeteor(x,z,col,dur){const m=mesh(SPH(.5,8,6),basic(col),x+3,gY(x,z)+14,z-3);m.add(glowSprite(col,3));m.castShadow=false;world.add(m);G.fx.push({k:'meteor',m,x,z,t:0,dur});}
function updateFx(dt){for(const f of G.fx){f.t+=dt;const p=Math.min(1,f.t/f.dur);
 if(f.k==='ring'){f.m.scale.setScalar(f.r*(.25+.75*p));f.m.material.opacity=.9*(1-p);}
 else if(f.k==='slash'){f.m.material.opacity=.9*(1-p);}
 else if(f.k==='spark'){const s=f.s*(1+p);f.m.scale.set(s,s,s);f.m.material.opacity=1-p;}
 else if(f.k==='decal'){f.f.scale.setScalar(f.r*p);f.f.material.opacity=.2+.3*p;}
 else if(f.k==='fn'){f.u(p,f,dt);}
 else if(f.k==='meteor'){const gy=gY(f.x,f.z);f.m.position.set(lerp(f.x+3,f.x,p),lerp(gy+14,gy,p),lerp(f.z-3,f.z,p));}
 if(f.t>=f.dur){world.remove(f.m);if(f.onEnd)f.onEnd();if(f.k==='meteor'){fxRing(f.x,f.z,2.5,0xff7a2a,.35);PS.burst(f.x,gY(f.x,f.z)+.3,f.z,12,0xff7a2a,{sp:5,up:4});}}}
 G.fx=G.fx.filter(f=>f.t<f.dur);}

/* ================= HERO ACTIONS ================= */
function useSta(n){n*=G.st.staC||1;if(hero.sta<4){$('#stB').classList.add('low');setTimeout(()=>$('#stB').classList.remove('low'),300);sfx('deny');return false;}hero.sta=Math.max(0,hero.sta-n);hero.staDelay=.8;return true;}
function softTarget(){const C=C_();let r;if(hero.lock&&!hero.lock.dead&&dxz(hero,hero.lock)<28)r=hero.lock;else if(hero.engage&&!hero.engage.dead)r=hero.engage;else r=nearest(C.ranged?C.range:5.5);
 const dp=duelTarget();if(dp&&dxz(hero,dp)<(C.ranged?C.range:5.5)&&(!r||dxz(hero,dp)<dxz(hero,r)))r=dp;return r;}
function faceTo(m){hero.face=Math.atan2(m.x-hero.x,m.z-hero.z);}
function canAct(kind){if(hero.dead||!G.st||G.intro)return false;const s=hero.state;if(s==='idle'||s==='move')return true;
 if(s==='light'&&hero.actT>hero.actDur*.62)return true;
 if(kind==='roll'&&(s==='light'||s==='heavy'||s==='cast')&&hero.hitDone)return true;
 if(kind==='roll'&&s==='drink'&&hero.actT>.5)return true;
 if(kind==='roll'&&s==='parry'&&hero.actT>.32)return true;
 if(s==='guard')return kind==='roll'||kind==='light'||kind==='heavy';return false;}
function lightAttack(){if(!canAct('light')){if(['light','heavy'].includes(hero.state)&&hero.actT>hero.actDur*.35)hero.queued='light';return;}
 const C=C_();if(!useSta(C.ranged?8:12))return;const t=softTarget();if(t)faceTo(t);
 hero.combo=hero.comboT>0?(hero.combo+1)%3:0;hero.comboT=1.1;hero.state='light';hero.actT=0;hero.hitDone=false;hero.actDur=C.aspd/G.st.aspdM*(hero.combo===2?1.25:1);hero.queued=null;sfx(C.ranged?'draw':'swing');}
function heavyAttack(){if(!canAct('heavy')){if(['light'].includes(hero.state))hero.queued='heavy';return;}const C=C_();if(!useSta(28))return;const t=softTarget();if(t)faceTo(t);
 hero.state='heavy';hero.actT=0;hero.hitDone=false;hero.actDur=Math.max(.8,1.2/Math.sqrt(G.st.aspdM));hero.queued=null;sfx('heavywind');}
function dodge(){if(!canAct('roll'))return;const cost=S.cls==='assassin'?15:20;if(!useSta(cost))return;const m=Math.hypot(inp.x,inp.z);
 if(m>.15){hero.rollDir=Math.atan2(inp.x,inp.z);hero.rollDist=6.2;hero.actDur=.5;hero.face=hero.rollDir;hero.back=false;}else{hero.rollDir=hero.face+Math.PI;hero.rollDist=3.4;hero.actDur=.4;hero.back=true;}
 hero.state='roll';hero.actT=0;hero.hitDone=true;hero.queued=null;hero.engage=null;hero.dest=null;sfx('roll');PS.burst(hero.x,hero.y+.2,hero.z,6,0xc8b89a,{sp:2,up:1.5,s:.8,g:6});}
function parry(){if(!canAct('parry'))return;if(!useSta(12))return;const t=softTarget();if(t&&dxz(hero,t)<7)faceTo(t);hero.state='parry';hero.actT=0;hero.actDur=.65;hero.hitDone=false;sfx('parrywind');}
function drinkFlask(){if(hero.dead||hero.potT>0||G.intro)return;if(hero.flask<=0){toast('Flask is empty. Rest at a Site of Grace to refill.');sfx('deny');return;}if(!canAct('drink')&&hero.state!=='roll')return;if(hero.hp>=G.st.mhp){toast('HP is full');return;}
 hero.state='drink';hero.actT=0;hero.actDur=.95;hero.hitDone=true;hero.queued=null;hero.flask--;hero.potT=.3;sfx('drink');
 setTimeout(()=>{if(hero.dead)return;const h=Math.round(G.st.mhp*.45);hero.hp=Math.min(G.st.mhp,hero.hp+h);txt(hero.x,hero.y+2.6,hero.z,'+'+h,'#ff8a8a',true);fxRing(hero.x,hero.z,1.6,0xff6a6a,.4);PS.burst(hero.x,hero.y+1,hero.z,10,0xff6a6a,{sp:1.5,up:3,g:2});},450);}
function usePot(){if(hero.dead||hero.potT>0||G.intro)return;const st=G.st;let key;
 if(hero.hp<st.mhp*.75||hero.sp>=st.msp*.6||!S.pots.blue){const have=['white','orange','red'].filter(k=>S.pots[k]>0);if(!have.length){toast('No potions. Buy some at the Shop (max 5 each).');sfx('deny');return;}if(hero.hp>=st.mhp){toast('HP is full');return;}
  const def=(st.mhp-hero.hp)/st.mhp;key=have.find(k=>POT[k].hp<=def*1.15)||have[have.length-1];const h=Math.round(st.mhp*POT[key].hp);hero.hp=Math.min(st.mhp,hero.hp+h);txt(hero.x,hero.y+2.6,hero.z,'+'+h,'#6dff8a',true);}
 else{key='blue';const s=Math.round(st.msp*POT.blue.sp);hero.sp=Math.min(st.msp,hero.sp+s);txt(hero.x,hero.y+2.6,hero.z,'+'+s+' SP','#6db6ff',true);}
 S.pots[key]--;hero.potT=.6;sfx('potion');fxRing(hero.x,hero.z,1.5,key==='blue'?0x6db6ff:0x6dff8a,.4);}
function useSkill(slot){if(hero.dead||G.intro)return;if(S.bar[slot]===PARABELLUM){castParabellum();return;}const sk=barSkill(slot);if(!sk){toast('Empty skill slot. Learn skills in ☰ Menu → Skills');sfx('deny');return;}castSk(sk);}
function castSk(sk){if(hero.dead||G.intro)return;const i=sk.idx;if(hero.cd[i]>0)return;if(hero.sp<sk.sp){toast('Not enough SP 💧');sfx('deny');return;}
 if(sk.zeny){const z=zCost(sk);if(S.zeny<z){toast(sk.n+' needs '+z.toLocaleString()+' zeny 💰');sfx('deny');return;}}
 if(!canAct('skill'))return;const t=softTarget();if(t)faceTo(t);
 if((sk.t==='strike'||sk.t==='multi'||sk.t==='aoeT')&&!t){toast('No target in range');return;}
 if(sk.t==='strike'||sk.t==='multi'){const C=C_();const rng=(sk.rng||C.ranged)?(C.range||12):C.reach+1.2;if(dxz(hero,t)-t.r>rng){toast('Target too far');return;}}
 if(sk.zeny){const z=zCost(sk);S.zeny-=z;if(sk.zeny>1)txt(hero.x,hero.y+3.3,hero.z,'-'+z.toLocaleString()+' z','#ffd24a',false);}hero.sp-=sk.sp;hero.cd[i]=sk.cd*(1-Math.min(.5,psVal('cdr')));hero.state='cast';hero.castIdx=i;hero.castDone=false;hero.actT=0;hero.actDur=sk.t==='multi'&&sk.hits>4?.9:.55;hero.hitDone=false;hero.castTgt=t;sfx('cast');}
function zCost(sk){return Math.max(1,Math.round((10+S.lv*4)*sk.zeny*(1-innV('acrobat'))));}
function doSkill(i){const sk=skDef(i),st=G.st,t=hero.castTgt,C=C_();const mg=!!(C.magic||C.magicSk);txt(hero.x,hero.y+2.8,hero.z,sk.n+'!','#'+new T.Color(sk.c).getHexString(),false);
 skillVis(sk,S.cls,hero,t,false);if(NET.on)netEmit({y:'sf',i,f:+hero.face.toFixed(2),tx:t?+t.x.toFixed(1):null,tz:t?+t.z.toFixed(1):null});
 if(sk.ult){bigText(sk.n.toUpperCase(),'#'+new T.Color(sk.c).getHexString(),1800);G.slow=Math.max(G.slow||0,.7);G.zoom=.82;G.shake=.5;fxRing(hero.x,hero.z,(sk.r||6)+1,sk.c,1);PS.burst(hero.x,hero.y+1,hero.z,50,sk.c,{sp:6,up:6,life:1.2});sfx('stier');}
 if(sk.k==='awk'){bigText('AWAKENING','#'+new T.Color(sk.c).getHexString(),2200);G.zoom=.8;G.shake=.4;PS.burst(hero.x,hero.y+1,hero.z,70,sk.c,{sp:4,up:8,life:1.4});fxRing(hero.x,hero.z,6,sk.c,1);sfx('levelup');}
 if(sk.t==='buff'){hero.buffs[sk.k]=Object.assign({v:sk.v,t:sk.dur},sk.bon);log(`${sk.e} ${sk.n} (${sk.dur}s)${sk.bon?' · '+bonText(sk.bon):''}`);sfx('buff');if(sk.pty)partyBuffOut(sk);}
 else if(sk.t==='heal'){const h=healAmt(sk.v,st);hero.hp=Math.min(st.mhp,hero.hp+h);txt(hero.x,hero.y+2.2,hero.z,'+'+h,'#6dff8a',true);sfx('heal');}
 else if(sk.t==='aoe'){fxRing(hero.x,hero.z,sk.r,sk.c,.5);G.shake=.3;sfx('aoe');PS.burst(hero.x,hero.y+.5,hero.z,24,sk.c,{sp:sk.r*1.3,up:2});{const dp=duelTarget();if(dp&&dxz(hero,dp)<=sk.r+.5)pvpHit(sk.m,{kind:'skill'});}for(const m of G.mobs)if(!m.dead&&dxz(hero,m)<=sk.r+m.r){dealDamage(m,sk.m,{kind:'skill',el:sk.el,poise:30,col:sk.c,magic:mg,fromBehind:1});if(sk.stun&&!m.dead){m.stun=m.boss?sk.stun*.3:sk.stun;cancelWind(m);}if(sk.kb&&!m.dead&&!m.boss)knock(m,2.2);}}
 else if(sk.t==='aoeT'&&t){const x=t.x,z=t.z;
  setTimeout(()=>{fxRing(x,z,sk.r,sk.c,.5);G.shake=.25;sfx('aoe');PS.burst(x,gY(x,z)+.5,z,24,sk.c,{sp:sk.r,up:3});const dp=duelTarget();if(dp&&Math.hypot(dp.x-x,dp.z-z)<=sk.r+.5)pvpHit(sk.m,{kind:'skill'});for(const m of G.mobs)if(!m.dead&&Math.hypot(m.x-x,m.z-z)<=sk.r+m.r)dealDamage(m,sk.m,{kind:'skill',el:sk.el,poise:25,col:sk.c,magic:mg,fromBehind:1});},S.cls==='wizard'?550:250);}
 else if(t&&t.uid){if(C.ranged||sk.rng){const hits=sk.hits||1;for(let k=0;k<hits;k++)setTimeout(()=>shoot(t,sk.m,{kind:'skill',el:sk.el,col:sk.c,big:1,poise:12,magic:mg,coin:sk.zeny,n:k}),k*90);}
  else{const hits=sk.hits||1;for(let k=0;k<hits;k++)setTimeout(()=>{sfx('hit');pvpMelee(C.reach+2.5,3.2,sk.m,{kind:'skill'});},k*70);}}
 else if(t&&!t.dead){if(C.ranged||sk.rng){const hits=sk.hits||1;for(let k=0;k<hits;k++)setTimeout(()=>{if(!t.dead)shoot(t,sk.m,{kind:'skill',el:sk.el,col:sk.c,big:1,poise:sk.poise||12,magic:mg,coin:sk.zeny,n:k});},k*90);
  if(sk.pull)setTimeout(()=>{if(t.dead)return;if(!t.boss){const a=Math.atan2(hero.x-t.x,hero.z-t.z),d=Math.max(0,dxz(hero,t)-t.r-1.6);t.x+=Math.sin(a)*d;t.z+=Math.cos(a)*d;fxRing(t.x,t.z,2,sk.c,.3);}t.stun=t.boss?sk.stun*.3:sk.stun;cancelWind(t);},Math.min(500,dxz(hero,t)*45+80));}
  else{const hits=sk.hits||1;if(sk.n==='Venom Dash'){const a=Math.atan2(t.x-hero.x,t.z-hero.z),dd=Math.max(0,dxz(hero,t)-t.r-.8);hero.x+=Math.sin(a)*dd;hero.z+=Math.cos(a)*dd;fxRing(hero.x,hero.z,2,sk.c,.3);}for(let k=0;k<hits;k++)setTimeout(()=>{if(t.dead)return;sfx('hit');dealDamage(t,sk.m,{kind:'skill',el:sk.el,poise:hits>1?6:35,col:sk.c,magic:mg});if(sk.stun&&!t.dead){t.stun=t.boss?sk.stun*.3:sk.stun;cancelWind(t);}},k*70);fxSpark(t.x,t.mdl.h*(t.d.s||1)*.5+gY(t.x,t.z),t.z,sk.c,2.5);}}}
function knock(m,d){const a=Math.atan2(m.x-hero.x,m.z-hero.z);m.x+=Math.sin(a)*d;m.z+=Math.cos(a)*d;}
function cancelWind(m){if(m.state==='windup'){m.state='chase';m.mdl.tel.material.opacity=0;}m.combo=0;}
function shoot(t,mult,o){const C=C_();const col=o.col||(S.cls==='archer'?0xfff0c0:S.cls==='priest'?0xfff2a0:0xb98cff);let mm;
 if(S.cls==='archer'&&!o.big){mm=new T.Group();mm.add(mesh(BOX(.05,.05,1.1),mat(0x8a6a3a),0,0,0));const hd=mesh(CONE(.07,.2,4),mat(0xdddddd),0,0,.6);hd.rotation.x=Math.PI/2;mm.add(hd);}
 else if(o.kind==='skill'){mm=o.coin?coinMesh(o.coin>8?1.5:1.1):projMesh(o.el,col,S.cls);}
 else{mm=mesh(SPH(o.big?.32:.2,8,6),basic(col));mm.add(glowSprite(col,o.big?2.2:1.3));mm.castShadow=false;}
 const sx=hero.x+Math.sin(hero.face)*.6,sz=hero.z+Math.cos(hero.face)*.6;mm.position.set(sx,hero.y+1.3,sz);world.add(mm);
 let a=hero.face;if(t)a=Math.atan2(t.x-sx,t.z-sz);mm.rotation.y=a;const sp=o.big?20:24;
 G.projs.push({m:mm,x:sx,z:sz,yo:1.3,vx:Math.sin(a)*sp,vz:Math.cos(a)*sp,life:.75,mult,o:Object.assign({magic:!!C.magic},o),pierce:o.pierce?3:0,hit:new Set(),hostile:0,tgt:t});if(C.yoyo&&o.kind==='skill')fxProjString(G.projs[G.projs.length-1],(o.n||0)%2?'L':'R');}
function doAttackHit(kind){const C=C_(),heavy=kind==='heavy',st=G.st;
 const mult=heavy?2.5:(hero.combo===2?1.35:1);
 if(C.yoyo){yoyoAttack(heavy,mult,kind);return;}
 if(C.ranged){const t=softTarget();if(t)faceTo(t);sfx(S.cls==='archer'?'arrow':'bolt');shoot(t,mult,{kind,big:heavy,pierce:heavy&&S.cls==='archer',poise:heavy?40:8,aoe:heavy&&S.cls==='wizard'?2.5:0});return;}
 const reach=C.reach+(heavy?.6:0),arc=heavy?1.7:1.25;fxSlash(hero.x+Math.sin(hero.face)*.6,hero.z+Math.cos(hero.face)*.6,hero.face,heavy?0xffb070:hero.swingCol,heavy,reach);
 let hit=0;for(const m of G.mobs){if(m.dead)continue;const d=dxz(hero,m);if(d>reach+m.r)continue;const a=Math.atan2(m.x-hero.x,m.z-hero.z);if(Math.abs(angDiff(a,hero.face))>arc&&d>m.r+.6)continue;
  if(C.dual&&!heavy){dealDamage(m,mult*.62,{kind,poise:6});if(!m.dead)setTimeout(()=>{if(!m.dead)dealDamage(m,mult*.62,{kind,poise:6});},70);}else dealDamage(m,mult,{kind,poise:heavy?45:10});hit++;}
{const dp=duelTarget();if(dp&&dxz(hero,dp)<=reach+.5){const a=Math.atan2(dp.x-hero.x,dp.z-hero.z);if(Math.abs(angDiff(a,hero.face))<=arc||dxz(hero,dp)<1.1){pvpHit(C.dual&&!heavy?mult*1.24:mult,{kind,unblock:heavy});hit++;}}}
 if(hit){sfx(heavy?'heavyhit':'hit');if(heavy){G.shake=.3;G.hitstop=.08;}else G.hitstop=.035;}else sfx(heavy?'heavyswing':'whiff');}
function dealDamage(m,mult,o){if(m.dead)return 0;const st=G.st;let crit=false,rip=false,dmg;const C=C_();const magic=o.magic!==undefined?o.magic:!!C.magic;
 const hy=gY(m.x,m.z)+m.mdl.h*(m.d.s||1)*.9+.3;
 // guard
 if(m.guard&&m.gb<=0&&m.stag<=0&&m.ripT<=0&&!o.fromBehind&&!innV('archer')&&!(st.hit>0&&Math.random()<Math.min(.5,st.hit*.01))){const a=Math.atan2(hero.x-m.x,hero.z-m.z);const front=Math.abs(angDiff(a,m.face))<1.2;if(front){if(o.kind==='heavy'||(o.poise||0)>=30){m.gb=2.5;txt(m.x,hy,m.z,'GUARD BROKEN','#ffd76a',true);m.stag=1.2;sfx('guardbreak');fxSpark(m.x,hy-.8,m.z,0xffd76a,2.5);if(isPuppet())netHit({id:m.id,gb:1});}
  else{dmg=Math.max(1,Math.round(st.atk*mult*.2*(100/(100+m.d.def))));m.hp-=dmg;txt(m.x,hy,m.z,'BLOCKED '+dmg,'#9ab',false);sfx('block');fxSpark(m.x,hy-.8,m.z,0xaaccff,1.2);m.agg=true;if(isPuppet()){netHit({id:m.id,d:dmg,k:o.kind||''});m.hpPredT=G.t+.6;if(m.hp<1)m.hp=1;return dmg;}markDmg(m);if(m.hp<=0)killMob(m);return dmg;}}}
 if(m.ripT>0&&(o.kind==='light'||o.kind==='heavy')){rip=true;m.ripT=0;dmg=st.atk*mult*3.4*(100/(100+m.d.def*.3));}
 else{crit=!!o.crit||Math.random()<st.crit;dmg=st.atk*mult*(o.kind==='skill'?st.smult:1)*rnd(.92,1.08)*(crit?1.6:1)*(100/(100+m.d.def*(crit?.4:1)));}
 let elT='';if(o.el&&m.el){if(o.el===m.el[0]){dmg*=1.5;elT='WEAK!';}else if(o.el===m.el[1]){dmg*=.6;elT='RESIST';}}
 dmg=Math.max(1,Math.round(dmg));if(m.d.mech||m.nImm){if(isPuppet()){if(m.nImm){gText(m,'🛡️ SHIELDED');return 0;}}else{dmg=gateDmg(m,dmg,FB.uid||'me');if(dmg<=0)return 0;}}m.hp-=dmg;m.flash=.12;m.agg=true;if(elT)txt(m.x,hy+.9,m.z,(EL[o.el]?EL[o.el][0]:'')+' '+elT,elT==='WEAK!'?EL[o.el][2]:'#888',elT==='WEAK!');
 const lsv=magic?st.sls:st.ls;if(lsv>0){const h=dmg*lsv;hero.hp=Math.min(st.mhp,hero.hp+h);if(h>=1&&Math.random()<.5)txt(hero.x,hero.y+2.2,hero.z,'+'+Math.round(h),magic?'#b98cff':'#ff6a8a',false);}
 if(rip){txt(m.x,hy+.6,m.z,'CRITICAL!','#ffd76a',true);txt(m.x,hy,m.z,dmg,'#ffd76a',true);G.hitstop=.14;G.shake=.4;G.zoom=.85;fxSpark(m.x,hy-.6,m.z,0xffd76a,3.5);sfx('crit');PS.burst(m.x,hy-.6,m.z,22,0xffd76a,{sp:5,up:4});}
 else{txt(m.x,hy,m.z,(crit?'✦':'')+dmg,crit?'#ffe14d':o.kind==='skill'?'#'+new T.Color(o.col||0xff9a3c).getHexString():o.kind==='heavy'?'#ffb070':'#ffffff',crit||o.kind!=='light');if(crit)sfx('crit');}
 fxSpark(m.x,hy-.8,m.z,crit||rip?0xffd76a:0xffffff,.9);PS.burst(m.x,hy-.8,m.z,crit?10:5,m.d.col,{sp:3,up:2.5,s:.7});
 const po=o.poise||0;
 if(isPuppet()){netHit({id:m.id,d:dmg,p:po,rip:rip?1:0,k:o.kind||''});m.hpPredT=G.t+.6;if(m.hp<1)m.hp=1;return dmg;}
 markDmg(m);applyPoise(m,po,rip,o.kind,true);if(m.hp<=0)killMob(m);return dmg;}
function markDmg(m){if(FB.uid)(m.dmgBy=m.dmgBy||{})[FB.uid]=1;}
function applyPoise(m,po,rip,kind,local){const hy=gY(m.x,m.z)+m.mdl.h*(m.d.s||1)*.9+.3;
 if(!m.boss){if(po>=30||rip){m.stag=.6;cancelWind(m);if(local)knock(m,kind==='heavy'?1.2:.4);}else if(po>=8&&Math.random()<.25&&m.state!=='windup'){m.stag=.25;}}
 else{m.poise+=po*(m.phase===2?.7:1)*(m.snareT>0?1.6:1)+(rip?30:0);if(m.poise>=100){m.poise=0;m.stag=2.2;m.ripT=2.2;cancelWind(m);txt(m.x,hy+1.2,m.z,'STANCE BROKEN','#8fd3ff',true);sfx('stagger');G.shake=.3;}}}
function heroHit(dmg,src,unblock,pv,x){if(hero.dead||G.intro)return 'x';const st=G.st;
 if(hero.iframe){return 'dodge';}
 if(hero.parryOn&&!unblock){parrySuccess(src);return 'parry';}
 {const fl=(st.flee||0)*(x&&x.acc?.5:1);if(fl>0&&!unblock&&Math.random()<fl){txt(hero.x,hero.y+2.5,hero.z,'MISS','#9affc8',true);fxSpark(hero.x,hero.y+1.2,hero.z,0x9affc8,1.6);sfx('whiff');return 'dodge';}}
 if(hero.state==='guard'&&C_().shield&&!unblock){
  // Mirror of the mob shield: frontal cone ±1.2 rad, reduction scaled by the
  // shield item, stamina per blocked hit; an empty bar means GUARD BROKEN.
  // Red/unblockable attacks never test this branch. Sourceless damage (no
  // attacker position) is treated as frontal.
  const front=!src||src.x==null||Math.abs(angDiff(Math.atan2(src.x-hero.x,src.z-hero.z),hero.face))<1.2;
  if(front){
   const sh=eqItems().s,red=Math.min(.8,.5+(sh?sh.tier*.04+(sh.ref||0)*.012:0));
   let bd=Math.max(1,Math.round(dmg*(pv?1:diff().dmg)*(1-red)*(100/(100+st.def*(pv?1.6:1)))));
   if(pv)bd=Math.min(bd,Math.max(1,Math.round(st.mhp*pv)));
   const cost=10+Math.round(bd*.5);
   if(hero.sta>=cost){
    hero.sta-=cost;G.lastPv=bd;hero.hp-=bd;hero.lastHit=G.t;
    txt(hero.x,hero.y+2.3,hero.z,'BLOCKED '+bd,'#9ab',false);sfx('block');
    fxSpark(hero.x+Math.sin(hero.face)*.7,hero.y+1.2,hero.z+Math.cos(hero.face)*.7,0xaaccff,1.6);
    if(hero.hp<=0)heroDie();return 'hit';}
   hero.sta=0;hero.state='stun';hero.actT=0;hero.actDur=.9;hero.queued=null;
   txt(hero.x,hero.y+2.5,hero.z,'GUARD BROKEN','#ffd76a',true);sfx('guardbreak');G.shake=.25;
  }
 }
 if(x&&x.mg)dmg*=1-innV('wizard');
 let d=Math.max(1,Math.round(dmg*(pv?1:diff().dmg)*rnd(.92,1.08)*(100/(100+st.def*(pv?1.6:1)))*(1-st.red)*(hero.state==='drink'?1.3:1)));if(pv)d=Math.min(d,Math.max(1,Math.round(st.mhp*pv)));else d=Math.min(d,Math.round(st.mhp*.85));G.lastPv=d;hero.hp-=d;hero.lastHit=G.t;txt(hero.x,hero.y+2.4,hero.z,'-'+d,'#ff5a5a',d>st.mhp*.2);G.shake=Math.max(G.shake,d>st.mhp*.2?.4:.18);sfx(d>st.mhp*.25?'hurtbig':'hurt');
 PS.burst(hero.x,hero.y+1.2,hero.z,8,0xff3a3a,{sp:2.5,up:2.5,s:.7});
 $('#vig').style.boxShadow='inset 0 0 120px rgba(255,0,0,.6)';setTimeout(()=>$('#vig').style.boxShadow='inset 0 0 120px rgba(255,0,0,0)',160);
 if(hero.state!=='heavy'&&hero.state!=='cast'&&hero.state!=='roll'){hero.state='stun';hero.actT=0;hero.actDur=unblock?.45:.3;hero.queued=null;}
 if(G.chan){G.chan=null;toast('Interrupted!',900);}
 if(hero.hp<=0)heroDie();return 'hit';}
function parrySuccess(src){txt(hero.x,hero.y+2.8,hero.z,'PARRY!','#8fd3ff',true);fxSpark(hero.x+Math.sin(hero.face)*.8,hero.y+1.3,hero.z+Math.cos(hero.face)*.8,0xbfe8ff,3.5);fxRing(hero.x,hero.z,2.2,0x8fd3ff,.35);G.hitstop=.18;G.shake=.25;G.zoom=.82;G.flash=.35;hero.sta=Math.min(G.st.msta,hero.sta+25);sfx('parry');PS.burst(hero.x+Math.sin(hero.face)*.8,hero.y+1.3,hero.z+Math.cos(hero.face)*.8,18,0xbfe8ff,{sp:4,up:3,g:4});
 if(src&&src.d&&isPuppet()&&src.id)netHit({id:src.id,pr:1});
 if(src&&src.d){src.stag=src.boss?1.6:2.2;src.ripT=src.stag;cancelWind(src);if(src.boss){src.poise+=40;}txt(src.x,gY(src.x,src.z)+src.mdl.h*(src.d.s||1)+.5,src.z,'RIPOSTE!','#ffd76a',true);}}
function heroDie(){if(NET.duel&&NET.duel.team){const d=NET.duel;if(!d.myOut){d.myOut=1;hero.hp=0;hero.dead=true;hero.deadT=1e9;hero.state='dead';netEmit({y:'dout'});bigText('YOU ARE OUT','#c41e1e',2000);log('💀 You are out. Watch your team!');teamCheck();}return;}
 if(NET.duel&&(!G.bossFight||(G.dg&&G.dg.arena))){const u=NET.duel.uid;hero.hp=Math.round(G.st.mhp*.3);hero.state='stun';hero.actT=0;hero.actDur=1.2;netEmit({y:'dw',to:u});duelEnd(false);return;}
 hero.dead=true;hero.hp=0;hero.state='dead';hero.deadT=3.6;hero.lock=null;hero.engage=null;hero.dest=null;G.lightHeld=false;G.chan=null;sfx('death');musicDuck(3);
 if(S.zeny>0){S.blood={ch:S.ch,x:hero.x,z:hero.z,z$:S.zeny};mkBlood(hero.x,hero.z);log(`💀 Dropped ${S.zeny.toLocaleString()} zeny here`);S.zeny=0;}
 bigText('YOU DIED','#c41e1e',3000);
 if(G.surv){G.surv=null;S.q[S.ch].p=0;log('The beacon went dark. Try again.');}
 if(!NET.on)for(const m of G.mobs){m.agg=false;cancelWind(m);}
 if(G.bossFight||G.boss){endBossFight(false);}save();}
function respawn(){if(G.dg){exitDungeon();return;}const st=G.st;G.inArena=false;hero.dead=false;hero.state='idle';hero.x=0;hero.z=4;hero.face=Math.PI;hero.hp=st.mhp;hero.sp=st.msp;hero.sta=st.msta;hero.flask=S.flask;respawnMobs();G.introDone=0;G.gate=S.q[S.ch].s>=3||S.cleared[S.ch]?'open':'sealed';updateGate();snapCam();musicFor(S.ch,false);}
function restAtGrace(){const st=G.st;hero.hp=st.mhp;hero.sp=st.msp;hero.sta=st.msta;hero.flask=S.flask;hero.buffs={};if(!NET.on){G.mobs.filter(m=>!m.dead&&m.boss).forEach(removeMob);respawnMobs();}bigText('REST','#ffd76a',1600);sfx('rest');fxRing(0,0,4,0xffd76a,1);PS.burst(0,gY(0,0)+.5,0,30,0xffd76a,{sp:2,up:4,g:1,life:1.2});save();toast('Flask refilled · HP/SP restored'+(NET.on?'':' · Enemies have returned')+' · Game saved',2600);}
function gainExp(x){x=Math.round(x);S.exp+=x;let up=false;while(S.exp>=need(S.lv)&&S.lv<LV_MAX){S.exp-=need(S.lv);S.lv++;up=true;if(S.job<3&&S.lv===JOB_LV[S.job+1]){setTimeout(()=>{banner('🎓 Job Master Orin appeared','He waits by the Site of Grace',3200);jmSpawn();},1500);}}
 if(up)skSync();
 if(up){NET.infoDirty=true;G.st=stats();hero.hp=G.st.mhp;hero.sp=G.st.msp;fxRing(hero.x,hero.z,3,0xffd76a,.9);fxSpark(hero.x,hero.y+1.5,hero.z,0xffd76a,4);PS.burst(hero.x,hero.y+.5,hero.z,30,0xffd76a,{sp:2,up:5,g:2,life:1});txt(hero.x,hero.y+3.2,hero.z,'LEVEL UP!','#ffd76a',true);toast(`⭐ Level ${S.lv}! +1 stat point${S.skp?' · '+S.skp+' skill points':''} → ☰ Menu`,2200);sfx('levelup');}}
function rollRarity(boss){const r=Math.random();if(boss)return r<.35?3:2;return r<.014?3:r<.08?2:r<.3?1:0;}
function rollAffix(slot,rar){const pool=slot==='r'?AFX_RING:AFX_WPN;if(slot==='w'&&rar<2)return null;return {k:pool[ri(0,pool.length-1)]};}
function rollEquip(tier,boss){const C=C_();const slots=C.shield?['w','w','w','a','a','h','h','l','s','s','f','r','r','r']:['w','w','w','w','a','a','a','h','h','l','f','r','r','r'];const slot=slots[ri(0,slots.length-1)];const rar=rollRarity(boss);return {slot,tier:clamp(tier+(Math.random()<.08?1:0),0,5),rar,af:rollAffix(slot,rar)};}
function chTier(c){return Math.min(5,Math.floor(c/4)+(c%4>=2?1:0));}
function killMob(m,ev){if(m.killed)return;m.killed=1;m.dead=true;m.deadT=.9;m.mdl.tel.material.opacity=0;if(m.bar){m.bar.remove();m.bar=null;}const d=m.d;sfx(m.boss?'bossdie':'mobdie');
 const hy=gY(m.x,m.z)+.6;PS.burst(m.x,hy,m.z,m.boss?60:14,d.col,{sp:m.boss?6:3,up:4,life:.9});
 if(hero.lock===m)hero.lock=null;if(hero.engage===m)hero.engage=null;
 if(NET.on&&NET.host)netEmit({y:'k',id:m.id,k:(m.boss?'b:':'m:')+d.key+':'+d.lv,x:Math.round(m.x*10)/10,z:Math.round(m.z*10)/10,by:Object.keys(m.dmgBy||{}),add:m.add?1:0,wv:m.wave?1:0});
 if(m.boss){G.boss=G.mobs.find(o=>o.boss&&!o.dead)||null;if(!isPuppet()&&!G.boss)G.mobs.filter(x=>x.add&&!x.dead).forEach(x=>{x.hp=0;killMob(x);});}
 const pn=partyShareN(m);const credit=!NET.on||(m.boss?G.bossFight:(pn>1||(m.dmgBy&&m.dmgBy[FB.uid])||(!hero.dead&&dxz(hero,m)<35)));
 if(credit)rewardKill(m,m.boss?1:pn);}
// party EVEN SHARE: when someone in your party (in this area) helps kill a monster, everyone in the party gets an equal share (+25% bonus per extra member)
function partyShareN(m){if(!NET.on||!FB.pt||typeof myParty!=='function')return 1;const pm=myParty().filter(u=>u===FB.uid||(NET.peers[u]&&livePeer(NET.peers[u])));if(pm.length<2)return 1;const by=Object.keys(m.dmgBy||{});return by.some(u=>pm.includes(u))?pm.length:1;}
function rewardKill(m,pn){const c=S.ch,d=m.d;const hy=gY(m.x,m.z)+.6;pn=pn||1;const sh=pn>1?(1+.25*(pn-1))/pn:1;
 let ex=Math.max(1,Math.round(d.exp*EXP_RATE*sh));if(S.lv-d.lv>10)ex=Math.ceil(ex*Math.max(.05,.3-(S.lv-d.lv-10)*.01));const z=Math.round(ri(d.z[0],d.z[1])*G.st.zenyM*sh);S.zeny+=z;
 txt(m.x,hy+1,m.z,'+'+ex+' EXP'+(pn>1?' 👥':''),'#8fd3ff',false);
 const q=CHS[c].quest,qs=S.q[c];
 if(!m.boss&&!m.add){jqKill(d);fieldKill(d.key);}
 if(!m.boss&&!m.add){if(qs.s===1&&!(c===0&&S.fields?.version===1)&&q.t==='hunt'&&d.key===q.mob){qs.p++;if(qs.p>=q.n){qs.s=2;questReady();}}
  if(qs.s===1&&q.t==='gather'&&d.key===q.mob&&Math.random()<.65){qs.p++;log(`📦 ${q.item} (${qs.p}/${q.n})`);txt(m.x,hy+1.6,m.z,q.item,'#ffd76a',false);if(qs.p>=q.n){qs.s=2;questReady();}}
  if(d.loot&&Math.random()<d.loot[3]){const k=d.loot[0];if(!S.loot[k])S.loot[k]={e:d.loot[1],p:d.loot[2],c:0};S.loot[k].c++;}}
 const pr=Math.random();if(pr<.08&&!m.add)gotPot(c<4?'red':c<10?(Math.random()<.5?'red':'orange'):(Math.random()<.6?'orange':'white'));if(Math.random()<.03&&!m.add)gotPot('blue');
 if(Math.random()<.05&&!m.add){S.ore.ori++;log('🔷 Oridecon');}if(Math.random()<.05&&!m.add){S.ore.elu++;log('🔶 Elunium');}
 if(m.boss&&G.mobs.some(o=>o!==m&&o.boss&&!o.dead)){txt(m.x,hy+2,m.z,m.d.n+' falls!','#e8c26a',true);}
 else if(m.boss){for(let i=0;i<2;i++){const e=rollEquip(chTier(c),true);spawnDrop(e,m.x+rnd(-2,2),m.z+rnd(-2,2));}S.ore.ori+=3;S.ore.elu+=3;S.pots.white=Math.min(POT_MAX,S.pots.white+2);log('🔷🔶 +3 Oridecon/Elunium');
  if(G.dg){if(G.dg.tower){}else if(G.dg.trial)trialCleared();else dungeonCleared(m);}else{G.slow=1.6;G.zoom=.8;bigText(d.final?'GREAT ENEMY FELLED':'ENEMY FELLED','#e8c26a',3400);bossDefeated(c);}}
 else{if(!m.add&&Math.random()<.3)spawnDrop(rollEquip(chTier(c),false),m.x,m.z);}
 gainExp(ex);}
function gotPot(k){if(S.pots[k]>=POT_MAX)return;S.pots[k]++;log(`<span class="pot" style="background:${POT[k].c}"></span>${POT[k].n}`);}
function spawnDrop(e,x,z){const col=RCOL[e.rar];const g=grp(x,gY(x,z),z);const h=e.rar===3?11:e.rar===2?8:e.rar===1?6:4;
 const bm=mesh(geo('beam'+h,()=>new T.CylinderGeometry(.22,.3,h,10,1,true)),basic(col,{transparent:true,opacity:e.rar===0?.22:.45,depthWrite:false,side:T.DoubleSide}),0,h/2,0);bm.castShadow=false;g.add(bm);
 const gem=mesh(OCT(.32),basic(col));gem.position.y=.9;gem.castShadow=false;g.add(gem);g.add(glowSprite(col,e.rar>=2?2.6:1.6).translateY(.9));
 const rg=mesh(RING(.55,.75),basic(col,{transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}),0,.05,0);rg.rotation.x=-Math.PI/2;rg.castShadow=false;g.add(rg);world.add(g);
 G.drops.push({e,x,z,g,gem,t:0,fly:0});if(e.rar===3){bigText('S-TIER DROP!','#ff2a2a',1800);G.shake=.2;sfx('stier');}else if(e.rar===2)sfx('gold');}
function collect(dr){const it=newItem(dr.e.slot,dr.e.tier,dr.e.rar,0,dr.e.af);
 if(S.items.length>=BAG_MAX&&it.rar===0){S.zeny+=iPrice(it);log(`<span class="r0">${iName(it)}</span> auto-sold (bag full)`);return;}
 S.items.push(it);const cur=curFor(it);let eq='';
 if(S.autoEq&&(!cur||iScore(it)>iScore(cur))&&(it.slot!=='s'||C_().shield)){S.eq[freeSlotFor(it)||it.slot]=it.id;eq=' — EQUIPPED!';G.st=stats();rebuildHero();fxRing(hero.x,hero.z,2.5,RCOL[it.rar],.6);}
 log(`${SLOTI[it.slot]} ${iHtml(it)}${eq}`);txt(hero.x,hero.y+3,hero.z,RNAME[it.rar]+' '+iName(it),RCSS[it.rar],it.rar>=2);sfx('pickup');}

/* ================= QUESTS & INTERACTION ================= */
function prologueActive(){return isFieldPrologue(S,!!G.dg);}
function setupFieldPartner(){if(G.partnerLbl){G.partnerLbl.remove();G.partnerLbl=null;}G.fieldPartner=null;if(!prologueActive()||S.fields.prologue==='abduction')return;
 const k=partnerKey(),m=buildHero(k,k==='L'?'knight':'priest',{},{});const walking=S.fields.prologue==='walk';
 const p={m,x:walking?-9:3,z:walking?9:5,arrived:walking};m.root.position.set(p.x,gY(p.x,p.z),p.z);world.add(m.root);G.fieldPartner=p;}
function tickFieldPartner(dt){const p=G.fieldPartner;if(!p||!prologueActive())return;
 const dx=-9-p.x,dz=9-p.z,d=Math.hypot(dx,dz),moving=S.fields.prologue==='walk'&&d>.2&&Math.hypot(hero.x-p.x,hero.z-p.z)<8;
 if(moving){const step=Math.min(d,dt*2.4);p.x+=dx/d*step;p.z+=dz/d*step;p.m.root.rotation.y=Math.atan2(dx,dz);}
 else p.m.root.rotation.y=Math.atan2(hero.x-p.x,hero.z-p.z);
 p.arrived=S.fields.prologue==='walk'&&Math.hypot(p.x+9,p.z-9)<.3;
 p.m.root.position.set(p.x,gY(p.x,p.z),p.z);const swing=moving?Math.sin(G.t*9)*.45:0;p.m.legL.rotation.x=swing;p.m.legR.rotation.x=-swing;}
function finishFieldPrologue(skip){if(!prologueActive())return;const finish=()=>{S.fields.prologue='done';save();loadChapter(0);titleCard(0);save();};
 if(skip){finish();return;}S.fields.prologue='abduction';save();loadChapter(0);story(CHS[0].intro.slice(1),finish);}
function talkFieldPartner(){if(!prologueActive()||!G.fieldPartner)return;
 if(S.fields.prologue==='meet')story([['P','Before we leave Lumen, walk with me to our old oath tree. There is something I want you to remember.'],['H','Lead the way.']],()=>{S.fields.prologue='walk';save();});
 else if(G.fieldPartner.arrived)story([['P','Whatever road we take, promise we will find our way back to each other.'],['H','I promise. Even if I have to cross the whole world.'],['P','Then keep this moment. It belongs to us.']],()=>finishFieldPrologue(false));}
function applyFieldRestoration(){const f=G.fieldLife;if(!f||S.ch!==0||G.dg)return;const peaceful=fieldsAreRestored(S)||prologueActive();f.blight.visible=!peaceful;f.bloom.visible=peaceful;f.people.visible=peaceful;}
function buildFieldRestoration(){const blight=new T.Group(),bloom=new T.Group(),people=new T.Group();world.add(blight,bloom,people);G.fieldLife={blight,bloom,people};
 for(const [x,z] of [[-5,-25],[5,-25],[-10,9],[9,11],[18,-5]]){
  const a=grp(x,gY(x,z),z);for(let i=0;i<3;i++){const thorn=mesh(CONE(.35,2+i*.4,5),mat(0x382440),i*.45,.9,-i*.3);thorn.rotation.z=.3*(i-1);a.add(thorn);}blight.add(a);
  const b=grp(x,gY(x,z),z);for(let i=0;i<5;i++){const stem=mesh(CYL(.035,.045,.7,5),mat(0x3e713a),Math.sin(i*2)*.8,.35,Math.cos(i*2)*.8);b.add(stem);b.add(mesh(SPH(.17,6,5),mat(i%2?0xffd76a:0xf3d4e9),stem.position.x,.75,stem.position.z));}bloom.add(b);
 }
 for(const [x,z,col] of [[-4,2,0x7c6948],[6,3,0x4f7a68]]){const m=buildNPC({n:'Villager',hat:'cap',col});m.mark.visible=false;m.root.position.set(x,gY(x,z),z);m.root.rotation.y=Math.atan2(-x,-z);people.add(m.root);}
 // A distinctive, reusable meeting landmark, outside the combat routes.
 const tree=grp(-10,gY(-10,9),9);tree.add(mesh(CYL(.3,.5,3,7),mat(0x6f5136),0,1.5,0));tree.add(mesh(SPH(1.6,8,6),mat(0x67934b),0,3.5,0));tree.add(mesh(TOR(.25,.06),basic(0xffd76a),.35,1.7,.4));world.add(tree);applyFieldRestoration();}
function fieldRoad(){if(S.ch!==0||!S.cleared[0]||G.dg)return;ask('The fields are safe. Where next?',['Whispering Woods','Challenge the Warthog King again','Stay here']).then(i=>{if(S.ch!==0||!S.cleared[0]||G.dg)return;if(i===0)story(CHS[1].intro,()=>{loadChapter(1);titleCard(1);save();});else if(i===1)enterMist();});}
function guidedFields(){return S.ch===0&&!G.dg&&S.fields?.version===1;}
function fieldObjective(){const lesson=fieldLesson(S.fields);return lesson?[lesson.title,Object.entries(lesson.need).map(([k,n])=>MOBS[k].n+': '+(S.fields.counts[k]||0)+'/'+n).join(' · ')+' · east trail markers']:['Lessons complete','Return to Elder Rowan'];}
function fieldEncounter(){if(!guidedFields()||NET.on||S.q[0].s!==1)return;const l=fieldLesson(S.fields);if(!l||G.mobs.some(m=>!m.dead&&m.lesson===S.fields.stage))return;
 let offset=0;for(const [key,n] of Object.entries(l.need))for(let i=(S.fields.counts[key]||0);i<n;i++){const m=mkMob(mobDef(key,chLevel(0)+S.ngp*20),l.x+offset*2.8,l.z,false);m.lesson=S.fields.stage;G.mobs.push(m);offset++;}}
function fieldKill(key){if(!guidedFields()||S.q[0].s!==1)return;const prev=S.fields.stage;Object.assign(S.fields,advanceFieldLesson(S.fields,key));
 if(S.fields.stage>=FIELD_LESSONS.length){S.q[0].s=2;questReady();}
 else if(prev!==S.fields.stage){const l=fieldLesson(S.fields);banner(l.title,l.hint,3200);fieldEncounter();}save();}
function fieldLandmarks(c){G.oathStones=[];G.keepsake=null;G.fieldLife=null;if(c!==0||G.dg)return;
 buildFieldRestoration();
 for(const [x,z] of [[-8,AR.z],[8,AR.z],[0,AR.z-8]]){const g=grp(x,gY(x,z),z);g.add(mesh(CYL(.9,1.2,2.5,5),mat(0x66706c),0,1.25,0));g.add(mesh(OCT(.35),basic(0xffd76a),0,2.8,0));const ring=mesh(RING(1.4,1.6),basic(0xffd76a,{side:T.DoubleSide}),0,.08,0);ring.rotation.x=-Math.PI/2;g.add(ring);world.add(g);G.oathStones.push({x,z});}
 for(const l of FIELD_LESSONS){const g=grp(l.x,gY(l.x,l.z),l.z);g.add(mesh(CYL(.1,.13,2,6),mat(0x685137),0,1,0));g.add(mesh(BOX(.9,.55,.1),mat(0xd4b975),0,1.8,0));world.add(g);}
 if(!S.fields?.keepsake){const x=-18,z=12,g=grp(x,gY(x,z),z);g.add(mesh(BOX(.9,.45,.65),mat(0x76502f),0,.3,0));g.add(mesh(TOR(.22,.05),basic(0xffd76a),0,.75,0));world.add(g);G.keepsake={x,z,g};}}
/* ===== Whispering Woods: Mira's silk snares and the Treant's root zones =====
   Snares sit in the boss clearing. Lure the Treant onto one: it is bound (stunned)
   and, while the silk holds, its stance breaks 60% faster. A spent snare re-weaves.
   The host (or solo player) detects the trigger; every client applies it. */
const WOODS_SNARES=[[-7,AR.z+3],[7,AR.z+3],[0,AR.z-7]],SNARE_R=2.2,SNARE_STUN=3,SNARE_RE=16,ROOT_DUR=6,ROOT_SLOW=.5;
function woodsLandmarks(c){G.snares=[];G.rootZones=[];G.rooted=false;if(c!==1||G.dg)return;
 for(const [x,z] of WOODS_SNARES){const g=grp(x,gY(x,z),z);const silk=basic(0xf4f0ff,{transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false});
  for(const rr of [.7,1.4,2.1]){const r=mesh(RING(rr-.05,rr),silk,0,.07,0);r.rotation.x=-Math.PI/2;g.add(r);}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,sp=mesh(BOX(.05,.02,2.1),silk,Math.sin(a)*1.05,.07,Math.cos(a)*1.05);sp.rotation.y=a;g.add(sp);}
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.4,post=mesh(CYL(.06,.09,1.1,5),mat(0x6a5236),Math.sin(a)*2.3,.55,Math.cos(a)*2.3);post.rotation.z=Math.sin(a)*.2;g.add(post);}
  const gl=glowSprite(0xeef4ff,2.4);gl.position.y=.35;g.add(gl);world.add(g);G.snares.push({x,z,g,silk,gl,armed:1,reT:0});}}
function snareLocal(e){const s=G.snares&&G.snares[e.i],b=(e.id&&mobById(e.id))||G.mobs.find(m=>m.boss&&!m.dead);if(!s||!b||b.dead)return;
 s.armed=0;s.reT=SNARE_RE;b.stun=SNARE_STUN;b.snareT=SNARE_STUN+5;cancelWind(b);b.state='chase';
 const hy=gY(b.x,b.z)+b.mdl.h*(b.d.s||1)+.6;txt(b.x,hy,b.z,'SNARED!','#f4f0ff',true);
 fxRing(s.x,s.z,2.8,0xf4f0ff,.8);PS.burst(b.x,gY(b.x,b.z)+1.5,b.z,30,0xf4f0ff,{sp:4,up:4});G.shake=Math.max(G.shake,.35);sfx('stagger');
 if(!G.snareTold){G.snareTold=1;banner('Bound in silk!','Strike now: its stance breaks easily while the silk holds',2600);}}
function rootZoneLocal(e){if(!G.rootZones)G.rootZones=[];const g=grp(e.x,gY(e.x,e.z)+.02,e.z);
 const disc=mesh(CIRC(e.r),basic(0x2a1a0e,{transparent:true,opacity:.7,depthWrite:false}),0,.04,0);disc.rotation.x=-Math.PI/2;g.add(disc);
 const ring=mesh(RING(e.r-.12,e.r),basic(0x7a9a3a,{transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}),0,.06,0);ring.rotation.x=-Math.PI/2;g.add(ring);
 const wd=mat(0x4a2e18);for(let i=0;i<9;i++){const a=i/9*Math.PI*2+rnd(-.3,.3),r=rnd(.3,e.r*.85),c=mesh(CONE(rnd(.06,.11),rnd(.5,1.1),4),wd,Math.sin(a)*r,0,Math.cos(a)*r);c.rotation.set(rnd(-.5,.5),0,rnd(-.5,.5));g.add(c);}
 g.scale.set(1,.01,1);world.add(g);G.rootZones.push({x:e.x,z:e.z,r:e.r,t0:G.t,end:G.t+e.dur,g});}
function inRoots(){if(!G.rootZones||hero.state==='roll')return false;return G.rootZones.some(z=>G.t<z.end&&Math.hypot(hero.x-z.x,hero.z-z.z)<z.r);}
function updateWoods(dt){
 if(G.rootZones&&G.rootZones.length){for(const z of G.rootZones){const age=G.t-z.t0,left=z.end-G.t;z.g.scale.y=Math.min(1,age/.3)*Math.min(1,Math.max(0,left)/.4)||.01;if(left<=0)world.remove(z.g);}G.rootZones=G.rootZones.filter(z=>G.t<z.end);}
 const r=inRoots();if(r&&!G.rooted&&!hero.dead)txt(hero.x,hero.y+2.4,hero.z,'ROOTED','#9ac85a',false);G.rooted=r;
 if(!G.snares||!G.snares.length)return;
 for(const s of G.snares){if(!s.armed){s.reT-=dt;if(s.reT<=0){s.armed=1;fxRing(s.x,s.z,2.2,0xf4f0ff,.4);}}s.silk.opacity=s.armed?.75:.12;s.gl.material.opacity=s.armed?.55+Math.sin(G.t*3)*.2:.04;}
 if(NET.on&&!NET.host)return;
 const b=G.mobs.find(m=>m.boss&&!m.dead&&m.d.m==='treant');if(!b||b.stun>0||b.jump)return;
 G.snares.forEach((s,i)=>{if(s.armed&&Math.hypot(b.x-s.x,b.z-s.z)<SNARE_R)hEmit({y:'sn',id:b.id,i},snareLocal);});}
/* ===== Mire of Lanterns (Phase 5 Pass B) =====
   Lantern islands mark the route: each relit lantern turns its island and the
   stepping stones from the grace warm gold, and every lantern pushes the fog back.
   Broodmother: web lanes that slow movement, and egg clusters that hatch
   spiderlings unless destroyed. Host (or solo) decides; clients receive `wl`. */
const EGG_HATCH=12,EGG_MAX=4,WEB_DUR=8,WEB_ARM=.8,WEB_W=2.4;
function mireLandmarks(c){G.webLanes=[];G.webbed=false;G.mire=null;if(c!==2||G.dg||!G.shr||!G.shr.length)return;
 const isles=[],stones=[];const moss=mat(0x3a5a3a),rock=mat(0x4a5450);
 G.shr.forEach((s,i)=>{const g=grp(s.x,gY(s.x,s.z)-.15,s.z);g.add(mesh(CYL(3.2,3.6,.5,10),rock,0,0,0));g.add(mesh(CYL(3.1,3.1,.06,10),moss,0,.27,0));
  // lantern housing around the shrine flame: posts, roof and base plate
  const cage=grp(0,2.65,0);g.add(cage);const iron=mat(0x2a2a30,{metalness:.5,roughness:.45});
  for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.4;cage.add(mesh(BOX(.06,.9,.06),iron,Math.sin(a)*.42,0,Math.cos(a)*.42));}
  cage.add(mesh(CONE(.6,.45,4),iron,0,.66,0));cage.add(mesh(CYL(.45,.45,.06,4),iron,0,-.45,0));
  const halo=mesh(RING(3.3,3.6),basic(0xffc860,{transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),0,.32,0);halo.rotation.x=-Math.PI/2;g.add(halo);
  world.add(g);isles.push({g,halo});
  // stepping stones with wisps, from the grace toward this lantern
  const n=7;for(let k=1;k<=n;k++){const f=k/(n+1),x=s.x*f+Math.sin(k*1.7+i)*1.2,z=s.z*f+Math.cos(k*1.3+i)*1.2;
   const st=mesh(CYL(.7,.8,.25,7),rock,x,gY(x,z)+.05,z);world.add(st);const w=glowSprite(0x8ad8ff,1.1);w.position.set(x,gY(x,z)+.6,z);world.add(w);stones.push({i,w,st});}});
 G.mire={isles,stones,fog0:[scene.fog.near,scene.fog.far],lit:-1};applyMireLight();}
function mireLit(){const qs=S.q[2];if(S.cleared[2]||(qs&&qs.s>=2))return G.shr.map(()=>1);return G.shr.map((_,i)=>qs&&qs.shr&&qs.shr[i]?1:0);}
function applyMireLight(){const M=G.mire;if(!M)return;const lit=mireLit(),n=lit.reduce((a,b)=>a+b,0);
 M.isles.forEach((o,i)=>{o.halo.material.opacity=lit[i]?.55:0;const so=G.shrObj&&G.shrObj[i];if(so&&lit[i]){so.flm.visible=true;so.fl.material.opacity=1;so.flm.material.color.setHex(0xffc860);so.fl.material.color.setHex(0xffb050);}});
 M.stones.forEach(s=>{s.w.material.color.setHex(lit[s.i]?0xffc860:0x8ad8ff);s.w.material.opacity=lit[s.i]?.9:.35;});
 scene.fog.near=M.fog0[0]+n*5;scene.fog.far=M.fog0[1]+n*22;M.lit=n;}
function spawnEggs(b,n){if(NET.on&&!NET.host)return 0;const alive=G.mobs.filter(m=>!m.dead&&m.d.egg).length;let made=0;
 for(let i=0;i<Math.min(n,EGG_MAX-alive);i++){const a=rnd(0,6.28),r=rnd(5,AR.r-3),x=AR.x+Math.cos(a)*r,z=AR.z+Math.sin(a)*r;
  const m=mkMob(mobDef('eggsac',b.d.lv),x,z,false);m.add=1;m.hatchT=EGG_HATCH;m.face=rnd(0,6.28);G.mobs.push(m);fxRing(x,z,2,0x9affc8,.5);made++;}
 if(made&&dxz(hero,b)<40)banner('Brood eggs!','Break the egg clusters before they hatch',2200);return made;}
function eggTick(m,dt){m.hatchT-=dt;if(m.hatchT>0)return;m.dead=true;m.deadT=.9;m.hatched=1;
 const d=mobDef('spider',m.d.lv);
 for(let k=0;k<2;k++){const a=rnd(0,6.28),s=mkMob(d,m.x+Math.cos(a)*1.4,m.z+Math.sin(a)*1.4,false);s.agg=true;s.add=1;s.hp=s.mhp=Math.round(s.mhp*.5);G.mobs.push(s);}
 PS.burst(m.x,gY(m.x,m.z)+.6,m.z,20,0x9affc8,{sp:4,up:3});if(dxz(hero,m)<25)txt(m.x,gY(m.x,m.z)+1.8,m.z,'HATCHED!','#9affc8',true);}
function webLaneLocal(e){if(!G.webLanes)G.webLanes=[];const mx=(e.ax+e.bx)/2,mz=(e.az+e.bz)/2,dx=e.bx-e.ax,dz=e.bz-e.az,L=Math.hypot(dx,dz)||1;
 const g=grp(mx,gY(mx,mz)+.06,mz);g.rotation.y=Math.atan2(-dz,dx);const silk=basic(0xf4f0ff,{transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false});
 g.add(mesh(BOX(L,.02,e.w),silk));const th=basic(0xffffff,{transparent:true,opacity:.2,depthWrite:false});
 for(let k=-1;k<=1;k++)g.add(mesh(BOX(L,.03,.05),th,0,.03,k*e.w*.35));
 for(let k=0;k<Math.floor(L/1.6);k++){const c=mesh(BOX(.05,.03,e.w),th,-L/2+.8+k*1.6,.03,0);c.rotation.y=.4*(k%2?1:-1);g.add(c);}
 world.add(g);G.webLanes.push({ax:e.ax,az:e.az,bx:e.bx,bz:e.bz,w:e.w,arm:G.t+WEB_ARM,end:G.t+e.dur,g,silk,th});sfx('ebolt');}
function inWebs(){if(!G.webLanes||hero.state==='roll')return false;return G.webLanes.some(l=>G.t>=l.arm&&G.t<l.end&&segDist(hero.x,hero.z,l.ax,l.az,l.bx,l.bz)<l.w/2);}
function updateMire(dt){
 if(G.webLanes&&G.webLanes.length){for(const l of G.webLanes){const armed=G.t>=l.arm,left=l.end-G.t;const op=armed?Math.min(.75,left/.6*.75):.2+.2*Math.sin(G.t*20);l.silk.opacity=Math.max(0,op*.25);l.th.opacity=Math.max(0,op);if(left<=0)world.remove(l.g);}G.webLanes=G.webLanes.filter(l=>G.t<l.end);}
 const w=inWebs();if(w&&!G.webbed&&!hero.dead)txt(hero.x,hero.y+2.4,hero.z,'WEBBED','#f4f0ff',false);G.webbed=w;
 const P=G.npc&&G.npc.m.root.userData.pell;if(P){P.hang.rotation.z=Math.sin(G.t*1.6)*.18;P.hang.rotation.x=Math.cos(G.t*1.1)*.08;P.gl.material.opacity=.75+Math.sin(G.t*9)*.08+Math.sin(G.t*23)*.05;P.body.rotation.y=Math.sin(G.t*.5)*.35*(Math.sin(G.t*.23)>0?1:.2);}
 if(G.mire){G.mire.stones.forEach((s,k)=>{s.w.position.y=s.st.position.y+.55+Math.sin(G.t*1.5+k)*.12;});
  const n=mireLit().reduce((a,b)=>a+b,0);if(n!==G.mire.lit)applyMireLight();}}
function bossHint(c){if(c===1&&G.bossFight&&!G.dg&&G.snares&&G.snares.length)banner("Mira's snares","Lure the Treant onto the glowing silk to bind it",3200);
 if(c===2&&G.bossFight&&!G.dg)banner('The Broodmother','Her webs slow you · break her egg clusters before they hatch',3200);}
function questReady(){sfx('quest');banner('Quest objective complete','Return to '+fmt(CHS[S.ch].npc.n),2600);}
function questText(){if(prologueActive())return S.fields.prologue==='meet'?['Before the oath','Walk to '+partnerName()+' near the grace']:['Our promise','Follow '+partnerName()+' to the oath tree west of the grace'];const c=S.ch,q=CHS[c].quest,qs=S.q[c];if(c===0&&!G.dg&&G.bossFight)return ['Warthog King','Bait a charge into a gold-marked stone, then dodge.'];if(c===0&&S.cleared[0])return ['Verdant Fields restored','Take the north road to Whispering Woods'];if(S.cleared[c])return ['Chapter cleared','Free roam · boss can be fought again at the mist'];if(qs.s===0)return ['❗ Talk to '+fmt(CHS[c].npc.n),'at the Site of Grace'];if(qs.s===3)return ['Mist is open','Traverse the mist to face the boss'];if(qs.s===2)return [q.title,'✓ Return to '+fmt(CHS[c].npc.n)];
 if(guidedFields()&&qs.s===1)return fieldObjective();
 const m=q.mob?MOBS[q.mob].n:'';if(q.t==='hunt')return [q.title,`Slay ${m}: ${qs.p}/${q.n}`];if(q.t==='gather')return [q.title,`${q.item} from ${m}: ${qs.p}/${q.n}`];if(q.t==='shrines')return [q.title,`Kindled: ${qs.shr.filter(Boolean).length}/${q.n}`];if(q.t==='survive')return [q.title,G.surv?`Survive: ${Math.ceil(G.surv.left)}s`:'Light the beacon and hold your ground'];return ['',''];}
function talkNPC(){const c=S.ch,qs=S.q[c],ch=CHS[c];sfx('ui');
 if(!ch.boss&&qs.s===2&&!S.cleared[c]){story(ch.qd,()=>newDawnFinale());return;}
 if(S.cleared[c]){story([['Q',c===CHS.length-1?'Eldoria is at peace, thanks to you.':c===19?'We did it, {H}. Let\'s go home.':'The way forward is open, hero. Go.']]);return;}
 if(qs.s===0){const lines=guidedFields()?[['E','Follow the wooden trail markers east. First, watch two Thornbunnies crouch before they leap. Dodge, then answer.'],['E','Next, break a Field Beetle’s guard with a heavy attack, or go around its shell. Finally, separate a pair and choose your opening.'],['E','An old keepsake chest lies west of the grace. Take a quiet moment there if you need one.']]:ch.qs;story(lines,()=>{qs.s=1;qs.p=0;sfx('quest');banner(guidedFields()?'Rowan’s field lessons':'New Quest: '+ch.quest.title,questText()[1],2600);fieldEncounter();save();});}
 else if(qs.s===1)story(guidedFields()?[['E',fieldLesson(S.fields)?.hint||'Return to me when you are ready.']]:ch.qp);
 else if(qs.s===2)story(guidedFields()?[['E','You have learned to read your enemies. Beyond the mist, the Warthog King charges at whatever stands before him.'],['E','Stand beyond a gold-marked oath stone, then dodge aside. His tusks will strike the stone and leave him exposed.']]:ch.qd,()=>{qs.s=3;G.gate='open';updateGate();sfx('gate');banner('The mist has parted','Traverse it when you are ready',3000);fxRing(0,-28,6,0x8ad8ff,1.2);if(ch.quest.t!=='survive'){}save();});
 else story([['Q','The mist is open. Steel yourself.']]);}
function findInteract(){if(prologueActive()){const p=G.fieldPartner;return p&&Math.hypot(hero.x-p.x,hero.z-p.z)<3&&(S.fields.prologue==='meet'||p.arrived)?{k:'partner',l:'💬 Talk to '+partnerName()}:null;}if(!hero.dead&&G.dg&&G.dg.tower&&G.dg.st==='portal'&&Math.hypot(hero.x-AR.x,hero.z-AR.z)<3)return {k:'tower',l:'🌀 Climb to Floor '+(G.dg.floor+1)};if(hero.dead||G.intro||G.bossFight)return null;const c=S.ch,qs=S.q[c],q=CHS[c].quest;
 if(G.bloodObj&&S.blood&&S.blood.ch===c&&Math.hypot(hero.x-S.blood.x,hero.z-S.blood.z)<1.6){S.zeny+=S.blood.z$;txt(hero.x,hero.y+2.5,hero.z,'+'+S.blood.z$.toLocaleString()+' zeny recovered','#ffd76a',true);log('💰 Bloodstain recovered');sfx('pickup');world.remove(G.bloodObj);G.bloodObj=null;S.blood=null;save();}
 if(c===0&&S.cleared[0]&&Math.hypot(hero.x,hero.z+28)<5)return {k:'fieldroad',l:'🌿 Road to Whispering Woods'};
 if(G.keepsake&&Math.hypot(hero.x-G.keepsake.x,hero.z-G.keepsake.z)<3)return {k:'keepsake',l:'✦ Open the keepsake chest'};
 if(G.jm&&Math.hypot(hero.x-G.jm.x,hero.z-G.jm.z)<3.2)return {k:'jm',l:'🎓 Talk to Job Master Orin'};
 if(G.npc&&Math.hypot(hero.x-G.npc.x,hero.z-G.npc.z)<3.2)return {k:'npc',l:'💬 Talk to '+fmt(G.npc.d.n)};
 if(Math.hypot(hero.x,hero.z)<2.8)return {k:'grace',l:'✦ Rest at Site of Grace'};
 if(Math.hypot(hero.x,hero.z+28)<4&&!G.inArena)return {k:'gate',l:G.gate==='open'?'🌫️ Traverse the mist':'🔒 The mist is sealed'};
 if(qs.s===1&&q.t==='shrines')for(let i=0;i<G.shr.length;i++){const s=G.shr[i];if(!qs.shr[i]&&Math.hypot(hero.x-s.x,hero.z-s.z)<2.8)return {k:'shrine',i,l:'🔥 Kindle (hold position)'};}
 if(qs.s===1&&q.t==='survive'&&!G.surv&&G.beacon&&Math.hypot(hero.x-G.beacon.x,hero.z-G.beacon.z)<5)return {k:'beacon',l:'🔥 Light the beacon'};
 return null;}
function doInteract(){const it=G.int;if(!it)return;sfx('ui');
 if(it.k==='partner')talkFieldPartner();
 else if(it.k==='fieldroad')fieldRoad();
 else if(it.k==='keepsake'){S.fields=S.fields||{keepsake:false};if(S.fields.keepsake)return;S.fields.keepsake=true;world.remove(G.keepsake.g);G.keepsake=null;S.zeny+=75;save();story([['P','Remember our promise? Wherever the road leads, we find our way back to each other.'],['H','I remember. Hold on. I am coming.'],['N','An old oath charm, tucked beside 75 zeny. You carry the promise with you.']]);}
 else if(it.k==='npc')talkNPC();
 else if(it.k==='jm')talkJM();
 else if(it.k==='tower')towerNext();
 else if(it.k==='grace')restAtGrace();
 else if(it.k==='gate'){if(G.gate==='open')enterMist();else{const q=questText();toast('The mist is sealed.<br>'+q[0]+' — '+q[1],2200);sfx('deny');}}
 else if(it.k==='shrine'){G.chan={k:'shrine',i:it.i,t:0,dur:2.5};toast('Kindling... stay still!',1200);}
 else if(it.k==='beacon'){const q=CHS[S.ch].quest;G.surv={left:q.time,total:q.time,wave:0};sfx('gate');banner('The beacon is lit!','Hold your ground for '+q.time+' seconds',2600);musicFor(S.ch,true);}}
function updateQuests(dt){const c=S.ch,qs=S.q[c],q=CHS[c].quest;
 if(G.chan){const ch=G.chan;const s=G.shr[ch.i];if(Math.hypot(hero.x-s.x,hero.z-s.z)>3||Math.hypot(inp.x,inp.z)>.2){G.chan=null;toast('Kindling interrupted',900);}
  else{ch.t+=dt;if(Math.random()<.5)PS.burst(s.x,gY(s.x,s.z)+2.5,s.z,1,0x8ad8ff,{sp:.5,up:2,g:0});if(ch.t>=ch.dur){qs.shr[ch.i]=1;G.chan=null;const o=G.shrObj[ch.i];o.flm.visible=true;o.fl.material.opacity=1;o.ring.material.opacity=.8;sfx('shrine');fxRing(s.x,s.z,4,0x8ad8ff,.8);log(`🔥 Shrine kindled (${qs.shr.filter(Boolean).length}/${q.n})`);if(qs.shr.filter(Boolean).length>=q.n){qs.s=2;questReady();}save();}}}
 if(G.surv){const sv=G.surv;const near=Math.hypot(hero.x-G.beacon.x,hero.z-G.beacon.z)<8;if(near){sv.left-=dt;sv.wave-=dt;if(sv.wave<=0){sv.wave=7.5;spawnWave(3+Math.floor((sv.total-sv.left)/25),G.beacon.x,G.beacon.z);sfx('wave');}}
  $('#timer').style.display='block';$('#timer').textContent=(near?'⏳ ':'⚠ Return to the beacon! ')+Math.ceil(Math.max(0,sv.left))+'s';
  if(sv.left<=0){G.surv=null;$('#timer').style.display='none';qs.s=2;questReady();G.mobs.filter(m=>m.wave&&!m.dead).forEach(m=>{m.agg=false;});musicFor(c,false);save();}}
 else $('#timer').style.display='none';
 for(let i=0;i<G.shrObj.length;i++){const o=G.shrObj[i];if(qs.shr[i]){if(!o.flm.visible){o.flm.visible=true;o.fl.material.opacity=1;o.ring.material.opacity=.8;}o.flm.position.y=2.5+Math.sin(G.t*4+i)*.1;}}
 if(G.beaconObj){G.beaconObj.fl.material.opacity=G.surv?.9+.1*Math.sin(G.t*8):.3;}
 if(G.npc){G.npc.m.mark.position.y=2.9+Math.sin(G.t*3)*.15;G.npc.m.mark.rotation.y+=dt*2;G.npc.m.mark.visible=!S.cleared[c]&&(qs.s===0||qs.s===2);G.npc.m.mark.material.color.setHex(qs.s===2?0x8fd3ff:0xffd76a);}}

/* ================= BOSS FIGHT ================= */
function enterMist(){const c=S.ch;if(NET.on){hero.x=0;hero.z=AR.z+AR.r-2.5;hero.face=0;hero.state='idle';hero.lock=null;hero.engage=null;hero.dest=null;G.lightHeld=false;G.bossFight=true;G.inArena=true;G.introDone=0;musicFor(c,true);setTimeout(()=>bossHint(c),4200);
  const b=G.mobs.find(m=>m.boss&&!m.dead);if(b)onNetBoss(b);else if(NET.host)hostSpawnBoss();else{netEmit({y:'boss'});toast('The mist stirs...',1500);}return;}
 hero.x=0;hero.z=AR.z+AR.r-2.5;hero.face=0;hero.state='idle';hero.lock=null;hero.engage=null;hero.dest=null;G.lightHeld=false;G.bossFight=true;G.inArena=true;
 const m=spawnChapterBoss(c),d=m.d;
 G.mobs.filter(x=>!x.boss&&!x.dead&&Math.hypot(x.x-AR.x,x.z-AR.z)<AR.r+4).forEach(x=>{x.x+=(x.x>=0?1:-1)*20;});
 G.intro={t:0,dur:3.6,m};$('#cine').style.opacity=1;sfx('roar_'+(d.roar||'deep'));musicFor(c,true);setTimeout(()=>bossHint(c),4200);
 setTimeout(()=>{$('#bossN').textContent=d.n;bigText(d.n.toUpperCase(),'#e8c26a',3000);},900);
 if(c===19&&G.cage){}}
function endBossFight(won){G.bossFight=false;G.intro=null;$('#cine').style.opacity=0;if(NET.on)return;if(!won){G.mobs.filter(m=>m.boss||m.add).forEach(m=>{m.dead=true;m.deadT=0;});G.boss=null;}}
function bossDefeated(c){const victorySave=S,victoryWorld=world;const first=!S.cleared[c];S.bk=(S.bk||0)+1;S.cleared[c]=1;S.unlocked=Math.max(S.unlocked,Math.min(CHS.length-1,c+1));endBossFight(true);if(c===0&&!G.dg){G.inArena=false;applyFieldRestoration();}musicFor(c,false);save();
 if(!first){log('Boss defeated again!');return;}
 if(c%4===3&&S.flask<8){S.flask++;setTimeout(()=>{toast('💧 Sacred Tear: Flask charges +1 (now '+S.flask+')',2800);sfx('levelup');},2000);}
 setTimeout(()=>{if(S!==victorySave||world!==victoryWorld||G.mode!=='game')return;G.drops.forEach(d=>{world.remove(d.g);collect(d);});G.drops=[];
  if(c===0){story(CHS[0].outro,()=>{banner('Verdant Fields restored','Flowers return to the trail. Take the north road when ready.',4000);save();});}
  else if(c===19)story(CHS[19].outro,()=>{S.done=1;save();startEnding();});
  else story(CHS[c].outro,()=>story(CHS[c+1].intro,()=>{loadChapter(c+1);titleCard(c+1);save();}));},4200);}

/* bosses: tougher overall, and they rise to meet strong players (so even max level is a fight) */
function topLv(){let l=S.lv;if(NET.on)for(const p of Object.values(NET.peers))if(p.info&&p.ar)l=Math.max(l,p.info.l||0);return l;}
function bossBoost(d){d.hp=Math.round(d.hp*1.6);d.atk=Math.round(d.atk*1.25);d.def=Math.round(d.def*1.5+10);
 const L=topLv();if(L>d.lv-3){const st=G.st||stats(),lr=Math.max(1,L/Math.max(1,S.lv)),nl=L+5,nd=bossDef(d.key,nl);
  d.lv=nl;d.exp=nd.exp;d.z=nd.z;d.loot=nd.loot;d.def=Math.max(d.def,Math.round(30+nl*.45));
  const pd=st.atk*lr*1.3*(100/(100+d.def));d.hp=Math.max(d.hp,Math.round(pd*(d.dg?260:190)));
  d.atk=Math.max(d.atk,Math.round(st.mhp*lr*.3*(100+st.def*lr)/100));}
 return d;}

/* ===== Yoyo basic attacks (Acrobat line): the yoyo flies out on its string, hits, and snaps back ===== */
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz||1;const t=clamp(((px-ax)*dx+(pz-az)*dz)/l,0,1);return Math.hypot(px-(ax+dx*t),pz-(az+dz*t));}
function yoyoAttack(heavy,mult,kind){const C=C_();const t=softTarget();if(t)faceTo(t);sfx('swing');const R=C.range+(heavy?1.5:0);let ex,ez;
 if(t&&dxz(hero,t)<=R+(t.r||0)+.5){ex=t.x;ez=t.z;}else{ex=hero.x+Math.sin(hero.face)*R;ez=hero.z+Math.cos(hero.face)*R;}
 const sx=hero.x,sz=hero.z;const hands=heavy?['R','L']:[hero.combo%2?'L':'R'];const each=heavy?mult*.55:mult;
 hands.forEach((hd,i)=>fxYoyo(hero.model,hd,ex,gY(ex,ez)+1.1,ez,{side:(hd==='R'?1:-1)*(heavy?1.6:.5),dur:heavy?.52:.34,col:heavy?0xffb070:hero.swingCol,big:heavy},()=>{
  const dp=duelTarget();if(dp&&segDist(dp.x,dp.z,sx,sz,ex,ez)<1.1){pvpHit(each,{kind});sfx('hit');}
  const L=G.mobs.filter(m=>!m.dead&&segDist(m.x,m.z,sx,sz,ex,ez)<m.r+.7).sort((a,b)=>dxz(hero,a)-dxz(hero,b));
  for(const m of (heavy?L:L.slice(0,1))){sfx('hit');dealDamage(m,each,{kind,poise:heavy?24:9});fxSpark(m.x,gY(m.x,m.z)+1.1,m.z,heavy?0xffb070:0xffffff,1.6);}}));}
/* ================= SKILL TREE (one tree per job) ================= */
// S.skp = unspent skill points, S.sk = {'a0':lv,...,'p0':lv}, S.bar = [skillIdx|null x6], S.job = 0..3
const BAR_N=6;
function skLv(i){return (S.sk&&S.sk['a'+i])||0;}
function psLv(i){return (S.sk&&S.sk['p'+i])||0;}
function skSpent(){let t=0;for(const k in S.sk)t+=S.sk[k];return t;}
function skSpentJob(j){const C=C_();let t=0;C.sk.forEach((s,i)=>{if((s.job||0)===j)t+=skLv(i);});C.ps.forEach((s,i)=>{if((s.job||0)===j)t+=psLv(i);});return t;}
// skill points: 1/level to 99, 1 per 2 levels to 500, 1/level after; +6 from the 4th job trial
function skGain(lv){return lv<=99?1:lv<=500?(lv%2===0?1:0):1;}
function skTotal(lv,job){let t=1;for(let l=2;l<=lv;l++)t+=skGain(l);return t+((job||0)>=3?6:0);}
function skSync(){S.skp=Math.max(0,skTotal(S.lv,S.job)-skSpent());}
function jobName(s){s=s||S;const J=JOBS[s.cls];return J?J[s.job||0]:CLASSES[s.cls].n;}
function jn(c,j){const C=CLASSES[c];if(!C)return '';const J=JOBS[c];return C.ic+' '+(J&&J[j||0]||C.n);}
function skDef(i){const b=C_().sk[i],lv=Math.max(1,skLv(i)),f=1+.15*(lv-1);const o=Object.assign({},b,{lvl:lv,idx:i});
 if(b.m)o.m=+(b.m*f).toFixed(2);if(b.v)o.v=+(b.v*(1+(b.k==='awk'?.06:.12)*(lv-1))).toFixed(3);if(b.dur)o.dur=Math.round(b.dur*(1+.06*(lv-1)));o.sp=Math.round(b.sp*(1+.06*(lv-1)));o.cd=+(b.cd*(1-.035*(lv-1))).toFixed(2);if(b.stun)o.stun=b.stun+.1*(lv-1);if(b.bon)o.bon=b.bon(Math.min(lv,b.mx||SK_MAX));return o;}
function skMax(kind,i){const d=(kind==='a'?C_().sk:C_().ps)[i];return (d&&d.mx)||SK_MAX;}
function psVal(k){let v=0;const P=C_().ps;for(let i=0;i<P.length;i++)if(P[i].k===k)v+=P[i].v*psLv(i);return v/100;}
function canLearn(kind,i){const key=kind+i,lv=S.sk[key]||0;const d=(kind==='a'?C_().sk:C_().ps)[i];if(!d)return 'X';
 if((d.job||0)>(S.job||0))return '🔒 '+JOBS[S.cls][d.job];if(lv>=skMax(kind,i))return 'MAX';if(S.skp<=0)return 'No points';if(skSpentJob(d.job||0)<(d.req||0))return 'Needs '+d.req+' in this tree';return '';}
function learnSkill(kind,i){if(canLearn(kind,i))return false;const key=kind+i;S.sk[key]=(S.sk[key]||0)+1;S.skp--;
 if(kind==='a'&&!S.bar.includes(i)){const e=S.bar.indexOf(null);if(e>=0)S.bar[e]=i;}sfx('levelup');save();return true;}
function barSkill(slot){const i=S.bar[slot];if(i===PARABELLUM)return parabellumDef();return i===null||i===undefined||!C_().sk[i]?null:skDef(i);}
function parabellumPlan(){return planParabellum({job:S.job||0,selected:S.parabellum,
 skills:C_().sk.map((s,i)=>({...skDef(i),job:s.job||0,learned:skLv(i)>0})),currentSP:hero.sp,maxSP:G.st.msp,cooldowns:hero.cd});}
function parabellumDef(){const p=parabellumPlan();return {n:'Parabellum',e:'✦',idx:PARABELLUM,sp:p.cost,cd:Math.max(1,...p.buffs.map(s=>s.cd)),remaining:p.cooldown,blocked:!!p.error};}
function castParabellum(){if(!canAct('skill'))return;const p=parabellumPlan();if(p.error){toast(p.error);sfx('deny');return;}
 hero.sp-=p.cost;hero.castTgt=null;
 for(const sk of p.buffs){hero.cd[sk.idx]=sk.cd*(1-Math.min(.5,psVal('cdr')));doSkill(sk.idx);}
 // Effects are immediate; a short recovery prevents casting during another action.
 hero.state='cast';hero.castDone=true;hero.actT=0;hero.actDur=.55;hero.hitDone=true;
 txt(hero.x,hero.y+3.4,hero.z,'PARABELLUM','#e8c26a',true);save();}
function parabellumHtml(){const p=parabellumPlan(),selected=Array.isArray(S.parabellum)?S.parabellum:[];
 let h=`<div class="card pbsetup"><div class="ttl">✦ Parabellum · ${selected.length}/6 buffs</div>`;
 if((S.job||0)<PARABELLUM_JOB)return h+'Unlocks after your level-99 job advancement trial.</div>';
 h+='<p>Cast your learned active buffs together. Choose one per effect; passive skills are always active.</p>';
 if(selected.length)h+=selected.map((id,pos)=>`<div class="row"><span>${pos+1}. ${esc(C_().sk[id]?.n||'Unavailable buff')}</span><button style="min-height:44px;min-width:44px" data-a="pbup" data-v="${pos}" ${pos===0?'disabled':''} aria-label="Move buff ${pos+1} earlier">↑</button><button style="min-height:44px;min-width:44px" data-a="pbremove" data-v="${pos}" aria-label="Remove buff ${pos+1}">×</button></div>`).join('');
 const eligible=C_().sk.map((s,i)=>({...skDef(i),learned:skLv(i)>0})).filter(s=>s.learned&&(s.job||0)<=S.job&&s.t==='buff'&&!s.zeny);
 h+=eligible.map(sk=>{const on=selected.includes(sk.idx),conflict=selected.some(i=>i!==sk.idx&&C_().sk[i]?.k===sk.k);return `<button class="mbtn" style="min-height:44px" data-a="pbtoggle" data-v="${sk.idx}" aria-pressed="${on}" ${!on&&(selected.length>=6||conflict)?'disabled':''}>${on?'✓':'+'} ${sk.e} ${sk.n} · Lv ${sk.lvl} · ${sk.sp} SP${conflict?' · same effect':''}</button>`;}).join('')||'<p>Learn an active buff to get started.</p>';
 h+=`<p>${p.base} SP + ${p.cost-p.base} SP surcharge (3%, rounded up) = <b>${p.cost} SP</b><br>Maximum SP: ${G.st.msp}${p.error?'<br>'+esc(p.error):''}</p>`;
 if(selected.length)h+=`<button class="mbtn" data-a="pbclear">Clear buffs</button>`;
 h+='<div>Assign Parabellum to a skill slot:</div><div class="skbar">'+S.bar.map((v,i)=>`<button class="mbtn" data-a="pbbar" data-v="${i}" aria-label="Assign Parabellum to slot ${i+1}">${i+1}${v===PARABELLUM?' ✓':''}</button>`).join('')+'</div></div>';
 return h;}
function skReset(){const cost=S.lv*200;if(S.zeny<cost){toast('Reset costs '+cost.toLocaleString()+' zeny');return;}S.zeny-=cost;S.sk={};S.parabellum=[];S.autoCfg=null;S.bar=Array(BAR_N).fill(null);skSync();toast('Skills reset. '+S.skp+' points refunded.');}
function skNodeInfo(kind,i){const C=C_();const d0=(kind==='a'?C.sk:C.ps)[i];const lv=kind==='a'?skLv(i):psLv(i);return {d0,lv,why:canLearn(kind,i)};}
function skStatLine(i,lv){const key='a'+i,old=S.sk[key];S.sk[key]=Math.max(1,lv);const sk=C_().sk[i],d=skDef(i);if(old===undefined)delete S.sk[key];else S.sk[key]=old;
 const a=[];if(d.m)a.push(Math.round(d.m*100*(d.hits||1))+'% dmg');if(d.hits>1)a.push(d.hits+' hits');if(d.v&&sk.t==='buff')a.push(Math.round(d.v*100)+'% for '+d.dur+'s');if(d.bon)a.push(bonText(d.bon)+' for '+d.dur+'s');if(d.v&&sk.t==='heal')a.push(`heals ${Math.round(d.v*100)}% MATK + INT×${HEAL_INT} ≈ ${healAmt(d.v).toLocaleString()} HP`);if(d.stun)a.push('stun '+d.stun.toFixed(1)+'s');a.push(d.sp+' SP');a.push(d.cd+'s cd');return a.join(' · ');}
function skillsHtml(){const C=C_();const J=JOBS[S.cls];const tab=G.skJ==null?(S.job||0):G.skJ;const jc=(typeof JOB_COL!=='undefined'&&JOB_COL[S.cls]&&JOB_COL[S.cls][tab])||'#e8c26a';
 let h=`<div class="card skhd"><div><div class="ttl" style="margin:0">🌟 ${jobName()}</div><small style="color:#a99cc0">Up to Lv ${SK_MAX} per skill · tap a skill to see it</small></div><div class="skpts"><b>${S.skp}</b><small>points</small></div><button class="mbtn" data-a="skreset" style="width:auto;padding:5px 9px;font-size:11px">↺ Reset<br>${(S.lv*200).toLocaleString()}z</button></div>`;
 h+=innHtml();
 h+=parabellumHtml();
 h+=autoHtml();
 // skill bar
 const sel=G.skSel||'';const selA=sel[0]==='a'?+sel.slice(1):null;const selOk=selA!=null&&skLv(selA)>0;
 h+=`<div class="skbar">${S.bar.map((i,s)=>{const k=i===PARABELLUM?parabellumDef():i===null||!C.sk[i]?null:C.sk[i];return `<button class="skslot ${selOk?'pick':''} ${selOk&&i===selA?'cur':''}" data-a="${selOk?'skbar':'sksel'}" data-v="${selOk?selA:(k?'a'+i:'')}" data-s="${s}"><i>${s+1}</i>${k?k.e:'<span style="opacity:.3">·</span>'}<small>${k?k.n.split(' ')[0]:'empty'}</small></button>`;}).join('')}</div>`;
 if(selOk)h+=`<div style="text-align:center;font-size:11px;color:#ffd76a;margin-top:2px">Tap a slot above to put <b>${C.sk[selA].n}</b> there</div>`;
 // job tabs
 h+=`<div class="sktabs">${J.map((n,j)=>`<button data-a="skj" data-v="${j}" class="${tab===j?'on':''}" ${tab===j?`style="border-color:${jc}"`:''}>${j>(S.job||0)?'🔒 ':''}${n}<small>${skSpentJob(j)} pts</small></button>`).join('')}</div>`;
 const locked=tab>(S.job||0);if(locked)h+=`<div class="card" style="border-color:#e8c26a;text-align:center">🔒 <b>${J[tab]}</b> unlocks at <b>Lv ${JOB_LV[tab]}</b> after the Job Master's quest. Preview below.</div>`;
 const sp=skSpentJob(tab);
 const tiers=[0,8,10,18,20,25,30,40,45].filter(r=>C.sk.some(s=>(s.job||0)===tab&&(s.req||0)===r)||C.ps.some(s=>(s.job||0)===tab&&(s.req||0)===r));
 const maxReq=tiers[tiers.length-1]||1;
 // detail panel
 let det='';if(sel){const kind=sel[0],i=+sel.slice(1);const L=kind==='a'?C.sk:C.ps;const d0=L[i];
  if(d0&&(d0.job||0)===tab){const {lv,why}=skNodeInfo(kind,i);const el=d0.el&&EL[d0.el]?EL[d0.el]:null;
   det=`<div class="skdet" style="border-color:${jc}"><div class="skdh"><span class="skdi ${kind==='p'?'pas':''} ${d0.ult?'ult':''}">${d0.e}</span><div><b style="font-size:15px">${d0.n}</b><br><small>${kind==='p'?'<span style="color:#8fe3b0">PASSIVE</span>':d0.ult?'<span style="color:#ff5050">ULTIMATE</span>':d0.k==='awk'?'<span style="color:#ffd76a">AWAKENING</span>':'<span style="color:#9fcfff">ACTIVE</span>'} ${el?`· <span style="color:${el[2]}">${el[0]} ${el[1]||''}</span>`:''} · <span style="color:#ffd76a">Lv ${lv}/${SK_MAX}</span></small></div></div>
    <div class="skdd">${d0.d}</div>`;
   if(kind==='a'){det+=`<div class="sklv"><span>${lv?'Now':'Lv 1'}</span>${skStatLine(i,lv||1)}</div>`;if(lv&&lv<skMax(kind,i))det+=`<div class="sklv nx"><span>Next</span>${skStatLine(i,lv+1)}</div>`;}
   else det+=`<div class="sklv"><span>${lv?'Now':'Lv 1'}</span>+${+(d0.v*Math.max(1,lv)).toFixed(1)}%</div>${lv&&lv<skMax(kind,i)?`<div class="sklv nx"><span>Next</span>+${+(d0.v*(lv+1)).toFixed(1)}%</div>`:''}`;
   det+=`<div class="skact"><button class="mbtn sklearn" data-a="sklearn" data-v="${kind}${i}" ${why?'disabled':''}>${lv>=skMax(kind,i)?'✔ MAXED':why?why:lv?'+1 Level up':'Learn skill'}</button>`;
   if(kind==='a'&&lv)det+=`<div class="skslots"><small>Skill bar:</small>${S.bar.map((b,s)=>`<button data-a="skbar" data-v="${i}" data-s="${s}" class="${b===i?'on':''}">${s+1}</button>`).join('')}</div>`;
   det+=`</div></div>`;}}
 if(!det)det=`<div class="skdet empty">👆 Tap any skill in the tree to see what it does, level it up, or put it on your skill bar.</div>`;
 // tree
 let tr=`<div class="sktree" style="--jc:${jc}"><div class="skline"><div class="skfill" style="height:${Math.min(100,sp/maxReq*100)}%"></div></div>`;
 tiers.forEach((req,ti)=>{const open=!locked&&sp>=req;
  tr+=`<div class="sktier ${open?'open':'shut'}"><div class="sktl">${open?'':'🔒 '}${req?req+' pts':'Start'}</div><div class="sknodes">`;
  const node=(kind,i,d0)=>{const lv=kind==='a'?skLv(i):psLv(i);const why=canLearn(kind,i);const st=lv>=skMax(kind,i)?'max':lv>0?'got':!why?'can':'no';const onBar=kind==='a'&&S.bar.includes(i);
   return `<button class="sknode ${kind==='p'?'pas':''} ${d0.ult?'ult':''} ${st} ${sel===kind+i?'sel':''}" data-a="sksel" data-v="${kind}${i}"><span class="ski">${d0.e}</span><span class="sklvb">${lv}/${skMax(kind,i)}</span>${st==='can'?'<span class="skplus">+</span>':''}${onBar?`<span class="skon">${S.bar.indexOf(i)+1}</span>`:''}<small>${d0.n}</small></button>`;};
  C.sk.forEach((sk,i)=>{if((sk.job||0)===tab&&(sk.req||0)===req)tr+=node('a',i,sk);});
  C.ps.forEach((ps,i)=>{if((ps.job||0)===tab&&(ps.req||0)===req)tr+=node('p',i,ps);});
  tr+=`</div></div>`;});
 tr+=`<div class="sklegend"><span><i class="lg a"></i>Active</span><span><i class="lg p"></i>Passive</span><span><i class="lg u"></i>Ultimate</span><span style="color:#8fe3b0">+ can learn</span></div></div>`;
 h+=`<div class="skwrap">${tr}${det}</div>`;
 return h;}
/* ================= SKILL VFX — elemental, per-skill visual effects ================= */
const FXD=()=>QUAL==='low'?.5:QUAL==='medium'?.8:1;
const fxN=n=>Math.max(1,Math.round(n*FXD()));
const addM=(c,op)=>basic(c,{transparent:true,opacity:op==null?1:op,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
const nM=(c,op)=>basic(c,{transparent:true,opacity:op==null?1:op,depthWrite:false,side:T.DoubleSide});
const isDark=c=>{const r=c>>16&255,g=c>>8&255,b=c&255;return r*.3+g*.6+b*.1<120;};const slM=(c,op)=>isDark(c)?nM(c,op):addM(c,op);
const fm=(g,m,x,y,z)=>{const o=mesh(g,m,x||0,y||0,z||0);o.castShadow=false;return o;};
function fxAdd(m,dur,u,onEnd){world.add(m);const f={k:'fn',m,t:0,dur,u:u||(()=>{})};if(onEnd)f.onEnd=onEnd;G.fx.push(f);f.u(0,f,0);return f;}
function fxLater(ms,fn){if(ms<=0){try{fn();}catch(e){console.warn(e);}return;}setTimeout(()=>{if(G.mode!=='game')return;try{fn();}catch(e){console.warn(e);}},ms);}
const FXT={};
function fxGrad(){if(!FXT.grad){const c=document.createElement('canvas');c.width=4;c.height=64;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.6,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=gr;g.fillRect(0,0,4,64);FXT.grad=new T.CanvasTexture(c);}return FXT.grad;}
const FXM={};
function fxMat(k){if(FXM[k])return FXM[k];
 if(k==='ice')FXM[k]=mat(0xc8f0ff,{transparent:true,opacity:.88,emissive:0x3a9ad8,emissiveIntensity:.7,roughness:.15,metalness:.2});
 else if(k==='rock')FXM[k]=mat(0x7a6248,{roughness:1});
 else if(k==='shadow')FXM[k]=mat(0x0e0618,{emissive:0x3a0a78,emissiveIntensity:.55,roughness:.5});
 else if(k==='crys')FXM[k]=mat(0xe0d0ff,{emissive:0x8a5aff,emissiveIntensity:.8,roughness:.2});
 return FXM[k];}
let _sfl=null;
function screenFlash(col,a){if(!_sfl){_sfl=document.createElement('div');_sfl.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0';document.body.appendChild(_sfl);}
 _sfl.style.transition='none';_sfl.style.background=col;_sfl.style.opacity=Math.min(.3,a);requestAnimationFrame(()=>requestAnimationFrame(()=>{_sfl.style.transition='opacity .4s ease-out';_sfl.style.opacity=0;}));}
const camYaw=(x,z)=>Math.atan2(cam.position.x-x,cam.position.z-z);

/* ---------- primitives ---------- */
function fxPillar(x,z,r,h,col,dur,op){const y=gY(x,z);const m=fm(geo('fxcyl',()=>new T.CylinderGeometry(1,1,1,20,1,true)),new T.MeshBasicMaterial({color:col,map:fxGrad(),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}),x,y+h/2,z);
 fxAdd(m,dur,p=>{const a=p<.15?p/.15:1-(p-.15)/.85;const w=r*(p<.15?.35+.65*p/.15:1-.55*(p-.15)/.85);m.scale.set(w,h,w);m.material.opacity=(op||.8)*a;m.rotation.y+=.12;});}
function fxFlame(x,z,s,dur,c1,c2){c1=c1||0xff5a1a;c2=c2||0xffd040;const y=gY(x,z);const g=new T.Group();g.position.set(x,y,z);
 const a=fm(CONE(.5,1.6,7),addM(c1,.8),0,.8,0),b=fm(CONE(.3,1.1,6),addM(c2,.9),0,.55,0);g.add(a,b);const ph=rnd(0,6);
 fxAdd(g,dur,(p,f)=>{const k=p<.15?p/.15:p>.55?1-(p-.55)/.45:1;const fl=1+Math.sin(f.t*30+ph)*.14;g.scale.set(s*k*(1.1-fl*.12),s*k*fl,s*k*(1.1-fl*.12));a.material.opacity=.8*k;b.material.opacity=.9*k;g.rotation.y+=.25;});
 if(Math.random()<.75)PS.burst(x,y+.5*s,z,fxN(3),c2,{sp:1.2,up:5,g:-3,life:.7,s:.6});}
function fxFlameDark(x,z,s,dur){const y=gY(x,z);const g=new T.Group();g.position.set(x,y,z);const a=fm(CONE(.5,1.7,7),nM(0x2a0a52,.8),0,.85,0),b=fm(CONE(.28,1.1,6),nM(0x8a3aff,.85),0,.55,0);g.add(a,b);const ph=rnd(0,6);
 fxAdd(g,dur,(p,f)=>{const k=p<.15?p/.15:p>.55?1-(p-.55)/.45:1;const fl=1+Math.sin(f.t*28+ph)*.14;g.scale.set(s*k,s*k*fl,s*k);a.material.opacity=.8*k;b.material.opacity=.85*k;g.rotation.y+=.25;});PS.burst(x,y+.5,z,fxN(2),0x7a2aff,{sp:1,up:4,g:-3,life:.6,s:.6});}
function fxBoom(x,y,z,r,col,c2){const s=fm(SPH(1,12,10),addM(col,.85),x,y,z);fxAdd(s,.4,p=>{const e=1-Math.pow(1-p,3);s.scale.setScalar(r*(.2+.8*e));s.material.opacity=.85*(1-p);});
 const s2=fm(SPH(1,10,8),addM(c2||0xffffff,.9),x,y,z);fxAdd(s2,.22,p=>{s2.scale.setScalar(r*.55*(.3+.7*p));s2.material.opacity=.9*(1-p);});
 fxSpark(x,y,z,c2||col,r*2.4);fxRing(x,z,r*1.25,col,.4);PS.burst(x,y,z,fxN(12),col,{sp:r*2.2,up:r*1.5,life:.7});}
function fxSpike(x,z,h,dur,kind){const y=gY(x,z);const g=new T.Group();g.position.set(x,y-.05,z);g.rotation.set(rnd(-.35,.35),rnd(0,6),rnd(-.35,.35));
 const w=h*rnd(.2,.3);const c=fm(CONE(1,1,5),fxMat(kind),0,.5,0);g.add(c);if(kind!=='rock'){const c2=fm(CONE(1,1,4),fxMat(kind),w*.9,.3,0);c2.scale.set(.5,.6,.5);c2.rotation.z=-.5;g.add(c2);}
 const col=kind==='ice'?0xdff6ff:kind==='rock'?0x9a7a56:0x9a4aff;
 PS.burst(x,y+.2,z,fxN(4),col,{sp:3,up:4,life:.5,s:.8});
 fxAdd(g,dur,p=>{const k=p<.12?1.15*(p/.12):p<.2?1.15-.15*((p-.12)/.08):p>.8?1-(p-.8)/.2:1;g.scale.set(w,Math.max(.001,h*k),w);},()=>{if(kind==='ice')PS.burst(x,y+h*.5,z,fxN(5),0xdff6ff,{sp:3,up:2,life:.5,s:.7});});}
function fxBolt(a,b,col,dur,w){dur=dur||.24;w=w||.09;const g=new T.Group();const mc=addM(0xffffff,1),mg=addM(col,.5);const bx=BOX(1,1,1);
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],dist=Math.hypot(dx,dy,dz)||1;const _q=new T.Vector3();
 const seg=(p,q,ww)=>{const len=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);[[mc,ww],[mg,ww*3.2]].forEach(([m,s])=>{const o=fm(bx,m,(p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2);o.scale.set(s,s,len);_q.set(q[0],q[1],q[2]);o.lookAt(_q);g.add(o);});};
 const build=()=>{while(g.children.length)g.remove(g.children[0]);const n=Math.max(4,Math.min(10,Math.round(dist/1.5)));let prev=a;const j=dist*.07;
  for(let i=1;i<=n;i++){const t=i/n;const q=i===n?b:[a[0]+dx*t+rnd(-j,j),a[1]+dy*t+rnd(-j,j)*.6,a[2]+dz*t+rnd(-j,j)];seg(prev,q,w);
   if(i<n&&Math.random()<.3){const fk=[q[0]+rnd(-1,1)*dist*.14,q[1]-rnd(.2,1)*dist*.1,q[2]+rnd(-1,1)*dist*.14];seg(q,fk,w*.55);}prev=q;}};
 build();let st=0;fxAdd(g,dur,p=>{const s=p<.34?0:p<.67?1:2;if(s!==st){st=s;build();}mc.opacity=1-p*.6;mg.opacity=.5*(1-p);g.visible=!(p>.45&&p<.52);});}
function fxSkyBolt(x,z,col,big){const y=gY(x,z);fxBolt([x+rnd(-2,2),y+16,z+rnd(-2,2)],[x,y,z],col,big?.34:.24,big?.2:.1);fxSpark(x,y+.4,z,0xffffff,big?5:3);fxRing(x,z,big?3:1.6,col,.3);PS.burst(x,y+.3,z,fxN(big?12:6),col,{sp:6,up:5,life:.4,s:.6});}
function fxTornado(x,z,r,h,col,dur,c){const g=new T.Group();g.position.set(x,gY(x,z),z);const n=fxN(7);const rings=[];
 for(let i=0;i<n;i++){const t=n>1?i/(n-1):0;const m=fm(TOR(1,.07),addM(col,.55),0,h*t+.2,0);m.rotation.x=Math.PI/2;m.userData.r=r*(.25+.75*t);m.userData.i=i;g.add(m);rings.push(m);}
 const fun=fm(geo('fxfun',()=>new T.CylinderGeometry(1,.22,1,14,1,true)),addM(col,.14),0,h/2,0);fun.scale.set(r,h,r);g.add(fun);
 const bits=[];for(let i=0;i<fxN(8);i++){const b=fm(BOX(.14,.14,.14),basic(i%2?0xffffff:col),0,0,0);b.userData={a:rnd(0,6.28),t:Math.random(),s:rnd(.5,1.2)};g.add(b);bits.push(b);}
 fxAdd(g,dur,(p,f)=>{const k=p<.15?p/.15:p>.75?1-(p-.75)/.25:1;if(c){g.position.set(c.x,gY(c.x,c.z),c.z);}g.rotation.y=f.t*11;
  rings.forEach(m=>{const rr=m.userData.r*k;m.scale.set(rr,rr,rr);m.position.x=Math.sin(f.t*7+m.userData.i)*.18*rr;m.position.z=Math.cos(f.t*6+m.userData.i*1.7)*.18*rr;m.material.opacity=.55*k;});
  fun.material.opacity=.14*k;fun.scale.set(r*k,h,r*k);
  bits.forEach(b=>{const tt=(b.userData.t+f.t*b.userData.s*.9)%1;const rr=r*(.25+.75*tt)*k;b.position.set(Math.cos(b.userData.a)*rr,h*tt,Math.sin(b.userData.a)*rr);b.rotation.x+=.3;});});}
// crescent slash. vert: stands upright facing yaw, rolled by tilt.  flat: lies on the ground plane, can fly forward
function fxCres(x,y,z,yaw,tilt,col,s,dur,fly){const g0=geo('slash',()=>new T.RingGeometry(.75,1,24,1,-Math.PI*.38,Math.PI*.76));const m=fm(g0,slM(col,.95),x,y,z);
 if(fly==null){m.rotation.order='YXZ';m.rotation.y=yaw;m.rotation.z=tilt;}else{m.rotation.x=-Math.PI/2;m.rotation.z=yaw-Math.PI/2;}
 fxAdd(m,dur||.2,p=>{const e=1-Math.pow(1-p,2);const k=s*(.55+.75*e);m.scale.set(k,k,k);m.material.opacity=.95*(1-p*p);if(fly){m.position.x=x+Math.sin(yaw)*fly*e;m.position.z=z+Math.cos(yaw)*fly*e;}});}
function fxStreak(x1,z1,x2,z2,y,col,w,dur){const len=Math.hypot(x2-x1,z2-z1)||.1;const m=fm(BOX(1,1,1),slM(col,.9),(x1+x2)/2,y,(z1+z2)/2);m.rotation.y=Math.atan2(x2-x1,z2-z1);
 const m2=fm(BOX(1,1,1),addM(0xffffff,.9),0,0,0);m2.scale.set(.35,.35,1);m.add(m2);
 fxAdd(m,dur||.18,p=>{m.scale.set(w*(1-p),w*.5*(1-p),len*(.4+.6*Math.min(1,p*4)));m.material.opacity=.9*(1-p);m2.material.opacity=.9*(1-p);});}
function fxBlizzard(x,z,r,dur){const g=new T.Group();const gy=gY(x,z);g.position.set(x,gy,z);const H=6,fl=[];
 for(let i=0;i<fxN(26);i++){const s=glowSprite(i%3?0xffffff:0xbfeaff,rnd(.25,.6));s.userData={a:rnd(0,6.28),r:r*Math.sqrt(Math.random()),y:rnd(0,H),v:rnd(3,6),w:rnd(1.5,3.5)};g.add(s);fl.push(s);}
 const disc=fm(CIRC(1),basic(0xbfeaff,{transparent:true,opacity:0,depthWrite:false}),0,.07,0);disc.rotation.x=-Math.PI/2;disc.scale.setScalar(r);g.add(disc);
 const sh=[];for(let i=0;i<fxN(6);i++){const o=fm(OCT(.22),fxMat('ice'),0,0,0);o.scale.set(1,2.4,1);o.userData={a:rnd(0,6.28),r:r*rnd(.2,.9),y:rnd(0,H),v:rnd(6,9)};g.add(o);sh.push(o);}
 fxAdd(g,dur,(p,f,dt)=>{const k=p<.12?p/.12:p>.8?1-(p-.8)/.2:1;disc.material.opacity=.28*k;
  fl.forEach(s=>{const u=s.userData;u.a+=u.w*dt;u.y-=u.v*dt;if(u.y<0)u.y+=H;s.position.set(Math.cos(u.a)*u.r,u.y,Math.sin(u.a)*u.r);s.material.opacity=k;});
  sh.forEach(o=>{const u=o.userData;u.y-=u.v*dt;if(u.y<0){u.y+=H;u.a=rnd(0,6.28);}o.position.set(Math.cos(u.a)*u.r,u.y,Math.sin(u.a)*u.r);o.rotation.z=.4;o.visible=k>.3;});});}
function fxCross(x,z,s,col,dur,y0){const g=new T.Group();const gy=gY(x,z)+(y0||1.2);g.position.set(x,gy,z);g.rotation.y=camYaw(x,z);const m1=addM(col,.9),m2=addM(0xffffff,.9);
 g.add(fm(BOX(.34,3,.1),m1,0,0,0),fm(BOX(1.7,.34,.1),m1,0,.55,0),fm(BOX(.14,2.8,.12),m2,0,0,0),fm(BOX(1.5,.14,.12),m2,0,.55,0));const gl=glowSprite(col,4);gl.position.y=.5;g.add(gl);
 fxAdd(g,dur||.7,p=>{const e=1-Math.pow(1-p,3);const k=p<.2?p/.2:1;g.scale.setScalar(s*(.5+.5*k));g.position.y=gy+e*1.6*s;const a=p>.5?1-(p-.5)/.5:1;m1.opacity=.9*a;m2.opacity=.9*a;gl.material.opacity=a;});}
function fxSigil(x,z,r,col,dur,kind){const m=fm(geo('fxpl',()=>new T.PlaneGeometry(2,2)),new T.MeshBasicMaterial({map:circleTex(col,kind||0),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}),x,gY(x,z)+.09,z);m.rotation.x=-Math.PI/2;
 fxAdd(m,dur,(p,f,dt)=>{const k=p<.15?p/.15:p>.8?1-(p-.8)/.2:1;m.material.opacity=k;m.scale.setScalar(r*(.7+.3*Math.min(1,p*5)));m.rotation.z+=dt*1.5;});}
function fxDisc(x,z,r,col,op,dur,y){const m=fm(CIRC(1),basic(col,{transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),x,(y==null?gY(x,z)+.06:y),z);m.rotation.x=-Math.PI/2;
 fxAdd(m,dur,p=>{const k=p<.1?p/.1:p>.6?1-(p-.6)/.4:1;m.material.opacity=op*k;m.scale.setScalar(r*(.6+.4*Math.min(1,p*6)));});}
function fxCrack(x,z,r,col,dur){const g=new T.Group();g.position.set(x,gY(x,z)+.07,z);const md=basic(0x120a06,{transparent:true,opacity:.8,depthWrite:false}),ml=addM(col,.8);const n=fxN(7);
 for(let i=0;i<n;i++){const a=i/n*6.283+rnd(-.25,.25),len=r*rnd(.6,1);let px=0,pz=0,aa=a;for(let s=0;s<3;s++){const l=len/3;const nx=px+Math.sin(aa)*l,nz=pz+Math.cos(aa)*l;
   [[md,.26,0],[ml,.09,.01]].forEach(([m,w,yy])=>{const o=fm(BOX(1,1,1),m,(px+nx)/2,yy,(pz+nz)/2);o.scale.set(w*(1-s*.25),.03,l);o.rotation.y=aa;g.add(o);});px=nx;pz=nz;aa+=rnd(-.5,.5);}}
 fxAdd(g,dur,p=>{const k=p>.6?1-(p-.6)/.4:1;md.opacity=.8*k;ml.opacity=.8*k*(1-p*.5);const s=Math.min(1,p*8);g.scale.set(s,1,s);});}
function fxDust(x,z,r,col){PS.burst(x,gY(x,z)+.3,z,fxN(14),col||0x9a8a6a,{sp:r*1.4,up:3,life:.8,s:1.2,g:6});}
function fxShadowBurst(x,y,z,r){const s=fm(SPH(1,12,10),basic(0x10051c,{transparent:true,opacity:.85,depthWrite:false}),x,y,z);
 fxAdd(s,.34,p=>{const k=p<.6?1-.75*(p/.6):.25+1.1*((p-.6)/.4);s.scale.setScalar(r*k);s.material.opacity=.85*(p<.6?1:1-(p-.6)/.4);},()=>{const b=fm(SPH(1,12,10),nM(0x5a14b0,.6),x,y,z);fxAdd(b,.34,p=>{b.scale.setScalar(r*(.3+.9*(1-Math.pow(1-p,3))));b.material.opacity=.6*(1-p);});fxRing(x,z,r*1.3,0xb06aff,.4);PS.burst(x,y,z,fxN(12),0x7a2aff,{sp:r*2.2,up:r*1.4,life:.7});PS.burst(x,y,z,fxN(5),0x14061e,{sp:r*1.6,up:r,life:.6,s:1.3});});}
function fxSpin(c,r,col,dur,n,y){const g=new T.Group();g.position.set(c.x,gY(c.x,c.z)+(y||1),c.z);const g0=geo('slash',()=>new T.RingGeometry(.75,1,24,1,-Math.PI*.38,Math.PI*.76));const ms=[];
 for(let i=0;i<n;i++){const m=fm(g0,i%2?addM(0xffffff,.9):slM(col,.9));m.rotation.x=-Math.PI/2;m.rotation.z=i/n*6.283;m.scale.setScalar(r);g.add(m);ms.push(m);}
 fxAdd(g,dur,(p,f)=>{g.position.set(c.x,gY(c.x,c.z)+(y||1),c.z);g.rotation.y=-f.t*16;const k=.5+.5*Math.min(1,p*4);g.scale.setScalar(k);ms.forEach(m=>m.material.opacity=.9*(1-p*p));});}
function fxScorch(x,z,r,dur){fxDisc(x,z,r,0x140802,.5,dur||2);}
function fxMeteorX(x,z,size,col,dur,onHit){const gy=gY(x,z);const g=new T.Group();const sx=x+rnd(4,7),sy=gy+17,sz=z-rnd(3,6);
 g.add(fm(ICO(.5,0),basic(0x4a1e0a)));g.add(fm(ICO(.56,0),addM(col,.55)));const tail=fm(CONE(.55,3.6,7),addM(col,.6),0,0,-2);tail.rotation.x=-Math.PI/2;g.add(tail);
 const t2=fm(CONE(.3,2.4,6),addM(0xffe08a,.8),0,0,-1.4);t2.rotation.x=-Math.PI/2;g.add(t2);g.add(glowSprite(col,3.4));g.scale.setScalar(size);g.position.set(sx,sy,sz);g.lookAt(x,gy,z);let acc=0;
 fxAdd(g,dur,(p,f,dt)=>{const e=p*p*.4+p*.6;g.position.set(lerp(sx,x,e),lerp(sy,gy,e),lerp(sz,z,e));g.children[0].rotation.x+=.3;acc+=dt;if(acc>.04){acc=0;PS.burst(g.position.x,g.position.y,g.position.z,1,Math.random()<.5?col:0xffe08a,{sp:1,up:1,g:-1,life:.5,s:size});}},
  ()=>{fxBoom(x,gy+.6*size,z,2.2*size,col,0xffe08a);fxScorch(x,z,1.6*size,2.2);for(let i=0;i<fxN(3);i++)fxFlame(x+rnd(-1,1)*size,z+rnd(-1,1)*size,rnd(.7,1.2)*size,rnd(.7,1.2));if(onHit)onHit();});}
function fxArrowRain(x,z,r,n,t0,t1,col){for(let i=0;i<n;i++){fxLater(lerp(t0,t1,i/n)+rnd(0,40),()=>{const a=rnd(0,6.28),d=r*Math.sqrt(Math.random());const px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d,gy=gY(px,pz);
  const m=fm(BOX(.05,.05,1.3),basic(0xe8dcc0));const sx=px-2.5,sy=gy+11,sz=pz-1.5;m.position.set(sx,sy,sz);m.lookAt(px,gy,pz);const tr=fm(BOX(.09,.09,2.2),addM(col,.5),0,0,-1.6);m.add(tr);
  fxAdd(m,.5,p=>{const q=Math.min(1,p/.36);m.position.set(lerp(sx,px,q),lerp(sy,gy+.3,q),lerp(sz,pz,q));tr.material.opacity=q<1?.5:0;if(q>=1&&!m.userData.h){m.userData.h=1;PS.burst(px,gy+.2,pz,2,0xcfc0a0,{sp:2,up:2,life:.3,s:.6});}});});}}
function fxMotes(c,col,n,dur,r){const g=new T.Group();const ms=[];for(let i=0;i<n;i++){const s=glowSprite(i%2?0xffffff:col,rnd(.35,.6));s.userData={a:i/n*6.283,y:rnd(.2,2.4),v:rnd(.6,1.4)};g.add(s);ms.push(s);}
 fxAdd(g,dur,(p,f,dt)=>{g.position.set(c.x,gY(c.x,c.z),c.z);ms.forEach(s=>{const u=s.userData;u.a+=dt*5;u.y+=u.v*dt;s.position.set(Math.cos(u.a)*r,u.y,Math.sin(u.a)*r);s.material.opacity=1-p;});});}
function fxAura(c,col,big){const n=big?5:3;for(let i=0;i<n;i++)fxLater(i*130,()=>{const m=fm(RING(.8,1),addM(col,.9));m.rotation.x=-Math.PI/2;fxAdd(m,.7,p=>{m.position.set(c.x,gY(c.x,c.z)+.1+p*2.6,c.z);m.scale.setScalar((big?1.9:1.3)*(1-p*.35));m.material.opacity=.9*(1-p);});});
 fxPillar(c.x,c.z,big?2:1.2,big?9:5,col,big?1.3:.8,.55);fxMotes(c,col,fxN(big?10:6),big?1.6:1,big?1.3:.9);fxRing(c.x,c.z,big?5:3,col,.5);if(big){fxSigil(c.x,c.z,3,col,1.6,1);}}
function fxHealV(c){const col=0x7dff9a;fxPillar(c.x,c.z,1.1,6,col,.9,.6);fxMotes(c,col,fxN(7),1.1,.8);fxRing(c.x,c.z,2.5,col,.6);
 for(let i=0;i<fxN(5);i++)fxLater(i*90,()=>{const g=new T.Group();const m=addM(col,.95);g.add(fm(BOX(.09,.34,.04),m),fm(BOX(.34,.09,.04),m));const ox=rnd(-.8,.8),oz=rnd(-.8,.8);g.rotation.y=camYaw(c.x,c.z);
  fxAdd(g,.8,p=>{g.position.set(c.x+ox,gY(c.x,c.z)+.6+p*2.2,c.z+oz);m.opacity=.95*(1-p);});});}
function fxRingIn(x,z,r,col,dur){const m=fm(RING(.86,1),addM(col,.9),x,gY(x,z)+.12,z);m.rotation.x=-Math.PI/2;fxAdd(m,dur,p=>{m.scale.setScalar(r*(1-.85*p));m.material.opacity=.9*Math.min(1,p*3);});}
function fxCoins(x,y,z,n){PS.burst(x,y,z,fxN(n),0xffd24a,{sp:5,up:7,life:1,s:1.1});fxSpark(x,y,z,0xffe08a,3);}

/* ---------- element impact (projectile hits / melee accents) ---------- */
const EL_COL={fire:0xff6a1a,ice:0x9fe6ff,lightning:0xffe14d,wind:0x9affc8,earth:0xc8a06a,holy:0xfff2a0,shadow:0x9a4aff};
function elHit(el,x,y,z,col,s){s=s||1;const gy=gY(x,z);
 switch(el){
  case 'fire':fxBoom(x,y,z,1.3*s,0xff6a1a,0xffe08a);fxFlame(x,z,.9*s,.6);break;
  case 'ice':fxSpark(x,y,z,0xdff6ff,3*s);fxRing(x,z,1.8*s,0x9fe6ff,.35);PS.burst(x,y,z,fxN(10),0xdff6ff,{sp:5,up:3,life:.6,s:.8});for(let i=0;i<fxN(3);i++)fxSpike(x+rnd(-.8,.8)*s,z+rnd(-.8,.8)*s,rnd(.8,1.5)*s,rnd(.6,.9),'ice');break;
  case 'lightning':fxSkyBolt(x,z,0xffe14d,s>1.2);break;
  case 'wind':{const a=rnd(0,6.28);fxCres(x,y,z,a,rnd(-.6,.6),0xcffff0,1.5*s,.22);fxCres(x,y,z,a+1.6,rnd(-.6,.6),0x9affc8,1.5*s,.22);fxRing(x,z,2*s,0x9affc8,.3);PS.burst(x,y,z,fxN(6),0xdffff0,{sp:6,up:1,life:.35,s:.6,g:0});break;}
  case 'earth':fxSpike(x,z,1.8*s,.7,'rock');fxDust(x,z,2*s);fxRing(x,z,1.8*s,0xc8a06a,.35);break;
  case 'holy':fxCross(x,z,.55*s,0xfff2a0,.5,y-gy);fxPillar(x,z,.5*s,5,0xfff2a0,.45,.7);fxSpark(x,y,z,0xffffff,3*s);PS.burst(x,y,z,fxN(6),0xfff2a0,{sp:3,up:4,g:-2,life:.6,s:.6});break;
  case 'shadow':fxShadowBurst(x,y,z,1.1*s);fxCres(x,y,z,rnd(0,6.28),rnd(-1,1),0xb06aff,1.4*s,.2);break;
  default:fxSpark(x,y,z,col||0xffffff,2.6*s);fxRing(x,z,1.6*s,col||0xffffff,.3);PS.burst(x,y,z,fxN(6),col||0xffffff,{sp:4,up:3,life:.4});}}

/* ---------- projectile looks ---------- */
function projMesh(el,col,cls){if(cls==='acrobat')return yoyoProj(el,col);const g=new T.Group();
 if(el==='fire'){g.add(fm(SPH(.24,8,6),basic(0xfff0a0)));const t=fm(CONE(.3,1.5,6),addM(0xff6a1a,.75),0,0,-.8);t.rotation.x=-Math.PI/2;g.add(t);g.add(glowSprite(0xff7a2a,2.6));}
 else if(el==='ice'){const o=fm(OCT(.24),fxMat('ice'));o.scale.set(.8,.8,3);g.add(o);g.add(glowSprite(0x9fe6ff,1.8));}
 else if(el==='lightning'){g.add(fm(SPH(.2,8,6),basic(0xffffff)));g.add(glowSprite(0xffe14d,2.6));for(let i=0;i<3;i++){const b=fm(BOX(.05,.05,.7),addM(0xffffff,.9));b.userData.sp=1;g.add(b);}}
 else if(el==='wind'){if(cls==='archer'){g.add(fm(BOX(.06,.06,1.3),basic(0xe8dcc0)));const hd=fm(CONE(.09,.26,4),basic(0xffffff),0,0,.75);hd.rotation.x=Math.PI/2;g.add(hd);}
  const sp=fm(CONE(.2,1.9,6),addM(0x9affc8,.55),0,0,.1);sp.rotation.x=Math.PI/2;g.add(sp);for(let i=0;i<2;i++){const r=fm(TOR(.32,.035),addM(0xdffff0,.7),0,0,-.2-i*.45);r.userData.ring=1;g.add(r);}g.add(glowSprite(0x9affc8,1.6));}
 else if(el==='earth'){g.add(fm(ICO(.32,0),fxMat('rock')));g.add(glowSprite(0xc8a06a,1.2));}
 else if(el==='holy'){g.add(fm(SPH(.2,8,6),basic(0xffffff)));g.add(fm(BOX(.08,.9,.08),addM(0xfff2a0,.9)),fm(BOX(.9,.08,.08),addM(0xfff2a0,.9)));g.add(glowSprite(0xfff2a0,2.6));}
 else if(el==='shadow'){g.add(fm(SPH(.26,8,6),basic(0x14061e)));const t=fm(CONE(.3,1.4,6),addM(0x8a2aff,.6),0,0,-.75);t.rotation.x=-Math.PI/2;g.add(t);g.add(glowSprite(0x9a4aff,2.4));}
 else if(cls==='archer'){g.add(fm(BOX(.07,.07,1.4),basic(0xe8dcc0)));const hd=fm(CONE(.1,.28,4),basic(0xffffff),0,0,.8);hd.rotation.x=Math.PI/2;g.add(hd);g.add(fm(BOX(.12,.12,2),addM(col||0xfff0c0,.45),0,0,-1));g.add(glowSprite(col||0xfff0c0,1.4));}
 else{g.add(fm(SPH(.3,8,6),basic(col||0xb98cff)));g.add(glowSprite(col||0xb98cff,2.2));}
 return g;}
function projTrail(p,dt){const el=p.o.el,m=p.m;p.tr=(p.tr||0)+dt;
 for(const c of m.children){if(c.userData.spinY)c.rotation.y+=dt*34;if(c.userData.spinZ)c.rotation.z+=dt*16;}
 if(p.o.coin){if(p.tr>=.03){p.tr=0;PS.burst(p.x,m.position.y,p.z,2,Math.random()<.5?0xffd24a:0xfff2b0,{sp:1.5,up:1.5,g:4,life:.5,s:.7});}return;}
 for(const c of m.children){if(c.userData.sp){c.position.set(rnd(-.3,.3),rnd(-.3,.3),rnd(-.3,.3));c.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3));}else if(c.userData.ring)c.rotation.z+=dt*14;}
 if(el==='ice')m.children[0].rotation.z+=dt*10;if(el==='holy'){m.children[1].rotation.z+=dt*8;m.children[2].rotation.z+=dt*8;}if(el==='earth')m.children[0].rotation.x+=dt*9;
 if(p.tr<.035)return;p.tr=0;const x=p.x,y=m.position.y,z=p.z;
 if(el==='fire')PS.burst(x,y,z,1,Math.random()<.5?0xff6a1a:0xffd040,{sp:.8,up:1.5,g:-2,life:.4,s:.8});
 else if(el==='ice')PS.burst(x,y,z,1,0xdff6ff,{sp:.6,up:.2,g:3,life:.45,s:.5});
 else if(el==='lightning')PS.burst(x,y,z,1,0xffe14d,{sp:2.5,up:.5,g:0,life:.18,s:.45});
 else if(el==='wind')PS.burst(x,y,z,1,0xdffff0,{sp:.8,up:.2,g:0,life:.3,s:.45});
 else if(el==='earth')PS.burst(x,y,z,1,0x9a7a56,{sp:.8,up:.5,g:9,life:.4,s:.7});
 else if(el==='holy')PS.burst(x,y,z,1,0xfff2a0,{sp:.6,up:1.2,g:-1.5,life:.45,s:.5});
 else if(el==='shadow')PS.burst(x,y,z,1,0x8a2aff,{sp:.6,up:.6,g:-1,life:.45,s:.7});}
// visual-only projectile (used to show another player's ranged skills)
function fxProj(el,col,cls,sx,sy,sz,t,coin){const m=coin?coinMesh(coin>8?1.5:1.1):projMesh(el,col,cls);m.position.set(sx,sy,sz);const d=Math.hypot(t.x-sx,t.z-sz)||1;const p={m,x:sx,z:sz,o:{el,coin,col}};
 fxAdd(m,Math.max(.08,d/21),(q,f,dt)=>{p.x=lerp(sx,t.x,q);p.z=lerp(sz,t.z,q);m.position.set(p.x,sy,p.z);m.rotation.y=Math.atan2(t.x-sx,t.z-sz);projTrail(p,dt);},()=>projHitFx(p));}

/* ---------- self-centred AOE ---------- */
function aoeVis(sk,cls,c){const el=sk.el,r=sk.r||5,col=sk.c,x=c.x,z=c.z,gy=gY(x,z),ult=!!sk.ult;if(cls==='acrobat')fxOrbit(c,r*.8,el?EL_COL[el]:col,ult?.9:.55,ult?4:2);
 const ringPts=(n,rr,fn,stag)=>{for(let i=0;i<n;i++){const a=i/n*6.283+rnd(-.15,.15);fxLater((stag||0)*i,()=>fn(x+Math.cos(a)*rr,z+Math.sin(a)*rr,a,i));}};
 switch(el){
  case 'fire':fxBoom(x,gy+1,z,r*(ult?.9:.6),0xff6a1a,0xffe08a);fxScorch(x,z,r*.9,2.2);
   ringPts(fxN(ult?14:9),r*.8,(px,pz)=>fxFlame(px,pz,rnd(1.2,1.8),rnd(.7,1.1)),18);fxLater(120,()=>ringPts(fxN(5),r*.42,(px,pz)=>fxFlame(px,pz,rnd(1,1.4),.8)));
   if(ult){screenFlash('#ffb060',.28);fxPillar(x,z,r*.35,13,0xff8a2a,1.1,.8);fxLater(180,()=>{fxRing(x,z,r*1.3,0xffd040,.6);fxBoom(x,gy+3,z,r*.6,0xff4a10,0xfff0a0);});fxLater(380,()=>fxRing(x,z,r*1.5,0xff6a1a,.7));}break;
  case 'ice':fxDisc(x,z,r,0xbfeaff,.3,1.6);fxRing(x,z,r,0x9fe6ff,.5);[.35,.65,.95].forEach((j,k)=>fxLater(k*110,()=>ringPts(fxN(5+k*3),r*j,(px,pz)=>fxSpike(px,pz,rnd(1.3,2.4)*(ult?1.4:1),rnd(.9,1.3),'ice'))));
   for(let i=0;i<fxN(8);i++)fxLater(rnd(0,500),()=>fxSpark(x+rnd(-r,r)*.8,gy+rnd(.5,3),z+rnd(-r,r)*.8,0xffffff,rnd(.8,1.6)));PS.burst(x,gy+1,z,fxN(16),0xdff6ff,{sp:r*1.5,up:3,life:.8,s:.7});break;
  case 'lightning':fxRing(x,z,r,0xffe14d,.5);fxLater(120,()=>fxRing(x,z,r*.7,0xffffff,.4));for(let i=0;i<fxN(ult?12:7);i++)fxLater(i*45,()=>{const a=rnd(0,6.28),d=r*Math.sqrt(Math.random());fxSkyBolt(x+Math.cos(a)*d,z+Math.sin(a)*d,0xffe14d,ult&&i%4===0);});
   if(ult){screenFlash('#fff6c0',.28);fxSigil(x,z,r*.8,0xffe14d,1.2);fxPillar(x,z,1.4,14,0xffe14d,.9,.8);}break;
  case 'wind':fxTornado(x,z,Math.min(3,r*.5),4.5,0x9affc8,.95,c);fxSpin(c,r*.75,0x9affc8,.5,3,1.1);for(let i=0;i<4;i++)fxCres(x,gy+1.1,z,c.face+i*1.571,0,i%2?0xffffff:0x9affc8,r*.55,.4,r*.6);fxRing(x,z,r,0x9affc8,.45);break;
  case 'earth':fxCrack(x,z,r,0xffb050,1.6);fxDust(x,z,r);fxRing(x,z,r,0xc8a06a,.5);ringPts(fxN(6),r*.45,(px,pz)=>fxSpike(px,pz,rnd(1.4,2.2),rnd(.8,1.1),'rock'));fxLater(130,()=>ringPts(fxN(ult?12:8),r*.85,(px,pz)=>{fxSpike(px,pz,rnd(1.8,3)*(ult?1.3:1),rnd(.8,1.2),'rock');}));
   if(ult){fxLater(260,()=>{fxRing(x,z,r*1.3,0xffb050,.6);fxDust(x,z,r*1.3);});}break;
  case 'holy':fxSigil(x,z,r*.85,0xffd76a,1.3);fxCross(x,z,ult?1.6:1,0xfff2a0,.9);fxPillar(x,z,ult?2:1.2,ult?14:9,0xfff2a0,.9,.6);fxRing(x,z,r,0xfff2a0,.5);
   ringPts(fxN(ult?10:6),r*.75,(px,pz)=>fxPillar(px,pz,.5,8,0xfff2a0,.7,.75),35);PS.burst(x,gy+1,z,fxN(16),0xfff2a0,{sp:r,up:5,g:-2,life:.9,s:.6});
   if(ult){screenFlash('#fff8d8',.28);fxLater(200,()=>ringPts(fxN(8),r*.45,(px,pz)=>fxCross(px,pz,.6,0xfff2a0,.6)));fxLater(350,()=>fxRing(x,z,r*1.3,0xffffff,.6));}break;
  case 'shadow':fxSpin(c,r*.8,0x5a14b0,.55,ult?5:3,1.1);fxShadowBurst(x,gy+1,z,r*.45);fxDisc(x,z,r,0x12061e,.5,.9);ringPts(fxN(ult?10:6),r*.7,(px,pz)=>fxFlameDark(px,pz,rnd(1,1.5),rnd(.6,.9)),25);
   if(ult){screenFlash('#3a1060',.25);fxLater(160,()=>{fxSpin(c,r*1.1,0x7a2ad8,.6,4,1.6);ringPts(fxN(8),r*.95,(px,pz)=>fxSpike(px,pz,rnd(2,3.2),.9,'shadow'));});}break;
  default:fxRing(x,z,r,col,.45);fxLater(90,()=>fxRing(x,z,r*.7,0xffffff,.35));fxDust(x,z,r);fxSpin(c,r*.7,col,.4,2,1);if(cls==='smith'){fxCoins(x,gy+1.2,z,ult?28:12);if(ult)ringPts(fxN(8),r*.7,(px,pz)=>fxCoins(px,gY(px,pz)+.6,pz,4),30);}}}

/* ---------- targeted AOE (impact lands D ms after the cast) ---------- */
function aoeTVis(sk,cls,c,x,z,D){const el=sk.el,r=sk.r||5,col=sk.c,gy=gY(x,z),ult=!!sk.ult;const ec=EL_COL[el]||col;
 const pt=()=>{const a=rnd(0,6.28),d=r*.85*Math.sqrt(Math.random());return [x+Math.cos(a)*d,z+Math.sin(a)*d];};
 if(sk.zeny&&cls==='acrobat'){fxCoinToss(c,true);fxSigil(x,z,r,0xffd24a,(D+900)/1000,1);for(let i=0;i<fxN(7);i++){const [px,pz]=i?pt():[x,z];fxLater(D-200+i*110,()=>fxZenyHit(px,pz,i?4:12));}return;}
 if(cls==='wizard'||cls==='priest')fxSigil(x,z,r,ec,(D+500)/1000);else fxRingIn(x,z,r,ec,D/1000+.05);
 switch(el){
  case 'fire':if(ult){fxMeteorX(x,z,3.4,0xff5a1a,Math.max(.3,D/1000),()=>{screenFlash('#ffb060',.3);fxBoom(x,gy+1.5,z,r*.8,0xff6a1a,0xfff0a0);for(let i=0;i<3;i++)fxLater(i*130,()=>fxRing(x,z,r*(.8+i*.3),i%2?0xffd040:0xff6a1a,.6));
     for(let i=0;i<fxN(12);i++){const [px,pz]=pt();fxFlame(px,pz,rnd(1.3,2.2),rnd(1,1.6));}fxPillar(x,z,r*.3,12,0xff8a2a,1,.7);fxScorch(x,z,r*.9,3);});}
   else{const md=Math.min(.42,D/1000);const n=fxN(cls==='wizard'?6:4);for(let i=0;i<n;i++){const [px,pz]=i?pt():[x,z];fxLater(D-md*1000+i*85,()=>fxMeteorX(px,pz,cls==='wizard'?1:.7,0xff6a1a,md));}}break;
  case 'ice':fxBlizzard(x,z,r,(D+1000)/1000);fxLater(D,()=>{fxRing(x,z,r,0x9fe6ff,.5);for(let i=0;i<fxN(ult?14:9);i++){const [px,pz]=pt();fxLater(i*30,()=>fxSpike(px,pz,rnd(1.4,2.6),rnd(.9,1.4),'ice'));}PS.burst(x,gy+1,z,fxN(16),0xdff6ff,{sp:r*1.2,up:4,life:.8,s:.7});});break;
  case 'lightning':if(sk.n==='Psychic Wave'){for(let i=0;i<4;i++)fxLater(D-200+i*140,()=>{fxRing(x,z,r*(.5+i*.18),i%2?0xffffff:0xc8a0ff,.45);const [ax,az]=pt(),[bx,bz]=pt();fxBolt([ax,gY(ax,az)+rnd(.5,2),az],[bx,gY(bx,bz)+rnd(.5,2),bz],0xc8a0ff,.22,.07);});fxLater(D,()=>fxBoom(x,gy+1.2,z,r*.5,0xa070ff,0xffffff));}
   else{fxDisc(x,z,r*1.1,0x0c0c18,.55,(D+800)/1000,gy+12);fxLater(D,()=>{fxSkyBolt(x,z,0xffe14d,true);screenFlash('#fff6c0',ult?.28:.16);});const n=fxN(ult?12:7);for(let i=0;i<n;i++){const [px,pz]=pt();fxLater(D-120+i*(560/n),()=>fxSkyBolt(px,pz,0xffe14d));}}break;
  case 'earth':fxCrack(x,z,r,0xffb050,(D+1400)/1000);
   if(ult){const s=fm(SPH(1,14,12),basic(0x0c0618,{transparent:true,opacity:.8,depthWrite:false}),x,gy+6,z);const hal=fm(SPH(1,12,10),addM(0x8a5aff,.35),0,0,0);hal.scale.setScalar(1.15);s.add(hal);
     fxAdd(s,D/1000+.12,p=>{const q=Math.min(1,p/.85);s.scale.setScalar(r*.5*(.2+.8*q));s.position.y=gy+6-(p>.85?(p-.85)/.15*5:0);});for(let i=0;i<3;i++)fxLater(i*(D/3.2),()=>fxRingIn(x,z,r*1.2,0x8a5aff,.4));
     const rocks=[];for(let i=0;i<fxN(8);i++){const [px,pz]=pt();const m=fm(ICO(.3,0),fxMat('rock'),px,gY(px,pz),pz);m.scale.setScalar(rnd(.7,1.6));rocks.push(m);fxAdd(m,D/1000+.05,p=>{m.position.y=gY(px,pz)+(p<.85?p/.85*rnd(2.8,3):3*(1-(p-.85)/.15));m.rotation.x+=.1;m.rotation.y+=.07;});}
     fxLater(D,()=>{screenFlash('#2a1050',.25);fxBoom(x,gy+.8,z,r*.7,0x8a5aff,0xe0d0ff);fxDust(x,z,r);for(let i=0;i<fxN(10);i++){const [px,pz]=pt();fxSpike(px,pz,rnd(1.6,2.8),1,'rock');}for(let i=0;i<2;i++)fxLater(i*150,()=>fxRing(x,z,r*(1+i*.3),0x8a5aff,.6));});}
   else fxLater(D,()=>{fxDust(x,z,r);fxRing(x,z,r,0xc8a06a,.5);for(let i=0;i<fxN(9);i++){const [px,pz]=i?pt():[x,z];fxLater(i*28,()=>fxSpike(px,pz,rnd(1.6,3)*(i?1:1.3),rnd(.8,1.2),'rock'));}if(cls==='smith'){fxBoom(x,gy+.6,z,r*.5,0xffb050,0xffffff);}});break;
  case 'wind':if(cls==='archer'){fxArrowRain(x,z,r,fxN(ult?30:16),Math.max(0,D-230),D+420,0x9affc8);fxLater(D,()=>{fxRing(x,z,r,0x9affc8,.5);fxDust(x,z,r*.7,0xcfe8d8);});
    if(sk.n.indexOf('Hawk')>=0||sk.n.indexOf('Gale')>=0||ult)fxLater(D-60,()=>{fxStreak(x-5,z-3,x,z,gy+1.2,0xffffff,.9,.3);fxTornado(x,z,r*.45,5,0x9affc8,1.1);});}
   else{fxLater(D,()=>{const a=c.face;fxCres(x,gy+1.2,z,a+.78,0,0xffffff,r*.9,.4,.01);fxCres(x,gy+1.2,z,a-.78,0,0x9affc8,r*.9,.4,.01);fxCres(x,gy+1.4,z,a+.78+3.14,0,0x9affc8,r*.9,.4,.01);fxCres(x,gy+1.4,z,a-.78+3.14,0,0xffffff,r*.9,.4,.01);fxTornado(x,z,r*.4,4,0x9affc8,.8);fxRing(x,z,r,0x9affc8,.45);});}break;
  case 'holy':for(let i=0;i<fxN(5);i++){const [px,pz]=pt();fxLater(i*(D/6),()=>fxPillar(px,pz,.35,10,0xfff2a0,.5,.6));}
   fxLater(D,()=>{fxPillar(x,z,r*(ult?.6:.5),ult?16:12,0xfff2a0,1,.6);fxCross(x,z,ult?1.8:1.1,0xfff2a0,.9);fxRing(x,z,r,0xfff2a0,.5);PS.burst(x,gy+1,z,fxN(18),0xfff2a0,{sp:r,up:6,g:-2,life:1,s:.6});
    if(ult){screenFlash('#fff8d8',.28);for(let i=0;i<fxN(6);i++){const [px,pz]=pt();fxLater(80+i*50,()=>fxCross(px,pz,.6,0xfff2a0,.6));}fxLater(250,()=>fxRing(x,z,r*1.3,0xffffff,.6));}});break;
  case 'shadow':fxDisc(x,z,r,0x12061e,.6,(D+900)/1000);fxLater(D,()=>{fxShadowBurst(x,gy+1,z,r*.45);for(let i=0;i<fxN(9);i++){const [px,pz]=i?pt():[x,z];fxLater(i*28,()=>fxSpike(px,pz,rnd(1.6,2.8),rnd(.7,1),'shadow'));}for(let i=0;i<fxN(4);i++){const [px,pz]=pt();fxFlameDark(px,pz,1.2,.8);}});break;
  default:fxLater(D,()=>{fxBoom(x,gy+.8,z,r*.5,col,0xffffff);fxDust(x,z,r);});}}

/* ---------- melee skill hits ---------- */
function meleeVis(sk,cls,c,t,k,hits){if(!t||t.dead)return;const el=sk.el,col=sk.c,x=t.x,z=t.z,gy=gY(x,z),y=gy+1.1,last=k===hits-1,a=Math.atan2(x-c.x,z-c.z);
 if(cls==='assassin'){const ra=rnd(0,6.28);fxStreak(x+Math.sin(ra)*2.4,z+Math.cos(ra)*2.4,x-Math.sin(ra)*2.4,z-Math.cos(ra)*2.4,y+rnd(-.4,.5),k%2?0xffffff:0x4a10a0,.24,.16);
  fxCres(x,y,z,ra+1.57,rnd(-1.2,1.2),k%2?0x6a1ad0:0xffffff,rnd(1.3,1.9),.18);fxCres(x,y,z,ra+1.57+rnd(.8,2.2),rnd(-1.2,1.2),k%2?0xffffff:0x6a1ad0,rnd(1,1.5),.16);if(hits>1&&k%3===0)PS.burst(x,y,z,3,col,{sp:4,up:2,life:.3,s:.6});
  if(last){if(hits>1){fxCres(x,y,z,a+1.57,.78,0xffffff,2.6,.3);fxCres(x,y,z,a+1.57,-.78,col,2.6,.3);}elHit(el||'shadow',x,y,z,col,hits>6?1.5:1.1);if(sk.ult)screenFlash('#3a1060',.22);}return;}
 if(cls==='smith'){fxBoom(x,y,z,last?1.5:.9,0xffb050,0xffffff);PS.burst(x,y,z,fxN(8),0xffd24a,{sp:6,up:5,life:.5,s:.6});if(last){fxDust(x,z,2.5);if(el)elHit(el,x,y,z,col,1.2);if(sk.n.indexOf('Mammon')>=0)fxCoins(x,y,z,12);}return;}
 // knight & everyone else: thrust streak + heavy slash
 if(hits>1)fxStreak(c.x+Math.sin(a)*.8,c.z+Math.cos(a)*.8,x+Math.sin(a)*1.6,z+Math.cos(a)*1.6,y+rnd(-.25,.3),k%2?0xffffff:col,.3,.16);
 fxCres(x,y,z,a+1.57,hits>1?rnd(-1,1):-.5,col,hits>1?1.6:2.4,.24);
 if(last){fxRing(x,z,2.4,col,.35);fxDust(x,z,1.8);elHit(el,x,y,z,col,1.25);if(!el)fxCres(x,y,z,a+1.57,.6,0xffffff,2.2,.26);}}

/* ---------- entry point: all visuals for one skill cast (local hero or another player) ---------- */
function skillVis(sk,cls,c,t,peer){try{const C=CLASSES[cls]||{};const ranged=C.ranged||sk.rng;const gy=gY(c.x,c.z);
 const tx=t?t.x:c.x+Math.sin(c.face||0)*5,tz=t?t.z:c.z+Math.cos(c.face||0)*5;
 if(sk.k==='awk'){fxAura(c,sk.c,true);screenFlash('#ffffff',.2);return;}
 if(sk.t==='buff'){fxAura(c,sk.c,false);return;}
 if(sk.t==='heal'){fxHealV(c);return;}
 if(sk.t==='aoe'){aoeVis(sk,cls,c);return;}
 if(sk.t==='aoeT'){if(t)aoeTVis(sk,cls,c,tx,tz,cls==='wizard'?550:250);return;}
 const hits=sk.hits||1;
 if(ranged){const hx=c.x+Math.sin(c.face||0)*.6,hz=c.z+Math.cos(c.face||0)*.6;if(sk.zeny&&cls==='acrobat')fxCoinToss(c,sk.zeny>8);fxSpark(hx,gy+1.4,hz,EL_COL[sk.el]||sk.c,2.2);fxRing(c.x,c.z,1.6,EL_COL[sk.el]||sk.c,.3);
  if(peer&&t)for(let k=0;k<hits;k++)fxLater(k*90+(sk.zeny?120:0),()=>fxProj(sk.el,sk.c,cls,hx,gy+1.3,hz,{x:tx,z:tz},sk.zeny));return;}
 if(!t)return;for(let k=0;k<hits;k++)fxLater(k*70,()=>meleeVis(sk,cls,c,t,k,hits));
 }catch(e){console.warn('skillVis',e);}}
function skillVisNet(e){const p=NET.peers[e.u];if(!p||p.x==null)return;const C=CLASSES[p.cls];if(!C||!C.sk[e.i])return;if(Math.hypot(p.x-hero.x,p.z-hero.z)>60)return;
 const c={x:p.x,z:p.z,face:e.f||p.face||0};skillVis(C.sk[e.i],p.cls,p,e.tx!=null?{x:e.tx,z:e.tz}:null,true);}

/* ================= YOYO / ZENY effects (Acrobat line) ================= */
const _yv=new T.Vector3(),_yq=new T.Vector3();
function handPos(M,hd){(hd==='L'?M.handL:M.handR).getWorldPosition(_yv);return _yv;}
function yoyoDisc(col,big){const g=new T.Group();const r=big?.3:.22;const dk=geo('yoP'+r,()=>new T.CylinderGeometry(r,r*.8,.06,14));const mt=mat(0xd8dce4,{metalness:.7,roughness:.25});
 const sp=new T.Group();sp.userData.spinY=1;[-1,1].forEach(s=>sp.add(fm(dk,mt,0,s*.045,0)));for(let i=0;i<4;i++){const a=i/4*6.283;const b=fm(CONE(.05,.2,4),mt,Math.cos(a)*(r+.06),0,Math.sin(a)*(r+.06));b.rotation.z=-Math.PI/2;b.rotation.y=-a;sp.add(b);}
 const rg=fm(TOR(r+.1,.03),addM(col,.8));rg.rotation.x=Math.PI/2;sp.add(rg);g.add(sp);g.add(glowSprite(col,big?2.2:1.5));return g;}
function yoyoProj(el,col){const c=EL_COL[el]||col||0xff6a9a;const g=yoyoDisc(c,true);if(el==='shadow'){const pg=fm(BOX(.5,.04,.36),basic(0x1a0a2e),0,.12,0);pg.userData.spinZ=1;g.add(pg);}return g;}
function strMesh(col){const m=fm(BOX(1,1,1),basic(col||0xf0e8d8,{transparent:true,opacity:.85}));return m;}
function strSet(m,a,b){const len=a.distanceTo(b)||.01;m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(.025,.025,len);m.lookAt(b);}
// basic-attack yoyo: out along a curved path, bite, snap back to the hand
function fxYoyo(M,hd,tx,ty,tz,o,onHit){o=o||{};const disc=yoyoDisc(o.col||0xff6a9a,o.big);const str=strMesh();world.add(str);const wk=hd==='L'?'w2':'w';const held=M.eqG&&M.eqG[wk];if(held)held.visible=false;
 const a0=handPos(M,hd).clone();const dx=tx-a0.x,dz=tz-a0.z,d=Math.hypot(dx,dz)||1;const nx=dz/d,nz=-dx/d;const side=o.side||0;let hit=false;const cur=new T.Vector3();
 fxAdd(disc,o.dur||.34,(p,f)=>{const h=handPos(M,hd);let q,sd;if(p<.42){q=1-Math.pow(1-p/.42,2.2);sd=Math.sin(q*Math.PI*.5)*side*.6;}else if(p<.52){q=1;sd=side*.6;}else{const r=(p-.52)/.48;q=1-r*r;sd=side*.6*(1-r)+Math.sin(r*Math.PI)*side*-.8;}
  if(p>=.42&&!hit){hit=true;fxSpark(tx,ty,tz,o.col||0xffffff,o.big?2.4:1.5);PS.burst(tx,ty,tz,fxN(o.big?8:4),o.col||0xffffff,{sp:4,up:2,life:.3,s:.6});if(o.big)fxRing(tx,tz,1.8,o.col||0xffb070,.3);if(onHit)try{onHit();}catch(e){console.warn(e);}}
  cur.set(lerp(h.x,tx,q)+nx*sd,lerp(h.y,ty,q)+Math.sin(q*Math.PI)*.25,lerp(h.z,tz,q)+nz*sd);disc.position.copy(cur);disc.rotation.z=.5;disc.children[0].rotation.y=f.t*40;_yq.copy(h);strSet(str,_yq,cur);},
  ()=>{world.remove(str);if(held)held.visible=true;});}
// string from the hand to a flying skill projectile
function fxProjString(p,hd){if(!hero.model)return;const str=strMesh(0xf0e8d8);const M=hero.model;const b=new T.Vector3();const g=new T.Group();g.add(str);
 fxAdd(g,.8,(q,f)=>{if(p.life<=0||!p.m.parent){f.t=f.dur;str.visible=false;return;}b.copy(p.m.position);_yq.copy(handPos(M,hd));strSet(str,_yq,b);});}
function coinGeo(){return geo('coinG',()=>new T.CylinderGeometry(.5,.5,.09,24));}
function coinBody(s){const g=new T.Group();const gm=mat(0xffc832,{metalness:.9,roughness:.2,emissive:0x8a5a00,emissiveIntensity:.6});const c=fm(coinGeo(),gm);g.add(c);
 [-1,1].forEach(k=>{const rim=fm(TOR(.4,.035),mat(0xfff0a0,{metalness:.9,roughness:.2,emissive:0xa87800,emissiveIntensity:.6}),0,k*.05,0);rim.rotation.x=Math.PI/2;g.add(rim);const z=fm(BOX(.34,.02,.09),basic(0x8a5a00),0,k*.052,0);z.rotation.y=.6;g.add(z);g.add(fm(BOX(.34,.02,.07),basic(0x8a5a00),0,k*.052,.13),fm(BOX(.34,.02,.07),basic(0x8a5a00),0,k*.052,-.13));});g.scale.setScalar(s);return g;}
function coinMesh(s){const g=new T.Group();const c=coinBody(s);c.rotation.x=Math.PI/2;const h=new T.Group();h.userData.spinZ=1;h.add(c);g.add(h);g.add(glowSprite(0xffd24a,3*s));const t=fm(CONE(.4*s,2.2*s,8),addM(0xffd24a,.5),0,0,-1.2*s);t.rotation.x=-Math.PI/2;g.add(t);return g;}
// the caster flips a coin, it flashes, then the throw goes out
function fxCoinToss(c,big){const gy=gY(c.x,c.z);const g=coinBody(big?.7:.5);const gl=glowSprite(0xffd24a,1.6);g.add(gl);fxSigil(c.x,c.z,big?2.6:1.9,0xffd24a,.7,1);
 fxAdd(g,.42,p=>{const hx=c.x+Math.sin(c.face||0)*.5,hz=c.z+Math.cos(c.face||0)*.5;g.position.set(hx,gy+1.5+Math.sin(p*Math.PI)*(big?2.4:1.8),hz);g.rotation.x=p*Math.PI*10;g.rotation.z=.3;},
  ()=>{fxSpark(c.x,gy+1.6,c.z,0xfff2b0,big?4:3);PS.burst(c.x,gy+1.5,c.z,fxN(10),0xffd24a,{sp:3,up:4,life:.6,s:.7});});
 for(let i=0;i<fxN(6);i++)fxLater(i*50,()=>PS.burst(c.x+rnd(-.8,.8),gy+.2,c.z+rnd(-.8,.8),1,0xffd24a,{sp:.3,up:5,g:-2,life:.6,s:.7}));}
// HIT OF ZENY impact: a giant coin slams down, then gold erupts
function fxZenyHit(x,z,pow){const gy=gY(x,z);const s=pow>8?3.2:pow>=5?2.4:1.5;const big=pow>=5;
 const coin=coinBody(s);coin.position.set(x,gy+10,z);coin.rotation.z=.25;const sh=fm(CIRC(1),basic(0x000000,{transparent:true,opacity:.0,depthWrite:false}),x,gy+.05,z);sh.rotation.x=-Math.PI/2;world.add(sh);
 fxAdd(coin,.9,(p,f)=>{const d=Math.min(1,p/.2);if(d<1){coin.position.y=gy+10-9.9*d*d;coin.rotation.y=f.t*14;sh.material.opacity=.4*d;sh.scale.setScalar(s*.5*(.4+.6*d));}
   else{if(!coin.userData.h){coin.userData.h=1;sh.visible=false;coin.rotation.set(0,coin.rotation.y,0);
     fxBoom(x,gy+.5,z,s*.85,0xffc832,0xfff2b0);fxCrack(x,z,s*1.5,0xffd24a,1.4);fxPillar(x,z,s*.45,big?11:6,0xffd24a,.7,.8);
     for(let i=0;i<(big?3:2);i++)fxLater(i*110,()=>fxRing(x,z,s*(1.2+i*.6),i%2?0xfff2b0:0xffc832,.5));
     PS.burst(x,gy+.5,z,fxN(big?34:14),0xffd24a,{sp:s*3,up:s*4,life:1.1,s:1});PS.burst(x,gy+.5,z,fxN(big?14:6),0xfff2b0,{sp:s*2,up:s*5.5,life:1.3,s:.7});
     for(let i=0;i<fxN(big?12:5);i++){const m=coinBody(.22);const a=rnd(0,6.28),v=rnd(2,5)*(big?1.3:1),vy=rnd(6,10);fxAdd(m,1,q=>{const t=q;m.position.set(x+Math.cos(a)*v*t,gy+.3+vy*t-11*t*t,z+Math.sin(a)*v*t);m.rotation.x=q*20;m.rotation.z=q*13;m.visible=m.position.y>gy;});}
     if(big){screenFlash('#ffd76a',pow>8?.3:.22);G.shake=Math.max(G.shake||0,pow>8?.6:.4);try{sfx('gold');sfx('slam');}catch(e){}}}
    const r=(p-.2)/.8;coin.position.y=gy+.06+Math.max(0,Math.sin(Math.min(1,r*3)*Math.PI))*.5*s*(r<.34?1:0);coin.scale.setScalar(s*(r>.7?1-(r-.7)/.3:1));}},
  ()=>{world.remove(sh);});}
function projHitFx(p){if(p.o.coin){fxZenyHit(p.x,p.z,p.o.coin);return;}elHit(p.o.el,p.x,p.m.position.y,p.z,p.o.col,1);}
// self AOE: yoyos orbit the acrobat on taut strings
function fxOrbit(c,r,col,dur,n){for(let i=0;i<n;i++){const d=yoyoDisc(col,true),st=strMesh();const g=new T.Group();g.add(d,st);const a0=i/n*6.283;const ctr=new T.Vector3(),pp=new T.Vector3();
  fxAdd(g,dur,(p,f)=>{const k=p<.2?p/.2:p>.8?1-(p-.8)/.2:1;const a=a0+f.t*17;const y=gY(c.x,c.z)+1.2;ctr.set(c.x,y,c.z);pp.set(c.x+Math.cos(a)*r*k,y+Math.sin(f.t*9+i)*.25,c.z+Math.sin(a)*r*k);d.position.copy(pp);d.children[0].rotation.y=f.t*40;strSet(st,ctr,pp);});}
 fxSpin(c,r,col,dur,3,1.2);}
/* ================= INPUT STATE ================= */
const inp={x:0,z:0};const joy={id:null,bx:0,by:0,x:0,y:0};const keys={};
/* ===== Auto Setup: what AUTO casts (see src/autoplan.js) ===== */
function autoSan(c){const ints=a=>(Array.isArray(a)?a:[]).filter(Number.isInteger);
 return {atk:ints(c.atk).slice(0,AUTO_MAX),buf:(Array.isArray(c.buf)?c.buf:[]).filter(x=>Number.isInteger(x)||x==='parabellum').slice(0,AUTO_MAX),
  heal:Number.isInteger(c.heal)?c.heal:null,healAt:clamp(+c.healAt||40,0,90),spRes:clamp(+c.spRes||0,0,90),refresh:AUTO_REFRESH_OPTIONS.includes(c.refresh)?c.refresh:AUTO_REFRESH};}
function autoCfg(){return S.autoCfg||(S.autoCfg={atk:[],buf:[],heal:null,healAt:40,spRes:20,refresh:AUTO_REFRESH});}
function autoAny(c){return !!c&&(c.atk.length>0||c.buf.length>0||c.heal!=null);}
function autoOk(i,types){const b=C_().sk[i];return !!b&&skLv(i)>0&&(b.job||0)<=(S.job||0)&&types.includes(b.t);}
function autoReady(i){const b=C_().sk[i];return !!b&&skLv(i)>0&&(b.job||0)<=(S.job||0)&&(hero.cd[i]||0)<=0&&(!b.zeny||S.zeny>=zCost(skDef(i)));}
function autoPlanNow(inRange){const c=S.autoCfg,C=C_();
 const ids=[...new Set([...c.atk,...c.buf.filter(n=>n!=='parabellum'),c.heal].filter(n=>n!=null&&C.sk[n]))];
 const skills=ids.map(i=>{const d=skDef(i);return {idx:i,t:d.t,k:d.k,sp:d.sp,ready:autoReady(i)};});
 const buffs={};for(const k in hero.buffs)buffs[k]=hero.buffs[k].t;
 let pb=null;if(c.buf.includes('parabellum')&&(S.job||0)>=PARABELLUM_JOB){const p=parabellumPlan();pb={ok:!p.error,cost:p.cost,keys:p.buffs.map(s=>s.k)};}
 return planAuto({cfg:c,skills,hp:hero.hp,mhp:G.st.mhp,sp:hero.sp,msp:G.st.msp,buffs,pb,inRange});}
function autoHtml(){const C=C_(),c=S.autoCfg||{atk:[],buf:[],heal:null,healAt:40,spRes:20,refresh:AUTO_REFRESH};
 const L=C.sk.map((s,i)=>({...skDef(i),job:s.job||0})).filter(s=>skLv(s.idx)>0&&s.job<=(S.job||0));
 const atks=L.filter(s=>['strike','multi','aoe','aoeT'].includes(s.t)),bufs=L.filter(s=>s.t==='buff'),heals=L.filter(s=>s.t==='heal');
 const tog=(a,v,on,label,dis)=>`<button class="mbtn" style="min-height:44px" data-a="${a}" data-v="${v}" aria-pressed="${on}" ${dis?'disabled':''}>${on?'✓':'+'} ${label}</button>`;
 const chip=(a,v,on,label)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}" style="min-height:44px">${label}</button>`;
 let h=`<div class="card pbsetup"><div class="ttl">🤖 Auto Setup</div><p>Choose what <b>AUTO</b> uses: it heals below your threshold, keeps chosen buffs up, then uses attack skills in order. Without a setup, AUTO uses skill slot 1.${S.auto?'':' AUTO is off right now.'}</p>`;
 h+=`<div><b>Attack skills</b> · priority order, up to ${AUTO_MAX}</div>`;
 h+=c.atk.map((i,p)=>C.sk[i]?`<div class="row"><span>${p+1}. ${C.sk[i].e} ${esc(C.sk[i].n)}</span><button style="min-height:44px;min-width:44px" data-a="autoup" data-v="${i}" ${p===0?'disabled':''} aria-label="Move earlier">↑</button><button style="min-height:44px;min-width:44px" data-a="autoatk" data-v="${i}" aria-label="Remove">×</button></div>`:'').join('');
 h+=atks.filter(s=>!c.atk.includes(s.idx)).map(s=>tog('autoatk',s.idx,false,`${s.e} ${s.n} · ${s.sp} SP`,c.atk.length>=AUTO_MAX)).join('')||(atks.length?'':'<p>No attack skills learned yet.</p>');
 h+=`<div style="margin-top:8px"><b>Buffs to keep up</b></div><div class="fbar"><span class="ist" style="align-self:center">Recast</span>${AUTO_REFRESH_OPTIONS.map(n=>chip('autorefresh',n,(c.refresh??AUTO_REFRESH)===n,n?n+'s left':'when expired')).join('')}</div>`;
 if((S.job||0)>=PARABELLUM_JOB)h+=tog('autobuf','parabellum',c.buf.includes('parabellum'),'✦ Parabellum bundle',!c.buf.includes('parabellum')&&c.buf.length>=AUTO_MAX);
 h+=bufs.map(s=>tog('autobuf',s.idx,c.buf.includes(s.idx),`${s.e} ${s.n} · ${s.sp} SP`,!c.buf.includes(s.idx)&&c.buf.length>=AUTO_MAX)).join('')||'<p>No buffs learned yet.</p>';
 if(heals.length){h+=`<div style="margin-top:8px"><b>Heal</b></div><div class="fbar">${chip('autoheal','off',c.heal==null,'Off')}${heals.map(s=>chip('autoheal',s.idx,c.heal===s.idx,`${s.e} ${s.n}`)).join('')}</div>`;
  if(c.heal!=null)h+=`<div class="fbar"><span class="ist" style="align-self:center">below HP</span>${[30,40,50,60,70].map(n=>chip('autohealat',n,c.healAt===n,n+'%')).join('')}</div>`;}
 h+=`<div style="margin-top:8px"><b>Keep SP in reserve</b></div><div class="fbar">${[0,10,20,30,50].map(n=>chip('autosp',n,c.spRes===n,n+'%')).join('')}</div>`;
 if(S.autoCfg)h+=`<button class="mbtn" data-a="autoclear">Clear auto setup</button>`;
 return h+'</div>';}
function autoAI(t){const C=C_();if(!t||t.dead)return false;const d=dxz(hero,t)-t.r;const rng=C.ranged?C.range*.85:C.reach*.8;
 if(S.auto&&autoAny(S.autoCfg)&&(hero.state==='idle'||hero.state==='move')){
  if(t.state==='windup'&&t.wT<.25&&hero.sta>20&&Math.random()<.5){dodge();return true;}
  const act=autoPlanNow(d<=rng);
  if(act&&act.type==='skill'){castSk(skDef(act.idx));return true;}
  if(act&&act.type==='parabellum'){castParabellum();return true;}
  if(d>rng){const a=Math.atan2(t.x-hero.x,t.z-hero.z);inp.x=Math.sin(a);inp.z=Math.cos(a);return true;}
  lightAttack();return true;}
 if(d>rng){const a=Math.atan2(t.x-hero.x,t.z-hero.z);inp.x=Math.sin(a);inp.z=Math.cos(a);return true;}
 if(hero.state==='idle'||hero.state==='move'){if(S.auto&&t.state==='windup'&&t.wT<.25&&hero.sta>20&&Math.random()<.5){dodge();return true;}const b0=barSkill(0);if(S.auto&&b0&&hero.sp>=b0.sp&&(b0.remaining??hero.cd[b0.idx]??0)<=0&&!b0.blocked&&Math.random()<.3)useSkill(0);else lightAttack();}return true;}

/* ================= MAIN UPDATE ================= */
function update(dt){
 tickFieldPartner(dt);
 G.t+=dt;const st=G.st=stats(),C=C_(),c=S.ch,ch=CHS[c];windU.value=G.t;
 for(const i in hero.cd)hero.cd[i]=Math.max(0,(hero.cd[i]||0)-dt);hero.comboT-=dt;hero.potT-=dt;
 for(const k in hero.buffs){hero.buffs[k].t-=dt;if(hero.buffs[k].t<=0)delete hero.buffs[k];}
 hero.staDelay-=dt;if(hero.staDelay<=0&&!['roll','light','heavy'].includes(hero.state))hero.sta=Math.min(st.msta,hero.sta+st.staR*dt);
 if(G.intro){$('#bInt').style.display='none';const it=G.intro;it.t+=dt;if(it.t>=it.dur){G.intro=null;$('#cine').style.opacity=0;if(!isPuppet()){it.m.agg=true;it.m.cd=.8;}}if(NET.on){if(isPuppet())puppetMobs(dt);else updateMobs(dt,st);updateProjs(dt);updateFx(dt);}return;}
 if(hero.dead){hero.deadT-=dt;if(hero.deadT<=0)respawn();}
 else{
  hero.sp=Math.min(st.msp,hero.sp+st.spR*dt);
  if(G.t-hero.lastHit>6&&!G.bossFight)hero.hp=Math.min(st.mhp,hero.hp+st.mhp*.012*dt);
  hero.hp=Math.min(hero.hp,st.mhp);
  if(hero.lock&&(hero.lock.dead||dxz(hero,hero.lock)>32))hero.lock=null;
  inp.x=joy.x+((keys.d||keys.arrowright)?1:0)-((keys.a||keys.arrowleft)?1:0);inp.z=joy.y+((keys.s||keys.arrowdown)?1:0)-((keys.w||keys.arrowup)?1:0);
  let mag=Math.hypot(inp.x,inp.z);if(mag>1){inp.x/=mag;inp.z/=mag;mag=1;}
  if(mag>.12){hero.dest=null;hero.engage=null;}
  else if(hero.engage&&!hero.engage.dead){autoAI(hero.engage);mag=Math.hypot(inp.x,inp.z);}
  else if(hero.dest){const dx=hero.dest.x-hero.x,dz=hero.dest.z-hero.z,d=Math.hypot(dx,dz);if(d<.4)hero.dest=null;else{inp.x=dx/d;inp.z=dz/d;mag=1;}}
  else if(S.auto&&!G.chan){const t=hero.lock||nearest(40);if(t){autoAI(t);mag=Math.hypot(inp.x,inp.z);}}
  hero.actT+=dt;const s=hero.state;hero.iframe=false;hero.parryOn=false;let mv=0;const ox=hero.x,oz=hero.z;
  if(s==='idle'||s==='move'){if(mag>.12){const sp=st.spd*Math.min(1,mag*1.3)*(G.rooted||G.webbed?ROOT_SLOW:1);hero.x+=inp.x*sp*dt;hero.z+=inp.z*sp*dt;hero.face=hero.lock&&!hero.lock.dead?Math.atan2(hero.lock.x-hero.x,hero.lock.z-hero.z):turnTo(hero.face,Math.atan2(inp.x,inp.z),dt*14);hero.state='move';mv=mag;}else hero.state='idle';
   if(G.lightHeld)lightAttack();}
  else if(s==='light'||s==='heavy'){const hf=s==='light'?.42:.6;
   if(!hero.hitDone&&hero.actT>=hero.actDur*hf){hero.hitDone=true;doAttackHit(s);}
   if(!C.ranged&&hero.actT<hero.actDur*hf){const st2=s==='heavy'?3:2;hero.x+=Math.sin(hero.face)*st2*dt;hero.z+=Math.cos(hero.face)*st2*dt;}
   if(mag>.12&&s==='light'&&!C.ranged){hero.x+=inp.x*1.2*dt;hero.z+=inp.z*1.2*dt;}
   if(hero.actT>=hero.actDur){hero.state='idle';const q=hero.queued;hero.queued=null;if(q==='light'||G.lightHeld)lightAttack();else if(q==='heavy')heavyAttack();}}
  else if(s==='roll'){const p=hero.actT/hero.actDur;const v=hero.rollDist/hero.actDur*(1.5-p);hero.x+=Math.sin(hero.rollDir)*v*dt;hero.z+=Math.cos(hero.rollDir)*v*dt;hero.iframe=p>.04&&p<.72;if(p>=1)hero.state='idle';}
  else if(s==='parry'){hero.parryOn=hero.actT>.03&&hero.actT<(C.shield?.34:.26);if(hero.actT>=hero.actDur)hero.state=(G.parryHeld&&C.shield)?'guard':'idle';}
  else if(s==='guard'){if(!G.parryHeld||!C.shield)hero.state='idle';}
  else if(s==='cast'){if(!hero.castDone&&hero.actT>=hero.actDur*.45){hero.castDone=true;hero.hitDone=true;doSkill(hero.castIdx);}if(hero.actT>=hero.actDur)hero.state='idle';}
  else if(s==='drink'){if(mag>.12){hero.x+=inp.x*1.5*dt;hero.z+=inp.z*1.5*dt;}if(hero.actT>=hero.actDur)hero.state='idle';}
  else if(s==='stun'){if(hero.actT>=hero.actDur)hero.state='idle';}
  hero.moveAmt=lerp(hero.moveAmt,mv,.25);
  // bounds
  if(G.bossFight){const dx=hero.x-AR.x,dz=hero.z-AR.z,d=Math.hypot(dx,dz);if(d>AR.r-.5){hero.x=AR.x+dx/d*(AR.r-.5);hero.z=AR.z+dz/d*(AR.r-.5);}}
  else{const rr=Math.hypot(hero.x,hero.z);if(rr>63){hero.x*=63/rr;hero.z*=63/rr;}if(G.inArena&&Math.hypot(hero.x-AR.x,hero.z-AR.z)>AR.r+1.5)G.inArena=false;if(Math.hypot(hero.x-AR.x,hero.z-AR.z)<AR.r+.4&&!G.inArena){const dx=hero.x-AR.x,dz=hero.z-AR.z,d=Math.hypot(dx,dz)||1;hero.x=AR.x+dx/d*(AR.r+.4);hero.z=AR.z+dz/d*(AR.r+.4);}
   for(const o of DECOR_OBS){if(o.r<=0)continue;const dx=hero.x-o.x,dz=hero.z-o.z,d=Math.hypot(dx,dz);if(d<o.r+.4){const p=(o.r+.4-d)/(d||1);hero.x+=dx*p;hero.z+=dz*p;}}}
  if(mv>0&&Math.random()<dt*6)PS.burst(hero.x,hero.y+.1,hero.z,1,0xb8a888,{sp:.6,up:.8,s:.5,g:4,life:.4});
  G.int=findInteract();const bi=$('#bInt');if(G.int&&!menuOpen&&!dlgOpen){bi.style.display='block';bi.textContent=G.int.l;}else bi.style.display='none';
  updateQuests(dt);
 }
 // spawns
 const alive=G.mobs.filter(m=>!m.dead&&!m.boss&&!m.add&&!m.wave).length;G.spawnT-=dt;if(!isPuppet()&&alive<mobMax()&&G.spawnT<=0&&!G.bossFight){spawnMob(true);if(mobMax()-alive>4)spawnMob(false);G.spawnT=2.5;}
 if(isPuppet())puppetMobs(dt);else updateMobs(dt,st);updateProjs(dt);updateWoods(dt);updateMire(dt);if(G.dg)dgTick(dt);if(isPuppet()){ralliesTick(dt);pullTick(dt);sealVis();}else coopTick(dt);updateDrops(dt);updateFx(dt);PS.update(dt);
 G.mobs=G.mobs.filter(m=>{if(m.dead&&m.deadT<=0){removeMob(m);return false;}return true;});
 if(G.parts){const b=B[ch.b];const p=G.parts.geometry.attributes.position,a=p.array,v=b.pv;for(let i=0;i<a.length;i+=3){a[i]+=v[0]*dt+Math.sin(G.t+i)*.01;a[i+1]+=v[1]*dt;a[i+2]+=v[2]*dt;
  if(a[i]-hero.x>35)a[i]-=70;if(a[i]-hero.x<-35)a[i]+=70;if(a[i+2]-hero.z>35)a[i+2]-=70;if(a[i+2]-hero.z<-35)a[i+2]+=70;if(a[i+1]<0)a[i+1]+=14;if(a[i+1]>14)a[i+1]-=14;}p.needsUpdate=true;}
 if(G.water)G.water.position.y=-.45+Math.sin(G.t*.8)*.06;
 if(G.cage){G.cage.position.y=gY(G.cage.position.x,G.cage.position.z)+(c===18?4:0)+Math.sin(G.t*1.5)*.2;}
 G.saveT+=dt;if(G.saveT>12){S.play=(S.play||0)+G.saveT;G.saveT=0;save();}
}

/* ================= MOBS ================= */
function updateMobs(dt,st){
 for(const m of G.mobs){const d=m.d,M=m.mdl;
  if(m.dead){m.deadT-=dt;const p=1-m.deadT/.9;M.root.scale.setScalar((d.s||1)*(1-p*.6));M.root.position.y=gY(m.x,m.z)-p*.6;M.body.rotation.z=p*1.2;continue;}
  m.flash=Math.max(0,m.flash-dt);m.stag-=dt;m.stun-=dt;if(m.snareT>0)m.snareT-=dt;m.ripT-=dt;m.cd-=dt;m.gb-=dt;m.lunge=Math.max(0,m.lunge-dt);m.moving=false;
  if(d.egg){eggTick(m,dt);animMob(m,dt);continue;}
  const tg=tgtFor(m);const dh=dxz(m,tg);
  if(m.stag>0||m.stun>0){animMob(m,dt);continue;}
  if(!tg.dead&&(d.aggro||m.boss)&&dh<(m.boss?40:11))m.agg=true;
  if(tg.dead||(!m.boss&&!m.add&&!m.wave&&dh>30))m.agg=false;
  if(G.bossFight&&m.boss)m.agg=true;
  if(!m.boss&&!m.add&&!m.wave&&dh>58&&!m.agg){m.x=clamp(tg.x+rnd(-30,30),-58,58);m.z=clamp(tg.z+rnd(-30,30),-58,58);if(Math.hypot(m.x-tg.x,m.z-tg.z)<14)m.z+=16;}
  if(m.boss&&m.phase===1&&m.hp<m.mhp*.5){m.phase=2;if(NET.on)netEmit({y:'p2',n:d.n});if(G.bossFight||!NET.on){banner(d.n+' grows furious!',d.key==='boar'&&G.oathStones?.length?'Phase 2 · repeated charges. Use the oath stones!':'Phase 2 · faster, longer combos',2600);G.shake=.5;musicPhase2();}fxRing(m.x,m.z,8,0xff3a3a,.8);sfx('roar_'+(d.roar||'deep'));if(d.final||d.key==='pharaoh'||d.key==='lich')spawnAdds(m,2);if(d.key==='spiderq')spawnEggs(m,3);}
  const spdM=m.phase===2?1.3:1;
  if(m.state==='windup'){m.wT-=dt;const p=1-m.wT/m.wu;M.tel.material.opacity=.25+.6*p;M.tel.scale.setScalar(d.r*1.7/(d.s||1)*(.4+.6*p));
   if(m.wT>m.wu*.35)m.face=turnTo(m.face,Math.atan2(tg.x-m.x,tg.z-m.z),dt*8);
   if(m.wT<m.wu*.35&&!m.flashed){m.flashed=1;m.flash=.08;if(dxz(m,hero)<20)sfx('tell');}
   if(m.wT<=0){M.tel.material.opacity=0;m.flashed=0;m.lunge=.2;m.state='recover';m.rT=m.boss?.55:.45;mobStrike(m,tg);}}
  else if(m.state==='recover'){m.rT-=dt;if(m.lunge>0&&d.lunge){const sp=6;m.x+=Math.sin(m.face)*sp*dt;m.z+=Math.cos(m.face)*sp*dt;}if(m.rT<=0){if(m.combo>0){m.combo--;startWind(m,rnd(.3,.5));}else m.state='chase';}}
  else if(m.state==='cast'){m.rT-=dt;if(m.rT<=0)m.state='chase';}
  else if(m.agg){
   const reach=m.r+1.4;m.face=turnTo(m.face,Math.atan2(tg.x-m.x,tg.z-m.z),dt*6);
   if(m.boss){m.spT-=dt;if(m.spT<=0&&dh<24){m.spT=rnd(3.5,5.5)/spdM/(1+.15*((m.coopN||1)-1));bossSpecial(m,tg);continue;}}
   if(d.ranged&&dh<d.ranged&&dh>reach+1&&m.cd<=0){startWind(m,.8);m.rangedAtk=1;}
   else if(dh>reach){const sp=d.spd*1.2*spdM;m.x+=Math.sin(m.face)*sp*dt;m.z+=Math.cos(m.face)*sp*dt;m.moving=true;if(d.lunge&&dh<reach+3&&m.cd<=0&&Math.random()<dt*2){startWind(m,.5);m.rangedAtk=0;}}
   else if(m.cd<=0){m.rangedAtk=0;const w=m.boss?rnd(.6,1.1):rnd(.55,.85);startWind(m,w/spdM);if(!m.boss&&Math.random()<.3)m.combo=1;}
   else if(!m.boss&&dh<reach&&Math.random()<dt*.8){const a=m.face+Math.PI/2;m.x+=Math.sin(a)*d.spd*.5*dt;m.z+=Math.cos(a)*d.spd*.5*dt;}
  }else{m.wt-=dt;if(m.wt<=0){m.wt=rnd(2,5);m.wx=clamp(m.x+rnd(-8,8),-58,58);m.wz=clamp(m.z+rnd(-8,8),-58,58);}
   const dx=m.wx-m.x,dz=m.wz-m.z,dd=Math.hypot(dx,dz);if(dd>.5){m.face=turnTo(m.face,Math.atan2(dx,dz),dt*4);m.x+=Math.sin(m.face)*d.spd*.45*dt;m.z+=Math.cos(m.face)*d.spd*.45*dt;m.moving=true;}}
  if(m.boss||G.bossFight){const dx=m.x-AR.x,dz=m.z-AR.z,dd=Math.hypot(dx,dz);if(m.boss&&dd>AR.r-1){m.x=AR.x+dx/dd*(AR.r-1);m.z=AR.z+dz/dd*(AR.r-1);}}
  animMob(m,dt);
 }
 const ms=G.mobs;for(let i=0;i<ms.length;i++){const a=ms[i];if(a.dead)continue;for(let j=i+1;j<ms.length;j++){const b=ms[j];if(b.dead)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1,mn=(a.r+b.r)*.9;if(d<mn){const p=(mn-d)/2/d;const wa=a.d.egg?0:a.boss?.1:1,wb=b.d.egg?0:b.boss?.1:1;a.x-=dx*p*wa;a.z-=dz*p*wa;b.x+=dx*p*wb;b.z+=dz*p*wb;}}
  if(!hero.dead){const dx=hero.x-a.x,dz=hero.z-a.z,d=Math.hypot(dx,dz)||1,mn=a.r+.45;if(d<mn&&hero.state!=='roll'){const p=(mn-d)/d;hero.x+=dx*p;hero.z+=dz*p;}}}
}
function startWind(m,t){m.state='windup';m.wT=m.wu=t;m.flashed=0;}
function mobStrike(m,tg){const d=m.d;tg=tg||tgtFor(m);if(tg.dead)return;
 if(m.rangedAtk){const a=Math.atan2(tg.x-m.x,tg.z-m.z);const col=d.m==='spider'?0xeeeeee:d.m==='golem'?0x8fe3ff:d.bow?0xd8c8a0:0xb06aff;const yo=Math.min(2,m.mdl.h*(d.s||1)*.6);if(dxz(m,hero)<25)sfx('ebolt');
  hEmit({y:'pj',id:m.id,x:Math.round(m.x*10)/10,z:Math.round(m.z*10)/10,yo,vx:Math.sin(a)*14,vz:Math.cos(a)*14,life:1.4,dmg:Math.round(d.atk*.9),col},projLocal);m.cd=(d.ad||1.7)*1.3;return;}
 hEmit({y:'ms',id:m.id,x:Math.round(m.x*10)/10,z:Math.round(m.z*10)/10,f:Math.round(m.face*100)/100,r:+(m.r+1.9).toFixed(2),b:m.boss?1:0,dmg:Math.round(d.atk*(m.boss&&m.combo===0?1.25:1))},strikeLocal);
 m.cd=(d.ad||1.7)*(m.phase===2?.7:1)*rnd(.85,1.15);}
function bossSpecial(m,tg){const d=m.d,list=d.sp;tg=tg||tgtFor(m);let k=list[ri(0,list.length-1)];if(m.phase===1&&k==='summon'&&Math.random()<.5)k=list[0];m.state='cast';const dh=dxz(m,tg);
 const r1=v=>Math.round(v*10)/10;
 const big=(mult,r,x,z,dur,arc,rot)=>hEmit({y:'dc',id:m.id,x:r1(x),z:r1(z),r,dur,dmg:Math.round(d.atk*mult),arc:arc||0,rot:rot||0,ar:1},decalLocal);
 const hy=gY(m.x,m.z)+m.mdl.h*(d.s||1)+.6;
 if(d.key==='boar'&&G.oathStones?.length){
  // Alternate a committed charge with the normal close-range attack pool.
  m.oathTurn=(m.oathTurn||0)+1;
  if(m.oathTurn%2===1||m.phase===2||k==='charge'){
   const a=Math.atan2(tg.x-m.x,tg.z-m.z),end={x:clamp(m.x+Math.sin(a)*22,AR.x-AR.r+1,AR.x+AR.r-1),z:clamp(m.z+Math.cos(a)*22,AR.z-AR.r+1,AR.z+AR.r-1)};
   const hit=chargeImpact(m,end,G.oathStones),to=hit||end;
   m.rT=hit?3.8:1.8;m.spT=m.phase===2?4.6:6;
   hEmit({y:'ch',id:m.id,sx:r1(m.x),sz:r1(m.z),tx:r1(to.x),tz:r1(to.z),dmg:Math.round(d.atk*1.6),oath:1,crash:!!hit},chargeLocal);
   return;
  }
 }
 if(DG_SP[k]){DG_SP[k](m,tg,big,r1);return;}
 if(k==='slam'){m.rT=1.4;const f=Math.atan2(tg.x-m.x,tg.z-m.z);const x=m.x+Math.sin(f)*Math.min(dh,m.r+2.5),z=m.z+Math.cos(f)*Math.min(dh,m.r+2.5);big(1.6,3.8,x,z,1.0);txt(m.x,hy,m.z,'!!','#ff5050',true);}
 else if(k==='nova'){m.rT=1.8;big(1.5,7.5,m.x,m.z,1.5);sfx('charge');}
 else if(k==='sweep'){m.rT=1.6;const f=Math.atan2(tg.x-m.x,tg.z-m.z);big(1.7,m.r+5.5,m.x,m.z,1.2,Math.PI*1.1,f);}
 else if(k==='charge'){m.rT=1.5;const a=Math.atan2(tg.x-m.x,tg.z-m.z);const tx=clamp(m.x+Math.sin(a)*14,AR.x-AR.r+1,AR.x+AR.r-1),tz=clamp(m.z+Math.cos(a)*14,AR.z-AR.r+1,AR.z+AR.r-1);
  hEmit({y:'ch',id:m.id,sx:r1(m.x),sz:r1(m.z),tx:r1(tx),tz:r1(tz),dmg:Math.round(d.atk*1.6)},chargeLocal);setTimeout(()=>{if(m.dead)return;m.x=tx;m.z=tz;},950);}
 else if(k==='jump'){m.rT=1.7;const tx=tg.x,tz=tg.z;big(1.7,4,tx,tz,1.15);sfx('charge');m.jump={t:0,dur:1.15,sx:m.x,sz:m.z,tx,tz};}
 else if(k==='combo'){m.combo=m.phase===2?3:2;m.state='chase';startWind(m,.55);m.rangedAtk=0;}
 else if(k==='roots'){m.rT=2;const lin=d.m==='treant';for(let i=0;i<6;i++)setTimeout(()=>{const t2=tgtFor(m);if(m.dead||t2.dead)return;const x=t2.x+rnd(-1.2,1.2),z=t2.z+rnd(-1.2,1.2);big(1.1,2,x,z,.75);
  // Treant roots linger as tangles that slow movement (roll through them to avoid it)
  if(lin&&i%2===0)setTimeout(()=>{if(!m.dead)hEmit({y:'rz',x:r1(x),z:r1(z),r:2.2,dur:ROOT_DUR},rootZoneLocal);},750);},i*260);}
 else if(k==='bolts'){m.rT=1.3;sfx('ebolt');const n=m.phase===2?7:5;for(let i=0;i<n;i++){const a=Math.atan2(tg.x-m.x,tg.z-m.z)+(i-(n-1)/2)*.22;hEmit({y:'pj',id:m.id,x:r1(m.x),z:r1(m.z),yo:2,vx:Math.sin(a)*12,vz:Math.cos(a)*12,life:2.2,dmg:Math.round(d.atk*1.1),col:0xb06aff,big:1},projLocal);}}
 else if(k==='meteor'){m.rT=2.2;sfx('charge');for(let i=0;i<7;i++){const x=tg.x+rnd(-5,5),z=tg.z+rnd(-5,5);setTimeout(()=>{if(m.dead)return;hEmit({y:'mt',id:m.id,x:r1(x),z:r1(z),r:2.5,dur:1.1,dmg:Math.round(d.atk*1.3),ar:1},e=>{fxMeteor(e.x,e.z,0xff5a2a,1.1);decalLocal(e);});},i*220);}}
 else if(k==='summon'){m.rT=1.2;spawnAdds(m,2);txt(m.x,hy,m.z,'RISE!','#b06aff',true);sfx('wave');}
 else if(k==='webs'){m.rT=1.6;txt(m.x,hy,m.z,'WEBS!','#f4f0ff',true);const n=m.phase===2?3:2,b0=rnd(0,Math.PI);
  for(let i=0;i<n;i++){const a=b0+i*Math.PI/n,cx=tg.x+rnd(-2,2),cz=tg.z+rnd(-2,2),ex=Math.cos(a)*12,ez=Math.sin(a)*12;
   const cx2=x=>clamp(x,AR.x-AR.r,AR.x+AR.r),cz2=z=>clamp(z,AR.z-AR.r,AR.z+AR.r);hEmit({y:'wl',ax:r1(cx2(cx-ex)),az:r1(cz2(cz-ez)),bx:r1(cx2(cx+ex)),bz:r1(cz2(cz+ez)),w:WEB_W,dur:WEB_DUR},webLaneLocal);}}
 else if(k==='eggs'){m.rT=1.2;if(!spawnEggs(m,2)){m.rT=.2;}else{txt(m.x,hy,m.z,'BROOD!','#9affc8',true);sfx('wave');}}
}
function updateProjs(dt){for(const p of G.projs){p.life-=dt;
 if(!p.hostile&&p.tgt&&!p.tgt.dead&&!p.o.pierce){const a=Math.atan2(p.tgt.x-p.x,p.tgt.z-p.z),sp=Math.hypot(p.vx,p.vz);const cur=Math.atan2(p.vx,p.vz);const na=turnTo(cur,a,dt*10);p.vx=Math.sin(na)*sp;p.vz=Math.cos(na)*sp;p.m.rotation.y=na;}
 p.x+=p.vx*dt;p.z+=p.vz*dt;p.m.position.set(p.x,gY(p.x,p.z)+p.yo,p.z);if(!p.hostile&&p.o&&p.o.kind==='skill')projTrail(p,dt);
 if(p.hostile){if(!hero.dead&&Math.hypot(hero.x-p.x,hero.z-p.z)<.9){const r=heroHit(p.dmg,p.src,false,0,{mg:!(p.src&&p.src.d&&p.src.d.bow)});if(r!=='dodge'){p.life=0;PS.burst(p.x,p.m.position.y,p.z,8,0xb06aff,{sp:3,up:2});}}}
 else{const dp=duelTarget();if(dp&&!p.hitP&&Math.hypot(dp.x-p.x,dp.z-p.z)<.9){p.hitP=1;pvpHit(p.mult,p.o);sfx('hit');if(p.o.kind==='skill')projHitFx(p);if(!p.pierce){p.life=0;}}
  if(p.life>0)for(const m of G.mobs){if(m.dead||p.hit.has(m))continue;if(Math.hypot(m.x-p.x,m.z-p.z)<m.r+.5){p.hit.add(m);sfx('hit');if(p.o.kind==='skill')projHitFx(p);
   if(p.o.aoe){fxRing(p.x,p.z,p.o.aoe,0xff7a2a,.4);PS.burst(p.x,p.m.position.y,p.z,14,0xff7a2a,{sp:4,up:3});for(const n of G.mobs)if(!n.dead&&Math.hypot(n.x-p.x,n.z-p.z)<=p.o.aoe+n.r)dealDamage(n,p.mult,p.o);}else dealDamage(m,p.mult,p.o);
   if(p.pierce>0)p.pierce--;else{p.life=0;break;}}}}
 if(p.life<=0)world.remove(p.m);}
 G.projs=G.projs.filter(p=>p.life>0);}
function updateDrops(dt){for(const d of G.drops){d.t+=dt;d.gem.rotation.y+=dt*2;d.gem.position.y=.9+Math.sin(G.t*3)*.15;const dd=Math.hypot(hero.x-d.x,hero.z-d.z);
 if(!hero.dead&&(dd<2.6||d.t>10))d.fly=1;if(d.fly){const sp=Math.max(10,dd*4)*dt;d.x+=(hero.x-d.x)/Math.max(dd,.01)*Math.min(sp,dd);d.z+=(hero.z-d.z)/Math.max(dd,.01)*Math.min(sp,dd);d.g.position.set(d.x,gY(d.x,d.z),d.z);if(dd<.6){d.done=1;world.remove(d.g);collect(d);}}}
 G.drops=G.drops.filter(d=>!d.done);}

/* ================= ANIMATION ================= */
const _tipA=new T.Vector3(),_tipB=new T.Vector3();
function animHero(dt){const M=hero.model;if(!M)return;syncHero();animRig(M,hero,C_(),dt,true);jobAnim(M,G.t,hero);}
function animRig(M,h,C,dt,local){const s=h.state,t=G.t,p=clamp(h.actT/h.actDur,0,1);
 if(!local){M.root.position.set(h.x,gY(h.x,h.z),h.z);M.root.rotation.y=h.face;}M.pivot.rotation.set(0,0,0);M.pivot.position.y=.9;M.torso.rotation.set(0,0,0);M.head.rotation.set(0,0,0);
 ['armR','armL','legL','legR','foreL','foreR','kneeL','kneeR'].forEach(k=>M[k].rotation.set(0,0,0));
 const w=h.moveAmt;const sw=Math.sin(t*12)*w;M.legL.rotation.x=sw*.8;M.legR.rotation.x=-sw*.8;M.kneeL.rotation.x=Math.max(0,sw)*1.1;M.kneeR.rotation.x=Math.max(0,-sw)*1.1;
 M.armL.rotation.x=-sw*.6;M.armR.rotation.x=sw*.6;M.foreL.rotation.x=-.25-Math.max(0,-sw)*.5;M.foreR.rotation.x=-.25-Math.max(0,sw)*.5;M.pivot.position.y=.9+Math.abs(Math.sin(t*12))*.07*w;M.torso.rotation.x=w*.12;
 M.torso.scale.y=1+Math.sin(t*2.5)*.012;if(M.cape)M.cape.rotation.x=.1+w*.45+Math.sin(t*6)*.05;const hb=M.root.userData.hairBack;if(hb)hb.rotation.x=w*.25+Math.sin(t*7)*.04;
 if(C.wt==='bow'){M.armL.rotation.x=-.3;}
 let trail=false;
 if(s==='light'||s==='heavy'){const hf=s==='light'?.42:.6;const hv=s==='heavy';trail=!C.ranged&&p>hf*.6&&p<hf+.3;
  if(C.yoyo){yoyoAnim(M,h,hv?3:(h.combo||0)%3,p,hf);if(!local){if((M._yoP||0)<hf&&p>=hf){const R=hv?10:8.5;const ex=h.x+Math.sin(h.face)*R,ez=h.z+Math.cos(h.face)*R;(hv?['R','L']:[(h.combo||0)%2?'L':'R']).forEach(hd=>fxYoyo(M,hd,ex,gY(ex,ez)+1.1,ez,{side:(hd==='R'?1:-1)*(hv?1.6:.5),dur:hv?.52:.34,col:0xff6a9a,big:hv}));}M._yoP=p;}}
  else if(C.ranged){if(C.wt==='bow'){M.armL.rotation.x=-1.55;M.armR.rotation.x=-1.4;M.foreR.rotation.x=p<hf?-1.2*(p/hf):-.3;M.torso.rotation.y=-.2;}
   else{const r=p<hf?lerp(0,-2.6,p/hf):lerp(-2.6,-1.2,(p-hf)/(1-hf));M.armR.rotation.x=r;M.foreR.rotation.x=-.4;M.armL.rotation.x=hv?r:-.4;}}
  else if(C.dual){trail=bladeAnim(M,h,hv?3:(h.combo||0)%3,p,hf);}
  else{const k=hv?3:h.combo;const ant=clamp(p/(hf*.55),0,1),q=clamp((p-hf*.55)/(hf*.6),0,1),rec=clamp((p-hf-.1)/(1-hf-.1),0,1);const eo=1-Math.pow(1-q,3),ei=ant*ant;
   // key poses: [armR.x, armR.z, foreR.x, torso.y(twist), torso.x(lean), pivot.y, spinY]
   const POSES=[
    {a:[-1.4,1.3,-.4,.9,-.05,.95,0],b:[-1.3,-1.1,-.2,-.9,.25,.85,0]},        // horizontal slash
    {a:[-.3,.4,-.9,-.7,.15,.72,0],b:[-2.9,-.2,-.1,.6,-.2,1.05,0]},            // rising diagonal
    {a:[-1.5,1.2,-.5,1.1,.05,.78,0],b:[-1.5,-.4,-.1,-.6,.1,1.0,Math.PI*2]},   // spin slash
    {a:[-3.1,.1,-.7,.15,-.35,1.0,0],b:[-.25,.1,-.05,-.1,.55,.68,0]}];         // heavy overhead smash
   const P=POSES[k];const mix=(i)=>q>0?lerp(P.a[i],P.b[i],eo):P.a[i]*ei;const base=(i)=>q>0?lerp(P.a[i],P.b[i],eo):lerp(0,P.a[i],ei);
   M.armR.rotation.x=base(0);M.armR.rotation.z=base(1);M.foreR.rotation.x=base(2);M.torso.rotation.y=base(3)*(1-rec*.8);M.pivot.rotation.x=base(4)*(1-rec*.8);M.pivot.position.y=lerp(.9,base(5)||.9,q>0?1:ei)+(rec?(0.9-(base(5)||.9))*rec:0);
   if(k===2){M.pivot.rotation.y=q>0?eo*Math.PI*2:0;}
   if(hv){M.armL.rotation.x=M.armR.rotation.x*.9;M.foreL.rotation.x=M.foreR.rotation.x;M.armL.rotation.z=-M.armR.rotation.z*.5;M.kneeL.rotation.x=q>0?eo*.9:0;M.kneeR.rotation.x=q>0?eo*.9:0;}
   else M.armL.rotation.x=-.4-base(3)*.4;
   if(C.dual){M.armL.rotation.x=base(0);M.armL.rotation.z=-base(1)*.9;M.foreL.rotation.x=base(2);}
   M.head.rotation.y=-base(3)*.5;}
  M.legL.rotation.x=-.3;M.legR.rotation.x=.3;M.kneeR.rotation.x=.4;}
 else if(s==='roll'){if(h.back){M.pivot.rotation.x=-.35;M.legL.rotation.x=.5;}else{M.pivot.rotation.x=p*Math.PI*2;M.pivot.position.y=.9-Math.sin(p*Math.PI)*.45;M.legL.rotation.x=-1.4;M.legR.rotation.x=-1.4;M.kneeL.rotation.x=1.6;M.kneeR.rotation.x=1.6;M.armL.rotation.x=-1.4;M.armR.rotation.x=-1.4;M.foreL.rotation.x=-1.4;M.foreR.rotation.x=-1.4;}}
 else if(s==='parry'){const q=h.actT<.3?1:1-(h.actT-.3)/.35;if(C.shield){M.armL.rotation.x=-1.5*q;M.armL.rotation.z=.4*q;M.foreL.rotation.x=-.6*q;}else{M.armR.rotation.x=-1.3*q;M.armR.rotation.z=1.1*q;M.foreR.rotation.x=-1*q;}M.torso.rotation.y=-.3*q;}
 else if(s==='guard'){if(C.shield){M.armL.rotation.x=-1.5;M.armL.rotation.z=.4;M.foreL.rotation.x=-.6;}M.torso.rotation.y=-.3;}
 else if(s==='cast'&&C.yoyo){yoyoAnim(M,h,4,p,.45);}
 else if(s==='cast'&&C.dual&&!C.ranged){trail=bladeAnim(M,h,4,p,.5);}
 else if(s==='cast'){M.armR.rotation.x=-2.4*Math.sin(p*Math.PI);M.armL.rotation.x=-1.8*Math.sin(p*Math.PI);M.pivot.position.y=.9+Math.sin(p*Math.PI)*.15;}
 else if(s==='drink'){M.armL.rotation.x=-1.6;M.foreL.rotation.x=-1.6;M.head.rotation.x=-.4*Math.sin(p*Math.PI);}
 else if(s==='stun'){M.pivot.rotation.x=-.35*(1-p);M.head.rotation.x=-.3*(1-p);}
 else if(s==='dead'){M.pivot.rotation.x=-Math.PI/2*.95;M.pivot.position.y=.3;}
 castCircle(M,M.cls,s==='cast'?p:-1,dt,h);
 if(M.aura){M.aura.rotation.z+=dt*1.5;M.aura.material.opacity=.35+.2*Math.sin(t*4);}
 if(M.eqG.w&&M.eqG.w.userData.aura)M.eqG.w.userData.aura.material.opacity=.4+.25*Math.sin(t*6);
 if(!local)return;
 // trail
 if(!hero.trail)hero.trail=new Trail(hero.swingCol);
 if(trail&&M.eqG.w){M.root.updateMatrixWorld(true);const wg=M.eqG.w;const tip=wg.userData.tip||.8;_tipA.set(0,tip,0);wg.localToWorld(_tipA);_tipB.set(0,tip*.25,0);wg.localToWorld(_tipB);hero.trail.push(_tipA,_tipB);}
 else if(hero.trail.fade>=1)hero.trail.end();
 hero.trail.update(dt);
 if(M.eqG.w2){if(!hero.trail2)hero.trail2=new Trail(hero.swingCol);if(trail){const wg=M.eqG.w2;const tip=wg.userData.tip||.8;_tipA.set(0,tip,0);wg.localToWorld(_tipA);_tipB.set(0,tip*.25,0);wg.localToWorld(_tipB);hero.trail2.push(_tipA,_tipB);}else if(hero.trail2.fade>=1)hero.trail2.end();hero.trail2.update(dt);}}
function animMob(m,dt){const M=m.mdl,t=G.t+m.ph,mv=m.moving?1:0,s=m.d.s||1;let y=gY(m.x,m.z);
 if(M.anim)M.anim(t,m,dt);
 if(m.d.mech||m.nImm)mechVis(m);
 if(m.jump){const j=m.jump;j.t+=dt;const p=Math.min(1,j.t/j.dur);m.x=lerp(j.sx,j.tx,p);m.z=lerp(j.sz,j.tz,p);y=gY(m.x,m.z)+Math.sin(p*Math.PI)*6;if(p>=1){m.jump=null;}}
 M.root.position.set(m.x,y,m.z);M.root.rotation.y=m.face;
 if(M.heroRig){M.pivot.rotation.set(0,0,0);const sw=Math.sin(t*12)*mv;M.legL.rotation.x=sw*.8;M.legR.rotation.x=-sw*.8;M.kneeL.rotation.x=Math.max(0,sw);M.kneeR.rotation.x=Math.max(0,-sw);M.armL.rotation.x=-sw*.6;M.armR.rotation.x=m.state==='windup'?-2.4*(1-m.wT/m.wu):m.lunge>0?-.3:sw*.6;M.foreR.rotation.x=-.3;M.foreL.rotation.x=-.3;if(M.aura){M.aura.rotation.z+=dt*2;}M.body.rotation.x=m.stag>0?-.3:0;return;}
 if(M.legs)M.legs.forEach((l,i)=>{l.rotation.x=Math.sin(t*(M.bug?18:10)+(i%2?Math.PI:0))*(M.bug?.35:.6)*mv;});
 if(M.wings)M.wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*Math.sin(t*(M.neck?3:14))*(M.neck?.35:.8));
 const uw=M.root.userData.wings;if(uw)uw.forEach((w,i)=>w.rotation.z=(i?-1:1)*Math.sin(t*10)*.5);
 if(M.segs)M.segs.forEach((sg,i)=>sg.position.x=Math.sin(t*7-i*.8)*.22*(mv*.7+.3));
 if(M.squash){M.body.scale.set(1+Math.sin(t*9)*.06,1-Math.sin(t*9)*.08,1);M.body.position.y=Math.abs(Math.sin(t*4.5))*.35*mv;}
 else if(M.hop)M.body.position.y=Math.abs(Math.sin(t*6))*.25*mv;
 else if(M.fly)M.body.position.y=(M.body.userData.by??(M.body.userData.by=M.body.position.y))+Math.sin(t*3)*.15;
 if(M.human&&M.arms){const w=Math.sin(t*8)*.5*mv;M.arms[0].rotation.x=(M.arms[0].userData.bx??(M.arms[0].userData.bx=M.arms[0].rotation.x))-w;M.arms[1].rotation.x=(M.arms[1].userData.bx??(M.arms[1].userData.bx=M.arms[1].rotation.x))+w;
  if(m.state==='windup'){M.arms[1].rotation.x=-2.6*(1-m.wT/m.wu);if(m.boss)M.arms[0].rotation.x=-1.8*(1-m.wT/m.wu);}if(m.lunge>0){M.arms[1].rotation.x=-.2;}
  const sh=M.root.userData.shield;if(sh)sh.rotation.y=m.gb>0?1.2:0;}
 M.body.rotation.x=m.state==='windup'?-.25*(1-m.wT/m.wu):m.lunge>0?.3:(m.stag>0?-.4:0);
 if(m.d.key==='bunny'){const w=m.state==='windup'?1-m.wT/m.wu:0;M.body.scale.y=1-w*.35;M.body.rotation.x=-w*.5;}
 if(m.d.key==='beetle'&&m.state==='recover')M.body.rotation.x=-.4;
 if(m.stag>0||m.stun>0)M.body.rotation.z=Math.sin(t*20)*.08;else M.body.rotation.z=0;
 const fl=m.flash>0?1:0;const rip=m.ripT>0;const em=fl?0xffffff:(m.state==='windup'?0x660000:(rip?0x665500:(m.phase===2?0x3a0a4a:0)));
 if(M._em!==em){M._em=em;for(const mm of M.mats){if(mm.userData.base===undefined)mm.userData.base=mm.emissive.getHex();mm.emissive.setHex(em||mm.userData.base);}}}

/* ===== Flyff-style Blade dual-wield combo (assassin) ===== */
// arm z: right arm +out / -across, left arm mirrored.  returns whether to draw the blade trails
function bladeAnim(M,h,k,p,hf){const sm=x=>x<0?0:x>1?1:x*x*(3-2*x);const out=x=>1-Math.pow(1-clamp(x,0,1),3);
 const set=(rx,rz,rf,lx,lz,lf)=>{M.armR.rotation.x=rx;M.armR.rotation.z=rz;M.foreR.rotation.x=rf;M.armL.rotation.x=lx;M.armL.rotation.z=lz;M.foreL.rotation.x=lf;};
 const L=(a,b,t)=>a+(b-a)*t;let tr=false;
 M.legL.rotation.x=-.45;M.legR.rotation.x=.35;M.kneeR.rotation.x=.5;M.kneeL.rotation.x=.2;M.pivot.position.y=.84;
 if(k===0){// right-left double slash
  if(p<.5){const q=p/.5,a=sm(q/.35),b=out((q-.35)/.45);set(L(L(-.3,-1.45,a),-1.35,b),L(L(0,1.4,a),-1.2,b),-.35,-.6,-.3,-.9);M.torso.rotation.y=L(L(0,.8,a),-.75,b);tr=q>.35&&q<.85;}
  else{const q=(p-.5)/.5,a=sm(q/.3),b=out((q-.3)/.45);set(-1.3+.9*b,-1.2+.6*b,-.3,L(L(-.6,-1.45,a),-1.35,b),L(L(-.3,-1.4,a),1.2,b),-.35);M.torso.rotation.y=L(L(-.75,-.9,a),.75,b);tr=q>.3&&q<.8;}
  M.head.rotation.y=-M.torso.rotation.y*.5;}
 else if(k===1){// rising double cut, then cross-down
  const a=sm(p/.25),b=out((p-.25)/.3),c=out((p-.62)/.25);
  const rx=L(L(L(-.2,-.25,a),-2.8,b),-.5,c),rz=L(L(0,-.4,a),.35,b);set(rx,L(rz,-.9,c),-.2,rx,L(-rz,.9,c),-.2);
  M.pivot.position.y=.84+Math.sin(clamp((p-.25)/.4,0,1)*Math.PI)*.35;M.pivot.rotation.x=L(L(0,.25,a),-.2,b)*(1-c)+c*.3;tr=p>.25&&p<.85;}
 else if(k===2){// whirlwind: arms spread, double spin with a hop
  const a=sm(p/.18),sp=out((p-.18)/.62);set(L(-.2,-1.5,a),L(0,1.45,a),-.1,L(-.2,-1.5,a),L(0,-1.45,a),-.1);
  M.pivot.rotation.y=sp*Math.PI*4;M.pivot.position.y=.84+Math.sin(clamp((p-.18)/.62,0,1)*Math.PI)*.4;M.torso.rotation.x=.15;tr=p>.18&&p<.85;}
 else if(k===3){// heavy: leaping X-cross slam
  const a=sm(p/.4),b=out((p-.4)/.22);set(L(L(-.3,-2.9,a),-.35,b),L(L(0,-.55,a),1.05,b),L(-.3,-.6,a)*(1-b),L(L(-.3,-2.9,a),-.35,b),L(L(0,.55,a),-1.05,b),L(-.3,-.6,a)*(1-b));
  M.pivot.position.y=.84+Math.sin(clamp(p/.55,0,1)*Math.PI)*.75;M.pivot.rotation.x=L(L(0,-.3,a),.55,b)*(1-clamp((p-.75)/.25,0,1));
  if(b>0){M.kneeL.rotation.x=1.1*b;M.kneeR.rotation.x=1.1*b;M.legL.rotation.x=-1*b;M.legR.rotation.x=-.4*b;}tr=p>.38&&p<.75;}
 else{// skill: fast flurry (alternating stabs) ending in a cross
  const n=Math.floor(p*6),f=(p*6)%1,st=Math.sin(f*Math.PI);if(p<.8){const r=n%2===0;set(r?-1.5-st*.2:-.9,r?.3*st:-.1,r?-.1:-.9,r?-.9:-1.5-st*.2,r?.1:-.3*st,r?-.9:-.1);M.torso.rotation.y=(r?-.35:.35)*st;}
  else{const b=out((p-.8)/.2);set(-1.5,L(.3,-1,b),-.2,-1.5,L(-.3,1,b),-.2);}M.pivot.rotation.x=.18;tr=true;}
 return tr;}

/* ===== Ragnarok-style casting circle (wizard / priest) ===== */
const CIRC_TEX={};
function circleTex(col,kind){const key=col+kind;if(CIRC_TEX[key])return CIRC_TEX[key];const N=256,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');const h='#'+col.toString(16).padStart(6,'0');
 g.translate(N/2,N/2);g.strokeStyle=h;g.fillStyle=h;g.shadowColor=h;g.shadowBlur=8;g.lineCap='round';
 const ring=(r,w)=>{g.lineWidth=w;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();};
 if(kind===0){ring(122,4);ring(110,2);ring(72,2.5);ring(30,2);
  // runes between the outer rings
  g.font='bold 15px serif';g.textAlign='center';g.textBaseline='middle';const R='ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';for(let i=0;i<24;i++){g.save();g.rotate(i/24*Math.PI*2);g.fillText(R[i],0,-116+0);g.restore();}
  // hexagram
  g.lineWidth=2.5;for(let t=0;t<2;t++){g.beginPath();for(let i=0;i<=3;i++){const a=t*Math.PI/3+i*Math.PI*2/3-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*108,Math.sin(a)*108);}g.stroke();}
  for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2;g.beginPath();g.arc(Math.cos(a)*72,Math.sin(a)*72,8,0,Math.PI*2);g.stroke();}
 }else{ring(60,2.5);ring(46,1.5);g.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(Math.cos(a)*20,Math.sin(a)*20);g.lineTo(Math.cos(a)*58,Math.sin(a)*58);g.stroke();}
  g.beginPath();for(let i=0;i<=5;i++){const a=i*Math.PI*4/5-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*44,Math.sin(a)*44);}g.stroke();}
 const tx=new T.CanvasTexture(c);CIRC_TEX[key]=tx;return tx;}
function castCircle(M,ck,p,dt,h){if(ck!=='wizard'&&ck!=='priest')return;let C=M.circle;
 if(p<0){if(C&&C.visible){C.userData.o=Math.max(0,C.userData.o-dt*3);C.userData.m.forEach(m=>m.opacity=m.userData.b*C.userData.o);if(C.userData.o<=0)C.visible=false;}return;}
 if(!C){const col=ck==='wizard'?0x8ab8ff:0xffd76a;C=new T.Group();C.position.y=.07;const mk2=(tex,sz,b)=>{const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});m.userData.b=b;const pl=new T.Mesh(new T.PlaneGeometry(sz,sz),m);pl.rotation.x=-Math.PI/2;pl.castShadow=false;C.add(pl);return pl;};
  C.userData.outer=mk2(circleTex(col,0),3.6,1);C.userData.inner=mk2(circleTex(ck==='wizard'?0xd8a8ff:0xfff2b0,1),1.9,.9);C.userData.inner.position.y=.02;
  if(!CIRC_TEX.grad){const c=document.createElement('canvas');c.width=4;c.height=64;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=gr;g.fillRect(0,0,4,64);CIRC_TEX.grad=new T.CanvasTexture(c);}
  const cm=new T.MeshBasicMaterial({color:col,map:CIRC_TEX.grad,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});cm.userData.b=.35;const col3=new T.Mesh(new T.CylinderGeometry(1.5,1.7,2.4,24,1,true),cm);col3.position.y=1.2;col3.castShadow=false;C.add(col3);C.userData.col=col3;
  C.userData.m=[C.userData.outer.material,C.userData.inner.material,cm];C.userData.o=0;M.root.add(C);M.circle=C;}
 C.visible=true;C.userData.o=Math.min(1,C.userData.o+dt*6);const o=C.userData.o*(p>.85?1-(p-.85)/.15*.6:1);C.userData.m.forEach(m=>m.opacity=m.userData.b*o);
 const sc=.6+.4*Math.min(1,p/.2);C.scale.set(sc,1,sc);C.userData.outer.rotation.z+=dt*1.2;C.userData.inner.rotation.z-=dt*2.4;C.userData.col.scale.y=.6+.4*Math.sin(p*Math.PI);}

/* ===== Yoyo animations: wind up, whip the arm out, hold the line, catch ===== */
function yoyoAnim(M,h,k,p,hf){const sm=x=>x<0?0:x>1?1:x*x*(3-2*x);const out=x=>1-Math.pow(1-clamp(x,0,1),3);const L=(a,b,t)=>a+(b-a)*t;
 const wu=sm(p/(hf*.75)),sn=out((p-hf*.75)/(hf*.3)),rc=sm((p-hf-.25)/(1-hf-.25));
 // light stance: side-on, knees bent, bouncing on the toes
 M.pivot.position.y=.86+Math.sin(p*Math.PI)*.05;M.legL.rotation.x=-.35;M.legR.rotation.x=.3;M.kneeL.rotation.x=.25;M.kneeR.rotation.x=.45;
 const arm=(R,rx,rz,rf)=>{const a=R?M.armR:M.armL,f=R?M.foreR:M.foreL;a.rotation.x=rx;a.rotation.z=R?rz:-rz;f.rotation.x=rf;};
 if(k===0||k===1){const R=k===0;const sg=R?1:-1;
  // throwing arm: cocked back behind the hip -> whipped straight out -> wrist flick up to recall
  arm(R,L(L(-.2,.95,wu),-1.55,sn)+rc*.5,L(L(0,.35,wu),-.1,sn),L(L(-.3,-1.5,wu),-.05,sn)-rc*1.1);
  arm(!R,-.75,.25,-1.35);M.torso.rotation.y=sg*(L(L(0,.75,wu),-.55,sn)*(1-rc));M.torso.rotation.x=L(0,.22,sn)*(1-rc);M.head.rotation.y=-M.torso.rotation.y*.6;
  M.legL.rotation.x=-.35-(R?0:.35)*sn;M.legR.rotation.x=.3-(R?.75:0)*sn;}
 else if(k===2){// spinning side-arm throw: full pirouette, both arms out, then the right yoyo is released
  const sp=out(p/(hf*1.05));M.pivot.rotation.y=sp*Math.PI*2;M.pivot.position.y=.86+Math.sin(clamp(p/hf,0,1)*Math.PI)*.28;
  arm(true,L(-1.3,-1.55,sn),L(1.35,-.05,sn),-.15-rc*.9);arm(false,-1.2,1.2*(1-sn)+.3,-.4-sn*.8);M.torso.rotation.x=.12;M.kneeL.rotation.x=.6*(1-sn);}
 else if(k===3){// heavy: arms crossed over the chest, a small hop, then both yoyos are flung wide
  const hop=Math.sin(clamp(p/(hf*1.2),0,1)*Math.PI);M.pivot.position.y=.86+hop*.42;
  arm(true,L(L(-.3,-1.15,wu),-1.5,sn)+rc*.5,L(L(0,-.95,wu),.55,sn)*(1-rc),L(L(-.3,-1.6,wu),-.05,sn)-rc);
  arm(false,L(L(-.3,-1.15,wu),-1.5,sn)+rc*.5,L(L(0,-.95,wu),.55,sn)*(1-rc),L(L(-.3,-1.6,wu),-.05,sn)-rc);
  M.torso.rotation.x=L(L(0,-.25,wu),.35,sn)*(1-rc);M.kneeL.rotation.x=.25+hop*.7;M.kneeR.rotation.x=.45+hop*.7;M.legL.rotation.x=-.35-hop*.4;}
 else{// skill: "around the world" windmill with the right arm, front flip hop, then both arms punch out
  const w=clamp(p/hf,0,1),th=out((p-hf)/.2),r2=sm((p-hf-.3)/(1-hf-.3));
  M.pivot.position.y=.86+Math.sin(w*Math.PI)*.55;M.pivot.rotation.y=sm(w)*Math.PI*2;
  if(p<hf){arm(true,-w*Math.PI*2*1.5-.3,.25,-.2);arm(false,-1.2,.9,-.9);M.kneeL.rotation.x=1*Math.sin(w*Math.PI);M.kneeR.rotation.x=1.2*Math.sin(w*Math.PI);}
  else{arm(true,L(-2.6,-1.55,th)+r2*.6,-.15,-.05-r2);arm(false,L(-2.2,-1.5,th)+r2*.6,-.15,-.05-r2);M.torso.rotation.x=.3*th*(1-r2);M.legR.rotation.x=.3-.7*th*(1-r2);}}}
/* ================= INPUT ================= */
let menuOpen=false;
function blocked(){return menuOpen||dlgOpen||G.mode!=='game'||G.intro;}
const ray=new T.Raycaster(),_ndc=new T.Vector2();
function groundPt(cx,cy){_ndc.set(cx/W*2-1,-(cy/H)*2+1);ray.setFromCamera(_ndc,cam);const h=ray.intersectObject(G.ground,false);return h.length?{x:h[0].point.x,z:h[0].point.z}:null;}
function pickMob(cx,cy){let b=null,bd=60;for(const m of G.mobs){if(m.dead)continue;const p=toScreen(m.x,gY(m.x,m.z)+m.mdl.h*(m.d.s||1)*.5,m.z);const d=Math.hypot(p.x-cx,p.y-cy)-(m.boss?40:10);if(d<bd){bd=d;b=m;}}return b;}
function tapAct(x,y){if(NET.on){const pp=pickPeer(x,y);if(pp){inspectPeer(pp);sfx('ui');return;}}const m=pickMob(x,y);if(m){hero.lock=m;hero.engage=m;hero.dest=null;sfx('ui');return;}const p=groundPt(x,y);if(p){hero.dest=p;hero.engage=null;fxRing(p.x,p.z,.8,0xffffff,.35);}}
cv.addEventListener('pointerdown',e=>{audioStart();if(blocked()||hero.dead)return;
 if(e.clientX<W*.5&&joy.id===null){joy.id=e.pointerId;joy.bx=e.clientX;joy.by=e.clientY;joy.x=joy.y=0;joy.live=false;joy.t=performance.now();return;}
 tapAct(e.clientX,e.clientY);});
addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.bx,dy=e.clientY-joy.by;const l=Math.hypot(dx,dy);
 if(!joy.live){if(l<14)return;joy.live=true;const b=$('#joyB');b.style.display='block';b.style.left=joy.bx+'px';b.style.top=joy.by+'px';$('#joyHint').classList.add('hide');hero.dest=null;hero.engage=null;}
 const mx=50;if(l>mx){dx=dx/l*mx;dy=dy/l*mx;}joy.x=dx/mx;joy.y=dy/mx;$('#joyK').style.transform=`translate(${dx}px,${dy}px)`;});
function joyEnd(e){if(e.pointerId!==joy.id)return;const wasTap=!joy.live&&performance.now()-joy.t<350;joy.id=null;joy.x=joy.y=0;joy.live=false;$('#joyB').style.display='none';if(wasTap&&!blocked()&&!hero.dead)tapAct(e.clientX,e.clientY);}
addEventListener('pointerup',joyEnd);addEventListener('pointercancel',joyEnd);
function btn(id,down,up){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audioStart();el.classList.add('pr');if(!blocked())down();});const u=e=>{el.classList.remove('pr');if(up)up();};el.addEventListener('pointerup',u);el.addEventListener('pointercancel',u);el.addEventListener('pointerleave',u);}
btn('#bLight',()=>{G.lightHeld=true;lightAttack();},()=>G.lightHeld=false);
btn('#bHeavy',heavyAttack);btn('#bRoll',dodge);btn('#bParry',()=>{G.parryHeld=true;parry();},()=>G.parryHeld=false);
for(let s=0;s<6;s++)btn('#bS'+(s+1),()=>useSkill(s));
btn('#bFlask',drinkFlask);btn('#bPot',usePot);btn('#bInt',doInteract);
btn('#bLock',()=>{if(hero.lock){hero.lock=null;toast('Lock-on off',700);}else{const n=nearest(28);if(n){hero.lock=n;sfx('ui');}else toast('No enemy nearby',800);}});
btn('#bAuto',()=>{S.auto=S.auto?0:1;toast(S.auto?'🤖 Auto-hunt ON (good for grinding, risky vs bosses)':'Auto-hunt OFF',1400);});
btn('#bMenu',()=>openMenu());
$('#bChat').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audioStart();if(G.mode==='game'&&!dlgOpen)openMenu('chat');});
$('#bNet').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audioStart();if(G.mode==='game'&&!dlgOpen)openMenu('online');});
addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();keys[k]=1;if(e.repeat)return;audioStart();if(k==='escape'||k==='m'){if(menuOpen)closeMenu();else if(G.mode==='game'&&!dlgOpen)openMenu();return;}if(blocked())return;
 if(k==='j'){G.lightHeld=true;lightAttack();}if(k==='k')heavyAttack();if(k===' '){e.preventDefault();dodge();}if(k==='l'){G.parryHeld=true;parry();}if(k>='1'&&k<='6')useSkill(+k-1);if(k==='q')drinkFlask();if(k==='r')usePot();if(k==='e'||k==='f')doInteract();if(k==='tab'){e.preventDefault();$('#bLock').dispatchEvent(new PointerEvent('pointerdown'));}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=0;if(k==='j')G.lightHeld=false;if(k==='l')G.parryHeld=false;});

/* ================= CAMERA ================= */
const camT=new T.Vector3();
function camOff(){const z=G.zoom;return W>H?{y:8.6*z,z:8.4*z}:{y:14*z,z:11*z};}
function snapCam(){camT.set(hero.x,gY(hero.x,hero.z),hero.z);const o=camOff();cam.position.set(hero.x,camT.y+o.y,hero.z+o.z);cam.lookAt(hero.x,camT.y+1,hero.z);}
function updateCam(dt){G.zoom=lerp(G.zoom,1,dt*3);const o=camOff();let tx=hero.x,tz=hero.z;const L=hero.lock&&!hero.lock.dead?hero.lock:(G.boss&&!G.boss.dead&&dxz(hero,G.boss)<24?G.boss:null);
 let zb=1;if(L){tx=lerp(hero.x,L.x,L.boss?.3:.22);tz=lerp(hero.z,L.z,L.boss?.3:.22);zb=L.boss?1.22:1.05;}
 if(G.intro){const it=G.intro,m=it.m;const p=it.t/it.dur;const hh=m.mdl.h*(m.d.s||1);const a=Math.PI*.15+p*1.1;const r=Math.max(m.r*2.6+4,hh*1.7);const my=gY(m.x,m.z)+hh*.45;cam.position.set(m.x+Math.sin(a)*r,gY(m.x,m.z)+hh*.55+p*2.5,m.z+Math.cos(a)*r);cam.lookAt(m.x,my,m.z);camT.set(hero.x,gY(hero.x,hero.z),hero.z);return;}
 camT.x=lerp(camT.x,tx,Math.min(1,dt*6));camT.z=lerp(camT.z,tz,Math.min(1,dt*6));camT.y=lerp(camT.y,gY(tx,tz),Math.min(1,dt*5));
 cam.position.set(camT.x,camT.y+o.y*zb,camT.z+o.z*zb);G.shake=Math.max(0,G.shake-dt*1.6);if(G.shake>0){cam.position.x+=rnd(-1,1)*G.shake*.6;cam.position.y+=rnd(-1,1)*G.shake*.4;}cam.lookAt(camT.x,camT.y+1,camT.z);
 sky.position.copy(cam.position);sun.position.set(cam.position.x+B[CHS[S.ch].b].sun[2][0],B[CHS[S.ch].b].sun[2][1]+camT.y,camT.z+B[CHS[S.ch].b].sun[2][2]);sun.target.position.set(camT.x,camT.y,camT.z);sun.target.updateMatrixWorld();}
 {const rdx=camT.x-cam.position.x,rdz=camT.z-cam.position.z,rl=Math.hypot(rdx,rdz)||1;rim.target.position.set(camT.x,camT.y+1,camT.z);rim.position.set(camT.x+rdx/rl*16,camT.y+9,camT.z+rdz/rl*16);}

/* ================= OVERLAY & HUD ================= */
function updateOverlay(){
 for(const t of G.texts){t.t+=1/60;t.y+=.025;const p=toScreen(t.x,t.y,t.z);t.el.style.left=p.x+'px';t.el.style.top=p.y+'px';t.el.style.opacity=t.t<.9?1:Math.max(0,1-(t.t-.9)*4);if(t.t>1.15)t.el.remove();}
 G.texts=G.texts.filter(t=>t.t<=1.15);
 for(const m of G.mobs){if(m.dead||m.boss)continue;const show=m.hp<m.mhp||hero.lock===m;if(show&&!m.bar){m.bar=document.createElement('div');m.bar.className='mhp';m.bar.innerHTML='<div></div>';$('#fl').appendChild(m.bar);}
  if(m.bar){const p=toScreen(m.x,gY(m.x,m.z)+m.mdl.h*(m.d.s||1)+.35,m.z);m.bar.style.left=p.x+'px';m.bar.style.top=p.y+'px';m.bar.firstChild.style.width=(100*Math.max(0,m.hp)/m.mhp)+'%';m.bar.firstChild.style.background=m.gb>0?'#ffd76a':'#ff4d4d';m.bar.style.display=p.vis?'':'none';}}
 const L=hero.lock&&!hero.lock.dead?hero.lock:null;const tn=$('#tgtN');
 if(L){G.lockMk.visible=G.lockDia.visible=true;const ly=gY(L.x,L.z);G.lockMk.position.set(L.x,ly+.08,L.z);G.lockMk.scale.setScalar(L.r*1.3);G.lockMk.rotation.z+=.03;const hh=L.mdl.h*(L.d.s||1);G.lockDia.position.set(L.x,ly+hh+.9+Math.sin(G.t*5)*.1,L.z);G.lockDia.rotation.y+=.05;
  if(!L.boss){const p=toScreen(L.x,ly+hh+1.35,L.z);tn.style.display='block';tn.style.left=p.x+'px';tn.style.top=p.y+'px';tn.innerHTML=`${L.d.n} <span style="color:#ffd76a">Lv${L.d.lv}</span>${L.d.shield?' 🛡️':''}`;tn.style.color=L.d.aggro?'#ffb0b0':'#fff';}else tn.style.display='none';}
 else{if(G.lockMk){G.lockMk.visible=G.lockDia.visible=false;}tn.style.display='none';}
 if(G.graceObj){G.graceObj.gs.material.opacity=.7+.3*Math.sin(G.t*2);}
 if(NET.on||hero.bub)peersOverlay();jmOverlay();alliesOverlay();G.ptT=(G.ptT||0)+1;if(G.ptT%10===0)partyHud();
 if(G.fieldPartner&&prologueActive()){const f=G.fieldPartner;if(!G.partnerLbl){G.partnerLbl=document.createElement('div');G.partnerLbl.className='lbl';$('#fl').appendChild(G.partnerLbl);}const p=toScreen(f.x,gY(f.x,f.z)+3,f.z);G.partnerLbl.textContent='♥ '+partnerName();G.partnerLbl.style.cssText=`left:${p.x}px;top:${p.y}px;color:#ffc4df;display:${p.vis&&G.mode==='game'?'block':'none'}`;}
 if(G.npcLbl)G.npcLbl.style.display=G.npc?'':'none';
 if(G.npc){if(!G.npcLbl){G.npcLbl=document.createElement('div');G.npcLbl.className='lbl';$('#fl').appendChild(G.npcLbl);}const p=toScreen(G.npc.x,gY(G.npc.x,G.npc.z)+3.4,G.npc.z);G.npcLbl.style.left=p.x+'px';G.npcLbl.style.top=p.y+'px';G.npcLbl.textContent=fmt(G.npc.d.n);G.npcLbl.style.color='#ffe6a0';G.npcLbl.style.display=p.vis&&dxz(hero,G.npc)<22&&G.mode==='game'?'':'none';}}
/* ================= MINIMAP ================= */
G.mmZoom=0;
$('#mm').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();G.mmZoom=(G.mmZoom+1)%3;$('#mmZ').textContent=['1x','2x','MAP'][G.mmZoom];sfx('ui');});
function drawMM(){const c=$('#mm');const sz=112,dpr=Math.min(2,window.devicePixelRatio||1);if(c.width!==sz*dpr){c.width=c.height=sz*dpr;}const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,sz,sz);
 const Rr=sz/2,range=[30,55,82][G.mmZoom],k=(Rr-2)/range,b=B[CHS[S.ch].b];const cx=G.mmZoom===2?0:hero.x,cz=G.mmZoom===2?-8:hero.z;
 const P=(x,z)=>[Rr+(x-cx)*k,Rr+(z-cz)*k];const hx=c=>'#'+new T.Color(c).getHexString();
 g.save();g.beginPath();g.arc(Rr,Rr,Rr-1,0,7);g.clip();
 const gr=g.createRadialGradient(Rr,Rr,0,Rr,Rr,Rr);gr.addColorStop(0,hx(b.g1));gr.addColorStop(1,hx(b.g2));g.fillStyle=gr;g.globalAlpha=.88;g.fillRect(0,0,sz,sz);g.globalAlpha=1;
 if(G.water){g.fillStyle='rgba(30,70,110,.35)';g.fillRect(0,0,sz,sz);}
 let [x,y]=P(0,0);g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.rect(0,0,sz,sz);g.arc(x,y,63*k,0,7,true);g.fill('evenodd');
 [x,y]=P(AR.x,AR.z);g.strokeStyle=G.bossFight?'#ff4040':'rgba(255,255,255,.55)';g.lineWidth=1.5;g.beginPath();g.arc(x,y,AR.r*k,0,7);g.stroke();
 g.fillStyle='rgba(0,0,0,.25)';for(const o of DECOR_OBS){if(o.r<1)continue;[x,y]=P(o.x,o.z);if(x<-5||x>sz+5||y<-5||y>sz+5)continue;g.beginPath();g.arc(x,y,Math.max(1.2,o.r*k),0,7);g.fill();}
 const dot=(px,pz,col,r,edge,label)=>{let [x,y]=P(px,pz);const dx=x-Rr,dy=y-Rr,d=Math.hypot(dx,dy);let out=false;if(d>Rr-7){if(!edge)return;x=Rr+dx/d*(Rr-7);y=Rr+dy/d*(Rr-7);out=true;}
  g.fillStyle=col;g.strokeStyle='rgba(0,0,0,.8)';g.lineWidth=1.2;g.beginPath();g.arc(x,y,out?r*.85:r,0,7);g.fill();g.stroke();if(label){g.fillStyle='#000';g.font='bold 8px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(label,x,y+.5);}};
 for(const d of G.drops)dot(d.x,d.z,RCSS[d.e.rar],2.2);
 if(S.blood&&S.blood.ch===S.ch)dot(S.blood.x,S.blood.z,'#ffd76a',3.2,true,'$');
 for(const m of G.mobs){if(m.dead)continue;dot(m.x,m.z,m.boss?'#ff2a2a':(m.agg?'#ff5050':'#c04040'),m.boss?5:2.3,m.boss);}
 const qs=S.q[S.ch],q=CHS[S.ch].quest;
 dot(0,0,'#ffd76a',3.6,true,'✦');
 if(G.npc){const need=!S.cleared[S.ch]&&(qs.s===0||qs.s===2);dot(G.npc.x,G.npc.z,need?(qs.s===2?'#8fd3ff':'#ffd76a'):'#c8b88a',need?4.2:3,need,need?(qs.s===2?'?':'!'):'');}
 if(qs.s===1&&q.t==='shrines')G.shr.forEach((s,i)=>{if(!qs.shr[i])dot(s.x,s.z,'#8ad8ff',3.6,true,'◆');else dot(s.x,s.z,'#3a7a9a',2.5);});
 if(qs.s===1&&q.t==='survive'&&G.beacon)dot(G.beacon.x,G.beacon.z,'#ff9a3a',4,true,'▲');
 dot(0,-28,G.gate==='open'?'#8fd3ff':'#777',3.6,G.gate==='open'&&!G.bossFight,'⛩');
 if(window.NET&&NET.peers)for(const p of Object.values(NET.peers))if(p.ch===S.ch)dot(p.x,p.z,'#6dff8a',3.2,true);
 if(prologueActive()&&G.fieldPartner)dot(G.fieldPartner.x,G.fieldPartner.z,'#ffb8de',4.2,true,'♥');
 if(guidedFields()&&S.q[0].s===1){const lesson=fieldLesson(S.fields);if(lesson)dot(lesson.x,lesson.z,'#ffd76a',4.2,true,'!');}
 // player arrow
 [x,y]=P(hero.x,hero.z);g.save();g.translate(x,y);g.rotate(-hero.face+Math.PI);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-6.5);g.lineTo(4.5,5);g.lineTo(0,2.5);g.lineTo(-4.5,5);g.closePath();g.fill();g.stroke();g.restore();
 g.restore();g.strokeStyle='rgba(232,194,106,.9)';g.lineWidth=2;g.beginPath();g.arc(Rr,Rr,Rr-1,0,7);g.stroke();
 g.fillStyle='#e8c26a';g.font='bold 9px system-ui';g.textAlign='center';g.fillText('N',Rr,9);}
function hud(){const st=G.st,ch=CHS[S.ch],C=C_();try{drawMM();}catch(e){}
 $('#hName').textContent=heroName();{const f=facOf(S);const e=$('#hFac');e.textContent=f?f.e:'';e.title=f?f.n:'';$('#hName').style.color=f?f.c:'';}$('#hCls').textContent=jobName();$('#hLv').textContent='Lv '+S.lv;
 $('#hpF').style.width=(100*Math.max(0,hero.hp)/st.mhp)+'%';$('#hpT').textContent=Math.ceil(Math.max(0,hero.hp))+' / '+st.mhp;
 $('#stF').style.width=(100*hero.sta/st.msta)+'%';$('#spF').style.width=(100*hero.sp/st.msp)+'%';$('#spT').textContent=Math.floor(hero.sp)+' / '+st.msp;
 $('#exF').style.width=(100*S.exp/need(S.lv))+'%';
 $('#chN').textContent='Ch.'+(S.ch+1)+' · '+ch.name;const jq=jqText(),cl=S.cleared[S.ch]&&!G.dg;const q=jq&&cl?jq:questText();$('#qTitle').textContent=q[0];if(jq&&!cl)$('#qObj').innerHTML=esc(q[1])+'<br><span style="color:#ffd76a">🎓 '+esc(jq[1])+'</span>';else $('#qObj').textContent=q[1];$('#zz').textContent='💰 '+S.zeny.toLocaleString()+' z';
 const b=G.boss;$('#bossbar').style.display=b&&!b.dead&&!G.intro&&(G.bossFight||!NET.on)?'block':'none';if(b){$('#bossN').textContent=b.d.n+(b.phase===2?' — Enraged':'');$('#bossF').style.width=(100*Math.max(0,b.hp)/b.mhp)+'%';$('#bossP').style.width=b.poise+'%';}
 for(let s=0;s<6;s++){const sk=barSkill(s),n=s+1,bt=$('#bS'+n);let lk=bt.querySelector('.lock');if(!sk){$('#s'+n+'e').textContent='·';$('#s'+n+'n').textContent='SKILL '+n;$('#cd'+n).style.height='0';bt.classList.add('off');if(!lk){lk=document.createElement('div');lk.className='lock';bt.appendChild(lk);}lk.textContent='empty';continue;}if(lk)lk.remove();
  $('#s'+n+'e').textContent=sk.e;$('#s'+n+'n').textContent=sk.n.split(' ')[0].toUpperCase().slice(0,8);$('#cd'+n).style.height=(100*(sk.remaining??hero.cd[sk.idx]??0)/sk.cd)+'%';bt.classList.toggle('off',hero.sp<sk.sp||!!sk.blocked);}
 $('#flC').textContent=hero.flask+'/'+S.flask;$('#bFlask').classList.toggle('off',hero.flask<=0);$('#potC').textContent=S.pots.red+S.pots.orange+S.pots.white+S.pots.blue;
 $('#bAuto').classList.toggle('on',!!S.auto);$('#bLock').classList.toggle('on',!!hero.lock);$('#bMenu').classList.toggle('notify',ptsLeft()>0||S.skp>0);}

/* ================= MENU ================= */
function openMenu(tab){qcHide();if(tab)G.tab=tab;menuOpen=true;G.lightHeld=false;$('#menu').classList.add('show');renderMenu();sfx('ui');}
function closeMenu(){menuOpen=false;$('#menu').classList.remove('show');}
// Error boundary: a tab that throws while drawing used to leave the panel blank.
// Show the error instead, so a player screenshot tells us exactly what failed.
function renderMenu(){try{renderMenuTab();}catch(e){console.error('Menu tab failed:',G.tab,e);const b=$('#mBody');if(!b)return;
 b.innerHTML=`<div class="card"><div class="ttl">⚠️ This tab could not be drawn</div><p style="font-size:13px">Please send a screenshot of this message so it can be fixed.</p><pre style="white-space:pre-wrap;font-size:11px;color:#ffb0b0;margin:0">Tab: ${esc(G.tab)} · ${esc(S&&S.cls)} · job ${esc(S&&S.job)} · Lv ${esc(S&&S.lv)}\n${esc(e&&e.message)}\n${esc(String(e&&e.stack||'').split('\n').slice(0,5).join('\n'))}</pre></div>`;}}
function renderMenuTab(){const st=G.st=stats(),C=C_();
 const tabs=[['status','📊 Status'],['skills','🌟 Skills'+(S.skp?' ('+S.skp+')':'')],['bag','🎒 Equipment'],['forge','⚒️ Forge'],['shop','🏪 Shop'],['map','🗺️ World Map']].concat(FB.avail?[['online','🌐 Online'+(NET.on?' ('+(Object.values(NET.peers).filter(livePeer).length+1)+')':'')],['chat','💬 Chat'+(FB.chatUnread?' ('+FB.chatUnread+')':'')],['lb','🏆 Leaderboard']]:[]).concat([['sys','⚙️ Settings']]);
 $('#mSide').innerHTML='<div class="mtabs">'+tabs.map(t=>`<button data-a="tab" data-v="${t[0]}" class="${G.tab===t[0]?'on':''}">${t[1]}</button>`).join('')+'</div><button class="cls" data-a="close">✕ Close</button>';
 {const on=$('#mSide .on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'nearest'});}
 let h='';
 if(G.tab==='status'){
  // Landing tab. It previously had no visual state at all — HP/SP/EXP were plain
  // text with separators — in a game whose HUD already shows four bars.
  const f=facOf(S),xpN=need(S.lv),pc=(a,b)=>Math.max(0,Math.min(100,b?a/b*100:0));
  h+=`<div class="card"><div class="ttl">${f?`<span style="color:${f.c}">${f.e} ${f.n}</span> · `:''}${heroName()} · ${C.ic} ${jobName()} · Lv ${S.lv}${S.ngp?' · NG+'+S.ngp:''}</div>`
   +`<div class="vit"><span class="vl">❤️ HP</span><div class="fgmeter"><div class="bar hp" style="width:${pc(hero.hp,st.mhp)}%"></div><span>${Math.ceil(hero.hp)} / ${st.mhp}</span></div></div>`
   +`<div class="vit"><span class="vl">💧 SP</span><div class="fgmeter"><div class="bar sp" style="width:${pc(hero.sp,st.msp)}%"></div><span>${Math.floor(hero.sp)} / ${st.msp}</span></div></div>`
   +`<div class="vit"><span class="vl">✨ EXP</span><div class="fgmeter"><div class="bar xp" style="width:${pc(S.exp,xpN)}%"></div><span>${S.exp.toLocaleString()} / ${xpN.toLocaleString()}</span></div></div>`
   +`<div class="chips"><span class="chip">🟩 Stamina ${st.msta}</span><span class="chip">🩸 Flask ${S.flask}</span><span class="chip">💰 ${S.zeny.toLocaleString()} z</span></div></div>`;
  const desc={str:'Melee attack power',agi:'Attack speed, crit, stamina, flee',vit:'Max HP, defense, stamina',int:'Max SP, magic & skill power',dex:'Attack speed; Archer damage',luk:'Critical chance'};
  const P=ptsLeft(),rcost=S.lv*300;
  h+=`<div class="card"><div class="ttl">Stat Points <span class="zen">${P.toLocaleString()}</span> <button data-a="streset" style="float:right" ${ptsSpent(S.st)?'':'disabled'}>↺ Respec · ${rcost.toLocaleString()}z</button></div><div class="chips">${STAT_JOB.map((v,i)=>`<span class="chip ${(S.job||0)===i?'on':(S.job||0)>i?'done':''}">${['1st','2nd','3rd','4th'][i]} Job · ${v}</span>`).join('')}</div><i class="ist">Cap <b style="color:#ffd76a">${statMax()}</b> as ${jobName()} · you gain <b>${STAT_PTS}</b> points per level · raising a stat costs more every 10 points · allocated points count <b>×${STAT_W}</b> in combat · speed-type gains soften past 99.</i><div class="igrid">`;
  const bx=buffSt(),rx=refSt();for(const k of ['str','agi','vit','int','dex','luk']){const v=S.st[k],mx=v>=statMax();
   const c1=mx?0:stCost(v),n5=mx?0:Math.min(5,statMax()-v),c5=mx?0:stCostN(v,n5),d=mx?'':statDelta(k);
   h+=`<div class="icard ${mx?'q2':'q0'}"><span class="sl">${k.toUpperCase()}${mx?' · MAX':''}</span><span class="stv">${v}${bx[k]?` <span class="stb" title="Temporary buff bonus">(+${bx[k]})</span>`:''}${rx?` <span class="str2" title="Refine bonus from equipped gear">(+${rx})</span>`:''}</span><i class="ist">${desc[k]}</i>`
    +(d?`<i class="ist stg">next: ${d}</i>`:'')
    +`<div class="ia"><button data-a="stat" data-v="${k}" ${!mx&&P>=c1?'':'disabled'}>+1 · ${c1}p</button><button data-a="stat5" data-v="${k}" ${!mx&&n5>0&&P>=c5?'':'disabled'}>+${n5||5} · ${c5}p</button></div></div>`;}
  h+=`</div></div>${innHtml()}`;
  const cb=[['⚔️','ATK',st.atk],['🛡️','DEF',`${st.def} (-${Math.round(100-10000/(100+st.def))}%)`],['⚡','Speed',`×${st.aspdM.toFixed(2)}`],['✦','Crit',`${Math.round(st.crit*100)}%`],['🔮','MATK',matk(st).toLocaleString()],['🎯','Hit',st.hit?`${st.hit} (${Math.min(50,st.hit)}% pierce)`:'0'],['👟','Move',`${st.spd.toFixed(1)}`],['💨','Flee',`${Math.round(st.flee*100)}%`],['🩸','Lifesteal',`${(st.ls*100).toFixed(1)}%`],['🔮','Spell Siphon',`${(st.sls*100).toFixed(1)}%`],['🛡️','Dmg taken',`-${Math.round(st.red*100)}%`],['💰','Zeny',`×${st.zenyM.toFixed(2)}`],['🟩','Sta regen',`${Math.round(st.staR)}/s`]];
  h+=`<div class="card"><div class="ttl">Combat</div><div class="cgrid">${cb.map(c=>`<div class="ctile"><span class="sl">${c[0]} ${c[1]}</span><span class="cv">${c[2]}</span></div>`).join('')}</div></div>`;
  h+=`<div class="card"><div class="ttl">Skill Bar</div><div class="sbar">${S.bar.map((i,n)=>{const pb=i===PARABELLUM,k=pb?parabellumDef():i==null?null:C.sk[i];
   // Parabellum is stored as a string, not a skill index; unknown slots render empty
   return `<div class="sslot ${k?'':'empty'}"><span class="n">${n+1}</span>${!k?'<span class="ghost">·</span>':`<span class="e">${k.e}</span><span class="sn2">${k.n}</span><span class="lvl">${pb?(Array.isArray(S.parabellum)?S.parabellum.length:0)+' buffs':'Lv'+skLv(i)}</span>`}</div>`;}).join('')}</div><i class="ist">Skill points: ${S.skp} → Skills tab</i></div>`;}
 else if(G.tab==='skills'){h+=skillsHtml();}
 else if(G.tab==='bag'){
  // Paper-doll: the live character centred, equipment slots flanking it. Slots sit
  // by body position — headgear/armour/shield left, weapon/accessory right. Tapping
  // one opens eqPop() with full stats. iName() already appends the "+N" refine level.
  const tile=sl=>{const it=S.eq[sl]?itemById(S.eq[sl]):null;
   return `<div class="eqslot ${it?'q'+it.rar:'empty'}" data-a="slot" data-v="${sl}"><span class="sl">${SLOTN[sl]}</span>${it?`<span class="inm">${SLOTI[sl]} ${iHtml(it)}</span><i class="ist">${iStat(it)}</i>`:`<span class="ghost">${SLOTI[sl]}</span>`}</div>`;};
  h+=`<div class="card"><div class="ttl">Equipped</div><div class="eqwrap">`
   +`<div class="eqcol">${['h','l','a','f'].map(tile).join('')}</div>`
   +`<div class="eqstage"><div class="hint">drag to rotate</div></div>`
   +`<div class="eqcol">${['w','s','r','r2'].filter(sl=>sl!=='s'||C.shield).map(tile).join('')}</div>`
   +`</div><div class="row" style="margin-top:7px"><span class="nm">Auto-equip better drops</span><button data-a="autoeq">${S.autoEq?'ON ✓':'OFF'}</button></div></div>`;
  const F=G.bagF;h+=`<div class="fbar">${[['all','All'],['w','Weapons'],['a','Armor'],['h','Helms'],['l','Masks'],['f','Boots'],['s','Shields'],['r','Rings']].filter(x=>x[0]!=='s'||C.shield).map(x=>`<button data-a="bagf" data-v="${x[0]}" class="${F===x[0]?'on':''}">${x[1]}</button>`).join('')}</div>`;
  const list=S.items.filter(i=>!Object.values(S.eq).includes(i.id)&&(F==='all'||i.slot===F)&&(i.slot!=='s'||C.shield)).sort((a,b)=>iScore(b)-iScore(a));
  h+=`<div class="card"><div class="ttl">Bag (${S.items.length}/${BAG_MAX})</div>`;
  if(!list.length)h+='<i style="color:#a99cc0">Kill monsters to find gear. Drops glow by tier: white Normal, silver, gold, and red S-Tier. Rings carry Lifesteal, Spell Siphon and other affixes.</i>';
  else{h+='<div class="igrid">';
   for(const it of list){const cur=curFor(it);const diff=cur?Math.round(iScore(it)-iScore(cur)):1;
    h+=`<div class="icard q${it.rar}"><span class="inm">${SLOTI[it.slot]} ${iHtml(it)} <span class="${diff>0?'up':'dn'}">${diff>0?'▲':'▼'}</span></span><i class="ist">${iStat(it)}</i><div class="ia"><button data-a="equip" data-v="${it.id}">Equip</button><button data-a="sell" data-v="${it.id}">${iPrice(it)}z</button></div></div>`;}
   h+='</div>';}
  h+=`</div><button class="mbtn" data-a="sellr" data-v="0">Sell all Normal</button><button class="mbtn" data-a="sellr" data-v="1">Sell all Silver</button>`;
  const lk=Object.keys(S.loot).filter(k=>S.loot[k].c>0);let tot=0;lk.forEach(k=>tot+=S.loot[k].c*S.loot[k].p);
  h+=`<div class="card"><div class="ttl">Potions & Materials</div>${Object.keys(POT).map(k=>`<span class="pot" style="background:${POT[k].c}"></span>${POT[k].n} ×${S.pots[k]}`).join(' &nbsp; ')}<br>${Object.keys(ORE).map(k=>`${ORE[k].e} ${ORE[k].n} ×${S.ore[k]||0}`).join(' &nbsp; ')}<br>${lk.map(k=>`${S.loot[k].e} ${k} ×${S.loot[k].c}`).join(' · ')||'<i style="color:#a99cc0">No loot</i>'}</div>${tot?`<button class="mbtn" data-a="sellloot">Sell all loot (+${tot.toLocaleString()} z)</button>`:''}`;}
 else if(G.tab==='forge'){
  // Master-detail forge: a picker strip of refinable gear, then a station for the
  // selected item showing the stat delta, odds, risk band, materials and progress.
  const smith=S.cls==='smith',eqIds=Object.values(S.eq).filter(Boolean),F=G.fgF||'all';
  let list=S.items.slice().sort((a,b)=>(eqIds.includes(b.id)-eqIds.includes(a.id))||(b.ref-a.ref)||iScore(b)-iScore(a));
  if(F==='eq')list=list.filter(i=>eqIds.includes(i.id)); else if(F!=='all')list=list.filter(i=>i.slot===F);
  let sel=G.fgSel?itemById(G.fgSel):null;
  if(!sel||!S.items.includes(sel)||!list.includes(sel)){sel=list[0]||null;G.fgSel=sel?sel.id:null;}
  h+=`<div class="card"><div class="ttl">⚒️ Forge — refine up to +${REF_MAX}${smith?' · <span style="color:#7f7">Blacksmith bonus</span>':''}</div>`
   +`<div class="fbar">${[['all','All'],['eq','Equipped'],['w','Weapons'],['a','Armor'],['h','Helms'],['l','Masks'],['f','Boots'],['s','Shields'],['r','Rings']].filter(x=>x[0]!=='s'||C.shield).map(x=>`<button data-a="fgf" data-v="${x[0]}" class="${F===x[0]?'on':''}">${x[1]}</button>`).join('')}</div>`
   +`<div class="fgpick">${list.slice(0,60).map(it=>`<div class="fgtile q${it.rar}${sel&&it.id===sel.id?' on':''}" data-a="fgsel" data-v="${it.id}"><span class="ic">${SLOTI[it.slot]}</span><span class="lv">+${it.ref}</span>${eqIds.includes(it.id)?'<span class="eqb">E</span>':''}</div>`).join('')||'<i class="ist">No gear to refine yet.</i>'}</div></div>`;
  if(sel){
   const rc=refineCost(sel),rate=refineRate(sel),pct=Math.round(rate*100),maxed=sel.ref>=REF_MAX;
   const prot=S.useProt&&S.prot>0, band=sel.ref>=10?(prot?'risky':'deadly'):sel.ref>=5?'risky':'safe';
   const payZ=S.zeny>=rc.z, payO=S.ore[rc.ore]>=rc.n, canPay=payZ&&payO;
   const nx=Object.assign({},sel,{ref:sel.ref+1}),dl=[];
   if(sel.slot==='w')dl.push(['ATK',iAtk(sel),iAtk(nx)]);
   else if(sel.slot!=='r')dl.push(['DEF',iDef(sel),iDef(nx)]);
   if(sel.slot==='a')dl.push(['HP',iHp(sel),iHp(nx)]);
   if(sel.af)dl.push([AFFIX[sel.af.k].n,Math.round(afVal(sel)),Math.round(afVal(nx))]);
   const risk=band==='safe'?'✓ Safe — a failure only costs materials'
    :sel.ref>=10&&prot?'🛡️ Protected — a failure drops 1 level and spends a scroll'
    :sel.ref>=10?'⚠ FAILURE DESTROYS THIS ITEM':'▼ A failure drops it 1 level';
   h+=`<div class="card fgstation"><div class="fgstage"></div><div class="fginfo">`
    +`<div class="fgname">${SLOTI[sel.slot]} ${iHtml(sel)}</div>`
    +(()=>{const mb=refineBonus(sel.ref),nm=nextRefineMilestone(sel.ref);return `<div class="fgbon">✨ ${mb?`Refine bonus <b>+${mb} all stats</b>${eqIds.includes(sel.id)?'':' (when equipped)'}`:'No refine bonus yet'}${nm?` · <span>+${nm.v} all stats at +${nm.at}</span>`:''}</div>`;})()
    +(maxed?`<div class="fgstep">+${sel.ref} · MAX</div>`
      :`<div class="fgstep">+${sel.ref} <b>▶</b> <span class="nxt">+${sel.ref+1}</span></div>`
      +dl.map(d=>`<div class="fgdelta"><span>${d[0]}</span><span>${d[1]} <b>▶</b> ${d[2]} ${d[2]>d[1]?`<b class="up">+${d[2]-d[1]}</b>`:''}</span></div>`).join('')
      +`<div class="fgmeter"><div class="bar ${band}" style="width:${Math.max(3,pct)}%"></div><span>${pct}%</span></div>`
      +(sel.pity?`<div class="fgpity">🔥 Pity +${Math.round(pityB(sel)*100)}% · ${sel.pity} failed attempt${sel.pity>1?'s':''} on this item</div>`:'')
      +`<div class="fgrisk ${band}">${risk}</div>`
      +`<div class="fgmat"><span class="${payZ?'':'no'}">💰 ${rc.z.toLocaleString()} / ${S.zeny.toLocaleString()}</span><span class="${payO?'':'no'}">${ORE[rc.ore].e} ${ORE[rc.ore].n} ${rc.n} / ${S.ore[rc.ore]}</span></div>`)
    +`<div class="fgrail">${Array.from({length:REF_MAX},(_,i)=>`<i class="pip ${i<sel.ref?'on ':''}${i>=10?'d':i>=4?'r':'s'}"></i>`).join('')}</div>`
    +`<div class="ia"><button class="fgo ${band}" data-a="refine" data-v="${sel.id}" ${maxed||!canPay?'disabled':''}>${maxed?'MAXED':'REFINE'}</button></div>`
    +`<div class="fbar">${[10,12,15,18,REF_MAX].filter(t=>t>sel.ref).map(t=>`<button data-a="refineto" data-v="${t}" ${canPay?'':'disabled'}>→ +${t}</button>`).join('')}`
    +`<button data-a="protuse" class="${S.useProt?'on':''}">🛡️ ${S.useProt?'ON':'OFF'} · ${S.prot||0}</button></div>`
    +`<i class="ist">Bulk refining stops before any attempt that could destroy the item, unless Protection is on with scrolls left.</i>`
    +`</div></div>`;}
  h+=`<div class="card"><div class="ttl">🔥 Combine ores</div><i class="ist">+11–+15 needs Enriched ore, +16–+20 needs Mithril ore (1 per attempt).</i><div class="igrid">`
   +Object.keys(COMBINE).map(k=>{const r=COMBINE[k],mx=combineMax(S.ore,k);return `<div class="icard q1"><span class="inm">${ORE[k].e} ${ORE[k].n} <small style="color:#a99cc0">have ${S.ore[k]||0}</small></span><i class="ist">${r.n} ${ORE[r.from].e} ${ORE[r.from].n} → 1 · have ${S.ore[r.from]||0}</i><div class="ia"><button data-a="combine" data-v="${k}:1" ${mx?'':'disabled'}>Make 1</button><button data-a="combine" data-v="${k}:max" ${mx>1?'':'disabled'}>Make ${mx>1?mx:'max'}</button></div></div>`;}).join('')+`</div></div>`;}
 else if(G.tab==='shop'){const tier=chTier(S.unlocked),gt=Math.max(0,tier-1),ST=G.shopT||'buy';
  h+=`<div class="card"><div class="ttl">🏪 Traveling Merchant</div>`
   +`<div class="chips"><span class="chip">💰 ${S.zeny.toLocaleString()} z</span><span class="chip">🩸 Flask ${S.flask}</span><span class="chip">🛡️ Scrolls ${S.prot||0}</span></div>`
   +`<div class="fbar" style="margin-top:6px">${[['buy','🛍️ Buy'],['sell','💱 Sell'],['bb','↩️ Buyback'+(S.bb&&S.bb.length?' ('+S.bb.length+')':'')]].map(t=>`<button data-a="shopt" data-v="${t[0]}" class="${ST===t[0]?'on':''}">${t[1]}</button>`).join('')}</div></div>`;
  if(ST==='buy'){
  h+=`<div class="card"><div class="ttl">Supplies</div><i class="ist">You can carry at most ${POT_MAX} of each potion. Your flask refills free at any Site of Grace.</i>`
   +`<div class="fbar" style="margin-top:6px"><span class="ist" style="align-self:center;margin-right:2px">Buy amount</span>${[1,5,10,25,'max'].map(q=>`<button data-a="shopq" data-v="${q}" class="${String(G.shopQ||1)===String(q)?'on':''}">${q==='max'?'Max':'×'+q}</button>`).join('')}</div><div class="igrid">`;
  for(const k in POT){const p=POT[k],n=shopN(p.price,POT_MAX-S.pots[k]);
   h+=`<div class="icard q0"><span class="inm"><span class="pot" style="background:${p.c}"></span>${p.n} <small style="color:#a99cc0">${S.pots[k]}/${POT_MAX}</small></span>`
    +`<i class="ist">${p.hp?'Heals '+Math.round(p.hp*100)+'% HP':'Restores '+Math.round(p.sp*100)+'% SP'}</i>`
    +`<div class="fgmat"><span class="${S.zeny>=p.price?'':'no'}">${p.price.toLocaleString()}z each</span></div>`
    +`<div class="ia"><button data-a="buy" data-v="${k}" ${n?'':'disabled'}>${n?`Buy ×${n} · ${(p.price*n).toLocaleString()}z`:'Buy'}</button></div></div>`;}
  for(const k in ORE){if(ORE[k].shop===false)continue;const pr=oreP(k),n=shopN(pr,null);
   h+=`<div class="icard q1"><span class="inm">${ORE[k].e} ${ORE[k].n} <small style="color:#a99cc0">have ${S.ore[k]}</small></span>`
    +`<i class="ist">${ORE[k].d}</i>`
    +`<div class="fgmat"><span class="${S.zeny>=pr?'':'no'}">${pr.toLocaleString()}z each</span></div>`
    +`<div class="ia"><button data-a="buyore" data-v="${k}" ${n?'':'disabled'}>${n?`Buy ×${n} · ${(pr*n).toLocaleString()}z`:'Buy'}</button></div></div>`;}
  {const n=shopN(PROT_PRICE,null);
   h+=`<div class="icard q2"><span class="inm">🛡️ Protection Scroll <small style="color:#a99cc0">have ${S.prot||0}</small></span>`
    +`<i class="ist">Stops a +11→+20 refine from destroying the item; it drops 1 level instead.</i>`
    +`<div class="fgmat"><span class="${S.zeny>=PROT_PRICE?'':'no'}">${PROT_PRICE.toLocaleString()}z each</span></div>`
    +`<div class="ia"><button data-a="buyprot" ${n?'':'disabled'}>${n?`Buy ×${n} · ${(PROT_PRICE*n).toLocaleString()}z`:'Buy'}</button></div></div>`;}
  h+=`</div></div>`;
  // Gear now shows its stats and an upgrade arrow against what you have equipped —
  // previously it was a bare name, so there was no way to tell if it was better.
  h+=`<div class="card"><div class="ttl">🧰 Basic Gear</div><i class="ist">Plain tier-${gt+1} equipment, one tier behind what drops here. Keeps every slot fillable.</i><div class="igrid">`;
  for(const sl of ['w','a','h','l','f','s','r']){
   if(sl==='s'&&!C_().shield)continue;
   const proto={id:-1,slot:sl,tier:gt,rar:0,ref:0,af:null};
   const pr=Math.round(iPrice(proto)*2.2),n=shopN(pr,BAG_MAX-S.items.length);
   const cur=curFor(proto),d=cur?Math.round(iScore(proto)-iScore(cur)):1;
   h+=`<div class="icard q0"><span class="inm">${SLOTI[sl]} ${iName(proto)} <span class="${d>0?'up':'dn'}">${d>0?'▲':'▼'}</span></span>`
    +`<i class="ist">${SLOTN[sl]}${iStat(proto)?' · '+iStat(proto):''}</i>`
    +`<div class="fgmat"><span class="${S.zeny>=pr?'':'no'}">${pr.toLocaleString()}z</span></div>`
    +`<div class="ia"><button data-a="buygear" data-v="${sl}" ${n?'':'disabled'}>${n?`Buy ×${n} · ${(pr*n).toLocaleString()}z`:'Buy'}</button></div></div>`;}
  h+=`</div></div>`;
  {const bp=boxP();
   h+=`<div class="card"><div class="ttl">🎁 Old Blue Box</div><i class="ist">A random tier-${tier+1} item. Rings always roll an affix.</i>`
    +`<div class="vit"><span class="vl">Silver</span><div class="fgmeter"><div class="bar" style="width:50%;background:linear-gradient(90deg,#5a6a80,#9fb6d6)"></div><span>50%</span></div></div>`
    +`<div class="vit"><span class="vl">Gold</span><div class="fgmeter"><div class="bar risky" style="width:35%"></div><span>35%</span></div></div>`
    +`<div class="vit"><span class="vl">S-Tier</span><div class="fgmeter"><div class="bar deadly" style="width:15%"></div><span>15%</span></div></div>`
    +`<div class="ia"><button class="mbtn" data-a="box" ${S.zeny>=bp?'':'disabled'}>Open for ${bp.toLocaleString()}z</button></div></div>`;}
  }else if(ST==='sell'){
  // Selling belongs at the merchant, not only in the bag.
  const spare=S.items.filter(i=>!Object.values(S.eq).includes(i.id)).sort((a,b)=>iPrice(a)-iPrice(b));
  h+=`<div class="card"><div class="ttl">💱 Sell</div>`
   +`<div class="fbar"><button data-a="sellr" data-v="0">Sell all Normal</button><button data-a="sellr" data-v="1">Sell all Silver</button><span class="ist" style="align-self:center">unrefined only</span>${(()=>{let t=0;for(const k in S.loot)t+=S.loot[k].c*S.loot[k].p;return `<button data-a="sellloot" ${t?'':'disabled'}>Sell all loot · ${t.toLocaleString()}z</button>`;})()}</div>`
   +(spare.length?`<div class="igrid">${spare.slice(0,40).map(it=>`<div class="icard q${it.rar}"><span class="inm">${SLOTI[it.slot]} ${iHtml(it)}</span><i class="ist">${iStat(it)}</i><div class="ia"><button data-a="sell" data-v="${it.id}">Sell · ${iPrice(it).toLocaleString()}z</button></div></div>`).join('')}</div>`
     :'<i class="ist">Nothing spare to sell — everything you own is equipped.</i>')
   +`</div>`;
  }else{
  if(S.bb&&S.bb.length){
   h+=`<div class="card"><div class="ttl">↩️ Buyback</div><i class="ist">The merchant still has your last ${S.bb.length} sale${S.bb.length>1?'s':''}, at exactly the price you were paid.</i>`
    +`<div class="igrid">${S.bb.map((e,i)=>`<div class="icard q${e.it.rar}"><span class="inm">${SLOTI[e.it.slot]} ${iHtml(e.it)}</span><i class="ist">${iStat(e.it)}</i><div class="ia"><button data-a="buyback" data-v="${i}" ${S.zeny>=e.p&&S.items.length<BAG_MAX?'':'disabled'}>Buy back · ${e.p.toLocaleString()}z</button></div></div>`).join('')}</div></div>`;}
  else h+=`<div class="card"><div class="ttl">↩️ Buyback</div><i class="ist">Nothing here yet. Anything you sell waits here and can be bought back at the exact price you were paid.</i></div>`;
  }}
 else if(G.tab==='map')h+=mapHtml();
 else if(G.tab==='chat')h+=chatHtml();
 else if(G.tab==='online')h+=onlineHtml();
 else if(G.tab==='lb')h+=lbHtml();
 else{h+=`<div class="card"><div class="ttl">Controls</div><b>Move:</b> tap the ground to walk there, or drag on the left half of the screen for a virtual stick. Tap a monster to lock on and fight it.<br>
  <b>⚔️ LIGHT</b> fast attack (hold for combos) · <b>💢 HEAVY</b> slow, powerful, breaks guards and stances<br><b>🌀 DODGE</b> roll with invincibility frames (no stick = backstep)<br><b>🛡️ PARRY</b> press just as an enemy strikes (shield classes: keep holding to raise a guard — blocks frontal hits for stamina) → they get stunned and your next hit is a <b style="color:#ffd76a">CRITICAL riposte</b><br><b>1-4</b> skill bar (set it up in the Skills tab) · <b>🩸 FLASK</b> heals 45%, refills at a Site of Grace · <b>🧪</b> potions (max 5 each)<br>
  Red ground circles are <b>unblockable</b>: roll out. Enemies flash white right before they strike: that's your parry window.<br>Shielded enemies (🛡️) block frontal light attacks. Use heavy attacks or hit them from behind.<br>Dying drops your zeny where you fell. Pick it up again before dying twice.<br><i style="color:#a99cc0">Keyboard: WASD · J light · K heavy · Space dodge · L parry · 1-3 skills · Q flask · R potion · E interact · Tab lock · M menu</i></div>`;
  if(prologueActive())h+=`<div class="card"><div class="ttl">Before the oath</div><button class="mbtn" data-a="skipintro">Skip introduction</button></div>`;
  h+=`<div class="card"><div class="ttl">Graphics</div><div class="fbar">${['low','medium','high'].map(q=>`<button data-a="qual" data-v="${q}" class="${QUAL===q?'on':''}">${q[0].toUpperCase()+q.slice(1)}</button>`).join('')}</div><i style="color:#a99cc0;font-size:11px">Low: no shadows/bloom (old phones) · Medium: shadows · High: shadows + bloom + more particles. Takes effect on next area load.</i></div>`;
  h+=`<div class="card"><div class="ttl">Difficulty</div><div class="fbar">${DIFF.map((d,i)=>`<button data-a="diff" data-v="${i}" class="${(S.diff!=null?S.diff:2)===i?'on':''}">${d.n}</button>`).join('')}</div><i style="color:#a99cc0;font-size:11px">${diff().d}.</i><br>${FB.uid?'':`<button class="mbtn" data-a="rename">✏️ Rename hero (${heroName()})</button>`}</div>`;
  if(FB.uid)h+=`<div class="card"><div class="ttl">🌐 Account: ${esc(FB.name)}</div><button class="mbtn" data-a="pwchg">🔑 Change password</button></div>`;
  h+=`<div class="card"><div class="ttl">Sound</div><button class="mbtn" data-a="music">🎵 Music: ${S.music?'ON':'OFF'}</button><button class="mbtn" data-a="sfxt">🔊 Effects: ${S.sfx?'ON':'OFF'}</button></div>`;
  h+=`<div class="card"><div class="ttl">Save</div><b>${saveStatus()}</b><br>The game auto-saves every few seconds, when you close or leave the page, at every rest, and on every quest/boss. Use <b>Continue</b> on the title screen.<br><button class="mbtn" data-a="save">💾 Save now</button><button class="mbtn" data-a="fs">⛶ Fullscreen</button><button class="mbtn" data-a="title">🏠 Save &amp; Title</button><br><br><b>Save code</b> (copy this somewhere safe; paste it on the title screen with "Load from save code" on any device):<br><textarea class="code" id="saveCode" readonly>${exportCode()}</textarea><button class="mbtn" data-a="copy">📋 Copy code</button>
  <button class="mbtn" data-a="reset" style="border-color:#c44;float:right">🗑️ Delete Save</button></div>`;}
 $('#mBody').innerHTML=h;$('#mBody').classList.toggle('fill',G.tab==='chat');if(G.tab==='bag')dollWire();if(G.tab==='forge')fgWire();if(G.tab==='chat')chatWire();if(G.tab==='online')friendsWire();}
function refineCost(it){const sm=S.cls==='smith';return {z:Math.round(150*(it.tier+1)*(it.ref+1)*(1+it.rar*.5)*(it.ref>=10?1+(it.ref-9)*.35:1)*(sm?.75:1)),...refineOre(it.slot,it.ref)};}
const pityB=it=>Math.min(.45,(it.pity||0)*.03);
function refineRate(it){const b=REF_RATE[Math.min(REF_MAX-1,it.ref)];
 const sm=(S.cls==='smith'&&it.ref>=4?(it.ref>=10?b*.3:.15):0);
 return Math.min(1,b+sm+pityB(it));}
/* One refine attempt: spend, roll, apply. Returns a result code so single and bulk
   refining share identical odds and side effects rather than duplicating them. */
function doRefine(it){
 const rc=refineCost(it);
 if(it.ref>=REF_MAX||S.zeny<rc.z||S.ore[rc.ore]<rc.n)return {r:'cant'};
 S.zeny-=rc.z;S.ore[rc.ore]-=rc.n;
 const from=it.ref;
 if(Math.random()<refineRate(it)){it.pity=0;it.ref++;return {r:'up',from,to:it.ref};}
 it.pity=(it.pity||0)+1;
 if(from>=10){
  if(S.useProt&&S.prot>0){S.prot--;it.ref--;return {r:'save',from,to:it.ref};}
  const nm=iName(it);
  for(const k in S.eq)if(S.eq[k]===it.id)S.eq[k]=null;
  S.items=S.items.filter(x=>x!==it);
  return {r:'broke',from,nm};
 }
 if(from>=5)it.ref--;
 return {r:'down',from,to:it.ref};
}
function fgResult(R,it){
 if(R.r==='up'){toast(`✨ <b style="color:#7f7">REFINE SUCCESS!</b><br>${iHtml(it)}`,1800);sfx('forge');
  if(it.ref>=15){bigText('+'+it.ref+'!','#ffd76a',1500);sfx('stier');}
  if(FB.uid&&it.ref>=15)chatSys(`⚒️ ${FB.name} refined ${iName(it)}!`);}
 else if(R.r==='save'){toast(`💥 <b style="color:#f77">Refine failed...</b><br>🛡️ Protection Scroll saved it · dropped to +${R.to}`,2200);sfx('deny');}
 else if(R.r==='broke'){toast(`💔 <b style="color:#ff3030">THE ITEM BROKE!</b><br>${R.nm} is gone...`,2600);bigText('BROKEN','#c41e1e',1600);sfx('deny');G.shake=.3;}
 else if(R.r==='down'){toast(`💥 <b style="color:#f77">Refine failed...</b>${R.from!==R.to?'<br>Dropped to +'+R.to:''}`,1800);sfx('deny');}
}
/* How many to buy on one click: the shop's quantity selector, clamped by what you
   can afford and by whatever cap applies (potion carry limit, bag space). */
/* Buyback. Selling is otherwise irreversible: one mis-tap on a +12 weapon and it
   is gone. The merchant holds the last few sales at exactly the price you were
   paid, so a mistake costs nothing but the round trip. Items are stored as copies
   because the originals are removed from S.items on sale. */
const BB_MAX=10;
function bbPush(it,p){S.bb=S.bb||[];S.bb.unshift({it:Object.assign({},it),p});if(S.bb.length>BB_MAX)S.bb.length=BB_MAX;}
function shopN(price,cap){
 const q=G.shopQ||1;
 const afford=price>0?Math.floor(S.zeny/price):0;
 const want=q==='max'?Infinity:+q;
 return Math.max(0,Math.min(want,afford,cap==null?Infinity:cap));
}
const oreP=k=>(k==='ori'||k==='eori'||k==='mori'?400:350)*(ORE[k].mul||1)*(1+S.unlocked*.25)|0;
const boxP=()=>Math.round(800*Math.pow(S.unlocked+1,1.25));
$('#menu').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;menuAct(b.dataset.a,b.dataset.v,b);});
function menuAct(a,v,b){let reb=false;sfx('ui');
 switch(a){case 'close':closeMenu();return;case 'tab':G.tab=v;break;case 'bagf':G.bagF=v;break;case 'shopq':G.shopQ=(v==='max'?'max':+v);break;case 'shopt':G.shopT=v;break;case 'slot':eqPop(v);return;case 'fgsel':G.fgSel=+v;break;case 'fgf':G.fgF=v;break;
  case 'pbtoggle':{if((S.job||0)<PARABELLUM_JOB)break;const i=+v,sk=C_().sk[i];if(!sk||sk.t!=='buff'||!skLv(i)||(sk.job||0)>S.job||sk.zeny)break;
   const list=Array.isArray(S.parabellum)?S.parabellum:[];if(list.includes(i))S.parabellum=list.filter(n=>n!==i);else if(list.length<6&&!list.some(n=>C_().sk[n]?.k===sk.k))S.parabellum=[...list,i];break;}
  case 'pbup':{const pos=+v,list=S.parabellum;if(Array.isArray(list)&&Number.isInteger(pos)&&pos>0&&pos<list.length)[list[pos-1],list[pos]]=[list[pos],list[pos-1]];break;}
  case 'pbremove':{const pos=+v;if(Array.isArray(S.parabellum)&&Number.isInteger(pos)&&pos>=0&&pos<S.parabellum.length)S.parabellum.splice(pos,1);break;}
  case 'pbclear':S.parabellum=[];break;
  case 'combine':{const [k,q]=String(v).split(':');if(!COMBINE[k])break;const r=combine(S.ore,k,q==='max'?combineMax(S.ore,k):1);
   if(r){S.ore=r.ore;toast(`${ORE[k].e} ${ORE[k].n} ×${r.made}`,1200);sfx('forge');}else{toast('Not enough '+ORE[COMBINE[k].from].n);sfx('deny');}break;}
  case 'autoatk':{const c=autoCfg(),i=+v;if(!autoOk(i,['strike','multi','aoe','aoeT']))break;if(c.atk.includes(i))c.atk=c.atk.filter(n=>n!==i);else if(c.atk.length<AUTO_MAX)c.atk.push(i);break;}
  case 'autoup':{const c=autoCfg(),p=c.atk.indexOf(+v);if(p>0)[c.atk[p-1],c.atk[p]]=[c.atk[p],c.atk[p-1]];break;}
  case 'autobuf':{const c=autoCfg(),i=v==='parabellum'?v:+v;if(i==='parabellum'?(S.job||0)<PARABELLUM_JOB:!autoOk(i,['buff']))break;if(c.buf.includes(i))c.buf=c.buf.filter(n=>n!==i);else if(c.buf.length<AUTO_MAX)c.buf.push(i);break;}
  case 'autoheal':{const c=autoCfg();if(v==='off')c.heal=null;else if(autoOk(+v,['heal']))c.heal=+v;break;}
  case 'autohealat':{const c=autoCfg();c.healAt=clamp(+v||0,0,90);break;}
  case 'autosp':{const c=autoCfg();c.spRes=clamp(+v||0,0,90);break;}
  case 'autorefresh':{const c=autoCfg(),n=+v;if(AUTO_REFRESH_OPTIONS.includes(n))c.refresh=n;break;}
  case 'autoclear':S.autoCfg=null;break;
  case 'pbbar':{if((S.job||0)<PARABELLUM_JOB)break;const slot=+v;if(!Number.isInteger(slot)||slot<0||slot>=BAR_N)break;const old=S.bar.indexOf(PARABELLUM);if(old===slot)S.bar[slot]=null;else{if(old>=0)S.bar[old]=S.bar[slot];S.bar[slot]=PARABELLUM;}break;}
  case 'sklearn':learnSkill(v[0],+v.slice(1));break;
  case 'skj':G.skJ=+v;G.skSel='';break;
  case 'sksel':G.skSel=G.skSel===v?'':v;break;
  case 'skbar':{const i=+v,sl=+(b&&b.dataset.s||0);if(S.bar[sl]===i){S.bar[sl]=null;break;}const prev=S.bar.indexOf(i);if(prev>=0)S.bar[prev]=S.bar[sl];S.bar[sl]=i;toast((C_().sk[i].e||'')+' '+C_().sk[i].n+' → slot '+(sl+1),900);break;}
  case 'skreset':skReset();break;
  case 'stat':{if(S.st[v]<statMax()&&ptsLeft()>=stCost(S.st[v]))S.st[v]++;break;}
  case 'stat5':{let i=0;while(i<5&&S.st[v]<statMax()&&ptsLeft()>=stCost(S.st[v])){S.st[v]++;i++;}break;}
  case 'streset':{const cost=S.lv*300;
   if(!ptsSpent(S.st)){toast('Nothing allocated yet',1200);break;}
   if(S.zeny<cost){toast('Respec costs '+cost.toLocaleString()+' zeny',1500);break;}
   ask(`↺ <b>Respec stats?</b><br>Every allocated point is refunded for <b>${cost.toLocaleString()}z</b>.`,['Respec','Cancel']).then(r=>{if(r!==0)return;
    S.zeny-=cost;S.st=Object.assign({},CLASSES[S.cls].base);G.st=stats();
    hero.hp=Math.min(hero.hp,G.st.mhp);hero.sp=Math.min(hero.sp,G.st.msp);
    sfx('quest');toast('↺ Stats reset — '+ptsLeft().toLocaleString()+' points to spend',2200);save(true);renderMenu();});
   break;}
  case 'equip':{const it=itemById(+v);if(it){const k=freeSlotFor(it);if(k){S.eq[k]=it.id;reb=true;}}break;}
  case 'unequip':S.eq[v]=null;reb=true;break;
  case 'autoeq':S.autoEq=S.autoEq?0:1;break;
  case 'sell':{const it=itemById(+v);if(it&&!Object.values(S.eq).includes(it.id)){const doSell=()=>{if(!S.items.includes(it))return;const sp=iPrice(it);bbPush(it,sp);S.zeny+=sp;S.items=S.items.filter(x=>x!==it);toast('Sold for '+iPrice(it).toLocaleString()+' z',1200);save();renderMenu();};
   if(it.ref>=8||it.rar>=3){ask(`⚠️ Sell <b>${iHtml(it)}</b>?<br><small>This item is ${it.ref>=8?'<b style="color:#ffd76a">+'+it.ref+'</b> refined':'very rare'}. You will only get <b>${iPrice(it).toLocaleString()} z</b> and it cannot be undone.</small>`,['Keep it','Sell']).then(r=>{if(r===1)doSell();});return;}
   doSell();}break;}
  case 'sellr':{let t=0;S.items=S.items.filter(i=>{if(i.rar===+v&&!Object.values(S.eq).includes(i.id)&&i.ref===0){t+=iPrice(i);bbPush(i,iPrice(i));return false;}return true;});S.zeny+=t;toast('Sold for '+t.toLocaleString()+' z');break;}
  case 'sellloot':{let t=0;for(const k in S.loot)t+=S.loot[k].c*S.loot[k].p;S.loot={};S.zeny+=t;if(t)toast('Sold loot for '+t.toLocaleString()+' zeny 💰');break;}
  case 'buy':{const p=POT[v].price,n=shopN(p,POT_MAX-S.pots[v]);if(n){S.zeny-=p*n;S.pots[v]+=n;toast(`${POT[v].n} ×${n}`,1100);}break;}
  case 'protuse':S.useProt=!S.useProt;if(S.useProt&&!(S.prot>0))toast('🛡️ You have no Protection Scrolls yet.<br>Buy some here or in the Shop.',2200);break;
  case 'buyprot':{const n=shopN(PROT_PRICE,null);if(n){S.zeny-=PROT_PRICE*n;S.prot=(S.prot||0)+n;S.useProt=true;sfx('forge');toast(`🛡️ Protection Scroll ×${n} (now ${S.prot})`,1300);}break;}
  case 'buyback':{S.bb=S.bb||[];const e=S.bb[+v];if(!e)break;
   if(S.items.length>=BAG_MAX){toast('Your bag is full',1200);break;}
   if(S.zeny<e.p){toast('Not enough zeny',1200);break;}
   S.zeny-=e.p;S.items.push(e.it);S.bb.splice(+v,1);sfx('ui');toast('Bought back '+iHtml(e.it),1500);reb=true;break;}
  case 'buyore':{if(!ORE[v]||ORE[v].shop===false)break;const p=oreP(v),n=shopN(p,null);if(n){S.zeny-=p*n;S.ore[v]+=n;toast(`${ORE[v].e} ${ORE[v].n} ×${n}`,1100);}break;}
  case 'buygear':{const gt=Math.max(0,chTier(S.unlocked)-1);const p=Math.round(iPrice({tier:gt,rar:0,ref:0})*2.2);
   const n=shopN(p,BAG_MAX-S.items.length);
   if(n){S.zeny-=p*n;let last=null;for(let i=0;i<n;i++){last=newItem(v,gt,0);S.items.push(last);}toast('Bought '+iName(last)+(n>1?` ×${n}`:''),1200);reb=true;}
   else if(S.items.length>=BAG_MAX)toast('Your bag is full',1200);break;}
  case 'box':{const p=boxP();if(S.zeny>=p){S.zeny-=p;const r=Math.random();const e=rollEquip(chTier(S.unlocked),false);e.tier=chTier(S.unlocked);e.rar=r<.15?3:r<.5?2:1;e.af=rollAffix(e.slot,e.rar);collect({e});toast(`🎁 You got ${iHtml(S.items[S.items.length-1])}!`,2200);if(e.rar===3){bigText('S-TIER!','#ff2a2a',1600);sfx('stier');}reb=true;}break;}
  case 'refine':{const it=itemById(+v);if(!it)break;const rc=refineCost(it);if(it.ref>=REF_MAX||S.zeny<rc.z||S.ore[rc.ore]<rc.n)break;
   if(it.ref>=10&&!(S.useProt&&S.prot>0)&&!G.brkOk){G.brkOk=1;ask(`⚠️ <b>${iName(it)}</b> → +${it.ref+1}<br>Success ${Math.round(refineRate(it)*100)}%. If it fails, the item <b style="color:#ff3030">BREAKS and is gone forever</b>.<br><small>Turn on 🛡️ Protection Scrolls to keep it safe.</small>`,['Refine anyway','Cancel']).then(r=>{if(r===0){menuAct('refine',v);}G.brkOk=0;});return;}
   G.brkOk=0;const R=doRefine(it);fgResult(R,it);if(R.r==='broke')G.fgSel=null;
   if(R.r==='broke'||Object.values(S.eq).includes(it.id))reb=true;break;}
  case 'refineto':{const it=itemById(+G.fgSel);if(!it)break;
   const tgt=Math.min(REF_MAX,+v||it.ref+1);let up=0,down=0,tries=0,broke=false,stop='';
   while(it.ref<tgt&&tries<60){
    // never auto-run into the destroy band unprotected: that is the user's call, not a loop's
    if(it.ref>=10&&!(S.useProt&&S.prot>0)){stop='Stopped at +'+it.ref+' — next fail would destroy it';break;}
    const rc=refineCost(it);
    if(S.zeny<rc.z||S.ore[rc.ore]<rc.n){stop='Ran out of materials at +'+it.ref;break;}
    const R=doRefine(it);tries++;
    if(R.r==='cant')break;
    if(R.r==='up')up++;else if(R.r==='broke'){broke=true;fgResult(R,it);break;}else down++;
   }
   if(!broke)toast(`⚒️ Bulk refine · <b style="color:#7f7">${up} up</b> · <b style="color:#f77">${down} failed</b><br>Now <b>+${it.ref}</b>${stop?'<br><small>'+stop+'</small>':''}`,2400);
   if(broke)G.fgSel=null;
   if(up||down)sfx(up?'forge':'deny');
   if(Object.values(S.eq).includes(it.id)||broke)reb=true;break;}
  case 'neton':FB.online=!FB.online;try{localStorage.setItem('so_online',FB.online?'1':'0')}catch(e){}if(FB.online)netJoin(S.ch);else{netLeave();if(!G.mobs.some(m=>!m.dead&&!m.boss))for(let i=0;i<mobMax();i++)spawnMob(false);fieldEncounter();}toast(FB.online?'🌐 Online play ON':'Online play OFF (solo world)',1600);break;
  case 'emote':netEmote(v);closeMenu();return;
  case 'chc':G.chC=v;break;
  case 'addfr':addFriend(v);return;
  case 'arena':{const pv=FB.pres[v];if(!pv||pv.ch<0){toast('They are not in the game right now',1500);return;}closeMenu();arenaChallenge(v,pv.n);return;}
  case 'pinv':{const pv=FB.pres[v];if(pv)partyInvite(v,pv.n);return;}
  case 'pleave':partyLeave();break;
  case 'trade':{const pv=FB.pres[v];if(!pv||pv.ch<0){toast('They are not in the game right now',1500);return;}closeMenu();trInvite(v,pv.n);return;}
  case 'chto':G.chTo=v;break;
  case 'dm':G.tab='chat';G.chC='d';G.chTo=v;break;
  case 'join':joinPlayer(v);return;
  case 'unfr':ask('Remove '+esc(FB.friends[v]||'this friend')+' from friends?',['Remove','Cancel']).then(r=>{if(r===0)removeFriend(v);});return;
  case 'party':setPartyMode(!FB.partyMode);break;
  case 'mapw':G.mapW=+v;G.mapSel=null;break;
  case 'mapsel':G.mapSel=/^\d+$/.test(v)?+v:v;break;
  case 'twenter':closeMenu();enterTower(+v,FB.uid||'solo');save();return;
  case 'dgenter':closeMenu();enterDungeon(v,FB.uid||'solo');save();return;
  case 'dgleave':closeMenu();exitDungeon();return;
  case 'pwchg':pwDialog();return;
  case 'insp':{const p=NET.peers[v];closeMenu();if(p)inspectPeer(p);return;}
  case 'lbf':G.lbF=v;break;
  case 'lbr':G.lbT=0;break;
  case 'travel':G.mapSel=null;closeMenu();loadChapter(+v,true);titleCard(+v);save();return;
  case 'skipintro':closeMenu();finishFieldPrologue(true);return;
  case 'qual':setQuality(v);toast('Graphics: '+v+' (reloads on next area)',1600);break;
  case 'music':S.music=S.music?0:1;musicFor(S.ch,!!G.bossFight||!!G.surv);break;
  case 'sfxt':S.sfx=S.sfx?0:1;break;
  case 'save':toast(save(true)?'💾 Save requested.<br>'+saveStatus():'Could not save in this browser. Copy your save code instead.',2200);break;
  case 'copy':{const ta=$('#saveCode');ta.select();try{navigator.clipboard.writeText(ta.value);toast('Save code copied!');}catch(e){document.execCommand('copy');toast('Save code selected. Copy it manually.');}return;}
  case 'fs':if(isIOS)toast('iPhone has no fullscreen button. In Safari tap "aA" → Hide Toolbar, or Share → Add to Home Screen.',3200);else goFull();break;
  case 'title':save();closeMenu();toTitle();return;
  case 'reset':ask('Delete this save slot? This cannot be undone.',['Delete','Cancel']).then(r=>{if(r!==0)return;deleteSlot(SLOT);closeMenu();S=null;toTitle();});return;
  case 'diff':S.diff=+v;toast('Difficulty: '+DIFF[S.diff].n+'. Applies to newly spawned enemies.',2200);save(true);break;
  case 'rename':askText('New name for your hero (max 12 letters):').then(t=>{t=(t||'').trim().slice(0,12);if(!t)return;S.cust=Object.assign({},S.cust||{},{name:t});save(true);renderMenu();hud();});return;}
 G.st=stats();hero.hp=Math.min(hero.hp,G.st.mhp);hero.sp=Math.min(hero.sp,G.st.msp);if(a.startsWith('pb')||a.startsWith('auto')||a==='combine')save();if(reb)rebuildHero();renderMenu();}

/* ================= ONLINE / LEADERBOARD MENUS ================= */
const EMOTES=['👋','👍','😂','❤️','🔥','🙏','😭','⚔️','💀','🎉'];
function onlineHtml(){let h='';
 if(!FB.uid)return `<div class="card"><div class="ttl">🌐 Online</div>You're playing offline. Go to the title screen (☰ → Settings → Save &amp; Title) and tap <b>🔑 Log in / Create account</b> to play online with friends.</div>`;
 h+=`<div class="card"><div class="ttl">🌐 ${FB.name}</div>Online play: <button class="mbtn" data-a="neton">${FB.online?'🟢 ON':'⚫ OFF'}</button><br><i style="color:#a99cc0;font-size:11.5px;font-style:normal">When ON, players in the same chapter share one world: same monsters, co-op bosses (+70% boss HP per extra player in the arena), and duels. Difficulty follows the area host.</i>`;
 h+=`<br>World: <button class="mbtn" data-a="party" style="display:inline-block;width:auto;padding:4px 10px;margin:4px 0">${FB.partyMode?'🔒 Friends only':'🌍 Public'}</button> <i style="color:#a99cc0;font-size:11px;font-style:normal">${FB.partyMode?'Only your friends can join your world & dungeons.':'Everyone in your chapter shares the world.'}</i>`;
 if(NET.on){const hn=NET.host?'you':(NET.peers[NET.hostUid]&&NET.peers[NET.hostUid].info?NET.peers[NET.hostUid].info.n:'…');h+=`<br>Area host: <b>${hn}</b> · Difficulty: <b>${diff().n}</b>`;}
 h+='</div>'+partyHtml()+friendsHtml();
 if(NET.on){const ps=Object.values(NET.peers).filter(livePeer);h+=`<div class="card"><div class="ttl">In this area (${ps.length+1})</div>`;
  if(!ps.length)h+='<i>Nobody else here yet. Invite a friend to this chapter!</i>';
  for(const p of ps){const i=p.info,f=FACTIONS.find(x=>x.k===i.fa),C=CLASSES[i.c]||CLASSES.knight;h+=`<div class="row"><span class="nm"><span style="color:${f?f.c:'#fff'}">${f?f.e+' ':''}${i.n}</span><i>${jn(i.c,i.j!=null?i.j:(i.lk&&i.lk.j))} · Lv ${i.l} · ${Math.round(dxz(hero,p))}m away${p.dead?' · 💀':''}</i></span><button data-a="insp" data-v="${p.uid}">View</button></div>`;}
  h+=`</div><div class="card"><div class="ttl">Emotes</div><div class="fbar">${EMOTES.map(e=>`<button data-a="emote" data-v="${e}" style="font-size:20px">${e}</button>`).join('')}</div></div>`;}
 const all=Object.entries(FB.pres||{}).filter(([u])=>u!==FB.uid);h+=`<div class="card"><div class="ttl">Players online (${all.length+1})</div>`;
 if(!all.length)h+='<i>Only you right now.</i>';
 for(const [u,v] of all){const f=FACTIONS.find(x=>x.k===v.fa),C=CLASSES[v.c];const ch=v.ch;
  h+=`<div class="row"><span class="nm"><span style="color:${f?f.c:'#fff'}">${f?f.e+' ':''}${FB.friends[u]?'⭐':''}${esc(v.n)}</span><i>${C?jn(v.c,v.j)+' · Lv '+v.l+' · ':''}${ch>=0?(String(v.w||'').startsWith('dg_')?'⚔️ In a dungeon':'Ch.'+(ch+1)+' '+CHS[ch].name)+(v.pv?' 🔒':''):'On title screen'}</i></span>${ch>=0?`<button data-a="join" data-v="${u}">Join</button><button data-a="arena" data-v="${u}">⚔️</button>${myParty().includes(u)?'':`<button data-a="pinv" data-v="${u}">👥</button>`}<button data-a="trade" data-v="${u}">🤝</button>`:''}${FB.friends[u]?'':`<button data-a="addfr" data-v="${esc(v.n)}">⭐</button>`}</div>`;}
 return h+'</div>';}
function lbFetch(){if(!FB.avail||!FB.db||G.lbBusy)return;G.lbBusy=1;G.lbT=Date.now();
 FB.db.ref('lb').orderByChild('sc').limitToLast(300).once('value').then(s=>{const a=[];s.forEach(c=>{const v=c.val();if(v&&/^t[A-D]\d{4}$/.test(v.n||'')&&(v.l||0)<=1)return;a.push(Object.assign({uid:c.key},v));});a.sort((x,y)=>y.sc-x.sc);G.lbData=a;}).catch(e=>{G.lbErr=(e&&e.code)||'error';}).finally(()=>{G.lbBusy=0;if(menuOpen&&G.tab==='lb')renderMenu();});}
function lbHtml(){if(!G.lbT||Date.now()-G.lbT>30000)lbFetch();const f=G.lbF||'p';
 let h=`<div class="card"><div class="ttl">🏆 Leaderboard</div><div class="fbar"><button data-a="lbf" data-v="p" class="${f==='p'?'on':''}">Players</button><button data-a="lbf" data-v="f" class="${f==='f'?'on':''}">Factions</button><button data-a="lbr">⟳</button></div>
 <i style="color:#a99cc0;font-size:11px;font-style:normal">Score = level, chapters cleared, bosses slain, NG+ and duel wins. Difficulty multiplier: 🌱 Story ×0.5 · ⚖️ Normal ×1 · 💀 Soulslike ×1.5</i></div>`;
 const d=G.lbData;if(!d)return h+'<div class="card">'+(G.lbErr?'Could not load the leaderboard ('+G.lbErr+').':'Loading…')+'</div>';
 const DI=['🌱','⚖️','💀'];
 if(f==='p'){h+='<div class="card">';d.slice(0,100).forEach((r,i)=>{const fa=FACTIONS.find(x=>x.k===r.fa),C=CLASSES[r.c];const me=r.uid===FB.uid;
   const top=d[0]&&d[0].sc?d[0].sc:1,pct=Math.max(2,Math.min(100,(r.sc||0)/top*100));
   h+=`<div class="lbr ${i<3?'q'+(3-i):''}${me?' me':''}"><span class="rk ${i<3?'m'+i:''}">${i+1}</span><div class="lbb"><span class="inm"><span style="color:${fa?fa.c:'#fff'}">${fa?fa.e+' ':''}${r.n}</span> ${DI[r.d!=null?r.d:2]}</span><i class="ist">${jn(r.c,r.j)} · Lv ${r.l} · ${r.cl||0}/${CHS.length} ch · ${r.bk||0} bosses${r.ng?' · NG+'+r.ng:''}${r.pv?' · ⚔️'+r.pv:''}</i><div class="fgmeter lbm"><div class="bar xp" style="width:${pct}%"></div><span>${(r.sc||0).toLocaleString()}</span></div></div></div>`;});
  if(!d.length)h+='<i>No scores yet. Be the first!</i>';h+='</div>';}
 else{const t={};for(const r of d){if(!r.fa)continue;const o=t[r.fa]=t[r.fa]||{sc:0,cnt:0,top:null};o.sc+=r.sc||0;o.cnt++;if(!o.top)o.top=r;}
  const fs=FACTIONS.map(x=>({f:x,o:t[x.k]||{sc:0,cnt:0,top:null}})).sort((a,b)=>b.o.sc-a.o.sc);h+='<div class="card">';
  fs.forEach(({f:x,o},i)=>{h+=`<div class="row"><span class="nm"><b style="display:inline-block;width:30px;color:${i===0?'#ffd76a':'#a99cc0'}">#${i+1}</b><span style="color:${x.c};font-size:16px">${x.e} ${x.n}</span><i>${o.cnt} player${o.cnt===1?'':'s'}${o.top?' · Top: '+o.top.n+' (Lv '+o.top.l+')':''}</i></span><b style="color:#ffd76a">${o.sc.toLocaleString()}</b></div>`;});
  h+='</div><i style="color:#a99cc0;font-size:11px">Faction score = total of all its members\' best scores.</i>';}
 return h;}
/* ================= AUDIO (synthesized, no files) ================= */
let AC=null,mG,sG,noiseBuf,musicState={act:-1,boss:false,on:false,phase2:false},musicTimer=null,nextStep=0,step=0,duck=0;
function audioUnlock(){if(!AC)return;if(AC.state!=='running')AC.resume().catch(()=>{});if(!AC._unlocked){try{const b=AC.createBuffer(1,1,22050),src=AC.createBufferSource();src.buffer=b;src.connect(AC.destination);src.start(0);AC._unlocked=1;}catch(e){}}}
['touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(AC)audioUnlock();},true));
function audioStart(){if(AC){audioUnlock();return;}try{try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}AC=new (window.AudioContext||window.webkitAudioContext)();mG=AC.createGain();mG.gain.value=.35;mG.connect(AC.destination);sG=AC.createGain();sG.gain.value=.6;sG.connect(AC.destination);
 noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 audioUnlock();musicTimer=setInterval(musicTick,40);if(S&&G.mode==='game')musicFor(S.ch,!!G.bossFight||!!G.surv);else if(G.mode!=='title'||true)musicFor(-1,false);}catch(e){AC=null;}}
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else AC.resume().catch(()=>{});});
const sfxOn=()=>AC&&(!S||S.sfx);
function osc(type,f,t0,dur,vol,o){o=o||{};const os=AC.createOscillator();os.type=type;os.frequency.setValueAtTime(f,t0);if(o.f2!==undefined)os.frequency.exponentialRampToValueAtTime(Math.max(1,o.f2),t0+(o.ft||dur));const g=AC.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+(o.a||.005));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 let last=os;if(o.lp){const fl=AC.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;os.connect(fl);last=fl;}last.connect(g);g.connect(o.dest||sG);os.start(t0);os.stop(t0+dur+.05);return os;}
function noise(t0,dur,vol,o){o=o||{};const src=AC.createBufferSource();src.buffer=noiseBuf;src.loop=true;const fl=AC.createBiquadFilter();fl.type=o.type||'bandpass';fl.frequency.setValueAtTime(o.f||1200,t0);if(o.f2)fl.frequency.exponentialRampToValueAtTime(o.f2,t0+dur);fl.Q.value=o.q||.8;const g=AC.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+(o.a||.01));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);src.connect(fl);fl.connect(g);g.connect(o.dest||sG);src.start(t0);src.stop(t0+dur+.05);}
const sfxLast={};
function sfx(n){if(!sfxOn())return;const t=AC.currentTime;if(sfxLast[n]&&t-sfxLast[n]<.04)return;sfxLast[n]=t;const r=(a,b)=>a+Math.random()*(b-a);
 switch(n){
  case 'swing':noise(t,.22,.55,{f:350,f2:1600,q:4,type:'bandpass'});noise(t+.04,.14,.35,{f:4500,f2:1500,q:1.5,type:'highpass'});osc('sine',900,t+.02,.12,.06,{f2:300});break;
  case 'whiff':noise(t,.2,.35,{f:300,f2:1200,q:4});noise(t+.03,.12,.2,{f:3500,f2:1200,type:'highpass'});break;
  case 'heavyswing':noise(t,.38,.7,{f:200,f2:900,q:5});noise(t+.08,.2,.3,{f:2500,f2:600,type:'highpass'});break;
  case 'heavywind':osc('sine',80,t,.35,.25,{f2:160});noise(t,.3,.2,{f:300,f2:900});break;
  case 'hit':noise(t,.05,.9,{f:4000,f2:1500,type:'highpass'});noise(t,.14,.6,{f:700,f2:200,q:1.5});osc('sine',180,t,.14,.6,{f2:50});osc('triangle',2300+r(-200,200),t,.18,.12,{f2:1900});osc('triangle',3700,t,.12,.06,{f2:3100});break;
  case 'heavyhit':noise(t,.06,1,{f:3500,f2:1200,type:'highpass'});noise(t,.28,.8,{f:500,f2:120,q:1.2});osc('sine',120,t,.3,.9,{f2:32});osc('triangle',1900,t,.3,.15,{f2:1500});osc('sawtooth',90,t,.2,.2,{f2:40,lp:300});break;
  case 'crit':osc('square',880,t,.15,.25,{f2:1760});osc('sine',1320,t,.3,.3);noise(t,.12,.5,{f:3000,f2:800});break;
  case 'parry':osc('sine',2100,t,.35,.5,{f2:1800});osc('sine',3150,t,.25,.3);osc('triangle',700,t,.15,.3,{f2:400});noise(t,.08,.6,{f:5000,type:'highpass'});break;
  case 'parrywind':noise(t,.08,.25,{f:2500,f2:4000});break;
  case 'block':osc('triangle',500,t,.12,.4,{f2:300});noise(t,.08,.4,{f:2500,f2:900});break;
  case 'guardbreak':osc('square',300,t,.25,.35,{f2:80});noise(t,.2,.7,{f:3500,f2:600});break;
  case 'stagger':osc('sawtooth',200,t,.5,.3,{f2:60,lp:800});noise(t,.3,.3,{f:400,f2:100});break;
  case 'roll':noise(t,.28,.4,{f:400,f2:900,type:'lowpass'});break;
  case 'hurt':osc('sawtooth',320,t,.18,.35,{f2:110,lp:1200});noise(t,.1,.3,{f:900,f2:300});break;
  case 'hurtbig':osc('sawtooth',260,t,.35,.5,{f2:60,lp:900});noise(t,.25,.6,{f:700,f2:150});break;
  case 'death':osc('sawtooth',300,t,1.4,.4,{f2:40,lp:900});osc('sine',150,t,1.6,.4,{f2:30});noise(t,.8,.3,{f:600,f2:80});break;
  case 'draw':noise(t,.2,.25,{f:1500,f2:3000,q:3});break;
  case 'arrow':noise(t,.18,.45,{f:2500,f2:600,q:2});osc('sine',1800,t,.08,.15,{f2:900});break;
  case 'bolt':osc('sine',500,t,.22,.35,{f2:1500});osc('square',250,t,.15,.1,{f2:800});noise(t,.1,.2,{f:3000});break;
  case 'ebolt':osc('sawtooth',400,t,.3,.25,{f2:1200,lp:2000});noise(t,.15,.2,{f:2000,f2:800});break;
  case 'cast':for(let i=0;i<4;i++)osc('sine',600*Math.pow(1.26,i),t+i*.05,.25,.2);break;
  case 'buff':for(let i=0;i<5;i++)osc('triangle',440*Math.pow(1.19,i),t+i*.07,.35,.25);break;
  case 'heal':[523,659,784,1047].forEach((f,i)=>osc('sine',f,t+i*.06,.7,.2));break;
  case 'aoe':osc('sine',120,t,.5,.8,{f2:30});noise(t,.45,.7,{f:900,f2:150});break;
  case 'deny':osc('square',140,t,.08,.15);osc('square',110,t+.1,.12,.15);break;
  case 'ui':osc('sine',900,t,.06,.15,{f2:1200});break;
  case 'tell':osc('square',1800,t,.05,.12);noise(t,.04,.2,{f:6000,type:'highpass'});break;
  case 'pickup':osc('sine',880,t,.12,.2);osc('sine',1320,t+.08,.2,.2);break;
  case 'gold':[880,1108,1320].forEach((f,i)=>osc('triangle',f,t+i*.08,.3,.25));break;
  case 'stier':[660,880,1108,1320,1760].forEach((f,i)=>{osc('square',f,t+i*.1,.4,.15);osc('sine',f/2,t+i*.1,.5,.2);});noise(t,.5,.3,{f:2000,f2:6000});break;
  case 'levelup':[523,659,784,1047,1319].forEach((f,i)=>{osc('triangle',f,t+i*.09,.6,.25);osc('sine',f*2,t+i*.09,.3,.08);});break;
  case 'drink':for(let i=0;i<4;i++)osc('sine',300+i*60,t+i*.12,.1,.25,{f2:200+i*60});break;
  case 'potion':for(let i=0;i<3;i++)osc('sine',500+i*120,t+i*.09,.12,.2,{f2:350});osc('sine',1200,t+.3,.3,.15);break;
  case 'rest':[262,330,392,523].forEach((f,i)=>osc('triangle',f,t,2.2,.12,{a:.6}));osc('sine',1047,t+.4,1.5,.1,{a:.3});break;
  case 'quest':[784,988,1175].forEach((f,i)=>osc('sine',f,t+i*.12,.5,.25));break;
  case 'gate':noise(t,1.4,.4,{f:200,f2:1200,type:'lowpass'});[392,494,587,784].forEach((f,i)=>osc('triangle',f,t+.4+i*.15,.9,.18));break;
  case 'shrine':osc('sine',1047,t,1.6,.3,{f2:1040});osc('sine',1568,t+.05,1.2,.15);osc('triangle',523,t,1,.2);break;
  case 'eswing':noise(t,.26,.5,{f:250,f2:1100,q:4});noise(t+.05,.12,.2,{f:3000,f2:900,type:'highpass'});break;
  case 'eheavy':noise(t,.35,.6,{f:400,f2:90});osc('sine',90,t,.3,.4,{f2:40});break;
  case 'slam':osc('sine',90,t,.5,.9,{f2:28});noise(t,.4,.7,{f:500,f2:80,type:'lowpass'});break;
  case 'charge':noise(t,.9,.4,{f:200,f2:2500});osc('sawtooth',60,t,.9,.2,{f2:200,lp:600});break;
  case 'mobdie':noise(t,.3,.4,{f:800,f2:120});osc('sawtooth',280,t,.35,.2,{f2:60,lp:800});break;
  case 'bossdie':osc('sine',80,t,2,.8,{f2:20});noise(t,1.6,.6,{f:600,f2:60,type:'lowpass'});osc('sawtooth',200,t,1.5,.3,{f2:30,lp:500});break;
  case 'wave':[220,277,330].forEach((f,i)=>osc('sawtooth',f,t+i*.05,1,.12,{lp:1200,a:.1}));break;
  case 'forge':osc('sine',2400,t,.3,.3,{f2:2300});osc('sine',3600,t,.2,.15);noise(t,.05,.5,{f:4000});osc('sine',2400,t+.25,.3,.25);noise(t+.25,.05,.4,{f:4000});break;
  case 'roar_grunt':osc('sawtooth',110,t,.7,.5,{f2:70,lp:700});noise(t,.6,.4,{f:300,f2:120});break;
  case 'roar_deep':osc('sawtooth',70,t,1.4,.6,{f2:45,lp:500});osc('sine',55,t,1.5,.6,{f2:30});noise(t,1.2,.5,{f:250,f2:80,type:'lowpass'});break;
  case 'roar_screech':osc('sawtooth',1400,t,.9,.3,{f2:500,lp:3000});noise(t,.8,.5,{f:3000,f2:900,q:2});break;
  case 'roar_dragon':osc('sawtooth',90,t,1.5,.5,{f2:50,lp:600});osc('sawtooth',900,t+.2,.8,.2,{f2:350,lp:2500});noise(t,1.3,.6,{f:400,f2:100});break;
  case 'roar_demon':osc('sawtooth',50,t,2,.7,{f2:35,lp:400});osc('square',65,t,1.8,.3,{f2:40,lp:300});noise(t,1.6,.6,{f:200,f2:60,type:'lowpass'});osc('sawtooth',700,t+.3,1,.15,{f2:200,lp:1500});break;
  case 'roar_whisper':noise(t,1.6,.5,{f:600,f2:2500,q:3});osc('sine',440,t,1.5,.15,{f2:220});break;
  case 'ending':[262,330,392,523,659,784].forEach((f,i)=>osc('triangle',f,t+i*.15,2.5,.15));break;
 }}
/* ---- music ---- */
const SCALES={maj:[0,2,4,5,7,9,11],min:[0,2,3,5,7,8,10],phr:[0,1,3,5,7,8,10],dor:[0,2,3,5,7,9,10]};
const THEMES=[{root:50,sc:'maj',prog:[0,4,5,3],bpm:76},{root:52,sc:'phr',prog:[0,1,0,6],bpm:84},{root:57,sc:'min',prog:[0,5,3,4],bpm:70},{root:48,sc:'min',prog:[0,6,5,4],bpm:74},{root:42,sc:'phr',prog:[0,1,5,4],bpm:80},{root:45,sc:'min',prog:[0,5,3,4],bpm:64}];
const mtf=m=>440*Math.pow(2,(m-69)/12);
function musicFor(ch,boss){if(!AC)return;const act=ch<0?5:Math.floor(ch/4)%5;musicState.act=act;musicState.boss=boss;musicState.on=!S||!!S.music;musicState.phase2=false;if(!musicState.on){mG.gain.setTargetAtTime(0,AC.currentTime,.3);}else mG.gain.setTargetAtTime(boss?.42:.3,AC.currentTime,.8);}
function musicPhase2(){musicState.phase2=true;}
function musicDuck(sec){if(!AC)return;duck=sec;mG.gain.setTargetAtTime(.08,AC.currentTime,.1);setTimeout(()=>{if(AC&&musicState.on)mG.gain.setTargetAtTime(musicState.boss?.42:.3,AC.currentTime,1);},sec*1000);}
function musicTick(){if(!AC||!musicState.on||musicState.act<0)return;const th=THEMES[musicState.act];const bpm=musicState.boss?(musicState.phase2?148:136):th.bpm;const spb=60/bpm/4;
 while(nextStep<AC.currentTime+.18){playStep(step,nextStep,th,spb);step++;nextStep+=spb;}if(nextStep<AC.currentTime-1)nextStep=AC.currentTime;}
function playStep(s,t,th,spb){const sc=SCALES[th.sc];const bar=Math.floor(s/16),pos=s%16;const deg=th.prog[bar%4];const chordRoot=th.root+sc[deg%7]+(deg>=7?12:0);const nt=i=>{const d=deg+i;return th.root+sc[d%7]+Math.floor(d/7)*12;};const boss=musicState.boss,ph2=musicState.phase2;
 if(pos===0){// pad chord
  [nt(0),nt(2),nt(4),nt(0)+12].forEach((m,i)=>{const dur=spb*16*1.05;const o=AC.createOscillator();o.type=boss?'sawtooth':'triangle';o.frequency.value=mtf(m-(i===3?0:12));const o2=AC.createOscillator();o2.type='sawtooth';o2.frequency.value=mtf(m-12)*1.004;const fl=AC.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(boss?900:500,t);fl.frequency.linearRampToValueAtTime(boss?1400:800,t+dur*.5);fl.frequency.linearRampToValueAtTime(400,t+dur);const g=AC.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(boss?.05:.045,t+(boss?.3:1.2));g.gain.setValueAtTime(boss?.05:.045,t+dur*.7);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(fl);o2.connect(fl);fl.connect(g);g.connect(mG);o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1);});}
 // bass
 if(boss?(pos%2===0):(pos===0||pos===8)){const m=chordRoot-24+(boss&&pos%8===6?7:0);osc('triangle',mtf(m),t,boss?spb*1.8:spb*7,boss?.22:.16,{dest:mG,a:.01});if(boss)osc('sawtooth',mtf(m),t,spb*1.5,.06,{dest:mG,lp:300});}
 // arp / lead
 const arpP=boss?(ph2?.7:.5):.22;if(pos%2===0&&Math.random()<arpP){const i=[0,2,4,7,9,11,14][Math.floor(Math.random()*(boss?7:5))];const m=nt(i)+(boss?0:12);osc(boss?'square':'sine',mtf(m),t,spb*(boss?1.5:5),boss?.045:.07,{dest:mG,a:.01,lp:boss?2500:0});}
 // drums
 if(boss){if(pos%4===0||(ph2&&pos%8===6)){osc('sine',150,t,.25,.9,{f2:40,dest:mG});noise(t,.05,.3,{f:200,dest:mG,type:'lowpass'});}
  if(pos%8===4){noise(t,.18,.5,{f:1800,dest:mG,q:.6});osc('triangle',220,t,.12,.3,{f2:150,dest:mG});}
  if(pos%2===0||ph2)noise(t,.04,pos%4===2?.18:.1,{f:8000,type:'highpass',dest:mG});}
 else if(th.bpm&&pos%8===0&&Math.random()<.35){noise(t,.6,.05,{f:300,f2:120,type:'lowpass',dest:mG,a:.1});}
}
/* ================= ONLINE (Firebase) ================= */
const FBCFG={apiKey:"AIzaSyA5T8B0E9rpGpRHB7ByxpCikN0q-c2u2DU",authDomain:"shadow-oath.firebaseapp.com",databaseURL:"https://shadow-oath-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"shadow-oath",storageBucket:"shadow-oath.firebasestorage.app",messagingSenderId:"238771942168",appId:"1:238771942168:web:0a92e39f7a57614158e46d"};
const FB={avail:false,probed:false,ready:false,user:null,uid:null,name:'',db:null,saves:[null,null,null],lastCore:['','',''],busy:{},pend:{},off:0,myBest:0,lbT:0,online:true,pres:{},presT:0};
const NET={on:false,host:false,ch:-1,peers:{},subs:[],mid:0,lastP:'',pT:0,pK:0,mT:0,hbT:0,chkT:0,cleanT:0,bossT:0,infoDirty:true,lastMobs:'',diff:null,hostUid:null,base:null,me:null,duel:null,duelReq:null};
const isPuppet=()=>NET.on&&!NET.host;
const sNow=()=>Date.now()+FB.off;
const PST=['idle','move','light','heavy','roll','parry','cast','drink','stun','dead','guard'];
const PDUR={light:.5,heavy:.95,roll:.5,parry:.65,cast:.55,drink:.95,stun:.3};
const UNAME_RE=/^[A-Za-z0-9_]{3,12}$/;
const unameEmail=u=>u.toLowerCase()+'@players.shadowoath.game';
function netMid(){return (FB.uid?FB.uid.slice(0,4):'x')+'_'+(++NET.mid).toString(36);}

/* ---------- init / auth ---------- */
async function fbInit(){
 if(typeof firebase==='undefined'){FB.probed=true;refreshAcct();return;}
 try{const r=await withTimeout(fetch(FBCFG.databaseURL+'/lb.json?orderBy=%22$key%22&limitToFirst=1',{cache:'no-store'}),7000);if(!r)throw 0;}catch(e){FB.avail=false;FB.probed=true;refreshAcct();return;}
 try{firebase.initializeApp(FBCFG);FB.db=firebase.database();}catch(e){FB.avail=false;FB.probed=true;refreshAcct();return;}
 FB.avail=true;FB.probed=true;FB.online=(()=>{try{return localStorage.getItem('so_online')!=='0'}catch(e){return true}})();
 FB.db.ref('.info/serverTimeOffset').on('value',s=>FB.off=s.val()||0);
 firebase.auth().onAuthStateChanged(async u=>{
  FB.ready=false;FB.busy={};FB.pend={};FB.lastCore=['','',''];FB.saveState={};FB.savesLoaded=false;FB.user=u;FB.uid=u?u.uid:null;
  if(u){FB.name=u.displayName||u.email.split('@')[0];try{localStorage.setItem(PKEY,FB.name)}catch(e){}
   try{const s=await withTimeout(FB.db.ref('lb/'+u.uid+'/sc').once('value'),8000);FB.myBest=s.val()||0;}catch(e){}
   await fbLoadSaves();NET.party=FB.partyMode?u.uid:null;presenceStart();socialStart();
   if(G.mode==='game'&&S)netJoin(S.ch);
  }else{FB.name='';FB.saves=[null,null,null];netLeave();presenceStop();socialStop();}
  FB.ready=true;refreshAcct();refreshTitle();});
 refreshAcct();
}
function authErr(e){const c=(e&&e.code)||'';if(c.includes('email-already-in-use'))return 'That username is already taken.';if(c.includes('weak-password'))return 'Password must be at least 6 characters.';
 if(c.includes('requires-recent-login'))return 'Please log in again before changing your password.';if(c.includes('wrong-password')||c.includes('invalid-credential')||c.includes('user-not-found')||c.includes('invalid-login'))return 'Wrong username or password.';if(c.includes('network'))return 'No internet connection.';if(c.includes('too-many'))return 'Too many tries. Wait a minute and try again.';return 'Something went wrong ('+(c||'error')+').';}
async function fbLogin(name,pw){await firebase.auth().signInWithEmailAndPassword(unameEmail(name),pw);}
async function fbRegister(name,pw){const cr=await firebase.auth().createUserWithEmailAndPassword(unameEmail(name),pw);await cr.user.updateProfile({displayName:name});FB.name=name;
 try{await FB.db.ref('users/'+cr.user.uid).set({n:name,t:firebase.database.ServerValue.TIMESTAMP});}catch(e){}}
async function fbLogout(){netLeave();presenceStop();await firebase.auth().signOut();}
async function loginDialog(){const ok=await accountDialog({login:fbLogin,register:fbRegister,errorText:authErr});if(ok){toast('Signed in. Checking your account saves…',2200);sfx('quest');}return ok;}
function refreshAcct(){const a=$('#acct');if(!a)return;
 if(!FB.probed){a.innerHTML='<span style="opacity:.6">Connecting...</span>';return;}
 if(!FB.avail){a.innerHTML='<span style="opacity:.7">Online services are unavailable right now. You can still play solo on this device.</span>';$('#bNet')&&($('#bNet').style.display='none');return;}
 if(FB.user)a.innerHTML=`🌐 Signed in as <b style="color:#8fe3b0">${FB.name}</b> · <a href="#" id="lgOut" style="color:#c9b6e8">Log out</a>`;
 else a.innerHTML=`<button class="btn ghost" id="lgIn" style="margin:2px auto;padding:8px;font-size:14px">🔑 Log in / Create account</button>`;
 const li=$('#lgIn');if(li)li.onclick=async()=>{audioStart();if(await loginDialog())await afterLogin();};
 const lo=$('#lgOut');if(lo)lo.onclick=async e=>{e.preventDefault();if(await ask('Log out of '+FB.name+'?',['Log out','Cancel'])===0){await fbLogout();refreshTitle();}};
 if($('#bNet'))$('#bNet').style.display=FB.user?'':'none';}
async function afterLogin(){await new Promise(r=>{const t0=Date.now();const iv=setInterval(()=>{if(FB.uid&&FB.ready||Date.now()-t0>8000){clearInterval(iv);r();}},100);});
 if(FB.uid&&!FB.savesLoaded)toast('Account saves could not be checked. Device saves are unchanged; reconnect and log in again to retry.',3500);
 if(FB.uid&&FB.savesLoaded&&!FB.saves.some(Boolean)){const guest=[0,1,2].map(i=>{try{const j=localStorage.getItem(i?SKEY+'_'+i:SKEY);return j?JSON.parse(j):null}catch(e){return null}});
  if(guest.some(Boolean)&&await ask('Copy your offline save slots into this account?<br><small>Upload copies so you can continue after logging in elsewhere. Your guest saves stay on this device.</small>',['Copy saves','Keep separate'])===0){
   let failed=0;for(let i=0;i<3;i++)if(guest[i]){const j=JSON.stringify(guest[i]);try{localStorage.setItem(skey(i),j)}catch(e){}FB.saves[i]=guest[i];try{await FB.db.ref('saves/'+FB.uid+'/'+i).set({save:j,ts:Date.now(),lv:guest[i].lv})}catch(e){failed++;}}toast(failed?'Device copies kept; '+failed+' cloud upload(s) failed. Your guest saves are unchanged.':'Save copies uploaded to your account.',3500);}}
 refreshTitle();}

/* ---------- cloud saves ---------- */
async function fbLoadSaves(){FB.savesLoaded=false;if(!FB.uid)return;const saveUser=FB.uid;try{const s=await withTimeout(FB.db.ref('saves/'+FB.uid).once('value'),10000);if(FB.uid!==saveUser)return;const v=s.val()||{};let valid=true;for(let i=0;i<3;i++){try{FB.saves[i]=v[i]?JSON.parse(v[i].save):null;}catch(e){FB.saves[i]=null;valid=false;}}FB.savesLoaded=valid;}catch(e){}}
function fbSave(slot,j,core){if(!FB.uid||!FB.db)return;if(core===FB.lastCore[slot])return;FB.saveState=FB.saveState||{};FB.saveState[slot]='pending';if(FB.busy[slot]){FB.pend[slot]=[j,core];return;}FB.busy[slot]=1;const saveUser=FB.uid;
 FB.db.ref('saves/'+FB.uid+'/'+slot).set({save:j,ts:Date.now(),lv:S?S.lv:0}).then(()=>{if(FB.uid!==saveUser)return;FB.lastCore[slot]=core;FB.saves[slot]=JSON.parse(j);FB.saveState[slot]='synced';}).catch(()=>{if(FB.uid===saveUser)FB.saveState[slot]='error';}).finally(()=>{if(FB.uid!==saveUser)return;FB.busy[slot]=0;const p=FB.pend[slot];if(p){FB.pend[slot]=null;fbSave(slot,p[0],p[1]);}});}
function fbDelete(slot){if(!FB.uid)return;FB.saves[slot]=null;FB.lastCore[slot]='';FB.db.ref('saves/'+FB.uid+'/'+slot).remove().catch(()=>{});}

/* ---------- leaderboard ---------- */
function calcScore(s){s=s||S;const cl=(s.cleared||[]).reduce((a,b)=>a+(b?1:0),0);const dg=Object.values(s.dgc||{}).reduce((a,b)=>a+b,0);return Math.round((s.lv*100+cl*500+(s.bk||0)*250+(s.ngp||0)*6000+(s.pvw||0)*150+dg*400)*[.5,1,1.5][s.diff!=null?s.diff:2]);}
// basic sanity check so edited saves don't climb the leaderboard
function plausible(s){const cl=(s.cleared||[]).filter(Boolean).length,dg=Object.values(s.dgc||{}).reduce((a,b)=>a+b,0),ng=s.ngp||0;
 return s.lv<=LV_MAX&&cl<=CHS.length&&(s.bk||0)<=200000&&(s.pvw||0)<=20000&&Object.values(s.st||{}).every(v=>v<=150+20)&&(s.items||[]).every(i=>i.ref<=REF_MAX&&i.tier<=6);}
function lbUpdate(){if(!FB.uid||!S)return;if(!plausible(S)){if(!FB.flagged){FB.flagged=1;console.warn('score not posted: save looks edited');toast('⚠️ Leaderboard: this save could not be posted',2500);}return;}let sc=calcScore();if(sc<=FB.myBest&&FB.lbJ===(S.job||0))return;FB.lbJ=S.job||0;sc=Math.max(sc,FB.myBest||0);FB.myBest=sc;
 FB.db.ref('lb/'+FB.uid).set({n:FB.name,fa:S.fac||'',c:S.cls,j:S.job||0,l:S.lv,sc,d:S.diff!=null?S.diff:2,bk:S.bk||0,cl:(S.cleared||[]).filter(Boolean).length,ng:S.ngp||0,pv:S.pvw||0,dg:Object.values(S.dgc||{}).reduce((a,b)=>a+b,0),t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});}

/* ---------- presence ---------- */
let presRef=null,presCb=null,presConnCb=null;
function presenceStart(){if(!FB.uid)return;presRef=FB.db.ref('presence/'+FB.uid);
 presConnCb=FB.db.ref('.info/connected').on('value',s=>{if(s.val()){presRef.onDisconnect().remove();presenceUpdate();}});
 presCb=FB.db.ref('presence').on('value',s=>{const v=s.val()||{},now=sNow();FB.pres={};for(const k in v)if(v[k]&&now-(v[k].t||0)<150000)FB.pres[k]=v[k];if(menuOpen&&(G.tab==='online'||G.tab==='map'))softRender();hudNet();});}
function presenceStop(){if(presRef){presRef.remove().catch(()=>{});presRef=null;}if(presCb){FB.db.ref('presence').off('value',presCb);presCb=null;}if(presConnCb){FB.db.ref('.info/connected').off('value',presConnCb);presConnCb=null;}FB.pres={};}
function presenceUpdate(){if(!presRef)return;const g=G.mode==='game'&&S;presRef.set({n:FB.name,fa:g?S.fac||'':'',c:g?S.cls:'',j:g?S.job||0:0,l:g?S.lv:0,ch:g?S.ch:-1,w:g&&NET.on?NET.key:'',pv:FB.partyMode?1:0,fr:Object.keys(FB.friends||{}).slice(0,60),pt:FB.pt||null,t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});}
function hudNet(){const n=Object.keys(FB.pres||{}).length;const e=$('#netN');if(e)e.textContent=n;}

/* ---------- world join/leave ---------- */
function sub(ref,ev,fn){ref.on(ev,fn);NET.subs.push([ref,ev,fn]);}
function netJoin(c){netLeave();if(prologueActive())return;if(!FB.uid||!FB.online||!FB.avail||!S)return;
 NET.on=true;NET.ch=c;NET.host=false;NET.peers={};NET.lastMobs='';NET.lastP='';NET.infoDirty=true;NET.diff=null;NET.hostUid=null;NET.gotSnap=false;NET.duel=null;NET.joinT=sNow();
 NET.key=netKey(c);const base=NET.base=FB.db.ref('world/'+NET.key);NET.sent={};NET.me=base.child('pl/'+FB.uid);NET.me.onDisconnect().remove();
 const pl=base.child('pl');sub(pl,'child_added',s=>peerAdd(s.key,s.val()));sub(pl,'child_changed',s=>peerUpd(s.key,s.val()));sub(pl,'child_removed',s=>peerDel(s.key));
 sub(base.child('host'),'value',s=>hostChanged(s.val()));
 sub(base.child('mobs'),'value',s=>{NET.gotSnap=true;NET.snap=s.val()||{};if(!NET.host)applyMobs(NET.snap);});
 sub(base.child('meta/al'),'value',s=>alliesFromNet(s.val()));
 sub(base.child('meta'),'value',s=>{const v=s.val();NET.meta=v;if(v&&v.tw&&G.dg&&G.dg.tower&&!NET.host&&G.dg.floor!==v.tw.f){G.dg.floor=v.tw.f;G.dg.st=v.tw.st==='portal'?'fight':v.tw.st;twLabel();}NET.diff=v&&v.diff!=null?v.diff:null;});
 sub(base.child('ev').orderByChild('t').startAt(sNow()-1500),'child_added',s=>{const e=s.val();if(!e||e.u===FB.uid)return;if(e.to&&e.to!==FB.uid)return;try{applyEv(e);}catch(err){console.warn(err);}});
 sub(base.child('hits'),'child_added',s=>{if(!NET.host)return;const h=s.val();s.ref.remove().catch(()=>{});try{hostApplyHit(h);}catch(err){}});
 netSendInfo();netSendPos(true);presenceUpdate();setTimeout(()=>{if(NET.on&&!NET.hostUid)tryClaimHost();},400);}
function netLeave(){if(!NET.on&&!NET.subs.length)return;for(const [r,e,f] of NET.subs)r.off(e,f);NET.subs=[];
 if(NET.me){NET.me.remove().catch(()=>{});NET.me.onDisconnect().cancel();}
 if(NET.host&&NET.base){const hr=NET.base.child('host');hr.onDisconnect().cancel();hr.transaction(c=>c&&c.uid===FB.uid?null:undefined).catch(()=>{});}
 for(const uid in NET.peers)peerDel(uid);for(const n in G.rallies)allyRemove(G.rallies[n]);G.rallies={};NET.on=false;NET.host=false;NET.me=null;NET.base=null;NET.duel=null;NET.diff=null;}
function netEmit(ev){if(!NET.on||!NET.base)return;ev.u=FB.uid;ev.t=firebase.database.ServerValue.TIMESTAMP;NET.base.child('ev').push(ev).catch(()=>{});}
function netHit(h){if(!NET.on||!NET.base)return;h.u=FB.uid;NET.base.child('hits').push(h).catch(()=>{});}

/* ---------- host election ---------- */
function tryClaimHost(){if(!NET.on||!NET.base)return;NET.base.child('host').transaction(cur=>{const now=sNow();if(!cur||cur.uid===FB.uid||now-(cur.ts||0)>9000)return {uid:FB.uid,n:FB.name,ts:now};return;},(err,ok,snap)=>{if(err||!ok)return;const v=snap.val();if(v&&v.uid===FB.uid&&!NET.host)becomeHost();},false);}
function hostChanged(v){NET.hostUid=v?v.uid:null;NET.hostTs=v?v.ts:0;if(v&&v.uid===FB.uid){if(!NET.host)becomeHost();}else{if(NET.host)loseHost();if(!v)setTimeout(()=>{if(NET.on&&!NET.hostUid)tryClaimHost();},200+Math.random()*600);}}
async function becomeHost(){if(NET.host||!NET.on)return;NET.host=true;const hr=NET.base.child('host');hr.onDisconnect().remove();
 if(G.dg&&G.dg.tower&&NET.meta&&NET.meta.tw){G.dg.floor=NET.meta.tw.f;G.dg.st=NET.meta.tw.st==='portal'?'portal':'wait';G.dg.t=0;}
 const md=NET.meta&&NET.meta.diff!=null&&NET.gotSnap&&NET.snap&&Object.keys(NET.snap).length?NET.meta.diff:(S.diff!=null?S.diff:2);if(G.dg)dgAdopt(NET.meta);NET.base.child('meta').update({diff:md,hn:FB.name}).catch(()=>{});NET.diff=md;NET.sent={};
 let snap=NET.gotSnap?NET.snap:null;if(!snap){try{const s=await withTimeout(NET.base.child('mobs').once('value'),6000);snap=s.val();}catch(e){snap=null;}}
 if(snap&&Object.keys(snap).length){applyMobs(snap);for(const m of G.mobs){m.nx=null;if(m.wave||m.add||m.boss)m.agg=true;}}
 else if(!G.dg&&!G.mobs.filter(m=>!m.dead).length){for(let i=0;i<mobMax();i++)spawnMob(false);fieldEncounter();}
 for(const m of G.mobs){if(!m.id)m.id=netMid();m.cd=rnd(.5,1.5);if(m.boss&&!m.baseMhp){const n=Math.max(1,players().filter(p=>p.ar).length);m.coopN=n;m.baseMhp=Math.round(m.mhp/(1+.7*(n-1)));}}
 log('🌐 You are hosting this area');}
function loseHost(){NET.host=false;if(NET.base)NET.base.child('host').onDisconnect().cancel();}

/* ---------- my player data ---------- */
function myLook(){const eq=eqItems();const o={hk:S.hero,cu:S.cust||null,j:S.job||0};for(const k of ['w','a','h','s','l','f']){const it=eq[k];if(it)o[k]=[it.tier,it.rar,it.ref];}return o;}
function netSendInfo(){if(!NET.me)return;NET.infoDirty=false;const eq=eqItems();
 NET.me.child('i').set({n:FB.name,fa:S.fac||'',c:S.cls,j:S.job||0,l:S.lv,lk:myLook(),g:EQSLOTS.filter(k=>eq[k]).map(k=>[eq[k].rar,SLOTI[k]+' '+iName(eq[k]),iStat(eq[k]).replace(/<[^>]+>/g,'')]),pw:S.pvw||0}).catch(()=>{});}
function netSendPos(force){if(!NET.me)return;const st=Math.max(0,PST.indexOf(hero.dead?'dead':hero.state));
 const p=[Math.round(hero.x*10),Math.round(hero.z*10),Math.round(hero.face*100),st,hero.combo||0,Math.round(100*Math.max(0,hero.hp)/(G.st?G.st.mhp:1)),G.bossFight?1:0,hero.dead?1:0,Math.floor(sNow()/2000)%1000];
 const k=p.join(',');if(!force&&k.slice(0,k.lastIndexOf(','))===NET.lastP.slice(0,NET.lastP.lastIndexOf(','))&&NET.pK<2)return;NET.lastP=k;NET.pK=0;NET.me.child('p').set(p).catch(()=>{});}
function netEmote(e){if(!NET.me)return;NET.me.child('e').set({e,t:sNow()}).catch(()=>{});bubble(hero,e);}

/* ---------- peers ---------- */
function peerAdd(uid,v){if(uid===FB.uid||NET.peers[uid])return;NET.peers[uid]={uid,r:.5,x:null,z:null,face:0,state:'idle',actT:0,actDur:1,moveAmt:0,combo:0,hp:100,ar:0,dead:0,model:null,lk:'',info:null,ch:NET.ch};peerUpd(uid,v);
 if(v&&v.i&&G.t>3)log(`🌐 ${v.i.n} entered the area`);}
function peerUpd(uid,v){const p=NET.peers[uid];if(!p||!v)return;
 if(v.i){p.info=v.i;const lk=JSON.stringify([v.i.lk,v.i.c]);if(lk!==p.lk){p.lk=lk;peerBuild(p);}}
 if(v.p){p.lastT=Date.now();const a=v.p;const nx=a[0]/10,nz=a[1]/10;if(p.x==null){p.x=nx;p.z=nz;p.face=a[2]/100;}p.tx=nx;p.tz=nz;p.tf=a[2]/100;
  const st=PST[a[3]]||'idle';if(st!==p.state||(st==='light'&&a[4]!==p.combo)){p.state=st;p.actT=0;p.actDur=PDUR[st]||1;p.hitDone=false;}
  p.combo=a[4];p.hp=a[5];p.ar=a[6];const wasDead=p.dead;p.dead=a[7];if(p.dead&&!wasDead&&NET.duel&&!NET.duel.team&&NET.duel.uid===p.uid)duelEnd(true);}
 if(v.e&&v.e.t!==p.lastE){p.lastE=v.e.t;if(sNow()-v.e.t<6000&&p.x!=null)bubble(p,v.e.e);}}
function peerDel(uid){const p=NET.peers[uid];if(!p)return;if(p.model)world.remove(p.model.root);if(p.lbl)p.lbl.remove();if(p.bub)p.bub.remove();delete NET.peers[uid];if(NET.duel&&!NET.duel.team&&NET.duel.uid===uid)duelEnd(null,'Opponent left');if(NET.duel&&NET.duel.team){NET.duel.outs[uid]=1;teamCheck();}}
function peerBuild(p){if(p.model)world.remove(p.model.root);const i=p.info||{};const lk=i.lk||{};const eq={};for(const k of ['w','a','h','s','l','f'])if(lk[k])eq[k]={slot:k,tier:lk[k][0],rar:lk[k][1],ref:lk[k][2]};
 p.cls=CLASSES[i.c]?i.c:'knight';p.model=buildHero(lk.hk||'L',p.cls,eq,{cust:lk.cu||null,job:lk.j||0});world.add(p.model.root);
 if(!p.lbl){p.lbl=document.createElement('div');p.lbl.className='lbl';$('#fl').appendChild(p.lbl);}}
function peersUpdate(dt){for(const p of Object.values(NET.peers)){if(p.model)p.model.root.visible=livePeer(p);if(!livePeer(p)||!p.model)continue;const ox=p.x,oz=p.z;const k=Math.min(1,dt*10);p.x=lerp(p.x,p.tx,k);p.z=lerp(p.z,p.tz,k);
  if(Math.hypot(p.tx-p.x,p.tz-p.z)>8){p.x=p.tx;p.z=p.tz;}const sp=Math.hypot(p.x-ox,p.z-oz)/Math.max(dt,.001);p.moveAmt=lerp(p.moveAmt,clamp(sp/6,0,1),.25);p.face=turnTo(p.face,p.tf,dt*12);p.actT+=dt;
  const C=CLASSES[p.cls];if((p.state==='light'||p.state==='heavy')&&!p.hitDone&&p.actT>p.actDur*(p.state==='light'?.42:.6)){p.hitDone=true;if(!C.ranged){fxSlash(p.x+Math.sin(p.face)*.6,p.z+Math.cos(p.face)*.6,p.face,p.state==='heavy'?0xffb070:0xffffff,p.state==='heavy',C.reach);if(dxz(p,hero)<18)sfx('swing');}}
  animRig(p.model,p,C,dt);jobAnim(p.model,G.t,null);}}
function peersOverlay(){for(const p of Object.values(NET.peers)){if(!p.lbl)continue;if(!livePeer(p)||!p.model){p.lbl.style.display='none';continue;}const i=p.info||{};const f=FACTIONS.find(x=>x.k===i.fa);
  const s=toScreen(p.x,gY(p.x,p.z)+2.9,p.z);p.lbl.style.display=s.vis&&dxz(p,hero)<40?'':'none';p.lbl.style.left=s.x+'px';p.lbl.style.top=s.y+'px';
  const duel=isFoe(p.uid),mate=NET.duel&&NET.duel.team&&NET.duel.mates.includes(p.uid);p.lbl.innerHTML=`<span style="color:${f?f.c:'#fff'}">${f?f.e+' ':''}${i.n||'?'}</span> <span style="color:#ffd76a">Lv${i.l||'?'}</span>${duel?' <span style="color:#ff5050">⚔️</span>':mate?' <span style="color:#6dc8ff">🛡️</span>':''}${NET.duel&&NET.duel.team&&NET.duel.outs[p.uid]?' 💀':''}<div style="height:3px;background:rgba(0,0,0,.6);margin-top:2px;border-radius:2px;overflow:hidden"><div style="height:100%;width:${p.hp}%;background:${duel?'#ff5050':'#6dff8a'}"></div></div>`;
  if(p.bub){const b=toScreen(p.x,gY(p.x,p.z)+3.6,p.z);p.bub.style.left=b.x+'px';p.bub.style.top=b.y+'px';}}
 if(hero.bub){const b=toScreen(hero.x,hero.y+3.4,hero.z);hero.bub.style.left=b.x+'px';hero.bub.style.top=b.y+'px';}}
function bubble(o,e,isTxt){if(o.bub)o.bub.remove();const b=document.createElement('div');b.className='bub'+(isTxt?' btx':'');b.textContent=e;$('#fl').appendChild(b);o.bub=b;clearTimeout(o.bubT);o.bubT=setTimeout(()=>{b.remove();if(o.bub===b)o.bub=null;},isTxt?5500:3200);}
function pickPeer(cx,cy){let b=null,bd=55;for(const p of Object.values(NET.peers)){if(!livePeer(p))continue;const s=toScreen(p.x,gY(p.x,p.z)+1.1,p.z);const d=Math.hypot(s.x-cx,s.y-cy);if(d<bd){bd=d;b=p;}}return b;}
async function inspectPeer(p){const i=p.info||{};const f=FACTIONS.find(x=>x.k===i.fa);const C=CLASSES[p.cls];
 const g=(i.g||[]).map(x=>`<div style="text-align:left;font-size:12.5px;margin:3px 0"><span class="rt r${x[0]}">${RNAME[x[0]]}</span><b class="r${x[0]}">${x[1]}</b><br><span style="color:#a99cc0;font-size:11px">${x[2]}</span></div>`).join('');
 const canDuel=!NET.duel&&!p.dead&&!hero.dead&&!G.bossFight;const tradeLbl='🤝 Trade';
 const r=await ask(`<div class="serif" style="font-size:18px"><span style="color:${f?f.c:'#fff'}">${f?f.e+' ':''}${i.n||'?'}</span></div><div style="color:#c9b6e8;font-size:13px;margin-bottom:6px">${C.ic} ${JOBS[p.cls]?JOBS[p.cls][i.j!=null?i.j:(i.lk&&i.lk.j)||0]:C.n} · Lv ${i.l} · ⚔️ ${i.pw||0} duel wins</div>${g||'<i>No gear info</i>'}`,canDuel?['⚔️ Challenge to a duel',tradeLbl,'👋 Wave','Close']:[tradeLbl,'👋 Wave','Close']);
 const o=canDuel?0:1;if(canDuel&&r===0)duelRequest(p);else if(r===1-o)trInvite(p.uid,i.n);else if(r===2-o)netEmote('👋');}

/* ---------- PvP duels ---------- */
function duelRequest(p){netEmit({y:'dq',to:p.uid,n:FB.name});NET.duelReq={uid:p.uid,t:sNow()};toast('⚔️ Duel challenge sent to '+(p.info&&p.info.n),2000);}
async function duelIncoming(ev){const p=NET.peers[ev.u];if(!p||NET.duel||hero.dead||G.bossFight){netEmit({y:'dn',to:ev.u});return;}
 const r=await ask(`⚔️ <b>${ev.n}</b> challenges you to a duel!<br><small>Losing costs nothing. Dodge and parry work against players.</small>`,['Accept','Decline']);
 if(r===0&&NET.peers[ev.u]&&!NET.duel){netEmit({y:'da',to:ev.u,n:FB.name});duelStart(ev.u);}else netEmit({y:'dn',to:ev.u});}
function duelStart(uid){const p=NET.peers[uid];if(!p)return;NET.duel={uid,t:G.t};bigText('DUEL!','#ff5050',1600);sfx('roar_grunt');hero.hp=G.st.mhp;hero.flask=Math.max(hero.flask,Math.min(S.flask,3));log('⚔️ Duel vs '+(p.info&&p.info.n)+' (3 min)');}
function duelEnd(won,why){const d=NET.duel;if(!d)return;NET.duel=null;if(d.team){hero.dead=false;hero.hp=Math.max(hero.hp,Math.round(G.st.mhp*.3));}if(G.dg&&G.dg.arena){G.dg.over=1;setTimeout(()=>{if(G.dg&&G.dg.arena&&G.mode==='game')exitDungeon();},6000);}const p=d.team?null:NET.peers[d.uid];const n=d.team?'the enemy team':p&&p.info?p.info.n:'opponent';
 if(won===true){S.pvw=(S.pvw||0)+1;bigText('VICTORY','#ffd76a',2400);sfx('levelup');log('🏆 You beat '+n+' ('+S.pvw+' duel wins)');NET.infoDirty=true;save();}
 else if(won===false){bigText('DEFEATED','#c41e1e',2200);log('💀 '+n+' won the duel');}else toast('Duel ended: '+(why||''),1800);}
function isFoe(u){const d=NET.duel;return !!d&&(d.team?d.foes.includes(u):d.uid===u);}
function duelTarget(){const d=NET.duel;if(!d)return null;if(!d.team){const p=NET.peers[d.uid];if(!p||p.x==null||p.dead)return null;return p;}
 let b=null,bd=1e9;for(const u of d.foes){const p=NET.peers[u];if(!p||!livePeer(p)||d.outs[u])continue;const dd=dxz(hero,p);if(dd<bd){bd=dd;b=p;}}return b;}
function teamCheck(){const d=NET.duel;if(!d||!d.team)return;const gone=u=>d.outs[u]||!NET.peers[u];if(d.foes.every(gone))duelEnd(true);else if(d.myOut&&d.mates.every(gone))duelEnd(false);}
// my attack hitting duel opponent (called from doAttackHit / projectiles / skills)
// PvP: attacker sends raw power, defender applies level gap, its own DEF and a per-hit cap (no one-shots)
function pvpHit(mult,o){const p=duelTarget();if(!p)return false;const crit=Math.random()<G.st.crit;const raw=Math.round(G.st.atk*mult*(o.kind==='skill'?Math.min(2.2,G.st.smult):1)*rnd(.92,1.08)*(crit?1.4:1));
 netEmit({y:'pv',to:p.uid,d:raw,lv:S.lv,sk:o.kind==='skill'?1:0,cr:crit?1:0,ub:o.unblock?1:0,mg:(C_().magic||(o.kind==='skill'&&C_().magicSk))?1:0,ac:S.cls==='archer'?1:0});fxSpark(p.x,gY(p.x,p.z)+1.1,p.z,crit?0xffd76a:0xffffff,1);return true;}
const PVP_MULT=.38,PVP_CAP=.16,PVP_CAP_SK=.22;
function pvpMelee(reach,arc,mult,o){const p=duelTarget();if(!p)return;const d=dxz(hero,p);if(d>reach+.5)return;const a=Math.atan2(p.x-hero.x,p.z-hero.z);if(Math.abs(angDiff(a,hero.face))>arc&&d>1.1)return;pvpHit(mult,o);}

/* ---------- events ---------- */
function applyEv(e){switch(e.y){
 case 'ms':strikeLocal(e);break;
 case 'pj':projLocal(e);break;
 case 'dc':decalLocal(e);break;
 case 'ch':chargeLocal(e);break;
 case 'mt':fxMeteor(e.x,e.z,0xff5a2a,1.1);decalLocal(e);break;
 case 'k':{const m=G.mobs.find(x=>x.id===e.id);if(m&&!m.dead){m.dmgBy={};(e.by||[]).forEach(u=>m.dmgBy[u]=1);killMob(m,e);}else if((!m||!m.killed)&&((e.by||[]).includes(FB.uid)||(FB.pt&&myParty().length>1&&(e.by||[]).some(u=>myParty().includes(u))))){const [ty,key,lv]=e.k.split(':');const d=ty==='b'?bossDef(key,+lv):mobDef(key,+lv);const fake={d,x:e.x,z:e.z,boss:ty==='b',add:e.add,wave:e.wv,dead:true,killed:1,mdl:{h:1,tel:{material:{}}},dmgBy:Object.fromEntries((e.by||[]).map(u=>[u,1]))};rewardKill(fake,ty==='b'?1:partyShareN(fake));}break;}
 case 'p2':banner(e.n+' grows furious!','Phase 2',2400);if(G.bossFight)musicPhase2();break;
 case 'wave':if(NET.host)spawnWave(e.n,e.x,e.z,true);break;
 case 'boss':if(NET.host&&!G.mobs.some(m=>m.boss&&!m.dead))hostSpawnBoss();break;
 case 'dq':duelIncoming(e);break;
 case 'da':if(NET.duelReq&&NET.duelReq.uid===e.u){NET.duelReq=null;duelStart(e.u);}break;
 case 'dn':if(NET.duelReq&&NET.duelReq.uid===e.u){NET.duelReq=null;toast(e.n?e.n+' declined the duel':'Duel declined',1600);}break;
 case 'pv':if(isFoe(e.u)&&!(NET.duel.team&&NET.duel.myOut)){const lvF=clamp(1+((e.lv||S.lv)-S.lv)*.005,.75,1.45);const r=heroHit(e.d*PVP_MULT*lvF,null,!!e.ub,e.sk?PVP_CAP_SK:PVP_CAP,{mg:!!e.mg,acc:!!e.ac});if(r==='parry')netEmit({y:'pp',to:e.u});else netEmit({y:'pd',to:e.u,d:r==='hit'?G.lastPv:0,cr:e.cr||0,dg:r==='dodge'?1:0});}break;
 case 'pd':{const p=NET.peers[e.u];if(p&&p.x!=null)txt(p.x,gY(p.x,p.z)+2.3,p.z,e.dg?'DODGE':(e.cr?'✦':'')+e.d,e.dg?'#9ab':e.cr?'#ffe14d':'#ffb0b0',!!e.cr);break;}
 case 'dg':dgOnEvent(e);break;
 case 'pull':pullLocal(e);break;
 case 'tw':twFloorLocal(e.f);break;
 case 'twp':twPortal(e.f);break;
 case 'twd':towerDone();break;
 case 'twn':if(NET.host)towerNext();break;
 case 'bn':banner(e.a,e.b,e.d||2200);break;
 case 'cm':chatArea(e);break;
 case 'sf':skillVisNet(e);break;
 case 'pbf':partyBuffIn(e);break;
 case 'sn':snareLocal(e);break;
 case 'rz':rootZoneLocal(e);break;
 case 'wl':webLaneLocal(e);break;
 case 'pp':if(isFoe(e.u)){hero.state='stun';hero.actT=0;hero.actDur=1.1;txt(hero.x,hero.y+2.6,hero.z,'PARRIED!','#8fd3ff',true);sfx('parry');}break;
 case 'dw':if(NET.duel&&!NET.duel.team&&NET.duel.uid===e.u)duelEnd(true);break;
 case 'dout':if(NET.duel&&NET.duel.team){NET.duel.outs[e.u]=1;const p=NET.peers[e.u];if(p&&p.info)log('💀 '+p.info.n+' is out!');teamCheck();}break;
}}
function mobById(id){return G.mobs.find(m=>m.id===id)||null;}
function strikeLocal(e){fxSlash(e.x+Math.sin(e.f)*e.r*.4,e.z+Math.cos(e.f)*e.r*.4,e.f,0xff4040,!!e.b,e.r);if(Math.hypot(hero.x-e.x,hero.z-e.z)<25)sfx(e.b?'eheavy':'eswing');
 if(hero.dead)return;const dh=Math.hypot(hero.x-e.x,hero.z-e.z);const a=Math.atan2(hero.x-e.x,hero.z-e.z);if(dh<=e.r&&Math.abs(angDiff(a,e.f))<1.5)heroHit(e.dmg,mobById(e.id),false);}
function projLocal(e){const col=e.col||0xb06aff;const mm=mesh(SPH(e.big?.35:.25,8,6),basic(col));mm.add(glowSprite(col,e.big?2:1.4));mm.castShadow=false;mm.position.set(e.x,gY(e.x,e.z)+e.yo,e.z);world.add(mm);
 G.projs.push({m:mm,x:e.x,z:e.z,yo:e.yo,vx:e.vx,vz:e.vz,life:e.life||1.4,hostile:1,dmg:e.dmg,src:mobById(e.id)});}
function decalLocal(e){const ev=fxDecal(e.x,e.z,e.r,e.dur,0xff2020,()=>{fxRing(e.x,e.z,e.r,0xff6a3a,.4);if(Math.hypot(hero.x-e.x,hero.z-e.z)<30){G.shake=Math.max(G.shake,.4);sfx('slam');}PS.burst(e.x,gY(e.x,e.z)+.3,e.z,16,0x5a4a3a,{sp:e.r*.8,up:3});
  if(hero.dead||!G.bossFight&&e.ar)return;const dd=Math.hypot(hero.x-e.x,hero.z-e.z);if(dd>e.r+.3)return;if(e.arc){const an=Math.atan2(hero.x-e.x,hero.z-e.z);if(Math.abs(angDiff(an,e.rot))>e.arc/2+.15)return;}heroHit(e.dmg,mobById(e.id),true,0,{mg:1});},e.arc||undefined);if(e.arc)ev.m.rotation.y=e.rot;}
function chargeLocal(e){const chargeWorld=world,source=mobById(e.id);for(let i=1;i<=4;i++)fxDecal(lerp(e.sx,e.tx,i/4),lerp(e.sz,e.tz,i/4),2.2,.95,0xff2020,null);sfx('charge');
 setTimeout(()=>{if(world!==chargeWorld||!source||source.dead||!G.mobs.includes(source))return;if(e.oath){source.x=e.tx;source.z=e.tz;if(e.crash){source.stag=2.8;source.ripT=2.8;source.gb=2.8;source.state='recover';source.rT=.1;txt(e.tx,gY(e.tx,e.tz)+3,e.tz,'OATH STONE · EXPOSED','#ffd76a',true);}}let hit=false;for(let i=0;i<=10;i++){const x=lerp(e.sx,e.tx,i/10),z=lerp(e.sz,e.tz,i/10);if(!hit&&!hero.dead&&Math.hypot(hero.x-x,hero.z-z)<2.4){hit=true;heroHit(e.dmg,mobById(e.id),true);}}fxRing(e.tx,e.tz,3,0xff6a3a,.4);G.shake=.35;sfx('slam');},950);}
// host-side emit + local apply helpers (used by mob AI)
function hEmit(e,local){if(local)local(e);if(NET.on&&NET.host)netEmit(e);}

/* ---------- mob replication ---------- */
const SCODE={windup:1,recover:2,cast:3};
function serMobs(){const o={};for(const m of G.mobs){if(m.dead)continue;if(!m.id)m.id=netMid();const k=(m.boss?'b:':'m:')+m.d.key+':'+m.d.lv;let f=0;
 if(m.boss)f|=1;if(m.add)f|=2;if(m.wave)f|=4;if(m.agg)f|=8;if(m.stag>0)f|=16;if(m.ripT>0)f|=32;if(m.gb>0)f|=64;if(m.moving)f|=128;if(m.stun>0)f|=256;if(m.lunge>0)f|=512;if(m.flash>0)f|=1024;if((m.immT||0)>G.t)f|=2048;
 const jy=m.jump?Math.round(Math.sin(Math.min(1,m.jump.t/m.jump.dur)*Math.PI)*60):0;
 o[m.id]=[k,Math.round(m.x*10),Math.round(m.z*10),Math.round(m.face*100),Math.max(0,Math.round(m.hp)),Math.round(m.mhp),SCODE[m.state]||0,Math.round((m.wu||0)*100),Math.round(Math.max(0,m.wT||0)*100),f,m.phase||1,Math.round(m.poise||0),jy,m.combo||0];}return o;}
function applyMobs(o){const seen={};for(const id in o){const a=o[id];if(!a)continue;seen[id]=1;let m=G.mobs.find(x=>x.id===id);
  if(!m){const [ty,key,lv]=a[0].split(':');if(!(ty==='b'?BOSSES[key]:MOBS[key]))continue;const d=ty==='b'?bossDef(key,+lv):mobDef(key,+lv);d._dm=1;m=mkMob(d,a[1]/10,a[2]/10,ty==='b');m.id=id;m.face=a[3]/100;G.mobs.push(m);if(m.boss)onNetBoss(m);}
  if(m.dead)continue;m.missing=0;m.nx=a[1]/10;m.nz=a[2]/10;m.nf=a[3]/100;if(!m.hpPredT||G.t>m.hpPredT)m.hp=a[4];m.mhp=a[5];
  const st=['chase','windup','recover','cast'][a[6]]||'chase';if(st==='windup'&&m.state!=='windup'){m.wu=Math.max(.05,a[7]/100);m.wT=a[8]/100;m.flashed=0;}m.state=st;
  const f=a[9];m.add=!!(f&2);m.wave=!!(f&4);m.agg=!!(f&8);m.stag=f&16?.3:0;m.ripT=f&32?.4:0;m.gb=f&64?.3:0;m.moving=!!(f&128);m.stun=f&256?.3:0;m.lunge=f&512?.1:0;if(f&1024)m.flash=Math.max(m.flash,.05);m.nImm=!!(f&2048);
  if(m.boss&&a[10]===2&&m.phase!==2){m.phase=2;if(G.bossFight){banner(m.d.n+' grows furious!','Phase 2',2400);musicPhase2();}}m.phase=a[10];m.poise=a[11];m.jy=(a[12]||0)/10;m.combo=a[13]||0;}
 for(const m of G.mobs){if(!m.dead&&m.id&&!seen[m.id]){m.missing=(m.missing||0)+1;if(m.missing>=3){m.dead=true;m.deadT=.01;if(hero.lock===m)hero.lock=null;if(hero.engage===m)hero.engage=null;}}if(!m.id&&!m.dead){m.dead=true;m.deadT=.01;}}
 G.boss=G.mobs.find(m=>m.boss&&!m.dead)||null;}
function puppetMobs(dt){for(const m of G.mobs){const M=m.mdl,d=m.d;
  if(m.dead){m.deadT-=dt;const p=1-Math.max(0,m.deadT)/.9;M.root.scale.setScalar((d.s||1)*(1-p*.6));M.root.position.y=gY(m.x,m.z)-p*.6;M.body.rotation.z=p*1.2;continue;}
  if(m.nx!=null){const k=Math.min(1,dt*9);m.x=lerp(m.x,m.nx,k);m.z=lerp(m.z,m.nz,k);if(Math.hypot(m.nx-m.x,m.nz-m.z)>10){m.x=m.nx;m.z=m.nz;}m.face=turnTo(m.face,m.nf,dt*12);}
  m.flash=Math.max(0,m.flash-dt);
  if(m.state==='windup'){m.wT-=dt;const p=clamp(1-m.wT/m.wu,0,1);M.tel.material.opacity=.25+.6*p;M.tel.scale.setScalar(d.r*1.7/(d.s||1)*(.4+.6*p));if(m.wT<m.wu*.35&&!m.flashed){m.flashed=1;m.flash=.08;if(dxz(m,hero)<20)sfx('tell');}}else M.tel.material.opacity=0;
  animMob(m,dt);if(m.jy)M.root.position.y+=m.jy;
  if(!hero.dead){const dx=hero.x-m.x,dz=hero.z-m.z,dd=Math.hypot(dx,dz)||1,mn=m.r+.45;if(dd<mn&&hero.state!=='roll'){const p=(mn-dd)/dd;hero.x+=dx*p;hero.z+=dz*p;}}}}
function onNetBoss(m){G.boss=m;if(G.bossFight&&!G.introDone){G.introDone=1;G.intro={t:0,dur:3,m};$('#cine').style.opacity=1;sfx('roar_'+(m.d.roar||'deep'));setTimeout(()=>{$('#bossN').textContent=m.d.n;bigText(m.d.n.toUpperCase(),'#e8c26a',3000);},800);}}
function hostApplyHit(h){if(!h)return;const m=mobById(h.id);if(!m||m.dead)return;(m.dmgBy=m.dmgBy||{})[h.u]=1;m.agg=true;
 if(h.pr){m.stag=m.boss?1.6:2.2;m.ripT=m.stag;cancelWind(m);if(m.boss)m.poise+=40;return;}
 if(h.gb){m.gb=2.5;m.stag=1.2;cancelWind(m);}
 const d=+h.d||0;if(d<=0)return;const dd=m.d.mech?gateDmg(m,Math.min(d,m.mhp),h.u):Math.min(d,m.mhp);if(dd<=0)return;m.hp-=dd;m.flash=.12;
 if(h.rip)m.ripT=0;applyPoise(m,h.p||0,!!h.rip,h.k,false);
 if(m.hp<=0)killMob(m);}

/* ---------- players / targets for host AI ---------- */
const livePeer=p=>p.info&&p.x!=null&&Date.now()-(p.lastT||0)<25000;
function players(){const a=[];if(!hero.dead)a.push({x:hero.x,z:hero.z,dead:false,me:1,ar:!!G.bossFight});for(const al of G.allies)a.push({x:al.x,z:al.z,dead:false,ar:true,ally:1,uid:'ally_'+al.n});if(NET.on)for(const p of Object.values(NET.peers)){if(p.dead||!livePeer(p))continue;a.push({x:p.x,z:p.z,dead:false,ar:!!p.ar,uid:p.uid});}return a;}
function tgtFor(m){let ps=players();if(m.boss&&NET.on)ps=ps.filter(p=>p.ar);
 if(m.boss&&m.d.mech&&m.d.mech.t==='trio'&&ps.length>1){const tr=G.mobs.filter(o=>o.boss&&!o.dead&&o.d.mech&&o.d.mech.t==='trio');const i=tr.indexOf(m);if(i>=0)return ps[i%ps.length];}
 if(m.boss&&ps.length>1){const key=p=>p.uid||'me';let c=ps.find(p=>key(p)===m.tgU);if(!c||G.t>(m.tgT||0)){c=ps[ri(0,ps.length-1)];m.tgU=key(c);m.tgT=G.t+rnd(5,9);}return c;}
 let b=null,bd=1e9;for(const p of ps){const d=Math.hypot(p.x-m.x,p.z-m.z);if(d<bd){bd=d;b=p;}}return b||{x:hero.x,z:hero.z,dead:true};}
function hostSpawnBoss(){const c=S.ch;if(!CHS[c].boss)return null;const m=spawnChapterBoss(c),d=m.d;
 G.mobs.filter(x=>!x.boss&&!x.dead&&Math.hypot(x.x-AR.x,x.z-AR.z)<AR.r+4).forEach(x=>{x.x+=(x.x>=0?1:-1)*20;});
 if(G.bossFight&&!G.introDone){G.introDone=1;G.intro={t:0,dur:3.6,m};$('#cine').style.opacity=1;sfx('roar_'+(d.roar||'deep'));setTimeout(()=>{$('#bossN').textContent=d.n;bigText(d.n.toUpperCase(),'#e8c26a',3000);},900);}return m;}

/* ---------- per-frame tick ---------- */
function netTick(dt){if(!NET.on)return;
 if(NET.infoDirty)netSendInfo();
 NET.pT+=dt;if(NET.pT>=.12){NET.pT=0;NET.pK++;netSendPos(NET.pK>=16);}
 peersUpdate(dt);
 if(NET.duel&&G.t-NET.duel.t>180)duelEnd(null,'time up');
 if(NET.host){NET.mT+=dt;if(NET.mT>=.2){NET.mT=0;const o=serMobs(),up={};let n=0;for(const id in o){const k=o[id].join(',');if(NET.sent[id]!==k){NET.sent[id]=k;up[id]=o[id];n++;}}for(const id in NET.sent)if(!o[id]){delete NET.sent[id];up[id]=null;n++;}if(n)NET.base.child('mobs').update(up).catch(()=>{});}
  NET.hbT+=dt;if(NET.hbT>=3){NET.hbT=0;NET.base.child('host').set({uid:FB.uid,n:FB.name,ts:sNow()}).catch(()=>{});}
  NET.cleanT+=dt;if(NET.cleanT>=6){NET.cleanT=0;NET.base.child('ev').orderByChild('t').endAt(sNow()-9000).limitToFirst(200).once('value',s=>s.forEach(c=>{c.ref.remove().catch(()=>{});})).catch(()=>{});}
  NET.bossT+=dt;if(NET.bossT>=1){NET.bossT=0;const b=G.mobs.find(m=>m.boss&&!m.dead);if(b){const n=players().filter(p=>p.ar&&!p.ally).length;b.coopN=Math.max(1,n);b.agg=n>0;
   if(!b.baseMhp)b.baseMhp=b.mhp;const tgt=Math.round(b.baseMhp*(1+.7*(Math.max(1,n)-1)));if(tgt>b.mhp){b.hp+=tgt-b.mhp;b.mhp=tgt;if(n>1)log('👥 Boss grows stronger: '+n+' players');}
   if(n===0){b.empty=(b.empty||0)+1;if(b.empty>=6){b.dead=true;b.deadT=.01;G.boss=null;}}else b.empty=0;}}}
 else{NET.chkT+=dt;if(NET.chkT>=3){NET.chkT=0;if(!NET.hostUid||sNow()-(NET.hostTs||0)>9500)tryClaimHost();}}
 FB.presT+=dt;if(FB.presT>60){FB.presT=0;presenceUpdate();}}

// keep the shared world running while the menu/dialog is open (online never pauses)
function netBg(dt){G.t+=dt;if(isPuppet())puppetMobs(dt);else updateMobs(dt,G.st);updateProjs(dt);updateFx(dt);PS.update(dt);
 if(hero.dead){hero.deadT-=dt;}G.mobs=G.mobs.filter(m=>{if(m.dead&&m.deadT<=0){removeMob(m);return false;}return true;});}
/* ================= DUNGEONS + ABYSSAL GEAR ================= */
// tier 6 = Abyssal gear: only drops in dungeons
for(const k in WN)if(WN[k].length===6)WN[k].push(WN[k][5].replace(/^\S+/,'Abyssal'));
[AN,HN,SN,RNm,LHN,FN].forEach(a=>{if(a.length===6)a.push(a[5].replace(/^\S+/,'Abyssal'));});
if(WATK.length===6){WATK.push(205);ADEF.push(52);AHP.push(540);HDEF.push(26);SDEF.push(40);LHDEF.push(19);FDEF.push(23);}

const DUNGEONS=[
 {k:'crypt',n:'Sunken Crypt',e:'⚰️',req:4,w:5,boss:'hydra',col:'#3fd0b0',tier:3,d:'A flooded tomb beneath the dunes. Something with many heads sleeps in the water.'},
 {k:'forge',n:'Molten Forge',e:'🌋',req:9,w:6,boss:'colossus',col:'#ff7a2a',tier:4,d:'The furnace where the old kings forged their war machines. One still walks.'},
 {k:'sanctum',n:'Frozen Sanctum',e:'❄️',req:14,w:9,boss:'seraph',col:'#9fe0ff',tier:5,d:'A cathedral of ice. Its guardian angel lost its mind a thousand years ago.'},
 {k:'abyss',n:'The Abyss',e:'🕳️',req:19,w:19,boss:'devourer',col:'#b04aff',tier:6,d:'Below the rift, the thing that fed Malgrath his power. Bring friends.'},
 {k:'vault',n:'Behemoth Vault',e:'🦬',req:7,w:7,boss:'behemoth',col:'#c8a06a',tier:4,d:'A sealed war-vault under the bridge. The old kings chained a beast inside.'},
 {k:'lichcrypt',n:'Lich Crypt',e:'💀',req:16,w:14,boss:'lich',col:'#7affd8',tier:5,ab:.25,d:'A crypt where a dead sovereign still rules. Its magic never stops.'},
 {k:'crimson',n:'Crimson Depths',e:'🩸',req:24,w:24,boss:'crimsonhydra',col:'#ff3a4a',tier:5,ab:.3,d:'Mohg\'s blood pools hide a hydra fed on blasphemy.'},
 {k:'codex',n:'Forbidden Codex',e:'📚',req:31,w:25,boss:'runecolossus',col:'#6a8aff',tier:5,ab:.35,d:'The Archive\'s sealed floor. A construct of living runes guards it.'},
 {k:'fallen',n:'Twilight Abyss',e:'🌘',req:39,w:33,boss:'fallenseraph',col:'#d06aff',tier:6,d:'An angel that fell with Castle Sylthar. It no longer remembers mercy.'},
 {k:'voidvault',n:'Ishkafar\'s Vault',e:'🌌',req:48,w:46,boss:'voidbehemoth',col:'#8a4aff',tier:6,d:'Where Ishkafar stored the power he stole. Its guardian bends gravity. Very hard.'},
];
const dgDef=k=>DUNGEONS.find(d=>d.k===k);
const dgUnlocked=D=>!!(S&&((S.cleared||[])[D.req]||(S.ngp||0)>0||(S.dgc&&S.dgc[D.k])));
const dgLevel=D=>chLevel(D.req)+12+(S.ngp||0)*20;
const DG_WAVES=[6,8,10,12];

Object.assign(BOSSES,{
 hydra:{el:['lightning','ice'],n:'Abyssal Hydra',m:'hydra',col:0x1f6a6a,s:2.3,spd:2.4,r:2.6,sp:['heads','slam','spiral','bolts','nova'],em:0x2affd0,roar:'screech',dg:1},
 colossus:{el:['ice','fire'],n:'The Forge Colossus',m:'colossus',col:0x3a2a22,s:2.3,spd:2.2,r:2.5,sp:['cross','slam','rain','charge','sweep','combo'],em:0xff5a0a,roar:'deep',dg:1},
 seraph:{el:['shadow','holy'],n:'Seraph of Ruin',m:'seraph',col:0xe8e4f4,s:2.2,spd:3.4,r:2,sp:['spiral','rain','bolts','jump','cross','combo'],em:0x9fe0ff,fly:1,roar:'whisper',dg:1},
 devourer:{el:['holy','shadow'],n:'The Devourer',m:'devourer',col:0x1a0a22,s:2.6,spd:2.6,r:2.8,sp:['heads','rain','cross','spiral','summon','nova','charge'],em:0xb04aff,roar:'demon',dg:1},
});

Object.assign(BOSSES,{
 behemoth:{el:['lightning','earth'],n:'The Iron Behemoth',m:'behemoth',col:0x5a4a3a,s:2.4,spd:3.4,r:2.6,sp:['charge','slam','jump','sweep','combo','charge'],em:0xffa040,roar:'deep',dg:1},
 lich:{el:['holy','shadow'],n:'The Lich Sovereign',m:'lich',col:0x2a3a3a,s:2.4,spd:2.8,r:2,sp:['bolts','spiral','summon','rain','cross','heads'],em:0x7affd8,fly:1,roar:'whisper',dg:1},
 crimsonhydra:{el:['holy','fire'],n:'The Crimson Hydra',m:'hydra',col:0x6a0a14,s:2.5,spd:2.6,r:2.7,sp:['heads','slam','spiral','rain','nova','heads'],em:0xff2a3a,roar:'screech',dg:1},
 runecolossus:{el:['lightning','earth'],n:'The Codex Colossus',m:'colossus',col:0x1a2448,s:2.5,spd:2.3,r:2.6,sp:['cross','spiral','bolts','slam','rain','combo'],em:0x6a8aff,roar:'deep',dg:1},
 fallenseraph:{el:['holy','shadow'],n:'The Fallen Seraph',m:'seraph',col:0x2a1a2a,s:2.4,spd:3.8,r:2,sp:['spiral','rain','bolts','jump','cross','combo','heads'],em:0xd06aff,fly:1,roar:'whisper',dg:1},
 voidbehemoth:{el:['holy','shadow'],n:'The Void Behemoth',m:'behemoth',col:0x1a0a2a,s:2.7,spd:3.6,r:2.8,sp:['grav','charge','slam','rain','jump','cross','grav'],em:0x8a4aff,roar:'demon',dg:1},
});
/* ---------- unique boss models ---------- */
Object.assign(MB,{
 behemoth:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{roughness:.55,emissive:0x0a0604}),Ar=mat(0x6a6a72,{metalness:.6,roughness:.35,emissive:0x060606}),E=basic(d.em||0xffa040);
  const b=mesh(BOX(1.6,1.2,2.6),M,0,1.6,0);body.add(b);body.add(mesh(BOX(1.7,.5,2.2),Ar,0,2.3,-.1));for(let i=0;i<5;i++)body.add(mesh(CONE(.16,.6,4),Ar,0,2.6+((i%2)*.1),-.9+i*.45));
  const legs=[];[[-.6,.9],[.6,.9],[-.6,-.9],[.6,-.9]].forEach(([x,z])=>legs.push(legBox(body,x,1.05,z,.45,1.05,M)));
  const head=grp(0,1.75,1.55);body.add(head);head.add(mesh(BOX(.9,.8,.9),M));head.add(mesh(BOX(.8,.25,.5),Ar,0,-.35,.35));eyes(head,.2,.12,.46,.08,d.em||0xffa040);
  [-1,1].forEach(s=>{const h=mesh(CONE(.16,1.2,6),mat(0xe8e0d0),s*.55,.45,.1);h.rotation.z=-s*1.1;h.rotation.x=-.4;head.add(h);});head.add(glowSprite(d.em||0xffa040,1.2).translateZ(.55).translateY(-.25));
  const tail=[];for(let i=0;i<5;i++){const t=mesh(SPH(.22-i*.03,7,5),M,0,1.6-i*.08,-1.4-i*.35);body.add(t);tail.push(t);}
  return {root,body,legs,head,anim:(t,m)=>{tail.forEach((p,i)=>p.position.x=Math.sin(t*3+i*.7)*.15*i);head.rotation.x=m.state==='windup'?-.35:Math.sin(t*2)*.05;}};},
 lich:d=>{const root=new T.Group(),body=grp(0,1.2,0);root.add(body);const R=mat(d.col,{roughness:.7,emissive:0x061010}),Bn=mat(0xe8e0d0,{emissive:0x101010}),Gd=mat(0xe8c26a,{metalness:.8,roughness:.3,emissive:0x1a1000}),E=basic(d.em||0x7affd8);
  const robe=mesh(CONE(.8,2.2,8),R,0,.2,0);robe.rotation.x=Math.PI;body.add(robe);for(let i=0;i<4;i++)body.add(mesh(BOX(.62-i*.05,.06,.3),Bn,0,1.1+i*.16,.1));
  const h=grp(0,2.0,0);body.add(h);h.add(mesh(SPH(.3,10,8),Bn));h.add(mesh(BOX(.3,.12,.2),Bn,0,-.22,.1));eyes(h,.1,.04,.26,.06,d.em||0x7affd8);
  for(let i=0;i<6;i++){const c=mesh(CONE(.05,.22,4),Gd,Math.cos(i/6*6.283)*.26,.28,Math.sin(i/6*6.283)*.26);h.add(c);}
  const arms=[];[-1,1].forEach(s=>{const a=grp(s*.5,1.6,0);a.add(mesh(BOX(.14,.8,.14),Bn,0,-.38,0));body.add(a);arms.push(a);});
  const st=grp(.55,.9,.25);st.add(mesh(CYL(.04,.04,2.2,5),mat(0x2a1a10),0,.4,0));st.add(mesh(ICO(.18),E,0,1.55,0));st.add(glowSprite(d.em||0x7affd8,1.4).translateY(1.55));arms[1].add(st);
  const ring=grp(0,1.4,0);body.add(ring);const sk=[];for(let i=0;i<4;i++){const s=grp(Math.cos(i/4*6.283)*1.5,0,Math.sin(i/4*6.283)*1.5);s.add(mesh(SPH(.16,7,5),Bn));s.add(glowSprite(d.em||0x7affd8,.6));ring.add(s);sk.push(s);}
  body.add(glowSprite(d.em||0x7affd8,3.5).translateY(1.2));
  return {root,body,arms,human:1,fly:1,anim:(t,m)=>{ring.rotation.y=t*(m.phase===2?2.4:1.2);sk.forEach((s,i)=>s.position.y=Math.sin(t*2+i)*.3);}};},
 hydra:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{metalness:.3,roughness:.45,emissive:0x021010}),Bel=mat(0x9ad8b0,{emissive:0x020a06}),G=basic(0x2affd0);
  const b=mesh(SPH(1.1,12,10),M,0,1,-.2);b.scale.set(1.2,.8,1.4);body.add(b);const bl=mesh(SPH(.9,10,8),Bel,0,.8,.3);bl.scale.set(1,.6,1.2);body.add(bl);
  for(let i=0;i<5;i++)body.add(mesh(SPH(.42-i*.07,7,5),M,0,.8-i*.08,-1.5-i*.45));
  const legs=[];[[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sz])=>legs.push(legBox(body,sx*.8,.8,sz*.6,.3,.8,M)));
  const heads=[];[-1,0,1].forEach((s,i)=>{const n=grp(s*.55,1.6,.6);body.add(n);for(let j=0;j<4;j++)n.add(mesh(SPH(.3-j*.02,8,6),M,s*j*.12,j*.42,j*.18));
   const h=grp(s*.5,1.75,.85);n.add(h);h.add(mesh(BOX(.55,.4,.75),M));h.add(mesh(BOX(.45,.16,.55),M,0,-.24,.25));eyes(h,.12,.36,.18,.07,0x2affd0);
   for(let k=0;k<3;k++)h.add(mesh(CONE(.06,.35,4),mat(0x0a2a2a),(k-1)*.18,.3,-.15));h.add(glowSprite(0x2affd0,.9).translateZ(.4));heads.push(n);});
  body.add(glowSprite(0x2affd0,3).translateY(1.2));
  return {root,body,legs,heads,anim:(t,m)=>heads.forEach((n,i)=>{n.rotation.z=Math.sin(t*1.6+i*2)*.18;n.rotation.x=Math.sin(t*2.1+i)*.15-(m.state==='windup'?.4:0);})};},
 colossus:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{metalness:.4,roughness:.5,emissive:0x120400}),Mol=basic(0xff6a1a),Rk=mat(0x5a4a40,{metalness:.2,emissive:0x080402});
  const legs=[legBox(body,-.45,1.1,0,.55,1.1,M),legBox(body,.45,1.1,0,.55,1.1,M)];
  body.add(mesh(BOX(1.5,1.3,.95),M,0,1.8,0));body.add(mesh(BOX(1.2,.5,.8),Rk,0,1.1,0));const core=mesh(ICO(.32),Mol,0,1.85,.48);body.add(core);body.add(glowSprite(0xff6a1a,2.6).translateY(1.85).translateZ(.6));
  for(let i=0;i<6;i++)body.add(mesh(BOX(.08,.5,.04),Mol,(i-2.5)*.22,1.45+(i%2)*.4,.49));
  const h=grp(0,2.75,0);body.add(h);h.add(mesh(BOX(.6,.55,.6),M));h.add(mesh(BOX(.5,.08,.05),Mol,0,.05,.31));h.add(mesh(CONE(.12,.45,4),Rk,-.3,.4,0));h.add(mesh(CONE(.12,.45,4),Rk,.3,.4,0));
  [-1,1].forEach(s=>body.add(mesh(ICO(.45),Rk,s*.95,2.45,0)));
  const arms=[];[[-1,2.35],[1,2.35],[-1,1.6],[1,1.6]].forEach(([s,y],i)=>{const a=grp(s*(i<2?1.0:.85),y,0);a.add(mesh(BOX(.36,1.0,.36),M,0,-.45,0));a.add(mesh(BOX(.5,.45,.5),i<2?Rk:M,0,-1.05,0));if(i<2)a.add(mesh(BOX(.12,.3,.12),Mol,0,-1.05,.26));body.add(a);arms.push(a);});
  return {root,body,legs,arms,human:1,anim:(t,m)=>{core.scale.setScalar(1+Math.sin(t*5)*.15);arms[2].rotation.x=Math.sin(t*3)*.3-(m.state==='windup'?1.2:0);arms[3].rotation.x=-Math.sin(t*3)*.3-(m.state==='windup'?1.2:0);}};},
 seraph:d=>{const root=new T.Group(),body=grp(0,1.3,0);root.add(body);const W=mat(0xf4f0ff,{roughness:.4,emissive:0x101020}),Gd=mat(0xe8c26a,{metalness:.8,roughness:.25,emissive:0x100800}),Ice=basic(0x9fe0ff);
  const robe=mesh(CONE(.65,1.9,8),W,0,.3,0);robe.rotation.x=Math.PI;body.add(robe);body.add(mesh(BOX(.7,.8,.45),W,0,1.35,0));body.add(mesh(BOX(.75,.15,.5),Gd,0,1.0,0));
  const h=grp(0,2.0,0);body.add(h);h.add(mesh(SPH(.28,10,8),mat(0xd8d4e8,{emissive:0x101018})));h.add(mesh(BOX(.4,.06,.05),Ice,0,.02,.26));
  const halo=mesh(TOR(.42,.04),basic(0xffe08a),0,.45,-.1);halo.rotation.x=1.2;h.add(halo);h.add(glowSprite(0xffe08a,1.4).translateY(.45));
  const wings=[];[[-1,1.6,1],[1,1.6,1],[-1,1.0,.7],[1,1.0,.7]].forEach(([s,y,sc])=>{const w=grp(s*.3,y,-.25);for(let i=0;i<4;i++){const f=mesh(BOX(.9*sc,.05,.28),W,s*(.45+i*.32)*sc,i*.12,-i*.03);f.rotation.z=s*(.25+i*.12);w.add(f);}body.add(w);wings.push(w);});
  const arms=[];[-1,1].forEach(s=>{const a=grp(s*.45,1.6,0);a.add(mesh(BOX(.16,.75,.16),W,0,-.35,0));body.add(a);arms.push(a);});
  const sw=grp(.45,.9,.35);sw.add(mesh(BOX(.08,1.7,.18),Ice,0,.6,0));sw.add(glowSprite(0x9fe0ff,1.2).translateY(.9));arms[1].add(sw);
  const ring=grp(0,1.1,0);body.add(ring);const blades=[];for(let i=0;i<6;i++){const b=mesh(CONE(.09,.6,4),Ice,Math.cos(i/6*6.283)*1.4,0,Math.sin(i/6*6.283)*1.4);b.rotation.z=Math.PI/2;ring.add(b);blades.push(b);}
  body.add(glowSprite(0x9fe0ff,3.5).translateY(1.1));
  return {root,body,arms,human:1,fly:1,anim:(t,m)=>{ring.rotation.y=t*(m.phase===2?3:1.4);halo.rotation.z=t;wings.forEach((w,i)=>w.rotation.z=(i%2?-1:1)*Math.sin(t*2.4+i)*.22);}};},
 devourer:d=>{const root=new T.Group(),body=new T.Group();root.add(body);const M=mat(d.col,{roughness:.6,emissive:0x1a0624,emissiveIntensity:.8}),Fl=mat(0x6a1a3a),Tth=mat(0xe8e0d0),P=basic(0xb04aff);
  const b=mesh(SPH(1.5,14,12),M,0,1.7,0);b.scale.set(1.1,1,1.1);body.add(b);
  const maw=grp(0,1.7,1.25);body.add(maw);maw.add(mesh(SPH(.9,12,10),Fl,0,0,-.2));for(let i=0;i<12;i++){const a=i/12*6.283;const t=mesh(CONE(.09,.4,4),Tth,Math.cos(a)*.85,Math.sin(a)*.85,.1);t.rotation.z=a-Math.PI/2;t.rotation.x=Math.PI/2*.6;maw.add(t);}
  maw.add(glowSprite(0xb04aff,1.8));
  for(let i=0;i<7;i++){const a=(i/7)*Math.PI*1.4+.6;body.add(mesh(SPH(.13,6,5),P,Math.cos(a)*1.25,1.7+Math.sin(a)*1.0+.5,.95));}
  const tents=[];for(let i=0;i<6;i++){const a=i/6*6.283;const tg=grp(Math.cos(a)*1.2,.9,Math.sin(a)*1.2);for(let j=0;j<6;j++)tg.add(mesh(SPH(.28-j*.035,7,5),j%2?M:Fl,Math.cos(a)*j*.35,-.1*j,Math.sin(a)*j*.35));body.add(tg);tents.push(tg);}
  for(let i=0;i<5;i++){const s=mesh(CONE(.18,.9,5),Tth,(i-2)*.45,3.1-Math.abs(i-2)*.2,-.4);s.rotation.x=-.3;body.add(s);}
  body.add(glowSprite(0xb04aff,5).translateY(1.7));
  return {root,body,squash:0,anim:(t,m)=>{maw.scale.setScalar(1+Math.sin(t*(m.state==='windup'?12:3))*.12);tents.forEach((tg,i)=>{tg.rotation.z=Math.sin(t*2+i)*.35;tg.rotation.x=Math.cos(t*1.7+i*1.3)*.3;});}};},
});

/* ---------- unique boss attacks (host) ---------- */
const DG_SP={
 heads:(m,tg,big,r1)=>{m.rT=1.5;sfx('ebolt');const base=Math.atan2(tg.x-m.x,tg.z-m.z);for(let h=-1;h<=1;h++){const ox=m.x+Math.cos(m.face)*h*1.2,oz=m.z-Math.sin(m.face)*h*1.2;
   for(let i=0;i<3;i++){const a=base+h*.35+(i-1)*.12;setTimeout(()=>{if(m.dead)return;hEmit({y:'pj',id:m.id,x:r1(ox),z:r1(oz),yo:2.4,vx:Math.sin(a)*13,vz:Math.cos(a)*13,life:2.2,dmg:Math.round(m.d.atk*1.0),col:m.d.em||0xb06aff,big:1},projLocal);},h*120+150+i*90);}}},
 cross:(m,tg,big,r1)=>{m.rT=2;sfx('charge');const f=Math.random()<.5?0:Math.PI/4;for(let k=0;k<4;k++){const a=f+k*Math.PI/2;for(let i=1;i<=5;i++){const x=m.x+Math.sin(a)*i*2.6,z=m.z+Math.cos(a)*i*2.6;if(Math.hypot(x-AR.x,z-AR.z)<AR.r)setTimeout(()=>{if(!m.dead)big(1.4,1.6,x,z,1.0);},i*110);}}},
 spiral:(m,tg,big,r1)=>{m.rT=2.4;sfx('charge');const n=m.phase===2?18:13;for(let i=0;i<n;i++){const a=i*.62,r=2+i*.75;const x=m.x+Math.sin(a)*r,z=m.z+Math.cos(a)*r;if(Math.hypot(x-AR.x,z-AR.z)<AR.r)setTimeout(()=>{if(!m.dead)big(1.2,1.9,x,z,.85);},i*130);}},
 rain:(m,tg,big,r1)=>{m.rT=2.6;sfx('charge');const ps=players().filter(p=>p.ar);const n=m.phase===2?14:10;for(let i=0;i<n;i++){const p=ps.length&&Math.random()<.5?ps[ri(0,ps.length-1)]:null;const a=rnd(0,6.283),rr=rnd(0,AR.r-2);
   const x=p?p.x+rnd(-1.5,1.5):AR.x+Math.sin(a)*rr,z=p?p.z+rnd(-1.5,1.5):AR.z+Math.cos(a)*rr;setTimeout(()=>{if(m.dead)return;hEmit({y:'mt',id:m.id,x:r1(x),z:r1(z),r:2.2,dur:1.1,dmg:Math.round(m.d.atk*1.25),ar:1},e=>{fxMeteor(e.x,e.z,m.d.em||0xff5a2a,1.1);decalLocal(e);});},i*170);}},
};

/* ---------- dungeon flow ---------- */
function dgDarken(D){scene.fog.color.setHex(0x0a0610);scene.fog.near=8;scene.fog.far=62;skyMat.uniforms.top.value.setHex(0x05030a);skyMat.uniforms.bot.value.setHex(0x140a1e);skyMat.uniforms.stars.value=1;
 hemi.intensity=.45;hemi.color.setHex(0x8a7aaa);sun.intensity*=.35;sun.color.setHex(0xb8a0ff);if(G.fog){G.fog.m.visible=false;G.fog.gl.visible=false;}
 const col=new T.Color(D.col).getHex();for(let i=0;i<10;i++){const a=i/10*6.283;const x=AR.x+Math.sin(a)*(AR.r+1.6),z=AR.z+Math.cos(a)*(AR.r+1.6);const y=gY(x,z);
  const p=mesh(CYL(.4,.55,4.5,6),mat(0x2a2430),x,y+2.25,z);world.add(p);const f=glowSprite(col,2.4);f.position.set(x,y+4.8,z);world.add(f);world.add(mesh(SPH(.22,6,5),basic(col),x,y+4.7,z));}
 const L=new T.PointLight(col,1.6,40);L.position.set(AR.x,6,AR.z);world.add(L);}
function enterDungeon(k,owner,floor){const D=dgDef(k);if(!D)return;if(!dgUnlocked(D)){toast(`🔒 Clear Chapter ${D.req+1} to unlock ${D.n}`,2000);return;}if(D.tower){enterTower(floor||1,owner);return;}
 if(menuOpen)closeMenu();loadChapter(S.ch,true,{k,owner:owner||FB.uid||'solo',w:0,st:'wait',t:0,wc:D.w});
 banner(D.e+' '+D.n,'Dungeon · Recommended Lv '+dgLevel(D)+'+ · '+DG_WAVES.length+' elite waves, then the boss',3800);sfx('wave');}
function exitDungeon(){G.twPortal=null;const tf=$('#twF');if(tf)tf.style.display='none';const ar=G.dg&&G.dg.arena&&!G.dg.trial;if(ar&&NET.duel)duelEnd(null,'left the arena');G.dg=null;G.bossFight=false;loadChapter(S.ch,true);toast(ar?'You left the Duel Arena':'You left the dungeon',1500);}
function dgSetup(){if(G.npc){world.remove(G.npc.m.root);G.npc=null;}if(G.dg.tower){towerSetup();return;}if(G.dg.trial){trialSetup();return;}if(G.dg.arena){arenaSetup();return;}const D=dgDef(G.dg.k);dgDarken(D);hero.x=AR.x;hero.z=AR.z+AR.r-3;hero.face=Math.PI;G.bossFight=true;G.inArena=true;G.gate='open';musicFor(Math.min(19,D.w),true);}
function dgCount(){return Math.max(1,NET.on?players().length:1);}
function dgSpawnWave(w){const D=dgDef(G.dg.k);const defs=CHS[D.w].mobs;const n=Math.round(DG_WAVES[w]*(1+.5*(dgCount()-1)));const lv=Math.max(dgLevel(D),topLv()-2);
 for(let i=0;i<n;i++){const a=i/n*6.283+rnd(-.2,.2),rr=rnd(6,AR.r-2);const d=mobDef(defs[i%defs.length],lv+w*2);d.hp=Math.round(d.hp*3.2);d.atk=Math.round(d.atk*1.6);d.def=Math.round(d.def*1.4);d.exp=Math.round(d.exp*3);d.s=(d.s||1)*1.25;d.em=new T.Color(D.col).getHex();d.aggro=1;d.n='Elite '+d.n;
  const m=mkMob(d,AR.x+Math.sin(a)*rr,AR.z+Math.cos(a)*rr,false);m.agg=true;m.wave=true;m.dgm=1;G.mobs.push(m);fxRing(m.x,m.z,1.5,0xb04aff,.5);}
 dgBanner(w+1);if(NET.on&&NET.host)netEmit({y:'dg',w:w+1,st:'wave'});}
function dgBanner(w,st){const D=dgDef(G.dg?G.dg.k:'')||{};if(st==='boss'){bigText(BOSSES[D.boss].n.toUpperCase(),'#e8c26a',2400);return;}if(st==='done')return;banner('Wave '+w+' / '+DG_WAVES.length,D.n||'',1800);sfx('wave');}
function dgSpawnBoss(){const D=dgDef(G.dg.k);const d=bossBoost(bossDef(D.boss,dgLevel(D)+8));d.hp=Math.round(d.hp*1.8);d.atk=Math.round(d.atk*1.3);d.def=Math.round(d.def*1.3);d.exp=Math.round(d.exp*2.5);
 const m=mkMob(d,AR.x,AR.z-6,true);m.agg=false;m.face=0;m.baseMhp=m.mhp;m.coopN=1;G.mobs.push(m);G.boss=m;G.introDone=1;G.intro={t:0,dur:3.6,m};$('#cine').style.opacity=1;sfx('roar_'+(d.roar||'deep'));
 setTimeout(()=>{$('#bossN').textContent=d.n;bigText(d.n.toUpperCase(),'#e8c26a',3000);},900);if(NET.on&&NET.host)netEmit({y:'dg',st:'boss'});}
function dgTick(dt){const g=G.dg;if(g&&g.tower){towerTick(dt);return;}if(g&&g.trial){trialTick(dt);return;}if(g&&g.arena){arenaTick(dt);return;}if(!g||isPuppet()||hero.dead&&!NET.on)return;g.t+=dt;
 if(g.st==='wait'&&g.t>4){g.st='wave';dgSpawnWave(g.w);}
 else if(g.st==='wave'&&!G.mobs.some(m=>m.dgm&&!m.dead)){g.w++;g.t=0;if(g.w>=DG_WAVES.length){g.st='bwait';banner('The air grows heavy...','',2200);sfx('tell');if(NET.on&&NET.host)netEmit({y:'dg',st:'bwait'});}else{g.st='wait';g.t=2.2;hero.flask=Math.min(S.flask,hero.flask+1);toast('Wave cleared · +1 flask',1400);}}
 else if(g.st==='bwait'&&g.t>3.5){g.st='boss';dgSpawnBoss();}
 if(NET.on&&NET.host){g.mt=(g.mt||0)+dt;if(g.mt>2){g.mt=0;NET.base.child('meta/dg').set({w:g.w,st:g.st}).catch(()=>{});}}}
function dgOnEvent(e){if(!G.dg)return;if(e.st==='wave'){G.dg.w=e.w-1;G.dg.st='wave';dgBanner(e.w);}else if(e.st==='bwait'){banner('The air grows heavy...','',2200);sfx('tell');}else if(e.st==='boss'){G.dg.st='boss';}}
function dgAdopt(meta){if(G.dg&&meta&&meta.dg){G.dg.w=meta.dg.w;G.dg.st=meta.dg.st==='boss'&&!G.mobs.some(m=>m.boss&&!m.dead)?'bwait':meta.dg.st;G.dg.t=0;}}
function dungeonCleared(m){const D=dgDef(G.dg.k);G.dg.st='done';jqShard();S.dgc=S.dgc||{};S.dgc[D.k]=(S.dgc[D.k]||0)+1;S.bk=(S.bk||0)+1;
 for(let i=0;i<3;i++){const ab=D.tier>=6||Math.random()<(D.ab||.18);const e=rollEquip(Math.min(5,D.tier),true);e.tier=ab?6:Math.min(5,D.tier);e.rar=Math.random()<(i===0?.55:.3)?3:2;e.af=rollAffix(e.slot,e.rar)||(e.slot==='r'?null:null);spawnDrop(e,m.x+rnd(-2.5,2.5),m.z+rnd(-2.5,2.5));}
 S.prot=(S.prot||0)+1;S.ore.ori+=5;S.ore.elu+=5;const z=Math.round(dgLevel(D)*400*G.st.zenyM);S.zeny+=z;
 G.slow=1.6;G.zoom=.8;bigText('DUNGEON CLEARED','#ffd76a',3600);sfx('levelup');log(`🏆 ${D.n} cleared! +🛡️ Protection Scroll · +5🔷 +5🔶 · +${z.toLocaleString()}z`);
 chatSys(`${D.e} ${FB.name||heroName()} cleared ${D.n}!`);save(true);
 setTimeout(()=>{if(G.dg&&G.dg.st==='done')toast('Pick up your loot! Leaving in 20s · ☰ Map → Leave dungeon',3000);},3500);
 setTimeout(()=>{if(G.dg&&G.dg.st==='done'&&G.mode==='game')exitDungeon();},24000);}

/* ================= DUEL ARENA (challenge anyone online, any map) ================= */
function duelInvite(uid,name){if(!FB.uid)return;if(G.dg){toast('Leave the dungeon first',1500);return;}
 FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,to:uid,tn:name,y:'dinv',l:S.lv,c:S.cls,j:S.job||0,t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
 NET.arenaReq={uid,t:Date.now()};toast('⚔️ Arena challenge sent to '+esc(name),2000);}
async function arenaMsg(v){
 if(v.y==='dinv'){if(G.mode!=='game'||NET.duel||(G.dg&&!G.dg.arena)||G.bossFight){FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,to:v.u,y:'ddec',t:firebase.database.ServerValue.TIMESTAMP});return;}
  sfx('quest');const C=CLASSES[v.c];const r=await ask(`⚔️ <b>${esc(v.n)}</b> (${C?jn(v.c,v.j)+' · ':''}Lv ${v.l}) challenges you to the <b style="color:#ffd76a">Duel Arena</b>!<br><small>You'll both be taken to the Arena. Losing costs nothing.</small>`,['⚔️ Accept','Decline']);
  if(r===0&&sNow()-(v.t||0)<90000){FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,to:v.u,y:'dacc',t:firebase.database.ServerValue.TIMESTAMP});enterArena(v.u,v.u);}
  else FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,to:v.u,y:'ddec',t:firebase.database.ServerValue.TIMESTAMP});}
 else if(v.y==='dacc'&&NET.arenaReq&&NET.arenaReq.uid===v.u){NET.arenaReq=null;enterArena(FB.uid,v.u);}
 else if(v.y==='ddec'&&NET.arenaReq&&NET.arenaReq.uid===v.u){NET.arenaReq=null;toast(esc(v.n)+' declined the duel',1600);}}
function enterArena(owner,opp,teams){if(menuOpen)closeMenu();if(NET.duel)NET.duel=null;loadChapter(S.ch,true,{k:'arena',arena:1,owner,opp,teams:teams||null,wc:13,t:0,st:'wait'});banner('⚔️ Duel Arena','Waiting for your opponent...',3000);}
function arenaSetup(){const g=G.dg;scene.fog.near=25;scene.fog.far=110;hemi.intensity=.8;if(G.fog){G.fog.m.visible=false;G.fog.gl.visible=false;}
 for(let i=0;i<14;i++){const a=i/14*6.283;const x=AR.x+Math.sin(a)*(AR.r+1.4),z=AR.z+Math.cos(a)*(AR.r+1.4),y=gY(x,z);
  const p=mesh(CYL(.45,.6,3.6,8),mat(0xd8c8a0),x,y+1.8,z);world.add(p);if(i%2===0){const f=glowSprite(0xffb040,2.2);f.position.set(x,y+4,z);world.add(f);}
  const bn=mesh(BOX(.06,1.4,.8),mat(i%2?0xc41e3a:0x2a5ac4),x,y+2.6,z);bn.rotation.y=a;world.add(bn);}
 const ring=mesh(RING(AR.r-.3,AR.r),basic(0xffd76a,{transparent:true,opacity:.5,side:T.DoubleSide}),AR.x,gY(AR.x,AR.z)+.08,AR.z);ring.rotation.x=-Math.PI/2;world.add(ring);
 let me=g.owner===FB.uid,ix=0;if(g.teams){me=g.teams.A.includes(FB.uid);const t=me?g.teams.A:g.teams.B;ix=t.indexOf(FB.uid)-(t.length-1)/2;}hero.x=AR.x+ix*3;hero.z=AR.z+(me?1:-1)*(AR.r-3);hero.face=me?Math.PI:0;G.bossFight=true;G.inArena=true;G.gate='open';musicFor(13,true);}
function arenaTick(dt){const g=G.dg;g.t+=dt;if(g.over||NET.duel)return;
 if(g.teams){const all=g.teams.A.concat(g.teams.B).filter(u=>u!==FB.uid);const here=all.filter(u=>NET.peers[u]&&livePeer(NET.peers[u]));
  if(g.st==='wait'&&(here.length===all.length||(g.t>25&&here.some(u=>(g.teams.A.includes(u))!==g.teams.A.includes(FB.uid))))){g.st='count';g.ct=3.4;}
  if(g.st==='count'){const b=Math.ceil(g.ct);g.ct-=dt;if(Math.ceil(g.ct)!==b&&g.ct>0)bigText(String(Math.ceil(g.ct)),'#ffd76a',800);if(g.ct<=0){g.st='fight';const mineA=g.teams.A.includes(FB.uid);
   NET.duel={team:1,foes:(mineA?g.teams.B:g.teams.A).slice(),mates:(mineA?g.teams.A:g.teams.B).filter(u=>u!==FB.uid),outs:{},t:G.t};hero.hp=G.st.mhp;hero.flask=Math.max(hero.flask,Math.min(S.flask,3));bigText((g.teams.A.length)+' VS '+(g.teams.B.length)+'!','#ff5050',1800);sfx('roar_grunt');}}
  else if(g.t>45&&g.st==='wait'){toast('The other team did not arrive',1800);exitDungeon();}return;}
 const p=NET.peers[g.opp];
 if(p&&livePeer(p)){if(g.st==='wait'){g.st='count';g.ct=3.4;}if(g.st==='count'){const b=Math.ceil(g.ct);g.ct-=dt;if(Math.ceil(g.ct)!==b&&g.ct>0)bigText(String(Math.ceil(g.ct)),'#ffd76a',800);if(g.ct<=0){g.st='fight';duelStart(g.opp);}}}
 else if(g.t>40&&g.st==='wait'){toast('Your opponent did not arrive',1800);exitDungeon();}}

/* ================= PARTY (up to 4) + 2v2 TEAM ARENA ================= */
FB.pt=null;
function pushMsg(o){if(!FB.uid)return;o.u=FB.uid;o.n=FB.name;o.t=firebase.database.ServerValue.TIMESTAMP;FB.db.ref('world/chat/ev').push(o).catch(()=>{});}
function partyOf(lead){if(!lead)return [];const a=Object.entries(FB.pres||{}).filter(([u,v])=>v.pt===lead).map(([u])=>u);if(lead===FB.uid&&!a.includes(FB.uid))a.push(FB.uid);return a.sort((x,y)=>(x===lead?-1:y===lead?1:0));}
function myParty(){return FB.pt?partyOf(FB.pt):[];}
function partyInvite(uid,name){if(!FB.uid)return;if(!FB.pt){FB.pt=FB.uid;presenceUpdate();}if(myParty().length>=4){toast('Party is full (4)',1500);return;}pushMsg({to:uid,tn:name,y:'pinv',lead:FB.pt,c:S.cls,j:S.job||0,l:S.lv});toast('👥 Party invite sent to '+esc(name),1800);}
function partyLeave(){FB.pt=null;presenceUpdate();toast('You left the party',1400);}
async function partyMsg(v){if(v.y==='pinv'){if(FB.pt&&myParty().length>1){pushMsg({to:v.u,y:'pdec'});return;}const r=await ask(`👥 <b>${esc(v.n)}</b> invites you to their party!<br><small>Party up for dungeons and 2v2 arena battles.</small>`,['Join party','No thanks']);
  if(r===0){FB.pt=v.lead;presenceUpdate();pushMsg({to:v.u,y:'pacc'});toast('👥 You joined the party',1500);sfx('quest');}else pushMsg({to:v.u,y:'pdec'});}
 else if(v.y==='pacc'){toast('👥 '+esc(v.n)+' joined your party!',1800);sfx('quest');}
 else if(v.y==='pdec')toast(esc(v.n)+' declined the party invite',1500);
 else if(v.y==='tinv'){if(G.mode!=='game'||NET.duel||(G.dg&&!G.dg.arena)||G.bossFight){pushMsg({to:v.u,y:'ddec'});return;}
  const r=await ask(`⚔️ <b>${esc(v.n)}</b>'s team challenges your party to a <b style="color:#ffd76a">${v.A.length} vs ${v.B.length}</b> Arena battle!<br><small>Everyone in both parties will be taken to the Arena.</small>`,['⚔️ Accept','Decline']);
  if(r!==0||sNow()-(v.t||0)>90000){pushMsg({to:v.u,y:'ddec'});return;}
  for(const u of v.A.concat(v.B))if(u!==FB.uid)pushMsg({to:u,y:'tgo',owner:v.owner,A:v.A,B:v.B});enterArena(v.owner,null,{A:v.A,B:v.B});}
 else if(v.y==='tgo'){if(G.dg&&G.dg.arena&&G.dg.owner===v.owner)return;if(G.dg&&!G.dg.arena){toast('Your party went to the Arena! Leave the dungeon to join.',2500);return;}enterArena(v.owner,null,{A:v.A,B:v.B});}}
function arenaChallenge(uid,name){const tv=FB.pres[uid];const theirs=tv&&tv.pt?partyOf(tv.pt):[uid];const mine=myParty();
 if(mine.length>=2&&theirs.length>=2){if(theirs.some(u=>mine.includes(u))){toast("They're in your party 🙂",1400);return;}
  const lead=tv.pt;pushMsg({to:lead,tn:name,y:'tinv',owner:FB.uid,A:mine,B:theirs});NET.arenaReq={uid:lead,t:Date.now(),team:1};toast(`⚔️ ${mine.length}v${theirs.length} challenge sent to ${esc(FB.pres[lead]?FB.pres[lead].n:name)}'s party`,2200);}
 else duelInvite(uid,name);}
function partyHtml(){if(!FB.uid)return '';const m=myParty();let h=`<div class="card"><div class="ttl">👥 Party ${m.length?'('+m.length+'/4)':''}</div>`;
 if(m.length<2)h+='<i style="color:#a99cc0;font-size:12px">Not in a party. Tap 👥 next to a player to invite them. With 2+ in your party, ⚔️ on another party makes a team battle (2v2, 3v3...).</i>';
 else{for(const u of m){const v=FB.pres[u]||{};const C=CLASSES[v.c];h+=`<div class="row"><span class="nm">${u===FB.pt?'👑 ':''}<b>${esc(v.n||(u===FB.uid?FB.name:'?'))}</b>${u===FB.uid?' (you)':''}<i>${C?jn(v.c,v.j)+' · ':''}Lv ${v.l||'?'} · ${v.ch>=0?'Ch.'+(v.ch+1):'title'}</i></span>${u!==FB.uid&&v.ch>=0?`<button data-a="join" data-v="${u}">Join</button>`:''}</div>`;}
  h+='<button class="mbtn" data-a="pleave">🚪 Leave party</button>';}
 return h+'</div>';}

/* ================= ENDLESS TOWER (floors 1-100, a boss every 5 floors) ================= */
DUNGEONS.push({k:'tower',n:'Endless Tower',e:'🗼',req:9,w:14,boss:'lich',col:'#ffd76a',tier:5,ab:.2,tower:1,d:'A tower with no top. 100 floors, a guardian every 5 floors. Your progress is saved at every boss floor.'});
const TW_POOL=['boar','ogre','troll','golemking','wyrm','lich','behemoth','hydra','colossus','seraph','kingarthur','mohg','ifrit','diamondking','twilightking','ironking','shadowking','dragonking','gatekeeper'];
const TW_THEME=[0x2a2430,0x30222a,0x1e2a30,0x2a2a1e,0x24182e,0x301a1a,0x1a2430,0x2a1a30,0x18181e,0x0e0814];
function twLv(f){return 12+f*5+(S.ngp||0)*20;}
function enterTower(floor,owner){if(menuOpen)closeMenu();loadChapter(S.ch,true,{k:'tower',tower:1,floor:floor||1,owner:owner||FB.uid||'solo',w:0,st:'wait',t:0,wc:14});}
function towerSetup(){const g=G.dg;dgDarken({col:'#ffd76a'});scene.fog.near=12;scene.fog.far=70;
 const th=TW_THEME[Math.floor((g.floor-1)/10)%TW_THEME.length];G.twObj=[];
 const wall=mesh(CYL(AR.r+2.2,AR.r+2.2,16,28,1,true),mat(th,{side:T.BackSide,roughness:.9,emissive:0x050308}),AR.x,gY(AR.x,AR.z)+6,AR.z);wall.castShadow=false;world.add(wall);G.twObj.push(wall);
 const flo=mesh(CYL(AR.r+2.2,AR.r+2.2,.4,28),mat(th+0x0a0a0a,{roughness:.95}),AR.x,gY(AR.x,AR.z)-.05,AR.z);flo.receiveShadow=true;world.add(flo);G.twObj.push(flo);
 for(let i=0;i<4;i++){const r=mesh(RING(3+i*3.4,3.2+i*3.4),basic(0xffd76a,{transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false}),AR.x,gY(AR.x,AR.z)+.2,AR.z);r.rotation.x=-Math.PI/2;world.add(r);G.twObj.push(r);}
 for(let i=0;i<8;i++){const a=i/8*6.283;const x=AR.x+Math.sin(a)*(AR.r+1.2),z=AR.z+Math.cos(a)*(AR.r+1.2);const st=mesh(BOX(1.2,.4,2.2),mat(th+0x111111),x,gY(x,z)+.2+i*.0,z);st.rotation.y=a;world.add(st);}
 hero.x=AR.x;hero.z=AR.z+AR.r-3;hero.face=Math.PI;G.bossFight=true;G.inArena=true;G.gate='open';musicFor(14,true);twLabel();setTimeout(()=>{if(G.dg&&G.dg.tower)banner('🗼 Endless Tower · Floor '+G.dg.floor,G.dg.floor%5===0?'⚠️ Guardian floor':'Defeat every monster to open the stairs',2600);},400);}
function twLabel(){let el=$('#twF');if(!el){el=document.createElement('div');el.id='twF';el.style.cssText='position:absolute;top:calc(48px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);font:700 15px Georgia,serif;color:#ffd76a;text-shadow:0 2px 4px #000;pointer-events:none;z-index:5';$('#hud').appendChild(el);}
 el.style.display=G.dg&&G.dg.tower?'':'none';if(G.dg&&G.dg.tower){const left=G.mobs.filter(m=>!m.dead&&!m.anchor).length;el.textContent=`🗼 Floor ${G.dg.floor}/100${G.dg.st==='fight'?' · '+left+' left':G.dg.st==='portal'?' · stairs open':''}`;}}
function towerTick(dt){const g=G.dg;g.t+=dt;g.lt=(g.lt||0)+dt;if(g.lt>.3){g.lt=0;twLabel();}if(isPuppet())return;
 if(g.st==='wait'&&g.t>2.5){g.st='fight';twSpawn(g.floor);}
 else if(g.st==='fight'&&g.t>1&&!G.mobs.some(m=>!m.dead)){if(g.floor>=100){g.st='done';hEmit({y:'twd'},()=>towerDone());}else{g.st='portal';hEmit({y:'twp',f:g.floor},e=>twPortal(e.f));}}
 if(NET.on&&NET.host){g.mt=(g.mt||0)+dt;if(g.mt>2){g.mt=0;NET.base.child('meta/tw').set({f:g.floor,st:g.st}).catch(()=>{});}}}
function twSpawn(f){const boss=f%5===0;const lv=Math.max(twLv(f),boss?0:topLv()-30);const defs=CHS[(Math.floor(f/3)*7)%CHS.length].mobs;const pc=dgCount();
 const n=Math.round(Math.min(16,(boss?3:6)+f*.1)*(1+.5*(pc-1)));
 for(let i=0;i<n;i++){const a=i/n*6.283+rnd(-.2,.2),rr=rnd(5,AR.r-2);const d=mobDef(defs[i%defs.length],lv);d.hp=Math.round(d.hp*(1.6+f*.012));d.atk=Math.round(d.atk*(1.15+f*.004));d.exp=Math.round(d.exp*2);d.aggro=1;
  const m=mkMob(d,AR.x+Math.sin(a)*rr,AR.z+Math.cos(a)*rr,false);m.agg=true;m.wave=true;G.mobs.push(m);fxRing(m.x,m.z,1.4,0xffd76a,.5);}
 if(boss){const key=f>=100?'lich':TW_POOL[(f/5-1)%TW_POOL.length];const d=bossBoost(bossDef(BOSSES[key]?key:'lich',twLv(f)+6));d.hp=Math.round(d.hp*(1.2+f*.008));d.atk=Math.round(d.atk*(1.1+f*.003));
  if(f>=100)d.n='Lord of the Endless Tower';else d.n=d.n+' · Floor '+f;const m=mkMob(d,AR.x,AR.z-6,true);m.agg=false;m.face=0;m.baseMhp=m.mhp;m.coopN=1;G.mobs.push(m);G.boss=m;G.bossFight=true;
  G.introDone=1;G.intro={t:0,dur:2.6,m};$('#cine').style.opacity=1;sfx('roar_'+(d.roar||'deep'));setTimeout(()=>{$('#bossN').textContent=d.n;bigText(d.n.toUpperCase(),'#ffd76a',2600);},700);}
 sfx('wave');}
function twPortal(f){if(!G.dg||!G.dg.tower)return;G.dg.st='portal';G.dg.floor=f;S.et=S.et||{best:0,cp:1};S.et.best=Math.max(S.et.best,f);
 if(f%5===0){S.et.cp=Math.max(S.et.cp||1,f+1);twReward(f);}
 if(G.twPortal)world.remove(G.twPortal);const p=grp(AR.x,gY(AR.x,AR.z),AR.z);const r=mesh(TOR(1.6,.18),basic(0xffd76a),0,1.8,0);p.add(r);const s=mesh(CYL(1.5,1.5,.05,24),basic(0xb06aff,{transparent:true,opacity:.6}),0,1.8,0);s.rotation.x=Math.PI/2;p.add(s);p.add(glowSprite(0xb06aff,4).translateY(1.8));p.userData.r=r;world.add(p);G.twPortal=p;
 banner('Floor '+f+' cleared!','The stairs are open. Step into the light ('+(f+1)+')',2400);sfx('gate');save();}
function twReward(f){const tier=Math.min(5,1+Math.floor(f/20));const ab=f>=50&&Math.random()<(f>=100?1:.12+f*.002);const e=rollEquip(tier,true);e.tier=ab?6:tier;e.rar=Math.random()<.25+f*.004?3:2;e.af=rollAffix(e.slot,e.rar);
 spawnDrop(e,AR.x+rnd(-2,2),AR.z-4+rnd(-1,1));const z=Math.round(twLv(f)*120*(G.st?G.st.zenyM:1));S.zeny+=z;S.ore.ori+=1+Math.floor(f/20);S.ore.elu+=1+Math.floor(f/20);if(f%25===0)S.prot=(S.prot||0)+1;
 log(`🗼 Guardian of floor ${f} defeated! +${z.toLocaleString()}z · ores${f%25===0?' · 🛡️ Protection Scroll':''} · checkpoint saved (floor ${f+1})`);}
function towerNext(){const g=G.dg;if(!g||!g.tower||g.st!=='portal')return;if(isPuppet()){netEmit({y:'twn'});return;}hEmit({y:'tw',f:g.floor+1},e=>twFloorLocal(e.f));}
function twFloorLocal(f){const g=G.dg;if(!g||!g.tower)return;g.floor=f;g.st='wait';g.t=0;if(G.twPortal){world.remove(G.twPortal);G.twPortal=null;}G.bossFight=true;G.boss=null;
 G.mobs.filter(m=>m.dead).forEach(removeMob);G.mobs=G.mobs.filter(m=>!m.dead);hero.x=AR.x+rnd(-1.5,1.5);hero.z=AR.z+AR.r-3;hero.face=Math.PI;snapCam();
 hero.hp=Math.min(G.st.mhp,hero.hp+G.st.mhp*.25);hero.sp=Math.min(G.st.msp,hero.sp+G.st.msp*.25);
 const th=TW_THEME[Math.floor((f-1)/10)%TW_THEME.length];if(G.twObj&&G.twObj[0])G.twObj[0].material.color.setHex(th);
 banner('🗼 Floor '+f,f%5===0?'⚠️ Guardian floor':f===100?'The top of the tower':'Defeat every monster',2200);sfx('wave');twLabel();}
function towerDone(){if(!G.dg)return;G.dg.st='done';S.et=S.et||{best:0,cp:1};S.et.best=100;twReward(100);bigText('ENDLESS TOWER CONQUERED','#ffd76a',4000);sfx('ending');chatSys(`🗼 ${FB.name||heroName()} conquered all 100 floors of the Endless Tower!`);save(true);
 setTimeout(()=>{if(G.dg&&G.dg.tower)exitDungeon();},25000);}
/* ================= FRIENDS · PARTY WORLDS · CHAT · WORLD MAP · PASSWORD ================= */
FB.friends={};FB.partyMode=(()=>{try{return localStorage.getItem('so_party')==='f'}catch(e){return false}})();FB.chat=[];FB.chatUnread=0;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function netKey(c){if(G.dg)return 'dg_'+G.dg.k+'_'+(G.dg.owner||FB.uid);if(NET.party)return 'f_'+NET.party+'_ch'+c;return 'ch'+c;}
function canEnterPrivate(owner){if(owner===FB.uid)return true;const p=FB.pres[owner];return !!(p&&(p.fr||[]).includes(FB.uid));}

/* ---------- friends ---------- */
let frRef=null,frCb=null;
function friendsStart(){if(!FB.uid)return;frRef=FB.db.ref('users/'+FB.uid+'/f');frCb=frRef.on('value',s=>{FB.friends=s.val()||{};presenceUpdate();if(menuOpen&&(G.tab==='online'||G.tab==='chat'))softRender();});}
function friendsStop(){if(frRef&&frCb)frRef.off('value',frCb);frRef=null;frCb=null;FB.friends={};}
async function findPlayer(name){name=(name||'').trim().toLowerCase();if(!name)return null;
 for(const [u,v] of Object.entries(FB.pres||{}))if((v.n||'').toLowerCase()===name)return {uid:u,n:v.n};
 try{const s=await withTimeout(FB.db.ref('lb').orderByChild('sc').limitToLast(1000).once('value'),8000);let r=null;s.forEach(c=>{const v=c.val();if((v.n||'').toLowerCase()===name)r={uid:c.key,n:v.n};});return r;}catch(e){return null;}}
async function addFriend(name){if(!FB.uid)return;const nm=(name||'').trim();if(!nm){toast('Type a username first',1400);return;}
 if(nm.toLowerCase()===FB.name.toLowerCase()){toast("That's you 😄",1400);return;}
 toast('Searching...',800);const p=await findPlayer(nm);if(!p){toast(`No player named "${esc(nm)}" found.<br><small>They need to be online or have saved once.</small>`,2400);return;}
 if(Object.keys(FB.friends).length>=60){toast('Friend list is full (60)',1600);return;}
 await FB.db.ref('users/'+FB.uid+'/f/'+p.uid).set(p.n).catch(()=>{});toast('⭐ '+esc(p.n)+' added as a friend!',1800);sfx('quest');
 netDM(p.uid,p.n,'👋 added you as a friend!',1);}
function removeFriend(uid){if(!FB.uid)return;FB.db.ref('users/'+FB.uid+'/f/'+uid).remove().catch(()=>{});}
function joinPlayer(uid){const v=FB.pres[uid];if(!v||v.ch<0){toast('They are not in the game right now',1500);return;}
 const w=v.w||'';closeMenu();
 if(w.startsWith('dg_arena_')||w.startsWith('dg_trial_')){toast('⚔️ They are fighting in the Duel Arena right now',1800);return;}
 if(w.startsWith('dg_tower_')){const owner=w.slice(9);if(v.pv&&!canEnterPrivate(owner)){toast('🔒 That tower party is friends-only',1800);return;}if(!dgUnlocked(dgDef('tower'))){toast('🔒 Clear Chapter 10 first',1600);return;}enterTower(1,owner);return;}
 if(w.startsWith('dg_')){const parts=w.split('_');const k=parts[1],owner=parts.slice(2).join('_');const D=dgDef(k);
  if(v.pv&&!canEnterPrivate(owner)){toast('🔒 That dungeon party is friends-only',1800);return;}
  if(!D||!dgUnlocked(D)){toast(`🔒 You need to clear Chapter ${D?D.req+1:'?'} first`,1800);return;}enterDungeon(k,owner);return;}
 if(v.ch>S.unlocked){toast(`🔒 Reach Chapter ${v.ch+1} first`,1600);return;}
 if(w.startsWith('f_')){const owner=w.slice(2).replace(/_ch\d+$/,'');if(!canEnterPrivate(owner)){toast('🔒 Their world is friends-only. Ask them to add you as a friend.',2200);return;}NET.party=owner;}
 else NET.party=null;
 loadChapter(v.ch,true);titleCard(v.ch);save();}
function setPartyMode(on){FB.partyMode=on;try{localStorage.setItem('so_party',on?'f':'')}catch(e){}NET.party=on?FB.uid:null;
 if(G.mode==='game'&&S&&!G.dg)loadChapter(S.ch,true);presenceUpdate();toast(on?'🔒 Friends-only world: only your friends can join you':'🌍 Public world: everyone in this chapter shares the map',2200);}

/* ---------- chat ---------- */
let chRef=null,chCb=null;
function chatStart(){if(!FB.uid)return;chRef=FB.db.ref('world/chat/ev').orderByKey().limitToLast(80);
 chCb=chRef.on('child_added',s=>{const v=s.val();if(v&&v.y){if(v.to===FB.uid&&sNow()-(v.t||0)<60000){if(/^(pinv|pacc|pdec|tinv|tgo)$/.test(v.y))partyMsg(v);else if(v.y[0]==='x')trMsg(v);else arenaMsg(v);}return;}if(!v||!v.m)return;if(v.to&&v.to!==FB.uid&&v.u!==FB.uid)return;if(v.pt&&v.pt!==FB.pt&&v.u!==FB.uid)return;
  if(v.pt&&v.u!==FB.uid&&sNow()-(v.t||0)<15000){const pp=NET.peers[v.u];if(pp&&pp.x!=null)bubble(pp,String(v.m).slice(0,60),1);}
  addChat({c:v.to?'d':v.pt?'p':'w',u:v.u,n:v.n,fa:v.fa,m:String(v.m).slice(0,140),t:v.t||Date.now(),to:v.to,tn:v.tn,s:v.s});});
 // tidy up: remove world-chat messages older than 3 days
 setTimeout(()=>{FB.db.ref('world/chat/ev').orderByKey().limitToFirst(25).once('value',s=>s.forEach(c=>{const v=c.val();if(!v||!v.t||sNow()-v.t>3*864e5)c.ref.remove().catch(()=>{});})).catch(()=>{});},9000);}
function chatStop(){if(chRef&&chCb)chRef.off('child_added',chCb);chRef=null;chCb=null;FB.chat=[];}
function addChat(o){FB.chat.push(o);if(FB.chat.length>150)FB.chat.shift();const mine=o.u===FB.uid;
 if(!mine&&o.t>(FB.chatSeen||0)&&!(menuOpen&&G.tab==='chat'))FB.chatUnread++;
 chatBadge();if(Date.now()-o.t<15000||o.c==='a')feedLine(o);if(menuOpen&&G.tab==='chat')chatListRender();}
let lastSend=0;
function chatSend(txt){txt=(txt||'').replace(/\s+/g,' ').trim().slice(0,120);if(!txt||!FB.uid)return false;if(Date.now()-lastSend<1200){toast('Slow down a little 🙂',900);return false;}lastSend=Date.now();
 const ch=G.chC||'w';
 if(ch==='a'){if(!NET.on){toast('Area chat needs online play ON',1400);return false;}netEmit({y:'cm',n:FB.name,fa:S?S.fac:'',m:txt});addChat({c:'a',u:FB.uid,n:FB.name,fa:S?S.fac:'',m:txt,t:Date.now()});bubble(hero,txt,1);return true;}
 if(ch==='p'){if(!FB.pt||myParty().length<2){toast('You are not in a party',1300);return false;}FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,fa:S?S.fac||'':'',m:txt,pt:FB.pt,t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>toast('Message not sent',1200));bubble(hero,txt.slice(0,60),1);return true;}
 if(ch==='d'){if(!G.chTo){toast('Pick a friend to message',1400);return false;}netDM(G.chTo,FB.friends[G.chTo]||'?',txt);return true;}
 FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,fa:S?S.fac||'':'',m:txt,t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>toast('Message not sent',1200));return true;}
function netDM(uid,tn,txt,quiet){if(!FB.uid)return;FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,fa:S?S.fac||'':'',m:txt,to:uid,tn,t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});}
function chatSys(txt){if(!FB.uid||!FB.db)return;FB.db.ref('world/chat/ev').push({u:FB.uid,n:FB.name,m:txt,s:1,t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});}
function chatArea(e){addChat({c:'a',u:e.u,n:e.n,fa:e.fa,m:String(e.m||'').slice(0,140),t:Date.now()});const p=NET.peers[e.u];if(p&&p.x!=null)bubble(p,String(e.m||'').slice(0,60),1);}
function chatBadge(){const b=$('#chatN');if(b)b.textContent=FB.chatUnread?(FB.chatUnread>9?'9+':FB.chatUnread):'CHAT';const bt=$('#bChat');if(bt){bt.style.display=FB.uid?'':'none';bt.classList.toggle('on',FB.chatUnread>0);}}
function fmtChat(o){const f=FACTIONS.find(x=>x.k===o.fa);const tag=o.c==='a'?'<span style="color:#8fe3b0">[Area]</span> ':o.c==='p'?'<span style="color:#7fc8ff">[Party]</span> ':o.c==='me'?'':o.c==='d'?`<span style="color:#ff9ad8">[${o.u===FB.uid?'→ '+esc(o.tn||'?'):'DM'}]</span> `:'';
 if(o.s)return `<span style="color:#ffd76a">📢 ${esc(o.m)}</span>`;return `${tag}<b style="color:${f?f.c:'#cbbde3'}">${f?f.e:''}${esc(o.n)}</b>: ${esc(o.m)}`;}
function feedLine(o){let f=$('#chatF');if(!f)return;const d=document.createElement('div');d.className='cfl';d.innerHTML=fmtChat(o);f.appendChild(d);while(f.children.length>6)f.firstChild.remove();setTimeout(()=>{d.style.opacity=0;setTimeout(()=>d.remove(),600);},14000);}
function chatHtml(){if(!FB.uid)return `<div class="card"><div class="ttl">💬 Chat</div>Log in from the title screen to chat with other players.</div>`;
 const c=G.chC||'w';const fr=Object.entries(FB.friends);
 let h=`<div class="card chatw"><div class="fbar"><button data-a="chc" data-v="w" class="${c==='w'?'on':''}">🌍 World</button><button data-a="chc" data-v="a" class="${c==='a'?'on':''}">📍 Area</button><button data-a="chc" data-v="d" class="${c==='d'?'on':''}">💌 Friends</button></div>`;
 if(c==='d')h+=fr.length?`<div class="fbar" style="margin-top:4px">${fr.map(([u,n])=>`<button data-a="chto" data-v="${u}" class="${G.chTo===u?'on':''}">${FB.pres[u]?'🟢':'⚫'} ${esc(n)}</button>`).join('')}</div>`:'<i style="font-size:12px;color:#a99cc0">Add friends in the 🌐 Online tab to message them.</i>';
 h+=`<div id="chList"></div>
 <div class="chatin"><input id="chIn" maxlength="120" placeholder="${c==='w'?'Say something to everyone...':c==='a'?'Talk to players near you...':'Message your friend...'}" autocomplete="off"><button id="chGo">Send</button></div>
 <i class="note">Be nice! Messages to friends aren't encrypted, so don't share passwords.</i></div>`;return h;}
function chatListRender(){const L=$('#chList');if(!L)return;const c=G.chC||'w';
 const list=FB.chat.filter(o=>c==='w'?(o.c==='w'):c==='a'?o.c==='a':(o.c==='d'&&(!G.chTo||o.u===G.chTo||o.to===G.chTo)));
 const near=L.scrollHeight-L.scrollTop-L.clientHeight<40;L.innerHTML=list.slice(-80).map(o=>`<div>${fmtChat(o)}</div>`).join('')||'<i style="color:#a99cc0">No messages yet. Say hi! 👋</i>';if(near||!L.dataset.init){L.scrollTop=L.scrollHeight;L.dataset.init=1;}
 FB.chatUnread=0;FB.chatSeen=Date.now();chatBadge();}
function chatWire(){const i=$('#chIn'),b=$('#chGo');if(!i)return;chatListRender();const go=()=>{if(chatSend(i.value)){i.value='';chatListRender();}};
 b.onclick=e=>{e.stopPropagation();go();};i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go();});i.addEventListener('click',e=>e.stopPropagation());}
// re-render the menu without wiping text someone is typing
function softRender(){const a=document.activeElement;if(a&&a.tagName==='INPUT'&&$('#menu').contains(a)){if(G.tab==='chat')chatListRender();return;}renderMenu();}

/* ---------- friends UI (inside Online tab) ---------- */
function friendsHtml(){if(!FB.uid)return '';const fr=Object.entries(FB.friends).sort((a,b)=>(!!FB.pres[b[0]])-(!!FB.pres[a[0]]));
 let h=`<div class="card"><div class="ttl">⭐ Friends (${fr.length})</div><div style="display:flex;gap:6px;margin-bottom:6px"><input id="frIn" maxlength="12" placeholder="Add friend by username" style="flex:1;min-width:0;padding:8px;border-radius:8px;border:1px solid #6a5590;background:#1a1228;color:#fff;font-size:15px" autocomplete="off" spellcheck="false"><button class="btn" id="frGo" style="width:auto;padding:6px 12px;margin:0">Add</button></div>`;
 if(!fr.length)h+='<i style="color:#a99cc0;font-size:12px">No friends yet. Type their username above.</i>';
 for(const [u,n] of fr){const p=FB.pres[u];const where=p?(p.ch>=0?(String(p.w||'').startsWith('dg_arena')?'⚔️ Duel Arena':String(p.w||'').startsWith('dg_')?'⚔️ '+(dgDef(String(p.w).split('_')[1])||{n:'Dungeon'}).n:'Ch.'+(p.ch+1)+' '+CHS[p.ch].name)+(p.pv?' 🔒':''):'On title screen'):'Offline';
  h+=`<div class="row"><span class="nm">${p?'🟢':'⚫'} <b>${esc(n)}</b><i>${p&&p.l?'Lv '+p.l+' · ':''}${where}</i></span>${p&&p.ch>=0?`<button data-a="join" data-v="${u}">Join</button><button data-a="arena" data-v="${u}">⚔️</button><button data-a="pinv" data-v="${u}">👥</button><button data-a="trade" data-v="${u}">🤝</button>`:''}<button data-a="dm" data-v="${u}">💬</button><button data-a="unfr" data-v="${u}">✕</button></div>`;}
 return h+'</div>';}
function friendsWire(){const i=$('#frIn'),b=$('#frGo');if(!i)return;const go=async()=>{const v=i.value;i.value='';await addFriend(v);};b.onclick=e=>{e.stopPropagation();go();};i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go();});i.addEventListener('click',e=>e.stopPropagation());}

/* ---------- world map ---------- */
const WM_POS=[[90,470],[185,425],[150,340],[265,300],[385,420],[480,485],[590,435],[695,475],[805,405],[905,330],[850,230],[925,130],[790,90],[665,150],[560,95],[460,165],[360,110],[260,170],[160,110],[70,55]];
const WM_DG={crypt:[500,380],forge:[720,345],sanctum:[610,240],abyss:[55,190],vault:[770,530],lichcrypt:[420,40],tower:[960,470]};
const WM2_DG={crimson:[700,410],codex:[330,330],fallen:[90,230],voidvault:[600,40]};
function mapTabs(w){return `<div class="fbar" style="margin-bottom:6px"><button data-a="mapw" data-v="0" class="${w===0?'on':''}">🏰 The Old World (1-20)</button><button data-a="mapw" data-v="1" class="${w===1?'on':''}">${S.unlocked>=20?'🌍':'🔒'} Eldoria (21-${CHS.length})</button></div>`;}
const WM2_POS=[];for(let i=0;i<30;i++){const row=Math.floor(i/6),col=i%6;WM2_POS.push([row%2?885-col*155:115+col*155,490-row*104]);}
function mapEldHtml(){const sel=typeof G.mapSel==='number'&&G.mapSel>=20?G.mapSel:Math.max(20,S.ch);const here={};
 for(const [u,v] of Object.entries(FB.pres||{})){if(u===FB.uid||v.ch<20)continue;(here[v.ch]=here[v.ch]||[]).push({u,v});}
 let svg=`<svg viewBox="0 0 1000 560" style="width:100%;height:auto;display:block;background:radial-gradient(ellipse at 50% 45%,#2a1a4a 0%,#140c26 60%,#06040e 100%);border-radius:10px">`;
 svg+=`<defs><filter id="wmb2"><feGaussianBlur stdDeviation="20"/></filter></defs><g filter="url(#wmb2)" opacity=".7">`;
 WM2_POS.forEach(([x,y],k)=>{const b=B[CHS[20+k].b];svg+=`<circle cx="${x}" cy="${y}" r="70" fill="#${new T.Color(b.g1).getHexString()}"/>`;});svg+='</g>';
 [['Act VI · The Journey Begins',150,548],['Act VII · Ancient Secrets',840,440],['Act VIII · The Ten Kingdoms',500,330],['Act IX · The Forbidden Territory',500,125],['Act X · A New Dawn',860,22]].forEach(([t,x,y])=>{svg+=`<text x="${x}" y="${y}" fill="rgba(232,194,106,.55)" font-size="16" font-family="Georgia" text-anchor="middle" font-style="italic">${t}</text>`;});
 svg+=`<path d="M${WM2_POS.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="rgba(176,106,255,.5)" stroke-width="3" stroke-dasharray="8 7"/>`;
 WM2_POS.forEach(([x,y],k)=>{const i=20+k,cl=S.cleared[i],lk=i>S.unlocked,me=S.ch===i&&!G.dg,b=B[CHS[i].b],col='#'+new T.Color(b.g1).getHexString(),co=CHS[i].party;
  svg+=`<g data-a="mapsel" data-v="${i}" style="cursor:pointer">${sel===i?`<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="#fff" stroke-width="2.5"/>`:''}<circle cx="${x}" cy="${y}" r="19" fill="${lk?'#2a2a33':col}" stroke="${cl?'#ffd76a':lk?'#555':co?'#ff6a6a':'#cbbde3'}" stroke-width="3"/>
  <text x="${x}" y="${y+6}" fill="${lk?'#777':'#fff'}" font-size="15" font-weight="800" text-anchor="middle" font-family="system-ui">${lk?'🔒':i+1}</text>${cl?`<text x="${x+15}" y="${y-12}" font-size="13">👑</text>`:''}${co&&!lk?`<text x="${x-27}" y="${y+5}" font-size="12">🤝</text>`:''}
  ${me?`<text x="${x}" y="${y-27}" fill="#ffd76a" font-size="13" font-weight="800" text-anchor="middle">▼ YOU</text>`:''}${here[i]?`<circle cx="${x+17}" cy="${y-15}" r="10" fill="#2fbf6a" stroke="#fff" stroke-width="1.5"/><text x="${x+17}" y="${y-10.5}" fill="#fff" font-size="12" font-weight="800" text-anchor="middle">${here[i].length}</text>`:''}</g>`;});
 for(const D of DUNGEONS){if(!WM2_DG[D.k])continue;const [x,y]=WM2_DG[D.k];const ok=dgUnlocked(D);const id='d:'+D.k;
  svg+=`<g data-a="mapsel" data-v="${id}" style="cursor:pointer"><line x1="${x}" y1="${y}" x2="${WM2_POS[D.req-20][0]}" y2="${WM2_POS[D.req-20][1]}" stroke="${ok?D.col:'#444'}" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>${G.mapSel===id?`<rect x="${x-25}" y="${y-25}" width="50" height="50" rx="10" fill="none" stroke="#fff" stroke-width="2.5"/>`:''}<rect x="${x-19}" y="${y-19}" width="38" height="38" rx="8" fill="${ok?'#1a0f24':'#222'}" stroke="${ok?D.col:'#555'}" stroke-width="3" transform="rotate(45 ${x} ${y})"/><text x="${x}" y="${y+7}" font-size="19" text-anchor="middle">${ok?D.e:'🔒'}</text></g>`;}
 svg+='</svg>';if(typeof G.mapSel==='string'&&G.mapSel.startsWith('d:')&&WM2_DG[G.mapSel.slice(2)])return `<div class="card" style="padding:6px">${mapTabs(1)}${svg}</div>`+dgInfoHtml(dgDef(G.mapSel.slice(2)));
 const c=CHS[sel],lk=sel>S.unlocked,ppl=here[sel]||[];
 const info=`<div class="card"><div class="ttl">Chapter ${sel+1}: ${c.name} ${S.cleared[sel]?'👑':''}</div><span style="color:#a99cc0;font-size:12px">${ACTS[actOf(sel)]} · Recommended Lv ${chLevel(sel)}+${c.boss?' · Boss: <b>'+BOSSES[c.boss].n+'</b>':' · Story chapter'}${c.party?` · 🤝 <b style="color:#ff9a9a">Team battle (${c.party} fighters). Companions fill empty spots.</b>`:''}</span>${ppl.length?'<br>👥 Here now: '+ppl.slice(0,8).map(({u,v})=>(FB.friends[u]?'⭐':'')+esc(v.n)).join(', '):''}<br>
  ${lk?`<i>🔒 ${sel===20?'Defeat Malgrath (Chapter 20) to open the New World.':'Clear Chapter '+sel+' to unlock.'}</i>`:S.ch===sel&&!G.dg?'<i>📍 You are here.</i>':`<button class="mbtn" data-a="travel" data-v="${sel}">🚶 Travel here</button>`}</div>`;
 return `<div class="card" style="padding:6px">${mapTabs(1)}${svg}<div style="font-size:11px;color:#a99cc0;margin-top:4px">👑 cleared · 🤝 team battle · 🟢 players there · ▼ you</div></div>`+info+(G.dg?`<button class="mbtn" data-a="dgleave">🚪 Leave</button>`:'');}
function mapHtml(){if((G.mapW!=null?G.mapW:(S.ch>=20&&!G.dg?1:0))===1)return mapEldHtml();return mapOldHtml();}
function mapOldHtml(){const sel=G.mapSel==null||(typeof G.mapSel==='number'&&G.mapSel>=20)?(G.dg&&!G.dg.arena&&!G.dg.trial?'d:'+G.dg.k:Math.min(19,S.ch)):G.mapSel;const pres=FB.pres||{};const here={};
 for(const [u,v] of Object.entries(pres)){if(u===FB.uid||v.ch<0)continue;const key=String(v.w||'').startsWith('dg_')?'d:'+String(v.w).split('_')[1]:v.ch;(here[key]=here[key]||[]).push({u,v});}
 let svg=`<svg viewBox="0 0 1000 560" style="width:100%;height:auto;display:block;background:radial-gradient(ellipse at 50% 55%,#2a3a4a 0%,#162030 60%,#0a0f18 100%);border-radius:10px;touch-action:manipulation">`;
 svg+=`<defs><filter id="wmb"><feGaussianBlur stdDeviation="22"/></filter></defs><g filter="url(#wmb)" opacity=".75">`;
 WM_POS.forEach(([x,y],i)=>{const b=B[CHS[i].b];svg+=`<circle cx="${x}" cy="${y}" r="78" fill="#${new T.Color(b.g1).getHexString()}"/>`;});svg+='</g>';
 ['Act I · Lowlands','Act II · Scorched South','Act III · Frozen North','Act IV · Shadowlands','Act V · Shadow Keep'].forEach((t,a)=>{const p=[[150,535],[540,540],[880,470],[600,40],[150,30]][a];svg+=`<text x="${p[0]}" y="${p[1]}" fill="rgba(232,194,106,.55)" font-size="17" font-family="Georgia" text-anchor="middle" font-style="italic">${t}</text>`;});
 svg+=`<path d="M${WM_POS.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="rgba(232,194,106,.45)" stroke-width="3" stroke-dasharray="8 7"/>`;
 WM_POS.forEach(([x,y],i)=>{const cl=S.cleared[i],lk=i>S.unlocked,me=S.ch===i&&!G.dg,b=B[CHS[i].b];const col='#'+new T.Color(b.g1).getHexString();
  svg+=`<g data-a="mapsel" data-v="${i}" style="cursor:pointer">${sel===i?`<circle cx="${x}" cy="${y}" r="27" fill="none" stroke="#fff" stroke-width="2.5" opacity=".9"/>`:''}<circle cx="${x}" cy="${y}" r="20" fill="${lk?'#2a2a33':col}" stroke="${cl?'#ffd76a':lk?'#555':'#cbbde3'}" stroke-width="3"/>
  <text x="${x}" y="${y+6}" fill="${lk?'#777':'#fff'}" font-size="16" font-weight="800" text-anchor="middle" font-family="system-ui">${lk?'🔒':i+1}</text>${cl?`<text x="${x+16}" y="${y-13}" font-size="14">👑</text>`:''}
  ${me?`<text x="${x}" y="${y-28}" fill="#ffd76a" font-size="13" font-weight="800" text-anchor="middle">▼ YOU</text>`:''}${here[i]?`<circle cx="${x-17}" cy="${y-15}" r="10" fill="#2fbf6a" stroke="#fff" stroke-width="1.5"/><text x="${x-17}" y="${y-10.5}" fill="#fff" font-size="12" font-weight="800" text-anchor="middle">${here[i].length}</text>`:''}</g>`;});
 for(const D of DUNGEONS){if(!WM_DG[D.k])continue;const [x,y]=WM_DG[D.k];const ok=dgUnlocked(D),me=G.dg&&G.dg.k===D.k,id='d:'+D.k;
  svg+=`<g data-a="mapsel" data-v="${id}" style="cursor:pointer"><line x1="${x}" y1="${y}" x2="${WM_POS[D.req][0]}" y2="${WM_POS[D.req][1]}" stroke="${ok?D.col:'#444'}" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>${sel===id?`<rect x="${x-25}" y="${y-25}" width="50" height="50" rx="10" fill="none" stroke="#fff" stroke-width="2.5"/>`:''}
   <rect x="${x-19}" y="${y-19}" width="38" height="38" rx="8" fill="${ok?'#1a0f24':'#222'}" stroke="${ok?D.col:'#555'}" stroke-width="3" transform="rotate(45 ${x} ${y})"/><text x="${x}" y="${y+7}" font-size="19" text-anchor="middle">${ok?D.e:'🔒'}</text>
   ${me?`<text x="${x}" y="${y-30}" fill="#ffd76a" font-size="13" font-weight="800" text-anchor="middle">▼ YOU</text>`:''}${here[id]?`<circle cx="${x+20}" cy="${y-18}" r="10" fill="#2fbf6a" stroke="#fff" stroke-width="1.5"/><text x="${x+20}" y="${y-13.5}" fill="#fff" font-size="12" font-weight="800" text-anchor="middle">${here[id].length}</text>`:''}</g>`;}
 svg+='</svg>';
 let info='';const ppl=here[sel]||[];const pl=ppl.length?`<br>👥 Here now: ${ppl.slice(0,8).map(({u,v})=>`${FB.friends[u]?'⭐':''}${esc(v.n)} (Lv ${v.l})`).join(', ')}${ppl.length>8?' +'+(ppl.length-8):''}`:'';
 if(typeof sel==='number'){const i=sel,c=CHS[i],lk=i>S.unlocked;info=`<div class="card"><div class="ttl">Chapter ${i+1}: ${c.name} ${S.cleared[i]?'👑':''}</div><span style="color:#a99cc0;font-size:12px">${ACTS[Math.floor(i/4)]} · Recommended Lv ${chLevel(i)}+ · Boss: <b>${BOSSES[c.boss].n}</b></span>${pl}<br>
  ${lk?`<i>🔒 Clear Chapter ${i} to unlock.</i>`:S.ch===i&&!G.dg?'<i>📍 You are here.</i>':`<button class="mbtn" data-a="travel" data-v="${i}">🚶 Travel here</button>`}</div>`;}
 else{info=dgInfoHtml(dgDef(String(sel).slice(2)));}
 return `<div class="card" style="padding:6px">${mapTabs(0)}${svg}<div style="font-size:11px;color:#a99cc0;margin-top:4px">Tap a land or a ◆ dungeon. 👑 cleared · 🟢 players there · ▼ you</div></div>`+info+(G.dg?`<button class="mbtn" data-a="dgleave">🚪 Leave ${G.dg.arena?'the Duel Arena':'dungeon'}</button>`:'');}
function dgInfoHtml(D){if(D.tower){const ok=dgUnlocked(D),et=S.et||{best:0,cp:1};return `<div class="card"><div class="ttl" style="color:${D.col}">🗼 Endless Tower</div><span style="font-size:12.5px">${D.d}</span><br><span style="color:#a99cc0;font-size:12px">Floor 1 ≈ Lv ${twLv(1)} · Floor 100 ≈ Lv ${twLv(100)} · Guardian every 5 floors · Party of up to 4 recommended</span><br><span style="font-size:12px">Best: <b style="color:#ffd76a">Floor ${et.best||0}</b> · Checkpoint: <b>Floor ${et.cp||1}</b></span><br>
  ${G.dg&&G.dg.tower?'<button class="mbtn" data-a="dgleave">🚪 Leave the tower</button>':ok?`<button class="mbtn" data-a="twenter" data-v="1">🗼 Start at Floor 1</button>${(et.cp||1)>1?`<button class="mbtn" data-a="twenter" data-v="${et.cp}">⏩ Continue from Floor ${et.cp}</button>`:''}<i style="font-size:11px;color:#a99cc0">Friends can join you from 🌐 Online → Join.</i>`:`<i>🔒 Clear Chapter ${D.req+1} to unlock.</i>`}</div>`;}
 const ok=dgUnlocked(D);const cnt=(S.dgc||{})[D.k]||0;const pl='';return `<div class="card"><div class="ttl" style="color:${D.col}">${D.e} ${D.n} · Dungeon</div><span style="font-size:12.5px">${D.d}</span><br><span style="color:#a99cc0;font-size:12px">Recommended Lv ${dgLevel(D)}+ · ${DG_WAVES.length} waves of elites, then <b>${BOSSES[D.boss].n}</b> · Party of up to 4 recommended · Cleared ${cnt}×</span><br>
  <span style="font-size:12px">Rewards: Gold / <b class="r3">S-Tier</b> gear${D.tier>=6?' · <b style="color:#b04aff">always Abyssal (best gear in the game)</b>':' · <b style="color:#b04aff">chance of Abyssal gear</b>'} · 🛡️ Protection Scroll · ores · lots of zeny</span>${pl}<br>
  ${G.dg&&G.dg.k===D.k?'<button class="mbtn" data-a="dgleave">🚪 Leave dungeon</button>':ok?`<button class="mbtn" data-a="dgenter" data-v="${D.k}">⚔️ Enter dungeon${FB.partyMode?' (friends-only)':''}</button><i style="font-size:11px;color:#a99cc0">Friends can join you from 🌐 Online → Join.</i>`:`<i>🔒 Clear Chapter ${D.req+1} to unlock.</i>`}</div>`;}

/* ---------- password change ---------- */
async function pwDialog(){const ok=await accountDialog({mode:'password',errorText:authErr,changePassword:async(current,next)=>{const u=firebase.auth().currentUser;if(!u)throw {code:'auth/requires-recent-login'};await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,current));await u.updatePassword(next);}});if(ok)toast('Password updated on your account.',2000);return ok;}

/* ---------- hook into login/logout ---------- */
function socialStart(){friendsStart();chatStart();chatBadge();}
function socialStop(){friendsStop();chatStop();chatBadge();}
/* ================= QUICK CHAT (press Enter like a classic MMORPG) ================= */
const QC_CH=[['a','Area','#8fe3b0'],['w','World','#ffd76a'],['p','Party','#7fc8ff']];
let qcOpen=false;
(function qcInit(){const st=document.createElement('style');st.textContent=`
#qc,#qcB{pointer-events:auto;touch-action:manipulation}
#qc{position:absolute;right:calc(8px + env(safe-area-inset-right));top:calc(100% + 8px);display:none;align-items:center;gap:6px;z-index:60;width:min(430px,calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right)));max-width:calc(100vw - 32px);background:linear-gradient(180deg,var(--pan-hi),transparent 96px),var(--pan);border:1px solid var(--pan-br);border-radius:10px;padding:5px 6px;box-shadow:0 4px 18px rgba(0,0,0,.5)}
#qc .qcc{border:0;border-radius:7px;padding:5px 8px;font:700 12px system-ui;background:#2a1f40;cursor:pointer;white-space:nowrap}
#qc input{flex:1;min-width:0;background:#0c0816;border:1px solid #3a2d55;border-radius:7px;color:#fff;font-size:14px;padding:6px 8px;outline:none}
#qc input:focus{border-color:#a98ce0}
#qc button{min-width:44px;min-height:44px}
body.fx-glass #qc{backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25)}
#qcX{border:0;border-radius:7px;background:#2a1f40;color:#fff;font-size:20px}
#qc .qcs{border:0;border-radius:7px;padding:6px 10px;background:#6a4ab0;color:#fff;font-weight:700;cursor:pointer}
#qcB{position:relative;flex-shrink:0;min-height:44px;z-index:59;cursor:pointer;display:none}
#qcB small{opacity:.7}
#chatF .cfl{text-shadow:0 1px 2px #000,0 0 4px #000}`;document.head.appendChild(st);
 const el=document.createElement('div');el.id='qc';el.innerHTML=`<button class="qcc" id="qcC"></button><input id="qcI" maxlength="120" placeholder="Say something… (Enter to send, Esc to close)" autocomplete="off"><button class="qcs" id="qcS">Send</button><button id="qcX" aria-label="Close chat">×</button>`;
 $('#hr').appendChild(el);
 const b=document.createElement('button');b.id='qcB';b.innerHTML='💬<small>CHAT</small>';b.title='Quick chat (Enter)';b.setAttribute('aria-label','Open quick chat');$('#hr .tb').prepend(b);
 const stop=e=>e.stopPropagation();['pointerdown','touchstart','click','mousedown'].forEach(ev=>{el.addEventListener(ev,stop,{passive:true});b.addEventListener(ev,stop,{passive:true});});
 b.addEventListener('click',()=>qcShow());
 $('#qcC').addEventListener('click',()=>{qcCycle();$('#qcI').focus();});
 $('#qcS').addEventListener('click',()=>{qcSend();});
 $('#qcX').addEventListener('click',qcHide);
 const inp=$('#qcI');inp.addEventListener('keydown',e=>{e.stopPropagation();
  if(e.key==='Enter'){e.preventDefault();if(!qcSend())qcHide();}
  else if(e.key==='Escape'){e.preventDefault();qcHide();}
  else if(e.key==='Tab'){e.preventDefault();qcCycle();}});
 inp.addEventListener('keyup',e=>e.stopPropagation());
 // Enter anywhere in-game opens the chat bar
 addEventListener('keydown',e=>{if(e.key!=='Enter'||e.repeat)return;if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;if(!qcCan())return;e.preventDefault();e.stopPropagation();qcShow();},true);
 setInterval(()=>{b.style.display=qcCan()?'block':'none';},500);
 qcChip();})();
function qcCan(){if(G.mode!=='game'||menuOpen||dlgOpen||qcOpen)return false;const md=$('#modal');if(md&&md.style.display&&md.style.display!=='none')return false;const tr=$('#trade');if(tr&&tr.style.display==='flex')return false;return true;}
function qcChip(){const c=QC_CH.find(x=>x[0]===(G.qcC||'a'))||QC_CH[0];const el=$('#qcC');el.textContent=c[1];el.style.color=c[2];}
function qcCycle(){const i=QC_CH.findIndex(x=>x[0]===(G.qcC||'a'));G.qcC=QC_CH[(i+1)%QC_CH.length][0];qcChip();}
function qcShow(){if(!qcCan())return;qcOpen=true;$('#qcB').style.display='none';for(const k in keys)keys[k]=0;joy.x=joy.y=0;const el=$('#qc');el.style.display='flex';qcChip();setTimeout(()=>$('#qcI').focus(),20);}
function qcHide(){qcOpen=false;$('#qc').style.display='none';const i=$('#qcI');i.value='';i.blur();}
function qcSend(){const i=$('#qcI');let t=(i.value||'').replace(/\s+/g,' ').trim();if(!t)return false;
 // slash shortcuts: /w world, /a area, /p party
 const m=t.match(/^\/(w|a|p|s)\s+(.*)$/i);if(m){G.qcC=m[1].toLowerCase()==='s'?'a':m[1].toLowerCase();t=m[2];qcChip();}
 if(!t)return true;
 const online=FB.uid&&NET.on;const ch=G.qcC||'a';
 // offline / no one around: just say it out loud over your own head
 if(!FB.uid||(ch==='a'&&!online)){if(Date.now()-lastSend<800)return true;lastSend=Date.now();const nm=(FB&&FB.name)||heroName();bubble(hero,t.slice(0,60),1);feedLine({c:'a',n:nm,fa:S?S.fac:'',m:t});i.value='';return true;}
 const prev=G.chC;G.chC=ch;const ok=chatSend(t);G.chC=prev;
 if(ok){i.value='';if(ch==='w')bubble(hero,t.slice(0,60),1);}return true;}
/* ================= JOB CHANGE QUESTS · TRIAL · JOB LOOKS · AWAKENING · PARTY HP ================= */
const JQ_KILLS=1000;const JQ=[null,{hunt:JQ_KILLS},{hunt:JQ_KILLS},{hunt:JQ_KILLS}];
// monsters count if they are near your level, OR from the strongest land you have unlocked (so over-levelled players can still finish)
function jqMinLv(){return Math.max(1,Math.min(S.lv-25,chLevel(S.unlocked||0)-2));}
function jqEligible(){return S.job<3&&S.lv>=JOB_LV[S.job+1];}
Object.assign(BOSSES,{jobtrial:{n:'Your Shadow',m:'trialhero',col:0x1a1026,s:1.3,spd:3.8,r:1.1,sp:['combo','jump','charge','bolts','sweep','combo'],roar:'whisper'}});
MB.trialhero=d=>{const o=buildHero(S.hero,S.cls,eqVisFromSave(),{dark:1,cust:S.cust,job:Math.min(3,(S.job||0)+1)});o.human=1;o.legs=[o.legL,o.legR];o.arms=[o.armL,o.armR];o.heroRig=1;return o;};

/* ---- job master NPC ---- */
function jmSpawn(){if(G.jm){world.remove(G.jm.m.root);G.jm=null;}if(G.dg||!S||!(jqEligible()||S.jq))return;
 const n={n:'Job Master Orin',col:0x2a2a48,hat:'wizard'};const nm=buildNPC(n);const x=-3.6,z=1.4;nm.root.position.set(x,gY(x,z),z);nm.root.rotation.y=Math.atan2(0+3.6,4-1.4);world.add(nm.root);
 const g=glowSprite(JOB_COL[S.cls],2.2);g.position.y=1.4;nm.root.add(g);G.jm={x,z,m:nm,d:n};
 if(!G.jmLbl){G.jmLbl=document.createElement('div');G.jmLbl.className='lbl';$('#fl').appendChild(G.jmLbl);}}
function jmOverlay(){const L=G.jmLbl;if(!L)return;if(!G.jm||G.mode!=='game'){L.style.display='none';return;}const p=toScreen(G.jm.x,gY(G.jm.x,G.jm.z)+3.4,G.jm.z);L.style.display=p.vis?'':'none';L.style.left=p.x+'px';L.style.top=p.y+'px';
 const q=S.jq;L.innerHTML=`<span style="color:#ffd76a">${q&&q.s===3?'⚔️ ':q?'':'❗ '}Job Master Orin</span>`;}
function jqText(){const q=S.jq;if(!q)return null;if(q.s===2)q.s=1;const R=JQ[q.to],nx=JOBS[S.cls][q.to];
 if(q.s===1)return [`🎓 Job Quest: ${nx}`,`Defeat any monsters: ${q.p}/${R.hunt}`];
 if(q.s===2)return [`🎓 Job Quest: ${nx}`,`Job Emblems: ${q.p}/${R.emb}${R.sh?` · Awakening Shards (dungeon bosses): ${q.sh||0}/${R.sh}`:''}`];
 return [`🎓 Job Quest: ${nx}`,'Return to Job Master Orin for the Trial'];}
function talkJM(){const q=S.jq,J=JOBS[S.cls];sfx('ui');
 if(S.job>=3&&!q){story([['JM',`You have walked every path, ${J[3]}. There is nothing left I can teach you.`]]);return;}
 if(!q){if(!jqEligible()){story([['JM',`Come back at level ${JOB_LV[S.job+1]}. Then I will show you the path of the ${J[S.job+1]}.`]]);return;}
  const to=S.job+1,R=JQ[to];story([['JM',`So, ${heroName()}. You have outgrown the ${J[S.job]}.`],['JM',`The path of the <b>${J[to]}</b> is open to you, but it must be earned.`],
   ['JM',`First, defeat ${R.hunt} monsters, any monsters, anywhere. Then you will face the Trial.`],['H','I accept.']],
   ()=>{S.jq={to,s:1,p:0,sh:0};banner('Job Quest: '+J[to],`Defeat ${R.hunt} monsters (any), then the Trial`,2800);sfx('quest');save();});return;}
 if(q.s===1){story([['JM',`Keep fighting. ${q.p}/${JQ[q.to].hunt} monsters defeated. Any monster counts, anywhere.`]]);return;}

 story([['JM','You are ready. In the Trial Arena you will face the one enemy who knows every move you make.'],['JM','Yourself. Defeat your Shadow, and become the '+J[q.to]+'.']],()=>enterTrial());}
function jqKill(d){const q=S.jq;if(!q)return;if(q.s===2)q.s=1;if(q.s!==1)return;const R=JQ[q.to];
 q.p++;if(q.p%100===0||q.p>=R.hunt)log(`🎓 Job Quest: ${q.p}/${R.hunt}`);if(q.p>=R.hunt){q.s=3;q.p=R.hunt;banner('Job Quest complete!','Return to Job Master Orin for the Trial',3000);sfx('quest');save();}}
function jqShard(){return;const q=S.jq;if(!q||q.s!==2||!JQ[q.to].sh)return;q.sh=(q.sh||0)+1;log(`💎 Awakening Shard (${q.sh}/${JQ[q.to].sh})`);bigText('AWAKENING SHARD','#b04aff',1600);jqCheck2();}
function jqCheck2(){const q=S.jq,R=JQ[q.to];if(q.s===2&&q.p>=R.emb&&(q.sh||0)>=R.sh){q.s=3;banner('Job Quest','Return to Job Master Orin for the Trial',3000);sfx('quest');save();}}

/* ---- the trial: fight your own shadow ---- */
function enterTrial(){if(menuOpen)closeMenu();loadChapter(S.ch,true,{k:'trial',trial:1,owner:FB.uid||'solo',wc:13,t:0,st:'wait'});banner('🎓 The Trial','Defeat your Shadow',3000);}
function trialSetup(){arenaSetup();scene.fog.color.setHex(0x0a0610);hemi.intensity=.5;hero.x=AR.x;hero.z=AR.z+AR.r-3;hero.face=Math.PI;}
function trialTick(dt){const g=G.dg;g.t+=dt;if(g.st==='wait'&&g.t>3){g.st='boss';const lv=S.lv+8;const d=bossBoost(bossDef('jobtrial',lv));d.n='Shadow '+JOBS[S.cls][Math.min(3,S.job+1)];d.hp=Math.round(d.hp*(1+.35*S.job));
  const m=mkMob(d,AR.x,AR.z-6,true);m.agg=false;m.face=0;m.baseMhp=m.mhp;G.mobs.push(m);G.boss=m;G.introDone=1;G.intro={t:0,dur:3,m};$('#cine').style.opacity=1;sfx('roar_whisper');setTimeout(()=>{$('#bossN').textContent=d.n;bigText(d.n.toUpperCase(),'#b06aff',2800);},800);}}
function trialCleared(){const q=S.jq;G.dg.st='done';if(!q){exitDungeon();return;}const to=q.to;S.job=to;S.jq=null;skSync();NET.infoDirty=true;try{presenceUpdate();lbUpdate();}catch(e){}
 G.slow=1.8;G.zoom=.75;bigText(JOBS[S.cls][to].toUpperCase(),'#ffd76a',4000);sfx('levelup');setTimeout(()=>sfx('stier'),500);
 log(`🎓 You are now a ${JOBS[S.cls][to]}! New skills unlocked${to===3?' (+6 skill points)':''}. Stat cap is now ${statMax()}.`);chatSys(`🎓 ${FB.name||heroName()} became a ${JOBS[S.cls][to]}!`);
 rebuildHero();G.st=stats();hero.hp=G.st.mhp;PS.burst(hero.x,hero.y+1,hero.z,60,JOB_COL[S.cls],{sp:5,up:6,life:1.4});fxRing(hero.x,hero.z,8,JOB_COL[S.cls],1.2);save(true);
 setTimeout(()=>{story([['JM',`Rise, ${JOBS[S.cls][to]}. Open ☰ Menu → Skills to learn your new techniques.${to===PARABELLUM_JOB?' Parabellum is now unlocked: combine your learned buffs in one cast.':''}`]],()=>{if(G.dg&&G.dg.trial)exitDungeon();});},3500);}

/* ---- job look: capes, emblems, auras, wings ---- */
function jobDecor(M,ck,job,dark){if(!job)return;const col=dark?0x8a2aff:JOB_COL[ck],gold=mat(0xe8c26a,{metalness:.8,roughness:.25,emissive:0x2a1a00});
 const C=CLASSES[ck];[-1,1].forEach(s=>{const p=mesh(BOX(.26,.12,.3),gold,s*.4,.74,0);M.torso.add(p);if(job>=2){const sp=mesh(CONE(.06,.22,4),gold,s*.46,.86,0);M.torso.add(sp);}});
 if(!C.robe){const cape=mesh(BOX(.58,.95,.04),mat(dark?0x2a1040:new T.Color(C.col).multiplyScalar(.7).getHex(),{emissive:dark?0x2a0a4a:0}),0,.12,-.23);cape.rotation.x=.08;M.torso.add(cape);M.jcape=cape;
  const trim=mesh(BOX(.6,.06,.05),gold,0,-.34,-.24);M.torso.add(trim);}
 const em=mesh(ICO(.09),basic(col),0,.48,.21);M.torso.add(em);
 if(job>=2){const halo=mesh(TOR(.32,.025),basic(col),0,.52,-.18);halo.rotation.x=.25;M.head.add(halo);M.jhalo=halo;const rg=mesh(RING(.8,1.05),basic(col,{transparent:true,opacity:.45,depthWrite:false,side:T.DoubleSide}),0,.06,0);rg.rotation.x=-Math.PI/2;rg.castShadow=false;M.root.add(rg);M.jring=rg;}
 if(job>=3){const wings=[];[-1,1].forEach(s=>{const w=grp(s*.18,.62,-.24);for(let i=0;i<4;i++){const f=mesh(BOX(.62-i*.08,.035,.16),basic(col,{transparent:true,opacity:.75}),s*(.32+i*.2),i*.13,-i*.03);f.rotation.z=s*(.35+i*.14);w.add(f);}M.torso.add(w);wings.push(w);});M.jwings=wings;
  const g=glowSprite(col,2.6);g.position.y=1.2;M.root.add(g);M.jglow=g;}}
function jobAnim(M,t,h){if(M.jwings)M.jwings.forEach((w,i)=>w.rotation.y=(i?-1:1)*(.15+Math.sin(t*2.2)*.12));if(M.jhalo)M.jhalo.rotation.z=t*1.5;if(M.jring)M.jring.rotation.z=t*.6;
 if(M.jglow)M.jglow.material.opacity=.45+Math.sin(t*3)*.15;
 const awk=h&&h.buffs&&h.buffs.awk;if(awk&&!M.awk){M.awk=glowSprite(JOB_COL[S.cls],5);M.awk.position.y=1.2;M.root.add(M.awk);}else if(!awk&&M.awk){M.root.remove(M.awk);M.awk=null;}
 if(M.awk){M.awk.material.opacity=.55+Math.sin(t*9)*.25;M.awk.scale.setScalar(4.5+Math.sin(t*6)*.6);if(Math.random()<.35)PS.burst(h.x,h.y+1,h.z,1,JOB_COL[S.cls],{sp:1.5,up:3,life:.6});}}

/* ---- party HP frames ---- */
function partyHud(){let el=$('#ptF');if(!el)return;const m=FB.uid&&typeof myParty==='function'?myParty().filter(u=>u!==FB.uid):[];if(!m.length||G.mode!=='game'){el.style.display='none';return;}el.style.display='';
 el.innerHTML=m.map(u=>{const v=FB.pres[u]||{},p=NET.peers[u];const live=p&&livePeer(p);const C=CLASSES[v.c];const out=NET.duel&&NET.duel.team&&NET.duel.outs&&NET.duel.outs[u];
  const hp=live?p.hp:null;const dead=live&&(p.dead||out);const col=hp==null?'#555':hp>50?'#4ccf6a':hp>25?'#e8c24a':'#e04a4a';
  return `<div class="ptr"><div class="ptn">${C?C.ic:''} ${esc(v.n||'?')} <span style="color:#ffd76a">${v.l||''}</span>${dead?' 💀':''}</div>${live?`<div class="ptb"><i style="width:${dead?0:hp}%;background:${col}"></i></div>`:`<div class="pto">${v.ch>=0?(String(v.w||'').startsWith('dg_')?'⚔️ dungeon':'Ch.'+(v.ch+1)):'offline'}</div>`}</div>`;}).join('');}
/* ================= NEW WORLD: CO-OP BOSS RULES · COMPANIONS · GRAVITY ================= */
const momOf=k=>k==='L'?'Essa':'Liza';
const ALLY_DEF=[
 {n:'Isaac',hk:'L',cls:'knight',cu:{style:'spiky',hair:0x1a1010,outfit:0xa82a2a}},
 {n:'Lucas',hk:'L',cls:'knight',cu:{style:'short',hair:0x6a4a2a,outfit:0x4a5a6a}},
 {n:'Kamara',hk:'C',cls:'knight',cu:{style:'long',hair:0x1a1010,outfit:0x7a3a5a}},
 {n:'Kim',hk:'C',cls:'assassin',cu:{style:'pony',hair:0x2a1010,outfit:0xc83a3a}},
 {n:'Ethan',hk:'L',cls:'wizard',cu:{style:'short',hair:0x0a0a10,outfit:0x2a4aa8}}];
G.allies=[];G.rallies={};

/* ---------- boss spawning for every chapter (single, twins, trio, chains, seals) ---------- */
function spawnChapterBoss(c){const ch=CHS[c],lv=chLevel(c)+6+(S.ngp||0)*20;
 const mk=(key,x,z)=>{const d=bossBoost(bossDef(key,lv));const m=mkMob(d,x,z,true);m.agg=false;m.face=Math.PI;m.baseMhp=m.mhp;m.coopN=1;G.mobs.push(m);return m;};
 const t=BOSSES[ch.boss]&&BOSSES[ch.boss].mech&&BOSSES[ch.boss].mech.t;let main;
 if(t==='twin'){main=mk('twinkael',AR.x-4.5,AR.z-7);mk('twinseth',AR.x+4.5,AR.z-7);}
 else if(t==='trio'){main=mk('calflame',AR.x,AR.z-9);mk('calfrost',AR.x-7,AR.z-4);mk('calstorm',AR.x+7,AR.z-4);}
 else main=mk(ch.boss,AR.x,AR.z-8);
 if(t==='chains')spawnAnchors(lv);
 G.boss=main;G.anchT=0;G.sealHold=0;
 if(ch.party)setTimeout(()=>allySync(true),1200);
 if(t)setTimeout(()=>coopTip(t,ch.party),3800);
 return main;}
function coopTip(t,need){const tip={twin:['Linked Souls','When one executioner falls, defeat the other within 10 seconds'],chains:['Chained Colossus','Break all 3 anchors within 12 seconds of each other, then strike'],
 channel:['Soul Harvest','When she channels, 3 fighters must hit her before the cast ends'],trio:['Three Calamities','Pull them apart! Close together they protect each other'],
 seals:['The Five Seals','Hold all 5 glowing seals at once to break the Warden\'s shield'],sync:['Gravity Shield',need+' fighters must hit within 2.5 seconds of each other']}[t];
 if(tip)hEmit({y:'bn',a:'🤝 '+tip[0],b:tip[1],d:4200},e=>banner(e.a,e.b,e.d));}
function spawnAnchors(lv){const d0=mobDef('chainanchor',lv);G.anchors=[];for(let i=0;i<3;i++){const a=i/3*6.283+Math.PI/2;const d=Object.assign({},d0,{hp:Math.round(d0.hp*6),atk:1,aggro:0,spd:0});
  const m=mkMob(d,AR.x+Math.cos(a)*10,AR.z+Math.sin(a)*10,false);m.anchor=1;m.cd=1e9;m.agg=false;m.wave=true;G.mobs.push(m);G.anchors[i]={x:m.x,z:m.z,id:m.id};}}

/* ---------- the teamwork rule: decides how much of a hit gets through (host / offline) ---------- */
function gText(m,s){if((m.gtT||0)>G.t)return;m.gtT=G.t+.6;txt(m.x,gY(m.x,m.z)+m.mdl.h*(m.d.s||1)+.9,m.z,s,'#c8b8ff',true);}
function trioOthersNear(m){return G.mobs.some(o=>o!==m&&!o.dead&&o.d.mech&&o.d.mech.t==='trio'&&dxz(o,m)<8);}
function gateDmg(m,dmg,who){const g=m.d.mech;if(!g||m.anchor)return dmg;m.hb=m.hb||{};m.hb[who]=G.t;
 if(g.t==='sync'){const n=Object.values(m.hb).filter(t=>G.t-t<2.5).length;if(n<g.need){m.immT=G.t+.8;gText(m,`🌀 SHIELD ${n}/${g.need}`);return 0;}if((m.syncT||0)<G.t){m.syncT=G.t+3;gText(m,'💥 SHIELD BROKEN');}return dmg;}
 if(g.t==='twin'){if(m.down){gText(m,'💤 DOWN');return 0;}if(m.hp-dmg<=0){const o=G.mobs.find(x=>x!==m&&x.boss&&!x.dead&&x.d.mech&&x.d.mech.t==='twin');
   if(o&&!o.down){m.down=G.t;m.hp=1;m.immT=G.t+10;hEmit({y:'bn',a:m.d.n+' has fallen!',b:'Defeat '+o.d.n+' within 10 seconds!',d:2600},e=>banner(e.a,e.b,e.d));sfx('stagger');return 0;}
   if(o&&o.down){o.hp=0;killMob(o);}}return dmg;}
 if(g.t==='chains'){if(G.mobs.some(a=>a.anchor&&!a.dead)){m.immT=G.t+.8;gText(m,'⛓️ CHAINED');return 0;}return dmg;}
 if(g.t==='trio'){if(trioOthersNear(m)){m.immT=G.t+.8;gText(m,'🛡️ PROTECTED');return Math.max(1,Math.round(dmg*.12));}return dmg;}
 if(g.t==='seals'){if(!((m.sealOpen||0)>G.t)){m.immT=G.t+.8;gText(m,'🔒 SEALED');return 0;}return dmg;}
 if(g.t==='channel'){if(m.chan)m.chan.hb[who]=1;return (m.vuln||0)>G.t?Math.round(dmg*1.5):dmg;}
 return dmg;}

/* ---------- per-frame rules (host / offline) ---------- */
function seals(){if(!G.sealPos){G.sealPos=[];for(let i=0;i<5;i++){const a=Math.PI/2+i/5*6.283;G.sealPos.push({x:AR.x+Math.cos(a)*9,z:AR.z+Math.sin(a)*9});}}return G.sealPos;}
function sealBuild(){if(G.sealObj)G.sealObj.forEach(o=>world.remove(o));G.sealObj=[];if(!(CHS[S.ch].boss&&BOSSES[CHS[S.ch].boss].mech&&BOSSES[CHS[S.ch].boss].mech.t==='seals')||G.dg)return;G.sealPos=null;
 for(const s of seals()){const g=grp(s.x,gY(s.x,s.z),s.z);const r=mesh(RING(1.3,1.8),basic(0xffd76a,{transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}),0,.08,0);r.rotation.x=-Math.PI/2;r.castShadow=false;g.add(r);
  const p=mesh(CYL(.25,.35,1.2,6),mat(0x8a7a3a,{emissive:0x2a2000}),0,.6,0);g.add(p);const gl=glowSprite(0xffd76a,1.8);gl.position.y=1.5;gl.material.opacity=.3;g.add(gl);g.userData={r,gl};world.add(g);G.sealObj.push(g);}}
function sealVis(){if(!G.sealObj||!G.sealObj.length)return;const ps=players();if(NET.on&&!NET.host)for(const n in G.rallies){const a=G.rallies[n];if(a.x!=null)ps.push({x:a.x,z:a.z});}
 G.sealObj.forEach((g,i)=>{const s=G.sealPos[i];const on=ps.some(p=>Math.hypot(p.x-s.x,p.z-s.z)<1.9);g.userData.r.material.opacity=on?.85:.3;g.userData.gl.material.opacity=on?.9:.25;g.userData.r.material.color.setHex(on?0x8affc8:0xffd76a);});}
function mechTick(dt){if(!G.bossFight)return;const bs=G.mobs.filter(m=>m.boss&&!m.dead&&m.d.mech);
 for(const m of bs){const g=m.d.mech;
  if(g.t==='twin'&&m.down&&G.t-m.down>10){m.down=0;m.hp=Math.round(m.mhp*.5);m.immT=0;hEmit({y:'bn',a:m.d.n+' rises again!',b:'Too slow. Bring them down together.',d:2400},e=>banner(e.a,e.b,e.d));fxRing(m.x,m.z,4,0xff3a3a,.8);}
  if(g.t==='twin'&&m.down)m.stun=.3;
  if(g.t==='channel'&&m.agg){if(!m.chan){m.chT=(m.chT==null?14:m.chT)-dt;if(m.chT<=0){m.chan={t:5.5,hb:{}};cancelWind(m);hEmit({y:'bn',a:'💀 SOUL HARVEST',b:'3 fighters must hit her NOW!',d:2600},e=>{banner(e.a,e.b,e.d);sfx('charge');});}}
   else{m.stun=.3;m.chan.t-=dt;if(Math.random()<.3)PS.burst(m.x,gY(m.x,m.z)+2,m.z,3,0xd06aff,{sp:3,up:2,g:-1});const n=Object.keys(m.chan.hb).length;
    if(n>=g.need){m.chan=null;m.chT=22;m.stag=3;m.ripT=3;m.vuln=G.t+8;hEmit({y:'bn',a:'✨ Interrupted!',b:'The Soul Queen is vulnerable for 8 seconds',d:2400},e=>{banner(e.a,e.b,e.d);sfx('stagger');});}
    else if(m.chan.t<=0){m.chan=null;m.chT=22;hEmit({y:'dc',id:m.id,x:Math.round(AR.x),z:Math.round(AR.z),r:AR.r+2,dur:.5,dmg:Math.round(m.d.atk*2.4),arc:0,rot:0,ar:1},decalLocal);}}}
  if(g.t==='seals'){const ps=players();const occ=seals().every(s=>ps.some(p=>Math.hypot(p.x-s.x,p.z-s.z)<1.9));
   if(occ&&!((m.sealOpen||0)>G.t)){G.sealHold+=dt;if(G.sealHold>=3){G.sealHold=0;m.sealOpen=G.t+12;m.stag=2;hEmit({y:'bn',a:'🔓 The seals are broken!',b:'Strike the Warden for 12 seconds!',d:2400},e=>{banner(e.a,e.b,e.d);sfx('gate');});}}else if(!occ)G.sealHold=0;}}
 // chain anchors must break close together
 if(G.anchors&&G.anchors.length&&bs.some(m=>m.d.mech.t==='chains')){const alive=G.mobs.filter(a=>a.anchor&&!a.dead);
  if(alive.length&&alive.length<3){if(!G.anchT)G.anchT=G.t;if(G.t-G.anchT>12){G.anchT=0;const lv=alive[0].d.lv;for(const s of G.anchors){if(G.mobs.some(a=>a.anchor&&!a.dead&&Math.hypot(a.x-s.x,a.z-s.z)<.5))continue;
     const d0=mobDef('chainanchor',lv);const d=Object.assign({},d0,{hp:Math.round(d0.hp*6),atk:1,aggro:0,spd:0});const m=mkMob(d,s.x,s.z,false);m.anchor=1;m.cd=1e9;m.agg=false;m.wave=true;G.mobs.push(m);fxRing(s.x,s.z,2.5,0xc8c8ff,.6);}
    hEmit({y:'bn',a:'⛓️ The chains reform!',b:'Break all 3 anchors within 12 seconds',d:2400},e=>banner(e.a,e.b,e.d));}}
  else if(!alive.length&&G.anchT!==-1){G.anchT=-1;hEmit({y:'bn',a:'⛓️ Chains broken!',b:'The Colossus can be hurt now',d:2400},e=>{banner(e.a,e.b,e.d);sfx('gate');});}}
 // companions follow the party size
 G.alT=(G.alT||0)+dt;if(G.alT>1){G.alT=0;allySync(false);}}
function mechVis(m){const imm=(m.immT||0)>G.t||m.nImm;if(!m.mdl.shieldS&&imm){const s=mesh(SPH(1,14,10),basic(0x9a7aff,{transparent:true,opacity:.18,depthWrite:false}));s.castShadow=false;s.scale.setScalar(m.d.r*1.5/(m.d.s||1));s.position.y=m.mdl.h*.5;m.mdl.root.add(s);m.mdl.shieldS=s;}
 if(m.mdl.shieldS){m.mdl.shieldS.visible=!!imm;m.mdl.shieldS.material.opacity=.14+Math.sin(G.t*6)*.06;}}

/* ---------- gravity pull ---------- */
DG_SP.grav=(m,tg,big,r1)=>{m.rT=2.4;hEmit({y:'pull',x:r1(m.x),z:r1(m.z),dur:1.4},pullLocal);setTimeout(()=>{if(!m.dead)big(1.9,6.5,m.x,m.z,.55);},1400);};
function pullLocal(e){if(Math.hypot(hero.x-e.x,hero.z-e.z)>AR.r+6)return;G.pull={x:e.x,z:e.z,t:e.dur};bigText('GRAVITY!','#b06aff',1200);sfx('charge');fxRing(e.x,e.z,8,0x8a4aff,1);}
function pullTick(dt){const p=G.pull;if(!p)return;p.t-=dt;if(p.t<=0){G.pull=null;return;}if(hero.dead||hero.state==='roll')return;const dx=p.x-hero.x,dz=p.z-hero.z,d=Math.hypot(dx,dz);if(d<1.5)return;
 hero.x+=dx/d*4.2*dt;hero.z+=dz/d*4.2*dt;if(Math.random()<.4)PS.burst(hero.x,hero.y+.5,hero.z,1,0x8a4aff,{sp:1,up:1});}

/* ---------- companions (host / offline only; mirrored to other players) ---------- */
function realInArena(){let n=G.bossFight&&!hero.dead?1:0;if(NET.on)for(const p of Object.values(NET.peers))if(livePeer(p)&&p.ar&&!p.dead)n++;return n;}
function allySync(first){const c=S.ch,ch=CHS[c];if(isPuppet()||G.dg)return;const bossAlive=G.mobs.some(m=>m.boss&&!m.dead);
 const want=ch.party&&G.bossFight&&bossAlive&&realInArena()>0?Math.max(0,Math.min(4,ch.party-realInArena())):0;
 while(G.allies.length>want){const a=G.allies.pop();allyRemove(a);}
 while(G.allies.length<want){const def=ALLY_DEF[G.allies.length];const a=allyMake(def,hero.x+rnd(-2,2),hero.z+2+rnd(0,1.5));G.allies.push(a);if(!first)log('🤝 '+def.n+' joins the fight!');}
 if(first&&G.allies.length)log('🤝 '+G.allies.map(a=>a.n).join(', ')+' fight beside you!');}
function allyMake(def,x,z){const M=buildHero(def.hk,def.cls,{w:{slot:'w',tier:4,rar:2,ref:4},a:{slot:'a',tier:3,rar:2,ref:0},s:CLASSES[def.cls].shield?{slot:'s',tier:3,rar:2,ref:0}:null},{cust:def.cu,job:2});world.add(M.root);
 const lbl=document.createElement('div');lbl.className='lbl';$('#fl').appendChild(lbl);
 return {n:def.n,def,M,lbl,x,z,face:0,state:'idle',actT:0,actDur:1,moveAmt:0,combo:0,cd:rnd(.5,1.2),hitDone:true,ranged:def.cls==='wizard'};}
function allyRemove(a){world.remove(a.M.root);if(a.lbl)a.lbl.remove();}
function alliesClear(){G.allies.forEach(allyRemove);G.allies=[];for(const n in G.rallies)allyRemove(G.rallies[n]);G.rallies={};}
function allyTarget(a,i){const bs=G.mobs.filter(m=>m.boss&&!m.dead);if(!bs.length)return null;const b0=bs[0],t=b0.d.mech&&b0.d.mech.t;
 if(t==='seals'&&!((b0.sealOpen||0)>G.t)){const ps=players().filter(p=>!p.ally);const free=seals().filter(s=>!ps.some(p=>Math.hypot(p.x-s.x,p.z-s.z)<1.9));const s=free[i%Math.max(1,free.length)];if(s)return {x:s.x,z:s.z,stand:1};}
 if(t==='chains'){const an=G.mobs.filter(m=>m.anchor&&!m.dead);if(an.length){const all=an.every(m=>m.hp<m.mhp*.35);const m=an[i%an.length];return {m,hold:!all};}}
 if(t==='twin'){const up=bs.filter(m=>!m.down);const far=up.sort((p,q)=>dxz(q,hero)-dxz(p,hero));return {m:far[i%far.length]||bs[0]};}
 if(t==='trio')return {m:bs.sort((p,q)=>dxz(q,hero)-dxz(p,hero))[i%bs.length]};
 return {m:b0};}
function allyTick(dt){if(!G.allies.length)return;G.alS=(G.alS||0)+dt;
 G.allies.forEach((a,i)=>{const T=allyTarget(a,i);a.actT+=dt;a.cd-=dt;let tx=a.x,tz=a.z;
  if(T&&T.stand){tx=T.x;tz=T.z;}else if(T&&T.m){const m=T.m,ang=i*1.6+G.t*.15,rr=a.ranged?8:m.r+1.6;tx=m.x+Math.sin(ang)*rr;tz=m.z+Math.cos(ang)*rr;
   const d=dxz(a,m);if(d<(a.ranged?10:m.r+2.6)){a.face=turnTo(a.face,Math.atan2(m.x-a.x,m.z-a.z),dt*10);
    if(a.cd<=0&&!(T.hold&&m.hp<m.mhp*.35)&&!(m.d.mech&&m.d.mech.t==='twin'&&m.down&&!G.mobs.some(o=>o!==m&&o.boss&&!o.dead&&o.down))){a.cd=rnd(1,1.4);a.state='light';a.actT=0;a.actDur=.5;a.combo=(a.combo+1)%3;a.hitDone=false;a.tg=m;}}}
  if(!a.hitDone&&a.actT>.22){a.hitDone=true;const m=a.tg;if(m&&!m.dead)allyHit(a,m);}
  if(a.actT>a.actDur&&a.state!=='idle'&&a.state!=='move')a.state='idle';
  const dx=tx-a.x,dz=tz-a.z,dd=Math.hypot(dx,dz);if(dd>.4&&(a.state==='idle'||a.state==='move')){const sp=Math.min(dd,5.8*dt);a.x+=dx/dd*sp;a.z+=dz/dd*sp;a.face=turnTo(a.face,Math.atan2(dx,dz),dt*8);a.state='move';a.moveAmt=lerp(a.moveAmt,1,.2);}else{a.moveAmt=lerp(a.moveAmt,0,.2);if(a.state==='move')a.state='idle';}
  a.x=clamp(a.x,AR.x-AR.r+1,AR.x+AR.r-1);a.z=clamp(a.z,AR.z-AR.r+1,AR.z+AR.r-1);
  animRig(a.M,a,CLASSES[a.def.cls],dt);jobAnim(a.M,G.t,null);});
 if(NET.on&&NET.host&&G.alS>.25){G.alS=0;NET.base.child('meta/al').set(G.allies.map(a=>[a.n,Math.round(a.x*10),Math.round(a.z*10),Math.round(a.face*100),PST.indexOf(a.state)])).catch(()=>{});}}
function allyHit(a,m){const st=G.st;const col=JOB_COL[a.def.cls];
 if(a.ranged){fxSpark(m.x,gY(m.x,m.z)+1.4,m.z,col,1.4);fxRing(m.x,m.z,1.2,col,.3);}else fxSlash(a.x+Math.sin(a.face)*.8,a.z+Math.cos(a.face)*.8,a.face,col,false,2.4);
 let dmg=Math.max(1,Math.round(st.atk*.5*rnd(.9,1.1)*(100/(100+m.d.def))));dmg=gateDmg(m,dmg,'ally_'+a.n);if(dmg<=0)return;
 m.hp-=dmg;m.flash=.1;m.agg=true;txt(m.x,gY(m.x,m.z)+m.mdl.h*(m.d.s||1)*.9+.3,m.z,dmg,'#9ad8ff',false);if(m.hp<=0)killMob(m);}
function alliesFromNet(arr){if(!NET.on||NET.host)return;const seen={};(arr||[]).forEach(r=>{const n=r[0];seen[n]=1;let a=G.rallies[n];
  if(!a){const def=ALLY_DEF.find(d=>d.n===n);if(!def)return;a=allyMake(def,r[1]/10,r[2]/10);G.rallies[n]=a;}
  a.tx=r[1]/10;a.tz=r[2]/10;a.tf=r[3]/100;const st=PST[r[4]]||'idle';if(st!==a.state&&st==='light'){a.actT=0;a.actDur=.5;}a.state=st;});
 for(const n in G.rallies)if(!seen[n]){allyRemove(G.rallies[n]);delete G.rallies[n];}}
function ralliesTick(dt){for(const n in G.rallies){const a=G.rallies[n];if(a.tx==null)continue;const ox=a.x,oz=a.z;a.x=lerp(a.x,a.tx,Math.min(1,dt*9));a.z=lerp(a.z,a.tz,Math.min(1,dt*9));a.face=turnTo(a.face,a.tf,dt*10);a.actT+=dt;
  a.moveAmt=lerp(a.moveAmt,clamp(Math.hypot(a.x-ox,a.z-oz)/Math.max(dt,.001)/6,0,1),.25);if(a.state==='light'&&a.actT>.22&&!a.fx){a.fx=1;fxSpark(a.x+Math.sin(a.face)*1.2,gY(a.x,a.z)+1.2,a.z+Math.cos(a.face)*1.2,JOB_COL[a.def.cls],1);}if(a.state!=='light')a.fx=0;
  animRig(a.M,a,CLASSES[a.def.cls],dt);jobAnim(a.M,G.t,null);}}
function alliesOverlay(){const all=G.allies.concat(Object.values(G.rallies));for(const a of all){if(!a.lbl)continue;const s=toScreen(a.x,gY(a.x,a.z)+2.7,a.z);a.lbl.style.display=s.vis?'':'none';a.lbl.style.left=s.x+'px';a.lbl.style.top=s.y+'px';a.lbl.innerHTML=`<span style="color:#9ad8ff">🤝 ${a.n}</span>`;}}
function coopTick(dt){mechTick(dt);allyTick(dt);pullTick(dt);sealVis();if(!G.bossFight&&G.allies.length)alliesClear();}

/* ---------- Chapter 50 finale ---------- */
function newDawnFinale(){const c=S.ch;S.q[c].s=3;S.cleared[c]=1;S.done2=1;S.bk=(S.bk||0);save(true);sfx('ending');
 for(let i=0;i<30;i++)setTimeout(()=>PS.burst(rnd(-6,6),gY(0,0)+rnd(1,4),rnd(-6,6),3,[0xffd76a,0xffe8b0,0xffffff][i%3],{sp:1,up:3,g:-.5,life:2}),i*160);
 story(CHS[c].finale||[],()=>{chatSys(`🌅 ${FB.name||heroName()} saved Eldoria and finished all ${CHS.length} chapters!`);startEnding('dawn');});}
/* ================= PLAYER TRADE (Flyff style: both windows open, offer items + zeny, Ready, Confirm) ================= */
const TR_MAX=8;let TR=null;
const trHash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;};
function trInvite(uid,name){if(!FB.uid){toast('Log in to trade',1400);return;}if(TR){toast('You are already trading',1400);return;}
 pushMsg({to:uid,tn:name,y:'xrq'});NET.trReq={uid,t:Date.now()};toast('🤝 Trade request sent to '+esc(name),1800);}
async function trMsg(v){
 if(v.y==='xrq'){if(TR||G.mode!=='game'){pushMsg({to:v.u,y:'xdn'});return;}sfx('quest');const r=await ask(`🤝 <b>${esc(v.n)}</b> wants to trade with you.`,['Open trade','Decline']);
  if(r===0&&!TR){pushMsg({to:v.u,y:'xac'});trOpen(v.u,v.n);}else pushMsg({to:v.u,y:'xdn'});return;}
 if(v.y==='xac'&&NET.trReq&&NET.trReq.uid===v.u){NET.trReq=null;trOpen(v.u,v.n);return;}
 if(v.y==='xdn'&&NET.trReq&&NET.trReq.uid===v.u){NET.trReq=null;toast(esc(v.n)+' declined the trade',1500);return;}
 if(!TR||v.u!==TR.uid)return;
 if(v.y==='xof'){TR.their={items:(v.items||[]).slice(0,TR_MAX),z:Math.max(0,Math.floor(+v.z||0))};TR.myLock=TR.theirLock=TR.myOk=TR.theirOk=false;trRender();}
 else if(v.y==='xlk'){TR.theirLock=!!v.on;if(!v.on){TR.myOk=TR.theirOk=false;}trRender();}
 else if(v.y==='xok'){TR.theirOk=v.h;trTry();trRender();}
 else if(v.y==='xcx'){trClose(false);toast('Trade cancelled by '+esc(TR?TR.n:v.n),1600);}
 else if(v.y==='xdone'){/* the other side finished */}}
function trOpen(uid,n){if(menuOpen)closeMenu();TR={uid,n,miss:0,my:{ids:[],z:0},their:{items:[],z:0},myLock:false,theirLock:false,myOk:false,theirOk:false};
 let el=$('#trade');if(!el){el=document.createElement('div');el.id='trade';document.body.appendChild(el);
  el.addEventListener('click',trClick);el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});trWire(el);}
 el.style.display='flex';sfx('ui');trRender();}
function trClose(send){if(TR&&send)pushMsg({to:TR.uid,y:'xcx'});TR=null;const el=$('#trade');if(el)el.style.display='none';}
function trMyItems(){return TR.my.ids.map(id=>itemById(id)).filter(Boolean);}
function trSendOffer(){TR.myLock=TR.theirLock=TR.myOk=TR.theirOk=false;pushMsg({to:TR.uid,y:'xof',items:trMyItems().map(it=>({slot:it.slot,tier:it.tier,rar:it.rar,ref:it.ref,af:it.af||null})),z:TR.my.z});trRender();}
function trKey(){const mine={items:trMyItems().map(it=>[it.slot,it.tier,it.rar,it.ref,it.af?it.af.k+':'+it.af.v:'']),z:TR.my.z};
 const theirs={items:TR.their.items.map(it=>[it.slot,it.tier,it.rar,it.ref,it.af?it.af.k+':'+it.af.v:'']),z:TR.their.z};
 const a=FB.uid<TR.uid?[mine,theirs]:[theirs,mine];return trHash(JSON.stringify(a));}
function trTry(){if(!TR||!TR.myOk||!TR.theirOk)return;const k=trKey();if(TR.myOk!==k||TR.theirOk!==k){TR.myOk=TR.theirOk=false;toast('Offers changed. Please confirm again.',1600);return;}
 const mine=trMyItems();if(mine.length!==TR.my.ids.length||S.zeny<TR.my.z){toast('Trade failed: your offer is no longer available',1800);trClose(true);return;}
 // give away my items and zeny
 for(const it of mine){for(const s in S.eq)if(S.eq[s]===it.id)S.eq[s]=null;}S.items=S.items.filter(it=>!TR.my.ids.includes(it.id));S.zeny-=TR.my.z;
 // receive theirs
 const got=TR.their.items.map(o=>newItem(o.slot,o.tier,o.rar,o.ref,o.af));S.items.push(...got);S.zeny+=TR.their.z;
 rebuildHero();G.st=stats();save(true);sfx('levelup');
 toast(`🤝 Trade complete with ${esc(TR.n)}!<br>Received ${got.length} item${got.length===1?'':'s'}${TR.their.z?' + '+TR.their.z.toLocaleString()+'z':''}`,2600);log(`🤝 Traded with ${esc(TR.n)}`);
 pushMsg({to:TR.uid,y:'xdone'});TR=null;$('#trade').style.display='none';}
function trZApply(silent){if(!TR||TR.myLock)return;const f=$('#trZ');if(!f)return;const raw=Math.floor(+(f.value||0))||0;const z=Math.max(0,Math.min(S.zeny,raw));if(raw>S.zeny&&!silent)toast('You only have '+S.zeny.toLocaleString()+'z',1200);if(z!==TR.my.z){TR.my.z=z;trSendOffer();}}
let trZT=0;
function trWire(el){el.addEventListener('input',e=>{if(e.target.id==='trZ'){clearTimeout(trZT);trZT=setTimeout(()=>trZApply(false),700);}});
 el.addEventListener('change',e=>{if(e.target.id==='trZ'){clearTimeout(trZT);trZApply(false);}});
 el.addEventListener('keydown',e=>{if(e.target.id==='trZ'&&e.key==='Enter'){e.preventDefault();clearTimeout(trZT);trZApply(false);e.target.blur();}});
 el.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});el.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
 el.addEventListener('click',e=>{if(e.target===el)toast('Press ✖ Cancel to close the trade',1200);});}
// close the window if the other player goes offline or leaves
setInterval(()=>{if(!TR||!FB.pres||!Object.keys(FB.pres).length||!FB.pres[FB.uid]){if(TR)TR.miss=0;return;}if(FB.pres[TR.uid]){TR.miss=0;return;}if(++TR.miss>=3){const n=TR.n;trClose(false);toast('Trade cancelled: '+esc(n)+' went offline',2000);}},4000);
function trClick(e){const b=e.target.closest('[data-t]');if(!b||!TR)return;const a=b.dataset.t,v=b.dataset.v;sfx('ui');
 if(a==='add'){if(TR.myLock)return;const id=+v;if(TR.my.ids.includes(id))return;if(TR.my.ids.length>=TR_MAX){toast('Max '+TR_MAX+' items per trade',1200);return;}TR.my.ids.push(id);trSendOffer();}
 else if(a==='rem'){if(TR.myLock)return;TR.my.ids=TR.my.ids.filter(x=>x!==+v);trSendOffer();}
 else if(a==='zset'){if(TR.myLock)return;const z=Math.max(0,Math.min(S.zeny,Math.floor(+($('#trZ').value||0))));TR.my.z=z;trSendOffer();}
 else if(a==='flt'){TR.f=v||'';trRender();const b2=$('#trade .trc');if(b2)b2.scrollTop=0;return;}
 else if(a==='lock'){if(!TR.myLock)trZApply(true);if(!TR.myLock&&S.items.length-TR.my.ids.length+TR.their.items.length>150){toast('🎒 Your bag is too full to receive these items',1800);return;}TR.myLock=!TR.myLock;if(!TR.myLock){TR.myOk=TR.theirOk=false;}pushMsg({to:TR.uid,y:'xlk',on:TR.myLock});trRender();}
 else if(a==='ok'){if(!(TR.myLock&&TR.theirLock))return;TR.myOk=trKey();pushMsg({to:TR.uid,y:'xok',h:TR.myOk});trTry();trRender();}
 else if(a==='cx')trClose(true);}
function trRender(){const el=$('#trade');if(!el||!TR)return;const keep={};['.trc'].forEach(q=>{const n=el.querySelector(q);if(n)keep[q]=n.scrollTop;});const zf=el.querySelector('#trZ');const zFocus=zf&&document.activeElement===zf,zVal=zf?zf.value:'';
 trRender0(el);['.trc'].forEach(q=>{const n=el.querySelector(q);if(n&&keep[q])n.scrollTop=keep[q];});const z2=el.querySelector('#trZ');if(z2&&zFocus){z2.value=zVal;z2.focus();}}
function trRender0(el){const eqIds=new Set(Object.values(S.eq).filter(Boolean));
 const row=(it,act)=>`<div class="row" ${act?`data-t="${act}" data-v="${it.id}" style="cursor:pointer"`:''}><span class="nm">${SLOTI[it.slot]} ${iHtml(it)}<i>${iStat(it).replace(/<[^>]+>/g,'')}</i></span>${act==='rem'?'<b style="color:#ff7a7a">✕</b>':''}</div>`;
 const mine=trMyItems(),bagAll=S.items.filter(it=>!eqIds.has(it.id)&&!TR.my.ids.includes(it.id)).sort((a,b)=>b.rar-a.rar||b.tier-a.tier||(b.ref||0)-(a.ref||0));const fl=TR.f||'';const bag=fl?bagAll.filter(it=>it.slot===fl):bagAll;
 const flt=`<div class="trflt">${[['','All'],['w',SLOTI.w],['a',SLOTI.a],['h',SLOTI.h],['l',SLOTI.l],['f',SLOTI.f],['s',SLOTI.s],['r',SLOTI.r]].map(([k,l])=>{const n=k?bagAll.filter(i=>i.slot===k).length:bagAll.length;return n||!k?`<button data-t="flt" data-v="${k}" class="${fl===k?'on':''}">${l} ${n}</button>`:'';}).join('')}</div>`;
 const both=TR.myLock&&TR.theirLock;
 el.innerHTML=`<div class="trp"><div class="ttl" style="text-align:center;font-size:17px">🤝 Trade with <b style="color:#8fe3b0">${esc(TR.n)}</b></div>
 <div class="trc"><div class="trcol ${TR.myLock?'lk':''}"><div class="ttl">You offer ${TR.myLock?'🔒':''} <small style="color:#a99cc0">${mine.length}/${TR_MAX}</small></div><div class="trof">${mine.map(it=>row(it,TR.myLock?'':'rem')).join('')||'<i class="tri">Tap items in your bag to add them</i>'}</div>
  <div style="display:flex;gap:6px;margin:6px 0;align-items:center">💰<input id="trZ" type="number" min="0" max="${S.zeny}" value="${TR.my.z||''}" placeholder="zeny (you have ${S.zeny.toLocaleString()})" ${TR.myLock?'disabled':''} style="flex:1;min-width:0;padding:6px;border-radius:6px;border:1px solid #6a5590;background:#1a1228;color:#fff"><button data-t="zset" ${TR.myLock?'disabled':''}>Set</button></div>
  ${TR.myLock?'':`<div class="ttl" style="font-size:12px;margin-top:4px">Your bag (equipped items can't be traded)</div>${flt}<div class="trbag">${bag.map(it=>row(it,'add')).join('')||'<i class="tri">Nothing here</i>'}</div>`}</div>
 <div class="trcol ${TR.theirLock?'lk':''}"><div class="ttl">${esc(TR.n)} offers ${TR.theirLock?'🔒':''} <small style="color:#a99cc0">${TR.their.items.length}/${TR_MAX}</small></div><div class="trof">${TR.their.items.map(o=>row(Object.assign({id:0},o),'')).join('')||'<i class="tri">Nothing yet</i>'}</div>
  <div style="margin:6px 0">💰 <b style="color:#ffd76a">${(TR.their.z||0).toLocaleString()}</b> zeny</div></div></div>
 <div class="trst">${TR.myOk&&!TR.theirOk?'✅ You confirmed. Waiting for '+esc(TR.n)+'...':TR.theirOk&&!TR.myOk?'✅ '+esc(TR.n)+' confirmed. Your turn!':both?'Both ready. Press ✅ Confirm to finish the trade.':'Add items or zeny, then press 🔒 Ready. Both players must be Ready, then both Confirm.'}</div>
 <div class="fbar" style="justify-content:center"><button data-t="lock" class="${TR.myLock?'on':''}">${TR.myLock?'🔓 Unready':'🔒 Ready'}</button><button data-t="ok" ${both&&!TR.myOk?'':'disabled'}>✅ Confirm</button><button data-t="cx">✖ Cancel</button></div></div>`;}
/* ================= FLOW ================= */
function goFull(){try{const d=document.documentElement;const p=d.requestFullscreen?d.requestFullscreen({navigationUI:'hide'}):d.webkitRequestFullscreen?d.webkitRequestFullscreen():null;if(p&&p.then)p.then(()=>{try{screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>{});}catch(e){}}
function startGame(){G.mode='game';showScreen('none');showGameUI(true);G.st=stats();if(G.npcLbl)G.npcLbl.style.display='';}
function slotInfo(i){const s=loadSave(i);if(!s)return null;return {s,txt:`${facOf(s)?`<span style="color:${facOf(s).c}">${facOf(s).e} ${facOf(s).n}</span> · `:''}<b>${heroName(s)}</b> · ${CLASSES[s.cls]?CLASSES[s.cls].ic+' '+CLASSES[s.cls].n:''} · Lv ${s.lv}<br>Ch.${(s.ch||0)+1} ${CHS[s.ch||0].name} · ${DIFF[s.diff!=null?s.diff:2].n}${s.ngp?' · NG+'+s.ngp:''} · ${Math.round((s.play||0)/60)} min`};}
const PKEY='shadowoath_profile';
function getProfile(){if(FB.uid&&FB.name)return FB.name;try{return localStorage.getItem(PKEY)||''}catch(e){return ''}}
async function askName(change){let n='';while(true){n=await askText((change?'Change your player name':'Welcome, traveller! Enter your <b>player name</b>')+'<br><small>2-12 letters or numbers. It is your hero\'s name, and later your online name.</small>','Confirm');if(n===null&&change)return getProfile();n=(n||'').trim().replace(/\s+/g,' ');if(/^[A-Za-z0-9 _]{2,12}$/.test(n))break;await ask('Please use 2-12 letters, numbers, spaces or _',['OK']);}try{localStorage.setItem(PKEY,n)}catch(e){}refreshTitle();return n;}
$('#tWel').onclick=()=>{if(FB.uid){toast('Your online name is your username: '+FB.name,1800);return;}askName(true);};
function refreshTitle(){refreshAcct();const pn=getProfile();$('#tWel').innerHTML=pn?`Welcome, <b style="color:#e8c26a">${pn}</b>${FB.uid?'':' <span style="opacity:.6;font-size:11px">✏️ change</span>'}`:'';$('#saveSt').textContent=saveStatus();const any=[0,1,2].some(i=>loadSave(i));$('#tPlay').textContent=any?'▶ Play':'⚔️ New Game';if($('#slotScr').classList.contains('show'))renderSlots();}
function renderSlots(){let h='';for(let i=0;i<3;i++){const inf=slotInfo(i);h+=inf?`<div class="slot"><div class="si">${CLASSES[inf.s.cls]?CLASSES[inf.s.cls].ic:'💾'}</div><div class="st">Slot ${i+1}<br>${inf.txt}</div><button data-s="${i}" data-a="cont">Continue</button><button class="del" data-s="${i}" data-a="del">🗑</button></div>`
 :`<div class="slot"><div class="si" style="opacity:.4">＋</div><div class="st">Slot ${i+1}<br><i>Empty</i></div><button data-s="${i}" data-a="new">New Game</button></div>`;}
 $('#slotList').innerHTML=h;}
$('#slotList').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.dataset.s,a=b.dataset.a;audioStart();sfx('ui');
 if(a==='cont'){SLOT=i;goFull();continueGame(loadSave(i));}
 else if(a==='new'){SLOT=i;goFull();openSelect();}
 else if(a==='del'){const inf=slotInfo(i);if(await ask(`Delete Slot ${i+1} (${heroName(inf.s)} Lv ${inf.s.lv})? This cannot be undone.`,['Delete','Cancel'])===0){deleteSlot(i);renderSlots();refreshTitle();}}};
$('#slotBack').onclick=()=>{showScreen('titleScr');};
function toTitle(){netLeave();G.dg=null;if(NET.duel)NET.duel=null;G.mode='title';showGameUI(false);$('#bossbar').style.display='none';refreshTitle();showScreen('titleScr');if(G.npcLbl)G.npcLbl.style.display='none';musicFor(-1,false);presenceUpdate();}
function initHero(){G.st=stats();Object.assign(hero,{hp:G.st.mhp,sp:G.st.msp,sta:G.st.msta,cd:[0,0,0,0,0],dead:false,buffs:{},lock:null,flask:S.flask,state:'idle'});}
function newGame(hk,ck,cust,df,fac){freshSave(hk,ck,cust,df);S.fac=fac;S.fields.prologue='meet';initHero();loadChapter(0);startGame();save();banner('Before the oath','Walk to '+partnerName()+' · Settings can skip the introduction',4000);}
// new fields for older saves: higher ore tiers start at 0; auto setup is sanitised
function migrateSave(s){s.ore=s.ore||{};for(const k in ORE)if(!(s.ore[k]>=0))s.ore[k]=0;s.autoCfg=s.autoCfg?autoSan(s.autoCfg):null;return s;}
async function continueGame(s){S=s||loadSave();if(S&&S.diff==null)S.diff=2;if(S&&!facOf(S)){const r=await ask('Choose your Faction<br><small>It will show next to your name and on the leaderboard.</small>',FACTIONS.map(f=>f.e+' '+f.n));S.fac=FACTIONS[r].k;}if(!S)return;if(!S.q){toast('Old save is not compatible. Please start a new game.');S=null;return;}if(!S.sk){S.v=3;S.sk={};S.bar=[null,null,null,null];S.skp=S.lv;toast('Skill tree added: you have '+S.skp+' skill points to spend!',3000);}
 S.job=S.job||0;migrateSave(S);while(S.bar.length<6)S.bar.push(null);skSync();while(S.cleared.length<CHS.length)S.cleared.push(0);while(S.q.length<CHS.length)S.q.push({s:0,p:0,shr:[0,0,0]});
 if(S.done&&S.unlocked<20){S.unlocked=20;setTimeout(()=>banner('🌍 The New World is open!','Chapter 21 unlocked: open ☰ Menu → World Map',4200),2500);}
 if((S.v||3)<4){S.v=4;S.lv=Math.min(S.lv,LV_MAX);S.st=Object.assign({},CLASSES[S.cls].base);S.pts=S.lv-1;setTimeout(()=>ask('⚖️ <b>New stat rules</b><br>1 stat point per level · every stat caps at <b>99</b> · max level <b>594</b> (6 × 99).<br><br>Your stats were reset and you got <b>'+S.pts+' points</b> back. Open ☰ Menu → Status to assign them.',['OK']),1500);}
 if((S.v||4)<5){S.v=5;S.st=Object.assign({},CLASSES[S.cls].base);
  setTimeout(()=>ask('⚖️ <b>New stat rules (RO-style)</b><br>You now gain <b>'+STAT_PTS+' points per level</b>, and raising a stat costs more as it grows (every 10 points, +1 cost).<br><br>Your stats were reset and every point refunded: <b>'+ptsLeft().toLocaleString()+' points</b> to spend in ☰ Menu → Status.',['OK']),3000);}initHero();loadChapter(S.ch);startGame();if(prologueActive()&&S.fields.prologue==='abduction')finishFieldPrologue(false);else titleCard(S.ch);}
function startEnding(kind){G.endKind=kind||'';G.mode='ending';showGameUI(false);G.mobs.forEach(removeMob);G.mobs=[];if(G.cage)world.remove(G.cage);
 const pm=buildHero(partnerKey(),partnerKey()==='L'?'knight':'priest',{w:{tier:2,rar:2,ref:0,slot:'w'},a:{tier:1,rar:1,ref:0,slot:'a'},s:{tier:1,rar:1,ref:0,slot:'s'}});
 hero.x=AR.x-.7;hero.z=AR.z;hero.face=Math.PI/2;hero.state='idle';hero.dead=false;pm.root.position.set(AR.x+.9,gY(AR.x+.9,AR.z),AR.z);pm.root.rotation.y=-Math.PI/2;world.add(pm.root);G.endPartner=pm;syncHero();sfx('ending');musicFor(0,false);
 for(let i=0;i<40;i++)setTimeout(()=>PS.burst(AR.x+rnd(-4,4),gY(AR.x,AR.z)+rnd(0,3),AR.z+rnd(-4,4),3,[0xffd76a,0xff8ac0,0xffffff][i%3],{sp:1,up:2,g:-.5,life:2}),i*150);
 $('#endNew').style.display=kind==='dawn'?'none':'';$('#endTxt').innerHTML=(kind==='dawn'?`Ava is free and Eldoria shines again.<br>${heroName()} the ${jobName()} finished all ${CHS.length} chapters!`:`${heroName()} the ${jobName()} rescued ${partnerName()} after 20 chapters!<br><b style="color:#c9a0ff">But the rift still glows... a New World awaits.</b>`)+`<br>Final level ${S.lv} · 💰 ${S.zeny.toLocaleString()} zeny · ${Math.round(S.play/60)} minutes played`;showScreen('endScr');}
$('#endCont').onclick=()=>{if(G.endPartner)world.remove(G.endPartner.root);G.endPartner=null;S.ngp++;if(S.fields?.version===1){S.fields.stage=0;S.fields.counts={};}S.unlocked=0;for(let i=0;i<CHS.length;i++){S.cleared[i]=0;S.q[i]={s:0,p:0,shr:[0,0,0]};}S.done=0;S.done2=0;startGame();loadChapter(0);toast('New Game+ '+S.ngp+': enemies are '+(S.ngp*20)+' levels stronger. Your gear and level carry over.',3500);save();};
$('#endNew').onclick=()=>{if(G.endPartner)world.remove(G.endPartner.root);G.endPartner=null;S.unlocked=Math.max(S.unlocked,20);startGame();loadChapter(20);titleCard(20);story(CHS[20].intro);save(true);};
$('#endTitle').onclick=()=>{if(G.endPartner)world.remove(G.endPartner.root);G.endPartner=null;toTitle();};

/* select screen preview */
const pscene=new T.Scene();pscene.background=new T.Color(0x140d22);pscene.fog=new T.Fog(0x140d22,8,22);
pscene.add(new T.HemisphereLight(0xd8c8ff,0x221a30,.9));const pl=new T.DirectionalLight(0xffe6c0,1.1);pl.position.set(3,6,5);pscene.add(pl);const pl2=new T.PointLight(0xffc860,1.5,10);pl2.position.set(0,.6,1.6);pscene.add(pl2);
const ped=mesh(CYL(1.3,1.5,.35,12),mat(0x3a2d4a),0,-.18,0);pscene.add(ped);const pr=mesh(RING(1.35,1.5),basic(0xffd76a,{side:T.DoubleSide}),0,.01,0);pr.rotation.x=-Math.PI/2;pscene.add(pr);
const pcam=new T.PerspectiveCamera(40,1,.1,50);let pModel=null,selH='L',selC='knight';

/* ===== EQUIPMENT PAPER-DOLL =====
   Shows the player's real character inside the Equipment window. It needs its own
   renderer: a DOM overlay can't reveal the main canvas behind it, because the menu
   scrim and card backgrounds paint over everything. Built with the same buildHero()
   call rebuildHero() uses, so the doll always matches the character in the world.
   The canvas is created once and re-parented on each menu render — recreating it
   from innerHTML would leak a WebGL context every time you equip something. */
const dscene=new T.Scene();
dscene.add(new T.HemisphereLight(0xd8c8ff,0x221a30,.95));
{const a=new T.DirectionalLight(0xffe6c0,1.15);a.position.set(3,6,5);dscene.add(a);
 const b=new T.DirectionalLight(0xaecbff,.55);b.position.set(-4,3,-5);dscene.add(b);}
const dcam=new T.PerspectiveCamera(34,.78,.1,50);
/* One canvas, one WebGL context, shared by the Equipment paper-doll and the Forge
   item stage. They live on different tabs and are never visible together, so the
   canvas is moved between hosts rather than spawning a second context. */
let PR=null,panelCv=null,panelDrag=null,panelSpin=.5,panelT=0;
let dollM=null,dollSig='';
function panelDraw(){if(G.tab==='bag')dollRender();else if(G.tab==='forge')fgRender();}
function panelMount(sel){
 const host=$(sel);if(!host)return null;
 if(!panelCv){
  panelCv=document.createElement('canvas');panelCv.id='panelCv';
  let px=0;
  panelCv.addEventListener('pointerdown',e=>{panelDrag=e.pointerId;px=e.clientX;try{panelCv.setPointerCapture(e.pointerId)}catch(err){}e.stopPropagation();});
  panelCv.addEventListener('pointermove',e=>{if(panelDrag!==e.pointerId)return;panelSpin+=(e.clientX-px)*.012;px=e.clientX;panelDraw();});
  const end=e=>{if(panelDrag===e.pointerId)panelDrag=null;};
  panelCv.addEventListener('pointerup',end);panelCv.addEventListener('pointercancel',end);
 }
 if(panelCv.parentNode!==host)host.insertBefore(panelCv,host.firstChild);
 return panelCv;
}
function panelRender(scene,cam,place){
 if(!panelCv)return;
 const w=panelCv.clientWidth,h=panelCv.clientHeight;if(!w||!h)return;
 if(!PR){try{PR=new T.WebGLRenderer({canvas:panelCv,antialias:QUAL!=='low',alpha:true});PR.setClearColor(0x000000,0);}catch(e){PR=null;return;}}
 PR.setPixelRatio(Math.min(window.devicePixelRatio||1,Q().dpr));PR.setSize(w,h,false);
 cam.aspect=w/h;place(cam);cam.updateProjectionMatrix();PR.render(scene,cam);
}
function disposePanel(o){o.traverse(n=>{const m=n.material;if(!m)return;
 (Array.isArray(m)?m:[m]).forEach(x=>{if(x&&x.dispose)x.dispose();});});}
function dollRender(){
 if(!dollM)return;
 dollM.root.rotation.y=panelSpin;
 panelRender(dscene,dcam,c=>{c.position.set(0,1.62,4.4);c.lookAt(0,.95,0);});
}
function dollBuild(){
 if(!S)return;const sig=EQSLOTS.map(k=>{const o=S.eq[k]?itemById(S.eq[k]):null;return o?k+o.id+':'+o.ref+':'+o.rar+':'+o.tier:k+'-';}).join('|')+'|'+(S.job||0)+'|'+S.cls+'|'+S.hero;
 if(sig===dollSig&&dollM)return;dollSig=sig;
 if(dollM){dscene.remove(dollM.root);disposePanel(dollM.root);}
 dollM=buildHero(S.hero,S.cls,eqVisFromSave(),{cust:S.cust,job:S.job||0});dscene.add(dollM.root);
}
function dollWire(){
 if(!panelMount('.eqstage'))return;
 dollBuild();dollRender();
}
function dollTick(dt){
 if(!menuOpen||panelDrag!=null)return;
 if(G.tab!=='bag'&&G.tab!=='forge')return;
 panelT+=dt;if(panelT<.05)return;panelT=0;panelSpin+=.018;panelDraw();
}
/* Forge stage: the selected item alone, auto-framed from its bounding box — a
   staff and a ring differ enormously in size, so a fixed camera can't serve both. */
const fscene=new T.Scene();
fscene.add(new T.HemisphereLight(0xffd8b0,0x2a1a10,.85));
{const a=new T.DirectionalLight(0xffd0a0,1.5);a.position.set(2.5,4,3.5);fscene.add(a);
 const b=new T.DirectionalLight(0x8ab0ff,.5);b.position.set(-3,2,-3);fscene.add(b);}
const fcam=new T.PerspectiveCamera(36,1,.1,60);
let fgM=null,fgSig='';
function buildRing(it){
 const g=new T.Group(),t=Math.min(5,it.tier),M=rarMat(it.rar,it.ref);
 const r=mesh(TOR(.18,.045),M,0,0,0);r.rotation.x=Math.PI/2;g.add(r);
 if(t>=1)g.add(mesh(OCT(.07+t*.012),basic(RCOL[it.rar]),0,.19,0));
 if(t>=4){const gs=glowSprite(RCOL[it.rar],.55);gs.position.set(0,.19,0);g.add(gs);}
 return g;
}
function buildItemModel(it){
 if(it.slot==='w')return buildWeapon(C_().wt,it);
 if(it.slot==='a')return buildArmor(it,C_().robe);
 if(it.slot==='h')return buildHelm(it);
 if(it.slot==='s')return buildShield(it);
 if(it.slot==='l')return buildLowerHead(it);
 if(it.slot==='f')return buildBoots(it);
 return buildRing(it);
}
function fgBuild(it){
 const sig=it?it.id+'|'+it.ref+'|'+it.rar+'|'+it.tier+'|'+it.slot:'';
 if(sig===fgSig)return;fgSig=sig;
 if(fgM){fscene.remove(fgM);disposePanel(fgM);fgM=null;}
 if(it){fgM=buildItemModel(it);fscene.add(fgM);}
}
const _fb=new T.Box3(),_fs=new T.Vector3(),_fc=new T.Vector3();
function fgRender(){
 if(!fgM)return;
 fgM.rotation.y=panelSpin;
 panelRender(fscene,fcam,c=>{
  _fb.setFromObject(fgM);_fb.getSize(_fs);_fb.getCenter(_fc);
  const r=Math.max(_fs.x,_fs.y,_fs.z)*.5||.4;
  const d=r/Math.tan(c.fov*Math.PI/360)*2.1;
  c.position.set(_fc.x,_fc.y+r*.12,_fc.z+d);c.lookAt(_fc.x,_fc.y,_fc.z);
 });
}
function fgWire(){
 if(!panelMount('.fgstage'))return;
 fgBuild(G.fgSel?itemById(G.fgSel):null);fgRender();
}
/* Item detail popup, opened by tapping a slot tile. */
function eqPop(sl){
 const it=S.eq[sl]?itemById(S.eq[sl]):null;
 let el=$('#eqPop');
 if(!el){
  el=document.createElement('div');el.id='eqPop';document.body.appendChild(el);
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  el.addEventListener('click',e=>{
   const b=e.target.closest('[data-a]');
   if(!b){if(e.target===el)el.classList.remove('show');return;}
   el.classList.remove('show');
   if(b.dataset.a!=='popclose')menuAct(b.dataset.a,b.dataset.v,b);
  });
 }
 if(!it){
  el.innerHTML=`<div class="eqpc"><div class="eqph">${SLOTI[sl]} ${SLOTN[sl]}</div><i class="ist">Nothing equipped in this slot.</i><div class="ia"><button data-a="popclose">Close</button></div></div>`;
 }else{
  const rows=[['Slot',SLOTN[sl]],['Rarity',RNAME[it.rar]],['Tier',it.tier+1],['Refine','+'+(it.ref||0)+' / '+REF_MAX],['Stats',iStat(it)],['Sells for',iPrice(it)+' z']];
  if(it.af&&AFFIX[it.af.k])rows.push(['Affix',AFFIX[it.af.k].n]);
  el.innerHTML=`<div class="eqpc"><div class="eqph">${iHtml(it)}</div>`
   +rows.map(r=>`<div class="eqpr"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('')
   +`<div class="ia"><button data-a="unequip" data-v="${sl}">Unequip</button><button data-a="popclose">Close</button></div></div>`;
 }
 el.classList.add('show');
}
const CU={fac:null,name:'',pname:'',style:'spiky',hair:HEROES.L.hair,skin:0xf2c8a0,outfit:null,diff:1,step:0,spin:false};
function defaultsFor(h){CU.style=HEROES[h].style;CU.hair=HEROES[h].hair;}
const hx=c=>'#'+new T.Color(c).getHexString();
function renderCust(){const C=CLASSES[selC];
 $('#facGrid').innerHTML=FACTIONS.map(f=>`<button data-v="${f.k}" class="${CU.fac===f.k?'on':''}" style="${CU.fac===f.k?'border-color:'+f.c+';box-shadow:0 0 0 2px '+f.c:''}"><span>${f.e}</span><b style="color:${f.c}">${f.n}</b></button>`).join('');
 $('#cuStyle').innerHTML=HAIRSTYLES.map(([k,n])=>`<button data-v="${k}" class="${CU.style===k?'on':''}">${n}</button>`).join('');
 $('#cuHair').innerHTML=HAIRCOLS.map(c=>`<button data-v="${c}" class="${CU.hair===c?'on':''}" style="background:${hx(c)}"></button>`).join('');
 $('#cuSkin').innerHTML=SKINS.map(c=>`<button data-v="${c}" class="${CU.skin===c?'on':''}" style="background:${hx(c)}"></button>`).join('');
 $('#cuOut').innerHTML=OUTFITS.map(c=>`<button data-v="${c===null?'d':c}" class="${CU.outfit===c?'on':''}" style="background:${hx(c===null?C.col:c)}" title="${c===null?'Class default':''}">${c===null?'★':''}</button>`).join('');
 $('#cuDiff').innerHTML=DIFF.map((d,i)=>`<button data-v="${i}" class="${CU.diff===i?'on':''}">${d.n}</button>`).join('');$('#diffD').textContent=DIFF[CU.diff].d+'. You can change it later in Settings.';
 const colorNames={cuHair:['Dark brown','Chestnut','Black','Gold','Silver','Rose','Blue','Red','Green'],cuSkin:['Light peach','Peach','Tan','Warm brown','Deep brown'],cuOut:['Class default','Crimson','Forest','Charcoal','Ivory','Violet','Amber','Blue']};
 for(const id of ['facGrid','cuStyle','cuHair','cuSkin','cuOut','cuDiff'])document.querySelectorAll('#'+id+' button').forEach((b,i)=>{b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false');if(colorNames[id]){const label=({cuHair:'Hair color',cuSkin:'Skin tone',cuOut:'Outfit'})[id]+': '+colorNames[id][i];b.setAttribute('aria-label',label);b.title=label;}});
 const faction=FACTIONS.find(f=>f.k===CU.fac);$('#factionDesc').textContent=faction?faction.d:'Choose the faction shown beside your name.';
 $('#creationSummary').textContent=(getProfile()||HEROES[selH].name)+' · '+C.n+' · '+DIFF[CU.diff].n+' difficulty'+(faction?' · '+faction.n:'');
 renderCreationStep(false);}
let previewBounds=null;
function renderCreationStep(resetScroll){
 document.querySelectorAll('[data-creation-step]').forEach(el=>el.hidden=+el.dataset.creationStep!==CU.step);
 document.querySelectorAll('#creationSteps button').forEach(b=>{if(+b.dataset.step===CU.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 $('#selGo').textContent=CU.step===2?'Begin Journey ▸':'Continue →';$('#selGo').disabled=CU.step===2&&!CU.fac;
 $('#selBack').textContent=CU.step===0?'← Back':'← Previous';
 $('#creationHint').textContent=CU.step===2?(CU.fac?'Your hero is ready.':'Choose a faction to begin.'):'Step '+(CU.step+1)+' of 3 · Changes appear in the preview';
 if(resetScroll)$('#creationFields').scrollTop=0;
}
function setCreationStep(step){CU.step=clamp(step,0,2);renderCreationStep(true);}
$('#creationSteps').onclick=e=>{const b=e.target.closest('[data-step]');if(b)setCreationStep(+b.dataset.step);};
$('#previewRotate').onclick=()=>{CU.spin=!CU.spin;$('#previewRotate').setAttribute('aria-pressed',String(CU.spin));$('#previewRotate').textContent=CU.spin?'Ⅱ Pause':'↻ Rotate';};
function drawCreationPreview(dt){
 if(!pModel||!previewBounds)return;
 if(CU.spin)pModel.root.rotation.y+=dt*.6;
 const rect=$('#creationPreview').getBoundingClientRect(),w=rect.width,h=Math.max(1,rect.height-52),x=rect.left,y=H-rect.top-h;
 const b=previewBounds,aspect=w/h,radius=Math.hypot(b.size.x,b.size.z),distance=Math.max(b.size.y,radius/aspect)*.5/Math.tan(pcam.fov*Math.PI/360)*1.25;
 pcam.aspect=aspect;pcam.position.set(0,b.center.y+.12,distance);pcam.lookAt(0,b.center.y,0);pcam.updateProjectionMatrix();
 R.setRenderTarget(null);R.setScissorTest(false);R.setViewport(0,0,W,H);R.setClearColor(0x07060c);R.clear();
 R.setViewport(x,y,w,h);R.setScissor(x,y,w,h);R.setScissorTest(true);R.render(pscene,pcam);R.setScissorTest(false);R.setViewport(0,0,W,H);
}

function custObj(){return {name:getProfile()||null,pname:null,style:CU.style,hair:CU.hair,skin:CU.skin,outfit:CU.outfit};}
function refreshPreview(){if(pModel)pscene.remove(pModel.root);const C=CLASSES[selC];const fake=S;S=S||{hero:selH,cls:selC};pModel=buildHero(selH,selC,{w:{slot:'w',tier:1,rar:2,ref:0},a:{slot:'a',tier:2,rar:1,ref:0},h:null,s:C.shield?{slot:'s',tier:1,rar:1,ref:0}:null},{cust:custObj()});S=fake;pscene.add(pModel.root);const bounds=new T.Box3().setFromObject(pModel.root);previewBounds={center:bounds.getCenter(new T.Vector3()),size:bounds.getSize(new T.Vector3())};
 $('#cDesc').innerHTML=`<b style="color:#e8c26a">${C.ic} ${C.n}</b> · ${C.role}<br>${C.desc}<details><summary>Skills &amp; job progression ▾</summary>${C.sk.filter(s=>!s.job).map(s=>s.e+' '+s.n).join(' · ')}<br><br>${JOBS[selC].join(' → ')}</details>`;
 $('#hostTxt').textContent=`Your companion: ${HEROES[selH==='L'?'C':'L'].name}. Your adventure begins together.`;$('#cuPlayer').textContent=getProfile()||HEROES[selH].name;
 $('#creationLook').textContent=HEROES[selH].name+' · '+C.n;
 document.querySelectorAll('#heroSeg button').forEach(b=>{b.classList.toggle('on',b.dataset.h===selH);b.setAttribute('aria-pressed',String(b.dataset.h===selH));});document.querySelectorAll('#clsGrid button').forEach(b=>{b.classList.toggle('on',b.dataset.c===selC);b.setAttribute('aria-pressed',String(b.dataset.c===selC));});renderCust();}
function openSelect(){G.mode='preview';showGameUI(false);CU.step=0;CU.spin=false;$('#previewRotate').setAttribute('aria-pressed','false');$('#previewRotate').textContent='↻ Rotate';CU.fac=null;CU.skin=0xf2c8a0;CU.outfit=null;CU.diff=1;defaultsFor(selH);showScreen('selScr');refreshPreview();renderCreationStep(true);}
$('#clsGrid').innerHTML=CLS_ORDER.map(k=>`<button data-c="${k}"><span>${CLASSES[k].ic}</span><b>${CLASSES[k].n}</b>${CLASSES[k].role.split('·')[0]}</button>`).join('');
$('#clsGrid').onclick=e=>{const b=e.target.closest('[data-c]');if(b){selC=b.dataset.c;refreshPreview();sfx('ui');}};
$('#heroSeg').onclick=e=>{const b=e.target.closest('[data-h]');if(b){selH=b.dataset.h;defaultsFor(selH);refreshPreview();sfx('ui');}};
const swH=(id,f)=>$(id).onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;const value=b.dataset.v;f(value);refreshPreview();$(id).querySelector(`[data-v="${value}"]`)?.focus({preventScroll:true});sfx('ui');};
swH('#facGrid',v=>CU.fac=v);swH('#cuStyle',v=>CU.style=v);swH('#cuHair',v=>CU.hair=+v);swH('#cuSkin',v=>CU.skin=+v);swH('#cuOut',v=>CU.outfit=v==='d'?null:+v);swH('#cuDiff',v=>CU.diff=+v);
$('#cuRename').onclick=async()=>{await askName(true);refreshPreview();};
$('#tPlay').onclick=async()=>{audioStart();if(FB.avail&&FB.ready&&!FB.uid&&!G.askedLogin){G.askedLogin=1;const r=await ask('<b>Choose how to play</b><br><small>Log in for account save sync and online features. Play solo without an account to save on this device. New heroes start with Hero → Appearance → Journey, then an optional introduction.</small>',['🔑 Log in / Create account','Play offline']);if(r===0&&await loginDialog())await afterLogin();}
 if(!getProfile())await askName(false);if(![0,1,2].some(i=>loadSave(i))){SLOT=0;goFull();openSelect();return;}showScreen('slotScr');renderSlots();};
$('#tLoad').onclick=async()=>{audioStart();const code=await askText('Paste your save code:','Load');if(!code)return;const s=importCode(code);if(!s){await ask('That save code is not valid.',['OK']);return;}
 const r=await ask('Load it into which slot?<br><small>'+[0,1,2].map(i=>{const f=slotInfo(i);return 'Slot '+(i+1)+': '+(f?heroName(f.s)+' Lv '+f.s.lv+' (will be replaced)':'empty');}).join('<br>')+'</small>',['Slot 1','Slot 2','Slot 3','Cancel']);if(r>2)return;SLOT=r;S=s;save(true);goFull();continueGame(s);};
$('#selBack').onclick=()=>{if(CU.step>0){setCreationStep(CU.step-1);return;}G.mode='title';showScreen([0,1,2].some(i=>loadSave(i))?'slotScr':'titleScr');};
$('#selGo').onclick=()=>{audioStart();if(CU.step<2){setCreationStep(CU.step+1);return;}if(!CU.fac){toast('Choose your Faction first',1600);const g=$('#facGrid');g.classList.remove('need');void g.offsetWidth;g.classList.add('need');setCreationStep(2);$('#facGrid button').focus();sfx('deny');return;}goFull();newGame(selH,selC,custObj(),CU.diff,CU.fac);};
$('#rotSkip').onclick=()=>document.body.classList.add('noRot');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='game'&&S)save();});
addEventListener('pagehide',()=>{if(G.mode==='game'&&S)save();});addEventListener('beforeunload',()=>{if(G.mode==='game'&&S)save();});
function ask(msg,btns){return new Promise(res=>{const m=$('#modal');$('#mdT').innerHTML=msg;$('#mdIn').style.display='none';$('#mdB').innerHTML=btns.map((b,i)=>`<button class="btn ${i?'ghost':''}" data-i="${i}">${b}</button>`).join('');m.style.display='flex';$('#mdB').onclick=e=>{const b=e.target.closest('[data-i]');if(!b)return;m.style.display='none';res(+b.dataset.i);};});}
function askText(msg,ok){return new Promise(res=>{const m=$('#modal');$('#mdT').innerHTML=msg;const ta=$('#mdIn');ta.value='';ta.style.display='block';$('#mdB').innerHTML='<button class="btn" data-i="0">'+(ok||'OK')+'</button><button class="btn ghost" data-i="1">Cancel</button>';m.style.display='flex';setTimeout(()=>ta.focus(),50);$('#mdB').onclick=e=>{const b=e.target.closest('[data-i]');if(!b)return;m.style.display='none';res(b.dataset.i==='0'?ta.value:null);};});}
refreshTitle();cloudInit();fbInit();
{const inApp=/FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|WhatsApp|MicroMessenger|TikTok|musical_ly/i.test(navigator.userAgent);const sa=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
 if(inApp){$('#iosTip').style.display='';$('#iosTip').innerHTML='📱 <b>You opened the game inside '+(/Messenger|FBAN|FBAV|FB_IAB|FBIOS/i.test(navigator.userAgent)?'Messenger/Facebook':'another app')+'.</b> For full screen: tap <b>•••</b> → <b>Open in '+(isIOS?'Safari':'Chrome')+'</b>, then '+(isIOS?'<b>Share → Add to Home Screen</b>':'<b>⋮ → Add to Home screen</b>')+'.';}
 else if(isIOS&&!sa){$('#iosTip').style.display='';$('#iosTip').innerHTML='📱 <b>Full screen on iPhone:</b> tap <b>Share ⬆</b> → <b>Add to Home Screen</b>, then open Shadow Oath from your home screen: no address bar, real app. (iPhone Safari does not let web pages go full screen by themselves.)';}}
applyQuality();

/* ================= LOOP ================= */
let last=performance.now();
function loop(now){let dt=Math.min(.05,(now-last)/1000);last=now;const rdt=dt;
 if(G.mode==='game'&&S){if(G.hitstop>0){G.hitstop-=dt;dt*=.06;}if(G.slow>0){G.slow-=dt;dt*=.3;}
  if(!menuOpen&&!dlgOpen)update(dt);else if(NET.on)netBg(dt);if(NET.on)netTick(rdt);animHero(dt);dollTick(dt);if(G.endPartner){}updateCam(dt);updateOverlay();G.flash=Math.max(0,G.flash-dt*2);PF.render(G.flash*.6);G.hudT-=dt;if(G.hudT<=0){G.hudT=.08;hud();}}
 else if(G.mode==='ending'){G.t+=dt;animHero(dt);PS.update(dt);const a=G.t*.25;const cy=gY(AR.x,AR.z);cam.position.set(AR.x+Math.sin(a)*7,cy+3.2,AR.z+Math.cos(a)*7);cam.lookAt(AR.x,cy+1.2,AR.z);sky.position.copy(cam.position);if(G.endPartner){G.endPartner.root.rotation.y=-Math.PI/2+Math.sin(G.t)*.1;}updateFx(dt);PF.render(0);}
 else if(G.mode==='preview'){G.t+=dt;drawCreationPreview(dt);}
 else{R.setRenderTarget(null);R.setClearColor(0x07060c);R.clear();}
 requestAnimationFrame(loop);}
requestAnimationFrame(loop);
