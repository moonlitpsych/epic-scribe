-- Migration 031: staged_actions table for AI MA Action Resolver
-- Stores extracted action intents from visit transcripts

CREATE TABLE staged_actions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id      UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id        UUID REFERENCES patients(id) ON DELETE SET NULL,
  provider_id       UUID NOT NULL,
  action_type       TEXT NOT NULL CHECK (action_type IN (
    'lab','rx_new','rx_change','rx_refill','rx_discontinue',
    'followup','prior_auth','referral','safety_plan','patient_education','other'
  )),
  urgency           TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('stat','urgent','routine')),
  summary           TEXT NOT NULL,
  details           JSONB DEFAULT '{}',
  transcript_excerpt TEXT,
  status            TEXT NOT NULL DEFAULT 'extracting' CHECK (status IN (
    'extracting','staged','ready','approved','executing','completed','failed','dismissed'
  )),
  extraction_model  TEXT,
  extraction_latency_ms INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staged_actions_encounter ON staged_actions(encounter_id);
CREATE INDEX idx_staged_actions_provider ON staged_actions(provider_id);
CREATE INDEX idx_staged_actions_active ON staged_actions(encounter_id)
  WHERE status NOT IN ('dismissed','completed','failed');

ALTER TABLE staged_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on staged_actions"
  ON staged_actions FOR ALL USING (true) WITH CHECK (true);
