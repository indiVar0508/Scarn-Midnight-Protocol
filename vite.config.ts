import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Static SPA build for Vercel. Phaser is split into its own chunk so the
// shell (menus) can paint while the engine downloads.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
