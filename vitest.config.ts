import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The path aliases are defined once, in tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
