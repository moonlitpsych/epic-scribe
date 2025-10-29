-- Add fields for final note storage to the generated_notes table
-- This allows storing the final edited version of notes in the database
-- for easy retrieval in future visits

-- Add columns for final note storage
ALTER TABLE generated_notes
ADD COLUMN IF NOT EXISTS final_note_content TEXT,
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id);

-- Create an index for faster retrieval of final notes
CREATE INDEX IF NOT EXISTS idx_generated_notes_is_final
ON generated_notes(is_final)
WHERE is_final = true;

-- Create index for patient-specific final notes (via encounter join)
CREATE INDEX IF NOT EXISTS idx_generated_notes_encounter_final
ON generated_notes(encounter_id, is_final, finalized_at DESC);

-- Add comment explaining the columns
COMMENT ON COLUMN generated_notes.final_note_content IS 'The final edited version of the note, ready for Epic';
COMMENT ON COLUMN generated_notes.is_final IS 'Whether this note has been finalized and approved';
COMMENT ON COLUMN generated_notes.finalized_at IS 'When the note was marked as final';
COMMENT ON COLUMN generated_notes.finalized_by IS 'User who finalized the note';

-- Create a function to get the most recent final notes for a patient
CREATE OR REPLACE FUNCTION get_recent_final_notes_for_patient(
  p_patient_id UUID,
  p_limit INT DEFAULT 3
)
RETURNS TABLE (
  note_id UUID,
  encounter_id UUID,
  setting TEXT,
  visit_type TEXT,
  scheduled_start TIMESTAMPTZ,
  final_note_content TEXT,
  finalized_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gn.id as note_id,
    gn.encounter_id,
    e.setting,
    e.visit_type,
    e.scheduled_start,
    gn.final_note_content,
    gn.finalized_at
  FROM generated_notes gn
  INNER JOIN encounters e ON e.id = gn.encounter_id
  WHERE e.patient_id = p_patient_id
    AND gn.is_final = true
    AND gn.final_note_content IS NOT NULL
  ORDER BY gn.finalized_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_recent_final_notes_for_patient TO authenticated;