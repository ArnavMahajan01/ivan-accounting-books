-- 0014: the accountant's edits read back from the Transactions sheet (spec 116). Each is a proposal:
-- one field of one row, what was published and what the sheet holds now, who changed the file last,
-- and whether he accepted or rejected it. Nothing here changes the books: accepting goes through
-- the posting service, which writes the entry's own audit row (invariant 3).

CREATE TABLE accountant_change (
  id TEXT PRIMARY KEY,
  sheet_link_id TEXT NOT NULL REFERENCES sheet_link (id),
  -- The entry's id, from the sheet's Ref column.
  row_key TEXT NOT NULL,
  -- The row it was on in the sheet when seen, for "row 18".
  sheet_row INTEGER NOT NULL CHECK (sheet_row > 0),
  field TEXT NOT NULL CHECK (field IN ('account', 'gst', 'note')),
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  changed_by TEXT,
  seen_at TEXT NOT NULL,
  -- `withdrawn`: the sheet went back to what was published before he decided.
  status TEXT NOT NULL CHECK (status IN ('waiting', 'accepted', 'rejected', 'withdrawn')),
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX accountant_change_status ON accountant_change (status, sheet_link_id);

-- Drive's "modified" time when the sheet was last read, so an unchanged sheet is not read again.
ALTER TABLE sheet_link ADD COLUMN checked_time TEXT;
