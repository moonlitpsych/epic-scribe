/**
 * FHIR-to-Context Transform
 *
 * Converts HealthKitClinicalData into a clinically organized text block
 * for inclusion in the AI prompt. Optimized for psychiatry workflows.
 */

import type { HealthKitClinicalData, MedicationSummary } from '@epic-scribe/types';
import { isPsychMed, getPsychMedClass } from './psych-med-classifier';
import { groupLabsByPanel } from './lab-panel-grouper';

/**
 * Build a clinical context string from HealthKit data for prompt injection.
 */
export function buildHealthKitContext(data: HealthKitClinicalData): string {
  const sections: string[] = [];

  // CURRENT MEDICATIONS (psychiatric first, then other)
  if (data.medications && data.medications.length > 0) {
    sections.push(buildMedicationsSection(data.medications));
  }

  // ACTIVE DIAGNOSES
  if (data.conditions && data.conditions.length > 0) {
    sections.push(buildConditionsSection(data.conditions));
  }

  // RECENT LABS (grouped by panel, abnormals flagged)
  if (data.labResults && data.labResults.length > 0) {
    sections.push(buildLabsSection(data.labResults));
  }

  // MOST RECENT VITALS
  if (data.vitalSigns && data.vitalSigns.length > 0) {
    sections.push(buildVitalsSection(data.vitalSigns));
  }

  // ALLERGIES
  if (data.allergies && data.allergies.length > 0) {
    sections.push(buildAllergiesSection(data.allergies));
  }

  // PROCEDURES
  if (data.procedures && data.procedures.length > 0) {
    sections.push(buildProceduresSection(data.procedures));
  }

  // PREVIOUS CLINICAL NOTES (most recent narrative)
  if (data.clinicalNotes && data.clinicalNotes.length > 0) {
    sections.push(buildNotesSection(data.clinicalNotes));
  }

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n');
}

function buildMedicationsSection(meds: MedicationSummary[]): string {
  const psych: MedicationSummary[] = [];
  const other: MedicationSummary[] = [];

  for (const med of meds) {
    if (isPsychMed(med.rxNormCode, med.name)) {
      psych.push(med);
    } else {
      other.push(med);
    }
  }

  let section = 'CURRENT MEDICATIONS:';

  if (psych.length > 0) {
    section += '\n  Psychiatric Medications:';
    for (const med of psych) {
      const medClass = getPsychMedClass(med.name);
      const classLabel = medClass ? ` [${medClass}]` : '';
      section += `\n    - ${formatMed(med)}${classLabel}`;
    }
  }

  if (other.length > 0) {
    section += '\n  Other Medications:';
    for (const med of other) {
      section += `\n    - ${formatMed(med)}`;
    }
  }

  return section;
}

function formatMed(med: MedicationSummary): string {
  let str = med.name;
  if (med.dose) str += ` ${med.dose}`;
  if (med.frequency) str += ` ${med.frequency}`;
  if (med.status && med.status !== 'active') str += ` (${med.status})`;
  return str;
}

function buildConditionsSection(conditions: import('@epic-scribe/types').ConditionSummary[]): string {
  const active = conditions.filter(c => !c.clinicalStatus || c.clinicalStatus === 'active');
  const inactive = conditions.filter(c => c.clinicalStatus && c.clinicalStatus !== 'active');

  let section = 'ACTIVE DIAGNOSES:';

  for (const cond of active) {
    let line = `\n  - ${cond.displayName}`;
    if (cond.icd10Code) line += ` (${cond.icd10Code})`;
    if (cond.onsetDate) line += ` — onset ${cond.onsetDate}`;
    section += line;
  }

  if (inactive.length > 0) {
    section += '\n  Resolved/Inactive:';
    for (const cond of inactive) {
      let line = `\n    - ${cond.displayName}`;
      if (cond.icd10Code) line += ` (${cond.icd10Code})`;
      if (cond.clinicalStatus) line += ` [${cond.clinicalStatus}]`;
      section += line;
    }
  }

  return section;
}

function buildLabsSection(labs: import('@epic-scribe/types').LabResultSummary[]): string {
  const grouped = groupLabsByPanel(labs);
  let section = 'RECENT LABS:';

  for (const [panelName, panelLabs] of Object.entries(grouped)) {
    section += `\n  ${panelName}:`;
    for (const lab of panelLabs) {
      const abnormalFlag = lab.isAbnormal ? ' **ABNORMAL**' : '';
      let line = `\n    - ${lab.name}: ${lab.value}`;
      if (lab.units) line += ` ${lab.units}`;
      if (lab.referenceRange) line += ` (ref: ${lab.referenceRange})`;
      line += abnormalFlag;
      if (lab.collectionDate) line += ` [${lab.collectionDate}]`;
      section += line;
    }
  }

  return section;
}

function buildVitalsSection(vitals: import('@epic-scribe/types').VitalSignSummary[]): string {
  let section = 'MOST RECENT VITALS:';

  for (const vital of vitals) {
    let line = `\n  - ${vital.name}: ${vital.value}`;
    if (vital.units) line += ` ${vital.units}`;
    if (vital.recordedDate) line += ` [${vital.recordedDate}]`;
    section += line;
  }

  return section;
}

function buildAllergiesSection(allergies: import('@epic-scribe/types').AllergySummary[]): string {
  let section = 'ALLERGIES:';

  for (const allergy of allergies) {
    let line = `\n  - ${allergy.substance}`;
    if (allergy.reaction) line += ` — ${allergy.reaction}`;
    if (allergy.severity) line += ` (${allergy.severity})`;
    section += line;
  }

  return section;
}

function buildProceduresSection(procedures: import('@epic-scribe/types').ProcedureSummary[]): string {
  let section = 'PROCEDURES:';

  for (const proc of procedures) {
    let line = `\n  - ${proc.name}`;
    if (proc.date) line += ` [${proc.date}]`;
    if (proc.cptCode) line += ` (CPT: ${proc.cptCode})`;
    section += line;
  }

  return section;
}

function buildNotesSection(notes: import('@epic-scribe/types').ClinicalNoteSummary[]): string {
  // Sort by date descending and take the most recent
  const sorted = [...notes].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const mostRecent = sorted[0];
  let section = 'PREVIOUS CLINICAL NOTE (from Health Records):';
  section += `\n  Title: ${mostRecent.title}`;
  section += `\n  Date: ${mostRecent.date}`;
  if (mostRecent.author) section += `\n  Author: ${mostRecent.author}`;
  if (mostRecent.encounterType) section += `\n  Type: ${mostRecent.encounterType}`;

  // Truncate narrative if very long (keep first ~2000 chars)
  const narrative = mostRecent.narrativeText;
  if (narrative.length > 2000) {
    section += `\n  Content:\n${narrative.substring(0, 2000)}...\n  [truncated — ${narrative.length} total characters]`;
  } else {
    section += `\n  Content:\n${narrative}`;
  }

  return section;
}
