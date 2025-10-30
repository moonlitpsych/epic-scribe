-- Migration 010: Add note content fields to generated_notes table
-- Allows storing generated and finalized note content in database
-- Run this in Supabase Dashboard > SQL Editor

-- Add columns for note content
ALTER TABLE generated_notes
ADD COLUMN IF NOT EXISTS generated_content TEXT,
ADD COLUMN IF NOT EXISTS final_note_content TEXT,
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_by TEXT;

-- Add index for querying finalized notes by patient
CREATE INDEX IF NOT EXISTS idx_generated_notes_patient_final
ON generated_notes(encounter_id, is_final, finalized_at DESC)
WHERE is_final = true;

-- Comment on columns for documentation
COMMENT ON COLUMN generated_notes.generated_content IS 'Raw generated note content from LLM';
COMMENT ON COLUMN generated_notes.final_note_content IS 'Edited and finalized note content ready for Epic';
COMMENT ON COLUMN generated_notes.is_final IS 'Whether this note has been finalized and saved';
COMMENT ON COLUMN generated_notes.finalized_at IS 'Timestamp when note was finalized';
COMMENT ON COLUMN generated_notes.finalized_by IS 'User email who finalized the note';
