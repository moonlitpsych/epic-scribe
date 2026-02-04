/**
 * Test the note header More menu and Diagnosis flow
 */

import { IntakeQAutomation } from './intakeq-automation';

async function testAddNoteFlow() {
  console.log('=== IntakeQ Note Header & Diagnosis Test ===\n');

  const clientGuid = 'f75ba0b0-a565-4f0c-b3c7-bba881750300';

  const automation = new IntakeQAutomation({
    headless: false,
    slowMo: 100,
    screenshotDir: '/Users/macsweeney/Projects/epic-scribe/services/intakeq-playwright/screenshots',
  });

  try {
    console.log('1. Initializing and logging in...');
    await automation.initialize();
    await automation.login({
      email: 'hello@trymoonlit.com',
      password: '2LB8VMvP@edQO$4k',
    });

    console.log('2. Navigating to client...');
    await automation.navigateToClient(clientGuid);

    const page = (automation as any).page;

    // Open Add Note modal
    console.log('3. Opening Add Note...');
    await page.click('.btn-group.btn-success.add-new');
    await page.waitForTimeout(500);
    await page.click('a:has-text("Create New Note")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    let screenshot = await automation.screenshot('01-note-editor');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Now focus on the note header bar
    // The header has: Save, Lock, Print, Heidi, More, Close Note
    console.log('4. Analyzing note header bar...');

    // Find all buttons in the header area (top of the note form)
    // The note header should be near the top, around y < 150
    const headerButtons = await page.$$('.btn, button');
    console.log(`   Found ${headerButtons.length} buttons`);

    for (const btn of headerButtons) {
      const box = await btn.boundingBox();
      if (box && box.y < 150 && box.y > 100) {
        const text = await btn.textContent();
        const className = await btn.getAttribute('class');
        console.log(`   Header button: text="${text?.trim()}" class="${className?.substring(0, 50)}" at (${box.x}, ${box.y})`);
      }
    }

    // Find the "More" button specifically in the note header
    // It should be between Heidi and Close Note, around x = 1100-1140
    console.log('\n5. Looking for note header More button...');

    // Try multiple selectors to find the correct More button
    const moreSelectors = [
      // The header bar might have a specific class
      '.note-header button:has-text("More")',
      '.note-toolbar button:has-text("More")',
      '.header-actions button:has-text("More")',
      // Try by position - the note header buttons are around y=110-130
      'button.dropdown-toggle:has-text("More")',
      // Try finding button near other known buttons
      'button:has-text("Lock") ~ button:has-text("More")',
    ];

    let noteMoreButton = null;
    for (const selector of moreSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          const box = await btn.boundingBox();
          const text = await btn.textContent();
          console.log(`   ${selector}: found at (${box?.x}, ${box?.y}) text="${text?.trim()}"`);
          if (box && box.y < 150 && box.y > 100) {
            noteMoreButton = btn;
            break;
          }
        }
      } catch (e) {
        // Skip
      }
    }

    // Alternative: find by examining all elements with "More" text
    if (!noteMoreButton) {
      console.log('   Trying to find More by text...');
      const moreElements = await page.$$('text=More');
      for (const el of moreElements) {
        const box = await el.boundingBox();
        const tag = await el.evaluate((e: any) => e.tagName);
        console.log(`   More element: ${tag} at (${box?.x}, ${box?.y})`);
        if (box && box.y < 150 && box.y > 100 && box.x > 1000) {
          // This is likely the note header More button
          noteMoreButton = el;
          console.log('   -> Found note header More button!');
          break;
        }
      }
    }

    // Click the More button if found
    if (noteMoreButton) {
      console.log('\n6. Clicking note header More button...');
      await noteMoreButton.click();
      await page.waitForTimeout(500);

      screenshot = await automation.screenshot('02-more-menu-open');
      console.log(`   Screenshot: ${screenshot}`);

      // Look for dropdown menu items
      console.log('\n7. Looking for dropdown menu items...');
      const dropdownItems = await page.$$('.dropdown-menu li a, .dropdown-menu button, .dropdown-menu a');
      console.log(`   Found ${dropdownItems.length} dropdown items`);

      for (const item of dropdownItems) {
        const text = await item.textContent();
        const isVisible = await item.isVisible();
        if (isVisible && text?.trim()) {
          console.log(`   - "${text?.trim()}"`);
          if (text?.toLowerCase().includes('diagnos')) {
            console.log('     ^^^ Found diagnosis option!');
          }
        }
      }
    } else {
      console.log('   Could not find note header More button');

      // Let's examine the header structure
      console.log('\n   Examining header structure...');
      const headerArea = await page.$('.note-header, .header, [class*="header"]');
      if (headerArea) {
        const html = await headerArea.evaluate((el: any) => el.innerHTML);
        console.log(`   Header HTML: ${html.substring(0, 500)}`);
      }
    }

    // Also look for Lock button to understand the flow
    console.log('\n8. Examining Lock button...');
    const lockButtons = await page.$$('button:has-text("Lock"), a:has-text("Lock")');
    for (const btn of lockButtons) {
      const box = await btn.boundingBox();
      const className = await btn.getAttribute('class');
      if (box && box.y < 150) {
        console.log(`   Lock button: class="${className}" at (${box.x}, ${box.y})`);
      }
    }

    // Wait to observe
    console.log('\n9. Pausing for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await automation.screenshot('error-add-note');
  } finally {
    await automation.close();
  }
}

testAddNoteFlow();
