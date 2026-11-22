import { describe, expect, it } from 'vitest';
import { resolveAppFile } from './app-protocol';

const root = '/app/out/renderer';

describe('resolveAppFile', () => {
  it.each([
    ['app://bundle/', '/app/out/renderer/index.html'],
    ['app://bundle/index.html', '/app/out/renderer/index.html'],
    ['app://bundle/assets/index-abc.js', '/app/out/renderer/assets/index-abc.js'],
    ['app://bundle/assets/a%20b.css', '/app/out/renderer/assets/a b.css'],
  ])('maps %s into the renderer folder', (url, file) => {
    expect(resolveAppFile(root, url)).toBe(file);
  });

  it('keeps dot segments inside the folder, since the URL parser resolves them first', () => {
    expect(resolveAppFile(root, 'app://bundle/../package.json')).toBe(
      '/app/out/renderer/package.json',
    );
    expect(resolveAppFile(root, 'app://bundle/%2e%2e/%2e%2e/etc/passwd')).toBe(
      '/app/out/renderer/etc/passwd',
    );
  });

  it.each([
    'app://bundle/..%2f..%2fpackage.json',
    'app://bundle/assets/..%2f..%2f..%2fsecret',
    'app://bundle/%00',
    'app://bundle/%E0%A4%A',
    'app://other/index.html',
    'file:///app/out/renderer/index.html',
    'https://bundle/index.html',
    'not a url',
  ])('refuses %s', (url) => {
    expect(resolveAppFile(root, url)).toBeNull();
  });
});
