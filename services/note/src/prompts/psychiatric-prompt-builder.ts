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
    temperature: 0.2, // CRITICAL: Extra low temperature for maximum safety
    instructions: `⚠️ SAFETY CRITICAL SECTION - FOLLOW THESE RULES EXACTLY ⚠️

    HOSPITALIZATIONS:
    - ONLY document if EXPLICITLY mentioned in transcript
    - Must include specific details: dates, duration, facility name, reason
    - If patient explicitly denies: Write "Denies any psychiatric hospitalizations"
    - If NOT discussed at all: Leave *** blank
    - ⚠️ NEVER infer, assume, or deduce hospitalizations from other information

    SUICIDE ATTEMPTS:
    - ⚠️ CRITICAL: NEVER infer or assume - must be DIRECTLY stated by patient
    - Only document if patient explicitly describes attempt
    - Include: method, date/timeframe, medical intervention if mentioned
    - If patient explicitly denies when asked: Write "Denies any previous suicide attempts"
    - If NOT discussed at all: Leave *** blank
    - DO NOT confuse suicidal ideation with actual attempts
    - DO NOT assume from phrases like "things got really bad" or "I was in a dark place"

    SELF-HARM HISTORY (NSSIB - Non-Suicidal Self-Injurious Behavior):
    - Document ONLY what is explicitly mentioned
    - Clearly distinguish from suicide attempts
    - Include: type (cutting, burning, etc.), frequency, last occurrence
    - If patient explicitly denies: Write "Denies self-harm behaviors"
    - If NOT discussed: Leave *** blank
    - ⚠️ NEVER infer from scars, marks, or other observations

    PREVIOUS DIAGNOSES:
    - List only diagnoses explicitly mentioned
    - Include who diagnosed and when if stated
    - If none mentioned: Leave *** blank

    PREVIOUS MEDICATIONS:
    - List medications explicitly discussed
    - Include doses, durations, and responses if mentioned
    - If none mentioned: Leave *** blank

    PREVIOUS THERAPY:
    - Document types and duration if explicitly discussed
    - Include effectiveness if mentioned
    - If not discussed: Leave *** blank

    DEFAULT RULE: When in doubt, leave *** blank. It is FAR better to have incomplete information than incorrect information in these critical safety areas.`,
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
    temperature: 0.6,
    instructions: `Generate EXACTLY 4 paragraphs in this EXACT structure. DO NOT deviate from this format.

PARAGRAPH 1 - Patient One-Liner (ONE SENTENCE ONLY):
Format: "[patient name] is a [age] year old [sex/gender] with history of [psychiatric history] who presents for [reasons for presentation]."

Example: "Jeremy Montoya is a 35 year old male with history of Major Depressive Disorder and Generalized Anxiety Disorder who presents for psychiatric follow-up following recent medication adjustment."

CRITICAL: This must be ONE sentence only. Include all relevant psychiatric diagnoses from the patient's history.

PARAGRAPH 2 - Diagnosis with DSM Criteria and Biopsychosocial Formulation:
Start with: "The patient's diagnosis is most consistent with [Primary Diagnosis, specify severity] ([ICD-10 code]) based on [list specific DSM-5-TR criteria met from the transcript]."

Then MUST include ALL three perspectives in this order:
"From a biological perspective, [discuss genetics, family history, medical conditions, substance effects, neurotransmitter considerations]. Psychologically, [discuss cognitive patterns, personality factors, coping mechanisms, learned behaviors, trauma impacts]. Socially, [discuss environmental stressors, support system, cultural factors, socioeconomic issues, relationship dynamics]."

CRITICAL: Must explicitly address ALL three domains - biological, psychological, and social. Each domain needs substantive discussion, not just brief mentions.

PARAGRAPH 3 - Differential Diagnosis with Specific Reasoning:
Start with: "Also considered in the differential diagnosis are [list 2-4 other plausible diagnoses]."

Then for EACH differential diagnosis, provide specific reasoning:
"[Diagnosis 1] is [more/less] likely because [specific evidence from transcript supporting OR ruling out]. [Diagnosis 2] was considered given [specific symptoms observed], however [specific evidence against]. [Additional diagnoses with reasoning]."

CRITICAL: Must provide specific reasoning for EACH differential based on the transcript, not generic statements.

PARAGRAPH 4 - Treatment Direction (Brief Bridge to Plan):
Start with one of these options:
- "Plan is to [state primary treatment approach] as follows:"
- "The treatment plan will focus on [primary intervention] with [additional considerations] as follows:"
- "Treatment will prioritize [most urgent need] while addressing [other needs] as follows:"

This paragraph should be 1-2 sentences maximum and end with a colon (:) to transition to the Plan section.

FORMATTING REQUIREMENTS:
✓ Exactly 4 paragraphs separated by single blank lines
✓ NO bullet points or numbered lists
✓ NO sub-headers within the formulation
✓ Paragraph 1: One sentence only
✓ Paragraph 2: Must have biological, psychological, AND social perspectives
✓ Paragraph 3: Must have specific reasoning for each differential
✓ Paragraph 4: Must end with colon (:)
✓ Use precise clinical terminology throughout`,
    format: 'four_paragraph_structure'
  },

  'Plan': {
    sectionName: 'Plan',
    temperature: 0.4,
    instructions: `Format the plan with these EXACT 5 subsections in this EXACT order. ALL subsections are REQUIRED - do not skip any.

Medications:
[List each medication change on its own line with this format]
Format for EACH medication: "[Action] [medication name] [dose] [frequency] for [indication]"
Valid Actions: Start, Continue, Increase, Decrease, Discontinue, Taper, Hold
Examples:
- "Start Wellbutrin XL 150 mg daily for depression"
- "Increase Wellbutrin XL 150 mg to 300 mg daily - patient had incomplete remission of depressive symptoms with 150 mg daily"
- "Start sertraline 50 mg daily for depression - patient agreeable to SSRI trial given previous partial response"
- "Increase quetiapine from 50 mg to 100 mg qhs for mood stabilization - inadequate response at current dose"
- "Continue lithium 900 mg daily - therapeutic level achieved"
If no medication changes: "Continue current medication regimen as outlined above"
NEVER use bullets or dashes - each medication on its own line

Referral to Psychotherapy:
State whether referring to NEW therapy OR continuing EXISTING therapy.
For NEW referral: "Refer to [therapist name if known, or type of therapist] for [therapy type: CBT, DBT, EMDR, psychodynamic, etc.] [frequency: weekly, biweekly] focusing on [specific treatment goals]"
If insurance verified: "Patient has verified insurance coverage for [number] sessions"
For CONTINUING therapy: "Continue [frequency] individual psychotherapy with current therapist [name if known] focusing on [current goals]"
If DECLINED: "Patient declined psychotherapy referral at this time; will revisit at next appointment"
If already in therapy: "Patient to continue established therapy with [therapist name/practice]"

Therapy:
Document the therapy YOU provided in TODAY'S session. This is REQUIRED.
MUST include ALL of the following:
1. Type of therapy provided (supportive, CBT techniques, psychoeducation, motivational interviewing, crisis intervention)
2. Main themes or issues discussed
3. Specific interventions or techniques used
4. Patient's response and engagement level
5. Session duration in minutes

Example: "Supportive psychotherapy provided today focusing on validation of recent job loss stressors, normalization of depressive symptoms as expected grief response, and collaborative problem-solving regarding financial concerns. Utilized cognitive reframing techniques to address catastrophic thinking patterns. Patient engaged well and expressed feeling heard and supported. Session duration: 30 minutes."

If minimal therapy: "Brief supportive counseling provided focusing on medication education and adherence strategies. Session duration: 15 minutes."

Follow-up:
Format: "Return in [specific timeframe] for [purpose of visit]"
Use these placeholders for Epic: .DATE and .TIME
Specify modality: in-person, telehealth, or phone
MUST end with "or sooner if needed"

Examples:
- "Return in 4 weeks for medication monitoring and supportive therapy, or sooner if needed"
- "Return in 2 weeks via telehealth for follow-up after medication initiation, or sooner if needed"
- "Return in 3 months for stable medication management, or sooner if needed"

SIGNATURE (REQUIRED - must be last line):

Rufus Sweeney, MD

CRITICAL REQUIREMENTS:
✓ ALL 5 subsections are REQUIRED (Medications, Referral to Psychotherapy, Therapy, Follow-up, Signature)
✓ Maintain exact order as shown
✓ Each subsection must have content - no empty sections
✓ No bullet points except in medication list if needed
✓ Therapy section MUST include session duration
✓ Follow-up MUST end with "or sooner if needed"
✓ Plan MUST end with "Rufus Sweeney, MD" as the final line`,
    format: 'structured_subsections_required'
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