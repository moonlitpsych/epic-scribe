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
