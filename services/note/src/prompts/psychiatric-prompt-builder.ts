/**
 * Psychiatric-Focused Prompt Builder
 * Enhanced prompt building with section-specific instructions and temperature control
 */

import { Template, TemplateSection } from '@epic-scribe/types';

export interface SectionPromptConfig {
  sectionName: string;
  temperature?: number;
  instructions: string;
  format?: string;
}

/**
 * Section-specific prompt configurations for psychiatric notes
 */
export const SECTION_PROMPT_CONFIGS: Record<string, SectionPromptConfig> = {
  'History of Present Illness': {
    sectionName: 'History of Present Illness',
    temperature: 0.7, // Higher temperature for more detailed narrative
    instructions: `Generate a comprehensive HPI with rich clinical detail. Include:
    - Temporal course and onset (when symptoms started, how they progressed)
    - Specific symptoms with patient's own descriptions when available
    - Severity and impact on functioning (work, relationships, ADLs)
    - Precipitating factors and triggers
    - What makes symptoms better or worse
    - Previous episodes and their resolution
    - Current coping strategies attempted
    - Include relevant quotes from the patient
    Do NOT over-condense. Aim for 1-2 detailed paragraphs that paint a clear clinical picture.`,
    format: 'narrative_prose'
  },

  'Psychiatric History': {
    sectionName: 'Psychiatric History',
    temperature: 0.3, // Lower temperature for factual accuracy
    instructions: `Extract precise psychiatric history from the transcript. Be specific about:
    - Exact dates/years when known, or approximate timeframes
    - Number and duration of hospitalizations
    - Specific hospitals or facilities if mentioned
    - Details of suicide attempts (method, medical severity, circumstances)
    - Self-harm behaviors (type, frequency, last occurrence)
    - Previous treatments and their effectiveness
    - Medications tried and responses
    Use "None reported" if patient explicitly denies. Leave *** if not discussed.`,
    format: 'structured_list'
  },

  'Psychiatric Review of Systems': {
    sectionName: 'Psychiatric Review of Systems',
    temperature: 0.2, // Very low temperature for consistent SmartList selection
    instructions: `Select the most clinically appropriate SmartList option based on the transcript.
    Priority order for selection:
    1. Explicit patient statements
    2. Clinical observations described
    3. Inferred from context (use cautiously)
    4. Default to the safest/most conservative option if unclear
    Be consistent with terminology across similar symptoms.`,
    format: 'smartlist_only'
  },

  'Substance Use History': {
    sectionName: 'Substance Use History',
    temperature: 0.4,
    instructions: `For each substance category:
    1. Select appropriate SmartList option for use pattern
    2. In the wildcard (***) section after each, add:
       - Specific amounts/frequency if mentioned
       - Duration of use
       - Route of administration if relevant
       - Consequences (DUI, withdrawal, medical issues)
       - Quit attempts or periods of sobriety
       - Current status
    Be non-judgmental in language. Use clinical terminology.`,
    format: 'smartlist_plus_narrative'
  },

  'Social History': {
    sectionName: 'Social History',
    temperature: 0.4,
    instructions: `For each social domain:
    1. Select appropriate SmartList option
    2. Expand with relevant details that impact psychiatric presentation:
       - Living situation stability and stressors
       - Work/financial stressors
       - Relationship quality and support
       - Recent changes or losses
       - Protective factors
    Focus on psychosocially relevant information.`,
    format: 'smartlist_plus_narrative'
  },

  'Mental Status Examination': {
    sectionName: 'Mental Status Examination',
    temperature: 0.2, // Very low for objective observations
    instructions: `Select SmartList options based on clinical observations ONLY.
    Use standard psychiatric terminology:
    - Appearance: grooming, dress, apparent age
    - Behavior: cooperation, agitation, psychomotor changes
    - Speech: rate, volume, tone
    - Mood: patient's stated mood in quotes if given
    - Affect: your observation of emotional expression
    - Thought: process (how they think) and content (what they think)
    - Perceptual: hallucinations, illusions
    - Cognition: orientation, memory, concentration
    - Insight/Judgment: understanding of illness and decision-making
    Be objective and descriptive.`,
    format: 'smartlist_only'
  },

  'Formulation': {
    sectionName: 'Formulation',
    temperature: 0.5,
    instructions: `Generate EXACTLY 4 paragraphs in this specific format:

    PARAGRAPH 1 (One-liner):
    "[First name] [Last name] is a [age] year old [relevant demographics] with a history of [relevant psychiatric history] who presents for [type of visit and chief concern]."

    PARAGRAPH 2 (Primary diagnosis with biopsychosocial formulation):
    "The patient's presentation is most consistent with [Primary Diagnosis, specific, with ICD-10 code] based on [list specific DSM-5-TR criteria met]. From a biological perspective, [genetic, medical, substance factors]. Psychologically, [cognitive patterns, coping styles, personality factors]. Socially, [environmental stressors, support system, cultural factors]."

    PARAGRAPH 3 (Differential diagnosis):
    "Also considered in the differential diagnosis are [Diagnosis 1], which is [more/less] likely because [specific reasoning]. [Diagnosis 2] was considered given [relevant symptoms], however [evidence against]. [Diagnosis 3] [reasoning for or against]."

    PARAGRAPH 4 (Treatment direction):
    "The treatment plan will focus on [primary interventions] with consideration of [additional needs]. The prognosis is [good/fair/guarded] given [specific factors]. Plan details are as follows:"`,
    format: 'structured_paragraphs'
  },

  'Plan': {
    sectionName: 'Plan',
    temperature: 0.3,
    instructions: `Format the plan with these EXACT sections:

    Medications:
    - List each medication change on its own line
    - Format: "[Action] [medication] [dose] [frequency] for [indication]"
    - Actions: Start, Continue, Increase, Decrease, Discontinue, Taper
    - Include rationale for changes
    - Example: "Start sertraline 50 mg daily for depression - patient agreeable to SSRI trial"

    Psychotherapy Referral:
    - Specify type of therapy (CBT, DBT, EMDR, etc.)
    - Name of therapist if known
    - Frequency (weekly, biweekly)
    - Focus areas

    Therapy Conducted:
    - Type of therapy provided in session
    - Main themes discussed
    - Interventions used
    - Approximate duration in minutes

    Laboratory/Studies:
    - List specific labs with clinical reasoning
    - Include screening tools (PHQ-9, GAD-7, etc.)
    - Timeline for completion

    Follow-up:
    - Specific date and time if scheduled
    - Format (in-person, telehealth)
    - ALWAYS end with "or sooner if needed"

    ALWAYS end with:
    Rufus Sweeney, MD`,
    format: 'structured_sections'
  }
};

/**
 * Build section-specific prompt instructions
 */
export function buildSectionPrompt(section: TemplateSection): string {
  const config = SECTION_PROMPT_CONFIGS[section.name];
  if (!config) {
    return `Generate content for ${section.name} based on the transcript.`;
  }

  let prompt = `\n=== ${section.name.toUpperCase()} ===\n`;
  prompt += `Temperature Setting: ${config.temperature || 0.4}\n`;
  prompt += `Format: ${config.format}\n\n`;
  prompt += `Instructions:\n${config.instructions}\n\n`;

  if (section.exemplar) {
    prompt += `Exemplar (target style):\n${section.exemplar}\n\n`;
  }

  prompt += `Template Structure:\n${section.content}\n`;

  return prompt;
}

/**
 * Generate the complete psychiatric-focused prompt
 */
export function buildPsychiatricPrompt(
  template: Template,
  transcript: string,
  smartListDefinitions: string
): string {
  let prompt = `ROLE: You are a HIPAA-compliant psychiatric note generator for Dr. Rufus Sweeney. Generate focused, clinically accurate notes optimized for Epic EMR.

TASK: Generate a psychiatric note using the provided template, following section-specific instructions precisely.

CRITICAL RULES:
1. SmartLinks: Convert ALL @identifier@ to .identifier (e.g., @FNAME@ → .FNAME)
2. SmartLists: Output ONLY the selected value text, not the {Display:ID} wrapper
3. Wildcards: Replace *** with relevant transcript content, or leave *** if not discussed
4. Format: Use paragraphs only - NO bullets, NO numbered lists except where specified in Plan
5. Accuracy: Do not invent information not in the transcript

SMARTLIST DEFINITIONS:
${smartListDefinitions}

TEMPLATE SECTIONS:
`;

  // Add each section with its specific instructions
  template.sections.forEach(section => {
    prompt += buildSectionPrompt(section);
    prompt += '\n---\n';
  });

  prompt += `
TRANSCRIPT:
${transcript}

GENERATION INSTRUCTIONS:
1. Process each section according to its specific instructions and temperature setting
2. For HPI: Generate detailed narrative (temperature 0.7) - do NOT over-condense
3. For Psychiatric History: Extract facts precisely (temperature 0.3)
4. For ROS and MSE: Select SmartList options carefully (temperature 0.2)
5. For Formulation: Follow exact 4-paragraph structure (temperature 0.5)
6. For Plan: Use exact formatting with subsections (temperature 0.3)

OUTPUT: Generate the complete note following the template structure. Do not include any meta-commentary or section headers beyond what's in the template.`;

  return prompt;
}