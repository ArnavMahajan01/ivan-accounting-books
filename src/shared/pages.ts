// The app's pages, in sidebar order (context/ui-context.md, "Layout"). Listed once, here, because
// the Mac menu in the main process and the sidebar in the screens must agree on them.
// Invoices and Contacts (folder 10) join when their folder is built.

export const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'to-review', label: 'To review' },
  { id: 'bank', label: 'Bank' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'rules', label: 'Rules' },
  { id: 'shared-sheets', label: 'Shared sheets' },
  { id: 'accountant-changes', label: 'Accountant changes' },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
] as const;

export type PageId = (typeof PAGES)[number]['id'];

export function isPageId(value: string): value is PageId {
  return PAGES.some((p) => p.id === value);
}

/** The address hash that opens a page, such as `#/bank`. */
export function pageHash(id: PageId): string {
  return `#/${id}`;
}
