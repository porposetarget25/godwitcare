-- Fix PRESCRIPTION
DO $$
DECLARE
  pdf_type text;
  size_type text;
BEGIN
  SELECT data_type INTO pdf_type
  FROM information_schema.columns
  WHERE table_name = 'prescription' AND column_name = 'pdf_bytes';

  SELECT data_type INTO size_type
  FROM information_schema.columns
  WHERE table_name = 'prescription' AND column_name = 'size';

  -- If pdf_bytes is missing, create it
  IF pdf_type IS NULL THEN
    EXECUTE 'ALTER TABLE prescription ADD COLUMN pdf_bytes bytea';
  ELSIF pdf_type <> 'bytea' THEN
    -- If pdf_bytes exists but wrong type, rename and add correct column
    EXECUTE 'ALTER TABLE prescription RENAME COLUMN pdf_bytes TO pdf_bytes_legacy';
    EXECUTE 'ALTER TABLE prescription ADD COLUMN pdf_bytes bytea';
  END IF;

  -- Ensure size column exists and is bigint; also add a canonical size_bytes
  IF size_type IS NULL THEN
    EXECUTE 'ALTER TABLE prescription ADD COLUMN size bigint';
  ELSIF size_type <> 'bigint' THEN
    EXECUTE 'ALTER TABLE prescription RENAME COLUMN size TO size_legacy';
    EXECUTE 'ALTER TABLE prescription ADD COLUMN size bigint';
  END IF;

  -- Add a canonical size_bytes (keep old size too)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prescription' AND column_name = 'size_bytes'
  ) THEN
    EXECUTE 'ALTER TABLE prescription ADD COLUMN size_bytes bigint';
    -- best effort: backfill from size if present
    EXECUTE 'UPDATE prescription SET size_bytes = size WHERE size_bytes IS NULL';
  END IF;
END$$;

-- Fix REFERRAL_LETTER
DO $$
DECLARE
  pdf_type text;
  size_type text;
BEGIN
  SELECT data_type INTO pdf_type
  FROM information_schema.columns
  WHERE table_name = 'referral_letter' AND column_name = 'pdf_bytes';

  SELECT data_type INTO size_type
  FROM information_schema.columns
  WHERE table_name = 'referral_letter' AND column_name = 'size';

  IF pdf_type IS NULL THEN
    EXECUTE 'ALTER TABLE referral_letter ADD COLUMN pdf_bytes bytea';
  ELSIF pdf_type <> 'bytea' THEN
    EXECUTE 'ALTER TABLE referral_letter RENAME COLUMN pdf_bytes TO pdf_bytes_legacy';
    EXECUTE 'ALTER TABLE referral_letter ADD COLUMN pdf_bytes bytea';
  END IF;

  IF size_type IS NULL THEN
    EXECUTE 'ALTER TABLE referral_letter ADD COLUMN size bigint';
  ELSIF size_type <> 'bigint' THEN
    EXECUTE 'ALTER TABLE referral_letter RENAME COLUMN size TO size_legacy';
    EXECUTE 'ALTER TABLE referral_letter ADD COLUMN size bigint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referral_letter' AND column_name = 'size_bytes'
  ) THEN
    EXECUTE 'ALTER TABLE referral_letter ADD COLUMN size_bytes bigint';
    EXECUTE 'UPDATE referral_letter SET size_bytes = size WHERE size_bytes IS NULL';
  END IF;
END$$;

-- Make the must-have columns NOT NULL going forward (rows already inserted must satisfy this)
ALTER TABLE prescription
  ALTER COLUMN content_type SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL;

ALTER TABLE referral_letter
  ALTER COLUMN content_type SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL;
