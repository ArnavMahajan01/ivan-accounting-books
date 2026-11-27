// Which parts of a published workbook are the app's and which are his (spec 109). Pure.
//
// The app's tabs carry a marker (developer metadata on the tab, key TAB_MARKER, value the tab's
// key), so a tab he renamed is still found. On an app tab, the app owns columns A to its last
// column, from row 1 down to the longer of what it wrote last time and what it writes now.
// Everything else is his: his own tabs, his columns to the right, his rows below. Publishing again
// clears and rewrites only the app's range, so his work is never touched.

import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';

/** The developer metadata key that marks a tab as the app's. */
export const TAB_MARKER = 'accounting-books-tab';
/** The description on the app's protected ranges, so publishing again can replace them. */
export const PROTECTION_MARK = 'accounting-books';

export type SheetCell =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'amount'; readonly cents: Cents }
  | { readonly kind: 'date'; readonly date: CalendarDate }
  /** The app's own example formulas on the Ready formulas tab. Never bank text. */
  | { readonly kind: 'formula'; readonly formula: string }
  | { readonly kind: 'empty' };

/** One tab as the app wants it. */
export interface AppTab {
  /** Stable, such as `report`, `transactions`, `ready-formulas`. Stored in the marker. */
  readonly key: string;
  /** The name a new tab gets. A tab he renamed keeps his name. */
  readonly title: string;
  readonly rows: readonly (readonly SheetCell[])[];
  /** How many columns, from A, are the app's. */
  readonly columns: number;
  /** The cells an editor may change: these columns, from this row (0-based) down. */
  readonly editable: { readonly fromRow: number; readonly columns: readonly number[] } | null;
}

/** A tab as it is in the workbook now. */
export interface TabNow {
  readonly sheetId: number;
  readonly title: string;
  /** The marker's value, or null for a tab that is his. */
  readonly key: string | null;
  /** The app's own protected ranges on this tab. */
  readonly protectionIds: readonly number[];
}

export interface TabWrite {
  readonly key: string;
  readonly sheetId: number;
  /** The tab's name now, for A1 ranges. */
  readonly title: string;
  readonly columns: number;
  /** Rows of the app's columns cleared before writing: the longer of last time and now. */
  readonly clearRows: number;
  readonly rows: readonly (readonly SheetCell[])[];
  readonly editable: AppTab['editable'];
  /** Columns shown as amounts or dates, from the first row that holds one. */
  readonly formats: readonly {
    readonly column: number;
    readonly fromRow: number;
    readonly kind: 'amount' | 'date';
  }[];
}

export interface WorkbookPlan {
  /** App tabs to add, each with its marker. */
  readonly addTabs: readonly {
    readonly sheetId: number;
    readonly title: string;
    readonly key: string;
  }[];
  /** The blank first tab Google makes in a new workbook, removed once the app's tabs exist. */
  readonly removeTabs: readonly number[];
  /** The app's old protected ranges, replaced by new ones. */
  readonly removeProtections: readonly number[];
  readonly writes: readonly TabWrite[];
  /** His tabs, left as they are. */
  readonly kept: readonly string[];
}

export interface PlanInput {
  readonly tabs: readonly AppTab[];
  readonly now: readonly TabNow[];
  /** True for a workbook the app has just made: its unmarked tab is Google's blank one, not his. */
  readonly isNew: boolean;
  /** How many rows each app tab had last time, by key. */
  readonly previousRows: Readonly<Record<string, number>>;
}

const sameName = (a: string, b: string) =>
  a.toLocaleLowerCase('en-AU') === b.toLocaleLowerCase('en-AU');

/** A free name for a new app tab: his tab may already use the one it wants. */
function freeTitle(wanted: string, taken: readonly string[]): string {
  if (!taken.some((t) => sameName(t, wanted))) return wanted;
  for (let n = 2; ; n += 1) {
    const title = `${wanted} (${String(n)})`;
    if (!taken.some((t) => sameName(t, title))) return title;
  }
}

function formatsOf(tab: AppTab): TabWrite['formats'] {
  const formats: { column: number; fromRow: number; kind: 'amount' | 'date' }[] = [];
  for (let column = 0; column < tab.columns; column += 1) {
    const fromRow = tab.rows.findIndex((row) => {
      const kind = row[column]?.kind;
      return kind === 'amount' || kind === 'date';
    });
    const cell = fromRow < 0 ? undefined : tab.rows[fromRow]?.[column];
    if (cell?.kind === 'amount' || cell?.kind === 'date') {
      formats.push({ column, fromRow, kind: cell.kind });
    }
  }
  return formats;
}

export function planWorkbook(input: PlanInput): WorkbookPlan {
  const used = new Set(input.now.map((t) => t.sheetId));
  let nextId = 1000;
  const newSheetId = () => {
    while (used.has(nextId)) nextId += 1;
    used.add(nextId);
    return nextId;
  };
  const mine = input.isNew ? [] : input.now.filter((t) => t.key === null);
  const titles = [...input.now.filter((t) => !input.isNew || t.key !== null).map((t) => t.title)];

  const addTabs: { sheetId: number; title: string; key: string }[] = [];
  const writes: TabWrite[] = [];
  for (const tab of input.tabs) {
    const found = input.now.find((t) => t.key === tab.key);
    let sheetId: number;
    let title: string;
    if (found === undefined) {
      sheetId = newSheetId();
      title = freeTitle(tab.title, titles);
      titles.push(title);
      addTabs.push({ sheetId, title, key: tab.key });
    } else {
      sheetId = found.sheetId;
      title = found.title;
    }
    const before = found === undefined ? 0 : (input.previousRows[tab.key] ?? 0);
    writes.push({
      key: tab.key,
      sheetId,
      title,
      columns: tab.columns,
      clearRows: Math.max(before, tab.rows.length),
      rows: tab.rows,
      editable: tab.editable,
      formats: formatsOf(tab),
    });
  }
  return {
    addTabs,
    removeTabs: input.isNew ? input.now.filter((t) => t.key === null).map((t) => t.sheetId) : [],
    removeProtections: input.now
      .filter((t) => input.tabs.some((tab) => tab.key === t.key))
      .flatMap((t) => t.protectionIds),
    writes,
    kept: mine.map((t) => t.title),
  };
}

/** A column's letters: 0 is A, 25 is Z, 26 is AA. */
export function columnLetters(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** `'His tab'!A1:F20`, with the tab's name quoted the way Sheets wants. */
export function a1Range(title: string, columns: number, rows: number, fromRow = 0): string {
  const quoted = `'${title.replace(/'/g, "''")}'`;
  return `${quoted}!A${String(fromRow + 1)}:${columnLetters(columns - 1)}${String(Math.max(rows, fromRow + 1))}`;
}

/** One cell, such as `'Ready formulas'!C3`. Column and row are 0-based. */
export function cellA1(title: string, column: number, row: number): string {
  return `'${title.replace(/'/g, "''")}'!${columnLetters(column)}${String(row + 1)}`;
}

/** The text a cell shows in the sheet: for the preview, the in-memory Google and tests. */
export function shownText(cell: SheetCell): string {
  switch (cell.kind) {
    case 'text':
      return cell.text;
    case 'amount': {
      const sign = cell.cents < 0 ? '-' : '';
      const size = String(Math.abs(cell.cents)).padStart(3, '0');
      const whole = size.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${sign}${whole}.${size.slice(-2)}`;
    }
    case 'date': {
      const [y, m, d] = cell.date.split('-');
      return `${d ?? ''}/${m ?? ''}/${y ?? ''}`;
    }
    case 'formula':
      return cell.formula;
    case 'empty':
      return '';
  }
}
