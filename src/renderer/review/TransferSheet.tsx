// Mark a line as money moved between two of his accounts (spec 073, wireframe W05 Option 1).

import { useState } from 'react';
import { formatDateAU } from '@shared/dates';
import { asCents, formatCents } from '@shared/money';
import type { ReviewLineView, ReviewView } from '@shared/views';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';

export function TransferSheet({
  line,
  view,
  onCancel,
  onSave,
}: {
  readonly line: ReviewLineView;
  readonly view: ReviewView;
  readonly onCancel: () => void;
  /** Resolves with a sentence when it could not be saved, or null when it was. */
  readonly onSave: (otherBankAccountId: string) => Promise<string | null>;
}) {
  const others = view.bankAccounts.filter((b) => b.id !== line.bankAccountId);
  const [otherId, setOtherId] = useState(line.transfer?.bankAccountId ?? others[0]?.id ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const out = line.amount < 0;
  const amount = formatCents(asCents(Math.abs(line.amount)));
  const found =
    line.transfer !== null && line.transfer.bankAccountId === otherId ? line.transfer : null;
  const otherName = others.find((b) => b.id === otherId)?.name ?? '';

  return (
    <Sheet
      title="Transfer between your accounts"
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="main"
            disabled={otherId === '' || saving}
            onClick={() => {
              setSaving(true);
              void onSave(otherId).then((failure) => {
                setSaving(false);
                setProblem(failure);
              });
            }}
          >
            Save transfer
          </Button>
        </>
      }
    >
      {others.length === 0 ? (
        <p className="transfer__note">
          You have only one bank account in the app, so there is nothing to transfer to.
        </p>
      ) : (
        <>
          <label className="transfer__field">
            <span>
              Move <strong className="amount">{amount}</strong> {out ? 'from' : 'into'}{' '}
              {line.bankAccountName} {out ? 'to' : 'from'}
            </span>
            <select
              className="review-field"
              value={otherId}
              onChange={(event) => {
                setOtherId(event.target.value);
                setProblem(null);
              }}
            >
              {others.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <p className="transfer__found">
            {found === null
              ? `No line for ${amount} in ${otherName} within five days yet. This line will wait in Transfers in transit, and pairs with the other side when you import it.`
              : found.alreadyPosted
                ? `Pairs with the transfer already posted in ${found.bankAccountName} on ${formatDateAU(found.date)}.`
                : `Matches a line in ${found.bankAccountName} on ${formatDateAU(found.date)}: ${amount}. Both lines will be marked as this transfer.`}
          </p>
        </>
      )}
      <p className="transfer__note">A transfer is not income or an expense, and has no GST.</p>
      {problem !== null && (
        <p className="split__problem" role="alert">
          {problem}
        </p>
      )}
    </Sheet>
  );
}
