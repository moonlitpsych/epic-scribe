-- Add staffing_config to templates table
-- Phase 1: Inline staffing detection for HMHI RCC Intake
-- Created: 2025-10-28

-- Add staffing_config JSONB column to templates
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS staffing_config JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN templates.staffing_config IS
'Configuration for attending physician staffing workflow. Structure:
{
  "mode": "inline" | "separate" | "none",
  "visitTypes": ["Intake", "Transfer of Care", "Follow-up"],
  "markers": ["supervising doctor", "staff this"],
  "weight": "heavy" | "moderate" | "light"
}';

-- Example: Update HMHI RCC Intake template with inline staffing config
-- This will be done via application code after migration
