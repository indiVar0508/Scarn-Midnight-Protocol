# TLM v2 — Roadmap and progress log

**Resume protocol:** read `docs/v2/README.md`, then this file. Find the first unchecked box, check
the Progress log at the bottom for context, and continue. Update both after every working session.

## Phase 0: Research and spec ✅
- [x] Audit v1 codebase (Phaser 4 + React; engine-agnostic: data/, audio/, most of state/)
- [x] Research Rapier (rapier.js 0.21, @react-three/rapier 2.2) and runek 0.13
- [x] Episode research addendum (GAME_DESIGN §7)
- [x] GAME_DESIGN.md, TECH.md, this roadmap

## Phase 1: Aisle Five vertical slice, *with* the take loop (scope cut per Codex review)
Goal: testers voluntarily retry with a plan to improve. Everything else waits on this.
- [x] Scaffold `v2/` (Vite 8 + React 19.3 + R3F 9.8 + drei + r3r 2.2), `@v1` alias, publicDir `../public`
- [x] runek init + vendored components (shelf, counter, crate, wall, floor, sign, person, lamp, rug, table, chair, door, flag)
- [x] Vendored `@runek/core` source (npm 0.13.0 dist lags the registry; see `v2/src/runek/core/VENDORED.md`)
- [x] `Stage`: our Canvas + Physics (fixed 1/60, interpolate) + hand-rolled runek WorldContext
- [x] Diorama camera (follow, aim look-ahead, trauma shake × Reduced Shake)
- [x] v2 input facade (kbm + pad), buffered presses consumed in physics steps
- [x] Scarn: Rapier KCC in `useBeforePhysicsStep`, accel/decel, roll with i-frames, aim, pose
- [x] Hitscan + tracers + sparks + impulses on props
- [x] Goons: KCC strafe AI, LOS check, telegraph (red flash + "!"), slow dodgeable bullets, late fall → dynamic tumble, juggle
- [x] Prop-impact knockdowns (heavy fast prop → goon down, "SET PIECE TAKEDOWN")
- [x] TLM components: `PaperShelf` (dynamic frame + instanced ream bodies), `ReamPyramid` (cases), `SetFloor`
- [x] Aisle Five greybox, 2 waves, 3 Director's Notes, HUD, CUT card, review card, instant retake (R), pause, save (union of notes)
- [x] Playwright smoke: title → play → shoot → knockdowns → pose note → wrap → review → retake (no errors)
- [x] **Third-person camera** (user direction): pointer-lock mouse look, shoulder cam, spring arm, centre aim, crosshair
- [x] **Characters on runek Person** with `PersonDrive` (aim/pose/recoil/dazed) + tie/gun/shades; cast looks for 10 roles; `/?lineup`
- [x] **Office set dressing** (posters, logo cases, forklift, baler, Darryl's office) + **crew bullpen** behind the fourth wall
- [x] **Ch1 dialogue in v2**: intro, wave taunts, barks, checkout punchline; captions with "played by"
- [x] **Voice audition kit**: `tools/voice/audition.{json,py}` + `/?voices` page (24 candidates rendered)
- [x] **PRINT IT leads somewhere** (user report: review card felt stuck): Ch1 ending = title slam → narrated newspaper montage → end card. Keys: Enter/Space/Esc = PRINT IT, R = one more take. Fixed a double-activation bug (Enter on one screen clicked the next screen's focused button). QA: `tools/qa/review-exit.mjs`
- [x] **Scene 2 · One Last Mission** (user report: "stuck at first scene"): Scarn Manor (wake-up, inspect props, beet tub),
  Oval Office (choices, Threat Level Midnight), Rapier physics coin flip (best of seven), mission card. Scene registry +
  progression (end card → PLAY SCENE N), title scene list with unlocks (`?unlock=all`). QA: `tools/qa/scene2.mjs`
- [x] **Scene 3 · Cherokee Jack**: drive montage (one backdrop, three captions), frozen-lake set (tarp, painted
  backdrop with seam, desk fan "WIND", Wayne the Roomba, Jack's van), Jack Q&A choices, five trials (mop, stick
  handling with a physics puck, cardboard targets + Jack, cone slalom on ice, reflex dodging), report card ("ELITE").
  Skating movement on ice. QA: `tools/qa/scene3.mjs`
- [ ] **Scene 4 · The Tryout** next (speed-skating race, Goldenface crashes it, skate-and-shoot, locker-room stealth), then Ch5–Ch11
- [ ] **User picks voices** on `/?voices`, then update `src/data/cast.ts` and re-run `voice:generate` for those speakers
- [ ] **Feel pass with a human**: enemy damage/rate, bullet speed, camera height, shelf topple ease, hit-stop
- [ ] Touch controls (virtual stick + look-drag zone + fire/roll/pose) and pad aim-assist; mouse sensitivity / invert-Y settings
- [ ] Ch1 story beats around the fight: walk-in dialogue (reuse `CH01` lines + voices), cashier steals the line
- [ ] Set dressing: forklift, cart, register, aisle signs (runek Sign), fluorescent flicker, set-reveal pull-back
- [ ] Vercel preview deploy of `v2/` (Root Directory `v2`; verify `../src` + `../public` are included)

## Phase 2 (only after Phase 1 proves replayable): meta + Ch10 hockey
- [ ] Dundies shelf, costumes, Blooper Reel (single angle first)
- [ ] Physics hockey (puck ccd, ice friction, boards, slapshot charge)

## Phase 3+: remaining chapters (order: 6, 3, 9, 4, 2, 5, 8, 7, 11), Daily Shoot, launch
- [ ] Port chapters · [ ] Screening frame story · [ ] Daily Shoot · [ ] Perf/a11y/QA · [ ] Production cut-over

---

## Progress log
(newest first; one entry per session: what was done, what's next, gotchas)

- **2026-10-03 (session 2, restructure):** User wants only the new game deployed. Moved the 3D app from
  `v2/` to the repo root and archived the 2D original in `legacy/` (TECH ADR-10). Shared modules copied
  to `src/shared/` (`@shared` alias). Clean `npm ci` + build pass; QA scripts (`tools/qa/`) pass.
  Vercel: the connector can't create projects (403), so the user imports the repo on vercel.com/new
  (no special settings) and points production branch tracking at this branch (or merges to main).

- **2026-10-03 (session 2, Scene 3):** Built Scene 3. New: `Training.tsx` (five trials sharing a step-based
  clock), `LakeProps.tsx`, `take.trial`/`slate`/`report` HUD, `sim.onPlayerHit` (training throws don't cost COOL),
  skate movement, CastFigure `pose`/`headband`. Found and fixed: scene scripts started twice under StrictMode
  (duplicate lines in dev), so every scene now uses `useSceneScript` (runs once per mount). QA found the targets
  were edge-on, mopping was unwinnable while gliding, the slalom could be skated straight, and Jack hid
  during the report. All fixed. Next: Scene 4.

- **2026-10-03 (session 2, cont.):** User was "stuck at first scene" because only Scene 1 existed. Added
  the scene registry/progression and a full Scene 2 (ported from v1 Ch2, with v1's lines and voices).
  New systems: interactables + prompt, dialogue choices, skippable lines, scripted camera shots,
  cancellable scene scripts, room fades, physics coin. Fixed four real bugs found by QA (TECH §9 items 14–16):
  Enter "clicking" the next screen's focused button, a script cancelled by an effect cleanup, input
  presses expiring on slow frames, and the review being skipped by the line-skip Enter. Next: Scene 3.

- **2026-10-03 (session 2):** User asked for a third-person view, more accurate characters, Office set
  references and closer voices. Done: over-the-shoulder camera (pointer lock), characters moved to runek
  `Person` (stylized) with a `drive` hook we added, cast looks for 10 roles, warehouse references and a
  crew bullpen reverse shot, Ch1 lines and captions in v2, Kokoro set up locally, and a voice audition page.
  Ruled out: cloning the actors' voices. QA: `tools/qa/{wrap,tps}.mjs` pass with no errors;
  `play.mjs` is diorama-era (it still runs, but its aim assumptions are stale). Next: user's voice picks →
  regenerate; touch look; feel pass.

- **2026-10-03 (later):** Session 1, continued. **Phase 1 slice playable** (`npm run dev`, port 5174).
  Codex reviewed the specs; adopted: take loop in Phase 1, scope cut, KCC per physics step,
  buffered input, prop-impact knockdowns. Gotchas found and fixed (all now in TECH §9):
  StrictMode freed the KCC created in useMemo (now `useKcc` effect); runek `Floor`'s auto
  collider arrives a commit late so actors fell through (now `SetFloor` with an explicit collider);
  manual chunk groups made Vite preload three/rapier on the title (removed); npm @runek/core lags
  the registry (vendored). QA: `v2/tools/qa/{play,wrap}.mjs` (`npm run qa`, needs dev server;
  `CHROME=` path to a cached Playwright chromium if the bundled one isn't installed). Unit tests: save rules.
  Observed: a *stationary* bot loses 4/5 COOL in ~6 s vs wave 1, so tune wave-1 fire rate in the feel pass.
  Next: human feel pass, touch, Ch1 dialogue beats, set dressing, Vercel preview.
- **2026-10-03:** Session 1. Phase 0 done. Decisions: R3F + r3r (Rapier WASM) + runek, v2 in `v2/`,
  diorama camera, takes loop, custom KCC. Next: Phase 1 scaffold.
