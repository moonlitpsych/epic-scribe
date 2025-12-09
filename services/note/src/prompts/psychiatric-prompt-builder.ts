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

  'Diagnoses': {
    sectionName: 'Diagnoses',
    temperature: 0.5,
    instructions: `List all relevant psychiatric diagnoses with their ICD-10 codes.

FORMAT REQUIREMENTS:
- List each diagnosis on its own line
- Format: [Diagnosis, specify severity if applicable] - [ICD-10 code]
- Include primary diagnosis first, then any secondary diagnoses
- Use proper DSM-5-TR terminology
- Include appropriate specifiers (severity, with/without features, etc.)

EXAMPLES:
Major Depressive Disorder, Single Episode, Moderate - F32.1
Generalized Anxiety Disorder - F41.1
Attention-Deficit/Hyperactivity Disorder, Combined Presentation - F90.2
Post-Traumatic Stress Disorder - F43.10

CRITICAL: Only include diagnoses that are supported by the clinical evidence from the transcript and patient history.`,
    format: 'list'
  },

  'Formulation': {
    sectionName: 'Formulation',
    temperature: 0.6,
    instructions: `Generate EXACTLY 4 paragraphs in this EXACT structure. DO NOT deviate from this format.

PARAGRAPH 1 - Patient One-Liner (ONE SENTENCE ONLY):
Format: "[PATIENT_FIRST_NAME PATIENT_LAST_NAME] is a [PATIENT_AGE] year old [sex/gender] with history of [psychiatric history] who presents for [reasons for presentation]."

⚠️ CRITICAL: Use the ACTUAL patient name and age from the PATIENT DEMOGRAPHICS section above.
- Use the exact PATIENT_FIRST_NAME and PATIENT_LAST_NAME values - DO NOT use .FNAME or .LNAME dotphrases
- Use the exact PATIENT_AGE value - DO NOT use .age dotphrase
- If age is not provided, use "***-year-old"

Example: "Jeremy Montoya is a 35 year old male with history of Major Depressive Disorder and Generalized Anxiety Disorder who presents for psychiatric follow-up following recent medication adjustment."

CRITICAL: This must be ONE sentence only. Include all relevant psychiatric diagnoses from the patient's history.

PARAGRAPH 2 - Diagnosis with DSM Criteria and Biopsychosocial Formulation:
Start with: "The patient's diagnosis is most consistent with [Primary Diagnosis, specify severity] based on [list specific DSM-5-TR criteria met from the transcript]."

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

  'Assessment': {
    sectionName: 'Assessment',
    temperature: 0.5,
    instructions: `Generate a concise 2-paragraph assessment for this follow-up/transfer of care visit.

PARAGRAPH 1 - Patient One-Liner (ONE SENTENCE ONLY):
Format: "[PATIENT_FIRST_NAME PATIENT_LAST_NAME] is a [PATIENT_AGE] year old [sex/gender] with history of [psychiatric diagnoses] who presents for [follow-up for medication management/transfer of care/etc.]."

⚠️ CRITICAL: Use the ACTUAL patient name and age from the PATIENT DEMOGRAPHICS section above.
- Use the exact PATIENT_FIRST_NAME and PATIENT_LAST_NAME values - DO NOT use .FNAME or .LNAME dotphrases
- Use the exact PATIENT_AGE value - DO NOT use .age dotphrase
- If age is not provided, use "***-year-old"

Example: "Sarah Johnson is a 42 year old female with history of Bipolar I Disorder and Generalized Anxiety Disorder who presents for follow-up for medication management."

PARAGRAPH 2 - Interval Update:
Start with: "Since the last visit [timeframe if mentioned], the patient reports..."

Include ALL of the following elements that are discussed in the transcript:

SUBJECTIVE (Patient-reported):
- Medication adherence: Is the patient taking medications as prescribed?
- Side effects and tolerance: Any adverse effects from medications?
- Medication response: How effective have the medications been for symptoms?
- Symptom changes: Improvement, worsening, or stability of psychiatric symptoms
- Life stressors: New or ongoing stressors, life changes, or circumstances
- Sleep, appetite, energy changes
- Any concerning symptoms or behaviors

OBJECTIVE (Clinician-observed):
- Mental Status Exam findings: Notable changes in appearance, behavior, mood, affect, thought process
- Mood questionnaires or rating scales if administered (PHQ-9, GAD-7, etc.)
- Observable improvement or deterioration
- Functional status changes

Format as a flowing narrative paragraph, not a bulleted list. Focus on clinically relevant changes and current status.

Example: "Since the last visit 4 weeks ago, the patient reports good adherence to sertraline 100mg daily with no side effects and moderate improvement in depressive symptoms. She notes improved sleep (now 6-7 hours nightly), stable appetite, and better energy levels. Anxiety remains elevated in social situations but is more manageable. She started a new job 2 weeks ago which has been stressful but rewarding. No suicidal ideation, self-harm, or substance use reported. On mental status exam, she appears well-groomed with bright affect, linear thought process, and improved eye contact compared to prior visit. PHQ-9 score decreased from 15 to 10, indicating mild depression."

CRITICAL: Only include information explicitly discussed in the transcript. Do not invent or assume details.`,
    format: 'two_paragraph_interval'
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
  },

  'Plan_Followup': {
    sectionName: 'Plan',
    temperature: 0.4,
    instructions: `Format the plan with these EXACT 5 subsections in this EXACT order. ALL subsections are REQUIRED - do not skip any.

Medications:
CRITICAL FOR FOLLOW-UP VISITS:
- For medications that are UNCHANGED from prior visit: Use "Continue [medication] [dose] [frequency]"
- For medications that are CHANGED: Use action verb (Increase/Decrease) with explanation
- For medications being STOPPED: Use "Discontinue [medication] - [reason]"
- For NEW medications: Use "Start [medication] [dose] [frequency] for [indication]"

${process.env.PREVIOUS_MEDICATIONS ? `
MEDICATIONS FROM PREVIOUS NOTE (use as baseline):
${process.env.PREVIOUS_MEDICATIONS}
` : ''}

Format for EACH medication: "[Action] [medication name] [dose] [frequency]"
Examples for follow-up:
- "Continue sertraline 100mg daily"
- "Continue lithium 900mg daily"
- "Increase lamotrigine from 100mg to 150mg daily - partial response at current dose"
- "Start propranolol 10mg TID PRN for anxiety"
- "Discontinue hydroxyzine - patient reports excessive sedation"

IMPORTANT: Do NOT include medication response or side effects here - those belong in the Assessment's Interval Update section.

If no changes to any medications: "Continue current medication regimen without changes"
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
6. TIMESTAMPS: If psychotherapy discussion is detected in transcript with timestamps [HH:MM:SS], include them

Example with timestamps: "Supportive psychotherapy provided from [00:15:30] to [00:35:45] focusing on processing grief related to mother's recent diagnosis, validating emotional responses, and developing coping strategies. Utilized cognitive restructuring for catastrophic thoughts about the future. Patient became tearful but engaged well with interventions. Session duration: 20 minutes."

If minimal therapy: "Brief supportive counseling provided from [00:05:00] to [00:10:00] focusing on medication education and adherence strategies. Session duration: 5 minutes."

Follow-up:
Format: "Return in [specific timeframe] for [purpose of visit]"
Use these placeholders for Epic: .DATE and .TIME
Specify modality: in-person, telehealth, or phone
MUST end with "or sooner if needed"

Examples:
- "Return in 4 weeks for medication monitoring and supportive therapy, or sooner if needed"
- "Return in 2 weeks via telehealth for follow-up after medication adjustment, or sooner if needed"
- "Return in 3 months for stable medication management, or sooner if needed"

SIGNATURE (REQUIRED - must be last line):

Rufus Sweeney, MD

CRITICAL REQUIREMENTS:
✓ ALL 5 subsections are REQUIRED (Medications, Referral to Psychotherapy, Therapy, Follow-up, Signature)
✓ Maintain exact order as shown
✓ Each subsection must have content - no empty sections
✓ Use "Continue" for unchanged medications in follow-up visits
✓ Include timestamps from transcript when available for therapy section
✓ Therapy section MUST include session duration
✓ Follow-up MUST end with "or sooner if needed"
✓ Plan MUST end with "Rufus Sweeney, MD" as the final line`,
    format: 'structured_subsections_followup'
  }
};

/**
 * Ensure proper section ordering with Diagnoses before Formulation
 */
function ensureProperSectionOrdering(template: Template): Template {
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
 * Build section-specific prompt instructions with visit type awareness
 */
export function buildSectionPrompt(section: TemplateSection, visitType?: string, previousMedications?: string): string {
  const isFollowUp = visitType === 'Follow-up' || visitType === 'Transfer of Care';

  // Choose the appropriate config based on section name and visit type
  let configName = section.name;
  if (section.name === 'Formulation' && isFollowUp) {
    configName = 'Assessment';  // Use Assessment for follow-ups instead of Formulation
  } else if (section.name === 'Plan' && isFollowUp) {
    configName = 'Plan_Followup';  // Use follow-up specific Plan config
  }

  const config = SECTION_PROMPT_CONFIGS[configName];
  if (!config) {
    return `Generate content for ${section.name} based on the transcript.`;
  }

  // For follow-up Plan section, inject previous medications if available
  let instructions = config.instructions;
  if (configName === 'Plan_Followup' && previousMedications) {
    instructions = instructions.replace(
      '${process.env.PREVIOUS_MEDICATIONS ? `',
      `
MEDICATIONS FROM PREVIOUS NOTE (use as baseline):
${previousMedications}
`
    ).replace('${process.env.PREVIOUS_MEDICATIONS}', previousMedications).replace('` : \'\'}', '');
  }

  let prompt = `\n=== ${config.sectionName.toUpperCase()} ===\n`;
  prompt += `Temperature Setting: ${config.temperature || 0.4}\n`;
  prompt += `Format: ${config.format}\n\n`;
  prompt += `Instructions:\n${instructions}\n\n`;

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
  smartListDefinitions: string,
  staffingTranscript?: string,
  visitType?: string,
  previousNote?: string,
  patientDemographics?: {
    firstName?: string;
    lastName?: string;
    age?: number | null;
  }
): string {
  // Check for staffing configuration
  const staffingConfig = template.staffing_config;
  const hasInlineStaffing = staffingConfig?.mode === 'inline' &&
    staffingConfig.visitTypes.includes(template.visit_type);
  const hasSeparateStaffing = staffingConfig?.mode === 'separate' &&
    staffingConfig.visitTypes.includes(template.visit_type) &&
    staffingTranscript;

  let prompt = `ROLE: You are a HIPAA-compliant psychiatric note generator for Dr. Rufus Sweeney. Generate focused, clinically accurate notes optimized for Epic EMR.

TASK: Generate a psychiatric note using the provided template, following section-specific instructions precisely.

CRITICAL RULES:
1. PATIENT DEMOGRAPHICS: Use the actual patient name and age provided in the PATIENT DEMOGRAPHICS section
   - Use PATIENT_FIRST_NAME and PATIENT_LAST_NAME directly in the note (NOT .FNAME or .LNAME dotphrases)
   - Use PATIENT_AGE directly (e.g., "47-year-old") (NOT .age dotphrase)
   - If age is not provided, use "***-year-old"
2. SmartLinks: Convert OTHER @identifier@ to .identifier (e.g., @lastvitals@ → .lastvitals)
   - EXCEPTION: @FNAME@, @LNAME@, and @age@ should be replaced with actual values from PATIENT DEMOGRAPHICS, NOT dotphrases
3. SmartLists: Output ONLY the selected value text, not the {Display:ID} wrapper
4. Wildcards: Replace *** with relevant transcript content, or leave *** if not discussed
5. Format: Use paragraphs only - NO bullets, NO numbered lists except where specified in Plan
6. Accuracy: Do not invent information not in the transcript
`;

  // Add Patient Demographics section if provided
  if (patientDemographics?.firstName || patientDemographics?.lastName) {
    const firstName = patientDemographics.firstName || '***';
    const lastName = patientDemographics.lastName || '***';
    const ageStr = (patientDemographics.age !== undefined && patientDemographics.age !== null)
      ? String(patientDemographics.age)
      : '***';

    prompt += `
PATIENT DEMOGRAPHICS (use these exact values in the note):
PATIENT_FIRST_NAME: ${firstName}
PATIENT_LAST_NAME: ${lastName}
PATIENT_AGE: ${ageStr}

⚠️ IMPORTANT: Use "${firstName} ${lastName}" as the patient's name in the Formulation/Assessment section.
Use "${ageStr}-year-old" for the patient's age. DO NOT use .FNAME, .LNAME, or .age dotphrases.
`;
  }

  // Add inline staffing instructions if configured
  if (hasInlineStaffing) {
    const markers = staffingConfig.markers?.join('", "') || 'supervising doctor, staff this';
    prompt += `
⚠️ STAFFING CONVERSATION DETECTION (CRITICAL FOR THIS VISIT TYPE) ⚠️

This is a residency training setting. The transcript likely contains TWO parts:
1. PATIENT INTERVIEW: Conversation between Dr. Sweeney and the patient
2. ATTENDING STAFFING: Conversation between Dr. Sweeney and the supervising attending physician

DETECTION INSTRUCTIONS:
- Look for transition markers like: "${markers}"
- Staffing typically occurs when:
  * Dr. Sweeney says he needs to "talk with my supervising doctor" or similar
  * The conversation shifts to discussing the patient in third person
  * Treatment planning language emerges (e.g., "I'm thinking we should...")
  * A new speaker (the attending) joins the discussion

STAFFING SECTION EXTRACTION:
- Identify where the staffing conversation begins and ends
- Extract key clinical points from the attending physician:
  * Diagnostic impressions or revisions
  * Medication recommendations (specific agents, doses, rationale)
  * Therapy modality recommendations
  * Safety considerations or precautions
  * Follow-up timing and monitoring plans
  * Teaching points or differential diagnosis considerations

PLAN SECTION PRIORITY (CRITICAL):
⚠️ The Plan section MUST heavily weight the attending's recommendations from the staffing conversation.
- Medications: Use specific agents, doses, and rationales discussed with attending
- Therapy: Follow attending's guidance on modality and focus
- Follow-up: Align with attending's recommended timeline
- If the attending contradicted or refined an initial plan, use the FINAL plan from staffing
- Document the plan as if it's Dr. Sweeney's plan (not "attending recommended..." but "Start sertraline...")

EXAMPLE PATTERN:
[Patient interview content] → [Transition: "Let me staff this with my attending"] → [Staffing discussion with clinical recommendations] → Generate Plan heavily based on staffing recommendations
`;
  }

  // Add separate staffing instructions if configured
  if (hasSeparateStaffing) {
    prompt += `
⚠️ SEPARATE STAFFING CONVERSATION PROVIDED (CRITICAL FOR THIS VISIT TYPE) ⚠️

This is a residency training setting. You will receive TWO separate transcripts:
1. PATIENT INTERVIEW TRANSCRIPT: The conversation between Dr. Sweeney and the patient
2. STAFFING TRANSCRIPT: A separate recording of Dr. Sweeney discussing the case with the supervising attending physician

STAFFING TRANSCRIPT HANDLING:
- The staffing transcript is recorded END-OF-DAY after all patient visits
- Extract key clinical recommendations from the attending physician:
  * Diagnostic impressions or revisions
  * Medication recommendations (specific agents, doses, rationale)
  * Therapy modality recommendations
  * Safety considerations or precautions
  * Follow-up timing and monitoring plans
  * Teaching points or differential diagnosis considerations

PLAN SECTION PRIORITY (CRITICAL):
⚠️ The Plan section MUST heavily weight the attending's recommendations from the staffing transcript.
- Medications: Use specific agents, doses, and rationales discussed with attending
- Therapy: Follow attending's guidance on modality and focus
- Follow-up: Align with attending's recommended timeline
- If the attending contradicted or refined an initial plan, use the FINAL plan from staffing
- Document the plan as if it's Dr. Sweeney's plan (not "attending recommended..." but "Start sertraline...")

INTEGRATION PATTERN:
Use the PATIENT TRANSCRIPT for all clinical content (HPI, Psych Hx, ROS, MSE, Formulation) → Use the STAFFING TRANSCRIPT primarily for the Plan section
`;
  }

  // Extract medications from previous note if available
  let previousMedications = '';
  if (previousNote) {
    // Simple extraction of medications from Plan section
    const planMatch = previousNote.match(/Plan[:|\n]([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const medicationsMatch = planMatch?.[1]?.match(/Medications?[:|\n]([\s\S]*?)(?=\nReferral|$)/i);
    if (medicationsMatch) {
      previousMedications = medicationsMatch[1].trim();
    }
  }

  prompt += `
SMARTLIST DEFINITIONS:
${smartListDefinitions}

TEMPLATE SECTIONS:
`;

  // Ensure proper section ordering with Diagnoses before Formulation/Assessment
  const ensuredTemplate = ensureProperSectionOrdering(template);

  // Add each section with its specific instructions
  ensuredTemplate.sections.forEach(section => {
    prompt += buildSectionPrompt(section, visitType, previousMedications);
    prompt += '\n---\n';
  });

  // Add transcripts
  if (hasSeparateStaffing && staffingTranscript) {
    prompt += `
PATIENT INTERVIEW TRANSCRIPT:
${transcript}

---

STAFFING TRANSCRIPT (END-OF-DAY DISCUSSION WITH ATTENDING):
${staffingTranscript}
`;
  } else {
    prompt += `
TRANSCRIPT:
${transcript}
`;
  }

  const isFollowUp = visitType === 'Follow-up' || visitType === 'Transfer of Care';

  prompt += `

GENERATION INSTRUCTIONS:
1. Process each section according to its specific instructions and temperature setting
2. For HPI: Generate detailed narrative (temperature 0.7) - do NOT over-condense
3. For Psychiatric History: Extract facts precisely (temperature 0.3)
4. For ROS and MSE: Select SmartList options carefully (temperature 0.2)
5. For ${isFollowUp ? 'Assessment' : 'Formulation'}: Follow ${isFollowUp ? '2-paragraph interval update structure' : 'exact 4-paragraph structure'} (temperature 0.5)
6. For Plan: ${isFollowUp ? 'Use "Continue" for unchanged medications, include timestamps for therapy' : 'Use exact formatting with subsections'} (temperature 0.3)`;

  if (hasSeparateStaffing) {
    prompt += `
7. For Plan section: HEAVILY weight the staffing transcript - use attending's specific recommendations
`;
  }

  prompt += `

OUTPUT: Generate the complete note following the template structure. Do not include any meta-commentary or section headers beyond what's in the template.`;

  return prompt;
}