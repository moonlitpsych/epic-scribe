#!/usr/bin/env node

/**
 * Test script to verify note saving functionality
 * Run this after applying the database migration
 */

const TEST_API_URL = process.env.API_URL || 'http://localhost:3002';

async function testNoteSaving() {
  console.log('🧪 Testing Note Saving Functionality\n');
  console.log('API URL:', TEST_API_URL);
  console.log('=====================================\n');

  // Test data
  const testNote = {
    patientId: 'test-patient-id', // You'll need to replace with a real patient ID
    templateId: 'test-template',
    promptVersion: '1.0.0',
    promptHash: 'test-hash-' + Date.now(),
    generatedContent: 'This is a test generated note content.',
    finalNoteContent: 'This is the edited final note content.',
    isFinal: true,
  };

  try {
    console.log('📤 Sending test note to API...\n');

    const response = await fetch(`${TEST_API_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testNote),
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('Raw response:', responseText);
      responseData = { error: 'Failed to parse response' };
    }

    console.log('📥 Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(responseData, null, 2));
    console.log('\n=====================================\n');

    if (response.status === 401) {
      console.log('❌ AUTHENTICATION REQUIRED');
      console.log('   You need to be signed in to save notes.');
      console.log('   Please sign in at: ' + TEST_API_URL + '/auth/signin');
      return false;
    }

    if (response.status === 500) {
      console.log('❌ SERVER ERROR');

      if (responseData.message?.includes('Database schema')) {
        console.log('\n📋 DATABASE MIGRATION REQUIRED:');
        console.log('   1. Go to your Supabase Dashboard');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Run the migration script from:');
        console.log('      scripts/apply-note-migration.sql');
        console.log('\n   Or run this simpler command:');
        console.log('      supabase/migrations/010_add_note_content_fields.sql');
      } else {
        console.log('   Error:', responseData.message || 'Unknown error');
      }
      return false;
    }

    if (response.status === 400) {
      console.log('❌ BAD REQUEST');
      console.log('   Missing required fields:', responseData.missing);
      console.log('   Message:', responseData.message);
      return false;
    }

    if (response.ok) {
      console.log('✅ SUCCESS! Note saved successfully');
      console.log('   Note ID:', responseData.note?.id);
      return true;
    }

    console.log('❌ Unexpected response:', response.status);
    return false;

  } catch (error) {
    console.log('❌ CONNECTION ERROR');
    console.log('   Could not connect to the API.');
    console.log('   Make sure the dev server is running:');
    console.log('   pnpm dev');
    console.log('\n   Error:', error.message);
    return false;
  }
}

// Run the test
console.log('Starting Note Saving Test...\n');

testNoteSaving().then(success => {
  if (success) {
    console.log('\n🎉 Note saving is working correctly!');
    console.log('   You can now save generated notes to patients.');
  } else {
    console.log('\n⚠️  Note saving is not working yet.');
    console.log('   Please follow the instructions above to fix the issue.');
    console.log('   See FIX_NOTE_SAVING.md for detailed steps.');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});