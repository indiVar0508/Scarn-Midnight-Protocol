# Scene 2 pass: One Last Mission, less dull — design

Status: approved in chat 2026-10-19, written for review. Scene 3 gets its own pass after the user has
played this one ("one scene at a time").

## Why

User, 2026-10-19: "scene 2 and scene 3 are currently a bit dull tbh". Asked what dull means, they
picked all four: the sets look bare, the lighting is flat, there's not much to do, and it feels
lifeless (the crew and extras just stand there). The same day five of Scene 2's signs turned out to
have been inside their walls since v2 began (TECH gotcha 34); that fix is done and is the baseline.

**Done means** the manor and the Oval Office read as dressed sets full of Office and movie jokes,
each room gives the player a job, the crew is visibly on set and reacts, and the light says what
time of day it is, while Scene 2 still loads in about the same time on the user's Intel laptop.

## Limits (hard)

- **Load time:** Scene 2 card-down ≤ 7.0 s on the idle laptop (6.4–6.5 s on 2026-10-18), measured
  with `node tools/qa/perf.mjs` from the real click. At most 3 new shader programs per room
  (`BREAKDOWN=1 VARIANTS=1`). New props reuse existing materials: `MeshStandardMaterial` with or
  without a map, no glass/transmission, no new double-sided or flat-shaded variants.
- **Lights:** no new shadow-casting lights and no net new point lights in either room (each point
  light makes every lit shader bigger, TECH §5). Mood comes from colour, strength and direction.
- **Figures:** no new figures. Samuel (manor) and Angela (office) already stand in the sets; they
  move from set data into scene code so they can walk.
- **Physics:** walking figures use our rapier crate's character controller (`useKcc`, as `Goon`
  does), never hand-rolled collision (ADR-11).
- **Voices:** new lines use stock Kokoro voices through `npm run voice:export && voice:generate`.
  Angela needs a new speaker with a stock voice; the user can swap it on `/?voices`. No cloning.
- **Tone:** affectionate, never mean (v1 Comedy Bible). The lines below are drafts.

## 1. Sets and references

All of it is set data (`src/sets/scarn-manor.world.json`, `oval-office.world.json`) through
existing registry components, plus two small new ones in `src/tlm/HomeProps.tsx`. Every sign passes
the wall check in `sets.test.ts`.

**Scarn Manor** (Michael's condo; the narrator already says "It is a condo"):

| Prop | Where | Made of |
|---|---|---|
| Window with blinds, painted skyline, a sticky note "(it is a condo)" | west wall, z ≈ -0.9, sill 0.9 m | new `CondoWindow`: canvas skyline texture (as `labels.ts` draws) + `Box` slats |
| The tiny plasma TV, "PLASMA" sticker | on a stand by the TV fireplace | `Box` + `Poster` screen |
| "Serenity by Jan" candles (3), lit | sideboard, beside the trophies | `Disc`/cylinders, emissive flame cones, `Poster` label |
| "Somehow I Manage" by Michael Scott | coffee table, by the agent mug | `Box` + `Poster` cover |
| The cape Samuel ironed (line `s2`) on a coat rack | back-right corner by the door | new `CoatRack`: pole + draped `Box` cape |
| Hair gel jar, "INDUSTRIAL STRENGTH" | shelf over the beet tub | cylinder + `Poster` label |
| Gadget wall on the back of the TV fireplace | revealed by a flip (§3) | `Poster` pegboard with painted gadget outlines |

New inspectables (each a line, and none needed for the tour star): the cape, the book, the candles,
the window, the plasma TV.

**The Oval Office** (a conference room):

| Prop | Where |
|---|---|
| Hand-lettered "OVAL OFFICE" with "(the white house)" under it (v1's sign) | back wall, left of the seal |
| "TOP SECRET MEETING — DO NOT BOOK" | taped on the door side |
| "Room also booked by: PARTY PLANNING COMMITTEE" (Angela's committee) | under the meeting sign |
| Window blinds | east wall |
| A printed presidential portrait, "(printed from the internet)" | west wall |

## 2. Lighting

Same light count per room (the manor loses one: the ceiling point light goes).

- **Manor: morning** (line `n1`). The shadow light becomes low, warm sun from the west window
  (≈ #ffd9a8), the hemisphere cooler and dimmer, the lamp off. Light shafts through the blinds with
  drifting dust (`LightShafts` and `DustMotes` from the warehouse, placed in a rotated `Group`).
  The TV fireplace keeps its glow; the candles bloom on the medium tier.
- **Oval Office: "Threat Level... Midnight."** Flat office light until line `p6`. On it, the room
  drops to one hard key on the President (fill and hemisphere down, key up and cool), holds through
  the slam, then eases back. A light cue the scene script sets, eased per frame (uniforms only, no
  new programs).

## 3. More to do

**Suit up (manor).** The objective becomes a checklist and the door opens only when it's done:

> SUIT UP: HAIR GEL · GOOD TIE · THE GUN — THEN THE DOOR

Each item gets a ✓ as it's done (the objective text is computed from the checklist: no new HUD
part). Using the door early gets a Samuel line instead of the exit.

1. **Hair gel**: pick up the jar over the beet tub. A line from Scarn ("Aisle five" callback).
2. **Good tie**: ask Samuel (the existing `leave` line, "Samuel. Get my good tie.", moves here; the
   door gets a new exit line). He walks off set through the fourth wall to the wardrobe rail on the
   crew side, comes back, and hands it over: "Your good tie, sir. ...It is the tie you are wearing."
   Scarn's figure already wears it, so this is a timing gag, not a costume change.
3. **The gun**: after inspecting the TV fireplace (line `fire`), it becomes "Check behind the TV".
   The screen swings round on its stand (0.6 s) to show the gadget wall; take the gun and Scarn is
   armed for the rest of the manor (`<Scarn armed>`). The office stays unarmed, as now.

The tour star (inspect everything) and the beet star stay as they are.

**The hotline (office, before sitting).** The red stapler on the desk becomes usable:

> SCARN: The hotline. Direct to the Kremlin. · PRESIDENT: That's a stapler, man. · SCARN: ...Hello? Kremlin?

**The interruption (office, after the first choice).** Angela walks onto the set from the crew side,
through the fourth wall:

> ANGELA: Excuse me. Party Planning has this room at two. · PRESIDENT: Angela, we're saving America.

A three-way choice: "This is a matter of national security."; "[Offer her the coin.]"; "Kevin's
birthday is safe with me." The first two get her to leave in a huff; the third sends her off
pleased and earns a new star, **"Make peace with the Party Planning Committee"** (fourth note in
`registry.data.ts`). Then the briefing carries on at `p2`.

## 4. Life

- **Samuel follows Scarn** around the manor at butler distance (≈1.5 m, behind and to the side),
  stops when close, and turns to face him. Idle for ~25 s and he nags (`samuelTalk` plus two new
  lines). He leaves his follow to fetch the tie.
- **The crew reacts** when a gag lands: Kevin giggles (his figure shakes and the camera on its
  tripod jitters with him), and sometimes Pam turns and shushes him ("NO LAUGHING ON SET" was hers
  in Scene 1). One reaction at most every ~12 s, and not on every gag, so it stays a surprise.
  Triggers: the inspect lines, the rebel choice, the hotline, a coin landing on its edge or
  rolling off. Mechanism: a small `crew` event module the scene calls (`crew.react('laugh')`); the
  set registry's `Cast` and `BoomMic` listen by `who`, so Scenes 1 and 3 get it for free later.
- **The boom dips into shot** now and then and jerks back up.
- **Set motion:** the TV fire flicker (exists), dust in the sunbeams, the candle flames.

## 5. Also fixed along the way

The office is a new set mid-take but doesn't say so, so its programs compile on its first frame.
It sets `take.location` in a layout effect like Scene 3's lake (TECH gotcha 33 e), so it warms up
behind the loading card instead of freezing on entry.

## Testing

- **Unit:** the suit-up checklist (objective text, door gating) and the crew reaction limiter as
  pure functions with tests; `sets.test.ts` for every new prop (registered, on the floor, signs
  proud of walls).
- **Playthrough:** `tools/qa/scene2.mjs` does the suit-up, the hotline and Angela's choice and still
  reaches the wrap, the mission card and the end card; it checks the new star is awarded.
- **Load:** `tools/qa/perf.mjs` for Scene 2 against the limits above, on the idle laptop.
- **Look:** `tools/qa/look.mjs` shots of both rooms before and after, from the same marks.
- **Voices:** every new line is in `public/voice/manifest.json` and plays at its recorded length.
- **Review:** Codex reviews the change; its findings are fixed or answered before handing over.

## Out of scope

Scene 3 (its own spec after this ships), a timed or physics-heavy suit-up (the user chose the
recommended level), changes to existing voices, and new figures.
