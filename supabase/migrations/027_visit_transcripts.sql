-- Migration 027: Visit Transcripts
-- Phone-recorded visit transcripts synced from iOS app (WhisperKit on-device transcription)
-- Audio never leaves the phone; only text transcript is stored here.

CREATE TABLE visit_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES es_providers(id),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    transcript TEXT NOT NULL,
    recording_duration_seconds INTEGER,
    word_count INTEGER,
    whisper_model TEXT DEFAULT 'base',
    status TEXT NOT NULL DEFAULT 'ready',
    recorded_at TIMESTAMPTZ NOT NULL,
    transcribed_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT now(),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for provider-scoped queries
CREATE INDEX idx_visit_transcripts_provider ON visit_transcripts(provider_id);

-- Index for fetching ready transcripts (desktop polling)
CREATE INDEX idx_visit_transcripts_provider_status ON visit_transcripts(provider_id, status);

-- Index for ordering by recording time
CREATE INDEX idx_visit_transcripts_recorded_at ON visit_transcripts(recorded_at DESC);

-- RLS: enabled with permissive policy (enforcement in app code via provider scoping)
ALTER TABLE visit_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for service role"
    ON visit_transcripts
    FOR ALL
    USING (true)
    WITH CHECK (true);
