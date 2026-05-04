package com.godwitcare.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PatientIdConstraintCleanup {

    private static final Logger log = LoggerFactory.getLogger(PatientIdConstraintCleanup.class);
    private final JdbcTemplate jdbcTemplate;

    public PatientIdConstraintCleanup(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void dropLegacyPatientIdUniqueConstraint() {
        List<String> constraintNames = jdbcTemplate.queryForList(
                """
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = con.connamespace
                JOIN unnest(con.conkey) AS cols(attnum) ON TRUE
                JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = cols.attnum
                WHERE con.contype = 'u'
                  AND nsp.nspname = 'public'
                  AND rel.relname = 'consultation'
                  AND att.attname = 'patient_id'
                """,
                String.class
        );

        for (String name : constraintNames) {
            jdbcTemplate.execute("ALTER TABLE consultation DROP CONSTRAINT IF EXISTS \"" + name + "\"");
            log.info("Dropped legacy unique constraint on consultation.patient_id: {}", name);
        }
    }
}
