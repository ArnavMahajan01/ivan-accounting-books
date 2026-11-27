-- 0016: invoices and credit notes brought in from the Admin Dashboard (spec 126). Each issued
-- version is a row, with its lines as the Admin Dashboard sent them (GST-inclusive, its GST kept).
-- The current version of each number has the journal entry the posting service made from it:
-- accounts receivable against sales and GST. A newer version changes that entry in place, with
-- its audit row, and the older row is marked replaced.
--
-- Two account roles are added so the posting finds its accounts by role, never by code:
-- `receivables` (1100 Accounts receivable) and `sales` (4000 Sales). SQLite cannot widen a CHECK,
-- so account_role is made again with the wider one.

CREATE TABLE account_role_new (
  role TEXT PRIMARY KEY CHECK (role IN ('gst', 'transfers', 'receivables', 'sales')),
  account_id TEXT NOT NULL UNIQUE REFERENCES account (id)
) STRICT;
INSERT INTO account_role_new (role, account_id) SELECT role, account_id FROM account_role;
DROP TABLE account_role;
ALTER TABLE account_role_new RENAME TO account_role;

INSERT INTO account_role (role, account_id)
  SELECT 'receivables', id FROM account WHERE code = '1100' AND type = 'asset'
    AND NOT EXISTS (SELECT 1 FROM account_role WHERE account_id = account.id);
INSERT INTO account_role (role, account_id)
  SELECT 'sales', id FROM account WHERE code = '4000' AND type = 'income'
    AND NOT EXISTS (SELECT 1 FROM account_role WHERE account_id = account.id);

CREATE TABLE invoice (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('invoice', 'credit-note')),
  number TEXT NOT NULL CHECK (length(number) > 0),
  version INTEGER NOT NULL CHECK (version >= 1),
  contact_id TEXT NOT NULL REFERENCES contact (id),
  issue_date TEXT NOT NULL CHECK (issue_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  due_date TEXT CHECK (due_date IS NULL OR due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- GST-inclusive, positive for an invoice and for a credit note alike.
  total_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  -- A credit note: the number of the invoice it is for.
  credit_for TEXT,
  pdf TEXT,
  status TEXT NOT NULL CHECK (status IN ('current', 'replaced')),
  entry_id TEXT REFERENCES journal_entry (id),
  -- The exchange file it came from, so the same file is known again.
  source_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (number, version)
) STRICT;

CREATE INDEX invoice_contact ON invoice (contact_id);
CREATE INDEX invoice_entry ON invoice (entry_id);

CREATE TABLE invoice_line (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoice (id),
  position INTEGER NOT NULL CHECK (position >= 0),
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  gst_code TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  UNIQUE (invoice_id, position)
) STRICT;
