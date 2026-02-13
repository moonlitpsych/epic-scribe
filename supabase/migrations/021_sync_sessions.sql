-- Migration: Add sync_sessions table for Companion Portal cross-device sync
-- Purpose: Enables real-time note syncing between laptop (Epic Scribe) and work desktop (Epic EHR)
-- Auth model: Companion uses device_token (no Google OAuth), laptop uses NextAuth session

CREATE TABLE IF NOT EXISTS sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,

  -- Pairing
  pairing_code TEXT NOT NULL,
  pairing_code_expires_at TIMESTAMPTZ NOT NULL,
  device_token TEXT UNIQUE,
  is_paired BOOLEAN DEFAULT false,

  -- Synced content
  prior_note_content TEXT,
  prior_note_updated_at TIMESTAMPTZ,
  generated_note_content TEXT,
  generated_note_updated_at TIMESTAMPTZ,

  -- Patient context
  patient_context JSONB DEFAULT '{}'::jsonb,

  -- Session lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_activity_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_sessions_user_email
  ON sync_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_pairing_code
  ON sync_sessions(pairing_code)
  WHERE is_paired = false AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_sync_sessions_device_token
  ON sync_sessions(device_token)
  WHERE status = 'active';

-- Enable RLS with permissive policy (matching existing pattern)
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for sync_sessions"
  ON sync_sessions FOR ALL USING (true);

-- Auto-update updated_at timestamp (reuse pattern from prior_notes)
CREATE OR REPLACE FUNCTION update_sync_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_sessions_updated_at
  BEFORE UPDATE ON sync_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_sessions_updated_at();

-- Add to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE sync_sessions;

-- Cleanup function: expires sessions inactive for >24 hours
CREATE OR REPLACE FUNCTION cleanup_stale_sync_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE sync_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND last_activity_at < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE sync_sessions IS
  'Cross-device sync sessions for Companion Portal (laptop ↔ work desktop)';
COMMENT ON COLUMN sync_sessions.pairing_code IS
  '6-digit code shown on laptop, entered on work desktop companion page';
COMMENT ON COLUMN sync_sessions.device_token IS
  'UUID issued after pairing, stored in companion localStorage for auth';
COMMENT ON COLUMN sync_sessions.patient_context IS
  'JSON: { firstName, lastName, setting, visitType, status }';
