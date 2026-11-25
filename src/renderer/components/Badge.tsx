import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ShareRole } from '@shared/kinds';
import './Badge.css';

export type BadgeTone = 'warning' | 'brand' | 'success' | 'muted' | 'error';

/** The statuses in ui-context.md ("Badges"). Each always shows its words, never colour alone. */
export const BADGE_STATUSES = {
  'to-review': { label: 'To review', tone: 'warning' },
  new: { label: 'New', tone: 'brand' },
  posted: { label: 'Posted', tone: 'brand' },
  reconciled: { label: 'Reconciled', tone: 'success' },
  excluded: { label: 'Excluded', tone: 'muted' },
  duplicate: { label: 'Duplicate · skipped', tone: 'muted' },
  rejected: { label: 'Rejected', tone: 'error' },
  locked: { label: 'Locked', tone: 'muted', icon: Lock },
  'sample-data': { label: 'Sample data', tone: 'warning' },
} as const satisfies Record<string, { label: string; tone: BadgeTone; icon?: LucideIcon }>;

export type BadgeStatus = keyof typeof BADGE_STATUSES;

export interface BadgeProps {
  readonly status: BadgeStatus;
}

export function Badge({ status }: BadgeProps) {
  const spec: { label: string; tone: BadgeTone; icon?: LucideIcon } = BADGE_STATUSES[status];
  const Icon = spec.icon;
  return (
    <span className={`badge badge--${spec.tone}`}>
      {Icon !== undefined && <Icon aria-hidden="true" className="badge__icon" />}
      {spec.label}
    </span>
  );
}

/** A sheet shared with someone: brand colour, with the role in words. */
export function RoleBadge({ role }: { readonly role: ShareRole }) {
  const words = { viewer: 'Viewer', commenter: 'Commenter', editor: 'Editor' }[role];
  return <span className="badge badge--brand">{words}</span>;
}
