// Accountant changes (spec 117; W07 and W07a): each change waiting, grouped by sheet, with the
// line it is on, what it was and what he typed, who and when, and what accepting would do to the
// accounts, worked out and not yet applied. Accept changes the books through the posting service;
// Reject keeps them. Nothing in the books changes until he accepts (invariant 3).

import { RefreshCw, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { formatDateAU } from '@shared/dates';
import { formatCents } from '@shared/money';
import type { AccountantChangesView, ChangeBlock, ChangeView } from '@shared/sheets';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { PageToolbar } from '../layout/PageToolbar';
import { formatMoment } from '../pages/transaction-labels';
import { useBridgeQuery } from '../pages/use-bridge';
import { routeHref } from '../routes';
import { useGoogleState } from './google-state';
import './sheets.css';

const FIELD_WORDS: Record<ChangeView['field'], string> = {
  account: 'Account',
  gst: 'GST',
  note: 'Note',
};

function blockedText(change: ChangeView, lockDate: AccountantChangesView['lockDate']): string {
  const reasons: Record<ChangeBlock, string> = {
    'not-recognised': `"${change.now}" is not ${change.field === 'gst' ? 'a GST code' : 'an account'} in your books. Reject it, or add it and check again.`,
    locked: `This line is in a period you locked${lockDate === null ? '' : ` (to ${formatDateAU(lockDate)})`}, so it cannot change. Reject it, and enter a correction in an open period.`,
    'not-simple': 'This line went to more than one account. Change it in Transactions instead.',
    gone: 'This line is no longer in your books.',
  };
  return change.blocked === null ? '' : reasons[change.blocked];
}

/** "Materials and supplies -$353.73, Tools and small equipment +$353.73". */
function effectText(effect: NonNullable<ChangeView['effect']>): string {
  if (effect.length === 0) return 'Nothing: your books already hold this.';
  return effect
    .map((e) => `${e.account} ${e.cents > 0 ? '+' : ''}${formatCents(e.cents)}`)
    .join(', ');
}

const shown = (value: string) => (value === '' ? '(blank)' : value);

export function AccountantChangesPage() {
  const { refreshChanges } = useGoogleState();
  const load = useCallback(() => bridge()['changes.list']({}), []);
  const [checks, setChecks] = useState(0);
  const { state, reload } = useBridgeQuery<AccountantChangesView>(load, String(checks));
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const check = useCallback(async () => {
    setNote('Checking your shared sheets…');
    const result = await bridge()['changes.check']({});
    if (!result.ok) setNote('The sheets could not be checked. Try again.');
    else if (result.value.problem === 'not-connected')
      setNote('Google is not connected, so the sheets were not checked.');
    else if (result.value.problem === 'offline')
      setNote('Offline: the sheets could not be checked. The list is as it was.');
    else if (result.value.problem === 'needs-sign-in')
      setNote('Google needs you to sign in again in Settings before the sheets can be checked.');
    else if (result.value.problem === 'failed')
      setNote('Google did not answer. The list is as it was.');
    else setNote(null);
    setChecks((n) => n + 1);
    refreshChanges();
  }, [refreshChanges]);

  // Checked once when the page opens, so it shows what is in the sheets now.
  useEffect(() => {
    void check();
  }, [check]);

  const decide = async (change: ChangeView, accept: boolean) => {
    setBusy(change.id);
    setProblem(null);
    try {
      const api = bridge();
      const result = accept
        ? await api['changes.accept']({ id: change.id })
        : await api['changes.reject']({ id: change.id });
      if (!result.ok) setProblem('That could not be saved, and nothing was changed. Try again.');
      else if (result.value.kind === 'refused') {
        setProblem(
          result.value.reason === 'not-waiting'
            ? 'That change was already decided.'
            : blockedText({ ...change, blocked: result.value.reason }, null),
        );
      }
      reload();
      refreshChanges();
    } finally {
      setBusy(null);
    }
  };

  const view = state.status === 'ready' ? state.value : null;
  const sheets = view === null ? [] : [...new Set(view.waiting.map((c) => c.linkId))];

  return (
    <div className="changes">
      <PageToolbar
        title="Accountant changes"
        actions={
          <Button icon={RefreshCw} onClick={() => void check()}>
            Check now
          </Button>
        }
      />
      <p className="changes__info">
        Nothing in your books changes until you accept. Accepting updates the line and records who
        changed it and when. The app checks your shared sheets every two minutes while it is open.
      </p>
      {note !== null && (
        <p className="publish__line publish__line--note" role="status">
          {note}
        </p>
      )}
      {problem !== null && <ErrorMessage message={problem} />}
      {state.status === 'loading' && <p aria-busy="true">Reading the changes…</p>}
      {state.status === 'failed' && (
        <ErrorMessage message="The changes could not be read. Try again." onRetry={reload} />
      )}
      {view !== null && view.waiting.length === 0 && (
        <EmptyState
          icon={UserCheck}
          message="No changes waiting. Changes your accountant makes in a shared Transactions sheet wait here for you to accept or reject."
        />
      )}
      {view !== null &&
        sheets.map((linkId) => {
          const changes = view.waiting.filter((c) => c.linkId === linkId);
          const title = changes[0]?.sheetTitle ?? '';
          return (
            <section key={linkId} className="page-surface shared__card" aria-label={title}>
              <h2 className="shared__email">
                {title} <span className="shared__count">{changes.length} waiting</span>
              </h2>
              <ul className="shared__list">
                {changes.map((c) => (
                  <li key={c.id} className="change">
                    <div className="change__line">
                      {c.line === null ? (
                        <span>A line no longer in your books</span>
                      ) : (
                        <>
                          <span>
                            {formatDateAU(c.line.date)} {c.line.description}
                          </span>{' '}
                          <Amount cents={c.line.amount} />
                        </>
                      )}
                      <span className="shared__when"> · row {c.sheetRow}</span>
                    </div>
                    <div className="change__what">
                      <span className="change__field">{FIELD_WORDS[c.field]}</span>
                      <span className="change__was">
                        <span className="visually-hidden">Was </span>
                        <del>{shown(c.was)}</del>
                      </span>
                      <span aria-hidden="true">→</span>
                      <strong className="change__now">
                        <span className="visually-hidden">Accountant&apos;s change: </span>
                        {shown(c.now)}
                      </strong>
                    </div>
                    <p className="shared__when change__who">
                      {c.by === null ? 'Changed' : `By ${c.by}`}, seen {formatMoment(c.seenAt)}
                    </p>
                    {c.blocked === null && c.effect !== null ? (
                      <p className="change__effect">
                        <strong>What accepting does: </strong>
                        {effectText(c.effect)}
                      </p>
                    ) : (
                      <p className="change__blocked">{blockedText(c, view.lockDate)}</p>
                    )}
                    <div className="change__actions">
                      <Button
                        size="small"
                        disabled={busy !== null}
                        aria-label={`Reject: ${FIELD_WORDS[c.field]} on row ${String(c.sheetRow)}`}
                        onClick={() => void decide(c, false)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="small"
                        variant="main"
                        disabled={busy !== null || c.blocked !== null}
                        aria-label={`Accept: ${FIELD_WORDS[c.field]} on row ${String(c.sheetRow)}`}
                        onClick={() => void decide(c, true)}
                      >
                        Accept
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      {view !== null && view.done.length > 0 && (
        <section className="page-surface shared__card" aria-label="Done">
          <h2 className="shared__email">Done</h2>
          <ul className="shared__list">
            {view.done.map((c) => (
              <li key={c.id} className="shared__row">
                <span className="shared__when">
                  {c.decidedAt === null ? '' : formatMoment(c.decidedAt)}
                </span>
                <span className="shared__title">
                  {c.line === null ? 'A removed line' : c.line.description}, {FIELD_WORDS[c.field]}:{' '}
                  {shown(c.was)} → {shown(c.now)}
                </span>
                <span className={c.status === 'accepted' ? 'change__accepted' : 'change__rejected'}>
                  {c.status === 'accepted' ? 'Accepted' : 'Rejected'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="publish__line publish__line--note">
        Share the Transactions sheet with your accountant as an editor in{' '}
        <a href={routeHref('shared-sheets')}>Shared sheets</a>.
      </p>
    </div>
  );
}
