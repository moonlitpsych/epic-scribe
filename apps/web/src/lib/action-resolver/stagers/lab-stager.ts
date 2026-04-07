/**
 * Lab Stager
 *
 * Enriches a staged lab action with matched Labcorp test codes,
 * patient demographics, insurance, collection site, and diagnoses.
 * Called by the execute endpoint when a lab action is approved.
 */

import { getPatientById } from '../../db/patients';
import { getPatientProfile } from '../../db/patient-profiles';
import {
  getLabTestsByKeywords,
  getDefaultLabLocation,
  getPatientInsurance,
  type MatchedLabTest,
  type LabLocation,
  type PatientInsuranceRecord,
} from '../../db/lab-orders';
import type { StagedAction } from '../../db/staged-actions';

export interface LabOrderPayload {
  matchedTests: MatchedLabTest[];
  unmatchedTests: string[];
  patient: {
    name: string;
    dob: string | null;
    phone: string | null;
    medicaidId: string | null;
  };
  insurance: PatientInsuranceRecord | null;
  collectionSite: LabLocation | null;
  diagnoses: Array<{
    icd10Code: string;
    description: string;
    isPrimary: boolean;
  }>;
  fastingRequired: boolean;
  specialInstructions: string | null;
}

export async function stageLabOrder(
  stagedAction: StagedAction,
  providerId: string
): Promise<LabOrderPayload> {
  const details = stagedAction.details || {};
  const testKeywords: string[] = details.tests || [];
  const extractionFasting: boolean = details.fasting_required === true;
  const specialInstructions: string | null = details.special_instructions || null;

  if (!stagedAction.patient_id) {
    throw new Error('Lab action has no patient_id');
  }

  // Fetch all data sources in parallel
  const [matchedTests, patient, insurance, collectionSite, profile] =
    await Promise.all([
      getLabTestsByKeywords(testKeywords),
      getPatientById(stagedAction.patient_id, providerId),
      getPatientInsurance(stagedAction.patient_id),
      getDefaultLabLocation(),
      getPatientProfile(stagedAction.patient_id, providerId),
    ]);

  // Determine fasting: true if any matched test requires it OR extraction says so
  const fastingRequired =
    extractionFasting ||
    matchedTests.some((t) => t.requiresFasting);

  // Extract active diagnoses with ICD-10 codes from patient profile
  const diagnoses: LabOrderPayload['diagnoses'] = [];
  if (profile?.diagnoses) {
    for (const dx of profile.diagnoses) {
      if (dx.status === 'active' && dx.icd10Code) {
        diagnoses.push({
          icd10Code: dx.icd10Code,
          description: dx.name,
          isPrimary: diagnoses.length === 0, // First one is primary
        });
      }
    }
  }

  const unmatchedTests = matchedTests
    .filter((t) => !t.matched)
    .map((t) => t.inputKeyword);

  return {
    matchedTests,
    unmatchedTests,
    patient: {
      name: `${patient.first_name} ${patient.last_name}`,
      dob: patient.date_of_birth || null,
      phone: patient.phone || null,
      medicaidId: patient.medicaid_id || null,
    },
    insurance,
    collectionSite,
    diagnoses,
    fastingRequired,
    specialInstructions,
  };
}
