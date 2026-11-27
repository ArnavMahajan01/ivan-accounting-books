// Contacts (spec 123; W08b, Option 1): customers and suppliers, each saved by itself the first time
// a name appears on a bank line or an invoice. Customers show what they owe and where their oldest
// unpaid invoice is up to; suppliers what was paid to them this financial year. "Added" says where
// each came from. A name opens the contact's page.

import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ContactListRow, ContactPairView, ContactsView } from '@shared/contacts';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { statusText } from '../invoices/InvoicesPage';
import { PageToolbar } from '../layout/PageToolbar';
import { useBridgeQuery } from '../pages/use-bridge';
import { useHash } from '../use-route';
import { addedText, contactHref, contactIdFromHash } from './contact-text';
import { ContactPairs } from './ContactPairs';
import { ContactScreen } from './ContactScreen';
import { ContactSheet } from './ContactSheet';
import '../invoices/invoices.css';
import '../review/review.css';
import '../rules/rules.css';
import './contacts.css';

type Show = 'customers' | 'suppliers';

const loadContacts = () => bridge()['contacts.list']({});
const loadPairs = () => bridge()['contacts.pairs']({});

const nameColumn: TableColumn<ContactListRow> = {
  key: 'name',
  header: 'Name',
  sortValue: (r) => r.name.toLowerCase(),
  cell: (r) => (
    <a className="contact-name" href={contactHref(r.id)}>
      {r.name}
    </a>
  ),
};
const addedColumn: TableColumn<ContactListRow> = {
  key: 'added',
  header: 'Added',
  cell: (r) => <span className="contact__added">{addedText(r.createdFrom, r.createdAt)}</span>,
};

const CUSTOMER_COLUMNS: readonly TableColumn<ContactListRow>[] = [
  nameColumn,
  {
    key: 'owing',
    header: 'Owes you',
    align: 'end',
    fit: true,
    sortValue: (r) => r.owing,
    cell: (r) => <Amount cents={r.owing} />,
  },
  {
    key: 'oldest',
    header: 'Oldest unpaid',
    cell: (r) =>
      r.oldestUnpaid === null ? (
        ''
      ) : (
        <span
          className={
            r.oldestUnpaid.kind === 'overdue'
              ? 'invoice-status invoice-status--overdue'
              : 'invoice-status'
          }
        >
          {statusText(r.oldestUnpaid)}
        </span>
      ),
  },
  addedColumn,
];

function supplierColumns(yearLabel: string): readonly TableColumn<ContactListRow>[] {
  return [
    nameColumn,
    {
      key: 'spent',
      header: `Paid in ${yearLabel}`,
      align: 'end',
      fit: true,
      sortValue: (r) => r.spentThisYear,
      cell: (r) => <Amount cents={r.spentThisYear} />,
    },
    {
      key: 'last',
      header: 'Latest bank line',
      fit: true,
      cell: (r) => (r.lastLine === null ? '' : <DateCell date={r.lastLine} />),
    },
    addedColumn,
  ];
}

const isCustomer = (r: ContactListRow) => r.kind !== 'supplier';
const isSupplier = (r: ContactListRow) => r.kind !== 'customer';

function ContactsList() {
  const [version, setVersion] = useState(0);
  const { state } = useBridgeQuery<ContactsView>(loadContacts, String(version));
  const [show, setShow] = useState<Show>('customers');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pairs = useBridgeQuery<readonly ContactPairView[]>(loadPairs, String(version)).state;
  const view = state.status === 'ready' ? state.value : null;

  const counts = useMemo(
    () => ({
      customers: view?.rows.filter(isCustomer).length ?? 0,
      suppliers: view?.rows.filter(isSupplier).length ?? 0,
    }),
    [view],
  );
  const words = search.trim().toLowerCase();
  const rows = (view?.rows ?? []).filter(
    (r) =>
      (show === 'customers' ? isCustomer(r) : isSupplier(r)) &&
      (words === '' || r.name.toLowerCase().includes(words)),
  );
  const columns =
    show === 'customers' ? CUSTOMER_COLUMNS : supplierColumns(view?.yearLabel ?? 'this year');

  return (
    <div className="invoices">
      <PageToolbar
        title="Contacts"
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setAdding(true);
            }}
          >
            New contact
          </Button>
        }
      />
      {notice !== null && (
        <p className="contact__notice" role="status">
          {notice}
        </p>
      )}
      {pairs.status === 'ready' && (
        <ContactPairs
          pairs={pairs.value}
          onChanged={(text) => {
            setNotice(text);
            setVersion((v) => v + 1);
          }}
        />
      )}
      {state.status === 'loading' && <p aria-busy="true">Reading your contacts…</p>}
      {state.status === 'failed' && <ErrorMessage message="Your contacts could not be read." />}
      {view !== null && view.rows.length === 0 && (
        <EmptyState
          icon={Users}
          message="No contacts yet. Customers and suppliers are saved by themselves from bank lines and invoices."
        />
      )}
      {view !== null && view.rows.length > 0 && (
        <>
          <div className="review__filters" role="search" aria-label="Filter contacts">
            <fieldset className="review__show">
              <legend className="visually-hidden">Show</legend>
              {(['customers', 'suppliers'] as const).map((s) => (
                <label key={s} className="review__show-option">
                  <input
                    type="radio"
                    name="contacts-show"
                    value={s}
                    checked={show === s}
                    onChange={() => {
                      setShow(s);
                    }}
                  />
                  <span>
                    {s === 'customers' ? 'Customers' : 'Suppliers'}{' '}
                    {counts[s].toLocaleString('en-AU')}
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="review__search">
              <Search aria-hidden="true" className="review__search-icon" />
              <input
                type="search"
                aria-label="Search contacts by name"
                placeholder="Search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </label>
          </div>
          {rows.length === 0 ? (
            <p className="contact__empty">
              {words === ''
                ? `No ${show} yet.`
                : `No ${show} have “${search.trim()}” in their name.`}
            </p>
          ) : (
            <Table
              label={show === 'customers' ? 'Customers' : 'Suppliers'}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              initialSort={{ key: 'name', direction: 'ascending' }}
              onRowAction={(r) => {
                window.location.hash = contactHref(r.id);
              }}
            />
          )}
          <p className="contact__empty">
            A name opens its page. “Added” says where each contact came from.
          </p>
        </>
      )}
      {adding && (
        <ContactSheet
          contact={null}
          onClose={() => {
            setAdding(false);
          }}
          onSaved={(id) => {
            setAdding(false);
            setVersion((v) => v + 1);
            window.location.hash = contactHref(id);
          }}
        />
      )}
    </div>
  );
}

export function ContactsPage() {
  const id = contactIdFromHash(useHash());
  return id === null ? <ContactsList /> : <ContactScreen key={id} id={id} />;
}
