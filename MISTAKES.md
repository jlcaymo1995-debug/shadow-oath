# Mistakes log

Read this before starting work. Each entry says what went wrong, why, and the rule
that prevents it. Add a new entry whenever a mistake costs time or misleads the user.
Keep entries short. Do not delete entries; mark them **Resolved** if the cause is fixed.

## Testing and verification

### 1. Headless timeout reported as a game freeze (2026-11-14)
- **What happened:** A new `?status` browser scenario timed out for the Knight on
  Normal difficulty. It was treated as an infinite-loop bug and chased for several
  rounds, while the user waited.
- **Real cause:** `scripts/browser-smoke.sh` runs Chrome with `--virtual-time-budget=8000`.
  The scenario left the live game loop running (`requestAnimationFrame`/`update`),
  so busier scenes used up the budget before the title was set. The game was fine:
  in real-time Chrome the Status tab rendered for every class.
- **Rule:** In browser scenarios, stub `requestAnimationFrame=()=>0` and
  `update=()=>{}` before doing heavy setup. A timeout or "No scenario result" is
  a harness result, not a bug. Confirm in real time (CDP, below) before claiming a freeze.

### 2. Headless screenshot treated as proof of a rendering bug (2026-11-14)
- **What happened:** The Forge preview looked empty in a headless screenshot.
- **Real cause:** Unconfirmed. Live state showed the preview canvas mounted
  (333×198), the renderer created, and the item model built. A second WebGL
  canvas may not appear in headless captures.
- **Rule:** Before reporting a visual bug from a headless screenshot, check the
  live state (element sizes, renderer, model) or ask the user for a screenshot
  from their device.

### 3. Assuming instead of asking when the report is vague or cut off (2026-11-14)
- **What happened:** "Status window is not showing" and "Forge… does not a" (cut
  off) were investigated without asking which device, orientation, or what was seen.
- **Rule:** If a bug report is vague or truncated, ask for a screenshot, the device,
  and the steps, while starting cheap checks in parallel.

### 3b. Testing only fresh characters in Chrome (2026-11-14)
- **What happened:** Status passed for fresh level-50 characters in headless Chrome,
  but the user's late-game Wizard on iPhone Safari showed a blank Status panel.
- **Real cause (Resolved):** The Status tab's Skill Bar card did `C.sk[i].e` for each
  bar slot, but Parabellum is stored in `S.bar` as the string `'parabellum'`, not an
  index, so any player with Parabellum on the bar crashed the whole tab. Not
  browser-specific. Tests never put Parabellum on the bar before opening Status.
  A tab that threw while drawing also left the panel silently blank.
- **Also:** `S.bar` slots can be a skill index, `null`, or `PARABELLUM`. Always
  handle all three (see `barSkill()` and the Skills tab bar) when reading it.
- **Rule:** Test late-game states too (4th job, high level, all skills, buffs active).
  The menu now has an error boundary (`renderMenu` → `renderMenuTab`) that prints
  the error on screen; ask the user for that screenshot instead of guessing.

## Tooling (macOS, this project)

### 4. Commands that do not exist or are blocked here
- `timeout` is not installed on macOS. Use `perl -e 'alarm 60; exec @ARGV' <cmd>`.
- Plain `sleep N && cat` is blocked in Claude Code. Use a background task or Monitor.
- **Rule:** Use the macOS-safe forms above.

### 5. Game functions are module-scoped
- `src/game.js` is an ES module. `closeMenu`, `S`, `G` and similar are not globals,
  so `Runtime.evaluate("closeMenu()")` fails.
- **Rule:** Test code appended to the module (the `tests/*-browser.js` files) can
  call them directly. For CDP, append `window.__qa={...}` to the temporary copy only.

### 6. Duplicate `const` names in browser scenarios
- All `tests/*-browser.js` files are concatenated into one module with `game.js`.
  A top-level or same-scope `const base` in a test collided and broke every scenario.
- **Rule:** Keep test variables inside the `setTimeout` callback, use unique names,
  and run all scenarios after adding one.

## Game code

### 7. Save compatibility: skills are stored by array index
- `S.sk` (`'a3'`, `'p0'`), `S.bar` and `S.parabellum` reference positions in
  `CLASSES[cls].sk/ps`. Inserting or removing an entry shifts every later skill.
- **Rule:** Append new skills at the end. Rename instead of removing (example: the old
  passive Blessing in slot `p0` became Faith).

### 8. Dialogue promising mechanics that do not exist
- Mira's quest text said the snare makes the Treant "stagger more easily", but no
  code did it until Phase 5 Pass A. **Resolved.**
- **Rule:** When writing quest or skill text, check that the described effect is
  implemented, or implement it.

### 9. Sticky button inside a scrolling strip covers content (2026-11-14)
- **What happened:** In portrait, the menu's Close button was `position:sticky` inside
  the horizontally scrolling tab strip, so it sat on top of the 4th tab (Forge).
- **Rule:** Put persistent controls next to a scroll container, not inside it
  (menu: `.mside` > `.mtabs` scroller + `.cls`). The `?status` scenario checks this.

### 10. Screenshot camera overridden, scene polluted by earlier checks (2026-11-14)
- **What happened:** Mire screenshots aimed the camera at Pell and a lantern, but the
  pictures showed the hero in the boss arena surrounded by test web lanes.
- **Real cause:** Rendering follows the hero, so setting `cam.position` was not reliable;
  objects created by earlier checks in the same scenario were still in the world.
- **Rule:** For screenshots, move the hero in front of the subject (camera sits south
  of the hero, looking north), then `snapCam()`. Clear test leftovers first.

### 11. Almost duplicating an existing feature (2026-11-14)
- **What happened:** While adding save export/import, a second export was written before
  noticing the game already had a save-code box in Settings and "Load from save code"
  on the title screen. That existing loader was also broken for current (v5) saves.
- **Rule:** Before adding a feature, search for an existing one (UI text, `data-a`
  actions, function names) and extend or fix it instead of adding a parallel path.

## How to check the game in real time (CDP)

When a headless scenario is inconclusive, launch Chrome with
`--remote-debugging-port=9333` on a temporary copy of the game (game.js + test file,
plus `window.__qa`), then use Node's built-in `WebSocket` to send
`Runtime.evaluate` (read state), `Debugger.pause` (see where code is stuck), and
`Page.captureScreenshot`. Delete the temporary `qa-debug.html` and `src/qa-debug.js`
afterwards.
