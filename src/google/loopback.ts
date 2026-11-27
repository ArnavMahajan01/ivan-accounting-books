// The one-time address Google's sign-in page sends the browser back to (spec 107,
// security-context.md "Google Access"): 127.0.0.1 only, a free port chosen by the Mac, one
// sign-in answer accepted, then closed. The page it shows says only to go back to the app.

import { createServer, type Server } from 'node:http';
import { err, ok, type Result } from '@shared/result';

/** The path the sign-in returns to. Anything else on the port gets "Not found". */
export const CALLBACK_PATH = '/signed-in';

const DONE_PAGE = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><title>Accounting Books</title>
<style>body{font:16px -apple-system,system-ui,sans-serif;margin:4rem auto;max-width:32rem;padding:0 1rem;color:#1d2a33}</style>
</head><body><h1>You can close this tab</h1><p>Go back to Accounting Books to finish.</p></body></html>`;

export interface Loopback {
  /** `http://127.0.0.1:<port>/signed-in`, given to Google as the redirect address. */
  readonly redirectUri: string;
  /** The address the browser came back to, or `timeout` if he never finished. Closes the port. */
  waitForCallback(timeoutMs: number): Promise<Result<URL, 'timeout'>>;
  close(): void;
}

export function openLoopback(): Promise<Result<Loopback, 'no-port'>> {
  return new Promise((resolve) => {
    let deliver: ((url: URL) => void) | null = null;
    let early: URL | null = null;
    const server: Server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method !== 'GET' || url.pathname !== CALLBACK_PATH) {
        response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
        return;
      }
      response
        .writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        })
        .end(DONE_PAGE);
      if (deliver === null) early = url;
      else deliver(url);
    });
    server.once('error', () => {
      resolve(err('no-port'));
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close();
        resolve(err('no-port'));
        return;
      }
      const close = () => {
        server.close();
        server.closeAllConnections();
      };
      resolve(
        ok({
          redirectUri: `http://127.0.0.1:${String(address.port)}${CALLBACK_PATH}`,
          close,
          waitForCallback: (timeoutMs) =>
            new Promise((done) => {
              const timer = setTimeout(() => {
                close();
                done(err('timeout'));
              }, timeoutMs);
              deliver = (url) => {
                clearTimeout(timer);
                close();
                done(ok(url));
              };
              if (early !== null) deliver(early);
            }),
        }),
      );
    });
  });
}
