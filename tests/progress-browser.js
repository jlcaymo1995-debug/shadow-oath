// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?progress
// Enriched/Mithril ore ladder, combining, refine milestone stats, and Auto Setup.
setTimeout(()=>{
 if(!location.search.includes('progress'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  requestAnimationFrame=()=>0;
  freshSave('L','priest',null,1);S.lv=99;document.body.classList.add('noRot');initHero();loadChapter(0);startGame();G.intro=null;update=()=>{};
  // --- ore ladder
  const w=S.items.find(i=>i.slot==='w'),a=S.items.find(i=>i.slot==='a');
  w.ref=9;check(refineCost(w).ore==='ori'&&refineCost(w).n===3,'+9 attempt uses 3 Oridecon');
  w.ref=10;check(refineCost(w).ore==='eori'&&refineCost(w).n===1,'+11 attempt uses 1 Enriched Oridecon');
  a.ref=15;check(refineCost(a).ore==='melu','+16 attempt uses Mithril Elunium');
  S.zeny=1e9;S.ore.eori=0;G.fgSel=w.id;openMenu('forge');
  check($('#mBody [data-a="refine"]').disabled,'cannot refine to +11 without Enriched ore');
  check($('#mBody').textContent.includes('Combine ores'),'combine card shown');
  // --- combining
  S.ore.ori=25;menuAct('combine','eori:max');check(S.ore.eori===2&&S.ore.ori===5,'10 Oridecon -> 1 Enriched (made 2)');
  S.ore.eelu=41;menuAct('combine','melu:1');check(S.ore.melu===1&&S.ore.eelu===21,'20 Enriched -> 1 Mithril');
  menuAct('combine','eelu:1');check(S.ore.eelu===21,'no Elunium means nothing made');
  check(loadLocal(SLOT).ore.melu===1,'combined ore is saved');
  // --- shop: Enriched at 11x, Mithril never sold
  G.shopT='buy';openMenu('shop');const shop=$('#mBody').textContent;
  check(shop.includes('Enriched Oridecon')&&!shop.includes('Mithril'),'shop sells Enriched, not Mithril');
  check(oreP('eori')===oreP('ori')*11||Math.abs(oreP('eori')-oreP('ori')*11)<=11,'Enriched costs 11x');
  const before=S.ore.mori;menuAct('buyore','mori');check(S.ore.mori===before,'Mithril cannot be bought');
  // --- milestone stats: per item, not stacking, counted once
  for(const it of S.items)it.ref=0;
  const base=stats();w.ref=10;a.ref=15;
  check(refSt()===20,'+10 weapon (+5) and +15 armor (+15) = +20 all stats');
  const boosted=stats();check(boosted.atk>base.atk&&boosted.mhp>base.mhp&&boosted.msp>base.msp,'refine bonus raises combat stats');
  check(capSt(S.st).luk-capSt(Object.assign({},S.st)).luk===0&&Math.abs((capSt(S.st).dex)-(()=>{const r=refSt();w.ref=0;a.ref=0;const v=capSt(S.st).dex;w.ref=10;a.ref=15;return v+r;})())<1e-9,'refine bonus counts once, not x3.4');
  openMenu('status');check($('#mBody').textContent.includes('(+20)'),'status shows (+20) refine bonus');
  G.fgSel=a.id;openMenu('forge');check($('#mBody').textContent.includes('+15 all stats'),'forge shows the milestone');
  // --- old save migrates
  delete S.ore.eori;delete S.ore.mori;S.autoCfg={atk:['x',2],buf:['parabellum',3,'y'],heal:'z',spRes:500};migrateSave(S);
  check(S.ore.eori===0&&S.ore.mori===0,'old save gets new ore at 0');
  check(JSON.stringify(S.autoCfg.atk)==='[2]'&&S.autoCfg.heal===null&&S.autoCfg.spRes===90,'auto setup sanitised on load');
  // --- Auto Setup drives casting
  const sk=C_().sk,ix=n=>sk.findIndex(s=>s.n===n),HL=ix('Holy Light'),HEAL=ix('Heal'),KY=ix('Kyrie Eleison');
  S.sk={};[HL,HEAL,KY].forEach(i=>S.sk['a'+i]=5);S.job=0;S.auto=1;S.autoCfg=null;initHero();
  openMenu('skills');check($('#mBody').textContent.includes('Auto Setup'),'auto setup card in Skills');
  menuAct('autoatk',String(HL));menuAct('autobuf',String(KY));menuAct('autoheal',String(HEAL));menuAct('autosp','0');
  check(S.autoCfg.atk[0]===HL&&S.autoCfg.buf[0]===KY&&S.autoCfg.heal===HEAL,'setup saved from the menu');
  check(loadLocal(SLOT).autoCfg.buf[0]===KY,'setup persisted');
  check(S.autoCfg.refresh===3,'recast defaults to 3s');menuAct('autorefresh','10');check(S.autoCfg.refresh===10&&loadLocal(SLOT).autoCfg.refresh===10,'recast window saved');
  menuAct('autorefresh','7');check(S.autoCfg.refresh===10,'invalid recast ignored');menuAct('autorefresh','3');
  closeMenu();
  const m=mkMob(mobDef('bunny',5),hero.x,hero.z-2.2,false);G.mobs.push(m);
  const go=()=>{hero.state='idle';hero.cd=hero.cd.map(()=>0);hero.castIdx=-1;autoAI(m);return hero.state==='cast'?hero.castIdx:'attack';};
  hero.buffs={};hero.sp=G.st.msp;hero.hp=G.st.mhp;check(go()===KY,'keeps Kyrie up first');
  hero.buffs={dr:{v:.3,t:20}};hero.sp=G.st.msp;check(go()===HL,'then attacks with Holy Light');
  hero.hp=G.st.mhp*.2;hero.sp=G.st.msp;check(go()===HEAL,'heals below 40% HP');
  hero.hp=G.st.mhp;hero.sp=0;check(go()==='attack','basic attack when out of SP');
  // --- Heal scales from Magic ATK and INT, not max HP
  {const st=stats(),v=.25,want=Math.round((Math.round(st.atk*st.smult)*v+((S.st.int||0)+buffSt().int+refSt())*HEAL_INT)*(1+innV('priest')));
   check(healAmt(v,st)===want,'heal formula = MATK x power + INT x 4');
   const hp0=st.mhp;S.st.vit+=40;const st2=stats();check(st2.mhp>hp0&&healAmt(v,st2)===healAmt(v,st),'more max HP does not change heal');S.st.vit-=40;
   S.st.int+=10;check(healAmt(v,stats())>healAmt(v,st),'more INT heals more');S.st.int-=10;
   hero.hp=1;hero.sp=1e6;doSkill(HEAL);check(hero.hp===Math.min(stats().mhp,1+healAmt(skDef(HEAL).v)),'casting Heal restores the formula amount');
   openMenu('status');check($('#mBody').textContent.includes('MATK'),'status shows MATK');}
  // screenshots
  if(location.search.includes('show=forge')){S.ore.ori=34;S.ore.eori=3;S.ore.eelu=22;G.fgSel=w.id;w.ref=11;openMenu('forge');const c=[...$('#mBody').querySelectorAll('.card')];($('#mBody .fgbon')||c[0]).scrollIntoView();}
  if(location.search.includes('show=combine')){openMenu('forge');[...$('#mBody').querySelectorAll('.card')].pop().scrollIntoView();}
  if(location.search.includes('show=auto')){S.job=1;S.parabellum=[KY];openMenu('skills');[...$('#mBody').querySelectorAll('.card')].find(c=>c.textContent.includes('Auto Setup')).scrollIntoView();}
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' Progress viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
