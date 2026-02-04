/**
 * Note Mapper
 *
 * Maps Epic Scribe generated note sections to IntakeQ form fields.
 *
 * IntakeQ Kyle Roller Intake Note structure (13 sections):
 * 1. Demographics (auto-filled from client record)
 * 2. CC (Chief Complaint) - input field with placeholder="Chief Complaint"
 * 3. HPI - contenteditable rich text
 * 4. Psychiatric Review of Systems - contenteditable
 * 5. Social History - contenteditable
 * 6. Substance Use History - contenteditable
 * 7. Medication History - contenteditable
 * 8. Medical Review of Systems - contenteditable
 * 9. Allergies - checkbox (skip if no allergies)
 * 10. Mental Status Exam (MSE) - contenteditable
 * 11. Risk Assessment - contenteditable
 * 12. Current Diagnosis - via Add Diagnosis flow (ICD-10 codes)
 * 13. Assessment and Plan - contenteditable
 */

import { IntakeQFieldMapping, NoteSection, DiagnosisCode } from './types';

/**
 * IntakeQ section numbers (1-indexed as shown in UI)
 */
export const INTAKEQ_SECTIONS = {
  DEMOGRAPHICS: 1,
  CHIEF_COMPLAINT: 2,
  HPI: 3,
  PSYCHIATRIC_ROS: 4,
  SOCIAL_HISTORY: 5,
  SUBSTANCE_USE: 6,
  MEDICATION_HISTORY: 7,
  MEDICAL_ROS: 8,
  ALLERGIES: 9,
  MSE: 10,
  RISK_ASSESSMENT: 11,
  DIAGNOSIS: 12,
  ASSESSMENT_PLAN: 13,
};

/**
 * Field mapping for Kyle Roller Intake Note template
 *
 * Maps Epic Scribe section names to IntakeQ section numbers and field types
 */
export const KYLE_ROLLER_INTAKE_MAPPING: IntakeQFieldMapping[] = [
  {
    epicScribeSection: 'Chief Complaint',
    intakeQSectionNumber: INTAKEQ_SECTIONS.CHIEF_COMPLAINT,
    intakeQQuestionText: 'CC',
    fieldType: 'input',
    placeholder: 'Chief Complaint',
  },
  {
    epicScribeSection: 'History of Present Illness',
    intakeQSectionNumber: INTAKEQ_SECTIONS.HPI,
    intakeQQuestionText: 'HPI',
    fieldType: 'contenteditable',
    alternateNames: ['History (HPI)', 'HPI', 'History'],
  },
  {
    epicScribeSection: 'Psychiatric Review of Symptoms',
    intakeQSectionNumber: INTAKEQ_SECTIONS.PSYCHIATRIC_ROS,
    intakeQQuestionText: 'Psychiatric Review of Systems',
    fieldType: 'contenteditable',
    alternateNames: ['Psychiatric ROS', 'Psych ROS'],
  },
  {
    epicScribeSection: 'Social History',
    intakeQSectionNumber: INTAKEQ_SECTIONS.SOCIAL_HISTORY,
    intakeQQuestionText: 'Social History',
    fieldType: 'contenteditable',
  },
  {
    epicScribeSection: 'Substance Use',
    intakeQSectionNumber: INTAKEQ_SECTIONS.SUBSTANCE_USE,
    intakeQQuestionText: 'Substance Use History',
    fieldType: 'contenteditable',
    alternateNames: ['Substance Use History', 'Substance Abuse'],
  },
  {
    epicScribeSection: 'Current Medications',
    intakeQSectionNumber: INTAKEQ_SECTIONS.MEDICATION_HISTORY,
    intakeQQuestionText: 'Medication History',
    fieldType: 'contenteditable',
    alternateNames: ['Medications', 'Medication History', 'Past Psychiatric Medications'],
  },
  {
    epicScribeSection: 'Review of Systems',
    intakeQSectionNumber: INTAKEQ_SECTIONS.MEDICAL_ROS,
    intakeQQuestionText: 'Medical Review of Systems',
    fieldType: 'contenteditable',
    alternateNames: ['Medical Review of Systems', 'Medical ROS', 'ROS'],
  },
  {
    epicScribeSection: 'Mental Status Examination',
    intakeQSectionNumber: INTAKEQ_SECTIONS.MSE,
    intakeQQuestionText: 'Mental Status Exam (MSE)',
    fieldType: 'contenteditable',
    alternateNames: ['MSE', 'Mental Status Exam'],
  },
  // Note: Risk Assessment is combined into Assessment and Plan in the IntakeQ form
  // so we don't map it as a separate field here
  {
    epicScribeSection: 'Assessment and Plan',
    intakeQSectionNumber: INTAKEQ_SECTIONS.ASSESSMENT_PLAN,
    intakeQQuestionText: 'Assessment and Plan',
    fieldType: 'contenteditable',
    alternateNames: ['Plan', 'Assessment', 'PLAN', 'FORMULATION'],
  },
];

/**
 * Field mapping for Kyle Roller Progress Note template (simpler, fewer sections)
 */
export const KYLE_ROLLER_PROGRESS_MAPPING: IntakeQFieldMapping[] = [
  {
    epicScribeSection: 'Chief Complaint',
    intakeQSectionNumber: 2,
    intakeQQuestionText: 'CC',
    fieldType: 'input',
    placeholder: 'Chief Complaint',
  },
  {
    epicScribeSection: 'History of Present Illness',
    intakeQSectionNumber: 3,
    intakeQQuestionText: 'HPI',
    fieldType: 'contenteditable',
    alternateNames: ['History (HPI)', 'HPI', 'Interval History'],
  },
  {
    epicScribeSection: 'Mental Status Examination',
    intakeQSectionNumber: 4,
    intakeQQuestionText: 'Mental Status Exam (MSE)',
    fieldType: 'contenteditable',
    alternateNames: ['MSE', 'Mental Status Exam'],
  },
  {
    epicScribeSection: 'Assessment and Plan',
    intakeQSectionNumber: 5,
    intakeQQuestionText: 'Assessment and Plan',
    fieldType: 'contenteditable',
    alternateNames: ['Plan', 'Assessment', 'PLAN'],
  },
];

/**
 * Default mapping (alias for Kyle Roller Intake)
 */
export const MOONLIT_NOTE_MAPPING = KYLE_ROLLER_INTAKE_MAPPING;

/**
 * Extract a section from a generated note by section name
 *
 * Handles multiple Epic note formats:
 * - ## Section Name (markdown)
 * - **Section Name:** (bold)
 * - SECTION NAME: (all caps)
 * - Section Name: (title case)
 */
export function extractSection(note: string, sectionName: string, alternateNames?: string[]): string | null {
  const namesToTry = [sectionName, ...(alternateNames || [])];

  for (const name of namesToTry) {
    const result = extractSectionByName(note, name);
    if (result) return result;
  }

  return null;
}

function extractSectionByName(note: string, sectionName: string): string | null {
  // Escape special regex characters in section name
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Try multiple patterns
  const patterns = [
    // Markdown header: ## Section Name
    new RegExp(
      `(?:^|\\n)##\\s*${escapedName}[:\\s]*\\n([\\s\\S]*?)(?=\\n##\\s|\\n\\*\\*[A-Z]|$)`,
      'i'
    ),
    // Bold header: **Section Name:**
    new RegExp(
      `(?:^|\\n)\\*\\*${escapedName}[:\\s]*\\*\\*[:\\s]*\\n?([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|\\n##|$)`,
      'i'
    ),
    // Plain header with colon: Section Name:
    new RegExp(
      `(?:^|\\n)${escapedName}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z\\s]+:|\\n##|\\n\\*\\*|$)`,
      'i'
    ),
    // All caps header: SECTION NAME:
    new RegExp(
      `(?:^|\\n)${escapedName.toUpperCase()}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z]+[:\\s]*\\n|\\n##|\\n\\*\\*|$)`,
      'i'
    ),
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
 * Extract diagnoses (ICD-10 codes) from the note
 *
 * Looks for patterns like:
 * - F32.1 Major depressive disorder
 * - Major depressive disorder (F33.1)
 * - 1. Major depressive disorder, recurrent episode, moderate (HCC) F33.1
 */
export function extractDiagnoses(note: string): DiagnosisCode[] {
  const diagnoses: DiagnosisCode[] = [];

  // Find the DIAGNOSIS section first
  const diagnosisSection = extractSection(note, 'DIAGNOSIS') ||
                          extractSection(note, 'Diagnosis') ||
                          extractSection(note, 'Diagnoses');

  if (!diagnosisSection) {
    console.warn('[NoteMapper] No diagnosis section found');
    return diagnoses;
  }

  // Split into lines for better parsing
  const lines = diagnosisSection.split('\n');

  for (const line of lines) {
    // Skip empty lines or header lines
    if (!line.trim() || line.includes('ICD-10-CM')) continue;

    // Pattern 1: "1. Description (HCC) CODE" or "1. Description CODE"
    // Example: "1.	Major depressive disorder, recurrent episode, moderate (HCC) 	F33.1"
    const pattern1 = /^\d+\.\s*(.+?)\s+([A-Z]\d{2}(?:\.\d{1,2})?)\s*$/i;
    let match = line.match(pattern1);

    if (match) {
      const description = match[1]
        .replace(/\s*\(HCC\)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const code = match[2].toUpperCase();

      if (description && code && !diagnoses.find(d => d.code === code)) {
        diagnoses.push({ code, description });
        continue;
      }
    }

    // Pattern 2: "CODE Description" or "CODE - Description"
    // Example: "F33.1 Major depressive disorder"
    const pattern2 = /([A-Z]\d{2}(?:\.\d{1,2})?)\s*[-–:]?\s+(.+)/i;
    match = line.match(pattern2);

    if (match) {
      const code = match[1].toUpperCase();
      const description = match[2]
        .replace(/\s*\(HCC\)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (description && code && !diagnoses.find(d => d.code === code)) {
        diagnoses.push({ code, description });
      }
    }
  }

  return diagnoses;
}

/**
 * Map an Epic Scribe generated note to IntakeQ form sections
 */
export function mapEpicScribeNoteToIntakeQ(
  generatedNote: string,
  mapping: IntakeQFieldMapping[] = MOONLIT_NOTE_MAPPING
): NoteSection[] {
  const sections: NoteSection[] = [];

  for (const field of mapping) {
    const sectionContent = extractSection(
      generatedNote,
      field.epicScribeSection,
      field.alternateNames
    );

    if (sectionContent) {
      sections.push({
        sectionNumber: field.intakeQSectionNumber,
        questionText: field.intakeQQuestionText,
        value: sectionContent,
        fieldType: field.fieldType,
        placeholder: field.placeholder,
      });
      console.log(`[NoteMapper] ✓ Found section: ${field.epicScribeSection}`);
    } else {
      console.warn(`[NoteMapper] ✗ Section not found: ${field.epicScribeSection}`);
    }
  }

  return sections;
}

/**
 * Combine related Epic Scribe sections for a single IntakeQ field
 *
 * Some IntakeQ fields may need content from multiple Epic sections
 */
export function combineEpicScribeSections(
  note: string,
  sectionNames: string[]
): string {
  const parts: string[] = [];

  for (const name of sectionNames) {
    const content = extractSection(note, name);
    if (content) {
      parts.push(`**${name}:**\n${content}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Build the complete IntakeQ note content from an Epic Scribe note
 *
 * Returns everything needed to fill an IntakeQ note:
 * - sections: Form field content
 * - diagnoses: ICD-10 codes to add via Add Diagnosis flow
 */
export interface MappedNote {
  sections: NoteSection[];
  diagnoses: DiagnosisCode[];
  templateName: string;
}

export function buildIntakeQNote(
  generatedNote: string,
  options: {
    template?: 'intake' | 'progress';
    combineAssessmentAndPlan?: boolean;
  } = {}
): MappedNote {
  const { template = 'intake', combineAssessmentAndPlan = true } = options;

  const mapping = template === 'intake'
    ? KYLE_ROLLER_INTAKE_MAPPING
    : KYLE_ROLLER_PROGRESS_MAPPING;

  const templateName = template === 'intake'
    ? 'Kyle Roller Intake Note'
    : 'Kyle Roller Progress Note';

  const sections = mapEpicScribeNoteToIntakeQ(generatedNote, mapping);

  // Combine Risk Assessment, FORMULATION, and PLAN into Assessment and Plan
  // since IntakeQ doesn't have a separate Risk Assessment field
  if (combineAssessmentAndPlan) {
    const assessmentPlanSection = sections.find(s => s.questionText === 'Assessment and Plan');
    if (assessmentPlanSection) {
      const riskAssessment = extractSection(generatedNote, 'Risk Assessment');
      const formulation = extractSection(generatedNote, 'FORMULATION') ||
                          extractSection(generatedNote, 'Formulation');
      const plan = extractSection(generatedNote, 'PLAN') ||
                   extractSection(generatedNote, 'Plan');

      const parts: string[] = [];

      if (riskAssessment) {
        parts.push(`**Risk Assessment:**\n${riskAssessment}`);
      }
      if (formulation) {
        parts.push(`**Formulation:**\n${formulation}`);
      }
      if (plan) {
        parts.push(`**Plan:**\n${plan}`);
      }

      if (parts.length > 0) {
        assessmentPlanSection.value = parts.join('\n\n');
      }
    }
  }

  const diagnoses = extractDiagnoses(generatedNote);

  return {
    sections,
    diagnoses,
    templateName,
  };
}

/**
 * Get the selector for filling a specific IntakeQ section
 */
export function getSectionSelector(sectionNumber: number, fieldType: string): string {
  if (fieldType === 'input') {
    return `input[placeholder="Chief Complaint"], textarea[placeholder="Chief Complaint"]`;
  }

  // For contenteditable fields, they're typically the Nth contenteditable on the page
  // We'll need to find them by section number in the automation
  return `[contenteditable="true"]`;
}
