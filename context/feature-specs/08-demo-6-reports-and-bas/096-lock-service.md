# 096: Period Lock Service

Locking a period so nothing in it can change (risk L5).

**Client sees:** nothing yet.

## Depends On

- 095

## Decide First

- Client question 20 (can a lock be undone). Assumption: no unlock in v1.

## Implementation

1. `lockPeriod(endDate)` sets the business lock date (only forwards), with an audit row.
2. The posting service already refuses dates on or before it. Every screen shows locked rows as "Locked".

## Check When Done

- Tests: post, change, remove, import auto-post and undo are all refused in a locked period.
