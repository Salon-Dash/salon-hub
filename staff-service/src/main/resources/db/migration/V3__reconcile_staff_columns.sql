-- V3: reconcile the staff table schema.
--
-- The `staff` table is created by whichever service migrates first against the
-- shared database. business-service/V1 also defines a `staff` table but only with
-- a minimal column set (id, business_id, name, position, is_active, created_at).
-- Because both services use CREATE TABLE IF NOT EXISTS, if business-service wins
-- the race the extra columns this service's entity needs are never created, and
-- staff-service then fails Hibernate schema validation ("missing column avatar_url")
-- and crash-loops.
--
-- These idempotent ALTERs guarantee the columns exist regardless of which service
-- created the table first.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email      VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone      VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio        TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- business-service/V1 declares business_id as INT; this service's entity maps it
-- to a Java Long (BIGINT). Align the type so Hibernate validation passes no matter
-- which service created the table.
ALTER TABLE staff ALTER COLUMN business_id TYPE BIGINT;
