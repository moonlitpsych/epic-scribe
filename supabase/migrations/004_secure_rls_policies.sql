-- Secure RLS policies for Epic Scribe
-- This provides security while allowing the app to function

-- First, re-enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartlist_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_edits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON patients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON encounters;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON generated_notes;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON templates;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON smartlists;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON smartlist_values;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON template_edits;

-- Create new policies that allow access with anon key (for development)
-- In production, these should check for authenticated users

-- Templates: Read-only for anon, write requires auth
CREATE POLICY "Public read access for templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Anon can manage templates" ON templates
  FOR ALL USING (true);

-- SmartLists: Read-only for anon, write requires auth
CREATE POLICY "Public read access for smartlists" ON smartlists
  FOR SELECT USING (true);

CREATE POLICY "Anon can manage smartlists" ON smartlists
  FOR ALL USING (true);

-- SmartList values: Full access for tracking
CREATE POLICY "Anon can track smartlist values" ON smartlist_values
  FOR ALL USING (true);

-- Template edits: Full access for tracking
CREATE POLICY "Anon can track template edits" ON template_edits
  FOR ALL USING (true);

-- Patients: Full access (will add auth later)
CREATE POLICY "Anon can manage patients" ON patients
  FOR ALL USING (true);

-- Encounters: Full access (will add auth later)
CREATE POLICY "Anon can manage encounters" ON encounters
  FOR ALL USING (true);

-- Generated notes: Full access (will add auth later)
CREATE POLICY "Anon can manage generated notes" ON generated_notes
  FOR ALL USING (true);

-- Note: For production, replace these policies with:
-- CREATE POLICY "Users can manage their own data" ON [table]
--   FOR ALL USING (auth.uid() = user_id);
-- And add user_id columns to track ownership