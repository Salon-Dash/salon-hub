-- V3: Add DB-level constraints and timezone support
-- Uses DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT pattern (idempotent, valid PostgreSQL)

-- 0. appointment_id FK on sales (needed for analytics revenue join)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_appointment_id ON sales(appointment_id);

-- 1. appointment status check
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_appointment_status;
ALTER TABLE appointments ADD CONSTRAINT chk_appointment_status
  CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED'));

-- 2. appointment payment_status check
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE appointments ADD CONSTRAINT chk_payment_status
  CHECK (payment_status IN ('PENDING','PAID','REFUNDED','WAIVED') OR payment_status IS NULL);

-- 3. timezone column for appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- 4. Prevent negative prices in services
ALTER TABLE services DROP CONSTRAINT IF EXISTS chk_service_price_non_negative;
ALTER TABLE services ADD CONSTRAINT chk_service_price_non_negative
  CHECK (price >= 0 OR price IS NULL);

-- 5. Prevent negative totals in sales
ALTER TABLE sales DROP CONSTRAINT IF EXISTS chk_sale_total_non_negative;
ALTER TABLE sales ADD CONSTRAINT chk_sale_total_non_negative
  CHECK (total >= 0);

-- 6. Discount cannot exceed subtotal
ALTER TABLE sales DROP CONSTRAINT IF EXISTS chk_discount_not_exceed_subtotal;
ALTER TABLE sales ADD CONSTRAINT chk_discount_not_exceed_subtotal
  CHECK (discount_amount <= subtotal OR discount_amount IS NULL);

-- 7. Idempotency key column + unique constraint
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS uq_appointments_idempotency_key;
ALTER TABLE appointments ADD CONSTRAINT uq_appointments_idempotency_key UNIQUE (idempotency_key);

-- 8. start_time must be before end_time
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_time_order;
ALTER TABLE appointments ADD CONSTRAINT chk_time_order
  CHECK (start_time < end_time OR start_time IS NULL OR end_time IS NULL);
