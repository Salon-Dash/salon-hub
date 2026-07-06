-- The admin "Add service" form collects a colour (used to tint the service's
-- appointments in the calendar) and a price type (FIXED / FROM / RANGE), but the
-- services table had no columns for them, so they were silently dropped on save.
-- Add them here. Idempotent (IF NOT EXISTS) so re-running is a no-op.
ALTER TABLE services ADD COLUMN IF NOT EXISTS color      VARCHAR(50);
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'FIXED';
