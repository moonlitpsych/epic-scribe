#!/usr/bin/env node

/**
 * Test script for note generation API
 * Tests mock mode first, then can be used with real API key
 */

const sampleTranscript = `Patient is a young adult artist presenting for initial psychiatric evaluation. She reports long-standing anxiety dating back to childhood, describing it as "a lifetime of walking on eggshells." She grew up out of state in a home environment characterized by significant parental conflict where she served as a mediator and emotional support for both parents, leading to chronic hypervigilance and anxiety.

She moved to the area over a decade ago after getting married. Her husband works in medical research at the local university. She works as an artist at a shop in a nearby town, specializing in fantasy and fairy tale themed artwork. She reports a supportive relationship with her husband, who works in mental health and has observed notable changes in her behavior around her parents - describing her as "shutting down" and "turning into a different person" when they visit, in contrast to her confident professional persona.

She has been on Lexapro 10mg daily for approximately 2-3 years with good efficacy for anxiety management. However, she reports significant emotional blunting, particularly noting inability to feel excitement or positive emotions. She describes getting a new job and feeling excited cognitively but unable to experience the emotional component, stating "I cannot chemically feel that way." She is motivated to taper off Lexapro to "fully live" and experience the full range of emotions while managing anxiety through therapy.

Current anxiety is well-controlled on medication. She denies current suicidal or homicidal ideation, history of psychiatric hospitalizations, manic episodes, psychotic symptoms, or eating disorder. No formal ADHD or autism diagnosis, though her husband has suggested possible autism spectrum traits based on sensory sensitivities and overstimulation. She reports hyperfocus ability, particularly with her artwork where she can work for 8 hours without breaks.

Substance use includes occasional marijuana use (approximately once weekly for stress relief) and coffee (2 cups daily maximum). Denies nicotine or other substance use.

She has never participated in therapy previously and is motivated to begin. She lives in a nearby mountain town with her husband. She presents as insightful, articulate, and engaged in treatment planning.`;

async function testPromptPreview() {
  console.log('\n🔍 Testing Prompt Preview API...\n');

  try {
    const response = await fetch('http://localhost:3002/api/prompts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setting: 'HMHI Downtown RCC',
        visitType: 'Intake',
        transcript: sampleTranscript
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Preview failed:', error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Prompt compiled successfully');
    console.log(`   Hash: ${data.hash}`);
    console.log(`   Word count: ${data.metadata.wordCount}`);
    console.log(`   Stats:`, data.stats);

    return data;
  } catch (error) {
    console.error('❌ Preview request failed:', error.message);
    return null;
  }
}

async function testNoteGeneration() {
  console.log('\n📝 Testing Note Generation API...\n');

  try {
    const response = await fetch('http://localhost:3002/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setting: 'HMHI Downtown RCC',
        visitType: 'Intake',
        transcript: sampleTranscript
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Generation failed:', error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Note generated successfully');
    console.log(`   Receipt ID: ${data.receipt.id}`);
    console.log(`   Prompt Hash: ${data.receipt.promptHash}`);
    console.log(`   Template: ${data.receipt.templateId}`);

    if (data.validationIssues && data.validationIssues.length > 0) {
      console.log(`\n⚠️  Validation Issues (${data.validationIssues.length}):`);
      data.validationIssues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. [${issue.type}] ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      Suggestion: ${issue.suggestion}`);
        }
      });
    } else {
      console.log('   ✅ No validation issues');
    }

    return data;
  } catch (error) {
    console.error('❌ Generation request failed:', error.message);
    return null;
  }
}

function validateSmartTools(note) {
  console.log('\n🔧 Validating SmartTools Compliance...\n');

  const issues = [];

  // Check for unconverted SmartLinks (@identifier@)
  const smartLinkPattern = /@[A-Za-z0-9_]+@/g;
  const unconvertedLinks = note.match(smartLinkPattern);
  if (unconvertedLinks) {
    issues.push({
      type: 'SmartLinks',
      severity: 'ERROR',
      message: `Found ${unconvertedLinks.length} unconverted SmartLinks: ${unconvertedLinks.join(', ')}`
    });
  }

  // Check for SmartLists with selections
  const smartListPattern = /\{([^:}]+):(\d+)(?:::\s*"([^"]*)")?\}/g;
  let match;
  let smartListCount = 0;
  let smartListWithSelections = 0;

  while ((match = smartListPattern.exec(note)) !== null) {
    smartListCount++;
    if (match[3]) {
      smartListWithSelections++;
    } else {
      issues.push({
        type: 'SmartLists',
        severity: 'ERROR',
        message: `SmartList missing selection: ${match[0]}`
      });
    }
  }

  // Check for DotPhrases (should have some)
  const dotPhrasePattern = /\.[A-Za-z0-9_]+/g;
  const dotPhrases = note.match(dotPhrasePattern);
  const dotPhraseCount = dotPhrases ? dotPhrases.length : 0;

  // Check for bullet points or numbered lists
  if (/^\s*[-*•]/m.test(note)) {
    issues.push({
      type: 'Format',
      severity: 'ERROR',
      message: 'Found bullet points (should be paragraphs only)'
    });
  }

  if (/^\s*\d+\./m.test(note)) {
    issues.push({
      type: 'Format',
      severity: 'ERROR',
      message: 'Found numbered lists (should be paragraphs only)'
    });
  }

  // Check for remaining wildcards
  const wildcardCount = (note.match(/\*\*\*/g) || []).length;

  // Report
  console.log('📊 SmartTools Statistics:');
  console.log(`   DotPhrases: ${dotPhraseCount}`);
  console.log(`   SmartLists: ${smartListCount} (${smartListWithSelections} with selections)`);
  console.log(`   Remaining Wildcards: ${wildcardCount}`);

  if (issues.length === 0) {
    console.log('\n✅ All SmartTools validation checks passed!');
  } else {
    console.log(`\n❌ Found ${issues.length} validation issues:\n`);
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. [${issue.severity}] ${issue.type}: ${issue.message}`);
    });
  }

  return issues;
}

function analyzeNote(note) {
  console.log('\n📋 Note Analysis...\n');

  const lines = note.split('\n');
  const paragraphs = note.split('\n\n').filter(p => p.trim());
  const words = note.split(/\s+/).filter(w => w).length;
  const chars = note.length;

  console.log(`   Lines: ${lines.length}`);
  console.log(`   Paragraphs: ${paragraphs.length}`);
  console.log(`   Words: ${words}`);
  console.log(`   Characters: ${chars}`);

  // Extract section headers (lines with all caps or ending in colon)
  const headers = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 &&
           (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':'));
  });

  if (headers.length > 0) {
    console.log(`\n   📑 Sections found (${headers.length}):`);
    headers.slice(0, 10).forEach(header => {
      console.log(`      - ${header.substring(0, 60)}${header.length > 60 ? '...' : ''}`);
    });
  }
}

// Main execution
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         Epic Scribe - Note Generation Test Suite         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Test 1: Preview Prompt
  const previewData = await testPromptPreview();
  if (!previewData) {
    console.log('\n❌ Preview test failed. Aborting.');
    process.exit(1);
  }

  // Test 2: Generate Note
  const generationData = await testNoteGeneration();
  if (!generationData) {
    console.log('\n❌ Generation test failed. Aborting.');
    process.exit(1);
  }

  // Test 3: Validate SmartTools
  const validationIssues = validateSmartTools(generationData.note);

  // Test 4: Analyze Note
  analyzeNote(generationData.note);

  // Save note to file for inspection
  const fs = await import('fs');
  const outputPath = '/Users/macsweeney/Projects/epic-scribe/test-output.txt';
  fs.writeFileSync(outputPath, generationData.note);
  console.log(`\n💾 Note saved to: ${outputPath}`);

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`   Preview: ✅ Passed`);
  console.log(`   Generation: ✅ Passed`);
  console.log(`   Validation: ${validationIssues.length === 0 ? '✅ Passed' : '❌ Failed'}`);
  console.log('');

  process.exit(validationIssues.length === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});