-- Grant permissions to anon role for development
-- This allows the anon key to access tables

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO anon;

-- Grant all privileges on all tables to anon role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Ensure future tables also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

-- Specifically grant permissions on our tables
GRANT ALL ON patients TO anon;
GRANT ALL ON encounters TO anon;
GRANT ALL ON generated_notes TO anon;
GRANT ALL ON templates TO anon;
GRANT ALL ON smartlists TO anon;
GRANT ALL ON smartlist_values TO anon;
GRANT ALL ON template_edits TO anon;