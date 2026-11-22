import type { ReactNode } from 'react';
import './PageToolbar.css';

export interface PageToolbarProps {
  readonly title: string;
  /** Labels beside the title, such as the "Sample data" label. */
  readonly status?: ReactNode;
  /** Other actions, shown before the main action. */
  readonly actions?: ReactNode;
  /** The one main action of the page, at most one (ui-context.md, "Colour Use"). */
  readonly mainAction?: ReactNode;
}

export function PageToolbar({ title, status, actions, mainAction }: PageToolbarProps) {
  return (
    <header className="page-toolbar">
      <div className="page-toolbar__start">
        <h1 className="page-toolbar__title">{title}</h1>
        {status}
      </div>
      <div className="page-toolbar__actions">
        {actions}
        {mainAction}
      </div>
    </header>
  );
}
