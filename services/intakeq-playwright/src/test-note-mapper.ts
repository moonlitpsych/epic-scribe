/**
 * Test the note mapper against the sample patient note
 *
 * This test:
 * 1. Reads the sample Epic Scribe note
 * 2. Maps it to IntakeQ sections
 * 3. Extracts diagnoses
 * 4. Prints the results
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildIntakeQNote,
  extractSection,
  extractDiagnoses,
  KYLE_ROLLER_INTAKE_MAPPING,
} from './note-mapper';

// Read the sample note
const sampleNotePath = path.join(__dirname, '../../../SAMPLE_PATIENT_NOTE.md');
let sampleNote: string;

try {
  sampleNote = fs.readFileSync(sampleNotePath, 'utf-8');
  console.log('=== Note Mapper Test ===\n');
  console.log(`Loaded sample note: ${sampleNotePath}`);
  console.log(`Note length: ${sampleNote.length} characters\n`);
} catch (e) {
  console.error('Failed to load sample note:', e);
  process.exit(1);
}

// Test section extraction
console.log('=== Testing Section Extraction ===\n');

const sectionsToTest = [
  'Chief Complaint',
  'History (HPI)',
  'History of Present Illness',
  'Past Psychiatric History',
  'Psychiatric Review of Symptoms',
  'Social History',
  'Current Medications',
  'Review of Systems',
  'Mental Status Examination',
  'Risk Assessment',
  'FORMULATION',
  'DIAGNOSIS',
  'PLAN',
];

for (const sectionName of sectionsToTest) {
  const content = extractSection(sampleNote, sectionName);
  if (content) {
    const preview = content.substring(0, 100).replace(/\n/g, ' ');
    console.log(`✓ ${sectionName}:`);
    console.log(`  "${preview}..."\n`);
  } else {
    console.log(`✗ ${sectionName}: NOT FOUND\n`);
  }
}

// Test diagnosis extraction
console.log('\n=== Testing Diagnosis Extraction ===\n');

const diagnoses = extractDiagnoses(sampleNote);
console.log(`Found ${diagnoses.length} diagnoses:\n`);

for (const dx of diagnoses) {
  console.log(`  ${dx.code}: ${dx.description}`);
}

// Test the full mapping
console.log('\n\n=== Testing Full Note Mapping ===\n');

const mappedNote = buildIntakeQNote(sampleNote, { template: 'intake' });

console.log(`Template: ${mappedNote.templateName}`);
console.log(`Sections mapped: ${mappedNote.sections.length}`);
console.log(`Diagnoses found: ${mappedNote.diagnoses.length}\n`);

console.log('--- Mapped Sections ---\n');

for (const section of mappedNote.sections) {
  const preview = section.value.substring(0, 80).replace(/\n/g, ' ');
  console.log(`Section ${section.sectionNumber}: ${section.questionText} (${section.fieldType})`);
  console.log(`  "${preview}..."\n`);
}

console.log('\n--- Diagnoses to Add ---\n');

for (const dx of mappedNote.diagnoses) {
  console.log(`  ${dx.code}: ${dx.description}`);
}

// Summary
console.log('\n\n=== Summary ===\n');

const expectedSections = KYLE_ROLLER_INTAKE_MAPPING.length;
const mappedSections = mappedNote.sections.length;
const missingCount = expectedSections - mappedSections;

console.log(`Expected sections: ${expectedSections}`);
console.log(`Mapped sections: ${mappedSections}`);
console.log(`Missing sections: ${missingCount}`);
console.log(`Diagnoses: ${mappedNote.diagnoses.length}`);

if (missingCount === 0) {
  console.log('\n✅ All sections mapped successfully!');
} else {
  console.log(`\n⚠️ ${missingCount} sections could not be mapped from the note.`);
  console.log('This may be expected if some sections are not present in this note type.');
}
