DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT con.conname AS constraint_name,
               rel.relname AS table_name
        FROM pg_constraint con
                 JOIN pg_class rel ON rel.oid = con.conrelid
                 JOIN pg_namespace nsp ON nsp.oid = con.connamespace
                 JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
                 JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = cols.attnum
        WHERE con.contype = 'u'
          AND nsp.nspname = 'public'
          AND rel.relname IN ('consultation', 'prescription', 'referral_letter')
          AND att.attname = 'patient_id'
        GROUP BY con.conname, rel.relname
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', c.table_name, c.constraint_name);
    END LOOP;
END
$$;
