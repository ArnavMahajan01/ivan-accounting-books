import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import {
  a1Range,
  blockA1,
  columnLetters,
  planWorkbook,
  type AppTab,
  type SheetCell,
} from './workbook';

const text = (t: string): SheetCell => ({ kind: 'text', text: t });
const amount = (c: number): SheetCell => ({ kind: 'amount', cents: asCents(c) });

function tab(key: string, title: string, rows: number): AppTab {
  return {
    key,
    title,
    columns: 3,
    rows: [
      [text('Account'), text('Oct–Dec 2026'), text('Note')],
      ...Array.from({ length: rows - 1 }, (_, i) => [
        text(`Row ${String(i)}`),
        amount(100 * i),
        text(''),
      ]),
    ],
    editable: key === 'transactions' ? { fromRow: 1, columns: [2] } : null,
  };
}

describe('a new workbook', () => {
  it('adds each app tab with its marker and removes the blank tab Google made', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 4), tab('ready-formulas', 'Ready formulas', 2)],
      now: [{ sheetId: 0, title: 'Sheet1', key: null, protectionIds: [] }],
      isNew: true,
      previousRows: {},
    });
    expect(plan.addTabs).toEqual([
      { sheetId: 1000, title: 'Profit and loss', key: 'report' },
      { sheetId: 1001, title: 'Ready formulas', key: 'ready-formulas' },
    ]);
    expect(plan.removeTabs).toEqual([0]);
    expect(plan.kept).toEqual([]);
    expect(plan.writes.map((w) => [w.title, w.clearRows])).toEqual([
      ['Profit and loss', 4],
      ['Ready formulas', 2],
    ]);
  });
});

describe('publishing again keeps his work', () => {
  const now = [
    { sheetId: 1000, title: 'P&L for Sam', key: 'report', protectionIds: [77] },
    { sheetId: 5, title: 'My workings', key: null, protectionIds: [] },
    { sheetId: 1001, title: 'Ready formulas', key: 'ready-formulas', protectionIds: [78] },
  ];

  it('finds a renamed app tab by its marker, not its name, and keeps his name', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 4), tab('ready-formulas', 'Ready formulas', 2)],
      now,
      isNew: false,
      previousRows: { report: 4, 'ready-formulas': 2 },
    });
    expect(plan.addTabs).toEqual([]);
    expect(plan.writes[0]).toMatchObject({ sheetId: 1000, title: 'P&L for Sam' });
  });

  it('leaves his extra tabs alone and never removes them', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 4)],
      now,
      isNew: false,
      previousRows: { report: 4 },
    });
    expect(plan.kept).toEqual(['My workings']);
    expect(plan.removeTabs).toEqual([]);
  });

  it('writes only the app’s columns, so his extra columns to the right are not in any range', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 4)],
      now,
      isNew: false,
      previousRows: { report: 4 },
    });
    const write = plan.writes[0];
    expect(write?.columns).toBe(3);
    // Column D onwards is his: the cleared and written range ends at C.
    expect(a1Range(write?.title ?? '', write?.columns ?? 0, write?.clearRows ?? 0)).toBe(
      "'P&L for Sam'!A1:C4",
    );
  });

  it('clears the rows it wrote last time when the report is now shorter, and no more', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 3)],
      now,
      isNew: false,
      previousRows: { report: 6 },
    });
    expect(plan.writes[0]?.clearRows).toBe(6);
  });

  it('replaces only the app’s own protections', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 3)],
      now,
      isNew: false,
      previousRows: { report: 3 },
    });
    expect(plan.removeProtections).toEqual([77]);
  });

  it('adds a tab he deleted again, under a free name if he took its name for his own tab', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 3), tab('ready-formulas', 'My workings', 2)],
      now: now.filter((t) => t.key !== 'ready-formulas'),
      isNew: false,
      previousRows: { report: 3 },
    });
    expect(plan.addTabs).toEqual([
      { sheetId: 1001, title: 'My workings (2)', key: 'ready-formulas' },
    ]);
    expect(plan.writes[1]?.clearRows).toBe(2);
  });
});

describe('cell formats and ranges', () => {
  it('marks amount columns from their first amount', () => {
    const plan = planWorkbook({
      tabs: [tab('report', 'Profit and loss', 3)],
      now: [],
      isNew: true,
      previousRows: {},
    });
    expect(plan.writes[0]?.formats).toEqual([{ column: 1, fromRow: 1, kind: 'amount' }]);
  });

  it('names columns past Z, and quotes a tab name with an apostrophe', () => {
    expect([columnLetters(0), columnLetters(25), columnLetters(26), columnLetters(701)]).toEqual([
      'A',
      'Z',
      'AA',
      'ZZ',
    ]);
    expect(a1Range("Sam's tab", 2, 5, 1)).toBe("'Sam''s tab'!A2:B5");
    expect(blockA1('Transactions', 4, 5, 7, 89)).toBe("'Transactions'!E6:H90");
  });
});
