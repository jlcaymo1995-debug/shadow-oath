setTimeout(async()=>{
 if(!location.search.includes('opening'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  requestAnimationFrame=()=>0;document.body.classList.add('noRot');
  newGame('C','wizard',{name:'Aria',pname:'Leon'},1,'vongola');
  check(prologueActive()&&G.fieldPartner,'partner spawned');
  check(!G.mobs.length,'peaceful opening');spawnMob(true);check(!G.mobs.length,'no timed spawns');
  check(questText()[1].includes('Leon'),'custom partner name');
  check(G.fieldLife.bloom.visible&&!G.fieldLife.blight.visible,'peaceful opening visuals');
  hero.x=4;hero.z=5;G.int=findInteract();check(G.int?.k==='partner','partner interaction');doInteract();
  let guard=0;while(dlgOpen&&guard++<30)nextDlg();
  check(S.fields.prologue==='walk','walk stage persisted');
  for(let i=0;i<150;i++){hero.x=G.fieldPartner.x;hero.z=G.fieldPartner.z;tickFieldPartner(.05);}
  check(G.fieldPartner.arrived,'partner reaches oath tree');
  const saved=JSON.parse(JSON.stringify(S));S=saved;loadChapter(0);check(G.fieldPartner.arrived,'walking reload resumes at tree');
  hero.x=G.fieldPartner.x;hero.z=G.fieldPartner.z;G.int=findInteract();doInteract();
  guard=0;while(dlgOpen&&guard++<40)nextDlg();
  check(S.fields.prologue==='done'&&!prologueActive(),'abduction ends introduction');
  check(!G.fieldPartner&&G.mobs.length>0,'normal chapter begins');
  check(G.fieldLife.blight.visible&&!G.fieldLife.bloom.visible,'blight after abduction');
  bossDefeated(0);check(!G.fieldLife.blight.visible&&G.fieldLife.bloom.visible&&G.fieldLife.people.visible,'victory restoration');
  await new Promise(r=>setTimeout(r,4400));guard=0;while(dlgOpen&&guard++<30)nextDlg();check(S.ch===0,'victory stays in restored fields');
  save();S=loadLocal(SLOT);loadChapter(0);check(G.fieldLife.bloom.visible,'restoration survives reload');
  hero.x=0;hero.z=-28;G.int=findInteract();check(G.int?.k==='fieldroad','onward road offered');doInteract();$('#mdB button[data-i="2"]').click();check(S.ch===0,'stay option preserves chapter');
  delete S.fields;loadChapter(0);check(!prologueActive()&&G.fieldLife.bloom.visible,'legacy completion restored');
  newGame('L','knight',null,1,'vongola');finishFieldPrologue(true);check(S.fields.prologue==='done'&&!dlgOpen,'skip introduction');
  newGame('C','wizard',{name:'Aria',pname:'Leon'},1,'vongola');
  if(location.search.includes('restored')){finishFieldPrologue(true);S.cleared[0]=1;applyFieldRestoration();}
  update=()=>{};hud();snapCam();updateOverlay();PF.render(0);
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' Opening viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
