-- Migration 025: Create Epic Scribe's own providers table
-- Decouples from moonlit-scheduler's providers table for SaaS multi-tenancy

CREATE TABLE es_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed from existing linked providers (preserving UUIDs so FKs work)
-- Uses the NextAuth login email (nextauth_user_email) as the canonical email,
-- since that's what the auth system looks up on sign-in.
INSERT INTO es_providers (id, email, display_name, is_admin)
SELECT DISTINCT ON (eup.nextauth_user_email)
  p.id, eup.nextauth_user_email, CONCAT(p.first_name, ' ', p.last_name),
  COALESCE(eup.is_admin, false)
FROM providers p
JOIN epic_scribe_user_providers eup ON eup.provider_id = p.id
WHERE eup.nextauth_user_email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Index for email lookups during auth
CREATE INDEX idx_es_providers_email ON es_providers(email);
