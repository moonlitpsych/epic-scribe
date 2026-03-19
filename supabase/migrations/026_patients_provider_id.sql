-- Migration 026: Add provider_id to patients table for multi-tenant isolation
-- All existing patients are assigned to Rufus's provider account

ALTER TABLE patients ADD COLUMN provider_id UUID REFERENCES es_providers(id);

-- Assign all existing patients to Rufus
-- Uses rufussweeney@gmail.com (provider email from moonlit-scheduler seed)
-- or hello@trymoonlit.com (NextAuth login email) — whichever exists
UPDATE patients SET provider_id = (
  SELECT id FROM es_providers
  WHERE email IN ('rufussweeney@gmail.com', 'hello@trymoonlit.com')
  LIMIT 1
) WHERE provider_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE patients ALTER COLUMN provider_id SET NOT NULL;

-- Index for provider-scoped queries
CREATE INDEX idx_patients_provider_id ON patients(provider_id);
