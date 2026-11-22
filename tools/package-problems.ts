// What must never be inside the packaged app (spec 014, risk B2): the developer's home path in
// any file, a `.env` file anywhere, and the project's own tests, tools, private references or
// wireframes. Folder names are checked only in the app's own files, because dependencies may
// ship a folder called tests that is harmless.

export interface PackagedFile {
  /** Path inside the package, starting with `/`. */
  readonly path: string;
  /** True for files inside a dependency (`node_modules`). */
  readonly inDependency: boolean;
  readonly read: () => Buffer;
}

export interface PackageProblem {
  readonly path: string;
  readonly reason: 'home-path' | 'env-file' | 'forbidden-folder';
}

const FORBIDDEN_FOLDERS = new Set(['tests', 'tools', 'references', 'wireframe', 'context']);
const ENV_FILE = /(^|\/)\.env(\.[^/]*)?$/;

export function findPackageProblems(
  files: Iterable<PackagedFile>,
  homeDir: string,
): PackageProblem[] {
  const home = Buffer.from(homeDir, 'utf8');
  const problems: PackageProblem[] = [];
  for (const file of files) {
    if (ENV_FILE.test(file.path)) problems.push({ path: file.path, reason: 'env-file' });
    const segments = file.path.split('/').filter((s) => s !== '');
    if (!file.inDependency && segments.slice(0, -1).some((s) => FORBIDDEN_FOLDERS.has(s))) {
      problems.push({ path: file.path, reason: 'forbidden-folder' });
    }
    if (file.read().includes(home)) problems.push({ path: file.path, reason: 'home-path' });
  }
  return problems;
}
