# TLM v2 — Technical spec and decisions

## 1. Stack (versions checked on npm, Oct 2026)

| Package | Version | Role |
|---|---|---|
| react / react-dom | 19.3.x | Same as v1. R3F 9.8 peers `>=19 <19.4`, so OK |
| three | ~0.184.0 (pinned: runek peers `^0.184`) | Renderer |
| @react-three/fiber | 9.8.x | React renderer for three |
| @react-three/drei | 10.7.x | Helpers (KeyboardControls, Text, etc.) |
| @react-three/rapier | 2.2.x | React bindings for Rapier |
| @dimforge/rapier3d-compat | 0.19.2 (pulled by r3r 2.2; npm latest is 0.21) | **Rapier physics compiled to WASM** (wasm inlined as base64, so no special server headers needed) |
| @runek/core | vendored source (0.13 line, commit 3995bf7) | runek runtime: `useWorld`, seeded `rng`/`sub`, WorldData, ground queries. Aliased to `v2/src/runek/core` |
| runek components | vendored source (`npx @runek/cli add …`) | Procedural set dressing: Shelf, Counter, Crate, Wall, Floor, Door, Person, Sign, Flag, Rug, Lamp, Chair, Table, Level… |
| vite / typescript / vitest | 8.3 / 6.0 / 5.x | Same toolchain as v1 |

`ecctrl` (runek's `Player` uses it) is **not** used for gameplay: we need crisp, game-specific
movement (twin-stick aim, dodge roll, skating). We write our own controller on Rapier's
`KinematicCharacterController` (see ADR-4).

## 2. Architecture decision records

### ADR-1 (superseded 2026-10-04 by ADR-11): "WASM + Rapier + runek" meant R3F + rapier.js
- **Context:** The user asked for a WASM-based game using Rapier and runek components.
- **Options:** (a) Rust plus Bevy/Rapier compiled to WASM; (b) React Three Fiber plus `@react-three/rapier`
  (Rapier's official WASM build) plus runek.
- **Decision:** (b). runek is a React Three Fiber library built on `@react-three/rapier`, so only (b) can use
  it. (b) also keeps v1's React shell, audio engine, script data and voice pipeline (about half of v1's code)
  usable. The physics is Rapier, running as WASM.
- **Consequence:** Gameplay logic stays in TypeScript. If profiling ever shows a hot CPU path
  (unlikely at this scale), a small Rust crate built with `wasm-pack` can be added for that path alone.

### ADR-2 (superseded 2026-10-03 by ADR-10): v2 was a separate app in `v2/`
- v1 is live on Vercel. v2 is built side by side in `v2/` (its own `package.json` and Vite config).
- Shared, engine-agnostic v1 modules are imported, not copied, through the Vite/TS alias `@v1/*` →
  `../src/*`: `data/script/*`, `data/cast.ts`, `audio/*` (engine, music, songs, sfx, synth, voice),
  `state/store.ts`, `state/settings.ts`, `state/storage.ts`, plus the rhythm `chart.ts`.
- v2's `publicDir` is `../public`, so voice MP3s and fonts are shared with zero duplication.
- Once v2 reaches parity it moves to the root (or v1 moves to `legacy/`), with a separate Vercel
  project or root-directory setting during the transition (see §7).

### ADR-3: A scene = a runek World (data) + a beat script (async code)
- **Set**: a `WorldData` JSON (runek's worlds-as-data) rendered through `WorldRenderer` with a
  component registry = runek components + TLM components. Sets are diffable, seedable (Daily Shoot
  remixes = same JSON with a new seed or modifier), and editable with runek's editor later.
- **Actors and gameplay** (Scarn, goons, bullets, interactables) are React components mounted
  beside the set, not in the JSON. They're stateful and not "world furniture".
- **Script**: v1's pattern, carried over unchanged: a chapter is a list of `Beat { id, run(): Promise }`,
  each beat a checkpoint, everything awaited is cancelled by an `AbortSignal` on take restart or quit.
  `await say(line)`, `await choose()`, `await card()` come from the UI bridge.

### ADR-4: Our own kinematic character controller on Rapier KCC
- Scarn and goons are `kinematicPosition` bodies driven by `world.createCharacterController(0.02)`
  with autostep, snap-to-ground and slide, plus `setApplyImpulsesToDynamicBodies(true)`, so walking
  into props shoves them.
- Accel/decel curves come from v1's design bible (no floaty movement except on ice, where the curves change).
- **Knockdown**: a goon swaps to a `dynamic` body after a **0.4 s delay** (v1's "falls over late" gag)
  and gets an impulse; it can get back up for multi-hit enemies.
- A ragdoll (multi-body plus spherical joints) is a stretch goal; the single capsule tumble reads fine first.

### ADR-5: Hitscan bullets with physical consequences
- Shots are `world.castRay` from the gun muzzle along the aim, with a filter that excludes the shooter.
- On hit: if dynamic, `applyImpulseAtPoint`; if goon, damage plus knockback; always spawn a tracer and
  sparks (pooled instanced meshes). Enemy shots are slow visible projectiles (kinematic
  sensors) so they're dodgeable, which is the readability rule.

### ADR-6: Fixed timestep, deterministic-ish
- `<Physics timeStep={1/60}>` for stable stacking. Gameplay updates happen in `useBeforePhysicsStep`
  where they affect physics, and in `useFrame` for visuals.
- Seeded RNG (`rng`/`sub` from runek core) for everything gameplay-random, so Daily Shoot is fair
  and bloopers replay deterministically from the recorded transforms.

### ADR-7: UI is React DOM over the canvas (as in v1)
- The canvas is fullscreen; HUD, dialogue, cards and menus are DOM overlays (reuse and restyle v1
  components where they fit: Dialogue, Settings, TapeDeck, Credits).
- The bridge is v1's tiny `Store` plus a promise API; no new state library.

### ADR-8: Characters (superseded 2026-10-03, see ADR-9)
- **Cast NPCs**: runek `Person` (parametric, procedural humans with clothes, hair and style) dressed per
  character (Scarn tux, Samuel's butler coat and glasses, Goldenface with gold head material).
- **Action actors** (Scarn, goons): our own lightweight "bobblehead puppet" rig built from primitives
  (capsule torso, sphere head, box limbs) with procedural walk/aim/pose animation. It's cheap, readable
  at diorama distance, and needs no assets. It can later swap to `Person` if performance allows.

### ADR-9: runek `Person` + `PersonDrive` for every character; third-person camera
- Characters render with our vendored runek `Person` (skinned, 18-bone rig, SDF body, layered
  garments, hair, glasses, LOD). We added an optional `drive` prop (`PersonDrive`: speed, aim,
  aimPitch, pose, recoil, dazed) that layers gameplay posing over its walk/idle animation, and it
  fills `drive.bones`/`drive.eyes` so `CastFigure` can parent a tie, pistol and sunglasses to bones.
  The optional prop keeps the component contract-compatible (it still renders from plain data).
- `ThirdPersonCamera` owns yaw/pitch in `sim.cam`, ray-casts the spring arm against ENV only
  (`G.camera`), and ray-casts the centre aim from the player outward (`G.playerShot`). Scarn's KCC
  movement uses `camBasis(yaw)`. Fourth-wall barriers are a dedicated BARRIER layer that stops
  characters but never rays or the camera.

### ADR-10: The 3D game is the repo root; v1 is archived in `legacy/`
- User direction: deploy only the new game, with no `v2` subfolder. The app moved from `v2/` to the root
  (history kept via `git mv`). The original Phaser game moved to `legacy/`, kept runnable, not deployed.
- The v1 modules the new game uses were copied into `src/shared/` (alias `@shared/*`, previously
  `@v1/*` → `../src/*`): `audio/`, `data/cast.ts` + `data/script/`, `state/{store,settings,storage}.ts`,
  `styles/fonts.css`, `game/art/{newspaper,canvas}.ts`. `legacy/src` keeps its own copy.
- `public/` (voices, fonts) stays at the root; `legacy/vite.config.ts` points `publicDir` at `../public`.
- Vercel: plain Vite app at the root, so no Root Directory or "files outside root" settings are needed.

### ADR-11: Physics is our own Rust crate on `rapier3d`, compiled to WASM; runek runs on it unmodified
**User direction (2026-10-04):** "I wanted Rust rapier (github.com/dimforge/rapier) to be used, and runek
integrated with Rapier, not bypassed. It has to be WASM-based." A Codex audit found the previous build used
the prebuilt npm `@dimforge/rapier3d-compat` through `@react-three/rapier`, bypassed runek's `<World>`, never
used runek's worlds-as-data, and hand-rolled bullets and interactions with distance math.

Decision:
1. **`crates/tlm-physics/`**: a Rust crate depending on `rapier3d` 0.36 (crates.io, published from
   dimforge/rapier), exposed with `wasm-bindgen` and compiled to `wasm32-unknown-unknown`. It owns a rapier
   `PhysicsWorld` and exposes a flat, handle-based API: bodies, colliders (cuboid, ball, capsule, cylinder,
   cone, convex hull, trimesh), materials, collision groups, sensors, fixed-step stepping with collision and
   intersection events, scene queries (ray cast), rapier's `KinematicCharacterController` (move + impulses on
   dynamic bodies), and a projectile system (swept balls, shape-cast every step, hit events). Body poses are
   exported in bulk through a `Float32Array` view on WASM memory. Rust unit tests cover each feature natively.
2. **The built module is committed** (`src/physics/wasm/`: JS glue, `.d.ts`, `.wasm`) so Vercel needs no Rust
   toolchain. `npm run wasm` rebuilds it, and a test fails if the crate's source hash no longer matches the
   artifact (`src/physics/wasm/SOURCE_HASH`).
3. **`src/physics/`** wraps the module in TypeScript (`PhysicsWorld`, `BodyApi`, `ColliderApi`, `Kcc`) and
   provides a **drop-in `@react-three/rapier`-compatible React layer** (`Physics`, `RigidBody` with automatic
   cuboid/hull/trimesh colliders from child meshes, collider components, `InstancedRigidBodies`, `useRapier`,
   `useBeforePhysicsStep`/`useAfterPhysicsStep`, `interactionGroups`, the event props), with interpolated
   rendering between fixed steps. Vite and TypeScript alias `@react-three/rapier` to it, so **runek's vendored
   components and runek's `<World>` run unmodified on the Rust world**. `@react-three/rapier` and
   `@dimforge/rapier3d-compat` are removed from `package.json`, so the bundle contains no JS rapier.
4. **runek is the scene root, not bypassed:** each scene renders inside runek's `<World>` (its Canvas,
   WorldContext and `<Physics>`; our camera, lights and timestep live inside). The static set of every scene
   is **runek `WorldData` JSON** (`src/sets/*.world.json`, validated by runek's `parseWorld`) rendered by
   `sets/SetPiece.tsx` with runek's `WorldNodes` through one component registry (`sets/registry.tsx`: runek
   components + our runek-contract `tlm/` components), inside a `GroundContext` from runek's
   `useGroundIndex`. `sets/sets.test.ts` runs runek's `checkWorld` over every set (nothing buried or
   floating), and checks registry coverage and unique node ids. Scarn publishes himself as the
   world's `player` (runek NPCs look at him, not at the camera). Gameplay actors (Scarn, goons, coin, trials)
   stay code, rendered as `<World>` children (ADR-3).
5. **No physics bypasses in gameplay:** the player and goon controllers use rapier's KCC (Rust); hitscan uses
   Rust ray casts; enemy projectiles live in Rust and hit the player's capsule through rapier queries (no
   distance checks); interactables, mop spots, gates and finish lines are rapier sensors reporting
   intersection events. Ragdolls, the coin, the puck, shelves and reams are rapier dynamic bodies.

Why a facade instead of rewriting runek: runek is "shadcn for 3D". Its components are meant to be owned and
edited, but keeping them byte-identical to the registry proves they're integrated rather than forked, and
lets us pull upstream updates with `runek add`. The facade is the integration seam.

**Update (2026-10-10, later):** runek re-vendored at 0.14.0 (new office/home components, blazer
garment with lapels, office poses); every new component's physics imports are covered by the facade.

**Status (2026-10-10): all five points are implemented.** 15 Rust tests (`npm run test:rust`), 8 TS tests on
the real WASM module (`src/physics/world.test.ts`), 21 set tests, and the browser QA in `tools/qa/` pass on
the Rust physics. The production bundle has 0 bytes of JS rapier; the crate ships as a ~765 KB gz `.wasm`.

## 3. Directory layout (v2)

```
(repo root)
  index.html, package.json, vite.config.ts, tsconfig.json, runek.config.json, vercel.json
  crates/tlm-physics/  Rust crate on rapier3d 0.36 → wasm32 (src/lib.rs API, src/tests.rs)
  scripts/          build-wasm.mjs (`npm run wasm`), wasm-hash.mjs (artifact freshness check)
  legacy/           the original 2D Phaser game (archived)
  src/
    main.tsx, App.tsx
    runek/            vendored runek components (CLI-managed; edit freely, we own them)
    tlm/              TLM-specific runek-contract components (PaperShelf, ReamPyramid, Forklift,
                      CheckoutCounter, ConferenceTable, FlagStand, HockeyRink, …)
    sets/             runek WorldData per set (*.world.json), registry.tsx (type → component),
                      SetPiece.tsx (WorldNodes + GroundContext), sets.test.ts (checkWorld)
    physics/          world.ts (TS API over the Rust module), react.tsx (@react-three/rapier facade),
                      wasm/ (committed wasm-bindgen output + SOURCE_HASH)
    game/
      Stage.tsx       Canvas + Physics + camera + set + actors for the active scene
      camera/         DioramaCamera, MovieCamera (cutscene shots), SetReveal
      actors/         Scarn, Goon, rig/ (puppet rig + animation)
      systems/        input (reuse v1 Input facade), combat (hitscan), knockdown, interact (sensors),
                      style (scoring), blooper (ring buffer), takes (rating)
      scenes/         ch01/ … (beats + scene component per chapter)
    ui/               HUD, ReviewCard, Menus (v2), reused v1 components
    state/            take results, dundies, save v2 (`tlm.v2.save`)
```

## 4. Physics conventions
- 1 unit = 1 meter, Y up (runek contract §6). Scarn is ~1.75 m tall.
- Collision groups (16-bit membership/filter):
  `ENV=0, PLAYER=1, ENEMY=2, PROP=3, PLAYER_BULLET=4, ENEMY_BULLET=5, SENSOR=6, RAGDOLL=7`.
- Props: one collider per gameplay chunk (runek §5). Paper reams are small boxes, instanced visually.
  Rigid bodies are spawned as **sleeping** to keep idle sets free.
- Budget: ≤ 400 active dynamic bodies in a scene, with ≤ 150 awake at once on mobile.

## 5. Performance budget
- 60 fps on an integrated GPU at 1080p with DPR capped (`dprFor`, passed to the Canvas: 1.25 on `medium`, 1.5 on `high`);
  mobile DPR 1 and 30 fps floor. Measured (2026-10-11, Intel UHD / Raptor Lake-P laptop, 1080p, Scene 1,
  `medium`): 33–45 fps in play, no frame over 100 ms after the loading card; click to playable
  ~14 s on a first visit and ~9 s on a return (Chrome's shader cache) in a production build, ~16 s
  on the dev server.
- One shadow-casting directional light (2048 shadow map desktop, 1024 mobile); at most one or two point
  lights per scene (gotcha 29). Light from fixtures is faked (emissive + bloom + floor pools).
- Instanced meshes for reams, racking, joists, fixture rows; Scene 1 is ~1,000 draw calls per frame
  including the shadow pass (the next thing to cut; the frame is CPU-bound on that laptop).
- The 3D chunk (three + r3f + rapier ≈ 1.5–2 MB gz incl. wasm) is lazy-loaded after the menu paints.
- Measure on the real GPU with `node tools/qa/perf.mjs [auto|low|medium|high]` (ANGLE over the host
  GL driver), not the SwiftShader QA browser.

## 6. Testing
- Vitest for pure logic: take rating, style scoring, blooper buffer, chart judge (reused), save migration.
- Playwright scripted runs (reuse v1 `tools/qa` approach) with the `window.__TLM__` hooks.
- Physics determinism smoke test: run N steps headless with `@dimforge/rapier3d-compat` in Node and
  assert the stacked shelf settles (no explosion) and the KCC climbs a 0.2 m step.

## 7. Deployment (Vercel)
- During development: a separate Vercel project (e.g. `threat-level-midnight-v2`) with Root Directory
  `v2`, build `npm run build`, output `dist`. The `../src` and `../public` access needs "Include
  files outside the root directory" (Vercel's default for monorepos), verified in Phase 5.
- WASM: the `-compat` build inlines the wasm, so no MIME or headers config is needed. Cache `/assets/*` as immutable.
- At launch: point the production domain to v2 and keep v1 at `/classic` or a v1 subdomain.

## 8. Library notes (learned while researching, so we don't re-research)

**Rapier (rapier.js 0.19–0.21)**
- `world.createCharacterController(offset)` → `computeColliderMovement(collider, desired, filterFlags?, filterGroups?, filterPredicate?)`,
  then `computedMovement()`, `computedGrounded()`, `numComputedCollisions()`/`computedCollision(i)`.
  Config: `enableAutostep(maxH, minW, includeDynamic)`, `enableSnapToGround(d)`,
  `setMaxSlopeClimbAngle`, `setApplyImpulsesToDynamicBodies`, `setCharacterMass`.
- Joints: `JointData.spherical/revolute/fixed/rope/spring`; r3r hooks `useSphericalJoint` etc.
- Queries: `world.castRay(ray, maxToi, solid, filterFlags, filterGroups, filterCollider, filterRigidBody, filterPredicate)`,
  `castShape`, `intersectionsWithShape`.
- 0.19 removed the legacy PGS solver switches; `invPrincipalInertiaSqrt` was renamed to `invPrincipalInertia`.

**@react-three/rapier 2.2**
- `<Physics timeStep paused debug gravity>`, `useRapier()` → `{ world, rapier }`,
  `useBeforePhysicsStep`/`useAfterPhysicsStep`, `<RigidBody type colliders={false} ccd>`,
  collider components (`CuboidCollider`, `CapsuleCollider`, `BallCollider`, `TrimeshCollider`),
  `sensor` with `onIntersectionEnter/Exit`, `onCollisionEnter({ manifold, target, other })`,
  `InstancedRigidBodies` for many identical bodies.

**runek 0.13**
- Contract (see their CONTRACT.md): named PascalCase export plus `<Name>Props`; base props `position/rotation/seed`;
  pure and deterministic (`rng(seed)`, `sub(seed,n)`, never `Math.random`); geometry in `useMemo`; no assets;
  colliders proportional to gameplay surface; read `unit`/`palette` from `useWorld()`; instanced repeats;
  `Component.groundSitting = true` and `Component.surface` for walkable tops.
- `<World>` creates its own `<Canvas>` **and** `<Physics>`. For a game we need control of both (timestep,
  camera, `frameloop`). Plan: we **don't** use `<World>`; we provide `WorldContext` ourselves inside our
  own Canvas/Physics (a `TlmWorld` provider mirroring World's context value). Verify in Phase 1.
- CLI: `npx @runek/cli init` → `runek.config.json`; `add <names…> --dir src/runek` vendors source and
  rewrites `@runek/core` imports to a local copy. `check-world <file>` flags buried or floating nodes.
- Its catalog pins R3F 9 with React `<19.3`, but npm R3F 9.8.1 now allows `<19.4`. If install complains,
  use `overrides`.

## 9. Gotchas learned in Phase 1 (read before touching actors or sets)

1. **Create Rapier objects in effects, never `useMemo`.** StrictMode mounts, cleans up, and mounts
   again; a KCC made in `useMemo` and removed in cleanup is a freed WASM handle on the second mount.
   Use `game/systems/useKcc.ts`.
2. **Auto colliders arrive a commit late.** `colliders="cuboid"` (runek `Floor`, `Wall`) builds the
   collider after first render, so anything spawned on it in the same commit falls through. Floors
   under actors and dynamic props must use explicit collider components (`tlm/SetFloor.tsx`).
3. **Gameplay runs in `useBeforePhysicsStep` at `STEP = 1/60`,** visuals in `useFrame`. At 144 Hz,
   many render frames run zero physics steps, so per-frame `setNextKinematicTranslation` loses movement.
4. **Input presses are buffered (150 ms) and consumed** (`input.consume('dodge')`) by the step that
   uses them. Held state (`isDown`) is read directly.
5. **Rapier group tests are two-sided.** A query or contact needs (A.membership ∩ B.filter) and
   (B.membership ∩ A.filter). Ragdolls list PLAYER in their filter (so shots hit them) while the
   player's filter omits RAGDOLL (so Scarn never trips on bodies). See `game/systems/groups.ts`.
6. **Body type swaps:** after `setBodyType(Dynamic)`, mass props refresh on the next step, so use
   `setLinvel`/`setAngvel` for the launch, not impulses.
7. **Kinematic bodies aren't pushed by props.** Goons get knocked down explicitly from
   `onCollisionEnter` when a dynamic body's momentum exceeds a threshold.
8. **Don't add manual chunk groups for three/rapier:** Vite then modulepreloads them on the title
   page. The `lazy(() => import('./game/Game'))` split alone keeps the shell at ~83 KB gz, and the
   title prefetches the game chunk after 600 ms.
9. **npm `@runek/core@0.13.0` lags the registry's component source.** Core is vendored; re-vendor
   from the same commit as any newly `add`-ed components.
11. **Person writes every bone every frame.** Gameplay poses must go through `drive` (applied after
   its own animation in the same `useFrame`), never by writing bones from outside.
12. **Pointer lock:** the browser releases it on Esc and may or may not deliver the keydown. Esc is
   therefore "pause if running, resume if paused", and losing lock mid-take pauses. Headless QA can't
   take pointer lock, so QA scripts steer `sim.cam` through `window.__TLM2__`.
13. **Voice tooling without root:** Kokoro lives in a venv at `~/.cache/kokoro` (models in the same
   folder). ffmpeg is the static binary from `pip install imageio-ffmpeg`, symlinked to
   `~/.cache/kokoro/bin/ffmpeg`. `generate.py` takes `FFMPEG=` and no longer needs ffprobe.
14. **Cards don't autofocus buttons; keys go through our handlers.** A key that changes the
   screen (skipping the last line ends the scene, so the review mounts) would otherwise be applied by
   the browser as a click on the newly focused button. Handlers that act on Enter/Space call
   `preventDefault()`, and cards ignore keys for 700 ms after appearing (`CARD_KEY_GUARD_MS`).
15. **Never cancel scene scripts from effect cleanups.** React may run cleanups while the scene is
   still alive (hide/reconnect), which cancelled Scene 2's intro and froze Scarn. Scripts are cancelled
   by explicit actions only (retake, quit, next scene).
16. **Input buffering counts physics steps, not wall time** (`input.stepTick()`), so a slow render
   frame can't expire a press before any step has seen it.
17. **Scene scripts start through `useSceneScript`** (once per mount). StrictMode replays mount
   effects in dev, which started scripts twice and doubled their lines. Timers inside scripts use
   `makeScript().wait()`, so a retake cancels them.
18. **Screen-changing key handlers must `preventDefault()` Enter/Space.** Otherwise the browser's
   default activation "clicks" the newly autofocused button on the next screen (Enter on the end card
   went to the title and immediately started a new take).
10. *(Obsolete since ADR-11: the JS `-compat` build is gone; our crate's `.wasm` is a separate, streamed asset.)*
19. **Children clean up after `<Physics>` frees the world.** React runs a parent's cleanup before its
   children's, so bodies/colliders/KCCs are removed from a disposed world. `PhysicsWorld.raw` then returns
   an inert proxy (`DEAD_RETURNS`) instead of calling into freed Rust memory ("null pointer passed to rust").
20. **KCC grounding:** spawn characters 2 cm above the floor (`KCC_OFFSET`, the controller's skin) and send
   no downward motion while grounded, or rapier's KCC stalls on alternate frames and loses ~10% of movement.
21. **Sensors:** `kcc_move` always excludes sensors (or a character is blocked by its own trigger volumes).
   A fixed sensor vs a kinematic body needs `allPairs` (`ActiveCollisionTypes::all()`); moving sensors are
   kinematic bodies moved every step (`useMovingSensor`). The mop only cleans on steps where it moved, so QA
   must glide the player every frame (`tools/qa/sensors.mjs`), not teleport and dwell.
22. **`Poster` defaults to `position=[0, 1.5, 0]`.** Inside a group, pass `[0, 0, 0]` explicitly (the old
   hanging aisle signs floated 1.5 m above their strings).
23. **Metals need an environment map.** Without one, `metalness` > 0.5 renders near-black (carts,
   racking, ducts). `SceneEnvironment` (Stage) prefilters three's procedural `RoomEnvironment`;
   scenes raise or lower it with `useEnvironmentIntensity` (Aisle Five 0.28, default 0.12). It is
   also most of the scene's soft fill: giving it to metals only (to save compile time) darkened
   Scene 1 by 30–40% and didn't shorten the compile in a production build. Keep it scene-wide.
24. **Graphics tiers** (`game/systems/tier.ts`, `Post.tsx`): `high` (discrete GPUs) = N8AO + bloom +
   ACES + vignette + grain + the environment map, MSAA 4; `medium` (integrated GPUs: Intel, Apple
   base chips, AMD APUs, phones) drops N8AO and uses MSAA 2; `low` (SwiftShader/llvmpipe, i.e.
   headless QA) has no composer and no env map, and keeps every figure at runek's coarse build
   (`CastFigure`; detailed figures on the CPU rasterizer stretched frames to seconds);
   `?fx=off|low|medium|high` overrides. An Intel
   laptop got `high` before `medium` existed: 10 fps and a 10 s freeze. The tier is read once per
   page from a probe context, because it sets the canvas pixel ratio, and that must go through the
   Canvas's `dpr` prop (runek `World` `dpr`): R3F resets the ratio to the prop on every Canvas
   re-render (each pause), so `setDpr` from inside doesn't stick. Emitters that should glow
   use `toneMapped={false}` and colors above 1 (bloom threshold is 1). AgX was tried and flattened
   black suits to grey; ACES keeps the contrast.
25. **Fabric detail must fade early.** The Person surface detail fades once a period is under
   ~4 px (`rkFade`); at the 0.2–0.7 window it read as hard stripes on black cloth in close-ups.
26. **Never copy a body/collider ref at mount.** `<Physics>` may rebuild its world (StrictMode
   mounts it twice in dev), which recreates every body; `RigidBody` re-assigns its ref, but a copy
   made in a `[]` effect keeps the old, disposed one. Scarn's `sim.player.body/collider` went stale
   that way: teleports did nothing and goon bullets that hit the live capsule weren't counted. Read
   `ref.current` where it's used, or republish it every step (Scarn does now).
27. **Headless QA renders on the CPU (SwiftShader), ~1–5 fps.** The env map costs 2–3× there, so
   it's medium/high only; QA that depends on game time must wait on game state. For performance,
   use `tools/qa/perf.mjs`, which renders on the real GPU.
28. **three compiles a material the first time it's drawn, and the page blocks until the driver is
   done** (Scene 1: one 7–13 s frame on an Intel laptop, more as characters appeared). Each take now
   compiles behind a loading card (`Warmup` in Stage: world paused, script gate shut, see 31). Traps
   in three r184, all hit here:
   - Programs are keyed on the render target. With the post-processing composer the scene draws
     into a render target (no tone mapping, linear output), so compile with one bound, or every lit
     program compiles again on frame one.
   - R3F's `shadows` asks for `PCFSoftShadowMap`, which r184 swaps for `PCFShadowMap` inside its
     first shadow render; anything compiled before that bakes in `SHADOWMAP_TYPE_BASIC` and is
     thrown away. `RendererSetup` (Stage) sets `PCFShadowMap` up front.
   - `compileAsync` polls one program per material (missing its other variants) and throws from its
     timer if a material is disposed meanwhile (a retake mid-load). `Warmup` polls every program in
     `gl.info.programs` instead.
   - `debug.checkShaderErrors` reads each program's info logs on first use; every read waits for
     the GPU process to finish all queued work (seconds, in total). It's off; `?shaders=check`
     turns it on when working on shaders.
   - In Chrome on Linux (ANGLE over GL), `KHR_parallel_shader_compile` keeps the page responsive
     but the GPU process still compiles one program at a time (~100–250 ms each for a lit
     program). Load time scales with the number of distinct programs: keep variants down.
29. **No point light per fixture.** three unrolls the light loop into every lit shader: 9 point lights
   made each one ~81k characters and ~0.5–0.8 s to compile, and cost every pixel. Fixture light is
   emissive tubes (bloom) plus additive floor pools (`FluorescentRow`), one or two real point lights
   per scene at most.
30. **runek builds figures on workers** (local change, `person/scheduler.ts` + `figure.worker.ts`;
   main-thread slices only as a fallback). On the main thread the builds took ~6 s of Scene 1's load
   and stuttered play as detailed builds ran. The queue sorts by level then distance: while the world
   is paused no frame has measured anyone (distance ∞), and a single summed priority stopped every
   build (`∞ < ∞` is false). `whenFiguresIdle('far')` is how the warmup knows every figure has a body.
31. **Scene scripts go through `run()` (usually via `useSceneScript`), which waits for
   `stageReady()`**, so dialogue never plays over the loading card. The gate is shut in `Warmup`'s
   layout effect, which runs before the scene's (passive) effects start its script. The take's clock
   (`startedAt`) restarts when the card comes down. Never start a script another way.
32. **Every synthesized note and effect must disconnect itself when it ends** (`playInst`'s per-note
   bus, `releaseAfter` in `synth.ts`; `sfx.ts` `tone`/`noise`). The music is built live from
   oscillators, filters and waveshapers on Chrome's single audio thread, which also plays the voices.
   A stopped oscillator's gain/filter chain otherwise stays connected until garbage collection, and
   the audio thread keeps processing all of it: the Scene 3 montage held that thread at ~97% of a core
   on the title screen, and in-game it fell behind (audio clock at 0.35–0.8× real time), so voice
   lines broke up and took 2–3× their length. A source that `buildInst` creates must go through
   `osc()`/`noiseSrc()` (they register it with the note), and nothing in it may connect straight to an
   `audio.*` bus. Checks: `node tools/qa/music-load.mjs` (each song's audio-thread CPU on the title,
   budget 50% of a core) and `node tools/qa/voice-cuts.mjs` (Scene 3 on the real GPU: cut lines and
   seconds the audio clock fell behind). Mouse clicks never skip lines (Enter/E only): the mouse is
   the gun, the dodge and the click that captures it, and clicks cut lines nobody meant to skip.
33. **Loading is the GPU process's one thread.** On the Intel laptop (ANGLE/GL, Mesa) Chrome's GPU
   process compiles shader programs one after another, and the same thread presents the page's
   frames (`SwapBuffers`, `MakeCurrent`) and rasters its 2D canvases. A Chrome trace of Scene 1's
   load showed it at ~100% for ~10 s. So: (a) the loading card does not animate — a pulse made
   Chrome present every vsync, ~2.5 s of swaps that held the compiles back (~1.5 s of the load);
   (b) count programs, not milliseconds — `BREAKDOWN=1 VARIANTS=1 node tools/qa/perf.mjs` lists
   each and what split it (instancing, skinning, vertex colors, maps, double-sided, flat shading,
   clearcoat); (c) the figures' kinds share one program (`person/materials.ts`, VENDORED change 2);
   (d) the environment's RoomEnvironment renders unlit (`SceneEnvironment.tsx`: its lit walls
   compiled three full lit programs, synchronously, for one render); (e) a take that moves to a new
   set mid-take sets `take.location` in a layout effect, and the Stage runs the warmup again behind
   the card (Scene 3's lake: every material there is shadowed and the drive's are not — 14–16
   programs, a 1.7 s freeze on arriving, 5–6 s with the CPU busy). Measuring: time from the page's
   own `pointerdown` (Playwright can hold a click back ~10 s while the title settles), and check
   the machine is idle first (`uptime`): other jobs or power-saver mode double every number.
34. **A sign hangs in front of the surface you can see, not the wall's position.** A `Wall` is a
   slab centred on its position (0.2 thick: its faces are 0.1 either side), and a `WallSkin`'s paint
   is 0.106 in front of the wall's centre line. Twelve posters in Scenes 1–2 sat at or behind those
   (the Dundies, "0 days without an accident", WUPHF, the President's seal…): Scene 2's were inside
   their walls from the start, Scene 1's were flush until the wall paint covered them. Hang a poster
   0.014+ in front of the visible surface (its board is 0.011 deep) and clear of whatever stands in
   front of the wall (the back shelves are 2.1 tall). `sets.test.ts` fails any poster that is inside
   a wall, behind its paint, or facing it; `tools/qa/look.mjs` shoots any scene from given marks.

