-- Migration: Add patient_clinical_data table for HealthKit/FHIR clinical data
-- Purpose: Store structured clinical data synced from Apple Health via iOS app
-- Design: One row per data type per patient per source, upserted on each sync

CREATE TABLE IF NOT EXISTS patient_clinical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    -- Data classification
    data_source TEXT NOT NULL DEFAULT 'healthkit',  -- 'healthkit', 'epic', 'manual'
    data_type TEXT NOT NULL,  -- 'medications', 'conditions', 'labs', 'vitals', 'notes', 'allergies', 'procedures'

    -- Content
    structured_data JSONB NOT NULL,  -- Typed arrays matching HealthKitClinicalData interfaces
    raw_fhir JSONB,                  -- Optional raw FHIR Bundle for audit/debugging
    effective_date TIMESTAMPTZ,      -- Clinically relevant date (e.g., most recent lab date)

    -- Tracking
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),

    -- One row per data type per source per patient, upserted on sync
    UNIQUE (patient_id, data_source, data_type)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_clinical_data_patient
    ON patient_clinical_data(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_data_patient_source
    ON patient_clinical_data(patient_id, data_source);
CREATE INDEX IF NOT EXISTS idx_clinical_data_synced_at
    ON patient_clinical_data(synced_at DESC);

-- Enable RLS
ALTER TABLE patient_clinical_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user MVP, matching existing pattern)
CREATE POLICY "Allow all operations for patient_clinical_data"
    ON patient_clinical_data FOR ALL USING (true);

-- Comments
COMMENT ON TABLE patient_clinical_data IS
    'Stores structured clinical data synced from HealthKit/FHIR (medications, conditions, labs, vitals, etc.)';
COMMENT ON COLUMN patient_clinical_data.data_type IS
    'One of: medications, conditions, labs, vitals, notes, allergies, procedures';
COMMENT ON COLUMN patient_clinical_data.structured_data IS
    'Typed JSON arrays matching HealthKitClinicalData interfaces (MedicationSummary[], etc.)';
COMMENT ON COLUMN patient_clinical_data.raw_fhir IS
    'Optional raw FHIR R4 Bundle preserved for audit trail and debugging';
COMMENT ON COLUMN patient_clinical_data.effective_date IS
    'Clinically relevant date for this data (e.g., most recent lab collection date)';
