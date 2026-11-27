# 117: Accountant Changes Screen

Spec: [117](../feature-specs/09-demo-7-google-sheets/117-changes-screen.md)
Status: Done (the real-Sheets part of the flow is spec 116's deferred check)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `AccountantChangesPage` (W07, W07a): "Nothing in your books changes until you accept…"; waiting changes grouped by sheet with the line (date, description, amount, sheet row), the field, the old value struck through and the new one in bold, who and when, and "What accepting does: Rent -$3,000.00, Insurance +$3,000.00", worked out from the rebuilt entry and not applied. Reject and Accept on each; Accept is off, with the reason, for an account not in the books, a line in a locked period ("so it cannot change. Reject it, and enter a correction in an open period"), a split line, or a line that is gone. Done lists what was accepted and rejected. Check now.
- Accept (`acceptChange`) goes through the posting service: `rebuildSimpleEntry`, now shared with "Move to…" (`src/services/fix-entry.ts` split into a plan step and a save step), changes the account, GST code or note, works the GST out again, keeps the entry's id and history, writes `entry.change`, and in the same transaction an `accountant-change.accept` row naming the entry, the field, old and new, and who changed it. Reject writes `accountant-change.reject`; the sheet keeps his value until the next publish.
- **Choice made where the spec left room:** accepting an account change keeps the line's GST code (the accountant changed the account only); "Move to…" still uses the new account's usual code. A note accepted is the line's note.

## Verified

- `read-back.test.ts`: accept changes the entry with an `entry.change` row and an `accountant-change.accept` row naming the change; a GST code change works the GST out again; reject keeps the books and does not raise the same value again; a change in a locked period cannot be accepted and says why. All service tests still pass after the shared rebuild (234).
- `changes.test.tsx`: the check on opening, the line, was and now, the effect, Accept and Reject, a blocked one, Done, and the empty state.
- In the built app with `GOOGLE_FAKE=1` at 1100: accepted one change; the count went from 2 to 1 and it moved to Done (screenshots looked at).
