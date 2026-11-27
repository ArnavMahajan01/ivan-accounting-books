// The invented invoice exchange files in this folder, as text, for every test that needs one.

const files = import.meta.glob<string>('./*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export type InvoiceFixture =
  'admin-dashboard-invoices-2026-11-22' | 'admin-dashboard-invoices-2026-11-25';

export function invoiceFixture(name: InvoiceFixture): string {
  const text = files[`./${name}.json`];
  if (text === undefined) throw new Error(`No fixture file ${name}.json`);
  return text;
}
