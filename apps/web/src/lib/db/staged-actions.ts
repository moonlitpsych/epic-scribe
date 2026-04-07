/**
 * Staged Actions Database Operations
 *
 * CRUD operations for the staged_actions table (migration 031).
 * Stores AI-extracted action intents from visit transcripts.
 */

import { getSupabaseClient } from '../supabase';

export interface StagedAction {
  id: string;
  encounter_id: string;
  patient_id: string | null;
  provider_id: string;
  action_type: string;
  urgency: string;
  summary: string;
  details: Record<string, any>;
  transcript_excerpt: string | null;
  status: string;
  extraction_model: string | null;
  extraction_latency_ms: number | null;
  created_at: string;
  updated_at: string;
  execution_result?: Record<string, any>;
  error_message?: string | null;
  executed_at?: string | null;
}

export interface CreateStagedActionParams {
  encounterId: string;
  patientId?: string;
  providerId: string;
  actionType: string;
  urgency: string;
  summary: string;
  details: Record<string, any>;
  transcriptExcerpt?: string;
  extractionModel?: string;
  extractionLatencyMs?: number;
}

export async function createStagedActions(
  actions: CreateStagedActionParams[]
): Promise<StagedAction[]> {
  if (actions.length === 0) return [];

  const supabase = getSupabaseClient(true);

  const rows = actions.map((a) => ({
    encounter_id: a.encounterId,
    patient_id: a.patientId || null,
    provider_id: a.providerId,
    action_type: a.actionType,
    urgency: a.urgency,
    summary: a.summary,
    details: a.details,
    transcript_excerpt: a.transcriptExcerpt || null,
    status: 'staged',
    extraction_model: a.extractionModel || null,
    extraction_latency_ms: a.extractionLatencyMs || null,
  }));

  const { data, error } = await (supabase as any)
    .from('staged_actions')
    .insert(rows)
    .select('*');

  if (error) {
    console.error('Error creating staged actions:', error);
    throw new Error('Failed to create staged actions');
  }

  return data || [];
}

export async function getStagedActionsByEncounter(
  encounterId: string,
  providerId: string
): Promise<StagedAction[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('staged_actions')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching staged actions:', error);
    throw new Error('Failed to fetch staged actions');
  }

  return data || [];
}

export async function updateStagedActionStatus(
  id: string,
  providerId: string,
  status: string
): Promise<StagedAction> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('staged_actions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_id', providerId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating staged action:', error);
    throw new Error('Failed to update staged action');
  }

  return data;
}

export async function clearStagedActionsForEncounter(
  encounterId: string,
  providerId: string
): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await (supabase as any)
    .from('staged_actions')
    .delete()
    .eq('encounter_id', encounterId)
    .eq('provider_id', providerId)
    .eq('status', 'staged');

  if (error) {
    console.error('Error clearing staged actions:', error);
    throw new Error('Failed to clear staged actions');
  }
}
