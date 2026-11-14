import test from 'node:test';
import assert from 'node:assert/strict';
import {refineOre, combine, combineMax, refineBonus, nextRefineMilestone} from '../src/refine.js';

test('ore by refine level: normal to +10, Enriched to +11..+15, Mithril to +16..+20', () => {
  assert.deepEqual(refineOre('w', 0), {ore: 'ori', n: 1});
  assert.deepEqual(refineOre('a', 9), {ore: 'elu', n: 3});
  assert.deepEqual(refineOre('w', 10), {ore: 'eori', n: 1});
  assert.deepEqual(refineOre('h', 14), {ore: 'eelu', n: 1});
  assert.deepEqual(refineOre('w', 15), {ore: 'mori', n: 1});
  assert.deepEqual(refineOre('r', 19), {ore: 'melu', n: 1});
});

test('combine 10 normal -> 1 Enriched and 20 Enriched -> 1 Mithril, never below zero', () => {
  const ore = {ori: 25, elu: 9, eori: 0, eelu: 41};
  assert.equal(combineMax(ore, 'eori'), 2);
  assert.equal(combine(ore, 'eelu', 1), null, 'not enough Elunium');
  const r = combine(ore, 'eori', 5);
  assert.equal(r.made, 2);
  assert.equal(r.ore.ori, 5);
  assert.equal(r.ore.eori, 2);
  assert.equal(ore.ori, 25, 'input is not mutated');
  assert.equal(combine(ore, 'melu', 1).ore.melu, 1);
  assert.equal(combine(ore, 'melu', 1).ore.eelu, 21);
  assert.equal(combine(ore, 'nope', 1), null);
  assert.equal(combine(ore, 'eori', -3), null);
});

test('milestone bonus per item: +5 at +10, +10 at +12, +15 at +15, not stacking', () => {
  assert.deepEqual([9, 10, 11, 12, 14, 15, 20].map(refineBonus), [0, 5, 5, 10, 10, 15, 15]);
  assert.deepEqual(nextRefineMilestone(3), {at: 10, v: 5});
  assert.deepEqual(nextRefineMilestone(10), {at: 12, v: 10});
  assert.deepEqual(nextRefineMilestone(13), {at: 15, v: 15});
  assert.equal(nextRefineMilestone(15), null);
});
