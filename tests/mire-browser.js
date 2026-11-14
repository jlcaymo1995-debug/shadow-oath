// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?mire
// (&shot=pell | &shot=boss | &shot=lanterns for screenshots)
setTimeout(async()=>{
 if(!location.search.includes('mire'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  requestAnimationFrame=()=>0;
  freshSave('L','knight',null,1);S.lv=30;S.unlocked=2;document.body.classList.add('noRot');initHero();
  S.q[2].s=1;loadChapter(2);startGame();G.intro=null;update=()=>{};G.mobs.forEach(m=>m.agg=false);
  // --- lantern islands and route
  check(G.mire&&G.mire.isles.length===3&&G.mire.stones.length===21,'three lantern islands and stepping stones');
  check(G.mire.lit===0&&G.mire.isles.every(o=>o.halo.material.opacity===0),'all lanterns dark at the start');
  const fog0=scene.fog.far;S.q[2].shr[0]=1;updateMire(.016);
  check(G.mire.lit===1&&G.mire.isles[0].halo.material.opacity>0&&G.shrObj[0].flm.visible,'lighting one lantern lights its island');
  check(G.mire.stones.filter(s=>s.i===0).every(s=>s.w.material.opacity>.5)&&G.mire.stones.filter(s=>s.i===1).every(s=>s.w.material.opacity<.5),'only that route turns warm');
  check(scene.fog.far>fog0,'fog pulls back with each lantern');
  // reload keeps lit lanterns lit (old bug: flames hidden after reload)
  loadChapter(2);G.intro=null;updateMire(.016);check(G.mire.lit===1&&G.shrObj[0].flm.visible,'lit lantern stays lit after reload');
  S.q[2].shr=[1,1,1];S.q[2].s=2;updateMire(.016);check(G.mire.lit===3&&scene.fog.far>=fog0+60,'all three: mire restored');
  check(CHS[2].qd.some(l=>l[1].includes('lanes'))&&CHS[2].qd.some(l=>l[1].includes('eggs')),'Pell explains webs and eggs');
  // --- Pell
  const P=G.npc&&G.npc.m.root.userData.pell;check(!!P,'Pell has his pole lantern');
  if(P){const r0=P.hang.rotation.z;G.t+=.7;updateMire(.016);check(P.hang.rotation.z!==r0,'lantern sways');}
  // --- Broodmother
  const b=mkMob(bossDef('spiderq',12),0,AR.z-6,true);G.mobs.push(b);G.bossFight=true;
  check(!!b.mdl.lantern&&typeof b.mdl.anim==='function','Broodmother has a lantern abdomen');
  check(!mkMob(mobDef('spider',8),40,40,false).mdl.lantern,'ordinary spiders keep their normal body');
  // web lanes: arm after a moment, slow you, rolling is free, expire
  hero.x=0;hero.z=AR.z+2;hero.state='idle';
  webLaneLocal({ax:-10,az:AR.z+2,bx:10,bz:AR.z+2,w:WEB_W,dur:WEB_DUR});updateMire(.016);
  check(!G.webbed,'lane is harmless while it is being spun');
  G.t+=WEB_ARM+.05;updateMire(.016);check(G.webbed,'standing in an armed lane slows you');
  hero.state='roll';check(!inWebs(),'rolling through webs is free');hero.state='idle';
  hero.z=AR.z+5;updateMire(.016);check(!G.webbed,'stepping out of the lane frees you');
  G.t+=WEB_DUR+1;updateMire(.016);check(!G.webLanes.length,'web lanes expire');
  b.d=Object.assign({},b.d,{sp:['webs']});bossSpecial(b,hero);check(G.webLanes.length===2,'webs attack lays two lanes (phase 1)');
  // eggs: capped, hatch into spiderlings, or are destroyed first
  G.mobs.filter(m=>m.d.egg).forEach(m=>m.dead=true);
  const made=spawnEggs(b,10);check(made===EGG_MAX,'egg clusters are capped at '+EGG_MAX);
  const eggs=G.mobs.filter(m=>!m.dead&&m.d.egg);check(eggs.every(e=>e.hp>0&&e.mdl.anim),'egg clusters have health and animate');
  const spidersBefore=G.mobs.filter(m=>!m.dead&&m.d.key==='spider').length;
  killMob(eggs[0]);eggs[1].hatchT=.01;eggTick(eggs[1],.05);
  const spidersAfter=G.mobs.filter(m=>!m.dead&&m.d.key==='spider').length;
  check(eggs[1].dead&&eggs[1].hatched&&spidersAfter===spidersBefore+2,'an egg left alone hatches two spiderlings');
  check(eggs[0].dead&&!eggs[0].hatched,'a destroyed egg never hatches');
  const ex=eggs[2].x;updateMobs(.5,G.st);check(eggs[2].x===ex&&eggs[2].hatchT<EGG_HATCH,'eggs stay put and count down');
  // phase 2 brings a fresh clutch
  G.mobs.filter(m=>m.d.egg).forEach(m=>m.dead=true);b.phase=1;b.hp=b.mhp*.4;b.state='chase';updateMobs(.016,G.st);
  check(b.phase===2&&G.mobs.filter(m=>!m.dead&&m.d.egg).length===3,'phase 2 lays three new eggs');
  // --- screenshots
  const sh=(location.search.match(/shot=(\w+)/)||[])[1];
  G.texts.forEach(t=>t.el.remove());G.texts=[];G.fx.forEach(f=>world.remove(f.m));G.fx=[];
  if(sh){G.webLanes.forEach(l=>world.remove(l.g));G.webLanes=[];
   const keep=sh==='boss'?[b]:[];G.mobs.forEach(m=>{if(!keep.includes(m)){m.dead=true;removeMob(m);}});G.mobs=G.mobs.filter(m=>keep.includes(m));
   if(sh==='pell'){hero.x=G.npc.x-.4;hero.z=G.npc.z+4.2;}
   else if(sh==='lanterns'){const l=G.shr[0];hero.x=l.x;hero.z=l.z+7;}
   else{b.x=0;b.z=AR.z-2;b.face=Math.PI*.8;b.state='cast';animMob(b,.016);spawnEggs(b,2);G.mobs.filter(m=>m.d.egg).forEach((m,i)=>{m.x=-5+i*10;m.z=AR.z+2.5;animMob(m,.016);});
    webLaneLocal({ax:-12,az:AR.z+5,bx:12,bz:AR.z+5,w:WEB_W,dur:WEB_DUR});G.t+=1;updateMire(.016);hero.x=-3;hero.z=AR.z+10;}
   hero.face=Math.PI;G.texts.forEach(t=>t.el.remove());G.texts=[];snapCam();hud();PF.render(0);}
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' Mire viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
