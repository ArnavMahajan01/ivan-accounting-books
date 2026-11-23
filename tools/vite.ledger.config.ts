// Builds the ledger tool (tools/ledger-run.ts) into dist/ledger, so plain Node can run it: the
// project's path aliases and the migration files are resolved by Vite, as in the app.
// Dependencies such as better-sqlite3 stay outside the file and load from node_modules.
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    ssr: 'tools/ledger-run.ts',
    outDir: 'dist/ledger',
    emptyOutDir: true,
    target: 'node24',
    minify: false,
    rolldownOptions: { output: { entryFileNames: 'ledger-run.js' } },
  },
});
