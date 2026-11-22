import { defineConfig } from '@playwright/test';

// End-to-end tests drive the packaged app (`npm run test:e2e` packages it first).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
});
