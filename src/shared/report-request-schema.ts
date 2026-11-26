// The shape of a report request, checked wherever one comes from outside: the bridge (a screen) and
// a saved layout read back from the books (spec 101).

import { z } from 'zod';
import { CALC_KINDS, PERIOD_CHOICES, REPORT_KINDS } from './reports';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportRequestSchema = z.strictObject({
  report: z.enum(REPORT_KINDS),
  period: z.strictObject({
    choice: z.enum(PERIOD_CHOICES),
    from: date.nullable(),
    to: date.nullable(),
  }),
  asAt: date.nullable(),
  columns: z.strictObject({
    lastPeriod: z.boolean(),
    sameLastYear: z.boolean(),
    percentOfIncome: z.boolean(),
    monthByMonth: z.boolean(),
  }),
  rows: z.strictObject({ showEmpty: z.boolean(), groupSmall: z.boolean(), showCodes: z.boolean() }),
  ownColumns: z
    .array(
      z.union([
        z.strictObject({
          kind: z.literal('notes'),
          name: z.string().min(1).max(60),
          notes: z.record(z.string(), z.string().max(500)),
        }),
        z.strictObject({
          kind: z.literal('calc'),
          name: z.string().min(1).max(60),
          calc: z.enum(CALC_KINDS),
          a: z.string().max(20),
          b: z.string().max(20).nullable(),
          amount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
        }),
      ]),
    )
    .max(10),
});
