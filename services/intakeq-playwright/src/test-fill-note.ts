/**
 * Test filling IntakeQ note form with actual psychiatric note content
 *
 * Form structure (Kyle Roller Intake Note):
 * - Section 1: Demographics (auto-filled)
 * - Section 2: CC (Chief Complaint) - input field
 * - Sections 3+: Rich text editors (content-N textareas are hidden backing stores)
 */

import { IntakeQAutomation } from './intakeq-automation';

// Sample psychiatric note content for testing
const SAMPLE_NOTE_CONTENT = {
  chiefComplaint: 'Patient presents for follow-up of depression and anxiety.',

  hpi: `42-year-old male with history of Major Depressive Disorder and Generalized Anxiety Disorder presents for medication management follow-up.

Patient reports improvement in mood since last visit. Sleep has improved from 4-5 hours to 6-7 hours nightly.`,

  psychiatricROS: `Depression: Improved mood, better concentration
Anxiety: Occasional worry, manageable
Sleep: 6-7 hours, improved
Suicidal ideation: Denies`,

  socialHistory: `Lives with wife and two children. Works as software engineer. Good support system.`,

  mentalStatusExam: `Appearance: Well-groomed
Behavior: Cooperative
Mood: "Better"
Affect: Euthymic
Thought Content: No SI/HI`,

  assessmentAndPlan: `Assessment:
1. MDD - improving
2. GAD - stable

Plan:
1. Continue sertraline 100mg daily
2. Follow-up in 4 weeks`,
};

async function testFillNote() {
  console.log('=== IntakeQ Form Fill Test (Rich Text Editor) ===\n');

  const clientGuid = 'f75ba0b0-a565-4f0c-b3c7-bba881750300';

  const automation = new IntakeQAutomation({
    headless: false,
    slowMo: 50,
    screenshotDir: '/Users/macsweeney/Projects/epic-scribe/services/intakeq-playwright/screenshots',
  });

  try {
    console.log('1. Initializing and logging in...');
    await automation.initialize();
    await automation.login({
      email: 'hello@trymoonlit.com',
      password: '2LB8VMvP@edQO$4k',
    });

    console.log('2. Navigating to client and opening note...');
    await automation.navigateToClient(clientGuid);

    const page = (automation as any).page;

    // Open Add Note
    await page.click('.btn-group.btn-success.add-new');
    await page.waitForTimeout(500);
    await page.click('a:has-text("Create New Note")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    console.log('3. Note editor loaded\n');

    // Fill CC field
    console.log('4. Filling CC (Chief Complaint)...');
    const ccInput = await page.$('input[placeholder="Chief Complaint"], textarea[placeholder="Chief Complaint"]');
    if (ccInput) {
      await ccInput.fill(SAMPLE_NOTE_CONTENT.chiefComplaint);
      console.log('   ✓ CC filled');
    }

    let screenshot = await automation.screenshot('01-cc-filled');
    console.log(`   Screenshot: ${screenshot}\n`);

    // For rich text editors, we need to find the editable areas
    // These are typically contenteditable divs or iframes
    console.log('5. Looking for rich text editor areas...\n');

    // Find all contenteditable elements
    const editableDivs = await page.$$('[contenteditable="true"]');
    console.log(`   Found ${editableDivs.length} contenteditable elements`);

    // Find all iframes (TinyMCE style)
    const iframes = await page.$$('iframe');
    console.log(`   Found ${iframes.length} iframes`);

    // Find visible textareas (not hidden)
    const visibleTextareas = await page.$$eval('textarea', (els: HTMLTextAreaElement[]) => {
      return els
        .filter(el => el.offsetParent !== null) // Check visibility
        .map((el, i) => ({
          index: i,
          name: el.name,
          placeholder: el.placeholder,
          visible: true,
        }));
    });
    console.log(`   Visible textareas: ${JSON.stringify(visibleTextareas)}`);

    // Look for the rich text editor pattern in IntakeQ
    // IntakeQ might use a specific class for their editors
    console.log('\n6. Exploring form sections...\n');

    // Scroll down to see more sections
    await page.evaluate(() => (window as Window).scrollBy(0, 400));
    await page.waitForTimeout(500);

    screenshot = await automation.screenshot('02-scrolled-down');
    console.log(`   Screenshot: ${screenshot}`);

    // Look for panels/sections with headers
    const panels = await page.$$('.panel, .card, [class*="block"]');
    console.log(`   Found ${panels.length} panels/sections`);

    // Try to find and fill the HPI section
    console.log('\n7. Attempting to fill HPI section...');

    // Find the HPI label
    const hpiLabel = await page.$('text="HPI"');
    if (hpiLabel) {
      await hpiLabel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Look for an editable area near the HPI label
      // Click on the section area
      const hpiSection = await page.$('text="HPI" >> xpath=ancestor::*[contains(@class, "panel") or contains(@class, "section") or contains(@class, "block")][1]');
      if (hpiSection) {
        // Look for contenteditable or textarea within this section
        const hpiEditor = await hpiSection.$('[contenteditable="true"], .ql-editor, .note-editable, .fr-element');
        if (hpiEditor) {
          await hpiEditor.click();
          await page.waitForTimeout(200);
          await page.keyboard.type(SAMPLE_NOTE_CONTENT.hpi.substring(0, 100));
          console.log('   ✓ HPI filled via contenteditable');
        } else {
          // Try finding textarea that's visible
          const hpiTextarea = await hpiSection.$('textarea:not([style*="display: none"])');
          if (hpiTextarea) {
            await hpiTextarea.click({ force: true });
            await page.waitForTimeout(200);
            await hpiTextarea.fill(SAMPLE_NOTE_CONTENT.hpi);
            console.log('   ✓ HPI filled via textarea');
          }
        }
      }
    }

    screenshot = await automation.screenshot('03-after-hpi');
    console.log(`   Screenshot: ${screenshot}`);

    // Try a different approach: click directly on the visible editor areas
    console.log('\n8. Trying click-and-type approach on visible editors...\n');

    // Find all editor-like elements
    const editorSelectors = [
      '.ql-editor',           // Quill editor
      '.note-editable',       // Summernote
      '.fr-element',          // Froala
      '[contenteditable="true"]',
      '.mce-content-body',    // TinyMCE
      '.ProseMirror',         // ProseMirror
    ];

    for (const selector of editorSelectors) {
      const editors = await page.$$(selector);
      if (editors.length > 0) {
        console.log(`   Found ${editors.length} editors with selector: ${selector}`);

        for (let i = 0; i < Math.min(editors.length, 3); i++) {
          const editor = editors[i];
          const box = await editor.boundingBox();
          if (box && box.height > 30) {
            console.log(`   Editor ${i}: height=${box.height}, y=${box.y}`);

            // Try filling this editor
            await editor.scrollIntoViewIfNeeded();
            await editor.click();
            await page.waitForTimeout(200);

            // Select all and replace
            await page.keyboard.press('Control+A');
            await page.keyboard.type(`Sample content for editor ${i}`);

            console.log(`   ✓ Filled editor ${i}`);
          }
        }
        break;
      }
    }

    // Take final screenshots
    console.log('\n9. Taking final screenshots...');

    await page.evaluate(() => (window as Window).scrollTo(0, 0));
    await page.waitForTimeout(300);
    screenshot = await automation.screenshot('04-final-top');
    console.log(`   Screenshot: ${screenshot}`);

    await page.evaluate(() => (window as Window).scrollBy(0, 600));
    await page.waitForTimeout(300);
    screenshot = await automation.screenshot('05-final-middle');
    console.log(`   Screenshot: ${screenshot}`);

    // Wait to observe
    console.log('\n10. Pausing for 15 seconds to observe...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await automation.screenshot('error-fill-note');
  } finally {
    await automation.close();
  }
}

testFillNote();
