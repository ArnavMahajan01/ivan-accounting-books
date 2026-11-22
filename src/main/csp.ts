// The content security policy for the app's pages (context/rules/desktop-app.md).
// No inline script is allowed, except named hashes: in development, the one fixed script
// that React Fast Refresh injects. The packaged app allows no inline script at all.

export interface CspOptions {
  /** Development loosens only what the Vite dev server needs: its live-reload socket and inline styles. */
  readonly development: boolean;
  /** `sha256-...` hashes of inline scripts allowed by exact content. */
  readonly scriptHashes?: readonly string[];
}

export function contentSecurityPolicy({ development, scriptHashes = [] }: CspOptions): string {
  const hashes = scriptHashes.map((h) => `'${h}'`);
  const directives: Record<string, readonly string[]> = {
    'default-src': ["'none'"],
    'script-src': ["'self'", ...hashes],
    // Vite injects imported CSS as <style> tags while developing. Built CSS is a file.
    'style-src': development ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': development ? ["'self'", 'ws://localhost:*', 'ws://127.0.0.1:*'] : ["'self'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}
