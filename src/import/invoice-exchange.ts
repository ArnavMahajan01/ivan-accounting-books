// The invoice exchange file (spec 125; decisions/admin-dashboard-link.md, its recommendation): what
// the Admin Dashboard writes when it issues an invoice or a credit note, and this app reads. A
// versioned JSON document. Pure: it is given the file's text and gives back checked documents, or
// an error naming the field. Amounts are whole cents, GST-inclusive, as the Admin Dashboard stores
// them; this app keeps the GST the Admin Dashboard worked out (client question 27's assumption).

import { z } from 'zod';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { asCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';

export const EXCHANGE_FORMAT = 'accounting-books-invoices';
export const EXCHANGE_VERSION = 1;
/** A file larger than this is refused before it is read: an export of a year is far smaller. */
export const MAX_EXCHANGE_BYTES = 5 * 1024 * 1024;

const day = z.string().transform((text, ctx): CalendarDate => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) {
    ctx.addIssue({ code: 'custom', message: 'is not a real date as YYYY-MM-DD' });
    return z.NEVER;
  }
  return parsed.value;
});
const cents = z.number().int().min(-1_000_000_000_00).max(1_000_000_000_00);
const text = (max: number) => z.string().trim().min(1).max(max);

const lineSchema = z.strictObject({
  description: z.string().max(500),
  /** As text, so 1.5 hours is exact. */
  quantity: z.string().regex(/^\d{1,7}(\.\d{1,4})?$/),
  unitPriceCents: cents,
  /** The GST code's short code in the Admin Dashboard: GST, FRE (GST-free) or N-T. */
  gstCode: z.enum(['GST', 'FRE', 'N-T']),
  /** GST-inclusive. */
  totalCents: cents,
  gstCents: cents,
});

const documentSchema = z
  .strictObject({
    kind: z.enum(['invoice', 'credit-note', 'quote']),
    number: text(40),
    version: z.number().int().min(1).max(999),
    status: z.enum(['issued', 'replaced']),
    issueDate: day,
    dueDate: day.nullable(),
    customer: z.strictObject({
      name: text(120),
      email: z.email().max(254).nullable(),
      abn: z
        .string()
        .regex(/^\d{11}$/)
        .nullable(),
    }),
    lines: z.array(lineSchema).min(1).max(500),
    totals: z.strictObject({ totalCents: cents, gstCents: cents }),
    /** A credit note: the invoice it is for. */
    creditFor: text(40).nullable(),
    /** The invoice's PDF, a file name beside this file, when the Admin Dashboard wrote one. */
    pdf: z
      .string()
      .regex(/^[\w .-]{1,120}\.pdf$/i)
      .nullable(),
  })
  .superRefine((d, ctx) => {
    const total = d.lines.reduce((sum, l) => sum + l.totalCents, 0);
    const gst = d.lines.reduce((sum, l) => sum + l.gstCents, 0);
    if (total !== d.totals.totalCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['totals', 'totalCents'],
        message: 'is not the lines added up',
      });
    }
    if (gst !== d.totals.gstCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['totals', 'gstCents'],
        message: 'is not the lines added up',
      });
    }
    if (d.kind === 'credit-note' && d.creditFor === null) {
      ctx.addIssue({ code: 'custom', path: ['creditFor'], message: 'is needed on a credit note' });
    }
  });

const fileSchema = z.strictObject({
  format: z.literal(EXCHANGE_FORMAT),
  version: z.literal(EXCHANGE_VERSION),
  exportedAt: z.string().max(40),
  documents: z.array(documentSchema).max(5000),
});

export interface ExchangeLine {
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: Cents;
  readonly gstCode: 'GST' | 'FRE' | 'N-T';
  readonly total: Cents;
  readonly gst: Cents;
}

/** An issued invoice or credit note. Quotes are left out: they do not change the books. */
export interface ExchangeDocument {
  readonly kind: 'invoice' | 'credit-note';
  readonly number: string;
  readonly version: number;
  readonly status: 'issued' | 'replaced';
  readonly issueDate: CalendarDate;
  readonly dueDate: CalendarDate | null;
  readonly customer: {
    readonly name: string;
    readonly email: string | null;
    readonly abn: string | null;
  };
  readonly lines: readonly ExchangeLine[];
  readonly total: Cents;
  readonly gst: Cents;
  readonly creditFor: string | null;
  readonly pdf: string | null;
}

export interface ExchangeFile {
  readonly documents: readonly ExchangeDocument[];
  /** Quotes in the file, counted and left out. */
  readonly quotes: number;
}

export interface ExchangeProblem {
  /** Where, such as `documents.1.lines.0.totalCents`, or `file`. */
  readonly field: string;
  readonly problem: string;
}

export function parseInvoiceFile(content: string): Result<ExchangeFile, ExchangeProblem> {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return err({ field: 'file', problem: 'is not a file the Admin Dashboard wrote (not JSON)' });
  }
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err({
      field:
        issue === undefined || issue.path.length === 0 ? 'file' : issue.path.map(String).join('.'),
      problem: issue?.message ?? 'is not valid',
    });
  }
  const documents = parsed.data.documents.flatMap((d): ExchangeDocument[] =>
    d.kind === 'quote'
      ? []
      : [
          {
            kind: d.kind,
            number: d.number,
            version: d.version,
            status: d.status,
            issueDate: d.issueDate,
            dueDate: d.dueDate,
            customer: d.customer,
            lines: d.lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: asCents(l.unitPriceCents),
              gstCode: l.gstCode,
              total: asCents(l.totalCents),
              gst: asCents(l.gstCents),
            })),
            total: asCents(d.totals.totalCents),
            gst: asCents(d.totals.gstCents),
            creditFor: d.creditFor,
            pdf: d.pdf,
          },
        ],
  );
  return ok({ documents, quotes: parsed.data.documents.length - documents.length });
}
