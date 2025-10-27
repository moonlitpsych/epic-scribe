/**
 * Prompt Builder Service
 * Compiles templates, transcripts, and SmartList definitions into LLM-ready prompts
 */

import {
  Template,
  Setting,
  VisitType,
  SmartList,
  PromptManifest,
  TemplateSection
} from '@epic-scribe/types';
import { getSmartListService } from '../smartlists/smartlist-service';
import { noteParser, ExtractedNoteData } from '../parsers/note-parser';
import { buildPsychiatricPrompt, SECTION_PROMPT_CONFIGS } from './psychiatric-prompt-builder';
import crypto from 'crypto';

export interface PromptBuilderOptions {
  template: Template;
  transcript: string;
  previousNote?: string;
  patientContext?: string;  // Clinical context from patient record
  setting: Setting;
  visitType: VisitType | string;
}

export interface CompiledPrompt {
  prompt: string;
  hash: string;
  sections: {
    system: string;
    task: string;
    smarttoolsRules: string;
    smartlistDefinitions: string;
    patientContext?: string;
    extractedFromPrior?: ExtractedNoteData;  // NEW: Extracted data for follow-ups
    template: string;
    previousNote?: string;
    transcript: string;
  };
  metadata: {
    templateId: string;
    setting: Setting;
    visitType: VisitType | string;
    timestamp: Date;
    wordCount: number;
    isFollowUp: boolean;  // NEW: Track if this is a follow-up visit
  };
}

export class PromptBuilder {
  private smartListService: any;
  private manifest: PromptManifest;

  constructor() {
    this.manifest = this.loadManifest();
  }

  async initialize() {
    this.smartListService = await getSmartListService();
  }

  /**
   * Load the prompt manifest (in production, from registry.yaml)
   */
  private loadManifest(): PromptManifest {
    // Default manifest - in production, load from prompts/registry.yaml
    return {
      version: 1,
      system: `You are a HIPAA-compliant clinical documentation assistant for Dr. Rufus Sweeney. You generate Epic-ready psychiatry notes with proper SmartTools formatting.`,

      task: `Draft an Epic-ready psychiatry note using the TEMPLATE and TRANSCRIPT provided. Follow the SMARTTOOLS INSTRUCTIONS exactly. Maintain the clinical tone and structure shown in the template exemplars.`,

      smarttools_rules: `CRITICAL SMARTTOOLS INSTRUCTIONS:
1. SMARTLINKS: Convert ALL @identifier@ to .identifier in the final note output
   - Example: @FNAME@ becomes .FNAME
   - Example: @lastvitals@ becomes .lastvitals
   - Example: @age@ becomes .age

2. SMARTLISTS: Replace {Display:EpicID} with ONLY the selected value text
   - Where you see {Sleep Quality:304120106} in the template, output just the value like "Poor quality"
   - Where you see {Mood:304120108} in the template, output just the value like "Anxious"
   - Select ONLY from the provided option list for each SmartList
   - Example: Template has "{Sleep Quality:304120106}" → Output "Poor quality"
   - Example: Template has "{Mood:304120108}" → Output "Depressed"
   - DO NOT include the {Display:EpicID:: } wrapper in your output
   - Output plain text values only
   - If unsure, use the DEFAULT option or most contextually appropriate value
   - NEVER create values not in the allowed options list

3. WILDCARDS: Replace *** with transcript-derived prose
   - Fill with relevant information from the transcript
   - If information is not available, keep *** unchanged
   - Write in clinical prose style matching the exemplars

4. FORMAT: Use paragraphs only - NO bullets, NO numbered lists
   - Keep section headers exactly as they appear in the template
   - Maintain the order of sections
   - Do not add or remove sections

5. CONTENT: Do not invent data not present in inputs
   - Use only information from transcript, template, and previous note (if provided)
   - Do not fabricate vitals, labs, medications, or diagnoses`,

      smartlink_examples: {
        'HMHI Downtown RCC': ['@FNAME@→.FNAME', '@LNAME@→.LNAME', '@lastvitals@→.lastvitals', '@age@→.age'],
        'Redwood Clinic MHI': ['@FNAME@→.FNAME', '@LNAME@→.LNAME', '@lastvitals@→.lastvitals', '@allergies@→.allergies'],
        'Davis Behavioral Health': ['@FNAME@→.FNAME', '@LNAME@→.LNAME', '@MRN@→.MRN', '@DATE@→.DATE'],
        'Moonlit Psychiatry': ['@FNAME@→.FNAME', '@LNAME@→.LNAME', '@age@→.age', '@provider@→.provider']
      },

      mappings: {
        'HMHI Downtown RCC': {
          'Intake': 'rcc_intake_v1',
          'Transfer of Care': 'rcc_toc_v1',
          'Follow-up': 'rcc_fu_v1'
        },
        'Redwood Clinic MHI': {
          'Consultation Visit': 'redwood_consult_v1',
          'Transfer of Care': 'redwood_toc_v1',
          'Follow-up': 'redwood_fu_v1'
        },
        'Davis Behavioral Health': {
          'Intake': 'dbh_intake_v1',
          'Transfer of Care': 'dbh_toc_v1',
          'Follow-up': 'dbh_fu_v1'
        },
        'Moonlit Psychiatry': {
          'Intake': 'moonlit_intake_v1',
          'Transfer of Care': 'moonlit_toc_v1',
          'Follow-up': 'moonlit_fu_v1'
        }
      }
    };
  }

  /**
   * Build a complete prompt from components
   */
  async build(options: PromptBuilderOptions): Promise<CompiledPrompt> {
    const { template, transcript, previousNote, patientContext, setting, visitType } = options;

    // Check if this is a psychiatric-focused template
    const isPsychiatricFocused = template.name?.includes('Focused Psychiatric') ||
                                 template.sections.some(s => SECTION_PROMPT_CONFIGS[s.name]);

    // Get SmartList definitions from template
    const smartListIds = this.extractSmartListIds(template);
    const smartListDefinitions = await this.buildSmartListDefinitions(smartListIds);

    let prompt: string;
    let sections: any;

    if (isPsychiatricFocused) {
      // Use the psychiatric-focused prompt builder
      console.log('[PromptBuilder] Using psychiatric-focused prompt builder');
      prompt = buildPsychiatricPrompt(template, transcript, smartListDefinitions);

      sections = {
        system: 'Psychiatric note generator for Dr. Rufus Sweeney',
        task: 'Generate focused psychiatric note with section-specific instructions',
        smarttoolsRules: 'Integrated into psychiatric prompt',
        smartlistDefinitions: smartListDefinitions,
        patientContext,
        template: 'Using psychiatric-focused template',
        previousNote,
        transcript: transcript
      };
    } else {
      // Use the original prompt builder for non-psychiatric templates
      console.log('[PromptBuilder] Using standard prompt builder');

      // Determine if this is a follow-up visit
      const isFollowUp = visitType === 'Follow-up' || visitType === 'Transfer of Care';

      // Extract data from previous note for follow-ups
      let extractedFromPrior: ExtractedNoteData | undefined;
      if (isFollowUp && previousNote) {
        extractedFromPrior = noteParser.parsePreviousNote(previousNote);
        console.log('[PromptBuilder] Extracted from previous note:', extractedFromPrior);
      }

      // Build template section with exemplars
      const templateSection = this.buildTemplateSection(template);

      // Get setting-specific examples
      const examples = this.manifest.smartlink_examples?.[setting] || [];

      // Build each section
      sections = {
        system: this.manifest.system,
        task: this.manifest.task,
        smarttoolsRules: this.buildSmartToolsRules(examples),
        smartlistDefinitions: smartListDefinitions,
        patientContext: patientContext ? this.buildPatientContextSection(patientContext) : undefined,
        extractedFromPrior,
        template: templateSection,
        previousNote,
        transcript: this.buildTranscriptSection(transcript)
      };

      // Compile final prompt
      prompt = this.compilePrompt(sections, isFollowUp);
    }

    // Generate hash
    const hash = this.generateHash(prompt);

    return {
      prompt,
      hash,
      sections,
      metadata: {
        templateId: template.templateId,
        setting,
        visitType,
        timestamp: new Date(),
        wordCount: prompt.split(/\s+/).length,
        isFollowUp: visitType === 'Follow-up' || visitType === 'Transfer of Care'
      }
    };
  }

  /**
   * Extract SmartList IDs from template
   */
  private extractSmartListIds(template: Template): string[] {
    const ids = new Set<string>();
    const pattern = /\{([^:}]+):(\d+)\}/g;

    template.sections.forEach(section => {
      let match;
      while ((match = pattern.exec(section.content)) !== null) {
        // Try to find by display name first
        const displayName = match[1];
        const epicId = match[2];

        // Find the SmartList identifier
        if (this.smartListService) {
          const smartList = this.smartListService.getSmartListByEpicId(epicId);
          if (smartList) {
            console.log(`[PromptBuilder] Found SmartList: ${displayName} (${epicId}) -> ${smartList.identifier}`);
            ids.add(smartList.identifier);
          } else {
            console.log(`[PromptBuilder] WARNING: SmartList not found in catalog: ${displayName} (${epicId})`);
          }
        }
      }
    });

    console.log(`[PromptBuilder] Extracted ${ids.size} SmartList identifiers: ${Array.from(ids).join(', ')}`);
    return Array.from(ids);
  }

  /**
   * Build SmartList definitions section
   */
  private async buildSmartListDefinitions(smartListIds: string[]): Promise<string> {
    if (!this.smartListService || smartListIds.length === 0) {
      return '';
    }

    return this.smartListService.exportAllForPrompt(smartListIds);
  }

  /**
   * Build SmartTools rules with examples
   */
  private buildSmartToolsRules(examples: string[]): string {
    let rules = this.manifest.smarttools_rules;

    if (examples.length > 0) {
      rules += '\n\nSMARTLINK EXAMPLES FOR THIS SETTING:\n';
      examples.forEach(example => {
        rules += `  ${example}\n`;
      });
    }

    return rules;
  }

  /**
   * Build template section with exemplars
   */
  private buildTemplateSection(template: Template): string {
    let content = `TEMPLATE: ${template.name}\n`;
    content += `Setting: ${template.setting}\n`;
    content += `Visit Type: ${template.visitType}\n\n`;
    content += '=== TEMPLATE SECTIONS ===\n\n';

    template.sections.forEach(section => {
      content += `--- ${section.name} ---\n`;
      content += `Content Template:\n${section.content}\n`;

      if (section.exemplar) {
        content += `\nExemplar (tone and style guide):\n${section.exemplar}\n`;
      }

      content += '\n';
    });

    content += '=== END TEMPLATE SECTIONS ===\n';
    return content;
  }

  /**
   * Build patient context section
   */
  private buildPatientContextSection(context: string): string {
    return `PATIENT CLINICAL CONTEXT:\n${context}`;
  }

  /**
   * Build transcript section
   */
  private buildTranscriptSection(transcript: string): string {
    return `TRANSCRIPT:\n${transcript}`;
  }

  /**
   * Compile all sections into final prompt
   */
  private compilePrompt(sections: {
    system: string;
    task: string;
    smarttoolsRules: string;
    smartlistDefinitions: string;
    patientContext?: string;
    extractedFromPrior?: ExtractedNoteData;
    template: string;
    previousNote?: string;
    transcript: string;
  }, isFollowUp: boolean = false): string {
    let prompt = '';

    // System prompt
    prompt += `ROLE:\n${sections.system}\n\n`;

    // Task
    prompt += `TASK:\n${sections.task}\n\n`;

    // Follow-up specific instructions
    if (isFollowUp && sections.extractedFromPrior) {
      prompt += `FOLLOW-UP VISIT INSTRUCTIONS:\n`;
      prompt += `This is a follow-up visit. Key information has been extracted from the previous note:\n\n`;

      // Show extracted data
      prompt += `EXTRACTED FROM PREVIOUS NOTE:\n`;
      prompt += noteParser.formatExtractedData(sections.extractedFromPrior);
      prompt += `\n\n`;

      prompt += `CRITICAL FOLLOW-UP RULES:\n`;
      prompt += `1. Patient Name: Use the extracted name directly (${sections.extractedFromPrior.patientFirstName} ${sections.extractedFromPrior.patientLastName}) - DO NOT use @FNAME@ or @LNAME@ dotphrases\n`;
      if (sections.extractedFromPrior.providerName) {
        prompt += `2. Provider: Use the extracted provider name directly (${sections.extractedFromPrior.providerName}) - DO NOT use .provider dotphrase\n`;
      } else {
        prompt += `2. Provider: Use .provider dotphrase as normal\n`;
      }
      prompt += `3. Date: Use today's actual date in the format shown in the template\n`;

      if (sections.extractedFromPrior.planSection) {
        prompt += `4. PLAN SECTION - VERY IMPORTANT:\n`;
        prompt += `   - START with the previous plan shown above as your baseline\n`;
        prompt += `   - MODIFY only the specific parts discussed in the transcript\n`;
        prompt += `   - The transcript typically contains plan discussion toward the end\n`;
        prompt += `   - PRESERVE medications, therapy, labs, follow-up schedule UNLESS explicitly changed\n`;
        prompt += `   - DO NOT regenerate the entire plan from scratch\n`;
      }
      prompt += `\n`;
    }

    // SmartTools rules
    prompt += `${sections.smarttoolsRules}\n\n`;

    // SmartList definitions (if any)
    if (sections.smartlistDefinitions) {
      prompt += `${sections.smartlistDefinitions}\n\n`;
    }

    // Patient clinical context (if provided)
    if (sections.patientContext) {
      prompt += `${sections.patientContext}\n\n`;
      prompt += `This patient context provides background information to inform your note. `;
      prompt += `Use it to maintain clinical continuity and reference relevant history where appropriate.\n\n`;
    }

    // Template
    prompt += `${sections.template}\n\n`;

    // Previous note (if provided and NOT a follow-up with extracted data)
    if (sections.previousNote && !isFollowUp) {
      prompt += `PREVIOUS NOTE (for context only - do not copy verbatim):\n`;
      prompt += `${sections.previousNote}\n\n`;
    }

    // Transcript
    prompt += `${sections.transcript}\n\n`;

    // Final instruction
    prompt += `OUTPUT INSTRUCTIONS:\n`;
    prompt += `Generate the complete note following the template structure above. `;

    if (isFollowUp && sections.extractedFromPrior) {
      prompt += `Remember to use the EXTRACTED patient name and provider directly. `;
      if (sections.extractedFromPrior.planSection) {
        prompt += `For the Plan section, start with the previous plan and modify only what changed. `;
      }
    }

    prompt += `Apply all SmartTools transformations. `;
    prompt += `Maintain clinical prose style matching the exemplars. `;
    prompt += `Do not include any meta-commentary or explanations - output only the final note.`;

    return prompt;
  }

  /**
   * Generate hash for prompt tracking
   */
  private generateHash(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 12);
  }

  /**
   * Preview a prompt without generating (for UI preview)
   */
  async preview(options: PromptBuilderOptions): Promise<CompiledPrompt> {
    return this.build(options);
  }

  /**
   * Validate that required fields are present based on visit type
   */
  validateRequirements(visitType: VisitType | string, previousNote?: string): {
    valid: boolean;
    message?: string;
  } {
    // TOC and Follow-up require previous note
    if ((visitType === 'Transfer of Care' || visitType === 'Follow-up') && !previousNote) {
      return {
        valid: false,
        message: `${visitType} visits require a previous note for context`
      };
    }

    return { valid: true };
  }

  /**
   * Get prompt statistics for monitoring
   */
  getPromptStats(prompt: string): {
    characterCount: number;
    wordCount: number;
    estimatedTokens: number;
    sections: number;
  } {
    const wordCount = prompt.split(/\s+/).length;
    const characterCount = prompt.length;
    // Rough token estimate (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(characterCount / 4);
    const sections = (prompt.match(/===/g) || []).length / 2;

    return {
      characterCount,
      wordCount,
      estimatedTokens,
      sections
    };
  }
}

// Export singleton instance
let promptBuilderInstance: PromptBuilder | null = null;

export async function getPromptBuilder(): Promise<PromptBuilder> {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new PromptBuilder();
    await promptBuilderInstance.initialize();
  }
  return promptBuilderInstance;
}