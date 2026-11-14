import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAccount} from '../src/account-ui.js';
const values={username:'Hero_1',password:'sample1',confirm:'sample1',current:'sample0'};
test('account validation matches existing username and password requirements',()=>{
 assert.equal(validateAccount('login',values),null);
 assert.equal(validateAccount('register',values),null);
 for(const username of ['aa','bad name','abcdefghijklmn','name@'])assert.equal(validateAccount('login',{...values,username}).field,'accountUser');
 assert.equal(validateAccount('login',{...values,password:'short'}).field,'accountPassword');
});
test('registration and password change require confirmation, login does not',()=>{
 assert.equal(validateAccount('register',{...values,confirm:'other'}).field,'accountConfirm');
 assert.equal(validateAccount('password',{...values,current:''}).field,'accountCurrent');
 assert.equal(validateAccount('password',{...values,username:'',confirm:'other'}).field,'accountConfirm');
 assert.equal(validateAccount('password',{...values,username:''}),null);
 assert.equal(validateAccount('login',{...values,confirm:''}),null);
});
