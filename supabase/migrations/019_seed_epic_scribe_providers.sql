-- ============================================================
-- Seed Data for Epic Scribe Multi-Provider Support
-- ============================================================
-- Links initial users to providers and seeds IntakeQ templates
-- ============================================================

-- ============================================================
-- 1. Link NextAuth users to providers
-- ============================================================

-- Rufus Sweeney (Admin)
INSERT INTO epic_scribe_user_providers (nextauth_user_email, provider_id, is_admin)
VALUES ('rufussweeney@gmail.com', '08fbcd34-cd5f-425c-85bd-1aeeffbe9694', true)
ON CONFLICT (nextauth_user_email) DO UPDATE SET
  provider_id = EXCLUDED.provider_id,
  is_admin = EXCLUDED.is_admin;

-- Merrick Reynolds
INSERT INTO epic_scribe_user_providers (nextauth_user_email, provider_id, is_admin)
VALUES ('merricksreynolds@gmail.com', 'bc0fc904-7cc9-4d22-a094-6a0eb482128d', false)
ON CONFLICT (nextauth_user_email) DO UPDATE SET
  provider_id = EXCLUDED.provider_id,
  is_admin = EXCLUDED.is_admin;

-- Kyle Roller (Attending for co-signing)
INSERT INTO epic_scribe_user_providers (nextauth_user_email, provider_id, is_admin)
VALUES ('bigrollerdad@gmail.com', '06c5f00f-e2c1-46a7-bad1-55c406b1d190', false)
ON CONFLICT (nextauth_user_email) DO UPDATE SET
  provider_id = EXCLUDED.provider_id,
  is_admin = EXCLUDED.is_admin;

-- ============================================================
-- 2. IntakeQ Templates
-- ============================================================

-- Kyle Roller Intake Note
INSERT INTO intakeq_templates (name, template_type, total_contenteditable_fields, description, is_active)
VALUES (
  'Kyle Roller Intake Note',
  'intake',
  8,
  'Initial psychiatric evaluation template with 13 sections including demographics, HPI, ROS, social history, substance use, medications, MSE, risk assessment, and assessment/plan',
  true
)
ON CONFLICT (name) DO UPDATE SET
  template_type = EXCLUDED.template_type,
  total_contenteditable_fields = EXCLUDED.total_contenteditable_fields,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Kyle Roller Progress Note
INSERT INTO intakeq_templates (name, template_type, total_contenteditable_fields, description, is_active)
VALUES (
  'Kyle Roller Progress Note',
  'progress',
  3,
  'Follow-up psychiatric visit template with 5 sections: CC, HPI, MSE, and Assessment/Plan',
  true
)
ON CONFLICT (name) DO UPDATE SET
  template_type = EXCLUDED.template_type,
  total_contenteditable_fields = EXCLUDED.total_contenteditable_fields,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 3. Field Mappings for Kyle Roller Intake Note
-- ============================================================

-- Get the template ID for field mappings
DO $$
DECLARE
  intake_template_id UUID;
  progress_template_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO intake_template_id FROM intakeq_templates WHERE name = 'Kyle Roller Intake Note';
  SELECT id INTO progress_template_id FROM intakeq_templates WHERE name = 'Kyle Roller Progress Note';

  -- Delete existing fields (for idempotency)
  DELETE FROM intakeq_template_fields WHERE template_id IN (intake_template_id, progress_template_id);

  -- ============================================================
  -- Kyle Roller Intake Note Field Mappings
  -- ============================================================

  -- Chief Complaint (Section 2) - input field
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, placeholder, sort_order
  ) VALUES (
    intake_template_id, 'Chief Complaint', 2, 'input',
    NULL, 'CC', 'Chief Complaint', 1
  );

  -- HPI (Section 3) - contenteditable 0
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'History of Present Illness', 3, 'contenteditable',
    0, 'HPI', ARRAY['History (HPI)', 'HPI', 'History'], 2
  );

  -- Psychiatric ROS (Section 4) - contenteditable 1
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'Psychiatric Review of Symptoms', 4, 'contenteditable',
    1, 'Psychiatric Review of Systems', ARRAY['Psychiatric ROS', 'Psych ROS'], 3
  );

  -- Social History (Section 5) - contenteditable 2
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, sort_order
  ) VALUES (
    intake_template_id, 'Social History', 5, 'contenteditable',
    2, 'Social History', 4
  );

  -- Substance Use (Section 6) - contenteditable 3
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'Substance Use', 6, 'contenteditable',
    3, 'Substance Use History', ARRAY['Substance Use History', 'Substance Abuse'], 5
  );

  -- Medication History (Section 7) - contenteditable 4
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'Current Medications', 7, 'contenteditable',
    4, 'Medication History', ARRAY['Medications', 'Medication History', 'Past Psychiatric Medications'], 6
  );

  -- Medical ROS (Section 8) - contenteditable 5
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'Review of Systems', 8, 'contenteditable',
    5, 'Medical Review of Systems', ARRAY['Medical Review of Systems', 'Medical ROS', 'ROS'], 7
  );

  -- MSE (Section 10) - contenteditable 6
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'Mental Status Examination', 10, 'contenteditable',
    6, 'Mental Status Exam (MSE)', ARRAY['MSE', 'Mental Status Exam'], 8
  );

  -- Assessment and Plan (Section 13) - contenteditable 7
  -- Note: Risk Assessment is combined into this section
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    intake_template_id, 'Assessment and Plan', 13, 'contenteditable',
    7, 'Assessment and Plan', ARRAY['Plan', 'Assessment', 'PLAN', 'FORMULATION'], 9
  );

  -- ============================================================
  -- Kyle Roller Progress Note Field Mappings
  -- ============================================================

  -- Chief Complaint (Section 2) - input field
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, placeholder, sort_order
  ) VALUES (
    progress_template_id, 'Chief Complaint', 2, 'input',
    NULL, 'CC', 'Chief Complaint', 1
  );

  -- HPI (Section 3) - contenteditable 0
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    progress_template_id, 'History of Present Illness', 3, 'contenteditable',
    0, 'HPI', ARRAY['History (HPI)', 'HPI', 'Interval History'], 2
  );

  -- MSE (Section 4) - contenteditable 1
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    progress_template_id, 'Mental Status Examination', 4, 'contenteditable',
    1, 'Mental Status Exam (MSE)', ARRAY['MSE', 'Mental Status Exam'], 3
  );

  -- Assessment and Plan (Section 5) - contenteditable 2
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    progress_template_id, 'Assessment and Plan', 5, 'contenteditable',
    2, 'Assessment and Plan', ARRAY['Plan', 'Assessment', 'PLAN'], 4
  );

END $$;

-- ============================================================
-- Verification
-- ============================================================
-- Run these queries to verify the seed data:
-- SELECT * FROM epic_scribe_user_providers;
-- SELECT * FROM intakeq_templates;
-- SELECT t.name, f.epic_scribe_section, f.intakeq_section_number, f.contenteditable_index
--   FROM intakeq_templates t
--   JOIN intakeq_template_fields f ON t.id = f.template_id
--   ORDER BY t.name, f.sort_order;
