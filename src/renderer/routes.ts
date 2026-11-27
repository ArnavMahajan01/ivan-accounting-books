// One route per sidebar item. The pages and their order are in @shared/pages, which the Mac menu
// also uses. This adds the icons and where each sits in the sidebar.

import {
  ArrowLeftRight,
  BookOpen,
  ChartColumn,
  CircleHelp,
  House,
  Inbox,
  Landmark,
  ListChecks,
  Receipt,
  Users,
  Settings,
  Share2,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { isPageId, PAGES, pageHash, type PageId } from '@shared/pages';

export type RouteId = PageId;

export interface RouteInfo {
  readonly id: RouteId;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Settings and Help sit at the bottom of the sidebar. */
  readonly place: 'main' | 'bottom';
}

const ICONS: Record<RouteId, LucideIcon> = {
  home: House,
  'to-review': Inbox,
  bank: Landmark,
  transactions: ArrowLeftRight,
  accounts: BookOpen,
  reports: ChartColumn,
  rules: ListChecks,
  invoices: Receipt,
  contacts: Users,
  'shared-sheets': Share2,
  'accountant-changes': UserCheck,
  settings: Settings,
  help: CircleHelp,
};

export const ROUTES: readonly RouteInfo[] = PAGES.map((page) => ({
  id: page.id,
  label: page.label,
  icon: ICONS[page.id],
  place: page.id === 'settings' || page.id === 'help' ? 'bottom' : 'main',
}));

export function routeHref(id: RouteId): string {
  return pageHash(id);
}

/** The parts of an address hash such as `#/help/getting-started`: `['help', 'getting-started']`. */
function hashSegments(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('/');
}

/** The route in an address hash such as `#/bank`, or `#/transactions?account=acc_x`. Anything else is Home. */
export function routeFromHash(hash: string): RouteId {
  const id = (hashSegments(hash)[0] ?? '').split('?')[0] ?? '';
  return isPageId(id) ? id : 'home';
}

/** The `?name=value` part of an address hash, such as the account a page was opened for. */
export function queryFromHash(hash: string): URLSearchParams {
  const at = hash.indexOf('?');
  return new URLSearchParams(at < 0 ? '' : hash.slice(at + 1));
}

/** Transactions, filtered to one account. */
export function transactionsHref(accountId: string): string {
  return `${routeHref('transactions')}?account=${encodeURIComponent(accountId)}`;
}

/** The guide named in an address such as `#/help/getting-started`, or null for the guide list. */
export function guideIdFromHash(hash: string): string | null {
  const [route, guide] = hashSegments(hash);
  if (route !== 'help' || guide === undefined || guide === '') return null;
  try {
    return decodeURIComponent(guide);
  } catch {
    return guide;
  }
}

export function guideHref(id: string): string {
  return `${routeHref('help')}/${encodeURIComponent(id)}`;
}
