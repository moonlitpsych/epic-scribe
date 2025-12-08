-- Migration: Add patient chart data history for longitudinal tracking
-- Purpose: Store PHQ-9, GAD-7 scores and medication history over time
-- This enables the AI to analyze trends and correlate with patient-reported improvements

-- Table for tracking questionnaire scores over time
CREATE TABLE IF NOT EXISTS patient_questionnaire_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_date DATE NOT NULL,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  generated_note_id UUID REFERENCES generated_notes(id) ON DELETE SET NULL,

  -- PHQ-9 Depression Screening
  phq9_score INTEGER CHECK (phq9_score IS NULL OR (phq9_score >= 0 AND phq9_score <= 27)),
  phq9_severity TEXT, -- minimal, mild, moderate, moderately severe, severe

  -- GAD-7 Anxiety Screening
  gad7_score INTEGER CHECK (gad7_score IS NULL OR (gad7_score >= 0 AND gad7_score <= 21)),
  gad7_severity TEXT, -- minimal, mild, moderate, severe

  -- Additional questionnaires can be added here
  -- columbia_score INTEGER, -- C-SSRS
  -- pcl5_score INTEGER, -- PTSD Checklist

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one entry per patient per encounter date
  UNIQUE (patient_id, encounter_date)
);

-- Table for tracking medication history over time
CREATE TABLE IF NOT EXISTS patient_medication_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  generated_note_id UUID REFERENCES generated_notes(id) ON DELETE SET NULL,

  -- Current medications at time of encounter (JSONB array)
  current_medications JSONB, -- [{name, dose, frequency, start_date?}]

  -- Past/discontinued medications mentioned (JSONB array)
  past_medications JSONB, -- [{name, dose?, reason_discontinued?, response?}]

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one entry per patient per date
  UNIQUE (patient_id, recorded_date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_questionnaire_history_patient
  ON patient_questionnaire_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_history_date
  ON patient_questionnaire_history(patient_id, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_medication_history_patient
  ON patient_medication_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_history_date
  ON patient_medication_history(patient_id, recorded_date DESC);

-- Enable RLS
ALTER TABLE patient_questionnaire_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medication_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-user MVP)
CREATE POLICY "Allow all operations for authenticated users"
  ON patient_questionnaire_history FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users"
  ON patient_medication_history FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE patient_questionnaire_history IS
  'Longitudinal tracking of PHQ-9, GAD-7, and other questionnaire scores for trend analysis';
COMMENT ON TABLE patient_medication_history IS
  'Longitudinal tracking of current and past medications for treatment history analysis';
COMMENT ON COLUMN patient_questionnaire_history.phq9_severity IS
  'PHQ-9 severity: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe';
COMMENT ON COLUMN patient_questionnaire_history.gad7_severity IS
  'GAD-7 severity: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe';
