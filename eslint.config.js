import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// Allowed import directions (context/architecture-context.md, "System Boundaries").
// Each layer may import itself and the layers listed. Anything not listed is a lint error.
const allowedImports = {
  shared: [],
  domain: ['shared'],
  import: ['shared', 'domain'],
  data: ['shared', 'domain', 'import'],
  services: ['shared', 'domain', 'import', 'data'],
  google: ['shared', 'domain', 'import', 'data', 'services'],
  backup: ['shared', 'domain', 'import', 'data', 'services'],
  main: ['shared', 'domain', 'import', 'data', 'services', 'google', 'backup'],
  // The bridge contract is in src/shared, so preload and renderer need nothing else.
  preload: ['shared'],
  renderer: ['shared'],
};
const layers = Object.keys(allowedImports);
const pureLayers = ['domain', 'import'];
const seeBoundaries = 'See context/architecture-context.md, "System Boundaries".';
// Network clients. Add any new one here in the spec that installs it.
const networkModules = [
  'http',
  'https',
  'http2',
  'net',
  'tls',
  'dgram',
  'dns',
  'undici',
  'axios',
  'node-fetch',
  'googleapis',
  'google-auth-library',
  '@googleapis/*',
];
// Floats drift by cents (risk L2). Money goes through src/shared/money.ts only.
const moneyMessage = 'Floats drift by cents. Use parseCents and formatCents from @shared/money.';
const floatMoneyGlobals = [{ name: 'parseFloat', message: moneyMessage }];
const floatMoneyFiles = [
  'src/domain/**/*.ts',
  'src/import/**/*.ts',
  'src/services/**/*.ts',
  'src/shared/money.ts',
];

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'out/',
      'dist/',
      'release/',
      'coverage/',
      'context/',
      'wireframe/',
      'references/',
      '.claude/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/root-path': import.meta.dirname,
      'boundaries/elements': layers.map((type) => ({ type, pattern: `src/${type}` })),
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          message: `{{from.element.types.[0]}} may not import {{to.element.types.[0]}}{{to.module.source}}. ${seeBoundaries}`,
          // The last matching policy wins, so the bans come after the allows.
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            ...layers.map((type) => ({
              from: { element: { type } },
              allow: { to: { element: { type: [type, ...allowedImports[type]] } } },
            })),
            {
              from: { element: { type: pureLayers } },
              disallow: { to: { module: { origin: 'core' } } },
              message: `{{from.element.types.[0]}} is pure and may not import the Node module {{to.module.source}}. ${seeBoundaries}`,
            },
            {
              from: { element: { type: ['domain', 'import', 'renderer'] } },
              disallow: { to: { module: { source: networkModules } } },
              message: `{{from.element.types.[0]}} may not import the network module {{to.module.source}}. ${seeBoundaries}`,
            },
            {
              from: { element: { type: 'renderer' } },
              disallow: { to: { module: { origin: 'core' } } },
              message: `renderer may not import the Node module {{to.module.source}}. It reaches the main process only through the bridge. ${seeBoundaries}`,
            },
            {
              from: { element: { type: layers.filter((t) => t !== 'main' && t !== 'preload') } },
              disallow: { to: { module: { source: 'electron' } } },
              message: `{{from.element.types.[0]}} may not import electron. Only main and preload may. ${seeBoundaries}`,
            },
            {
              from: { element: { type: layers.filter((t) => t !== 'data') } },
              disallow: { to: { module: { source: 'better-sqlite3' } } },
              message: `{{from.element.types.[0]}} may not import better-sqlite3. Only data talks to SQLite. ${seeBoundaries}`,
            },
          ],
        },
      ],
    },
  },
  {
    files: floatMoneyFiles,
    rules: {
      'no-restricted-globals': ['error', ...floatMoneyGlobals],
      'no-restricted-properties': [
        'error',
        { object: 'Number', property: 'parseFloat', message: moneyMessage },
        { property: 'toFixed', message: moneyMessage },
      ],
    },
  },
  {
    // Pure layers get every value from their caller: no clock, no randomness, no network.
    // This block replaces no-restricted-globals for these files, so it repeats the money ban.
    files: pureLayers.flatMap((t) => [`src/${t}/**/*.ts`]),
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: 'Pure code may not read the clock. Take a Clock or a date as an argument.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Pure code may not read the clock. Take a Clock or a date as an argument.',
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: 'Pure code may not read the clock. Take a Clock or a date as an argument.',
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Pure code may not use randomness. Take the value as an argument.',
        },
      ],
      'no-restricted-globals': [
        'error',
        ...floatMoneyGlobals,
        { name: 'fetch', message: 'Pure code may not use the network.' },
        { name: 'XMLHttpRequest', message: 'Pure code may not use the network.' },
        { name: 'WebSocket', message: 'Pure code may not use the network.' },
      ],
    },
  },
  {
    // Development scripts may print to the terminal.
    files: ['tools/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
