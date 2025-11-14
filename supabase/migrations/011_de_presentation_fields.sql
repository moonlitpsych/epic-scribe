-- Migration: Add structured presentation fields for Designated Examiner court presentations
-- This extends the DE reports table to support the full courtroom presentation workflow

-- Add structured presentation fields to designated_examiner_reports
ALTER TABLE designated_examiner_reports ADD COLUMN IF NOT EXISTS presentation_data JSONB;

-- The presentation_data JSON will contain:
-- {
--   "one_liner": "string",
--   "demographics": {
--     "age": "string",
--     "sex": "string",
--     "psychiatric_diagnoses": "string"
--   },
--   "admission": {
--     "reason": "string",
--     "commitment_reason": "string"
--   },
--   "initial_presentation": "string (2-4 week journey)",
--   "relevant_history": {
--     "previous_admissions": "string",
--     "suicide_attempts": "string",
--     "violence_history": "string",
--     "substance_use": "string",
--     "social_history": "string"
--   },
--   "medications": {
--     "prior": ["array of medication strings"],
--     "current": ["array of medication strings"]
--   },
--   "hospital_course": {
--     "improvement": "string",
--     "medication_compliance": "string",
--     "special_interventions": "string",
--     "activities": "string"
--   },
--   "interview": {
--     "objective": {
--       "thought_process": "string",
--       "orientation": "string"
--     },
--     "subjective": {
--       "insight": "string",
--       "follow_up_plan": "string"
--     }
--   },
--   "criteria_evidence": {
--     "criterion_1": "string",
--     "criterion_2": "string",
--     "criterion_3": "string",
--     "criterion_4": "string",
--     "criterion_5": "string"
--   }
-- }

-- Add fields for managing presentations
ALTER TABLE designated_examiner_reports
  ADD COLUMN IF NOT EXISTS presentation_status VARCHAR(20) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS last_edited_section VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_enhanced_sections TEXT[],
  ADD COLUMN IF NOT EXISTS export_settings JSONB;

-- Create check constraint for presentation status
ALTER TABLE designated_examiner_reports
  DROP CONSTRAINT IF EXISTS presentation_status_check;
ALTER TABLE designated_examiner_reports
  ADD CONSTRAINT presentation_status_check
  CHECK (presentation_status IN ('draft', 'ready', 'presented', 'archived'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_de_reports_presentation_status
  ON designated_examiner_reports (presentation_status, created_at DESC);

-- Create table for presentation templates
CREATE TABLE IF NOT EXISTS de_presentation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  commitment_type VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for presentation templates
ALTER TABLE de_presentation_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own templates
CREATE POLICY "Users can view own templates" ON de_presentation_templates
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own templates
CREATE POLICY "Users can create own templates" ON de_presentation_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON de_presentation_templates
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON de_presentation_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for template queries
CREATE INDEX IF NOT EXISTS idx_de_templates_user
  ON de_presentation_templates (user_id, is_default DESC, created_at DESC);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for de_presentation_templates
DROP TRIGGER IF EXISTS update_de_templates_updated_at ON de_presentation_templates;
CREATE TRIGGER update_de_templates_updated_at
  BEFORE UPDATE ON de_presentation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for designated_examiner_reports updated_at
DROP TRIGGER IF EXISTS update_de_reports_updated_at ON designated_examiner_reports;
CREATE TRIGGER update_de_reports_updated_at
  BEFORE UPDATE ON designated_examiner_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON COLUMN designated_examiner_reports.presentation_data IS 'Structured JSON data for court presentation sections';
COMMENT ON COLUMN designated_examiner_reports.presentation_status IS 'Status of presentation: draft, ready, presented, or archived';
COMMENT ON COLUMN designated_examiner_reports.ai_enhanced_sections IS 'Array of section names that have been enhanced with AI';
COMMENT ON COLUMN designated_examiner_reports.export_settings IS 'User preferences for PDF/export formatting';
COMMENT ON TABLE de_presentation_templates IS 'Reusable templates for DE court presentations';

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'DE Presentation Fields Migration Complete';
  RAISE NOTICE 'Added presentation_data JSONB column for structured court presentation';
  RAISE NOTICE 'Created de_presentation_templates table for reusable templates';
  RAISE NOTICE 'All RLS policies configured for user-scoped access';
END $$;