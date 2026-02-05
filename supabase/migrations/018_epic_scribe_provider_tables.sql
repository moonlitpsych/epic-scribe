-- ============================================================
-- Epic Scribe Multi-Provider Support
-- ============================================================
-- Links NextAuth users to moonlit-scheduler providers and stores
-- per-provider IntakeQ credentials and template configurations.
-- ============================================================

-- Link NextAuth users to moonlit-scheduler providers
-- This allows Epic Scribe to know which provider is logged in
CREATE TABLE IF NOT EXISTS epic_scribe_user_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nextauth_user_email TEXT NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- IntakeQ Playwright credentials (login, not API)
-- Each provider has their own IntakeQ login for pushing notes
CREATE TABLE IF NOT EXISTS provider_intakeq_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES providers(id) ON DELETE CASCADE,
  login_email TEXT NOT NULL,
  login_password TEXT NOT NULL,  -- TODO: Encrypt with Supabase Vault in future
  default_template_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- IntakeQ template definitions
-- Stores metadata about each IntakeQ note template
CREATE TABLE IF NOT EXISTS intakeq_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL CHECK (template_type IN ('intake', 'progress')),
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,  -- NULL = shared template
  total_contenteditable_fields INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Field mappings per template
-- Maps Epic Scribe sections to IntakeQ form fields
CREATE TABLE IF NOT EXISTS intakeq_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES intakeq_templates(id) ON DELETE CASCADE,
  epic_scribe_section TEXT NOT NULL,
  intakeq_section_number INTEGER NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('input', 'contenteditable', 'textarea', 'select', 'checkbox')),
  contenteditable_index INTEGER,  -- Index in page order (0-indexed)
  intakeq_question_text TEXT,     -- Display name in IntakeQ
  placeholder TEXT,               -- For input fields
  alternate_names TEXT[],         -- Alternative section names to match
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, epic_scribe_section)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_providers_email ON epic_scribe_user_providers(nextauth_user_email);
CREATE INDEX IF NOT EXISTS idx_user_providers_provider ON epic_scribe_user_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_intakeq_credentials_provider ON provider_intakeq_credentials(provider_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_template ON intakeq_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_provider ON intakeq_templates(provider_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON intakeq_templates(template_type);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_epic_scribe_user_providers_updated_at ON epic_scribe_user_providers;
CREATE TRIGGER update_epic_scribe_user_providers_updated_at
  BEFORE UPDATE ON epic_scribe_user_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_intakeq_credentials_updated_at ON provider_intakeq_credentials;
CREATE TRIGGER update_provider_intakeq_credentials_updated_at
  BEFORE UPDATE ON provider_intakeq_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intakeq_templates_updated_at ON intakeq_templates;
CREATE TRIGGER update_intakeq_templates_updated_at
  BEFORE UPDATE ON intakeq_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE epic_scribe_user_providers IS 'Links NextAuth users (by email) to moonlit-scheduler providers';
COMMENT ON TABLE provider_intakeq_credentials IS 'IntakeQ login credentials for Playwright automation per provider';
COMMENT ON TABLE intakeq_templates IS 'IntakeQ note template definitions';
COMMENT ON TABLE intakeq_template_fields IS 'Field mappings from Epic Scribe sections to IntakeQ form fields';

COMMENT ON COLUMN provider_intakeq_credentials.login_password IS 'Plain text for MVP - TODO: encrypt with Supabase Vault';
COMMENT ON COLUMN intakeq_template_fields.contenteditable_index IS 'Zero-indexed position of contenteditable element on page';
COMMENT ON COLUMN intakeq_template_fields.alternate_names IS 'Alternative Epic Scribe section names that map to this field';
