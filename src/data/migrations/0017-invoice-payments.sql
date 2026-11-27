-- 0017: payments matched to invoices (spec 129). A deposit in To review posted against one or
-- several invoices: each part is a row, by the invoice's number (a newer version keeps its
-- payments), with the journal entry the posting service made and the day the money arrived.

CREATE TABLE invoice_payment (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL CHECK (length(invoice_number) > 0),
  entry_id TEXT NOT NULL REFERENCES journal_entry (id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_date TEXT NOT NULL CHECK (paid_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX invoice_payment_number ON invoice_payment (invoice_number);
CREATE INDEX invoice_payment_entry ON invoice_payment (entry_id);
