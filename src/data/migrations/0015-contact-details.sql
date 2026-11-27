-- 0015: a contact's details (spec 122): email, phone, ABN and notes, all optional. Where a contact
-- was first seen is already kept (`created_from`, `created_at`): a bank line, an invoice, or by hand.

ALTER TABLE contact ADD COLUMN email TEXT;
ALTER TABLE contact ADD COLUMN phone TEXT;
ALTER TABLE contact ADD COLUMN abn TEXT CHECK (abn IS NULL OR abn GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
ALTER TABLE contact ADD COLUMN notes TEXT NOT NULL DEFAULT '';
