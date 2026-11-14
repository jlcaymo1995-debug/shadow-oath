// Save recovery rules: validating saves, rolling backups and export codes.
// Pure functions (no storage access) so they can be unit-tested.
export const BACKUP_KEEP = 3;                 // rolling automatic backups per slot
export const BACKUP_EVERY = 10 * 60 * 1000;   // at most one automatic backup per 10 minutes
export const CODE_PREFIX = 'SO1';

// A save is usable if it has the fields the game cannot start without.
export function validSave(s) {
  return !!s && typeof s === 'object' && !Array.isArray(s)
    && typeof s.cls === 'string' && typeof s.hero === 'string'
    && Number.isFinite(s.lv) && s.lv >= 1
    && !!s.st && typeof s.st === 'object'
    && Array.isArray(s.items) && Array.isArray(s.q) && Array.isArray(s.cleared);
}

// Classify what is stored in a slot: nothing, a usable save, or something damaged.
export function parseSave(raw) {
  if (raw == null || raw === '') return {state: 'empty'};
  try {
    const save = JSON.parse(raw);
    return validSave(save) ? {state: 'ok', save} : {state: 'damaged'};
  } catch (e) {
    return {state: 'damaged'};
  }
}

// Add a snapshot to a slot's backup list. Returns the new list, or null when an
// automatic backup is not due yet. Keeps BACKUP_KEEP automatic backups plus the
// most recent checkpoint (taken right before a risky action), newest first.
export function addBackup(list, snap, {now, kind = 'auto', keep = BACKUP_KEEP, every = BACKUP_EVERY} = {}) {
  const prev = (Array.isArray(list) ? list : []).filter(b => b && typeof b.j === 'string');
  if (kind === 'auto') {
    const last = prev.filter(b => b.kind === 'auto').sort((a, b) => b.t - a.t)[0];
    if (last && now - last.t < every) return null;
  }
  const entry = {t: now, kind, why: snap.why || '', lv: snap.lv, ch: snap.ch, cls: snap.cls, j: snap.j};
  let out = [entry, ...prev].sort((a, b) => b.t - a.t);
  if (kind === 'checkpoint') out = out.filter(b => b.kind !== 'checkpoint' || b === entry);
  const autos = out.filter(b => b.kind === 'auto').slice(0, keep);
  return out.filter(b => b.kind !== 'auto' || autos.includes(b));
}

// FNV-1a 32-bit, as 8 hex digits: catches typos and truncated codes.
export function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const toB64 = str => { const b = new TextEncoder().encode(str); let s = ''; for (const c of b) s += String.fromCharCode(c); return btoa(s); };
const fromB64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

export function exportCode(json) {
  return `${CODE_PREFIX}.${toB64(json)}.${checksum(json)}`;
}

export function importCode(code) {
  const parts = String(code || '').trim().replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) return {ok: false, error: 'This is not a Shadow Oath save code.'};
  let json;
  try { json = fromB64(parts[1]); } catch (e) { return {ok: false, error: 'The code is damaged or incomplete.'}; }
  if (checksum(json) !== parts[2]) return {ok: false, error: 'The code is damaged or incomplete.'};
  const r = parseSave(json);
  return r.state === 'ok' ? {ok: true, save: r.save} : {ok: false, error: 'The code does not contain a usable save.'};
}
