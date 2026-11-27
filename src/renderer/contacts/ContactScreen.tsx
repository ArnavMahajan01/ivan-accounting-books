// One contact's page (spec 123; W08b, Option 1): what they owe, what was invoiced and paid this
// financial year, then their invoices (with the PDF), payments, bank lines and details, and the
// bank description words that give new lines this contact by themselves.

import { ChevronLeft, Pencil } from 'lucide-react';
import { useCallback, useState } from 'react';
import { formatDateAU } from '@shared/dates';
import type { ContactPageView, ContactPayment } from '@shared/contacts';
import { negateCents } from '@shared/money';
import type { TransactionRow } from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { plural } from '../import/import-text';
import { invoiceColumns } from '../invoices/InvoicesPage';
import { PageToolbar } from '../layout/PageToolbar';
import { useBridgeQuery } from '../pages/use-bridge';
import { routeHref } from '../routes';
import { addedText, formatAbn, KIND_WORDS } from './contact-text';
import { ContactSheet } from './ContactSheet';
import '../invoices/invoices.css';
import '../reports/reports.css';
import '../review/review.css';
import './contacts.css';

type Tab = 'invoices' | 'payments' | 'bank-lines' | 'details';
const TAB_WORDS: Record<Tab, string> = {
  invoices: 'Invoices',
  payments: 'Payments',
  'bank-lines': 'Bank lines',
  details: 'Details',
};

const INVOICE_COLUMNS = invoiceColumns(null);

const PAYMENT_COLUMNS: readonly TableColumn<ContactPayment>[] = [
  { key: 'date', header: 'Date', fit: true, cell: (p) => <DateCell date={p.date} /> },
  { key: 'invoice', header: 'Invoice', cell: (p) => p.invoiceNumber },
  {
    key: 'amount',
    header: 'Amount',
    align: 'end',
    fit: true,
    cell: (p) => <Amount cents={p.amount} />,
  },
];

const LINE_COLUMNS: readonly TableColumn<TransactionRow>[] = [
  { key: 'date', header: 'Date', fit: true, cell: (r) => <DateCell date={r.date} /> },
  { key: 'description', header: 'Bank description', cell: (r) => r.memo },
  { key: 'account', header: 'Account', cell: (r) => r.account?.name ?? '' },
  {
    key: 'amount',
    header: 'Amount',
    align: 'end',
    fit: true,
    // Money out shows with a minus sign, never colour alone.
    cell: (r) => <Amount cents={r.direction === 'out' ? negateCents(r.total) : r.total} />,
  },
];

function tabsFor(page: ContactPageView): Tab[] {
  const invoices = page.contact.kind !== 'supplier' || page.invoices.length > 0;
  return invoices ? ['invoices', 'payments', 'bank-lines', 'details'] : ['bank-lines', 'details'];
}

function Figures({ page }: { readonly page: ContactPageView }) {
  const { owing, invoiced, paid } = page;
  return (
    <dl className="invoices__bands">
      <div className="page-surface invoices__band">
        <dt>Owes you</dt>
        <dd>
          <Amount cents={owing.cents} />
          <span>
            {owing.count === 0
              ? 'Nothing owed'
              : `${plural(owing.count, 'invoice', 'invoices')}${owing.nextDue === null ? '' : `, due ${formatDateAU(owing.nextDue)}`}`}
          </span>
        </dd>
      </div>
      <div className="page-surface invoices__band">
        <dt>Invoiced this financial year</dt>
        <dd>
          <Amount cents={invoiced.cents} />
          <span>{plural(invoiced.count, 'invoice', 'invoices')}</span>
        </dd>
      </div>
      <div className="page-surface invoices__band">
        <dt>Paid this financial year</dt>
        <dd>
          <Amount cents={paid.cents} />
          <span>{plural(paid.count, 'payment', 'payments')}</span>
        </dd>
      </div>
    </dl>
  );
}

function Details({ page }: { readonly page: ContactPageView }) {
  const c = page.contact;
  const rows: [string, string][] = [
    ['Email', c.email ?? 'None saved'],
    ['Phone', c.phone ?? 'None saved'],
    ['ABN', c.abn === null ? 'None saved' : formatAbn(c.abn)],
    ['Notes', c.notes === '' ? 'None' : c.notes],
    ['Added', addedText(c.createdFrom, c.createdAt)],
  ];
  return (
    <dl className="page-surface contact__details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContactScreen({ id }: { readonly id: string }) {
  const [version, setVersion] = useState(0);
  const load = useCallback(() => bridge()['contacts.get']({ id }), [id]);
  const { state } = useBridgeQuery<ContactPageView | null>(load, `${id}:${String(version)}`);
  const [chosen, setChosen] = useState<Tab | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const page = state.status === 'ready' ? state.value : null;
  const tabs = page === null ? [] : tabsFor(page);
  const tab = chosen !== null && tabs.includes(chosen) ? chosen : (tabs[0] ?? 'details');

  return (
    <div className="invoices contact">
      <a href={routeHref('contacts')} className="report-page__back">
        <ChevronLeft aria-hidden="true" /> Contacts
      </a>
      {state.status === 'loading' && <p aria-busy="true">Reading this contact…</p>}
      {state.status === 'failed' && <ErrorMessage message="This contact could not be read." />}
      {state.status === 'ready' && page === null && (
        <ErrorMessage message="This contact is no longer there." />
      )}
      {page !== null && (
        <>
          <PageToolbar
            title={page.contact.name}
            status={<span className="contact__kind">{KIND_WORDS[page.contact.kind]}</span>}
            actions={
              <Button
                icon={Pencil}
                onClick={() => {
                  setEditing(true);
                }}
              >
                Edit details
              </Button>
            }
          />
          {notice !== null && (
            <p className="contact__notice" role="status">
              {notice}
            </p>
          )}
          {tabs.includes('invoices') && <Figures page={page} />}
          <fieldset className="review__show contact__tabs">
            <legend className="visually-hidden">Show</legend>
            {tabs.map((t) => (
              <label key={t} className="review__show-option">
                <input
                  type="radio"
                  name="contact-tab"
                  value={t}
                  checked={tab === t}
                  onChange={() => {
                    setChosen(t);
                  }}
                />
                <span>{TAB_WORDS[t]}</span>
              </label>
            ))}
          </fieldset>
          {tab === 'invoices' &&
            (page.invoices.length === 0 ? (
              <p className="contact__empty">No invoices for {page.contact.name} yet.</p>
            ) : (
              <Table
                label={`Invoices for ${page.contact.name}`}
                columns={INVOICE_COLUMNS}
                rows={page.invoices}
                rowKey={(r) => r.id}
              />
            ))}
          {tab === 'payments' &&
            (page.payments.length === 0 ? (
              <p className="contact__empty">
                No payments matched yet. A deposit is matched to its invoice in To review.
              </p>
            ) : (
              <Table
                label={`Payments from ${page.contact.name}`}
                columns={PAYMENT_COLUMNS}
                rows={page.payments}
                rowKey={(p) => `${p.entryId}:${p.invoiceNumber}`}
              />
            ))}
          {tab === 'bank-lines' &&
            (page.bankLines.length === 0 ? (
              <p className="contact__empty">No bank lines for {page.contact.name} yet.</p>
            ) : (
              <>
                <Table
                  label={`Bank lines for ${page.contact.name}`}
                  columns={LINE_COLUMNS}
                  rows={page.bankLines}
                  rowKey={(r) => r.id}
                />
                {page.moreBankLines > 0 && (
                  <p className="contact__empty">
                    {plural(page.moreBankLines, 'earlier line is', 'earlier lines are')} in
                    Transactions.
                  </p>
                )}
              </>
            ))}
          {tab === 'details' && <Details page={page} />}
          {page.words.length > 0 && (
            <p className="contact__words">
              Bank descriptions linked to this contact: {page.words.map((w) => `“${w}”`).join(', ')}
              . New lines with these words get this contact by themselves.
            </p>
          )}
          {editing && (
            <ContactSheet
              contact={page.contact}
              onClose={() => {
                setEditing(false);
              }}
              onSaved={(_, text) => {
                setEditing(false);
                setNotice(text);
                setVersion((v) => v + 1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
