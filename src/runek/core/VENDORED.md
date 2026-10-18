Vendored from github.com/nullorder/runek `packages/core/src` at commit
fea75146 (0.14.0, 2026-10-07; first vendored at 3995bf71, 2026-10-02), MIT (see ../LICENSE).

Why: the npm `@runek/core@0.13.0` dist lags the registry's component source
(missing PlayerMotionContext, useGround, Walker, SurfaceDef, ...). `@runek/core`
is aliased here in vite.config.ts and tsconfig.json. Removed: WorldEditor/editor
(needs leva; we don't ship the editor). Tests not copied. Only the components we place are
vendored (`Bookshelf` was dropped: unused, and its book `href` navigates without a scheme check).

Components in `src/runek/` come from the same commit. Local changes; re-apply them when
re-vendoring (`diff` the upstream file against ours at the previous commit, then `patch`):
1. `Person.tsx`: the `drive` prop (gameplay aim/pose/recoil over runek's animation, bones and
   eye position published for props).
2. `person/materials.ts`: procedural surface detail on the shared figure materials (wool twill
   and drape folds, knit ribs, denim twill and slubs, leather grain, hair strands, skin pores),
   a solid texture over the bind-pose position with a screen-space bump that fades before it
   aliases. Every kind's pattern is in one shader, chosen by the `rkKind` uniform (skin's light
   wrap is the `rkWrap` uniform), so the kinds with the same lighting features share one program
   instead of compiling one each (~0.5 s of loading per program on an Intel laptop GPU). Tests in
   `person/materials.test.ts`. Candidate to upstream.
3. `person/scheduler.ts` + new `person/figure.worker.ts`: figure builds run on a pool of up to four
   workers (main-thread slices remain as the fallback); the queue compares level of detail before
   distance, because a figure no frame has measured yet is infinitely far and a single summed
   priority (`∞ < ∞`) never picked anything while the world was paused; `whenFiguresIdle(lod?)`
   resolves when no build (of that level) is pending. Tests in `person/scheduler.test.ts`.
   Candidates to upstream.
4. `core/World.tsx`: `gl` (extra WebGL context attributes, e.g. `powerPreference`) and `dpr` props,
   passed to the Canvas.

