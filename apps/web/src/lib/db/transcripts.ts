/**
 * Visit Transcript Database Operations
 *
 * CRUD operations for the visit_transcripts table.
 * Stores text transcripts synced from iPhone (WhisperKit on-device transcription).
 * All queries scoped by provider_id for multi-tenant isolation.
 */

import { getSupabaseClient } from '../supabase';

export interface VisitTranscript {
  id: string;
  provider_id: string;
  patient_id: string | null;
  patient_name: string;
  transcript: string;
  recording_duration_seconds: number | null;
  word_count: number | null;
  whisper_model: string | null;
  status: string;
  recorded_at: string;
  transcribed_at: string | null;
  synced_at: string;
  used_at: string | null;
  created_at: string;
}

export interface CreateTranscriptInput {
  provider_id: string;
  patient_id?: string | null;
  patient_name: string;
  transcript: string;
  recording_duration_seconds?: number;
  word_count?: number;
  whisper_model?: string;
  recorded_at: string;
  transcribed_at?: string;
}

/**
 * Insert a new visit transcript (called from phone sync endpoint).
 */
export async function createVisitTranscript(
  data: CreateTranscriptInput
): Promise<VisitTranscript> {
  const supabase = getSupabaseClient(true);

  const { data: row, error } = await (supabase as any)
    .from('visit_transcripts')
    .insert({
      provider_id: data.provider_id,
      patient_id: data.patient_id || null,
      patient_name: data.patient_name,
      transcript: data.transcript,
      recording_duration_seconds: data.recording_duration_seconds || null,
      word_count: data.word_count || null,
      whisper_model: data.whisper_model || 'base',
      recorded_at: data.recorded_at,
      transcribed_at: data.transcribed_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating visit transcript:', error);
    throw new Error(`Failed to create visit transcript: ${error.message}`);
  }

  return row as VisitTranscript;
}

/**
 * Fetch recent transcripts for a provider (desktop polling).
 */
export async function getRecentTranscripts(
  providerId: string,
  status?: string,
  limit = 10
): Promise<VisitTranscript[]> {
  const supabase = getSupabaseClient(true);

  let query = (supabase as any)
    .from('visit_transcripts')
    .select('*')
    .eq('provider_id', providerId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent transcripts:', error);
    throw new Error('Failed to fetch recent transcripts');
  }

  return (data || []) as VisitTranscript[];
}

/**
 * Get a single transcript by ID, scoped to provider.
 */
export async function getTranscriptById(
  id: string,
  providerId: string
): Promise<VisitTranscript | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('visit_transcripts')
    .select('*')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching transcript:', error);
    throw new Error('Failed to fetch transcript');
  }

  return data as VisitTranscript;
}

/**
 * Update a transcript (mark used, link patient, etc).
 */
export async function updateTranscript(
  id: string,
  providerId: string,
  updates: {
    status?: string;
    patient_id?: string | null;
    used_at?: string;
  }
): Promise<VisitTranscript> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('visit_transcripts')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating transcript:', error);
    throw new Error('Failed to update transcript');
  }

  return data as VisitTranscript;
}
