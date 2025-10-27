# Supabase Migration Guide - Phase 1.5

## Quick Start: Apply Initial Schema (Clean Slate)

Since there were previous tables from another project, we'll start with a clean slate:

### Step 1: Access SQL Editor

1. Open your browser and go to: https://alavxdxxttlfprkiwtrq.supabase.co/project/_/sql
2. Sign in to your Supabase account

### Step 2: Clean Slate (Drop Old Tables)

**IMPORTANT**: This will delete ALL existing data in patients/encounters/generated_notes tables!

1. Click "New Query"
2. Copy the contents of `supabase/migrations/000_clean_slate.sql`
3. Paste into the SQL Editor
4. Click "Run"
5. Verify success (should see "Success. No rows returned")

### Step 3: Apply Fresh Schema

1. Click "New Query" button
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste into the SQL Editor
4. Click "Run" button (or press Cmd/Ctrl + Enter)

### Step 3: Verify Tables Were Created

After running, you should see:
- ✅ 3 tables created: `patients`, `encounters`, `generated_notes`
- ✅ Indexes created
- ✅ RLS policies enabled
- ✅ Triggers created for `updated_at` columns

You can verify by going to the Table Editor tab and checking that these tables exist.

## What This Migration Does

1. **patients table** - Stores patient demographics (PHI data)
   - first_name, last_name, date_of_birth, mrn, notes
   - All patient encounters will reference this table

2. **encounters table** - Links Google Calendar events to patients
   - Stores metadata like setting, visit type, scheduled times
   - Links to Google Drive transcript files via `transcript_file_id`
   - No PHI content stored (transcripts stay in Drive)

3. **generated_notes table** - Tracks generated clinical notes
   - Metadata only (prompt version, hash, template used)
   - Content stored in Google Drive via `drive_file_id`

## Next Steps After Migration

Once the migration is complete, the application will be able to:
1. Create and manage patients
2. Link encounters to specific patients (instead of free-text names)
3. Track note generation history
4. Query patient encounter history

## Troubleshooting

### Migration fails with "already exists" error
If you see errors about tables already existing, they may have been created in a previous run. You can either:
- Drop the tables first: `DROP TABLE IF EXISTS generated_notes, encounters, patients CASCADE;`
- Or skip re-running the migration

### RLS Policy errors
If you get permission errors after migration, make sure:
- You're using the `SUPABASE_SERVICE_ROLE_KEY` for server-side operations
- RLS policies are correctly applied (they should allow all operations for now)
