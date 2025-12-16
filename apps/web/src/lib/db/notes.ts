/**
 * Database operations for generated notes
 */

import { createClient } from '@supabase/supabase-js';
import { EpicChartData } from '@epic-scribe/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GeneratedNote {
  id: string;
  encounter_id: string;
  template_id: string;
  prompt_version: string;
  prompt_hash: string;
  generated_content: string;
  final_note_content?: string;
  is_final: boolean;
  generated_at: string;
  finalized_at?: string;
  finalized_by?: string;
  edited: boolean;
  epic_chart_data?: EpicChartData | null; // Extracted questionnaire scores and medications
}

export interface SaveNoteParams {
  encounterId: string;
  patientId?: string;
  templateId: string;
  promptVersion: string;
  promptHash: string;
  generatedContent: string;
  finalNoteContent: string;
  isFinal: boolean;
  finalizedBy?: string;
  epicChartData?: EpicChartData | null; // Extracted questionnaire scores and medications from Epic
}

/**
 * Save a generated note (initial generation or finalized version)
 */
export async function saveGeneratedNote(params: SaveNoteParams): Promise<GeneratedNote> {
  let {
    encounterId,
    patientId,
    templateId,
    promptVersion,
    promptHash,
    generatedContent,
    finalNoteContent,
    isFinal,
    finalizedBy,
    epicChartData,
  } = params;

  console.log('[saveGeneratedNote] Starting with:', {
    hasEncounterId: !!encounterId,
    hasPatientId: !!patientId,
    templateId,
  });

  // Check if encounterId is a UUID or a calendar event ID
  // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(encounterId || '');

  // If encounterId looks like a calendar event ID (not a UUID), look up the database encounter
  if (encounterId && !isUUID) {
    console.log('[saveGeneratedNote] encounterId appears to be a calendar event ID, looking up database encounter');
    const { data: existingEncounter, error: lookupError } = await supabase
      .from('encounters')
      .select('id')
      .eq('calendar_event_id', encounterId)
      .single();

    if (existingEncounter) {
      console.log('[saveGeneratedNote] Found database encounter:', existingEncounter.id);
      encounterId = existingEncounter.id;
    } else {
      console.log('[saveGeneratedNote] No database encounter found for calendar event, will create placeholder');
      // Clear encounterId so we create a placeholder below
      encounterId = '';
    }
  }

  // If encounter doesn't exist, create it
  if (!encounterId && patientId) {
    console.log('[saveGeneratedNote] Creating placeholder encounter for patient:', patientId);
    // Create a placeholder encounter for standalone note generation
    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .insert({
        patient_id: patientId,
        calendar_event_id: `standalone_${Date.now()}`,
        setting: 'Unknown',
        visit_type: 'Unknown',
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date().toISOString(),
        status: 'completed',
      })
      .select()
      .single();

    if (encounterError) {
      console.error('[saveGeneratedNote] Error creating encounter:', encounterError);
      throw encounterError;
    }
    // Use the new encounter ID
    encounterId = encounter.id;
    console.log('[saveGeneratedNote] Created encounter:', encounterId);
  }

  if (!encounterId) {
    const error = new Error('encounterId is required but was not provided and could not be created');
    console.error('[saveGeneratedNote] Missing encounterId:', { encounterId, patientId });
    throw error;
  }

  const noteData = {
    encounter_id: encounterId,
    template_id: templateId,
    prompt_version: promptVersion,
    prompt_hash: promptHash,
    generated_content: generatedContent,
    final_note_content: finalNoteContent,
    is_final: isFinal,
    finalized_at: isFinal ? new Date().toISOString() : null,
    finalized_by: isFinal ? (finalizedBy || null) : null,
    edited: generatedContent !== finalNoteContent,
    epic_chart_data: epicChartData || null, // Extracted questionnaire scores and medications
  };

  console.log('[saveGeneratedNote] Inserting note with encounter_id:', encounterId);

  const { data, error } = await supabase
    .from('generated_notes')
    .insert(noteData)
    .select()
    .single();

  if (error) {
    console.error('[saveGeneratedNote] Error saving note:', error);
    console.error('[saveGeneratedNote] Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    // Check if this is a missing column error
    if (error.message?.includes('column') && (
      error.message.includes('generated_content') ||
      error.message.includes('final_note_content') ||
      error.message.includes('is_final') ||
      error.message.includes('finalized_at') ||
      error.message.includes('finalized_by')
    )) {
      throw new Error(
        'Database schema is missing required columns. Please run migration 010_add_note_content_fields.sql in your Supabase dashboard.'
      );
    }

    throw error;
  }

  return data;
}

/**
 * Update an existing generated note (mark as final, update content)
 */
export async function updateGeneratedNote(
  noteId: string,
  updates: {
    finalNoteContent?: string;
    isFinal?: boolean;
    finalizedBy?: string;
  }
): Promise<GeneratedNote> {
  const updateData: any = {};

  if (updates.finalNoteContent !== undefined) {
    updateData.final_note_content = updates.finalNoteContent;
  }

  if (updates.isFinal !== undefined) {
    updateData.is_final = updates.isFinal;
    if (updates.isFinal) {
      updateData.finalized_at = new Date().toISOString();
      updateData.finalized_by = updates.finalizedBy;
    }
  }

  const { data, error } = await supabase
    .from('generated_notes')
    .update(updateData)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('[updateGeneratedNote] Error updating note:', error);
    throw error;
  }

  return data;
}

/**
 * Get all finalized notes for a patient (for historical context)
 */
export async function getPatientFinalizedNotes(patientId: string): Promise<GeneratedNote[]> {
  const { data, error } = await supabase
    .from('generated_notes')
    .select(`
      *,
      encounters!inner(patient_id, scheduled_start, setting, visit_type)
    `)
    .eq('encounters.patient_id', patientId)
    .eq('is_final', true)
    .order('generated_at', { ascending: true });

  if (error) {
    console.error('[getPatientFinalizedNotes] Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get the most recent finalized note for a patient
 */
export async function getMostRecentFinalizedNote(patientId: string): Promise<GeneratedNote | null> {
  const { data, error } = await supabase
    .from('generated_notes')
    .select(`
      *,
      encounters!inner(patient_id, scheduled_start, setting, visit_type)
    `)
    .eq('encounters.patient_id', patientId)
    .eq('is_final', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('[getMostRecentFinalizedNote] Error fetching note:', error);
    throw error;
  }

  return data;
}

/**
 * Get all notes for a specific encounter
 */
export async function getEncounterNotes(encounterId: string): Promise<GeneratedNote[]> {
  const { data, error } = await supabase
    .from('generated_notes')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('[getEncounterNotes] Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific note by ID
 */
export async function getNoteById(noteId: string): Promise<GeneratedNote | null> {
  const { data, error } = await supabase
    .from('generated_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[getNoteById] Error fetching note:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('generated_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('[deleteNote] Error deleting note:', error);
    throw error;
  }
}

// =============================================================================
// Patient Notes (Manual Notes - Clinical Notes & Quick Memos)
// =============================================================================

export type PatientNoteType = 'clinical_note' | 'quick_memo';

export interface PatientNote {
  id: string;
  patient_id: string;
  note_type: PatientNoteType;
  title: string | null;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientNoteParams {
  patientId: string;
  noteType: PatientNoteType;
  title?: string;
  content: string;
  createdBy: string;
}

export interface UpdatePatientNoteParams {
  title?: string;
  content?: string;
}

/**
 * Get all manual notes for a patient
 */
export async function getPatientNotes(patientId: string): Promise<PatientNote[]> {
  const { data, error } = await supabase
    .from('patient_notes')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPatientNotes] Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific patient note by ID
 */
export async function getPatientNoteById(noteId: string): Promise<PatientNote | null> {
  const { data, error } = await supabase
    .from('patient_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[getPatientNoteById] Error fetching note:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new patient note (clinical note or quick memo)
 */
export async function createPatientNote(params: CreatePatientNoteParams): Promise<PatientNote> {
  const { patientId, noteType, title, content, createdBy } = params;

  const { data, error } = await supabase
    .from('patient_notes')
    .insert({
      patient_id: patientId,
      note_type: noteType,
      title: title || null,
      content,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error('[createPatientNote] Error creating note:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing patient note
 */
export async function updatePatientNote(
  noteId: string,
  updates: UpdatePatientNoteParams
): Promise<PatientNote> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }
  if (updates.content !== undefined) {
    updateData.content = updates.content;
  }

  const { data, error } = await supabase
    .from('patient_notes')
    .update(updateData)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('[updatePatientNote] Error updating note:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a patient note
 */
export async function deletePatientNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('[deletePatientNote] Error deleting note:', error);
    throw error;
  }
}
