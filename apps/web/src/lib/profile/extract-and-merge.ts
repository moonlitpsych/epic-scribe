/**
 * Extract-and-Merge Orchestrator
 *
 * After a note is saved, this function:
 * 1. Calls the Gemini-based extractor to parse the note into structured JSON
 * 2. Saves the raw extraction to the audit table
 * 3. Fetches (or creates) the existing cumulative profile
 * 4. Merges the extraction into the profile
 * 5. Upserts the merged profile
 *
 * Designed to be called non-blocking (fire-and-forget with .catch()).
 */

import { extractProfileFromNote } from '@epic-scribe/note-service/src/extractors/profile-extractor';
import { mergeProfiles, createEmptyProfile } from '@epic-scribe/note-service/src/extractors/profile-merger';
import {
  getPatientProfile,
  upsertPatientProfile,
  saveExtractionSnapshot,
} from '../db/patient-profiles';

export async function extractAndMergeProfile(
  patientId: string,
  noteId: string,
  noteContent: string,
  setting: string,
  visitType: string,
  noteDate?: string
): Promise<void> {
  console.log(`[ProfileOrchestrator] Starting extraction for patient ${patientId}, note ${noteId}`);

  // 1. Extract structured data from note
  const { extraction, metadata } = await extractProfileFromNote(noteContent, setting, visitType);

  // 2. Save extraction snapshot (audit log)
  await saveExtractionSnapshot(patientId, noteId, extraction, {
    model: metadata.model,
    latencyMs: metadata.latencyMs,
    tokensUsed: metadata.tokensUsed,
    noteDate,
    setting,
    visitType,
  });

  console.log(`[ProfileOrchestrator] Extraction saved (${metadata.latencyMs}ms)`);

  // 3. Fetch existing profile or create empty
  const existing = (await getPatientProfile(patientId)) || createEmptyProfile();

  // 4. Merge
  const merged = mergeProfiles(existing, extraction, noteDate);

  // 5. Upsert
  await upsertPatientProfile(patientId, merged, noteId);

  console.log(
    `[ProfileOrchestrator] Profile merged for patient ${patientId} ` +
    `(v${merged.sourceNoteCount}, ${merged.diagnoses.length} dx, ` +
    `${merged.currentMedications.length} current meds)`
  );
}
