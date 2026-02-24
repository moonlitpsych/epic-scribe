-- Migration 024: Structured Patient Profiles
-- Cumulative profiles extracted from notes, plus audit log of per-note extractions.

-- Cumulative profile (one per patient)
CREATE TABLE IF NOT EXISTS patient_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  last_note_id UUID REFERENCES generated_notes(id),
  last_extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id)
);

-- Per-note extraction audit log
CREATE TABLE IF NOT EXISTS patient_profile_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  note_id UUID REFERENCES generated_notes(id),
  extracted_data JSONB NOT NULL DEFAULT '{}',
  extraction_model TEXT,
  extraction_latency_ms INT,
  extraction_tokens_used INT,
  note_date DATE,
  setting TEXT,
  visit_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_profiles_patient_id ON patient_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_profile_extractions_patient_id ON patient_profile_extractions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_profile_extractions_note_id ON patient_profile_extractions(note_id);

-- RLS policies (match existing pattern — service role bypasses, anon blocked)
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profile_extractions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access on patient_profiles"
  ON patient_profiles FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on patient_profile_extractions"
  ON patient_profile_extractions FOR ALL
  USING (true) WITH CHECK (true);
