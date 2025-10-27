# How to Apply Supabase Migration

## Quick Fix for Missing Columns Error

If you're seeing errors like:
- `Could not find the 'notes' column of 'patients' in the schema cache`
- `column patients.active does not exist`

Follow these steps:

## Steps to Fix

### 1. Open Supabase Dashboard
Go to: https://app.supabase.com/project/YOUR_PROJECT_ID

### 2. Navigate to SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New query**

### 3. Copy and Run the Migration SQL

Copy this entire SQL block and paste it into the SQL Editor:

```sql
-- Migration to add missing columns to patients table
-- This migration is safe to run multiple times (IF NOT EXISTS)

-- Add notes column if it doesn't exist
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add active column if it doesn't exist
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add index for active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_patients_active'
    ) THEN
        CREATE INDEX idx_patients_active ON patients(active);
    END IF;
END $$;

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate trigger (safe to run multiple times)
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Click "Run" (or press `Cmd + Enter` on Mac / `Ctrl + Enter` on Windows)

You should see: **Success. No rows returned**

### 5. Verify the Schema

Run this query to verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
```

You should see both `notes` and `active` columns in the results.

### 6. Refresh Your App

After the migration runs successfully:
1. Go back to http://localhost:3002
2. Try creating a patient again
3. The errors should be gone!

---

## Alternative: psql Command Line (Advanced)

If you prefer using the command line:

```bash
psql "YOUR_SUPABASE_CONNECTION_STRING" -f supabase/migrations/003_add_missing_patient_columns.sql
```

Replace `YOUR_SUPABASE_CONNECTION_STRING` with your actual connection string from Supabase project settings.
