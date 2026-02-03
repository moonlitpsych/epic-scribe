/**
 * IntakeQ Note Formatter
 * Converts IntakeQ question-based notes to readable prose format
 */

import { IntakeQFullNote, IntakeQQuestion, IntakeQMatrixRow } from './types';

/**
 * Format an IntakeQ note into readable prose for use as prior note context
 */
export function formatIntakeQNoteForEpicScribe(note: IntakeQFullNote): string {
  const lines: string[] = [];

  // Header
  lines.push(`=== Prior Note from IntakeQ ===`);
  lines.push(`Date: ${formatDate(note.DateCreated)}`);
  lines.push(`Note Type: ${note.NoteName}`);
  lines.push(`Provider: ${note.PractitionerName}`);
  lines.push('');

  // Process questions
  let currentSection = '';

  for (const question of note.Questions) {
    // Skip office-use only questions
    if (question.OfficeUse) {
      continue;
    }

    // Check if this is a section header (no answer, typically bold/larger text)
    if (isSectionHeader(question)) {
      currentSection = question.Text;
      lines.push(`--- ${currentSection} ---`);
      lines.push('');
      continue;
    }

    // Format based on question type
    const formatted = formatQuestion(question);
    if (formatted) {
      lines.push(formatted);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Check if a question is likely a section header
 */
function isSectionHeader(question: IntakeQQuestion): boolean {
  // Headers typically have no answer and are short
  const hasNoAnswer = !question.Answer || question.Answer.trim() === '';
  const isShort = question.Text.length < 100;
  const looksLikeHeader =
    question.QuestionType === 'Header' ||
    question.QuestionType === 'Label' ||
    question.Text.endsWith(':') ||
    question.Text.toUpperCase() === question.Text;

  return hasNoAnswer && isShort && looksLikeHeader;
}

/**
 * Format a single question/answer pair
 */
function formatQuestion(question: IntakeQQuestion): string | null {
  const questionText = question.Text.trim();

  // Handle matrix questions
  if (question.Rows && question.Rows.length > 0) {
    return formatMatrixQuestion(questionText, question.Rows);
  }

  // Handle standard questions with answers
  if (question.Answer && question.Answer.trim()) {
    const answer = question.Answer.trim();

    // For short answers, put on same line
    if (answer.length < 100 && !answer.includes('\n')) {
      return `${questionText}: ${answer}`;
    }

    // For longer answers, put on separate lines
    return `${questionText}:\n${answer}`;
  }

  return null;
}

/**
 * Format a matrix question (table with rows and columns)
 */
function formatMatrixQuestion(
  questionText: string,
  rows: IntakeQMatrixRow[]
): string | null {
  const formattedRows: string[] = [];

  for (const row of rows) {
    if (!row.Cells || row.Cells.length === 0) continue;

    // Get selected values
    const selectedValues = row.Cells
      .filter(cell => cell.Selected || cell.Value)
      .map(cell => cell.Value || 'Yes');

    if (selectedValues.length > 0) {
      formattedRows.push(`  - ${row.Text}: ${selectedValues.join(', ')}`);
    }
  }

  if (formattedRows.length === 0) {
    return null;
  }

  return `${questionText}:\n${formattedRows.join('\n')}`;
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Extract key clinical information from an IntakeQ note
 * Returns a condensed summary for AI context
 */
export function extractClinicalSummary(note: IntakeQFullNote): {
  diagnoses: string[];
  medications: string[];
  chiefComplaint?: string;
  mentalStatusExam?: string;
  plan?: string;
} {
  const result: {
    diagnoses: string[];
    medications: string[];
    chiefComplaint?: string;
    mentalStatusExam?: string;
    plan?: string;
  } = {
    diagnoses: [],
    medications: [],
  };

  for (const question of note.Questions) {
    const text = question.Text.toLowerCase();
    const answer = question.Answer?.trim();

    if (!answer) continue;

    // Look for diagnoses
    if (text.includes('diagnos') || text.includes('icd') || text.includes('assessment')) {
      // Extract ICD-10 codes or diagnosis text
      const diagnosisMatches = answer.match(/[A-Z]\d{2}(?:\.\d{1,2})?/g);
      if (diagnosisMatches) {
        result.diagnoses.push(...diagnosisMatches);
      } else if (answer.length < 200) {
        result.diagnoses.push(answer);
      }
    }

    // Look for medications
    if (text.includes('medication') || text.includes('prescription') || text.includes('rx')) {
      result.medications.push(answer);
    }

    // Chief complaint
    if (text.includes('chief complaint') || text.includes('reason for visit')) {
      result.chiefComplaint = answer;
    }

    // Mental status exam
    if (text.includes('mental status') || text.includes('mse')) {
      result.mentalStatusExam = answer;
    }

    // Plan
    if (text.includes('plan') && !text.includes('safety plan')) {
      result.plan = answer;
    }
  }

  return result;
}
