/**
 * Test navigating to a client in IntakeQ
 */

import { IntakeQAutomation } from './intakeq-automation';

async function testClientNavigation() {
  console.log('=== IntakeQ Client Navigation Test ===\n');

  // Damien Thompson - GUID from IntakeQ API
  const clientGuid = 'f75ba0b0-a565-4f0c-b3c7-bba881750300';
  const clientName = 'Damien Thompson';
  console.log(`1. Using client: ${clientName} (GUID: ${clientGuid})\n`);

  // Now test browser navigation
  const automation = new IntakeQAutomation({
    headless: false,
    slowMo: 100,
    screenshotDir: '/Users/macsweeney/Projects/epic-scribe/services/intakeq-playwright/screenshots',
  });

  try {
    console.log('2. Initializing browser...');
    await automation.initialize();

    console.log('3. Logging in...');
    await automation.login({
      email: 'hello@trymoonlit.com',
      password: '2LB8VMvP@edQO$4k',
    });
    console.log('   ✓ Logged in\n');

    console.log(`4. Navigating to client ${clientGuid}...`);
    await automation.navigateToClient(clientGuid);
    console.log('   ✓ Client page loaded\n');

    // Take screenshot
    const screenshot = await automation.screenshot('client-page');
    console.log(`   Screenshot: ${screenshot}\n`);

    // Wait to see
    console.log('5. Pausing for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n=== Test completed successfully! ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await automation.screenshot('error-client-nav');
  } finally {
    await automation.close();
  }
}

testClientNavigation();
