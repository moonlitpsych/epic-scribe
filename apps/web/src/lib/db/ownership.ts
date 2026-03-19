/**
 * Ownership Verification — Shared helper for multi-tenant data isolation
 *
 * Child tables (notes, encounters, clinical-data, etc.) inherit isolation
 * through patient_id FK. This helper verifies the patient belongs to the
 * requesting provider before allowing access.
 */

import { getSupabaseClient } from '../supabase';

/**
 * Verify that a patient belongs to the given provider.
 * Returns true if owned, false otherwise.
 */
export async function verifyPatientOwnership(
  patientId: string,
  providerId: string
): Promise<boolean> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('provider_id', providerId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}
