import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFieldLesson,fieldLesson,chargeImpact} from '../src/verdant.js';
test('lessons progress only on relevant kills, and mixed encounter accepts either order',()=>{
 let s={stage:0,counts:{}};
 assert.deepEqual(advanceFieldLesson(s,'beetle'),s);
 for(const key of ['bunny','bunny','beetle','beetle','bunny'])s=advanceFieldLesson(s,key);
 assert.equal(s.stage,3);assert.equal(fieldLesson(s),null);
 assert.deepEqual(advanceFieldLesson(s,'bunny'),s);
});
test('partial progress survives serialization without mutating the previous state',()=>{
 const old={stage:0,counts:{}};const next=advanceFieldLesson(old,'bunny');
 assert.deepEqual(old,{stage:0,counts:{}});
 assert.equal(advanceFieldLesson(JSON.parse(JSON.stringify(next)),'bunny').stage,1);
});
test('charge stops at the nearest stone, ignores misses, and handles a zero-length charge',()=>{
 const start={x:0,z:0},end={x:20,z:0};
 assert.equal(chargeImpact(start,end,[{x:15,z:0},{x:8,z:0}],2).x,6);
 assert.equal(chargeImpact(start,end,[{x:8,z:4}],2),null);
 assert.equal(chargeImpact(start,start,[start]),null);
 assert.equal(chargeImpact(start,end,[start]).t,0);
});

import {isFieldPrologue,fieldsAreRestored} from '../src/verdant.js';
test('only explicitly opted-in untouched new characters enter the prologue',()=>{
 const save={ch:0,q:[{s:0}],cleared:[0],fields:{prologue:'meet'}};
 assert.equal(isFieldPrologue(save),true);
 for(const stage of ['meet','walk','abduction'])assert.equal(isFieldPrologue({...save,fields:{prologue:stage}}),true);
 assert.equal(isFieldPrologue({...save,fields:{}}),false);
 assert.equal(isFieldPrologue({...save,fields:{prologue:'done'}}),false);
 assert.equal(isFieldPrologue({...save,q:[{s:1}]}),false);
 assert.equal(isFieldPrologue({...save,cleared:[1]}),false);
 assert.equal(isFieldPrologue(save,true),false);
 assert.equal(isFieldPrologue({...save,ch:1}),false);
});
test('restoration derives from existing chapter completion, including legacy saves',()=>{
 assert.equal(fieldsAreRestored({cleared:[1]}),true);
 assert.equal(fieldsAreRestored({cleared:[0]}),false);
 assert.equal(fieldsAreRestored({}),false);
});
