CREATE TABLE IF NOT EXISTS time_off (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,               -- null for full-day
    end_time TIME,                 -- null for full-day
    is_full_day BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20), -- WEEKLY, MONTHLY, etc.
    recurrence_end_date DATE,
    reason VARCHAR(255),
    is_approved BOOLEAN DEFAULT true,
    needs_manager_approval BOOLEAN DEFAULT false,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_off_staff_id ON time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_time_off_business_id ON time_off(business_id);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off(staff_id, start_date, end_date);
