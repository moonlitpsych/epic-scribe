/**
 * Explore IntakeQ Note Form Fields
 *
 * This script opens a note in IntakeQ and logs all available form fields/sections
 * to help build the Epic Scribe → IntakeQ field mapping.
 *
 * Uses TestingPt Test patient
 */

import { IntakeQAutomation } from './intakeq-automation';

const TEST_PATIENT = {
  name: 'TestingPt Test',
  guid: '420b2da2-6678-4036-b54a-62b2d22ae1f9',
};

interface FormField {
  index: number;
  sectionNumber?: string;
  label?: string;
  type: 'input' | 'textarea' | 'contenteditable' | 'select' | 'unknown';
  placeholder?: string;
  name?: string;
  id?: string;
  currentValue?: string;
}

async function exploreFields() {
  console.log('=== IntakeQ Form Field Explorer ===\n');
  console.log(`Test Patient: ${TEST_PATIENT.name}\n`);

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

    console.log('2. Navigating to test patient...');
    await automation.navigateToClient(TEST_PATIENT.guid);

    const page = (automation as any).page;

    // Create a new note
    console.log('3. Creating new note...');
    await page.click('.btn-group.btn-success.add-new');
    await page.waitForTimeout(500);
    await page.click('a:has-text("Create New Note")');
    await page.waitForTimeout(1000);

    // List available templates
    console.log('\n=== Available Templates ===');
    const templateSelect = await page.$('.modal select');
    if (templateSelect) {
      const options = await templateSelect.$$('option');
      for (let i = 0; i < options.length; i++) {
        const text = await options[i].textContent();
        console.log(`  ${i}: "${text?.trim()}"`);
      }
    }

    // Select "Kyle Roller Intake Note" for full exploration (has more fields)
    console.log('\n4. Selecting "Kyle Roller Intake Note" template...');
    if (templateSelect) {
      await templateSelect.selectOption({ label: 'Kyle Roller Intake Note' });
    }
    await page.waitForTimeout(500);

    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(3000);

    console.log('\n=== Exploring Form Structure ===\n');

    // Take a screenshot first
    let screenshot = await automation.screenshot('explore-01-note-loaded');
    console.log(`Screenshot: ${screenshot}\n`);

    // Find all sections/panels
    console.log('Looking for form sections...\n');

    // IntakeQ notes have numbered sections with headers
    // Look for section headers
    const sectionHeaders = await page.$$('.panel-heading, .card-header, [class*="section-header"], [class*="block-header"]');
    console.log(`Found ${sectionHeaders.length} section headers`);

    // Look for all labels
    const labels = await page.$$('label');
    console.log(`Found ${labels.length} labels`);

    // Look for all inputs
    const inputs = await page.$$('input[type="text"], textarea, [contenteditable="true"], select');
    console.log(`Found ${inputs.length} input elements\n`);

    // Now let's extract detailed information
    console.log('=== Detailed Form Analysis ===\n');

    // Get all form blocks/panels
    const formBlocks = await page.$$('.panel, .card, [class*="block"], [class*="question"]');
    console.log(`Found ${formBlocks.length} form blocks\n`);

    // Analyze the page structure
    console.log('--- Looking for numbered sections ---\n');

    // IntakeQ uses numbered badges for sections
    const sectionBadges = await page.$$('.badge, [class*="number"], [class*="index"]');
    for (const badge of sectionBadges) {
      const text = await badge.textContent();
      const box = await badge.boundingBox();
      if (text?.trim().match(/^\d+$/)) {
        console.log(`Section ${text?.trim()} at y=${box?.y}`);
      }
    }

    // Scroll through the form and analyze each section
    console.log('\n--- Analyzing form fields by scrolling ---\n');

    const fields: FormField[] = [];
    let lastY = 0;
    const scrollStep = 400;
    let scrollAttempts = 0;
    const maxScrolls = 10;

    while (scrollAttempts < maxScrolls) {
      // Find all fillable elements currently visible
      const fillableElements = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]:not(.btn)');

      for (const el of fillableElements) {
        try {
          const box = await el.boundingBox();
          if (!box || box.height < 10) continue;

          const tagName = await el.evaluate((e: Element) => e.tagName.toLowerCase());
          const elType = await el.getAttribute('type');
          const placeholder = await el.getAttribute('placeholder');
          const name = await el.getAttribute('name');
          const id = await el.getAttribute('id');
          const contentEditable = await el.getAttribute('contenteditable');

          // Try to find the label for this element
          let label = '';

          // Look for label by "for" attribute
          if (id) {
            const labelEl = await page.$(`label[for="${id}"]`);
            if (labelEl) {
              label = (await labelEl.textContent())?.trim() || '';
            }
          }

          // Look for label in parent container
          if (!label) {
            const parent = await el.evaluateHandle((e: Element) => e.closest('.panel, .card, [class*="block"], [class*="question"], .form-group'));
            if (parent) {
              const parentLabel = await parent.$('label, .panel-title, .card-title, [class*="label"], [class*="title"], h3, h4');
              if (parentLabel) {
                label = (await parentLabel.textContent())?.trim() || '';
              }
            }
          }

          // Look for preceding text
          if (!label && placeholder) {
            label = placeholder;
          }

          // Determine field type
          let fieldType: FormField['type'] = 'unknown';
          if (tagName === 'input') fieldType = 'input';
          else if (tagName === 'textarea') fieldType = 'textarea';
          else if (tagName === 'select') fieldType = 'select';
          else if (contentEditable === 'true') fieldType = 'contenteditable';

          // Check if we already have this field
          const existingField = fields.find(f =>
            (id && f.id === id) ||
            (name && f.name === name) ||
            (box && f.index === Math.round(box.y))
          );

          if (!existingField) {
            fields.push({
              index: Math.round(box.y),
              label: label.substring(0, 50),
              type: fieldType,
              placeholder: placeholder || undefined,
              name: name || undefined,
              id: id || undefined,
            });
          }
        } catch (e) {
          // Element might have been removed
        }
      }

      // Scroll down
      await page.evaluate((step: number) => window.scrollBy(0, step), scrollStep);
      await page.waitForTimeout(300);

      const currentY = await page.evaluate(() => window.scrollY);
      if (currentY === lastY) {
        // Reached bottom
        break;
      }
      lastY = currentY;
      scrollAttempts++;
    }

    // Sort fields by position
    fields.sort((a, b) => a.index - b.index);

    // Print the results
    console.log('\n=== FORM FIELDS FOUND ===\n');
    console.log('Index | Type          | Label/Placeholder');
    console.log('------|---------------|------------------');

    for (const field of fields) {
      const typeStr = field.type.padEnd(13);
      const labelStr = field.label || field.placeholder || field.name || '(no label)';
      console.log(`${String(field.index).padStart(5)} | ${typeStr} | ${labelStr}`);
    }

    console.log(`\nTotal fields found: ${fields.length}`);

    // Scroll back to top and take final screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Now let's look specifically at the section structure
    console.log('\n\n=== SECTION STRUCTURE ===\n');

    // IntakeQ sections often have a number badge and a title
    // Let's look for the pattern: number + title + content
    const allText = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, .panel-title, .card-title, [class*="section"], [class*="title"]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 100),
        className: el.className,
      }));
    });

    for (const item of allText) {
      if (item.text && item.text.length > 2) {
        console.log(`${item.tag}: "${item.text}"`);
      }
    }

    // Take final screenshots scrolling through
    console.log('\n\n=== Taking screenshots of entire form ===\n');

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    for (let i = 0; i < 5; i++) {
      screenshot = await automation.screenshot(`explore-section-${i + 1}`);
      console.log(`Screenshot ${i + 1}: ${screenshot}`);
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }

    // Wait to observe
    console.log('\n\nPausing for 15 seconds to manually inspect...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('\n=== Exploration complete ===');

  } catch (error) {
    console.error('\n❌ Exploration failed:', error);
    await automation.screenshot('error-explore');
  } finally {
    await automation.close();
  }
}

exploreFields();
