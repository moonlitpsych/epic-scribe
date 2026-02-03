/**
 * IntakeQ Playwright Automation
 *
 * Browser automation for creating notes in IntakeQ.
 */

export { IntakeQAutomation } from './intakeq-automation';
export { SELECTORS, getSelector, textSelector } from './selectors';
export { mapEpicScribeNoteToIntakeQ, extractSection, MOONLIT_NOTE_MAPPING } from './note-mapper';
export { extractDiagnosesFromNote, isValidICD10, findAllICD10Codes } from './diagnosis-extractor';
export type {
  IntakeQCredentials,
  NoteSection,
  DiagnosisCode,
  NoteToCreate,
  CreateNoteResult,
  AutomationConfig,
  IntakeQFieldMapping,
} from './types';
