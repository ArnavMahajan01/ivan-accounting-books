// Invoices from the Admin Dashboard (specs 126 to 128; W08a, Options 2 and 3): what is unpaid,
// overdue and paid lately, then every invoice with where it is up to in words. Import file brings
// in a file the Admin Dashboard wrote, with a preview first.

import { Receipt, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { formatDateAU } from '@shared/dates';
import type { InvoicePreview, InvoiceRowView, InvoicesView, InvoiceStatus } from '@shared/invoices';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { plural } from '../import/import-text';
import { PageToolbar } from '../layout/PageToolbar';
import { useBridgeQuery } from '../pages/use-bridge';
import { InvoiceImportSheet } from './InvoiceImportSheet';
import './invoices.css';

export function statusText(status: InvoiceStatus): string {
  switch (status.kind) {
    case 'unpaid':
      return status.due === null ? 'Unpaid' : `Unpaid · due ${formatDateAU(status.due)}`;
    case 'overdue':
      return `Overdue · ${plural(status.days, 'day', 'days')}`;
    case 'paid':
      return status.on === null ? 'Paid' : `Paid ${formatDateAU(status.on)}`;
    case 'credit':
      return status.forNumber === null ? 'Credit note' : `Credit for ${status.forNumber}`;
  }
}

const COLUMNS: readonly TableColumn<InvoiceRowView>[] = [
  { key: 'number', header: 'Invoice', fit: true, cell: (r) => r.number },
  { key: 'date', header: 'Date', fit: true, cell: (r) => <DateCell date={r.issueDate} /> },
  { key: 'customer', header: 'Customer', cell: (r) => r.customer },
  {
    key: 'total',
    header: 'Total',
    align: 'end',
    fit: true,
    cell: (r) => <Amount cents={r.total} />,
  },
  { key: 'gst', header: 'GST', align: 'end', fit: true, cell: (r) => <Amount cents={r.gst} /> },
  {
    key: 'status',
    header: 'Status',
    fit: true,
    cell: (r) => (
      <span
        className={
          r.status.kind === 'overdue' ? 'invoice-status invoice-status--overdue' : 'invoice-status'
        }
      >
        {statusText(r.status)}
      </span>
    ),
  },
];

export function InvoicesPage() {
  const load = useCallback(() => bridge()['invoices.list']({}), []);
  const [version, setVersion] = useState(0);
  const { state } = useBridgeQuery<InvoicesView>(load, String(version));
  const [preview, setPreview] = useState<{ id: string; preview: InvoicePreview } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    setMessage(null);
    setProblem(null);
    const result = await bridge()['invoices.chooseAndPreview']({});
    if (!result.ok) setProblem('The file could not be read. Try again.');
    else if (result.value.kind === 'refused') {
      setProblem(
        `This file could not be brought in: ${result.value.field === 'file' ? 'the file' : result.value.field} ${result.value.problem}.`,
      );
    } else if (result.value.kind === 'preview') {
      setPreview({ id: result.value.previewId, preview: result.value.preview });
    }
  };

  const importNow = async () => {
    if (preview === null) return;
    setBusy(true);
    try {
      const result = await bridge()['invoices.commit']({ previewId: preview.id });
      setPreview(null);
      if (!result.ok || result.value.kind === 'refused') {
        setProblem('Nothing was added. Choose the file again.');
      } else {
        const { added, replaced } = result.value;
        setMessage(
          [
            added > 0 ? `Added ${plural(added, 'invoice', 'invoices')}` : '',
            replaced > 0
              ? `updated ${plural(replaced, 'changed invoice', 'changed invoices')}`
              : '',
          ]
            .filter((t) => t !== '')
            .join(', ') + '.',
        );
        setVersion((v) => v + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  const view = state.status === 'ready' ? state.value : null;
  return (
    <div className="invoices">
      <PageToolbar
        title="Invoices"
        mainAction={
          <Button variant="main" icon={Upload} onClick={() => void choose()}>
            Import file
          </Button>
        }
      />
      {message !== null && (
        <p className="publish__line" role="status">
          {message}
        </p>
      )}
      {problem !== null && <ErrorMessage message={problem} />}
      {state.status === 'loading' && <p aria-busy="true">Reading your invoices…</p>}
      {state.status === 'failed' && <ErrorMessage message="Your invoices could not be read." />}
      {view !== null && view.rows.length === 0 && (
        <EmptyState
          icon={Receipt}
          message="No invoices yet. Bring them in from the Admin Dashboard with Import file."
        />
      )}
      {view !== null && view.rows.length > 0 && (
        <>
          <dl className="invoices__bands">
            <div className="page-surface invoices__band">
              <dt>Unpaid</dt>
              <dd>
                <Amount cents={view.unpaid.cents} />
                <span>{plural(view.unpaid.count, 'invoice', 'invoices')}</span>
              </dd>
            </div>
            <div className="page-surface invoices__band">
              <dt>Overdue</dt>
              <dd>
                <Amount cents={view.overdue.cents} />
                <span>{plural(view.overdue.count, 'invoice', 'invoices')}</span>
              </dd>
            </div>
            <div className="page-surface invoices__band">
              <dt>Paid, last 30 days</dt>
              <dd>
                <Amount cents={view.paidLast30.cents} />
                <span>{plural(view.paidLast30.count, 'payment', 'payments')}</span>
              </dd>
            </div>
          </dl>
          <Table label="Invoices" columns={COLUMNS} rows={view.rows} rowKey={(r) => r.id} />
        </>
      )}
      {preview !== null && (
        <InvoiceImportSheet
          preview={preview.preview}
          busy={busy}
          onCancel={() => {
            setPreview(null);
          }}
          onImport={() => void importNow()}
        />
      )}
    </div>
  );
}
