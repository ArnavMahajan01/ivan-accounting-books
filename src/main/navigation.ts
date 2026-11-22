// Which addresses the window may show. Compares scheme and host, never origin strings, which can
// match for file:, data: and javascript: addresses (context/rules/desktop-app.md).

import { APP_HOST, APP_SCHEME } from './app-protocol';

/** `devServerUrl` is the Vite dev server in development, and null in a built app. */
export function isAppUrl(candidate: string, devServerUrl: string | null): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (devServerUrl !== null) {
    const dev = new URL(devServerUrl);
    return url.protocol === dev.protocol && url.host === dev.host;
  }
  return url.protocol === `${APP_SCHEME}:` && url.host === APP_HOST;
}
