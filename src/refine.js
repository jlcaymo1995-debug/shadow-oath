// Refining rules: which ore an attempt needs, combining ores, and milestone bonuses.
// Weapons use the Oridecon line, everything else the Elunium line.
//   attempt from +0..+9   normal ore, 1 + floor(ref/4) per attempt
//   attempt to  +11..+15  Enriched ore, 1 per attempt   (ref 10..14)
//   attempt to  +16..+20  Mithril ore,  1 per attempt   (ref 15..19)
export const ENRICHED_FROM = 10;
export const MITHRIL_FROM = 15;

export function refineOre(slot, ref) {
  const base = slot === 'w' ? 'ori' : 'elu';
  if (ref >= MITHRIL_FROM) return {ore: 'm' + base, n: 1};
  if (ref >= ENRICHED_FROM) return {ore: 'e' + base, n: 1};
  return {ore: base, n: 1 + Math.floor(ref / 4)};
}

// Combining: 10 normal -> 1 Enriched, 20 Enriched -> 1 Mithril.
export const COMBINE = {
  eori: {from: 'ori', n: 10}, eelu: {from: 'elu', n: 10},
  mori: {from: 'eori', n: 20}, melu: {from: 'eelu', n: 20},
};

// Returns how many can be made, without changing anything.
export function combineMax(ore, key) {
  const r = COMBINE[key];
  return r ? Math.floor((ore?.[r.from] || 0) / r.n) : 0;
}

// Returns a new ore object after making up to `count`, or null if none can be made.
export function combine(ore, key, count) {
  const r = COMBINE[key];
  const made = Math.min(Math.max(0, Math.floor(count) || 0), combineMax(ore, key));
  if (!r || made <= 0) return null;
  return {ore: {...ore, [r.from]: ore[r.from] - made * r.n, [key]: (ore[key] || 0) + made}, made};
}

// Milestone bonus to ALL stats for one equipped item. Tiers do not stack within an item.
export const REFINE_MILESTONES = [[15, 15], [12, 10], [10, 5]];
export function refineBonus(ref) {
  for (const [at, v] of REFINE_MILESTONES) if (ref >= at) return v;
  return 0;
}
export function nextRefineMilestone(ref) {
  const next = REFINE_MILESTONES.slice().reverse().find(([at]) => ref < at);
  return next ? {at: next[0], v: next[1]} : null;
}
