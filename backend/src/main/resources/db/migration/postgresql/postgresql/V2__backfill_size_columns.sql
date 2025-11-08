-- Postgres-only
-- Make sure legacy 'size' is populated (from size_bytes or pdf length)
ALTER TABLE referral_letter ALTER COLUMN size SET DEFAULT 0;
UPDATE referral_letter
SET size = COALESCE(size, size_bytes, COALESCE(octet_length(pdf_bytes2), octet_length(pdf_bytes)), 0)
WHERE size IS NULL;

ALTER TABLE prescription ALTER COLUMN size SET DEFAULT 0;
UPDATE prescription
SET size = COALESCE(size, size_bytes, COALESCE(octet_length(pdf_bytes2), octet_length(pdf_bytes)), 0)
WHERE size IS NULL;
