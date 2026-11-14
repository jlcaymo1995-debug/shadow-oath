// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?buffs
// HUD buff icons + timers, party-frame buff icons, live Status. Checks layout at any size.
setTimeout(()=>{
 if(!location.search.includes('buffs'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 const R=s=>{const e=$(s);return e&&e.offsetParent!==null?e.getBoundingClientRect():null;};
 const hit=(a,b)=>a&&b&&a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
 try{
  requestAnimationFrame=()=>0;
  freshSave('L','priest',null,1);S.lv=99;document.body.classList.add('noRot');initHero();loadChapter(0);startGame();G.intro=null;update=()=>{};
  const sk=C_().sk,ix=n=>sk.findIndex(s=>s.n===n),B=ix('Blessing'),A=ix('Increase Agility'),Gl=ix('Gloria'),K=ix('Kyrie Eleison');
  [B,A,Gl,K].forEach(i=>S.sk['a'+i]=5);hero.sp=1e6;
  // --- HUD icons
  hud();check(!$('#bfR').children.length,'no icons without buffs');
  doSkill(B);doSkill(A);doSkill(K);hud();
  const icons=[...$('#bfR').querySelectorAll('.bf')];
  check(icons.length===3,'one icon per active buff (got '+icons.length+')');
  check(icons.every(i=>/^\d+$/.test(i.querySelector('b').textContent)),'each icon shows seconds left');
  hero.buffs.dr.t=3.2;hud();const ky=[...$('#bfR').querySelectorAll('.bf')][0];
  check(ky.classList.contains('low')&&ky.querySelector('b').textContent==='4','shortest buff first, blinks under 5s');
  check(+ky.style.getPropertyValue('--f').replace('%','')<50,'timer ring shrinks with time left');
  const t0=hero.buffs.bless.t;hero.buffs.bless.t=t0-1.2;const before=$('#bfR').innerHTML;hud();check($('#bfR').innerHTML!==before,'countdown updates');
  delete hero.buffs.dr;hud();check($('#bfR').querySelectorAll('.bf').length===2,'expired buff icon disappears');
  // party buff icon has a blue rim
  const savedPt=FB.pt,savedUid=FB.uid,savedPres=FB.pres;FB.pt='me';
  applyEv({y:'pbf',k:'gloria',lv:5,pt:'me',x:hero.x,z:hero.z,n:'Pri',u:'u2'});hud();
  check(!!$('#bfR .bf.party'),'buff from a party member is marked');
  // --- what other players receive
  const code=buffCode();check(code.split('.').length===3&&/gloria/.test(code)&&!/[^a-z.!]/.test(code),'buff code is compact: '+code);
  NET.peers.u3={uid:'u3',info:{n:'X'},x:1,z:1,lastT:Date.now(),hp:100};
  peerUpd('u3',{p:[10,10,0,0,0,90,0,0,'atk.dr!',5]});check(NET.peers.u3.bf==='atk.dr!','peer buffs read from new packets');
  peerUpd('u3',{p:[10,10,0,0,0,90,0,0,7]});check(NET.peers.u3.bf==='','old 9-field packets still work');
  delete NET.peers.u3;
  // --- party frame icons
  FB.uid='me';FB.pres={me:{n:'Me',pt:'me',c:'priest',l:99},u2:{n:'Knightly',pt:'me',c:'knight',l:98,ch:0}};
  NET.peers.u2={uid:'u2',info:{n:'Knightly'},x:2,z:2,lastT:Date.now(),hp:80,dead:0,bf:'bless.incagi!'};
  partyHud();const pf=$('#ptF .ptbf');check(pf&&pf.querySelectorAll('i').length===2&&pf.querySelectorAll('i.low').length===1,'party frame shows member buffs');
  // --- layout at this size: nothing overlaps
  const hl=R('#hl'),bf=R('#bfR');
  check(bf&&bf.left>=hl.left-1&&bf.right<=hl.right+1&&bf.bottom<=hl.bottom+1,'buff row stays inside the HP box');
  check(hl.right<=innerWidth&&hl.bottom<=innerHeight,'HP box on screen');
  for(const s of ['#mm','#hr','#ptF'])check(!hit(hl,R(s)),'HP box overlaps '+s);
  check(!hit(R('#ptF'),R('#mm')),'party frames overlap the minimap');
  for(const i of $('#bfR').querySelectorAll('.bf')){const r=i.getBoundingClientRect();check(r.width>=24&&r.height>=24,'buff icon too small');}
  // --- AI companions in your fight get Priest party buffs
  {const near=allyMake(ALLY_DEF[0],hero.x+2,hero.z),far=allyMake(ALLY_DEF[1],hero.x+PARTY_BUFF_R+8,hero.z);G.allies=[near,far];
   doSkill(B);check(near.buffs&&near.buffs.bless&&!(far.buffs&&far.buffs.bless),'companion in range gets Blessing, far one does not');
   doSkill(Gl);doSkill(A);check(near.buffs.gloria&&near.buffs.incagi,'Gloria and Increase Agility reach companions');
   doSkill(K);check(!near.buffs.dr,'self-only buffs do not');
   applyEv({y:'pbf',k:'bless',lv:3,pt:'me',x:far.x,z:far.z,n:'Pri',u:'u2'});check(far.buffs&&far.buffs.bless,'a party member can buff companions near them');
   far.buffs={};applyEv({y:'pbf',k:'bless',lv:3,pt:'other',x:far.x,z:far.z,n:'Pri',u:'u9'});check(!far.buffs.bless,'another party cannot');
   // effects: damage, crit, attack and run speed
   const dummy=mkMob(mobDef('blob',5),hero.x+3,hero.z,false);dummy.hp=dummy.mhp=1e9;G.mobs.push(dummy);
   const rr=Math.random,hitFor=(a,r)=>{Math.random=()=>r;const h=dummy.hp;allyHit(a,dummy);Math.random=rr;return h-dummy.hp;};
   const plain=allyMake(ALLY_DEF[2],hero.x,hero.z);const d0=hitFor(plain,.5),d1=hitFor(near,.5),dc=hitFor(near,0);
   check(Math.abs(d1/d0-(1+(near.buffs.bless.str+near.buffs.bless.int)*.005))<.02,'Blessing raises companion damage ('+d0+' -> '+d1+')');
   check(Math.abs(dc/d1-1.6*.9)<.03,'Gloria lets companions crit (x1.6 at the 0.9 roll floor)');check(hitFor(plain,0)===hitFor(plain,0),'no crits without Gloria');
   check(allyBf(near,'aspd')>.1&&allyBf(near,'mspd')>.1,'Increase Agility speeds up attacks and running');
   alliesOverlay();check(near.lbl.innerHTML.includes('🙏')&&near.lbl.innerHTML.includes('🎺'),'companion label shows buff icons');
   near.buffs.bless.t=.05;allyTick(.1);check(!near.buffs.bless&&near.buffs.gloria,'companion buffs expire on their own timers');
   allyRemove(plain);alliesClear();dummy.dead=true;removeMob(dummy);G.mobs=G.mobs.filter(m=>m!==dummy);}
  // --- live Status: a party buff landing while the menu is open refreshes it
  doSkill(B);delete hero.buffs.gloria;openMenu('status');const had=$('#mBody').textContent.includes('(+40)');
  applyEv({y:'pbf',k:'gloria',lv:5,pt:'me',x:hero.x,z:hero.z,n:'Pri',u:'u2'});statusLive();
  check(!had&&$('#mBody').textContent.includes('(+40)'),'status refreshes when a buff arrives');
  const html=$('#mBody').innerHTML;statusLive();check($('#mBody').innerHTML===html,'no re-render when nothing changed');
  delete hero.buffs.gloria;statusLive();check(!$('#mBody').textContent.includes('(+40)'),'status refreshes when a buff ends');
  closeMenu();
  if(!location.search.includes('menu')){applyEv({y:'pbf',k:'gloria',lv:5,pt:'me',x:hero.x,z:hero.z,n:'Pri',u:'u2'});doSkill(K);hero.buffs.dr.t=3;hud();partyHud();snapCam();PF.render(0);}
  else openMenu('status');
  FB.pt=savedPt;FB.uid=savedUid;FB.pres=savedPres;delete NET.peers.u2;
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' Buffs viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
