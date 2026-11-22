import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from './csp';

describe('contentSecurityPolicy', () => {
  it('allows no inline script or eval in the packaged app', () => {
    const csp = contentSecurityPolicy({ development: false });
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('ws:');
  });

  it('allows inline scripts in development only by exact hash, never in general', () => {
    const csp = contentSecurityPolicy({ development: true, scriptHashes: ['sha256-abc='] });
    expect(csp).toContain("script-src 'self' 'sha256-abc='");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("connect-src 'self' ws://localhost:*");
  });
});
