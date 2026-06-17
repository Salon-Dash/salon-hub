-- V2: staff shifts table for schedule management

CREATE TABLE IF NOT EXISTS shifts (
    id          BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    staff_id    BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_date  DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_business_id  ON shifts (business_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id     ON shifts (staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_date   ON shifts (shift_date);
