setTimeout(async()=>{
 if(!location.search.includes('fields'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  freshSave('L','knight',null,0);S.fac='vongola';document.body.classList.add('noRot');initHero();loadChapter(0);startGame();
  requestAnimationFrame=()=>0;G.intro=null;S.q[0].s=1;fieldEncounter();
  check(G.mobs.filter(m=>m.lesson===0).length===2,'first encounter');
  check(questText()[0]==='Read the leap','opening objective');
  for(const key of ['bunny','bunny','beetle','bunny','beetle']){
   const m=G.mobs.find(m=>!m.dead&&m.lesson===S.fields.stage&&m.d.key===key);
   check(!!m,'missing lesson '+key);if(m)killMob(m);
  }
  check(S.fields.stage===3&&S.q[0].s===2,'lessons complete');
  check(loadLocal(SLOT).fields.stage===3,'saved lesson progress');
  // Legacy save keeps the original quest; discovery does not opt it into lessons.
  delete S.fields;S.q[0]={s:1,p:4,shr:[0,0,0]};
  check(questText()[1].includes('4/10'),'legacy quest preserved');
  S.fields={keepsake:true};check(!guidedFields(),'legacy discovery preserves quest');
  const b=mkMob(bossDef('boar',8),-12,AR.z,true);G.mobs.push(b);G.bossFight=true;
  bossSpecial(b,{x:0,z:AR.z});
  check(b.state==='cast','charge winds up');
  // Prevent unrelated combat while the actual charge callback resolves.
  update=()=>{};hero.x=0;hero.z=4;
  await new Promise(r=>setTimeout(r,1000));
  check(b.stag>0&&b.ripT>0,'stone collision opens riposte window');
  check(b.x < -8,'charge stops before stone');
  S.fields={version:1,stage:0,counts:{},keepsake:false};S.q[0].s=1;loadChapter(0);hero.x=5;hero.z=8;
  snapCam();hud();requestAnimationFrame=()=>0;PF.render(0);
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' Verdant viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
