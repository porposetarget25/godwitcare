ALTER TABLE registration ADD COLUMN IF NOT EXISTS virtual_consultation_consent BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE registration ADD COLUMN IF NOT EXISTS virtual_consultation_consent_at TIMESTAMP WITH TIME ZONE;
