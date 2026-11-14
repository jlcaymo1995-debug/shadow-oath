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

## Where this is going

The original was one 1.5 MB `index.html` with Three.js and Firebase pasted
inline. Phase 1a (done) de-vendored both and added a build, with no gameplay
change.

- **Phase 1b** — carve `src/game.js` into typed modules. It already has 56
  `/* ===== SECTION ===== */` markers that map cleanly onto modules. `Net` gets
  stubbed to a local no-op so multiplayer call sites survive the move intact.
- **Phase 2** — typed content layer (mobs, bosses, dungeons, affixes, jobs),
  save format v1, and a correct PWA/service-worker story for hashed assets.
- **Phase 3** — Cloudflare Workers + Durable Objects: accounts, a
  server-validated leaderboard, and WebRTC signalling. Firebase comes out here.
  The current client-authoritative design means clients write their own scores,
  so the leaderboard cannot be trusted until this lands.
- **Phase 4** — Vitest on the combat/loot math, Playwright smoke, perf budget.

## Deploy (Cloudflare Pages, free tier)

Build command `npm run build`, output directory `dist`. `base` is `'./'`, so the
build also works from a subpath like GitHub Pages' `/shadow-oath/`.
