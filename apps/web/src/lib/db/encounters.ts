/**
 * Encounter Database Operations
 *
 * CRUD operations for the encounters table.
 * Encounters link Google Calendar events to patients.
 * No PHI content stored - transcripts stay in Google Drive.
 */

import { getSupabaseClient } from '../supabase';
import { Database } from '../database.types';

type Encounter = Database['public']['Tables']['encounters']['Row'];
type EncounterInsert = Database['public']['Tables']['encounters']['Insert'];
type EncounterUpdate = Database['public']['Tables']['encounters']['Update'];

/**
 * Get all encounters for a specific patient
 */
export async function getEncountersByPatientId(patientId: string) {
  const supabase = getSupabaseClient(true);

  // TODO: Re-enable patients(*) join once foreign key relationship is set up
  const { data, error } = await supabase
    .from('encounters')
    .select('*')
    .eq('patient_id', patientId)
    .order('scheduled_start', { ascending: false });

  if (error) {
    console.error('Error fetching encounters:', error);
    throw new Error('Failed to fetch encounters');
  }

  return data;
}

/**
 * Get encounter by calendar event ID
 */
export async function getEncounterByCalendarEventId(calendarEventId: string) {
  const supabase = getSupabaseClient(true);

  // TODO: Re-enable patients(*) join once foreign key relationship is set up
  const { data, error } = await supabase
    .from('encounters')
    .select('*')
    .eq('calendar_event_id', calendarEventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching encounter:', error);
    throw new Error('Failed to fetch encounter');
  }

  return data;
}

/**
 * Get encounter by ID
 */
export async function getEncounterById(id: string) {
  const supabase = getSupabaseClient(true);

  // TODO: Re-enable patients(*) join once foreign key relationship is set up
  const { data, error } = await supabase
    .from('encounters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching encounter:', error);
    throw new Error('Failed to fetch encounter');
  }

  return data;
}

/**
 * Get upcoming encounters (next 7 days)
 */
export async function getUpcomingEncounters() {
  const supabase = getSupabaseClient(true);

  const now = new Date().toISOString();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  // TODO: Re-enable patients(*) join once foreign key relationship is set up
  const { data, error } = await supabase
    .from('encounters')
    .select('*')
    .gte('scheduled_start', now)
    .lte('scheduled_start', sevenDaysLater.toISOString())
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming encounters:', error);
    throw new Error('Failed to fetch upcoming encounters');
  }

  return data;
}

/**
 * Create a new encounter
 */
export async function createEncounter(encounter: EncounterInsert) {
  const supabase = getSupabaseClient(true);

  // TODO: Re-enable patients(*) join once foreign key relationship is set up
  const { data, error } = await supabase
    .from('encounters')
    .insert(encounter)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating encounter:', error);
    throw new Error('Failed to create encounter');
  }

  return data;
}

/**
 * Update an existing encounter
 */
export async function updateEncounter(id: string, updates: EncounterUpdate) {
  const supabase = getSupabaseClient(true);

  // TODO: Re-enable patients(*) join once foreign key relationship is set up
  const { data, error } = await supabase
    .from('encounters')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating encounter:', error);
    throw new Error('Failed to update encounter');
  }

  return data;
}

/**
 * Delete an encounter (hard delete since we're also deleting from Calendar)
 */
export async function deleteEncounter(id: string) {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase.from('encounters').delete().eq('id', id);

  if (error) {
    console.error('Error deleting encounter:', error);
    throw new Error('Failed to delete encounter');
  }
}

/**
 * Delete encounter by calendar event ID
 */
export async function deleteEncounterByCalendarEventId(calendarEventId: string) {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('encounters')
    .delete()
    .eq('calendar_event_id', calendarEventId);

  if (error) {
    console.error('Error deleting encounter:', error);
    throw new Error('Failed to delete encounter');
  }
}

/**
 * Update transcript file ID for an encounter
 */
export async function updateEncounterTranscript(
  id: string,
  transcriptFileId: string
) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('encounters')
    .update({
      transcript_file_id: transcriptFileId,
      transcript_indexed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating encounter transcript:', error);
    throw new Error('Failed to update encounter transcript');
  }

  return data as Encounter;
}
