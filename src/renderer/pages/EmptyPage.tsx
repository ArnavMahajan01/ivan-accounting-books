import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageToolbar } from '../layout/PageToolbar';

export const COMING_LATER = 'Coming in a later version.';

export interface EmptyPageProps {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly message: string;
}

/** A page that is not built yet: its toolbar, and what it will hold, in plain words. */
export function EmptyPage({ title, icon, message }: EmptyPageProps) {
  return (
    <>
      <PageToolbar title={title} />
      <section className="page-surface">
        <EmptyState icon={icon} message={message} note={COMING_LATER} />
      </section>
    </>
  );
}
