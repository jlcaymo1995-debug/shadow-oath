// Appended only to a temporary copy of game.js by browser-smoke.sh.
setTimeout(()=>{
 if(location.search.includes('fields')||location.search.includes('opening')||location.search.includes('creation')||location.search.includes('account')||location.search.includes('priest')||location.search.includes('woods')||location.search.includes('status')||location.search.includes('progress')||location.search.includes('mire')||location.search.includes('buffs')||location.search.includes('saves')||location.search.includes('a11y')||location.search.includes('next'))return;
 const errors=[];const check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  freshSave('L','wizard',null,1);S.fac='vongola';S.job=3;S.lv=500;document.body.classList.add('noRot');S.parabellum=[];
  C_().sk.forEach((s,i)=>{if(s.t==='buff'&&s.job<=3&&!S.parabellum.some(n=>C_().sk[n].k===s.k)){S.sk['a'+i]=10;S.parabellum.push(i);}});
  S.bar=[PARABELLUM,0,1,2,3,4];initHero();loadChapter(0);startGame();
  G.intro=null;G.mobs.forEach(m=>m.agg=false);hero.sp=G.st.msp;
  const p=parabellumPlan(),before=hero.sp;useSkill(0);
  check(hero.sp===before-p.cost,'SP deduction');
  check(p.buffs.every(s=>hero.buffs[s.k]?.v===s.v),'buff application');
  hero.state='idle';const charged=hero.sp;useSkill(0);check(hero.sp===charged,'cooldown rejection');
  hero.sp=G.st.msp;hud();
  const dimmed=()=>Array.from({length:6},(_,i)=>$('#bS'+(i+1)).classList.contains('off')).join(',');
  const stable=dimmed();for(let i=0;i<20;i++){hud();check(dimmed()===stable,'unstable skill opacity');}
  $('#qcB').style.display='block';
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  $('#bChat').style.display='';$('#bNet').style.display='';
  const chat=$('#qcB').getBoundingClientRect();
  check(chat.width>=44&&chat.height>=44,'chat touch size');
  for(let n=1;n<=6;n++)check(!overlap(chat,$('#bS'+n).getBoundingClientRect()),'chat overlaps skill '+n);
  check(chat.left>=0&&chat.right<=innerWidth,'chat within viewport');
  qcShow();
  check($('#qc').getBoundingClientRect().top>=$('#hr .tb').getBoundingClientRect().bottom,'chat must be below toolbar');
  const qr=$('#qc').getBoundingClientRect();check(qr.left>=0&&qr.right<=innerWidth,'chat within viewport');
  $('#qcX').click();check(!qcOpen,'close chat');
  openMenu('skills');check($('#mBody').textContent.includes('Parabellum'),'configuration rendered');
  check($('#mBody').querySelectorAll('[data-a="pbbar"]').length===6,'six assignment slots');
  menuAct('pbbar','5');check(S.bar[5]===PARABELLUM&&!S.bar.slice(0,5).includes(PARABELLUM),'slot reassignment');
  check(loadLocal(SLOT).bar[5]===PARABELLUM,'configuration saved');
  const body=$('#mBody');check(body.scrollWidth<=body.clientWidth+1,'menu horizontal overflow');
  for(const el of body.querySelectorAll('.pbsetup button,.skslot')){const r=el.getBoundingClientRect(),b=body.getBoundingClientRect();check(r.left>=b.left&&r.right<=b.right,'skill control outside panel');}
  if(!location.search.includes('skills'))closeMenu();
  if(location.search.includes('chat'))qcShow();
  // Freeze the scenario so screenshots do not depend on combat timing.
  G.mode='game';update=()=>{};requestAnimationFrame=()=>0;updateCam(1);PF.render(0);$('#qcB').style.display=menuOpen?'none':'block';
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
