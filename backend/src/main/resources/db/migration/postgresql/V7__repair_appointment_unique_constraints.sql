DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class idx
        JOIN pg_namespace ns ON ns.oid = idx.relnamespace
        WHERE idx.relkind = 'i'
          AND ns.nspname = current_schema()
          AND idx.relname = 'uk_appointment_doctor_start'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class tbl ON tbl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
        WHERE con.conname = 'uk_appointment_doctor_start'
          AND tbl.relname = 'appointments'
          AND ns.nspname = current_schema()
    ) THEN
        DROP INDEX uk_appointment_doctor_start;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class tbl ON tbl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
        WHERE con.conname = 'uk_appointment_doctor_start'
          AND tbl.relname = 'appointments'
          AND ns.nspname = current_schema()
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT uk_appointment_doctor_start UNIQUE (doctor_id, start_time);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class idx
        JOIN pg_namespace ns ON ns.oid = idx.relnamespace
        WHERE idx.relkind = 'i'
          AND ns.nspname = current_schema()
          AND idx.relname = 'uk_appointment_consultation'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class tbl ON tbl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
        WHERE con.conname = 'uk_appointment_consultation'
          AND tbl.relname = 'appointments'
          AND ns.nspname = current_schema()
    ) THEN
        DROP INDEX uk_appointment_consultation;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class tbl ON tbl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
        WHERE con.conname = 'uk_appointment_consultation'
          AND tbl.relname = 'appointments'
          AND ns.nspname = current_schema()
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT uk_appointment_consultation UNIQUE (consultation_id);
    END IF;
END$$;
