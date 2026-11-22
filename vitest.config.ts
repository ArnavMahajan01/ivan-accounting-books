import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The path aliases are defined once, in tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        // React components, in a simulated page.
        extends: true,
        test: {
          name: 'renderer',
          include: ['src/renderer/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
