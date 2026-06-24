ALTER TABLE consultation
ADD COLUMN IF NOT EXISTS traveler_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_consultation_traveler'
      AND conrelid = 'consultation'::regclass
  ) THEN
    ALTER TABLE consultation
      ADD CONSTRAINT fk_consultation_traveler
      FOREIGN KEY (traveler_id) REFERENCES travelers(id);
  END IF;
END $$;
