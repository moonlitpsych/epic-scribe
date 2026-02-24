/**
 * HealthKit → Profile Merge
 *
 * When both HealthKit clinical data and a structured patient profile exist,
 * merges HealthKit medications, conditions, and allergies into the profile
 * to create a single unified source. Labs, vitals, procedures, and clinical
 * notes remain in HealthKit (temporal data not suited for the profile).
 */

import type {
  HealthKitClinicalData,
  MedicationSummary,
  ConditionSummary,
  AllergySummary,
  StructuredPatientProfile,
  ProfileMedication,
  ProfileDiagnosis,
  ProfileAllergy,
} from '@epic-scribe/types';
/**
 * Normalize a string for deduplication.
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Convert a HealthKit MedicationSummary to a ProfileMedication.
 */
function toProfileMedication(med: MedicationSummary): ProfileMedication {
  return {
    name: med.name,
    dose: med.dose,
    frequency: med.frequency,
    route: med.route,
    status: med.status === 'stopped' ? 'discontinued'
      : med.status === 'on-hold' ? 'on-hold'
      : 'active',
    startDate: med.startDate,
  };
}

/**
 * Convert a HealthKit ConditionSummary to a ProfileDiagnosis.
 */
function toProfileDiagnosis(cond: ConditionSummary): ProfileDiagnosis {
  return {
    name: cond.displayName,
    icd10Code: cond.icd10Code,
    status: cond.clinicalStatus === 'resolved' ? 'resolved'
      : cond.clinicalStatus === 'inactive' ? 'resolved'
      : cond.clinicalStatus === 'remission' ? 'in-remission'
      : 'active',
    firstDocumentedDate: cond.onsetDate,
  };
}

/**
 * Convert a HealthKit AllergySummary to a ProfileAllergy.
 */
function toProfileAllergy(allergy: AllergySummary): ProfileAllergy {
  return {
    substance: allergy.substance,
    reaction: allergy.reaction,
    severity: allergy.severity,
  };
}

/**
 * Merge HealthKit data into a structured patient profile.
 *
 * Strategy:
 * - Medications: HealthKit active meds are added to currentMedications if not already present (by name).
 *   HealthKit stopped meds are added to pastMedications if not already present.
 *   Profile medications take precedence (they have richer clinical detail from notes).
 * - Conditions: HealthKit conditions are added to diagnoses if not already present (by ICD-10 or name).
 * - Allergies: HealthKit allergies are added if not already present (by substance).
 *
 * Returns a new profile object (does not mutate the input).
 */
export function mergeHealthKitIntoProfile(
  profile: StructuredPatientProfile,
  healthKit: HealthKitClinicalData
): StructuredPatientProfile {
  const merged = { ...profile };

  // --- Medications ---
  if (healthKit.medications && healthKit.medications.length > 0) {
    const existingCurrentNames = new Set(
      profile.currentMedications.map(m => normalize(m.name))
    );
    const existingPastNames = new Set(
      profile.pastMedications.map(m => normalize(m.name))
    );

    // Deduplicate HealthKit meds by name (keep most recent)
    const dedupMap = new Map<string, MedicationSummary>();
    for (const med of healthKit.medications) {
      const key = normalize(med.name);
      const existing = dedupMap.get(key);
      if (!existing || (med.startDate && (!existing.startDate || med.startDate > existing.startDate))) {
        dedupMap.set(key, med);
      }
    }

    const newCurrentMeds: ProfileMedication[] = [];
    const newPastMeds: ProfileMedication[] = [];

    for (const med of dedupMap.values()) {
      const key = normalize(med.name);
      const isActive = med.status === 'active' || !med.status;

      if (isActive) {
        // Add to current if not already in profile's current list
        if (!existingCurrentNames.has(key)) {
          newCurrentMeds.push(toProfileMedication(med));
        }
      } else {
        // Add to past if not already in profile's past or current list
        if (!existingPastNames.has(key) && !existingCurrentNames.has(key)) {
          newPastMeds.push(toProfileMedication(med));
        }
      }
    }

    if (newCurrentMeds.length > 0) {
      merged.currentMedications = [...profile.currentMedications, ...newCurrentMeds];
    }
    if (newPastMeds.length > 0) {
      merged.pastMedications = [...profile.pastMedications, ...newPastMeds];
    }
  }

  // --- Conditions → Diagnoses ---
  if (healthKit.conditions && healthKit.conditions.length > 0) {
    const existingKeys = new Set(
      profile.diagnoses.map(d => d.icd10Code || normalize(d.name))
    );

    const newDiagnoses: ProfileDiagnosis[] = [];
    for (const cond of healthKit.conditions) {
      const key = cond.icd10Code || normalize(cond.displayName);
      if (!existingKeys.has(key)) {
        newDiagnoses.push(toProfileDiagnosis(cond));
        existingKeys.add(key); // prevent duplicates within HealthKit data
      }
    }

    if (newDiagnoses.length > 0) {
      merged.diagnoses = [...profile.diagnoses, ...newDiagnoses];
    }
  }

  // --- Allergies ---
  if (healthKit.allergies && healthKit.allergies.length > 0) {
    const existingSubstances = new Set(
      profile.allergies.map(a => normalize(a.substance))
    );

    const newAllergies: ProfileAllergy[] = [];
    for (const allergy of healthKit.allergies) {
      const key = normalize(allergy.substance);
      if (!existingSubstances.has(key)) {
        newAllergies.push(toProfileAllergy(allergy));
        existingSubstances.add(key);
      }
    }

    if (newAllergies.length > 0) {
      merged.allergies = [...profile.allergies, ...newAllergies];
    }
  }

  return merged;
}

/**
 * Create a filtered copy of HealthKit data with medications, conditions, and
 * allergies removed (since they've been merged into the profile).
 * Retains labs, vitals, procedures, and clinical notes for temporal context.
 */
export function stripProfileOverlap(
  healthKit: HealthKitClinicalData
): HealthKitClinicalData | null {
  const filtered: HealthKitClinicalData = {
    ...healthKit,
    medications: [],
    conditions: [],
    allergies: [],
  };

  // Return null if nothing temporal remains
  const hasContent =
    (filtered.labResults && filtered.labResults.length > 0) ||
    (filtered.vitalSigns && filtered.vitalSigns.length > 0) ||
    (filtered.procedures && filtered.procedures.length > 0) ||
    (filtered.clinicalNotes && filtered.clinicalNotes.length > 0);

  return hasContent ? filtered : null;
}
