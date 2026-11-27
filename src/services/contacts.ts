// A contact's details (spec 122), typed or changed by hand: the name, whether customer or supplier,
// email, phone, ABN and notes. Each change has its audit row. The ABN is checked with the ATO's
// check digits (`src/domain/abn.ts`).

import { z } from 'zod';
import {
  getContactById,
  getContactByName,
  getContactDetails,
  updateContact,
  updateContactDetails,
  type ContactDetails,
} from '@data/contact-repository';
import type { Contact } from '@domain/contacts';
import { parseAbn } from '@domain/abn';
import type { ContactKind } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import { addContact } from './add-contact';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface ContactInput {
  readonly name: string;
  readonly kind: ContactKind;
  readonly email: string;
  readonly phone: string;
  readonly abn: string;
  readonly notes: string;
}

export type ContactRefusal = 'empty-name' | 'name-in-use' | 'bad-email' | 'bad-abn' | 'not-found';

const emailSchema = z.email().max(254);

/** The typed details, checked, with blanks as none. */
export function checkDetails(
  input: Omit<ContactInput, 'name' | 'kind'>,
): Result<ContactDetails, ContactRefusal> {
  const email = input.email.trim();
  if (email !== '' && !emailSchema.safeParse(email).success) return err('bad-email');
  const abnText = input.abn.trim();
  const abn = abnText === '' ? null : parseAbn(abnText);
  if (abn !== null && !abn.ok) return err('bad-abn');
  const phone = input.phone.trim();
  return ok({
    email: email === '' ? null : email,
    phone: phone === '' ? null : phone.slice(0, 40),
    abn: abn === null ? null : abn.value,
    notes: input.notes.trim().slice(0, 1000),
  });
}

/** New contact, typed by hand. */
export function addContactByHand(
  ctx: ServiceContext,
  input: ContactInput,
): Result<Contact, ContactRefusal> {
  const details = checkDetails(input);
  if (!details.ok) return details;
  return addContact(ctx, {
    name: input.name,
    kind: input.kind,
    createdFrom: 'manual',
    details: details.value,
  });
}

/** Changes a contact's name, kind and details. */
export function editContact(
  ctx: ServiceContext,
  id: string,
  input: ContactInput,
): Result<Contact, ContactRefusal> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') return err('empty-name');
  const details = checkDetails(input);
  if (!details.ok) return details;
  return ctx.db.transaction((): Result<Contact, ContactRefusal> => {
    const before = getContactById(ctx.db, id);
    if (before === null) return err('not-found');
    const holder = getContactByName(ctx.db, name);
    if (holder !== null && holder.id !== id) return err('name-in-use');
    const now = ctx.clock.now();
    const after: Contact = { ...before, name, kind: input.kind, updatedAt: now };
    const beforeDetails = getContactDetails(ctx.db, id);
    updateContact(ctx.db, after);
    updateContactDetails(ctx.db, id, details.value, now);
    recordAudit(ctx, {
      kind: 'contact.change',
      table: 'contact',
      rowId: id,
      before: { ...before, ...beforeDetails },
      after: { ...after, ...details.value },
    });
    return ok(after);
  })();
}
