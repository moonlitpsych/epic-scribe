/**
 * Profile Merger
 *
 * Merges a NoteExtractionResult (from a single note) into an existing
 * StructuredPatientProfile using field-specific strategies:
 *
 * - Diagnoses:          Union by ICD-10 code; update dates/status from most recent
 * - Current medications: Most recent note WINS entirely; displaced meds → past
 * - Past medications:    Union, deduplicate by name
 * - Psychiatric history: Accumulate (set union per sub-array)
 * - Family history:      Accumulate entries, deduplicate
 * - Social history:      Most recent note wins per field
 * - Substance use:       Most recent note wins per substance
 * - Allergies:           Union, deduplicate by substance
 * - Medical history:     Union, deduplicate
 * - Treatment themes:    Formulation: most recent wins. Key themes: accumulate. Standing plan: most recent wins
 */

import type {
  StructuredPatientProfile,
  NoteExtractionResult,
  ProfileDiagnosis,
  ProfileMedication,
  ProfileAllergy,
  ProfileFamilyHistoryEntry,
  ProfileSubstanceEntry,
} from '@epic-scribe/types';

/**
 * Create an empty profile with all fields initialized.
 */
export function createEmptyProfile(): StructuredPatientProfile {
  return {
    diagnoses: [],
    currentMedications: [],
    pastMedications: [],
    psychiatricHistory: {
      hospitalizations: [],
      suicideAttempts: [],
      selfHarm: [],
      priorTreatments: [],
      priorDiagnoses: [],
    },
    familyHistory: { entries: [] },
    socialHistory: {},
    substanceUse: { substances: [] },
    allergies: [],
    medicalHistory: { conditions: [] },
    treatmentThemes: {
      keyThemes: [],
      standingPlanItems: [],
    },
    lastUpdated: new Date().toISOString(),
    sourceNoteCount: 0,
  };
}

/**
 * Normalize a string for deduplication (lowercase, trim, collapse whitespace).
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Deduplicate an array of strings using normalized comparison.
 */
function deduplicateStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of arr) {
    const key = normalize(item);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Merge diagnoses by ICD-10 code (or name if no code). Updates dates/status from most recent.
 */
function mergeDiagnoses(
  existing: ProfileDiagnosis[],
  incoming: ProfileDiagnosis[] | undefined,
  noteDate?: string
): ProfileDiagnosis[] {
  if (!incoming || incoming.length === 0) return existing;

  const map = new Map<string, ProfileDiagnosis>();

  // Index existing by ICD-10 or normalized name
  for (const dx of existing) {
    const key = dx.icd10Code || normalize(dx.name);
    map.set(key, { ...dx });
  }

  // Merge incoming
  for (const dx of incoming) {
    const key = dx.icd10Code || normalize(dx.name);
    const prev = map.get(key);

    if (prev) {
      // Update with most recent info
      prev.status = dx.status;
      prev.lastDocumentedDate = noteDate || dx.lastDocumentedDate || prev.lastDocumentedDate;
      if (!prev.firstDocumentedDate) {
        prev.firstDocumentedDate = prev.lastDocumentedDate;
      }
    } else {
      map.set(key, {
        ...dx,
        firstDocumentedDate: noteDate || dx.firstDocumentedDate,
        lastDocumentedDate: noteDate || dx.lastDocumentedDate,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Merge current medications: most recent note wins. Displaced → past.
 */
function mergeCurrentMedications(
  existingCurrent: ProfileMedication[],
  existingPast: ProfileMedication[],
  incomingCurrent: ProfileMedication[] | undefined,
  incomingPast: ProfileMedication[] | undefined
): { current: ProfileMedication[]; past: ProfileMedication[] } {
  if (!incomingCurrent && !incomingPast) {
    return { current: existingCurrent, past: existingPast };
  }

  // If incoming has current meds, they replace the existing current list.
  // Existing current meds not in the incoming list get moved to past.
  const newCurrent = incomingCurrent && incomingCurrent.length > 0
    ? incomingCurrent
    : existingCurrent;

  const incomingCurrentNames = new Set(
    (incomingCurrent || []).map(m => normalize(m.name))
  );

  // Displaced meds = existing current that aren't in incoming current
  const displaced: ProfileMedication[] = incomingCurrent && incomingCurrent.length > 0
    ? existingCurrent
        .filter(m => !incomingCurrentNames.has(normalize(m.name)))
        .map(m => ({ ...m, status: 'discontinued' as const }))
    : [];

  // Merge past: existing past + incoming past + displaced, deduped by name
  const allPast = [...existingPast, ...(incomingPast || []), ...displaced];
  const pastMap = new Map<string, ProfileMedication>();
  for (const med of allPast) {
    const key = normalize(med.name);
    const prev = pastMap.get(key);
    if (!prev) {
      pastMap.set(key, med);
    } else {
      // Keep the one with more detail (more defined fields)
      const detailCount = (m: ProfileMedication) =>
        [m.dose, m.response, m.reasonDiscontinued, m.indication].filter(Boolean).length;
      if (detailCount(med) > detailCount(prev)) {
        pastMap.set(key, med);
      }
    }
  }

  return { current: newCurrent, past: Array.from(pastMap.values()) };
}

/**
 * Merge family history entries, deduplicating by relation+condition.
 */
function mergeFamilyHistory(
  existing: ProfileFamilyHistoryEntry[],
  incoming: ProfileFamilyHistoryEntry[] | undefined
): ProfileFamilyHistoryEntry[] {
  if (!incoming || incoming.length === 0) return existing;

  const seen = new Set<string>();
  const result: ProfileFamilyHistoryEntry[] = [];

  for (const entry of [...existing, ...incoming]) {
    const key = `${normalize(entry.relation)}|${normalize(entry.condition)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  return result;
}

/**
 * Merge substance use: most recent note wins per substance.
 */
function mergeSubstanceUse(
  existing: ProfileSubstanceEntry[],
  incoming: ProfileSubstanceEntry[] | undefined
): ProfileSubstanceEntry[] {
  if (!incoming || incoming.length === 0) return existing;

  const map = new Map<string, ProfileSubstanceEntry>();

  // Add existing
  for (const entry of existing) {
    map.set(normalize(entry.substance), entry);
  }

  // Incoming overwrites per substance
  for (const entry of incoming) {
    map.set(normalize(entry.substance), entry);
  }

  return Array.from(map.values());
}

/**
 * Merge allergies, deduplicating by substance.
 */
function mergeAllergies(
  existing: ProfileAllergy[],
  incoming: ProfileAllergy[] | undefined
): ProfileAllergy[] {
  if (!incoming || incoming.length === 0) return existing;

  const map = new Map<string, ProfileAllergy>();
  for (const a of [...existing, ...incoming]) {
    const key = normalize(a.substance);
    if (!map.has(key)) {
      map.set(key, a);
    }
  }
  return Array.from(map.values());
}

/**
 * Merge an extraction into an existing profile.
 */
export function mergeProfiles(
  existing: StructuredPatientProfile,
  extraction: NoteExtractionResult,
  noteDate?: string
): StructuredPatientProfile {
  // Diagnoses: union by ICD-10/name
  const diagnoses = mergeDiagnoses(existing.diagnoses, extraction.diagnoses, noteDate);

  // Medications: current = most recent wins, displaced → past
  const { current: currentMedications, past: pastMedications } = mergeCurrentMedications(
    existing.currentMedications,
    existing.pastMedications,
    extraction.currentMedications,
    extraction.pastMedications
  );

  // Psychiatric history: accumulate all sub-arrays
  const psych = existing.psychiatricHistory;
  const inPsych = extraction.psychiatricHistory;
  const psychiatricHistory = {
    hospitalizations: deduplicateStrings([
      ...psych.hospitalizations,
      ...(inPsych?.hospitalizations || []),
    ]),
    suicideAttempts: deduplicateStrings([
      ...psych.suicideAttempts,
      ...(inPsych?.suicideAttempts || []),
    ]),
    selfHarm: deduplicateStrings([
      ...psych.selfHarm,
      ...(inPsych?.selfHarm || []),
    ]),
    priorTreatments: deduplicateStrings([
      ...psych.priorTreatments,
      ...(inPsych?.priorTreatments || []),
    ]),
    priorDiagnoses: deduplicateStrings([
      ...psych.priorDiagnoses,
      ...(inPsych?.priorDiagnoses || []),
    ]),
    traumaHistory: inPsych?.traumaHistory || psych.traumaHistory,
  };

  // Family history: accumulate
  const familyHistory = {
    entries: mergeFamilyHistory(
      existing.familyHistory.entries,
      extraction.familyHistory?.entries
    ),
  };

  // Social history: most recent wins per field
  const socialHistory = {
    ...existing.socialHistory,
    ...(extraction.socialHistory || {}),
    // Accumulate additionalDetails
    additionalDetails: deduplicateStrings([
      ...(existing.socialHistory.additionalDetails || []),
      ...(extraction.socialHistory?.additionalDetails || []),
    ]),
  };

  // Substance use: most recent wins per substance
  const substanceUse = {
    substances: mergeSubstanceUse(
      existing.substanceUse.substances,
      extraction.substanceUse?.substances
    ),
  };

  // Allergies: union
  const allergies = mergeAllergies(existing.allergies, extraction.allergies);

  // Medical history: union
  const medicalHistory = {
    conditions: deduplicateStrings([
      ...existing.medicalHistory.conditions,
      ...(extraction.medicalHistory?.conditions || []),
    ]),
  };

  // Treatment themes: formulation = most recent; key themes = accumulate; standing plan = most recent
  const treatmentThemes = {
    formulation: extraction.treatmentThemes?.formulation || existing.treatmentThemes.formulation,
    keyThemes: deduplicateStrings([
      ...existing.treatmentThemes.keyThemes,
      ...(extraction.treatmentThemes?.keyThemes || []),
    ]),
    standingPlanItems: extraction.treatmentThemes?.standingPlanItems?.length
      ? extraction.treatmentThemes.standingPlanItems
      : existing.treatmentThemes.standingPlanItems,
  };

  return {
    diagnoses,
    currentMedications,
    pastMedications,
    psychiatricHistory,
    familyHistory,
    socialHistory,
    substanceUse,
    allergies,
    medicalHistory,
    treatmentThemes,
    lastUpdated: new Date().toISOString(),
    sourceNoteCount: existing.sourceNoteCount + 1,
    lastNoteDate: noteDate || existing.lastNoteDate,
  };
}
