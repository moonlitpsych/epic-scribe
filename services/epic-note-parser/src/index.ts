/**
 * Epic Note Parser
 *
 * Parses copy-forward notes from Epic EMR to extract patient info and metadata.
 */

export { EpicNoteParser, createParser, isEpicNote, parseEpicNote } from './parser';
export type { ParsedEpicNote, EpicNoteParserOptions } from './types';
