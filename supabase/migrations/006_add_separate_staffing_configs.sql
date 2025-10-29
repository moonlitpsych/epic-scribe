-- Migration 006: Add separate staffing configs for Davis and Redwood
-- Run this in Supabase Dashboard > SQL Editor

-- Update Davis Behavioral Health templates (all visit types)
UPDATE templates
SET
  staffing_config = '{
    "mode": "separate",
    "visitTypes": ["Intake", "Transfer of Care", "Follow-up"],
    "weight": "heavy"
  }'::jsonb,
  version = version + 1,
  updated_at = now()
WHERE
  setting = 'Davis Behavioral Health'
  AND visit_type IN ('Intake', 'Transfer of Care', 'Follow-up')
  AND active = true;

-- Update Redwood Clinic MHI templates (all visit types)
UPDATE templates
SET
  staffing_config = '{
    "mode": "separate",
    "visitTypes": ["Intake", "Transfer of Care", "Follow-up"],
    "weight": "heavy"
  }'::jsonb,
  version = version + 1,
  updated_at = now()
WHERE
  setting = 'Redwood Clinic MHI'
  AND visit_type IN ('Intake', 'Transfer of Care', 'Follow-up')
  AND active = true;

-- Verify the updates
SELECT
  setting,
  visit_type,
  staffing_config,
  version
FROM templates
WHERE setting IN ('Davis Behavioral Health', 'Redwood Clinic MHI')
ORDER BY setting, visit_type;
