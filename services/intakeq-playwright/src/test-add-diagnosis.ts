/**
 * Test the Add Diagnosis flow in IntakeQ
 *
 * Flow:
 * 1. Open note editor
 * 2. Click More button in header
 * 3. Click "Add Diagnosis"
 * 4. Search for ICD-10 code
 * 5. Select diagnosis from results
 * 6. Verify diagnosis was added
 */

import { IntakeQAutomation } from './intakeq-automation';

// Test diagnosis - Major Depressive Disorder
const TEST_DIAGNOSIS = {
  code: 'F32.1',
  description: 'Major depressive disorder, single episode, moderate',
};

async function testAddDiagnosis() {
  console.log('=== IntakeQ Add Diagnosis Test ===\n');

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

    let screenshot = await automation.screenshot('01-note-editor');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 4: Click the More button in the note header
    console.log('4. Clicking More button in note header...');

    // The More button is in the header bar (around y=110-130)
    const moreButton = await page.$('button.dropdown-toggle:has-text("More")');
    if (!moreButton) {
      throw new Error('More button not found');
    }

    // Verify it's the right More button (not the top nav)
    const box = await moreButton.boundingBox();
    console.log(`   More button position: (${box?.x}, ${box?.y})`);

    if (box && box.y > 100 && box.y < 150) {
      await moreButton.click();
      console.log('   ✓ Clicked More button');
    } else {
      // Find the correct More button by position
      const allMoreButtons = await page.$$('button:has-text("More")');
      for (const btn of allMoreButtons) {
        const btnBox = await btn.boundingBox();
        if (btnBox && btnBox.y > 100 && btnBox.y < 150) {
          await btn.click();
          console.log('   ✓ Clicked More button (by position)');
          break;
        }
      }
    }

    await page.waitForTimeout(500);

    screenshot = await automation.screenshot('02-more-menu-open');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 5: Click "Add Diagnosis"
    console.log('5. Clicking "Add Diagnosis"...');

    const addDiagnosisLink = await page.$('a:has-text("Add Diagnosis")');
    if (addDiagnosisLink) {
      await addDiagnosisLink.click();
      console.log('   ✓ Clicked Add Diagnosis');
    } else {
      // Try text selector
      await page.click('text=Add Diagnosis');
      console.log('   ✓ Clicked Add Diagnosis (via text)');
    }

    await page.waitForTimeout(1000);

    screenshot = await automation.screenshot('03-diagnosis-modal');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 6: Explore the diagnosis modal/panel
    console.log('6. Exploring diagnosis interface...\n');

    // Look for search input
    const searchSelectors = [
      'input[placeholder*="diagnosis" i]',
      'input[placeholder*="ICD" i]',
      'input[placeholder*="search" i]',
      'input[type="text"]',
      '.diagnosis-search input',
      '.modal input',
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
      const input = await page.$(selector);
      if (input) {
        const isVisible = await input.isVisible();
        if (isVisible) {
          const placeholder = await input.getAttribute('placeholder');
          console.log(`   Found search input: ${selector} (placeholder: "${placeholder}")`);
          searchInput = input;
          break;
        }
      }
    }

    if (!searchInput) {
      console.log('   Looking for any visible input...');
      const inputs = await page.$$('input[type="text"], input:not([type])');
      for (const input of inputs) {
        const isVisible = await input.isVisible();
        const box = await input.boundingBox();
        if (isVisible && box) {
          console.log(`   Visible input at (${box.x}, ${box.y})`);
          searchInput = input;
          break;
        }
      }
    }

    // Step 7: Search for diagnosis
    console.log(`\n7. Searching for diagnosis: ${TEST_DIAGNOSIS.code}...`);

    if (searchInput) {
      await searchInput.click();
      await page.waitForTimeout(200);
      await searchInput.fill(TEST_DIAGNOSIS.code);
      console.log(`   ✓ Entered search term: ${TEST_DIAGNOSIS.code}`);

      await page.waitForTimeout(1500); // Wait for search results

      screenshot = await automation.screenshot('04-search-results');
      console.log(`   Screenshot: ${screenshot}\n`);

      // Step 8: Look for and click on the diagnosis result
      console.log('8. Looking for diagnosis in results...');

      // Look for result items
      const resultSelectors = [
        `.list-group-item:has-text("${TEST_DIAGNOSIS.code}")`,
        `tr:has-text("${TEST_DIAGNOSIS.code}")`,
        `div:has-text("${TEST_DIAGNOSIS.code}")`,
        `li:has-text("${TEST_DIAGNOSIS.code}")`,
        `[class*="result"]:has-text("${TEST_DIAGNOSIS.code}")`,
        `[class*="item"]:has-text("${TEST_DIAGNOSIS.code}")`,
      ];

      let resultFound = false;
      for (const selector of resultSelectors) {
        try {
          const result = await page.$(selector);
          if (result) {
            const isVisible = await result.isVisible();
            if (isVisible) {
              const text = await result.textContent();
              console.log(`   Found result: "${text?.substring(0, 60)}..."`);

              // Click on it
              await result.click();
              console.log(`   ✓ Clicked on diagnosis result`);
              resultFound = true;

              await page.waitForTimeout(500);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!resultFound) {
        // Try clicking the first clickable result
        console.log('   Trying to find any clickable result...');
        const allResults = await page.$$('.list-group-item, tr, [class*="item"]');
        for (const result of allResults) {
          const text = await result.textContent();
          if (text?.includes('F32') || text?.includes('depress')) {
            console.log(`   Found potential match: "${text?.substring(0, 50)}..."`);
            await result.click();
            resultFound = true;
            break;
          }
        }
      }

      screenshot = await automation.screenshot('05-after-select');
      console.log(`   Screenshot: ${screenshot}`);
    }

    // Step 9: Close the diagnosis panel/modal
    console.log('\n9. Looking for close/done button...');

    const closeSelectors = [
      'button:has-text("Done")',
      'button:has-text("Close")',
      'button:has-text("Save")',
      'button:has-text("Apply")',
      '.modal-footer button.btn-primary',
      '[aria-label="Close"]',
    ];

    for (const selector of closeSelectors) {
      const closeBtn = await page.$(selector);
      if (closeBtn) {
        const isVisible = await closeBtn.isVisible();
        if (isVisible) {
          const text = await closeBtn.textContent();
          console.log(`   Found close button: "${text?.trim()}"`);
          await closeBtn.click();
          console.log('   ✓ Clicked close button');
          break;
        }
      }
    }

    await page.waitForTimeout(1000);

    screenshot = await automation.screenshot('06-diagnosis-added');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Step 10: Verify diagnosis was added
    console.log('10. Verifying diagnosis was added...');

    // Look for the diagnosis code or text on the page
    const diagnosisOnPage = await page.$(`text="${TEST_DIAGNOSIS.code}"`);
    if (diagnosisOnPage) {
      console.log(`   ✓ Diagnosis ${TEST_DIAGNOSIS.code} visible on page!`);
    } else {
      // Check for any diagnosis-related elements
      const diagElements = await page.$$('[class*="diagnosis"], [class*="icd"]');
      console.log(`   Found ${diagElements.length} diagnosis-related elements`);
    }

    // Wait to observe
    console.log('\n11. Pausing for 10 seconds to observe...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await automation.screenshot('error-diagnosis');
  } finally {
    await automation.close();
  }
}

testAddDiagnosis();
