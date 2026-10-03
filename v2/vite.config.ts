import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// v2 shares v1's engine-agnostic modules (script, cast, audio, stores) through
// the `@v1` alias and v1's public/ (voice lines, fonts) as its public dir.
const v1 = fileURLToPath(new URL('../src', import.meta.url));
const runekCore = fileURLToPath(new URL('./src/runek/core/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: '../public',
  resolve: { alias: { '@v1': v1, '@runek/core': runekCore } },
  server: { fs: { allow: ['..'] } },
  build: {
    target: 'es2022',
    // The lazy Game import splits three/r3f/rapier off the shell; rapier's chunk is big
    // because the -compat build inlines its WASM as base64.
    chunkSizeWarningLimit: 3500,
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
