// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?status
// Opens the Status and Forge tabs for every class. The game loop is stubbed first:
// a live loop exhausts the headless virtual-time budget (see MISTAKES.md).
setTimeout(()=>{
 if(!location.search.includes('status'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  requestAnimationFrame=()=>0;
  for(const cls of Object.keys(CLASSES)){
   try{freshSave('L',cls,null,1);S.lv=50;document.body.classList.add('noRot');initHero();loadChapter(0);startGame();G.intro=null;update=()=>{};
    openMenu('status');const b=$('#mBody');
    check($('#menu').classList.contains('show'),cls+': menu not shown');
    check(b.textContent.includes('Stat Points')&&b.textContent.includes('Combat'),cls+': status content missing');
    const r=b.getBoundingClientRect();check(r.width>0&&r.height>0,cls+': status body has no size');
    check(b.scrollWidth<=b.clientWidth+1,cls+': status horizontal overflow');
    openMenu('forge');check($('#mBody').textContent.includes('Forge'),cls+': forge content missing');
    check(!!panelCv&&panelCv.clientWidth>0&&panelCv.clientHeight>0&&!!fgM,cls+': forge preview not mounted');
    closeMenu();
    // Late-game character like a real player's: 4th job, high level, every skill learned, buffs active
    S.job=3;S.lv=500;C_().sk.forEach((x,i)=>S.sk['a'+i]=Math.min(10,x.mx||10));C_().ps.forEach((x,i)=>S.sk['p'+i]=10);skSync();initHero();hero.sp=1e6;
    C_().sk.forEach((x,i)=>{if(x.t==='buff')doSkill(i);});
    // real players put Parabellum on the bar (stored as a string); plus a stale index
    S.parabellum=C_().sk.map((x,i)=>i).filter(i=>C_().sk[i].t==='buff').slice(0,2);S.bar=[PARABELLUM,0,999,null,null,null];
    try{openMenu('status');}catch(e){errors.push(cls+' late-game status threw: '+e.message+' @ '+(e.stack||'').split('\n')[1]);}
    check($('#mBody').textContent.includes('Combat'),cls+': late-game status empty');
    closeMenu();
   }catch(e){errors.push(cls+': '+e.message+' @ '+(e.stack||'').split('\n')[1]);}
  }
  // A tab that throws shows an error card instead of a blank panel
  const realDelta=statDelta;statDelta=()=>{throw new Error('qa-boom');};
  openMenu('status');const eb=$('#mBody').textContent;statDelta=realDelta;
  check(eb.includes('could not be drawn')&&eb.includes('qa-boom'),'error boundary shows the failure');closeMenu();
  openMenu('status');check($('#mBody').textContent.includes('Combat'),'status recovers after the error');
  // Close never covers a tab: it sits beside the tab scroller, and the selected tab is in view
  closeMenu();openMenu('forge');{const tb=$('#mSide .mtabs').getBoundingClientRect(),cl=$('#mSide .cls').getBoundingClientRect(),on=$('#mSide .on').getBoundingClientRect();
   const row=tb.height<tb.width;
   check(row?cl.left>=tb.right-1:cl.top>=tb.bottom-1,'close button outside the tab area');
   check(row?(on.left>=tb.left-1&&on.right<=tb.right+1):(on.top>=tb.top-1&&on.bottom<=tb.bottom+1),'selected tab scrolled into view');}
  closeMenu();openMenu('status');
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' Status viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
