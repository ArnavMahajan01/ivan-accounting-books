// Tidying duplicate contacts (spec 124; W08b, Option 5). The app offers pairs that look like one
// contact (`src/domain/similar-names.ts`), saying why. Merge moves everything to the contact kept:
// each journal entry through the posting service (so each change has its own audit row and the
// books still balance), then the saved bank words, rules and invoices, and records a
// `contact.merge` audit row. Keep both hides the pair for good.
//
// An entry in a locked period cannot change (invariant 4), so a contact with transactions on or
// before the lock date is not merged away; the other one of the pair can be kept instead.

import { getBusiness } from '@data/business-repository';
import {
  getContactById,
  getContactDetails,
  keepPair,
  listContacts,
  listKeptPairs,
  moveContactAndRemove,
  updateContact,
  updateContactDetails,
} from '@data/contact-repository';
import { entryIdsWithPayee, getJournalEntry } from '@data/journal-queries';
import { listContactMatches } from '@data/review-repository';
import type { Contact } from '@domain/contacts';
import { isLocked } from '@domain/journal';
import { likelyPairs, pairKey } from '@domain/similar-names';
import type { ContactPairView } from '@shared/contacts';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';
import { changeEntry } from './post-journal';

/** The pairs to offer, strongest reason first. */
export function contactPairs(ctx: ReadContext): ContactPairView[] {
  const contacts = listContacts(ctx.db).filter((c) => c.active);
  const words = listContactMatches(ctx.db);
  const names = new Map(contacts.map((c) => [c.id as string, c.name]));
  const kept = new Set(listKeptPairs(ctx.db).map(([a, b]) => pairKey(a, b)));
  const pairs = likelyPairs(
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      abn: getContactDetails(ctx.db, c.id)?.abn ?? null,
      words: words.filter((w) => w.contactId === c.id).map((w) => w.words),
    })),
    kept,
  );
  return pairs.map((p) => ({
    first: { id: p.first, name: names.get(p.first) ?? '' },
    second: { id: p.second, name: names.get(p.second) ?? '' },
    reason: p.reason,
  }));
}

export type MergeRefusal = 'not-found' | 'same-contact' | 'locked';

/** Both kinds, when one is a customer and the other a supplier. */
function mergedKind(a: Contact['kind'], b: Contact['kind']): Contact['kind'] {
  return a === b ? a : 'both';
}

/** Moves everything from `mergeId` to `keepId` and removes `mergeId`, all or nothing. */
export function mergeContacts(
  ctx: ServiceContext,
  keepId: string,
  mergeId: string,
): Result<{ readonly moved: number }, MergeRefusal> {
  if (keepId === mergeId) return err('same-contact');
  return ctx.db.transaction((): Result<{ moved: number }, MergeRefusal> => {
    const keep = getContactById(ctx.db, keepId);
    const merge = getContactById(ctx.db, mergeId);
    const keepDetails = getContactDetails(ctx.db, keepId);
    const mergeDetails = getContactDetails(ctx.db, mergeId);
    if (keep === null || merge === null || keepDetails === null || mergeDetails === null) {
      return err('not-found');
    }
    const lockDate = getBusiness(ctx.db)?.lockDate ?? null;
    const entries = entryIdsWithPayee(ctx.db, mergeId).map((id) => getJournalEntry(ctx.db, id));
    // Checked before anything is written: a refusal returned part way would keep the writes.
    if (entries.some((e) => e !== null && isLocked(e.date, lockDate))) return err('locked');

    for (const entry of entries) {
      if (entry === null) continue;
      const changed = changeEntry(ctx, entry.id, {
        date: entry.date,
        memo: entry.memo,
        sourceKind: entry.sourceKind,
        sourceId: entry.sourceId,
        lines: entry.lines.map((line) => ({
          accountId: line.accountId,
          amount: line.amount,
          taxCodeId: line.taxCodeId,
          gst: line.gst,
          memo: line.memo,
          payeeId: line.payeeId === mergeId ? keep.id : line.payeeId,
        })),
      });
      // Only the payee changed, on an entry that was already valid and is not locked.
      if (!changed.ok) throw new Error(`A merged entry was refused: ${changed.error.code}`);
    }
    const now = ctx.clock.now();
    const kind = mergedKind(keep.kind, merge.kind);
    if (kind !== keep.kind) updateContact(ctx.db, { ...keep, kind, updatedAt: now });
    // A detail the kept contact lacks is taken from the other, so nothing he saved is lost.
    updateContactDetails(
      ctx.db,
      keepId,
      {
        email: keepDetails.email ?? mergeDetails.email,
        phone: keepDetails.phone ?? mergeDetails.phone,
        abn: keepDetails.abn ?? mergeDetails.abn,
        notes: [keepDetails.notes, mergeDetails.notes].filter((n) => n !== '').join('\n'),
      },
      now,
    );
    moveContactAndRemove(ctx.db, mergeId, keepId);
    recordAudit(ctx, {
      kind: 'contact.merge',
      table: 'contact',
      rowId: keepId,
      before: { kept: { ...keep, ...keepDetails }, merged: { ...merge, ...mergeDetails } },
      after: { keptId: keepId, kind, entries: entries.length },
    });
    return ok({ moved: entries.length });
  })();
}

/** Keep both: the pair is not offered again. */
export function keepBoth(
  ctx: ServiceContext,
  a: string,
  b: string,
): Result<{ readonly kept: true }, MergeRefusal> {
  if (a === b) return err('same-contact');
  if (getContactById(ctx.db, a) === null || getContactById(ctx.db, b) === null) {
    return err('not-found');
  }
  keepPair(ctx.db, a, b, ctx.clock.now());
  return ok({ kept: true });
}
