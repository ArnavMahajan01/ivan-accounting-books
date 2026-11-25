# 057: Invented Westpac Files for Tests and Demos

A set of invented statement files in Westpac's formats, used by tests and by demos, so no real bank file is ever needed.

**Client sees:** the files he drops in during the demo.

## Depends On

- 056

## Implementation

1. `tests/fixtures/westpac/`: invented OFX files for Business One and Cash Reserve: a clean month, an overlapping month, a file with a bad date, an empty file, a huge file (10,000 lines), a file for the wrong account.
2. CSV versions once the header row is known (client question 16), else OFX only.
3. A README listing each file and what it tests. Descriptions and amounts match the sample data set.

## Check When Done

- Every file is invented (the author has looked). The README lists them.
