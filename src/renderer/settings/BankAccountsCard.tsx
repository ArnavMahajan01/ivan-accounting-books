// Settings, Bank accounts (spec 133; wireframe/2111-settings, Option 3): each bank account with its
// bank and last four digits, Add bank account…, Rename and Stop using. Only the last four digits of
// an account number are ever asked for or kept (security-context.md).

import { Landmark } from 'lucide-react';
import { useState } from 'react';
import type { BankAccountsSettings } from '@shared/settings';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Sheet } from '../components/Sheet';
import '../review/review.css';
import '../rules/rules.css';
import '../pages/SettingsPage.css';

type Row = BankAccountsSettings['accounts'][number];

/** Common Australian banks, offered while typing. Any other name can be typed. */
const BANK_SUGGESTIONS = [
  'Westpac',
  'CommBank',
  'NAB',
  'ANZ',
  'St.George',
  'Bank of Melbourne',
  'BankSA',
  'Bendigo Bank',
  'ING',
  'Macquarie',
  'Suncorp',
  'Bank of Queensland',
  'HSBC',
  'Bankwest',
] as const;

const REFUSED: Record<string, string> = {
  'empty-name': 'Type a name for the account, such as Business One.',
  'empty-bank': 'Type the name of the bank.',
  'bad-last-four': 'Type the last four digits of the account number.',
  'account-not-found': 'Choose the account in your chart that holds its balance.',
  'not-an-asset': 'The account that holds its balance must be an asset account.',
  'already-linked': 'Another bank account already uses that account.',
  unchanged: 'Nothing was changed.',
  'already-inactive': 'That account is already not in use.',
  'has-active-sub-accounts': 'Stop using the accounts under it first.',
  'not-found': 'That account is no longer there.',
};

const refusal = (reason: string) => REFUSED[reason] ?? 'That could not be saved.';

function AddSheet({
  view,
  onClose,
  onSaved,
}: {
  readonly view: BankAccountsSettings;
  readonly onClose: () => void;
  readonly onSaved: (text: string) => void;
}) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [ledgerAccountId, setLedger] = useState(view.freeLedgers[0]?.id ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  const save = async () => {
    setProblem(null);
    const result = await bridge()['bankAccounts.add']({
      name,
      bank,
      lastFour: lastFour.trim(),
      ledgerAccountId,
    });
    if (!result.ok) setProblem('That could not be saved. Try again.');
    else if (result.value.kind === 'refused') setProblem(refusal(result.value.reason));
    else onSaved(`Added ${name.trim()}.`);
  };

  return (
    <Sheet
      title="Add a bank account"
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" disabled={ledgerAccountId === ''} onClick={() => void save()}>
            Add
          </Button>
        </>
      }
    >
      <div className="settings-sheet">
        <label className="rule-editor__field">
          <span>Name</span>
          <input
            className="review-field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        <label className="rule-editor__field">
          <span>Bank</span>
          <input
            className="review-field"
            list="bank-suggestions"
            value={bank}
            onChange={(e) => {
              setBank(e.target.value);
            }}
          />
          <datalist id="bank-suggestions">
            {BANK_SUGGESTIONS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
        <label className="rule-editor__field">
          <span>Last four digits of the account number</span>
          <input
            className="review-field"
            inputMode="numeric"
            maxLength={4}
            value={lastFour}
            onChange={(e) => {
              setLastFour(e.target.value);
            }}
          />
        </label>
        <label className="rule-editor__field">
          <span>Its balance is kept in</span>
          <select
            className="review-field"
            value={ledgerAccountId}
            onChange={(e) => {
              setLedger(e.target.value);
            }}
          >
            {view.freeLedgers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} {l.name}
              </option>
            ))}
          </select>
        </label>
        {view.freeLedgers.length === 0 && (
          <p className="settings-card__line settings-card__line--secondary">
            Every asset account already has a bank account. Add an account in Accounts first.
          </p>
        )}
        <p className="settings-card__line settings-card__line--secondary">
          Only the last four digits are kept. A statement file is matched to its account by them.
        </p>
        {problem !== null && (
          <p className="split__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function RenameSheet({
  account,
  onClose,
  onSaved,
}: {
  readonly account: Row;
  readonly onClose: () => void;
  readonly onSaved: (text: string) => void;
}) {
  const [name, setName] = useState(account.name);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async () => {
    const result = await bridge()['bankAccounts.rename']({ id: account.id, name });
    if (!result.ok) setProblem('That could not be saved. Try again.');
    else if (result.value.kind === 'refused') setProblem(refusal(result.value.reason));
    else onSaved(`Renamed to ${name.trim()}.`);
  };
  return (
    <Sheet
      title={`Rename ${account.name}`}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="settings-sheet">
        <label className="rule-editor__field">
          <span>Name</span>
          <input
            className="review-field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        {problem !== null && (
          <p className="split__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}

export function BankAccountsCard({
  view,
  onChanged,
}: {
  readonly view: BankAccountsSettings | null;
  readonly onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Row | null>(null);
  const [stopping, setStopping] = useState<Row | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const done = (text: string) => {
    setAdding(false);
    setRenaming(null);
    setMessage(text);
    onChanged();
  };

  const stop = async (account: Row) => {
    setStopping(null);
    const result = await bridge()['bankAccounts.stop']({ id: account.id });
    if (result.ok && result.value.kind === 'saved') done(`${account.name} is no longer in use.`);
    else
      setMessage(
        result.ok && result.value.kind === 'refused'
          ? refusal(result.value.reason)
          : 'That could not be saved.',
      );
  };

  const active = view?.accounts.filter((a) => a.active) ?? [];
  return (
    <section className="page-surface settings-card" aria-labelledby="settings-banks">
      <h2 id="settings-banks" className="settings-card__title">
        <Landmark aria-hidden="true" className="settings-card__icon" />
        Bank accounts
      </h2>
      {view === null && <p aria-busy="true">Reading…</p>}
      {view !== null && active.length === 0 && (
        <p className="settings-card__line">
          No bank accounts yet. Add one before you import a statement file.
        </p>
      )}
      {active.length > 0 && (
        <ul className="settings-banks">
          {active.map((a) => (
            <li key={a.id}>
              <span>
                {a.name}
                {!a.name.includes(a.lastFour) && ` ··${a.lastFour}`}
                <span className="settings-card__line--secondary"> · {a.bank}</span>
              </span>
              <span className="settings-banks__actions">
                <Button
                  size="small"
                  aria-label={`Rename ${a.name}`}
                  onClick={() => {
                    setRenaming(a);
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="small"
                  aria-label={`Stop using ${a.name}`}
                  onClick={() => {
                    setStopping(a);
                  }}
                >
                  Stop using
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {message !== null && (
        <p className="settings-card__line" role="status">
          {message}
        </p>
      )}
      {view !== null && (
        <div className="settings-card__actions">
          <Button
            onClick={() => {
              setMessage(null);
              setAdding(true);
            }}
          >
            Add bank account…
          </Button>
        </div>
      )}
      {adding && view !== null && (
        <AddSheet
          view={view}
          onClose={() => {
            setAdding(false);
          }}
          onSaved={done}
        />
      )}
      {renaming !== null && (
        <RenameSheet
          account={renaming}
          onClose={() => {
            setRenaming(null);
          }}
          onSaved={done}
        />
      )}
      {stopping !== null && (
        <ConfirmDialog
          title={`Stop using ${stopping.name}?`}
          change="Its transactions stay in your books. New statement files for it will not import."
          confirmLabel="Stop using"
          destructive
          onConfirm={() => void stop(stopping)}
          onCancel={() => {
            setStopping(null);
          }}
        />
      )}
    </section>
  );
}
