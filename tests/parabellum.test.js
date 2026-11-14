import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {planParabellum, PARABELLUM, PARABELLUM_JOB} from '../src/parabellum.js';

const skills=Array.from({length:7},(_,i)=>({idx:i,n:`Buff ${i}`,learned:true,job:1,t:'buff',k:`effect${i}`,sp:i===5?35:33,cd:20}));
const setup=overrides=>({job:1,selected:[0,1,2,3,4,5],skills,currentSP:206,maxSP:300,...overrides});
test('six buffs cost 206 SP on a 200 SP base, with integer rounding',()=>{
 const p=planParabellum(setup());assert.equal(p.base,200);assert.equal(p.cost,206);assert.equal(p.error,'');
 assert.equal(planParabellum(setup({selected:[0]})).cost,34);
});
test('rejects locked, empty, duplicate, oversized, unavailable and conflicting bundles',()=>{
 for(const change of [{job:0},{selected:[]},{selected:[0,0]},{selected:[0,1,2,3,4,5,6]},
  {skills:skills.map(s=>({...s,learned:false}))},{skills:skills.map(s=>({...s,job:2}))},
  {skills:skills.map(s=>({...s,t:'heal'}))},{skills:skills.map(s=>({...s,k:'same'}))}])
  assert.ok(planParabellum(setup(change)).error,JSON.stringify(change));
});
test('checks current SP, max SP, and included cooldowns',()=>{
 assert.match(planParabellum(setup({currentSP:205})).error,/Not enough/);
 assert.match(planParabellum(setup({maxSP:205})).error,/maximum/);
 assert.equal(planParabellum(setup({cooldowns:{2:12,5:4}})).cooldown,12);
 assert.match(planParabellum(setup({cooldowns:{2:12}})).error,/cooling/);
});

// Exercise the real class definitions and casting entry points without WebGL.
const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const context=vm.createContext({planParabellum,PARABELLUM,PARABELLUM_JOB,assert});
vm.runInContext(between('const HEROES=','/* ================= ITEMS')+
 between('const JOB_LV=','// first-job elements')+`
 let S, hero, G; const C_=()=>CLASSES[S.cls];
 const skLv=i=>S.sk['a'+i]||0;
 const psVal=()=>.2; const canAct=()=>hero.state==='idle';
 const toast=()=>{}, sfx=()=>{}, txt=()=>{}, save=()=>{};
 const doSkill=i=>{const sk=skDef(i);hero.buffs[sk.k]={v:sk.v,t:sk.dur};};
 `+between('function skDef(i)','function psVal(k)')+
 between('function parabellumPlan()','function parabellumHtml()')+`
 globalThis.run=()=>{
 for(const cls of CLS_ORDER){
  S={cls,job:1,sk:{}};
  const keys=new Set();S.parabellum=[];
  CLASSES[cls].sk.forEach((sk,i)=>{if(sk.t==='buff'&&sk.job<=1&&!keys.has(sk.k)){keys.add(sk.k);S.sk['a'+i]=3;S.parabellum.push(i);}});
  assert.ok(S.parabellum.length>0,cls);
  hero={sp:1000,cd:[],buffs:{},state:'idle'};G={st:{msp:1000}};
  const plan=parabellumPlan();castParabellum();
  assert.equal(hero.sp,1000-plan.cost,cls);
  for(const sk of plan.buffs){assert.equal(hero.buffs[sk.k].v,sk.v);assert.equal(hero.buffs[sk.k].t,sk.dur);assert.equal(hero.cd[sk.idx],sk.cd*.8);}
  assert.equal(hero.castDone,true);
  const snapshot=JSON.stringify(hero);castParabellum();assert.equal(JSON.stringify(hero),snapshot);
  hero.state='idle';const before=JSON.stringify(hero);castParabellum();assert.equal(JSON.stringify(hero),before);
  hero.cd=[];hero.buffs={};hero.sp=plan.cost-1;const low=JSON.stringify(hero);castParabellum();assert.equal(JSON.stringify(hero),low);
  const saved=JSON.parse(JSON.stringify({...S,bar:[PARABELLUM,null]}));assert.equal(saved.bar[0],PARABELLUM);assert.deepEqual(saved.parabellum,JSON.parse(JSON.stringify(S.parabellum)));
 }
 };
`,context);
test('all seven classes unlock, cast atomically, retain scaled effects and cannot bypass cooldowns',()=>context.run());
