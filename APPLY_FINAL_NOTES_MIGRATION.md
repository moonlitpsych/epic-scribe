# Apply Final Notes Storage Migration

## Quick Steps to Enable Final Note Storage

### 1. Open Supabase Dashboard
Go to your project: https://app.supabase.com/project/trdxiqergjlcgpnapodf

### 2. Navigate to SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New query**

### 3. Run the Migration

Copy and paste this entire SQL block into the SQL Editor:

```sql
-- Migration 008: Add final note storage fields
-- This enables storing the final edited version of notes for future reference

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

-- Create index for patient-specific final notes
CREATE INDEX IF NOT EXISTS idx_generated_notes_encounter_final
ON generated_notes(encounter_id, is_final, finalized_at DESC);

-- Add helpful comments
COMMENT ON COLUMN generated_notes.final_note_content IS 'The final edited version of the note, ready for Epic';
COMMENT ON COLUMN generated_notes.is_final IS 'Whether this note has been finalized and approved';
COMMENT ON COLUMN generated_notes.finalized_at IS 'When the note was marked as final';
COMMENT ON COLUMN generated_notes.finalized_by IS 'User who finalized the note';

-- Create a function to get recent final notes for a patient
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_recent_final_notes_for_patient TO authenticated;

-- Verify the migration
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_notes'
AND column_name IN ('final_note_content', 'is_final', 'finalized_at', 'finalized_by');
```

### 4. Click "Run" (or press Cmd+Enter)

You should see:
- **Success. 4 rows returned** (showing the new columns)

### 5. Verify Migration Success

The query results should show:
```
column_name         | data_type
--------------------|-----------------------
final_note_content  | text
is_final           | boolean
finalized_at       | timestamp with time zone
finalized_by       | uuid
```

## What This Migration Enables

✅ **Final Note Storage:** Save the edited version of notes permanently
✅ **Note History:** Track all finalized notes for each patient
✅ **Historical Context:** Use previous notes to improve follow-up generation
✅ **Audit Trail:** Track who finalized each note and when

## Next Steps After Migration

1. **Test locally:**
   ```bash
   cd /Users/macsweeney/Projects/epic-scribe
   pnpm dev
   ```

2. **Test the workflow:**
   - Go to http://localhost:3002/workflow
   - Sign in with Google (you'll see the "unverified app" warning - click Continue)
   - Create or select a patient
   - Generate a note
   - The foundation is now ready for the "Finalize Note" button!

## Troubleshooting

### If you get permission errors:
Make sure you're using the Supabase service role connection or dashboard

### If columns already exist:
The migration is safe to run multiple times (uses IF NOT EXISTS)

### To rollback (if needed):
```sql
ALTER TABLE generated_notes
DROP COLUMN IF EXISTS final_note_content,
DROP COLUMN IF EXISTS is_final,
DROP COLUMN IF EXISTS finalized_at,
DROP COLUMN IF EXISTS finalized_by;

DROP FUNCTION IF EXISTS get_recent_final_notes_for_patient(UUID, INT);
```