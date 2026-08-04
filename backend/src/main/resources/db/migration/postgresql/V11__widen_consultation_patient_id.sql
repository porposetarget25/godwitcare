-- Registration and traveller patient IDs may be UUIDs (36 characters), while
-- the legacy consultation column was limited to 20 characters. Widen it before
-- Hibernate validates the entity and before a UUID-backed consultation is saved.
ALTER TABLE consultation
    ALTER COLUMN patient_id TYPE VARCHAR(36);
