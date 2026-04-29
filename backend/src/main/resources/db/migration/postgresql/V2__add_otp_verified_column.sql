DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'otp_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN otp_verified boolean NOT NULL DEFAULT false;
  END IF;

  UPDATE users
  SET otp_verified = true
  WHERE otp_verified_at IS NOT NULL;
END$$;
