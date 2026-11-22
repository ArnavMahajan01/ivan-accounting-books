// The components page, in development only (`npm run dev`, then open #components).
// It shows every shared component in the current theme, with a switch for light and dark.
// It is not part of the packaged app: main.tsx imports it only when import.meta.env.DEV.

import { Download, Inbox, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { Amount } from '../components/Amount';
import { Badge, BADGE_STATUSES, RoleBadge, type BadgeStatus } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateCell } from '../components/DateCell';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { SampleDataLabel } from '../components/SampleDataLabel';
import { Sheet } from '../components/Sheet';
import { Table, type TableColumn } from '../components/Table';
import './ComponentsPage.css';

const sampleDate = parseCalendarDate('2026-11-21', 'YYYY-MM-DD');

// 500 invented bank lines, to check the table stays smooth. Not real data.
interface SampleLine {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly cents: number;
}
const PAYEES = [
  'Timber Yard Supplies',
  'Coastal Hardware',
  'Bayside Fuel',
  'Harbour Lane customer',
  'Bank fee',
];
function sampleLines(): SampleLine[] {
  return Array.from({ length: 500 }, (_, i) => ({
    id: `stl_sample${String(i).padStart(4, '0')}`,
    date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    description: `${PAYEES[i % PAYEES.length] ?? ''} ${String(i + 1)}`,
    cents: ((i * 7919) % 200000) - 100000,
  }));
}
const lineColumns: TableColumn<SampleLine>[] = [
  {
    key: 'date',
    header: 'Date',
    cell: (l) => {
      const d = parseCalendarDate(l.date, 'YYYY-MM-DD');
      return d.ok ? <DateCell date={d.value} /> : l.date;
    },
    sortValue: (l) => l.date,
  },
  {
    key: 'description',
    header: 'Description',
    cell: (l) => l.description,
    sortValue: (l) => l.description,
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'end',
    cell: (l) => <Amount cents={asCents(l.cents)} />,
    sortValue: (l) => l.cents,
  },
];

type Theme = 'system' | 'light' | 'dark';

export function ComponentsPage() {
  const [theme, setTheme] = useState<Theme>('system');
  const lines = useMemo(sampleLines, []);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [open, setOpen] = useState<'sheet' | 'confirm' | null>(null);
  const chooseTheme = (next: Theme) => {
    setTheme(next);
    if (next === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  };

  return (
    <main className="components-page">
      <header className="components-page__header">
        <h1>Components</h1>
        <div role="group" aria-label="Theme" className="components-page__row">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <Button
              key={t}
              size="small"
              aria-pressed={theme === t}
              onClick={() => {
                chooseTheme(t);
              }}
            >
              {t === 'system' ? 'Follow system' : t === 'light' ? 'Light' : 'Dark'}
            </Button>
          ))}
        </div>
      </header>

      <section>
        <h2>Button</h2>
        <div className="components-page__row">
          <Button variant="main" icon={Upload}>
            Import file
          </Button>
          <Button>Cancel</Button>
          <Button icon={Download}>Export CSV</Button>
          <Button variant="destructive">Stop sharing</Button>
          <Button disabled>Disabled</Button>
          <Button size="small">Small</Button>
        </div>
      </section>

      <section>
        <h2>Badge</h2>
        <div className="components-page__row">
          {(Object.keys(BADGE_STATUSES) as BadgeStatus[]).map((s) => (
            <Badge key={s} status={s} />
          ))}
          <RoleBadge role="viewer" />
          <RoleBadge role="commenter" />
          <RoleBadge role="editor" />
        </div>
      </section>

      <section>
        <h2>Table: 500 invented lines</h2>
        <p className="components-page__note">
          {selected.size} selected{lastAction === null ? '' : `. Last opened: ${lastAction}`}
        </p>
        <div className="components-page__table">
          <Table
            label="Sample bank lines"
            columns={lineColumns}
            rows={lines}
            rowKey={(l) => l.id}
            rowLabel={(l) => l.description}
            selection={{ selected, onChange: setSelected }}
            onRowAction={(l) => {
              setLastAction(l.description);
            }}
            initialSort={{ key: 'date', direction: 'descending' }}
          />
        </div>
        <h2>Table: loading</h2>
        <div className="components-page__table components-page__table--short">
          <Table
            label="Loading lines"
            columns={lineColumns}
            rows={[]}
            rowKey={(l) => l.id}
            loading
            skeletonRows={4}
          />
        </div>
      </section>

      <section>
        <h2>Empty state, error, sample data, sheet and confirmation</h2>
        <EmptyState
          icon={Inbox}
          message="No bank lines yet. Import a file from Westpac Online Banking."
          action={
            <Button variant="main" icon={Upload}>
              Import file
            </Button>
          }
        />
        <div className="components-page__row">
          <ErrorMessage
            message="The books could not be read. Try again, or restart the app."
            onRetry={() => undefined}
          />
        </div>
        <div className="components-page__row components-page__spaced">
          <SampleDataLabel />
          <Button
            onClick={() => {
              setOpen('sheet');
            }}
          >
            Open a sheet
          </Button>
          <Button
            onClick={() => {
              setOpen('confirm');
            }}
          >
            Open a confirmation
          </Button>
        </div>
        {open === 'sheet' && (
          <Sheet
            title="Split this line"
            description="Share one bank line across several accounts."
            onClose={() => {
              setOpen(null);
            }}
            actions={
              <>
                <Button
                  onClick={() => {
                    setOpen(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="main"
                  onClick={() => {
                    setOpen(null);
                  }}
                >
                  Split
                </Button>
              </>
            }
          />
        )}
        {open === 'confirm' && (
          <ConfirmDialog
            title="Stop sharing with your accountant?"
            change="They will no longer be able to open the 2026-27 Profit and loss sheet. You can share it again later."
            confirmLabel="Stop sharing"
            destructive
            onConfirm={() => {
              setOpen(null);
            }}
            onCancel={() => {
              setOpen(null);
            }}
          />
        )}
      </section>

      <section>
        <h2>Amount and DateCell</h2>
        <div className="components-page__figures">
          {[123450, -123450, 0, 5, -4500, 99999999999].map((c) => (
            <Amount key={c} cents={asCents(c)} />
          ))}
          {sampleDate.ok && <DateCell date={sampleDate.value} />}
        </div>
      </section>
    </main>
  );
}
