export function validateAccount(mode, values) {
 if(mode!=='password'&&!/^[A-Za-z0-9_]{3,12}$/.test(values.username.trim()))return {field:'accountUser',message:'Use 3–12 letters, numbers or underscores. No spaces.'};
 if(mode==='password'&&!values.current)return {field:'accountCurrent',message:'Enter your current password.'};
 if(values.password.length<6)return {field:'accountPassword',message:'Use at least 6 characters for your password.'};
 if(mode!=='login'&&values.password!==values.confirm)return {field:'accountConfirm',message:'The passwords do not match.'};
 return null;
}

// Authentication is injected so UI scenarios never need real accounts.
export function accountDialog({mode='login',login,register,changePassword,errorText}) {
 return new Promise(resolve=>{
  const modal=document.querySelector('#modal'),body=document.querySelector('#mdT'),actions=document.querySelector('#mdB');
  const previousFocus=document.activeElement,events=new AbortController();let busy=false,username='';
  const $=id=>document.getElementById(id);
  modal.classList.add('account-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','accountHeading');
  $('mdIn').style.display='none';actions.onclick=null;modal.style.display='flex';
  const viewport=()=>{const vv=window.visualViewport;modal.style.setProperty('--account-height',(vv?.height||innerHeight)+'px');modal.style.setProperty('--account-top',(vv?.offsetTop||0)+'px');};
  viewport();window.visualViewport?.addEventListener('resize',viewport,{signal:events.signal});window.visualViewport?.addEventListener('scroll',viewport,{signal:events.signal});window.addEventListener('resize',viewport,{signal:events.signal});
  const close=ok=>{events.abort();modal.querySelectorAll('input').forEach(i=>i.value='');body.innerHTML='';actions.innerHTML='';modal.style.display='none';modal.classList.remove('account-modal');['role','aria-modal','aria-labelledby','aria-busy'].forEach(a=>modal.removeAttribute(a));modal.style.removeProperty('--account-height');modal.style.removeProperty('--account-top');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});resolve(ok);};
  const passwordField=(id,label,autocomplete)=>`<label for="${id}">${label}</label><div class="account-password"><input id="${id}" name="${id}" type="password" maxlength="40" autocomplete="${autocomplete}" aria-describedby="accountStatus" enterkeyhint="done"><button type="button" data-reveal="${id}" aria-label="Show ${label.toLowerCase()}" aria-pressed="false">Show</button></div>`;
  const render=()=>{
   const changing=mode==='password',creating=mode==='register';
   body.innerHTML=`<h2 id="accountHeading" tabindex="-1">${changing?'Change password':creating?'Create your account':'Welcome back'}</h2><p class="account-intro">${changing?'Use your current password to choose a new one.':'An account connects your saves and online play. Solo play is available without one.'}</p>
    ${changing?'':`<nav class="account-modes" aria-label="Account options"><button type="button" data-mode="login" aria-pressed="${!creating}">Log in</button><button type="button" data-mode="register" aria-pressed="${creating}">Create account</button></nav>`}
    <form id="accountForm" novalidate>${changing?'':`<label for="accountUser">Username</label><input id="accountUser" name="username" maxlength="12" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" aria-describedby="accountUsernameHelp accountStatus"><small id="accountUsernameHelp">3–12 letters, numbers or underscores.</small>`}
    ${changing?passwordField('accountCurrent','Current password','current-password'):''}
    ${passwordField('accountPassword',changing?'New password':'Password',creating||changing?'new-password':'current-password')}
    <small>At least 6 characters.</small>${creating||changing?passwordField('accountConfirm','Confirm new password','new-password'):''}
    <p id="accountStatus" role="status" aria-live="polite"></p></form>
    <p class="account-note">${changing?'Password changes apply to your account on every device.':'No email is needed. Password reset is not available; keep your password somewhere safe.'}</p>`;
   if(!changing)$('accountUser').value=username;
   actions.innerHTML=`<button class="btn" type="submit" form="accountForm" id="accountSubmit">${changing?'Update password':creating?'Create account':'Log in'}</button><button class="btn ghost" type="button" id="accountCancel">Back</button>`;
   $('accountHeading').focus({preventScroll:true});body.scrollTop=0;
  };
  modal.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button||busy)return;
   if(button.id==='accountCancel'){close(false);return;}
   if(button.dataset.mode){username=$('accountUser')?.value||'';mode=button.dataset.mode;render();return;}
   if(button.dataset.reveal){const input=$(button.dataset.reveal),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Hide':'Show';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',(show?'Hide ':'Show ')+body.querySelector(`label[for="${input.id}"]`).textContent.toLowerCase());}
  },{signal:events.signal});
  modal.addEventListener('submit',async e=>{
   if(e.target.id!=='accountForm')return;e.preventDefault();if(busy)return;
   const values={username:$('accountUser')?.value||'',current:$('accountCurrent')?.value||'',password:$('accountPassword').value,confirm:$('accountConfirm')?.value||''};
   modal.querySelectorAll('[aria-invalid]').forEach(i=>i.removeAttribute('aria-invalid'));
   const error=validateAccount(mode,values),status=$('accountStatus');status.classList.remove('account-error');
   if(error){status.textContent=error.message;status.classList.add('account-error');$(error.field).setAttribute('aria-invalid','true');$(error.field).focus();return;}
   busy=true;modal.setAttribute('aria-busy','true');modal.querySelectorAll('button,input').forEach(b=>b.disabled=true);status.textContent=mode==='register'?'Creating account…':mode==='password'?'Updating password…':'Logging in…';
   try{if(mode==='password')await changePassword(values.current,values.password);else if(mode==='register')await register(values.username.trim(),values.password);else await login(values.username.trim(),values.password);close(true);}
   catch(error){busy=false;modal.removeAttribute('aria-busy');modal.querySelectorAll('button,input').forEach(b=>b.disabled=false);status.textContent=errorText(error);status.classList.add('account-error');status.scrollIntoView({block:'nearest'});}
  },{signal:events.signal});
  modal.addEventListener('keydown',e=>{
   e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(!busy)close(false);}
   if(e.key==='Tab'){const list=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=list[0],last=list.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('accountHeading'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  },{signal:events.signal});
  modal.addEventListener('keyup',e=>e.stopPropagation(),{signal:events.signal});render();
 });
}
