import type { Setting } from '@epic-scribe/types';

/**
 * Mapping of settings to their available visit types.
 * Single source of truth — used by SetupRecordStep, QuickNoteModal,
 * NewEncounterModal, EncounterHeader, and NoteTab.
 */
export const VISIT_TYPES_BY_SETTING: Record<Setting, string[]> = {
  'HMHI Downtown RCC': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Redwood Clinic MHI': ['Consultation Visit', 'Transfer of Care', 'Follow-up'],
  'Davis Behavioral Health': ['Intake', 'Transfer of Care', 'Follow-up'],
  'Moonlit Psychiatry': ['Intake', 'Transfer of Care', 'Follow-up'],
  'BHIDC therapy': ['First Visit', 'Follow-up'],
  'Teenscope South': ['Intake', 'Follow-up'],
  'Psycho-oncology (HCI)': ['Intake', 'Follow-up'],
};
