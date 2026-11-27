// The words the contact screens use (spec 123).

import type { ContactKind, ContactSource } from '@shared/kinds';
import { routeHref } from '../routes';

export const KIND_WORDS: Record<ContactKind, string> = {
  customer: 'Customer',
  supplier: 'Supplier',
  both: 'Customer and supplier',
};

/** The day of a saved moment, as 15/10/2026, in the Mac's own time zone. */
export function formatDayOf(timestamp: string): string {
  const moment = new Date(timestamp);
  if (Number.isNaN(moment.getTime())) return timestamp;
  return moment.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const SOURCE_WORDS: Record<ContactSource, string> = {
  invoice: 'from an invoice',
  'bank-line': 'saved from a bank line',
  manual: 'added by hand',
};

/** Where a contact came from, and when: "from an invoice, 15/10/2026". */
export function addedText(from: ContactSource, at: string): string {
  return `${SOURCE_WORDS[from]}, ${formatDayOf(at)}`;
}

/** 51824753556 as 51 824 753 556, the way the ATO writes it. */
export function formatAbn(abn: string): string {
  return abn.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');
}

export function contactHref(id: string): string {
  return `${routeHref('contacts')}/${encodeURIComponent(id)}`;
}

/** The contact an address such as `#/contacts/con_x` names, or null for the list. */
export function contactIdFromHash(hash: string): string | null {
  const [route, id] = hash.replace(/^#\/?/, '').split('?')[0]?.split('/') ?? [];
  if (route !== 'contacts' || id === undefined || id === '') return null;
  try {
    return decodeURIComponent(id);
  } catch {
    return null;
  }
}

export const REFUSED_WORDS = {
  'empty-name': 'Type a name.',
  'name-in-use': 'Another contact already has that name.',
  'bad-email': 'That email address does not look right.',
  'bad-abn': 'That ABN is not a real one. Check its 11 digits.',
  'not-found': 'That contact is no longer there.',
} as const;
