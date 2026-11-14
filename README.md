# Shadow Oath

A Lambo & Calliope soulslike RPG. 3D WebGL (Three.js), runs as an offline-capable
PWA. **Zero art assets** — every mesh is procedural geometry and all audio is
synthesized at runtime. Keep it that way: it's why hosting costs nothing.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run host       # also serve on your LAN, for phone testing
```

| Script | What |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run host` | Same, exposed on the local network |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `./scripts/smoke.sh` | Boot the game headless; fail on any runtime error |

`scripts/smoke.sh` needs the dev server running. It loads the game in headless
Chrome, asserts zero runtime errors, and asserts the WebGL renderer sized the
canvas. Run it after any structural change.

## Layout

```
index.html        app shell — DOM HUD + all CSS (35 KB)
src/game.js       the game (514 KB, one module — see "Phase 1b" below)
src/pwa.js        service worker registration (production only)
public/           manifest, service worker, icons — copied verbatim
docs/             original handoff notes
```

## Pinned dependencies

`three` and `firebase` are pinned to **exact** versions, not carets:

- `three@0.149.0` — the revision the original single-file build vendored.
  Three.js changed its color management and lighting defaults after r152, so
  a drifting version would silently change how the game looks.
- `firebase@10.14.1` — matches the vendored compat SDK. Slated for removal; see below.

## Systems built on top of the sample

**Equipment — eight slots.** Weapon, off-hand, armour, upper headgear, lower
headgear, footgear and two accessories. Items have seven slot *types*;
`EQSLOTS`/`SLOTOF` map the eight equip slots onto them so an accessory fits
either `r` or `r2`, and `freeSlotFor()` fills the first empty compatible one.
Every slot can be emptied — `stats()` is null-safe throughout, so bare-handed
degrades to base attack rather than breaking. New gear seeds through drops,
boss drops, Old Blue Box, abyssal dungeon and tower rewards (all of which route
through the single `rollEquip()` chokepoint), plus merchant stock and a
tier-0 footgear at character creation.

**Forge — master-detail station.** Picker strip, then the selected item with its
stat delta, success rate as a meter, risk band as a colour state, materials with
have/need, and a 0..20 pip rail. `doRefine()` is the shared core for single and
bulk attempts so they cannot drift apart. Pity raises odds 3% per consecutive
failure on the same item (cap +45%, reset on success). Bulk refining targets
+10/+12/+15/+18/+20 and **stops before any attempt that could destroy the item**
unless Protection is on with scrolls remaining.

**Shop — quantity buying.** `×1/×5/×10/×25/Max` applies to potions, ore,
Protection Scrolls and basic gear. `shopN()` is the single clamp: chosen
quantity, limited by affordability and by whatever cap applies. Old Blue Box
stays ×1 on purpose, since each roll fires its own toast.

**One shared panel renderer.** The Equipment paper-doll and the Forge item stage
use a *single* canvas and WebGL context (`#panelCv`), re-parented between
`.eqstage` and `.fgstage`. They live on different tabs and are never visible
together, so a second context is never warranted. Forge items are auto-framed
from their bounding box — a staff and a ring differ far too much in size for a
fixed camera.

**Translucent panels.** CSS vars `--pan`/`--crd`/`--scrim`, with real
`backdrop-filter` gated behind `body.fx-glass`, which `applyQuality()` sets only
on the **high** tier. The 3D scene keeps rendering behind an open menu, so
blurring a live canvas every frame is far too expensive on mobile.

## Still outstanding

- **Save durability.** Saves are localStorage only — no IndexedDB, no
  `navigator.storage.persist()`, no quota handling. iOS evicts web storage under
  pressure. This is the highest-value fix left; losing a long-lived character is
  the one failure players never forgive.
- **Phase 1b.** `src/game.js` is still one module. It carries 56
  `/* ===== SECTION ===== */` markers that map cleanly onto files. `scripts/smoke.sh`
  exists to be the regression gate for that carve.
- **Client-authoritative multiplayer.** Clients still write their own saves and
  scores, so the leaderboard cannot be trusted and trading is exploitable. Needs
  the Cloudflare Workers + Durable Objects backend.
- **Dual-wield.** The off-hand accepts shields only; "shield *or* second weapon"
  is a combat change (damage, class rules, animations) deliberately kept separate.

## Deploy (Cloudflare Pages, free tier)

Build command `npm run build`, output directory `dist`. `base` is `'./'`, so the
build also works from a subpath like GitHub Pages' `/shadow-oath/`.
