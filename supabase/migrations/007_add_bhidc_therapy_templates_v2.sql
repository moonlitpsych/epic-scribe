-- Migration 007: Add BHIDC Therapy Templates (Revised)
-- Therapy-focused note structure with correct visit type naming
-- Run this in Supabase Dashboard > SQL Editor

-- =====================================================
-- BHIDC THERAPY - FIRST VISIT (Initial Therapy Session)
-- =====================================================
INSERT INTO templates (
  template_id,
  name,
  setting,
  visit_type,
  version,
  sections,
  smarttools,
  staffing_config,
  active,
  created_by
) VALUES (
  'bhidc_therapy_first_visit_v1',
  'BHIDC Therapy - First Visit',
  'BHIDC therapy',
  'First Visit',
  1,
  '[
    {
      "order": 1,
      "name": "BHIDC Staff Intake Summary",
      "content": "Summary from BHIDC staff screener intake (if available):\n\n***",
      "exemplar": "Review the BHIDC staff intake note and extract key information: presenting problems, prior treatment history, risk factors, and initial assessment. Summarize the most clinically relevant information that informs treatment planning."
    },
    {
      "order": 2,
      "name": "Diagnostic Impressions",
      "content": "***"
    },
    {
      "order": 3,
      "name": "Presenting Problem",
      "content": "Client''s initial explanation of the problem(s), duration and precipitant cause:\n\n***"
    },
    {
      "order": 4,
      "name": "Pertinent History",
      "content": "Prior therapy (including family, social, psychological, and medical). Include current medications if relevant to therapy:\n\n***"
    },
    {
      "order": 5,
      "name": "Observations",
      "content": "Therapist''s observations of client''s presentation and family interactions:\n\n***"
    },
    {
      "order": 6,
      "name": "Family/Psychosocial Assessment",
      "content": "***"
    },
    {
      "order": 7,
      "name": "Risk",
      "content": "Evidence of potential or actual risk(s):\n\n***"
    },
    {
      "order": 8,
      "name": "Contract/Safety Plan",
      "content": "***"
    },
    {
      "order": 9,
      "name": "Mental Status Examination",
      "content": "Appearance: ***\nOrientation: ***\nBehavior: ***\nSpeech: ***\nAffect: ***\nMood: ***\nThought Process: ***\nThought Content: ***\nInsight: ***\nJudgment: ***"
    },
    {
      "order": 10,
      "name": "Session Focus",
      "content": "***"
    },
    {
      "order": 11,
      "name": "Therapeutic Intervention",
      "content": "Therapy modality and techniques used:\n\n***"
    },
    {
      "order": 12,
      "name": "Planned Intervention",
      "content": "Treatment goals:\n\n***\n\nHomework/between-session tasks:\n\n***\n\nFollow-up: Return in *** for ongoing psychotherapy, or sooner if needed.\n\nRufus Sweeney, MD"
    },
    {
      "order": 13,
      "name": "Client Progress",
      "content": "Initial assessment - baseline established for future progress monitoring."
    }
  ]'::jsonb,
  NULL,
  NULL,
  true,
  'migration_007'
);

-- =====================================================
-- BHIDC THERAPY - FOLLOW-UP (Ongoing Therapy Sessions)
-- =====================================================
INSERT INTO templates (
  template_id,
  name,
  setting,
  visit_type,
  version,
  sections,
  smarttools,
  staffing_config,
  active,
  created_by
) VALUES (
  'bhidc_therapy_followup_v1',
  'BHIDC Therapy - Follow-up',
  'BHIDC therapy',
  'Follow-up',
  1,
  '[
    {
      "order": 1,
      "name": "Interval History",
      "content": "Update since last session:\n\n***"
    },
    {
      "order": 2,
      "name": "Mental Status Examination",
      "content": "Appearance: ***\nOrientation: ***\nBehavior: ***\nSpeech: ***\nAffect: ***\nMood: ***\nThought Process: ***\nThought Content: ***\nInsight: ***\nJudgment: ***"
    },
    {
      "order": 3,
      "name": "Session Focus",
      "content": "***"
    },
    {
      "order": 4,
      "name": "Therapeutic Intervention",
      "content": "Therapy modality and techniques used:\n\n***\n\nClient engagement and response:\n\n***"
    },
    {
      "order": 5,
      "name": "Client Progress",
      "content": "Progress towards treatment goals:\n\n***"
    },
    {
      "order": 6,
      "name": "Planned Intervention",
      "content": "Homework/between-session tasks:\n\n***\n\nFocus for next session:\n\n***\n\nFollow-up: Return in *** for ongoing psychotherapy, or sooner if needed.\n\nRufus Sweeney, MD"
    }
  ]'::jsonb,
  NULL,
  NULL,
  true,
  'migration_007'
);

-- =====================================================
-- VERIFY THE TEMPLATES
-- =====================================================
SELECT
  template_id,
  name,
  setting,
  visit_type,
  version,
  active
FROM templates
WHERE setting = 'BHIDC therapy'
ORDER BY
  CASE visit_type
    WHEN 'First Visit' THEN 1
    WHEN 'Follow-up' THEN 2
  END;
