# 080: Rule Editor With Test

Making and editing a rule in a panel, with a test showing what it would catch.

**Client sees:** the Edit rule panel and "Test: matches 9 lines".

## Depends On

- 079

## Implementation

1. Panel: name, money in or out, which accounts, conditions with "+ Condition", then account, GST, payee, split, post by itself.
2. Test: how many waiting and posted lines it matches, with a list.
3. Validation: a split must add to 100%.

## Check When Done

- Tests for validation. e2e: make a rule, see waiting lines change. `npm run check` passes.
