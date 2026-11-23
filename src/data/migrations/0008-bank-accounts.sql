-- 0008: his bank accounts, each linked to a ledger account (spec 055 lists these columns). Created
-- now because Home's bank balance and the sample books need to know which accounts are the bank's.
-- Only the last four digits of an account number are ever stored (security-context.md).

CREATE TABLE bank_account (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  bank TEXT NOT NULL CHECK (length(trim(bank)) > 0),
  last_four TEXT NOT NULL CHECK (length(last_four) = 4 AND last_four NOT GLOB '*[^0-9]*'),
  ledger_account_id TEXT NOT NULL UNIQUE REFERENCES account (id),
  parent_id TEXT REFERENCES bank_account (id) CHECK (parent_id IS NULL OR parent_id <> id),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
