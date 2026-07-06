-- Phase 2 scheduling engine: booking interval + padding (buffer) times.
-- All in minutes. 0 = feature off (back-to-back slots / no buffer).
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_interval INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS padding_before   INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS padding_after    INTEGER DEFAULT 0;
