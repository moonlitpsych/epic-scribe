// Settings and Visit Types
export const SETTINGS = [
  'HMHI Downtown RCC',
  'Redwood Clinic MHI',
  'Davis Behavioral Health',
  'Moonlit Psychiatry',
  'BHIDC therapy'
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

// Generation Types
export interface GenerateNoteRequest {
  encounterId?: string;
  patientId?: string;  // Optional direct patient ID for standalone generation
  setting: Setting;
  visitType: VisitType;
  transcript: string;
  priorNote?: string;
  staffingTranscript?: string; // Optional separate staffing conversation transcript
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