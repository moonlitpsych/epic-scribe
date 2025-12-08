-- Migration: Make date_of_birth optional and add age column
-- This allows creating patients with just first/last name
-- DOB and Age are both optional - use whichever is known

-- Make date_of_birth nullable
ALTER TABLE patients ALTER COLUMN date_of_birth DROP NOT NULL;

-- Add age column (nullable integer)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add check constraint for reasonable age values
ALTER TABLE patients ADD CONSTRAINT patients_age_check CHECK (age IS NULL OR (age >= 0 AND age <= 150));

-- Comment on columns for documentation
COMMENT ON COLUMN patients.date_of_birth IS 'Date of birth (optional). Either DOB or age can be used.';
COMMENT ON COLUMN patients.age IS 'Age in years (optional). Use when DOB is not known.';
