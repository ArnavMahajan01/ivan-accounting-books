// Export all data (spec 139): everything in the books as CSV files with a README, so he is never
// locked in. The same safe CSV as the report exports (`src/domain/csv.ts`): amounts are plain
// numbers with two decimals, dates DD/MM/YYYY, and no text cell can ever run as a formula.
// Main writes the files to a folder he picks.

import { listAccounts } from '@data/account-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { getContactDetails, listContacts } from '@data/contact-repository';
import { listCurrentInvoices } from '@data/invoice-repository';
import { allLinesForExport } from '@data/journal-queries';
import { listRules } from '@data/rule-repository';
import { listTaxCodes } from '@data/tax-code-repository';
import { csvAmount, csvText } from '@domain/csv';
import { formatDateAU, type CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import type { ReadContext } from './context';

export interface ExportFile {
  readonly name: string;
  readonly text: string;
}

const row = (cells: readonly string[]) => cells.join(',');
const table = (header: readonly string[], rows: readonly (readonly string[])[]) =>
  `${[row(header.map(csvText)), ...rows.map(row)].join('\r\n')}\r\n`;
const money = (cents: number) => csvAmount(asCents(cents));
const day = (date: string | null) => (date === null ? '' : formatDateAU(date as CalendarDate));
const text = (value: string | null | undefined) => csvText(value ?? '');

const README = `Accounting Books: all your data
================================

These files hold everything in your books, so you can open them in Numbers, Excel or Google
Sheets, or bring them into other accounting software. They were written by Accounting Books on
your Mac; nothing was sent anywhere.

Amounts are plain numbers with two decimals and no dollar sign. Dates are day/month/year. A text
cell that starts with =, +, - or @ has an apostrophe in front, so it is never run as a formula.

accounts.csv       Your chart of accounts: code, name, type, the account it sits under, its usual
                   GST code, and whether it is in use.
entries.csv        Every transaction in your books, one row per line. Lines with the same Entry
                   belong together, and each entry's debits equal its credits. Debit and Credit
                   include no GST; the GST column is the GST on that line.
bank-accounts.csv  Your bank accounts: name, bank, the last four digits, and the account in the
                   chart that holds each one's balance.
contacts.csv       Your customers and suppliers, with their details and where each came from.
invoices.csv       The invoices and credit notes brought in from the Admin Dashboard, current
                   version of each.
rules.csv          Your bank rules, in the order they are tried. Conditions and splits are written
                   as JSON text.

Adding up Debit less Credit for each account code in entries.csv gives each account's balance,
the same as the trial balance in the app.
`;

export function fullExport(ctx: ReadContext): ExportFile[] {
  const accounts = listAccounts(ctx.db);
  const codeOf = new Map(accounts.map((a) => [a.id as string, a.code]));
  const taxCodes = new Map(listTaxCodes(ctx.db).map((t) => [t.id as string, t.shortCode]));
  const contacts = listContacts(ctx.db);
  const nameOf = new Map(contacts.map((c) => [c.id as string, c.name]));

  const accountsCsv = table(
    ['Code', 'Name', 'Type', 'Sits under', 'Usual GST', 'In use'],
    accounts.map((a) => [
      text(a.code),
      text(a.name),
      a.type,
      text(a.parentId === null ? '' : codeOf.get(a.parentId)),
      text(a.defaultTaxCodeId === null ? '' : taxCodes.get(a.defaultTaxCodeId)),
      a.active ? 'yes' : 'no',
    ]),
  );

  const entriesCsv = table(
    [
      'Entry',
      'Date',
      'Description',
      'Source',
      'Line',
      'Account code',
      'Account',
      'Debit',
      'Credit',
      'GST',
      'GST code',
      'Payee',
      'Line note',
    ],
    allLinesForExport(ctx.db).map((l) => [
      l.entryId,
      day(l.date),
      text(l.entryMemo),
      l.sourceKind,
      String(l.position + 1),
      text(l.accountCode),
      text(l.accountName),
      l.amount > 0 ? money(l.amount) : '',
      l.amount < 0 ? money(-l.amount) : '',
      money(l.gst),
      text(l.taxCode),
      text(l.payee),
      text(l.memo),
    ]),
  );

  const banksCsv = table(
    ['Name', 'Bank', 'Last four digits', 'Account code', 'In use'],
    listBankAccounts(ctx.db).map((b) => [
      text(b.name),
      text(b.bank),
      text(b.lastFour),
      text(codeOf.get(b.ledgerAccountId)),
      b.active ? 'yes' : 'no',
    ]),
  );

  const contactsCsv = table(
    ['Name', 'Customer or supplier', 'Email', 'Phone', 'ABN', 'Notes', 'Added from', 'In use'],
    contacts.map((c) => {
      const d = getContactDetails(ctx.db, c.id);
      return [
        text(c.name),
        c.kind,
        text(d?.email),
        text(d?.phone),
        text(d?.abn),
        text(d?.notes),
        c.createdFrom,
        c.active ? 'yes' : 'no',
      ];
    }),
  );

  const invoicesCsv = table(
    ['Number', 'Version', 'Kind', 'Customer', 'Date', 'Due', 'Total', 'GST', 'Credit for'],
    listCurrentInvoices(ctx.db)
      .slice()
      .reverse()
      .map((i) => [
        text(i.number),
        String(i.version),
        i.kind,
        text(nameOf.get(i.contactId)),
        day(i.issueDate),
        day(i.dueDate),
        money(i.total),
        money(i.gst),
        text(i.creditFor),
      ]),
  );

  const rulesCsv = table(
    [
      'Order',
      'Name',
      'In use',
      'Money',
      'Match',
      'Conditions',
      'Account or split',
      'Payee',
      'Posts by itself',
    ],
    listRules(ctx.db).map((r) => [
      String(r.position + 1),
      text(r.name),
      r.active ? 'yes' : 'no',
      r.direction,
      r.matchMode,
      text(JSON.stringify(r.conditions)),
      text(JSON.stringify(r.target)),
      text(r.payeeId === null ? '' : nameOf.get(r.payeeId)),
      r.autoPost ? 'yes' : 'no',
    ]),
  );

  return [
    { name: 'README.txt', text: README },
    { name: 'accounts.csv', text: accountsCsv },
    { name: 'entries.csv', text: entriesCsv },
    { name: 'bank-accounts.csv', text: banksCsv },
    { name: 'contacts.csv', text: contactsCsv },
    { name: 'invoices.csv', text: invoicesCsv },
    { name: 'rules.csv', text: rulesCsv },
  ];
}
