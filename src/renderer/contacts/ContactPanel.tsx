// A contact's summary beside the page (spec 123; W08b, Option 3): what they owe, what they paid
// this financial year, and their invoices, without leaving the page. The full page is one click on.

import { useCallback } from 'react';
import type { ContactPageView } from '@shared/contacts';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { ErrorMessage } from '../components/ErrorMessage';
import { SidePanel } from '../components/SidePanel';
import { statusText } from '../invoices/InvoicesPage';
import { useBridgeQuery } from '../pages/use-bridge';
import { contactHref, KIND_WORDS } from './contact-text';
import './contacts.css';

export function ContactPanel({
  id,
  name,
  onClose,
}: {
  readonly id: string;
  /** Shown as the heading while the summary loads. */
  readonly name: string;
  readonly onClose: () => void;
}) {
  const load = useCallback(() => bridge()['contacts.get']({ id }), [id]);
  const { state } = useBridgeQuery<ContactPageView | null>(load, id);
  const page = state.status === 'ready' ? state.value : null;

  return (
    <SidePanel title={page?.contact.name ?? name} onClose={onClose}>
      {state.status === 'loading' && <p aria-busy="true">Reading…</p>}
      {state.status === 'failed' && <ErrorMessage message="This contact could not be read." />}
      {state.status === 'ready' && page === null && <p>This contact is no longer there.</p>}
      {page !== null && (
        <div className="contact-panel">
          <p className="contact-panel__kind">{KIND_WORDS[page.contact.kind]}</p>
          <dl className="contact-panel__figures">
            <div>
              <dt>Owes you</dt>
              <dd>
                <Amount cents={page.owing.cents} />
              </dd>
            </div>
            <div>
              <dt>Paid this financial year</dt>
              <dd>
                <Amount cents={page.paid.cents} />
              </dd>
            </div>
          </dl>
          {page.invoices.length > 0 && (
            <>
              <h3 className="contact-panel__heading">Invoices</h3>
              <ul className="contact-panel__invoices">
                {page.invoices.map((r) => (
                  <li key={r.id}>
                    <span>{r.number}</span>
                    <Amount cents={r.total} />
                    <span
                      className={
                        r.status.kind === 'overdue'
                          ? 'invoice-status invoice-status--overdue'
                          : 'invoice-status'
                      }
                    >
                      {statusText(r.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <a className="contact-panel__open" href={contactHref(page.contact.id)}>
            Open full page
          </a>
        </div>
      )}
    </SidePanel>
  );
}
