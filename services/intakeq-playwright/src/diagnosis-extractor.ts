/**
 * Diagnosis Extractor
 *
 * Parses ICD-10 diagnosis codes from generated clinical notes.
 */

import { DiagnosisCode } from './types';

/**
 * Common ICD-10 patterns
 */
const ICD10_PATTERN = /([A-Z]\d{2}(?:\.\d{1,2})?)/g;

/**
 * Extract diagnoses from a generated note
 *
 * Looks for patterns like:
 * - "Major Depressive Disorder, Single Episode, Moderate - F32.1"
 * - "F32.1 - Major Depressive Disorder, Single Episode, Moderate"
 * - "F32.1: Major Depressive Disorder"
 * - "1. F32.1 Major Depressive Disorder"
 */
export function extractDiagnosesFromNote(note: string): DiagnosisCode[] {
  const diagnoses: DiagnosisCode[] = [];
  const seen = new Set<string>(); // Deduplicate

  // Find the Assessment or Diagnoses section first
  const diagnosisSection = findDiagnosisSection(note);
  const textToSearch = diagnosisSection || note;

  // Split into lines for better parsing
  const lines = textToSearch.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Skip header lines
    if (trimmedLine.match(/^(##|Diagnos|Assessment|ICD-10)/i)) continue;

    // Pattern 1: "Description - F32.1"
    const pattern1 = trimmedLine.match(/^(.+?)\s*[-–—]\s*([A-Z]\d{2}(?:\.\d{1,2})?)\s*$/);
    if (pattern1) {
      const [, description, code] = pattern1;
      if (!seen.has(code)) {
        diagnoses.push({ code, description: cleanDescription(description) });
        seen.add(code);
      }
      continue;
    }

    // Pattern 2: "F32.1 - Description"
    const pattern2 = trimmedLine.match(/^([A-Z]\d{2}(?:\.\d{1,2})?)\s*[-–—:]\s*(.+)$/);
    if (pattern2) {
      const [, code, description] = pattern2;
      if (!seen.has(code)) {
        diagnoses.push({ code, description: cleanDescription(description) });
        seen.add(code);
      }
      continue;
    }

    // Pattern 3: "1. F32.1 Description" or "- F32.1 Description"
    const pattern3 = trimmedLine.match(/^(?:\d+\.|[-•*])\s*([A-Z]\d{2}(?:\.\d{1,2})?)\s+(.+)$/);
    if (pattern3) {
      const [, code, description] = pattern3;
      if (!seen.has(code)) {
        diagnoses.push({ code, description: cleanDescription(description) });
        seen.add(code);
      }
      continue;
    }

    // Pattern 4: "(F32.1)" embedded in text
    const pattern4 = trimmedLine.match(/(.+?)\s*\(([A-Z]\d{2}(?:\.\d{1,2})?)\)/);
    if (pattern4) {
      const [, description, code] = pattern4;
      if (!seen.has(code)) {
        diagnoses.push({ code, description: cleanDescription(description) });
        seen.add(code);
      }
      continue;
    }
  }

  return diagnoses;
}

/**
 * Find the diagnosis/assessment section of a note
 */
function findDiagnosisSection(note: string): string | null {
  const patterns = [
    // ## Diagnoses or ## Assessment
    /(?:^|\n)##\s*(?:Diagnos[ei]s|Assessment)[:\s]*\n([\s\S]*?)(?=\n##|\n\*\*[A-Z]|$)/i,
    // **Diagnoses:** or **Assessment:**
    /(?:^|\n)\*\*(?:Diagnos[ei]s|Assessment)[:\s]*\*\*[:\s]*\n?([\s\S]*?)(?=\n\*\*[A-Z]|$)/i,
    // DIAGNOSES: or ASSESSMENT:
    /(?:^|\n)(?:DIAGNOS[EI]S|ASSESSMENT)[:\s]*\n([\s\S]*?)(?=\n[A-Z][A-Za-z\s]+:|$)/i,
  ];

  for (const pattern of patterns) {
    const match = note.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Clean up a diagnosis description
 */
function cleanDescription(description: string): string {
  return description
    .replace(/^\d+\.\s*/, '') // Remove leading numbers
    .replace(/^[-•*]\s*/, '') // Remove bullets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validate an ICD-10 code format
 */
export function isValidICD10(code: string): boolean {
  // ICD-10 format: Letter + 2 digits + optional decimal + up to 2 more digits
  return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code);
}

/**
 * Get all ICD-10 codes mentioned anywhere in a note
 * (fallback for unstructured notes)
 */
export function findAllICD10Codes(note: string): string[] {
  const matches = note.match(ICD10_PATTERN) || [];
  return [...new Set(matches)]; // Deduplicate
}
