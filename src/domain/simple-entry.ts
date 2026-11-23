// Builds the journal entry for the commonest case: money moved through one account (a bank
// account) to or from one category, with GST worked out by the one GST helper. The sample books use
// it now, and posting a bank line (folder 06) will too, so every entry follows the convention in
// journal.ts: a taxable line's amount is net of GST, its GST is on the line, and one line to the
// GST account carries the total.

import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { EntrySourceKind, TaxTreatment } from '@shared/kinds';
import { asCents, negateCents, type Cents } from '@shared/money';
import { splitInclusive } from './gst';
import type { EntryInput, EntryLineInput } from './journal';

export interface SimpleEntryTax {
  readonly taxCodeId: Id<'tax'>;
  readonly treatment: TaxTreatment;
  /** Basis points, from the tax code. Used only when the treatment is taxable. */
  readonly rateBp: number;
}

export interface SimpleEntryInput {
  readonly date: CalendarDate;
  readonly memo: string;
  readonly sourceKind: EntrySourceKind;
  readonly sourceId: string | null;
  readonly payeeId: string | null;
  /** The account the money moves through, such as a bank account. */
  readonly moneyAccountId: Id<'acc'>;
  readonly direction: 'in' | 'out';
  /** What moved, with any GST in it. Always positive. */
  readonly gross: Cents;
  /** What the money was for, or came from: an income or expense account, equity, another bank account. */
  readonly categoryAccountId: Id<'acc'>;
  /** The GST code on the category line, or null for none (a transfer, drawings). */
  readonly tax: SimpleEntryTax | null;
  /** Where the GST on a taxable line goes. */
  readonly gstAccountId: Id<'acc'>;
}

function line(
  accountId: Id<'acc'>,
  amount: Cents,
  payeeId: string | null,
  extra: { taxCodeId?: Id<'tax'>; gst?: Cents } = {},
): EntryLineInput {
  return {
    accountId,
    amount,
    taxCodeId: extra.taxCodeId ?? null,
    gst: extra.gst ?? asCents(0),
    payeeId,
    memo: '',
  };
}

/** The entry for money moving through one account. Money in puts the money account in debit. */
export function simpleEntry(input: SimpleEntryInput): EntryInput {
  if (input.gross <= 0) throw new RangeError('A simple entry needs a positive amount');
  const out = input.direction === 'out';
  const split =
    input.tax?.treatment === 'taxable' ? splitInclusive(input.gross, input.tax.rateBp) : null;
  const taxCodeId = input.tax === null ? {} : { taxCodeId: input.tax.taxCodeId };

  // Debit side positive, credit side negative. For money out the category is the debit.
  const sign = (cents: Cents): Cents => (out ? cents : negateCents(cents));
  const lines: EntryLineInput[] = [];
  const categoryAmount = split === null ? input.gross : split.net;
  const categoryLine = line(input.categoryAccountId, sign(categoryAmount), input.payeeId, {
    ...taxCodeId,
    ...(split === null ? {} : { gst: sign(split.gst) }),
  });
  const moneyLine = line(
    input.moneyAccountId,
    out ? negateCents(input.gross) : input.gross,
    input.payeeId,
  );
  const gstLine =
    split === null || split.gst === 0 ? null : line(input.gstAccountId, sign(split.gst), null);

  if (out) lines.push(categoryLine, ...(gstLine === null ? [] : [gstLine]), moneyLine);
  else lines.push(moneyLine, categoryLine, ...(gstLine === null ? [] : [gstLine]));

  return {
    date: input.date,
    memo: input.memo,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    lines,
  };
}
