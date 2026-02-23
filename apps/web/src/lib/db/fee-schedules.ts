/**
 * Fee Schedule Database Operations
 *
 * Fetches payer fee schedule data for the Listening Coder's
 * payer-aware CPT code suggestions.
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
];

/**
 * Get fee schedule rates for a specific payer, filtered to psychiatric CPT codes.
 * Returns null if the payer has no fee schedule data.
 */
export async function getPayerFeeSchedule(payerId: string): Promise<PayerFeeSchedule | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('fee_schedule_lines')
    .select('cpt, allowed_cents, payer:payers(id, name, payer_type)')
    .eq('payer_id', payerId)
    .in('cpt', PSYCH_CPT_CODES)
    .order('allowed_cents', { ascending: false });

  if (error) {
    console.warn(`[FeeSchedule] Error fetching fee schedule for payer ${payerId}:`, error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Extract payer info from the first row's join
  const payer = (data[0] as any).payer;
  if (!payer) {
    return null;
  }

  return {
    payerName: payer.name,
    payerId: payer.id,
    payerType: payer.payer_type || 'unknown',
    rates: data.map(row => ({
      cpt: row.cpt,
      allowedCents: row.allowed_cents,
    })),
  };
}
