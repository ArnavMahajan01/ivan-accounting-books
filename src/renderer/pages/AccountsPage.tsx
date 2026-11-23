import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { AccountType } from '@shared/kinds';
import { formatDateAU } from '@shared/dates';
import type { AccountRow, AccountsView } from '@shared/views';
import { Amount } from '../components/Amount';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { PageToolbar } from '../layout/PageToolbar';
import { transactionsHref } from '../routes';
import { loadAccounts } from './data-status';
import { useBridge } from './use-bridge';
import './AccountsPage.css';

// The chart is grouped as his QuickBooks page is, with his bank accounts first (wireframe W05b).
const GROUPS = [
  'Bank accounts',
  'Other assets',
  'Liabilities',
  'Equity',
  'Income',
  'Expenses',
] as const;
type Group = (typeof GROUPS)[number];

const BY_TYPE: Record<Exclude<AccountType, 'asset'>, Group> = {
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
};

function groupOf(account: AccountRow): Group {
  if (account.bank !== null) return 'Bank accounts';
  return account.type === 'asset' ? 'Other assets' : BY_TYPE[account.type];
}

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
};

/** What GST usually does to a line in this account, in words. No GST is left blank, as in the wireframe. */
function usualGstText(account: AccountRow): string {
  switch (account.usualGst?.treatment) {
    case 'taxable':
      return 'GST';
    case 'gst-free':
      return 'GST-free';
    case 'input-taxed':
      return 'Input taxed';
    default:
      return '';
  }
}

function matches(account: AccountRow, query: string): boolean {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== '');
  const text = `${account.code} ${account.name}`.toLowerCase();
  return words.every((word) => text.includes(word));
}

const COLUMNS: readonly TableColumn<AccountRow>[] = [
  {
    key: 'name',
    header: 'Account',
    cell: (account) => (
      <span className="accounts__name">
        <span className="accounts__code">{account.code}</span>
        {account.name}
        {!account.active && <span className="accounts__inactive">Inactive</span>}
      </span>
    ),
  },
  { key: 'type', header: 'Type', cell: (account) => TYPE_LABELS[account.type] },
  { key: 'gst', header: 'Usual GST', cell: usualGstText },
  {
    key: 'balance',
    header: 'Balance in your books',
    align: 'end',
    cell: (account) => <Amount cents={account.balance} />,
  },
  {
    key: 'open',
    header: '',
    align: 'end',
    cell: (account) => (
      // Reached from the keyboard with Enter on the row, so it is not another stop in the Tab order.
      <a
        href={transactionsHref(account.id)}
        tabIndex={-1}
        className="accounts__link"
        aria-label={`Transactions for ${account.name}`}
      >
        Transactions
      </a>
    ),
  },
];

function Chart({ view }: { readonly view: AccountsView }) {
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const rows = useMemo(() => {
    const shown = view.accounts.filter((a) => (showInactive || a.active) && matches(a, query));
    return shown
      .map((account) => ({ account, group: GROUPS.indexOf(groupOf(account)) }))
      .sort((a, b) => a.group - b.group || a.account.code.localeCompare(b.account.code))
      .map(({ account }) => account);
  }, [view.accounts, query, showInactive]);

  const hasInactive = view.accounts.some((a) => !a.active);
  return (
    <>
      <div className="accounts__filters">
        <label className="accounts__search">
          <Search aria-hidden="true" className="accounts__search-icon" />
          <input
            type="search"
            aria-label="Search accounts"
            placeholder="Search by name or code"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        {hasInactive && (
          <label className="accounts__inactive-toggle">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => {
                setShowInactive(event.target.checked);
              }}
            />
            Show inactive accounts
          </label>
        )}
      </div>
      {rows.length === 0 ? (
        <section className="page-surface">
          <EmptyState
            icon={Search}
            message={
              query.trim() === ''
                ? 'There are no accounts to show.'
                : `No account matches "${query.trim()}".`
            }
          />
        </section>
      ) : (
        <div className="accounts__table">
          <Table
            label="Chart of accounts"
            columns={COLUMNS}
            rows={rows}
            rowKey={(account) => account.id}
            groupBy={(account) => groupOf(account)}
            onRowAction={(account) => {
              window.location.hash = transactionsHref(account.id);
            }}
          />
        </div>
      )}
      <p className="accounts__note">
        As at {formatDateAU(view.asAt)}. A minus sign means the account has a credit balance, such
        as GST owing. Press Enter on an account to see its transactions.
      </p>
    </>
  );
}

export function AccountsPage() {
  const accounts = useBridge<AccountsView>(loadAccounts);
  return (
    <>
      <PageToolbar title="Accounts" />
      {accounts.status === 'loading' && (
        <section
          className="page-surface accounts__loading"
          aria-busy="true"
          aria-label="Loading accounts"
        >
          <Table label="Chart of accounts" columns={COLUMNS} rows={[]} rowKey={() => ''} loading />
        </section>
      )}
      {accounts.status === 'failed' && (
        <ErrorMessage message="The chart of accounts could not be read. Close the app and open it again." />
      )}
      {accounts.status === 'ready' &&
        (accounts.value.accounts.length === 0 ? (
          <section className="page-surface">
            <EmptyState
              icon={BookOpen}
              message="No accounts yet. Your chart of accounts appears here once your business is set up."
            />
          </section>
        ) : (
          <Chart view={accounts.value} />
        ))}
    </>
  );
}
