/**
 * Prior Notes Database Operations
 *
 * CRUD operations for the prior_notes table.
 * Stores imported copy-forward notes from Epic for use in follow-up/TOC generation.
 */

import { createHash } from 'crypto';
import { getSupabaseClient } from '../supabase';

export interface PriorNote {
  id: string;
  patient_id: string;
  note_content: string;
  note_date: string | null;
  setting: string | null;
  visit_type: string | null;
  provider_name: string | null;
  imported_at: string;
  import_source: string;
  content_hash: string;
  is_active: boolean;
  used_in_generation: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavePriorNoteParams {
  patientId: string;
  noteContent: string;
  noteDate?: string | null;
  setting?: string | null;
  visitType?: string | null;
  providerName?: string | null;
  importSource?: string;
}

/**
 * Generate SHA-256 hash of note content for deduplication
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Save a prior note for a patient
 * Returns the saved note, or existing note if duplicate
 */
export async function savePriorNote(params: SavePriorNoteParams): Promise<{
  priorNote: PriorNote;
  isDuplicate: boolean;
}> {
  const supabase = getSupabaseClient(true);
  const contentHash = generateContentHash(params.noteContent);

  // Check for existing note with same hash
  const { data: existing } = await supabase
    .from('prior_notes')
    .select('*')
    .eq('patient_id', params.patientId)
    .eq('content_hash', contentHash)
    .single();

  if (existing) {
    return {
      priorNote: existing as PriorNote,
      isDuplicate: true,
    };
  }

  // Insert new note
  const { data, error } = await supabase
    .from('prior_notes')
    .insert({
      patient_id: params.patientId,
      note_content: params.noteContent,
      note_date: params.noteDate || null,
      setting: params.setting || null,
      visit_type: params.visitType || null,
      provider_name: params.providerName || null,
      import_source: params.importSource || 'clipboard_watcher',
      content_hash: contentHash,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving prior note:', error);
    throw new Error('Failed to save prior note');
  }

  return {
    priorNote: data as PriorNote,
    isDuplicate: false,
  };
}

/**
 * Get all active prior notes for a patient, most recent first
 */
export async function getPriorNotesForPatient(patientId: string): Promise<PriorNote[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('prior_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('imported_at', { ascending: false });

  if (error) {
    console.error('Error fetching prior notes:', error);
    throw new Error('Failed to fetch prior notes');
  }

  return data as PriorNote[];
}

/**
 * Get the most recent prior note for a patient
 */
export async function getMostRecentPriorNote(patientId: string): Promise<PriorNote | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('prior_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('imported_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // Not found is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching most recent prior note:', error);
    throw new Error('Failed to fetch most recent prior note');
  }

  return data as PriorNote;
}

/**
 * Mark a prior note as used in generation
 */
export async function markPriorNoteAsUsed(noteId: string): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('prior_notes')
    .update({ used_in_generation: true })
    .eq('id', noteId);

  if (error) {
    console.error('Error marking prior note as used:', error);
    throw new Error('Failed to mark prior note as used');
  }
}

/**
 * Soft delete a prior note
 */
export async function deletePriorNote(noteId: string): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('prior_notes')
    .update({ is_active: false })
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting prior note:', error);
    throw new Error('Failed to delete prior note');
  }
}

/**
 * Find a patient by exact name match (case-insensitive)
 * Optionally filter by DOB for more precise matching
 */
export async function findPatientByNameAndDob(
  firstName: string,
  lastName: string,
  dateOfBirth?: string | null
): Promise<{
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
} | null> {
  const supabase = getSupabaseClient(true);

  // If DOB provided, try exact match first
  if (dateOfBirth) {
    const { data: exactMatch } = await supabase
      .from('patients')
      .select('id, first_name, last_name, date_of_birth')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .eq('date_of_birth', dateOfBirth)
      .limit(1)
      .single();

    if (exactMatch) {
      return exactMatch;
    }
  }

  // Fallback to name-only match (most recently created if multiple)
  const { data: nameMatch } = await supabase
    .from('patients')
    .select('id, first_name, last_name, date_of_birth')
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (nameMatch) {
    return nameMatch;
  }

  return null;
}
