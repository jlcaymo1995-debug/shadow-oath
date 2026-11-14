// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?priest
setTimeout(()=>{
 if(!location.search.includes('priest'))return;
 const errors=[];const check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  freshSave('L','priest',null,1);S.lv=99;S.job=0;document.body.classList.add('noRot');
  const sk=C_().sk,idx=n=>sk.findIndex(s=>s.n===n);
  const iB=idx('Blessing'),iA=idx('Increase Agility'),iG=idx('Gloria');
  // saved indices must not move: new skills are the last three, Holy Light stays slot 0
  check(sk[0].n==='Holy Light'&&iB===sk.length-3&&iA===sk.length-2&&iG===sk.length-1,'skill indices shifted');
  check(C_().ps[0].n==='Faith'&&C_().ps[0].k==='hpp','old passive renamed to Faith');
  check([iB,iA,iG].every(i=>sk[i].job===0),'buffs belong to the first-job tree');
  // Lv1 values match the spec
  S.sk={['a'+iB]:1,['a'+iA]:1,['a'+iG]:1};
  const b1=skDef(iB).bon,a1=skDef(iA).bon,g1=skDef(iG).bon;
  check(b1.str===5&&b1.int===5&&b1.dex===3&&b1.hit===10,'Blessing Lv1 = STR/INT+5 DEX+3 Hit+10');
  check(a1.agi===10&&Math.abs(a1.aspd-.15)<1e-9&&a1.mspd>0,'Increase Agility Lv1 = AGI+10, +15% ASPD, move speed');
  check(g1.luk===8,'Gloria Lv1 = LUK+8');
  // Max levels: Blessing/Inc AGI 10, Gloria 5 (=40 LUK)
  S.sk={['a'+iB]:10,['a'+iA]:10,['a'+iG]:5};S.skp=5;
  check(skMax('a',iB)===10&&skMax('a',iA)===10&&skMax('a',iG)===5,'max levels');
  check(canLearn('a',iG)==='MAX','Gloria stops at Lv5');
  check(skDef(iG).bon.luk===40,'Gloria max = 40 LUK');
  initHero();loadChapter(0);startGame();G.intro=null;G.mobs.forEach(m=>m.agg=false);
  hero.buffs={};const base=stats();
  doSkill(iB);doSkill(iA);doSkill(iG);const buffed=stats();
  check(hero.buffs.bless&&hero.buffs.incagi&&hero.buffs.gloria,'all three buffs applied');
  check(buffed.hit===28&&base.hit===0,'Hit from Blessing');
  check(buffed.atk>base.atk&&buffed.msp>base.msp,'STR/INT raise ATK and SP');
  check(buffed.aspdM>base.aspdM,'attack speed up');
  check(buffed.spd>base.spd*1.15,'move speed up');
  check(buffed.crit>base.crit,'crit up');
  // expiry restores the base numbers
  for(const k in hero.buffs)hero.buffs[k].t=0.001;update(0.01);
  check(!Object.keys(hero.buffs).length&&stats().atk===base.atk&&stats().crit===base.crit,'buffs expire cleanly');
  // Party buffs: same party + within range applies; recomputed locally from level
  check([iB,iA,iG].every(i=>sk[i].pty),'all three are party buffs');
  const savedPt=FB.pt;FB.pt='lead';hero.buffs={};
  applyEv({y:'pbf',k:'gloria',lv:5,pt:'lead',x:hero.x+5,z:hero.z,n:'Pri',u:'other'});
  check(hero.buffs.gloria&&hero.buffs.gloria.luk===40,'party member in range gets Gloria');
  hero.buffs={};applyEv({y:'pbf',k:'bless',lv:10,pt:'lead',x:hero.x+PARTY_BUFF_R+5,z:hero.z,n:'Pri',u:'other'});
  check(!hero.buffs.bless,'out of range gets nothing');
  applyEv({y:'pbf',k:'bless',lv:10,pt:'otherparty',x:hero.x,z:hero.z,n:'Pri',u:'other'});
  check(!hero.buffs.bless,'other party gets nothing');
  applyEv({y:'pbf',k:'gloria',lv:99,pt:'lead',x:hero.x,z:hero.z,n:'<b>x</b>',u:'other'});
  check(hero.buffs.gloria.luk===40,'level is clamped to the skill max');
  applyEv({y:'pbf',k:'aspd',lv:10,pt:'lead',x:hero.x,z:hero.z,u:'other'});
  check(!hero.buffs.aspd,'only party buffs can be sent');
  // caster broadcasts when online and in a party
  const on=NET.on,nb=NET.base;let sent=null;
  NET.on=true;NET.base={child:()=>({push:ev=>{sent=ev;return Promise.resolve();}})};
  doSkill(iA);NET.on=on;NET.base=nb;FB.pt=savedPt;
  check(sent&&sent.y==='pbf'&&sent.k==='incagi'&&sent.lv===10&&sent.pt==='lead','caster broadcasts party buff');
  hero.buffs={};
  // Status screen shows (+X)
  doSkill(iB);doSkill(iA);doSkill(iG);
  openMenu('status');const t=$('#mBody').textContent;
  check(t.includes('(+14)')&&t.includes('(+12)')&&t.includes('(+19)')&&t.includes('(+40)'),'status shows (+X) bonuses');
  check(t.includes('Hit')&&t.includes('28'),'status shows Hit');
  check($('#mBody').scrollWidth<=$('#mBody').clientWidth+1,'status horizontal overflow');
  G.mode='game';update=()=>{};requestAnimationFrame=()=>0;updateCam(1);PF.render(0);
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
