// Builds the spec 106 check (tools/google-check-run.ts) into dist/google-check, so plain Node can
// run it with the project's path aliases, as the ledger tool is built.
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    ssr: 'tools/google-check-run.ts',
    outDir: 'dist/google-check',
    emptyOutDir: true,
    target: 'node24',
    minify: false,
    rolldownOptions: { output: { entryFileNames: 'google-check-run.js' } },
  },
});
