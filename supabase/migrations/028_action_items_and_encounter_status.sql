-- Migration 028: Action items table + encounter status documentation
-- Phase 1 of strong.work/flow

-- Action items table (for Phase 3 Inbox, but create schema now)
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  text TEXT NOT NULL,
  category TEXT CHECK (category IN ('referral','prescription','lab','patient_education','coordination','follow_up','other')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_items_encounter ON action_items(encounter_id);
CREATE INDEX IF NOT EXISTS idx_action_items_provider ON action_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_action_items_incomplete ON action_items(provider_id) WHERE completed = false;

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on action_items"
  ON action_items FOR ALL USING (true) WITH CHECK (true);

-- Document expanded encounter status values
COMMENT ON COLUMN encounters.status IS
  'Status: scheduled, ready, in-visit, note-pending, note-ready, signed, cancelled';
