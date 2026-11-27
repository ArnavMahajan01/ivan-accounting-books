// The Transactions list: every posted entry as one row, newest first, with filters and paging
// (spec 051). Each row is worked out from the entry's lines by `summariseEntry`.

import { accountForRole } from '@data/account-role-repository';
import { getBusiness } from '@data/business-repository';
import { queryTransactions } from '@data/transaction-queries';
import { isLocked } from '@domain/journal';
import { basPeriodOf, financialYearOf } from '@domain/periods';
import { summariseEntry } from '@domain/entry-summary';
import { addDays, compareDates, parseCalendarDate, type CalendarDate } from '@shared/dates';
import { assertNever, type BasFrequency } from '@shared/kinds';
import { asCents, parseCents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type {
  TransactionKind,
  TransactionPeriod,
  TransactionRow,
  TransactionsPage,
} from '@shared/views';
import type { TodayContext } from './context';

export interface TransactionFilters {
  /** A ready-made range. Ignored when `from` or `to` is given. */
  readonly period?: TransactionPeriod | undefined;
  /** `YYYY-MM-DD`. */
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly accountId?: string | undefined;
  readonly contactId?: string | undefined;
  readonly bankOnly?: boolean | undefined;
  readonly kind?: TransactionKind | undefined;
  readonly search?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export type ListTransactionsError = 'bad-date' | 'range-ends-before-it-starts';

export const DEFAULT_PAGE_SIZE = 100;

type Range = { readonly from: CalendarDate | null; readonly to: CalendarDate | null };

/** The same day a year ago, plus one day: a year of days ending today. 29 February counts as the 28th. */
function startOfLast12Months(today: CalendarDate): CalendarDate {
  const year = String(Number(today.slice(0, 4)) - 1).padStart(4, '0');
  const monthDay = today.slice(5) === '02-29' ? '02-28' : today.slice(5);
  const lastYear = parseCalendarDate(`${year}-${monthDay}`, 'YYYY-MM-DD');
  if (!lastYear.ok) throw new RangeError(`No day a year before ${today}`);
  return addDays(lastYear.value, 1);
}

function rangeFor(period: TransactionPeriod, today: CalendarDate, frequency: BasFrequency): Range {
  switch (period) {
    case 'financial-year': {
      const year = financialYearOf(today);
      return { from: year.start, to: year.end };
    }
    case 'bas-period': {
      const bas = basPeriodOf(today, frequency);
      return { from: bas.start, to: bas.end };
    }
    case 'last-12-months':
      return { from: startOfLast12Months(today), to: today };
    case 'all':
      return { from: null, to: null };
    default:
      return assertNever(period);
  }
}

function readDate(text: string | undefined): CalendarDate | null | 'bad' {
  if (text === undefined || text === '') return null;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  return parsed.ok ? parsed.value : 'bad';
}

export function listTransactions(
  ctx: TodayContext,
  filters: TransactionFilters,
): Result<TransactionsPage, ListTransactionsError> {
  const typedFrom = readDate(filters.from);
  const typedTo = readDate(filters.to);
  if (typedFrom === 'bad' || typedTo === 'bad') return err('bad-date');
  if (typedFrom !== null && typedTo !== null && compareDates(typedFrom, typedTo) > 0) {
    return err('range-ends-before-it-starts');
  }
  const business = getBusiness(ctx.db);
  const preset =
    typedFrom === null && typedTo === null
      ? rangeFor(filters.period ?? 'all', ctx.clock.today(), business?.basFrequency ?? 'quarterly')
      : null;
  const from = preset?.from ?? typedFrom;
  const to = preset?.to ?? typedTo;
  const search = filters.search?.trim() ?? '';
  // A search such as "342.15" also finds the entries that total that amount.
  const amount = search === '' ? null : parseCents(search);
  const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters.offset ?? 0;

  const result = queryTransactions(ctx.db, {
    from,
    to,
    accountId: filters.accountId ?? null,
    contactId: filters.contactId ?? null,
    bankOnly: filters.bankOnly === true,
    kind: filters.kind ?? 'all',
    search: search === '' ? null : search,
    amountCents: amount?.ok === true ? amount.value : null,
    limit,
    offset,
  });
  const lockDate = business?.lockDate ?? null;
  const gstAccount = accountForRole(ctx.db, 'gst');

  const rows: TransactionRow[] = result.entries.map((entry) => {
    const lines = result.lines.get(entry.id) ?? [];
    const summary = summariseEntry(lines);
    const locked = isLocked(entry.date, lockDate);
    return {
      id: entry.id,
      date: entry.date,
      sourceKind: entry.sourceKind,
      direction: summary.direction,
      payee: summary.payee,
      memo: entry.memo,
      account: summary.account,
      beforeGst: summary.beforeGst,
      gst: summary.gst,
      total: summary.total,
      locked,
      // One bank line and one account it was for: the account can be changed in the row (spec 083).
      movable:
        !locked &&
        lines.filter((l) => l.isBank).length === 1 &&
        lines.filter((l) => !l.isBank && l.accountId !== gstAccount).length === 1,
    };
  });
  return ok({
    rows,
    range: { from, to },
    matching: result.matching,
    offset,
    limit,
    totals: {
      beforeGst: asCents(result.totals.total - result.totals.gst),
      gst: asCents(result.totals.gst),
      total: asCents(result.totals.total),
    },
    accountTotal: result.accountTotal === null ? null : asCents(result.accountTotal),
  });
}
