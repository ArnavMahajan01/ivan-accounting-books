-- 0003: the chart of accounts.
-- default_tax_code_id has no foreign key yet: the tax_code table arrives in 0005, which adds the
-- key. SQLite refuses to change a table that points at one that does not exist.

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id TEXT REFERENCES account (id) CHECK (parent_id IS NULL OR parent_id <> id),
  default_tax_code_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX account_parent ON account (parent_id);
