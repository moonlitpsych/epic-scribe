/**
 * Epic Note Parser
 *
 * Parses copy-forward notes from Epic EMR to extract patient info and metadata.
 * Used by the clipboard watcher to automatically detect and import prior notes.
 */

import { ParsedEpicNote, EpicNoteParserOptions } from './types';

/**
 * Maps header text patterns to Epic Scribe settings
 */
const SETTING_MAPPINGS: Record<string, string> = {
  'HMHI': 'HMHI Downtown RCC',
  'HMHI Downtown': 'HMHI Downtown RCC',
  'Redwood': 'Redwood Clinic MHI',
  'Redwood Clinic': 'Redwood Clinic MHI',
  'Davis': 'Davis Behavioral Health',
  'Davis Behavioral': 'Davis Behavioral Health',
  'Moonlit': 'Moonlit Psychiatry',
  'Teenscope': 'Teenscope South',
  'BHIDC': 'BHIDC therapy',
};

/**
 * Patterns used to detect if clipboard content is an Epic note
 */
const EPIC_DETECTION_PATTERNS = [
  /^Name:\s+.+$/m,                    // Patient name line
  /^DOB:\s*\d{1,2}\/\d{1,2}\/\d{4}/m, // DOB line
  /^(UNIVERSITY\s+HEALTHCARE|HMHI|Redwood|Davis|Moonlit|Teenscope|BHIDC)/im, // Header
];

export class EpicNoteParser {
  private options: EpicNoteParserOptions;

  constructor(options: EpicNoteParserOptions = {}) {
    this.options = {
      minConfidence: 0.5,
      ...options,
    };
  }

  /**
   * Check if the given text appears to be an Epic note
   */
  isEpicNote(content: string): boolean {
    if (!content || content.length < 50) {
      return false;
    }

    // Must have Name: line AND DOB: line (minimum requirements)
    const hasName = /^Name:\s+.+$/m.test(content);
    const hasDob = /^DOB:\s*\d{1,2}\/\d{1,2}\/\d{4}/m.test(content);

    return hasName && hasDob;
  }

  /**
   * Parse an Epic note and extract structured data
   */
  parse(content: string): ParsedEpicNote {
    const warnings: string[] = [];

    // Extract patient name
    const { firstName, lastName, nameWarning } = this.extractName(content);
    if (nameWarning) warnings.push(nameWarning);

    // Extract DOB and calculate age
    const { dateOfBirth, age, dobWarning } = this.extractDob(content);
    if (dobWarning) warnings.push(dobWarning);

    // Extract setting from header
    const setting = this.extractSetting(content);

    // Extract note type
    const noteType = this.extractNoteType(content);

    // Extract provider name from signature
    const providerName = this.extractProviderName(content);

    // Calculate confidence score
    const confidence = this.calculateConfidence({
      hasName: !!firstName && !!lastName,
      hasDob: !!dateOfBirth,
      hasSetting: !!setting,
      hasNoteType: !!noteType,
      hasProvider: !!providerName,
    });

    const isValid = confidence >= (this.options.minConfidence || 0.5) && !!firstName && !!lastName;

    return {
      isValid,
      confidence,
      patientFirstName: firstName || undefined,
      patientLastName: lastName || undefined,
      dateOfBirth,
      age,
      setting,
      noteType,
      providerName,
      fullContent: content,
      warnings,
    };
  }

  /**
   * Extract patient name from "Name: FirstName LastName" or "Name: LastName, FirstName"
   */
  private extractName(content: string): {
    firstName?: string;
    lastName?: string;
    nameWarning?: string;
  } {
    const nameMatch = content.match(/^Name:\s*(.+?)$/im);

    if (!nameMatch) {
      return { nameWarning: 'Could not find Name: line in note' };
    }

    const nameStr = nameMatch[1].trim();

    // Handle "LastName, FirstName" format
    if (nameStr.includes(',')) {
      const parts = nameStr.split(',').map((s) => s.trim());
      const lastName = parts[0];
      // First name might have middle name, just take first word
      const firstName = parts[1]?.split(/\s+/)[0] || '';

      return { firstName, lastName };
    }

    // Handle "FirstName LastName" format
    const parts = nameStr.split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      return { firstName, lastName };
    }

    // Single word name
    if (parts.length === 1) {
      return {
        lastName: parts[0],
        nameWarning: 'Only found single name, using as last name',
      };
    }

    return { nameWarning: 'Could not parse patient name' };
  }

  /**
   * Extract DOB from "DOB: M/D/YYYY" format and calculate age
   */
  private extractDob(content: string): {
    dateOfBirth?: string;
    age?: number;
    dobWarning?: string;
  } {
    const dobMatch = content.match(/^DOB:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/im);

    if (!dobMatch) {
      return { dobWarning: 'Could not find DOB: line in note' };
    }

    const month = parseInt(dobMatch[1], 10);
    const day = parseInt(dobMatch[2], 10);
    const year = parseInt(dobMatch[3], 10);

    // Validate date components
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
      return { dobWarning: `Invalid date components: ${dobMatch[0]}` };
    }

    // Format as ISO date
    const dateOfBirth = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    // Calculate age
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return { dateOfBirth, age };
  }

  /**
   * Detect setting from header lines (first 10 lines of note)
   */
  private extractSetting(content: string): string | undefined {
    const headerLines = content.split('\n').slice(0, 10);

    for (const line of headerLines) {
      for (const [pattern, setting] of Object.entries(SETTING_MAPPINGS)) {
        if (line.toUpperCase().includes(pattern.toUpperCase())) {
          return setting;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract note/visit type from content
   */
  private extractNoteType(content: string): string | undefined {
    const patterns = [
      /Outpatient\s+Psychiatric\s+Evaluation/i,
      /Follow[- ]?up\s+(Visit|Appointment)?/i,
      /Transfer\s+of\s+Care/i,
      /Consultation(\s+Visit)?/i,
      /Initial\s+(Evaluation|Assessment)/i,
      /Intake(\s+Evaluation)?/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Extract provider name from signature (look for "Name, MD" pattern)
   */
  private extractProviderName(content: string): string | undefined {
    // Look for common signature patterns
    const patterns = [
      /([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+),?\s+M\.?D\.?/,
      /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+),?\s+M\.?D\.?/, // Three-word names
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Calculate confidence score based on extracted fields
   */
  private calculateConfidence(checks: {
    hasName: boolean;
    hasDob: boolean;
    hasSetting: boolean;
    hasNoteType: boolean;
    hasProvider: boolean;
  }): number {
    const weights = {
      hasName: 0.35,
      hasDob: 0.25,
      hasSetting: 0.15,
      hasNoteType: 0.15,
      hasProvider: 0.10,
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (checks[key as keyof typeof checks]) {
        score += weight;
      }
    }

    return Math.round(score * 100) / 100;
  }
}

/**
 * Create a parser instance with default options
 */
export function createParser(options?: EpicNoteParserOptions): EpicNoteParser {
  return new EpicNoteParser(options);
}

/**
 * Quick check if text is an Epic note (uses default parser)
 */
export function isEpicNote(content: string): boolean {
  return new EpicNoteParser().isEpicNote(content);
}

/**
 * Parse an Epic note (uses default parser)
 */
export function parseEpicNote(content: string): ParsedEpicNote {
  return new EpicNoteParser().parse(content);
}
