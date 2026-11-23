# 046: Sample Business Data Set

An invented business with a full financial year of believable books, used by every demo until go-live, so the client can see the app working without his real data.

**Client sees:** Harbour Lane Joinery Pty Ltd's books (invented).

## Depends On

- 045

## Implementation

1. `src/services/sample/`: a deterministic data set built from a fixed seed: Harbour Lane Joinery Pty Ltd, a clearly fake ABN, Westpac Business One ··4821 and Business Cash Reserve ··7730 (invented), the default chart.
2. Entries from 1 July of the current financial year to today, posted only through `postEntry`: sales with GST, materials, fuel, phone, subcontractors, bank fees, a GST-free sale, transfers between the two accounts, owner drawings, an owner contribution.
3. Amounts and payees match the wireframes where they overlap (Smith Renovations, Timberlink, Bunnings and so on), so demos feel continuous.
4. A list of the figures the data must produce (trial balance totals, GST owing for the quarter), checked by a test.

## Rules And Edge Cases

- Invented data only. Nothing from the client's screenshots or files.

## Check When Done

- Building the set twice gives identical books. The figure test passes. The trial balance balances.
