/**
 * IntakeQ Browser Automation
 *
 * Uses Playwright to automate note creation in IntakeQ.
 * This is necessary because IntakeQ has no API for creating/modifying notes.
 *
 * NOTE: Playwright is dynamically imported to prevent bundling issues with Next.js.
 * This module should only be used server-side (API routes, not client components).
 */

import type { Browser, BrowserContext, Page } from 'playwright';

// Dynamic import to avoid bundling issues
async function getPlaywright() {
  const { chromium } = await import('playwright');
  return chromium;
}
import {
  IntakeQCredentials,
  NoteToCreate,
  NoteSection,
  DiagnosisCode,
  CreateNoteResult,
  AutomationConfig,
} from './types';
import { SELECTORS, getSelector } from './selectors';

const DEFAULT_CONFIG: Required<AutomationConfig> = {
  headless: true,
  slowMo: 50,
  timeout: 30000,
  screenshotOnError: true,
  screenshotDir: './screenshots',
};

export class IntakeQAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: Required<AutomationConfig>;
  private isLoggedIn = false;

  constructor(config: AutomationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    console.log('[IntakeQ] Initializing browser...');

    const chromium = await getPlaywright();
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);

    console.log('[IntakeQ] Browser initialized');
  }

  /**
   * Close the browser and clean up
   */
  async close(): Promise<void> {
    console.log('[IntakeQ] Closing browser...');

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.page = null;
    this.isLoggedIn = false;

    console.log('[IntakeQ] Browser closed');
  }

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  /**
   * Log in to IntakeQ
   */
  async login(credentials: IntakeQCredentials): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    console.log('[IntakeQ] Navigating to login page...');
    await this.page.goto('https://intakeq.com/signin');

    // Wait for login form to load
    await this.page.waitForSelector(getSelector(SELECTORS.LOGIN.EMAIL_INPUT));

    console.log('[IntakeQ] Entering credentials...');

    // Fill email
    await this.page.fill(getSelector(SELECTORS.LOGIN.EMAIL_INPUT), credentials.email);

    // Fill password
    await this.page.fill(getSelector(SELECTORS.LOGIN.PASSWORD_INPUT), credentials.password);

    // Click submit
    console.log('[IntakeQ] Submitting login...');
    await this.page.click(getSelector(SELECTORS.LOGIN.SUBMIT_BUTTON));

    // Wait for dashboard navigation elements to appear
    // Don't use networkidle as IntakeQ uses websockets that keep the network active
    console.log('[IntakeQ] Waiting for dashboard...');
    try {
      // Wait for any of these dashboard indicators
      await Promise.race([
        this.page.waitForSelector('text=MY FORMS', { timeout: 20000 }),
        this.page.waitForSelector('text=My Dashboard', { timeout: 20000 }),
        this.page.waitForSelector('text=BOOKINGS', { timeout: 20000 }),
      ]);
      this.isLoggedIn = true;
      console.log('[IntakeQ] Login successful - dashboard detected');
    } catch {
      // Check for error message
      const errorEl = await this.page.$(getSelector(SELECTORS.LOGIN.ERROR_MESSAGE));
      if (errorEl) {
        const errorText = await errorEl.textContent();
        throw new Error(`Login failed: ${errorText}`);
      }
      throw new Error('Login failed: Could not detect dashboard or error message');
    }
  }

  /**
   * Check if currently logged in
   */
  async checkLoginStatus(): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.waitForSelector(getSelector(SELECTORS.DASHBOARD.INDICATOR), {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  /**
   * Navigate to a client's profile page
   * IntakeQ uses client GUID in the URL: https://intakeq.com/#/client/{guid}
   */
  async navigateToClient(clientGuid: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[IntakeQ] Navigating to client ${clientGuid}...`);
    await this.page.goto(`https://intakeq.com/#/client/${clientGuid}?tab=timeline`);

    // Wait for client profile to load - look for common profile elements
    await Promise.race([
      this.page.waitForSelector('text=Timeline', { timeout: 15000 }),
      this.page.waitForSelector('text=Notes', { timeout: 15000 }),
      this.page.waitForSelector('text=Profile', { timeout: 15000 }),
      this.page.waitForSelector('text=Add Note', { timeout: 15000 }),
    ]);

    console.log('[IntakeQ] Client page loaded');
  }

  // ============================================================
  // NOTE CREATION
  // ============================================================

  /**
   * Create a new treatment note for a client
   */
  async createNote(note: NoteToCreate): Promise<CreateNoteResult> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in. Call login() first.');
    }

    try {
      // Navigate to client
      await this.navigateToClient(note.clientGuid);

      // Click "Add Note" button
      console.log('[IntakeQ] Clicking Add Note...');
      await this.page.click(getSelector(SELECTORS.CLIENT.ADD_NOTE_BUTTON));

      // Wait for template selector
      await this.page.waitForSelector(getSelector(SELECTORS.TEMPLATE.MODAL), {
        timeout: 10000,
      });

      // Select template by name
      console.log(`[IntakeQ] Selecting template: ${note.templateName}`);
      await this.selectTemplate(note.templateName);

      // Wait for note editor to load
      await this.page.waitForSelector(getSelector(SELECTORS.NOTE_EDITOR.CONTAINER), {
        timeout: 15000,
      });
      console.log('[IntakeQ] Note editor loaded');

      // Fill in note content
      console.log('[IntakeQ] Filling note sections...');
      for (const section of note.noteContent) {
        await this.fillNoteSection(section);
      }

      // Add diagnoses
      if (note.diagnoses.length > 0) {
        console.log('[IntakeQ] Adding diagnoses...');
        for (const diagnosis of note.diagnoses) {
          await this.addDiagnosis(diagnosis);
        }
      }

      // Sign if required
      if (note.signatureRequired) {
        console.log('[IntakeQ] Signing note...');
        await this.signNote();
      }

      // Save the note first
      console.log('[IntakeQ] Saving note...');
      await this.saveNote();

      // Get note ID before locking
      const noteId = await this.getNoteId();

      // Lock the note
      console.log('[IntakeQ] Locking note...');
      await this.lockNote();

      const noteUrl = noteId
        ? `https://intakeq.com/notes/${noteId}`
        : this.page.url();

      console.log('[IntakeQ] Note created successfully');

      return {
        success: true,
        noteId: noteId || undefined,
        noteUrl,
      };
    } catch (error) {
      console.error('[IntakeQ] Error creating note:', error);

      // Take screenshot on error
      if (this.config.screenshotOnError && this.page) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const path = `${this.config.screenshotDir}/error-${timestamp}.png`;
        await this.page.screenshot({ path, fullPage: true });
        console.log(`[IntakeQ] Screenshot saved: ${path}`);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Select a note template by name
   */
  private async selectTemplate(templateName: string): Promise<void> {
    if (!this.page) return;

    // Try to find template by text
    const templateOption = await this.page.$(`text="${templateName}"`);

    if (templateOption) {
      await templateOption.click();
    } else {
      // Try searching if there's a search box
      const searchInput = await this.page.$(getSelector(SELECTORS.TEMPLATE.SEARCH));
      if (searchInput) {
        await searchInput.fill(templateName);
        await this.page.waitForTimeout(500);

        // Click first matching result
        const firstResult = await this.page.$(getSelector(SELECTORS.TEMPLATE.OPTION));
        if (firstResult) {
          await firstResult.click();
        } else {
          throw new Error(`Template not found: ${templateName}`);
        }
      } else {
        throw new Error(`Template not found: ${templateName}`);
      }
    }
  }

  /**
   * Fill a single note section/question
   */
  private async fillNoteSection(section: NoteSection): Promise<void> {
    if (!this.page) return;

    console.log(`[IntakeQ] Filling section: ${section.questionText}`);

    // Strategy 1: Find by question ID
    if (section.questionId) {
      const byId = await this.page.$(`[data-question-id="${section.questionId}"]`);
      if (byId) {
        const input = await byId.$('textarea, input[type="text"]');
        if (input) {
          await input.fill(section.value);
          return;
        }
      }
    }

    // Strategy 2: Find by question text
    const questionContainers = await this.page.$$(getSelector(SELECTORS.NOTE_EDITOR.QUESTION_CONTAINER));

    for (const container of questionContainers) {
      const label = await container.$(getSelector(SELECTORS.NOTE_EDITOR.QUESTION_LABEL));
      if (label) {
        const labelText = await label.textContent();
        if (labelText && labelText.toLowerCase().includes(section.questionText.toLowerCase())) {
          // Found the matching question
          const textarea = await container.$('textarea');
          if (textarea) {
            await textarea.fill(section.value);
            return;
          }

          const textInput = await container.$('input[type="text"]');
          if (textInput) {
            await textInput.fill(section.value);
            return;
          }
        }
      }
    }

    console.warn(`[IntakeQ] Could not find field for: ${section.questionText}`);
  }

  /**
   * Add a diagnosis to the note
   */
  private async addDiagnosis(diagnosis: DiagnosisCode): Promise<void> {
    if (!this.page) return;

    console.log(`[IntakeQ] Adding diagnosis: ${diagnosis.code} - ${diagnosis.description}`);

    // Click More menu
    await this.page.click(getSelector(SELECTORS.DIAGNOSIS.MORE_MENU));
    await this.page.waitForTimeout(300);

    // Click Add Diagnosis
    await this.page.click(getSelector(SELECTORS.DIAGNOSIS.ADD_DIAGNOSIS_OPTION));

    // Wait for diagnosis modal
    await this.page.waitForSelector(getSelector(SELECTORS.DIAGNOSIS.MODAL), {
      timeout: 5000,
    });

    // Search for the diagnosis
    const searchInput = await this.page.$(getSelector(SELECTORS.DIAGNOSIS.SEARCH_INPUT));
    if (searchInput) {
      await searchInput.fill(diagnosis.code);
      await this.page.waitForTimeout(500); // Wait for search results
    }

    // Click on matching diagnosis
    const diagnosisOption = await this.page.$(`${getSelector(SELECTORS.DIAGNOSIS.RESULT_ITEM)}:has-text("${diagnosis.code}")`);
    if (diagnosisOption) {
      await diagnosisOption.click();
    } else {
      console.warn(`[IntakeQ] Diagnosis not found: ${diagnosis.code}`);
    }

    // Close modal
    await this.page.click(getSelector(SELECTORS.DIAGNOSIS.DONE_BUTTON));
    await this.page.waitForTimeout(300);
  }

  /**
   * Sign the note
   */
  private async signNote(): Promise<void> {
    if (!this.page) return;

    // Find signature canvas
    const signaturePad = await this.page.$(getSelector(SELECTORS.SIGNATURE.PAD));

    if (signaturePad) {
      const box = await signaturePad.boundingBox();
      if (box) {
        // Draw a simple signature line
        await this.page.mouse.move(box.x + 20, box.y + box.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, {
          steps: 15,
        });
        await this.page.mouse.up();
        console.log('[IntakeQ] Signature drawn');
      }
    } else {
      // Try typed signature as fallback
      const typeButton = await this.page.$(getSelector(SELECTORS.SIGNATURE.TYPE_SIGNATURE));
      if (typeButton) {
        await typeButton.click();
        const typeInput = await this.page.$(getSelector(SELECTORS.SIGNATURE.TYPE_INPUT));
        if (typeInput) {
          await typeInput.fill('Dr. Rufus Sweeney');
          console.log('[IntakeQ] Typed signature entered');
        }
      } else {
        console.warn('[IntakeQ] Could not find signature field');
      }
    }
  }

  /**
   * Save the note
   */
  private async saveNote(): Promise<void> {
    if (!this.page) return;

    const saveButton = await this.page.$(getSelector(SELECTORS.NOTE_EDITOR.SAVE_BUTTON));
    if (saveButton) {
      await saveButton.click();
      await this.page.waitForTimeout(1000); // Wait for save to complete
    }
  }

  /**
   * Get the note ID from the current page
   */
  private async getNoteId(): Promise<string | null> {
    if (!this.page) return null;

    // Try to get from URL first
    const url = this.page.url();
    const urlMatch = url.match(/notes\/([a-f0-9-]+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try to get from data attribute
    const noteEditor = await this.page.$(getSelector(SELECTORS.NOTE_EDITOR.CONTAINER));
    if (noteEditor) {
      for (const attr of SELECTORS.NOTE_EDITOR.NOTE_ID_ATTR) {
        const noteId = await noteEditor.getAttribute(attr);
        if (noteId) return noteId;
      }
    }

    return null;
  }

  /**
   * Lock the note
   */
  private async lockNote(): Promise<void> {
    if (!this.page) return;

    // Click Lock button
    await this.page.click(getSelector(SELECTORS.LOCK.BUTTON));

    // Handle confirmation dialog if present
    try {
      await this.page.waitForSelector(getSelector(SELECTORS.LOCK.CONFIRM_BUTTON), {
        timeout: 3000,
      });
      await this.page.click(getSelector(SELECTORS.LOCK.CONFIRM_BUTTON));
    } catch {
      // No confirmation dialog, that's fine
    }

    // Wait for locked indicator
    await this.page.waitForSelector(getSelector(SELECTORS.LOCK.LOCKED_INDICATOR), {
      timeout: 10000,
    });

    console.log('[IntakeQ] Note locked');
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<string | null> {
    if (!this.page) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${this.config.screenshotDir}/${name}-${timestamp}.png`;
    await this.page.screenshot({ path, fullPage: true });
    return path;
  }

  /**
   * Get the current page URL
   */
  getCurrentUrl(): string | null {
    return this.page?.url() || null;
  }
}
