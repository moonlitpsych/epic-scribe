/**
 * IntakeQ/PracticeQ CSS Selectors
 *
 * These selectors target IntakeQ's web UI elements.
 * Last tested: 2026-02-03
 *
 * Strategy: Use multiple fallback selectors where possible.
 * Priority: data-* attributes > semantic elements > text content > class names
 */

export const SELECTORS = {
  // ============================================================
  // LOGIN PAGE (https://intakeq.com/signin)
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
      'text="My Dashboard"',
      'text="MY FORMS"',
      'text="BOOKINGS"',
      '.main-content',
      '#app-container',
      'a:has-text("My Dashboard")',
    ],
    USER_MENU: [
      '.user-menu',
      '.account-menu',
      '[data-testid="user-menu"]',
      'text="MORE"',
    ],
  },

  // ============================================================
  // CLIENT / PATIENT PAGE
  // URL: https://intakeq.com/#/client/{GUID}?tab=timeline
  // ============================================================
  CLIENT: {
    TIMELINE: [
      '#left-panel',
      '.timeline',
      '.client-timeline',
      'text=Timeline',
    ],
    // Blue + button next to Timeline - opens dropdown menu
    ADD_NEW_BUTTON: [
      '.btn-group.btn-success.add-new',
      '.add-new',
      'span.dropdown-toggle:has-text("+")',
    ],
    // "Create New Note" option in the add dropdown
    CREATE_NEW_NOTE: [
      'a:has-text("Create New Note")',
      'text=Create New Note',
    ],
    CLIENT_NAME: [
      '.client-name',
      '.patient-name',
      'h1',
    ],
  },

  // ============================================================
  // NEW NOTE MODAL (Template Selection)
  // ============================================================
  NEW_NOTE_MODAL: {
    MODAL: [
      '.modal:has-text("New Note")',
      '[role="dialog"]:has-text("New Note")',
    ],
    TEMPLATE_SELECT: [
      '.modal select',
      'select[ng-model*="template"]',
      'select:first-of-type',
    ],
    CONTINUE_BUTTON: [
      'button:has-text("Continue")',
      '.modal button.btn-primary',
    ],
    CLOSE_BUTTON: [
      'button:has-text("Close")',
      '.modal button.btn-default',
    ],
  },

  // ============================================================
  // NOTE EDITOR
  // Header bar contains: Save, Lock, Print, Heidi, More, Close Note
  // ============================================================
  NOTE_EDITOR: {
    // Main container
    CONTAINER: [
      '.note-editor',
      '.treatment-note-form',
      '.note-form',
      '[data-section="note-editor"]',
    ],
    // Header buttons (all at y ≈ 110)
    SAVE_BUTTON: [
      'button.btn-primary:has-text("Save")',
      'button:has-text("Save")',
    ],
    LOCK_BUTTON: [
      'button.btn-nav:has-text("Lock")',
      'button:has-text("Lock")',
    ],
    PRINT_BUTTON: [
      'button.btn-nav:has-text("Print")',
      'button:has-text("Print")',
    ],
    // More dropdown in note header (NOT the top nav MORE)
    MORE_BUTTON: [
      '.note-header button:has-text("More")',
      'button.btn-nav.dropdown-toggle:has-text("More")',
      'button.dropdown-toggle:has-text("More")',
    ],
    CLOSE_NOTE_BUTTON: [
      'button:has-text("Close Note")',
      'button.btn-nav:has-text("Close Note")',
    ],
    // Form fields
    QUESTION_CONTAINER: [
      '.question',
      '.form-group',
      '[class*="question"]',
    ],
    QUESTION_LABEL: [
      '.question-text',
      'label',
      '[class*="label"]',
    ],
    TEXTAREA: [
      'textarea',
      'textarea[name^="content-"]',
    ],
    TEXT_INPUT: [
      'input[type="text"]',
      '.text-input',
    ],
    NOTE_ID_ATTR: [
      'data-note-id',
      'data-id',
    ],
  },

  // ============================================================
  // MORE MENU (in note editor header)
  // Dropdown items when clicking More button
  // ============================================================
  MORE_MENU: {
    DOWNLOAD: ['text=Download'],
    SHARE: ['text=Share'],
    REQUEST_SIGNATURE: ['text=Request Signature'],
    REPLICATE: ['text=Replicate'],
    FAX: ['text=Fax'],
    LINK_APPOINTMENT: ['text=Link Appointment'],
    ADD_PRESCRIPTIONS: ['text=Add Prescriptions'],
    LINK_PRESCRIPTIONS: ['text=Link Prescriptions'],
    ADD_DIAGNOSIS: [
      'a:has-text("Add Diagnosis")',
      'text=Add Diagnosis',
    ],
    ASSIGN_TO: ['text=Assign to'],
    DELETE: ['text=Delete'],
  },

  // ============================================================
  // DIAGNOSIS MODAL
  // Opened from More → Add Diagnosis
  // ============================================================
  DIAGNOSIS: {
    MODAL: [
      '.diagnosis-modal',
      '.modal:has-text("Diagnosis")',
      '[role="dialog"]:has-text("Diagnosis")',
    ],
    SEARCH_INPUT: [
      '.diagnosis-search input',
      'input[placeholder*="diagnosis" i]',
      'input[placeholder*="ICD" i]',
      'input[placeholder*="search" i]',
    ],
    RESULT_ITEM: [
      '.diagnosis-option',
      '.diagnosis-item',
      '.diagnosis-result',
      '.list-group-item',
    ],
    SELECTED_LIST: [
      '.selected-diagnoses',
      '.diagnosis-list',
    ],
    DONE_BUTTON: [
      'button:has-text("Done")',
      'button:has-text("Close")',
      'button:has-text("Apply")',
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
      'button.btn-nav:has-text("Lock")',
      'button:has-text("Lock")',
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
    DROPDOWN_MENU: [
      '.dropdown-menu',
      '[role="menu"]',
    ],
  },
};

/**
 * Helper to try multiple selectors and return the first match
 * Uses Playwright's :is() selector to try multiple options
 */
export function getSelector(selectors: string[]): string {
  return `:is(${selectors.join(', ')})`;
}

/**
 * Helper to create a text-based selector
 */
export function textSelector(text: string, exact = false): string {
  return exact ? `text="${text}"` : `text=${text}`;
}
