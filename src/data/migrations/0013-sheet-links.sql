-- 0013: the workbooks published to Google Sheets (spec 110). One row per workbook: which report
-- and period it holds (pinned to whole days), the Google file id, when it was last published, a hash
-- of what was sent, how many rows each app tab had (so publishing again clears only the app's own
-- rows), and, for the Transactions workbook, what was published in the columns the accountant may
-- change (so his edits can be found, spec 116). The sheet is a copy: the books never read it as truth.

CREATE TABLE sheet_link (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL UNIQUE CHECK (length(file_id) > 0),
  kind TEXT NOT NULL
    CHECK (kind IN ('profit-and-loss', 'balance-sheet', 'trial-balance', 'bas', 'transactions')),
  title TEXT NOT NULL,
  -- What is published: a report request with its period pinned, or the transactions' period, as JSON.
  request TEXT NOT NULL CHECK (json_valid(request)),
  -- The period's first day, or '' for a report that is as at one day.
  period_from TEXT NOT NULL CHECK (period_from = '' OR period_from GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  period_to TEXT NOT NULL CHECK (period_to GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  published_at TEXT,
  published_hash TEXT,
  tab_rows TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(tab_rows)),
  published_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(published_values)),
  -- His own tabs, by name, as they were at the last publish: shown as "kept" in the preview.
  kept_tabs TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kept_tabs)),
  -- `missing`: deleted or out of reach in Drive, so it is offered "Publish as new".
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'missing')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (kind, period_from, period_to)
) STRICT;
