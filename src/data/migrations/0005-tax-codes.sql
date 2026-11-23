-- 0005: the GST codes, as data, and the account table rebuilt with its link to them.
-- Treatments and the rate: ATO, "GST" and "Simpler BAS GST bookkeeping guide", read 2026-11-23
-- (recorded in context/progress/034-tax-codes.md). A rate is in basis points: 1000 is 10%.

CREATE TABLE tax_code (
  id TEXT PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE CHECK (length(trim(short_code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  treatment TEXT NOT NULL CHECK (treatment IN ('taxable', 'gst-free', 'input-taxed', 'outside-gst')),
  rate_bp INTEGER NOT NULL CHECK (rate_bp >= 0 AND rate_bp <= 10000),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  CHECK (treatment = 'taxable' OR rate_bp = 0)
) STRICT;

INSERT INTO tax_code (id, short_code, name, treatment, rate_bp) VALUES
  ('tax_gst', 'GST', 'GST (10%)', 'taxable', 1000),
  ('tax_fre', 'FRE', 'GST-free', 'gst-free', 0),
  ('tax_inp', 'INP', 'Input taxed', 'input-taxed', 0),
  ('tax_nt', 'N-T', 'Outside GST', 'outside-gst', 0);

-- 0003 could not point default_tax_code_id at a table that did not exist yet, so it was a plain
-- column. No account can hold a value in it before tax_code exists, so it is empty now. SQLite can
-- add a foreign key only with a new column, so the column is dropped and added again.
ALTER TABLE account DROP COLUMN default_tax_code_id;
ALTER TABLE account ADD COLUMN default_tax_code_id TEXT REFERENCES tax_code (id);
