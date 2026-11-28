# 133: Settings: Status Cards

Spec: [133](../feature-specs/11-demo-9-settings-help-backup/133-settings-cards.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- **The page:** Settings is cards, each saying in one line whether all is well, with the button that fixes it (W09, Option 3).
  - A line at the top says "N things need attention:" and joins the problems in a sentence. The problems it knows: Google not connected or needing sign-in, no bank accounts, the business not set up.
  - Cards with a problem come first, with a warning edge. The Backups card says "Coming in a later version" until spec 136.
- **Bank accounts card** (`BankAccountsCard.tsx`, service `bank-accounts-settings.ts`):
  - Each account shows its bank and last four digits: Rename, Stop using (after confirming), and Add bank account… (name, bank with common Australian banks suggested, last four digits, the asset account that holds its balance).
  - The add-account choice never offers accounts the app posts to itself (transfers in transit, accounts receivable).
  - Bridge: `bankAccounts.settings`, `.add`, `.rename`, `.stop`, using spec 055's services and their audit rows.
  - **This fills a real gap:** before this, his own books had no way to add a bank account, so every import would have been refused as "not one of your bank accounts".
- **Appearance card:** Same as Mac, Light or Dark.
  - It is a choice about this Mac, not the books, so it is kept in `appearance.json` beside the window size (`src/main/appearance.ts`, checked with Zod). Loading the sample books never changes it.
  - The main process sets `nativeTheme.themeSource`, and the screens set `data-theme` on the page, which the tokens follow. It is applied on every launch.
- **About card:** version, books status, "Your books are one file in the Library folder on this Mac", and Show in Finder (`app.showBooksFolder`). The path never goes to the screens.

## Verified

- `bank-accounts-settings.test.ts`: lists accounts and bank, leaves out linked and role accounts, adds one. `appearance.test.ts` (2): the default, kept, and a bad file ignored.
- `settings.test.tsx` (9 in all): the attention line and the order; the sentence; adding a bank account; asking before Stop using; Dark at once and back to the Mac's; Show in Finder.
- `npm run check`: 1,308 tests pass. Format is clean.
- `npm run test:layout` passes, now with the Business and Add bank account sheets. In the built app I looked at Settings at 1100 and 1440, the business sheet with its warning, and Dark chosen from the card.
- Fixed after looking: the last four digits showed twice for the sample accounts, Dark did not apply when the window was driven by a script (now `data-theme` too), and the transfers account was offered as a bank account's home.
- The Impeccable detector on the Settings files found nothing, but it can only match text in files.

**Not checked:** a full Impeccable critique at the folder's polish (141). "2 things need attention" with backups waits for 136.
