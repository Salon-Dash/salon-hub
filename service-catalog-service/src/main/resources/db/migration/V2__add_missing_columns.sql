-- V2: add columns that business-service's V1 omitted when it created the shared tables first
ALTER TABLE services    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT NOW();
ALTER TABLE categories  ADD COLUMN IF NOT EXISTS description TEXT;
