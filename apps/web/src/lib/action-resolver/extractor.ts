/**
 * Action Extractor
 *
 * Uses Gemini to extract structured action intents from a visit transcript.
 * Pattern: same as profile-extractor.ts (GoogleGenerativeAI, 429 failover, JSON fence stripping).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export type ActionType =
  | 'lab'
  | 'rx_new'
  | 'rx_change'
  | 'rx_refill'
  | 'rx_discontinue'
  | 'followup'
  | 'prior_auth'
  | 'referral'
  | 'safety_plan'
  | 'patient_education'
  | 'other';

export type Urgency = 'stat' | 'urgent' | 'routine';

export interface ExtractedAction {
  type: ActionType;
  urgency: Urgency;
  summary: string;
  details: Record<string, any>;
  transcript_excerpt: string;
}

export interface ExtractionMetadata {
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

const SYSTEM_PROMPT = `You are a psychiatric medical assistant AI. You have just listened to a psychiatric visit.
Your job is to extract every actionable clinical intent from the transcript — things the
physician said they want to do, order, prescribe, schedule, refer, or communicate.

You are NOT generating a clinical note. You are generating a structured action list.

Return ONLY valid JSON. No markdown, no preamble, no explanation.

Output schema:
{
  "actions": [
    {
      "type": "lab" | "rx_new" | "rx_change" | "rx_refill" | "rx_discontinue" |
              "followup" | "prior_auth" | "referral" | "safety_plan" | "patient_education" | "other",
      "urgency": "stat" | "urgent" | "routine",
      "summary": "Brief one-line description of the action",
      "details": { ... type-specific fields ... },
      "transcript_excerpt": "The relevant quote from the transcript (max 200 chars)"
    }
  ]
}

Type-specific detail schemas:

For type "lab":
{
  "tests": ["lithium level", "CBC with differential", "CMP", ...],
  "fasting_required": true/false,
  "timing": "before next visit" | "stat" | "routine",
  "special_instructions": "optional string"
}

For type "rx_new":
{
  "medication": "Seroquel",
  "dose": "50mg",
  "frequency": "at bedtime",
  "quantity": 30,
  "refills": 0,
  "indication": "insomnia and mood stabilization",
  "special_instructions": "take at bedtime, avoid driving until tolerability established"
}

For type "rx_change":
{
  "medication": "Vraylar",
  "previous_dose": "1.5mg daily",
  "new_dose": "3mg daily",
  "change_type": "increase" | "decrease",
  "reason": "partial response, tolerating well"
}

For type "rx_discontinue":
{
  "medication": "Vraylar",
  "reason": "akathisia — patient unable to tolerate",
  "taper_instructions": "may stop abruptly given low dose and short duration"
}

For type "rx_refill":
{
  "medication": "sertraline",
  "dose": "100mg daily",
  "quantity": 90,
  "refills": 3
}

For type "followup":
{
  "interval_weeks": 2,
  "reason": "medication initiation monitoring",
  "specific_date": null,
  "hedis_relevant": true/false,
  "hedis_measure": "FUH-7" | "FUA" | null
}

For type "prior_auth":
{
  "medication_or_service": "Vraylar",
  "payer_mentioned": "Optum" | null,
  "clinical_justification_excerpts": ["patient has tried and failed sertraline and bupropion"]
}

For type "referral":
{
  "referral_to": "Dr. Smith" | "therapist" | "neuropsychological testing",
  "specialty": "psychotherapy" | "neuropsych" | "primary care" | "other",
  "reason": "CBT for anxiety management",
  "urgency": "routine"
}

For type "safety_plan":
{
  "update_type": "new" | "review" | "update",
  "risk_level_discussed": "low" | "moderate" | "high",
  "components_discussed": ["warning signs", "coping strategies", "emergency contacts"]
}

For type "patient_education":
{
  "topics": ["akathisia side effect", "importance of medication adherence", "sleep hygiene"],
  "specific_instructions": ["take Seroquel at bedtime", "do not drive until tolerability known"]
}

For type "other":
{
  "description": "free text description of the action"
}

Rules:
- Extract ONLY actions the physician explicitly stated or clearly implied intent to perform.
- Do NOT invent actions that weren't discussed.
- Do NOT include documentation tasks (note writing, chart updates) — those are handled separately.
- If the physician said "we should think about" or "consider" something, include it with a note in summary that it's tentative.
- One action per item. If the physician ordered 3 labs, that's 1 lab action with 3 tests, not 3 actions.
- But if the physician prescribed 2 different medications, that's 2 separate rx actions.
- Include patient_education if the physician explained side effects, gave behavioral instructions, or provided psychoeducation that the patient should receive in writing.
- Include followup even if the physician just said "see you in X weeks" in passing.
- If no actions were discussed, return {"actions": []}.`;

export async function extractActionsFromTranscript(input: {
  transcript: string;
  patientName?: string;
  visitType?: string;
  currentMeds?: string[];
  diagnoses?: string[];
  payerName?: string;
}): Promise<{ actions: ExtractedAction[]; metadata: ExtractionMetadata }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const backupKey = process.env.GEMINI_BACKUP_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const userPrompt = `Here is the transcript from a psychiatric visit. Extract all actionable clinical intents.

Patient: ${input.patientName || 'Unknown'}
Visit type: ${input.visitType || 'Unknown'}
Current medications (from patient profile): ${input.currentMeds?.length ? input.currentMeds.join(', ') : 'None listed'}
Current diagnoses: ${input.diagnoses?.length ? input.diagnoses.join(', ') : 'None listed'}
Payer: ${input.payerName || 'Unknown'}

TRANSCRIPT:
${input.transcript}`;

  const startTime = Date.now();

  for (const key of [apiKey, backupKey].filter(Boolean) as string[]) {
    try {
      const client = new GoogleGenerativeAI(key);
      const genModel = client.getGenerativeModel({
        model,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      });

      const genResult = await genModel.generateContent(userPrompt);
      const text = genResult.response.text();
      const tokensUsed = genResult.response.usageMetadata?.totalTokenCount;

      // Parse JSON — strip markdown fencing if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      const actions: ExtractedAction[] = parsed.actions || [];

      const latencyMs = Date.now() - startTime;
      console.log(`[ActionExtractor] Extracted ${actions.length} actions in ${latencyMs}ms (${tokensUsed || '?'} tokens)`);

      return {
        actions,
        metadata: { model, latencyMs, tokensUsed },
      };
    } catch (err: any) {
      if (err?.status === 429 && key === apiKey && backupKey) {
        console.warn('[ActionExtractor] Primary key quota exhausted, trying backup');
        continue;
      }
      throw err;
    }
  }

  throw new Error('Action extraction failed: all API keys exhausted');
}
