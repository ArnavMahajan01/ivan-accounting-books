// What a published workbook holds (specs 110, 113): a report, or the transactions for a period,
// with its period pinned to whole days, as tabs of cells, and a fingerprint of every row so
// publishing again can say what changed. Reads the books; changes nothing.

import { createHash } from 'node:crypto';
import { listAccounts } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { getBusiness } from '@data/business-repository';
import { listContacts } from '@data/contact-repository';
import { getJournalEntry } from '@data/journal-queries';
import { listTaxCodes } from '@data/tax-code-repository';
import { queryTransactions } from '@data/transaction-queries';
import type { PublishedRow } from '@data/sheet-link-repository';
import { readyFormulasTab } from '@domain/ready-formulas';
import {
  pinPeriod,
  reportTab,
  transactionsTab,
  workbookTitle,
  type SheetTransaction,
} from '@domain/sheet-tabs';
import type { AppTab } from '@domain/workbook';
import { formatDateAU, parseCalendarDate, type CalendarDate } from '@shared/dates';
import { addCents, asCents, ZERO_CENTS, type Cents } from '@shared/money';
import { REPORT_TITLES } from '@shared/reports';
import { err, ok, type Result } from '@shared/result';
import type { PublishedRequest, PublishRequest, WorkbookKind } from '@shared/sheets';
import type { TodayContext } from './context';
import { getReport } from './reports';

export interface WorkbookContent {
  readonly kind: WorkbookKind;
  /** "Profit and loss · Oct–Dec 2026". */
  readonly title: string;
  /** The request with its period pinned, kept with the link. */
  readonly pinned: PublishedRequest;
  /** Null for a report as at one day. */
  readonly from: CalendarDate | null;
  readonly to: CalendarDate;
  readonly tabs: readonly AppTab[];
  /** Every app row by its key, for counting changes and finding the accountant's edits. */
  readonly rows: Readonly<Record<string, PublishedRow>>;
}

export type ContentError = 'bad-period' | 'not-set-up';

function day(text: string | null): CalendarDate | null {
  if (text === null) return null;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  return parsed.ok ? parsed.value : null;
}

const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('base64url').slice(0, 16);

/** The transactions in a period, one row per entry, oldest first. */
export function sheetTransactions(
  ctx: TodayContext,
  from: CalendarDate,
  to: CalendarDate,
): SheetTransaction[] {
  const accounts = new Map(listAccounts(ctx.db).map((a) => [a.id as string, a.name]));
  const codes = new Map(listTaxCodes(ctx.db).map((t) => [t.id as string, t.shortCode]));
  const contacts = new Map(listContacts(ctx.db).map((c) => [c.id as string, c.name]));
  const banks = new Set(listBankAccounts(ctx.db).map((b) => b.ledgerAccountId as string));
  const gst = accountForRole(ctx.db, 'gst');
  const ids: { id: string; date: CalendarDate }[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = queryTransactions(ctx.db, {
      from,
      to,
      accountId: null,
      kind: 'all',
      search: null,
      amountCents: null,
      limit: 500,
      offset,
    });
    ids.push(...page.entries.map((e) => ({ id: e.id, date: e.date })));
    if (page.entries.length < 500) break;
  }
  ids.reverse();
  const out: SheetTransaction[] = [];
  for (const { id } of ids) {
    const entry = getJournalEntry(ctx.db, id);
    if (entry === null) continue;
    const bankLines = entry.lines.filter((l) => banks.has(l.accountId));
    const others = entry.lines.filter((l) => !banks.has(l.accountId) && l.accountId !== gst);
    const amount: Cents =
      bankLines.length > 0
        ? bankLines.reduce((sum, l) => addCents(sum, l.amount), ZERO_CENTS)
        : entry.lines.reduce(
            (sum, l) => (l.amount > 0 ? addCents(sum, l.amount) : sum),
            ZERO_CENTS,
          );
    const distinct = new Set(others.map((l) => l.accountId));
    const only = others.length === 1 ? others[0] : undefined;
    const payeeId = entry.lines.find((l) => l.payeeId !== null)?.payeeId ?? null;
    out.push({
      ref: entry.id,
      date: entry.date,
      description: entry.memo,
      payee: payeeId === null ? null : (contacts.get(payeeId) ?? null),
      amount: asCents(amount),
      account:
        distinct.size === 0
          ? 'Transfer'
          : distinct.size === 1
            ? (accounts.get(others[0]?.accountId ?? '') ?? '')
            : 'Split',
      gst: only === undefined || only.taxCodeId === null ? '' : (codes.get(only.taxCodeId) ?? ''),
      note: only?.memo ?? '',
    });
  }
  return out;
}

/** Everything a publish sends, worked out from the books. */
export function workbookContent(
  ctx: TodayContext,
  request: PublishRequest,
): Result<WorkbookContent, ContentError> {
  const business = getBusiness(ctx.db);
  if (business === null) return err('not-set-up');
  const today = ctx.clock.today();
  const publishedOn = today;
  const ready = readyFormulasTab(publishedOn);

  if (request.kind === 'transactions') {
    const pinned = pinPeriod(request.period.choice, today, {
      from: day(request.period.from),
      to: day(request.period.to),
    });
    if (pinned === null) return err('bad-period');
    const lines = sheetTransactions(ctx, pinned.from, pinned.to);
    const rows: Record<string, PublishedRow> = {};
    for (const l of lines) {
      rows[l.ref] = {
        hash: fingerprint(l),
        editable: { account: l.account, gst: l.gst, note: l.note },
      };
    }
    return ok({
      kind: 'transactions',
      title: workbookTitle('Transactions', pinned.label),
      pinned: {
        kind: 'transactions',
        period: { choice: 'custom', from: pinned.from, to: pinned.to },
      },
      from: pinned.from,
      to: pinned.to,
      tabs: [transactionsTab(lines, business.name, pinned.label, publishedOn), ready],
      rows,
    });
  }

  // A report. The balance sheet is as at one day; the others cover a pinned period.
  const asked = request.request;
  let pinnedRequest: typeof asked;
  let label: string;
  if (asked.report === 'balance-sheet') {
    const asAt = day(asked.asAt) ?? today;
    pinnedRequest = { ...asked, asAt };
    label = `as at ${formatDateAU(asAt)}`;
  } else {
    const pinned = pinPeriod(asked.period.choice, today, {
      from: day(asked.period.from),
      to: day(asked.period.to),
    });
    if (pinned === null) return err('bad-period');
    pinnedRequest = { ...asked, period: { choice: 'custom', from: pinned.from, to: pinned.to } };
    label = pinned.label;
  }
  const view = getReport(ctx, pinnedRequest);
  if (!view.ok) return err(view.error);
  const rows: Record<string, PublishedRow> = {};
  for (const row of view.value.rows) {
    rows[row.key] = { hash: fingerprint([row.label, row.cells]), editable: null };
  }
  return ok({
    kind: asked.report,
    title: workbookTitle(REPORT_TITLES[asked.report], label),
    pinned: { kind: 'report', request: pinnedRequest },
    from: view.value.from,
    to: view.value.to,
    tabs: [reportTab(view.value, business.name, publishedOn), ready],
    rows,
  });
}
