// A stand-in for `window.bridge` in screen tests, with answers shaped like the sample books. A test
// replaces only the functions it cares about.

import { vi } from 'vitest';
import type { BridgeApi, RulesView } from '@shared/bridge-contract';
import type { Rule } from '@shared/rule-types';
import type { CalendarDate, Timestamp } from '@shared/dates';
import { asCents } from '@shared/money';
import { ok } from '@shared/result';
import type {
  AccountsView,
  BankAccountRow,
  BankView,
  BooksState,
  HomeSummary,
  ImportLineView,
  ImportPreview,
  ReviewLineView,
  ReviewView,
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
  taxCodes: [
    { id: 'tax_gst', shortCode: 'GST', name: 'GST (10%)' },
    { id: 'tax_fre', shortCode: 'FRE', name: 'GST-free' },
    { id: 'tax_inp', shortCode: 'INP', name: 'Input taxed' },
    { id: 'tax_nt', shortCode: 'N-T', name: 'Outside GST' },
  ],
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
      usualTaxCodeId: null,
      parentId: null,
      hasPostedLines: true,
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
    movable: true,
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
      movable: false,
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

export const BANK_ONE: BankAccountRow = {
  id: 'bnk_one',
  name: 'Business One ··4821',
  lastFour: '4821',
  balance: asCents(1864235),
  lastStatement: { balance: asCents(1864235), date: date('2026-11-20') },
  linesToReview: 0,
  reconciledTo: null,
  parentId: null,
  undoableImport: null,
};

export const BANK_RESERVE: BankAccountRow = {
  id: 'bnk_reserve',
  name: 'Business Cash Reserve ··7730',
  lastFour: '7730',
  balance: asCents(2500000),
  lastStatement: null,
  linesToReview: 0,
  reconciledTo: null,
  parentId: null,
  undoableImport: null,
};

export const BANK: BankView = { accounts: [BANK_ONE, BANK_RESERVE] };

function line(
  position: number,
  status: 'new' | 'duplicate',
  day: string,
  text: string,
  cents: number,
): ImportLineView {
  return { status, position, date: date(day), description: text, amount: asCents(cents) };
}

/** A clean file: every line is new and the balance matches. */
export const CLEAN_PREVIEW: ImportPreview = {
  previewId: 'pre_clean',
  fileName: 'Westpac_4821_14-20Nov2026.ofx',
  account: { id: 'bnk_one', name: 'Business One ··4821', lastFour: '4821' },
  period: { from: date('2026-11-14'), to: date('2026-11-20') },
  counts: { new: 3, duplicate: 0, rejected: 0 },
  balance: { kind: 'match', closing: asCents(2130790), closingDate: date('2026-11-20') },
  lines: [
    line(1, 'new', '2026-11-15', 'DEPOSIT SMITH RENOVATIONS INV 1059', 495000),
    line(2, 'new', '2026-11-16', 'AMPOL ALEXANDRIA', -9640),
    line(3, 'new', '2026-11-18', 'BUNNINGS 4532', -34215),
  ],
};

/** A file that overlaps an earlier one: some lines are skipped. */
export const DUPLICATES_PREVIEW: ImportPreview = {
  ...CLEAN_PREVIEW,
  previewId: 'pre_duplicates',
  counts: { new: 2, duplicate: 1, rejected: 0 },
  lines: [
    line(1, 'duplicate', '2026-11-14', 'TIMBERLINK SUPPLIES PTY LTD', -128470),
    line(2, 'new', '2026-11-15', 'DEPOSIT SMITH RENOVATIONS INV 1059', 495000),
    line(3, 'new', '2026-11-16', 'AMPOL ALEXANDRIA', -9640),
  ],
};

/** A file with a line that could not be read, so the balance is out by that line. */
export const PROBLEM_PREVIEW: ImportPreview = {
  ...CLEAN_PREVIEW,
  previewId: 'pre_problem',
  counts: { new: 2, duplicate: 1, rejected: 1 },
  balance: {
    kind: 'difference',
    closing: asCents(2130790),
    closingDate: date('2026-11-20'),
    expected: asCents(2120790),
    difference: asCents(10000),
    explainedByRejected: true,
  },
  lines: [
    line(1, 'duplicate', '2026-11-14', 'TIMBERLINK SUPPLIES PTY LTD', -128470),
    {
      status: 'rejected',
      position: 2,
      fileLine: 17,
      reason: 'impossible-date',
      value: '20261131',
      description: 'ENGRAVING SERVICE',
      amount: asCents(-10000),
    },
    line(3, 'new', '2026-11-15', 'DEPOSIT SMITH RENOVATIONS INV 1059', 495000),
    line(4, 'new', '2026-11-16', 'AMPOL ALEXANDRIA', -9640),
  ],
};

export function reviewLine(over: Partial<ReviewLineView> = {}): ReviewLineView {
  return {
    id: 'stl_bunnings',
    date: date('2026-11-04'),
    description: 'BUNNINGS 4532',
    amount: asCents(-41260),
    bankAccountId: 'bnk_one',
    bankAccountName: 'Business One ··4821',
    payee: null,
    suggestion: null,
    match: null,
    transfer: null,
    ...over,
  };
}

/** To review with five invented lines: a suggestion, a match, a transfer, money in, and a new one. */
export const REVIEW: ReviewView = {
  lines: [
    reviewLine({
      id: 'stl_timber',
      date: date('2026-11-01'),
      description: 'TIMBERLINK SUPPLIES PTY LTD',
      amount: asCents(-128470),
      payee: { contactId: 'con_timber', name: 'Timberlink Supplies' },
      suggestion: {
        accountId: 'acc_mat',
        taxCodeId: 'tax_gst',
        reason: 'same-as-last-time',
        rule: null,
      },
    }),
    reviewLine({
      id: 'stl_ampol',
      date: date('2026-11-02'),
      description: 'AMPOL ALEXANDRIA',
      amount: asCents(-8820),
      match: { entryId: 'ent_fuel', date: date('2026-11-02'), text: 'Ampol' },
    }),
    reviewLine({
      id: 'stl_deposit',
      date: date('2026-11-03'),
      description: 'DEPOSIT ELLIS BATHROOMS INV 1058',
      amount: asCents(330000),
    }),
    reviewLine(),
    reviewLine({
      id: 'stl_transfer',
      date: date('2026-11-06'),
      description: 'TRANSFER TO CASH RESERVE 7730',
      amount: asCents(-200000),
      transfer: {
        lineId: 'stl_reserve_in',
        bankAccountId: 'bnk_reserve',
        bankAccountName: 'Business Cash Reserve ··7730',
        date: date('2026-11-06'),
        alreadyPosted: false,
      },
    }),
  ],
  counts: { all: 5, suggested: 3, noSuggestion: 2 },
  waiting: 5,
  bankAccounts: [
    { id: 'bnk_one', name: 'Business One ··4821' },
    { id: 'bnk_reserve', name: 'Business Cash Reserve ··7730' },
  ],
  accounts: [
    { id: 'acc_gst', code: '2200', name: 'GST', type: 'liability', defaultTaxCodeId: 'tax_nt' },
    { id: 'acc_sales', code: '4000', name: 'Sales', type: 'income', defaultTaxCodeId: 'tax_gst' },
    {
      id: 'acc_mat',
      code: '5000',
      name: 'Materials and supplies',
      type: 'expense',
      defaultTaxCodeId: 'tax_gst',
    },
    {
      id: 'acc_fees',
      code: '6010',
      name: 'Bank fees',
      type: 'expense',
      defaultTaxCodeId: 'tax_inp',
    },
    {
      id: 'acc_office',
      code: '6060',
      name: 'Office supplies',
      type: 'expense',
      defaultTaxCodeId: 'tax_gst',
    },
    {
      id: 'acc_tools',
      code: '6110',
      name: 'Tools and small equipment',
      type: 'expense',
      defaultTaxCodeId: 'tax_gst',
    },
  ],
  taxCodes: [
    { id: 'tax_gst', shortCode: 'GST', name: 'GST (10%)' },
    { id: 'tax_fre', shortCode: 'FRE', name: 'GST-free' },
    { id: 'tax_inp', shortCode: 'INP', name: 'Input taxed' },
    { id: 'tax_nt', shortCode: 'N-T', name: 'Outside GST' },
  ],
  contacts: [
    { id: 'con_ellis', name: 'Ellis Bathrooms' },
    { id: 'con_timber', name: 'Timberlink Supplies' },
  ],
};

/** The Rules page with three invented rules, as in the wireframe. */
export const RULES: RulesView = {
  rules: [
    {
      id: 'rul_timber',
      name: 'Timberlink is always materials',
      position: 0,
      active: true,
      direction: 'out',
      bankAccountIds: [],
      matchMode: 'all',
      conditions: [{ field: 'description', op: 'contains', text: 'TIMBERLINK' }],
      target: { kind: 'account', accountId: 'acc_mat', taxCodeId: 'tax_gst' },
      payeeId: 'con_timber',
      autoPost: true,
    },
    {
      id: 'rul_fuel',
      name: 'Fuel',
      position: 1,
      active: true,
      direction: 'out',
      bankAccountIds: ['bnk_one'],
      matchMode: 'any',
      conditions: [
        { field: 'description', op: 'contains', text: 'AMPOL' },
        { field: 'description', op: 'contains', text: 'SHELL' },
      ],
      target: { kind: 'account', accountId: 'acc_fees', taxCodeId: 'tax_gst' },
      payeeId: null,
      autoPost: false,
    },
    {
      id: 'rul_phone',
      name: 'Phone and internet',
      position: 2,
      active: false,
      direction: 'out',
      bankAccountIds: [],
      matchMode: 'all',
      conditions: [{ field: 'description', op: 'contains', text: 'SKYLINK' }],
      target: {
        kind: 'split',
        parts: [
          { accountId: 'acc_office', taxCodeId: 'tax_gst', percentBp: 7000 },
          { accountId: 'acc_tools', taxCodeId: 'tax_nt', percentBp: 3000 },
        ],
      },
      payeeId: null,
      autoPost: false,
    },
  ],
  accounts: REVIEW.accounts,
  taxCodes: REVIEW.taxCodes,
  contacts: REVIEW.contacts,
  bankAccounts: REVIEW.bankAccounts,
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
    'bank.list': vi.fn(() => Promise.resolve(ok(BANK))),
    'bank.chooseAndPreview': vi.fn(() => Promise.resolve(ok({ kind: 'cancelled' as const }))),
    'bank.previewFile': vi.fn(() =>
      Promise.resolve(ok({ kind: 'preview' as const, preview: CLEAN_PREVIEW })),
    ),
    'bank.commitImport': vi.fn(() =>
      Promise.resolve(
        ok({
          kind: 'imported' as const,
          added: 3,
          skipped: 0,
          rejected: 0,
          accountName: 'Business One ··4821',
          postedByRules: [],
          rulesCouldNot: 0,
        }),
      ),
    ),
    'bank.undoImport': vi.fn(() =>
      Promise.resolve(
        ok({ kind: 'undone' as const, removed: 3, fileName: 'Westpac_4821_14-20Nov2026.ofx' }),
      ),
    ),
    'review.getCount': vi.fn(() => Promise.resolve(ok({ count: 0 }))),
    'review.list': vi.fn(() => Promise.resolve(ok(REVIEW))),
    'review.post': vi.fn((input: { actions: readonly { lineId: string }[] }) =>
      Promise.resolve(
        ok({ posted: input.actions.map((a) => a.lineId), alsoPosted: [], failed: [] }),
      ),
    ),
    'review.split': vi.fn((input: { lineId: string }) =>
      Promise.resolve(ok({ posted: [input.lineId], alsoPosted: [], failed: [] })),
    ),
    'review.undo': vi.fn((input: { lineIds: readonly string[] }) =>
      Promise.resolve(ok({ kind: 'undone' as const, lines: input.lineIds.length })),
    ),
    'review.savePayee': vi.fn((input: { name: string }) =>
      Promise.resolve(
        ok({
          kind: 'saved' as const,
          contactId: 'con_new',
          name: input.name,
          created: true,
          kindOfContact: 'supplier' as const,
          words: 'BUNNINGS',
          alsoFilled: 2,
        }),
      ),
    ),
    'review.undoPayee': vi.fn(() => Promise.resolve(ok({ undone: true }))),
    'rules.list': vi.fn(() => Promise.resolve(ok(RULES))),
    'rules.save': vi.fn(() =>
      Promise.resolve(ok({ kind: 'saved' as const, rule: RULES.rules[0] as Rule })),
    ),
    'rules.setActive': vi.fn(() => Promise.resolve(ok({ changed: true }))),
    'rules.move': vi.fn(() => Promise.resolve(ok({ changed: true }))),
    'rules.remove': vi.fn(() => Promise.resolve(ok({ removed: true }))),
    'rules.test': vi.fn(() => Promise.resolve(ok({ waiting: 9, posted: 41, lines: [] }))),
    'rules.offerFor': vi.fn(() => Promise.resolve(ok({ offer: null }))),
    'transactions.move': vi.fn((input: { entryIds: readonly string[] }) =>
      Promise.resolve(ok({ moved: [...input.entryIds], failed: [] })),
    ),
    'accounts.add': vi.fn(() => Promise.resolve(ok({ kind: 'saved' as const, id: 'acc_new' }))),
    'accounts.edit': vi.fn((input: { id: string }) =>
      Promise.resolve(ok({ kind: 'saved' as const, id: input.id })),
    ),
    'accounts.setActive': vi.fn((input: { id: string }) =>
      Promise.resolve(ok({ kind: 'saved' as const, id: input.id })),
    ),
    'bank.checkReconcile': vi.fn(() =>
      Promise.resolve(
        ok({
          accountName: 'Business One ··4821',
          statementDate: date('2026-11-20'),
          statementBalance: asCents(1864235),
          booksBalance: asCents(1864235),
          difference: asCents(0),
          waiting: [],
          explainedByWaiting: false,
          lastReconciled: null,
        }),
      ),
    ),
    'bank.finishReconcile': vi.fn(() => Promise.resolve(ok({ kind: 'done' as const, lines: 18 }))),
    pathForFile: vi.fn((file: File) => `/Users/someone/Downloads/${file.name}`),
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
