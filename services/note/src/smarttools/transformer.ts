/**
 * SmartTools Transformer
 * Converts between SmartLink and DotPhrase formats
 * Handles all transformations required for Epic compatibility
 */

import { ParsedSmartTools, SmartList } from '@epic-scribe/types';
import { smartToolsParser } from './parser';

export class SmartToolsTransformer {
  /**
   * Convert all SmartLinks (@id@) to DotPhrases (.id) in text
   * @param text - Text containing SmartLinks
   * @returns Text with SmartLinks converted to DotPhrases
   */
  convertSmartLinksToDotPhrases(text: string): string {
    // Replace all @identifier@ with .identifier
    return text.replace(/@([A-Za-z0-9_]+)@/g, '.$1');
  }

  /**
   * Convert all DotPhrases (.id) to SmartLinks (@id@) in text
   * @param text - Text containing DotPhrases
   * @returns Text with DotPhrases converted to SmartLinks
   */
  convertDotPhrasesToSmartLinks(text: string): string {
    // Replace .identifier with @identifier@ (avoid decimals)
    return text.replace(/(?<![0-9])\.([A-Za-z][A-Za-z0-9_]*)/g, '@$1@');
  }

  /**
   * Format a SmartList selection with the :: syntax
   * @param display - Display name of the SmartList
   * @param epicId - Epic ID of the SmartList
   * @param selectedValue - The selected option value
   * @returns Formatted SmartList selection
   */
  formatSmartListSelection(display: string, epicId: string, selectedValue: string): string {
    return `{${display}:${epicId}:: "${selectedValue}"}`;
  }

  /**
   * Parse a SmartList selection to extract the selected value
   * @param text - SmartList selection text
   * @returns Object with display, epicId, and selectedValue
   */
  parseSmartListSelection(text: string): {
    display: string;
    epicId: string;
    selectedValue?: string;
  } | null {
    // Match both unselected and selected formats
    const unselectedMatch = text.match(/\{([^:}]+):(\d+)\}/);
    const selectedMatch = text.match(/\{([^:}]+):(\d+)::\s*"([^"]+)"\}/);

    if (selectedMatch) {
      return {
        display: selectedMatch[1].trim(),
        epicId: selectedMatch[2],
        selectedValue: selectedMatch[3],
      };
    } else if (unselectedMatch) {
      return {
        display: unselectedMatch[1].trim(),
        epicId: unselectedMatch[2],
      };
    }

    return null;
  }

  /**
   * Replace wildcards (***) with provided content
   * @param text - Text containing wildcards
   * @param replacements - Array of replacement texts (in order)
   * @returns Text with wildcards replaced
   */
  replaceWildcards(text: string, replacements: string[]): string {
    let result = text;
    let replacementIndex = 0;

    result = result.replace(/\*\*\*/g, () => {
      if (replacementIndex < replacements.length) {
        return replacements[replacementIndex++];
      }
      // If no replacement available, keep the wildcard
      return '***';
    });

    return result;
  }

  /**
   * Replace wildcards with a map of section replacements
   * @param text - Text containing wildcards
   * @param replacementMap - Map of section names to replacement text
   * @param sectionName - Current section being processed
   * @returns Text with wildcards replaced for this section
   */
  replaceWildcardsInSection(
    text: string,
    replacementMap: Map<string, string>,
    sectionName: string
  ): string {
    const replacement = replacementMap.get(sectionName);
    if (replacement) {
      return text.replace(/\*\*\*/g, replacement);
    }
    return text;
  }

  /**
   * Clean and normalize SmartTools formatting
   * @param text - Text to clean
   * @returns Cleaned text with normalized SmartTools
   */
  normalizeSmartTools(text: string): string {
    let result = text;

    // Normalize SmartLink spacing (remove spaces inside @)
    result = result.replace(/@\s+([A-Za-z0-9_]+)\s+@/g, '@$1@');

    // Normalize SmartList spacing
    result = result.replace(/\{\s*([^:}]+)\s*:\s*(\d+)\s*\}/g, '{$1:$2}');

    // Ensure consistent wildcard format (exactly three asterisks)
    result = result.replace(/\*{2,}/g, (match) => {
      return match.length >= 3 ? '***' : match;
    });

    return result;
  }

  /**
   * Transform text for Epic output (final note format)
   * @param text - Text to transform
   * @param smartListValues - Map of epicId to selected value
   * @returns Transformed text ready for Epic
   */
  transformForEpicOutput(
    text: string,
    smartListValues?: Map<string, string>
  ): string {
    let result = text;

    // Convert SmartLinks to DotPhrases
    result = this.convertSmartLinksToDotPhrases(result);

    // Add selected values to SmartLists if provided
    if (smartListValues) {
      const parsed = smartToolsParser.parse(result);

      // Process SmartLists in reverse order to maintain positions
      for (let i = parsed.smartLists.length - 1; i >= 0; i--) {
        const smartList = parsed.smartLists[i];
        const selectedValue = smartListValues.get(smartList.epicId);

        if (selectedValue) {
          const formatted = this.formatSmartListSelection(
            smartList.display,
            smartList.epicId,
            selectedValue
          );

          result =
            result.substring(0, smartList.start) +
            formatted +
            result.substring(smartList.end);
        }
      }
    }

    return result;
  }

  /**
   * Validate that all SmartLists have selections
   * @param text - Text to validate
   * @returns Array of unselected SmartList identifiers
   */
  findUnselectedSmartLists(text: string): string[] {
    const unselected: string[] = [];
    const smartListPattern = /\{([^:}]+):(\d+)(::.*?)?\}/g;
    let match;

    while ((match = smartListPattern.exec(text)) !== null) {
      // If no :: selection part, it's unselected
      if (!match[3]) {
        unselected.push(`${match[1]}:${match[2]}`);
      }
    }

    return unselected;
  }

  /**
   * Extract SmartTools summary from text
   * @param text - Text to analyze
   * @returns Summary object with counts and lists
   */
  getSmartToolsSummary(text: string) {
    const parsed = smartToolsParser.parse(text);

    return {
      counts: {
        smartLinks: parsed.smartLinks.length,
        dotPhrases: parsed.dotPhrases.length,
        wildcards: parsed.wildcards.length,
        smartLists: parsed.smartLists.length,
      },
      smartLinks: parsed.smartLinks.map(sl => sl.identifier),
      dotPhrases: parsed.dotPhrases.map(dp => dp.identifier),
      smartLists: parsed.smartLists.map(sl => ({
        display: sl.display,
        epicId: sl.epicId,
      })),
      hasWildcards: parsed.wildcards.length > 0,
    };
  }
}

// Export singleton instance
export const smartToolsTransformer = new SmartToolsTransformer();