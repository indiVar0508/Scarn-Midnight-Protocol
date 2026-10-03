import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `@shared` is the engine-agnostic code carried over from the 2D original (script, cast,
// audio, stores); `@runek/core` is runek's runtime, vendored (src/runek/core/VENDORED.md).
const shared = fileURLToPath(new URL('./src/shared', import.meta.url));
const runekCore = fileURLToPath(new URL('./src/runek/core/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': shared, '@runek/core': runekCore } },
  build: {
    target: 'es2022',
    // The lazy Game import splits three/r3f/rapier off the shell; rapier's chunk is big
    // because the -compat build inlines its WASM as base64.
    chunkSizeWarningLimit: 3500,
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
