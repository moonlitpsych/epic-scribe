/**
 * DE Final Determination Prompt Builder (Step 4 - Second Gemini Call)
 *
 * Incorporates all evidence (original docs + initial analysis + clarifying questions + patient answers)
 * to generate a final commitment recommendation.
 *
 * Input: All previous data plus interview answers
 * Output: Final criteria assessment and court-ready recommendation
 */

export interface CriterionResult {
  status: 'meets' | 'does_not_meet' | 'unclear';
  explanation: string;
  sources: ('CDE' | 'Progress Notes' | 'Ad-hoc Notes' | 'Patient Interview')[];
}

export interface ClarifyingQuestion {
  id: string;
  criterion: 1 | 2 | 3 | 4 | 5;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InitialAnalysis {
  criteria: {
    criterion_1: CriterionResult;
    criterion_2: CriterionResult;
    criterion_3: CriterionResult;
    criterion_4: CriterionResult;
    criterion_5: CriterionResult;
  };
  preliminary_recommendation: string;
}

export interface DEFinalInput {
  patientName: string;
  hearingDate?: string;
  commitmentType?: '30-day' | '60-day' | '90-day';
  hospital?: string;
  cdeNote: string;
  progressNotes?: string;
  adhocNotes?: string;
  initialAnalysis: InitialAnalysis;
  clarifyingQuestions: ClarifyingQuestion[];
  interviewAnswers: { [questionId: string]: string };
}

export interface DEFinalOutput {
  criteria: {
    criterion_1: CriterionResult;
    criterion_2: CriterionResult;
    criterion_3: CriterionResult;
    criterion_4: CriterionResult;
    criterion_5: CriterionResult;
  };
  overall_recommendation: 'commit' | 'do_not_commit';
  commitment_length: '30-day' | '60-day' | '90-day' | null;
  reasoning: string;
  final_recommendation: string;
  generated_at: string;
}

export class DEFinalPromptBuilder {
  /**
   * Build the prompt for Step 4: Final determination
   */
  build(input: DEFinalInput): string {
    const {
      patientName,
      hearingDate,
      commitmentType = '30-day',
      hospital = 'Huntsman Mental Health Institute',
      cdeNote,
      progressNotes,
      adhocNotes,
      initialAnalysis,
      clarifyingQuestions,
      interviewAnswers,
    } = input;

    let prompt = `You are a designated examiner in the state of Utah finalizing your commitment recommendation. You have now completed all your due diligence:

1. Reviewed all patient documentation
2. Performed an initial analysis against Utah's 5 commitment criteria
3. Generated clarifying questions for ambiguous areas
4. Obtained the patient's direct answers to those questions

Your task is now to make a FINAL determination on whether to recommend commitment, incorporating ALL available evidence including the patient's own statements.

═══════════════════════════════════════════════════════════
UTAH'S 5 CRITERIA FOR INVOLUNTARY COMMITMENT
═══════════════════════════════════════════════════════════

ALL 5 criteria must be met for involuntary commitment:

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
ORIGINAL DOCUMENTATION
═══════════════════════════════════════════════════════════

**COMPREHENSIVE PSYCHIATRIC EVALUATION (CDE)**
${cdeNote}

`;

    if (progressNotes && progressNotes.trim()) {
      prompt += `**PROGRESS NOTES**
${progressNotes}

`;
    }

    if (adhocNotes && adhocNotes.trim()) {
      prompt += `**AD-HOC NOTES**
${adhocNotes}

`;
    }

    prompt += `═══════════════════════════════════════════════════════════
INITIAL ANALYSIS (Your Previous Assessment)
═══════════════════════════════════════════════════════════

`;

    // Add initial criteria assessment
    for (let i = 1; i <= 5; i++) {
      const key = `criterion_${i}` as keyof typeof initialAnalysis.criteria;
      const criterion = initialAnalysis.criteria[key];
      prompt += `**Criterion ${i}:** ${criterion.status.toUpperCase()}
${criterion.explanation}
Sources: ${criterion.sources.join(', ')}

`;
    }

    prompt += `**Preliminary Recommendation:**
${initialAnalysis.preliminary_recommendation}

═══════════════════════════════════════════════════════════
PATIENT INTERVIEW RESULTS
═══════════════════════════════════════════════════════════

The following questions were asked directly to the patient, and here are their verbatim responses:

`;

    // Add Q&A pairs
    for (const question of clarifyingQuestions) {
      const answer = interviewAnswers[question.id] || '[No response recorded]';
      prompt += `**Q${question.id.replace('q', '')}: (Criterion ${question.criterion}, ${question.priority} priority)**
${question.question}

**Patient's Response:**
${answer}

`;
    }

    prompt += `═══════════════════════════════════════════════════════════
YOUR TASK: FINAL DETERMINATION
═══════════════════════════════════════════════════════════

Based on ALL the evidence — the original documentation AND the patient's direct responses to your clarifying questions — you must now:

1. **Re-assess each criterion** incorporating the new evidence from the patient interview
2. **Make a final recommendation** (commit or do not commit)
3. **Write a court-ready recommendation** that can be read verbatim to the judge

This is your FINAL recommendation. There is no "unclear" status allowed — you must determine "meets" or "does_not_meet" for each criterion.

═══════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════

Respond with valid JSON in exactly this format:

{
  "criteria": {
    "criterion_1": {
      "status": "meets" | "does_not_meet",
      "explanation": "Final explanation incorporating all evidence, especially patient interview responses",
      "sources": ["CDE", "Patient Interview"] etc.
    },
    "criterion_2": { ... },
    "criterion_3": { ... },
    "criterion_4": { ... },
    "criterion_5": { ... }
  },
  "overall_recommendation": "commit" | "do_not_commit",
  "commitment_length": "${commitmentType}" | null,
  "reasoning": "2-3 sentences summarizing the key reasons for your recommendation",
  "final_recommendation": "A comprehensive 3-4 paragraph recommendation for the judge. This should be formal, forensic in tone, and ready to be read verbatim in court. Include: (1) Patient identification and context, (2) Summary of each criterion with supporting evidence including direct patient quotes where relevant, (3) Clear statement of your recommendation and justification, (4) Recommended commitment length if committing."
}

**IMPORTANT GUIDELINES:**

1. You MUST make a definitive determination - no "unclear" status allowed
2. The patient's direct statements are critical evidence - quote them where relevant
3. If the patient denied dangerous thoughts, but their documented behavior contradicts this, explain why you still find danger criterion met (or not)
4. The final_recommendation should be comprehensive and court-ready
5. If recommending commitment, commitment_length should be "${commitmentType}"
6. If recommending release, commitment_length should be null
7. Include "Patient Interview" in sources for criteria where interview answers were relevant

Respond ONLY with the JSON object. No additional text before or after.
`;

    return prompt;
  }

  /**
   * Parse the AI response into structured output
   */
  parseResponse(response: string): DEFinalOutput | null {
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

      const parsed = JSON.parse(jsonString) as DEFinalOutput;

      // Add generated_at timestamp if not present
      if (!parsed.generated_at) {
        parsed.generated_at = new Date().toISOString();
      }

      return parsed;
    } catch (error) {
      console.error('[DEFinalPromptBuilder] Failed to parse response:', error);
      return null;
    }
  }

  /**
   * Validate the parsed output has all required fields
   */
  validateOutput(output: DEFinalOutput): { valid: boolean; errors: string[] } {
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
          if (output.criteria[key].status === 'unclear') {
            errors.push(`${key} has 'unclear' status - final determination requires definitive status`);
          }
          if (!output.criteria[key].explanation) {
            errors.push(`Missing explanation for ${key}`);
          }
        }
      }
    }

    // Check overall recommendation
    if (!output.overall_recommendation) {
      errors.push('Missing overall_recommendation');
    } else if (!['commit', 'do_not_commit'].includes(output.overall_recommendation)) {
      errors.push('Invalid overall_recommendation - must be "commit" or "do_not_commit"');
    }

    // Check final recommendation text
    if (!output.final_recommendation) {
      errors.push('Missing final_recommendation');
    }

    // Check reasoning
    if (!output.reasoning) {
      errors.push('Missing reasoning');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert final analysis to legacy boolean format for backwards compatibility
   */
  toLegacyCriteria(output: DEFinalOutput): {
    meets_criterion_1: boolean;
    meets_criterion_2: boolean;
    meets_criterion_3: boolean;
    meets_criterion_4: boolean;
    meets_criterion_5: boolean;
  } {
    return {
      meets_criterion_1: output.criteria.criterion_1.status === 'meets',
      meets_criterion_2: output.criteria.criterion_2.status === 'meets',
      meets_criterion_3: output.criteria.criterion_3.status === 'meets',
      meets_criterion_4: output.criteria.criterion_4.status === 'meets',
      meets_criterion_5: output.criteria.criterion_5.status === 'meets',
    };
  }
}

// Singleton instance
let instance: DEFinalPromptBuilder | null = null;

export function getDEFinalPromptBuilder(): DEFinalPromptBuilder {
  if (!instance) {
    instance = new DEFinalPromptBuilder();
  }
  return instance;
}
