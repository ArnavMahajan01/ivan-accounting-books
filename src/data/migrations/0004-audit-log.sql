-- 0004: the audit log. Append-only: the code has an insert and a read, and nothing that changes
-- or removes a row. The journal tables arrive in 0006 and add their own rows to it.
-- `kind` has no CHECK list, because every spec that changes the books adds kinds.

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  changed_at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (length(kind) > 0),
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json))
) STRICT;

CREATE INDEX audit_log_row ON audit_log (table_name, row_id);
