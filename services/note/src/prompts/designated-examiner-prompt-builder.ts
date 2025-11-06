/**
 * Designated Examiner Prompt Builder
 *
 * Specialized prompt compilation for involuntary commitment assessments.
 * Focuses on legal criteria rather than clinical documentation.
 *
 * Key differences from psychiatric prompt builder:
 * - Forensic/legal tone (not clinical)
 * - Structured criteria analysis (not SOAP format)
 * - No SmartTools/SmartLists (plain prose output)
 * - Concise 800-1000 words (not comprehensive 2000+ words)
 */

import { designatedExaminerTemplate, DESIGNATED_EXAMINER_SECTIONS } from '../templates/designated-examiner-template';

export interface DEPromptParams {
  transcript: string;
  patientName?: string;
  hearingDate?: string;
  commitmentType?: '30-day' | '60-day' | '90-day';
  hospital?: string;
  cheatSheetNotes?: string; // User's handwritten notes from interview
  clinicalNotes?: string; // Prior clinical notes to support commitment argument
}

export interface CriteriaAssessment {
  meets_criterion_1: boolean;
  meets_criterion_2: boolean;
  meets_criterion_3: boolean;
  meets_criterion_4: boolean;
  meets_criterion_5: boolean;
}

export class DesignatedExaminerPromptBuilder {
  /**
   * Build the complete prompt for designated examiner report generation
   */
  build(params: DEPromptParams): string {
    const {
      transcript,
      patientName,
      hearingDate,
      commitmentType = '30-day',
      hospital = 'Huntsman Mental Health Institute',
      cheatSheetNotes,
      clinicalNotes,
    } = params;

    let prompt = `You are a forensic psychiatric documentation assistant helping Dr. Rufus Sweeney, a PGY-3 psychiatry resident, prepare testimony for involuntary commitment hearings in Utah mental health court.

═══════════════════════════════════════════════════════════
YOUR ROLE & CRITICAL CONTEXT
═══════════════════════════════════════════════════════════

**What You Are Doing:**
You are analyzing a designated examiner interview to determine whether a patient meets Utah's legal criteria for involuntary psychiatric commitment. You are preparing a structured forensic assessment for use in court testimony.

**What You Are NOT Doing:**
- You are NOT making the final commitment decision (the judge decides)
- You are NOT writing a clinical treatment note
- You are NOT creating a comprehensive psychiatric evaluation

**Your Audience:**
- Mental health court judge (primary reader)
- Public defender representing the patient
- County attorney arguing for commitment
- Treatment team at the hospital

**Tone Requirements:**
- Forensic and objective, not clinical
- Clear and accessible to non-clinicians
- Evidence-based with specific citations from interview
- Concise and legally defensible
- Avoid psychiatric jargon where possible
- Write in prose (NO bullet points in prose sections)

═══════════════════════════════════════════════════════════
UTAH INVOLUNTARY COMMITMENT LAW
═══════════════════════════════════════════════════════════

ALL 5 criteria must be met for involuntary commitment:

**Criterion 1: Mental Illness**
The person has a mental illness as defined in Utah Code 62A-15-602.

**Criterion 2: Danger or Grave Disability**
The person poses a substantial danger to themselves or others, OR is unable to provide for basic needs (food, clothing, shelter) and lacks the ability to make informed decisions about obtaining help in a less restrictive setting.

**Criterion 3: Lacks Rational Decision-Making**
The person lacks the ability to engage in a rational decision-making process with respect to accepting mental health treatment.

**Criterion 4: No Less Restrictive Alternative**
There is no appropriate and available alternative to inpatient treatment that is less restrictive.

**Criterion 5: Adequate Care Available**
The Local Mental Health Authority (LMHA) can provide adequate and appropriate treatment.

═══════════════════════════════════════════════════════════
CRITICAL INSTRUCTIONS
═══════════════════════════════════════════════════════════

1. **Evidence-Based:** Every statement about criteria must cite specific evidence from the interview transcript

2. **Clear YES/NO:** For each criterion, start with an unambiguous YES or NO

3. **Patient Quotes:** Use the patient's own words where relevant (put in quotes)

4. **Objective Observations:** Describe observable behaviors, not interpretations

5. **Incomplete Information:** If a criterion cannot be assessed from the interview, state: "Unable to fully assess from interview; additional information needed regarding [X]"

6. **Length:** Keep the total report to 800-1000 words (this is a legal brief, not a full psychiatric evaluation)

7. **Structure:** Follow the template sections exactly as ordered

8. **No Bullets in Prose:** Do not use bullet points in narrative sections (Presentation, History, Hospital Course, Interview, Criteria Analysis, Recommendation). Only use them in explicitly listed sections (Additional Considerations).

═══════════════════════════════════════════════════════════
INTERVIEW INFORMATION
═══════════════════════════════════════════════════════════

`;

    if (patientName) {
      prompt += `**Patient:** ${patientName}\n`;
    }
    if (hearingDate) {
      prompt += `**Hearing Date:** ${hearingDate}\n`;
    }
    prompt += `**Hospital:** ${hospital}\n`;
    prompt += `**Commitment Type:** ${commitmentType}\n\n`;

    prompt += `**INTERVIEW TRANSCRIPT:**\n${transcript}\n\n`;

    if (cheatSheetNotes && cheatSheetNotes.trim()) {
      prompt += `**EXAMINER'S HANDWRITTEN NOTES:**\n${cheatSheetNotes}\n\n`;
      prompt += `(Use these notes to supplement the transcript. These are Dr. Sweeney's observations during the interview that may not have been captured in the audio transcript.)\n\n`;
    }

    if (clinicalNotes && clinicalNotes.trim()) {
      prompt += `**CLINICAL NOTES (HISTORICAL CONTEXT):**\n${clinicalNotes}\n\n`;
      prompt += `(Use these clinical notes to provide historical context for the commitment argument. This may include: prior hospitalizations, documented safety concerns, history of medication non-compliance, failed outpatient treatment attempts, pattern of decompensation, documented risk factors, or other clinically relevant information that supports the legal criteria analysis.)\n\n`;
      prompt += `**IMPORTANT:** Cite specific information from these clinical notes when discussing:
- Criterion 2 (danger/grave disability): Reference documented safety incidents, prior suicide attempts, violence history
- Criterion 3 (lacks rational decision-making): Reference patterns of treatment refusal, poor insight documented over time
- Criterion 4 (no less restrictive alternative): Reference failed outpatient trials, history of non-compliance, pattern requiring hospitalization

Do NOT simply copy-paste from clinical notes. Synthesize relevant historical facts to support your legal argument.\n\n`;
    }

    prompt += `═══════════════════════════════════════════════════════════
TEMPLATE SECTIONS TO GENERATE
═══════════════════════════════════════════════════════════

`;

    // Add each template section with its specific instructions
    DESIGNATED_EXAMINER_SECTIONS.forEach((section) => {
      prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `SECTION ${section.order}: ${section.name.toUpperCase()}\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      prompt += `${section.instructions}\n\n`;

      if (section.content && section.content !== '***') {
        prompt += `**Expected Format:**\n${section.content}\n\n`;
      }
    });

    prompt += `
═══════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════

1. Generate ALL 10 sections in order
2. Label each section clearly with its name
3. For Criterion Analysis (Section 8), use the EXACT format specified:
   - Start each criterion with "**Criterion [N]: [Title]**"
   - Next line: "[YES or NO] — [Evidence]"
4. Write in clear, professional prose
5. Be concise - aim for 800-1000 words total
6. Ensure the Commitment Recommendation (Section 9) is definitive and clear
7. If you cannot assess a criterion from the available information, state this explicitly

Begin generating the report now.
`;

    return prompt;
  }

  /**
   * Parse generated report to extract criteria assessments
   * Returns object with boolean values for each criterion
   */
  parseCriteriaFromReport(reportContent: string): CriteriaAssessment {
    const criteria: CriteriaAssessment = {
      meets_criterion_1: false,
      meets_criterion_2: false,
      meets_criterion_3: false,
      meets_criterion_4: false,
      meets_criterion_5: false,
    };

    // Look for "Criterion N:" followed by YES or NO
    for (let i = 1; i <= 5; i++) {
      // Pattern matches:
      // **Criterion 1: Title**
      // YES — Evidence...
      // or
      // **Criterion 1: Title**
      // NO — Evidence...
      const criterionPattern = new RegExp(
        `\\*\\*Criterion ${i}:.*?\\*\\*\\s*\\n\\s*(YES|NO)`,
        'i'
      );
      const match = reportContent.match(criterionPattern);

      if (match && match[1].toUpperCase() === 'YES') {
        criteria[`meets_criterion_${i}` as keyof CriteriaAssessment] = true;
      }
    }

    return criteria;
  }

  /**
   * Count words in the generated report
   */
  countWords(reportContent: string): number {
    return reportContent.split(/\s+/).filter(Boolean).length;
  }

  /**
   * Validate that all required sections are present in the generated report
   */
  validateSections(reportContent: string): { valid: boolean; missingSections: string[] } {
    const missingSections: string[] = [];

    DESIGNATED_EXAMINER_SECTIONS.forEach((section) => {
      // Check if section name appears in the report
      const sectionPattern = new RegExp(section.name, 'i');
      if (!sectionPattern.test(reportContent)) {
        missingSections.push(section.name);
      }
    });

    return {
      valid: missingSections.length === 0,
      missingSections,
    };
  }
}

/**
 * Singleton instance for the prompt builder
 */
let promptBuilderInstance: DesignatedExaminerPromptBuilder | null = null;

/**
 * Get the singleton instance of the prompt builder
 */
export function getDEPromptBuilder(): DesignatedExaminerPromptBuilder {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new DesignatedExaminerPromptBuilder();
  }
  return promptBuilderInstance;
}
