-- Phase 2C processing time (staff freed during processing): the staff is busy
-- only for the service's active `duration`; processing_during + processing_after
-- are additional client-visit minutes that DO NOT occupy the staff. Minutes; 0 = off.
ALTER TABLE services ADD COLUMN IF NOT EXISTS processing_during INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS processing_after  INTEGER DEFAULT 0;
