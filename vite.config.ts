import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base keeps the build portable: it works from a GitHub Pages
  // project subpath, a custom domain, or a plain file server.
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
