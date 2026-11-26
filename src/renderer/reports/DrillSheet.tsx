// The lines behind a report figure (spec 093): date, payee, before GST, GST and total, their
// total (always the figure clicked), and Open in Transactions.

import { useEffect, useState } from 'react';
import type { Drill } from '@shared/reports';
import type { DrillView } from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { Sheet } from '../components/Sheet';
import { transactionsHref } from '../routes';

/** At most this many lines are listed; the total is always for all of them. */
const SHOWN = 100;

export function DrillSheet({
  drill,
  onClose,
}: {
  readonly drill: Drill;
  readonly onClose: () => void;
}) {
  const [view, setView] = useState<DrillView | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const api = bridge();
    void api['reports.lines']({ drill }).then((result) => {
      if (result.ok) setView(result.value);
      else setFailed(true);
    });
  }, [drill]);

  return (
    <Sheet
      title={view?.title ?? 'Lines'}
      onClose={onClose}
      actions={
        <>
          {view?.accountId != null && (
            <Button
              onClick={() => {
                window.location.hash = transactionsHref(view.accountId ?? '');
                onClose();
              }}
            >
              Open in Transactions
            </Button>
          )}
          <Button variant="main" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {failed && <p role="alert">The lines could not be read. Close this and try again.</p>}
      {view === null && !failed && <p aria-busy="true">Reading the lines…</p>}
      {view !== null && (
        <div className="drill">
          <table className="report drill__table" aria-label="Lines">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Payee</th>
                <th scope="col" className="report__n">
                  Before GST
                </th>
                <th scope="col" className="report__n">
                  GST
                </th>
                <th scope="col" className="report__n">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {view.lines.slice(0, SHOWN).map((l, i) => (
                <tr key={`${l.entryId}-${String(i)}`}>
                  <td>
                    <DateCell date={l.date} />
                  </td>
                  <td>
                    {l.payee ?? l.description}
                    {l.payee !== null && <span className="drill__sub"> {l.description}</span>}
                  </td>
                  <td className="report__n">
                    <Amount cents={l.beforeGst} />
                  </td>
                  <td className="report__n">
                    <Amount cents={l.gst} />
                  </td>
                  <td className="report__n">
                    <Amount cents={l.total} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="report__row--total">
                <th scope="row" colSpan={2}>
                  {view.totalLabel}
                  {view.lines.length > SHOWN && `, all ${String(view.lines.length)} lines`}
                </th>
                <td className="report__n">
                  <Amount cents={view.total} />
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          {view.lines.length === 0 && <p className="transfer__note">No lines.</p>}
        </div>
      )}
    </Sheet>
  );
}
