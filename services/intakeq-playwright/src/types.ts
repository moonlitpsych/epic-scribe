/**
 * IntakeQ Playwright Automation Types
 */

export interface IntakeQCredentials {
  email: string;
  password: string;
}

export interface NoteSection {
  questionId?: string;           // If targeting specific field by ID
  questionText: string;          // Fallback: match by text
  value: string;
}

export interface DiagnosisCode {
  code: string;                  // ICD-10 code, e.g., "F32.1"
  description: string;           // e.g., "Major Depressive Disorder, Single Episode, Moderate"
}

export interface NoteToCreate {
  clientId: number;
  templateName: string;          // Must match IntakeQ template name exactly
  noteContent: NoteSection[];    // Mapped form fields
  diagnoses: DiagnosisCode[];    // ICD-10 codes to add
  signatureRequired: boolean;
  appointmentId?: string;        // Optional: link to existing appointment
}

export interface CreateNoteResult {
  success: boolean;
  noteId?: string;
  noteUrl?: string;
  error?: string;
}

export interface AutomationConfig {
  headless?: boolean;            // Default: true
  slowMo?: number;               // Slow down actions (ms), default: 50
  timeout?: number;              // Default timeout (ms), default: 30000
  screenshotOnError?: boolean;   // Take screenshot on failure
  screenshotDir?: string;        // Where to save screenshots
}

export interface IntakeQFieldMapping {
  epicScribeSection: string;     // Section name in generated note
  intakeQQuestionId?: string;    // Optional: known question ID
  intakeQQuestionText: string;   // Question text to match
  fieldType: 'textarea' | 'text' | 'select' | 'multiselect' | 'checkbox';
}
