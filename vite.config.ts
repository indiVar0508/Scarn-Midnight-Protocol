import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `@shared` is the engine-agnostic code carried over from the 2D original (script, cast,
// audio, stores); `@runek/core` is runek's runtime, vendored (src/runek/core/VENDORED.md).
const shared = fileURLToPath(new URL('./src/shared', import.meta.url));
const runekCore = fileURLToPath(new URL('./src/runek/core/index.ts', import.meta.url));
// `@react-three/rapier` is our facade over the Rust rapier3d build (src/physics, crates/tlm-physics),
// so runek's components and runek's <World> run on it unmodified. No JS rapier is bundled.
const rapierFacade = fileURLToPath(new URL('./src/physics/react.tsx', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': shared, '@runek/core': runekCore, '@react-three/rapier': rapierFacade } },
  build: {
    target: 'es2022',
    // The lazy Game import splits three/r3f off the shell; the physics .wasm is a separate,
    // hashed asset fetched (and compiled while streaming) when the game loads.
    chunkSizeWarningLimit: 1500,
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
