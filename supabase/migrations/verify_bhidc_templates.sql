-- Check if BHIDC therapy templates exist in the database
-- Run this in Supabase Dashboard > SQL Editor

SELECT
  template_id,
  name,
  setting,
  visit_type,
  version,
  active,
  created_at
FROM templates
WHERE setting = 'BHIDC therapy'
ORDER BY visit_type;

-- If the query returns 0 rows, BHIDC templates need to be created
-- If it returns rows, you can inspect the template structure
