-- Migration: Add epic_chart_data column to generated_notes
-- Purpose: Store extracted questionnaire scores and medication lists from Epic DotPhrase input

-- Add JSONB column for structured Epic chart data
ALTER TABLE generated_notes
  ADD COLUMN IF NOT EXISTS epic_chart_data JSONB;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_generated_notes_epic_chart_data
  ON generated_notes USING gin(epic_chart_data);

-- Add comment explaining the column structure
COMMENT ON COLUMN generated_notes.epic_chart_data IS
  'Extracted PHQ-9/GAD-7 scores and medication lists from Epic chart. Structure: { questionnaires: { phq9, gad7 }, medications: { current, past }, raw_text_excerpt }';
