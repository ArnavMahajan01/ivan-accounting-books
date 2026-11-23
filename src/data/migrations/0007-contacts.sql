-- 0007: the people and businesses he deals with: customers and suppliers. Created now because
-- the sample books need payees to show. Spec 071 adds the words that match a bank line to a
-- contact, and spec 122 adds their details. journal_line.payee_id holds a contact's id (it has no
-- foreign key, because SQLite adds one only with a new column; the services check it).

CREATE TABLE contact (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('customer', 'supplier', 'both')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_from TEXT NOT NULL CHECK (created_from IN ('manual', 'bank-line', 'invoice')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
