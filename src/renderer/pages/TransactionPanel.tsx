import { FileQuestionMark } from 'lucide-react';
import { formatDateAU } from '@shared/dates';
import { asCents, formatCents, sumCents, type Cents } from '@shared/money';
import type { TransactionDetail } from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { SidePanel } from '../components/SidePanel';
import { useBridgeQuery } from './use-bridge';
import { SOURCE_LABELS, formatMoment } from './transaction-labels';
import './TransactionPanel.css';

/** A debit or credit column shows nothing when the line has none on that side. */
function Side({ cents }: { readonly cents: Cents }) {
  return cents === 0 ? <span aria-hidden="true" /> : <Amount cents={cents} />;
}

function Detail({ detail }: { readonly detail: TransactionDetail }) {
  const debits = sumCents(detail.lines.map((l) => l.debit));
  const credits = sumCents(detail.lines.map((l) => l.credit));
  return (
    <>
      <dl className="transaction-summary">
        <div>
          <dt>Date</dt>
          <dd>{formatDateAU(detail.date)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{SOURCE_LABELS[detail.sourceKind]}</dd>
        </div>
        {detail.payee !== null && (
          <div>
            <dt>Payee</dt>
            <dd>{detail.payee}</dd>
          </div>
        )}
        {detail.memo !== '' && (
          <div>
            <dt>Description</dt>
            <dd>{detail.memo}</dd>
          </div>
        )}
        <div>
          <dt>Before GST</dt>
          <dd>
            <Amount cents={detail.beforeGst} />
          </dd>
        </div>
        <div>
          <dt>GST</dt>
          <dd>
            <Amount cents={detail.gst} />
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>
            <Amount cents={detail.total} />
          </dd>
        </div>
      </dl>
      {detail.locked && (
        <p className="transaction-locked">
          <Badge status="locked" /> This period is locked, so this entry cannot change.
        </p>
      )}

      <h3 className="transaction-heading">What it did to the books</h3>
      <table className="transaction-lines">
        <caption className="visually-hidden">Debits and credits</caption>
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col" className="transaction-lines__money">
              Debit
            </th>
            <th scope="col" className="transaction-lines__money">
              Credit
            </th>
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line, index) => (
            <tr key={`${line.accountId}-${String(index)}`}>
              <td>
                <span className="transaction-lines__account">{line.accountName}</span>
                {line.taxCode !== null && (
                  <span className="transaction-lines__gst">
                    {line.gst === 0
                      ? `Tax code ${line.taxCode}`
                      : `GST ${formatCents(asCents(Math.abs(line.gst)))}`}
                  </span>
                )}
              </td>
              <td className="transaction-lines__money">
                <Side cents={line.debit} />
              </td>
              <td className="transaction-lines__money">
                <Side cents={line.credit} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Totals</th>
            <td className="transaction-lines__money">
              <Amount cents={debits} />
            </td>
            <td className="transaction-lines__money">
              <Amount cents={credits} />
            </td>
          </tr>
        </tfoot>
      </table>

      <h3 className="transaction-heading">History</h3>
      <ol className="transaction-history">
        {detail.history.map((item, index) => (
          <li key={`${item.at}-${String(index)}`} className="transaction-history__item">
            <span className="transaction-history__what">
              {item.kind === 'posted' ? 'Posted' : 'Changed'}
              <span className="transaction-history__when">{formatMoment(item.at)}</span>
            </span>
            {item.changes.length > 0 && (
              <ul className="transaction-history__changes">
                {item.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

export interface TransactionPanelProps {
  readonly id: string;
  /** What to call it while the entry loads. */
  readonly fallbackTitle: string;
  readonly onClose: () => void;
}

/** A transaction's lines and history, beside the list (spec 052). */
export function TransactionPanel({ id, fallbackTitle, onClose }: TransactionPanelProps) {
  const { state, reload } = useBridgeQuery(() => bridge()['transactions.get']({ id }), id);
  const title =
    state.status === 'ready' && state.value !== null
      ? (state.value.payee ?? (state.value.memo === '' ? fallbackTitle : state.value.memo))
      : fallbackTitle;
  return (
    <SidePanel title={title} onClose={onClose}>
      {state.status === 'loading' && (
        <p className="transaction-loading" aria-busy="true">
          Loading…
        </p>
      )}
      {state.status === 'failed' && (
        <ErrorMessage message="This transaction could not be read." onRetry={reload} />
      )}
      {state.status === 'ready' && state.value === null && (
        <>
          <p className="transaction-gone">
            <FileQuestionMark aria-hidden="true" className="transaction-gone__icon" />
            This transaction no longer exists. It may have been removed.
          </p>
          <Button onClick={onClose}>Close</Button>
        </>
      )}
      {state.status === 'ready' && state.value !== null && <Detail detail={state.value} />}
    </SidePanel>
  );
}
