// Spec 020: colours are written only in src/renderer/styles/tokens.css. Every other renderer
// file uses the tokens. Also checks that the two dark blocks in tokens.css match.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RENDERER = 'src/renderer';
const TOKENS = join(RENDERER, 'styles', 'tokens.css');
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return files(path);
    return /\.(css|tsx?|html)$/.test(e.name) ? [path] : [];
  });
}

function rawColours(text: string): string[] {
  return [...text.matchAll(RAW_COLOUR)].map((m) => m[0]);
}

describe('raw colours', () => {
  it('appear only in tokens.css', () => {
    const offenders = files(RENDERER)
      .filter((f) => f !== TOKENS)
      .flatMap((f) => rawColours(readFileSync(f, 'utf8')).map((c) => `${relative('.', f)}: ${c}`));
    expect(offenders).toEqual([]);
  });

  it('are caught by the check', () => {
    expect(
      rawColours('color: #fff; background: rgb(1 2 3); border-color: oklch(0.5 0.1 200);'),
    ).toEqual(['#fff', 'rgb(', 'oklch(']);
    expect(rawColours('color: var(--color-text-primary); margin: 0 #section-1')).toEqual([]);
  });
});

describe('tokens.css', () => {
  const css = readFileSync(TOKENS, 'utf8');
  const block = (selector: string): string => {
    const start = css.indexOf(selector);
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', open);
    return css
      .slice(open + 1, close)
      .replace(/\s+/g, ' ')
      .trim();
  };

  it('has the same dark values for the system setting and for a dark theme picked in Settings', () => {
    expect(block(":root:not([data-theme='light'])")).toBe(block(":root[data-theme='dark']"));
  });

  it('defines every colour role from ui-context.md, in light and dark', () => {
    const roles = [
      'background',
      'surface',
      'surface-secondary',
      'glass',
      'glass-border',
      'border',
      'text-primary',
      'text-secondary',
      'text-muted',
      'brand',
      'on-brand',
      'accent',
      'on-accent',
      'success',
      'warning',
      'error',
    ];
    for (const role of roles) {
      expect(css.match(new RegExp(`--color-${role}:`, 'g'))?.length, role).toBe(3);
    }
  });
});
