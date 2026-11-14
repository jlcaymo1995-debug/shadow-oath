setTimeout(async()=>{
 if(!location.search.includes('account'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 const flush=()=>new Promise(r=>setTimeout(r,0));let calls=0,fail='auth/network-request-failed',release;
 const mock=()=>{calls++;return new Promise((resolve,reject)=>{release=()=>fail?reject({code:fail}):resolve();});};
 const open=mode=>accountDialog({mode,login:mock,register:mock,changePassword:mock,errorText:authErr});
 const fill=()=>{if($('#accountUser'))$('#accountUser').value='TestHero';if($('#accountCurrent'))$('#accountCurrent').value='sample0';$('#accountPassword').value='sample1';if($('#accountConfirm'))$('#accountConfirm').value='sample1';};
 const layout=()=>{const m=$('#modal'),b=$('#mdB').getBoundingClientRect(),body=$('#mdT');check(b.bottom<=innerHeight+1&&b.top>=0,'actions within viewport');check(body.scrollWidth<=body.clientWidth+1,'form horizontal overflow');for(const el of m.querySelectorAll('button,input')){const r=el.getBoundingClientRect();check(r.height>=44&&r.width>=44,'touch size');check(r.left>=0&&r.right<=innerWidth+1,'field within viewport');}};
 try{
  requestAnimationFrame=()=>0;showScreen('titleScr');resize();
  let result=open('login');check(document.activeElement.id==='accountHeading','no automatic keyboard');layout();
  $('#accountSubmit').click();check(calls===0&&$('#accountUser').getAttribute('aria-invalid')==='true','invalid input blocked');
  fill();$('#accountSubmit').click();$('#accountForm').requestSubmit();check(calls===1,'duplicate submission blocked');release();await flush();
  check($('#accountStatus').textContent.includes('internet')&&!$('#accountSubmit').disabled,'network retry');check($('#accountUser').value==='TestHero','username retained');
  for(const code of ['auth/invalid-credential','auth/too-many-requests']){fail=code;$('#accountSubmit').click();release();await flush();check($('#accountStatus').textContent===authErr({code}),'error state '+code);}
  $('[data-reveal="accountPassword"]').click();check($('#accountPassword').type==='text','show password');$('[data-reveal="accountPassword"]').click();check($('#accountPassword').type==='password','hide password');
  $('[data-mode="register"]').click();check($('#accountUser').value==='TestHero'&&$('#accountPassword').autocomplete==='new-password','registration mode');layout();fill();$('#accountConfirm').value='different';const before=calls;$('#accountSubmit').click();check(calls===before,'confirmation blocked');
  fill();fail='auth/email-already-in-use';$('#accountSubmit').click();release();await flush();check($('#accountStatus').textContent.includes('taken'),'duplicate username');
  fail='';$('#accountSubmit').click();release();check(await result===true,'registration success');check(!$('#modal').classList.contains('account-modal')&&!$('#accountPassword'),'secrets cleared');
  result=open('login');fill();$('#accountSubmit').click();release();check(await result===true,'login success');
  result=open('password');layout();fill();$('#accountSubmit').click();release();check(await result===true,'password update success');
  result=open('password');$('#accountCancel').click();check(await result===false,'cancel works');
  void open(location.search.includes('password')?'password':location.search.includes('register')?'register':'login');layout();
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' Account viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
