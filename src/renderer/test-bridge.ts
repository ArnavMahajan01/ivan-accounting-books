// A stand-in for `window.bridge` in screen tests, with answers shaped like the sample books. A test
// replaces only the functions it cares about.

import { vi } from 'vitest';
import type { BridgeApi } from '@shared/bridge-contract';
import type { CalendarDate, Timestamp } from '@shared/dates';
import { asCents } from '@shared/money';
import { ok } from '@shared/result';
import type {
  AccountsView,
  BooksState,
  HomeSummary,
  TransactionDetail,
  TransactionRow,
  TransactionsPage,
} from '@shared/views';

export const date = (text: string): CalendarDate => text as CalendarDate;
export const moment = (text: string): Timestamp => text as Timestamp;

export const SAMPLE_STATE: BooksState = {
  mode: 'sample',
  businessName: 'Harbour Lane Joinery Pty Ltd',
  sampleSwitch: true,
  needsStartChoice: false,
};

export const REAL_STATE: BooksState = {
  mode: 'real',
  businessName: null,
  sampleSwitch: true,
  needsStartChoice: false,
};

export const HOME: HomeSummary = {
  brandNew: false,
  bank: { balance: asCents(4364235), accountCount: 2 },
  linesToReview: { count: 0, oldest: null },
  gst: { owing: asCents(318420), periodLabel: 'Oct–Dec 2026', periodEnd: date('2026-12-31') },
  profit: { amount: asCents(4245350), yearLabel: 'FY 2026–27', from: date('2026-07-01') },
  nextSteps: [],
  upToDate: true,
  warnings: [],
};

export const ACCOUNTS: AccountsView = {
  asAt: date('2026-11-23'),
  accounts: [
    {
      id: 'acc_one',
      code: '1000',
      name: 'Business One ··4821',
      type: 'asset',
      active: true,
      usualGst: { shortCode: 'N-T', treatment: 'outside-gst' },
      balance: asCents(1864235),
      bank: { bank: 'Westpac', lastFour: '4821' },
    },
    {
      id: 'acc_reserve',
      code: '1010',
      name: 'Business Cash Reserve ··7730',
      type: 'asset',
      active: true,
      usualGst: { shortCode: 'N-T', treatment: 'outside-gst' },
      balance: asCents(2500000),
      bank: { bank: 'Westpac', lastFour: '7730' },
    },
    {
      id: 'acc_prepay',
      code: '1300',
      name: 'Prepayments',
      type: 'asset',
      active: true,
      usualGst: null,
      balance: asCents(0),
      bank: null,
    },
    {
      id: 'acc_gst',
      code: '2200',
      name: 'GST',
      type: 'liability',
      active: true,
      usualGst: { shortCode: 'N-T', treatment: 'outside-gst' },
      balance: asCents(-318420),
      bank: null,
    },
    {
      id: 'acc_sales',
      code: '4000',
      name: 'Sales',
      type: 'income',
      active: true,
      usualGst: { shortCode: 'GST', treatment: 'taxable' },
      balance: asCents(-8183993),
      bank: null,
    },
    {
      id: 'acc_interest',
      code: '4200',
      name: 'Interest income',
      type: 'income',
      active: true,
      usualGst: { shortCode: 'INP', treatment: 'input-taxed' },
      balance: asCents(0),
      bank: null,
    },
    {
      id: 'acc_mat',
      code: '5000',
      name: 'Materials and supplies',
      type: 'expense',
      active: true,
      usualGst: { shortCode: 'GST', treatment: 'taxable' },
      balance: asCents(981240),
      bank: null,
    },
    {
      id: 'acc_old',
      code: '6999',
      name: 'Old account',
      type: 'expense',
      active: false,
      usualGst: null,
      balance: asCents(0),
      bank: null,
    },
  ],
};

export function row(over: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'ent_bunnings',
    date: date('2026-11-18'),
    sourceKind: 'bank-line',
    direction: 'out',
    payee: 'Bunnings',
    memo: 'Fixings and sundries',
    account: { id: 'acc_mat', code: '5000', name: 'Materials and supplies' },
    beforeGst: asCents(31105),
    gst: asCents(3110),
    total: asCents(34215),
    locked: false,
    ...over,
  };
}

export const TRANSACTIONS: TransactionsPage = {
  rows: [
    row(),
    row({
      id: 'ent_smith',
      date: date('2026-11-15'),
      sourceKind: 'invoice',
      direction: 'in',
      payee: 'Smith Renovations',
      memo: 'INV-1059: Entertainment unit',
      account: { id: 'acc_sales', code: '4000', name: 'Sales' },
      beforeGst: asCents(450000),
      gst: asCents(45000),
      total: asCents(495000),
    }),
    row({
      id: 'ent_timber',
      date: date('2026-09-28'),
      payee: 'Timberlink',
      memo: 'Timber order',
      beforeGst: asCents(194545),
      gst: asCents(19455),
      total: asCents(214000),
      locked: true,
    }),
  ],
  range: { from: date('2025-11-24'), to: date('2026-11-23') },
  matching: 3,
  offset: 0,
  limit: 100,
  totals: { beforeGst: asCents(675650), gst: asCents(67565), total: asCents(743215) },
  accountTotal: null,
};

export const DETAIL: TransactionDetail = {
  id: 'ent_bunnings',
  date: date('2026-11-18'),
  memo: 'Fixings and sundries',
  sourceKind: 'bank-line',
  payee: 'Bunnings',
  lines: [
    {
      accountId: 'acc_mat',
      accountCode: '5000',
      accountName: 'Materials and supplies',
      debit: asCents(31105),
      credit: asCents(0),
      gst: asCents(3110),
      taxCode: 'GST',
      payee: 'Bunnings',
    },
    {
      accountId: 'acc_gst',
      accountCode: '2200',
      accountName: 'GST',
      debit: asCents(3110),
      credit: asCents(0),
      gst: asCents(0),
      taxCode: null,
      payee: null,
    },
    {
      accountId: 'acc_one',
      accountCode: '1000',
      accountName: 'Business One ··4821',
      debit: asCents(0),
      credit: asCents(34215),
      gst: asCents(0),
      taxCode: null,
      payee: 'Bunnings',
    },
  ],
  beforeGst: asCents(31105),
  gst: asCents(3110),
  total: asCents(34215),
  locked: false,
  history: [
    { kind: 'posted', at: moment('2026-11-18T02:00:00.000Z'), changes: [] },
    {
      kind: 'changed',
      at: moment('2026-11-20T01:00:00.000Z'),
      changes: ['Account changed from Tools and small equipment to Materials and supplies'],
    },
  ],
};

/** Puts a stand-in bridge on `window`, and returns its functions so a test can look at the calls. */
export function installBridge(overrides: Partial<BridgeApi> = {}): BridgeApi {
  const api: BridgeApi = {
    'app.getInfo': vi.fn(() => Promise.resolve(ok({ version: '1.2.3', development: false }))),
    'app.getDataStatus': vi.fn(() =>
      Promise.resolve(ok({ schemaVersion: 1, integrity: 'ok' as const, problem: null })),
    ),
    'app.getBooksState': vi.fn(() => Promise.resolve(ok(SAMPLE_STATE))),
    'app.startOwnBooks': vi.fn(() => Promise.resolve(ok(REAL_STATE))),
    'books.getHealth': vi.fn(() => Promise.resolve(ok({ problems: [], entries: 94, lines: 300 }))),
    'sample.load': vi.fn(() => Promise.resolve(ok(SAMPLE_STATE))),
    'sample.clear': vi.fn(() => Promise.resolve(ok(REAL_STATE))),
    'home.getSummary': vi.fn(() => Promise.resolve(ok(HOME))),
    'accounts.list': vi.fn(() => Promise.resolve(ok(ACCOUNTS))),
    'transactions.list': vi.fn(() => Promise.resolve(ok(TRANSACTIONS))),
    'transactions.get': vi.fn(() => Promise.resolve(ok(DETAIL))),
    ...overrides,
  };
  // Every function is a spy, so a test can look at its calls whether it replaced it or not.
  const spied = Object.fromEntries(
    Object.entries(api).map(([name, fn]) => [name, vi.isMockFunction(fn) ? fn : vi.fn(fn)]),
  ) as unknown as BridgeApi;
  Object.defineProperty(window, 'bridge', { configurable: true, value: spied });
  return spied;
}

/** Lets pending bridge answers arrive and the screen draw them. */
export async function settle(): Promise<void> {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
