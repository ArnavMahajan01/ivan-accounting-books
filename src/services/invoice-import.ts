// Bringing invoices and credit notes from the Admin Dashboard into the books (spec 126; W08a). Like a
// bank file: a preview first (new, already in, a newer version, refused), then one click adds every
// new one in a single transaction. Each is posted through the posting service (accounts receivable,
// sales and GST, `src/domain/invoice-entry.ts`); a newer version changes the same entry in place,
// with its audit row, and the older one is marked replaced. Quotes are never added. A customer the
// books do not have is saved as a contact, from an invoice.

import { createHash } from 'node:crypto';
import { accountForRole } from '@data/account-role-repository';
import { getBusiness } from '@data/business-repository';
import { getContactByName } from '@data/contact-repository';
import {
  currentInvoice,
  insertInvoice,
  markReplaced,
  type InvoiceRow,
} from '@data/invoice-repository';
import { listTaxCodes } from '@data/tax-code-repository';
import { invoiceToEntry, type InvoiceAccounts } from '@domain/invoice-entry';
import { isLocked } from '@domain/journal';
import {
  parseInvoiceFile,
  type ExchangeDocument,
  type ExchangeProblem,
} from '@import/invoice-exchange';
import { newId } from '@shared/ids';
import { sumCents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { InvoicePreview, InvoicePreviewDoc } from '@shared/invoices';
import { addContact } from './add-contact';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';
import { changeEntry, postEntry } from './post-journal';

export function fileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

type Plan =
  | { readonly kind: 'add'; readonly doc: ExchangeDocument }
  | { readonly kind: 'replace'; readonly doc: ExchangeDocument; readonly current: InvoiceRow }
  | { readonly kind: 'already' }
  | {
      readonly kind: 'refused';
      readonly number: string;
      readonly reason: InvoicePreview['refused'][number]['reason'];
    };

function accountsOf(ctx: ReadContext): InvoiceAccounts | null {
  const receivables = accountForRole(ctx.db, 'receivables');
  const sales = accountForRole(ctx.db, 'sales');
  const gst = accountForRole(ctx.db, 'gst');
  if (receivables === null || sales === null || gst === null) return null;
  const codes = listTaxCodes(ctx.db).filter((t) => t.active);
  return {
    receivables,
    sales,
    gst,
    taxCode: (shortCode) => codes.find((t) => t.shortCode === shortCode)?.id ?? null,
  };
}

/** What would happen to each document. Issued versions only: a replaced one is history. */
function plan(
  ctx: ReadContext,
  docs: readonly ExchangeDocument[],
  accounts: InvoiceAccounts,
): Plan[] {
  const lockDate = getBusiness(ctx.db)?.lockDate ?? null;
  return docs
    .filter((d) => d.status === 'issued')
    .map((doc): Plan => {
      if (doc.lines.some((l) => accounts.taxCode(l.gstCode) === null)) {
        return { kind: 'refused', number: doc.number, reason: 'unknown-gst-code' };
      }
      const current = currentInvoice(ctx.db, doc.number);
      if (current !== null && current.version === doc.version) return { kind: 'already' };
      if (current !== null && current.version > doc.version) {
        return { kind: 'refused', number: doc.number, reason: 'older-version' };
      }
      if (
        isLocked(doc.issueDate, lockDate) ||
        (current !== null && isLocked(current.issueDate, lockDate))
      ) {
        return { kind: 'refused', number: doc.number, reason: 'locked' };
      }
      return current === null ? { kind: 'add', doc } : { kind: 'replace', doc, current };
    });
}

function previewDoc(ctx: ReadContext, doc: ExchangeDocument): InvoicePreviewDoc {
  return {
    kind: doc.kind,
    number: doc.number,
    version: doc.version,
    customer: doc.customer.name,
    newCustomer: getContactByName(ctx.db, doc.customer.name) === null,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    total: doc.total,
    gst: doc.gst,
  };
}

export type InvoiceFileProblem =
  ExchangeProblem | { readonly field: 'books'; readonly problem: string };

export function previewInvoiceFile(
  ctx: ReadContext,
  content: string,
  fileName: string,
): Result<InvoicePreview, InvoiceFileProblem> {
  const file = parseInvoiceFile(content);
  if (!file.ok) return file;
  const accounts = accountsOf(ctx);
  if (accounts === null) return err({ field: 'books', problem: 'are not set up yet' });
  const plans = plan(ctx, file.value.documents, accounts);
  const added = plans.flatMap((p) => (p.kind === 'add' ? [previewDoc(ctx, p.doc)] : []));
  const replaced = plans.flatMap((p) =>
    p.kind === 'replace' ? [{ ...previewDoc(ctx, p.doc), wasTotal: p.current.total }] : [],
  );
  return ok({
    fileName,
    added,
    already: plans.filter((p) => p.kind === 'already').length,
    replaced,
    refused: plans.flatMap((p) =>
      p.kind === 'refused' ? [{ number: p.number, reason: p.reason }] : [],
    ),
    quotes: file.value.quotes,
    total: sumCents(added.map((d) => d.total)),
    gst: sumCents(added.map((d) => d.gst)),
  });
}

export type CommitInvoicesError = 'bad-file' | 'nothing-new' | 'not-set-up';

/** Adds every new invoice and newer version in the file, all or nothing. */
export function commitInvoiceFile(
  ctx: ServiceContext,
  content: string,
): Result<{ added: number; replaced: number }, CommitInvoicesError> {
  const file = parseInvoiceFile(content);
  if (!file.ok) return err('bad-file');
  const accounts = accountsOf(ctx);
  if (accounts === null) return err('not-set-up');
  const hash = fileHash(content);
  // `plan` has already checked every document (GST codes, locked dates, versions), so a posting
  // that fails here is a bug: it throws, and the whole file is rolled back.
  return ctx.db.transaction(
    (): Result<{ added: number; replaced: number }, CommitInvoicesError> => {
      const plans = plan(ctx, file.value.documents, accounts);
      let added = 0;
      let replaced = 0;
      for (const p of plans) {
        if (p.kind !== 'add' && p.kind !== 'replace') continue;
        const doc = p.doc;
        let contact = getContactByName(ctx.db, doc.customer.name);
        if (contact === null) {
          const made = addContact(ctx, {
            name: doc.customer.name,
            kind: 'customer',
            createdFrom: 'invoice',
            details: { email: doc.customer.email, phone: null, abn: doc.customer.abn, notes: '' },
          });
          if (!made.ok) throw new Error(`Contact not saved: ${made.error}`);
          contact = made.value;
        }
        const entry = invoiceToEntry(doc, contact.id, accounts);
        if (!entry.ok) throw new Error(`Invoice not turned into an entry: ${entry.error}`);
        let entryId: string;
        if (p.kind === 'add') {
          const posted = postEntry(ctx, entry.value);
          if (!posted.ok) throw new Error(`Invoice not posted: ${posted.error.code}`);
          entryId = posted.value.id;
        } else {
          if (p.current.entryId === null) throw new Error('A current invoice has no entry');
          const changed = changeEntry(ctx, p.current.entryId, entry.value);
          if (!changed.ok) throw new Error(`Invoice not changed: ${changed.error.code}`);
          entryId = p.current.entryId;
          markReplaced(ctx.db, p.current.id, ctx.clock.now());
        }
        const row: InvoiceRow = {
          id: newId('inv', ctx.random),
          kind: doc.kind,
          number: doc.number,
          version: doc.version,
          contactId: contact.id,
          issueDate: doc.issueDate,
          dueDate: doc.dueDate,
          total: doc.total,
          gst: doc.gst,
          creditFor: doc.creditFor,
          pdf: doc.pdf,
          status: 'current',
          entryId,
          sourceHash: hash,
        };
        insertInvoice(
          ctx.db,
          row,
          doc.lines.map((l) => ({ ...l, id: newId('inl', ctx.random) })),
          ctx.clock.now(),
        );
        recordAudit(ctx, {
          kind: p.kind === 'add' ? 'invoice.add' : 'invoice.replace',
          table: 'invoice',
          rowId: row.id,
          before:
            p.kind === 'add'
              ? null
              : { number: p.current.number, version: p.current.version, total: p.current.total },
          after: {
            number: row.number,
            version: row.version,
            total: row.total,
            gst: row.gst,
            entryId,
          },
        });
        if (p.kind === 'add') added += 1;
        else replaced += 1;
      }
      if (added + replaced === 0) return err('nothing-new');
      return ok({ added, replaced });
    },
  )();
}
