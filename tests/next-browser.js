// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?next (&shot=1 for a screenshot)
setTimeout(()=>{
 if(!location.search.includes('next'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 const card=()=>{openMenu('status');const c=$('#mBody .nxcard');return c?c.textContent:'';};
 try{
  requestAnimationFrame=()=>0;
  freshSave('L','knight',null,1);document.body.classList.add('noRot');initHero();loadChapter(0);startGame();G.intro=null;update=()=>{};
  const J=JOBS.knight;
  // --- job path, every stage
  let t=card();check(t.includes(`Next job: ${J[1]} at Lv 99`)&&t.includes('Job Master Orin')&&t.includes('1,000 monsters'),'level 1 shows the next job and its requirements');
  check(t.includes('99 → 110')&&t.includes('Parabellum'),'shows what the next job unlocks');
  check(!!$('#mBody .nxcard .fgmeter'),'progress bar toward the job level');
  S.lv=99;S.st=Object.assign({},CLASSES.knight.base);t=card();check(t.includes(`Ready for ${J[1]}`),'at the job level: ready, talk to Orin');
  S.jq={to:1,s:1,p:250,sh:0};t=card();check(t.includes('Monsters 250 / 1,000'),'job quest progress shown');
  S.jq.s=3;t=card();check(t.includes('return to Job Master Orin for the Trial'),'trial step shown');
  S.jq=null;S.job=3;S.lv=520;t=card();check(t.includes('every job path is complete'),'4th job: complete');
  S.job=1;S.lv=150;t=card();check(t.includes(`Next job: ${J[2]} at Lv 300`)&&t.includes('110 → 135')&&!t.includes('Parabellum'),'mid-game job step');
  // --- refine milestone nearest to the next bonus
  const w=itemById(S.eq.w),a=itemById(S.eq.a);w.ref=11;a.ref=3;t=card();check(t.includes('→ +12')&&t.includes('+5 → +10'),'nearest refine bonus shown (weapon +11 → +12)');
  for(const it of Object.values(eqItems()))if(it)it.ref=15;t=card();check(t.includes('All equipped gear has its +15'),'all gear at +15');
  for(const it of Object.values(eqItems()))if(it)it.ref=0;
  // --- chapter readiness
  S.unlocked=5;S.lv=1;t=card();check(t.includes('Ch.6')&&t.includes('⚠️'),'far under the recommended level');
  S.lv=chLevel(5)-3;t=card();check(t.includes('◐ 3 levels under'),'a few levels under');
  S.lv=chLevel(5);t=card();check(t.includes('✓ Ready'),'ready for the chapter');
  // --- points to spend, and the Skills shortcut
  S.skp=2;t=card();check(t.includes('stat points to spend')&&t.includes('2 skill points'),'unspent points shown');
  const sb=$('#mBody .nxcard [data-a="tab"]');check(sb&&sb.getBoundingClientRect().height>=44,'Open Skills button is tappable');sb.click();check(G.tab==='skills','Open Skills goes to the Skills tab');
  // --- world map badge
  G.mapW=0;G.mapSel=3;openMenu('map');check(!!$('#mBody .rdy'),'world map shows readiness next to the recommended level');
  // --- layout at this size, at normal and largest text
  for(const ts of ['1','1.3']){menuAct('a11ytext',ts);openMenu('status');const b=$('#mBody'),c=$('#mBody .nxcard').getBoundingClientRect(),br=b.getBoundingClientRect();
   check(b.scrollWidth<=b.clientWidth+2&&c.right<=br.right+1,'What\'s next fits at '+ts+'x text');}
  menuAct('a11ytext','1');
  if(location.search.includes('shot')){S.lv=150;S.job=1;S.unlocked=6;S.skp=3;w.ref=11;openMenu('status');$('#mBody').scrollTop=0;}
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' Next viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
