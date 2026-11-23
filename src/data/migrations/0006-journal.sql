-- 0006: the books themselves. An entry has lines, and its lines sum to zero cents: positive is a
-- debit and negative is a credit. The database cannot check the sum, so the posting service does
-- (spec 039). It can check each line, and does. Only the posting service writes these two tables.
-- The audit log they write to is 0004.

CREATE TABLE journal_entry (
  id TEXT PRIMARY KEY,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  memo TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL
    CHECK (source_kind IN ('manual', 'bank-line', 'invoice', 'opening-balance', 'accountant-change')),
  source_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE journal_line (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES journal_entry (id),
  -- The order the lines were written in, so an entry reads back the way it was posted.
  position INTEGER NOT NULL CHECK (position >= 0),
  account_id TEXT NOT NULL REFERENCES account (id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  tax_code_id TEXT REFERENCES tax_code (id),
  -- The GST on the line, with the same sign as the amount (the amount is net of it).
  gst_cents INTEGER NOT NULL DEFAULT 0 CHECK (gst_cents = 0 OR (gst_cents > 0) = (amount_cents > 0)),
  -- A contact, once contacts exist (folder 10), so no foreign key yet.
  payee_id TEXT,
  memo TEXT NOT NULL DEFAULT '',
  UNIQUE (entry_id, position)
) STRICT;

CREATE INDEX journal_entry_date ON journal_entry (entry_date);
CREATE INDEX journal_line_account ON journal_line (account_id);
