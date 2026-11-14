import test from 'node:test';
import assert from 'node:assert/strict';
import {validSave, parseSave, addBackup, exportCode, importCode, checksum, BACKUP_EVERY} from '../src/backup.js';

const good = {cls: 'priest', hero: 'L', lv: 52, st: {str: 1}, items: [], q: [], cleared: [], ch: 3};

test('valid, empty and damaged slots are told apart', () => {
  assert.equal(validSave(good), true);
  assert.equal(validSave({...good, lv: 0}), false);
  assert.equal(validSave({...good, items: null}), false);
  assert.equal(parseSave(null).state, 'empty');
  assert.equal(parseSave(JSON.stringify(good)).state, 'ok');
  assert.equal(parseSave('{"cls":"priest",').state, 'damaged', 'truncated JSON');
  assert.equal(parseSave('[]').state, 'damaged');
  assert.equal(parseSave('{"hello":1}').state, 'damaged');
});

test('automatic backups: at most one per 10 minutes, newest 3 kept', () => {
  const snap = t => ({j: 'save@' + t, lv: 1, ch: 0, cls: 'priest'});
  let list = addBackup([], snap(0), {now: 0});
  assert.equal(list.length, 1);
  assert.equal(addBackup(list, snap(1), {now: BACKUP_EVERY - 1}), null, 'not due yet');
  for (let k = 1; k <= 4; k++) list = addBackup(list, snap(k), {now: k * BACKUP_EVERY});
  assert.deepEqual(list.map(b => b.j), ['save@4', 'save@3', 'save@2']);
});

test('a checkpoint is always taken and only the latest one is kept', () => {
  let list = addBackup([], {j: 'a', lv: 1}, {now: 0});
  list = addBackup(list, {j: 'cp1', why: 'refine +11'}, {now: 5, kind: 'checkpoint'});
  list = addBackup(list, {j: 'cp2', why: 'respec'}, {now: 6, kind: 'checkpoint'});
  assert.deepEqual(list.map(b => b.j), ['cp2', 'a']);
  assert.equal(list[0].why, 'respec');
  assert.equal(addBackup('nonsense', {j: 'x'}, {now: 1}).length, 1, 'bad stored list is ignored');
});

test('export code round-trips, including non-English names', () => {
  const s = {...good, cust: {name: 'Lambô 💗'}};
  const code = exportCode(JSON.stringify(s));
  assert.match(code, /^SO1\.[A-Za-z0-9+/=]+\.[0-9a-f]{8}$/);
  const r = importCode('  ' + code.slice(0, 20) + '\n' + code.slice(20) + ' ');
  assert.equal(r.ok, true);
  assert.deepEqual(r.save, s);
});

test('damaged or foreign codes are rejected with a clear reason', () => {
  const code = exportCode(JSON.stringify(good));
  assert.equal(importCode('hello').ok, false);
  assert.equal(importCode(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')).ok, false, 'checksum mismatch');
  const parts = code.split('.');
  assert.equal(importCode(`${parts[0]}.${parts[1].slice(0, 10)}.${parts[2]}`).ok, false, 'truncated');
  const bad = JSON.stringify({x: 1});
  assert.match(importCode(`SO1.${btoa(bad)}.${checksum(bad)}`).error, /usable save/);
});
