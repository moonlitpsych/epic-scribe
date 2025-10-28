/**
 * Epic Scribe Note Service
 * Main entry point for note generation services
 */

// SmartTools exports
export * from './smarttools/parser';
export * from './smarttools/transformer';
export * from './smarttools/validator';

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
