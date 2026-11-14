// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?woods (add &mira for Mira's close-up)
setTimeout(async()=>{
 if(!location.search.includes('woods'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  freshSave('L','knight',null,0);S.fac='vongola';S.lv=20;S.unlocked=1;document.body.classList.add('noRot');initHero();loadChapter(1);startGame();
  requestAnimationFrame=()=>0;G.intro=null;G.mobs.forEach(m=>{m.agg=false;});
  check(G.snares.length===3,'three silk snares in the clearing');
  check(G.npc&&G.npc.m.root.userData.mira===1,'Mira has her cape, spool and bow');
  check(CHS[1].qd.some(l=>l[1].includes('snares'))&&CHS[1].qd.some(l=>l[1].includes('roots')),'Mira explains snares and roots');
  const b=mkMob(bossDef('treant',12),12,AR.z-10,true);G.mobs.push(b);G.bossFight=true;
  check(typeof b.mdl.anim==='function'&&b.mdl.arms.length===2,'Treant has root arm + animation hook');
  // Lure onto a snare: bound, snare spent, stance breaks 60% faster
  b.x=WOODS_SNARES[0][0];b.z=WOODS_SNARES[0][1];updateWoods(.016);
  check(b.stun>0&&b.snareT>0&&!G.snares[0].armed,'snare binds the Treant');
  b.poise=0;applyPoise(b,50,false,'heavy',true);check(Math.abs(b.poise-80)<1e-6,'stance breaks faster while bound');
  animMob(b,.016);
  // a bound Treant cannot spring a second snare
  b.x=WOODS_SNARES[1][0];b.z=WOODS_SNARES[1][1];updateWoods(.016);check(G.snares[1].armed,'no double trigger while bound');
  // snare re-weaves
  b.stun=0;b.snareT=0;b.x=20;G.snares[0].reT=.001;updateWoods(.016);check(G.snares[0].armed,'snare re-arms');
  b.poise=0;applyPoise(b,50,false,'heavy',true);check(Math.abs(b.poise-50)<1e-6,'normal poise when not bound');
  // Root zones slow you; rolling ignores them; they expire
  hero.x=0;hero.z=0;hero.state='idle';rootZoneLocal({x:0,z:0,r:2.2,dur:ROOT_DUR});updateWoods(.016);
  check(G.rooted&&inRoots(),'standing in roots slows you');
  hero.state='roll';check(!inRoots(),'rolling through roots is free');hero.state='idle';
  const t0=G.t;G.t+=ROOT_DUR+.5;updateWoods(.016);check(!G.rootZones.length&&!G.rooted,'root zones expire');G.t=t0;
  // the real Treant roots attack leaves lingering zones
  b.d=Object.assign({},b.d,{sp:['roots']});b.x=0;b.z=AR.z;hero.x=0;hero.z=AR.z+6;update=()=>{};bossSpecial(b,hero);
  await new Promise(r=>setTimeout(r,2400));
  check(G.rootZones.length===3,'roots attack leaves three tangles (got '+G.rootZones.length+')');
  // Picture: bound Treant beside a snare, a root tangle near the hero
  if(location.search.includes('mira')){hero.x=3.6;hero.z=5.2;hero.face=Math.PI;}
  else{b.x=0;b.z=AR.z-3;b.face=0;if(!location.search.includes('plain')){b.stun=3;b.snareT=5;}else{b.stun=0;b.snareT=0;}animMob(b,.016);hero.x=0;hero.z=AR.z+7;hero.face=Math.PI;}
  G.texts.forEach(t=>t.el.remove());G.texts=[];G.fx.forEach(f=>world.remove(f.m));G.fx=[];G.rootZones.forEach(z=>z.g.scale.y=1);
  snapCam();hud();
  // showcase framing (screenshots only): look at the subject from the front
  const subj=location.search.includes('mira')?{x:G.npc.x,z:G.npc.z,h:1.2,r:5}:{x:b.x,z:b.z,h:2.6,r:12};
  cam.position.set(subj.x+subj.r*.35,gY(subj.x,subj.z)+subj.h+subj.r*.35,subj.z+subj.r);cam.lookAt(subj.x,gY(subj.x,subj.z)+subj.h,subj.z);
  PF.render(0);
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' Woods viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
