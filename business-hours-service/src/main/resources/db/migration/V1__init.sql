CREATE TABLE IF NOT EXISTS business_hours (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,  -- MONDAY, TUESDAY, etc.
    start_time TIME,
    end_time TIME,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, day_of_week)
);

-- Seed default Mon-Fri 9-17 for business_id=1 as example
INSERT INTO business_hours (business_id, day_of_week, start_time, end_time, is_enabled) VALUES
(1, 'MONDAY',    '09:00', '17:00', true),
(1, 'TUESDAY',   '09:00', '17:00', true),
(1, 'WEDNESDAY', '09:00', '17:00', true),
(1, 'THURSDAY',  '09:00', '17:00', true),
(1, 'FRIDAY',    '09:00', '17:00', true),
(1, 'SATURDAY',  '10:00', '15:00', false),
(1, 'SUNDAY',    '10:00', '15:00', false)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);
