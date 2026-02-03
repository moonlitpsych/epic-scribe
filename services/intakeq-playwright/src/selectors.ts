/**
 * IntakeQ CSS Selectors
 *
 * These selectors target IntakeQ's web UI elements.
 * Update these if IntakeQ changes their UI structure.
 *
 * Strategy: Use multiple fallback selectors where possible.
 * Priority: data-* attributes > semantic elements > text content > class names
 */

export const SELECTORS = {
  // ============================================================
  // LOGIN PAGE
  // ============================================================
  LOGIN: {
    EMAIL_INPUT: [
      'input[name="email"]',
      'input[type="email"]',
      '#email',
      'input[placeholder*="email" i]',
    ],
    PASSWORD_INPUT: [
      'input[name="password"]',
      'input[type="password"]',
      '#password',
    ],
    SUBMIT_BUTTON: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
    ],
    ERROR_MESSAGE: [
      '.error-message',
      '.alert-danger',
      '[role="alert"]',
    ],
  },

  // ============================================================
  // DASHBOARD / AUTHENTICATED STATE
  // ============================================================
  DASHBOARD: {
    INDICATOR: [
      '.dashboard',
      '[data-page="dashboard"]',
      '.main-content',
      '#app-container',
    ],
    USER_MENU: [
      '.user-menu',
      '.account-menu',
      '[data-testid="user-menu"]',
    ],
  },

  // ============================================================
  // CLIENT / PATIENT PAGE
  // ============================================================
  CLIENT: {
    TIMELINE: [
      '.client-timeline',
      '.timeline-container',
      '.patient-timeline',
      '[data-section="timeline"]',
    ],
    ADD_NOTE_BUTTON: [
      'button:has-text("Add Note")',
      'button:has-text("New Note")',
      '.add-note-btn',
      '[data-action="add-note"]',
    ],
    CLIENT_NAME: [
      '.client-name',
      '.patient-name',
      'h1',
    ],
  },

  // ============================================================
  // TEMPLATE SELECTION
  // ============================================================
  TEMPLATE: {
    MODAL: [
      '.template-modal',
      '.template-selector',
      '[role="dialog"]',
    ],
    OPTION: [
      '.template-option',
      '.note-template-item',
      '.template-card',
    ],
    SEARCH: [
      '.template-search input',
      'input[placeholder*="template" i]',
    ],
  },

  // ============================================================
  // NOTE EDITOR
  // ============================================================
  NOTE_EDITOR: {
    CONTAINER: [
      '.note-editor',
      '.treatment-note-form',
      '.note-form',
      '[data-section="note-editor"]',
    ],
    QUESTION_CONTAINER: [
      '.question-container',
      '.form-question',
      '.note-question',
    ],
    QUESTION_LABEL: [
      '.question-label',
      '.question-text',
      'label',
    ],
    TEXTAREA: [
      'textarea',
      '.text-area-input',
    ],
    TEXT_INPUT: [
      'input[type="text"]',
      '.text-input',
    ],
    SAVE_BUTTON: [
      'button:has-text("Save")',
      '.save-note-btn',
      '[data-action="save"]',
    ],
    NOTE_ID_ATTR: [
      'data-note-id',
      'data-id',
    ],
  },

  // ============================================================
  // DIAGNOSES
  // ============================================================
  DIAGNOSIS: {
    MORE_MENU: [
      'button:has-text("More")',
      '.more-actions-btn',
      '.dropdown-toggle',
    ],
    ADD_DIAGNOSIS_OPTION: [
      'text="Add Diagnosis"',
      '[data-action="add-diagnosis"]',
      '.add-diagnosis-option',
    ],
    MODAL: [
      '.diagnosis-modal',
      '.diagnosis-selector',
      '[data-modal="diagnosis"]',
    ],
    SEARCH_INPUT: [
      '.diagnosis-search input',
      'input[placeholder*="diagnosis" i]',
      'input[placeholder*="ICD" i]',
    ],
    RESULT_ITEM: [
      '.diagnosis-option',
      '.diagnosis-item',
      '.diagnosis-result',
    ],
    SELECTED_LIST: [
      '.selected-diagnoses',
      '.diagnosis-list',
    ],
    DONE_BUTTON: [
      'button:has-text("Done")',
      'button:has-text("Done Selecting")',
      'button:has-text("Apply")',
      '.done-btn',
    ],
  },

  // ============================================================
  // SIGNATURE
  // ============================================================
  SIGNATURE: {
    PAD: [
      '.signature-pad canvas',
      '[data-signature] canvas',
      'canvas.signature',
    ],
    CLEAR_BUTTON: [
      'button:has-text("Clear")',
      '.clear-signature',
    ],
    TYPE_SIGNATURE: [
      'button:has-text("Type")',
      '.type-signature-btn',
    ],
    TYPE_INPUT: [
      '.signature-type-input',
      'input[placeholder*="signature" i]',
    ],
  },

  // ============================================================
  // LOCK / FINALIZE
  // ============================================================
  LOCK: {
    BUTTON: [
      'button:has-text("Lock")',
      'button:has-text("Lock Note")',
      '.lock-note-btn',
      '[data-action="lock"]',
    ],
    CONFIRM_BUTTON: [
      'button:has-text("Confirm")',
      'button:has-text("Yes")',
      '.confirm-lock-btn',
    ],
    LOCKED_INDICATOR: [
      'text="locked"',
      '.note-locked',
      '.locked-badge',
      '[data-status="locked"]',
    ],
  },

  // ============================================================
  // GENERAL / UTILITIES
  // ============================================================
  GENERAL: {
    LOADING: [
      '.loading',
      '.spinner',
      '[data-loading="true"]',
    ],
    MODAL_BACKDROP: [
      '.modal-backdrop',
      '.overlay',
    ],
    CLOSE_MODAL: [
      'button:has-text("Close")',
      'button:has-text("Cancel")',
      '.close-btn',
      '[aria-label="Close"]',
    ],
    ERROR_TOAST: [
      '.toast-error',
      '.error-notification',
      '[role="alert"]',
    ],
  },
};

/**
 * Helper to try multiple selectors and return the first match
 */
export function getSelector(selectors: string[]): string {
  // For Playwright, we can use :is() to try multiple selectors
  return `:is(${selectors.join(', ')})`;
}

/**
 * Helper to create a text-based selector
 */
export function textSelector(text: string, exact = false): string {
  return exact ? `text="${text}"` : `text=${text}`;
}
