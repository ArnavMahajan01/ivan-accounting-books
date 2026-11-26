# 071: Payees Saved and Filled In

Spec: [071](../feature-specs/06-demo-4-to-review/071-payees.md)
Status: Done (on the assumption for question 26)
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `contact_match` (in migration 0010; `contact` already existed from 0007). `src/domain/payees.ts`: a description's letter words in capitals; a saved match applies to lines whose words start with it, longest wins.
- `src/services/save-payee.ts`: From/To saved when he leaves the box or presses Return: a new contact (supplier for money out, customer for money in, created from `bank-line`, audited) or an existing one by name, ignoring capitals; the line's words then point to it. Undo removes the words, and the contact too if it came from a bank line and nothing uses it (`contact.remove` audit row).
- Typing suggests saved contacts (a list on the box). "Saved Total Tools as a supplier. 2 more lines now show it." with Undo.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- Service tests: two more lines filled; existing contact reused; undo removes the new contact and clears what it filled; a contact a posted line uses is kept; empty name and wordless description refused.
- Built app: "Saved Total Tools as a supplier. 2 more lines now show it."
- Client question 26 is still open: built on its assumption (straight away, with Undo).

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
