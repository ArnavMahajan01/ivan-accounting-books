# 132: Settings: Business, GST and BAS

Spec: [132](../feature-specs/11-demo-9-settings-help-backup/132-settings-business.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- `src/services/business-settings.ts`:
  - `changeBusinessSettings` changes the name (spaces tidied), ABN (checked with `parseAbn`, typed with or without spaces), GST basis and BAS frequency in one transaction, with a new `business.change` audit row.
  - It refuses an empty name, a wrong ABN, or no change.
  - The lock date is never touched.
  - `businessView` reads the card.
- `updateBusiness` in `business-repository.ts`.
- Bridge: `business.get`, `business.change`.
- `src/renderer/settings/BusinessCard.tsx`:
  - The card shows two lines ("Harbour Lane Joinery Pty Ltd · ABN 51 824 753 556", "GST on a cash basis · BAS quarterly · Year from 1 July") and a Change… button.
  - The sheet has name, ABN, Cash or Accrual, Quarterly or Monthly, and "Financial year: 1 July to 30 June" shown as fixed.
  - Changing the basis or frequency shows a warning before saving: reports and the BAS for periods not yet locked will be worked out the new way, locked periods do not change, check with your accountant first.

## Verified

- `business-settings.test.ts` (3): saves with an audit row; refusals; the lock date stays.
- `settings.test.tsx` (3): the two lines; the warning appears only when basis or frequency changes, then saves; a refusal in words.
- `npm run check` passes.

**Not checked:** looked at in the built app together with spec 133's cards.
