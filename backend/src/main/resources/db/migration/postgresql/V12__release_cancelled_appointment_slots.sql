-- Cancelled appointments remain as audit records, but must not reserve a doctor slot.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS uk_appointment_doctor_start;
DROP INDEX IF EXISTS uk_appointment_doctor_start;

CREATE UNIQUE INDEX IF NOT EXISTS uk_appointment_doctor_start_active
    ON appointments (doctor_id, start_time)
    WHERE status <> 'CANCELLED';

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS uk_appointment_consultation;
DROP INDEX IF EXISTS uk_appointment_consultation;

CREATE UNIQUE INDEX IF NOT EXISTS uk_appointment_consultation_active
    ON appointments (consultation_id)
    WHERE status <> 'CANCELLED';
