/**
 * Therapy-Focused Prompt Builder
 *
 * Specialized prompt compilation for psychotherapy notes (BHIDC therapy).
 * Focuses on therapeutic interventions, session goals, and client progress
 * rather than medication management.
 *
 * Key differences from psychiatric/medication management prompt builder:
 * - Psychotherapy-focused tone (not medication-focused)
 * - Emphasizes therapeutic techniques, client engagement, progress
 * - No medication plans, labs, or medical decision-making
 * - Focus on session content, interventions, and homework
 */

import { Template } from '@epic-scribe/types';

export interface TherapyPromptParams {
  template: Template;
  transcript: string;
  bhidcStaffScreenerNote?: string; // For first visit only
  previousNote?: string; // For follow-up visits
  patientContext?: string; // Additional clinical context
}

/**
 * Build a complete prompt for therapy note generation
 */
export function buildTherapyPrompt(params: TherapyPromptParams): string {
  const {
    template,
    transcript,
    bhidcStaffScreenerNote,
    previousNote,
    patientContext,
  } = params;

  const isFirstVisit = template.visitType === 'First Visit';
  const isFollowUp = template.visitType === 'Follow-up';

  let prompt = `You are a clinical documentation assistant specializing in PSYCHOTHERAPY notes for Dr. Rufus Sweeney. You generate therapy-focused clinical notes that document therapeutic interventions, client progress, and treatment planning.

═══════════════════════════════════════════════════════════
YOUR ROLE & CRITICAL CONTEXT
═══════════════════════════════════════════════════════════

**What You Are Doing:**
You are generating a psychotherapy session note that documents therapeutic work, interventions, and client progress. This is a THERAPY note, not a medication management visit.

**What You Are NOT Doing:**
- You are NOT prescribing medications or managing pharmacotherapy
- You are NOT writing a comprehensive psychiatric evaluation
- You are NOT making medical diagnoses requiring medication

**Focus Areas:**
- Therapeutic interventions and modalities used
- Client presentation and engagement
- Session content and themes
- Progress towards treatment goals
- Homework and between-session tasks
- Treatment planning and focus for next session

**Tone Requirements:**
- Clinical and professional, focused on therapeutic work
- Narrative prose (NO bullet points)
- Evidence client-centered language ("client" not "patient")
- Emphasize therapeutic relationship and interventions
- Document observable client responses to interventions

═══════════════════════════════════════════════════════════
THERAPY NOTE STRUCTURE
═══════════════════════════════════════════════════════════

${buildTemplateStructure(template)}

═══════════════════════════════════════════════════════════
SECTION-SPECIFIC INSTRUCTIONS
═══════════════════════════════════════════════════════════
`;

  if (isFirstVisit) {
    prompt += `
**BHIDC Staff Intake Summary** (First Visit Only):
${bhidcStaffScreenerNote ? `
- Review the provided BHIDC staff screener intake note
- Extract and summarize key clinical information:
  * Presenting problems and chief complaints
  * Prior treatment history (therapy, medications, hospitalizations)
  * Current stressors and precipitating factors
  * Risk factors (safety concerns, substance use, etc.)
  * Preliminary diagnostic impressions
- Focus on information most relevant for therapy treatment planning
- Use 1-2 concise paragraphs
` : `
- If a BHIDC staff screener note is provided, summarize key information
- If not provided, leave as *** (do not fabricate)
`}

**Diagnostic Impressions**:
- List current DSM-5-TR diagnoses relevant to therapy focus
- Include ICD-10 codes if mentioned in prior documentation
- Keep brief and clinically focused
- If not explicitly discussed, use context from transcript

**Presenting Problem**:
- Client's own words describing why they're seeking therapy
- Duration of problems and precipitating causes
- Current impact on functioning (work, relationships, daily life)
- Use rich, narrative detail from transcript
- Include relevant quotes from client

**Pertinent History**:
- Prior therapy experiences (type, duration, effectiveness)
- Family history relevant to current problems
- Social/developmental history as pertinent
- Current medications ONLY if relevant to therapy (e.g., side effects affecting mood)
- Medical history only if directly relevant to therapy focus
- Keep focused on information that informs therapeutic approach

`;
  }

  if (isFollowUp) {
    prompt += `
**Interval History** (Follow-up Visits):
- Changes since last session
- Homework completion and client's experience with between-session tasks
- New stressors or life events
- Changes in symptoms or functioning
- Keep concise, 1-2 paragraphs

`;
  }

  prompt += `
**Mental Status Examination**:
- Brief, therapy-focused MSE
- Appearance, behavior, speech, affect, mood
- Thought process and thought content
- Insight and judgment
- Use concise descriptive terms (1-3 words per item)
- Example: "Appearance: Casually dressed, good hygiene"
- Example: "Mood: 'Better this week'"
- Example: "Affect: Congruent, full range"

**Session Focus**:
- Main themes and topics discussed in session
- Client's current concerns and priorities
- Emotional content and processing
- Use narrative prose, 1-2 paragraphs
- Capture the essence of therapeutic work

**Therapeutic Intervention**:
- Specific therapy modality used (CBT, DBT, ACT, supportive, etc.)
- Techniques and interventions employed
- Examples:
  * Cognitive restructuring of automatic negative thoughts
  * Behavioral activation planning
  * Emotion regulation skills training
  * Mindfulness exercises
  * Exposure hierarchy development
  * Family systems work
- Client's engagement and response to interventions
- Use specific, behavioral language

**Client Progress**:
- Observable changes in symptoms, functioning, or coping
- Progress towards treatment goals
- Barriers or challenges to progress
- Client's own perception of progress
- Keep strengths-based and collaborative

**Planned Intervention**:
- Homework or between-session tasks assigned
- Skills to practice
- Focus areas for next session
- Follow-up timeframe
- Safety planning if relevant
- Conclude with: "Return in [timeframe] for ongoing psychotherapy, or sooner if needed."
- End with provider signature: "Rufus Sweeney, MD"

═══════════════════════════════════════════════════════════
CRITICAL INSTRUCTIONS
═══════════════════════════════════════════════════════════

1. **USE PROSE FORMAT ONLY**
   - Write in complete paragraphs
   - NO bullet points in narrative sections
   - NO numbered lists except where template specifies (e.g., MSE items)

2. **THERAPY FOCUS** (CRITICAL)
   - This is a THERAPY note, NOT a medication management note
   - Do NOT include medication prescriptions, dose changes, or pharmacotherapy plans
   - Do NOT include lab orders
   - Do NOT write formulations focused on medication decisions
   - Focus on therapeutic interventions, not medical interventions

3. **WILDCARD REPLACEMENT**
   - Replace *** with content from transcript
   - If information not available in transcript, leave *** blank
   - Do NOT fabricate clinical information
   - Do NOT invent quotes or statements not in transcript

4. **TEMPLATE FIDELITY**
   - Follow the template section structure exactly
   - Keep sections in the order specified
   - Use section headers exactly as shown
   - Do not add or remove sections

5. **CLIENT-CENTERED LANGUAGE**
   - Use "client" rather than "patient" in therapy context
   - Use collaborative language ("we explored," "client identified")
   - Emphasize client's agency and active participation

6. **SAFETY FIRST**
   - Always document risk factors and safety planning
   - Never minimize or ignore suicide/homicide risk
   - Be explicit about risk assessment and safety contracts

`;

  // Add BHIDC staff screener note if provided
  if (bhidcStaffScreenerNote) {
    prompt += `
═══════════════════════════════════════════════════════════
BHIDC STAFF SCREENER INTAKE NOTE
═══════════════════════════════════════════════════════════

${bhidcStaffScreenerNote}

`;
  }

  // Add previous note if provided
  if (previousNote) {
    prompt += `
═══════════════════════════════════════════════════════════
PREVIOUS THERAPY NOTE (for context and continuity)
═══════════════════════════════════════════════════════════

${previousNote}

`;
  }

  // Add patient context if provided
  if (patientContext) {
    prompt += `
═══════════════════════════════════════════════════════════
PATIENT CLINICAL CONTEXT
═══════════════════════════════════════════════════════════

${patientContext}

`;
  }

  // Add transcript
  prompt += `
═══════════════════════════════════════════════════════════
THERAPY SESSION TRANSCRIPT
═══════════════════════════════════════════════════════════

${transcript}

═══════════════════════════════════════════════════════════
OUTPUT INSTRUCTIONS
═══════════════════════════════════════════════════════════

Generate the complete therapy note following the template structure above.

- Use prose format (NO bullet points)
- Focus on therapeutic interventions and client progress
- Do NOT include medication plans or lab orders
- Replace all *** with appropriate content from transcript
- Maintain professional, client-centered tone
- Document session accurately and completely
- End with provider signature

Begin generating the note now. Output only the final note with no meta-commentary.
`;

  return prompt;
}

/**
 * Build template structure section
 */
function buildTemplateStructure(template: Template): string {
  let structure = `The note follows this structure with ${template.sections.length} sections:\n\n`;

  template.sections.forEach((section, index) => {
    structure += `${index + 1}. **${section.name}**\n`;
    if (section.content) {
      // Show a preview of the template content
      const preview = section.content.length > 150
        ? section.content.substring(0, 150) + '...'
        : section.content;
      structure += `   Template: ${preview}\n`;
    }
    if (section.exemplar) {
      structure += `   Exemplar: ${section.exemplar}\n`;
    }
    structure += '\n';
  });

  return structure;
}
