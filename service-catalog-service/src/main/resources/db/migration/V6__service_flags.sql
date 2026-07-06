-- The Add/Edit service form has "Mobile Service" (performed at the client's
-- location) and "Virtual Appointment" (online/video) toggles, plus an
-- "Allow self-booking" toggle that maps to the existing is_visible flag.
-- Add the two missing boolean columns so those toggles actually persist.
-- Idempotent (IF NOT EXISTS) so re-running is a no-op.
ALTER TABLE services ADD COLUMN IF NOT EXISTS mobile_service      BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS virtual_appointment BOOLEAN DEFAULT FALSE;
