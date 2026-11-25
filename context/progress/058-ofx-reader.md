# 058: OFX Reader

Spec: [058](../feature-specs/05-demo-3-bank-import/058-ofx-reader.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/import/ofx.ts` (pure, never throws): reads both OFX layouts with one tolerant tag reader (the text layout never closes its tags, the XML layout does). Gives the account's last four digits (the rest of the number is never kept), the period, each transaction (date, amount, name and memo joined, `FITID`, the line of the file it starts on) and the closing balance with its day.
- A line that cannot be read is listed with its position, line, reason (`missing-date`, `not-a-date`, `impossible-date`, `missing-amount`, `not-an-amount`, `too-many-decimals`, `amount-too-large`, `zero-amount`), the text as written and, if it could be read, the amount. The rest are read.
- Whole-file refusals: `empty`, `too-large` (5 million characters), `unknown-format`, `no-account`, `several-accounts`, `not-aud`.
- `src/import/registry.ts` picks the reader from the text, never the file name. `src/import/statement.ts` holds the one shape every reader returns.
- Amounts through `parseCents` (a leading plus is also accepted), dates through `parseCalendarDate` on the first eight digits as the bank wrote them: a time zone after the time is ignored on purpose, so the day never shifts.

## Verified

- `src/import/ofx.test.ts`: 26 tests (one reads a `.qbo` file, which is OFX with the bank's own tags in the sign-on part), with every fixture: the clean file, the XML form read identically, the bad-date file (one line error with its position, value, amount and file line, the other nine lines read), the file with no transactions, the empty file, the other account, 10,000 lines read in under 2 seconds and a file over the limit refused, text that is not OFX, no account number, the wrong currency, two accounts, every kind of unreadable line (and the rest still read), entities, memo joined to name, no `FITID`, an unreadable closing balance, and hostile text (an unterminated tag, 5,000 opening tags, control characters, a very long account number, an entity declaration) that never throws.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- **The Westpac CSV reader (spec 059) is not built.** It waits for the header row (client question 16). It will register in `registry.ts` and need the same kinds of tests.
- Not known: how real Westpac OFX words its descriptions, whether `MEMO` is used, and whether `FITID` is unique (questions 31 and 32). Descriptions are `NAME`, with `MEMO` after it when it differs.
- Multiple accounts in one file are refused: Westpac only offers OFX for one account at a time (research-notes.md).
