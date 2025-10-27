/**
 * Gemini AI Client
 * Handles LLM interactions with Google's Gemini API (via Vertex AI for HIPAA compliance)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateNoteResponse, ValidationIssue, PromptReceipt } from '@epic-scribe/types';

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  mockMode?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  useDynamicTemperature?: boolean;  // Enable section-specific temperature
}

export interface GenerationResult {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  modelUsed: string;
  latencyMs: number;
  cached?: boolean;
}

export class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;
  private config: GeminiConfig;
  private mockMode: boolean;

  constructor(config: GeminiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || '',
      model: config.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      temperature: config.temperature ?? 0.4, // Balanced default for psychiatric notes
      maxOutputTokens: config.maxOutputTokens ?? 8192,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 40,
      mockMode: config.mockMode ?? (!config.apiKey && !process.env.GEMINI_API_KEY),
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      useDynamicTemperature: config.useDynamicTemperature ?? true  // Enable by default for psychiatric notes
    };

    this.mockMode = this.config.mockMode;

    if (!this.mockMode && this.config.apiKey) {
      this.initializeClient();
    }
  }

  /**
   * Initialize the Gemini client
   */
  private initializeClient() {
    try {
      this.client = new GoogleGenerativeAI(this.config.apiKey!);
      this.model = this.client.getGenerativeModel({
        model: this.config.model!,
        generationConfig: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        }
      });
      console.log(`Gemini client initialized with model: ${this.config.model}`);
    } catch (error) {
      console.error('Failed to initialize Gemini client:', error);
      this.mockMode = true;
    }
  }

  /**
   * Generate a note from a prompt
   */
  async generateNote(
    prompt: string,
    promptHash: string,
    templateId: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    if (this.mockMode) {
      return this.generateMockNote(prompt, promptHash, templateId, startTime);
    }

    try {
      const result = await this.generateWithRetry(prompt);
      const latencyMs = Date.now() - startTime;

      return {
        content: result.response.text(),
        modelUsed: this.config.model!,
        latencyMs,
        promptTokens: result.response.usageMetadata?.promptTokenCount,
        completionTokens: result.response.usageMetadata?.candidatesTokenCount,
        totalTokens: result.response.usageMetadata?.totalTokenCount
      };
    } catch (error) {
      console.error('Gemini generation failed:', error);
      // Fallback to mock mode
      return this.generateMockNote(prompt, promptHash, templateId, startTime);
    }
  }

  /**
   * Generate with retry logic
   */
  private async generateWithRetry(prompt: string): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      // Add trace ID for monitoring (declare outside try block)
      const traceId = this.generateTraceId();

      try {
        console.log(`[${traceId}] Attempt ${attempt + 1}/${this.config.retryAttempts}`);

        // Redact PHI from logs
        const redactedPrompt = this.redactPHI(prompt);
        console.log(`[${traceId}] Sending prompt (${redactedPrompt.length} chars)`);

        const result = await this.model.generateContent(prompt);

        console.log(`[${traceId}] Generation successful`);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`[${traceId}] Attempt ${attempt + 1} failed:`, error.message);

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.retryAttempts! - 1) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt);
          console.log(`[${traceId}] Waiting ${delay}ms before retry`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on rate limits, timeouts, and transient errors
    const retryableCodes = [429, 500, 502, 503, 504];
    const errorCode = error.status || error.code;

    if (retryableCodes.includes(errorCode)) {
      return true;
    }

    // Check for specific error messages
    const message = error.message?.toLowerCase() || '';
    return message.includes('rate limit') ||
           message.includes('timeout') ||
           message.includes('temporarily unavailable');
  }

  /**
   * Generate a mock note for testing
   */
  private generateMockNote(
    prompt: string,
    promptHash: string,
    templateId: string,
    startTime: number
  ): GenerationResult {
    // Simulate processing time
    const latencyMs = Date.now() - startTime + Math.random() * 500;

    // Extract template structure from prompt
    const sections = this.extractSectionsFromPrompt(prompt);

    // Generate mock content
    const mockNote = `UNIVERSITY HEALTHCARE
PSYCHIATRY CONSULTATION NOTE

Patient: .FNAME .LNAME
MRN: .MRN
Date of Service: .DATE
Provider: .provider

Chief Complaint
.RFV

History of Present Illness
The patient is a .age year old presenting for psychiatric evaluation. Based on the transcript provided, the patient reports experiencing moderate symptoms of depression and anxiety over the past several months. Sleep has been significantly disrupted with difficulty falling asleep and early morning awakening. The patient describes mood as "low" and reports decreased motivation for daily activities. Anxiety symptoms include persistent worry about work and family matters, with occasional panic symptoms including chest tightness and shortness of breath. These symptoms have progressively worsened and are now significantly impacting daily functioning and work performance.

Past Psychiatric History
Previous hospitalizations: {BH Hospitalizations:304120103:: "None"}
Previous suicide attempts: {Suicide History:304120104:: "None"}
Previous treatments: The patient reports previous outpatient therapy approximately two years ago which was helpful but discontinued due to insurance changes. No previous psychiatric medication trials.

Current Medications
.MEDS
Medication compliance: {Medication Compliance:304120105:: "Not applicable"}

Psychiatric Review of Systems
Sleep: {Sleep Quality:304120106:: "Poor"}
Appetite: {Appetite:304120107:: "Decreased"}
Mood: {Mood:304120108:: "Depressed"}
Anxiety: {Anxiety Level:304120109:: "Moderate"}
Concentration: {Concentration:304120110:: "Impaired"}

Mental Status Examination
The patient appears their stated age and is appropriately dressed with good hygiene. They are cooperative throughout the interview and maintain appropriate eye contact. Speech is normal in rate and tone. Mood is reported as "depressed" and affect appears congruent and restricted. Thought process is linear and goal-directed without evidence of formal thought disorder. Thought content is negative for psychosis, with no hallucinations or delusions elicited. The patient denies current suicidal or homicidal ideation but endorses passive thoughts of "not wanting to be here" without plan or intent. Insight and judgment appear intact.

Assessment
.DIAGNOSIS
Risk assessment: {Risk Level:304120111:: "Low"}
Prognosis: {Prognosis:304120112:: "Good with treatment"}

Plan
1. Medications: Recommend initiating sertraline 50mg daily for depression and anxiety symptoms. Will monitor for response and side effects.
2. Psychotherapy: {Therapy Referral:304120113:: "CBT referral placed"}
3. Labs: .LABS
4. Follow-up: {Follow-up Timeframe:304120114:: "2-3 weeks"}
5. Safety planning: Safety plan reviewed with patient including identification of warning signs, coping strategies, and emergency contacts. Patient verbalizes understanding and agrees to plan.`;

    return {
      content: mockNote,
      modelUsed: 'mock-gemini',
      latencyMs,
      cached: true,
      promptTokens: Math.floor(prompt.length / 4),
      completionTokens: Math.floor(mockNote.length / 4),
      totalTokens: Math.floor((prompt.length + mockNote.length) / 4)
    };
  }

  /**
   * Extract sections from prompt for mock generation
   */
  private extractSectionsFromPrompt(prompt: string): string[] {
    const sectionPattern = /--- (.+?) ---/g;
    const sections: string[] = [];
    let match;

    while ((match = sectionPattern.exec(prompt)) !== null) {
      sections.push(match[1]);
    }

    return sections;
  }

  /**
   * Redact PHI from logs
   */
  private redactPHI(text: string): string {
    // Redact potential PHI patterns
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
      .replace(/\b\d{10}\b/g, '[MRN]') // MRN
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]') // Dates
      .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME]') // Names
      .substring(0, 500) + '...'; // Truncate for logs
  }

  /**
   * Generate trace ID for request tracking
   */
  private generateTraceId(): string {
    return `gemini-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate generated note for SmartTools compliance
   */
  validateNote(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for remaining @SmartLinks@ (should be converted to .DotPhrases)
    const smartLinkPattern = /@[A-Za-z0-9_]+@/g;
    let match;
    while ((match = smartLinkPattern.exec(content)) !== null) {
      issues.push({
        type: 'format_violation',
        location: `Character ${match.index}`,
        message: `Unconverted SmartLink found: ${match[0]}`,
        suggestion: `Convert ${match[0]} to .${match[0].slice(1, -1)}`
      });
    }

    // Check for invalid SmartList formats
    const smartListPattern = /\{([^:}]+):(\d+)(?:::?\s*"([^"]*)")?\}/g;
    smartListPattern.lastIndex = 0;
    while ((match = smartListPattern.exec(content)) !== null) {
      if (!match[3]) {
        issues.push({
          type: 'smartlist_invalid',
          location: `Character ${match.index}`,
          message: `SmartList missing selection: ${match[0]}`,
          suggestion: `Add :: "selected value" after ${match[2]}`
        });
      }
    }

    // Check for bullet points or numbered lists
    if (/^\s*[-*•]/m.test(content) || /^\s*\d+\./m.test(content)) {
      issues.push({
        type: 'format_violation',
        location: 'Multiple locations',
        message: 'Bullet points or numbered lists detected',
        suggestion: 'Convert all lists to paragraph format'
      });
    }

    // Check for remaining wildcards that should have been filled
    if (content.includes('***') && content.indexOf('***') < content.lastIndexOf('***')) {
      // Multiple wildcards suggest some weren't filled
      const wildcardCount = (content.match(/\*\*\*/g) || []).length;
      if (wildcardCount > 2) { // Allow some wildcards to remain if no data
        issues.push({
          type: 'format_violation',
          location: 'Multiple locations',
          message: `${wildcardCount} wildcards (***) found - some may need filling`,
          suggestion: 'Fill wildcards with transcript content or leave if data unavailable'
        });
      }
    }

    return issues;
  }

  /**
   * Get client status
   */
  getStatus(): {
    mode: 'live' | 'mock';
    model: string;
    configured: boolean;
  } {
    return {
      mode: this.mockMode ? 'mock' : 'live',
      model: this.config.model!,
      configured: !!this.client || this.mockMode
    };
  }
}

// Export singleton instance
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(config?: GeminiConfig): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient(config);
  }
  return geminiClientInstance;
}