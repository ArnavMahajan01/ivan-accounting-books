# 078: Rules: Data and Matching

Bank rules as data, and the pure matching that decides which rule applies to a line.

**Client sees:** nothing yet.

## Depends On

- 077

## Implementation

1. Migration: `rule` (id, name, order, direction money in or out or both, bank accounts, conditions as JSON, then: account, GST code, payee, split percentages, post by itself, active).
2. `src/domain/rules.ts` (pure): conditions on description (contains, is, starts with) and amount (equals, between), all or any. First matching rule by order wins.

## Check When Done

- Tests: each condition, order, all versus any, a rule limited to one account. `npm run check` passes.
