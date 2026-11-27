# 117: Accountant Changes Screen

Each waiting change with old and new values, what accepting would do, and Accept or Reject (W07 and W07a).

**Client sees:** "What accepting does: Materials −$353.73, Tools +$353.73".

## Depends On

- 116

## Implementation

1. List by sheet, each change with old, new, who and when, and the effect on the books (worked out, not yet applied).
2. Accept applies it through the posting service (audit row names the accountant's change). Reject keeps the sheet's value flagged until the next publish.
3. Done list of accepted and rejected changes.

## Check When Done

- Tests: accept changes the entry with an audit row. A change in a locked period cannot be accepted, and says why.
