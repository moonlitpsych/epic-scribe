-- Migration Script: Add note content fields to generated_notes table
-- This script adds the necessary columns for saving and persisting generated notes
-- Run this in your Supabase Dashboard > SQL Editor

-- First, check if the columns already exist to avoid errors
DO $$
BEGIN
    -- Add generated_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_notes'
                   AND column_name = 'generated_content') THEN
        ALTER TABLE generated_notes ADD COLUMN generated_content TEXT;
        RAISE NOTICE 'Added column: generated_content';
    ELSE
        RAISE NOTICE 'Column already exists: generated_content';
    END IF;

    -- Add final_note_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_notes'
                   AND column_name = 'final_note_content') THEN
        ALTER TABLE generated_notes ADD COLUMN final_note_content TEXT;
        RAISE NOTICE 'Added column: final_note_content';
    ELSE
        RAISE NOTICE 'Column already exists: final_note_content';
    END IF;

    -- Add is_final column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_notes'
                   AND column_name = 'is_final') THEN
        ALTER TABLE generated_notes ADD COLUMN is_final BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added column: is_final';
    ELSE
        RAISE NOTICE 'Column already exists: is_final';
    END IF;

    -- Add finalized_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_notes'
                   AND column_name = 'finalized_at') THEN
        ALTER TABLE generated_notes ADD COLUMN finalized_at TIMESTAMPTZ;
        RAISE NOTICE 'Added column: finalized_at';
    ELSE
        RAISE NOTICE 'Column already exists: finalized_at';
    END IF;

    -- Add finalized_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'generated_notes'
                   AND column_name = 'finalized_by') THEN
        ALTER TABLE generated_notes ADD COLUMN finalized_by TEXT;
        RAISE NOTICE 'Added column: finalized_by';
    ELSE
        RAISE NOTICE 'Column already exists: finalized_by';
    END IF;
END $$;

-- Add index for querying finalized notes by patient (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_generated_notes_patient_final
ON generated_notes(encounter_id, is_final, finalized_at DESC)
WHERE is_final = true;

-- Add comments for documentation
COMMENT ON COLUMN generated_notes.generated_content IS 'Raw generated note content from LLM';
COMMENT ON COLUMN generated_notes.final_note_content IS 'Edited and finalized note content ready for Epic';
COMMENT ON COLUMN generated_notes.is_final IS 'Whether this note has been finalized and saved';
COMMENT ON COLUMN generated_notes.finalized_at IS 'Timestamp when note was finalized';
COMMENT ON COLUMN generated_notes.finalized_by IS 'User email who finalized the note';

-- Verify the columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'generated_notes'
AND column_name IN ('generated_content', 'final_note_content', 'is_final', 'finalized_at', 'finalized_by')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'The generated_notes table now has all required columns for saving notes.';
    RAISE NOTICE 'You can now save generated notes to patients for future reference.';
    RAISE NOTICE '';
END $$;