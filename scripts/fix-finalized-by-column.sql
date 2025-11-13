-- Fix the finalized_by column to store email addresses instead of UUIDs
-- This allows us to track who saved notes using their email address

-- Change the column type from UUID to TEXT
ALTER TABLE generated_notes
ALTER COLUMN finalized_by TYPE TEXT;

-- Update the comment to reflect the correct usage
COMMENT ON COLUMN generated_notes.finalized_by IS 'User email who finalized the note';

-- Verify the change
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'generated_notes'
AND column_name = 'finalized_by';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Column type updated successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'The finalized_by column now accepts email addresses (TEXT).';
    RAISE NOTICE '';
END $$;