// Adds a customer or supplier, with an audit row. The sample books and, later, saving a payee from
// a bank line (spec 071) and from an invoice (spec 126) all come through here.

import type { Contact } from '@domain/contacts';
import { getContactByName, insertContact } from '@data/contact-repository';
import { newId } from '@shared/ids';
import type { ContactKind, ContactSource } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface NewContact {
  readonly name: string;
  readonly kind: ContactKind;
  readonly createdFrom: ContactSource;
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
    recordAudit(ctx, {
      kind: 'contact.add',
      table: 'contact',
      rowId: contact.id,
      before: null,
      after: contact,
    });
    return ok(contact);
  })();
}
