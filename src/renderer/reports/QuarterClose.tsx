// Closing a quarter (spec 097, wireframe W06 Option 3): every bank line reviewed, every account
// reconciled to the quarter's end, the BAS worksheet checked, then Lock, which asks first and needs
// "The BAS for this quarter is done" ticked.

import { ChevronLeft, Lock } from 'lucide-react';
import { useState } from 'react';
import { formatDateAU } from '@shared/dates';
import { formatCents } from '@shared/money';
import { plainRequest } from '@shared/reports';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Sheet } from '../components/Sheet';
import { plural } from '../import/import-text';
import { PageToolbar } from '../layout/PageToolbar';
import { useBridgeQuery } from '../pages/use-bridge';
import { routeHref } from '../routes';
import { BAS_NOTE, reportHref } from './report-routes';

export function QuarterClose() {
  const { state, reload } = useBridgeQuery(() => bridge()['reports.close']({ end: null }), 'close');
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const view = state.status === 'ready' ? state.value : null;

  const lock = async () => {
    if (view === null) return;
    const api = bridge();
    const result = await api['reports.lock']({ endDate: view.period.to });
    setAsking(false);
    if (result.ok && result.value.kind === 'locked') {
      setNotice(
        `${view.period.label} is locked. Nothing dated on or before ${formatDateAU(result.value.lockDate)} can change.`,
      );
      reload();
    } else setNotice('It could not be locked. A later period may be locked already.');
  };

  const tick = (ok: boolean) => (
    <span className={ok ? 'close__tick' : 'close__todo'}>{ok ? '✓ Done' : 'To do'}</span>
  );
  return (
    <div className="report-page">
      <a href={routeHref('reports')} className="report-page__back">
        <ChevronLeft aria-hidden="true" /> Reports
      </a>
      <PageToolbar title={view === null ? 'Close a quarter' : `Close ${view.period.label}`} />
      {notice !== null && (
        <p className="review__notice" role="status">
          {notice}
        </p>
      )}
      {state.status === 'failed' && (
        <ErrorMessage message="The quarter could not be read." onRetry={reload} />
      )}
      {state.status === 'ready' && view === null && (
        <p>Closing a quarter is possible once your business is set up.</p>
      )}
      {view !== null && (
        <ol className="close">
          <li className="close__step">
            <h2>Every bank line reviewed {tick(view.linesWaiting === 0)}</h2>
            <p>
              {view.linesWaiting === 0
                ? `No lines left for ${formatDateAU(view.period.from)} to ${formatDateAU(view.period.to)}.`
                : `${plural(view.linesWaiting, 'line waits', 'lines wait')} in To review for this quarter.`}{' '}
              {view.linesWaiting > 0 && <a href={routeHref('to-review')}>Go to To review</a>}
            </p>
          </li>
          <li className="close__step">
            <h2>Bank accounts reconciled {tick(view.accounts.every((a) => a.done))}</h2>
            <ul>
              {view.accounts.map((a) => (
                <li key={a.id}>
                  {a.name}:{' '}
                  {a.done
                    ? `reconciled to ${formatDateAU(a.reconciledTo ?? view.period.to)}`
                    : a.reconciledTo === null
                      ? 'not reconciled yet'
                      : `reconciled only to ${formatDateAU(a.reconciledTo)}`}
                </li>
              ))}
            </ul>
            {!view.accounts.every((a) => a.done) && (
              <a href={routeHref('bank')}>Reconcile on the Bank page</a>
            )}
          </li>
          <li className="close__step">
            <h2>Check the BAS worksheet</h2>
            <dl className="reconcile__figures">
              <dt>G1 Total sales, including GST</dt>
              <dd>
                <Amount cents={view.bas.g1} />
              </dd>
              <dt>1A GST on sales</dt>
              <dd>
                <Amount cents={view.bas.a1} />
              </dd>
              <dt>1B GST on purchases</dt>
              <dd>
                <Amount cents={view.bas.b1} />
              </dd>
              <dt>{view.bas.net >= 0 ? 'GST to pay (1A less 1B)' : 'GST to be refunded'}</dt>
              <dd>
                <Amount cents={view.bas.net} />
              </dd>
            </dl>
            <p className="report-page__note">{BAS_NOTE}</p>
            <a
              href={reportHref({
                ...plainRequest('bas'),
                period: { choice: 'custom', from: view.period.from, to: view.period.to },
              })}
            >
              Open the BAS worksheet
            </a>
          </li>
          <li className="close__step">
            <h2>Lock the quarter {view.locked && <span className="close__tick">✓ Locked</span>}</h2>
            {view.locked ? (
              <p>
                Locked. Nothing dated on or before {formatDateAU(view.lockDate ?? view.period.to)}{' '}
                can be added, changed or deleted.
              </p>
            ) : (
              <>
                <p>After the BAS is done.</p>
                <Button
                  variant="main"
                  icon={Lock}
                  onClick={() => {
                    setDone(false);
                    setAsking(true);
                  }}
                >
                  Lock {view.period.label}…
                </Button>
              </>
            )}
          </li>
        </ol>
      )}
      {asking && view !== null && (
        <Sheet
          title={`Lock ${view.period.label}?`}
          role="alertdialog"
          description="Do this once the BAS for this quarter is done."
          onClose={() => {
            setAsking(false);
          }}
          actions={
            <>
              <Button
                onClick={() => {
                  setAsking(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" disabled={!done} onClick={() => void lock()}>
                Lock {view.period.label}
              </Button>
            </>
          }
        >
          <p>
            After locking, nothing dated {formatDateAU(view.period.from)} to{' '}
            {formatDateAU(view.period.to)} can be added, changed or deleted. Reports for the quarter
            will always show the figures above. It cannot be unlocked.
          </p>
          <p>
            {view.bas.net >= 0 ? 'GST to pay' : 'GST to be refunded'} for this quarter:{' '}
            {formatCents(view.bas.net)}.
          </p>
          <label className="rule-editor__check">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => {
                setDone(e.target.checked);
              }}
            />
            <span>The BAS for this quarter is done</span>
          </label>
        </Sheet>
      )}
    </div>
  );
}
