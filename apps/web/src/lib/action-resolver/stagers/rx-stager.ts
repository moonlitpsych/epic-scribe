/**
 * Rx Stager
 *
 * Enriches a staged Rx action with patient demographics, current meds,
 * and controlled substance detection. Called by the execute endpoint
 * when an rx_* action is approved.
 */

import { getPatientById } from '../../db/patients';
import { getPatientProfile } from '../../db/patient-profiles';
import type { StagedAction } from '../../db/staged-actions';

/** Common psych controlled substances (Schedule II–V) */
const CONTROLLED_SUBSTANCES = new Set([
  'amphetamine',
  'dextroamphetamine',
  'lisdexamfetamine',
  'methylphenidate',
  'adderall',
  'vyvanse',
  'concerta',
  'ritalin',
  'focalin',
  'dexmethylphenidate',
  'clonazepam',
  'lorazepam',
  'alprazolam',
  'diazepam',
  'midazolam',
  'temazepam',
  'triazolam',
  'chlordiazepoxide',
  'clorazepate',
  'oxazepam',
  'zolpidem',
  'zaleplon',
  'eszopiclone',
  'suvorexant',
  'lemborexant',
  'buspirone', // not actually controlled, but often confused — removed below
  'gabapentin', // Schedule V in some states
  'pregabalin',
  'phenobarbital',
  'modafinil',
  'armodafinil',
  'ketamine',
  'esketamine',
  'buprenorphine',
  'naloxone/buprenorphine',
  'testosterone',
]);
// Remove non-controlled entries
CONTROLLED_SUBSTANCES.delete('buspirone');

export interface RxPrefillPayload {
  medication: string;
  dose: string | null;
  frequency: string | null;
  quantity: number | null;
  refills: number | null;
  indication: string | null;
  specialInstructions: string | null;
  isControlled: boolean;

  // rx_change specific
  previousDose?: string | null;
  changeType?: string | null;
  changeReason?: string | null;

  // rx_discontinue specific
  taperInstructions?: string | null;
  discontinueReason?: string | null;

  patient: {
    name: string;
    dob: string | null;
    phone: string | null;
  };

  currentMedications: string[];
}

function detectControlled(medicationName: string): boolean {
  const lower = medicationName.toLowerCase().trim();
  for (const substance of CONTROLLED_SUBSTANCES) {
    if (lower.includes(substance)) return true;
  }
  return false;
}

export async function stageRxOrder(
  stagedAction: StagedAction,
  providerId: string
): Promise<RxPrefillPayload> {
  const details = stagedAction.details || {};

  if (!stagedAction.patient_id) {
    throw new Error('Rx action has no patient_id');
  }

  // Fetch patient + profile in parallel
  const [patient, profile] = await Promise.all([
    getPatientById(stagedAction.patient_id, providerId),
    getPatientProfile(stagedAction.patient_id, providerId),
  ]);

  // Extract current medications from patient profile
  const currentMedications: string[] = [];
  if (profile?.medications) {
    for (const med of profile.medications) {
      if (med.status === 'active') {
        const entry = med.dose
          ? `${med.name} ${med.dose}`
          : med.name;
        currentMedications.push(entry);
      }
    }
  }

  const medication: string = details.medication || 'Unknown medication';
  const isControlled = detectControlled(medication);

  const base: RxPrefillPayload = {
    medication,
    dose: details.dose || details.new_dose || null,
    frequency: details.frequency || null,
    quantity: details.quantity ? Number(details.quantity) : null,
    refills: details.refills != null ? Number(details.refills) : null,
    indication: details.indication || null,
    specialInstructions: details.special_instructions || null,
    isControlled,
    patient: {
      name: `${patient.first_name} ${patient.last_name}`,
      dob: patient.date_of_birth || null,
      phone: patient.phone || null,
    },
    currentMedications,
  };

  // rx_change extras
  if (stagedAction.action_type === 'rx_change') {
    base.previousDose = details.previous_dose || null;
    base.changeType = details.change_type || null;
    base.changeReason = details.reason || null;
  }

  // rx_discontinue extras
  if (stagedAction.action_type === 'rx_discontinue') {
    base.taperInstructions = details.taper_instructions || null;
    base.discontinueReason = details.reason || null;
  }

  return base;
}
