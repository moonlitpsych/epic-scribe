-- Migration 029: Booking infrastructure
-- Adds Google refresh token storage, booking slug, and provider availability table

-- Store Google refresh token for server-side calendar access (public booking)
ALTER TABLE es_providers ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE es_providers ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;
ALTER TABLE es_providers ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false;

-- Provider availability hours (weekly recurring)
-- Drop and recreate to ensure correct schema
DROP TABLE IF EXISTS provider_availability CASCADE;
CREATE TABLE provider_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES es_providers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  setting TEXT NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'Intake',
  slot_duration_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_provider_availability_provider ON provider_availability(provider_id);
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

-- Service role full access (API routes use service role client)
DROP POLICY IF EXISTS "Service role full access on provider_availability" ON provider_availability;
CREATE POLICY "Service role full access on provider_availability"
  ON provider_availability FOR ALL USING (true) WITH CHECK (true);

-- Seed Moonlit booking slug
UPDATE es_providers SET booking_slug = 'moonlit', booking_enabled = true
  WHERE id = '8e29bcb5-be27-421d-b9fa-6367f761ab8e';

-- Mon-Fri, 8am-4pm, 60-min intake slots for Moonlit
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, setting, visit_type, slot_duration_minutes)
SELECT '8e29bcb5-be27-421d-b9fa-6367f761ab8e', d, '08:00', '16:00', 'Moonlit Psychiatry', 'Intake', 60
FROM generate_series(1, 5) AS d;
