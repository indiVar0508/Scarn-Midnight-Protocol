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

### ADR-1: "WASM + Rapier + runek" means R3F + rapier.js, not a Rust rewrite
- **Context:** The user asked for a WASM-based game using Rapier and runek components.
- **Options:** (a) Rust plus Bevy/Rapier compiled to WASM; (b) React Three Fiber plus `@react-three/rapier`
  (Rapier's official WASM build) plus runek.
- **Decision:** (b). runek is a React Three Fiber library built on `@react-three/rapier`, so only (b) can use
  it. (b) also keeps v1's React shell, audio engine, script data and voice pipeline (about half of v1's code)
  usable. The physics is Rapier, running as WASM.
- **Consequence:** Gameplay logic stays in TypeScript. If profiling ever shows a hot CPU path
  (unlikely at this scale), a small Rust crate built with `wasm-pack` can be added for that path alone.

### ADR-2: v2 is a separate app in `v2/`; v1 stays at the repo root and stays deployed
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

## 3. Directory layout (v2)

```
v2/
  index.html, package.json, vite.config.ts, tsconfig.json, runek.config.json
  src/
    main.tsx, App.tsx
    runek/            vendored runek components (CLI-managed; edit freely, we own them)
    tlm/              TLM-specific runek-contract components (PaperShelf, ReamPyramid, Forklift,
                      CheckoutCounter, ConferenceTable, FlagStand, HockeyRink, …)
    sets/             WorldData JSON per set (+ registry.ts mapping type → component)
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
- 60 fps on an integrated GPU at 1080p with DPR capped at 1.5; mobile DPR 1 and 30 fps floor.
- One shadow-casting directional light (2048 shadow map desktop, 1024 mobile); the rest are baked-looking flat colours.
- Instanced meshes for reams, crowd, debris; target ≤ 150 draw calls per scene.
- The 3D chunk (three + r3f + rapier ≈ 1.5–2 MB gz incl. wasm) is lazy-loaded after the menu paints.

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
10. **The `-compat` Rapier build inlines its WASM** (~840 KB gz of the 1.16 MB gz game chunk). If load
   time matters, switch to `@dimforge/rapier3d` (separate .wasm, streaming compile), which needs
   `vite-plugin-wasm` and the right MIME type on Vercel.
