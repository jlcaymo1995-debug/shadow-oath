# Shadow Oath: instructions for Claude

## Always do first
1. **Read [MISTAKES.md](MISTAKES.md) before any work.** Follow its rules. When a new
   mistake costs time or misleads the user, add an entry there in the same session.
2. Check Codex's latest session before starting (it also works on this project):
   `~/.codex/session_index.jsonl` and `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`
   (filter by `"cwd":"/Users/batoogz/Developer/Shadow-oath"`). Avoid duplicating
   or colliding with work Codex has started or has pending.
3. Read [docs/EXPERIENCE-ROADMAP.md](docs/EXPERIENCE-ROADMAP.md) for the current
   phase and keep it updated when a phase or pass changes.

## Verify before reporting
- `npm test`, `npx tsc --noEmit`, `npm run build`, `git diff --check`
- Browser scenarios need `npm run dev` on port 5173:
  `bash scripts/browser-smoke.sh <w,h> <out.png> '?<scenario>'`
  Scenarios: (none), `fields`, `opening`, `creation`, `account`, `priest`, `woods`, `status`, `progress`, `mire`, `buffs`, `saves`, `a11y`, `next`.
  Check portrait (393,852) and landscape.
- Report failures as failures. A headless timeout is not proof of a game bug (see MISTAKES.md).

## Every change must work on desktop, tablet and mobile
- Design and check each UI or gameplay change for all three, in portrait and landscape
  where it applies. Nothing may overflow, overlap controls, or be too small to tap.
- Touch targets at least 44px; text readable without zooming; respect safe-area insets.
- Check these sizes with `scripts/browser-smoke.sh` before reporting:
  - Mobile: `393,852` portrait, `852,520` landscape, `320,700` smallest
  - Tablet: `820,1180` portrait, `1180,820` landscape
  - Desktop: `1440,900`
- Say in the report which sizes were checked; if one was not, say so.

## Project rules
- `src/game.js` is one large ES module. Skills are saved by array index: append, never insert.
- Keep save compatibility and offline play working.
- Commit only when the user asks.
