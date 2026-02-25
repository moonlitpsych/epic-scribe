#!/usr/bin/env npx tsx
/**
 * Backfill Patient Profiles
 *
 * Processes all existing finalized notes (chronologically per patient)
 * through the extraction → merge pipeline to build structured profiles.
 *
 * Usage:
 *   npx tsx scripts/backfill-patient-profiles.ts                    # All patients
 *   npx tsx scripts/backfill-patient-profiles.ts <patient-id>       # Single patient
 *   npx tsx scripts/backfill-patient-profiles.ts --dry-run          # Preview only
 *   npx tsx scripts/backfill-patient-profiles.ts --dry-run <pid>    # Preview single
 *
 * Requires env vars: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Rate limiting: ~2 second delay between Gemini calls to avoid quota issues.
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load env from .env.local if running locally
import * as fs from 'fs';
import * as path from 'path';
const envPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

// Inline the extraction prompt (same as profile-extractor.ts, avoids import path issues)
const EXTRACTION_PROMPT = `You are a clinical data extraction engine. Given a psychiatric note, extract structured data into the exact JSON schema below. Rules:

1. Extract ONLY information that is explicitly stated in the note. Never infer or fabricate.
2. If a field is not mentioned, OMIT it entirely (do not include null or empty strings).
3. For arrays, include only items that appear in the note. If none, use an empty array [].
4. Return ONLY valid JSON — no markdown fencing, no commentary, no explanation.

JSON Schema to return:
{
  "diagnoses": [{ "name": "string", "icd10Code": "string?", "status": "active|resolved|in-remission", "lastDocumentedDate": "string?" }],
  "currentMedications": [{ "name": "string", "dose": "string?", "frequency": "string?", "route": "string?", "indication": "string?", "status": "active", "response": "string?", "sideEffects": ["string"]? }],
  "pastMedications": [{ "name": "string", "dose": "string?", "indication": "string?", "status": "discontinued", "response": "string?", "reasonDiscontinued": "string?" }],
  "psychiatricHistory": {
    "hospitalizations": ["string — one entry per hospitalization with details"],
    "suicideAttempts": ["string — one entry per attempt with details"],
    "selfHarm": ["string"],
    "priorTreatments": ["string — prior therapy or treatment episodes"],
    "priorDiagnoses": ["string"],
    "traumaHistory": "string?"
  },
  "familyHistory": {
    "entries": [{ "relation": "string", "condition": "string", "details": "string?" }]
  },
  "socialHistory": {
    "livingSituation": "string?",
    "employment": "string?",
    "relationships": "string?",
    "education": "string?",
    "legal": "string?",
    "supportSystem": "string?",
    "additionalDetails": ["string"]?
  },
  "substanceUse": {
    "substances": [{ "substance": "string", "pattern": "string", "frequency": "string?", "sobrietyDate": "string?", "consequences": ["string"]? }]
  },
  "allergies": [{ "substance": "string", "reaction": "string?", "severity": "string?" }],
  "medicalHistory": {
    "conditions": ["string"]
  },
  "treatmentThemes": {
    "formulation": "string? — brief summary of the clinical formulation",
    "keyThemes": ["string — recurring therapy themes or clinical concerns"],
    "standingPlanItems": ["string — ongoing plan items like 'monthly lithium level', 'continue weekly CBT'"]
  }
}

IMPORTANT:
- For "***" placeholders in the note: these indicate information was not available. Do NOT extract them.
- Diagnoses that appear in the Assessment/Formulation section with ICD-10 codes should be extracted.
- Medications listed under "Continue" are current; medications under "Discontinue" or described as past trials are past.
- The formulation field should be a 1-2 sentence summary of the clinical conceptualization, not the full text.
`;

// --- Inline merge logic (same as profile-merger.ts) ---

interface ProfileDiagnosis { name: string; icd10Code?: string; status: string; firstDocumentedDate?: string; lastDocumentedDate?: string; }
interface ProfileMedication { name: string; dose?: string; frequency?: string; route?: string; indication?: string; status: string; startDate?: string; endDate?: string; response?: string; sideEffects?: string[]; reasonDiscontinued?: string; }
interface ProfileFamilyHistoryEntry { relation: string; condition: string; details?: string; }
interface ProfileSubstanceEntry { substance: string; pattern: string; frequency?: string; sobrietyDate?: string; consequences?: string[]; }
interface ProfileAllergy { substance: string; reaction?: string; severity?: string; }
interface StructuredPatientProfile {
  diagnoses: ProfileDiagnosis[];
  currentMedications: ProfileMedication[];
  pastMedications: ProfileMedication[];
  psychiatricHistory: { hospitalizations: string[]; suicideAttempts: string[]; selfHarm: string[]; priorTreatments: string[]; priorDiagnoses: string[]; traumaHistory?: string; };
  familyHistory: { entries: ProfileFamilyHistoryEntry[] };
  socialHistory: { livingSituation?: string; employment?: string; relationships?: string; education?: string; legal?: string; supportSystem?: string; additionalDetails?: string[] };
  substanceUse: { substances: ProfileSubstanceEntry[] };
  allergies: ProfileAllergy[];
  medicalHistory: { conditions: string[] };
  treatmentThemes: { formulation?: string; keyThemes: string[]; standingPlanItems: string[] };
  lastUpdated: string;
  sourceNoteCount: number;
  lastNoteDate?: string;
}

function createEmptyProfile(): StructuredPatientProfile {
  return {
    diagnoses: [], currentMedications: [], pastMedications: [],
    psychiatricHistory: { hospitalizations: [], suicideAttempts: [], selfHarm: [], priorTreatments: [], priorDiagnoses: [] },
    familyHistory: { entries: [] }, socialHistory: {}, substanceUse: { substances: [] },
    allergies: [], medicalHistory: { conditions: [] },
    treatmentThemes: { keyThemes: [], standingPlanItems: [] },
    lastUpdated: new Date().toISOString(), sourceNoteCount: 0,
  };
}

function normalize(s: string): string { return s.toLowerCase().trim().replace(/\s+/g, ' '); }

function deduplicateStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter(item => { const key = normalize(item); if (key && !seen.has(key)) { seen.add(key); return true; } return false; });
}

function mergeProfiles(existing: StructuredPatientProfile, extraction: any, noteDate?: string): StructuredPatientProfile {
  // Diagnoses: union by ICD-10/name
  const dxMap = new Map<string, ProfileDiagnosis>();
  for (const dx of existing.diagnoses) dxMap.set(dx.icd10Code || normalize(dx.name), { ...dx });
  for (const dx of (extraction.diagnoses || [])) {
    const key = dx.icd10Code || normalize(dx.name);
    const prev = dxMap.get(key);
    if (prev) { prev.status = dx.status; prev.lastDocumentedDate = noteDate || dx.lastDocumentedDate || prev.lastDocumentedDate; if (!prev.firstDocumentedDate) prev.firstDocumentedDate = prev.lastDocumentedDate; }
    else dxMap.set(key, { ...dx, firstDocumentedDate: noteDate || dx.firstDocumentedDate, lastDocumentedDate: noteDate || dx.lastDocumentedDate });
  }

  // Medications
  const incomingCurrent = extraction.currentMedications || [];
  const incomingPast = extraction.pastMedications || [];
  let newCurrent = incomingCurrent.length > 0 ? incomingCurrent : existing.currentMedications;
  const incomingCurrentNames = new Set(incomingCurrent.map((m: any) => normalize(m.name)));
  const displaced = incomingCurrent.length > 0 ? existing.currentMedications.filter((m: any) => !incomingCurrentNames.has(normalize(m.name))).map((m: any) => ({ ...m, status: 'discontinued' })) : [];
  const pastMap = new Map<string, ProfileMedication>();
  for (const med of [...existing.pastMedications, ...incomingPast, ...displaced]) {
    const key = normalize(med.name);
    const prev = pastMap.get(key);
    const detailCount = (m: any) => [m.dose, m.response, m.reasonDiscontinued, m.indication].filter(Boolean).length;
    if (!prev || detailCount(med) > detailCount(prev)) pastMap.set(key, med);
  }

  // Psychiatric history: accumulate
  const psych = existing.psychiatricHistory;
  const inPsych = extraction.psychiatricHistory || {};
  const psychiatricHistory = {
    hospitalizations: deduplicateStrings([...psych.hospitalizations, ...(inPsych.hospitalizations || [])]),
    suicideAttempts: deduplicateStrings([...psych.suicideAttempts, ...(inPsych.suicideAttempts || [])]),
    selfHarm: deduplicateStrings([...psych.selfHarm, ...(inPsych.selfHarm || [])]),
    priorTreatments: deduplicateStrings([...psych.priorTreatments, ...(inPsych.priorTreatments || [])]),
    priorDiagnoses: deduplicateStrings([...psych.priorDiagnoses, ...(inPsych.priorDiagnoses || [])]),
    traumaHistory: inPsych.traumaHistory || psych.traumaHistory,
  };

  // Family history: accumulate
  const fhSeen = new Set<string>();
  const familyEntries: ProfileFamilyHistoryEntry[] = [];
  for (const e of [...existing.familyHistory.entries, ...(extraction.familyHistory?.entries || [])]) {
    const key = `${normalize(e.relation)}|${normalize(e.condition)}`;
    if (!fhSeen.has(key)) { fhSeen.add(key); familyEntries.push(e); }
  }

  // Social: most recent wins per field
  const socialHistory = { ...existing.socialHistory, ...(extraction.socialHistory || {}),
    additionalDetails: deduplicateStrings([...(existing.socialHistory.additionalDetails || []), ...(extraction.socialHistory?.additionalDetails || [])]) };

  // Substance use: most recent per substance
  const subMap = new Map(existing.substanceUse.substances.map((s: any) => [normalize(s.substance), s]));
  for (const s of (extraction.substanceUse?.substances || [])) subMap.set(normalize(s.substance), s);

  // Allergies: union
  const allergyMap = new Map<string, ProfileAllergy>();
  for (const a of [...existing.allergies, ...(extraction.allergies || [])]) if (!allergyMap.has(normalize(a.substance))) allergyMap.set(normalize(a.substance), a);

  // Medical history: union
  const conditions = deduplicateStrings([...existing.medicalHistory.conditions, ...(extraction.medicalHistory?.conditions || [])]);

  // Treatment themes
  const treatmentThemes = {
    formulation: extraction.treatmentThemes?.formulation || existing.treatmentThemes.formulation,
    keyThemes: deduplicateStrings([...existing.treatmentThemes.keyThemes, ...(extraction.treatmentThemes?.keyThemes || [])]),
    standingPlanItems: extraction.treatmentThemes?.standingPlanItems?.length ? extraction.treatmentThemes.standingPlanItems : existing.treatmentThemes.standingPlanItems,
  };

  return {
    diagnoses: Array.from(dxMap.values()), currentMedications: newCurrent, pastMedications: Array.from(pastMap.values()),
    psychiatricHistory, familyHistory: { entries: familyEntries }, socialHistory,
    substanceUse: { substances: Array.from(subMap.values()) }, allergies: Array.from(allergyMap.values()),
    medicalHistory: { conditions }, treatmentThemes,
    lastUpdated: new Date().toISOString(), sourceNoteCount: existing.sourceNoteCount + 1, lastNoteDate: noteDate || existing.lastNoteDate,
  };
}

// --- Main ---

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetPatientId = args.find(a => !a.startsWith('--'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;
const geminiBackupKey = process.env.GEMINI_BACKUP_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

if (!supabaseUrl || !supabaseKey) { console.error('Missing SUPABASE env vars'); process.exit(1); }
if (!geminiApiKey) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractFromNote(noteContent: string, setting: string, visitType: string): Promise<any> {
  const prompt = `${EXTRACTION_PROMPT}\n\nContext: This is a ${visitType} note from the ${setting} setting.\n\nNOTE TEXT:\n${noteContent}`;

  for (const key of [geminiApiKey, geminiBackupKey].filter(Boolean) as string[]) {
    try {
      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({
        model: geminiModel,
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096, topP: 0.95 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      if (err?.status === 429 && key === geminiApiKey && geminiBackupKey) {
        console.log('  Primary key quota exhausted, trying backup...');
        continue;
      }
      throw err;
    }
  }
  throw new Error('All API keys exhausted');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Patient Profile Backfill ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Model: ${geminiModel}`);
  if (targetPatientId) console.log(`Target patient: ${targetPatientId}`);
  console.log('');

  // 1. Get all finalized notes with encounter data, ordered by patient then date
  let query = supabase
    .from('generated_notes')
    .select('id, final_note_content, generated_at, encounters!inner(patient_id, setting, visit_type, scheduled_start)')
    .eq('is_final', true)
    .not('final_note_content', 'is', null)
    .order('generated_at', { ascending: true });

  if (targetPatientId) {
    query = query.eq('encounters.patient_id', targetPatientId);
  }

  const { data: notes, error } = await query;
  if (error) { console.error('Error fetching notes:', error); process.exit(1); }
  if (!notes || notes.length === 0) { console.log('No finalized notes found.'); process.exit(0); }

  console.log(`Found ${notes.length} finalized notes`);

  // 2. Group by patient
  const byPatient = new Map<string, typeof notes>();
  for (const note of notes) {
    const pid = (note as any).encounters.patient_id;
    if (!byPatient.has(pid)) byPatient.set(pid, []);
    byPatient.get(pid)!.push(note);
  }

  console.log(`Across ${byPatient.size} patients\n`);

  // 3. Process each patient chronologically
  let totalExtracted = 0;
  let totalErrors = 0;

  for (const [patientId, patientNotes] of byPatient) {
    console.log(`--- Patient ${patientId} (${patientNotes.length} notes) ---`);

    let profile = createEmptyProfile();

    for (let i = 0; i < patientNotes.length; i++) {
      const note = patientNotes[i];
      const encounter = (note as any).encounters;
      const setting = encounter.setting || 'Unknown';
      const visitType = encounter.visit_type || 'Unknown';
      const noteDate = encounter.scheduled_start?.split('T')[0] || note.generated_at?.split('T')[0];
      const noteContent = note.final_note_content || '';

      if (!noteContent || noteContent.length < 100) {
        console.log(`  [${i + 1}/${patientNotes.length}] Skipping (too short: ${noteContent.length} chars)`);
        continue;
      }

      console.log(`  [${i + 1}/${patientNotes.length}] ${setting} - ${visitType} (${noteDate}) — ${noteContent.length} chars`);

      if (dryRun) {
        console.log(`    [DRY RUN] Would extract and merge`);
        profile.sourceNoteCount++;
        continue;
      }

      try {
        const startTime = Date.now();
        const extraction = await extractFromNote(noteContent, setting, visitType);
        const latencyMs = Date.now() - startTime;

        // Save extraction snapshot
        await supabase.from('patient_profile_extractions').insert({
          patient_id: patientId,
          note_id: note.id,
          extracted_data: extraction,
          extraction_model: geminiModel,
          extraction_latency_ms: latencyMs,
          note_date: noteDate,
          setting,
          visit_type: visitType,
        });

        // Merge
        profile = mergeProfiles(profile, extraction, noteDate);
        totalExtracted++;

        console.log(`    Extracted in ${latencyMs}ms — ${profile.diagnoses.length} dx, ${profile.currentMedications.length} current meds`);

        // Rate limit
        await sleep(2000);
      } catch (err: any) {
        totalErrors++;
        console.error(`    ERROR: ${err.message}`);
        // Continue to next note
        await sleep(3000);
      }
    }

    // 4. Upsert final profile for this patient
    if (!dryRun && profile.sourceNoteCount > 0) {
      const { error: upsertError } = await supabase
        .from('patient_profiles')
        .upsert({
          patient_id: patientId,
          profile_data: profile,
          version: profile.sourceNoteCount,
          last_note_id: patientNotes[patientNotes.length - 1].id,
          last_extracted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'patient_id' });

      if (upsertError) {
        console.error(`  ERROR upserting profile: ${upsertError.message}`, JSON.stringify(upsertError, null, 2));
      } else {
        console.log(`  Profile saved (v${profile.sourceNoteCount}): ${profile.diagnoses.length} dx, ${profile.currentMedications.length} current meds, ${profile.pastMedications.length} past meds`);
      }
    } else if (dryRun) {
      console.log(`  [DRY RUN] Would save profile (v${profile.sourceNoteCount})`);
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log(`Patients processed: ${byPatient.size}`);
  console.log(`Notes extracted: ${totalExtracted}`);
  console.log(`Errors: ${totalErrors}`);
  if (dryRun) console.log('(DRY RUN — no changes made)');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
