// Settings and Visit Types
export const SETTINGS = [
  'HMHI Downtown RCC',
  'Redwood Clinic MHI',
  'Davis Behavioral Health',
  'Moonlit Psychiatry',
  'BHIDC therapy',
  'Teenscope South',
  'Psycho-oncology (HCI)'
] as const;

export const VISIT_TYPES = [
  'Intake',
  'Consultation Visit', // Redwood alias for Intake
  'Transfer of Care',
  'Follow-up',
  'First Visit' // BHIDC therapy first session
] as const;

export type Setting = typeof SETTINGS[number];
export type VisitType = typeof VISIT_TYPES[number];

// SmartTools Types
export interface SmartLink {
  identifier: string;
  displayName: string;
  atFormat: string; // @identifier@
  dotFormat: string; // .identifier
  description?: string;
  category?: string;
}

export interface SmartListOption {
  value: string;
  order: number;
  is_default?: boolean;
}

export interface SmartList {
  identifier: string;
  epicId: string;
  displayName: string;
  group?: string; // Group name (e.g., "Mental Status Exam")
  options: SmartListOption[];
  placeholder?: string; // {Display:EpicID}
  description?: string;
}

export type SmartToolType = 'smartlink' | 'smartlist' | 'wildcard' | 'dotphrase';

export interface SmartTool {
  type: SmartToolType;
  identifier: string;
  placeholder: string;
  description?: string;
  smartListId?: string; // For smartlist type
}

// Template Types
export interface TemplateSection {
  order: number;
  name: string;
  content: string;
  exemplar?: string; // Example paragraph for tone/shape
}

export interface Template {
  templateId: string;
  name: string;
  setting: Setting;
  visitType: VisitType;
  version: number;
  sections: TemplateSection[];
  smarttools: SmartTool[];
  visitTypeAlias?: VisitType; // For Redwood Consultation Visit -> Intake
}

// Prompt Types
export interface PromptManifest {
  version: number;
  system: string;
  task: string;
  smarttools_rules: string;
  smartlink_examples?: Record<Setting, string[]>;
  mappings: Record<Setting, Record<string, string>>;
  prompts?: Record<Setting, Record<string, PromptOverride>>;
}

export interface PromptOverride {
  task_override?: string;
  smarttools_rules_override?: string;
}

export interface PromptReceipt {
  id: string;
  timestamp: Date;
  promptVersion: number;
  mappingVersion: number;
  templateId: string;
  permutationKey: string; // Setting × Visit Type
  promptHash: string;
  redactedSnapshotPath?: string;
}

// Encounter Types
export interface Encounter {
  id: string;
  dateTime: Date;
  patientName?: string; // Stored only in memory, never persisted
  setting: Setting;
  visitType: VisitType;
  calendarEventId?: string;
  meetLink?: string;
  driveFolderId?: string;
  transcriptFileId?: string;
  priorNoteFileId?: string;
  status: EncounterStatus;
}

export type EncounterStatus =
  | 'scheduled'
  | 'in_progress'
  | 'transcript_pending'
  | 'transcript_ready'
  | 'note_generated'
  | 'completed';

// Epic Chart Data Types (for Epic EMR settings)
export interface QuestionnaireScore {
  score: number;
  date?: string;
  severity?: string;
}

export interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
  reason_stopped?: string;
}

export interface EpicChartData {
  questionnaires?: {
    phq9?: QuestionnaireScore;
    gad7?: QuestionnaireScore;
  };
  medications?: {
    current?: Medication[];
    past?: Medication[];
  };
  raw_text_excerpt?: string; // First 500 chars for debugging
}

// Epic EMR settings that support chart data input
export const EPIC_EMR_SETTINGS: Setting[] = [
  'HMHI Downtown RCC',
  'Redwood Clinic MHI',
  'Davis Behavioral Health',
  'Teenscope South',
  'Psycho-oncology (HCI)'
];

// Output mode for note generation — controls Epic dotphrase/SmartLink formatting
export type OutputMode = 'epic' | 'plain_text';

export function getDefaultOutputMode(setting: Setting): OutputMode {
  return EPIC_EMR_SETTINGS.includes(setting) ? 'epic' : 'plain_text';
}

// Patient Chart History Types (for longitudinal tracking)
export interface PatientQuestionnaireHistory {
  id: string;
  patient_id: string;
  encounter_date: string;
  encounter_id?: string;
  generated_note_id?: string;
  phq9_score?: number;
  phq9_severity?: string;
  gad7_score?: number;
  gad7_severity?: string;
  created_at: string;
}

export interface PatientMedicationHistory {
  id: string;
  patient_id: string;
  recorded_date: string;
  encounter_id?: string;
  generated_note_id?: string;
  current_medications?: Medication[];
  past_medications?: Medication[];
  created_at: string;
}

// Longitudinal chart data for AI prompt (summarized trends)
export interface LongitudinalChartData {
  questionnaire_trends: {
    phq9: { date: string; score: number; severity: string }[];
    gad7: { date: string; score: number; severity: string }[];
  };
  medication_changes: {
    date: string;
    current: Medication[];
    past: Medication[];
  }[];
  summary: {
    phq9_trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    gad7_trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    last_phq9?: { score: number; severity: string; date: string };
    last_gad7?: { score: number; severity: string; date: string };
  };
}

// Generation Types
export interface GenerateNoteRequest {
  encounterId?: string;
  patientId?: string;  // Optional direct patient ID for standalone generation
  setting: Setting;
  visitType: VisitType;
  transcript: string;
  priorNote?: string;
  staffingTranscript?: string; // Optional separate staffing conversation transcript
  collateralTranscript?: string; // Optional collateral (parent/guardian) conversation transcript for Teenscope
  epicChartData?: string; // Optional pasted Epic DotPhrase data (full text - extraction happens server-side)
  healthKitData?: HealthKitClinicalData; // Optional HealthKit clinical data (auto-fetched from DB)
  questionnairesCompleted?: boolean; // Pre-visit PHQ-9/GAD-7 completed (enables 96127 billing)
  outputMode?: OutputMode; // Output format: 'epic' (dotphrases/SmartLinks) or 'plain_text' (clean clinical text)
}

export interface GenerateNoteResponse {
  note: string;
  receipt: PromptReceipt;
  validationIssues?: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'smartlist_invalid' | 'format_violation' | 'missing_section';
  location: string;
  message: string;
  suggestion?: string;
}

// SmartTools Parser Types
export interface ParsedSmartTools {
  smartLinks: Array<{ start: number; end: number; text: string; identifier: string }>;
  dotPhrases: Array<{ start: number; end: number; text: string; identifier: string }>;
  wildcards: Array<{ start: number; end: number }>;
  smartLists: Array<{ start: number; end: number; text: string; display: string; epicId: string }>;
}

// Configuration Types
export interface TemplateMapping {
  templateId: string;
  version: number;
  visitTypeAlias?: VisitType;
}

export interface TemplateMappingConfig {
  [setting: string]: {
    [visitType: string]: TemplateMapping;
  };
}

export interface EncounterSourceConfig {
  calendar_ids: Record<Setting, string>;
  naming_conventions: {
    event_title: string;
    encounter_id_in_description: boolean;
  };
}

export interface DrivePathsConfig {
  root: string;
  pattern: string;
  transcript_extensions: string[];
}

// HealthKit Clinical Data Types (FHIR R4 summaries from iOS app)
export interface HealthKitClinicalData {
  medications?: MedicationSummary[];
  conditions?: ConditionSummary[];
  labResults?: LabResultSummary[];
  vitalSigns?: VitalSignSummary[];
  allergies?: AllergySummary[];
  clinicalNotes?: ClinicalNoteSummary[];
  procedures?: ProcedureSummary[];
}

export interface MedicationSummary {
  // Structured fields (FHIR R4 sources — repeatable, comparable across meds)
  name: string;                          // medicationReference.display or contained Medication.code.text
  dose?: string;                         // dosageInstruction.doseAndRate.doseQuantity/doseRange
  route?: string;                        // dosageInstruction.route.text (e.g., "oral", "intravenous")
  frequency?: string;                    // dosageInstruction.timing normalized (e.g., "once daily", "BID")
  prn?: boolean;                         // dosageInstruction.asNeededBoolean
  rxNormCode?: string;                   // contained Medication.code.coding[rxnorm]
  status?: 'active' | 'stopped' | 'on-hold';
  startDate?: string;                    // authoredOn
  // Rich context (normalized from sig — preserves clinical intent)
  sig?: string;                          // dosageInstruction.text (full prescriber sig, verbatim)
  instructions?: string;                 // Clinical notes extracted from sig (taper plans, titration, special guidance)
  dispensing?: string;                   // dispenseRequest structured data or parsed from sig
}

export interface ConditionSummary {
  displayName: string;
  icd10Code?: string;
  snomedCode?: string;
  clinicalStatus?: 'active' | 'resolved' | 'inactive' | 'remission';
  onsetDate?: string;
}

export interface LabResultSummary {
  name: string;
  value: string;
  units?: string;
  referenceRange?: string;
  loincCode?: string;
  collectionDate?: string;
  isAbnormal?: boolean;
}

export interface VitalSignSummary {
  name: string;
  value: string;
  units?: string;
  loincCode?: string;
  recordedDate?: string;
}

export interface AllergySummary {
  substance: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  onsetDate?: string;
}

export interface ClinicalNoteSummary {
  title: string;
  date: string;
  author?: string;
  narrativeText: string;
  encounterType?: string;
}

export interface ProcedureSummary {
  name: string;
  date?: string;
  cptCode?: string;
  snomedCode?: string;
}

export interface ClinicalDataPayload {
  patientId: string;
  data: HealthKitClinicalData;
  syncTimestamp: string;
}

// Payer Fee Schedule Types (for Listening Coder payer-aware CPT suggestions)
export interface PayerFeeSchedule {
  payerName: string;
  payerId: string;
  payerType: string;
  rates: { cpt: string; allowedCents: number }[];
}

// Structured Patient Profile Types (accumulated across notes)
export interface ProfileDiagnosis {
  name: string;
  icd10Code?: string;
  status: 'active' | 'resolved' | 'in-remission';
  firstDocumentedDate?: string;
  lastDocumentedDate?: string;
}

export interface ProfileMedication {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  status: 'active' | 'discontinued' | 'on-hold';
  startDate?: string;
  endDate?: string;
  response?: string;
  sideEffects?: string[];
  reasonDiscontinued?: string;
}

export interface ProfilePsychiatricHistory {
  hospitalizations: string[];
  suicideAttempts: string[];
  selfHarm: string[];
  priorTreatments: string[];
  priorDiagnoses: string[];
  traumaHistory?: string;
}

export interface ProfileFamilyHistoryEntry {
  relation: string;
  condition: string;
  details?: string;
}

export interface ProfileFamilyHistory {
  entries: ProfileFamilyHistoryEntry[];
}

export interface ProfileSocialHistory {
  livingSituation?: string;
  employment?: string;
  relationships?: string;
  education?: string;
  legal?: string;
  supportSystem?: string;
  additionalDetails?: string[];
}

export interface ProfileSubstanceEntry {
  substance: string;
  pattern: string; // e.g. "daily", "social", "denies", "in remission"
  frequency?: string;
  sobrietyDate?: string;
  consequences?: string[];
}

export interface ProfileSubstanceUse {
  substances: ProfileSubstanceEntry[];
}

export interface ProfileAllergy {
  substance: string;
  reaction?: string;
  severity?: string;
}

export interface ProfileMedicalHistory {
  conditions: string[];
}

export interface ProfileTreatmentThemes {
  formulation?: string;
  keyThemes: string[];
  standingPlanItems: string[];
}

export interface StructuredPatientProfile {
  diagnoses: ProfileDiagnosis[];
  currentMedications: ProfileMedication[];
  pastMedications: ProfileMedication[];
  psychiatricHistory: ProfilePsychiatricHistory;
  familyHistory: ProfileFamilyHistory;
  socialHistory: ProfileSocialHistory;
  substanceUse: ProfileSubstanceUse;
  allergies: ProfileAllergy[];
  medicalHistory: ProfileMedicalHistory;
  treatmentThemes: ProfileTreatmentThemes;
  // Metadata
  lastUpdated: string;
  sourceNoteCount: number;
  lastNoteDate?: string;
}

export type NoteExtractionResult = Partial<StructuredPatientProfile>;

// Error Types
export class SmartToolsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SmartToolsError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public issues: ValidationIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}