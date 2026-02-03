-- Migration: Add prior_notes table for clipboard-imported Epic notes
-- Purpose: Store copy-forward notes from Epic for use in follow-up/TOC visits
-- These notes are imported via the clipboard watcher menu bar app

CREATE TABLE IF NOT EXISTS prior_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Note Content
  note_content TEXT NOT NULL,
  note_date DATE,                      -- Date of service extracted from note, if found

  -- Extracted Metadata
  setting TEXT,                        -- Detected setting (HMHI Downtown RCC, etc.)
  visit_type TEXT,                     -- Detected visit type if identifiable
  provider_name TEXT,                  -- Extracted provider name from signature

  -- Import Tracking
  imported_at TIMESTAMPTZ DEFAULT now(),
  import_source TEXT DEFAULT 'clipboard_watcher', -- clipboard_watcher, manual, api
  content_hash TEXT NOT NULL,          -- SHA-256 hash for deduplication

  -- Status
  is_active BOOLEAN DEFAULT true,      -- Soft delete flag
  used_in_generation BOOLEAN DEFAULT false, -- Tracks if note was used to generate a new note

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate imports of same note for same patient
  UNIQUE (patient_id, content_hash)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_prior_notes_patient
  ON prior_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_prior_notes_patient_active
  ON prior_notes(patient_id, is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prior_notes_imported_at
  ON prior_notes(imported_at DESC);

-- Enable RLS
ALTER TABLE prior_notes ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user MVP)
CREATE POLICY "Allow all operations for prior_notes"
  ON prior_notes FOR ALL USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prior_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prior_notes_updated_at
  BEFORE UPDATE ON prior_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_prior_notes_updated_at();

-- Comments for documentation
COMMENT ON TABLE prior_notes IS
  'Stores imported prior/copy-forward notes from Epic for use in follow-up/TOC generation';
COMMENT ON COLUMN prior_notes.content_hash IS
  'SHA-256 hash of note_content for duplicate detection';
COMMENT ON COLUMN prior_notes.import_source IS
  'How note was imported: clipboard_watcher (menu bar app), manual (web paste), api (direct API call)';
COMMENT ON COLUMN prior_notes.used_in_generation IS
  'Set to true when this prior note is used to generate a new note';
