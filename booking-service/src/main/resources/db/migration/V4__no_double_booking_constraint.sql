-- V4: Definitive double-booking prevention via DB-level EXCLUDE constraint
-- This works even if application code is bypassed, has bugs, or runs concurrently.
-- Two overlapping appointments for the same staff on the same date cannot both be
-- inserted — the second INSERT throws a 23P01 exclusion_violation, regardless of
-- transaction isolation level or race conditions in application code.

-- Required extension for range overlap operators
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Remove any overlapping rows that exist before adding the constraint
-- (should be none in production, but safety net for test environments)
-- This CTE finds and keeps only the earliest booking per conflicting pair
DO $$
DECLARE
  overlap_count INT;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM appointments a
  JOIN appointments b ON
    a.id < b.id
    AND a.staff_id = b.staff_id
    AND a.appointment_date = b.appointment_date
    AND a.start_time < b.end_time
    AND a.end_time > b.start_time
    AND a.status != 'CANCELLED'
    AND b.status != 'CANCELLED';

  IF overlap_count > 0 THEN
    RAISE WARNING 'Found % overlapping appointment pair(s). Cancelling duplicates before adding constraint.', overlap_count;
    -- Cancel the later booking in each conflicting pair (keep the earlier-created one)
    UPDATE appointments SET status = 'CANCELLED'
    WHERE id IN (
      SELECT DISTINCT b.id
      FROM appointments a
      JOIN appointments b ON
        a.id < b.id
        AND a.staff_id = b.staff_id
        AND a.appointment_date = b.appointment_date
        AND a.start_time < b.end_time
        AND a.end_time > b.start_time
        AND a.status != 'CANCELLED'
        AND b.status != 'CANCELLED'
    );
  END IF;
END $$;

-- THE KEY CONSTRAINT: no two non-cancelled appointments for the same staff
-- can overlap in time on the same date.
-- tsrange '[)' = half-open interval: [start, end) — end-time is exclusive
-- so back-to-back bookings (10:00-11:00 and 11:00-12:00) are allowed.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlap_booking;
ALTER TABLE appointments ADD CONSTRAINT no_overlap_booking
  EXCLUDE USING gist (
    staff_id         WITH =,
    appointment_date WITH =,
    tsrange(
      appointment_date + start_time,
      appointment_date + end_time,
      '[)'
    ) WITH &&
  )
  WHERE (status != 'CANCELLED' AND start_time IS NOT NULL AND end_time IS NOT NULL);

-- Index to make the exclusion check fast
CREATE INDEX IF NOT EXISTS idx_appointments_staff_date_times
  ON appointments (staff_id, appointment_date, start_time, end_time)
  WHERE status != 'CANCELLED';
