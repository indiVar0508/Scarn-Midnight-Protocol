Vendored from github.com/nullorder/runek `packages/core/src` at commit
3995bf718cfb3834cbf38108048b162e7941b1ae (2026-10-02), MIT (see ../LICENSE).

Why: the npm `@runek/core@0.13.0` dist lags the registry's component source
(missing PlayerMotionContext, useGround, Walker, SurfaceDef, ...). `@runek/core`
is aliased here in vite.config.ts and tsconfig.json. Removed: WorldEditor/editor
(needs leva; we don't ship the editor). Tests not copied.
