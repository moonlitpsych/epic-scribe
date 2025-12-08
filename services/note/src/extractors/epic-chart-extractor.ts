/**
 * Epic Chart Data Extractor
 *
 * Extracts structured data (questionnaire scores, medications) from pasted Epic DotPhrase output.
 * The AI receives the full raw text for context, but only the extracted structured data is persisted.
 */

import { EpicChartData, QuestionnaireScore, Medication } from '@epic-scribe/types';

export class EpicChartExtractor {
  /**
   * Extract structured data from raw Epic DotPhrase text
   */
  extract(rawText: string): EpicChartData {
    if (!rawText?.trim()) {
      return {};
    }

    const data: EpicChartData = {
      questionnaires: {},
      medications: { current: [], past: [] },
      raw_text_excerpt: rawText.substring(0, 500), // First 500 chars for debugging
    };

    // Extract questionnaire scores
    const phq9 = this.extractPHQ9(rawText);
    if (phq9) {
      data.questionnaires!.phq9 = phq9;
    }

    const gad7 = this.extractGAD7(rawText);
    if (gad7) {
      data.questionnaires!.gad7 = gad7;
    }

    // Extract medications
    data.medications!.current = this.extractCurrentMedications(rawText);
    data.medications!.past = this.extractPastMedications(rawText);

    // Clean up empty objects
    if (Object.keys(data.questionnaires || {}).length === 0) {
      delete data.questionnaires;
    }
    if ((data.medications?.current?.length || 0) === 0 && (data.medications?.past?.length || 0) === 0) {
      delete data.medications;
    }

    return data;
  }

  /**
   * Extract PHQ-9 score from text
   * Handles various formats: "PHQ-9: 18", "PHQ9 = 18/27", "PHQ-9 score of 18"
   */
  private extractPHQ9(text: string): QuestionnaireScore | null {
    // Pattern matches: PHQ-9: 18, PHQ9: 18/27, PHQ-9 score: 18, PHQ-9 = 18
    const patterns = [
      /PHQ[-\s]?9[:\s=]+(\d+)(?:\/27)?/i,
      /PHQ[-\s]?9\s+(?:score|total)[:\s=]+(\d+)/i,
      /PHQ[-\s]?9[:\s]+(\d+)\s*(?:\/\s*27)?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const score = parseInt(match[1], 10);
        if (score >= 0 && score <= 27) {
          return {
            score,
            severity: this.getPHQ9Severity(score),
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract GAD-7 score from text
   */
  private extractGAD7(text: string): QuestionnaireScore | null {
    const patterns = [
      /GAD[-\s]?7[:\s=]+(\d+)(?:\/21)?/i,
      /GAD[-\s]?7\s+(?:score|total)[:\s=]+(\d+)/i,
      /GAD[-\s]?7[:\s]+(\d+)\s*(?:\/\s*21)?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const score = parseInt(match[1], 10);
        if (score >= 0 && score <= 21) {
          return {
            score,
            severity: this.getGAD7Severity(score),
          };
        }
      }
    }

    return null;
  }

  /**
   * Get PHQ-9 severity classification
   */
  private getPHQ9Severity(score: number): string {
    if (score < 5) return 'minimal';
    if (score < 10) return 'mild';
    if (score < 15) return 'moderate';
    if (score < 20) return 'moderately severe';
    return 'severe';
  }

  /**
   * Get GAD-7 severity classification
   */
  private getGAD7Severity(score: number): string {
    if (score < 5) return 'minimal';
    if (score < 10) return 'mild';
    if (score < 15) return 'moderate';
    return 'severe';
  }

  /**
   * Extract current medications from text
   * Looks for "Current Medications:", "Active Medications:", etc.
   */
  private extractCurrentMedications(text: string): Medication[] {
    const sectionPatterns = [
      /(?:Current|Active)\s+(?:Psychiatric\s+)?Medications?[:\s]+([\s\S]*?)(?=\n\s*\n|Past|Previous|Discontinued|$)/i,
      /Medications?[:\s]+([\s\S]*?)(?=\n\s*\n|Past|Previous|Discontinued|$)/i,
    ];

    for (const pattern of sectionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseMedicationList(match[1]);
      }
    }

    return [];
  }

  /**
   * Extract past/discontinued medications from text
   */
  private extractPastMedications(text: string): Medication[] {
    const sectionPatterns = [
      /(?:Past|Previous|Discontinued|Failed|Tried)\s+(?:Psychiatric\s+)?Medications?[:\s]+([\s\S]*?)(?=\n\s*\n|Current|Active|$)/i,
      /Medications?\s+(?:Tried|Failed|Discontinued)[:\s]+([\s\S]*?)(?=\n\s*\n|$)/i,
    ];

    for (const pattern of sectionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseMedicationList(match[1], true);
      }
    }

    return [];
  }

  /**
   * Parse a medication list section into individual medications
   */
  private parseMedicationList(section: string, isPast: boolean = false): Medication[] {
    const medications: Medication[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
      const med = this.parseMedicationLine(line, isPast);
      if (med) {
        medications.push(med);
      }
    }

    return medications;
  }

  /**
   * Parse a single medication line
   * Handles formats like:
   * - "Sertraline 100mg daily"
   * - "1. Sertraline (Zoloft) 100mg PO daily"
   * - "- Fluoxetine 40mg (ineffective)"
   * - "Bupropion XL 300mg qAM"
   */
  private parseMedicationLine(line: string, isPast: boolean = false): Medication | null {
    // Remove list prefixes (numbers, bullets, dashes)
    let cleaned = line.replace(/^\s*[\d\-\*\.•]+\s*/, '').trim();

    // Skip empty lines or headers
    if (!cleaned || /^(Current|Past|Active|Discontinued|Medications?)/i.test(cleaned)) {
      return null;
    }

    // Common medication name pattern (allow for brand names in parentheses)
    // Pattern: MedName (BrandName)? DoseAmount?mg? Frequency?
    const medPattern = /^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(?:\([^)]+\))?\s*(\d+\s*(?:mg|mcg|g)?)?(?:\s*(XL|XR|SR|ER|CR|LA|DR))?\s*(.*?)$/i;

    const match = cleaned.match(medPattern);
    if (!match) {
      // Fallback: just try to get a medication name
      const simpleMatch = cleaned.match(/^([A-Za-z]+)/);
      if (simpleMatch) {
        return { name: simpleMatch[1] };
      }
      return null;
    }

    const med: Medication = {
      name: match[1].trim(),
    };

    // Add formulation suffix if present (XL, XR, etc.)
    if (match[3]) {
      med.name += ` ${match[3].toUpperCase()}`;
    }

    // Add dose if present
    if (match[2]) {
      med.dose = match[2].trim();
      // Normalize: add 'mg' if just a number
      if (/^\d+$/.test(med.dose)) {
        med.dose += 'mg';
      }
    }

    // Parse remaining text for frequency or reason stopped
    const remaining = match[4]?.trim();
    if (remaining) {
      if (isPast) {
        // Look for reason stopped in parentheses or after common indicators
        const reasonMatch = remaining.match(/(?:\(([^)]+)\)|(?:d\/c|discontinued|stopped)\s+(?:due to|for|because of)\s*(.+))/i);
        if (reasonMatch) {
          med.reason_stopped = (reasonMatch[1] || reasonMatch[2])?.trim();
        } else if (remaining && !/^(PO|daily|qd|bid|tid|qid|prn|qhs|qam|qpm)/i.test(remaining)) {
          // If it doesn't look like a frequency, treat it as reason stopped
          med.reason_stopped = remaining;
        }
      } else {
        // Current medication - remaining is likely frequency
        const freqMatch = remaining.match(/(PO\s+)?(?:daily|qd|bid|tid|qid|prn|qhs|qam|qpm|q\d+h|at bedtime|in morning|at night|twice daily|once daily)/i);
        if (freqMatch) {
          med.frequency = freqMatch[0].trim();
        } else if (remaining && remaining.length < 30) {
          med.frequency = remaining;
        }
      }
    }

    return med;
  }
}

// Export singleton instance
export const epicChartExtractor = new EpicChartExtractor();
