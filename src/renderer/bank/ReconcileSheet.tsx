// Reconcile an account to a statement (spec 086): the statement's day and closing balance (filled
// in from the last import when known), what the books hold, the difference in words and the lines
// that explain it. Finish works only at zero.

import { useEffect, useState } from 'react';
import { formatDateAU, parseCalendarDate } from '@shared/dates';
import { asCents, formatCents, parseCents } from '@shared/money';
import type { BankAccountRow, ReconcileView } from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { plural } from '../import/import-text';
import { routeHref } from '../routes';

const REFUSED = {
  'not-found': 'That account is no longer there.',
  'before-last':
    'This account is already reconciled to that day or later. Choose a later statement.',
  difference: 'The books do not agree with the statement yet.',
} as const;

/** "18642.35" for the box. */
const forBox = (cents: number) => formatCents(asCents(cents)).replace(/[$,]/g, '');

/** The day and balance as typed, or null while either is not a real one. */
function readInputs(dateText: string, balanceText: string) {
  const date = parseCalendarDate(dateText, 'YYYY-MM-DD');
  const balance = parseCents(balanceText.trim().replace(/^\$/, '').replace(/,/g, ''));
  return date.ok && balance.ok ? { date: date.value, balance: balance.value } : null;
}

export function ReconcileSheet({
  account,
  onClose,
  onDone,
}: {
  readonly account: BankAccountRow;
  readonly onClose: () => void;
  readonly onDone: (text: string) => void;
}) {
  const [dateText, setDateText] = useState<string>(account.lastStatement?.date ?? '');
  const [balanceText, setBalanceText] = useState(
    account.lastStatement === null ? '' : forBox(account.lastStatement.balance),
  );
  const [check, setCheck] = useState<ReconcileView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputs = readInputs(dateText, balanceText);
  const ready = inputs !== null;

  // Checked again whenever the day or the balance changes.
  useEffect(() => {
    const typed = readInputs(dateText, balanceText);
    if (typed === null) {
      setCheck(null);
      return;
    }
    let current = true;
    const api = bridge();
    void api['bank.checkReconcile']({
      bankAccountId: account.id,
      statementDate: typed.date,
      statementBalance: typed.balance,
    }).then((result) => {
      if (current) setCheck(result.ok ? result.value : null);
    });
    return () => {
      current = false;
    };
  }, [account.id, dateText, balanceText]);

  const finish = async () => {
    if (inputs === null) return;
    setBusy(true);
    try {
      const api = bridge();
      const result = await api['bank.finishReconcile']({
        bankAccountId: account.id,
        statementDate: inputs.date,
        statementBalance: inputs.balance,
      });
      if (!result.ok) setProblem('That could not be saved, and nothing was changed. Try again.');
      else if (result.value.kind === 'done')
        onDone(`${account.name} is reconciled to ${formatDateAU(inputs.date)}.`);
      else setProblem(REFUSED[result.value.reason]);
    } finally {
      setBusy(false);
    }
  };

  const zero = check !== null && check.difference === 0;
  return (
    <Sheet
      title={`Reconcile ${account.name}`}
      description="Check that your books agree with a statement from Westpac, line for line."
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" disabled={!zero || busy} onClick={() => void finish()}>
            Finish
          </Button>
        </>
      }
    >
      <div className="reconcile">
        <div className="reconcile__inputs">
          <label className="rule-editor__field">
            <span>Statement date</span>
            <input
              type="date"
              className="review-field"
              value={dateText}
              onChange={(e) => {
                setDateText(e.target.value);
                setProblem(null);
              }}
            />
          </label>
          <label className="rule-editor__field">
            <span>Closing balance on the statement</span>
            <input
              className="review-field reconcile__balance"
              inputMode="decimal"
              value={balanceText}
              onChange={(e) => {
                setBalanceText(e.target.value);
                setProblem(null);
              }}
            />
          </label>
        </div>
        {!ready && (
          <p className="transfer__note">Type the statement&apos;s date and its closing balance.</p>
        )}
        {check !== null && (
          <div className="reconcile__result" aria-live="polite">
            <dl className="reconcile__figures">
              <dt>Statement</dt>
              <dd>
                <Amount cents={check.statementBalance} />
              </dd>
              <dt>Your books</dt>
              <dd>
                <Amount cents={check.booksBalance} />
              </dd>
              <dt>Difference</dt>
              <dd>
                <Amount cents={check.difference} />
              </dd>
            </dl>
            <p className="transfer__found">
              {zero
                ? `✓ Your books agree with the statement on ${formatDateAU(check.statementDate)}. Click Finish.`
                : check.explainedByWaiting
                  ? `They differ by ${formatCents(check.difference)}: the ${plural(check.waiting.length, 'line', 'lines')} below ${check.waiting.length === 1 ? 'is' : 'are'} on the statement but not posted yet. Post ${check.waiting.length === 1 ? 'it' : 'them'} in To review, then come back.`
                  : `They differ by ${formatCents(check.difference)}. Check the balance you typed, and look for a line missing from your books or posted to the wrong bank account.`}
            </p>
            {check.waiting.length > 0 && (
              <>
                <ul className="reconcile__lines">
                  {check.waiting.slice(0, 20).map((l) => (
                    <li key={l.id}>
                      <span>{formatDateAU(l.date)}</span> <span>{l.description}</span>{' '}
                      <Amount cents={l.amount} />
                    </li>
                  ))}
                </ul>
                <a href={routeHref('to-review')} className="bank__link" onClick={onClose}>
                  Post them in To review
                </a>
              </>
            )}
            {check.lastReconciled !== null && (
              <p className="transfer__note">
                Last reconciled to {formatDateAU(check.lastReconciled)}.
              </p>
            )}
          </div>
        )}
        {problem !== null && (
          <p className="split__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}
