// New account and Edit account (spec 084): from the chart of accounts page.

import { useState } from 'react';
import { ACCOUNT_TYPES, type AccountType } from '@shared/kinds';
import type { AccountEditOutcome, AccountRow, AccountsView } from '@shared/views';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';

const TYPE_WORDS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
};

const REFUSED: Record<Extract<AccountEditOutcome, { kind: 'refused' }>['reason'], string> = {
  'empty-code': 'Type a code for the account, such as 6200.',
  'empty-name': 'Type a name for the account.',
  'code-in-use': 'Another account already has that code. Choose another.',
  'not-found': 'That account is no longer there.',
  'parent-not-found': 'The account it sits under is no longer there.',
  unchanged: 'Nothing was changed.',
  'already-inactive': 'That account is already not in use.',
  'already-active': 'That account is already in use.',
  'bank-account': 'A bank account is turned off from its bank account settings.',
};

export function AccountSheet({
  view,
  account,
  onClose,
  onSaved,
}: {
  readonly view: AccountsView;
  /** Null for a new account. */
  readonly account: AccountRow | null;
  readonly onClose: () => void;
  readonly onSaved: (text: string) => void;
}) {
  const [name, setName] = useState(account?.name ?? '');
  const [code, setCode] = useState(account?.code ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'expense');
  const [parentId, setParentId] = useState('');
  const [taxCodeId, setTaxCodeId] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answer = (result: { ok: boolean; value?: AccountEditOutcome }, done: string) => {
    if (!result.ok || result.value === undefined) setProblem('That could not be saved. Try again.');
    else if (result.value.kind === 'saved') onSaved(done);
    else setProblem(REFUSED[result.value.reason]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const api = bridge();
      if (account === null) {
        const result = await api['accounts.add']({
          code: code.trim(),
          name: name.trim(),
          type,
          parentId: parentId === '' ? null : parentId,
          defaultTaxCodeId: taxCodeId === '' ? null : taxCodeId,
        });
        answer(result, `Added ${code.trim()} ${name.trim()}.`);
      } else {
        const result = await api['accounts.edit']({ id: account.id, code, name });
        answer(result, `Saved ${code.trim()} ${name.trim()}.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (active: boolean) => {
    if (account === null) return;
    const api = bridge();
    const result = await api['accounts.setActive']({ id: account.id, active });
    answer(
      result,
      active ? `${account.name} is in use again.` : `${account.name} is no longer in use.`,
    );
  };

  const parents = view.accounts.filter((a) => a.active && a.type === type && a.parentId === null);
  return (
    <Sheet
      title={account === null ? 'New account' : `Edit ${account.name}`}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="account-sheet">
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
          <span>Code</span>
          <input
            className="review-field"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
          />
        </label>
        {account === null && (
          <>
            <label className="rule-editor__field">
              <span>Type</span>
              <select
                className="review-field"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as AccountType);
                  setParentId('');
                }}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_WORDS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="rule-editor__field">
              <span>Sits under (optional)</span>
              <select
                className="review-field"
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                }}
              >
                <option value="">Nothing: a main account</option>
                {parents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="rule-editor__field">
              <span>Usual GST</span>
              <select
                className="review-field"
                value={taxCodeId}
                onChange={(e) => {
                  setTaxCodeId(e.target.value);
                }}
              >
                <option value="">No code</option>
                {view.taxCodes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortCode}: {t.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {account !== null && account.bank === null && (
          <div className="account-sheet__active">
            {account.active ? (
              <>
                <p>
                  {account.hasPostedLines
                    ? 'This account has posted transactions. They stay as they are, and it is hidden from the lists you choose from.'
                    : 'It is hidden from the lists you choose from. You can use it again later.'}
                </p>
                <Button variant="destructive" onClick={() => void setActive(false)}>
                  Stop using this account
                </Button>
              </>
            ) : (
              <Button onClick={() => void setActive(true)}>Use this account again</Button>
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
