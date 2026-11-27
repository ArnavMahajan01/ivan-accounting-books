// Folder 08 against the sample books, whose figures were worked out ahead (sample-figures.ts).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { getBusiness } from '@data/business-repository';
import { getAccountByCode } from '@data/account-repository';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { plainRequest, type ReportRequest, type ReportView } from '@shared/reports';
import { postEntry, changeEntry, removeEntry } from './post-journal';
import { getQuarterClose, lockPeriod } from './quarter-close';
import {
  listReportLayouts,
  removeReportLayout,
  saveReportLayout,
  openReportLayout,
} from './report-layouts';
import { getReport, getReportLines } from './reports';
import { buildSampleBooks } from './sample/build-sample-books';
import { SAMPLE_FIGURES } from './sample/sample-figures';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
const day = (t: string): CalendarDate => {
  const p = parseCalendarDate(t, 'YYYY-MM-DD');
  if (!p.ok) throw new Error(t);
  return p.value;
};
beforeEach(() => {
  ctx = createTestContext();
  buildSampleBooks({ db: ctx.db }, day('2026-11-23'));
});
afterEach(() => {
  ctx.close();
});

function report(request: ReportRequest): ReportView {
  const r = getReport(ctx, request);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}
const figure = (view: ReportView, key: string, column = 0) => {
  const cell = view.rows.find((r) => r.key === key)?.cells[column];
  return cell?.kind === 'money' ? cell.cents : null;
};
const fy = (r: ReportRequest): ReportRequest => ({
  ...r,
  period: { choice: 'this-year', from: null, to: null },
});

describe('the reports on the sample books (spec 089)', () => {
  it('profit and loss for the year so far is the sample profit', () => {
    const pl = report(fy(plainRequest('profit-and-loss')));
    expect(figure(pl, 'net-profit')).toBe(SAMPLE_FIGURES.profit);
    expect(pl.periodText).toBe('FY 2026–27, 01/07/2026 to 23/11/2026');
  });

  it('the balance sheet balances at every month end of the year, and its earnings are the profit', () => {
    for (const asAt of ['2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31', '2026-11-23']) {
      const bs = report({ ...plainRequest('balance-sheet'), asAt });
      expect(bs.check, asAt).toEqual({ ok: true, text: 'Assets equal liabilities plus equity.' });
    }
    const bs = report({ ...plainRequest('balance-sheet'), asAt: '2026-11-23' });
    expect(figure(bs, 'year-earnings')).toBe(SAMPLE_FIGURES.profit);
    expect(figure(bs, getAccountByCode(ctx.db, '1000')?.id ?? '')).toBe(
      SAMPLE_FIGURES.balances['1000'],
    );
  });

  it('the trial balance has equal totals, the sample figure', () => {
    const tb = report(fy(plainRequest('trial-balance')));
    expect(tb.check?.ok).toBe(true);
    expect(figure(tb, 'totals', 0)).toBe(SAMPLE_FIGURES.trialBalanceDebits);
    expect(figure(tb, 'totals', 1)).toBe(SAMPLE_FIGURES.trialBalanceDebits);
  });
});

describe('the lines behind a figure (spec 093)', () => {
  it('always add up to the figure, for every account of every report', () => {
    const views = [
      report(fy(plainRequest('profit-and-loss'))),
      report({ ...plainRequest('balance-sheet'), asAt: '2026-10-31' }),
      report(fy(plainRequest('trial-balance'))),
      report(plainRequest('bas')),
    ];
    let checked = 0;
    for (const view of views) {
      for (const row of view.rows) {
        for (const cell of row.cells) {
          if (cell.kind !== 'money' || cell.drill === null) continue;
          expect(getReportLines(ctx, cell.drill).total, `${view.title} ${row.label}`).toBe(
            cell.cents,
          );
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});

describe('the BAS worksheet (spec 094)', () => {
  it('Jul–Sep: the GST to pay is the sample BAS payment', () => {
    const bas = report(plainRequest('bas'));
    expect(bas.periodText).toBe('Jul–Sep 2026, 01/07/2026 to 30/09/2026');
    // Its rows are BAS labels, not accounts, and the heading over them says so.
    expect(bas.rowHeading).toBe('BAS label');
    expect(figure(bas, 'net')).toBe(SAMPLE_FIGURES.basPaymentJulToSep);
    expect(bas.note).toContain('The app does not lodge anything with the ATO.');
    // 1A less 1B is the GST to pay, to the cent.
    const a1 = figure(bas, '1A') ?? 0;
    const b1 = figure(bas, '1B') ?? 0;
    expect(a1 - b1).toBe(SAMPLE_FIGURES.basPaymentJulToSep);
  });

  it('Oct–Dec so far agrees with the GST owing on Home', () => {
    const bas = report({
      ...plainRequest('bas'),
      period: { choice: 'this-quarter', from: null, to: null },
    });
    expect(figure(bas, 'net')).toBe(SAMPLE_FIGURES.gstOwingOctToDec);
  });
});

describe('comparison columns (spec 100)', () => {
  it('last period, same period last year and % of income, each from the books', () => {
    const pl = report({
      ...fy(plainRequest('profit-and-loss')),
      period: { choice: 'last-quarter', from: null, to: null },
      columns: { lastPeriod: true, sameLastYear: true, percentOfIncome: true, monthByMonth: false },
    });
    expect(pl.columns.map((c) => c.label)).toEqual([
      'Jul–Sep 2026',
      'Apr–Jun 2026',
      'Jul–Sep 2025',
      '% of income',
    ]);
    // The sample books start on 1 July 2026, so the earlier columns are empty.
    expect(figure(pl, 'net-profit', 1)).toBe(0);
    const pct = pl.rows.find((r) => r.key === 'net-profit')?.cells[3];
    expect(pct?.kind).toBe('percent');
  });

  it('month by month adds up to the period', () => {
    const months = report({
      ...fy(plainRequest('profit-and-loss')),
      columns: {
        lastPeriod: false,
        sameLastYear: false,
        percentOfIncome: false,
        monthByMonth: true,
      },
    });
    expect(months.columns.map((c) => c.label)).toEqual([
      'Jul 2026',
      'Aug 2026',
      'Sep 2026',
      'Oct 2026',
      'Nov 2026',
    ]);
    const net = months.rows.find((r) => r.key === 'net-profit')?.cells ?? [];
    expect(net.reduce((sum, c) => sum + (c.kind === 'money' ? c.cents : 0), 0)).toBe(
      SAMPLE_FIGURES.profit,
    );
  });
});

describe('locking a period (spec 096)', () => {
  const sales = () => getAccountByCode(ctx.db, '4000')?.id ?? '';
  const bank = () => getAccountByCode(ctx.db, '1000')?.id ?? '';
  const entry = (date: string) => ({
    date: day(date),
    memo: 'Invented',
    sourceKind: 'manual' as const,
    sourceId: null,
    lines: [
      {
        accountId: bank() as never,
        amount: asCents(1000),
        taxCodeId: null,
        gst: asCents(0),
        payeeId: null,
        memo: '',
      },
      {
        accountId: sales() as never,
        amount: asCents(-1000),
        taxCodeId: null,
        gst: asCents(0),
        payeeId: null,
        memo: '',
      },
    ],
  });

  it('locks only forwards, with an audit row', () => {
    expect(lockPeriod(ctx, day('2026-09-30'))).toEqual({ ok: true, value: '2026-09-30' });
    expect(getBusiness(ctx.db)?.lockDate).toBe('2026-09-30');
    expect(lockPeriod(ctx, day('2026-09-30'))).toEqual({ ok: false, error: 'not-forwards' });
    expect(lockPeriod(ctx, day('2026-08-31'))).toEqual({ ok: false, error: 'not-forwards' });
    expect(listAudit(ctx.db, { table: 'business' }).map((a) => a.kind)).toContain('business.lock');
  });

  it('then post, change and remove are refused on or before it', () => {
    const posted = postEntry(ctx, entry('2026-09-15'));
    if (!posted.ok) throw new Error('post');
    lockPeriod(ctx, day('2026-09-30'));
    expect(postEntry(ctx, entry('2026-09-30'))).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry' },
    });
    expect(changeEntry(ctx, posted.value.id, entry('2026-10-01'))).toMatchObject({
      ok: false,
      error: { code: 'entry-locked' },
    });
    expect(removeEntry(ctx, posted.value.id)).toMatchObject({
      ok: false,
      error: { code: 'entry-locked' },
    });
    expect(postEntry(ctx, entry('2026-10-01')).ok).toBe(true);
    expect(report(plainRequest('bas')).locked).toBe(true);
  });
});

describe('closing a quarter (spec 097)', () => {
  it('lists each step for the last quarter, then shows it locked', () => {
    const close = getQuarterClose(ctx, null);
    expect(close).toMatchObject({
      ok: true,
      value: {
        period: { from: '2026-07-01', to: '2026-09-30', label: 'Jul–Sep 2026' },
        linesWaiting: 0,
        bas: { net: SAMPLE_FIGURES.basPaymentJulToSep },
        locked: false,
      },
    });
    expect(close.ok && close.value.accounts.map((a) => a.done)).toEqual([false, false]);
    lockPeriod(ctx, day('2026-09-30'));
    expect(getQuarterClose(ctx, null)).toMatchObject({
      ok: true,
      value: { locked: true, lockDate: '2026-09-30' },
    });
  });
});

describe('my reports (spec 101)', () => {
  it('saves a layout, reopens it with the same columns, renames and deletes it', () => {
    const request: ReportRequest = {
      ...plainRequest('profit-and-loss'),
      columns: {
        lastPeriod: true,
        sameLastYear: false,
        percentOfIncome: true,
        monthByMonth: false,
      },
      ownColumns: [
        { kind: 'calc', name: 'Change', calc: 'difference', a: 'p0', b: 'p1', amount: null },
      ],
    };
    const saved = saveReportLayout(ctx, {
      id: null,
      name: 'Quarterly P&L for accountant',
      request,
    });
    if (!saved.ok) throw new Error(saved.error);
    expect(listReportLayouts(ctx)).toEqual([
      { id: saved.value.id, name: 'Quarterly P&L for accountant', report: 'profit-and-loss' },
    ]);
    expect(openReportLayout(ctx, saved.value.id)?.request).toEqual(request);
    expect(
      saveReportLayout(ctx, { id: null, name: 'quarterly p&l for ACCOUNTANT', request }),
    ).toEqual({ ok: false, error: 'name-in-use' });
    expect(
      saveReportLayout(ctx, { id: saved.value.id, name: 'For the accountant', request }).ok,
    ).toBe(true);
    expect(removeReportLayout(ctx, saved.value.id).ok).toBe(true);
    expect(listReportLayouts(ctx)).toEqual([]);
  });
});
