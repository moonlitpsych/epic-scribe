-- Migration: 009_designated_examiner.sql
-- Description: Create table and supporting infrastructure for designated examiner reports
-- Created: 2025-10-29
-- Purpose: Store involuntary commitment assessments for Utah mental health court

-- Create designated_examiner_reports table
CREATE TABLE IF NOT EXISTS designated_examiner_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,

  -- Report metadata
  hearing_date DATE,
  commitment_type VARCHAR(50), -- '30-day', '60-day', '90-day'
  hospital VARCHAR(255) DEFAULT 'Huntsman Mental Health Institute',

  -- Interview content
  transcript TEXT NOT NULL,
  cheat_sheet_notes TEXT, -- User's handwritten notes from interview
  clinical_notes TEXT, -- Prior clinical notes to support commitment argument

  -- Generated assessment
  generated_argument TEXT NOT NULL,
  final_argument TEXT, -- User-edited version

  -- Commitment criteria assessment (parsed from generated text)
  meets_criterion_1 BOOLEAN, -- Mental illness
  meets_criterion_2 BOOLEAN, -- Danger/inability to care for self
  meets_criterion_3 BOOLEAN, -- Lacks rational decision-making
  meets_criterion_4 BOOLEAN, -- No less restrictive alternative
  meets_criterion_5 BOOLEAN, -- Adequate care available

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id)
);

-- Create indexes for quick lookup
CREATE INDEX idx_de_reports_patient ON designated_examiner_reports(patient_id);
CREATE INDEX idx_de_reports_hearing_date ON designated_examiner_reports(hearing_date);
CREATE INDEX idx_de_reports_finalized_by ON designated_examiner_reports(finalized_by);
CREATE INDEX idx_de_reports_created_at ON designated_examiner_reports(created_at);

-- Enable RLS
ALTER TABLE designated_examiner_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own DE reports
CREATE POLICY "Users can view own DE reports"
  ON designated_examiner_reports FOR SELECT
  USING (finalized_by = auth.uid());

-- Users can insert their own DE reports
CREATE POLICY "Users can insert own DE reports"
  ON designated_examiner_reports FOR INSERT
  WITH CHECK (finalized_by = auth.uid());

-- Users can update their own DE reports
CREATE POLICY "Users can update own DE reports"
  ON designated_examiner_reports FOR UPDATE
  USING (finalized_by = auth.uid());

-- Users can delete their own DE reports
CREATE POLICY "Users can delete own DE reports"
  ON designated_examiner_reports FOR DELETE
  USING (finalized_by = auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON designated_examiner_reports TO authenticated;

-- Grant full access to service role
GRANT ALL ON designated_examiner_reports TO service_role;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_de_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_de_report_updated_at_trigger
  BEFORE UPDATE ON designated_examiner_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_de_report_updated_at();

-- Add comment for documentation
COMMENT ON TABLE designated_examiner_reports IS 'Stores designated examiner reports for involuntary psychiatric commitment assessments in Utah mental health court';
COMMENT ON COLUMN designated_examiner_reports.meets_criterion_1 IS 'Utah Criterion 1: The person has a mental illness';
COMMENT ON COLUMN designated_examiner_reports.meets_criterion_2 IS 'Utah Criterion 2: The person poses substantial danger to self/others OR cannot provide for basic needs';
COMMENT ON COLUMN designated_examiner_reports.meets_criterion_3 IS 'Utah Criterion 3: The person lacks ability to make rational decisions about treatment';
COMMENT ON COLUMN designated_examiner_reports.meets_criterion_4 IS 'Utah Criterion 4: No less restrictive alternative to inpatient treatment is available';
COMMENT ON COLUMN designated_examiner_reports.meets_criterion_5 IS 'Utah Criterion 5: Local Mental Health Authority can provide adequate and appropriate treatment';
COMMENT ON COLUMN designated_examiner_reports.clinical_notes IS 'Prior clinical notes provided by user to support commitment argument (e.g., history of failed outpatient treatment, prior hospitalizations, documented safety concerns)';
