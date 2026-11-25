import { defineConfig } from '@playwright/test';

// The layout sweep drives the built app, unpackaged, at several window sizes
// (`npm run test:layout` builds it first).
export default defineConfig({
  testDir: 'tests/layout',
  timeout: 180_000,
  workers: 1,
  reporter: 'list',
});
