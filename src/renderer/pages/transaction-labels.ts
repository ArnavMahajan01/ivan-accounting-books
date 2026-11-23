// The words the Transactions list and its panel use for what an entry is.

import type { EntrySourceKind } from '@shared/kinds';
import type { EntryDirection } from '@shared/views';

/** What kind of record an entry is, in the words of his QuickBooks lists. */
export const SOURCE_LABELS: Record<EntrySourceKind, string> = {
  'bank-line': 'Bank line',
  invoice: 'Invoice payment',
  manual: 'Journal',
  'opening-balance': 'Opening balance',
  'accountant-change': 'Accountant change',
};

export const DIRECTION_LABELS: Record<EntryDirection, string> = {
  in: 'Money in',
  out: 'Money out',
  transfer: 'Transfer',
  journal: '',
};

/** A moment from the history, as 20/11/2026, 12:00, in the Mac's own time zone. */
export function formatMoment(timestamp: string): string {
  const moment = new Date(timestamp);
  if (Number.isNaN(moment.getTime())) return timestamp;
  const date = moment.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = moment.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date}, ${time}`;
}
