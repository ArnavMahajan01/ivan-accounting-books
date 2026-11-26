-- 0012: his own reports (spec 101). A layout is a report request (which report, the period, the
-- columns and rows, his own columns) with a name, stored as JSON and read back through Zod
-- (src/data/report-layout-repository.ts). The figures are never stored: they always come from the books.

CREATE TABLE report_layout (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) > 0),
  request TEXT NOT NULL CHECK (json_valid(request)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
