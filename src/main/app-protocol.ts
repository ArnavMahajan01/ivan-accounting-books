// The packaged screens load from a private `app://bundle/` scheme instead of file:// (Electron
// security checklist, item 18), so a page can only reach the app's own files.

import { isAbsolute, join, normalize, relative } from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'bundle';
export const APP_ENTRY_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;

/**
 * Maps an `app://bundle/...` URL to a file inside `rootDir`, or null if the URL is not the app's,
 * or tries to leave `rootDir` (for example with `..` or an encoded slash).
 */
export function resolveAppFile(rootDir: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const file = normalize(join(rootDir, pathname === '/' ? '/index.html' : pathname));
  const inside = relative(rootDir, file);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) return null;
  return file;
}
