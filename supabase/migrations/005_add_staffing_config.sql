-- Migration 005: Add staffing_config to templates table
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Add the staffing_config column
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS staffing_config JSONB;

-- Step 2: Add comment explaining the structure
COMMENT ON COLUMN templates.staffing_config IS
'Configuration for attending physician staffing workflow. Structure:
{
  "mode": "inline" | "separate" | "none",
  "visitTypes": ["Intake", "Transfer of Care", "Follow-up"],
  "markers": ["supervising doctor", "staff this"],
  "weight": "heavy" | "moderate" | "light"
}';

-- Step 3: Update HMHI RCC Intake template with inline staffing config
UPDATE templates
SET
  staffing_config = '{
    "mode": "inline",
    "visitTypes": ["Intake"],
    "markers": [
      "supervising doctor",
      "staff this",
      "talk with my attending",
      "discuss with my supervisor",
      "go talk with"
    ],
    "weight": "heavy"
  }'::jsonb,
  version = version + 1,
  updated_at = now()
WHERE
  setting = 'HMHI Downtown RCC'
  AND visit_type = 'Intake'
  AND active = true;

-- Step 4: Verify the update
SELECT
  template_id,
  name,
  setting,
  visit_type,
  staffing_config,
  version
FROM templates
WHERE setting = 'HMHI Downtown RCC' AND visit_type = 'Intake';
