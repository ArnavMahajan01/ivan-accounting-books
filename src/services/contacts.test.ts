import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { getContactById, getContactDetails } from '@data/contact-repository';
import { addContact } from './add-contact';
import { addContactByHand, editContact } from './contacts';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
});
afterEach(() => {
  ctx.close();
});

const typed = {
  name: 'Marlow Building Co',
  kind: 'customer' as const,
  email: 'accounts@marlow.example.com',
  phone: '02 9555 0101',
  abn: '51 824 753 556',
  notes: 'Pays on the 15th.',
};

describe('contacts and their details (spec 122)', () => {
  it('a contact typed by hand keeps its details, with the ABN as 11 digits, and an audit row', () => {
    const added = addContactByHand(ctx, typed);
    if (!added.ok) throw new Error(added.error);
    expect(added.value.createdFrom).toBe('manual');
    expect(getContactDetails(ctx.db, added.value.id)).toEqual({
      email: 'accounts@marlow.example.com',
      phone: '02 9555 0101',
      abn: '51824753556',
      notes: 'Pays on the 15th.',
    });
    expect(listAudit(ctx.db).at(-1)?.kind).toBe('contact.add');
  });

  it('a contact from an invoice says so, with what the invoice gave', () => {
    const added = addContact(ctx, {
      name: 'Coastal Body Corporate',
      kind: 'customer',
      createdFrom: 'invoice',
      details: { email: 'strata@coastal.example.com', phone: null, abn: null, notes: '' },
    });
    if (!added.ok) throw new Error(added.error);
    expect(added.value.createdFrom).toBe('invoice');
    expect(getContactDetails(ctx.db, added.value.id)?.email).toBe('strata@coastal.example.com');
  });

  it('refuses a wrong ABN or email, and blanks are none', () => {
    expect(addContactByHand(ctx, { ...typed, abn: '51 824 753 557' })).toEqual({
      ok: false,
      error: 'bad-abn',
    });
    expect(addContactByHand(ctx, { ...typed, email: 'not an email' })).toEqual({
      ok: false,
      error: 'bad-email',
    });
    const blank = addContactByHand(ctx, { ...typed, email: ' ', phone: '', abn: '', notes: '' });
    if (!blank.ok) throw new Error(blank.error);
    expect(getContactDetails(ctx.db, blank.value.id)).toEqual({
      email: null,
      phone: null,
      abn: null,
      notes: '',
    });
  });

  it('edits the name, kind and details, keeping the name unique, with an audit row', () => {
    const a = addContactByHand(ctx, typed);
    const b = addContactByHand(ctx, { ...typed, name: 'K Patel', abn: '' });
    if (!a.ok || !b.ok) throw new Error('not added');
    expect(editContact(ctx, b.value.id, { ...typed, name: 'marlow building co' })).toEqual({
      ok: false,
      error: 'name-in-use',
    });
    const edited = editContact(ctx, a.value.id, { ...typed, kind: 'both', notes: 'Strata too.' });
    expect(edited.ok).toBe(true);
    expect(getContactById(ctx.db, a.value.id)?.kind).toBe('both');
    expect(getContactDetails(ctx.db, a.value.id)?.notes).toBe('Strata too.');
    expect(listAudit(ctx.db).at(-1)?.kind).toBe('contact.change');
  });
});
