/**
 * Clinical Data Database Operations
 *
 * CRUD operations for the patient_clinical_data table.
 * Stores structured clinical data synced from HealthKit/FHIR.
 */

import { getSupabaseClient } from '../supabase';
import type { HealthKitClinicalData } from '@epic-scribe/types';

const DATA_TYPES = ['medications', 'conditions', 'labs', 'vitals', 'notes', 'allergies', 'procedures'] as const;
type ClinicalDataType = typeof DATA_TYPES[number];

interface ClinicalDataRow {
  id: string;
  patient_id: string;
  data_source: string;
  data_type: string;
  structured_data: unknown;
  raw_fhir: unknown | null;
  effective_date: string | null;
  synced_at: string;
  created_at: string;
}

interface ClinicalDataSummary {
  hasClinicalData: boolean;
  lastSyncedAt: string | null;
  counts: Record<string, number>;
}

/**
 * Upsert clinical data for a patient (one row per data type per source).
 * Uses INSERT ... ON CONFLICT DO UPDATE to replace previous data for that type.
 */
export async function upsertClinicalData(
  patientId: string,
  dataSource: string,
  dataType: ClinicalDataType,
  structuredData: unknown,
  rawFhir?: unknown,
  effectiveDate?: string
): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('patient_clinical_data')
    .upsert(
      {
        patient_id: patientId,
        data_source: dataSource,
        data_type: dataType,
        structured_data: structuredData,
        raw_fhir: rawFhir || null,
        effective_date: effectiveDate || null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,data_source,data_type' }
    );

  if (error) {
    console.error(`Error upserting clinical data (${dataType}):`, error);
    throw new Error(`Failed to upsert clinical data: ${error.message}`);
  }
}

/**
 * Map data_type column values to HealthKitClinicalData keys
 */
const DATA_TYPE_TO_KEY: Record<string, keyof HealthKitClinicalData> = {
  medications: 'medications',
  conditions: 'conditions',
  labs: 'labResults',
  vitals: 'vitalSigns',
  notes: 'clinicalNotes',
  allergies: 'allergies',
  procedures: 'procedures',
};

/**
 * Fetch all clinical data for a patient, assembled into HealthKitClinicalData.
 * Optionally filter by data source.
 */
export async function getClinicalDataForPatient(
  patientId: string,
  dataSource?: string
): Promise<HealthKitClinicalData | null> {
  const supabase = getSupabaseClient(true);

  let query = supabase
    .from('patient_clinical_data')
    .select('*')
    .eq('patient_id', patientId);

  if (dataSource) {
    query = query.eq('data_source', dataSource);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching clinical data:', error);
    throw new Error('Failed to fetch clinical data');
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Assemble rows into HealthKitClinicalData
  const result: HealthKitClinicalData = {};

  for (const row of data as ClinicalDataRow[]) {
    const key = DATA_TYPE_TO_KEY[row.data_type];
    if (key) {
      (result as any)[key] = row.structured_data;
    }
  }

  return result;
}

/**
 * Get a lightweight summary of clinical data for a patient (for UI badges).
 */
export async function getClinicalDataSummary(
  patientId: string
): Promise<ClinicalDataSummary> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patient_clinical_data')
    .select('data_type, structured_data, synced_at')
    .eq('patient_id', patientId);

  if (error) {
    console.error('Error fetching clinical data summary:', error);
    throw new Error('Failed to fetch clinical data summary');
  }

  if (!data || data.length === 0) {
    return { hasClinicalData: false, lastSyncedAt: null, counts: {} };
  }

  const counts: Record<string, number> = {};
  let lastSyncedAt: string | null = null;

  for (const row of data) {
    const items = row.structured_data as unknown[];
    if (Array.isArray(items)) {
      counts[row.data_type] = items.length;
    }

    if (!lastSyncedAt || row.synced_at > lastSyncedAt) {
      lastSyncedAt = row.synced_at;
    }
  }

  return {
    hasClinicalData: true,
    lastSyncedAt,
    counts,
  };
}

/**
 * Delete clinical data for a patient (hard delete for data withdrawal).
 * Optionally filter by data source.
 */
export async function deleteClinicalData(
  patientId: string,
  dataSource?: string
): Promise<void> {
  const supabase = getSupabaseClient(true);

  let query = supabase
    .from('patient_clinical_data')
    .delete()
    .eq('patient_id', patientId);

  if (dataSource) {
    query = query.eq('data_source', dataSource);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting clinical data:', error);
    throw new Error('Failed to delete clinical data');
  }
}
