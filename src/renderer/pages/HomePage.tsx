import { Upload } from 'lucide-react';
import type { BooksProblem } from '@shared/kinds';
import type { HomeSummary } from '@shared/views';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { PageToolbar } from '../layout/PageToolbar';
import { COMING_LATER } from './EmptyPage';
import { GettingStarted } from './GettingStarted';
import { HomeNumbers } from './HomeNumbers';
import { NextStepsList } from './NextStepsList';
import { loadHomeSummary } from './data-status';
import { useBridge } from './use-bridge';
import './HomePage.css';

// What the books check found, in words he can act on. Home shows one only when something is wrong.
const WARNING_TEXT: Record<BooksProblem, string> = {
  'out-of-balance':
    'Your books do not balance: the debits and credits no longer match. Do not add anything new. Close the app and ask for help.',
  'integrity-failed':
    'The file that holds your books has a problem. Close the app, and ask for help before you go on.',
  'not-open': 'Your books could not be opened. Close the app and open it again.',
};

function HomeSkeleton() {
  return (
    <div className="home-overview" aria-busy="true" aria-label="Loading Home">
      <div className="page-surface home-todo home-skeleton" />
      <div className="page-surface home-numbers home-skeleton" />
    </div>
  );
}

function Overview({ summary }: { readonly summary: HomeSummary }) {
  return (
    <div className="home-overview">
      <section className="page-surface home-todo" aria-labelledby="home-todo-title">
        <h2 id="home-todo-title" className="home-section__title">
          To do
        </h2>
        <NextStepsList steps={summary.nextSteps} upToDate={summary.upToDate} />
      </section>
      <section className="page-surface home-numbers" aria-labelledby="home-numbers-title">
        <h2 id="home-numbers-title" className="home-section__title">
          Numbers
        </h2>
        <HomeNumbers summary={summary} />
      </section>
    </div>
  );
}

export function HomePage() {
  const summary = useBridge<HomeSummary>(loadHomeSummary);
  return (
    <>
      <PageToolbar
        title="Home"
        mainAction={
          <Button variant="main" icon={Upload} disabled title={COMING_LATER}>
            Import file
          </Button>
        }
      />
      {summary.status === 'failed' && (
        <ErrorMessage message="Home could not be read. Close the app and open it again. If this keeps happening, ask for help." />
      )}
      {summary.status === 'ready' &&
        summary.value.warnings.map((problem) => (
          <ErrorMessage key={problem} message={WARNING_TEXT[problem]} />
        ))}
      {summary.status === 'loading' && <HomeSkeleton />}
      {summary.status === 'ready' &&
        (summary.value.brandNew ? <GettingStarted /> : <Overview summary={summary.value} />)}
    </>
  );
}
