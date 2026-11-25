import { ChevronLeft, ChevronRight, ReceiptText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDateAU } from '@shared/dates';
import type { AccountType } from '@shared/kinds';
import type {
  AccountsView,
  TransactionKind,
  TransactionRow,
  TransactionsPage as TransactionsPageData,
} from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { PageToolbar } from '../layout/PageToolbar';
import { queryFromHash } from '../routes';
import { TransactionPanel } from './TransactionPanel';
import { loadAccounts } from './data-status';
import { DIRECTION_LABELS, SOURCE_LABELS } from './transaction-labels';
import { useBridge, useBridgeQuery } from './use-bridge';
import { useDebounced } from './use-debounced';
import './TransactionsPage.css';

export const PAGE_SIZE = 100;

const KINDS: readonly { value: TransactionKind; label: string }[] = [
  { value: 'all', label: 'All transactions' },
  { value: 'money-in', label: 'Money in' },
  { value: 'money-out', label: 'Money out' },
  { value: 'transfers', label: 'Transfers' },
];

type PeriodChoice = 'last-12-months' | 'financial-year' | 'bas-period' | 'all' | 'custom';
const PERIODS: readonly { value: PeriodChoice; label: string }[] = [
  { value: 'last-12-months', label: 'Last 12 months' },
  { value: 'financial-year', label: 'This financial year' },
  { value: 'bas-period', label: 'This BAS period' },
  { value: 'all', label: 'All dates' },
  { value: 'custom', label: 'Choose dates…' },
];

const TYPE_ORDER: readonly AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];
const TYPE_HEADINGS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
};

const COLUMNS: readonly TableColumn<TransactionRow>[] = [
  { key: 'date', header: 'Date', fit: true, cell: (row) => <DateCell date={row.date} /> },
  {
    key: 'type',
    header: 'Type',
    cell: (row) => (
      <span className="transactions__stack">
        {SOURCE_LABELS[row.sourceKind]}
        {DIRECTION_LABELS[row.direction] !== '' && (
          <span className="transactions__sub">{DIRECTION_LABELS[row.direction]}</span>
        )}
      </span>
    ),
  },
  {
    key: 'payee',
    header: 'Payee',
    cell: (row) => (
      <span className="transactions__stack">
        {row.payee ?? row.memo}
        {row.payee !== null && row.memo !== '' && (
          <span className="transactions__sub">{row.memo}</span>
        )}
      </span>
    ),
  },
  {
    key: 'account',
    header: 'Account',
    cell: (row) => (
      <span className="transactions__stack">
        {row.account?.name ?? ''}
        {row.locked && <Badge status="locked" />}
      </span>
    ),
  },
  {
    key: 'before',
    header: 'Before GST',
    align: 'end',
    fit: true,
    cell: (row) => <Amount cents={row.beforeGst} />,
  },
  { key: 'gst', header: 'GST', align: 'end', fit: true, cell: (row) => <Amount cents={row.gst} /> },
  {
    key: 'total',
    header: 'Total',
    align: 'end',
    fit: true,
    cell: (row) => <Amount cents={row.total} />,
  },
];

function Footer({
  page,
  filtered,
  onPage,
}: {
  readonly page: TransactionsPageData;
  readonly filtered: boolean;
  readonly onPage: (offset: number) => void;
}) {
  const first = page.matching === 0 ? 0 : page.offset + 1;
  const last = Math.min(page.offset + page.limit, page.matching);
  return (
    <div className="transactions__footer">
      <p className="transactions__totals" aria-live="polite">
        <span>
          {page.matching.toLocaleString('en-AU')}{' '}
          {page.matching === 1 ? 'transaction' : 'transactions'}
        </span>
        <span>
          Before GST <Amount cents={page.totals.beforeGst} />
        </span>
        <span>
          GST <Amount cents={page.totals.gst} />
        </span>
        <span>
          Total <Amount cents={page.totals.total} />
        </span>
        {page.accountTotal !== null && (
          <span>
            Account total <Amount cents={page.accountTotal} />
          </span>
        )}
        {filtered && page.range.from !== null && (
          <span className="transactions__range">
            {formatDateAU(page.range.from)}
            {page.range.to === null ? ' onwards' : ` to ${formatDateAU(page.range.to)}`}
          </span>
        )}
      </p>
      {page.matching > page.limit && (
        <nav className="transactions__paging" aria-label="Pages of transactions">
          <span>
            Showing {first.toLocaleString('en-AU')} to {last.toLocaleString('en-AU')}
          </span>
          <Button
            size="small"
            icon={ChevronLeft}
            disabled={page.offset === 0}
            onClick={() => {
              onPage(Math.max(0, page.offset - page.limit));
            }}
          >
            Previous
          </Button>
          <Button
            size="small"
            disabled={last >= page.matching}
            onClick={() => {
              onPage(page.offset + page.limit);
            }}
          >
            Next
            <ChevronRight aria-hidden="true" className="transactions__next-icon" />
          </Button>
        </nav>
      )}
    </div>
  );
}

export function TransactionsPage() {
  const accounts = useBridge<AccountsView>(loadAccounts);
  const [kind, setKind] = useState<TransactionKind>('all');
  const [period, setPeriod] = useState<PeriodChoice>('last-12-months');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountId, setAccountId] = useState(
    () => queryFromHash(window.location.hash).get('account') ?? '',
  );
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const settledSearch = useDebounced(search.trim(), 250);

  const input = useMemo(
    () => ({
      ...(period === 'custom' ? {} : { period }),
      ...(period === 'custom' && from !== '' ? { from } : {}),
      ...(period === 'custom' && to !== '' ? { to } : {}),
      ...(accountId === '' ? {} : { accountId }),
      ...(kind === 'all' ? {} : { kind }),
      ...(settledSearch === '' ? {} : { search: settledSearch }),
      limit: PAGE_SIZE,
      offset,
    }),
    [kind, period, from, to, accountId, settledSearch, offset],
  );
  const { state, loading, reload } = useBridgeQuery(
    () => bridge()['transactions.list'](input),
    JSON.stringify(input),
  );

  // Any change to a filter starts again from the first page.
  const change = (apply: () => void) => {
    apply();
    setOffset(0);
    setOpenId(null);
  };
  const filtered =
    kind !== 'all' || accountId !== '' || search.trim() !== '' || period !== 'last-12-months';
  const clearFilters = () => {
    change(() => {
      setKind('all');
      setPeriod('last-12-months');
      setFrom('');
      setTo('');
      setAccountId('');
      setSearch('');
    });
  };

  const openRow =
    state.status === 'ready' ? state.value.rows.find((r) => r.id === openId) : undefined;
  const accountGroups = useMemo(() => {
    if (accounts.status !== 'ready') return [];
    return TYPE_ORDER.map((type) => ({
      type,
      accounts: accounts.value.accounts.filter(
        (a) => a.type === type && (a.active || a.id === accountId),
      ),
    })).filter((group) => group.accounts.length > 0);
  }, [accounts, accountId]);

  return (
    <div
      className="transactions"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && openId !== null) setOpenId(null);
      }}
    >
      <PageToolbar title="Transactions" />
      <div className="transactions__filters" role="search" aria-label="Filter transactions">
        <select
          aria-label="Kind of transaction"
          value={kind}
          onChange={(event) => {
            change(() => {
              setKind(event.target.value as TransactionKind);
            });
          }}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Dates"
          value={period}
          onChange={(event) => {
            change(() => {
              setPeriod(event.target.value as PeriodChoice);
            });
          }}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {period === 'custom' && (
          <>
            <input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(event) => {
                change(() => {
                  setFrom(event.target.value);
                });
              }}
            />
            <input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(event) => {
                change(() => {
                  setTo(event.target.value);
                });
              }}
            />
          </>
        )}
        <select
          aria-label="Account"
          value={accountId}
          onChange={(event) => {
            change(() => {
              setAccountId(event.target.value);
            });
          }}
        >
          <option value="">All accounts</option>
          {accountGroups.map((group) => (
            <optgroup key={group.type} label={TYPE_HEADINGS[group.type]}>
              {group.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <label className="transactions__search">
          <Search aria-hidden="true" className="transactions__search-icon" />
          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search"
            value={search}
            onChange={(event) => {
              change(() => {
                setSearch(event.target.value);
              });
            }}
          />
        </label>
        {filtered && (
          <Button size="small" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="transactions__body">
        <div className="transactions__list">
          {state.status === 'loading' && (
            <Table label="Transactions" columns={COLUMNS} rows={[]} rowKey={() => ''} loading />
          )}
          {state.status === 'failed' && (
            <ErrorMessage
              message={
                state.error.code === 'invalid-input'
                  ? 'Check the dates: the first day must not be after the last day.'
                  : 'The transactions could not be read. Close the app and open it again.'
              }
              onRetry={reload}
            />
          )}
          {state.status === 'ready' && state.value.rows.length === 0 && (
            <section className="page-surface">
              <EmptyState
                icon={ReceiptText}
                message={
                  filtered
                    ? 'No transactions match these filters.'
                    : 'No transactions yet. Everything you post appears here, with its history.'
                }
                action={
                  filtered ? (
                    <Button size="small" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </section>
          )}
          {state.status === 'ready' && state.value.rows.length > 0 && (
            <>
              <div
                className={
                  loading ? 'transactions__table transactions__table--busy' : 'transactions__table'
                }
                aria-busy={loading}
              >
                <Table
                  label="Transactions"
                  columns={COLUMNS}
                  rows={state.value.rows}
                  rowKey={(row) => row.id}
                  activeRowKey={openId}
                  onRowClick={(row) => {
                    setOpenId(row.id);
                  }}
                  onRowAction={(row) => {
                    setOpenId(row.id);
                  }}
                />
              </div>
              <Footer
                page={state.value}
                filtered={filtered}
                onPage={(next) => {
                  setOffset(next);
                  setOpenId(null);
                }}
              />
            </>
          )}
        </div>
        {openId !== null && (
          <TransactionPanel
            key={openId}
            id={openId}
            fallbackTitle={openRow === undefined ? 'Transaction' : (openRow.payee ?? openRow.memo)}
            onClose={() => {
              setOpenId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
