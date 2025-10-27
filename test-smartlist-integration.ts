/**
 * Test script to verify SmartList integration
 * Run with: npx tsx test-smartlist-integration.ts
 */

import { getSmartListService } from './services/note/src/smartlists/smartlist-service';
import { getPromptBuilder } from './services/note/src/prompts/prompt-builder';
import { templateService } from './services/note/src/templates/template-service';

async function testSmartListIntegration() {
  console.log('=== SmartList Integration Test ===\n');

  // 1. Test SmartList Service Loading
  console.log('1. Testing SmartList Service...');
  const smartListService = await getSmartListService();
  const allSmartLists = smartListService.getAllSmartLists();
  console.log(`   ✓ Loaded ${allSmartLists.length} SmartLists from catalog`);

  // Check for key SmartLists
  const expectedIds = [
    'BH Hospitalizations',
    'Suicide History',
    'Medication Compliance',
    'Mood',
    'Sleep Quality',
    'Appetite',
    'Risk Level',
    'Prognosis'
  ];

  const foundIds: string[] = [];
  const missingIds: string[] = [];

  expectedIds.forEach(id => {
    const smartList = smartListService.getSmartList(id);
    if (smartList) {
      foundIds.push(id);
      console.log(`   ✓ Found: ${id} (${smartList.epicId})`);
    } else {
      missingIds.push(id);
      console.log(`   ✗ Missing: ${id}`);
    }
  });

  if (missingIds.length > 0) {
    console.log(`\n   ⚠️  Warning: ${missingIds.length} SmartLists not found`);
    return false;
  }

  console.log('');

  // 2. Test Template SmartList Extraction
  console.log('2. Testing Template SmartList Extraction...');
  const template = templateService.getTemplate('HMHI Downtown RCC', 'Intake');
  if (!template) {
    console.log('   ✗ Template not found');
    return false;
  }
  console.log(`   ✓ Loaded template: ${template.name}`);

  // Count SmartLists in template
  const smartListPattern = /\{([^:}]+):(\d+)\}/g;
  let templateSmartListCount = 0;
  template.sections.forEach(section => {
    const matches = section.content.match(smartListPattern);
    if (matches) {
      templateSmartListCount += matches.length;
    }
  });
  console.log(`   ✓ Found ${templateSmartListCount} SmartList references in template`);
  console.log('');

  // 3. Test Prompt Building
  console.log('3. Testing Prompt Builder...');
  const promptBuilder = await getPromptBuilder();

  const testTranscript = `
Patient is a 35 year old presenting for initial evaluation.
They report depressed mood for the past 3 months, with poor sleep and decreased appetite.
Previous psychiatric history includes one hospitalization in 2020.
Currently not taking any medications.
Denies current suicidal ideation but reports past attempt in 2019.
  `.trim();

  const compiledPrompt = await promptBuilder.build({
    template,
    transcript: testTranscript,
    setting: 'HMHI Downtown RCC',
    visitType: 'Intake'
  });

  console.log(`   ✓ Compiled prompt: ${compiledPrompt.hash}`);
  console.log(`   ✓ Word count: ${compiledPrompt.metadata.wordCount}`);
  console.log(`   ✓ SmartList definitions length: ${compiledPrompt.sections.smartlistDefinitions.length} chars`);

  if (compiledPrompt.sections.smartlistDefinitions.length === 0) {
    console.log('   ✗ ERROR: No SmartList definitions in prompt!');
    return false;
  }

  // Check that SmartList definitions contain expected content
  const hasDefinitionHeader = compiledPrompt.sections.smartlistDefinitions.includes('=== SMARTLIST DEFINITIONS ===');
  const hasAllowedValues = compiledPrompt.sections.smartlistDefinitions.includes('Allowed values:');
  const hasFormatExample = compiledPrompt.sections.smartlistDefinitions.includes('Format: {');

  console.log(`   ${hasDefinitionHeader ? '✓' : '✗'} Contains definition header`);
  console.log(`   ${hasAllowedValues ? '✓' : '✗'} Contains allowed values`);
  console.log(`   ${hasFormatExample ? '✓' : '✗'} Contains format examples`);

  if (!hasDefinitionHeader || !hasAllowedValues || !hasFormatExample) {
    console.log('\n   ✗ ERROR: SmartList definitions incomplete');
    return false;
  }

  // Print a sample of the SmartList definitions
  console.log('\n4. Sample SmartList Definition:');
  const lines = compiledPrompt.sections.smartlistDefinitions.split('\n');
  const sampleStart = lines.findIndex(l => l.includes('SmartList:'));
  if (sampleStart >= 0) {
    console.log(lines.slice(sampleStart, sampleStart + 10).map(l => `   ${l}`).join('\n'));
  }

  console.log('\n=== All Tests Passed ✓ ===\n');

  // 5. Print full prompt structure summary
  console.log('5. Compiled Prompt Structure:');
  console.log(`   - System: ${compiledPrompt.sections.system.length} chars`);
  console.log(`   - Task: ${compiledPrompt.sections.task.length} chars`);
  console.log(`   - SmartTools Rules: ${compiledPrompt.sections.smarttoolsRules.length} chars`);
  console.log(`   - SmartList Definitions: ${compiledPrompt.sections.smartlistDefinitions.length} chars`);
  console.log(`   - Template: ${compiledPrompt.sections.template.length} chars`);
  console.log(`   - Transcript: ${compiledPrompt.sections.transcript.length} chars`);
  console.log(`   - Total: ${compiledPrompt.prompt.length} chars`);

  return true;
}

// Run the test
testSmartListIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
