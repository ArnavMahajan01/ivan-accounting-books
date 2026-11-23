# Security Risks

The risks in this app, who handles each one, and when. Rules live in `security-context.md`. This file tracks what could go wrong.

**Last reviewed:** 2026-11-23, after folder 03 (the ledger core, specs 030 to 045): L1, L2 and L4 are fixed, and no new risk was found in the code. First written 2026-11-21 from the plan. Review again at the end of each phase, and whenever a new outside service, stored data type or dependency is added.

**Severity:** High means someone could read, change or lose the client's financial records, or act in his Google account. Medium means it weakens a protection, or depends on another failure. Low means the impact is limited.

**Owner:** Developer (the author), Client.

**Status values:** `Open`, `Fixed` (with the spec that fixed it), `Accepted` (with the reason, and who accepted it).

## 1. Found In The Current Code

No code yet.

| ID | Severity | Risk | Evidence | Fix | Status |
|---|---|---|---|---|---|
| | | | | | |

## 2. The Books

| ID | Severity | Risk | What to do | Owner | Due |
|---|---|---|---|---|---|
| L1 | High | An entry that does not balance is saved, and every report is wrong | One posting service checks every entry. A test posts through every route. A check on launch confirms the trial balance is zero | Developer | Spec 039. **Fixed 2026-11-23:** `postEntry`, `changeEntry` and `removeEntry` (039, 040) are the only writers (guard test 041), every route is tested, and the launch check (043) finds a book that does not balance |
| L2 | High | Money stored as floats drifts by cents | Integer cents only, with a lint rule against `parseFloat` in `src/domain`, `src/import` and `src/services` | Developer | Spec 005. **Fixed 2026-11-22 (005), re-confirmed 2026-11-23 (045):** no float in `domain`, `data` or `services`, and the GST maths (035) is exact integer arithmetic |
| L3 | High | Importing a file twice doubles transactions | Unique keys on statement lines, and a test that imports the same file twice | Developer | Spec 060 |
| L4 | High | A crash or failed migration corrupts the file | Transactions for every write, a copy before each migration, an integrity check after | Developer | Spec 012. **Fixed 2026-11-22 (012), extended 2026-11-23 (039, 043):** every service write is one transaction (tested by forcing a failure halfway), and the books check runs the integrity check on every launch |
| L5 | Medium | A past period changes after the BAS is done | Period lock, enforced in the posting service | Developer | Spec 096 |
| L6 | Medium | Wrong GST rounding or basis gives wrong BAS figures | One tested GST helper. BAS tests against figures worked out by hand | Developer | Specs 035, 094 |

## 3. Google Access

| ID | Severity | Risk | What to do | Owner | Due |
|---|---|---|---|---|---|
| G1 | High | A stolen refresh token gives access to the client's Drive | Encrypt with `safeStorage`, keep in the main process, never log it, and ask only for `drive.file` | Developer | Spec 107 |
| G2 | High | A sheet is shared with the wrong person | Show the full email and role and ask to confirm. No link sharing | Developer | Spec 114 |
| G3 | High | A description starting with `=` becomes a formula in the accountant's sheet | Write `RAW` values. Escape CSV exports | Developer | Specs 110, 098 |
| G4 | Medium | An accountant's edit changes the books unseen | Edits are proposals, accepted one by one | Developer | Specs 116, 117 |
| G5 | Medium | The accountant keeps access after the relationship ends | A clear "who can see what" list, and a one-click Stop sharing | Developer, Client | Spec 115 |
| G6 | Medium | The OAuth project sits in the developer's account, not the client's | Create it in the client's Workspace, and give the developer a limited role, removed at handover | Developer, Client | Spec 106 |
| G7 | Medium | The optional in-app Google Sheet panel (added 2026-11-22): Google may refuse or later block the sign-in inside it, and it keeps a Google sign-in session in the app's data folder | Load only Google's own pages, in an isolated, sandboxed panel with no bridge to the app. No tricks to get past Google's block, which would break Google's rules, unless the author decides otherwise. Always offer Chrome. Clear the session on Disconnect. By the author's choice the app shows no warning about this; the author explains it to the client | Developer, Client | Spec 118 |

## 4. Untrusted Files

| ID | Severity | Risk | What to do | Owner | Due |
|---|---|---|---|---|---|
| U1 | Medium | A huge or malformed bank file freezes or crashes the app | A size limit, a parser that never throws on bad rows, and tests with broken files | Developer | Specs 058 to 060 |
| U2 | Medium | A restore from a tampered or wrong file replaces good books | Validate before replacing, keep the current file until the restore succeeds | Developer | Spec 138 |

## 5. Data On The Device

| ID | Severity | Risk | What to do | Owner | Due |
|---|---|---|---|---|---|
| D1 | High | A lost or stolen Mac exposes the books and the Google token | FileVault on, a strong login password, and the steps in section 7. Encryption at rest per `decisions/local-data-storage.md` | Client, Developer | Folder 12 |
| D2 | High | The Mac dies and the books are gone | Automatic encrypted backups, and a restore tested before go-live | Developer, Client | Specs 136 to 138 |
| D3 | Medium | Logs hold financial details | Log ids and counts only. Check the logs before go-live | Developer | Every spec |
| D4 | Medium | The development build opens the real data | A separate `Dev` app name and data folder | Developer | Spec 010 |

## 6. Dependencies And Build

| ID | Severity | Risk | What to do | Owner | Due |
|---|---|---|---|---|---|
| B1 | Medium | A dependency has a known flaw | Run the audit at each dependency change and before each release, and record the result with its date | Developer | Every spec |
| B2 | Medium | A build ships `.env`, fixtures or the developer's home path | Package from a whitelist, and fail the build if the home path appears | Developer | Spec 014 |
| B3 | Medium | An unsigned or re-signed app loses access to its Keychain-backed token | Test after a rebuild. Keep the signing identity and app id fixed | Developer | Specs 107, 144 |

## 6a. Outside Skills (added 2026-11-21)

| ID | Severity | Risk | What to do | Owner | Due |
|---|---|---|---|---|---|
| K1 | High | Impeccable's live mode runs `claude` with permissions bypassed when no chat session is polling | Never use `live` or `generate`. Written in its `SOURCE.md` and `ai-workflow-rules.md` | Developer | Spec W01a |
| K2 | Medium | Impeccable's launcher downloads and runs a native binary that was not read | Use the documented fallback with no launcher, until the author decides otherwise | Developer | Spec W01a |
| K3 | High | Real QuickBooks screenshots with the client's figures end up in `wireframe/brain/` or in git. Since 2026-11-22, 20 unblurred screenshots of his live QuickBooks are in `references/imagesforaccountant/` | Sample company or blurred screenshots where possible. Keep `references/` and `wireframe/brain/` images out of git (`.gitignore` at spec 001, before the first commit), or move them outside the project. Never copy their names or figures anywhere | Developer, Client | Before the first commit |
| K4 | Low | A skill is updated upstream with new behaviour | Pin the reviewed commit. Read any newer commit in full before updating | Developer | W01, W01a, W01b |

## 7. If The Worst Happens

Give the client these steps at handover.

- **The Mac is lost or stolen:** change the Google password and remove the app's access in the Google account security page. Restore the books on another Mac from the latest backup.
- **The Google account is compromised:** remove the app's access, change the password, check the Drive sharing list for each published sheet, then reconnect.
- **A secret leaked:** the developer rotates it at once, and records what happened.
