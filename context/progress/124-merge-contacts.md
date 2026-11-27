# 124: Merge Duplicate Contacts

Spec: [124](../feature-specs/10-demo-8-contacts-and-invoices/124-merge-contacts.md)
Status: Done
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- `src/domain/similar-names.ts` (pure) gives the pairs that look like one contact, strongest reason first:
  - the same ABN;
  - the same saved bank words, where one starts with the other;
  - similar names: one name cut short, with company words such as Pty Ltd dropped. The first word must match in full and have three letters or more, so "K Patel" and "K Smith" are never paired.
- None of the sample contacts pair up.
- Migration `0018-kept-contact-pairs.sql` adds `contact_pair_kept`, so a pair kept apart is never offered again.
- `src/services/merge-contacts.ts`:
  - `contactPairs` lists the pairs to offer.
  - `keepBoth` saves a pair as kept apart.
  - `mergeContacts` moves every journal entry to the contact kept, all or nothing. Entries are moved through the posting service (`changeEntry`), one `entry.change` audit row each. Saved bank words, bank rules and invoices move too. The other contact's details fill blanks, and notes are joined. A customer merged with a supplier becomes both. The merged contact is removed, with one `contact.merge` audit row.
  - **Locked periods:** a contact with transactions on or before the lock date is not merged away (refused, nothing changed), because a locked entry cannot change. Keeping that contact's name instead works.
- Bridge: `contacts.pairs`, `contacts.merge`, `contacts.keepBoth`.
- Contacts page: "1 pair looks like the same contact." Each pair shows its reason with **Merge** and **Keep both**. Merge opens a sheet that asks which name to keep and says what moves, and nothing changes until it is confirmed. A refusal is explained in words.

## Verified

- `similar-names.test.ts` (5) covers names cut short, company words, different businesses left apart, the reason order, and kept pairs either way round.
- `merge-contacts.test.ts` (7):
  - no pairs in the sample books; a near copy is offered; bank words are a stronger reason; Keep both hides the pair;
  - merge moves entries, rules and words, the books balance, and the audit rows are counted;
  - invoices move, and a customer merged with a supplier becomes both;
  - the locked refusal changes nothing, and the other way round works;
  - a contact cannot be merged with itself or with one that is gone.
- `contacts.test.tsx`: 3 more cases (merge after choosing the name, Keep both and a refused merge in words, no notice when there are no pairs).
- `npm run check`: 1,293 tests pass. `format:check` is clean.
- `npm run test:layout` passes. The sweep now adds "Timberlink Supplies" and opens the merge sheet at four sizes. The screenshots were looked at: the notice at 1440 and the sheet at 1100.

**Not checked:** a merge clicked through in the built app (it is covered by service and screen tests, and the sweep only opens the sheet). Dark theme is left for the folder's Impeccable pass (131).
