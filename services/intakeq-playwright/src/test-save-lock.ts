/**
 * Test the Save and Lock flow in IntakeQ
 *
 * Using test patient: TestingPt Test
 * GUID: 420b2da2-6678-4036-b54a-62b2d22ae1f9
 * IntakeQ ID: 155
 *
 * Flow:
 * 1. Login
 * 2. Navigate to test patient
 * 3. Create a new note
 * 4. Fill some test content
 * 5. Save the note
 * 6. Lock the note
 * 7. Verify locked state
 */

import { IntakeQAutomation } from './intakeq-automation';

// Test patient - use this for all testing to avoid polluting real patient records
const TEST_PATIENT = {
  name: 'TestingPt Test',
  guid: '420b2da2-6678-4036-b54a-62b2d22ae1f9',
  intakeqId: 155,
};

// Sample content for testing
const TEST_NOTE_CONTENT = {
  chiefComplaint: '[TEST] Save/Lock flow test - ' + new Date().toISOString(),
};

async function testSaveLock() {
  console.log('=== IntakeQ Save and Lock Test ===\n');
  console.log(`Test Patient: ${TEST_PATIENT.name}`);
  console.log(`GUID: ${TEST_PATIENT.guid}\n`);

  const automation = new IntakeQAutomation({
    headless: false,
    slowMo: 100,
    screenshotDir: '/Users/macsweeney/Projects/epic-scribe/services/intakeq-playwright/screenshots',
  });

  try {
    // Step 1: Initialize and login
    console.log('1. Initializing and logging in...');
    await automation.initialize();
    await automation.login({
      email: 'hello@trymoonlit.com',
      password: '2LB8VMvP@edQO$4k',
    });
    console.log('   ✓ Login successful\n');

    // Step 2: Navigate to test patient
    console.log('2. Navigating to test patient...');
    await automation.navigateToClient(TEST_PATIENT.guid);
    console.log('   ✓ Navigated to patient page\n');

    const page = (automation as any).page;

    // Step 3: Create a new note
    console.log('3. Creating new note...');

    // Click the blue + button
    await page.click('.btn-group.btn-success.add-new');
    await page.waitForTimeout(500);

    let screenshot = await automation.screenshot('01-add-menu-open');
    console.log(`   Screenshot: ${screenshot}`);

    // Click "Create New Note"
    await page.click('a:has-text("Create New Note")');
    await page.waitForTimeout(1000);

    screenshot = await automation.screenshot('02-template-modal');
    console.log(`   Screenshot: ${screenshot}`);

    // Check if template dropdown exists and select first template
    const templateSelect = await page.$('.modal select');
    if (templateSelect) {
      const options = await templateSelect.$$('option');
      console.log(`   Found ${options.length} template options`);

      for (const opt of options) {
        const text = await opt.textContent();
        console.log(`   - Option: "${text?.trim()}"`);
      }

      // Select first non-empty option
      if (options.length > 1) {
        const firstOption = await options[1].textContent();
        console.log(`   Selecting: "${firstOption?.trim()}"`);
        await templateSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }

    // Click Continue
    await page.click('button:has-text("Continue")');
    console.log('   ✓ Clicked Continue');
    await page.waitForTimeout(3000);

    screenshot = await automation.screenshot('03-after-continue');
    console.log(`   Screenshot: ${screenshot}`);

    // Wait for note editor to load - look for specific note editor elements
    // The note editor has header buttons: Save, Lock, Print, Heidi, More, Close Note
    console.log('   Waiting for note editor...');

    // Try multiple indicators that we're in the note editor
    try {
      await Promise.race([
        page.waitForSelector('button:has-text("Lock")', { timeout: 10000 }),
        page.waitForSelector('button:has-text("Close Note")', { timeout: 10000 }),
        page.waitForSelector('[contenteditable="true"]', { timeout: 10000 }),
        page.waitForSelector('input[placeholder="Chief Complaint"]', { timeout: 10000 }),
      ]);
      console.log('   ✓ Note editor loaded\n');
    } catch (e) {
      console.log('   ⚠ Note editor indicators not found, taking screenshot...');
      screenshot = await automation.screenshot('03b-editor-not-loaded');
      console.log(`   Screenshot: ${screenshot}`);

      // Log what's on the page
      const pageText = await page.textContent('body');
      console.log(`   Page contains: ${pageText?.substring(0, 500)}`);
      throw new Error('Note editor did not load');
    }

    screenshot = await automation.screenshot('04-note-editor-loaded');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 4: Fill CC field with test content
    console.log('4. Filling test content...');

    const ccInput = await page.$('input[placeholder="Chief Complaint"], textarea[placeholder="Chief Complaint"]');
    if (ccInput) {
      await ccInput.fill(TEST_NOTE_CONTENT.chiefComplaint);
      console.log(`   ✓ CC filled: "${TEST_NOTE_CONTENT.chiefComplaint}"`);
    } else {
      console.log('   ⚠ CC field not found, continuing anyway...');
    }

    screenshot = await automation.screenshot('05-content-filled');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 5: Save the note
    console.log('5. Saving note...');

    // Find the Save button in the note header (should be around y=110-130)
    const allSaveButtons = await page.$$('button:has-text("Save")');
    let noteHeaderSaveButton = null;

    for (const btn of allSaveButtons) {
      const box = await btn.boundingBox();
      const text = await btn.textContent();
      console.log(`   Found Save button: "${text?.trim()}" at (${box?.x}, ${box?.y})`);

      // The note header Save button should be at y < 150 and not "Save Comment"
      if (box && box.y < 150 && box.y > 50 && !text?.includes('Comment')) {
        noteHeaderSaveButton = btn;
        break;
      }
    }

    if (!noteHeaderSaveButton) {
      console.log('   ⚠ Note header Save button not found, looking for primary button...');
      noteHeaderSaveButton = await page.$('button.btn-primary:has-text("Save"):not(:has-text("Comment"))');
    }

    if (!noteHeaderSaveButton) {
      throw new Error('Save button not found in note header');
    }

    await noteHeaderSaveButton.click();
    console.log('   ✓ Clicked Save button');

    // Wait for save to complete
    await page.waitForTimeout(2000);

    screenshot = await automation.screenshot('06-after-save');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Check if there's a save success message
    const saveSuccess = await page.$('text="saved"') || await page.$('.alert-success');
    if (saveSuccess) {
      console.log('   ✓ Save confirmed\n');
    } else {
      console.log('   ⚠ No explicit save confirmation, assuming success\n');
    }

    // Step 6: Lock the note
    console.log('6. Locking note...');

    // Find the Lock button in the note header
    const allLockButtons = await page.$$('button:has-text("Lock")');
    let lockButton = null;

    for (const btn of allLockButtons) {
      const box = await btn.boundingBox();
      const text = await btn.textContent();
      console.log(`   Found Lock button: "${text?.trim()}" at (${box?.x}, ${box?.y})`);

      // The note header Lock button should be at y < 150
      if (box && box.y < 150 && box.y > 50) {
        lockButton = btn;
        break;
      }
    }

    if (!lockButton) {
      lockButton = await page.$('button.btn-nav:has-text("Lock")');
    }

    if (!lockButton) {
      throw new Error('Lock button not found');
    }

    const lockBox = await lockButton.boundingBox();
    console.log(`   Using Lock button at (${lockBox?.x}, ${lockBox?.y})`);

    await lockButton.click();
    console.log('   ✓ Clicked Lock button');

    await page.waitForTimeout(1000);

    screenshot = await automation.screenshot('07-after-lock-click');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 7: Handle confirmation dialog if present
    console.log('7. Checking for confirmation dialog...');

    // Look for confirmation modal/dialog
    const confirmSelectors = [
      'button:has-text("Confirm")',
      'button:has-text("Yes")',
      'button:has-text("Lock Note")',
      '.modal button.btn-primary',
      '.modal button.btn-danger',
    ];

    let confirmFound = false;
    for (const selector of confirmSelectors) {
      try {
        const confirmBtn = await page.$(selector);
        if (confirmBtn) {
          const isVisible = await confirmBtn.isVisible();
          if (isVisible) {
            const text = await confirmBtn.textContent();
            console.log(`   Found confirm button: "${text?.trim()}"`);
            await confirmBtn.click();
            console.log('   ✓ Clicked confirmation button');
            confirmFound = true;
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    if (!confirmFound) {
      console.log('   ⚠ No confirmation dialog found (may not be required)\n');
    }

    await page.waitForTimeout(2000);

    screenshot = await automation.screenshot('08-after-confirm');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 8: Verify locked state
    console.log('8. Verifying locked state...');

    // In IntakeQ, when a note is locked:
    // - The "Lock" button changes to "Edit" button
    // - Form fields become read-only (displayed as text, not inputs)

    let lockVerified = false;

    // Look for "Edit" in the header (could be button, anchor, or span)
    const editSelectors = [
      'button:has-text("Edit")',
      'a:has-text("Edit")',
      ':has-text("Edit")',
    ];

    for (const selector of editSelectors) {
      try {
        const editElements = await page.$$(selector);
        for (const el of editElements) {
          const box = await el.boundingBox();
          const text = await el.textContent();
          // Look for Edit in the header area (y between 100-150)
          if (box && box.y < 150 && box.y > 100 && text?.trim() === 'Edit') {
            console.log(`   ✓ Found "Edit" at (${box.x}, ${box.y}) - note is LOCKED`);
            lockVerified = true;
            break;
          }
        }
        if (lockVerified) break;
      } catch (e) {
        // Continue
      }
    }

    // Alternative: check that Lock button is no longer in the header
    if (!lockVerified) {
      const headerLockButtons = await page.$$('button:has-text("Lock")');
      let lockInHeader = false;
      for (const btn of headerLockButtons) {
        const box = await btn.boundingBox();
        if (box && box.y < 150 && box.y > 100) {
          lockInHeader = true;
          break;
        }
      }
      if (!lockInHeader) {
        console.log('   ✓ Lock button no longer in header - note is LOCKED');
        lockVerified = true;
      }
    }

    screenshot = await automation.screenshot('09-final-locked-state');
    console.log(`   Screenshot: ${screenshot}\n`);

    if (lockVerified) {
      console.log('\n✅ SUCCESS: Note saved and locked!\n');
    } else {
      console.log('\n⚠ Note may be locked but could not verify state\n');
    }

    // Get current URL (may contain note ID)
    const currentUrl = page.url();
    console.log(`Final URL: ${currentUrl}`);

    // Pause to observe
    console.log('\nPausing for 10 seconds to observe final state...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await automation.screenshot('error-save-lock');
  } finally {
    await automation.close();
  }
}

testSaveLock();
