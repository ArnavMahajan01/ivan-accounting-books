import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  readonly icon: LucideIcon;
  /** One sentence: what will be here, or what to do next. */
  readonly message: string;
  /** The next action, usually one Button. */
  readonly action?: ReactNode;
  /** A short second line, such as "Coming in a later version." */
  readonly note?: string;
}

export function EmptyState({ icon: Icon, message, action, note }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" className="empty-state__icon" />
      <p className="empty-state__message">{message}</p>
      {note !== undefined && <p className="empty-state__note">{note}</p>}
      {action !== undefined && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
