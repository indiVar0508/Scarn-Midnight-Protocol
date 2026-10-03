# THREAT LEVEL MIDNIGHT: The Director's Cut
### A Michael Scarn Adventure, in 3D

*Michael Scott's homemade action movie, as a third-person 3D game shot on a cardboard set
where everything falls over.*

Every scene is a **take**. Play it, and Michael (who never gives less than an A) reviews it,
with three optional **Director's Notes** to chase. Do it again, funnier. Physics is the comedy
engine: shelves of copy paper topple, goons stand dazed for a beat and then remember to fall
over, and the coin that decides Scarn's fate is a real rigid body. Turn the camera around and
the Dunder Mifflin crew is watching the take from the bullpen.

> **Unofficial, non-commercial fan project.** *The Office* and *Threat Level Midnight* belong to
> their rights holders (NBCUniversal and the show's producers). This project is not affiliated
> with or endorsed by them. All art, music, sound, voice and dialogue here are original or
> paraphrased. No footage, episode audio, soundtrack, lyrics, actor likenesses or actor voices
> are used. Characters are stylized costume designs, and voices are stock synthetic TTS voices
> (never cloned).

## Scenes

| # | Scene | What you play |
|---|---|---|
| 1 | **Cleanup on Aisle Five** | A shoot-out in the Dunder Mifflin warehouse dressed as a supermarket: topple the FOOD pyramid, flatten goons with falling shelves, pose dramatically. Ends on the THREAT / LEVEL / MIDNIGHT slam and Stanley's newspaper montage. |
| 2 | **One Last Mission** | Samuel wakes Scarn at Scarn Manor (a condo). Explore, then the Oval Office (a conference room with a flag): dialogue choices with President Jackson and a best-of-seven physics coin flip. |
| 3 | **Cherokee Jack** | The drive (one backdrop, three captions), a frozen lake that is a tarp, Jack's van, and five training trials: mop, stick handling, targets (not Jack), cone slalom on ice, reflexes. |

More chapters follow the movie (the tryout, the Funky Cat, under the stadium, the hospital, the
betrayal, Do the Scarn, the All-Star Game). Progress and plans: [docs/v2/ROADMAP.md](docs/v2/ROADMAP.md).

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Look / aim | Mouse (click the game to capture it) | Right stick |
| Move | WASD | Left stick |
| Shoot | Left click | RT |
| Dodge roll | Space | B |
| Use / talk / skip a line | E · Enter | A |
| Dramatic pose | F | Y |
| Retake | R | Back |
| Pause | Esc | Start |

## Tech

React 19 + [React Three Fiber](https://r3f.docs.pmnd.rs/) 9, **[Rapier](https://rapier.rs) physics compiled
to WebAssembly** via `@react-three/rapier`, and **[runek](https://github.com/nullorder/runek)**
procedural components (characters are runek `Person` figures; sets are runek walls, tables and chairs plus
our own runek-style props in `src/tlm/`). No model or texture files: all geometry and art is generated in
code. Music and sound effects are synthesized live with Web Audio. Voice lines are pre-rendered with Kokoro TTS.

```
src/
  game/        Stage (Canvas + Physics), actors (Scarn, goons, cast figures), camera, systems
               (input, KCC, effects, dialogue, scripts), minigames (coin flip, training), scenes
  tlm/         Our runek-contract set pieces: paper shelves, poster/labels, office, home, lake props
  runek/       Vendored runek components + core (shadcn-style: we own the source)
  shared/      Engine-agnostic code from the 2D original: script and cast, audio, settings
  ui/          HUD, captions, choices, review card, scene wrap, voice audition
public/        Voice lines (MP3), fonts
legacy/        The original 2D Phaser game (archived, not deployed)
docs/v2/       Design spec, technical decisions + gotchas, roadmap and progress log
tools/         Playwright QA scenarios, voice pipeline (export, generate, audition)
```

## Development

```bash
npm ci
npm run dev           # http://localhost:5174
npm test
npm run build         # tsc + vite build → dist/
npm run qa            # Playwright smoke (dev server running); more in tools/qa/
```

Debug pages: `/?unlock=all` (every scene), `/?lineup` (the cast), `/?voices` (voice audition).

## Deploy (Vercel)

The repo root is a plain Vite app with `vercel.json`, so no special settings are needed:
import the repository on vercel.com/new and deploy. To deploy a branch other than `main` as
production, set **Settings → Environments → Production → Branch Tracking** to that branch.
Every other branch gets a preview URL on push.

## The original

The first version, a 2D Phaser game covering all eleven chapters, lives in [`legacy/`](legacy/README.md).
It is kept for reference and is not built or deployed.
