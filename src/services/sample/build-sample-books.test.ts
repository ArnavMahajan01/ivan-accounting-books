import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode, listAccounts } from '@data/account-repository';
import { listAudit } from '@data/audit-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { listBankAccounts } from '@data/bank-account-repository';
import { getBusiness } from '@data/business-repository';
import { listContacts } from '@data/contact-repository';
import type { Db } from '@data/database';
import { createTestDatabase } from '@data/test-database';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { checkBooks } from '../check-books';
import { getTrialBalance } from '../get-trial-balance';
import { buildSampleBooks, quarterGstOwing } from './build-sample-books';
import {
  continuationItems,
  curatedItems,
  curatedEnd,
  financialYearStart,
  weekday,
} from './sample-data';
import { SAMPLE_FIGURES, SAMPLE_TODAY } from './sample-figures';

function day(text: string): CalendarDate {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error(`bad date ${text}`);
  return parsed.value;
}

let stores: ReturnType<typeof createTestDatabase>[] = [];
function build(today: string): Db {
  const store = createTestDatabase();
  stores.push(store);
  buildSampleBooks({ db: store.db }, day(today));
  return store.db;
}
afterEach(() => {
  for (const store of stores) store.close();
  stores = [];
});

/** Everything in the books, in a fixed order, so two builds can be compared. */
function dump(db: Db): string {
  const tables = [
    'business',
    'account',
    'tax_code',
    'contact',
    'bank_account',
    'journal_entry',
    'journal_line',
    'audit_log',
  ];
  return JSON.stringify(tables.map((t) => db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()));
}

function balances(db: Db, today: string): Map<string, number> {
  const byId = new Map(
    sumLinesByAccount(db, { from: null, to: day(today) }).map((t) => [
      t.accountId as string,
      t.total as number,
    ]),
  );
  return new Map(listAccounts(db).map((a) => [a.code, byId.get(a.id) ?? 0]));
}

describe('the sample books on 23 November 2026', () => {
  let db: Db;
  beforeEach(() => {
    db = build(SAMPLE_TODAY);
  });

  it('are the invented business, set up the way real books are', () => {
    expect(getBusiness(db)).toMatchObject({
      name: 'Harbour Lane Joinery Pty Ltd',
      abn: '18123456789',
      gstRegistered: true,
      gstBasis: 'cash',
      basFrequency: 'quarterly',
      lockDate: null,
    });
    expect(listAccounts(db)).toHaveLength(39);
    expect(listBankAccounts(db).map((b) => [b.name, b.bank, b.lastFour])).toEqual([
      ['Business One ··4821', 'Westpac', '4821'],
      ['Business Cash Reserve ··7730', 'Westpac', '7730'],
    ]);
    expect(listContacts(db)).toHaveLength(SAMPLE_FIGURES.contacts);
  });

  it('produce every figure in the figures list', () => {
    const all = balances(db, SAMPLE_TODAY);
    for (const [code, cents] of Object.entries(SAMPLE_FIGURES.balances)) {
      expect(all.get(code), `account ${code}`).toBe(cents);
    }
    // No account has a balance that is not in the list.
    const unlisted = [...all].filter(
      ([code, cents]) => cents !== 0 && !(code in SAMPLE_FIGURES.balances),
    );
    expect(unlisted).toEqual([]);
    expect((all.get('1000') ?? 0) + (all.get('1010') ?? 0)).toBe(SAMPLE_FIGURES.bankBalance);
    const profit = -[...all]
      .filter(([code]) => code >= '4000')
      .reduce((sum, [, cents]) => sum + cents, 0);
    expect(profit).toBe(SAMPLE_FIGURES.profit);
  });

  it('balance: debits equal credits, and the books check finds nothing wrong', () => {
    const tb = getTrialBalance({ db }, { from: null, to: null });
    expect(tb.ok && [tb.value.totalDebit, tb.value.totalCredit, tb.value.balanced]).toEqual([
      SAMPLE_FIGURES.trialBalanceDebits,
      SAMPLE_FIGURES.trialBalanceDebits,
      true,
    ]);
    expect(checkBooks({ db })).toEqual({
      problems: [],
      entries: SAMPLE_FIGURES.entries,
      lines: expect.any(Number) as unknown,
    });
  });

  it('owe GST of $3,184.20 for October to December so far, and the GST account agrees', () => {
    const gst = db
      .prepare(
        "SELECT SUM(l.gst_cents) AS total FROM journal_line l JOIN journal_entry e ON e.id = l.entry_id WHERE e.entry_date BETWEEN '2026-10-01' AND '2026-12-31'",
      )
      .get() as { total: number };
    expect(-gst.total).toBe(SAMPLE_FIGURES.gstOwingOctToDec);
    expect(balances(db, SAMPLE_TODAY).get('2200')).toBe(-SAMPLE_FIGURES.gstOwingOctToDec);
  });

  it('paid the July to September BAS on 28 October, for what the entries owed', () => {
    const payment = db
      .prepare(
        "SELECT e.entry_date AS date, e.memo AS memo, l.amount_cents AS cents FROM journal_entry e JOIN journal_line l ON l.entry_id = e.id JOIN account a ON a.id = l.account_id WHERE a.code = '2200' AND e.memo LIKE 'BAS%'",
      )
      .all();
    expect(payment).toEqual([
      { date: '2026-10-28', memo: 'BAS Jul–Sep 2026', cents: SAMPLE_FIGURES.basPaymentJulToSep },
    ]);
    expect(quarterGstOwing(curatedItems(2026), day('2026-07-01'), day('2026-09-30'))).toBe(
      SAMPLE_FIGURES.basPaymentJulToSep,
    );
  });

  it('keep the wireframes’ rows: Smith Renovations, Timberlink, Bunnings and Ampol', () => {
    const row = (payee: string, date: string) => {
      const entry = db
        .prepare(
          `SELECT e.id FROM journal_entry e JOIN journal_line l ON l.entry_id = e.id JOIN contact c ON c.id = l.payee_id
           WHERE c.name = ? AND e.entry_date = ? GROUP BY e.id`,
        )
        .get(payee, date) as { id: string };
      const totals = db
        .prepare(
          `SELECT SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) AS total, SUM(ABS(gst_cents)) AS gst
           FROM journal_line WHERE entry_id = ?`,
        )
        .get(entry.id) as { total: number; gst: number };
      const account = db
        .prepare(
          `SELECT a.name AS account FROM journal_line l JOIN account a ON a.id = l.account_id
           WHERE l.entry_id = ? AND l.tax_code_id IS NOT NULL`,
        )
        .get(entry.id) as { account: string };
      return { ...totals, ...account };
    };
    expect(row('Smith Renovations', '2026-11-15')).toEqual({
      total: 495000,
      gst: 45000,
      account: 'Sales',
    });
    expect(row('Timberlink', '2026-09-28')).toEqual({
      total: 214000,
      gst: 19455,
      account: 'Materials and supplies',
    });
    expect(row('Bunnings', '2026-11-18')).toEqual({
      total: 34215,
      gst: 3110,
      account: 'Materials and supplies',
    });
    expect(row('Ampol', '2026-11-16')).toEqual({
      total: 9640,
      gst: 876,
      account: 'Motor vehicle expenses',
    });
  });

  it('were all posted through the posting service: every entry has a Posted row in the history', () => {
    const entries = (db.prepare('SELECT id FROM journal_entry').all() as { id: string }[]).map(
      (e) => e.id,
    );
    expect(entries).toHaveLength(SAMPLE_FIGURES.entries);
    for (const id of entries) {
      expect(listAudit(db, { table: 'journal_entry', rowId: id })[0]?.kind, id).toBe('entry.post');
    }
  });

  it('include a GST-free sale, transfers between the two accounts, owner drawings and an owner contribution', () => {
    const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    expect(
      count(
        "SELECT COUNT(*) AS n FROM journal_line l JOIN tax_code t ON t.id = l.tax_code_id WHERE t.treatment = 'gst-free'",
      ),
    ).toBe(1);
    expect(
      count(
        "SELECT COUNT(*) AS n FROM journal_entry WHERE memo = 'Transfer to Business Cash Reserve'",
      ),
    ).toBe(3);
    expect(count("SELECT COUNT(*) AS n FROM journal_entry WHERE memo = 'Owner drawings'")).toBe(5);
    expect(count("SELECT COUNT(*) AS n FROM journal_entry WHERE memo = 'Owner contribution'")).toBe(
      1,
    );
  });

  it('show two corrected entries in the history, with the full before and after', () => {
    const bunnings = db
      .prepare(
        "SELECT e.id FROM journal_entry e WHERE e.entry_date = '2026-11-18' AND e.memo = 'Fixings and sundries'",
      )
      .get() as { id: string };
    const history = listAudit(db, { table: 'journal_entry', rowId: bunnings.id });
    expect(history.map((h) => h.kind)).toEqual(['entry.post', 'entry.change']);
    expect(history[0]?.changedAt).toBe('2026-11-18T02:00:00.000Z');
    expect(history[1]?.changedAt).toBe('2026-11-20T01:00:00.000Z');
    const tools = getAccountByCode(db, '6110');
    const before = history[1]?.before as { lines: { accountId: string }[] };
    expect(before.lines.map((l) => l.accountId)).toContain(tools?.id);
    const timberlink = db
      .prepare(
        "SELECT e.id FROM journal_entry e WHERE e.entry_date = '2026-09-28' AND e.memo = 'Timber order'",
      )
      .get() as { id: string };
    const timber = listAudit(db, { table: 'journal_entry', rowId: timberlink.id });
    expect((timber[0]?.after as { date: string }).date).toBe('2026-09-29');
    expect((timber[1]?.after as { date: string }).date).toBe('2026-09-28');
  });
});

describe('building the sample books again', () => {
  it('gives identical books: every row, id and timestamp', () => {
    expect(dump(build(SAMPLE_TODAY))).toBe(dump(build(SAMPLE_TODAY)));
  });

  it('gives the same entries up to any date, however far the books run', () => {
    const upTo = (db: Db) =>
      db
        .prepare(
          "SELECT id, entry_date, memo FROM journal_entry WHERE entry_date <= '2027-01-31' ORDER BY rowid",
        )
        .all();
    const short = upTo(build('2027-01-31'));
    const long = upTo(build('2027-05-31'));
    expect(short.length).toBeGreaterThan(94);
    expect(long).toEqual(short);
  });
});

describe('the sample books on other days', () => {
  it.each([
    '2026-07-01',
    '2026-08-15',
    '2026-09-30',
    '2026-12-31',
    '2027-02-28',
    '2027-03-01',
    '2027-06-30',
  ])('balance on %s', (today) => {
    const db = build(today);
    const tb = getTrialBalance({ db }, { from: null, to: null });
    expect(tb.ok && tb.value.balanced).toBe(true);
    expect(checkBooks({ db }).problems).toEqual([]);
    const latest = (
      db.prepare('SELECT MAX(entry_date) AS d FROM journal_entry').get() as { d: string }
    ).d;
    expect(latest <= today).toBe(true);
  });

  it('start on 1 July with the owner contribution and the rent, and nothing else', () => {
    const db = build('2026-07-01');
    expect(db.prepare('SELECT memo FROM journal_entry ORDER BY rowid').all()).toEqual([
      { memo: 'Owner contribution' },
      { memo: 'Workshop rent' },
    ]);
  });

  it('pay no BAS before the quarter is over, and pay each quarter once it is', () => {
    const memos = (today: string) =>
      (
        build(today)
          .prepare("SELECT memo FROM journal_entry WHERE memo LIKE 'BAS%' ORDER BY entry_date")
          .all() as { memo: string }[]
      ).map((m) => m.memo);
    expect(memos('2026-10-27')).toEqual([]);
    expect(memos('2026-10-28')).toEqual(['BAS Jul–Sep 2026']);
    expect(memos('2027-03-01')).toEqual(['BAS Jul–Sep 2026', 'BAS Oct–Dec 2026']);
    expect(memos('2027-06-30')).toEqual([
      'BAS Jul–Sep 2026',
      'BAS Oct–Dec 2026',
      'BAS Jan–Mar 2027',
    ]);
  });

  it('start a new financial year with the same shape, from 1 July 2027', () => {
    const db = build('2027-11-23');
    expect(db.prepare('SELECT MIN(entry_date) AS d FROM journal_entry').get()).toEqual({
      d: '2027-07-01',
    });
    expect(balances(db, '2027-11-23').get('1000')).toBe(SAMPLE_FIGURES.balances['1000']);
  });

  it('are built in a few hundred milliseconds', () => {
    const started = Date.now();
    build('2027-06-30');
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe('the continuation after 23 November', () => {
  const items = continuationItems(2026);
  const entries = items.filter((i) => i.kind === 'entry');

  it('starts the day after the curated entries, and ends by 30 June', () => {
    expect(curatedEnd(2026)).toBe('2026-11-23');
    expect(entries.every((e) => e.date > '2026-11-23' && e.date <= '2027-06-30')).toBe(true);
  });

  it('puts every payment on a weekday', () => {
    for (const item of items) {
      expect([0, 6], item.date).not.toContain(weekday(item.date));
    }
  });

  it('gives the same entries each time', () => {
    expect(JSON.stringify(continuationItems(2026))).toBe(JSON.stringify(items));
  });

  it('knows the weekday of a date', () => {
    expect(weekday(day('2026-11-23'))).toBe(1); // a Monday
    expect(weekday(day('2026-11-15'))).toBe(0); // the wireframe's Sunday
    expect(weekday(day('2028-02-29'))).toBe(2);
    expect(financialYearStart(day('2027-06-30'))).toBe(2026);
    expect(financialYearStart(day('2027-07-01'))).toBe(2027);
  });
});
