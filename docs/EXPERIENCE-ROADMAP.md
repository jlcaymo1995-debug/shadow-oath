# Shadow Oath experience upgrades

## Delivery order

1. Mobile quick chat and Parabellum (implemented; verification below).
2. Verdant Fields: playable onboarding and distinctive first boss.
3. Character creation portrait UX (implemented; verification below).
4. Login/account screens and current onboarding information (implemented).
5. Whispering Woods and Mire of Lanterns: routes, NPCs, encounter identities.
6. Progression clarity, accessibility, save recovery, then wider chapter rollout.
7. Phase 6, in passes (agreed order A → B → C → D):
   A. Combat clarity — implemented: HUD buff icons (seconds + shrinking ring, blink
      under 5s, blue rim for buffs from a party member; minimap and log move down
      to make room), buff icons on party frames (keys sent in the position packet,
      older 9-field packets still accepted), Status refreshes when a buff starts or
      ends while open. AI companions in your fight count as party: Priest party
      buffs from you or a party member reach them in range (Blessing: +0.5% damage
      per STR+INT point; Increase Agility: faster attacks and running; Gloria: crits).
      Their labels show the icons, mirrored to other players.
      Check: '?buffs' at all six device sizes in CLAUDE.md.
   B. Save recovery: rolling backups per slot, restore earlier save, corrupted-save
      detection, export/import.
   C. Accessibility: text size, reduced motion, colour-blind-friendly danger markers.
   D. Progression clarity: "What's next" card, job-trial requirements, chapter levels.

Preserve procedural geometry, synthesized audio, offline play, existing characters,
class choices, and save compatibility. Deliver each chapter as a reviewable phase.

## Current phase: mobile and Parabellum

Quick chat is in the upper utility row instead of above the lower skill controls.
Its editor opens below the utility icons, shares the menu panel opacity, and
includes a touch-accessible close button. Narrow portrait menus use a horizontal
navigation strip; buff labels wrap and skill-slot grids fit the panel. HUD skill
dimming uses an explicit boolean so normal skill buttons do not blink.

Parabellum unlocks at job index 1, after the level-99 advancement trial: Lord Knight,
Blade, High Priest, High Wizard, Sniper, Whitesmith, or Jester. It is available to
existing advanced characters without spending skill points.

Menu → Skills contains the configuration and six skill-bar assignment buttons.
Choose up to six learned active buffs, reorder or remove them, and cast the bundle
from one skill slot. Cost is ceil(sum of scaled buff SP costs × 103 / 100).
Validation rejects insufficient current/max SP, unavailable buffs, and cooldowns
before spending anything. Each effect uses its ordinary level, duration and
cooldown. Reconfiguration cannot reset the constituent cooldowns.

The existing game stores one buff per effect key. The picker therefore prevents
selecting two buffs that overwrite each other. Six is a capacity, not a promise
that every class currently has six compatible effects. Current buffs affect self;
Parabellum does not introduce party targeting of its own. The Priest's Blessing,
Increase Agility and Gloria are active buffs (first-job tree, appended after all
existing skills so saved indices are unchanged); the old passive in slot p0 is now
Faith. Those three are party buffs: online, party members on the same map within
PARTY_BUFF_R (20) receive them, recomputed locally from the caster's skill level.
Verify with scripts/browser-smoke.sh 393,852 /tmp/priest.png '?priest'.

Verification: npm test, npm run build, npm run typecheck, scripts/smoke.sh.
With the dev server running, scripts/browser-smoke.sh exercises the actual game
casting path, skill assignment, saved configuration, stable skill opacity across repeated HUD refreshes, chat
placement and portrait overflow in an isolated
Chrome profile. Headless checks do not replace physical iPhone/Safari testing,
especially software keyboard and safe-area behavior.

## Verdant Fields: first playable upgrade

Implemented in the first pass:
- New characters receive three persistent lessons: two bunnies, one beetle, then a
  bunny/beetle pair. Offline lesson encounters spawn at the east trail markers;
  online players progress through the existing shared monster population.
- Existing saves retain the ten-bunny quest. Entering dungeons does not advance
  the new lesson sequence. New Game+ resets the lessons for opted-in characters.
- Quest text and a minimap marker identify the current lesson; Rowan repeats its
  relevant hint. His procedural staff carries a hanging oath charm.
- An optional western keepsake chest grants 75 zeny once and recalls the partner's
  promise. Finding it on a legacy character does not change their quest version.
- Bunnies visibly crouch before attacks; beetles lean back during recovery.
- Three marked arena stones intercept Warthog King charges and open a 2.8-second
  stagger/riposte window. Phase two favors repeated charges. The event uses the
  existing multiplayer charge message, but live multi-device testing remains.

Tests cover lesson sequencing, partial progress, stone geometry, actual kill-to-
quest progression, saved state, legacy objectives, and the real charge callback.
The browser scenario is `scripts/browser-smoke.sh 393,995 /tmp/verdant.png '?fields'`.

Second playable pass implemented:
- New characters meet their named partner near the grace, follow them to an oath
  tree, and make a promise before the original abduction sequence. The partner
  waits if the hero falls behind. HUD, minimap and name label guide movement.
- Progress saves at each stage. Reloading the walking stage resumes at the tree;
  reloading the abduction replays that short sequence. Settings offers Skip
  introduction. Existing characters and New Game+ do not enter it automatically.
- The prologue is a peaceful local scene; normal spawning and online joining resume
  afterwards. Player account/online preference is retained.
- Purple thorn clusters disappear after the first boss. Flowers and villagers
  return. Restoration derives from the existing chapter-clear flag, so it persists
  on reload and also appears for legacy characters who already cleared the area.
- Victory leaves the player in Verdant Fields. The north gate offers onward travel,
  a boss rematch, or staying to explore. Late victory callbacks cannot affect a
  different loaded character or area.

Browser checks: `scripts/browser-smoke.sh 393,995 /tmp/opening.png '?opening'`
and the same command with `'?opening&restored'` for the restored view. The scenario
covers the real dialogue, movement, reload, skip and boss-victory paths.

Remaining in this chapter phase: optional replay of guidance, richer routes,
additional silhouette work, human pacing/difficulty and multi-device playtests.

## Verdant Fields design brief

### Intended experience

A proposed 10–15 minute first chapter teaches observation, movement, defense and
recovery while establishing the bond between the hero and their partner. Validate
that duration through playtesting; it is a target, not a measured baseline.

### Sequence

- Add a short playable interaction with the partner before the existing abduction.
  Preserve player naming/customization and provide a skip option on repeat play.
- Rowan introduces a nearby damaged path and one immediate goal. Offer one hint at
  a time, tied to the current encounter, rather than repeating a controls manual.
- A Thornbunny crouches visibly before its committed leap. Teach dodge and punish.
- A Field Beetle presents its armored front and exposes a recovery window. Teach
  heavy attacks or flanking. Every class must have a viable response.
- A mixed encounter asks the player to apply those lessons. An optional side route
  holds the partner's keepsake and reconnects to the main route.
- The Warthog King uses a clearly signaled charge. Baiting it into a marked obstacle
  exposes a recovery window. Phase two changes the charge sequence; it must still
  leave a reliable opening rather than only increasing speed and damage.
- Victory opens a route and visibly reduces corruption. Keep the current partner
  clue and route into Whispering Woods.

Do not silently invalidate an in-progress ten-bunny quest. New onboarding state
needs an explicit migration policy: preserve existing active/completed quests and
apply the revised tutorial to new characters, with optional replay for veterans.

### Procedural design briefs

| Subject | Silhouette and movement | Functional requirement |
| --- | --- | --- |
| Rowan | Bent staff, hanging oath charm, layered cloak, deliberate gestures | Readable mentor at gameplay camera distance; gestures reinforce hints |
| Thornbunny | Raised thorn crest, low crouch before leap | Tell must remain legible without bloom or sound |
| Field Beetle | Broad shield shell, raised underside during recovery | Guard and vulnerability must be distinguished by pose, not only color |
| Warthog King | Broken crown among tusks, broad bristled shoulders, damaged armor | Charge direction and recovery visible to melee and ranged players |
| Hero and partner | Personal keepsake and distinct default idle gestures | Preserve custom hair, colors, names, class equipment and job decoration |

Before modeling: silhouette sketches/specifications, simple geometry breakdown,
attack/idle/recovery poses, mobile-scale readability checks. Avoid adding texture
or audio downloads. Measure geometry/draw-call changes against the current scene.

### Acceptance checks

- A new player can identify their objective without opening the menu.
- All seven classes can complete each lesson; Story mode stays welcoming.
- Repeat play can skip introductory guidance.
- Enemy tells remain clear on low quality, muted audio and reduced effects.
- Offline progress, quest completion, death/retry and old saves remain valid.
- No tutorial card or interaction prompt blocks the mobile combat controls.
- Record actual chapter duration, retries and points of confusion during playtest.

## Refining ladder and Auto Setup (implemented, before Phase 5 Pass B)

- Ore ladder (src/refine.js): normal ore up to +10 (1 + ref/4 per attempt);
  Enriched Oridecon/Elunium for attempts to +11–+15 and Mithril for +16–+20, 1 per
  attempt. Combine 10 normal → 1 Enriched, 20 Enriched → 1 Mithril (Forge → Combine
  ores). Enriched is sold at 11× the normal ore price; Mithril is never sold.
- Milestones: each equipped item at +10/+12/+15 gives +5/+10/+15 to all stats,
  not stacking within an item and counted once (not ×3.4). Status shows it as a
  gold (+X); the Forge shows the current and next milestone.
- Auto Setup (src/autoplan.js, Skills tab): heal skill + HP threshold, buffs to keep
  up (recast window: when expired / 3s / 5s / 10s left, default 3s; Parabellum
  allowed), attack skills in priority order, SP reserve.
- Heal = (MATK × skill heal power + INT × 4) × Divine Grace, where MATK = ATK ×
  skill-power multiplier (shown on Status). Max HP no longer affects heal size. Without a setup AUTO keeps the old behaviour (skill slot 1).
- Old saves: migrateSave() adds the new ores at 0 and sanitises the auto setup.
- Checks: tests/refine.test.js, tests/autoplan.test.js, browser scenario '?progress'
  (add '&show=forge', '&show=combine' or '&show=auto' for screenshots).

## Following phase: Woods and Mire

### Pass A: Whispering Woods (implemented)

- Mira's snare is now real. Three silk snares sit in the Treant's clearing
  (WOODS_SNARES). Luring the Treant onto an armed snare binds it for 3s (silk
  wraps shown on the model) and its stance breaks 60% faster for 8s. A spent snare
  re-weaves after 16s. Host/solo detects the trigger and broadcasts `sn`; a bound
  Treant cannot spring a second snare. Mira's dialogue explains snares and roots,
  and a banner reminds the player after the boss intro.
- Treant `roots` now leave three tangles (`rz` event, 6s) that halve movement
  speed; rolling through them is free. Only Treant-model bosses leave tangles.
- Treant model: hollow chest with a pulsing corrupted heart (brighter in phase 2,
  windup and stagger), an asymmetric three-segment root arm that drags its claws,
  a swaying crown and an animated root arm (the Ancient Guardian shares the model).
- Mira: rust shoulder mantle and back cape, longbow with chest strap, silk spool.

Browser check: scripts/browser-smoke.sh 640,503 /tmp/woods.png '?woods'
(add '&plain' for the unbound Treant, '&mira' for Mira).

### Pass B: Mire of Lanterns (implemented)

- Lantern islands: each of the three lanterns sits on a mossy island with an iron
  lantern housing; stepping stones with wisps lead from the grace to each one.
  Relighting a lantern turns its island halo and its route gold, and every lantern
  pushes the fog back (restored when all three are lit or the chapter is cleared).
  State derives from saved quest progress, so it survives reloads.
- Fix for every shrine chapter: lit shrines/lanterns no longer look dark after a reload.
- Pell: a pole lantern over his shoulder that sways and flickers, a cautious lean,
  and a slow look-around. His dialogue explains the warm stones, webs and eggs.
- Broodmother: a ribbed, glowing lantern abdomen (brighter when casting, red-orange
  in phase 2). `webs` lays 2 lanes (3 in phase 2) that arm after 0.8s and halve
  movement for 8s; rolling through is free. `eggs` lays egg clusters (max 4) that
  hatch two spiderlings after 12s unless destroyed; phase 2 lays a fresh clutch.
  Eggs replicate online as a monster type; web lanes use the `wl` event.

Browser check: scripts/browser-smoke.sh 640,503 /tmp/mire.png '?mire'
(add '&shot=pell', '&shot=lanterns' or '&shot=boss' for screenshots).

Mira receives an asymmetric cape and visible silk spool; her snare must have a
real, readable effect in the Treant fight. The Treant has an asymmetric root arm,
hollow chest and root zones that influence movement.

Pell receives a pole lantern and cautious movement. Lantern islands define the
mire's route and restoration state. The Broodmother's lantern-like abdomen, web
lanes and destructible egg clusters communicate targets and movement decisions.

Expand these encounter patterns only after the first chapter is reviewed. Keep
new species, faction renaming and major multiplayer changes in later phases.

## Character creation: portrait UX pass

Character creation now uses Hero → Appearance → Journey steps, with a dedicated
live preview and fixed Back/Continue actions. Only the choices scroll. Portrait
uses the full form width; landscape retains the side-by-side presentation.
The preview fits each class's model and can be rotated or paused explicitly.
Hero selection names the playable character directly and identifies their partner.

Class details are expandable; faction selection is required before Begin Journey.
Appearance and faction choices retain selection across steps. Color swatches have
44px targets, accessible labels and selected checks. The shared class-grid style
is overridden locally so other menu grids cannot squeeze creation cards.

The creation browser scenario exercises all classes, three steps, touch target
sizes, overflow, back navigation, and the actual new-game payload at 320px/393px
portrait and 640px landscape. Run scripts/browser-smoke.sh with '?creation',
'?creation&appearance', or '?creation&journey'. Physical Safari testing remains.


## Login, accounts, and current information

Implemented after the character-creation update. Login and registration now have
separate modes with one primary action; registration and password changes include
confirmation. Credential requirements and the Firebase authentication provider are
unchanged. Forms adapt to the visual viewport, avoid automatic phone keyboard
opening, and include show/hide controls, focus handling, validation announcements,
duplicate-submit protection, and cleared password fields on close.

Account status now distinguishes pending uploads, confirmed uploads, and errors.
Guest-save import is offered only after account saves were successfully checked;
partial upload failures are reported. In-flight responses from a previous account
cannot mark a different account's saves as synchronized. The offline status no
longer names a particular hosting domain. Onboarding copy reflects the three-step
creator and optional introduction.

Verification: 15 unit/integration checks; mocked browser login, registration,
password update, cancellation, invalid credentials, duplicate username, network
failure, rate limiting and retry; 393px portrait, 320px keyboard-reduced viewport,
and 640px landscape. Build and type checks pass. Real credentials were not used;
physical Safari keyboard and live-service testing remain.

### Screens included

- Title-screen account status and the play-online/offline choice.
- Login and account creation, with distinct modes and one primary action.
- Change-password screen, username entry, errors, loading and retry states.
- Offline-save import after login and explanations of device/account saves.

### Mobile layout and interaction

Match the new creator's visual hierarchy, spacing, readable text and 44px touch
targets. Use full available portrait width with sensible desktop limits. Keep the
form scrollable and its actions reachable when the software keyboard opens,
respect safe areas, and test short landscape heights as well as portrait.

Provide explicit labels, appropriate password-manager autocomplete, accessible
validation/status announcements, keyboard submission and a show/hide-password
control. Do not automatically open the phone keyboard before the player chooses
an input. Preserve non-secret entries after recoverable errors and prevent repeat
submissions while a request is pending.

### Information to correct or clarify

- Account features are optional; solo play and the new local introduction do not
  require login. Online availability depends on connectivity/service access.
- Replace the hard-coded claim that online play only works at a particular hosting
  domain with a status based on the actual connection result.
- Distinguish local-device saves from account sync; do not label queued or failed
  writes as confirmed cloud saves or promise recovery that is not implemented.
- Explain existing username rules (3–12 letters, digits or underscore), the current
  six-character minimum password, and the lack of password-reset support plainly.
- Explain the offline-save copy choice accurately. It appears when the account has
  no saves; declining does not delete the existing guest saves.
- Update new-player guidance to Hero → Appearance → Journey, followed by the
  optional playable partner introduction. Returning players continue via save slots.
- Keep gameplay tips consistent with Parabellum, restored fields and current
  progression; avoid unrelated promotional text in authentication forms.

### Acceptance checks

Use mocked authentication responses for routine UI tests: successful login and
registration, invalid credentials, existing username, offline/network failure,
rate limiting, and retry. Do not create real accounts or change real passwords
as part of automated UI verification. Check cancellation and navigation, save
import messaging, focus and keyboard reachability. Verify at 320px and 393px
portrait, a keyboard-reduced viewport and 640px landscape; finish with physical
Safari checks when available.
