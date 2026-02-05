/**
 * IntakeQ Playwright Automation
 *
 * Browser automation for creating notes in IntakeQ.
 */

export { IntakeQAutomation, pushNoteToIntakeQ } from './intakeq-automation';
export { SELECTORS, getSelector, textSelector } from './selectors';
export {
  mapEpicScribeNoteToIntakeQ,
  extractSection,
  extractDiagnoses,
  buildIntakeQNote,
  MOONLIT_NOTE_MAPPING,
  KYLE_ROLLER_INTAKE_MAPPING,
  KYLE_ROLLER_PROGRESS_MAPPING,
} from './note-mapper';
export { extractDiagnosesFromNote, isValidICD10, findAllICD10Codes } from './diagnosis-extractor';
export type { MappedNote } from './note-mapper';
export type {
  IntakeQCredentials,
  NoteSection,
  DiagnosisCode,
  NoteToCreate,
  CreateNoteResult,
  AutomationConfig,
  IntakeQFieldMapping,
  IntakeQFieldType,
} from './types';
