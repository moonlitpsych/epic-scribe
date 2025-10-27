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
