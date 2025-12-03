-- Migration 007: Add BHIDC Therapy Templates
-- Therapy-focused note structure matching TheraNest workflow
-- Run this in Supabase Dashboard > SQL Editor

-- =====================================================
-- BHIDC THERAPY - INTAKE (Initial Therapy Note)
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
  'bhidc_therapy_intake_v1',
  'BHIDC Therapy - Intake',
  'BHIDC therapy',
  'Intake',
  1,
  '[
    {
      "order": 1,
      "name": "Diagnostic Impressions",
      "content": "***"
    },
    {
      "order": 2,
      "name": "Presenting Problem",
      "content": "Client''s initial explanation of the problem(s), duration and precipitant cause:\n\n***"
    },
    {
      "order": 3,
      "name": "Pertinent History",
      "content": "Prior therapy (including family, social, psychological, and medical):\n\n***"
    },
    {
      "order": 4,
      "name": "Observations",
      "content": "Therapist''s observations of client''s presentation and family interactions:\n\n***"
    },
    {
      "order": 5,
      "name": "Family/Psychosocial Assessment",
      "content": "***"
    },
    {
      "order": 6,
      "name": "Risk",
      "content": "Evidence of potential or actual risk(s):\n\n***"
    },
    {
      "order": 7,
      "name": "Contract/Safety Plan",
      "content": "***"
    },
    {
      "order": 8,
      "name": "Mental Status Examination",
      "content": "Appearance: ***\nOrientation: ***\nBehavior: ***\nSpeech: ***\nAffect: ***\nMood: ***\nThought Process: ***\nThought Content: ***\nInsight: ***\nJudgment: ***"
    },
    {
      "order": 9,
      "name": "Session Focus",
      "content": "***"
    },
    {
      "order": 10,
      "name": "Therapeutic Intervention",
      "content": "Therapy modality and techniques used:\n\n***\n\nDuration: *** minutes"
    },
    {
      "order": 11,
      "name": "Planned Intervention",
      "content": "Treatment goals:\n\n***\n\nHomework/between-session tasks:\n\n***\n\nFollow-up: Return in *** for ongoing psychotherapy, or sooner if needed.\n\nRufus Sweeney, MD"
    },
    {
      "order": 12,
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
  'bhidc_therapy_fu_v1',
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
      "content": "Therapy modality and techniques used:\n\n***\n\nClient engagement and response:\n\n***\n\nDuration: *** minutes"
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
-- BHIDC THERAPY - TRANSFER OF CARE (Optional)
-- =====================================================
-- Note: Only create if you actually use TOC for therapy patients
-- Otherwise, you can skip this template

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
  'bhidc_therapy_toc_v1',
  'BHIDC Therapy - Transfer of Care',
  'BHIDC therapy',
  'Transfer of Care',
  1,
  '[
    {
      "order": 1,
      "name": "Presenting Problem",
      "content": "Client''s explanation of current concerns and reason for transfer:\n\n***"
    },
    {
      "order": 2,
      "name": "Prior Treatment History",
      "content": "Previous provider(s) and treatment summary:\n\n***\n\nReason for transfer:\n\n***"
    },
    {
      "order": 3,
      "name": "Current Status",
      "content": "***"
    },
    {
      "order": 4,
      "name": "Mental Status Examination",
      "content": "Appearance: ***\nOrientation: ***\nBehavior: ***\nSpeech: ***\nAffect: ***\nMood: ***\nThought Process: ***\nThought Content: ***\nInsight: ***\nJudgment: ***"
    },
    {
      "order": 5,
      "name": "Session Focus",
      "content": "***"
    },
    {
      "order": 6,
      "name": "Therapeutic Intervention",
      "content": "Therapy modality and techniques used:\n\n***\n\nDuration: *** minutes"
    },
    {
      "order": 7,
      "name": "Planned Intervention",
      "content": "Updated treatment goals:\n\n***\n\nHomework/between-session tasks:\n\n***\n\nFollow-up: Return in *** for ongoing psychotherapy, or sooner if needed.\n\nRufus Sweeney, MD"
    },
    {
      "order": 8,
      "name": "Client Progress",
      "content": "Baseline for new treatment relationship established."
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
ORDER BY visit_type;
