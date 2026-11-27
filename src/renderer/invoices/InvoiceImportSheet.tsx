// The preview before invoices are added (spec 126; W08a, Option 1): in sentences first, then the
// new ones. Nothing is added until he clicks Import.

import type { InvoicePreview } from '@shared/invoices';
import { formatDateAU } from '@shared/dates';
import { formatCents } from '@shared/money';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { Sheet } from '../components/Sheet';
import { Table, type TableColumn } from '../components/Table';
import { plural } from '../import/import-text';

const REFUSED = {
  locked: 'is dated in a period you locked, so it was left out',
  'older-version': 'is an older version than the one in your books, so it was left out',
  'unknown-gst-code': 'has a GST code your books do not have, so it was left out',
} as const;

const COLUMNS: readonly TableColumn<InvoicePreview['added'][number]>[] = [
  {
    key: 'number',
    header: 'Invoice',
    fit: true,
    cell: (d) => (d.kind === 'credit-note' ? `${d.number} (credit note)` : d.number),
  },
  { key: 'date', header: 'Date', fit: true, cell: (d) => <DateCell date={d.issueDate} /> },
  {
    key: 'customer',
    header: 'Customer',
    cell: (d) => (d.newCustomer ? `${d.customer} (new contact)` : d.customer),
  },
  {
    key: 'total',
    header: 'Total',
    align: 'end',
    fit: true,
    cell: (d) => <Amount cents={d.total} />,
  },
  { key: 'gst', header: 'GST', align: 'end', fit: true, cell: (d) => <Amount cents={d.gst} /> },
  {
    key: 'due',
    header: 'Due',
    fit: true,
    cell: (d) => (d.dueDate === null ? '' : formatDateAU(d.dueDate)),
  },
];

export function InvoiceImportSheet({
  preview,
  busy,
  onCancel,
  onImport,
}: {
  readonly preview: InvoicePreview;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onImport: () => void;
}) {
  const count = preview.added.length + preview.replaced.length;
  const credits = preview.added.filter((d) => d.kind === 'credit-note').length;
  const invoices = preview.added.length - credits;
  return (
    <Sheet
      title="Import invoices"
      description={`${preview.fileName}: issued invoices and credit notes from the Admin Dashboard.`}
      size="wide"
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="main" disabled={count === 0 || busy} onClick={onImport}>
            {count === 0
              ? 'Nothing to import'
              : credits > 0
                ? `Import ${String(count)}`
                : `Import ${plural(count, 'invoice', 'invoices')}`}
          </Button>
        </>
      }
    >
      <ul className="invoice-import__summary">
        {invoices > 0 && (
          <li>
            <strong>{plural(invoices, 'new invoice', 'new invoices')}</strong>
            {credits === 0
              ? `, total ${formatCents(preview.total)} including ${formatCents(preview.gst)} GST`
              : ''}
          </li>
        )}
        {credits > 0 && (
          <li>
            <strong>{plural(credits, 'new credit note', 'new credit notes')}</strong>, which reduce
            what the customer owes
          </li>
        )}
        {preview.already > 0 && (
          <li>
            <strong>{plural(preview.already, 'invoice', 'invoices')} already in your books</strong>,
            skipped
          </li>
        )}
        {preview.replaced.map((r) => (
          <li key={r.number}>
            <strong>1 changed invoice</strong>: {r.number} was replaced by version {r.version} in
            the Admin Dashboard ({formatCents(r.wasTotal)} becomes {formatCents(r.total)})
          </li>
        ))}
        {preview.refused.map((r) => (
          <li key={r.number}>
            {r.number} {REFUSED[r.reason]}
          </li>
        ))}
      </ul>
      {preview.quotes > 0 && (
        <p className="publish__line publish__line--note">
          {plural(preview.quotes, 'quote is', 'quotes are')} not imported: quotes do not change the
          books until they become invoices.
        </p>
      )}
      {preview.added.length > 0 && (
        <Table
          label="New invoices"
          columns={COLUMNS}
          rows={preview.added}
          rowKey={(d) => d.number}
        />
      )}
    </Sheet>
  );
}
