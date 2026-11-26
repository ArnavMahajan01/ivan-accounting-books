-- 0011: bank rules (spec 078) and reconciling to a statement (spec 085).
--
-- A rule says which bank lines it is for (money in or out, which of his bank accounts, and
-- conditions on the description and amount) and what to give them: one account and GST code, or a
-- split by percentage, and a payee. Rules are tried in `position` order and the first that fits wins.
-- The conditions and the split are JSON, read back through a Zod schema (src/data/rule-repository.ts).
--
-- A reconciliation records that the books held the statement's balance for an account on a day.
-- The bank lines it covered point to it, so a later change to one of them can warn.

CREATE TABLE rule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'both')),
  -- A JSON array of bank account ids. Empty means every bank account.
  bank_account_ids TEXT NOT NULL CHECK (json_valid(bank_account_ids)),
  match_mode TEXT NOT NULL CHECK (match_mode IN ('all', 'any')),
  conditions TEXT NOT NULL CHECK (json_valid(conditions)),
  -- One account, or a split. Exactly one of the two is set.
  account_id TEXT REFERENCES account (id),
  tax_code_id TEXT REFERENCES tax_code (id),
  split TEXT CHECK (split IS NULL OR json_valid(split)),
  payee_id TEXT REFERENCES contact (id),
  auto_post INTEGER NOT NULL CHECK (auto_post IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((account_id IS NULL) <> (split IS NULL))
) STRICT;

CREATE INDEX rule_position ON rule (position);

CREATE TABLE reconciliation (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_account (id),
  statement_date TEXT NOT NULL
    CHECK (statement_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  statement_balance_cents INTEGER NOT NULL,
  books_balance_cents INTEGER NOT NULL,
  -- Finished only when the books agree with the statement, so this is always zero.
  difference_cents INTEGER NOT NULL CHECK (difference_cents = 0),
  done_at TEXT NOT NULL
) STRICT;

CREATE INDEX reconciliation_account ON reconciliation (bank_account_id, statement_date);

ALTER TABLE statement_line ADD COLUMN reconciliation_id TEXT REFERENCES reconciliation (id);
