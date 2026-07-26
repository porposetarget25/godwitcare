CREATE TABLE doctor_availability (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active_days VARCHAR(32) NOT NULL,
    CONSTRAINT chk_availability_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_availability_times CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_doctor_dates ON doctor_availability(doctor_id, start_date, end_date);

CREATE TABLE doctor_time_blocks (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    CONSTRAINT chk_time_block_range CHECK (end_time > start_time)
);
CREATE INDEX idx_time_block_doctor_time ON doctor_time_blocks(doctor_id, start_time, end_time);
