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
  TemplateSection,
  HealthKitClinicalData,
  PayerFeeSchedule
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
  healthKitData?: HealthKitClinicalData; // HealthKit clinical data (meds, labs, conditions, etc.)
  feeScheduleData?: PayerFeeSchedule; // Payer fee schedule for Listening Coder CPT suggestions
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
    const { template, transcript, previousNote, staffingTranscript, collateralTranscript, epicChartData, longitudinalChartData, healthKitData, feeScheduleData, patientContext, historicalNotes, setting, visitType, patientFirstName, patientLastName, patientAge } = options;

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
      prompt = buildPsychiatricPrompt(template, transcript, smartListDefinitions, staffingTranscript, visitType, previousNote, {
        firstName: patientFirstName,
        lastName: patientLastName,
        age: patientAge
      }, feeScheduleData);

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
      }, longitudinalChartData, healthKitData, feeScheduleData);
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
  }, longitudinalChartData?: string, healthKitData?: HealthKitClinicalData, feeScheduleData?: PayerFeeSchedule): string {
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

    // HealthKit clinical data (if available)
    if (healthKitData) {
      const { buildHealthKitContext } = require('../fhir/fhir-to-context');
      const healthKitContext = buildHealthKitContext(healthKitData);
      if (healthKitContext) {
        prompt += `CLINICAL DATA FROM PATIENT HEALTH RECORDS (auto-synced from Apple Health / Epic MyChart):\n`;
        prompt += `This is structured clinical data pulled directly from the patient's connected health records. It includes their verified medication list, diagnoses, lab results, vitals, and allergies from their EHR — NOT a previous note.\n\n`;
        prompt += `${healthKitContext}\n\n`;
        prompt += `INSTRUCTIONS FOR USING HEALTH RECORDS DATA:\n`;
        prompt += `- MEDICATIONS: The "Current Medications" list above is authoritative. Use it to populate the Current Medications section of the note. If the transcript mentions a medication change (starting, stopping, dose adjustment), document both the change AND the baseline from this list. Psychiatric medications are labeled with their drug class.\n`;
        prompt += `- DIAGNOSES: Reference active diagnoses with their ICD-10 codes in the Assessment/Formulation. These are the patient's documented problem list.\n`;
        prompt += `- LABS: If recent lab values are provided, incorporate clinically relevant results into your reasoning (e.g., lithium levels, metabolic panels for antipsychotic monitoring, thyroid function). Flag any abnormal values.\n`;
        prompt += `- VITALS: Note any clinically significant vital signs (e.g., elevated BP in a patient on stimulants, weight changes relevant to medication side effects).\n`;
        prompt += `- ALLERGIES: Include in the appropriate section.\n`;
        prompt += `- PREVIOUS NOTE: If a previous clinical note is included, use it for continuity — carrying forward relevant history, tracking symptom trajectory, and noting changes since last visit.\n`;
        prompt += `- PRIORITY: The visit transcript remains the PRIMARY source for the clinical narrative. Health records data provides supporting context and should be woven into the note where clinically relevant, not listed as a separate data dump.\n\n`;
      }
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
    prompt += `RISK ASSESSMENT (REQUIRED — place this section immediately before FORMULATION):\n`;
    if (!isFollowUp) {
      prompt += `⚠️ THIS IS AN INTAKE VISIT — A THOROUGH RISK ASSESSMENT IS MANDATORY. DO NOT OMIT THIS SECTION.\n`;
      prompt += `The risk assessment is one of the most clinically important parts of an intake note. It must be comprehensive and thoughtful.\n\n`;
    }
    prompt += `Use this EXACT format:\n\n`;
    prompt += `Risk factors: [risk factor 1], [risk factor 2], [risk factor 3], ...\n`;
    prompt += `Protective factors: [protective factor 1], [protective factor 2], [protective factor 3], ...\n`;
    prompt += `\n`;
    prompt += `[Two blank lines, then a narrative statement]\n\n`;
    prompt += `RISK FACTORS — scan the transcript, prior notes, and clinical data for:\n`;
    prompt += `- Suicidal ideation (current or historical), prior suicide attempts, self-harm / NSSIB\n`;
    prompt += `- Access to lethal means (firearms, stockpiled medications)\n`;
    prompt += `- Active substance use, intoxication, or withdrawal\n`;
    prompt += `- Recent losses (death, divorce, job loss, financial crisis, housing instability)\n`;
    prompt += `- Social isolation, limited support system\n`;
    prompt += `- Hopelessness, agitation, impulsivity, insomnia\n`;
    prompt += `- Family history of suicide or serious mental illness\n`;
    prompt += `- History of trauma, abuse, or adverse childhood experiences\n`;
    prompt += `- Chronic pain or serious medical comorbidities\n`;
    prompt += `- Severity of current psychiatric presentation (psychosis, mania, severe depression, mixed states)\n`;
    prompt += `- Recent psychiatric hospitalization or ED visits\n`;
    prompt += `- Command hallucinations, paranoid ideation\n`;
    prompt += `- Demographic risk factors (age, gender) when clinically relevant\n\n`;
    prompt += `PROTECTIVE FACTORS — identify from transcript and clinical data:\n`;
    prompt += `- Reasons for living (children, family, pets, faith, future goals)\n`;
    prompt += `- Social connectedness and support system\n`;
    prompt += `- Engagement in treatment (presenting for care, motivated, adherent)\n`;
    prompt += `- Future orientation (upcoming plans, goals, scheduled appointments)\n`;
    prompt += `- Religious or cultural beliefs against self-harm\n`;
    prompt += `- Problem-solving skills, adaptive coping strategies\n`;
    prompt += `- Therapeutic alliance\n`;
    prompt += `- Stable housing, employment, or financial resources\n`;
    prompt += `- Absence of active substance use\n`;
    prompt += `- Awareness of crisis resources (988, safety plan)\n\n`;
    prompt += `OUTPATIENT APPROPRIATENESS STATEMENT (after two blank lines):\n`;
    prompt += `Write a clinical narrative that:\n`;
    prompt += `1. Weighs the identified risk factors against protective factors\n`;
    prompt += `2. States the overall suicide risk level (low, low-moderate, moderate, etc.)\n`;
    prompt += `3. Explains why outpatient care is appropriate for this patient\n`;
    prompt += `4. Describes how identified risk factors will be mitigated through the treatment plan\n\n`;
    prompt += `EXAMPLE OUTPUT:\n`;
    prompt += `"Risk factors: history of one prior suicide attempt by overdose (2019), active major depressive episode with passive suicidal ideation, recent divorce, heavy alcohol use, insomnia, family history of completed suicide (father)\n`;
    prompt += `Protective factors: strong relationship with two children ages 8 and 11, engaged and motivated for treatment, future-oriented with new job starting next month, denies current intent or plan, willing to participate in safety planning, no access to firearms\n\n\n`;
    prompt += `In light of the above risk and protective factors, this patient's overall suicide risk is considered low-moderate at this time. The history of a prior attempt and active substance use are notable risk factors; however, these are substantially mitigated by the patient's strong connection to their children, active engagement in psychiatric care, future orientation, and absence of current suicidal intent or plan. Risk factors will be addressed through outpatient psychiatric management including medication optimization for depression and insomnia, referral to substance use treatment, and collaborative safety planning. The patient is appropriate for outpatient care at this time and has been instructed to present to the nearest emergency department or call 988 if experiencing worsening suicidal ideation or urges to act on thoughts of self-harm."\n\n`;

    // Plan - Counseling section
    prompt += `PLAN - COUNSELING SECTION:\n`;
    prompt += `The Counseling section of the Plan must include this exact language:\n`;
    prompt += `  "Counseling: We discussed the benefits and risks of the treatment(s) listed above and the patient verbalized understanding of and agreement with this plan. ***"\n`;
    prompt += `Fill in *** with any specific counseling topics discussed (e.g., medication side effects, sleep hygiene, safety planning).\n`;
    prompt += `DO NOT place this language elsewhere in the note - it belongs ONLY in the Plan Counseling section.\n\n`;

    // Assessment section - use actual patient data
    prompt += `ASSESSMENT/FORMULATION SECTION:\n`;
    prompt += `When writing the Assessment or Formulation section, use the actual patient name and age provided above.\n`;
    if (patientDemographics?.firstName || patientDemographics?.lastName) {
      const firstName = patientDemographics.firstName || '***';
      const lastName = patientDemographics.lastName || '***';
      const ageStr = (patientDemographics.age !== undefined && patientDemographics.age !== null)
        ? `${patientDemographics.age}-year-old`
        : '***-year-old';
      prompt += `  - Use: "${firstName} ${lastName}" for the patient's name\n`;
      prompt += `  - Use: "${ageStr}" for the patient's age\n`;
      prompt += `  - Example: "${firstName} ${lastName} is a ${ageStr} [gender] with a history of..."\n`;
    }
    prompt += `  - DO NOT use .FNAME, .LNAME, or .age dotphrases in the Assessment section\n`;
    prompt += `  - The Assessment should read like a natural clinical summary with the actual patient's identifying information\n\n`;

    // Listening Coder section
    prompt += `LISTENING CODER (append AFTER the signature at the very end of the note):\n`;
    prompt += `After the complete note and signature line, add a separator and coding analysis section.\n`;
    prompt += `Format as follows:\n\n`;
    prompt += `---\n`;
    prompt += `LISTENING CODER — Suggested CPT Codes\n\n`;
    prompt += `Analyze the encounter and suggest appropriate CPT codes with brief reasoning.\n\n`;
    prompt += `EVALUATION & MANAGEMENT CODE:\n`;
    if (feeScheduleData) {
      prompt += `PAYER: ${feeScheduleData.payerName} (${feeScheduleData.payerType})\n`;
      prompt += `Fee schedule rates for this patient's payer:\n`;
      const formatRate = (cents: number) => `$${(cents / 100).toFixed(2)}`;
      const rateMap = new Map(feeScheduleData.rates.map(r => [r.cpt, r.allowedCents]));
      if (!isFollowUp) {
        const r99205 = rateMap.get('99205');
        const r99204 = rateMap.get('99204');
        const r90792 = rateMap.get('90792');
        if (r99205) prompt += `- 99205 (new patient, high complexity): ${formatRate(r99205)}\n`;
        if (r99204) prompt += `- 99204 (new patient, moderate complexity): ${formatRate(r99204)}\n`;
        if (r90792) prompt += `- 90792 (psychiatric diagnostic eval): ${formatRate(r90792)}\n`;
        if (!r90792) prompt += `- 90792: NO fee schedule entry for this payer — do NOT suggest\n`;
        prompt += `USE E/M CODES for intakes. They reimburse significantly better than 90792 for this payer.\n`;
      } else {
        const r99213 = rateMap.get('99213');
        const r99214 = rateMap.get('99214');
        const r99215 = rateMap.get('99215');
        if (r99215) prompt += `- 99215 (high MDM / 40-54 min): ${formatRate(r99215)}\n`;
        if (r99214) prompt += `- 99214 (moderate MDM / 30-39 min): ${formatRate(r99214)}\n`;
        if (r99213) prompt += `- 99213 (low MDM / 20-29 min): ${formatRate(r99213)}\n`;
      }
      prompt += `\nUse these rates to recommend the highest-reimbursing clinically defensible code combination.\n`;
    } else {
      if (!isFollowUp) {
        prompt += `For intake/new patient visits, USE E/M CODES (not 90792). In Utah, E/M codes reimburse significantly better than 90792 across FFS Medicaid and all MCOs:\n`;
        prompt += `- 99205: New patient E/M, high complexity (60-74 min) — PREFERRED for most psychiatric intakes\n`;
        prompt += `- 99204: New patient E/M, moderate complexity (45-59 min)\n`;
        prompt += `Do NOT suggest 90792 unless specifically instructed. E/M codes are the standard for Moonlit Psychiatry intakes.\n`;
      } else {
        prompt += `For follow-up/established patient visits, determine based on TOTAL TIME (including face-to-face, documentation, review, and care coordination on date of service) OR medical decision-making (MDM) complexity — use whichever supports the higher level:\n`;
        prompt += `- 99213: Low MDM complexity / 20-29 minutes total time\n`;
        prompt += `- 99214: Moderate MDM complexity / 30-39 minutes total time\n`;
        prompt += `- 99215: High MDM complexity / 40-54 minutes total time\n`;
      }
    }
    prompt += `\nPSYCHOTHERAPY ADD-ON CODE (if applicable):\n`;
    prompt += `If psychotherapy was provided during the visit (supportive therapy, CBT techniques, motivational interviewing, crisis intervention, psychoeducation, etc.), add the appropriate code based on therapy duration:\n`;
    if (feeScheduleData) {
      const rateMap = new Map(feeScheduleData.rates.map(r => [r.cpt, r.allowedCents]));
      const formatRate = (cents: number) => `$${(cents / 100).toFixed(2)}`;
      const r90833 = rateMap.get('90833');
      const r90836 = rateMap.get('90836');
      const r90838 = rateMap.get('90838');
      prompt += `- +90833: 16-37 minutes of psychotherapy${r90833 ? ` (${formatRate(r90833)})` : ''}\n`;
      prompt += `- +90836: 38-52 minutes of psychotherapy${r90836 ? ` (${formatRate(r90836)})` : ''}\n`;
      prompt += `- +90838: 53+ minutes of psychotherapy${r90838 ? ` (${formatRate(r90838)})` : ''}\n`;
    } else {
      prompt += `- +90833: 16-37 minutes of psychotherapy\n`;
      prompt += `- +90836: 38-52 minutes of psychotherapy\n`;
      prompt += `- +90838: 53+ minutes of psychotherapy\n`;
    }
    prompt += `These are ADD-ON codes billed alongside the E/M code.\n\n`;
    // G2211 — Complexity add-on (always bill if payer reimburses it)
    if (feeScheduleData) {
      const rateMap2 = new Map(feeScheduleData.rates.map(r => [r.cpt, r.allowedCents]));
      const formatRate2 = (cents: number) => `$${(cents / 100).toFixed(2)}`;
      const rG2211 = rateMap2.get('G2211');
      if (rG2211) {
        prompt += `COMPLEXITY ADD-ON (ALWAYS BILL):\n`;
        prompt += `- G2211: Medical visit complexity add-on (${formatRate2(rG2211)})\n`;
        prompt += `  This code is billed on EVERY visit (intake and follow-up) for this payer. It is not conditional on time or complexity — simply include it whenever the E/M code is billed.\n\n`;
      }
    }
    prompt += `INSTRUCTIONS FOR THE LISTENING CODER OUTPUT:\n`;
    prompt += `1. State the suggested E/M or evaluation code with reasoning (reference time from transcript timestamps if available, or MDM complexity based on number/severity of problems addressed, data reviewed, and risk of management)\n`;
    prompt += `2. If psychotherapy was detected, state the add-on code with estimated therapy duration and what therapeutic modality was used\n`;
    prompt += `3. State the total encounter time if discernible from transcript timestamps\n`;
    prompt += `4. Keep reasoning concise — 1-2 sentences per code\n`;
    prompt += `5. If uncertain between two levels, state both with reasoning and let the provider decide\n\n`;
    prompt += `EXAMPLE OUTPUT:\n`;
    prompt += `"---\nLISTENING CODER — Suggested CPT Codes\n\n`;
    prompt += `99205 — New patient E/M, high complexity. This is a new patient psychiatric intake with comprehensive history, mental status examination, high-complexity medical decision-making (new psychiatric diagnoses, multiple medication considerations, risk assessment), and treatment planning. Total time supports high complexity level.\n\n`;
    prompt += `+90836 — Psychotherapy add-on, 38-52 minutes. Approximately 40 minutes of supportive psychotherapy and psychoeducation were provided, focusing on diagnosis explanation, treatment expectations, and coping strategies for acute symptoms.\n\n`;
    prompt += `Total encounter time: ~75 minutes (based on transcript timestamps 00:00:00 to 01:14:32)."\n\n`;

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
    prompt += `Include the Risk Assessment section before Formulation. `;
    prompt += `After the signature, append the Listening Coder section with CPT code analysis. `;
    prompt += `Do not include any other meta-commentary or explanations.`;

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
  validateRequirements(visitType: VisitType | string, previousNote?: string, hasHealthKitData?: boolean): {
    valid: boolean;
    message?: string;
  } {
    // TOC and Follow-up require previous note OR HealthKit clinical data
    if ((visitType === 'Transfer of Care' || visitType === 'Follow-up') && !previousNote && !hasHealthKitData) {
      return {
        valid: false,
        message: `${visitType} visits require a previous note or synced Health Records for context`
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