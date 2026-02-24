/**
 * Patient Profile Database Operations
 *
 * CRUD for the patient_profiles and patient_profile_extractions tables.
 * Stores the cumulative structured patient profile and per-note extraction audit log.
 *
 * Note: Supabase auto-generated types don't include these tables yet.
 * Using `as any` for table references (same pattern as clinical-data.ts).
 */

import { getSupabaseClient } from '../supabase';
import type { StructuredPatientProfile, NoteExtractionResult } from '@epic-scribe/types';

/**
 * Get the cumulative profile for a patient.
 */
export async function getPatientProfile(
  patientId: string
): Promise<StructuredPatientProfile | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('patient_profiles')
    .select('profile_data')
    .eq('patient_id', patientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    console.error('[patient-profiles] Error fetching profile:', error);
    throw new Error(`Failed to fetch patient profile: ${error.message}`);
  }

  return data?.profile_data as StructuredPatientProfile | null;
}

/**
 * Upsert the cumulative profile. Increments version on update.
 */
export async function upsertPatientProfile(
  patientId: string,
  profile: StructuredPatientProfile,
  noteId?: string
): Promise<void> {
  const supabase = getSupabaseClient(true);

  // Try to get existing version
  const { data: existing } = await (supabase as any)
    .from('patient_profiles')
    .select('version')
    .eq('patient_id', patientId)
    .single();

  const nextVersion = existing ? (existing as any).version + 1 : 1;

  const { error } = await (supabase as any)
    .from('patient_profiles')
    .upsert(
      {
        patient_id: patientId,
        profile_data: profile,
        version: nextVersion,
        last_note_id: noteId || null,
        last_extracted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id' }
    );

  if (error) {
    console.error('[patient-profiles] Error upserting profile:', error);
    throw new Error(`Failed to upsert patient profile: ${error.message}`);
  }
}

/**
 * Save a per-note extraction snapshot to the audit table.
 */
export async function saveExtractionSnapshot(
  patientId: string,
  noteId: string,
  extractedData: NoteExtractionResult,
  metadata: {
    model?: string;
    latencyMs?: number;
    tokensUsed?: number;
    noteDate?: string;
    setting?: string;
    visitType?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await (supabase as any)
    .from('patient_profile_extractions')
    .insert({
      patient_id: patientId,
      note_id: noteId,
      extracted_data: extractedData,
      extraction_model: metadata.model || null,
      extraction_latency_ms: metadata.latencyMs || null,
      extraction_tokens_used: metadata.tokensUsed || null,
      note_date: metadata.noteDate || null,
      setting: metadata.setting || null,
      visit_type: metadata.visitType || null,
    });

  if (error) {
    console.error('[patient-profiles] Error saving extraction snapshot:', error);
    throw new Error(`Failed to save extraction snapshot: ${error.message}`);
  }
}

/**
 * Lightweight check: does a profile exist for this patient?
 */
export async function getPatientProfileSummary(
  patientId: string
): Promise<{ hasProfile: boolean; version?: number; lastUpdated?: string } | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('patient_profiles')
    .select('version, last_extracted_at')
    .eq('patient_id', patientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return { hasProfile: false };
    console.error('[patient-profiles] Error fetching summary:', error);
    return null;
  }

  return {
    hasProfile: true,
    version: (data as any).version,
    lastUpdated: (data as any).last_extracted_at,
  };
}
