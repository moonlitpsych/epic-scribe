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
import { buildTherapyPrompt } from './therapy-prompt-builder';
import crypto from 'crypto';

export interface PromptBuilderOptions {
  template: Template;
  transcript: string;
  previousNote?: string;
  staffingTranscript?: string; // Separate staffing conversation transcript
  collateralTranscript?: string; // Collateral (parent/guardian) transcript for Teenscope
  epicChartData?: string; // Epic DotPhrase data (questionnaires, meds) for strengthening Assessment
  longitudinalChartData?: string; // Formatted longitudinal chart data (PHQ-9/GAD-7 trends, medication history)
  patientContext?: string;  // Clinical context from patient record
  historicalNotes?: string;  // All previous finalized notes for this patient
  setting: Setting;
  visitType: VisitType | string;
  // Patient demographics - used directly in note instead of dotphrases
  patientFirstName?: string;
  patientLastName?: string;
  patientAge?: number | null;  // If provided, use directly; if null/undefined, use "***-year-old"
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
    staffingTranscript?: string; // Separate staffing transcript
    collateralTranscript?: string; // Collateral transcript for Teenscope
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
1. PATIENT DEMOGRAPHICS: Use the actual patient name and age provided - NOT dotphrases
   - Use the provided PATIENT_FIRST_NAME and PATIENT_LAST_NAME directly in the note
   - Use the provided PATIENT_AGE directly (e.g., "47-year-old")
   - If age is not provided (shown as ***), output "***-year-old"
   - NEVER use .FNAME, .LNAME, or .age dotphrases for patient demographics

2. SMARTLINKS: Convert OTHER @identifier@ to .identifier in the final note output
   - Example: @lastvitals@ becomes .lastvitals
   - Example: @provider@ becomes .provider
   - Example: @MRN@ becomes .MRN
   - NOTE: @FNAME@, @LNAME@, and @age@ should be replaced with actual values, not dotphrases

3. SMARTLISTS: Replace {Display:EpicID} with ONLY the selected value text
   - Where you see {Sleep Quality:304120106} in the template, output just the value like "Poor quality"
   - Where you see {Mood:304120108} in the template, output just the value like "Anxious"
   - Select ONLY from the provided option list for each SmartList
   - Example: Template has "{Sleep Quality:304120106}" → Output "Poor quality"
   - Example: Template has "{Mood:304120108}" → Output "Depressed"
   - DO NOT include the {Display:EpicID:: } wrapper in your output
   - Output plain text values only
   - If unsure, use the DEFAULT option or most contextually appropriate value
   - NEVER create values not in the allowed options list

4. WILDCARDS: Replace *** with transcript-derived prose
   - Fill with relevant information from the transcript
   - If information is not available in transcript, infer reasonable defaults or omit *** entirely
   - Write in clinical prose style matching the exemplars
   - IMPORTANT: Do NOT add trailing "***" to history items. Examples:
     - WRONG: "Alcohol: None ***"
     - CORRECT: "Alcohol: None"
     - WRONG: "Cannabis: Denies ***"
     - CORRECT: "Cannabis: Denies"
   - For history sections (Substance Use, Social History, Family History), if not discussed:
     - Use "None", "Denies", "Not discussed", or "Per intake paperwork" as appropriate
     - Do NOT append "***" after these values

5. FORMAT: Use paragraphs only - NO bullets, NO numbered lists
   - Keep section headers exactly as they appear in the template
   - Maintain the order of sections
   - Do not add or remove sections

6. CONTENT: Do not invent data not present in inputs
   - Use only information from transcript, template, and previous note (if provided)
   - Do not fabricate vitals, labs, medications, or diagnoses`,

      smartlink_examples: {
        'HMHI Downtown RCC': ['@lastvitals@→.lastvitals', '@provider@→.provider'],
        'Redwood Clinic MHI': ['@lastvitals@→.lastvitals', '@allergies@→.allergies'],
        'Davis Behavioral Health': ['@MRN@→.MRN', '@DATE@→.DATE'],
        'Moonlit Psychiatry': ['@provider@→.provider', '@lastvitals@→.lastvitals']
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
    const { template, transcript, previousNote, staffingTranscript, collateralTranscript, epicChartData, longitudinalChartData, patientContext, historicalNotes, setting, visitType, patientFirstName, patientLastName, patientAge } = options;

    // Check if this is a therapy-focused template (BHIDC therapy)
    const isTherapyFocused = template.setting === 'BHIDC therapy' ||
                             template.name?.toLowerCase().includes('therapy');

    // Check if this is a psychiatric-focused template
    const isPsychiatricFocused = template.name?.includes('Focused Psychiatric') ||
                                 template.sections.some(s => SECTION_PROMPT_CONFIGS[s.name]);

    // Check if this is a Teenscope South template (adolescent psychiatry with collateral)
    const isTeenscope = setting === 'Teenscope South';

    // Get SmartList definitions from template
    const smartListIds = this.extractSmartListIds(template);
    const smartListDefinitions = await this.buildSmartListDefinitions(smartListIds);

    let prompt: string;
    let sections: any;

    if (isTherapyFocused) {
      // Use the therapy-focused prompt builder
      console.log('[PromptBuilder] Using therapy-focused prompt builder');
      prompt = buildTherapyPrompt({
        template,
        transcript,
        bhidcStaffScreenerNote: patientContext, // Patient context acts as BHIDC screener note for first visit
        previousNote,
        patientContext
      });

      sections = {
        system: 'Therapy note generator for Dr. Rufus Sweeney',
        task: 'Generate therapy-focused clinical note',
        smarttoolsRules: 'Integrated into therapy prompt',
        smartlistDefinitions: smartListDefinitions || 'None for therapy notes',
        patientContext,
        template: 'Using therapy-focused template',
        previousNote,
        staffingTranscript: undefined, // Therapy notes don't use staffing transcripts
        transcript: transcript
      };
    } else if (isPsychiatricFocused) {
      // Use the psychiatric-focused prompt builder
      console.log('[PromptBuilder] Using psychiatric-focused prompt builder');
      prompt = buildPsychiatricPrompt(template, transcript, smartListDefinitions, staffingTranscript, visitType, previousNote);

      sections = {
        system: 'Psychiatric note generator for Dr. Rufus Sweeney',
        task: 'Generate focused psychiatric note with section-specific instructions',
        smarttoolsRules: 'Integrated into psychiatric prompt',
        smartlistDefinitions: smartListDefinitions,
        patientContext,
        template: 'Using psychiatric-focused template',
        previousNote,
        staffingTranscript,
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
        historicalNotes,
        extractedFromPrior,
        template: templateSection,
        previousNote,
        collateralTranscript,
        epicChartData, // Epic chart data (questionnaires, medications)
        longitudinalChartData, // Longitudinal PHQ-9/GAD-7 trends and medication history
        transcript: this.buildTranscriptSection(transcript)
      };

      // Compile final prompt with patient demographics
      prompt = this.compilePrompt(sections, isFollowUp, historicalNotes, isTeenscope, {
        firstName: patientFirstName,
        lastName: patientLastName,
        age: patientAge
      }, longitudinalChartData);
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
   * Ensure proper section ordering with Diagnoses before Formulation
   */
  private ensureProperSectionOrdering(template: Template): Template {
    const sections = [...template.sections];
    const formulationIndex = sections.findIndex(s => s.name === 'Formulation');
    const diagnosesIndex = sections.findIndex(s => s.name === 'Diagnoses');

    // If we have Formulation but no Diagnoses section, insert Diagnoses before Formulation
    if (formulationIndex !== -1 && diagnosesIndex === -1) {
      const diagnosesSection: TemplateSection = {
        order: formulationIndex,
        name: 'Diagnoses',
        content: 'DIAGNOSES:\n[Primary and secondary psychiatric diagnoses with ICD-10 codes]',
        exemplar: 'DIAGNOSES:\nMajor Depressive Disorder, Single Episode, Moderate - F32.1\nGeneralized Anxiety Disorder - F41.1'
      };

      // Insert Diagnoses section before Formulation
      sections.splice(formulationIndex, 0, diagnosesSection);

      // Reorder the sections
      sections.forEach((section, index) => {
        section.order = index + 1;
      });

      return {
        ...template,
        sections
      };
    }

    return template;
  }

  /**
   * Build template section with exemplars
   */
  private buildTemplateSection(template: Template): string {
    // Ensure proper section ordering
    const orderedTemplate = this.ensureProperSectionOrdering(template);

    let content = `TEMPLATE: ${orderedTemplate.name}\n`;
    content += `Setting: ${orderedTemplate.setting}\n`;
    content += `Visit Type: ${orderedTemplate.visitType}\n\n`;
    content += '=== TEMPLATE SECTIONS ===\n\n';

    orderedTemplate.sections.forEach(section => {
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
    historicalNotes?: string;
    extractedFromPrior?: ExtractedNoteData;
    template: string;
    previousNote?: string;
    collateralTranscript?: string;
    epicChartData?: string;
    longitudinalChartData?: string;
    transcript: string;
  }, isFollowUp: boolean = false, historicalNotes?: string, isTeenscope: boolean = false, patientDemographics?: {
    firstName?: string;
    lastName?: string;
    age?: number | null;
  }, longitudinalChartData?: string): string {
    let prompt = '';

    // System prompt
    prompt += `ROLE:\n${sections.system}\n\n`;

    // Task
    prompt += `TASK:\n${sections.task}\n\n`;

    // Patient Demographics Section - ALWAYS add this before other sections
    if (patientDemographics?.firstName || patientDemographics?.lastName) {
      prompt += `PATIENT DEMOGRAPHICS (use these exact values in the note):\n`;
      prompt += `PATIENT_FIRST_NAME: ${patientDemographics.firstName || '***'}\n`;
      prompt += `PATIENT_LAST_NAME: ${patientDemographics.lastName || '***'}\n`;
      if (patientDemographics.age !== undefined && patientDemographics.age !== null) {
        prompt += `PATIENT_AGE: ${patientDemographics.age}\n`;
        prompt += `Use "${patientDemographics.age}-year-old" in the note (NOT .age dotphrase)\n`;
      } else {
        prompt += `PATIENT_AGE: *** (not provided)\n`;
        prompt += `Use "***-year-old" in the note where age is needed\n`;
      }
      prompt += `\nIMPORTANT: Use "${patientDemographics.firstName || '***'} ${patientDemographics.lastName || '***'}" as the patient's name throughout the note. DO NOT use .FNAME or .LNAME dotphrases.\n\n`;
    }

    // Follow-up specific instructions
    if (isFollowUp && sections.extractedFromPrior) {
      prompt += `FOLLOW-UP VISIT INSTRUCTIONS:\n`;
      prompt += `This is a follow-up visit. Key information has been extracted from the previous note:\n\n`;

      // Show extracted data
      prompt += `EXTRACTED FROM PREVIOUS NOTE:\n`;
      prompt += noteParser.formatExtractedData(sections.extractedFromPrior);
      prompt += `\n\n`;

      prompt += `CRITICAL FOLLOW-UP RULES:\n`;
      // Use provided demographics if available, otherwise fall back to extracted
      const firstName = patientDemographics?.firstName || sections.extractedFromPrior.patientFirstName;
      const lastName = patientDemographics?.lastName || sections.extractedFromPrior.patientLastName;
      prompt += `1. Patient Name: Use the name directly (${firstName} ${lastName}) - DO NOT use @FNAME@ or @LNAME@ dotphrases\n`;
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

    // Historical notes (if provided)
    if (historicalNotes) {
      prompt += `${historicalNotes}\n\n`;
      prompt += `INSTRUCTIONS FOR HISTORICAL NOTES:\n`;
      prompt += `- Review these notes to understand the patient's longitudinal treatment journey\n`;
      prompt += `- Reference prior diagnoses, medications, and treatment responses as appropriate\n`;
      prompt += `- Maintain consistency with previous clinical impressions and plans\n`;
      prompt += `- Note any changes or progression in symptoms over time\n`;
      prompt += `- For follow-up visits: The most recent note is particularly important for understanding the current treatment plan\n\n`;
    }

    // Epic Chart Data (questionnaires, medications from Epic)
    if (sections.epicChartData) {
      prompt += `EPIC CHART DATA (from Epic EMR DotPhrase):\n`;
      prompt += `${sections.epicChartData}\n\n`;
      prompt += `INSTRUCTIONS FOR EPIC CHART DATA:\n`;
      prompt += `- Use this data to STRENGTHEN the Assessment/Formulation section\n`;
      prompt += `- Reference PHQ-9 and GAD-7 scores to support diagnostic impressions\n`;
      prompt += `  Example: "PHQ-9 of 18 indicates moderately severe depression, consistent with patient's reported symptoms"\n`;
      prompt += `- Incorporate medication history for treatment planning and reasoning\n`;
      prompt += `  Example: "Given prior trials of sertraline and fluoxetine without adequate response..."\n`;
      prompt += `- DO NOT auto-fill Social History or Family History sections from this data\n`;
      prompt += `- The transcript is the primary source for the clinical narrative; use chart data as supportive evidence\n\n`;
    }

    // Longitudinal Chart Data (PHQ-9/GAD-7 trends, medication history over time)
    if (longitudinalChartData) {
      prompt += `${longitudinalChartData}\n`;
      prompt += `INSTRUCTIONS FOR LONGITUDINAL TREND ANALYSIS:\n`;
      prompt += `Use this historical data to enhance the Assessment/Formulation section with trend analysis:\n\n`;
      prompt += `1. QUESTIONNAIRE TRENDS - Reference score changes over time:\n`;
      prompt += `   - If IMPROVING: "PHQ-9 has improved from X to Y over the past Z months, indicating treatment response"\n`;
      prompt += `   - If STABLE: "PHQ-9 remains stable at X, suggesting persistent symptoms despite treatment"\n`;
      prompt += `   - If WORSENING: "PHQ-9 has increased from X to Y, indicating symptom exacerbation"\n`;
      prompt += `   - Compare objective scores with patient-reported subjective improvement from the transcript\n`;
      prompt += `   - Note any discrepancy: "Despite patient reporting feeling better, PHQ-9 remains elevated at X"\n\n`;
      prompt += `2. MEDICATION HISTORY - Reference treatment timeline:\n`;
      prompt += `   - Summarize medication changes and their temporal relationship to symptom trends\n`;
      prompt += `   - Note response patterns: "Improvement in GAD-7 coincided with buspirone initiation 3 months ago"\n`;
      prompt += `   - Inform treatment decisions: "Given prior response to X, continuing current regimen is appropriate"\n\n`;
      prompt += `3. INTEGRATION WITH CURRENT VISIT:\n`;
      prompt += `   - Correlate longitudinal trends with today's clinical presentation\n`;
      prompt += `   - Support diagnostic stability or changes with objective data\n`;
      prompt += `   - Strengthen treatment recommendations with historical context\n\n`;
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

    // Collateral Transcript (for Teenscope South)
    if (isTeenscope) {
      if (sections.collateralTranscript) {
        prompt += `COLLATERAL TRANSCRIPT (Parent/Guardian conversation):\n`;
        prompt += `${sections.collateralTranscript}\n\n`;
        prompt += `COLLATERAL INSTRUCTIONS:\n`;
        prompt += `- Incorporate information from the collateral conversation into the "Per Collateral" section of the HPI\n`;
        prompt += `- Synthesize parent/guardian observations about the patient's behavior at home\n`;
        prompt += `- Include their concerns and perspectives on treatment\n\n`;
      } else {
        prompt += `COLLATERAL NOT AVAILABLE:\n`;
        prompt += `For the "Per Collateral" section in the HPI, use the following text:\n`;
        prompt += `"I attempted to reach [relationship], patient's [parent/guardian], to obtain collateral information, but they were unavailable. Will attempt to reach later this week."\n\n`;
      }
    }

    // Section-specific formatting instructions
    prompt += `SECTION-SPECIFIC FORMATTING INSTRUCTIONS:\n\n`;

    // Current Medications carveout
    prompt += `CURRENT MEDICATIONS:\n`;
    prompt += `After the SmartLink-generated medication list (.medlist or similar), include a carveout section for patient-reported medications:\n`;
    prompt += `  "Patient-reported medications (not reported in chart):"\n`;
    prompt += `    [List any psychiatric medications the patient mentions taking that are not in the EMR medication list]\n`;
    prompt += `  If no additional patient-reported medications, omit this carveout entirely.\n\n`;

    // Psychiatric Review of Systems format
    prompt += `PSYCHIATRIC REVIEW OF SYSTEMS:\n`;
    prompt += `Format each system as a simple comma-separated list of PRESENT symptoms only.\n`;
    prompt += `DO NOT use "yes/no" format or severity qualifiers inline.\n`;
    prompt += `If a symptom is denied or not reported, OMIT it entirely from the list.\n`;
    prompt += `Example format:\n`;
    prompt += `  "Depression: depressed mood, decreased sleep, decreased concentration, thoughts of death"\n`;
    prompt += `  "Anxiety: excessive worry, restlessness, muscle tension"\n`;
    prompt += `If patient denies all symptoms in a system, write: "[System]: Denies symptoms"\n\n`;

    // Risk Assessment section
    prompt += `RISK ASSESSMENT (place this section immediately before FORMULATION):\n`;
    prompt += `Include a Risk Assessment section with this exact format:\n`;
    prompt += `  "RISK ASSESSMENT\n`;
    prompt += `  Risk factors: [list risk factors from transcript, e.g., history of suicide attempts, access to means, substance use, recent losses]\n`;
    prompt += `  Protective factors: [list protective factors, e.g., social support, engagement in treatment, future orientation, reasons for living]\n`;
    prompt += `  In light of these risk factors and protective factors, patient's overall suicide risk is considered [low/medium/high]. Their risk factors will be addressed through continued outpatient psychiatric management and care coordination, as needed. They are appropriate for outpatient care."\n\n`;

    // Plan - Counseling section
    prompt += `PLAN - COUNSELING SECTION:\n`;
    prompt += `The Counseling section of the Plan must include this exact language:\n`;
    prompt += `  "Counseling: We discussed the benefits and risks of the treatment(s) listed above and the patient verbalized understanding of and agreement with this plan. ***"\n`;
    prompt += `Fill in *** with any specific counseling topics discussed (e.g., medication side effects, sleep hygiene, safety planning).\n`;
    prompt += `DO NOT place this language elsewhere in the note - it belongs ONLY in the Plan Counseling section.\n\n`;

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