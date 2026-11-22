// Remembers the window's size and place between launches (spec 024). The file is outside input,
// so it is checked with Zod, and a size or place that no longer fits a screen is ignored.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export const WINDOW_STATE_FILE = 'window-state.json';
export const MIN_WIDTH = 1100;
export const MIN_HEIGHT = 700;

const boundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(MIN_WIDTH).max(20000),
  height: z.number().int().min(MIN_HEIGHT).max(20000),
});

export type WindowBounds = z.infer<typeof boundsSchema>;

export interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** True if at least a 100 by 100 corner of the window is on one of the screens. */
export function isVisibleOn(bounds: WindowBounds, screens: readonly Area[]): boolean {
  return screens.some((s) => {
    const overlapX = Math.min(bounds.x + bounds.width, s.x + s.width) - Math.max(bounds.x, s.x);
    const overlapY = Math.min(bounds.y + bounds.height, s.y + s.height) - Math.max(bounds.y, s.y);
    return overlapX >= 100 && overlapY >= 100;
  });
}

/** The saved bounds, or null if there are none, they are invalid, or they are off every screen. */
export function loadWindowBounds(dataDir: string, screens: readonly Area[]): WindowBounds | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(dataDir, WINDOW_STATE_FILE), 'utf8'));
  } catch {
    return null;
  }
  const parsed = boundsSchema.safeParse(raw);
  if (!parsed.success) return null;
  return isVisibleOn(parsed.data, screens) ? parsed.data : null;
}

export function saveWindowBounds(dataDir: string, bounds: WindowBounds): void {
  writeFileSync(join(dataDir, WINDOW_STATE_FILE), `${JSON.stringify(bounds)}\n`, { mode: 0o600 });
}
