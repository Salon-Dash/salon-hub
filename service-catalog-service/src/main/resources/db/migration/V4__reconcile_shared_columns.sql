-- V4: reconcile the shared `services` and `categories` tables.
--
-- These tables live in the one shared database and are created by whichever service
-- migrates first. business-service/V1 and booking-service/V1 both declare
-- `services` (and business-service declares `categories`) with business_id INT and
-- no updated_at, using CREATE TABLE IF NOT EXISTS. If one of them wins the race,
-- this service — whose entities map business_id to a Java Long (BIGINT) and write
-- updated_at — either fails Hibernate schema validation or errors on UPDATE with
-- "column updated_at does not exist".
--
-- These idempotent statements align the schema regardless of creation order
-- (mirrors staff-service/V3__reconcile_staff_columns.sql). Re-running is a no-op:
-- ADD COLUMN IF NOT EXISTS is idempotent, and ALTER COLUMN ... TYPE BIGINT is a
-- no-op when the column is already BIGINT.
ALTER TABLE services   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE services   ALTER COLUMN business_id TYPE BIGINT;
ALTER TABLE categories ALTER COLUMN business_id TYPE BIGINT;
