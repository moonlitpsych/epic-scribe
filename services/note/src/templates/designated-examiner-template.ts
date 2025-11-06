/**
 * Designated Examiner Template
 *
 * Specialized template for involuntary commitment assessments in Utah mental health court.
 * Generates a structured legal argument based on Utah's 5 criteria for involuntary psychiatric commitment.
 *
 * This template differs from clinical note templates:
 * - Purpose: Legal argument for commitment (not clinical documentation)
 * - Audience: Judge, attorneys, court (not clinical team)
 * - Tone: Forensic/argumentative (not clinical/descriptive)
 * - Length: Concise 800-1000 words (not comprehensive 2000+ words)
 * - Output: Criteria-based legal brief (not SOAP format with SmartTools)
 */

import { TemplateSection } from '@epic-scribe/types';

export interface DesignatedExaminerTemplateSection extends TemplateSection {
  instructions: string;
  temperature: number;
}

/**
 * 10-section template structure for designated examiner reports
 * Each section includes specific instructions and temperature settings for the LLM
 */
export const DESIGNATED_EXAMINER_SECTIONS: DesignatedExaminerTemplateSection[] = [
  {
    order: 1,
    name: 'Patient Identification',
    content: `Name: ***
Age: ***
Gender: ***
Hospital: ***
Diagnosis(es): ***`,
    instructions: 'Extract basic demographics and current psychiatric diagnoses from the transcript. Be factual and concise. If information is not mentioned, write "Not stated in interview."',
    temperature: 0.2, // Low temperature for factual extraction
  },
  {
    order: 2,
    name: 'Initial Presentation',
    content: '***',
    instructions: `Describe how the patient initially presented to the hospital that led to this involuntary admission.

Focus on:
- Observable behavior at presentation
- Stated reason for admission (if known)
- Initial mental status

Keep to 2-3 sentences. Be descriptive but concise.`,
    temperature: 0.3,
  },
  {
    order: 3,
    name: 'Relevant Workup',
    content: 'Workup (Labs/imaging/etc.): ***',
    instructions: `List any relevant medical workup mentioned in the interview:
- Laboratory tests (toxicology, metabolic panel, etc.)
- Imaging studies (CT, MRI, etc.)
- Other diagnostic tests

If no workup was discussed, write: "None discussed in interview."

Format as a simple list or brief paragraph.`,
    temperature: 0.2,
  },
  {
    order: 4,
    name: 'Relevant History',
    content: '***',
    instructions: `Extract ONLY psychiatric and medical history directly relevant to commitment decision:

Include:
- Prior psychiatric hospitalizations (especially involuntary admissions)
- Suicide attempts or self-harm history (SAs/SH)
- History of violence toward others
- Legal issues related to mental illness
- Substance use history (if relevant to current presentation)
- Significant medical conditions affecting psychiatric presentation

Format as brief bullet points or short paragraph. Omit irrelevant biographical details.

Maximum 5-6 sentences or bullet points.`,
    temperature: 0.3,
  },
  {
    order: 5,
    name: 'Hospital Course',
    content: '***',
    instructions: `Summarize the patient's behavior and response to treatment during the current hospitalization:

Include:
- Behavioral incidents (aggression, elopement attempts, etc.)
- Medication compliance and response
- Engagement in milieu therapy or groups
- Changes in mental status or symptoms
- Safety concerns or precautions needed

Keep to 3-5 sentences. Focus on facts relevant to commitment criteria.`,
    temperature: 0.3,
  },
  {
    order: 6,
    name: 'Current Medications',
    content: 'Medications: ***',
    instructions: `List current psychiatric medications.

Include dosages if mentioned in the interview.

Format as simple list:
- Medication 1 (dose)
- Medication 2 (dose)
- Medication 3 (dose)

If no medications discussed, write: "None discussed in interview."`,
    temperature: 0.2,
  },
  {
    order: 7,
    name: 'Interview Assessment',
    content: '***',
    instructions: `Synthesize the designated examiner interview. Use this structure:

**Date of Interview:** [Extract from transcript or use today's date]

**Staff Report:** [Summarize what nursing staff or treatment team reported about the patient's behavior, symptoms, and functioning]

**Per Patient:** [Summarize what the patient stated in the interview, including:
- Current symptoms and complaints
- Insight into mental illness
- Suicidal or homicidal ideation
- Substance use
- Plans if released
- Willingness to engage in treatment]

This section should be 5-7 sentences total and provide the factual foundation for the criteria analysis that follows.

Be direct and forensic in tone. Cite specific patient quotes where relevant.`,
    temperature: 0.4,
  },
  {
    order: 8,
    name: 'Commitment Criteria Analysis',
    content: '***',
    instructions: `⚠️ CRITICAL SECTION - This is the legal argument core.

For EACH of Utah's 5 criteria, provide:
1. Clear YES or NO assessment
2. 2-3 sentences of supporting evidence from the interview

**Use this exact structure:**

**Criterion 1: The person has a mental illness**
[YES or NO] — [Evidence: Cite diagnosis, symptoms observed in interview, treatment team reports. Reference DSM-5 criteria if applicable.]

**Criterion 2: The person poses a substantial danger to themselves or others, OR is unable to provide for their basic needs and lacks the ability to make informed decisions about obtaining help in a less restrictive setting**
[YES or NO] — [Evidence: Cite specific statements about suicidal ideation, homicidal ideation, self-harm behaviors, inability to secure housing/food, grave disability. Use patient's own words where possible.]

**Criterion 3: The person lacks the ability to engage in a rational decision-making process with respect to accepting treatment**
[YES or NO] — [Evidence: Cite lack of insight, denial of illness, refusal of medications, poor judgment about consequences. Reference specific examples from interview.]

**Criterion 4: There is no less restrictive alternative to inpatient treatment that is appropriate and available**
[YES or NO] — [Evidence: Cite failed outpatient treatment attempts, severity requiring 24-hour care, inability to follow outpatient recommendations, lack of family support, homelessness.]

**Criterion 5: The Local Mental Health Authority can provide adequate and appropriate treatment**
[YES or NO] — [Evidence: State that Huntsman Mental Health Institute can provide psychiatric medications, therapy, case management, and crisis stabilization. This criterion is almost always YES.]

**TONE REQUIREMENTS:**
- Be direct and forensic, not clinical
- Cite specific statements or behaviors
- Use concrete evidence, not generalizations
- Write for a judge and attorneys, not clinicians
- Avoid psychiatric jargon where possible
- If a criterion is unclear from the interview, state: "Unable to fully assess from interview; recommend [additional information needed]."`,
    temperature: 0.5, // Moderate temperature for legal reasoning
  },
  {
    order: 9,
    name: 'Commitment Recommendation',
    content: '***',
    instructions: `Provide a clear, direct recommendation in 2-3 sentences.

**If ALL 5 criteria are met:**
"Based on the interview and assessment, [Patient Name] meets all five criteria for involuntary commitment under Utah law. [He/She/They] has [diagnosis], poses [specific danger/grave disability], lacks [specific insight deficit], has no less restrictive alternatives due to [specific reason], and Huntsman Mental Health Institute can provide adequate care. I recommend commitment for [30/60/90] days."

**If criteria are NOT met:**
"Based on the interview and assessment, [Patient Name] does not meet criteria for involuntary commitment under Utah law. Specifically, [he/she/they] does not meet Criterion [X] because [brief reason]. I recommend [alternative disposition: voluntary admission, outpatient treatment, crisis services referral, or dismissal]."

**Template for recommendation:**
- State whether criteria are met (YES/NO)
- Summarize key reasons in one sentence
- Provide specific commitment length recommendation (30/60/90 days)
- Be definitive and clear`,
    temperature: 0.4,
  },
  {
    order: 10,
    name: 'Additional Considerations',
    content: '***',
    instructions: `Provide brief bullet points (3-5 points max) covering:

- **Living Situation**: Current housing, homelessness risk, family support
- **Employment/Financial**: Ability to maintain employment, financial resources for treatment
- **Follow-up Plans**: Recommended outpatient treatment if/when discharged
- **Key Safety Concern**: Primary danger (self-harm, violence, grave disability)
- **Least Restrictive Alternative Analysis**: Why outpatient insufficient (e.g., "Multiple failed outpatient trials, active SI with plan and intent")
- **LMHA Capacity**: Confirm hospital can provide needed level of care

Keep each bullet point to one sentence.

Example:
- Living situation: Currently homeless; no family support available
- Employment: Unemployed due to psychiatric symptoms
- Follow-up: Recommend outpatient psychiatry and case management upon discharge
- Primary concern: Active suicidal ideation with access to means
- LRA analysis: Three prior failed outpatient medication trials in past year`,
    temperature: 0.3,
  },
];

/**
 * Export the template metadata
 * Note: This is a code-only template (not stored in database)
 */
export const designatedExaminerTemplate = {
  templateId: 'designated-examiner-v1',
  name: 'Designated Examiner Report',
  description: 'Involuntary commitment assessment for Utah mental health court',
  sections: DESIGNATED_EXAMINER_SECTIONS,
  version: 1,
  createdAt: new Date('2025-10-29'),
  updatedAt: new Date('2025-10-29'),
};
