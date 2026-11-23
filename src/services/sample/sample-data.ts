// The invented business whose books every demo uses until go-live (spec 046). Everything here is
// made up: Harbour Lane Joinery Pty Ltd, a placeholder ABN, two invented bank accounts, and
// customers and suppliers that exist only in this file. Nothing comes from the client.
//
// The curated entries run from 1 July to 23 November. Their amounts were solved so that on
// 23 November 2026 the books show the figures in the signed-off wireframes: Business One
// $18,642.35, Business Cash Reserve $25,000.00, GST owing for October to December $3,184.20,
// and profit for FY 2026–27 $42,453.50 (see sample-figures.ts, which a test checks). After
// 23 November, a seeded continuation adds more entries up to today.
//
// All amounts are cents. A GST sale or purchase is GST-inclusive: the builder works the GST out
// with the one GST helper.

import {
  addDays,
  compareDates,
  daysBetween,
  parseCalendarDate,
  type CalendarDate,
} from '@shared/dates';
import { seededRandom } from '@shared/ids';
import type { ContactKind, EntrySourceKind } from '@shared/kinds';

export const SAMPLE_SEED = 20261123;

export const SAMPLE_BUSINESS = {
  name: 'Harbour Lane Joinery Pty Ltd',
  // Placeholder digits that pass the ABN check, and belong to no one.
  abn: '18 123 456 789',
  gstRegistered: true,
  gstBasis: 'cash',
  basFrequency: 'quarterly',
} as const;

/** The two invented bank accounts, linked to the default chart's accounts 1000 and 1010. */
export const SAMPLE_BANK_ACCOUNTS = [
  { code: '1000', name: 'Business One ··4821', lastFour: '4821' },
  { code: '1010', name: 'Business Cash Reserve ··7730', lastFour: '7730' },
] as const;

export type TaxShort = 'GST' | 'FRE' | 'INP' | 'N-T';
/** Which bank account the money moves through: Business One or Business Cash Reserve. */
export type SampleBank = 'one' | 'reserve';

export interface SampleEntry {
  readonly date: CalendarDate;
  /** A contact's name, or null for entries with no payee, such as drawings. */
  readonly payee: string | null;
  readonly memo: string;
  readonly sourceKind: EntrySourceKind;
  readonly direction: 'in' | 'out';
  readonly gross: number;
  /** The code of the account the money was for, or came from. */
  readonly category: string;
  readonly tax: TaxShort | null;
  readonly bank: SampleBank;
  /** Posted wrongly first, then corrected, so the history panel has something to show. */
  readonly correction?: {
    readonly changedOn: CalendarDate;
    /** What it was first posted with. */
    readonly wasCategory?: string;
    readonly wasDate?: CalendarDate;
  };
}

/** The BAS paid to the ATO for the quarter that just ended: what was owing, worked out from the entries. */
export interface SampleBasPayment {
  readonly date: CalendarDate;
  readonly quarterStart: CalendarDate;
  readonly quarterEnd: CalendarDate;
}

export type SampleEntryItem = { readonly kind: 'entry' } & SampleEntry;
export type SampleItem = SampleEntryItem | ({ readonly kind: 'bas' } & SampleBasPayment);

export const SAMPLE_CONTACTS: readonly { name: string; kind: ContactKind }[] = [
  { name: 'Smith Renovations', kind: 'customer' },
  { name: 'Harbourview Developments', kind: 'customer' },
  { name: 'Ng & Sons Constructions', kind: 'customer' },
  { name: 'Ellis Bathrooms', kind: 'customer' },
  { name: 'Lakeside Home Builders', kind: 'customer' },
  { name: 'Foster Fitouts', kind: 'customer' },
  { name: 'Marlow Building Co', kind: 'customer' },
  { name: 'Pacific Hotel Fitouts (Fiji)', kind: 'customer' },
  { name: 'Timberlink', kind: 'supplier' },
  { name: 'Northern Plywood Co', kind: 'supplier' },
  { name: 'Bunnings', kind: 'supplier' },
  { name: 'Corner Hardware Supplies', kind: 'supplier' },
  { name: 'Ampol', kind: 'supplier' },
  { name: 'A. Nguyen Electrical', kind: 'supplier' },
  { name: 'Hollis Painting', kind: 'supplier' },
  { name: 'Marsh Property Group', kind: 'supplier' },
  { name: 'SkyLink Mobile', kind: 'supplier' },
  { name: 'Sunstate Energy', kind: 'supplier' },
  { name: 'Coverwise Insurance', kind: 'supplier' },
  { name: 'Cloudcut Design Software', kind: 'supplier' },
  { name: 'Toolmart', kind: 'supplier' },
  { name: 'Staples & Co', kind: 'supplier' },
  { name: 'Lowe & Partners Accounting', kind: 'supplier' },
  { name: 'Westpac', kind: 'supplier' },
  { name: 'Australian Taxation Office', kind: 'supplier' },
];

/** The financial year a date falls in, as the calendar year it starts in. */
export function financialYearStart(date: CalendarDate): number {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 7 ? year : year - 1;
}

function dateOf(year: number, month: number, day: number): CalendarDate {
  const text = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new RangeError(`Not a real date: ${text}`);
  return parsed.value;
}

function inYear(fyStartYear: number, monthDay: string): CalendarDate {
  const month = Number(monthDay.slice(0, 2));
  const year = month >= 7 ? fyStartYear : fyStartYear + 1;
  const parsed = parseCalendarDate(`${String(year)}-${monthDay}`, 'YYYY-MM-DD');
  if (!parsed.ok) throw new RangeError(`Not a real date: ${String(year)}-${monthDay}`);
  return parsed.value;
}

// ---- The curated entries, 1 July to 23 November ------------------------------------------------

type Row = readonly [monthDay: string, payee: string, gross: number, memo: string];

function entry(
  fy: number,
  row: Row,
  rest: Omit<SampleEntry, 'date' | 'payee' | 'memo' | 'gross'>,
): SampleEntryItem {
  const [monthDay, payee, gross, memo] = row;
  return { kind: 'entry', date: inYear(fy, monthDay), payee, memo, gross, ...rest };
}

const sale = (tax: TaxShort = 'GST') => ({
  sourceKind: 'invoice' as const,
  direction: 'in' as const,
  category: '4000',
  tax,
  bank: 'one' as const,
});
const spend = (category: string, tax: TaxShort | null = 'GST') => ({
  sourceKind: 'bank-line' as const,
  direction: 'out' as const,
  category,
  tax,
  bank: 'one' as const,
});

// Sales (invoice payments into Business One). The 5 August and 21 October amounts are solved, so
// that profit and the GST for October to December come out at the wireframes' figures.
const SALES: readonly Row[] = [
  ['07-08', 'Smith Renovations', 418000, 'INV-1041: Kitchen cabinetry, Elm Street'],
  ['07-15', 'Harbourview Developments', 583000, 'INV-1042: Unit 4 fitout, stage 1'],
  ['07-22', 'Ng & Sons Constructions', 242000, 'INV-1043: Wardrobes, three bedrooms'],
  ['07-29', 'Ellis Bathrooms', 192500, 'INV-1044: Vanity units'],
  ['08-05', 'Lakeside Home Builders', 281933, 'INV-1045: Kitchen and pantry, Lot 12'],
  ['08-12', 'Foster Fitouts', 319000, 'INV-1046: Reception desk and shelving'],
  ['08-19', 'Smith Renovations', 352000, 'INV-1047: Laundry joinery'],
  ['08-26', 'Marlow Building Co', 231000, 'INV-1048: Window seats'],
  ['09-02', 'Harbourview Developments', 495000, 'INV-1049: Unit 4 fitout, stage 2'],
  ['09-16', 'Ng & Sons Constructions', 330000, 'INV-1051: Staircase balustrade'],
  ['09-23', 'Ellis Bathrooms', 165000, 'INV-1052: Linen cupboards'],
  ['10-07', 'Lakeside Home Builders', 1210000, 'INV-1053: Lot 12, finishing'],
  ['10-14', 'Foster Fitouts', 583000, 'INV-1054: Meeting room cabinetry'],
  ['10-21', 'Marlow Building Co', 453959, 'INV-1055: Kitchen, Palm Court'],
  ['10-28', 'Smith Renovations', 638000, 'INV-1056: Bar unit'],
  ['11-04', 'Harbourview Developments', 935000, 'INV-1057: Unit 7 fitout'],
  ['11-11', 'Ellis Bathrooms', 330000, 'INV-1058: Vanity units, second set'],
  ['11-15', 'Smith Renovations', 495000, 'INV-1059: Entertainment unit and shelving'],
  ['11-20', 'Ng & Sons Constructions', 440000, 'INV-1060: Built-in robes'],
];

// Materials (account 5000). The 14 August amount is solved so the account totals $9,812.40.
const MATERIALS: readonly Row[] = [
  ['07-03', 'Timberlink', 132000, 'Timber order'],
  ['07-10', 'Northern Plywood Co', 82500, 'Plywood sheets'],
  ['07-17', 'Bunnings', 28430, 'Fixings and sundries'],
  ['07-24', 'Corner Hardware Supplies', 41290, 'Hinges and handles'],
  ['08-07', 'Timberlink', 99000, 'Timber order'],
  ['08-14', 'Northern Plywood Co', 136355, 'Plywood and veneer'],
  ['08-28', 'Corner Hardware Supplies', 52360, 'Drawer runners'],
  ['09-11', 'Bunnings', 31890, 'Fixings and sundries'],
  ['10-09', 'Timberlink', 88000, 'Timber order'],
  ['10-23', 'Northern Plywood Co', 66000, 'Plywood sheets'],
  ['11-06', 'Bunnings', 39455, 'Fixings and sundries'],
  ['11-13', 'Corner Hardware Supplies', 33870, 'Hinges and handles'],
];

// Fuel (account 6050). The 31 August amount is solved so the account totals $1,046.30.
const FUEL: readonly Row[] = [
  ['07-06', 'Ampol', 10630, 'Fuel'],
  ['07-20', 'Ampol', 11245, 'Fuel'],
  ['08-03', 'Ampol', 9860, 'Fuel'],
  ['08-17', 'Ampol', 10430, 'Fuel'],
  ['08-31', 'Ampol', 9879, 'Fuel'],
  ['09-14', 'Ampol', 11260, 'Fuel'],
  ['09-28', 'Ampol', 10312, 'Fuel'],
  ['10-12', 'Ampol', 10780, 'Fuel'],
  ['10-26', 'Ampol', 9935, 'Fuel'],
  ['11-09', 'Ampol', 11120, 'Fuel'],
  ['11-16', 'Ampol', 9640, 'Fuel'],
];

const SUBCONTRACTORS: readonly Row[] = [
  ['07-31', 'A. Nguyen Electrical', 198000, 'Electrical work, Unit 4'],
  ['08-28', 'Hollis Painting', 143000, 'Painting and finishing'],
  ['09-25', 'A. Nguyen Electrical', 176000, 'Electrical work, Lot 12'],
  ['10-30', 'Hollis Painting', 121000, 'Painting and finishing'],
  ['11-20', 'A. Nguyen Electrical', 165000, 'Electrical work, Unit 7'],
];

const MONTHLY: readonly { rows: readonly Row[]; category: string }[] = [
  {
    category: '6080',
    rows: ['07-01', '08-03', '09-01', '10-01', '11-02'].map((d): Row => [
      d,
      'Marsh Property Group',
      330000,
      'Workshop rent',
    ]),
  },
  {
    category: '6100',
    rows: ['07-13', '08-12', '09-14', '10-12', '11-12'].map((d): Row => [
      d,
      'SkyLink Mobile',
      15950,
      'Mobile plan',
    ]),
  },
  {
    category: '6120',
    rows: [
      ['07-20', 'Sunstate Energy', 41230, 'Electricity'],
      ['08-20', 'Sunstate Energy', 46870, 'Electricity'],
      ['09-18', 'Sunstate Energy', 43510, 'Electricity'],
      ['10-20', 'Sunstate Energy', 39980, 'Electricity'],
      ['11-20', 'Sunstate Energy', 44120, 'Electricity'],
    ],
  },
  {
    category: '6030',
    rows: ['07-06', '08-05', '09-07', '10-05', '11-05'].map((d): Row => [
      d,
      'Coverwise Insurance',
      20570,
      'Insurance instalment',
    ]),
  },
  {
    category: '6020',
    rows: ['07-09', '08-10', '09-09', '10-09', '11-09'].map((d): Row => [
      d,
      'Cloudcut Design Software',
      8800,
      'Design software subscription',
    ]),
  },
];

/** The curated entries and BAS payment for a financial year, with their dates in that year. */
export function curatedItems(fy: number): SampleItem[] {
  const items: SampleItem[] = [];
  const push = (...more: SampleItem[]) => items.push(...more);

  push({
    kind: 'entry',
    date: inYear(fy, '07-01'),
    payee: null,
    memo: 'Owner contribution',
    sourceKind: 'manual',
    direction: 'in',
    gross: 1500000,
    category: '3000',
    tax: null,
    bank: 'one',
  });
  for (const row of SALES) push(entry(fy, row, sale()));
  push(
    entry(
      fy,
      ['09-09', 'Pacific Hotel Fitouts (Fiji)', 280000, 'INV-1050: Export, reception joinery'],
      sale('FRE'),
    ),
  );
  for (const row of MATERIALS) push(entry(fy, row, spend('5000')));
  // Posted a day late, then corrected.
  push({
    ...entry(fy, ['09-28', 'Timberlink', 214000, 'Timber order'], spend('5000')),
    correction: { wasDate: inYear(fy, '09-29'), changedOn: inYear(fy, '10-01') },
  });
  // Posted to Tools and small equipment by mistake, then corrected.
  push({
    ...entry(fy, ['11-18', 'Bunnings', 34215, 'Fixings and sundries'], spend('5000')),
    correction: { wasCategory: '6110', changedOn: inYear(fy, '11-20') },
  });
  for (const row of FUEL) push(entry(fy, row, spend('6050')));
  for (const row of SUBCONTRACTORS) push(entry(fy, row, spend('5100')));
  for (const group of MONTHLY)
    for (const row of group.rows) push(entry(fy, row, spend(group.category)));
  push(
    entry(fy, ['08-11', 'Toolmart', 64900, 'Router and clamps'], spend('6110')),
    entry(fy, ['10-14', 'Toolmart', 38950, 'Sanding supplies'], spend('6110')),
    entry(fy, ['09-07', 'Staples & Co', 14850, 'Stationery and printer paper'], spend('6060')),
    entry(fy, ['11-02', 'Staples & Co', 9640, 'Printer toner'], spend('6060')),
    entry(
      fy,
      ['10-19', 'Lowe & Partners Accounting', 110000, 'Quarterly accounting'],
      spend('6070'),
    ),
  );
  for (const monthDay of ['07-31', '08-31', '09-30', '10-30']) {
    push(entry(fy, [monthDay, 'Westpac', 1000, 'Monthly account fee'], spend('6010', 'INP')));
  }
  for (const [monthDay, cents] of [
    ['07-31', 1000000],
    ['09-30', 1000000],
    ['11-13', 500000],
  ] as const) {
    push({
      kind: 'entry',
      date: inYear(fy, monthDay),
      payee: null,
      memo: 'Transfer to Business Cash Reserve',
      sourceKind: 'bank-line',
      direction: 'out',
      gross: cents,
      category: '1010',
      tax: null,
      bank: 'one',
    });
  }
  // Owner drawings. The last amount is solved so Business One ends at $18,642.35.
  for (const [monthDay, cents] of [
    ['07-24', 340000],
    ['08-21', 350000],
    ['09-18', 345000],
    ['10-23', 355000],
    ['11-20', 309535],
  ] as const) {
    push({
      kind: 'entry',
      date: inYear(fy, monthDay),
      payee: null,
      memo: 'Owner drawings',
      sourceKind: 'bank-line',
      direction: 'out',
      gross: cents,
      category: '3200',
      tax: null,
      bank: 'one',
    });
  }
  push({
    kind: 'bas',
    date: inYear(fy, '10-28'),
    quarterStart: inYear(fy, '07-01'),
    quarterEnd: inYear(fy, '09-30'),
  });
  return items;
}

// ---- After 23 November: a seeded continuation up to the end of the financial year ---------------

/** The last day with curated entries. Anything later is generated. */
export function curatedEnd(fy: number): CalendarDate {
  return inYear(fy, '11-23');
}

/** 0 is Sunday. Counted from 1 January 1970, which was a Thursday. */
export function weekday(date: CalendarDate): number {
  const epoch = parseCalendarDate('1970-01-01', 'YYYY-MM-DD');
  if (!epoch.ok) throw new Error('bad epoch');
  return (((4 + daysBetween(epoch.value, date)) % 7) + 7) % 7;
}

/** A Saturday or Sunday moves to the Monday, as a bank payment would. */
function nextBusinessDay(date: CalendarDate): CalendarDate {
  const day = weekday(date);
  return day === 6 ? addDays(date, 2) : day === 0 ? addDays(date, 1) : date;
}

const CUSTOMERS = SAMPLE_CONTACTS.filter(
  (c) => c.kind === 'customer' && !c.name.includes('Fiji'),
).map((c) => c.name);
const MATERIAL_SUPPLIERS = [
  'Timberlink',
  'Northern Plywood Co',
  'Bunnings',
  'Corner Hardware Supplies',
];

/**
 * Entries after the curated ones, to the end of the year. One random draw is taken per day
 * whether or not anything happens, so the entries for a day never depend on how far the books
 * run: the same seed gives the same entries up to any date.
 */
export function continuationItems(fy: number): SampleItem[] {
  const random = seededRandom(SAMPLE_SEED);
  const start = addDays(curatedEnd(fy), 1);
  const end = inYear(fy, '06-30');
  const items: SampleItem[] = [];
  let fortnight = 0;

  for (let day = start; day <= end; day = addDays(day, 1)) {
    const bytes = random.bytes(4);
    const pick = (list: readonly string[]): string => list[(bytes[0] ?? 0) % list.length] ?? '';
    const between = (low: number, high: number): number =>
      low + (((bytes[1] ?? 0) * 256 + (bytes[2] ?? 0)) % (high - low + 1));
    const week = weekday(day);
    if (week === 2) {
      // A Tuesday: an invoice is paid, in whole tens of dollars.
      items.push({
        kind: 'entry',
        date: day,
        payee: pick(CUSTOMERS),
        memo: 'Invoice payment',
        gross: Math.round(between(150000, 950000) / 1000) * 1000,
        ...sale(),
      });
    } else if (week === 4) {
      items.push({
        kind: 'entry',
        date: day,
        payee: pick(MATERIAL_SUPPLIERS),
        memo: 'Materials',
        gross: Math.round(between(20000, 180000) / 500) * 500,
        ...spend('5000'),
      });
    } else if (week === 1) {
      fortnight += 1;
      if (fortnight % 2 === 0) {
        items.push({
          kind: 'entry',
          date: day,
          payee: 'Ampol',
          memo: 'Fuel',
          gross: between(8500, 12500),
          ...spend('6050'),
        });
      }
    }
  }

  // Monthly bills and drawings, on their usual day or the next business day.
  const monthly: readonly {
    day: number;
    payee: string | null;
    memo: string;
    gross: number;
    category: string;
    tax: TaxShort | null;
  }[] = [
    {
      day: 1,
      payee: 'Marsh Property Group',
      memo: 'Workshop rent',
      gross: 330000,
      category: '6080',
      tax: 'GST',
    },
    {
      day: 5,
      payee: 'Coverwise Insurance',
      memo: 'Insurance instalment',
      gross: 20570,
      category: '6030',
      tax: 'GST',
    },
    {
      day: 9,
      payee: 'Cloudcut Design Software',
      memo: 'Design software subscription',
      gross: 8800,
      category: '6020',
      tax: 'GST',
    },
    {
      day: 12,
      payee: 'SkyLink Mobile',
      memo: 'Mobile plan',
      gross: 15950,
      category: '6100',
      tax: 'GST',
    },
    {
      day: 20,
      payee: 'Sunstate Energy',
      memo: 'Electricity',
      gross: 42000,
      category: '6120',
      tax: 'GST',
    },
    { day: 20, payee: null, memo: 'Owner drawings', gross: 340000, category: '3200', tax: null },
  ];
  const inRange = (date: CalendarDate): boolean =>
    compareDates(date, start) >= 0 && compareDates(date, end) <= 0;
  // November of the starting year to June of the next.
  for (let month = 11; month <= 18; month += 1) {
    const year = fy + Math.floor((month - 1) / 12);
    const monthOfYear = ((month - 1) % 12) + 1;
    for (const item of monthly) {
      const date = nextBusinessDay(dateOf(year, monthOfYear, item.day));
      if (!inRange(date)) continue;
      items.push({
        kind: 'entry',
        date,
        payee: item.payee,
        memo: item.memo,
        sourceKind: 'bank-line',
        direction: 'out',
        gross: item.gross,
        category: item.category,
        tax: item.tax,
        bank: 'one',
      });
    }
    // The account fee goes on the last business day of the month.
    const nextMonthFirst = dateOf(monthOfYear === 12 ? year + 1 : year, (monthOfYear % 12) + 1, 1);
    let feeDate = addDays(nextMonthFirst, -1);
    while (weekday(feeDate) === 0 || weekday(feeDate) === 6) feeDate = addDays(feeDate, -1);
    if (inRange(feeDate)) {
      items.push({
        kind: 'entry',
        date: feeDate,
        payee: 'Westpac',
        memo: 'Monthly account fee',
        sourceKind: 'bank-line',
        direction: 'out',
        gross: 1000,
        category: '6010',
        tax: 'INP',
        bank: 'one',
      });
    }
  }
  // The BAS for each quarter is paid on the 28th of the month after it ends.
  for (const [quarterStart, quarterEnd, due] of [
    ['10-01', '12-31', '02-28'],
    ['01-01', '03-31', '04-28'],
  ] as const) {
    const date = nextBusinessDay(inYear(fy, due));
    if (inRange(date)) {
      items.push({
        kind: 'bas',
        date,
        quarterStart: inYear(fy, quarterStart),
        quarterEnd: inYear(fy, quarterEnd),
      });
    }
  }
  return items;
}
