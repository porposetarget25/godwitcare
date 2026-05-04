ALTER TABLE consultation
ADD COLUMN IF NOT EXISTS traveler_id BIGINT;

ALTER TABLE consultation
ADD CONSTRAINT IF NOT EXISTS fk_consultation_traveler
FOREIGN KEY (traveler_id) REFERENCES travelers(id);
