# TLM v2 — "Threat Level Midnight: The Director's Cut"
## Game design spec

> Status: living document. v1 (2D Phaser, 11 chapters, ~30 min linear story) is the shipped
> baseline: see `README.md` and `docs/DESIGN_BIBLE.md`. Everything in v1's Comedy Bible and
> content line still applies. This file only records what **changes** in v2 and why.

---

## 1. The one-sentence pitch

**You are the star of Michael Scott's homemade action movie, shot on a cardboard 3D set where
everything falls over. Every scene is a *take*. Michael rates it. Do it again, better, funnier.**

## 2. What v1 got right, and what keeps it from being sticky

v1 is a polished one-shot story (25–40 min). It's good, but nobody plays it twice:

| v1 trait | Problem for "addictive" | v2 answer |
|---|---|---|
| Linear chapters, a single pass | No reason to replay | **Takes**: each scene is short and graded, with 3 Director's Notes (optional goals) per scene |
| Rating "never goes below A" | Nothing to chase | Keep the joke (Michael never gives less than an A), but add **Clapper stars** (0–3) and **Dundies** to collect |
| Story beats with minigames | Fun once | Minigames become **score-attack scenes** with per-scene best times and scores |
| 2D sprites, scripted reactions | The slapstick is canned | **Rapier physics slapstick**: shelves topple, reams avalanche, goons ragdoll (late, of course), and the set walls wobble |
| Nothing to share | No virality | **Blooper Reel**: the last ~8 s of physics are always recorded; funny moments are auto-flagged and replayable (export to clip later) |
| Fixed content | Gets stale | **Daily Shoot**: a seeded daily remix of one scene with a "budget cut" modifier (runek's seeded determinism makes this cheap) |

## 3. Design pillars (in priority order)

1. **Readable and responsive first.** Rule zero from v1 stays: *the game is well made, the movie
   inside it is not.* Controls, camera and UI are never the joke. Inputs resolve within one
   frame, and the character controller is kinematic (crisp, not floaty).
2. **Physics is the comedy engine.** Every prop on set is a Rapier body that reacts. Big reactions
   cost nothing to author: knock a goon into a paper pyramid and the scene writes its own joke.
3. **Short loops, instant retry.** Scenes run 1–4 minutes. A failed take restarts in under a second
   with "CUT! TAKE 2" (v1's gag, now also the core loop).
4. **Michael's movie, the office's actors.** Same cast mapping and voices as v1 (reused
   `src/data/script`, `public/voice`). Sets are visibly an office pretending to be somewhere grander,
   and in 3D you can **see the edges of the set**: the camera pulls back at the end of a take to
   reveal the Dunder Mifflin office, crew and boom mic.
5. **Session-friendly.** It must be fun in 3 minutes on a phone and keep someone going for an hour on a laptop.

## 4. Core loops

```
 30-second loop   move → shoot/act → physics chaos → laugh → pose (style points)
 3-minute loop    a TAKE: play the scene → Michael's review card (time, style, notes ✓/✗, stars)
                  → "One more take" (instant) or "Print it!" (next scene)
 session loop     story progress (chapters unlock) + Dundies + costumes + Blooper Reel
 daily loop       Daily Shoot: one seeded scene remix, one try counted, local best (global board later)
```

### 4.1 Take rating (the review card)
- **Time**, **Style** (poses mid-action, chain knockdowns, prop chaos), **Accuracy**.
- **3 Director's Notes** per scene, e.g. "Knock over the FOOD pyramid", "Never stop moving while
  shooting", "Do a dramatic pose with three goons down at once". Each completed note = 1 clapper star.
- Michael's grade is always A or higher (A, A+, A++, "A, Oscar-worthy"). The stars carry the real signal.
- Stars unlock **Dundies** (achievements), costumes and deleted scenes.

### 4.2 Dundies (meta-progression)
Office-flavoured achievement categories, shown as a shelf of little trophies:
"Best Take", "Hottest Stunt in the Office", "Spicy Curry", "Whitest Sneakers", "Busiest Beaver",
"Don't Go in There After Me", "Fine Work", "Tight-Ass", and so on. Keep descriptions affectionate,
never mean (content line).

### 4.3 Unlocks
- **Costumes** (cosmetic, procedural): Agent Scarn tux (default), hockey kit, Prison Mike, Date Mike,
  Michael Klump, Santa Michael, Magic Mike. (Content line: no costume built on ethnic humour.)
- **Deleted scenes**: short bonus takes (the cut David Wallace scenes in the real full cut are a
  natural fit, as an "Office scene" referencing it, not reproducing it).
- **Set dressing**: once unlocked, props appear in later scenes (the stapler in Jell-O, the WUPHF banner).

### 4.4 Blooper Reel
- A ring buffer of body transforms (every 2nd physics step, ~8 s), cheap enough to keep always on.
- Auto-flag a "blooper" when total kinetic energy spikes, a goon flies far, or the player ragdolls.
- From the review card: **Watch blooper**, which replays from 3 cinematic angles, the way v1 replayed
  Toby's scene ("integral to the story").
- Later: export a clip via `MediaRecorder` on the canvas (WebM) for sharing.

### 4.5 Daily Shoot
- Seed = date. One scene and one **budget-cut modifier**: low gravity ("we couldn't afford gravity"),
  everything is beets, giant props, goons are cardboard cutouts, one-take only (no checkpoint),
  "Michael forgot the script" (random barks).
- Local best is stored per day. A global leaderboard (Vercel KV or Upstash) is out of scope until after launch.

### 4.6 Scope discipline (after review)
Retention is a **hypothesis** until Aisle Five proves people retake it voluntarily. Rules adopted:
- Stars persist as the **union of notes ever completed** (chase one note per take, no perfect run needed).
- Notes must need **different tactics** (Aisle Five: topple the pyramid, prop-flatten a goon, pose combo).
- Personal bests (time, style) are shown on the review card; anti-farming rules come before any leaderboard.
- Hockey, Daily Shoot, deleted scenes and the Blooper Reel wait until the slice is fun. The Blooper Reel
  needs entity lifetimes, poses and effects as well as transforms, so it starts with a single angle.

## 5. Camera and controls

- **Gameplay camera: third-person, over the right shoulder** (user direction, 2026-10-03; replaces
  the original 3/4 diorama plan). Mouse look via pointer lock (click to capture, Esc releases and
  pauses), right stick on pad. Scarn strafes relative to the camera and always faces where it looks;
  shots go to whatever is under the centre crosshair (red over a target). The camera pulls in while
  firing, and a spring arm keeps set walls from blocking the view. FOV 60°.
  Why it works for this game: in third person you can **turn around and see the crew**. The reverse
  shot is the Dunder Mifflin bullpen, where the coworkers are watching the take.
- **Cutscene camera: "movie camera."** Scripted dolly and cut shots with letterbox and VHS grain (v1's
  overlay look). Freeze frames with title stamps.
- **Set reveal**: at the end of each take the camera pulls back past the set walls to show the office, a
  boom mic and Michael in a director's chair.
- Controls: WASD + mouse (pointer lock), gamepad (left stick move, right stick look, RT fire). Touch
  needs a look-drag zone (to do). The dodge roll has i-frames. **Pose (F)** scores style.

## 5.1 Characters and set references (user direction, 2026-10-03)
- **Characters** are runek `Person` figures (procedural skinned humans) in the *stylized* proportion
  set, dressed per role in `v2/src/game/actors/cast.ts`: costume over each coworker's signature look
  (Scarn's black suit and slick hair, Samuel's glasses and tailcoat, Goldenface's gold face and black
  turtleneck, the goons' masks, shades and gold ties; out of costume, Pam's cardigan, Stanley's
  moustache and sweater, Angela's bun). They're stylized designs of fictional characters, **never actor
  likenesses**. Preview them all at `/?lineup` (or `/?lineup=scarn`).
- **Set references** in Aisle Five: Dunder Mifflin banner and logo-printed paper cases, "0 days without
  an accident", Pretzel Day, the Rabies Awareness Fun Run flyer, the Dundies, WUPHF.com, Schrute Farms
  beets, the baler, the forklift, Darryl's warehouse office, "World's Best Boss" mug at checkout, and
  "10 items or less (fewer — Oscar)". Behind the fourth wall: the bullpen with the crew (Kevin on camera,
  Pam on boom, Stanley doing the crossword, Oscar, Angela), Michael's director's chair, and a "NO
  LAUGHING ON SET — Pam" call sheet (the episode's screening gag).
- **Voices**: lines play during gameplay with captions ("SAMUEL L. CHANG · played by Dwight
  Schrute"). Recasting runs by ear through the audition page (`/?voices`), since only a person can judge
  "sounds more like". The voices are stock Kokoro TTS voices shaped toward each actor's register and
  energy. **No voice cloning of the real actors** (no consent; same line as v1).

## 6. Chapter plan for v2 (each chapter = 2–4 takes)

| # | Chapter | v2 take ideas (physics/3D angle) | Port priority |
|---|---|---|---|
| 1 | Cleanup on Aisle Five | Shoot-out in the paper warehouse: topple shelves of reams, "FOOD" pyramid, forklift, avalanche | **Vertical slice** |
| 2 | One Last Mission | Manor free-roam (physics props, trophies), Oval Office video call, coin flip with a real Rapier coin | P2 |
| 3 | Cherokee Jack | Training montage: mop the ice (friction), stick handling, target shooting (physics targets), obstacle skating | P3 |
| 4 | The Tryout | Speed-skating race (ice friction), skate-and-shoot, locker-room stealth. The player Scarn "kills" in the film was Oscar's hockey player; keep v1's non-violent version (Chad rolled in the flag) | P3 |
| 5 | The Funky Cat | Club exploration, tape-deck puzzle (reuse v1 React TapeDeck as-is), blow-dart escape | P4 |
| 6 | Under the Stadium | Stealth with 3D vision cones (Rapier ray casts for LOS), vents, keycards, then the Goldenface boss | P3 |
| 7 | The Hospital | Mash scene; the nurse gag; the bed physically tilts as you mash | P4 |
| 8 | The Betrayal | Auto-run hallway parkour with physics debris; rain from a watering can | P4 |
| 9 | Do the Scarn | Rhythm game (reuse v1 `chart.ts` and its audio-clock judge); 3D bar crowd joins in (runek `Person`) | P3 |
| 10 | NHL All-Star Game | **Real physics hockey**: Rapier puck on low-friction ice, boards, checks, super shot | **P2 (biggest fun payoff)** |
| 11 | Scarn Manor | Epilogue, credits, then the set reveal of the whole office crew applauding | P4 |

**Screening Mode** (v1) becomes the frame story from the real episode: Pam warns everyone not to
laugh, Holly is lukewarm, and Michael is hurt, then won over. Shown between chapters as a 3D
conference room with the staff on chairs.

## 7. Episode research addendum (beyond v1's bible)

Checked Oct 2026 against Wikipedia and IMDb:
- Episode S7E17 "Threat Level Midnight" (Feb 2011), written by B.J. Novak, from a concept by Steve
  Carell. "Go puck yourself!" and the Scarn rap were written by Charlie Grandy.
- Film cast also includes **Oscar** as the hockey player Scarn eliminates at the tryout, **Helene**
  (Pam's mom, played by Linda Purl) as the nurse, **Roy (David Denman), Kevin, Kelly and Toby** as the hostages,
  and **Pam as "Sandra"**. Karen and Jan return; Jan is Jasmine Windsong.
- Frame story: Pam asks the office not to laugh; the screening stops when reactions turn
  negative; Michael calls the film his "dream"; later he and Holly laugh through the finale together.
- Toby's dummy-head shot was the most expensive shot (a full face mold). v1 keeps it non-graphic, and so does v2.
- David Wallace scenes were filmed and cut; an Amy Adams scene was cut too. These are natural "deleted scene" unlocks
  (referenced only, with original dialogue).
- A ~25-minute full cut was released in 2019 (v1's Ch11 "Threat Level Noon" post-credits bit).

**Action items for the script (v2):** add Roy and Kelly to the hostage set (v1 has Pam, Kevin, Toby;
keep Pam since she's beloved, and add Kelly's chatter and Roy's grumbling as barks); make the tryout
rival Oscar (keep it non-violent); add the screening-room frame dialogue above. All dialogue stays
original or paraphrased (no transcripts, no lyrics).

## 8. Usability checklist (indie QA bar)

- First input within 5 s of pressing Play (lazy-load the 3D chunk behind the menu).
- Tutorial = Take 1 of Ch1, one verb at a time, with contextual hints per device (reuse v1 `controlsText`).
- Never more than 3 lines of dialogue before control returns, unless it's a cutscene the player opted into.
  Skip / fast-forward is always available.
- Retry under 1 s with no reload; the review card is skippable with one key.
- 60 fps target on a 2020 laptop iGPU; 30 fps floor on mid phones (DPR cap, shadow quality tiers).
- All v1 accessibility settings carry over (captions, reduced shake/flash, assist mode, remapping).
- Pause anywhere; auto-pause on tab hide.
