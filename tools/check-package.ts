// Fails the build if private or development files got into the packaged app (spec 014).
// Run by `npm run package` after electron-builder. Prints paths and reasons, never contents.
// Usage: node tools/check-package.ts [path/to/App.app]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { extractFile, listPackage, statFile } from '@electron/asar';
import { findPackageProblems, type PackagedFile } from './package-problems.ts';

const productName = (JSON.parse(readFileSync('package.json', 'utf8')) as { productName: string })
  .productName;
const appPath = process.argv[2] ?? join('release', 'mac-arm64', `${productName}.app`);

function* filesOnDisk(dir: string, root: string): Generator<PackagedFile> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      yield* filesOnDisk(full, root);
    } else if (entry.isFile()) {
      const path = `/${relative(root, full)}`;
      const unpacked = path.split('/app.asar.unpacked/')[1];
      yield {
        path,
        // Electron's own framework is not ours, but it is scanned for the home path too.
        inDependency: unpacked === undefined || unpacked.startsWith('node_modules/'),
        read: () => readFileSync(full),
      };
    }
  }
}

function* filesInArchive(archive: string): Generator<PackagedFile> {
  for (const path of listPackage(archive, { isPack: false })) {
    const stat = statFile(archive, path.slice(1));
    if (!('size' in stat)) continue;
    yield {
      path: `/app.asar${path}`,
      inDependency: path.startsWith('/node_modules/'),
      read: () => extractFile(archive, path.slice(1)),
    };
  }
}

function* allFiles(): Generator<PackagedFile> {
  yield* filesOnDisk(appPath, appPath);
  yield* filesInArchive(join(appPath, 'Contents', 'Resources', 'app.asar'));
}

if (!statSync(appPath, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`No packaged app at ${appPath}. Run npm run package first.`);
  process.exit(1);
}

let count = 0;
const problems = findPackageProblems(
  (function* () {
    for (const file of allFiles()) {
      count += 1;
      yield file;
    }
  })(),
  homedir(),
);

if (problems.length > 0) {
  console.error(`Package check failed: ${String(problems.length)} problem(s) in ${appPath}`);
  for (const p of problems) console.error(`  ${p.reason}: ${p.path}`);
  process.exit(1);
}
console.log(
  `Package check passed: ${String(count)} files in ${appPath}, none with a private or development file.`,
);
