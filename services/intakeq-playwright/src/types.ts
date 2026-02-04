/**
 * IntakeQ Playwright Automation Types
 */

export interface IntakeQCredentials {
  email: string;
  password: string;
}

/**
 * Field type options for IntakeQ forms
 */
export type IntakeQFieldType = 'input' | 'textarea' | 'contenteditable' | 'select' | 'checkbox';

export interface NoteSection {
  sectionNumber?: number;          // IntakeQ section number (1-indexed)
  questionId?: string;             // If targeting specific field by ID
  questionText: string;            // Section title text
  value: string;                   // Content to fill
  fieldType?: IntakeQFieldType;    // Type of form field
  placeholder?: string;            // For input fields
}

export interface DiagnosisCode {
  code: string;                    // ICD-10 code, e.g., "F32.1"
  description: string;             // e.g., "Major Depressive Disorder, Single Episode, Moderate"
}

export interface NoteToCreate {
  clientGuid: string;              // Client GUID (not numeric ID)
  templateName: string;            // Must match IntakeQ template name exactly
  noteContent: NoteSection[];      // Mapped form fields
  diagnoses: DiagnosisCode[];      // ICD-10 codes to add
  signatureRequired: boolean;
  appointmentId?: string;          // Optional: link to existing appointment
}

export interface CreateNoteResult {
  success: boolean;
  noteId?: string;
  noteUrl?: string;
  error?: string;
}

export interface AutomationConfig {
  headless?: boolean;              // Default: true
  slowMo?: number;                 // Slow down actions (ms), default: 50
  timeout?: number;                // Default timeout (ms), default: 30000
  screenshotOnError?: boolean;     // Take screenshot on failure
  screenshotDir?: string;          // Where to save screenshots
}

/**
 * Mapping between Epic Scribe sections and IntakeQ form fields
 */
export interface IntakeQFieldMapping {
  epicScribeSection: string;       // Section name in generated note
  intakeQSectionNumber?: number;   // Section number in IntakeQ (1-indexed)
  intakeQQuestionId?: string;      // Optional: known question ID
  intakeQQuestionText: string;     // Question text to match
  fieldType: IntakeQFieldType;     // Type of form field
  placeholder?: string;            // For input fields with placeholder
  alternateNames?: string[];       // Alternative section names to look for
}

/**
 * Template types supported
 */
export type IntakeQTemplate = 'intake' | 'progress';

/**
 * Result of mapping an Epic Scribe note to IntakeQ format
 */
export interface MappedNoteResult {
  sections: NoteSection[];
  diagnoses: DiagnosisCode[];
  templateName: string;
  unmappedSections?: string[];     // Sections from Epic Scribe that couldn't be mapped
}
