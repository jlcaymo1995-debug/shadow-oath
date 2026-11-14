// Appended only to a temporary copy of game.js by browser-smoke.sh. Run with ?a11y (&shot=menu|marks)
setTimeout(()=>{
 if(!location.search.includes('a11y'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 const inView=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
 const near=(c,want)=>[16,8,0].every(sh=>Math.abs(((c>>sh)&255)-((want>>sh)&255))<=2);
 const hit=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
 try{
  requestAnimationFrame=()=>0;
  freshSave('L','priest',null,1);S.lv=99;document.body.classList.add('noRot');initHero();loadChapter(0);startGame();G.intro=null;update=()=>{};
  // --- text size 130%: menus, dialogs and HUD text still fit at this screen size
  menuAct('a11ytext','1.3');check(A11Y.text===1.3&&getComputedStyle(document.documentElement).getPropertyValue('--ui').trim()==='1.3','text size applied');
  check(JSON.parse(localStorage.getItem('so_a11y')).text===1.3,'text size saved on this device');
  for(const tab of ['status','sys','skills','forge']){openMenu(tab);const b=$('#mBody');check(b.scrollWidth<=b.clientWidth+2,tab+' overflows sideways at 130%');check(inView($('#menu .mwrap').getBoundingClientRect()),tab+' panel off screen at 130%');}
  closeMenu();
  ask('A long dialog message to check that the box still fits the screen when text is larger.',['First option','Second option','Cancel']);
  const md=$('#modal>div').getBoundingClientRect();check(inView(md),'dialog fits the screen at 130%');$('#mdB button').click();
  hud();const hr=$('#hr').getBoundingClientRect(),hl=$('#hl').getBoundingClientRect();check(inView(hr)&&!hit(hr,hl),'quest panel fits and does not cover the HP box');
  // --- reduced motion
  menuAct('a11yrm','');if(!A11Y.rm)menuAct('a11yrm','');check(A11Y.rm&&document.body.classList.contains('rm'),'reduced motion on');
  G.slow=1.5;G.shake=.6;G.zoom=.8;G.flash=.8;loop(last+16);check(G.slow===0&&G.shake===0&&G.zoom===1&&G.flash<=.12,'no slow-motion, shake, zoom punch or big flash: slow='+G.slow+' shake='+G.shake+' zoom='+G.zoom+' flash='+G.flash);
  hero.buffs={bless:{t:2,max:60,e:'🙏',n:'Blessing'}};hud();check(getComputedStyle($('#bfR .bf.low')).animationName==='none','expiring buff does not blink');
  menuAct('a11yrm','');check(!A11Y.rm,'reduced motion off');G.slow=1;loop(last+16);check(G.slow>0,'slow-motion back when off');G.slow=0;
  // --- colour-blind danger markers
  menuAct('a11ycb','');check(A11Y.cb&&document.body.classList.contains('cb'),'colour-blind markers on');
  const e=fxDecal(hero.x+3,hero.z,3,2,0xff2020,null);check(e.f.material.map===stripeTex()&&near(e.m.children[0].material.color.getHex(),0xffffff),'danger zone uses hazard stripes and a white rim');
  const m=mkMob(mobDef('bunny',5),hero.x+5,hero.z,false);G.mobs.push(m);check(near(m.mdl.tel.material.color.getHex(),0xffd21f),'monster attack ring is yellow');
  const heal=fxDecal(hero.x,hero.z+3,2,2,0x7dff9a,null);check(!heal.f.material.map,'non-danger effects unchanged');
  menuAct('a11ycb','');check(near(m.mdl.tel.material.color.getHex(),0xff2020)&&!fxDecal(0,0,1,1,0xff2020,null).f.material.map,'turning it off restores red markers');
  // --- screenshots
  const sh=(location.search.match(/shot=(\w+)/)||[])[1];
  if(sh==='menu'){menuAct('a11ytext','1.3');openMenu('sys');[...$('#mBody').querySelectorAll('.card')].find(c=>c.textContent.includes('Accessibility')).scrollIntoView();}
  else if(sh==='marks'){menuAct('a11ytext','1');menuAct('a11ycb','');G.fx.forEach(f=>world.remove(f.m));G.fx=[];hero.x=0;hero.z=8;fxDecal(-2.5,4,2.6,99,0xff2020,null);fxDecal(2.8,3,2,99,0xff2020,null,Math.PI*.8);m.x=0;m.z=1;m.state='windup';m.wT=.2;m.wu=1;m.mdl.tel.material.opacity=.8;m.mdl.tel.scale.setScalar(2);animMob(m,.016);G.fx.forEach(f=>f.t=f.dur*.75);updateFx(0);G.texts.forEach(t=>t.el.remove());G.texts=[];snapCam();hud();PF.render(0);}
  else{menuAct('a11ytext','1');}
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(' | '):'PASS')+' A11y viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
