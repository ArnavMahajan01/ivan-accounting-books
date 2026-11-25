-- 0009: bank lines that came from a statement file, and the files they came from (spec 056).
-- A line is never changed after import except for its status, which moves from to-review to
-- posted (folder 06) or excluded. The unique key on (bank account, line_key) is what makes
-- importing the same file twice, or an overlapping one, add nothing twice (risk L3).

CREATE TABLE import_batch (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_account (id),
  -- Only the file's name, never its folder.
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  -- The reader that understood it. The list grows with each reader, so no CHECK here.
  format TEXT NOT NULL CHECK (length(format) > 0),
  -- SHA-256 of the file's text, in hex, so the same file can be recognised.
  file_hash TEXT NOT NULL CHECK (length(file_hash) = 64 AND file_hash NOT GLOB '*[^0-9a-f]*'),
  period_from TEXT NOT NULL CHECK (period_from GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  period_to TEXT NOT NULL CHECK (period_to GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  new_count INTEGER NOT NULL CHECK (new_count >= 0),
  duplicate_count INTEGER NOT NULL CHECK (duplicate_count >= 0),
  rejected_count INTEGER NOT NULL CHECK (rejected_count >= 0),
  -- What the statement says the account held at the start and at the end, when the file says. The
  -- start is worked out from the end and the lines (closing less every line the file lists), so the
  -- next file can be checked against it (spec 061).
  opening_balance_cents INTEGER,
  closing_balance_cents INTEGER,
  closing_balance_date TEXT
    CHECK (closing_balance_date IS NULL
      OR closing_balance_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  imported_at TEXT NOT NULL,
  CHECK (period_from <= period_to),
  CHECK ((closing_balance_cents IS NULL) = (closing_balance_date IS NULL)),
  CHECK ((closing_balance_cents IS NULL) = (opening_balance_cents IS NULL))
) STRICT;

CREATE TABLE statement_line (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_account (id),
  batch_id TEXT NOT NULL REFERENCES import_batch (id),
  line_date TEXT NOT NULL CHECK (line_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  description TEXT NOT NULL,
  -- Money in is positive and money out is negative, the same way the journal's debits and credits
  -- fall for a bank account. A line of nothing cannot be posted, so none is stored.
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  -- The running balance after this line, when the file gives one.
  balance_cents INTEGER,
  -- The bank's own transaction id, or a key worked out from the line (src/domain/duplicates.ts).
  line_key TEXT NOT NULL CHECK (length(line_key) > 0),
  status TEXT NOT NULL CHECK (status IN ('to-review', 'posted', 'excluded')),
  created_at TEXT NOT NULL,
  UNIQUE (bank_account_id, line_key)
) STRICT;

CREATE INDEX statement_line_batch ON statement_line (batch_id);
CREATE INDEX statement_line_review ON statement_line (status, line_date);
CREATE INDEX import_batch_account ON import_batch (bank_account_id, period_to);
