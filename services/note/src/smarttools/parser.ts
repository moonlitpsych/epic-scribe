/**
 * SmartTools Parser
 * Extracts Epic SmartTools elements from text
 * Handles: SmartLinks (@id@), DotPhrases (.id), Wildcards (***), SmartLists ({Display:ID})
 */

import { ParsedSmartTools } from '@epic-scribe/types';

// Regex patterns for SmartTools elements
export const PATTERNS = {
  // SmartLink: @identifier@ format
  SMARTLINK: /@([A-Za-z0-9_]+)@/g,

  // DotPhrase: .identifier format (avoid matching decimals)
  DOTPHRASE: /(?<![0-9])\.([A-Za-z][A-Za-z0-9_]*)/g,

  // Wildcard: *** exactly
  WILDCARD: /\*\*\*/g,

  // SmartList: {Display Name:EpicID} format
  SMARTLIST: /\{([^:}]+):(\d+)\}/g,
};

export class SmartToolsParser {
  /**
   * Parse all SmartTools elements from text
   * @param text - Text containing SmartTools elements
   * @returns Parsed SmartTools with positions and metadata
   */
  parse(text: string): ParsedSmartTools {
    const result: ParsedSmartTools = {
      smartLinks: [],
      dotPhrases: [],
      wildcards: [],
      smartLists: [],
    };

    // Parse SmartLinks
    let match;
    PATTERNS.SMARTLINK.lastIndex = 0;
    while ((match = PATTERNS.SMARTLINK.exec(text)) !== null) {
      result.smartLinks.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        identifier: match[1],
      });
    }

    // Parse DotPhrases
    PATTERNS.DOTPHRASE.lastIndex = 0;
    while ((match = PATTERNS.DOTPHRASE.exec(text)) !== null) {
      result.dotPhrases.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        identifier: match[1],
      });
    }

    // Parse Wildcards
    PATTERNS.WILDCARD.lastIndex = 0;
    while ((match = PATTERNS.WILDCARD.exec(text)) !== null) {
      result.wildcards.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Parse SmartLists
    PATTERNS.SMARTLIST.lastIndex = 0;
    while ((match = PATTERNS.SMARTLIST.exec(text)) !== null) {
      result.smartLists.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        display: match[1].trim(),
        epicId: match[2],
      });
    }

    return result;
  }

  /**
   * Extract all unique SmartLink identifiers from text
   * @param text - Text to parse
   * @returns Array of unique SmartLink identifiers
   */
  extractSmartLinkIdentifiers(text: string): string[] {
    const identifiers = new Set<string>();
    const parsed = this.parse(text);

    for (const smartLink of parsed.smartLinks) {
      identifiers.add(smartLink.identifier);
    }

    return Array.from(identifiers);
  }

  /**
   * Extract all unique SmartList IDs from text
   * @param text - Text to parse
   * @returns Array of unique SmartList epic IDs
   */
  extractSmartListIds(text: string): string[] {
    const ids = new Set<string>();
    const parsed = this.parse(text);

    for (const smartList of parsed.smartLists) {
      ids.add(smartList.epicId);
    }

    return Array.from(ids);
  }

  /**
   * Check if text contains any SmartTools elements
   * @param text - Text to check
   * @returns true if SmartTools elements found
   */
  containsSmartTools(text: string): boolean {
    const parsed = this.parse(text);
    return (
      parsed.smartLinks.length > 0 ||
      parsed.dotPhrases.length > 0 ||
      parsed.wildcards.length > 0 ||
      parsed.smartLists.length > 0
    );
  }

  /**
   * Count SmartTools elements by type
   * @param text - Text to analyze
   * @returns Count of each SmartTool type
   */
  countSmartTools(text: string): {
    smartLinks: number;
    dotPhrases: number;
    wildcards: number;
    smartLists: number;
    total: number;
  } {
    const parsed = this.parse(text);
    return {
      smartLinks: parsed.smartLinks.length,
      dotPhrases: parsed.dotPhrases.length,
      wildcards: parsed.wildcards.length,
      smartLists: parsed.smartLists.length,
      total:
        parsed.smartLinks.length +
        parsed.dotPhrases.length +
        parsed.wildcards.length +
        parsed.smartLists.length,
    };
  }

  /**
   * Validate SmartList format
   * @param text - SmartList text to validate
   * @returns true if valid SmartList format
   */
  isValidSmartList(text: string): boolean {
    return PATTERNS.SMARTLIST.test(text);
  }

  /**
   * Validate SmartLink format
   * @param text - SmartLink text to validate
   * @returns true if valid SmartLink format
   */
  isValidSmartLink(text: string): boolean {
    return PATTERNS.SMARTLINK.test(text);
  }

  /**
   * Get positions of all SmartTools for highlighting
   * @param text - Text to analyze
   * @returns Array of positions with type information
   */
  getHighlightPositions(text: string): Array<{
    start: number;
    end: number;
    type: 'smartlink' | 'dotphrase' | 'wildcard' | 'smartlist';
    identifier?: string;
  }> {
    const parsed = this.parse(text);
    const positions: Array<{
      start: number;
      end: number;
      type: 'smartlink' | 'dotphrase' | 'wildcard' | 'smartlist';
      identifier?: string;
    }> = [];

    // Add all SmartLinks
    for (const item of parsed.smartLinks) {
      positions.push({
        start: item.start,
        end: item.end,
        type: 'smartlink',
        identifier: item.identifier,
      });
    }

    // Add all DotPhrases
    for (const item of parsed.dotPhrases) {
      positions.push({
        start: item.start,
        end: item.end,
        type: 'dotphrase',
        identifier: item.identifier,
      });
    }

    // Add all Wildcards
    for (const item of parsed.wildcards) {
      positions.push({
        start: item.start,
        end: item.end,
        type: 'wildcard',
      });
    }

    // Add all SmartLists
    for (const item of parsed.smartLists) {
      positions.push({
        start: item.start,
        end: item.end,
        type: 'smartlist',
        identifier: `${item.display}:${item.epicId}`,
      });
    }

    // Sort by position
    return positions.sort((a, b) => a.start - b.start);
  }
}

// Export singleton instance
export const smartToolsParser = new SmartToolsParser();