/**
 * Previous Note Parser
 * Extracts structured data from previous clinical notes for intelligent reuse in follow-ups
 */

export interface ExtractedNoteData {
  patientFirstName?: string;
  patientLastName?: string;
  providerName?: string;
  planSection?: string;
  dateOfService?: string;
}

export class NoteParser {
  /**
   * Parse a previous note and extract key structured data
   */
  parsePreviousNote(noteText: string): ExtractedNoteData {
    const extracted: ExtractedNoteData = {};

    try {
      // Extract patient name (look for "Patient: FirstName LastName" pattern)
      const patientNameMatch = noteText.match(/Patient:\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
      if (patientNameMatch) {
        extracted.patientFirstName = patientNameMatch[1];
        extracted.patientLastName = patientNameMatch[2];
      }

      // Extract provider name (look for "Provider: Name" pattern)
      const providerMatch = noteText.match(/Provider:\s*([^\n]+)/i);
      if (providerMatch) {
        extracted.providerName = providerMatch[1].trim();
      }

      // Extract date of service
      const dateMatch = noteText.match(/Date of Service:\s*([^\n]+)/i);
      if (dateMatch) {
        extracted.dateOfService = dateMatch[1].trim();
      }

      // Extract entire Plan section
      extracted.planSection = this.extractPlanSection(noteText);

    } catch (error) {
      console.warn('[NoteParser] Failed to parse previous note:', error);
    }

    return extracted;
  }

  /**
   * Extract the Plan section from a note
   * Looks for section header and extracts content until next section or end
   */
  private extractPlanSection(noteText: string): string | undefined {
    try {
      // Look for "Plan" header (various formats)
      const planMatch = noteText.match(/(?:^|\n)(Plan|PLAN)[\s:]*\n([\s\S]*?)(?=\n\n[A-Z]|\n---|\z)/i);

      if (planMatch) {
        const planContent = planMatch[2].trim();

        // Clean up the plan text
        // Remove excessive whitespace but preserve structure
        const cleaned = planContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n');

        return cleaned;
      }

      // Alternative: Look for numbered plan items
      const numberedPlanMatch = noteText.match(/(?:^|\n)(?:Plan|PLAN)[\s:]*\n((?:\d+\.\s+[^\n]+\n?)+)/i);
      if (numberedPlanMatch) {
        return numberedPlanMatch[1].trim();
      }

    } catch (error) {
      console.warn('[NoteParser] Failed to extract plan section:', error);
    }

    return undefined;
  }

  /**
   * Validate extracted data has minimum required fields
   */
  validateExtracted(data: ExtractedNoteData): boolean {
    return !!(data.patientFirstName && data.patientLastName);
  }

  /**
   * Format extracted data for display in prompt
   */
  formatExtractedData(data: ExtractedNoteData): string {
    const lines: string[] = [];

    if (data.patientFirstName && data.patientLastName) {
      lines.push(`Patient Name: ${data.patientFirstName} ${data.patientLastName}`);
    }

    if (data.providerName) {
      lines.push(`Provider: ${data.providerName}`);
    }

    if (data.dateOfService) {
      lines.push(`Previous Date of Service: ${data.dateOfService}`);
    }

    if (data.planSection) {
      lines.push(`\nPrevious Plan (baseline to modify):`);
      lines.push(data.planSection);
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const noteParser = new NoteParser();
