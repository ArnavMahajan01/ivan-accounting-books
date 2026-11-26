// The journal entry for a bank line given one account, or split across several (specs 069, 072).
// It follows the GST convention in journal.ts: a taxable part's amount is net of GST, its GST is on
// its own line, and one line to the GST account carries the total. With one part the entry is the
// same as `simpleEntry` gives, which the tests check.
//
// The line's sign decides the side: money out puts each part in debit (an expense, an asset bought),
// money in puts each part in credit (a sale, or a refund back to an expense account).

import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents, negateCents, sumCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import { splitInclusive } from './gst';
import type { EntryInput, EntryLineInput } from './journal';
import type { SimpleEntryTax } from './simple-entry';

/** One share of a bank line: the account it was for, its GST code and its amount with any GST in it. */
export interface LinePart {
  readonly accountId: Id<'acc'>;
  /** Null for no GST code, such as a transfer. */
  readonly tax: SimpleEntryTax | null;
  /** Always positive. The parts of a line add up to the line. */
  readonly gross: Cents;
}

export interface LineToEntryInput {
  readonly line: {
    readonly id: string;
    readonly date: CalendarDate;
    readonly description: string;
    /** Money in is positive, money out negative. */
    readonly amount: Cents;
  };
  /** The ledger account of the bank account the line is in. */
  readonly bankLedgerAccountId: Id<'acc'>;
  readonly parts: readonly LinePart[];
  readonly payeeId: string | null;
  readonly gstAccountId: Id<'acc'>;
}

export type LineToEntryError = 'no-parts' | 'part-not-positive' | 'parts-do-not-add-up';

/** Whatever is left to share out: the line less the parts so far. Zero means it is fully split. */
export function leftToSplit(lineAmount: Cents, parts: readonly Cents[]): Cents {
  return asCents(Math.abs(lineAmount) - sumCents(parts));
}

export function lineToEntry(input: LineToEntryInput): Result<EntryInput, LineToEntryError> {
  const { line, parts } = input;
  if (parts.length === 0) return err('no-parts');
  if (parts.some((part) => part.gross <= 0)) return err('part-not-positive');
  if (
    leftToSplit(
      line.amount,
      parts.map((p) => p.gross),
    ) !== 0
  ) {
    return err('parts-do-not-add-up');
  }

  const out = line.amount < 0;
  // Debit side positive, credit side negative. For money out the parts are the debits.
  const sign = (cents: Cents): Cents => (out ? cents : negateCents(cents));

  const partLines: EntryLineInput[] = parts.map((part) => {
    const split =
      part.tax?.treatment === 'taxable' ? splitInclusive(part.gross, part.tax.rateBp) : null;
    return {
      accountId: part.accountId,
      amount: sign(split === null ? part.gross : split.net),
      taxCodeId: part.tax?.taxCodeId ?? null,
      gst: split === null ? asCents(0) : sign(split.gst),
      payeeId: input.payeeId,
      memo: '',
    };
  });
  const gstTotal = sumCents(partLines.map((l) => l.gst));
  const gstLine: EntryLineInput[] =
    gstTotal === 0
      ? []
      : [
          {
            accountId: input.gstAccountId,
            amount: gstTotal,
            taxCodeId: null,
            gst: asCents(0),
            payeeId: null,
            memo: '',
          },
        ];
  const bankLine: EntryLineInput = {
    accountId: input.bankLedgerAccountId,
    amount: line.amount,
    taxCodeId: null,
    gst: asCents(0),
    payeeId: input.payeeId,
    memo: '',
  };

  return ok({
    date: line.date,
    memo: line.description,
    sourceKind: 'bank-line',
    sourceId: line.id,
    lines: out ? [...partLines, ...gstLine, bankLine] : [bankLine, ...partLines, ...gstLine],
  });
}
