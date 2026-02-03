/**
 * Note Mapper
 *
 * Maps Epic Scribe generated note sections to IntakeQ form fields.
 */

import { IntakeQFieldMapping, NoteSection } from './types';

/**
 * Default field mapping for Moonlit Psychiatry notes
 *
 * Update these mappings based on your actual IntakeQ note template.
 * The questionText values must match the question labels in IntakeQ.
 */
export const MOONLIT_NOTE_MAPPING: IntakeQFieldMapping[] = [
  {
    epicScribeSection: 'Chief Complaint',
    intakeQQuestionText: 'Chief Complaint',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'History of Present Illness',
    intakeQQuestionText: 'History of Present Illness',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Psychiatric History',
    intakeQQuestionText: 'Psychiatric History',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Past Medical History',
    intakeQQuestionText: 'Past Medical History',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Current Medications',
    intakeQQuestionText: 'Current Medications',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Allergies',
    intakeQQuestionText: 'Allergies',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Social History',
    intakeQQuestionText: 'Social History',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Family History',
    intakeQQuestionText: 'Family History',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Mental Status Examination',
    intakeQQuestionText: 'Mental Status Examination',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Assessment',
    intakeQQuestionText: 'Assessment',
    fieldType: 'textarea',
  },
  {
    epicScribeSection: 'Plan',
    intakeQQuestionText: 'Plan',
    fieldType: 'textarea',
  },
];

/**
 * Extract a section from a generated note by section name
 *
 * Handles multiple formats:
 * - ## Section Name
 * - **Section Name:**
 * - SECTION NAME:
 */
export function extractSection(note: string, sectionName: string): string | null {
  // Escape special regex characters in section name
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Try multiple patterns
  const patterns = [
    // Markdown header: ## Section Name
    new RegExp(
      `(?:^|\\n)##\\s*${escapedName}[:\\s]*\\n([\\s\\S]*?)(?=\\n##\\s*[A-Z]|\\n\\*\\*[A-Z]|$)`,
      'i'
    ),
    // Bold header: **Section Name:**
    new RegExp(
      `(?:^|\\n)\\*\\*${escapedName}[:\\s]*\\*\\*[:\\s]*\\n?([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|\\n##|$)`,
      'i'
    ),
    // Plain header: SECTION NAME:
    new RegExp(
      `(?:^|\\n)${escapedName}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z\\s]+:|\\n##|\\n\\*\\*|$)`,
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
 * Map an Epic Scribe generated note to IntakeQ form sections
 */
export function mapEpicScribeNoteToIntakeQ(
  generatedNote: string,
  mapping: IntakeQFieldMapping[] = MOONLIT_NOTE_MAPPING
): NoteSection[] {
  const sections: NoteSection[] = [];

  for (const field of mapping) {
    const sectionContent = extractSection(generatedNote, field.epicScribeSection);

    if (sectionContent) {
      sections.push({
        questionId: field.intakeQQuestionId,
        questionText: field.intakeQQuestionText,
        value: sectionContent,
      });
    } else {
      console.warn(`[NoteMapper] Section not found: ${field.epicScribeSection}`);
    }
  }

  return sections;
}

/**
 * Parse the entire note as a single block (fallback for simple templates)
 */
export function parseNoteAsWholeDocument(generatedNote: string): NoteSection {
  return {
    questionText: 'Clinical Note',
    value: generatedNote,
  };
}
