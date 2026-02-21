/**
 * FHIR-to-Context Transform
 *
 * Converts HealthKitClinicalData into a clinically organized text block
 * for inclusion in the AI prompt. Optimized for psychiatry workflows.
 *
 * Key design decisions:
 * - Only active medications shown by default; recently stopped (<6mo) in separate section
 * - Psychiatric meds listed first with drug class labels
 * - Vitals deduplicated to most recent reading per type
 * - Labs limited to most recent per panel
 * - Clinical notes limited to most recent narrative
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

  // RECENT LABS (grouped by panel, most recent per panel)
  if (data.labResults && data.labResults.length > 0) {
    sections.push(buildLabsSection(data.labResults));
  }

  // MOST RECENT VITALS (deduplicated to latest per type)
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

  // PREVIOUS CLINICAL NOTE (most recent narrative only)
  if (data.clinicalNotes && data.clinicalNotes.length > 0) {
    sections.push(buildNotesSection(data.clinicalNotes));
  }

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n');
}

// ── Medications ──────────────────────────────────────────────────────────────

function buildMedicationsSection(meds: MedicationSummary[]): string {
  // Deduplicate by name — keep most recent entry per medication name
  const dedupMap = new Map<string, MedicationSummary>();
  for (const med of meds) {
    const key = med.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const existing = dedupMap.get(key);
    if (!existing || (med.startDate && (!existing.startDate || med.startDate > existing.startDate))) {
      dedupMap.set(key, med);
    }
  }
  const deduped = Array.from(dedupMap.values());

  // Split by status
  const active = deduped.filter(m => m.status === 'active' || !m.status);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentlyStopped = deduped.filter(m =>
    m.status === 'stopped' &&
    m.startDate &&
    new Date(m.startDate) > sixMonthsAgo
  );

  // Split active into psychiatric vs other
  const activePsych = active.filter(m => isPsychMed(m.rxNormCode, m.name));
  const activeOther = active.filter(m => !isPsychMed(m.rxNormCode, m.name));
  const stoppedPsych = recentlyStopped.filter(m => isPsychMed(m.rxNormCode, m.name));

  let section = 'CURRENT MEDICATIONS:';

  if (activePsych.length > 0) {
    section += '\n  Psychiatric Medications:';
    for (const med of activePsych) {
      const medClass = getPsychMedClass(med.name);
      const classLabel = medClass ? ` [${medClass}]` : '';
      section += `\n    - ${formatMed(med)}${classLabel}`;
    }
  }

  if (activeOther.length > 0) {
    section += '\n  Other Medications:';
    for (const med of activeOther) {
      section += `\n    - ${formatMed(med)}`;
    }
  }

  if (stoppedPsych.length > 0) {
    section += '\n  Recently Discontinued (psychiatric):';
    for (const med of stoppedPsych) {
      const medClass = getPsychMedClass(med.name);
      const classLabel = medClass ? ` [${medClass}]` : '';
      section += `\n    - ${formatMed(med)}${classLabel}`;
    }
  }

  if (activePsych.length === 0 && activeOther.length === 0) {
    section += '\n  No active medications on record';
  }

  return section;
}

function formatMed(med: MedicationSummary): string {
  let str = med.name;
  if (med.dose) str += ` ${med.dose}`;
  if (med.route) str += `, ${med.route}`;
  if (med.frequency) str += `, ${med.frequency}`;
  if (med.prn) str += ' PRN';
  if (med.status && med.status !== 'active') str += ` (${med.status})`;
  if (med.startDate) str += ` — started ${med.startDate}`;
  if (med.instructions) str += `\n      Note: ${med.instructions.split('\n')[0]}`;
  return str;
}

// ── Conditions ───────────────────────────────────────────────────────────────

function buildConditionsSection(conditions: import('@epic-scribe/types').ConditionSummary[]): string {
  const active = conditions.filter(c => !c.clinicalStatus || c.clinicalStatus === 'active');
  const inactive = conditions.filter(c => c.clinicalStatus && c.clinicalStatus !== 'active');

  let section = 'ACTIVE DIAGNOSES:';

  if (active.length > 0) {
    for (const cond of active) {
      let line = `\n  - ${cond.displayName}`;
      if (cond.icd10Code) line += ` (${cond.icd10Code})`;
      if (cond.onsetDate) line += ` — onset ${cond.onsetDate}`;
      section += line;
    }
  } else {
    section += '\n  None on record';
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

// ── Labs ─────────────────────────────────────────────────────────────────────

function buildLabsSection(labs: import('@epic-scribe/types').LabResultSummary[]): string {
  // Sort all labs by date descending
  const sorted = [...labs].sort((a, b) => {
    const dateA = a.collectionDate ? new Date(a.collectionDate).getTime() : 0;
    const dateB = b.collectionDate ? new Date(b.collectionDate).getTime() : 0;
    return dateB - dateA;
  });

  // Deduplicate: keep only the most recent result per lab name
  const seenNames = new Set<string>();
  const mostRecent: typeof labs = [];
  for (const lab of sorted) {
    const key = lab.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      mostRecent.push(lab);
    }
  }

  const grouped = groupLabsByPanel(mostRecent);
  let section = 'RECENT LABS (most recent result per test):';

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

// ── Vitals ───────────────────────────────────────────────────────────────────

function buildVitalsSection(vitals: import('@epic-scribe/types').VitalSignSummary[]): string {
  // Sort by date descending
  const sorted = [...vitals].sort((a, b) => {
    const dateA = a.recordedDate ? new Date(a.recordedDate).getTime() : 0;
    const dateB = b.recordedDate ? new Date(b.recordedDate).getTime() : 0;
    return dateB - dateA;
  });

  // Deduplicate: keep only the most recent reading per vital type
  const seenTypes = new Set<string>();
  const mostRecent: typeof vitals = [];
  for (const vital of sorted) {
    const key = vital.name.toLowerCase().trim();
    if (!seenTypes.has(key)) {
      seenTypes.add(key);
      mostRecent.push(vital);
    }
  }

  let section = 'MOST RECENT VITALS:';

  for (const vital of mostRecent) {
    let line = `\n  - ${vital.name}: ${vital.value}`;
    if (vital.units) line += ` ${vital.units}`;
    if (vital.recordedDate) line += ` [${vital.recordedDate}]`;
    section += line;
  }

  return section;
}

// ── Allergies ────────────────────────────────────────────────────────────────

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

// ── Procedures ───────────────────────────────────────────────────────────────

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

// ── Clinical Notes ───────────────────────────────────────────────────────────

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
