// Split a bank line across accounts (spec 072, wireframe W05 Option 1). Each row is an account, a
// GST code and an amount. "Left to split" updates as he types, and Save works only at $0.00.

import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import { asCents, formatCents, parseCents, type Cents } from '@shared/money';
import type { ReviewLineView, ReviewView } from '@shared/views';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { accountLabel, findAccount } from './review-text';

interface SplitRow {
  readonly key: number;
  readonly accountText: string;
  readonly taxCodeId: string | null;
  readonly amountText: string;
}

export interface SplitPartInput {
  readonly accountId: string;
  readonly taxCodeId: string | null;
  readonly amount: number;
}

/** An amount as typed: `86.45`, `$1,284.70`. Null when it is not one, or is not above zero. */
function typedCents(text: string): Cents | null {
  const parsed = parseCents(text.trim().replace(/^\$/, '').replace(/,/g, ''));
  return parsed.ok && parsed.value > 0 ? parsed.value : null;
}

/** "86.45" for the box, from cents. */
function amountForBox(cents: number): string {
  return formatCents(asCents(cents)).replace(/[$,]/g, '');
}

export function SplitSheet({
  line,
  view,
  firstAccountText,
  firstTaxCodeId,
  onCancel,
  onSave,
}: {
  readonly line: ReviewLineView;
  readonly view: ReviewView;
  readonly firstAccountText: string;
  readonly firstTaxCodeId: string | null;
  readonly onCancel: () => void;
  /** Resolves with a sentence when it could not be saved, or null when it was. */
  readonly onSave: (parts: readonly SplitPartInput[]) => Promise<string | null>;
}) {
  const listId = useId();
  const total = Math.abs(line.amount);
  const [rows, setRows] = useState<readonly SplitRow[]>([
    {
      key: 1,
      accountText: firstAccountText,
      taxCodeId: firstTaxCodeId,
      amountText: amountForBox(total),
    },
    { key: 2, accountText: '', taxCodeId: null, amountText: '' },
  ]);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The hint about a missing account or amount waits until he has changed something.
  const [touched, setTouched] = useState(false);

  const used = rows.filter((r) => r.accountText.trim() !== '' || r.amountText.trim() !== '');
  const amounts = used.map((r) => typedCents(r.amountText));
  const left = total - amounts.reduce<number>((sum, a) => sum + (a ?? 0), 0);
  const unreadable = amounts.some((a) => a === null);
  const accounts = used.map((r) => findAccount(r.accountText, view.accounts));
  const missingAccount = accounts.some((a) => a === null);
  const ready = used.length > 0 && left === 0 && !unreadable && !missingAccount;

  const change = (key: number, patch: Partial<SplitRow>) => {
    setProblem(null);
    setTouched(true);
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const save = () => {
    if (!ready) return;
    const parts = used.map((r, i) => ({
      accountId: accounts[i]?.id ?? '',
      taxCodeId: r.taxCodeId,
      amount: amounts[i] ?? 0,
    }));
    setSaving(true);
    void onSave(parts).then((failure) => {
      setSaving(false);
      if (failure !== null) setProblem(failure);
    });
  };

  const leftText =
    left === 0
      ? `${formatCents(asCents(0))} ✓`
      : left > 0
        ? formatCents(asCents(left))
        : `${formatCents(asCents(-left))} too much`;

  return (
    <Sheet
      title={`Split: ${line.description}, ${formatCents(line.amount)}`}
      description="Share this line across accounts. The amounts include GST and must add up to the line."
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="main" disabled={!ready || saving} onClick={save}>
            Save split
          </Button>
        </>
      }
    >
      <datalist id={listId}>
        {view.accounts.map((a) => (
          <option key={a.id} value={accountLabel(a)} />
        ))}
      </datalist>
      <table className="split">
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col">GST</th>
            <th scope="col" className="split__amount">
              Amount
            </th>
            <th scope="col">
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key}>
              <td>
                <input
                  className="review-field"
                  list={listId}
                  aria-label={`Account ${String(index + 1)}`}
                  value={row.accountText}
                  onChange={(event) => {
                    const accountText = event.target.value;
                    const account = findAccount(accountText, view.accounts);
                    change(row.key, {
                      accountText,
                      ...(account === null ? {} : { taxCodeId: account.defaultTaxCodeId }),
                    });
                  }}
                />
              </td>
              <td>
                <select
                  className="review-field"
                  aria-label={`GST code ${String(index + 1)}`}
                  value={row.taxCodeId ?? ''}
                  onChange={(event) => {
                    change(row.key, {
                      taxCodeId: event.target.value === '' ? null : event.target.value,
                    });
                  }}
                >
                  <option value="">No code</option>
                  {view.taxCodes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.shortCode}
                    </option>
                  ))}
                </select>
              </td>
              <td className="split__amount">
                <input
                  className="review-field split__amount-field"
                  inputMode="decimal"
                  aria-label={`Amount ${String(index + 1)}`}
                  value={row.amountText}
                  onChange={(event) => {
                    change(row.key, { amountText: event.target.value });
                  }}
                />
              </td>
              <td>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="split__remove"
                    aria-label={`Remove line ${String(index + 1)}`}
                    onClick={() => {
                      setRows((current) => current.filter((r) => r.key !== row.key));
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              Left to split
            </th>
            <td className="split__amount" aria-live="polite">
              <span className="amount">{leftText}</span>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <Button
        size="small"
        icon={Plus}
        onClick={() => {
          setRows((current) => [
            ...current,
            {
              key: Math.max(0, ...current.map((r) => r.key)) + 1,
              accountText: '',
              taxCodeId: null,
              amountText: left > 0 ? amountForBox(left) : '',
            },
          ]);
        }}
      >
        Add line
      </Button>
      {(problem !== null || (touched && used.length > 0 && (unreadable || missingAccount))) && (
        <p className="split__problem" role="alert">
          {problem ??
            (unreadable
              ? 'Type each amount in dollars and cents, such as 86.45.'
              : 'Choose an account for each amount.')}
        </p>
      )}
    </Sheet>
  );
}
