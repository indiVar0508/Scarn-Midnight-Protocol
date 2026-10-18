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

- **2026-10-19 (session 3, references and Scenes 2–3):** User: "some references from scene 1 are
  removed like 0 day without incident… scene 2 and scene 3 are a bit dull". Nothing was removed:
  twelve wall posters sat at or inside their walls (TECH gotcha 34) — Scene 1's banner, "0 days",
  Pretzel Day, fun run, Dundies, WUPHF and the "NO LAUGHING ON SET" call sheet; Scene 2's "SCARN
  MANOR", self-portrait, "WORLD'S BEST SPY", seal and the THREAT LEVEL whiteboard (never visible).
  Moved them proud of the surface, lifted Scene 1's flyers above the back shelves, and added a set
  test (red on all twelve before). For "dull" the user picked all four: bare sets, flat lighting,
  not much to do, lifeless crew — one scene at a time, Scene 2 first (design → spec → plan).
  Then: "lets not keep bad characters looking only black lets have mix colors". The henchmen were
  one look with near-black skin standing in for a ski mask. Now four looks (`GOONS` in `cast.ts`,
  dealt by seed: a mix of skin tones, red/navy/green/gold knit masks drawn by `CastFigure` over the
  head, charcoal/burgundy/navy/brown suits, gold ties and shades kept as the gang uniform);
  `cast.test.ts` holds it. Scene 1 A/B: same 41 programs, load within noise (10.0/10.2 s one look,
  9.4/10.3 s four, browser busy in the background); `wrap.mjs` clears both waves.
- **2026-10-18 (session 3, load time):** User: "some lag, it takes time to load" (asked to apply the
  ponytail approach: delete work before adding code). First finding: the laptop was running four
  NLP training processes (~14 of 16 threads) in power-saver mode — Scene 1 took 31–42 s and ran at
  12–16 fps then, ~11 s / ~40 fps idle. Game-side, measured with Chrome traces and an A/B against a
  build of the session's starting point (idle laptop, first visit, from the real click): Scene 1
  11.5–12.1 s → 9.1–9.4 s, Scene 2 7.9–8.3 → 6.4–6.5 s, Scene 3 6.2–6.3 → 5.3–5.8 s and its freeze on
  reaching the lake 1.7 s → 0.55 s. Cuts (TECH §9 item 33): static loading card (its pulse made the
  GPU thread present every vsync), unlit RoomEnvironment for the env map (three lit programs gone),
  one shared program for the figure materials (5 → 2 there), Scene 3's lake warmed behind the card
  (`take.location`), physics WASM prefetched on the title. Codex review: three findings, all fixed —
  the shared wrap patch dropped three's sheen energy compensation from the direct diffuse term
  (fabrics a little too bright; skin had carried that bug since its wrap was added), the env map's
  PMREM render target was never disposed (only its texture), and the lake's 8 s controls hint could
  run out behind its loading card (now counts rendered frames). Looked at and left: shadow casters (only
  ~37 of 306 are small; the rest are set pieces whose shadows show), a per-line-change hitch (did not
  reproduce on an idle machine). Perf tooling: `perf.mjs` times from the real pointerdown (Playwright
  had been holding clicks ~10 s on the title, inflating some earlier numbers), waits out a second
  card, `BREAKDOWN=1 VARIANTS=1` lists programs and draws. Next, biggest first: Scene 1's ~980 draws
  per frame (half the shadow pass; merging static set geometry per material is the lever for play
  fps), the remaining one-off program variants (flat-shaded plant, double-sided props, physical
  glass/teeth: ~0.1–0.3 s each), bloom on the medium tier (3 programs + 15 passes a frame).

- **2026-10-12 (session 3, audio):** User: "audio seems to break off sometimes in chapter 3". Two
  causes, both measured with new probes (`tools/qa/voice-cuts.mjs`, `tools/qa/music-load.mjs`):
  (1) every synthesized music note and sound effect stayed connected to the mix after it stopped,
  until GC, and Chrome's audio thread kept processing it; the Scene 3 montage held that thread at
  ~97% of a core on the title screen alone, and in-game the audio clock ran at 0.35–0.8× real time
  (Jack's 8.3 s line took 22 s; music off: 0 slow seconds; graphics tier made no difference). Fixed
  with a per-note bus disconnected when the note's last source ends (TECH §9 item 32): montage
  74–97% → ~40% of a core, Scene 3 in-game 0 of 293 seconds slow, every line at its recorded length.
  (2) any mouse click during a scripted moment skipped the line: the click that captures the mouse
  cut the first line, and shooting/dodging just after a trial cut two lines in a row. Mouse skipping
  removed (Enter/E only, not on key repeat). Ruled out: missing or stale voice files (all 453
  current), late fetches (every line starts within 15 ms). New unit test `synth.test.ts` (fake
  AudioContext, red on the old code).

- **2026-10-11 (session 3, performance):** User: "very laggy, takes time to load characters" (an Intel
  UHD laptop; the RTX 4060 is on nouveau, so Chrome draws on the Intel GPU). Built
  `tools/qa/perf.mjs` (real GPU via ANGLE/GL; SwiftShader QA had hidden all of this). Scene 1 before:
  25–36 s to playable with one 7–13 s frozen frame (shader compiles), more stalls as characters built,
  10–20 fps in play. Causes and fixes (TECH §9 items 24, 28–31): the Intel GPU got the `high` tier →
  new `medium` tier + DPR cap; 8 point lights made every lit shader ~6× bigger → removed, faked with
  floor pools, fixture rows instanced; shaders compiled on first draw → per-take `Warmup` behind a
  "Lighting the set…" card (r184 traps: render-target program keys, PCFSoft→PCF swap, `compileAsync`
  polling gaps, info-log sync reads); runek figure builds on the main thread → worker pool, plus a
  queue bug that never built while paused. After (same laptop, click to playable): ~14 s first visit
  / ~9 s returning in a production build, ~16 s on the dev server, then 33–45 fps with no frame over
  100 ms. Tried and reverted: environment
  map on metals only (30–40% darker, no compile saving). Codex review found three real issues, all
  fixed: R3F reset the DPR cap on every Canvas re-render (now the Canvas `dpr` prop, tier read from a
  probe context), Esc during loading let a 15 s cap drop the card with no frames rendered, and a
  StrictMode replay released the script gate early (now one gate per take, opened only by its
  warmup). Low tier (software rendering) keeps figures coarse; QA scripts wait on game state
  (`tools/qa/stage.mjs`, reach/focus waits) instead of fixed sleeps. Next: cut draw calls
  (~1,000/frame, CPU-bound), fewer material variants (each lit program ~100–250 ms to compile), then
  Scene 4.

- **2026-10-10 (session 3, Chapter 1 look pass):** User: "chapter 1 looks basic; improve character
  textures via runek". runek re-vendored at 0.14.0 (drive patch re-applied). Characters: procedural
  fabric/skin/hair detail added to runek `Person`'s shared materials; suits use runek's new `blazer`
  (lapels, deep V) with a shaped tie, knot and button. Aisle Five: concrete slab (joints, stains, tyre
  scuffs), painted block walls, roof deck with bar joists, duct and skylights, hanging tube rows (one
  flickers), pallet racking of DM cases, dock door + bollards, EXIT signs, freezer, end caps, five
  shoveable carts (dynamic rapier bodies; they knock goons down), register, dust motes, a closed bullpen
  (header wall, drop ceiling, runek OfficeChair/CoffeeMachine/Whiteboard/Clock/Plant/Monitor). All placed
  in `aisle-five.world.json` and checked by runek `checkWorld`. Post: AO, bloom, ACES, vignette, grain;
  procedural environment map (high tier only). Fixed a stale `sim.player.body/collider` after the physics
  world rebuilt (dev StrictMode): teleports were ignored and goon hits on Scarn weren't counted (TECH §9.26).
  Removed vendored runek `Bookshelf` (unused; unchecked `href` navigation). Look-dev: `tools/qa/aisle-look.mjs`.
  Next: Scene 4.

- **2026-10-04 → 10-10 (session 3, Rust physics):** User: use Rust rapier compiled to WASM and integrate runek
  with it, no bypasses (TECH ADR-11). Built `crates/tlm-physics` (rapier3d 0.36 + wasm-bindgen; bodies,
  colliders, sensors, events, ray casts, KCC, Rust projectiles), a TS API, and a drop-in `@react-three/rapier`
  facade so runek's components and `<World>` run unmodified on it. JS rapier removed. Gameplay moved onto
  rapier: KCC, Rust ray casts, Rust projectiles, sensors for interactables/mop/gates/finish line. Every
  scene's static set is now runek WorldData (`src/sets/*.world.json`) rendered with runek `WorldNodes`, checked
  by runek `checkWorld` in tests. Fixed: freed-world crash on scene exit, KCC stall, hanging signs 1.5 m too
  high. Codex review hit its usage limit mid-run (no findings yet); a main-thread review found no
  bypasses (no JS rapier in src/dist). Next: rerun the Codex review, Scene 4 (The Tryout), touch look, feel pass.

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
