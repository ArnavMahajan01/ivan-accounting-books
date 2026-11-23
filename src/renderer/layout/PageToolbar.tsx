import type { ReactNode } from 'react';
import { useBooksState } from '../books-state';
import { SampleDataLabel } from '../components/SampleDataLabel';
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
  const { state } = useBooksState();
  return (
    <header className="page-toolbar">
      <div className="page-toolbar__start">
        <h1 className="page-toolbar__title">{title}</h1>
        {/* Every page says so while the books are sample ones (ui-context.md, "States"). */}
        {state?.mode === 'sample' && <SampleDataLabel />}
        {status}
      </div>
      <div className="page-toolbar__actions">
        {actions}
        {mainAction}
      </div>
    </header>
  );
}
