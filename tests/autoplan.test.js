import test from 'node:test';
import assert from 'node:assert/strict';
import {planAuto} from '../src/autoplan.js';

const skills = [
  {idx: 0, t: 'strike', k: null, sp: 10, ready: true},
  {idx: 1, t: 'heal', k: null, sp: 18, ready: true},
  {idx: 2, t: 'buff', k: 'dr', sp: 24, ready: true},
  {idx: 3, t: 'aoe', k: null, sp: 26, ready: false},
  {idx: 4, t: 'buff', k: 'bless', sp: 20, ready: true},
];
const base = {skills, hp: 100, mhp: 100, sp: 100, msp: 100, buffs: {}, inRange: true};

test('no setup means legacy behaviour (caller decides)', () => {
  assert.equal(planAuto({...base, cfg: null}), null);
});

test('heal first when below threshold, even past the SP reserve', () => {
  const cfg = {atk: [0], buf: [2], heal: 1, healAt: 40, spRes: 90};
  assert.deepEqual(planAuto({...base, cfg, hp: 30, sp: 20}), {type: 'skill', idx: 1, why: 'heal'});
});

test('keeps buffs up, refreshing under 3 seconds, before attacking', () => {
  const cfg = {atk: [0], buf: [2, 4], spRes: 0};
  assert.equal(planAuto({...base, cfg}).idx, 2);
  assert.equal(planAuto({...base, cfg, buffs: {dr: 10}}).idx, 4);
  assert.equal(planAuto({...base, cfg, buffs: {dr: 10, bless: 2}}).idx, 4);
  assert.deepEqual(planAuto({...base, cfg, buffs: {dr: 10, bless: 50}}), {type: 'skill', idx: 0, why: 'attack'});
});

test('recast window is configurable: when expired, 3s, 5s or 10s', () => {
  const cfg = {atk: [0], buf: [2], spRes: 0};
  const at = (refresh, left) => planAuto({...base, cfg: {...cfg, refresh}, buffs: {dr: left}}).idx;
  assert.equal(at(0, 1), 0, 'when expired: 1s left is still up, so attack');
  assert.equal(at(0, undefined) , 0);
  assert.equal(planAuto({...base, cfg: {...cfg, refresh: 0}, buffs: {}}).idx, 2, 'expired: recast');
  assert.equal(at(5, 4), 2, '5s window recasts at 4s left');
  assert.equal(at(3, 4), 0, '3s window waits at 4s left');
  assert.equal(at(10, 9), 2);
  assert.equal(at(7, 2.5), 2, 'invalid value falls back to 3s');
});

test('buffs are cast while approaching; attacks wait until in range', () => {
  const cfg = {atk: [0], buf: [2], spRes: 0};
  assert.equal(planAuto({...base, cfg, inRange: false}).idx, 2);
  assert.equal(planAuto({...base, cfg, inRange: false, buffs: {dr: 9}}), null);
});

test('attack priority skips skills on cooldown; SP reserve falls back to basic attack', () => {
  const cfg = {atk: [3, 0], buf: [], spRes: 0};
  assert.equal(planAuto({...base, cfg}).idx, 0, 'idx 3 is not ready');
  assert.deepEqual(planAuto({...base, cfg: {...cfg, spRes: 95}}), {type: 'attack'});
});

test('Parabellum as a buff entry recasts when any of its effects runs low', () => {
  const cfg = {atk: [], buf: ['parabellum'], spRes: 0};
  const pb = {ok: true, cost: 50, keys: ['dr', 'bless']};
  assert.deepEqual(planAuto({...base, cfg, pb, buffs: {dr: 30}}), {type: 'parabellum', why: 'buff'});
  assert.deepEqual(planAuto({...base, cfg, pb, buffs: {dr: 30, bless: 30}}), {type: 'attack'});
  assert.deepEqual(planAuto({...base, cfg, pb: {...pb, ok: false}}), {type: 'attack'});
});
