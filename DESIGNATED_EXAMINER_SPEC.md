# Designated Examiner Feature - Implementation Specification

**Created:** 2025-10-29  
**For:** Claude Code execution  
**Owner:** Dr. Rufus Sweeney  
**Context:** This feature adapts the existing epic-scribe workflow for involuntary psychiatric commitment assessments in Utah mental health court.

---

## 📋 Executive Summary

Create a specialized workflow that transforms Google Meet transcripts of designated examiner interviews into structured legal arguments for involuntary commitment hearings. The output should assess whether patients meet Utah's 5 criteria for involuntary psychiatric commitment and provide a court-ready forensic assessment.

### Key Differences from Clinical Notes

| Aspect | Clinical Notes | Designated Examiner |
|--------|---------------|-------------------|
| **Purpose** | Clinical documentation | Legal argument for commitment |
| **Output Structure** | SOAP format with SmartTools | Criteria-based legal brief |
| **Template System** | 14 setting/visit type combos | Single "Designated Examiner" template |
| **Audience** | Clinical team | Judge, attorneys, court |
| **Tone** | Clinical/descriptive | Forensic/argumentative |
| **Length** | Comprehensive (~2000 words) | Concise (~800-1000 words) |
| **Patient Records** | Persistent patient management | One-off assessments |
| **Encounter Linking** | Linked to patient timeline | Standalone reports |

---

## 🎯 Utah's 5 Criteria for Involuntary Commitment

All 5 must be met for commitment:

1. **Mental Illness**: The person has a mental illness
2. **Danger/Inability**: The person poses substantial danger to self/others OR cannot provide for basic needs
3. **Rational Decision-Making**: The person lacks ability to make rational decisions about treatment
4. **No Less Restrictive Alternative**: No less restrictive alternative to inpatient treatment is available
5. **Adequate Care**: Local Mental Health Authority (LMHA) can provide adequate and appropriate treatment

---

## 🏗️ Architecture Overview

```
User Interview → Google Meet Transcript → Designated Examiner Workflow
                                                    ↓
                                    Specialized DE Prompt Builder
                                                    ↓
                                              Gemini API
                                                    ↓
                                    10-Section Legal Assessment
                                                    ↓
                              5 Criteria YES/NO Analysis
                                                    ↓
                         Editable Report → Copy to Clipboard
                                                    ↓
                                    Court Testimony/Documents
```

---

## 🗄️ Database Schema

### New Migration: `009_designated_examiner.sql`

**Location:** `supabase/migrations/009_designated_examiner.sql`

```sql
-- Create designated_examiner_reports table
CREATE TABLE IF NOT EXISTS designated_examiner_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  
  -- Report metadata
  hearing_date DATE,
  commitment_type VARCHAR(50), -- '30-day', '60-day', '90-day'
  hospital VARCHAR(255) DEFAULT 'Huntsman Mental Health Institute',
  
  -- Interview content
  transcript TEXT NOT NULL,
  cheat_sheet_notes TEXT, -- User's handwritten notes from interview
  
  -- Generated assessment
  generated_argument TEXT NOT NULL,
  final_argument TEXT, -- User-edited version
  
  -- Commitment criteria assessment (parsed from generated text)
  meets_criterion_1 BOOLEAN, -- Mental illness
  meets_criterion_2 BOOLEAN, -- Danger/inability to care for self
  meets_criterion_3 BOOLEAN, -- Lacks rational decision-making
  meets_criterion_4 BOOLEAN, -- No less restrictive alternative
  meets_criterion_5 BOOLEAN, -- Adequate care available
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id)
);

-- Create indexes for quick lookup
CREATE INDEX idx_de_reports_patient ON designated_examiner_reports(patient_id);
CREATE INDEX idx_de_reports_hearing_date ON designated_examiner_reports(hearing_date);
CREATE INDEX idx_de_reports_finalized_by ON designated_examiner_reports(finalized_by);

-- Enable RLS
ALTER TABLE designated_examiner_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own DE reports"
  ON designated_examiner_reports FOR SELECT
  USING (finalized_by = auth.uid());

CREATE POLICY "Users can insert own DE reports"
  ON designated_examiner_reports FOR INSERT
  WITH CHECK (finalized_by = auth.uid());

CREATE POLICY "Users can update own DE reports"
  ON designated_examiner_reports FOR UPDATE
  USING (finalized_by = auth.uid());

CREATE POLICY "Users can delete own DE reports"
  ON designated_examiner_reports FOR DELETE
  USING (finalized_by = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_de_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_de_report_updated_at_trigger
  BEFORE UPDATE ON designated_examiner_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_de_report_updated_at();
```

---

## 📝 Template Configuration

### File: `services/note/src/templates/designated-examiner-template.ts`

```typescript
import { Template, Section, Setting } from '@epic-scribe/types';

/**
 * Designated Examiner Template
 * 
 * Specialized template for involuntary commitment assessments.
 * Generates a structured legal argument based on Utah's 5 criteria.
 */
export const designatedExaminerTemplate: Template = {
  templateId: 'designated-examiner-v1',
  name: 'Designated Examiner Report',
  setting: 'HMHI Court' as Setting, // May need to add this to Setting type
  visitType: 'Involuntary Commitment Assessment',
  sections: [
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
- **Follow-up Plans**: Recommended outpatient treatment if/when committed
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
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};
```

---

## 🔧 Prompt Builder

### File: `services/note/src/prompts/designated-examiner-prompt-builder.ts`

```typescript
/**
 * Designated Examiner Prompt Builder
 * 
 * Specialized prompt compilation for involuntary commitment assessments.
 * Focuses on legal criteria rather than clinical documentation.
 */

import { designatedExaminerTemplate } from '../templates/designated-examiner-template';

export interface DEPromptParams {
  transcript: string;
  patientName?: string;
  hearingDate?: string;
  commitmentType?: '30-day' | '60-day' | '90-day';
  hospital?: string;
  cheatSheetNotes?: string; // User's handwritten notes from interview
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

    prompt += `═══════════════════════════════════════════════════════════
TEMPLATE SECTIONS TO GENERATE
═══════════════════════════════════════════════════════════

`;

    // Add each template section with its specific instructions
    designatedExaminerTemplate.sections.forEach((section) => {
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
  parseCriteriaFromReport(reportContent: string): {
    meets_criterion_1: boolean;
    meets_criterion_2: boolean;
    meets_criterion_3: boolean;
    meets_criterion_4: boolean;
    meets_criterion_5: boolean;
  } {
    const criteria = {
      meets_criterion_1: false,
      meets_criterion_2: false,
      meets_criterion_3: false,
      meets_criterion_4: false,
      meets_criterion_5: false,
    };

    // Look for "Criterion N:" followed by YES or NO
    for (let i = 1; i <= 5; i++) {
      const criterionPattern = new RegExp(
        `Criterion ${i}:.*?\\n\\s*(YES|NO)`,
        'i'
      );
      const match = reportContent.match(criterionPattern);
      
      if (match && match[1].toUpperCase() === 'YES') {
        criteria[`meets_criterion_${i}` as keyof typeof criteria] = true;
      }
    }

    return criteria;
  }
}

// Export singleton instance
let promptBuilderInstance: DesignatedExaminerPromptBuilder | null = null;

export function getDEPromptBuilder(): DesignatedExaminerPromptBuilder {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new DesignatedExaminerPromptBuilder();
  }
  return promptBuilderInstance;
}
```

---

## 🌐 API Routes

### File: `apps/web/app/api/designated-examiner/generate/route.ts`

```typescript
/**
 * POST /api/designated-examiner/generate
 * 
 * Generates a designated examiner report from an interview transcript.
 * Returns the generated report and parsed criteria assessments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getDEPromptBuilder } from '@epic-scribe/note-service';
import { getGeminiClient } from '@epic-scribe/note-service';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      patientId,
      encounterId,
      transcript,
      hearingDate,
      commitmentType = '30-day',
      hospital = 'Huntsman Mental Health Institute',
      cheatSheetNotes,
      patientName,
    } = body;

    // Validate required fields
    if (!transcript?.trim()) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log('[DE Generate] Starting generation...');
    console.log(`[DE Generate] Transcript length: ${transcript.length} chars`);
    console.log(`[DE Generate] Commitment type: ${commitmentType}`);

    // Build specialized prompt
    const promptBuilder = getDEPromptBuilder();
    const prompt = promptBuilder.build({
      transcript,
      patientName,
      hearingDate,
      commitmentType,
      hospital,
      cheatSheetNotes,
    });

    console.log(`[DE Generate] Compiled prompt: ${prompt.length} chars`);

    // Generate with Gemini
    const geminiClient = getGeminiClient();
    const result = await geminiClient.generateNote(
      prompt,
      `de-${Date.now()}`,
      'designated-examiner-v1'
    );

    console.log(`[DE Generate] Generated report in ${result.latencyMs}ms`);
    console.log(`[DE Generate] Report length: ${result.content.length} chars`);

    // Parse criteria assessments from generated report
    const criteriaAssessment = promptBuilder.parseCriteriaFromReport(
      result.content
    );

    console.log('[DE Generate] Parsed criteria:', criteriaAssessment);

    // Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: report, error: dbError } = await supabase
      .from('designated_examiner_reports')
      .insert({
        patient_id: patientId || null,
        encounter_id: encounterId || null,
        transcript,
        cheat_sheet_notes: cheatSheetNotes || null,
        hearing_date: hearingDate || null,
        commitment_type: commitmentType,
        hospital,
        generated_argument: result.content,
        final_argument: result.content, // Initialize with generated version
        ...criteriaAssessment,
        finalized_by: session.user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[DE Generate] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`[DE Generate] Saved report: ${report.id}`);

    // Return response
    return NextResponse.json({
      report: result.content,
      reportId: report.id,
      criteriaAssessment,
      metadata: {
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        wordCount: result.content.split(/\s+/).filter(Boolean).length,
        promptLength: prompt.length,
      },
    });
  } catch (error) {
    console.error('[DE Generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### File: `apps/web/app/api/designated-examiner/[id]/route.ts`

```typescript
/**
 * GET /api/designated-examiner/[id]
 * PUT /api/designated-examiner/[id]
 * DELETE /api/designated-examiner/[id]
 * 
 * CRUD operations for individual designated examiner reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch a specific report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: report, error } = await supabase
      .from('designated_examiner_reports')
      .select('*')
      .eq('id', params.id)
      .eq('finalized_by', session.user.id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

// PUT - Update a report (primarily for saving edits)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { final_argument } = body;

    if (!final_argument?.trim()) {
      return NextResponse.json(
        { error: 'Final argument is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: report, error } = await supabase
      .from('designated_examiner_reports')
      .update({
        final_argument,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('finalized_by', session.user.id)
      .select()
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('designated_examiner_reports')
      .delete()
      .eq('id', params.id)
      .eq('finalized_by', session.user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}
```

---

## 🖥️ Frontend UI

### File: `apps/web/app/designated-examiner/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Scale, FileText, Copy, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';

interface Report {
  id: string;
  content: string;
  criteriaAssessment: {
    meets_criterion_1: boolean;
    meets_criterion_2: boolean;
    meets_criterion_3: boolean;
    meets_criterion_4: boolean;
    meets_criterion_5: boolean;
  };
  metadata?: {
    modelUsed: string;
    latencyMs: number;
    wordCount: number;
  };
}

const CRITERION_LABELS = [
  'Mental Illness',
  'Danger/Grave Disability',
  'Lacks Rational Decision-Making',
  'No Less Restrictive Alternative',
  'Adequate Care Available',
];

export default function DesignatedExaminerPage() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'input' | 'results'>('input');

  // Input state
  const [patientName, setPatientName] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [commitmentType, setCommitmentType] = useState<'30-day' | '60-day' | '90-day'>('30-day');
  const [transcript, setTranscript] = useState('');
  const [cheatSheetNotes, setCheatSheetNotes] = useState('');

  // Results state
  const [report, setReport] = useState<Report | null>(null);
  const [editedReport, setEditedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const canGenerate = transcript.trim().length > 0 && patientName.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/designated-examiner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          patientName,
          hearingDate: hearingDate || undefined,
          commitmentType,
          cheatSheetNotes: cheatSheetNotes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed');
      }

      const data = await response.json();
      setReport({
        id: data.reportId,
        content: data.report,
        criteriaAssessment: data.criteriaAssessment,
        metadata: data.metadata,
      });
      setEditedReport(data.report);
      setStep('results');
    } catch (error) {
      console.error('Error generating report:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setReport(null);
    setEditedReport('');
    // Optionally clear inputs
    // setTranscript('');
    // setPatientName('');
    // setHearingDate('');
    // setCheatSheetNotes('');
  };

  const handleReset = () => {
    if (report) {
      setEditedReport(report.content);
    }
  };

  const allCriteriaMet = report
    ? Object.values(report.criteriaAssessment).every((v) => v === true)
    : false;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-[#5A6B7D]">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5A6B7D] mb-4">Please sign in to use this feature</p>
          <a
            href="/api/auth/signin"
            className="px-6 py-3 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="h-8 w-8 text-[#E89C8A]" />
            <h1 className="text-3xl font-serif text-[#0A1F3D]">
              Designated Examiner Workflow
            </h1>
          </div>
          <p className="text-[#5A6B7D]">
            Involuntary Commitment Assessment — Utah Mental Health Court
          </p>
        </div>

        {/* Input Step */}
        {step === 'input' && (
          <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
            <h2 className="text-2xl font-serif text-[#0A1F3D] mb-6">
              Interview Information
            </h2>

            {/* Patient Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Last, First"
                  className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Hearing Date
                </label>
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                  Commitment Length <span className="text-red-500">*</span>
                </label>
                <select
                  value={commitmentType}
                  onChange={(e) => setCommitmentType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent"
                >
                  <option value="30-day">30 Days (Salt Lake County)</option>
                  <option value="60-day">60 Days (Outside SL County)</option>
                  <option value="90-day">90 Days (Extended)</option>
                </select>
              </div>
            </div>

            {/* Transcript Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                Interview Transcript <span className="text-red-500">*</span>
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste Google Meet transcript of the designated examiner interview here..."
                rows={12}
                className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-[#5A6B7D]">{wordCount} words</p>
                {transcript.trim().length === 0 && (
                  <p className="text-sm text-red-500">Transcript is required</p>
                )}
              </div>
            </div>

            {/* Cheat Sheet Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0A1F3D] mb-2">
                Your Interview Notes (Optional)
              </label>
              <p className="text-xs text-[#5A6B7D] mb-2">
                Paste notes from your cheat sheet or any observations not captured in the transcript
              </p>
              <textarea
                value={cheatSheetNotes}
                onChange={(e) => setCheatSheetNotes(e.target.value)}
                placeholder="Example: Patient exhibited flat affect throughout interview. Made poor eye contact. Clothing disheveled..."
                rows={6}
                className="w-full px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#C5A882] text-white rounded-lg hover:bg-[#B39770] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C5A882]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Generate Commitment Assessment
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && report && (
          <div className="space-y-6">
            {/* Criteria Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
              <h3 className="text-lg font-semibold text-[#0A1F3D] mb-4">
                Utah Commitment Criteria Assessment
              </h3>

              {/* Criteria Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                {Object.entries(report.criteriaAssessment).map(([key, met], idx) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      met
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="text-xs text-gray-600 mb-1 font-medium">
                      Criterion {idx + 1}
                    </div>
                    <div className="text-xs text-gray-500 mb-2 h-8">
                      {CRITERION_LABELS[idx]}
                    </div>
                    <div
                      className={`text-sm font-bold flex items-center gap-1 ${
                        met ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {met ? (
                        <>
                          <CheckCircle2 size={14} />
                          MET
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} />
                          NOT MET
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Assessment */}
              <div
                className={`p-4 rounded-lg border-2 ${
                  allCriteriaMet
                    ? 'bg-green-50 border-green-500'
                    : 'bg-amber-50 border-amber-500'
                }`}
              >
                <p className={`text-sm font-semibold ${
                  allCriteriaMet ? 'text-green-900' : 'text-amber-900'
                }`}>
                  <strong>Overall Assessment:</strong>{' '}
                  {allCriteriaMet
                    ? 'Patient meets ALL 5 criteria for involuntary commitment under Utah law'
                    : 'Patient does NOT meet all 5 criteria — commitment may not be appropriate'}
                </p>
              </div>

              {/* Metadata */}
              {report.metadata && (
                <div className="mt-4 pt-4 border-t border-[#C5A882]/20">
                  <div className="flex items-center justify-between text-xs text-[#5A6B7D]">
                    <span>Generated in {report.metadata.latencyMs}ms</span>
                    <span>{report.metadata.wordCount} words</span>
                    <span>Model: {report.metadata.modelUsed}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Report Card */}
            <div className="bg-white rounded-lg shadow-sm border border-[#C5A882]/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0A1F3D]">
                    Generated Assessment (Editable)
                  </h3>
                  <p className="text-sm text-[#5A6B7D] mt-1">
                    Review and edit before using in court testimony
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors text-sm"
                  >
                    <RotateCcw size={16} className="inline mr-1" />
                    Reset
                  </button>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-[#E89C8A] text-white rounded-lg hover:bg-[#D88A7A] transition-colors"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle2 size={18} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                value={editedReport}
                onChange={(e) => setEditedReport(e.target.value)}
                className="w-full h-[700px] px-4 py-3 border border-[#C5A882]/30 rounded-lg focus:ring-2 focus:ring-[#E89C8A] focus:border-transparent font-mono text-sm resize-none"
              />

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 border border-[#C5A882] text-[#0A1F3D] rounded-lg hover:bg-[#F5F1ED] transition-colors"
                >
                  ← Start New Assessment
                </button>

                <p className="text-xs text-[#5A6B7D]">
                  {editedReport.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🔗 Navigation Integration

### Update: `apps/web/src/components/Header.tsx` (or navigation component)

Add a link to the designated examiner workflow:

```tsx
<a
  href="/designated-examiner"
  className="flex items-center gap-2 px-4 py-2 text-[#0A1F3D] hover:bg-[#F5F1ED] rounded-lg transition-colors"
>
  <Scale size={18} />
  <span>Designated Examiner</span>
</a>
```

---

## ✅ Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `supabase/migrations/009_designated_examiner.sql`
- [ ] Run migration in local Supabase instance
- [ ] Verify table creation and RLS policies
- [ ] Test basic CRUD operations in Supabase dashboard

### Phase 2: Backend Services
- [ ] Create `services/note/src/templates/designated-examiner-template.ts`
- [ ] Create `services/note/src/prompts/designated-examiner-prompt-builder.ts`
- [ ] Export new services from `services/note/src/index.ts`
- [ ] Verify TypeScript compilation

### Phase 3: API Routes
- [ ] Create `/apps/web/app/api/designated-examiner/generate/route.ts`
- [ ] Create `/apps/web/app/api/designated-examiner/[id]/route.ts`
- [ ] Test API endpoints with Postman or curl
- [ ] Verify error handling and validation

### Phase 4: Frontend UI
- [ ] Create `/apps/web/app/designated-examiner/page.tsx`
- [ ] Test form inputs and validation
- [ ] Test generation flow end-to-end
- [ ] Verify criteria parsing and display
- [ ] Test copy-to-clipboard functionality

### Phase 5: Integration & Polish
- [ ] Add navigation link to main menu
- [ ] Test with sample transcript (see test data below)
- [ ] Verify mobile responsiveness
- [ ] Add loading states and error messages
- [ ] Test edge cases (empty fields, very long transcripts, etc.)

### Phase 6: Documentation & Testing
- [ ] Add usage instructions to main README
- [ ] Create sample test transcripts
- [ ] Document criteria parsing logic
- [ ] Add unit tests for prompt builder
- [ ] Test with real clinical scenario

---

## 🧪 Test Data

### Sample Transcript for Testing

```
Dr. Sweeney: Good morning. I'm Dr. Sweeney, one of the psychiatry residents here. I'm here to do a designated examiner interview with you for your court hearing. Do you understand why you're here in the hospital?

Patient: Yeah, they brought me here against my will. I don't need to be here. I'm fine.

Dr. Sweeney: Can you tell me what happened that led to you coming to the hospital?

Patient: My mom called the cops on me. She said I was acting weird, but I was just trying to protect her. There are people following us, watching the house. I was boarding up the windows to keep them out.

Dr. Sweeney: Who are these people following you?

Patient: I don't know exactly, but they're with the government. They've been tracking me for months. They put cameras in my apartment. Sometimes I hear them talking through the vents.

Dr. Sweeney: Have you been taking any medications?

Patient: They gave me some pills here, but I'm not taking them. They're trying to control my mind. That's what they do.

Dr. Sweeney: Have you had thoughts of hurting yourself?

Patient: No, why would I? I need to stay alive to protect my mom.

Dr. Sweeney: Have you had thoughts of hurting anyone else?

Patient: Only if they try to hurt me or my mom first. I have the right to defend us.

Dr. Sweeney: Do you think you need to be in the hospital?

Patient: No. I need to get home. My mom needs me. She's not safe without me there.

Dr. Sweeney: What would you do if you left the hospital today?

Patient: Go home and make sure the house is secure. Board up any windows I missed. Maybe get some weapons just in case.

Dr. Sweeney: Have you ever been hospitalized before for psychiatric issues?

Patient: Yeah, twice. Same thing both times. They said I was paranoid. But I was right - people were after me.

Dr. Sweeney: Do you think you have a mental illness?

Patient: No. I'm more aware than most people. I see things others don't.

[Staff report: Patient admitted 3 days ago after police called by family. Patient had barricaded mother inside home. Refusing medications. Preoccupied with persecutory delusions. No prior outpatient follow-up. Diagnosis: Schizophrenia, paranoid type.]
```

Expected output:
- All 5 criteria: YES
- Recommendation: 30-day commitment (assuming Salt Lake County resident)

---

## 🎯 Success Metrics

- [ ] Generation time <30 seconds for typical interview
- [ ] Criteria parsing accuracy 95%+
- [ ] Report requires <5 minutes of editing
- [ ] Zero formatting issues when copying
- [ ] Clear, legally defensible arguments
- [ ] User (Dr. Sweeney) rates as "ready for court use"

---

## 📚 Additional Context

### Key Design Decisions

1. **No Patient Linking Required**: Unlike clinical notes, these are one-off assessments for court. While we support optional patient_id linking, it's not required.

2. **Single Template**: No setting/visit type complexity. There's only one template: "Designated Examiner Report"

3. **Criteria Parsing**: We parse YES/NO from generated text rather than asking the LLM for structured JSON, because the legal argument context is important.

4. **Cheat Sheet Integration**: Users can paste handwritten notes to supplement transcript, addressing the "observational details not captured in audio" problem.

5. **Edit-First Flow**: Unlike clinical notes where copy-paste is immediate, we expect users to review/edit before using in court.

### Differences from Clinical Workflow

| Feature | Clinical Notes | Designated Examiner |
|---------|---------------|-------------------|
| Patient selector | Required | Optional |
| Previous note | Sometimes required | Never required |
| Template complexity | 14 configs | 1 config |
| Output format | SOAP with SmartTools | Legal brief with criteria |
| Editing expectation | Minor tweaks | Careful review |
| Use case | EHR documentation | Court testimony |

---

## 🚨 Important Notes for Claude Code

1. **TypeScript Types**: You may need to add `'HMHI Court'` to the `Setting` type in `packages/types/src/index.ts`

2. **Service Exports**: Make sure to export new classes from `services/note/src/index.ts`

3. **Error Handling**: The prompt builder should gracefully handle missing information in transcripts

4. **Testing**: Use the sample transcript above for initial testing before real clinical data

5. **Database Migration**: Run migration in LOCAL Supabase first, then production

6. **UI Responsiveness**: Test on mobile - court may be accessed on tablets

---

## 📞 Questions?

If anything is unclear during implementation:
- Check existing `/workflow` page for UI patterns
- Reference `/api/generate` route for API structure  
- Look at `NoteResultsStep` component for results display patterns
- Review `psychiatric-prompt-builder.ts` for prompt compilation examples

---

**Ready for Implementation!** 🚀

This specification should provide everything needed to build the Designated Examiner feature from scratch. The architecture mirrors the existing clinical workflow but is specialized for the legal/forensic use case.