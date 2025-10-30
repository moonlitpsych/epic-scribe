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

// Designated Examiner exports
export { designatedExaminerTemplate, DESIGNATED_EXAMINER_SECTIONS } from './templates/designated-examiner-template';
export { getDEPromptBuilder } from './prompts/designated-examiner-prompt-builder';
export type { DEPromptParams, CriteriaAssessment } from './prompts/designated-examiner-prompt-builder';
