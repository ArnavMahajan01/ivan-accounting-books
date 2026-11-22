-- 0001: the migration record and app metadata. Never edit this file once applied:
-- the runner stores its hash and refuses to start if it changes. Add a new file instead.

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL
) STRICT;

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
