# Fix Note Saving Issue - Quick Guide

## Problem
You're seeing "Unable to save note to database" with a 500 error when trying to save generated notes.

## Root Cause
The database is missing required columns for saving note content. A migration needs to be applied to add these columns.

## Solution - Apply Database Migration

### Step 1: Open Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your Epic Scribe project
3. Navigate to the **SQL Editor** (in the left sidebar)

### Step 2: Run the Migration Script
1. Click "New Query" to create a new SQL query
2. Copy the entire contents of one of these files:
   - **Recommended**: `scripts/apply-note-migration.sql` (safer, with checks)
   - Alternative: `supabase/migrations/010_add_note_content_fields.sql`
3. Paste the SQL into the query editor
4. Click "Run" to execute the migration

### Step 3: Verify the Migration
After running the script, you should see:
- Success messages in the output
- A table showing the newly added columns:
  - `generated_content` - Stores the raw AI-generated note
  - `final_note_content` - Stores your edited version
  - `is_final` - Marks notes as finalized
  - `finalized_at` - Timestamp of when saved
  - `finalized_by` - Email of who saved it

### Step 4: Test Note Saving
1. Go back to your Epic Scribe app
2. Navigate to `/workflow`
3. Generate a note for a patient
4. Click "Save Note" button
5. The note should now save successfully!

## What the Fix Does

The migration adds essential columns to the `generated_notes` table that allow:
- **Storing generated notes**: The raw output from the AI is preserved
- **Storing edited notes**: Your final edited version is saved separately
- **Tracking changes**: The system knows what was edited
- **Historical context**: Saved notes are used as context for future visits with the same patient
- **Audit trail**: Tracks who saved notes and when

## Features After Fix

Once the migration is applied, you'll be able to:
1. **Save notes to patients**: Click "Save Note" after generating/editing
2. **View patient history**: All saved notes are associated with the patient
3. **Use historical context**: When generating future notes for the same patient, previous notes are automatically included for continuity of care
4. **Track edits**: The system preserves both the original AI output and your edited version

## Troubleshooting

### If you still see errors after applying the migration:

1. **Clear browser cache**: Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. **Check authentication**: Make sure you're signed in (you should see your email in the top right)
3. **Verify patient selection**: Ensure a patient is selected before trying to save
4. **Check console**: Open browser DevTools (F12) and check the Console tab for detailed error messages

### Common Issues:

- **"Unauthorized" error**: You need to sign in first
- **"Missing required fields" error**: Make sure you've generated a note before trying to save
- **"Database error" persists**: Double-check that the migration ran successfully in Supabase

## Enhanced Error Messages

The app now provides clearer error messages:
- If the migration hasn't been run, you'll see a specific message about running the migration
- Authentication issues show a sign-in prompt
- Your notes are automatically backed up in the browser, so you won't lose work even if saving fails

## Need Help?

If you continue to experience issues:
1. Check the browser console for detailed error logs
2. Verify the migration columns exist in Supabase (Table Editor → generated_notes table)
3. Check that all environment variables are set correctly in `.env.local`

The note saving feature is critical for maintaining patient history and continuity of care. Once this migration is applied, all generated notes will be properly saved and associated with patients for future reference.