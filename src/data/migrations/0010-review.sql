-- 0010: what posting bank lines needs (folder 06).
--
-- account_role names the accounts the app posts to by itself: the GST account, where the GST on a
-- posted line goes, and the transfers clearing account, which holds one side of a transfer until the
-- other bank line arrives (spec 073). Nothing stored this before: the sample builder found the GST
-- account by its code. A role is held by at most one account, and an account holds at most one role.
--
-- statement_line gains the entry it was posted to (or matched with) and, for a transfer, the line
-- in the other account it is paired with. Both are set only by the review services in one
-- transaction with the posting, and cleared again by Undo.
--
-- contact_match holds the description words that point to a contact (spec 071), so later lines
-- with the same words get the same From/To.

CREATE TABLE account_role (
  role TEXT PRIMARY KEY CHECK (role IN ('gst', 'transfers')),
  account_id TEXT NOT NULL UNIQUE REFERENCES account (id)
) STRICT;

-- Books set up before this version: the default chart's GST account takes its role, and the
-- clearing account is added. Books with no business yet get both from setup (setup-business.ts).
INSERT INTO account_role (role, account_id)
  SELECT 'gst', id FROM account WHERE code = '2200' AND type = 'liability';

INSERT INTO account (id, code, name, type, parent_id, default_tax_code_id, active, created_at, updated_at)
  SELECT 'acc_transfers', '1090', 'Transfers in transit', 'asset', NULL, 'tax_nt', 1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE EXISTS (SELECT 1 FROM business)
    AND NOT EXISTS (SELECT 1 FROM account WHERE code = '1090');

INSERT INTO account_role (role, account_id)
  SELECT 'transfers', id FROM account WHERE id = 'acc_transfers';

ALTER TABLE statement_line ADD COLUMN entry_id TEXT REFERENCES journal_entry (id);
ALTER TABLE statement_line ADD COLUMN paired_line_id TEXT REFERENCES statement_line (id);
CREATE INDEX statement_line_entry ON statement_line (entry_id);

CREATE TABLE contact_match (
  -- Upper case letter words of a bank description, one space apart (src/domain/payees.ts).
  words TEXT PRIMARY KEY CHECK (length(words) > 0),
  contact_id TEXT NOT NULL REFERENCES contact (id),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX contact_match_contact ON contact_match (contact_id);
