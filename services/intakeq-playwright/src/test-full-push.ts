/**
 * Test Full Push: Epic Scribe Note → IntakeQ
 *
 * This is the complete end-to-end test that:
 * 1. Reads the sample Epic Scribe note
 * 2. Maps it to IntakeQ format
 * 3. Creates the note in IntakeQ for TestingPt Test
 * 4. Fills all sections
 * 5. Adds diagnoses
 * 6. Saves and locks
 *
 * Uses test patient: TestingPt Test
 */

import * as fs from 'fs';
import * as path from 'path';
import { pushNoteToIntakeQ } from './intakeq-automation';

// Test patient - use this for all testing
const TEST_PATIENT = {
  name: 'TestingPt Test',
  guid: '420b2da2-6678-4036-b54a-62b2d22ae1f9',
};

// IntakeQ credentials
const CREDENTIALS = {
  email: 'hello@trymoonlit.com',
  password: '2LB8VMvP@edQO$4k',
};

async function testFullPush() {
  console.log('=== Full Push Test: Epic Scribe → IntakeQ ===\n');
  console.log(`Test Patient: ${TEST_PATIENT.name}`);
  console.log(`GUID: ${TEST_PATIENT.guid}\n`);

  // Read the sample note
  const sampleNotePath = path.join(__dirname, '../../../SAMPLE_PATIENT_NOTE.md');
  let sampleNote: string;

  try {
    sampleNote = fs.readFileSync(sampleNotePath, 'utf-8');
    console.log(`Loaded sample note: ${sampleNotePath}`);
    console.log(`Note length: ${sampleNote.length} characters\n`);
  } catch (e) {
    console.error('Failed to load sample note:', e);
    process.exit(1);
  }

  // Add a test marker to the note so we can identify it
  const testMarker = `[TEST PUSH ${new Date().toISOString()}]`;
  const noteWithMarker = sampleNote.replace(
    /Chief Complaint:\s*\n/,
    `Chief Complaint:\n${testMarker}\n`
  );

  console.log('Starting push to IntakeQ...\n');
  console.log('=' .repeat(50));

  const result = await pushNoteToIntakeQ({
    credentials: CREDENTIALS,
    clientGuid: TEST_PATIENT.guid,
    epicScribeNote: noteWithMarker,
    template: 'intake',
    lockAfterSave: true,
    headless: false,  // Set to true for production
    screenshotDir: '/Users/macsweeney/Projects/epic-scribe/services/intakeq-playwright/screenshots',
  });

  console.log('=' .repeat(50));
  console.log('\n=== RESULT ===\n');

  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`   Note ID: ${result.noteId || 'N/A'}`);
    console.log(`   Note URL: ${result.noteUrl}`);
  } else {
    console.log('❌ FAILED');
    console.log(`   Error: ${result.error}`);
  }

  console.log('\n=== Test Complete ===');

  return result;
}

// Run the test
testFullPush().then((result) => {
  process.exit(result.success ? 0 : 1);
});
