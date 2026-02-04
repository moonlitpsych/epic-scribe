-- Migration: Add IntakeQ GUID to patients table
-- Purpose: Store IntakeQ client GUID for direct lookup (avoids email-based matching)

-- Add intakeq_guid column to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS intakeq_guid TEXT;

-- Add index for faster lookups by IntakeQ GUID
CREATE INDEX IF NOT EXISTS idx_patients_intakeq_guid ON patients(intakeq_guid)
WHERE intakeq_guid IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN patients.intakeq_guid IS 'IntakeQ client GUID for Moonlit Psychiatry patients. Used for direct API/automation lookups.';
