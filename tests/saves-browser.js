// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?saves
// Backups, checkpoints, restore, damaged slots, delete-then-restore, export/import, slot screen layout.
setTimeout(async()=>{
 if(!location.search.includes('saves'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 const answers=[],msgs=[];ask=async(m,b)=>{msgs.push(String(m));return answers.length?answers.shift():b.length-1;};askText=async()=>answers.length?answers.shift():'';
 try{
  requestAnimationFrame=()=>0;
  SLOT=0;freshSave('L','priest',null,1);S.lv=40;document.body.classList.add('noRot');initHero();loadChapter(0);startGame();G.intro=null;update=()=>{};
  // --- automatic backups (at most one per 10 minutes)
  save(true);check(backups(0).length===1&&backups(0)[0].kind==='auto','first save makes an automatic backup');
  save(true);check(backups(0).length===1,'no second automatic backup within 10 minutes');
  // --- checkpoint right before a risky refine
  const w=S.items.find(i=>i.slot==='w');w.ref=10;S.zeny=1e9;S.ore.eori=5;save(true);doRefine(w);
  const cp=backups(0).find(b=>b.kind==='checkpoint');check(cp&&/refining/.test(cp.why),'checkpoint taken before refining +10 and up');
  check(cp&&JSON.parse(cp.j).items.find(i=>i.id===w.id).ref===10,'checkpoint holds the item at +10');
  // simulate a broken item, then restore the checkpoint
  S.items=S.items.filter(i=>i.id!==w.id);S.eq.w=null;save(true);
  answers.push(0,0);const ok=await restoreFlow(0);
  check(ok&&loadSave(0).items.some(i=>i.id===w.id&&i.ref===10),'restoring the checkpoint brings the item back');
  check(backups(0)[0].why==='before restoring a backup','the replaced save is kept, so a restore can be undone');
  check(S.items.some(i=>i.id===w.id),'restore while playing loads the restored character');
  // other checkpoints
  checkpoint('before a skill reset');S.zeny=1e9;skReset();check(backups(0)[0].why==='before a skill reset','skill reset is checkpointed');
  // --- damaged slot: shown as damaged (not empty), restorable from a backup
  const good=JSON.stringify(Object.assign(JSON.parse(JSON.stringify(S)),{lv:33}));
  try{localStorage.setItem(skey(2),'{"cls":"pri');}catch(e){}backupSlot(2,'checkpoint','test',good);
  check(slotState(2)==='damaged','a broken save is detected as damaged');
  showScreen('slotScr');renderSlots();const row2=$('#slotList').children[2];
  check(row2.textContent.includes('Damaged save')&&row2.querySelector('[data-a="restore"]'),'slot screen shows Damaged save with Restore');
  answers.push(0,0);row2.querySelector('[data-a="restore"]').click();await new Promise(r=>setTimeout(r,50));
  check(slotState(2)==='ok'&&loadSave(2).lv===33,'damaged slot restored');
  // --- deleting keeps backups; the empty slot can bring it back
  answers.push(0);renderSlots();$('#slotList').children[2].querySelector('[data-a="del"]').click();await new Promise(r=>setTimeout(r,50));
  check(slotState(2)==='empty'&&backups(2).length>0&&$('#slotList').children[2].textContent.includes('backup'),'deleted slot keeps its backups');
  answers.push(1,0,0);$('#slotList').children[2].querySelector('[data-a="more"]').click();await new Promise(r=>setTimeout(r,50));
  check(slotState(2)==='ok','deleted slot restored from the ⋯ menu');
  // --- export / import
  const code=bxExport(JSON.stringify(loadSave(0)));check(code.startsWith('SO1.'),'export uses the checksummed format');
  answers.push(0,code,0);check(await importFlow(1)&&loadSave(1).lv===loadSave(0).lv,'import a code into another slot');
  answers.push(0,code.slice(0,-3)+'zzz');check(!(await importFlow(1))&&/damaged|not/.test(msgs[msgs.length-1]),'damaged code rejected with a reason');
  const legacy=btoa(unescape(encodeURIComponent(JSON.stringify(loadSave(0)))));check(!!importCode(legacy)&&loadSave(0).v===5,'old-style codes for current (v5) saves now load');
  check(readSaveText(JSON.stringify({hello:1})).ok===false,'random text is not accepted');
  // --- storage full: oldest backups are dropped instead of failing
  const real=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).endsWith('_bk')&&String(v).length>2500)throw new Error('QuotaExceeded');return real.call(this,k,v);};
  const big='x'.repeat(1000),n=writeBackups(1,[1,2,3,4].map(t=>({t,kind:'auto',j:big})));Storage.prototype.setItem=real;
  check(n===2,'storage full keeps the newest backups that fit (kept '+n+')');
  // --- Settings card
  showScreen(null);openMenu('sys');const sys=$('#mBody');
  check(sys.textContent.includes('Save & backups')&&$('#saveCode').value.startsWith('SO1.'),'settings show backups and the new save code');
  check(sys.scrollWidth<=sys.clientWidth+1,'settings fit the screen');closeMenu();
  // --- slot screen layout at this size
  try{localStorage.setItem(skey(2),'{"cls":"pri');}catch(e){}G.mode='title';showGameUI(false);showScreen('slotScr');renderSlots();
  const list=$('#slotList'),lr=list.getBoundingClientRect();
  check(lr.right<=innerWidth+1&&lr.left>=-1&&list.scrollWidth<=list.clientWidth+1,'slot list fits the screen');
  for(const b of list.querySelectorAll('button')){const r=b.getBoundingClientRect();if(r.width)check(r.height>=40&&r.right<=innerWidth+1,'slot button too small or off screen: '+b.textContent);}
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' Saves viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
