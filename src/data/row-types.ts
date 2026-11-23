// Zod types for the values stored in a column, so every row read back is checked and typed
// before it is trusted (context/code-standards.md, "Data"). A value that fails here means the
// file holds something the app never wrote, so the row schema rejects it.

import { z } from 'zod';
import { parseCalendarDate, parseTimestamp } from '@shared/dates';
import { asCents } from '@shared/money';

export const calendarDateColumn = z.string().transform((text, ctx) => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) {
    ctx.addIssue({ code: 'custom', message: 'not a calendar date' });
    return z.NEVER;
  }
  return parsed.value;
});

export const timestampColumn = z.string().transform((text, ctx) => {
  const parsed = parseTimestamp(text);
  if (!parsed.ok) {
    ctx.addIssue({ code: 'custom', message: 'not a timestamp' });
    return z.NEVER;
  }
  return parsed.value;
});

export const centsColumn = z.number().int().transform(asCents);

/** SQLite has no boolean: 0 and 1. */
export const flagColumn = z.union([z.literal(0), z.literal(1)]).transform((n) => n === 1);
