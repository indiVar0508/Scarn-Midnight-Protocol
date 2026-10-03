# TLM v2: start here

The next version of the game: **3D, physics-driven, replayable**. Built with React Three Fiber,
Rapier (WASM, via `@react-three/rapier`) and runek procedural components. It lives in `v2/` while v1
keeps running from the repo root.

| Doc | What's in it |
|---|---|
| [GAME_DESIGN.md](GAME_DESIGN.md) | Pitch, pillars, the take loop, Dundies, Blooper Reel, Daily Shoot, camera, chapter plan, episode research addendum, usability bar |
| [TECH.md](TECH.md) | Stack and versions, ADRs (why R3F + rapier.js, why `v2/`, sets as runek WorldData, custom KCC, hitscan), layout, physics conventions, perf budget, deploy, library notes |
| [ROADMAP.md](ROADMAP.md) | Phased checklist and **progress log**. Resume from here |

Quick commands:

```bash
cd v2 && npm install && npm run dev     # http://localhost:5174 (Scene 1: Aisle Five)
npm test                                # vitest
npm run qa                              # Playwright smoke + take-loop scenarios (dev server running)
npm run build && npm run preview        # production build on :4174
```

Controls: WASD move · mouse aim · click shoot · Space roll · F pose · R instant retake · Esc pause.
