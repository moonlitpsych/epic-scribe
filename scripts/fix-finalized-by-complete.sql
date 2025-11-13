-- Complete fix for the finalized_by column
-- This handles the foreign key constraint issue

-- Step 1: Drop the foreign key constraint that's causing the issue
ALTER TABLE generated_notes
DROP CONSTRAINT IF EXISTS generated_notes_finalized_by_fkey;

-- Step 2: Change the column type from UUID to TEXT
ALTER TABLE generated_notes
ALTER COLUMN finalized_by TYPE TEXT;

-- Step 3: Update the comment to reflect the correct usage
COMMENT ON COLUMN generated_notes.finalized_by IS 'User email who finalized the note (no FK constraint)';

-- Step 4: Verify the change
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
    RAISE NOTICE 'Foreign key constraint has been removed.';
    RAISE NOTICE '';
END $$;