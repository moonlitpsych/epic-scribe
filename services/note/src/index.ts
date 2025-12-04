/**
 * Epic Scribe Note Service
 * Main entry point for note generation services
 */

// SmartTools exports
export * from './smarttools/parser';
export * from './smarttools/transformer';
// export * from './smarttools/validator'; // TODO: Create validator module if needed

// Template exports
export { templateService } from './templates/template-service';

// SmartList exports
export { getSmartListService } from './smartlists/smartlist-service';

// Prompt builder exports
export { getPromptBuilder } from './prompts/prompt-builder';

// LLM client exports
export { getGeminiClient } from './llm/gemini-client';

// Validator exports
export { NoteValidator } from './validators/note-validator';

// Designated Examiner exports (legacy)
export { designatedExaminerTemplate, DESIGNATED_EXAMINER_SECTIONS } from './templates/designated-examiner-template';
export { getDEPromptBuilder } from './prompts/designated-examiner-prompt-builder';
export type { DEPromptParams, CriteriaAssessment } from './prompts/designated-examiner-prompt-builder';

// Designated Examiner Multi-Step Workflow exports
export { getDEAnalysisPromptBuilder } from './prompts/de-analysis-prompt-builder';
export type {
  DEAnalysisInput,
  DEAnalysisOutput,
  CriterionResult as DECriterionResult,
  ClarifyingQuestion as DEClarifyingQuestion,
} from './prompts/de-analysis-prompt-builder';

export { getDEFinalPromptBuilder } from './prompts/de-final-prompt-builder';
export type {
  DEFinalInput,
  DEFinalOutput,
} from './prompts/de-final-prompt-builder';
