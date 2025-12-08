/**
 * Patient Database Operations
 *
 * CRUD operations for the patients table.
 * All patient demographic data (PHI) is stored here.
 */

import { getSupabaseClient } from '../supabase';
import { Database } from '../database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

/**
 * Get all active patients, sorted by last name
 */
export async function getAllPatients(includeInactive = false) {
  const supabase = getSupabaseClient(true); // Use service role for server-side

  let query = supabase.from('patients').select('*').order('last_name', { ascending: true });

  // TODO: Re-enable active filter once column exists
  // if (!includeInactive) {
  //   query = query.eq('active', true);
  // }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching patients:', error);
    throw new Error('Failed to fetch patients');
  }

  return data as Patient[];
}

/**
 * Get a single patient by ID
 */
export async function getPatientById(id: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching patient:', error);
    throw new Error('Failed to fetch patient');
  }

  return data as Patient;
}

/**
 * Search patients by name
 */
export async function searchPatients(query: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    // .eq('active', true)  // TODO: Re-enable once column exists
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%`
    )
    .order('last_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error searching patients:', error);
    throw new Error('Failed to search patients');
  }

  return data as Patient[];
}

/**
 * Create a new patient
 */
export async function createPatient(patient: {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  mrn?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const supabase = getSupabaseClient(true);

  // Map to database column names
  const insertData: any = {
    first_name: patient.first_name,
    last_name: patient.last_name,
  };

  // Only add optional fields if they have values
  if (patient.date_of_birth) {
    insertData.dob = patient.date_of_birth;
  }
  if (patient.age !== undefined && patient.age !== null) {
    insertData.age = patient.age;
  }
  if (patient.mrn) {
    insertData.medicaid_id = patient.mrn;
  }
  if (patient.phone) {
    insertData.phone = patient.phone;
  }
  if (patient.email) {
    insertData.email = patient.email;
  }

  const { data, error } = await supabase
    .from('patients')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating patient:', error);
    throw new Error('Failed to create patient');
  }

  return data as Patient;
}

/**
 * Update an existing patient
 */
export async function updatePatient(id: string, updates: PatientUpdate) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient:', error);
    throw new Error('Failed to update patient');
  }

  return data as Patient;
}

/**
 * Soft delete a patient (set active = false)
 * TODO: Re-enable once active column exists
 */
export async function deletePatient(id: string) {
  const supabase = getSupabaseClient(true);

  // TODO: Implement soft delete with active column
  // For now, we'll do a hard delete
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting patient:', error);
    throw new Error('Failed to delete patient');
  }
}

/**
 * Get patient with encounter count
 */
export async function getPatientWithEncounterCount(id: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('*, encounters(count)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching patient with encounters:', error);
    throw new Error('Failed to fetch patient with encounters');
  }

  return data;
}
