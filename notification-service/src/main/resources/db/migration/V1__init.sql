CREATE TABLE IF NOT EXISTS notification_log (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    type VARCHAR(50) NOT NULL,  -- BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_REMINDER
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',  -- SENT, FAILED, PENDING
    subject VARCHAR(255),
    body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_log_booking_id ON notification_log(booking_id);
