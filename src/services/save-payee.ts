// From/To saved as he types it (spec 071, client question 26, assumed "straight away, with Undo").
// Naming the payee of a waiting line saves the contact if it is new, and points the line's
// description words at it, so every waiting line with the same words shows it too.
//
// Undo takes the words back. If the contact was made by that save and nothing uses it yet, the
// contact goes too, with an audit row.

import { getContactById, getContactByName, insertContact } from '@data/contact-repository';
import {
  countLinesWithPayee,
  deleteContactMatch,
  deleteContactWithMatches,
  getContactMatch,
  getReviewLine,
  listContactMatches,
  listWaitingLines,
  saveContactMatch,
} from '@data/review-repository';
import type { Contact } from '@domain/contacts';
import { contactForWords, descriptionWords } from '@domain/payees';
import { newId } from '@shared/ids';
import type { ContactKind } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import type { SavePayeeOutcome } from '@shared/views';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

type Saved = Extract<SavePayeeOutcome, { kind: 'saved' }>;
type Refusal = Extract<SavePayeeOutcome, { kind: 'refused' }>['reason'];

/** The longest a contact's name may be, as typed in From/To. */
export const PAYEE_NAME_MAX = 100;

export function savePayeeFromLine(
  ctx: ServiceContext,
  input: { readonly lineId: string; readonly name: string },
): Result<Saved, Refusal> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') return err('empty-name');
  return ctx.db.transaction((): Result<Saved, Refusal> => {
    const line = getReviewLine(ctx.db, input.lineId);
    if (line === null) return err('not-found');
    const words = descriptionWords(line.description);
    if (words === '') return err('no-words');

    let contact = getContactByName(ctx.db, name);
    const created = contact === null;
    if (contact === null) {
      const now = ctx.clock.now();
      const kind: ContactKind = line.amount > 0 ? 'customer' : 'supplier';
      const fresh: Contact = {
        id: newId('con', ctx.random),
        name,
        kind,
        active: true,
        createdFrom: 'bank-line',
        createdAt: now,
        updatedAt: now,
      };
      insertContact(ctx.db, fresh);
      contact = fresh;
    }
    saveContactMatch(ctx.db, words, contact.id, ctx.clock.now());
    recordAudit(ctx, {
      kind: 'contact.add',
      table: 'contact',
      rowId: contact.id,
      before: null,
      after: { contact: created ? contact : { id: contact.id }, words },
    });

    const matches = listContactMatches(ctx.db);
    const alsoFilled = listWaitingLines(ctx.db).filter(
      (l) =>
        l.id !== line.id &&
        contactForWords(descriptionWords(l.description), matches)?.contactId === contact.id,
    ).length;
    return ok({
      kind: 'saved',
      contactId: contact.id,
      name: contact.name,
      created,
      kindOfContact: contact.kind,
      words,
      alsoFilled,
    });
  })();
}

/** Takes a save back: the words no longer point to the contact, and a new unused contact goes. */
export function undoSavePayee(
  ctx: ServiceContext,
  input: { readonly contactId: string; readonly words: string },
): Result<void, 'not-found'> {
  return ctx.db.transaction((): Result<void, 'not-found'> => {
    const match = getContactMatch(ctx.db, input.words);
    if (match?.contactId !== input.contactId) return err('not-found');
    deleteContactMatch(ctx.db, input.words);
    const contact = getContactById(ctx.db, input.contactId);
    const stillMatched = listContactMatches(ctx.db).some((m) => m.contactId === input.contactId);
    if (
      contact !== null &&
      contact.createdFrom === 'bank-line' &&
      !stillMatched &&
      countLinesWithPayee(ctx.db, contact.id) === 0
    ) {
      deleteContactWithMatches(ctx.db, contact.id);
      recordAudit(ctx, {
        kind: 'contact.remove',
        table: 'contact',
        rowId: contact.id,
        before: contact,
        after: null,
      });
    }
    return ok(undefined);
  })();
}
