import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function fixture(){
 let accept,reject,loadValue={},loadFail=false;
 const FB={uid:'test',name:'Tester',lastCore:[],busy:{},pend:{},saves:[null,null,null],saveState:{},db:{ref:()=>({set:()=>new Promise((a,r)=>{accept=a;reject=r;}),once:()=>loadFail?Promise.reject(new Error('offline')):Promise.resolve({val:()=>loadValue})})}};
 const c=vm.createContext({FB,S:{lv:1},SLOT:0,window:{},CLOUD:{ready:false},withTimeout:p=>p});
 vm.runInContext(section('function saveStatus()','const heroName=')+section('async function fbLoadSaves()','function fbDelete('),c);
 return {FB,c,accept:()=>accept(),reject:()=>reject(new Error('offline')),load:v=>loadValue=v,offline:()=>loadFail=true};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('save status reports pending, success and failure based on the actual upload',async()=>{
 const f=fixture();f.c.fbSave(0,'{"lv":1}','first');assert.match(f.c.saveStatus(),/Syncing/);
 f.accept();await flush();assert.match(f.c.saveStatus(),/Last upload confirmed/);
 f.c.fbSave(0,'{"lv":2}','second');f.reject();await flush();assert.match(f.c.saveStatus(),/Sync failed/);
});
test('stale account uploads cannot confirm saves for a new account',async()=>{
 const f=fixture();f.c.fbSave(0,'{"lv":1}','first');f.FB.uid='another';f.FB.saveState={};f.accept();await flush();
 assert.match(f.c.saveStatus(),/not yet confirmed/);assert.equal(f.FB.saves[0],null);
});
test('failed or malformed account reads cannot be treated as confirmed empty saves',async()=>{
 const f=fixture();f.offline();await f.c.fbLoadSaves();assert.equal(f.FB.savesLoaded,false);
 const bad=fixture();bad.load({0:{save:'invalid json'}});await bad.c.fbLoadSaves();assert.equal(bad.FB.savesLoaded,false);
 const empty=fixture();await empty.c.fbLoadSaves();assert.equal(empty.FB.savesLoaded,true);
});

test('guest-save copy reports partial upload failures without changing guest originals',async()=>{
 const guest0='{"lv":1}',guest1='{"lv":2}',data=new Map([['guest',guest0],['guest_1',guest1]]);let message='',writes=0;
 const FB={uid:'test',ready:true,savesLoaded:true,saves:[null,null,null],db:{ref:path=>({set:async()=>{writes++;if(path.endsWith('/1'))throw new Error('offline');}})}};
 const context=vm.createContext({FB,SKEY:'guest',setInterval,clearInterval,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},skey:i=>'account_'+i,ask:async()=>0,toast:t=>message=t,refreshTitle:()=>{}});
 vm.runInContext(section('async function afterLogin()','/* ---------- cloud saves'),context);
 await context.afterLogin();assert.equal(writes,2);assert.match(message,/1 cloud upload/);assert.equal(data.get('guest'),guest0);assert.equal(data.get('guest_1'),guest1);
 FB.savesLoaded=false;writes=0;await context.afterLogin();assert.equal(writes,0);assert.match(message,/could not be checked/);
});
