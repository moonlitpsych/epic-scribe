-- Add provider_notes column to encounters for ad-hoc notes from schedule view
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS provider_notes TEXT;
