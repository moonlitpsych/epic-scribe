/**
 * Batch Queue Database Operations
 *
 * CRUD operations for the batch_queue_items table.
 * Supports multi-patient companion workflow: queue patients on work desktop,
 * generate notes for all on laptop.
 */

import { getSupabaseClient } from '../supabase';

export interface BatchQueueItem {
  id: string;
  sync_session_id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  setting: string;
  visit_type: string;
  prior_note_content: string | null;
  prior_note_source: 'manual' | 'intakeq' | 'clipboard_import' | 'none' | null;
  transcript: string | null;
  generated_note_content: string | null;
  status: 'pending' | 'ready' | 'generating' | 'generated' | 'copied';
  error_message: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// --- Companion operations (by sync session ID, validated via device token) ---

/**
 * Add a patient to the batch queue
 */
export async function addBatchItem(
  syncSessionId: string,
  item: {
    patientId: string;
    firstName: string;
    lastName: string;
    setting: string;
    visitType: string;
    sortOrder: number;
  }
): Promise<BatchQueueItem> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('batch_queue_items')
    .insert({
      sync_session_id: syncSessionId,
      patient_id: item.patientId,
      patient_first_name: item.firstName,
      patient_last_name: item.lastName,
      setting: item.setting,
      visit_type: item.visitType,
      sort_order: item.sortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding batch item:', error);
    throw new Error('Failed to add batch item');
  }

  return data as BatchQueueItem;
}

/**
 * Get all batch queue items for a session, ordered by sort_order
 */
export async function getBatchItems(syncSessionId: string): Promise<BatchQueueItem[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('batch_queue_items')
    .select('*')
    .eq('sync_session_id', syncSessionId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching batch items:', error);
    throw new Error('Failed to fetch batch items');
  }

  return data as BatchQueueItem[];
}

/**
 * Update prior note content and source for a batch item
 */
export async function updateBatchItemPriorNote(
  itemId: string,
  syncSessionId: string,
  content: string | null,
  source: BatchQueueItem['prior_note_source']
): Promise<BatchQueueItem | null> {
  const supabase = getSupabaseClient(true);

  const newStatus = content ? 'ready' : 'pending';

  const { data, error } = await supabase
    .from('batch_queue_items')
    .update({
      prior_note_content: content,
      prior_note_source: source,
      status: newStatus,
    })
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch item prior note:', error);
    return null;
  }

  return data as BatchQueueItem;
}

/**
 * Mark a batch item as having no prior note needed (status → ready)
 */
export async function markBatchItemNoPriorNote(
  itemId: string,
  syncSessionId: string
): Promise<BatchQueueItem | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('batch_queue_items')
    .update({
      prior_note_source: 'none',
      status: 'ready',
    })
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error marking batch item no prior note:', error);
    return null;
  }

  return data as BatchQueueItem;
}

/**
 * Mark a batch item as copied
 */
export async function markItemCopied(
  itemId: string,
  syncSessionId: string
): Promise<BatchQueueItem | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('batch_queue_items')
    .update({ status: 'copied' })
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error marking batch item copied:', error);
    return null;
  }

  return data as BatchQueueItem;
}

/**
 * Remove a batch item from the queue
 */
export async function removeBatchItem(
  itemId: string,
  syncSessionId: string
): Promise<boolean> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('batch_queue_items')
    .delete()
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId);

  if (error) {
    console.error('Error removing batch item:', error);
    return false;
  }

  return true;
}

// --- Laptop operations (by session ID, validated via NextAuth) ---

/**
 * Update transcript for a batch item
 */
export async function updateBatchItemTranscript(
  itemId: string,
  syncSessionId: string,
  transcript: string
): Promise<BatchQueueItem | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('batch_queue_items')
    .update({ transcript })
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch item transcript:', error);
    return null;
  }

  return data as BatchQueueItem;
}

/**
 * Update batch item status (and optional error message)
 */
export async function updateBatchItemStatus(
  itemId: string,
  syncSessionId: string,
  status: BatchQueueItem['status'],
  errorMessage?: string
): Promise<BatchQueueItem | null> {
  const supabase = getSupabaseClient(true);

  const update: Record<string, unknown> = { status };
  if (errorMessage !== undefined) {
    update.error_message = errorMessage;
  }

  const { data, error } = await supabase
    .from('batch_queue_items')
    .update(update)
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch item status:', error);
    return null;
  }

  return data as BatchQueueItem;
}

/**
 * Store generated note content for a batch item
 */
export async function updateBatchItemGeneratedNote(
  itemId: string,
  syncSessionId: string,
  noteContent: string
): Promise<BatchQueueItem | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('batch_queue_items')
    .update({
      generated_note_content: noteContent,
      status: 'generated',
      error_message: null,
    })
    .eq('id', itemId)
    .eq('sync_session_id', syncSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch item generated note:', error);
    return null;
  }

  return data as BatchQueueItem;
}

/**
 * Clear all batch queue items for a session
 */
export async function clearBatchQueue(syncSessionId: string): Promise<boolean> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('batch_queue_items')
    .delete()
    .eq('sync_session_id', syncSessionId);

  if (error) {
    console.error('Error clearing batch queue:', error);
    return false;
  }

  return true;
}
