-- 032_lab_phase2.sql
-- Phase 2: Lab Order Stager + Execution infrastructure

-- A. Add execution columns to staged_actions
ALTER TABLE staged_actions ADD COLUMN IF NOT EXISTS execution_result JSONB;
ALTER TABLE staged_actions ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE staged_actions ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;

-- B. Add encounter/action linkage to lab_requisitions
ALTER TABLE lab_requisitions ADD COLUMN IF NOT EXISTS encounter_id UUID;
ALTER TABLE lab_requisitions ADD COLUMN IF NOT EXISTS staged_action_id UUID;

-- C. Insert 12 additional lab tests (psychiatric/metabolic)
INSERT INTO lab_tests (id, name, labcorp_code, cpt_code, category, is_psychiatric, requires_fasting, is_active)
VALUES
  (gen_random_uuid(), 'Carbamazepine Level', '001032', '80156', 'therapeutic_drug_monitoring', true, false, true),
  (gen_random_uuid(), 'Lamotrigine Level', '080357', '80175', 'therapeutic_drug_monitoring', true, false, true),
  (gen_random_uuid(), 'Basic Metabolic Panel (BMP)', '322777', '80048', 'chemistry', false, true, true),
  (gen_random_uuid(), 'Free T4', '001974', '84439', 'endocrine', false, false, true),
  (gen_random_uuid(), 'Hepatic Function Panel', '322755', '80076', 'chemistry', false, false, true),
  (gen_random_uuid(), 'Renal Function Panel', '322001', '80069', 'chemistry', false, false, true),
  (gen_random_uuid(), 'Drug Screen, Urine', '729406', '80307', 'toxicology', true, false, true),
  (gen_random_uuid(), 'Ethanol, Blood', '001198', '80320', 'toxicology', true, false, true),
  (gen_random_uuid(), 'Folate, Serum', '000810', '82746', 'chemistry', false, true, true),
  (gen_random_uuid(), 'Ferritin', '004598', '82728', 'chemistry', false, false, true),
  (gen_random_uuid(), 'Iron and TIBC', '167197', '83540', 'chemistry', false, true, true),
  (gen_random_uuid(), 'Magnesium', '001537', '83735', 'chemistry', false, false, true)
ON CONFLICT DO NOTHING;
