ALTER TABLE registration
    ADD COLUMN IF NOT EXISTS virtual_consultation_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS virtual_consultation_consent_at TIMESTAMP WITH TIME ZONE;
