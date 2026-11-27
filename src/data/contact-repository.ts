import { z } from 'zod';
import type { Contact } from '@domain/contacts';
import type { Id } from '@shared/ids';
import { CONTACT_KINDS, CONTACT_SOURCES } from '@shared/kinds';
import type { Db } from './database';
import { flagColumn, timestampColumn } from './row-types';

const COLUMNS = 'id, name, kind, active, created_from, created_at, updated_at';

const rowSchema = z.object({
  id: z.string().regex(/^con_/),
  name: z.string(),
  kind: z.enum(CONTACT_KINDS),
  active: flagColumn,
  created_from: z.enum(CONTACT_SOURCES),
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

function toContact(row: unknown): Contact {
  const r = rowSchema.parse(row);
  return {
    id: r.id as Id<'con'>,
    name: r.name,
    kind: r.kind,
    active: r.active,
    createdFrom: r.created_from,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Throws if the name is already used (ignoring capitals): the database enforces it. */
export function insertContact(db: Db, contact: Contact): void {
  db.prepare(`INSERT INTO contact (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    contact.id,
    contact.name,
    contact.kind,
    contact.active ? 1 : 0,
    contact.createdFrom,
    contact.createdAt,
    contact.updatedAt,
  );
}

export function getContactById(db: Db, id: string): Contact | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM contact WHERE id = ?`).get(id);
  return row === undefined ? null : toContact(row);
}

export function getContactByName(db: Db, name: string): Contact | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM contact WHERE name = ?`).get(name);
  return row === undefined ? null : toContact(row);
}

export function listContacts(db: Db): Contact[] {
  return db.prepare(`SELECT ${COLUMNS} FROM contact ORDER BY name`).all().map(toContact);
}

/** A contact's details (spec 122). Kept beside the contact, so everything that makes one stays as it was. */
export interface ContactDetails {
  readonly email: string | null;
  readonly phone: string | null;
  /** 11 digits, checked. */
  readonly abn: string | null;
  readonly notes: string;
}

const detailsSchema = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  abn: z
    .string()
    .regex(/^\d{11}$/)
    .nullable(),
  notes: z.string(),
});

export function getContactDetails(db: Db, id: string): ContactDetails | null {
  const row = db.prepare('SELECT email, phone, abn, notes FROM contact WHERE id = ?').get(id);
  return row === undefined ? null : detailsSchema.parse(row);
}

export function updateContactDetails(
  db: Db,
  id: string,
  details: ContactDetails,
  at: string,
): void {
  db.prepare(
    'UPDATE contact SET email = ?, phone = ?, abn = ?, notes = ?, updated_at = ? WHERE id = ?',
  ).run(details.email, details.phone, details.abn, details.notes, at, id);
}

/** Changes a contact's name or kind: editing it by hand (spec 123). */
export function updateContact(db: Db, contact: Contact): void {
  db.prepare('UPDATE contact SET name = ?, kind = ?, active = ?, updated_at = ? WHERE id = ?').run(
    contact.name,
    contact.kind,
    contact.active ? 1 : 0,
    contact.updatedAt,
    contact.id,
  );
}

/** The pairs he chose to keep apart (spec 124), each as its two ids in order. */
export function listKeptPairs(db: Db): [string, string][] {
  return db
    .prepare('SELECT first_id, second_id FROM contact_pair_kept')
    .all()
    .map((row) => {
      const r = z.object({ first_id: z.string(), second_id: z.string() }).parse(row);
      return [r.first_id, r.second_id];
    });
}

export function keepPair(db: Db, a: string, b: string, at: string): void {
  const [first, second] = a < b ? [a, b] : [b, a];
  db.prepare(
    'INSERT OR IGNORE INTO contact_pair_kept (first_id, second_id, created_at) VALUES (?, ?, ?)',
  ).run(first, second, at);
}

/**
 * Points everything outside the journal from one contact to another, then removes the first: its
 * saved bank words, bank rules and invoices (spec 124). The journal's lines are moved through the
 * posting service first, so none name it any more.
 */
export function moveContactAndRemove(db: Db, fromId: string, toId: string): void {
  db.prepare(`DELETE FROM contact_pair_kept WHERE first_id = @from OR second_id = @from`).run({
    from: fromId,
  });
  db.prepare('UPDATE contact_match SET contact_id = ? WHERE contact_id = ?').run(toId, fromId);
  db.prepare('UPDATE rule SET payee_id = ? WHERE payee_id = ?').run(toId, fromId);
  db.prepare('UPDATE invoice SET contact_id = ? WHERE contact_id = ?').run(toId, fromId);
  db.prepare('DELETE FROM contact WHERE id = ?').run(fromId);
}
