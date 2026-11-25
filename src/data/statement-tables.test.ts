import { beforeEach, describe, expect, it } from 'vitest';
import type { ImportBatch, StatementLine } from '@domain/statement-lines';
import { parseCalendarDate, parseTimestamp } from '@shared/dates';
import { asCents } from '@shared/money';
import {
  existingLineKeys,
  insertImportBatch,
  insertStatementLine,
  latestBatchForAccount,
  listLinesInBatch,
  summariseLinesToReview,
  streamStart,
  sumLinesUpTo,
} from './statement-repository';
import { integrityProblems } from './database';
import { createTestDatabase } from './test-database';

let db: ReturnType<typeof createTestDatabase>['db'];
beforeEach(() => {
  db = createTestDatabase().db;
  // Raw SQL on purpose: the account rows are the table's neighbours, not what is being tested.
  db.exec(`
    INSERT INTO account (id, code, name, type, created_at, updated_at)
      VALUES ('acc_bank', '1000', 'Bank', 'asset', 't', 't');
    INSERT INTO bank_account (id, name, bank, last_four, ledger_account_id, created_at, updated_at)
      VALUES ('bnk_one', 'Business One', 'Westpac', '4821', 'acc_bank', 't', 't');
  `);
});

const date = (text: string) => {
  const r = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!r.ok) throw new Error(text);
  return r.value;
};
const time = (text: string) => {
  const r = parseTimestamp(text);
  if (!r.ok) throw new Error(text);
  return r.value;
};

const batch = (over: Partial<ImportBatch> = {}): ImportBatch => ({
  id: 'imp_1',
  bankAccountId: 'bnk_one',
  fileName: 'file.ofx',
  format: 'ofx',
  fileHash: 'a'.repeat(64),
  periodFrom: date('2026-11-01'),
  periodTo: date('2026-11-14'),
  newCount: 2,
  duplicateCount: 0,
  rejectedCount: 0,
  openingBalance: asCents(300000),
  closingBalance: { amount: asCents(500000), date: date('2026-11-14') },
  importedAt: time('2026-11-23T01:00:00.000Z'),
  ...over,
});

const line = (over: Partial<StatementLine> = {}): StatementLine => ({
  id: 'stl_1',
  bankAccountId: 'bnk_one',
  batchId: 'imp_1',
  date: date('2026-11-03'),
  description: 'BUNNINGS 4532',
  amount: asCents(-34215),
  balance: null,
  key: 'fitid:A1',
  status: 'to-review',
  createdAt: time('2026-11-23T01:00:00.000Z'),
  ...over,
});

describe('the statement tables', () => {
  it('store a batch and its lines, and read them back as they were written', () => {
    insertImportBatch(db, batch());
    insertStatementLine(db, line());
    insertStatementLine(db, line({ id: 'stl_2', key: 'fitid:A2', balance: asCents(465785) }));
    expect(latestBatchForAccount(db, 'bnk_one')).toEqual(batch());
    expect(listLinesInBatch(db, 'imp_1')).toEqual([
      line(),
      line({ id: 'stl_2', key: 'fitid:A2', balance: asCents(465785) }),
    ]);
    expect(integrityProblems(db)).toEqual([]);
  });

  it('refuse the same line twice for one account, and allow it for another', () => {
    insertImportBatch(db, batch());
    insertStatementLine(db, line());
    expect(() => {
      insertStatementLine(db, line({ id: 'stl_2' }));
    }).toThrow(/UNIQUE/);
    db.exec(`
      INSERT INTO account (id, code, name, type, created_at, updated_at)
        VALUES ('acc_two', '1010', 'Reserve', 'asset', 't', 't');
      INSERT INTO bank_account (id, name, bank, last_four, ledger_account_id, created_at, updated_at)
        VALUES ('bnk_two', 'Reserve', 'Westpac', '7730', 'acc_two', 't', 't');
    `);
    insertImportBatch(db, batch({ id: 'imp_2', bankAccountId: 'bnk_two' }));
    expect(() => {
      insertStatementLine(db, line({ id: 'stl_3', bankAccountId: 'bnk_two', batchId: 'imp_2' }));
    }).not.toThrow();
  });

  it('refuse a line of nothing, a made-up status, and an unknown account or batch', () => {
    insertImportBatch(db, batch());
    expect(() => {
      insertStatementLine(db, line({ amount: asCents(0) }));
    }).toThrow(/CHECK/);
    expect(() => {
      insertStatementLine(db, line({ status: 'lost' as StatementLine['status'] }));
    }).toThrow(/CHECK/);
    expect(() => {
      insertStatementLine(db, line({ bankAccountId: 'bnk_nope' }));
    }).toThrow(/FOREIGN KEY/);
    expect(() => {
      insertStatementLine(db, line({ batchId: 'imp_nope' }));
    }).toThrow(/FOREIGN KEY/);
  });

  it('refuse a batch that ends before it starts, a bad hash, and half a closing balance', () => {
    expect(() => {
      insertImportBatch(
        db,
        batch({ periodFrom: date('2026-11-20'), periodTo: date('2026-11-01') }),
      );
    }).toThrow(/CHECK/);
    expect(() => {
      insertImportBatch(db, batch({ fileHash: 'xyz' }));
    }).toThrow(/CHECK/);
    expect(() =>
      db
        .prepare(
          `INSERT INTO import_batch (id, bank_account_id, file_name, format, file_hash, period_from, period_to,
             new_count, duplicate_count, rejected_count, opening_balance_cents, closing_balance_cents, imported_at)
           VALUES ('imp_9', 'bnk_one', 'f.ofx', 'ofx', '${'b'.repeat(64)}', '2026-11-01', '2026-11-02', 1, 0, 0, 100, 500, 't')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('say which keys are already stored, for one account only', () => {
    insertImportBatch(db, batch());
    insertStatementLine(db, line());
    insertStatementLine(db, line({ id: 'stl_2', key: 'fitid:A2' }));
    expect(existingLineKeys(db, 'bnk_one', ['fitid:A1', 'fitid:A3', 'fitid:A2'])).toEqual(
      new Set(['fitid:A1', 'fitid:A2']),
    );
    expect(existingLineKeys(db, 'bnk_other', ['fitid:A1'])).toEqual(new Set());
    expect(existingLineKeys(db, 'bnk_one', [])).toEqual(new Set());
  });

  it('count the lines waiting for review, and add up every line for the stream', () => {
    insertImportBatch(db, batch());
    insertStatementLine(db, line({ date: date('2026-11-03'), amount: asCents(-100) }));
    insertStatementLine(
      db,
      line({ id: 'stl_2', key: 'k2', date: date('2026-11-10'), amount: asCents(250) }),
    );
    insertStatementLine(
      db,
      line({
        id: 'stl_3',
        key: 'k3',
        date: date('2026-11-12'),
        amount: asCents(999),
        status: 'excluded',
      }),
    );
    expect(summariseLinesToReview(db)).toEqual({ count: 2, oldest: date('2026-11-03') });
    // Every status counts for the stream: an excluded line is still on the bank's statement.
    expect(sumLinesUpTo(db, 'bnk_one', date('2026-11-05'))).toBe(-100);
    expect(sumLinesUpTo(db, 'bnk_one', date('2026-11-30'))).toBe(1149);
  });

  it('start the stream from the opening balance of the earliest file that has one', () => {
    expect(streamStart(db, 'bnk_one')).toBeNull();
    insertImportBatch(
      db,
      batch({
        id: 'imp_2',
        fileHash: 'c'.repeat(64),
        periodFrom: date('2026-11-05'),
        openingBalance: asCents(111),
      }),
    );
    insertImportBatch(
      db,
      batch({
        id: 'imp_1',
        fileHash: 'b'.repeat(64),
        periodFrom: date('2026-11-01'),
        openingBalance: asCents(222),
      }),
    );
    insertImportBatch(
      db,
      batch({
        id: 'imp_0',
        fileHash: 'd'.repeat(64),
        periodFrom: date('2026-10-01'),
        openingBalance: null,
        closingBalance: null,
      }),
    );
    expect(streamStart(db, 'bnk_one')).toEqual({ opening: 222, from: date('2026-11-01') });
  });

  it('pick the batch that ends latest as the account’s last statement', () => {
    insertImportBatch(db, batch({ id: 'imp_1', periodTo: date('2026-11-14') }));
    insertImportBatch(
      db,
      batch({ id: 'imp_2', fileHash: 'c'.repeat(64), periodTo: date('2026-11-30') }),
    );
    insertImportBatch(
      db,
      batch({ id: 'imp_3', fileHash: 'd'.repeat(64), periodTo: date('2026-11-20') }),
    );
    expect(latestBatchForAccount(db, 'bnk_one')?.id).toBe('imp_2');
    expect(latestBatchForAccount(db, 'bnk_none')).toBeNull();
  });
});
