# Invented Westpac statement files

Every file here is invented. None comes from a real bank file, and the account numbers, names and
amounts are made up (rule 3 in `CLAUDE.md`). The format follows the public OFX specification (OFX 1.x
text and OFX 2.x XML), because no real Westpac file has been seen (client question 16 asks for the
CSV header only).

The descriptions and amounts for **Business One ··4821** are the November 2026 bank movements of the
sample books (`src/services/sample/sample-data.ts`), written the way a bank statement words them.
Business One's closing balance on 20 November is the sample books' $18,642.35, so the Bank page's
"last statement balance" and "in your books" agree, as in the wireframe. The statement files are
**not** posted anywhere: importing one only puts its lines in To review.

| File | What it is | What it tests |
|---|---|---|
| `business-one-2-13-nov-2026.ofx` | Business One, 2 to 13 November: 11 lines, closing balance $14,917.45 | The clean file. The first import for an account |
| `business-one-2-13-nov-2026-xml.ofx` | The same 11 lines as OFX 2 (XML), with long dates and time zones | The XML form reads exactly like the text form |
| `business-one-9-20-nov-2026.ofx` | Business One, 9 to 20 November: 13 lines. 6 are also in the 2 to 13 November file, 7 are new. Closing balance $18,642.35 | The overlapping file: duplicates are skipped, and the closing balance matches |
| `business-one-16-23-nov-2026-bad-date.ofx` | 16 to 23 November: 5 lines already imported, 3 new, and one dated `20261131`, which is not a real day. Closing balance $20,898.35, which is $100.00 more than the lines that could be read add up to | The problem file: one line is refused with its reason, the rest are read, and the balance difference is the refused line |
| `cash-reserve-jul-nov-2026.ofx` | Business Cash Reserve ··7730: three transfers in, closing balance $25,000.00 | A second account, matched by its last four digits |
| `other-account-16-nov-2026.ofx` | An account ending 9999, which is not one of his | "This file is for an account that is not in your books" |
| `business-one-no-transactions.ofx` | The right shape, with no transactions | A statement with nothing in it |
| `empty.ofx` | A file of zero bytes | An empty file |

A file of 10,000 lines is not kept here, because it would be over a megabyte. `huge-ofx.ts` writes
one when a test needs it.

Order for the demo: import the 2 to 13 November file, import it again (nothing new), import the 9 to
20 November file (6 skipped, 7 new, balance matches), then the file with the bad date.
