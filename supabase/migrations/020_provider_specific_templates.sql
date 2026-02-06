-- ============================================================
-- Provider-Specific IntakeQ Templates
-- ============================================================
-- 1. Assign provider_id to Kyle Roller's existing templates
-- 2. Insert Rufus Sweeney's templates with field mappings
-- 3. Set Rufus's default_template_name in credentials
-- ============================================================

-- ============================================================
-- 1. Assign Kyle Roller's provider_id to his templates
-- ============================================================

UPDATE intakeq_templates
SET provider_id = '06c5f00f-e2c1-46a7-bad1-55c406b1d190'
WHERE name LIKE 'Kyle Roller%';

-- ============================================================
-- 2. Insert Rufus Sweeney's IntakeQ templates
-- ============================================================

-- Rufus Sweeney Intake Note (same structure as Kyle Roller Intake Note)
INSERT INTO intakeq_templates (name, template_type, provider_id, total_contenteditable_fields, description, is_active)
VALUES (
  'Rufus Sweeney Intake Note',
  'intake',
  '08fbcd34-cd5f-425c-85bd-1aeeffbe9694',
  8,
  'Initial psychiatric evaluation template with 13 sections including demographics, HPI, ROS, social history, substance use, medications, MSE, risk assessment, and assessment/plan',
  true
)
ON CONFLICT (name) DO UPDATE SET
  template_type = EXCLUDED.template_type,
  provider_id = EXCLUDED.provider_id,
  total_contenteditable_fields = EXCLUDED.total_contenteditable_fields,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Rufus Sweeney Progress Note (same structure as Kyle Roller Progress Note)
INSERT INTO intakeq_templates (name, template_type, provider_id, total_contenteditable_fields, description, is_active)
VALUES (
  'Rufus Sweeney Progress Note',
  'progress',
  '08fbcd34-cd5f-425c-85bd-1aeeffbe9694',
  3,
  'Follow-up psychiatric visit template with 5 sections: CC, HPI, MSE, and Assessment/Plan',
  true
)
ON CONFLICT (name) DO UPDATE SET
  template_type = EXCLUDED.template_type,
  provider_id = EXCLUDED.provider_id,
  total_contenteditable_fields = EXCLUDED.total_contenteditable_fields,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 3. Insert Rufus Sweeney's IntakeQ credentials
-- ============================================================

INSERT INTO provider_intakeq_credentials (provider_id, login_email, login_password, default_template_name, is_active)
VALUES (
  '08fbcd34-cd5f-425c-85bd-1aeeffbe9694',
  'rufus@trymoonlit.com',
  'mEBNPoi&1V!E',
  'Rufus Sweeney Intake Note',
  true
)
ON CONFLICT (provider_id) DO UPDATE SET
  login_email = EXCLUDED.login_email,
  login_password = EXCLUDED.login_password,
  default_template_name = EXCLUDED.default_template_name,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 4. Field Mappings for Rufus Sweeney's templates
-- ============================================================

DO $$
DECLARE
  rufus_intake_id UUID;
  rufus_progress_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO rufus_intake_id FROM intakeq_templates WHERE name = 'Rufus Sweeney Intake Note';
  SELECT id INTO rufus_progress_id FROM intakeq_templates WHERE name = 'Rufus Sweeney Progress Note';

  -- Delete existing fields (for idempotency)
  DELETE FROM intakeq_template_fields WHERE template_id IN (rufus_intake_id, rufus_progress_id);

  -- ============================================================
  -- Rufus Sweeney Intake Note Field Mappings
  -- (Same structure as Kyle Roller Intake Note)
  -- ============================================================

  -- Chief Complaint (Section 2) - input field
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, placeholder, sort_order
  ) VALUES (
    rufus_intake_id, 'Chief Complaint', 2, 'input',
    NULL, 'CC', 'Chief Complaint', 1
  );

  -- HPI (Section 3) - contenteditable 0
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'History of Present Illness', 3, 'contenteditable',
    0, 'HPI', ARRAY['History (HPI)', 'HPI', 'History'], 2
  );

  -- Psychiatric ROS (Section 4) - contenteditable 1
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'Psychiatric Review of Symptoms', 4, 'contenteditable',
    1, 'Psychiatric Review of Systems', ARRAY['Psychiatric ROS', 'Psych ROS'], 3
  );

  -- Social History (Section 5) - contenteditable 2
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, sort_order
  ) VALUES (
    rufus_intake_id, 'Social History', 5, 'contenteditable',
    2, 'Social History', 4
  );

  -- Substance Use (Section 6) - contenteditable 3
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'Substance Use', 6, 'contenteditable',
    3, 'Substance Use History', ARRAY['Substance Use History', 'Substance Abuse'], 5
  );

  -- Medication History (Section 7) - contenteditable 4
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'Current Medications', 7, 'contenteditable',
    4, 'Medication History', ARRAY['Medications', 'Medication History', 'Past Psychiatric Medications'], 6
  );

  -- Medical ROS (Section 8) - contenteditable 5
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'Review of Systems', 8, 'contenteditable',
    5, 'Medical Review of Systems', ARRAY['Medical Review of Systems', 'Medical ROS', 'ROS'], 7
  );

  -- MSE (Section 10) - contenteditable 6
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'Mental Status Examination', 10, 'contenteditable',
    6, 'Mental Status Exam (MSE)', ARRAY['MSE', 'Mental Status Exam'], 8
  );

  -- Assessment and Plan (Section 13) - contenteditable 7
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_intake_id, 'Assessment and Plan', 13, 'contenteditable',
    7, 'Assessment and Plan', ARRAY['Plan', 'Assessment', 'PLAN', 'FORMULATION'], 9
  );

  -- ============================================================
  -- Rufus Sweeney Progress Note Field Mappings
  -- (Same structure as Kyle Roller Progress Note)
  -- ============================================================

  -- Chief Complaint (Section 2) - input field
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, placeholder, sort_order
  ) VALUES (
    rufus_progress_id, 'Chief Complaint', 2, 'input',
    NULL, 'CC', 'Chief Complaint', 1
  );

  -- HPI (Section 3) - contenteditable 0
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_progress_id, 'History of Present Illness', 3, 'contenteditable',
    0, 'HPI', ARRAY['History (HPI)', 'HPI', 'Interval History'], 2
  );

  -- MSE (Section 4) - contenteditable 1
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_progress_id, 'Mental Status Examination', 4, 'contenteditable',
    1, 'Mental Status Exam (MSE)', ARRAY['MSE', 'Mental Status Exam'], 3
  );

  -- Assessment and Plan (Section 5) - contenteditable 2
  INSERT INTO intakeq_template_fields (
    template_id, epic_scribe_section, intakeq_section_number, field_type,
    contenteditable_index, intakeq_question_text, alternate_names, sort_order
  ) VALUES (
    rufus_progress_id, 'Assessment and Plan', 5, 'contenteditable',
    2, 'Assessment and Plan', ARRAY['Plan', 'Assessment', 'PLAN'], 4
  );

END $$;
