// Adds a customer or supplier, with an audit row. The sample books, adding one by hand (spec 122)
// and bringing in an invoice (spec 126) come through here; saving a payee from a bank line (spec 071)
// has its own path, with Undo.

import type { Contact } from '@domain/contacts';
import {
  getContactByName,
  insertContact,
  updateContactDetails,
  type ContactDetails,
} from '@data/contact-repository';
import { newId } from '@shared/ids';
import type { ContactKind, ContactSource } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface NewContact {
  readonly name: string;
  readonly kind: ContactKind;
  readonly createdFrom: ContactSource;
  /** Email, phone, ABN and notes (spec 122), when they are known: from an invoice, or typed. */
  readonly details?: ContactDetails;
}

export type AddContactError = 'empty-name' | 'name-in-use';

export function addContact(
  ctx: ServiceContext,
  input: NewContact,
): Result<Contact, AddContactError> {
  const name = input.name.trim();
  if (name === '') return err('empty-name');
  return ctx.db.transaction((): Result<Contact, AddContactError> => {
    if (getContactByName(ctx.db, name) !== null) return err('name-in-use');
    const now = ctx.clock.now();
    const contact: Contact = {
      id: newId('con', ctx.random),
      name,
      kind: input.kind,
      active: true,
      createdFrom: input.createdFrom,
      createdAt: now,
      updatedAt: now,
    };
    insertContact(ctx.db, contact);
    if (input.details !== undefined) updateContactDetails(ctx.db, contact.id, input.details, now);
    recordAudit(ctx, {
      kind: 'contact.add',
      table: 'contact',
      rowId: contact.id,
      before: null,
      after: input.details === undefined ? contact : { ...contact, ...input.details },
    });
    return ok(contact);
  })();
}
