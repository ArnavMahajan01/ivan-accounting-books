// Ready layouts to start from (wireframe W06a Option 5), and the period words.

import { plainRequest, type PeriodChoice, type ReportRequest } from '@shared/reports';

export const PERIOD_WORDS: Record<PeriodChoice, string> = {
  'this-quarter': 'This quarter',
  'last-quarter': 'Last quarter',
  'this-year': 'This financial year',
  'last-year': 'Last financial year',
  custom: 'Choose dates…',
};

export const READY_LAYOUTS: readonly { readonly name: string; readonly request: ReportRequest }[] =
  [
    {
      name: 'Compare quarters',
      request: {
        ...plainRequest('profit-and-loss'),
        period: { choice: 'last-quarter', from: null, to: null },
        columns: {
          lastPeriod: true,
          sameLastYear: false,
          percentOfIncome: false,
          monthByMonth: false,
        },
        ownColumns: [
          { kind: 'calc', name: 'Change', calc: 'difference', a: 'p0', b: 'p1', amount: null },
        ],
      },
    },
    {
      name: 'Month by month',
      request: {
        ...plainRequest('profit-and-loss'),
        period: { choice: 'this-year', from: null, to: null },
        columns: {
          lastPeriod: false,
          sameLastYear: false,
          percentOfIncome: false,
          monthByMonth: true,
        },
      },
    },
    {
      name: 'For the accountant',
      request: {
        ...plainRequest('profit-and-loss'),
        period: { choice: 'this-year', from: null, to: null },
        columns: {
          lastPeriod: true,
          sameLastYear: false,
          percentOfIncome: true,
          monthByMonth: false,
        },
        rows: { showEmpty: true, groupSmall: false, showCodes: true },
      },
    },
  ];
