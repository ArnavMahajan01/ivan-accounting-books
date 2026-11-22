import { createHash } from 'node:crypto';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { contentSecurityPolicy } from './src/main/csp';

// React Fast Refresh injects one fixed inline script while developing. It is allowed by its
// hash, so the policy never allows inline scripts in general.
const refreshPreamble = react.preambleCode.replace('__BASE__', '/');
const refreshPreambleHash = `sha256-${createHash('sha256').update(refreshPreamble).digest('base64')}`;

export default defineConfig({
  main: {
    resolve: { tsconfigPaths: true },
  },
  preload: {
    resolve: { tsconfigPaths: true },
    build: {
      // A sandboxed preload must be one self-contained CommonJS file.
      externalizeDeps: false,
      rolldownOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
    },
  },
  renderer: {
    resolve: { tsconfigPaths: true },
    plugins: [react()],
    server: {
      headers: {
        'Content-Security-Policy': contentSecurityPolicy({
          development: true,
          scriptHashes: [refreshPreambleHash],
        }),
      },
    },
  },
});
