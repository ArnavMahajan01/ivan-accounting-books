// One route per sidebar item, in the order of the signed-off wireframes (ui-context.md, "Layout").
// Rules (folder 07), Invoices and Contacts (folder 10) join when their folders are built.

import {
  ArrowLeftRight,
  BookOpen,
  ChartColumn,
  CircleHelp,
  House,
  Inbox,
  Landmark,
  Settings,
  Share2,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export const ROUTE_IDS = [
  'home',
  'to-review',
  'bank',
  'transactions',
  'accounts',
  'reports',
  'shared-sheets',
  'accountant-changes',
  'settings',
  'help',
] as const;

export type RouteId = (typeof ROUTE_IDS)[number];

export interface RouteInfo {
  readonly id: RouteId;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Settings and Help sit at the bottom of the sidebar. */
  readonly place: 'main' | 'bottom';
}

export const ROUTES: readonly RouteInfo[] = [
  { id: 'home', label: 'Home', icon: House, place: 'main' },
  { id: 'to-review', label: 'To review', icon: Inbox, place: 'main' },
  { id: 'bank', label: 'Bank', icon: Landmark, place: 'main' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, place: 'main' },
  { id: 'accounts', label: 'Accounts', icon: BookOpen, place: 'main' },
  { id: 'reports', label: 'Reports', icon: ChartColumn, place: 'main' },
  { id: 'shared-sheets', label: 'Shared sheets', icon: Share2, place: 'main' },
  { id: 'accountant-changes', label: 'Accountant changes', icon: UserCheck, place: 'main' },
  { id: 'settings', label: 'Settings', icon: Settings, place: 'bottom' },
  { id: 'help', label: 'Help', icon: CircleHelp, place: 'bottom' },
];

export function routeHref(id: RouteId): string {
  return `#/${id}`;
}

/** The route in an address hash such as `#/bank`. Anything else is Home. */
export function routeFromHash(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '');
  return (ROUTE_IDS as readonly string[]).includes(id) ? (id as RouteId) : 'home';
}
