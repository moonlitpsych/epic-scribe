/**
 * Fee Schedule Database Operations
 *
 * Queries payer_reimbursement_rates (from cm-research-app, same Supabase project)
 * and patient_insurance for the Listening Coder's payer-aware CPT suggestions.
 */

import { getSupabaseClient } from '../supabase';
import type { PayerFeeSchedule } from '@epic-scribe/types';

/** Psychiatric CPT codes relevant to the Listening Coder */
const PSYCH_CPT_CODES = [
  '99204', '99205',          // New patient E/M
  '99213', '99214', '99215', // Established patient E/M
  '90833', '90836', '90838', // Psychotherapy add-ons
  '90792',                   // Psychiatric diagnostic eval
  '96127',                   // Brief emotional/behavioral assessment
  'G2211',                   // Complexity add-on
  '99051',                   // After-hours
];

/**
 * Get the payer code for a patient from patient_insurance table.
 * Returns the active primary payer's code (e.g. "UTMCD", "MOLINA").
 */
export async function getPatientPayerCode(patientId: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await (supabase as any)
    .from('patient_insurance')
    .select('payer_code')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .eq('insurance_rank', 'primary')
    .limit(1)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.warn(`[FeeSchedule] Error fetching patient insurance for ${patientId}:`, error);
    }
    return null;
  }

  return data.payer_code || null;
}

/**
 * Get fee schedule rates for a specific payer code, filtered to psychiatric CPT codes.
 * Queries payer_reimbursement_rates (from cm-research-app, same Supabase project).
 * Returns null if the payer has no fee schedule data.
 */
export async function getPayerFeeSchedule(payerCode: string): Promise<PayerFeeSchedule | null> {
  const supabase = getSupabaseClient();

  // Fetch rates from payer_reimbursement_rates
  const { data: rates, error: ratesError } = await (supabase as any)
    .from('payer_reimbursement_rates')
    .select('cpt_code, allowed_amount, reimburses, payer_code')
    .eq('payer_code', payerCode)
    .in('cpt_code', PSYCH_CPT_CODES)
    .eq('reimburses', true);

  if (ratesError) {
    console.warn(`[FeeSchedule] Error fetching rates for payer ${payerCode}:`, ratesError);
    return null;
  }

  if (!rates || rates.length === 0) {
    return null;
  }

  // Fetch payer display info from lookup_payers
  const { data: payer, error: payerError } = await (supabase as any)
    .from('lookup_payers')
    .select('display_name, payer_type, code')
    .eq('code', payerCode)
    .limit(1)
    .single();

  if (payerError) {
    console.warn(`[FeeSchedule] Error fetching payer info for ${payerCode}:`, payerError);
  }

  const payerName = payer?.display_name || payerCode;
  const payerType = payer?.payer_type || 'unknown';

  return {
    payerName,
    payerId: payerCode,
    payerType,
    rates: rates.map((row: any) => ({
      cpt: row.cpt_code,
      // payer_reimbursement_rates stores allowed_amount in dollars; convert to cents
      allowedCents: Math.round((row.allowed_amount || 0) * 100),
    })),
  };
}
