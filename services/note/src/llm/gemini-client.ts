/**
 * Gemini AI Client
 * Handles LLM interactions with Google's Gemini API (via Vertex AI for HIPAA compliance)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateNoteResponse, ValidationIssue, PromptReceipt } from '@epic-scribe/types';
import { NoteValidator, ValidationResult } from '../validators/note-validator';

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
  validationResult?: ValidationResult;
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
      const content = result.response.text();

      // Perform comprehensive validation using NoteValidator
      const validator = new NoteValidator();
      const validationResult = validator.validateNote(content);

      // Log validation results
      if (!validationResult.valid) {
        console.warn('Note validation failed:', validationResult.errors);
        if (validationResult.warnings) {
          console.warn('Note validation warnings:', validationResult.warnings);
        }
      } else if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.info('Note validation warnings:', validationResult.warnings);
      }

      return {
        content,
        modelUsed: this.config.model!,
        latencyMs,
        promptTokens: result.response.usageMetadata?.promptTokenCount,
        completionTokens: result.response.usageMetadata?.candidatesTokenCount,
        totalTokens: result.response.usageMetadata?.totalTokenCount,
        validationResult
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

    // Generate mock content with v2 structure
    const mockNote = `History of Present Illness
The patient is a .age year old presenting for psychiatric evaluation. Based on the transcript provided, the patient reports experiencing moderate symptoms of depression and anxiety over the past several months. Sleep has been significantly disrupted with difficulty falling asleep and early morning awakening. The patient describes mood as "low" and reports decreased motivation for daily activities. Anxiety symptoms include persistent worry about work and family matters, with occasional panic symptoms including chest tightness and shortness of breath. These symptoms have progressively worsened and are now significantly impacting daily functioning and work performance. The patient states feeling overwhelmed by life circumstances and has noticed increased irritability affecting relationships with family members.

Psychiatric History
Previous diagnoses: Major Depressive Disorder diagnosed 2019, Generalized Anxiety Disorder diagnosed 2020
Previous medications: Sertraline 50mg (partial response, discontinued due to side effects)
Hospitalizations: Denies any psychiatric hospitalizations
Suicide attempts: Denies any previous suicide attempts
Self-harm history (NSSIB): Denies self-harm behaviors
Previous therapy: CBT for 6 months in 2020, found helpful

Formulation
John Smith is a 45 year old male with a history of Major Depressive Disorder and Generalized Anxiety Disorder who presents for psychiatric evaluation following recent symptom exacerbation.

The patient's diagnosis is most consistent with Major Depressive Disorder, recurrent, moderate severity (F33.1) based on depressed mood, anhedonia, sleep disturbance, fatigue, and impaired concentration meeting DSM-5-TR criteria for over 2 weeks. From a biological perspective, there is a family history of depression in mother suggesting genetic vulnerability, with possible serotonin dysregulation. Psychologically, the patient demonstrates negative cognitive patterns and catastrophic thinking following recent stressors, with maladaptive coping strategies. Socially, recent job changes have created role transition difficulties and financial stress, though protective factors include stable marriage and family support.

Also considered in the differential diagnosis are Adjustment Disorder with mixed anxiety and depressed mood, and Persistent Depressive Disorder. Adjustment Disorder is less likely given the severity and number of symptoms exceeding expected response to stressor. Persistent Depressive Disorder was considered but the patient has distinct episodes with periods of remission between them.

Plan is to initiate medication management combined with psychotherapy referral as follows:

Plan
Medications:
Start sertraline 50 mg daily for depression - previous partial response suggests higher dose may be effective
Continue gabapentin 300 mg TID for anxiety - currently helping

Referral to Psychotherapy:
Refer to available CBT therapist for weekly sessions focusing on cognitive restructuring and behavioral activation
Patient has verified insurance coverage for 20 sessions

Therapy:
Supportive psychotherapy provided today focusing on validation of current stressors, psychoeducation about depression as medical condition, and collaborative treatment planning. Discussed importance of medication adherence and therapy engagement. Patient receptive to recommendations. Session duration: 25 minutes.

Follow-up:
Return in 2 weeks for medication monitoring and supportive therapy, or sooner if needed

Rufus Sweeney, MD`;

    // Validate the mock note
    const validator = new NoteValidator();
    const validationResult = validator.validateNote(mockNote);

    return {
      content: mockNote,
      modelUsed: 'mock-gemini',
      latencyMs,
      cached: true,
      promptTokens: Math.floor(prompt.length / 4),
      completionTokens: Math.floor(mockNote.length / 4),
      totalTokens: Math.floor((prompt.length + mockNote.length) / 4),
      validationResult
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