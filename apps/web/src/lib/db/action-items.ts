/**
 * Action Items Database Operations
 *
 * CRUD operations for the action_items table (migration 028).
 * Action items are per-encounter follow-up tasks (referrals, prescriptions, labs, etc.).
 */

import { getSupabaseClient } from '../supabase';

export interface ActionItem {
  id: string;
  encounter_id: string | null;
  patient_id: string;
  provider_id: string;
  text: string;
  category: string;
  completed: boolean;
  completed_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActionItemParams {
  encounterId?: string;
  patientId: string;
  providerId: string;
  text: string;
  category: string;
}

export async function getActionItemsByEncounter(
  encounterId: string,
  providerId: string
): Promise<ActionItem[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('action_items')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching action items:', error);
    throw new Error('Failed to fetch action items');
  }

  return data || [];
}

export async function createActionItem(params: CreateActionItemParams): Promise<ActionItem> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('action_items')
    .insert({
      encounter_id: params.encounterId || null,
      patient_id: params.patientId,
      provider_id: params.providerId,
      text: params.text,
      category: params.category,
      completed: false,
      source: 'manual',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating action item:', error);
    throw new Error('Failed to create action item');
  }

  return data;
}

export async function updateActionItem(
  id: string,
  providerId: string,
  updates: { text?: string; category?: string; completed?: boolean }
): Promise<ActionItem> {
  const supabase = getSupabaseClient(true);

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.text !== undefined) updateData.text = updates.text;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.completed !== undefined) {
    updateData.completed = updates.completed;
    updateData.completed_at = updates.completed ? new Date().toISOString() : null;
  }

  const { data, error } = await (supabase as any)
    .from('action_items')
    .update(updateData)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating action item:', error);
    throw new Error('Failed to update action item');
  }

  return data;
}

export async function deleteActionItem(id: string, providerId: string): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await (supabase as any)
    .from('action_items')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId);

  if (error) {
    console.error('Error deleting action item:', error);
    throw new Error('Failed to delete action item');
  }
}
