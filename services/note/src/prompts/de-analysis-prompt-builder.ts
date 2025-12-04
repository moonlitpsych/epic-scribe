/**
 * DE Analysis Prompt Builder (Step 2 - First Gemini Call)
 *
 * Analyzes patient documentation against Utah's 5 involuntary commitment criteria.
 * Generates clarifying questions for ambiguous or unmet criteria.
 * Creates a preliminary recommendation.
 *
 * Input: CDE, Progress Notes, Ad-hoc Notes, patient metadata
 * Output: Structured JSON with criteria assessment, questions, and preliminary rec
 */

export interface DEAnalysisInput {
  patientName: string;
  hearingDate?: string;
  commitmentType?: '30-day' | '60-day' | '90-day';
  hospital?: string;
  cdeNote: string;
  progressNotes?: string;
  adhocNotes?: string;
}

export interface CriterionResult {
  status: 'meets' | 'does_not_meet' | 'unclear';
  explanation: string;
  sources: ('CDE' | 'Progress Notes' | 'Ad-hoc Notes')[];
}

export interface ClarifyingQuestion {
  id: string;
  criterion: 1 | 2 | 3 | 4 | 5;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DEAnalysisOutput {
  criteria: {
    criterion_1: CriterionResult;
    criterion_2: CriterionResult;
    criterion_3: CriterionResult;
    criterion_4: CriterionResult;
    criterion_5: CriterionResult;
  };
  clarifying_questions: ClarifyingQuestion[];
  preliminary_recommendation: string;
  generated_at: string;
}

export class DEAnalysisPromptBuilder {
  /**
   * Build the prompt for Step 2: Initial AI analysis
   */
  build(input: DEAnalysisInput): string {
    const {
      patientName,
      hearingDate,
      commitmentType = '30-day',
      hospital = 'Huntsman Mental Health Institute',
      cdeNote,
      progressNotes,
      adhocNotes,
    } = input;

    let prompt = `You are a designated examiner in the state of Utah with decades of experience. Your job is to go through these patient records and check them against the 5 criteria for involuntary commitment in the state of Utah.

═══════════════════════════════════════════════════════════
UTAH'S 5 CRITERIA FOR INVOLUNTARY COMMITMENT
═══════════════════════════════════════════════════════════

ALL 5 criteria must be met for involuntary commitment under Utah law:

**Criterion 1: Mental Illness**
The person has a mental illness as defined in Utah Code 62A-15-602.

**Criterion 2: Substantial Dangerousness OR Grave Disability**
The person poses a substantial danger to themselves or others, OR is unable to provide for their basic needs (food, clothing, shelter) and lacks the ability to make informed decisions about obtaining help in a less restrictive setting.

**Criterion 3: Lacks Rational Decision-Making**
The person lacks the ability to engage in a rational decision-making process with respect to accepting mental health treatment.

**Criterion 4: No Less Restrictive Alternative**
There is no appropriate and available alternative to inpatient treatment that is less restrictive.

**Criterion 5: Adequate Care Available**
The Local Mental Health Authority (LMHA) can provide adequate and appropriate treatment.

═══════════════════════════════════════════════════════════
YOUR TASKS
═══════════════════════════════════════════════════════════

1. **Assess Each Criterion**: Review the documentation and determine whether each criterion is "meets", "does_not_meet", or "unclear". Provide a concise explanation with reference to the source documentation.

2. **Generate Clarifying Questions**: For any criterion that is ambiguously met or not clearly met — especially Criterion 2 (substantial dangerousness to self or others) — generate questions that a third-year psychiatry resident can ask the patient directly. These questions should help clarify whether the patient meets criteria for involuntary commitment (i.e., remove all doubt).

3. **Create Preliminary Recommendation**: Write a preliminary recommendation that can essentially be read to a judge verbatim, with the full argument of why you recommend the patient be committed or not committed, with reference to the documentation provided. Include a note that this recommendation is preliminary and depends on the answers to the clarifying questions that will be asked directly to the patient.

═══════════════════════════════════════════════════════════
PATIENT INFORMATION
═══════════════════════════════════════════════════════════

**Patient Name:** ${patientName}
**Hospital:** ${hospital}
**Commitment Type:** ${commitmentType}
`;

    if (hearingDate) {
      prompt += `**Hearing Date:** ${hearingDate}\n`;
    }

    prompt += `
═══════════════════════════════════════════════════════════
DOCUMENTATION
═══════════════════════════════════════════════════════════

**COMPREHENSIVE PSYCHIATRIC EVALUATION (CDE)**
This is the intake evaluation for inpatient psychiatry. It is the most comprehensive source and likely contains the key information for the commitment criteria.

${cdeNote}

`;

    if (progressNotes && progressNotes.trim()) {
      prompt += `**PROGRESS NOTES**
These are daily notes written by physicians about the patient's progress. They may contain crucial details that emerged later in the hospitalization.

${progressNotes}

`;
    }

    if (adhocNotes && adhocNotes.trim()) {
      prompt += `**AD-HOC NOTES**
These are informal notes based on conversations with staff, nursing, the attending physician, and/or collateral sources.

${adhocNotes}

`;
    }

    prompt += `═══════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════

You MUST respond with valid JSON in exactly this format:

{
  "criteria": {
    "criterion_1": {
      "status": "meets" | "does_not_meet" | "unclear",
      "explanation": "Concise explanation with reference to the source documentation. Example: CDE makes reference to the patient being diagnosed with schizophrenia, meeting DSM-5 criteria.",
      "sources": ["CDE"] | ["CDE", "Progress Notes"] | etc.
    },
    "criterion_2": {
      "status": "meets" | "does_not_meet" | "unclear",
      "explanation": "Example: CDE makes reference to the patient stating 'I will blow my head off,' and endorsed severe SI on admission.",
      "sources": ["CDE", "Progress Notes"]
    },
    "criterion_3": { ... },
    "criterion_4": { ... },
    "criterion_5": { ... }
  },
  "clarifying_questions": [
    {
      "id": "q1",
      "criterion": 2,
      "question": "The specific question to ask the patient",
      "context": "Why this question is important and what answer would clarify the criterion",
      "priority": "high" | "medium" | "low"
    }
  ],
  "preliminary_recommendation": "A 2-3 paragraph recommendation that can be read to a judge. Include: (1) Summary of findings, (2) Which criteria are met/not met with supporting evidence, (3) Your preliminary recommendation for commitment or release, (4) A note that this recommendation is preliminary and depends on the patient interview."
}

**IMPORTANT GUIDELINES:**

1. For each criterion, cite the specific source document (CDE, Progress Notes, or Ad-hoc Notes)
2. Use direct quotes from the documentation where relevant
3. Generate 3-8 clarifying questions, prioritizing Criterion 2 (dangerousness)
4. Mark questions as "high" priority if they address the most ambiguous or critical criteria
5. The preliminary recommendation should be formal and forensic in tone
6. If a criterion is clearly met, status should be "meets"
7. If a criterion is clearly not met, status should be "does_not_meet"
8. If there is ambiguity or missing information, status should be "unclear"

Respond ONLY with the JSON object. No additional text before or after.
`;

    return prompt;
  }

  /**
   * Parse the AI response into structured output
   */
  parseResponse(response: string): DEAnalysisOutput | null {
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonString = response.trim();

      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3);
      }

      jsonString = jsonString.trim();

      const parsed = JSON.parse(jsonString) as DEAnalysisOutput;

      // Add generated_at timestamp if not present
      if (!parsed.generated_at) {
        parsed.generated_at = new Date().toISOString();
      }

      return parsed;
    } catch (error) {
      console.error('[DEAnalysisPromptBuilder] Failed to parse response:', error);
      return null;
    }
  }

  /**
   * Validate the parsed output has all required fields
   */
  validateOutput(output: DEAnalysisOutput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check criteria
    if (!output.criteria) {
      errors.push('Missing criteria object');
    } else {
      for (let i = 1; i <= 5; i++) {
        const key = `criterion_${i}` as keyof typeof output.criteria;
        if (!output.criteria[key]) {
          errors.push(`Missing ${key}`);
        } else {
          if (!output.criteria[key].status) {
            errors.push(`Missing status for ${key}`);
          }
          if (!output.criteria[key].explanation) {
            errors.push(`Missing explanation for ${key}`);
          }
        }
      }
    }

    // Check clarifying questions
    if (!output.clarifying_questions || !Array.isArray(output.clarifying_questions)) {
      errors.push('Missing or invalid clarifying_questions array');
    }

    // Check preliminary recommendation
    if (!output.preliminary_recommendation) {
      errors.push('Missing preliminary_recommendation');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
let instance: DEAnalysisPromptBuilder | null = null;

export function getDEAnalysisPromptBuilder(): DEAnalysisPromptBuilder {
  if (!instance) {
    instance = new DEAnalysisPromptBuilder();
  }
  return instance;
}
