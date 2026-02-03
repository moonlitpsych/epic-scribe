/**
 * IntakeQ API Service
 * Provides read access to IntakeQ patient notes
 */

export { IntakeQApiClient, IntakeQApiError } from './client';
export { formatIntakeQNoteForEpicScribe, extractClinicalSummary } from './note-formatter';
export type {
  IntakeQApiConfig,
  IntakeQClient,
  IntakeQNoteSummary,
  IntakeQFullNote,
  IntakeQQuestion,
  IntakeQMatrixRow,
  IntakeQMatrixCell,
  GetClientNotesOptions,
} from './types';
