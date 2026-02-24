/**
 * Profile Extractor
 *
 * Uses Gemini to extract a structured patient profile from a single note.
 * Returns a NoteExtractionResult (partial profile) that gets merged into
 * the cumulative StructuredPatientProfile by the merger.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NoteExtractionResult } from '@epic-scribe/types';

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

export interface ExtractionMetadata {
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

/**
 * Extract structured profile data from a note using Gemini.
 */
export async function extractProfileFromNote(
  noteContent: string,
  setting: string,
  visitType: string
): Promise<{ extraction: NoteExtractionResult; metadata: ExtractionMetadata }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const backupKey = process.env.GEMINI_BACKUP_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const fullPrompt = `${EXTRACTION_PROMPT}

Context: This is a ${visitType} note from the ${setting} setting.

NOTE TEXT:
${noteContent}`;

  const startTime = Date.now();
  let result: NoteExtractionResult;
  let tokensUsed: number | undefined;

  // Try primary key, fallback to backup
  for (const key of [apiKey, backupKey].filter(Boolean) as string[]) {
    try {
      const client = new GoogleGenerativeAI(key);
      const genModel = client.getGenerativeModel({
        model,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          topP: 0.95,
        },
      });

      const genResult = await genModel.generateContent(fullPrompt);
      const text = genResult.response.text();
      tokensUsed = genResult.response.usageMetadata?.totalTokenCount;

      // Parse JSON — strip markdown fencing if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      result = JSON.parse(cleaned) as NoteExtractionResult;

      const latencyMs = Date.now() - startTime;
      console.log(`[ProfileExtractor] Extraction completed in ${latencyMs}ms (${tokensUsed || '?'} tokens)`);

      return {
        extraction: result,
        metadata: { model, latencyMs, tokensUsed },
      };
    } catch (err: any) {
      // If quota error and we have a backup, continue to next key
      if (err?.status === 429 && key === apiKey && backupKey) {
        console.warn('[ProfileExtractor] Primary key quota exhausted, trying backup');
        continue;
      }
      throw err;
    }
  }

  throw new Error('Profile extraction failed: all API keys exhausted');
}
