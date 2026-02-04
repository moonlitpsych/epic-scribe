/**
 * Test script for IntakeQ Playwright automation
 *
 * Run with: npx ts-node test-login.ts
 */

import { IntakeQAutomation } from './intakeq-automation';

async function testLogin() {
  console.log('=== IntakeQ Playwright Test ===\n');

  const automation = new IntakeQAutomation({
    headless: false,  // Show browser for debugging
    slowMo: 100,      // Slow down for visibility
    screenshotDir: '/Users/macsweeney/Projects/epic-scribe/services/intakeq-playwright/screenshots',
  });

  try {
    // Initialize browser
    console.log('1. Initializing browser...');
    await automation.initialize();
    console.log('   ✓ Browser initialized\n');

    // Navigate to login page and take screenshot
    console.log('2. Navigating to login page directly...');
    // @ts-ignore - accessing private page for testing
    const page = automation['page']!;
    await page.goto('https://intakeq.com/signin');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('   Current URL:', automation.getCurrentUrl());

    // Log page content for debugging
    const pageContent = await page.content();
    console.log('   Page title:', await page.title());
    console.log('   Has email input:', pageContent.includes('email'));
    console.log('   Has password input:', pageContent.includes('password'));

    const loginScreenshot = await automation.screenshot('login-page');
    console.log(`   Screenshot saved: ${loginScreenshot}\n`);

    // Login
    console.log('3. Attempting login...');
    await automation.login({
      email: process.env.INTAKEQ_USER_EMAIL || 'hello@trymoonlit.com',
      password: process.env.INTAKEQ_USER_PASSWORD || '2LB8VMvP@edQO$4k',
    });
    console.log('   ✓ Login successful\n');

    // Take screenshot of dashboard
    console.log('3. Taking screenshot of dashboard...');
    const screenshotPath = await automation.screenshot('dashboard');
    console.log(`   ✓ Screenshot saved: ${screenshotPath}\n`);

    // Wait a moment to see the dashboard
    console.log('4. Pausing for 5 seconds (view the browser)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n=== Test completed successfully! ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error);

    // Take error screenshot
    try {
      const errorScreenshot = await automation.screenshot('error');
      console.log(`   Error screenshot: ${errorScreenshot}`);
    } catch {
      // Ignore screenshot error
    }
  } finally {
    console.log('\n5. Closing browser...');
    await automation.close();
    console.log('   ✓ Browser closed');
  }
}

testLogin();
