export const PARABELLUM = 'parabellum';
export const PARABELLUM_JOB = 1;

// Validate the entire bundle before the game spends SP or applies any effect.
export function planParabellum({job, selected, skills, currentSP, maxSP, cooldowns = {}}) {
  const buffs = Array.isArray(selected) ? selected : [];
  const result = {buffs: [], base: 0, cost: 0, cooldown: 0, error: ''};
  if (job < PARABELLUM_JOB) result.error = 'Unlocks after your level-99 job trial';
  else if (!buffs.length) result.error = 'Choose buffs in Menu → Skills → Parabellum';
  else if (buffs.length > 6 || new Set(buffs).size !== buffs.length) result.error = 'Choose up to six distinct buffs';
  const effects = new Set();
  for (const id of buffs) {
    const sk = skills.find(s => s.idx === id);
    if (!sk || !sk.learned || sk.job > job || sk.t !== 'buff' || sk.zeny) {
      result.error ||= 'A configured buff is no longer available';
      continue;
    }
    if (effects.has(sk.k)) result.error ||= 'Choose one buff per effect; matching effects overwrite each other';
    effects.add(sk.k);
    result.buffs.push(sk);
    result.base += sk.sp;
    result.cooldown = Math.max(result.cooldown, cooldowns[id] || 0);
  }
  result.cost = Math.ceil(result.base * 103 / 100);
  if (result.cooldown > 0) result.error ||= 'A configured buff is cooling down';
  if (result.cost > maxSP) result.error ||= 'This bundle costs more than your maximum SP';
  else if (result.cost > currentSP) result.error ||= 'Not enough SP for Parabellum';
  return result;
}
