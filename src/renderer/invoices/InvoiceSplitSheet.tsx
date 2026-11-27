// Split a deposit across invoices (spec 129; W08a, Option 4): every invoice still owed, with what
// is owed and what this deposit pays of it. A part payment leaves the rest owing. Anything left
// over can go to an account instead. Save works only when it adds up to the deposit exactly.

import { useEffect, useState } from 'react';
import { asCents, formatCents, parseCents, type Cents } from '@shared/money';
import type { InvoiceRowView } from '@shared/invoices';
import type { ReviewLineView, ReviewView } from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';

const cents = (text: string): Cents | null => {
  if (text.trim() === '') return asCents(0);
  const parsed = parseCents(text.trim().replace(/^\$/, '').replace(/,/g, ''));
  return parsed.ok && parsed.value >= 0 ? parsed.value : null;
};

export function InvoiceSplitSheet({
  line,
  view,
  onCancel,
  onSave,
}: {
  readonly line: ReviewLineView;
  readonly view: ReviewView;
  readonly onCancel: () => void;
  /** Returns a problem in words, or null when saved. */
  readonly onSave: (
    invoices: readonly { number: string; amount: number }[],
    leftover: { accountId: string; taxCodeId: string | null } | null,
  ) => Promise<string | null>;
}) {
  const [owed, setOwed] = useState<readonly InvoiceRowView[] | null>(null);
  const [paying, setPaying] = useState<Record<string, string>>({});
  const [leftoverAccount, setLeftoverAccount] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const api = bridge();
    void api['invoices.list']({}).then((result) => {
      if (!result.ok) return;
      const open = result.value.rows.filter((r) => r.kind === 'invoice' && r.owing > 0);
      setOwed(open);
      // Start from the suggested invoice, paying what the deposit covers.
      const first = line.invoices[0];
      if (first !== undefined) {
        setPaying({
          [first.number]: formatCents(asCents(Math.min(first.owing, line.amount))).replace(
            /[$,]/g,
            '',
          ),
        });
      }
    });
  }, [line]);

  const amounts = (owed ?? []).map((r) => ({
    row: r,
    amount: cents(r.number in paying ? String(paying[r.number]) : ''),
  }));
  const bad = amounts.some((a) => a.amount === null || a.amount > a.row.owing);
  const toInvoices = amounts.reduce((sum, a) => sum + (a.amount ?? 0), 0);
  const left = line.amount - toInvoices;
  const ready = !bad && toInvoices > 0 && left >= 0 && (left === 0 || leftoverAccount !== '');
  const accounts = view.accounts.filter(
    (a) => a.type === 'income' || a.type === 'liability' || a.type === 'equity',
  );

  const save = async () => {
    setBusy(true);
    try {
      const chosen = view.accounts.find((a) => a.id === leftoverAccount);
      const message = await onSave(
        amounts.flatMap((a) =>
          a.amount !== null && a.amount > 0 ? [{ number: a.row.number, amount: a.amount }] : [],
        ),
        left > 0 && chosen !== undefined
          ? { accountId: chosen.id, taxCodeId: chosen.defaultTaxCodeId }
          : null,
      );
      setProblem(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={`Split ${formatCents(line.amount)} across invoices`}
      description={line.description}
      size="wide"
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="main" disabled={!ready || busy} onClick={() => void save()}>
            Save split
          </Button>
        </>
      }
    >
      {owed === null && <p aria-busy="true">Reading the invoices…</p>}
      {owed !== null && owed.length === 0 && <p>No invoices are owed.</p>}
      {owed !== null && owed.length > 0 && (
        <table className="invoice-split">
          <thead>
            <tr>
              <th scope="col">Invoice</th>
              <th scope="col">Customer</th>
              <th scope="col" className="invoice-split__n">
                Owing
              </th>
              <th scope="col" className="invoice-split__n">
                Paying now
              </th>
            </tr>
          </thead>
          <tbody>
            {amounts.map(({ row, amount }) => (
              <tr key={row.number}>
                <th scope="row">{row.number}</th>
                <td>{row.customer}</td>
                <td className="invoice-split__n">
                  <Amount cents={row.owing} />
                </td>
                <td className="invoice-split__n">
                  <input
                    className="review-field invoice-split__amount"
                    inputMode="decimal"
                    aria-label={`Paying now on ${row.number}`}
                    aria-invalid={amount === null || amount > row.owing}
                    value={paying[row.number] ?? ''}
                    onChange={(e) => {
                      setPaying({ ...paying, [row.number]: e.target.value });
                      setProblem(null);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="invoice-split__left" role="status">
        Left to split: <Amount cents={asCents(left)} />
        {left === 0 && toInvoices > 0 ? ' ✓' : ''}
        {left < 0 ? ' (more than the deposit)' : ''}
        {bad ? ' One amount is more than is owed, or not an amount.' : ''}
      </p>
      {left > 0 && (
        <label className="share__field">
          <span>The rest goes to</span>
          <select
            className="review-field"
            value={leftoverAccount}
            onChange={(e) => {
              setLeftoverAccount(e.target.value);
            }}
          >
            <option value="">Choose an account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="publish__line publish__line--note invoice-split__note">
        A part payment leaves the rest of that invoice owing. Anything left over can go to an
        account instead.
      </p>
      {problem !== null && (
        <p className="split__problem" role="alert">
          {problem}
        </p>
      )}
    </Sheet>
  );
}
