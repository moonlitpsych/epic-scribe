/**
 * Generated Notes Database Operations
 *
 * CRUD operations for the generated_notes table.
 * Tracks note generation metadata only - content stays in Google Drive.
 */

import { getSupabaseClient } from '../supabase';
import { Database } from '../database.types';

type GeneratedNote = Database['public']['Tables']['generated_notes']['Row'];
type GeneratedNoteInsert = Database['public']['Tables']['generated_notes']['Insert'];
type GeneratedNoteUpdate = Database['public']['Tables']['generated_notes']['Update'];

/**
 * Get all notes for a specific encounter
 */
export async function getNotesByEncounterId(encounterId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('generated_notes')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw new Error('Failed to fetch notes');
  }

  return data as GeneratedNote[];
}

/**
 * Get note by ID
 */
export async function getNoteById(id: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('generated_notes')
    .select('*, encounters(*, patients(*))')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching note:', error);
    throw new Error('Failed to fetch note');
  }

  return data;
}

/**
 * Create a new generated note record
 */
export async function createGeneratedNote(note: GeneratedNoteInsert) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('generated_notes')
    .insert(note)
    .select()
    .single();

  if (error) {
    console.error('Error creating generated note:', error);
    throw new Error('Failed to create generated note');
  }

  return data as GeneratedNote;
}

/**
 * Update a generated note
 */
export async function updateGeneratedNote(id: string, updates: GeneratedNoteUpdate) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('generated_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating generated note:', error);
    throw new Error('Failed to update generated note');
  }

  return data as GeneratedNote;
}

/**
 * Mark a note as edited
 */
export async function markNoteAsEdited(id: string) {
  return updateGeneratedNote(id, { edited: true });
}

/**
 * Delete a generated note
 */
export async function deleteGeneratedNote(id: string) {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase.from('generated_notes').delete().eq('id', id);

  if (error) {
    console.error('Error deleting generated note:', error);
    throw new Error('Failed to delete generated note');
  }
}

/**
 * Get all notes for a specific patient
 * Joins with encounters to get notes for all patient encounters
 */
export async function getNotesByPatientId(patientId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('generated_notes')
    .select(`
      *,
      encounters!inner(
        id,
        patient_id,
        setting,
        visit_type,
        scheduled_start,
        scheduled_end
      )
    `)
    .eq('encounters.patient_id', patientId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient notes:', error);
    throw new Error('Failed to fetch patient notes');
  }

  return data as any[];
}

/**
 * Finalize a note - mark it as final and store the content
 */
export async function finalizeNote(
  noteId: string,
  finalContent: string,
  userId?: string
) {
  const supabase = getSupabaseClient(true);

  const updates: any = {
    final_note_content: finalContent,
    is_final: true,
    finalized_at: new Date().toISOString(),
  };

  if (userId) {
    updates.finalized_by = userId;
  }

  const { data, error } = await supabase
    .from('generated_notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error finalizing note:', error);
    throw new Error('Failed to finalize note');
  }

  return data;
}

/**
 * Get recent final notes for a patient
 * Used to provide context for follow-up visits
 */
export async function getRecentFinalNotesForPatient(
  patientId: string,
  limit: number = 3
) {
  const supabase = getSupabaseClient(true);

  // Use the database function for optimized retrieval
  const { data, error } = await supabase
    .rpc('get_recent_final_notes_for_patient', {
      p_patient_id: patientId,
      p_limit: limit,
    });

  if (error) {
    console.error('Error fetching recent final notes:', error);
    throw new Error('Failed to fetch recent final notes');
  }

  return data || [];
}

/**
 * Get all final notes for a patient
 */
export async function getFinalNotesForPatient(patientId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('generated_notes')
    .select(`
      *,
      encounters!inner(
        id,
        patient_id,
        setting,
        visit_type,
        scheduled_start,
        scheduled_end
      )
    `)
    .eq('encounters.patient_id', patientId)
    .eq('is_final', true)
    .not('final_note_content', 'is', null)
    .order('finalized_at', { ascending: false });

  if (error) {
    console.error('Error fetching final notes:', error);
    throw new Error('Failed to fetch final notes');
  }

  return data as any[];
}
