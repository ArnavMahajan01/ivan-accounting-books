# 122: Contacts: Data and Automatic Saving

Extends the payees from 071 into full contacts: customers and suppliers, saved from bank lines and invoices.

**Client sees:** nothing new yet.

## Depends On

- 121

## Implementation

1. Migration: contact details (email, phone, ABN, notes), where it was first seen.
2. Contacts are created by 071, by invoices (126), or by hand.

## Check When Done

- Tests for each way a contact is created. `npm run check` passes.
