-- 0018: pairs of contacts the app offered to merge and he chose to keep apart (spec 124, "Keep
-- both"), so the same pair is not offered again. The two ids are kept in order, so a pair is one
-- row whichever way round it was offered. Merging a contact away removes its rows here first.

CREATE TABLE contact_pair_kept (
  first_id TEXT NOT NULL REFERENCES contact (id),
  second_id TEXT NOT NULL REFERENCES contact (id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (first_id, second_id),
  CHECK (first_id < second_id)
) STRICT;
