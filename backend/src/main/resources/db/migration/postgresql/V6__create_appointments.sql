CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES users(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    consultation_id BIGINT NOT NULL REFERENCES consultation(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_appointment_doctor_start
    ON appointments (doctor_id, start_time);

CREATE UNIQUE INDEX IF NOT EXISTS uk_appointment_consultation
    ON appointments (consultation_id);

CREATE INDEX IF NOT EXISTS idx_appointment_patient
    ON appointments (patient_id);

CREATE INDEX IF NOT EXISTS idx_appointment_doctor_time
    ON appointments (doctor_id, start_time);
