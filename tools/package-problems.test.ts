import { describe, expect, it } from 'vitest';
import { findPackageProblems, type PackagedFile } from './package-problems.ts';

const home = '/Users/sample-developer';
function file(path: string, content = 'ok', inDependency = false): PackagedFile {
  return { path, inDependency, read: () => Buffer.from(content) };
}

describe('findPackageProblems', () => {
  it('passes a clean package', () => {
    expect(
      findPackageProblems(
        [
          file('/app.asar/out/main/index.js'),
          file('/app.asar/node_modules/zod/tests/a.js', 'ok', true),
        ],
        home,
      ),
    ).toEqual([]);
  });

  it('finds the home path in any file, including dependencies and binaries', () => {
    expect(
      findPackageProblems(
        [
          file('/app.asar/out/main/index.js', `const p = "${home}/Desktop/x";`),
          file('/Contents/Frameworks/x.dylib', `\u0000\u0001${home}\u0000`, true),
        ],
        home,
      ),
    ).toEqual([
      { path: '/app.asar/out/main/index.js', reason: 'home-path' },
      { path: '/Contents/Frameworks/x.dylib', reason: 'home-path' },
    ]);
  });

  it('finds .env files anywhere', () => {
    expect(
      findPackageProblems(
        [file('/app.asar/.env'), file('/app.asar/node_modules/x/.env.local', 'ok', true)],
        home,
      ),
    ).toEqual([
      { path: '/app.asar/.env', reason: 'env-file' },
      { path: '/app.asar/node_modules/x/.env.local', reason: 'env-file' },
    ]);
    expect(
      findPackageProblems(
        [
          file('/app.asar/out/environment.js'),
          file('/app.asar/node_modules/dotenv/main.js', 'ok', true),
          file('/app.asar/my.env'),
        ],
        home,
      ),
    ).toEqual([]);
  });

  it.each(['tests', 'tools', 'references', 'wireframe', 'context'])(
    'finds the project folder %s in the app files',
    (folder) => {
      expect(findPackageProblems([file(`/app.asar/${folder}/a.txt`)], home)).toEqual([
        { path: `/app.asar/${folder}/a.txt`, reason: 'forbidden-folder' },
      ]);
    },
  );
});
