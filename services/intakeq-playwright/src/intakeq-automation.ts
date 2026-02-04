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
import { buildIntakeQNote, MappedNote } from './note-mapper';

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
    console.log('[IntakeQ] Waiting for dashboard...');
    try {
      await Promise.race([
        this.page.waitForSelector('text=MY FORMS', { timeout: 20000 }),
        this.page.waitForSelector('text=My Dashboard', { timeout: 20000 }),
        this.page.waitForSelector('text=BOOKINGS', { timeout: 20000 }),
      ]);
      this.isLoggedIn = true;
      console.log('[IntakeQ] Login successful - dashboard detected');
    } catch {
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
   */
  async navigateToClient(clientGuid: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`[IntakeQ] Navigating to client ${clientGuid}...`);
    await this.page.goto(`https://intakeq.com/#/client/${clientGuid}?tab=timeline`);

    await Promise.race([
      this.page.waitForSelector('text=Timeline', { timeout: 15000 }),
      this.page.waitForSelector('text=Notes', { timeout: 15000 }),
      this.page.waitForSelector('text=Profile', { timeout: 15000 }),
      this.page.waitForSelector('text=Add Note', { timeout: 15000 }),
    ]);

    console.log('[IntakeQ] Client page loaded');
  }

  // ============================================================
  // HIGH-LEVEL API: Push Epic Scribe Note to IntakeQ
  // ============================================================

  /**
   * Push an Epic Scribe generated note to IntakeQ
   *
   * This is the main entry point for the write path integration.
   * Takes a raw Epic Scribe note, maps it to IntakeQ format, and creates the note.
   *
   * @param clientGuid - The IntakeQ client GUID
   * @param epicScribeNote - The raw generated note from Epic Scribe
   * @param options - Configuration options
   */
  async pushNoteToIntakeQ(
    clientGuid: string,
    epicScribeNote: string,
    options: {
      template?: 'intake' | 'progress';
      signatureRequired?: boolean;
      lockAfterSave?: boolean;
    } = {}
  ): Promise<CreateNoteResult> {
    const {
      template = 'intake',
      signatureRequired = false,
      lockAfterSave = true,
    } = options;

    console.log('[IntakeQ] === Starting Push Note to IntakeQ ===');
    console.log(`[IntakeQ] Client GUID: ${clientGuid}`);
    console.log(`[IntakeQ] Template: ${template}`);

    // Step 1: Map the Epic Scribe note to IntakeQ format
    console.log('[IntakeQ] Mapping Epic Scribe note to IntakeQ format...');
    const mappedNote = buildIntakeQNote(epicScribeNote, { template });

    console.log(`[IntakeQ] Mapped ${mappedNote.sections.length} sections`);
    console.log(`[IntakeQ] Found ${mappedNote.diagnoses.length} diagnoses`);

    // Step 2: Create the note using the mapped content
    const noteToCreate: NoteToCreate = {
      clientGuid,
      templateName: mappedNote.templateName,
      noteContent: mappedNote.sections,
      diagnoses: mappedNote.diagnoses,
      signatureRequired,
    };

    // Step 3: Execute the note creation
    return this.createNoteWithMappedContent(noteToCreate, lockAfterSave);
  }

  /**
   * Create a note with pre-mapped content
   */
  private async createNoteWithMappedContent(
    note: NoteToCreate,
    lockAfterSave: boolean
  ): Promise<CreateNoteResult> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in. Call login() first.');
    }

    try {
      // Navigate to client
      await this.navigateToClient(note.clientGuid);

      // Step 1: Click the blue + button
      console.log('[IntakeQ] Opening Add New menu...');
      await this.page.click(getSelector(SELECTORS.CLIENT.ADD_NEW_BUTTON));
      await this.page.waitForTimeout(500);

      // Step 2: Click "Create New Note"
      console.log('[IntakeQ] Clicking Create New Note...');
      await this.page.click(getSelector(SELECTORS.CLIENT.CREATE_NEW_NOTE));
      await this.page.waitForTimeout(1000);

      // Step 3: Select template
      console.log(`[IntakeQ] Selecting template: ${note.templateName}`);
      await this.selectTemplate(note.templateName);

      // Step 4: Click Continue
      console.log('[IntakeQ] Clicking Continue...');
      await this.page.click(getSelector(SELECTORS.NEW_NOTE_MODAL.CONTINUE_BUTTON));
      await this.page.waitForTimeout(3000);

      // Wait for note editor to load
      await this.waitForNoteEditor();
      console.log('[IntakeQ] Note editor loaded');

      // Step 5: Fill all sections
      console.log('[IntakeQ] Filling note sections...');
      await this.fillAllSections(note.noteContent);

      // Step 6: Add diagnoses
      if (note.diagnoses.length > 0) {
        console.log(`[IntakeQ] Adding ${note.diagnoses.length} diagnoses...`);
        for (const diagnosis of note.diagnoses) {
          await this.addDiagnosis(diagnosis);
        }
      }

      // Step 7: Sign if required
      if (note.signatureRequired) {
        console.log('[IntakeQ] Signing note...');
        await this.signNote();
      }

      // Step 8: Save the note
      console.log('[IntakeQ] Saving note...');
      await this.saveNote();

      // Get note ID from URL
      const noteId = await this.getNoteId();

      // Step 9: Lock the note if requested
      if (lockAfterSave) {
        console.log('[IntakeQ] Locking note...');
        await this.lockNote();
      }

      const noteUrl = this.page.url();

      console.log('[IntakeQ] === Note created successfully ===');
      console.log(`[IntakeQ] Note URL: ${noteUrl}`);

      return {
        success: true,
        noteId: noteId || undefined,
        noteUrl,
      };
    } catch (error) {
      console.error('[IntakeQ] Error creating note:', error);

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

  // ============================================================
  // NOTE CREATION (Legacy API - kept for backwards compatibility)
  // ============================================================

  /**
   * Create a new treatment note for a client (legacy method)
   */
  async createNote(note: NoteToCreate): Promise<CreateNoteResult> {
    return this.createNoteWithMappedContent(note, true);
  }

  /**
   * Select a note template by name
   */
  private async selectTemplate(templateName: string): Promise<void> {
    if (!this.page) return;

    const templateSelect = await this.page.$(getSelector(SELECTORS.NEW_NOTE_MODAL.TEMPLATE_SELECT));

    if (templateSelect) {
      const options = await templateSelect.$$('option');
      let found = false;

      for (const opt of options) {
        const text = await opt.textContent();
        if (text?.toLowerCase().includes(templateName.toLowerCase())) {
          console.log(`[IntakeQ] Found matching template: "${text?.trim()}"`);
          await templateSelect.selectOption({ label: text?.trim() });
          found = true;
          break;
        }
      }

      if (!found) {
        console.warn(`[IntakeQ] Template "${templateName}" not found, using first option`);
        if (options.length > 0) {
          await templateSelect.selectOption({ index: 0 });
        }
      }
    } else {
      console.warn('[IntakeQ] Template select not found');
    }

    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for note editor to load
   */
  private async waitForNoteEditor(): Promise<void> {
    if (!this.page) return;

    await Promise.race([
      this.page.waitForSelector('button:has-text("Lock")', { timeout: 15000 }),
      this.page.waitForSelector('button:has-text("Close Note")', { timeout: 15000 }),
      this.page.waitForSelector('[contenteditable="true"]', { timeout: 15000 }),
      this.page.waitForSelector('input[placeholder="Chief Complaint"]', { timeout: 15000 }),
    ]);
  }

  /**
   * Fill all sections of the note
   *
   * IntakeQ note structure:
   * - Section 2 (CC): input field with placeholder="Chief Complaint"
   * - Sections 3-13: contenteditable rich text editors
   */
  private async fillAllSections(sections: NoteSection[]): Promise<void> {
    if (!this.page) return;

    // Sort sections by section number
    const sortedSections = [...sections].sort(
      (a, b) => (a.sectionNumber || 0) - (b.sectionNumber || 0)
    );

    // Get all contenteditable elements (for rich text sections)
    // These appear in order on the page after the CC field
    const contenteditables = await this.page.$$('[contenteditable="true"]');
    console.log(`[IntakeQ] Found ${contenteditables.length} contenteditable elements`);

    // Map section numbers to contenteditable indices
    // Kyle Roller Intake Note has 8 contenteditables (after CC input):
    // 0: HPI, 1: Psych ROS, 2: Social, 3: Substance Use, 4: Meds, 5: Medical ROS, 6: MSE, 7: Assessment/Plan
    // Note: No separate Risk Assessment field - it should be included in Assessment and Plan
    const sectionToEditableIndex: { [key: number]: number } = {
      3: 0,   // HPI
      4: 1,   // Psychiatric ROS
      5: 2,   // Social History
      6: 3,   // Substance Use
      7: 4,   // Medication History
      8: 5,   // Medical ROS
      // 9: Allergies (checkbox, skip)
      10: 6,  // MSE
      // 11: Risk Assessment - NO separate field, include in Assessment and Plan
      // 12: Diagnosis (via Add Diagnosis, skip)
      13: 7,  // Assessment and Plan (includes Risk Assessment)
    };

    for (const section of sortedSections) {
      const sectionNum = section.sectionNumber || 0;

      console.log(`[IntakeQ] Filling section ${sectionNum}: ${section.questionText}`);

      // Section 2: CC (Chief Complaint) - input field
      if (sectionNum === 2 || section.fieldType === 'input') {
        const ccInput = await this.page.$('input[placeholder="Chief Complaint"]');
        if (ccInput) {
          await ccInput.fill(section.value);
          console.log(`[IntakeQ] ✓ Filled CC`);
        } else {
          console.warn('[IntakeQ] ✗ CC input not found');
        }
        continue;
      }

      // Contenteditable sections
      if (section.fieldType === 'contenteditable') {
        const editableIndex = sectionToEditableIndex[sectionNum];

        if (editableIndex !== undefined && editableIndex < contenteditables.length) {
          const editor = contenteditables[editableIndex];

          // Scroll into view
          await editor.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(200);

          // Click to focus
          await editor.click();
          await this.page.waitForTimeout(100);

          // Clear existing content and type new content
          await this.page.keyboard.press('Control+A');
          await this.page.keyboard.type(section.value);

          console.log(`[IntakeQ] ✓ Filled section ${sectionNum}`);
        } else {
          console.warn(`[IntakeQ] ✗ No contenteditable for section ${sectionNum}`);
        }
      }

      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Fill a single note section (legacy method)
   */
  private async fillNoteSection(section: NoteSection): Promise<void> {
    await this.fillAllSections([section]);
  }

  /**
   * Add a diagnosis to the note
   */
  private async addDiagnosis(diagnosis: DiagnosisCode): Promise<void> {
    if (!this.page) return;

    console.log(`[IntakeQ] Adding diagnosis: ${diagnosis.code} - ${diagnosis.description}`);

    // Find and click More button in note header (y between 100-150)
    const allMoreButtons = await this.page.$$('button:has-text("More")');
    let moreButton = null;

    for (const btn of allMoreButtons) {
      const box = await btn.boundingBox();
      if (box && box.y > 100 && box.y < 150) {
        moreButton = btn;
        break;
      }
    }

    if (!moreButton) {
      console.warn('[IntakeQ] More button not found in note header');
      return;
    }

    await moreButton.click();
    await this.page.waitForTimeout(500);

    // Click Add Diagnosis in the dropdown
    const addDiagnosisLink = await this.page.$('a:has-text("Add Diagnosis")');
    if (addDiagnosisLink) {
      await addDiagnosisLink.click();
    } else {
      await this.page.click('text=Add Diagnosis');
    }
    await this.page.waitForTimeout(1000);

    // Find search input
    const searchSelectors = [
      'input[placeholder*="search" i]',
      'input[placeholder*="diagnosis" i]',
      'input[placeholder*="ICD" i]',
      'input[type="text"]',
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
      const inputs = await this.page.$$(selector);
      for (const input of inputs) {
        const isVisible = await input.isVisible();
        if (isVisible) {
          searchInput = input;
          break;
        }
      }
      if (searchInput) break;
    }

    if (!searchInput) {
      console.warn('[IntakeQ] Diagnosis search input not found');
      return;
    }

    // Search for the diagnosis
    await searchInput.fill(diagnosis.code);
    await this.page.waitForTimeout(1500);

    // Click on matching diagnosis in results
    const resultSelector = `.list-group-item:has-text("${diagnosis.code}")`;
    const diagnosisResult = await this.page.$(resultSelector);
    if (diagnosisResult) {
      await diagnosisResult.click();
      console.log(`[IntakeQ] ✓ Added diagnosis: ${diagnosis.code}`);
    } else {
      console.warn(`[IntakeQ] ✗ Diagnosis not found in results: ${diagnosis.code}`);
    }

    await this.page.waitForTimeout(500);

    // Close the diagnosis panel (click outside or press Escape)
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Sign the note
   */
  private async signNote(): Promise<void> {
    if (!this.page) return;

    const signaturePad = await this.page.$(getSelector(SELECTORS.SIGNATURE.PAD));

    if (signaturePad) {
      const box = await signaturePad.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + 20, box.y + box.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, {
          steps: 15,
        });
        await this.page.mouse.up();
        console.log('[IntakeQ] Signature drawn');
      }
    } else {
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
   *
   * IntakeQ has auto-save, so we need to:
   * 1. Try to click Save button if enabled
   * 2. If disabled, check if "Saved" indicator is present (auto-saved)
   * 3. Wait for save to complete
   */
  private async saveNote(): Promise<void> {
    if (!this.page) return;

    // First, scroll to top to make sure header is visible
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);

    // Find Save button in the note header (y between 100-150)
    const allSaveButtons = await this.page.$$('button:has-text("Save")');
    let saveButton = null;

    for (const btn of allSaveButtons) {
      const box = await btn.boundingBox();
      const text = await btn.textContent();
      // Must be in header and not "Save Comment"
      if (box && box.y > 50 && box.y < 150 && !text?.includes('Comment')) {
        saveButton = btn;
        break;
      }
    }

    if (saveButton) {
      // Check if button is enabled
      const isDisabled = await saveButton.evaluate((el: HTMLButtonElement) => el.disabled);

      if (isDisabled) {
        console.log('[IntakeQ] Save button disabled - checking for auto-save...');

        // Check if "Saved" indicator is present
        const savedIndicator = await this.page.$('button:has-text("Saved"), .btn:has-text("Saved")');
        if (savedIndicator) {
          console.log('[IntakeQ] ✓ Note auto-saved');
          return;
        }

        // Wait a bit and try clicking anyway (might become enabled)
        await this.page.waitForTimeout(2000);
      }

      // Try clicking the save button
      try {
        await saveButton.click({ timeout: 5000 });
        console.log('[IntakeQ] ✓ Clicked Save');
        await this.page.waitForTimeout(2000);
      } catch (e) {
        // Button might be disabled due to auto-save - check for Saved indicator
        const savedIndicator = await this.page.$('button:has-text("Saved"), .btn:has-text("Saved")');
        if (savedIndicator) {
          console.log('[IntakeQ] ✓ Note already saved (auto-save)');
          return;
        }
        throw new Error('Save button not clickable and no Saved indicator found');
      }
    } else {
      // Check if already saved
      const savedIndicator = await this.page.$('button:has-text("Saved"), .btn:has-text("Saved")');
      if (savedIndicator) {
        console.log('[IntakeQ] ✓ Note already saved');
        return;
      }
      throw new Error('Save button not found');
    }
  }

  /**
   * Get the note ID from the current page URL
   */
  private async getNoteId(): Promise<string | null> {
    if (!this.page) return null;

    const url = this.page.url();

    // Try itemId parameter
    const itemIdMatch = url.match(/itemId=([a-f0-9-]+)/i);
    if (itemIdMatch) {
      return itemIdMatch[1];
    }

    // Try notes path
    const urlMatch = url.match(/notes\/([a-f0-9-]+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    return null;
  }

  /**
   * Lock the note
   */
  private async lockNote(): Promise<void> {
    if (!this.page) return;

    // Find Lock button in the header (y between 100-150)
    const lockButtons = await this.page.$$('button:has-text("Lock")');
    let lockButton = null;
    for (const btn of lockButtons) {
      const box = await btn.boundingBox();
      if (box && box.y > 100 && box.y < 150) {
        lockButton = btn;
        break;
      }
    }

    if (!lockButton) {
      throw new Error('Lock button not found in note header');
    }

    await lockButton.click();
    console.log('[IntakeQ] ✓ Clicked Lock');
    await this.page.waitForTimeout(1000);

    // Handle confirmation dialog if present
    try {
      await this.page.waitForSelector(getSelector(SELECTORS.LOCK.CONFIRM_BUTTON), {
        timeout: 3000,
      });
      await this.page.click(getSelector(SELECTORS.LOCK.CONFIRM_BUTTON));
      await this.page.waitForTimeout(1000);
    } catch {
      // No confirmation dialog
    }

    // Verify locked state (Edit button appears)
    let lockVerified = false;
    for (let i = 0; i < 10; i++) {
      const editElements = await this.page.$$('button:has-text("Edit"), a:has-text("Edit")');
      for (const el of editElements) {
        const box = await el.boundingBox();
        const text = await el.textContent();
        if (box && box.y > 100 && box.y < 150 && text?.trim() === 'Edit') {
          lockVerified = true;
          break;
        }
      }
      if (lockVerified) break;
      await this.page.waitForTimeout(500);
    }

    if (!lockVerified) {
      throw new Error('Could not verify note was locked');
    }

    console.log('[IntakeQ] ✓ Note locked');
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

// ============================================================
// CONVENIENCE FUNCTION: Push Note (standalone)
// ============================================================

/**
 * Push an Epic Scribe note to IntakeQ (convenience function)
 *
 * This is a one-shot function that handles the entire flow:
 * 1. Initialize browser
 * 2. Login
 * 3. Push note
 * 4. Close browser
 *
 * @example
 * const result = await pushNoteToIntakeQ({
 *   credentials: { email: 'user@example.com', password: 'pass' },
 *   clientGuid: 'abc-123',
 *   epicScribeNote: '## Chief Complaint\nPatient presents with...',
 *   template: 'intake',
 * });
 */
export async function pushNoteToIntakeQ(options: {
  credentials: IntakeQCredentials;
  clientGuid: string;
  epicScribeNote: string;
  template?: 'intake' | 'progress';
  signatureRequired?: boolean;
  lockAfterSave?: boolean;
  headless?: boolean;
  screenshotDir?: string;
}): Promise<CreateNoteResult> {
  const automation = new IntakeQAutomation({
    headless: options.headless ?? true,
    screenshotDir: options.screenshotDir ?? './screenshots',
  });

  try {
    await automation.initialize();
    await automation.login(options.credentials);

    return await automation.pushNoteToIntakeQ(
      options.clientGuid,
      options.epicScribeNote,
      {
        template: options.template,
        signatureRequired: options.signatureRequired,
        lockAfterSave: options.lockAfterSave,
      }
    );
  } finally {
    await automation.close();
  }
}
