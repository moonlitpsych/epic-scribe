/**
 * Types for Epic Note Parser
 */

export interface ParsedEpicNote {
  /** Whether the note was successfully parsed with required fields */
  isValid: boolean;

  /** Confidence score 0-1 based on how many fields were extracted */
  confidence: number;

  /** Patient first name */
  patientFirstName?: string;

  /** Patient last name */
  patientLastName?: string;

  /** Date of birth in ISO format (YYYY-MM-DD) */
  dateOfBirth?: string;

  /** Calculated age from DOB */
  age?: number;

  /** Detected Epic Scribe setting (HMHI Downtown RCC, etc.) */
  setting?: string;

  /** Detected note/visit type (Outpatient Psychiatric Evaluation, etc.) */
  noteType?: string;

  /** Date of service if found in note */
  dateOfService?: string;

  /** Provider name from signature */
  providerName?: string;

  /** The full note content */
  fullContent: string;

  /** Any warnings during parsing */
  warnings: string[];
}

export interface EpicNoteParserOptions {
  /** Minimum confidence required to consider note valid (default: 0.5) */
  minConfidence?: number;
}
