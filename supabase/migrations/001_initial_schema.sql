-- Epic Scribe Initial Schema Migration
-- Phase 1.5 - Patient Management & Database
-- Created: 2025-10-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patients table (PHI - encrypt sensitive columns)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  mrn TEXT, -- Medical Record Number (optional)
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Encounters table (metadata only, transcripts stay in Drive)
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL UNIQUE, -- Google Calendar event ID
  setting TEXT NOT NULL,
  visit_type TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  meet_link TEXT,
  transcript_file_id TEXT, -- Google Drive file ID
  transcript_indexed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated Notes table (metadata only, content in Drive)
CREATE TABLE generated_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  drive_file_id TEXT, -- If we save notes to Drive
  generated_at TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN DEFAULT false
);

-- Add indexes for common queries
CREATE INDEX idx_patients_last_name ON patients(last_name);
CREATE INDEX idx_patients_date_of_birth ON patients(date_of_birth);
CREATE INDEX idx_patients_active ON patients(active);
CREATE INDEX idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX idx_encounters_scheduled_start ON encounters(scheduled_start);
CREATE INDEX idx_encounters_calendar_event_id ON encounters(calendar_event_id);
CREATE INDEX idx_encounters_status ON encounters(status);
CREATE INDEX idx_generated_notes_encounter_id ON generated_notes(encounter_id);

-- Add updated_at trigger for patients
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- For now, we'll keep it simple since this is single-user MVP
-- In the future, we can add user-based policies

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_notes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-user MVP)
CREATE POLICY "Allow all operations for authenticated users" ON patients
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON encounters
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON generated_notes
  FOR ALL USING (true);
