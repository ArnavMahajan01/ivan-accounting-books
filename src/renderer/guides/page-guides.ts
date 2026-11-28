// Which guide each page's "? Help" opens (spec 135; W09a, Option 2). A report's own page opens the
// guide for that report. `page-guides.test.ts` fails if a guide named here does not exist.

import type { PageId } from '@shared/pages';

export const PAGE_GUIDES: Record<Exclude<PageId, 'help'>, string> = {
  home: 'reading-your-books',
  'to-review': 'review-and-post-bank-lines',
  bank: 'import-a-westpac-file',
  transactions: 'fix-a-posted-transaction',
  accounts: 'reading-your-books',
  reports: 'read-your-profit-and-loss',
  rules: 'make-a-bank-rule',
  invoices: 'bring-in-invoices',
  contacts: 'your-customers-and-suppliers',
  'shared-sheets': 'share-with-your-accountant',
  'accountant-changes': 'accept-accountant-changes',
  settings: 'getting-started',
};

/** Report pages with a guide of their own, by the start of their address. */
const REPORT_GUIDES: readonly (readonly [string, string])[] = [
  ['#/reports/bas', 'check-the-bas-worksheet'],
  ['#/reports/close', 'close-and-lock-a-quarter'],
  ['#/reports/layout', 'make-your-own-report'],
];

/** The guide for the page at this address, or null on Help itself. */
export function guideForPage(page: PageId, hash: string): string | null {
  if (page === 'help') return null;
  const report = REPORT_GUIDES.find(([prefix]) => hash.startsWith(prefix));
  return report?.[1] ?? PAGE_GUIDES[page];
}
