// Ready formulas (spec 113; W07a, Option 4): plain-English spreadsheet formulas he can copy, as data.
// The same list is shown in the app with Copy buttons and written to the "Ready formulas" tab of
// every published workbook. On the tab, the explanations and the formulas to copy are plain text;
// only each row's example result is a working formula, made by the app, so it never holds bank text.
// GST in a price that includes GST is one eleventh, never 10% (au-bookkeeping-rules).

import { formatDateAU, type CalendarDate } from '@shared/dates';
import { asCents, type Cents } from '@shared/money';
import { gstInsideFormula } from './gst';
import { basDueDate, basPeriodOf } from './periods';
import type { AppTab, SheetCell } from './workbook';

export interface ReadyFormula {
  readonly name: string;
  readonly what: string;
  /** What he copies, written for a sheet with the figures in column B and the last period in C. */
  readonly formula: string;
  /** Example figures for the tab, then the same formula pointed at them (`{1}`, `{2}`). */
  readonly example: { readonly inputs: readonly Cents[]; readonly result: string };
}

/** The list, with the BAS due date worked out from today. */
export function readyFormulas(today: CalendarDate): readonly ReadyFormula[] {
  const due = basDueDate(basPeriodOf(today, 'quarterly'));
  const [y, m, d] = due.split('-').map(Number);
  const date = `DATE(${String(y)},${String(m)},${String(d)})`;
  return [
    {
      name: 'GST in an amount',
      what: 'The GST inside a price that includes GST (one eleventh).',
      formula: `=${gstInsideFormula('B2')}`,
      example: { inputs: [asCents(11000)], result: `=${gstInsideFormula('{1}')}` },
    },
    {
      name: 'Amount without GST',
      what: 'The price before GST.',
      formula: `=B2-${gstInsideFormula('B2')}`,
      example: { inputs: [asCents(11000)], result: `={1}-${gstInsideFormula('{1}')}` },
    },
    {
      name: '% of income',
      what: 'How big a cost is compared with sales. 0.25 is 25%.',
      formula: '=B3/B$2',
      example: { inputs: [asCents(250000), asCents(1000000)], result: '={1}/{2}' },
    },
    {
      name: 'Change from last quarter',
      what: 'This quarter minus last quarter.',
      formula: '=B3-C3',
      example: { inputs: [asCents(1231075), asCents(981240)], result: '={1}-{2}' },
    },
    {
      name: 'Flag if over an amount',
      what: 'Writes "Check" when a figure is over $1,000.',
      formula: '=IF(B3>1000, "Check", "")',
      example: { inputs: [asCents(125000)], result: '=IF({1}>1000, "Check", "")' },
    },
    {
      name: 'Days until the BAS is due',
      what: `Counts down to ${formatDateAU(due)}, the usual due date for this quarter's BAS when you lodge it yourself.`,
      formula: `=${date}-TODAY()`,
      example: { inputs: [], result: `=${date}-TODAY()` },
    },
  ];
}

const text = (t: string): SheetCell => ({ kind: 'text', text: t });
/** Example figures sit in columns D and E; the result in F. */
const INPUT_COLUMNS = ['D', 'E'] as const;

export function readyFormulasTab(today: CalendarDate): AppTab {
  const formulas = readyFormulas(today);
  const first = 3;
  return {
    key: 'ready-formulas',
    title: 'Ready formulas',
    columns: 6,
    rows: [
      [
        text(
          'Ready formulas from Accounting Books. Copy a formula into your own tab, and change the cells it points at.',
        ),
      ],
      [{ kind: 'empty' }],
      [
        text('Ready formula'),
        text('What it does'),
        text('Formula to copy'),
        text('Example'),
        text(''),
        text('Result'),
      ],
      ...formulas.map((f, i): SheetCell[] => {
        const row = String(first + i + 1);
        const result = f.example.result
          .replace(/\{1\}/g, `${INPUT_COLUMNS[0]}${row}`)
          .replace(/\{2\}/g, `${INPUT_COLUMNS[1]}${row}`);
        return [
          text(f.name),
          text(f.what),
          text(f.formula),
          f.example.inputs[0] === undefined
            ? { kind: 'empty' }
            : { kind: 'amount', cents: f.example.inputs[0] },
          f.example.inputs[1] === undefined
            ? { kind: 'empty' }
            : { kind: 'amount', cents: f.example.inputs[1] },
          { kind: 'formula', formula: result },
        ];
      }),
    ],
    editable: null,
  };
}
