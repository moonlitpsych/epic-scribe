-- Migration: Add batch_queue_items table for multi-patient companion workflow
-- Purpose: Queue multiple patients on the companion (work desktop), generate notes for all on laptop
-- Links to sync_sessions — each queue item belongs to an active sync session

CREATE TABLE IF NOT EXISTS batch_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_session_id UUID NOT NULL REFERENCES sync_sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),

  -- Denormalized patient info for companion display (avoids extra lookups)
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,

  -- Visit configuration
  setting TEXT NOT NULL,
  visit_type TEXT NOT NULL,

  -- Prior note (pasted or auto-fetched on companion)
  prior_note_content TEXT,
  prior_note_source TEXT CHECK (prior_note_source IN ('manual', 'intakeq', 'clipboard_import', 'none')),

  -- Transcript (pasted on laptop)
  transcript TEXT,

  -- Generated note (from laptop generation)
  generated_note_content TEXT,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'generating', 'generated', 'copied')),
  error_message TEXT,

  -- Display ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batch_queue_items_sync_session
  ON batch_queue_items(sync_session_id);
CREATE INDEX IF NOT EXISTS idx_batch_queue_items_patient
  ON batch_queue_items(patient_id);

-- Enable RLS with permissive policy (matching existing pattern)
ALTER TABLE batch_queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for batch_queue_items"
  ON batch_queue_items FOR ALL USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_batch_queue_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_queue_items_updated_at
  BEFORE UPDATE ON batch_queue_items
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_queue_items_updated_at();

-- Add to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE batch_queue_items;

COMMENT ON TABLE batch_queue_items IS
  'Batch queue for multi-patient companion workflow — queue patients on work desktop, generate on laptop';
COMMENT ON COLUMN batch_queue_items.status IS
  'pending → ready → generating → generated → copied';
COMMENT ON COLUMN batch_queue_items.prior_note_source IS
  'manual (pasted), intakeq (auto-fetched), clipboard_import (from prior_notes table), none';
