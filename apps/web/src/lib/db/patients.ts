/**
 * Patient Database Operations
 *
 * CRUD operations for the patients table.
 * All queries are scoped by provider_id for multi-tenant isolation.
 */

import { getSupabaseClient } from '../supabase';
import { Database } from '../database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

/**
 * Get all active patients for a provider, sorted by last name
 */
export async function getAllPatients(providerId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('provider_id', providerId)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching patients:', error);
    throw new Error('Failed to fetch patients');
  }

  return data as Patient[];
}

/**
 * Get a single patient by ID, scoped to provider
 */
export async function getPatientById(id: string, providerId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    console.error('Error fetching patient:', error);
    throw new Error('Failed to fetch patient');
  }

  return data as Patient;
}

/**
 * Search patients by name, scoped to provider
 */
export async function searchPatients(query: string, providerId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('provider_id', providerId)
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
 * Create a new patient, assigned to the given provider
 */
export async function createPatient(providerId: string, patient: {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  mrn?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const supabase = getSupabaseClient(true);

  const insertData: any = {
    first_name: patient.first_name,
    last_name: patient.last_name,
    provider_id: providerId,
  };

  if (patient.date_of_birth) {
    insertData.date_of_birth = patient.date_of_birth;
  }
  if (patient.age !== undefined && patient.age !== null) {
    insertData.age = patient.age;
  }
  if (patient.mrn) {
    insertData.mrn = patient.mrn;
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
 * Update an existing patient, verifying provider ownership
 */
export async function updatePatient(id: string, providerId: string, updates: PatientUpdate) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient:', error);
    throw new Error('Failed to update patient');
  }

  return data as Patient;
}

/**
 * Delete a patient, verifying provider ownership
 */
export async function deletePatient(id: string, providerId: string) {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId);

  if (error) {
    console.error('Error deleting patient:', error);
    throw new Error('Failed to delete patient');
  }
}

/**
 * Get patient with encounter count, scoped to provider
 */
export async function getPatientWithEncounterCount(id: string, providerId: string) {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('*, encounters(count)')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    console.error('Error fetching patient with encounters:', error);
    throw new Error('Failed to fetch patient with encounters');
  }

  return data;
}
