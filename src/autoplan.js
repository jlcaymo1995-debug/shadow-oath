// Auto-attack planner: decides the next action from the player's Auto Setup.
// Pure function so it can be unit-tested; the game executes the returned action.
//
// cfg:    {atk:[idx], buf:[idx|'parabellum'], heal:idx|null, healAt:0-100, spRes:0-100, refresh:seconds}
// skills: [{idx, t, k, sp, ready}]  ready = learned, unlocked, off cooldown, zeny ok
// buffs:  {effectKey: secondsLeft}
// pb:     {ok, cost, keys:[effectKey]} for Parabellum (ok = would cast without error)
export const AUTO_REFRESH = 3; // default: recast a buff with less than this many seconds left
export const AUTO_REFRESH_OPTIONS = [0, 3, 5, 10]; // 0 = only after it runs out
export const AUTO_MAX = 6;

export function planAuto({cfg, skills, hp, mhp, sp, msp, buffs = {}, pb = null, inRange}) {
  if (!cfg) return null;
  const byIdx = new Map(skills.map(s => [s.idx, s]));
  const reserve = Math.max(0, Math.min(100, cfg.spRes || 0)) / 100 * msp;
  const afford = cost => sp >= cost && sp - cost >= reserve;
  const win = AUTO_REFRESH_OPTIONS.includes(cfg.refresh) ? cfg.refresh : AUTO_REFRESH;
  const low = k => !(k in buffs) || buffs[k] < win;

  // 1. Heal below the threshold (ignores the SP reserve: staying alive comes first)
  if (cfg.heal != null && cfg.healAt > 0 && hp < cfg.healAt / 100 * mhp) {
    const s = byIdx.get(cfg.heal);
    if (s && s.ready && s.t === 'heal' && sp >= s.sp) return {type: 'skill', idx: s.idx, why: 'heal'};
  }
  // 2. Keep selected buffs up
  for (const id of cfg.buf || []) {
    if (id === 'parabellum') {
      if (pb && pb.ok && pb.keys.some(low) && afford(pb.cost)) return {type: 'parabellum', why: 'buff'};
      continue;
    }
    const s = byIdx.get(id);
    if (s && s.ready && s.t === 'buff' && low(s.k) && afford(s.sp)) return {type: 'skill', idx: s.idx, why: 'buff'};
  }
  if (!inRange) return null;
  // 3. Attack skills in priority order, then a basic attack
  for (const id of cfg.atk || []) {
    const s = byIdx.get(id);
    if (s && s.ready && s.t !== 'buff' && s.t !== 'heal' && afford(s.sp)) return {type: 'skill', idx: s.idx, why: 'attack'};
  }
  return {type: 'attack'};
}
