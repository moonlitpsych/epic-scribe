/**
 * Profile-to-Context Transform
 *
 * Converts a StructuredPatientProfile into a clinically organized text block
 * for inclusion in the AI prompt. Replaces the raw historical notes dump.
 */

import type { StructuredPatientProfile } from '@epic-scribe/types';

/**
 * Build prompt context text from a patient profile.
 */
export function buildProfileContext(profile: StructuredPatientProfile): string {
  const sections: string[] = [];

  const noteCount = profile.sourceNoteCount;
  const lastDate = profile.lastNoteDate || profile.lastUpdated?.split('T')[0] || 'unknown';

  sections.push(
    `STRUCTURED PATIENT PROFILE (from ${noteCount} previous note${noteCount !== 1 ? 's' : ''}, last updated ${lastDate}):\n` +
    `Use this structured data for carry-forward sections. Do NOT use *** for information present in the profile.\n` +
    `The visit transcript is the PRIMARY source for today's narrative. If transcript contradicts the profile, trust the transcript.`
  );

  // ACTIVE DIAGNOSES
  const activeDx = profile.diagnoses.filter(d => d.status === 'active');
  if (activeDx.length > 0) {
    let s = 'ACTIVE DIAGNOSES:';
    for (const dx of activeDx) {
      s += `\n- ${dx.name}`;
      if (dx.icd10Code) s += ` (${dx.icd10Code})`;
      if (dx.firstDocumentedDate) s += ` — first documented ${dx.firstDocumentedDate}`;
    }
    sections.push(s);
  }

  // Resolved/in-remission diagnoses
  const resolvedDx = profile.diagnoses.filter(d => d.status !== 'active');
  if (resolvedDx.length > 0) {
    let s = 'RESOLVED/IN-REMISSION DIAGNOSES:';
    for (const dx of resolvedDx) {
      s += `\n- ${dx.name}`;
      if (dx.icd10Code) s += ` (${dx.icd10Code})`;
      s += ` — ${dx.status}`;
    }
    sections.push(s);
  }

  // CURRENT MEDICATIONS
  if (profile.currentMedications.length > 0) {
    let s = 'CURRENT MEDICATIONS:';
    for (const med of profile.currentMedications) {
      let line = `\n- ${med.name}`;
      if (med.dose) line += ` ${med.dose}`;
      if (med.frequency) line += ` ${med.frequency}`;
      if (med.route) line += ` (${med.route})`;
      if (med.indication) line += ` for ${med.indication}`;
      if (med.response) line += ` — response: ${med.response}`;
      if (med.sideEffects && med.sideEffects.length > 0) {
        line += ` — side effects: ${med.sideEffects.join(', ')}`;
      }
      s += line;
    }
    sections.push(s);
  }

  // PAST PSYCHIATRIC MEDICATIONS
  if (profile.pastMedications.length > 0) {
    let s = 'PAST PSYCHIATRIC MEDICATIONS:';
    for (const med of profile.pastMedications) {
      let line = `\n- ${med.name}`;
      if (med.dose) line += ` ${med.dose}`;
      if (med.response) line += ` — response: ${med.response}`;
      if (med.reasonDiscontinued) line += ` — d/c: ${med.reasonDiscontinued}`;
      if (med.sideEffects && med.sideEffects.length > 0) {
        line += ` — side effects: ${med.sideEffects.join(', ')}`;
      }
      s += line;
    }
    sections.push(s);
  }

  // PSYCHIATRIC HISTORY
  const psych = profile.psychiatricHistory;
  const psychParts: string[] = [];
  if (psych.hospitalizations.length > 0) {
    psychParts.push(`Hospitalizations:\n${psych.hospitalizations.map(h => `  - ${h}`).join('\n')}`);
  }
  if (psych.suicideAttempts.length > 0) {
    psychParts.push(`Suicide Attempts:\n${psych.suicideAttempts.map(a => `  - ${a}`).join('\n')}`);
  }
  if (psych.selfHarm.length > 0) {
    psychParts.push(`Self-Harm:\n${psych.selfHarm.map(s => `  - ${s}`).join('\n')}`);
  }
  if (psych.priorTreatments.length > 0) {
    psychParts.push(`Prior Treatments:\n${psych.priorTreatments.map(t => `  - ${t}`).join('\n')}`);
  }
  if (psych.priorDiagnoses.length > 0) {
    psychParts.push(`Prior Diagnoses: ${psych.priorDiagnoses.join(', ')}`);
  }
  if (psych.traumaHistory) {
    psychParts.push(`Trauma History: ${psych.traumaHistory}`);
  }
  if (psychParts.length > 0) {
    sections.push(`PSYCHIATRIC HISTORY:\n${psychParts.join('\n')}`);
  }

  // FAMILY PSYCHIATRIC HISTORY
  if (profile.familyHistory.entries.length > 0) {
    let s = 'FAMILY PSYCHIATRIC HISTORY:';
    for (const entry of profile.familyHistory.entries) {
      s += `\n- ${entry.relation}: ${entry.condition}`;
      if (entry.details) s += ` (${entry.details})`;
    }
    sections.push(s);
  }

  // SOCIAL HISTORY
  const social = profile.socialHistory;
  const socialParts: string[] = [];
  if (social.livingSituation) socialParts.push(`Living Situation: ${social.livingSituation}`);
  if (social.employment) socialParts.push(`Employment: ${social.employment}`);
  if (social.relationships) socialParts.push(`Relationships: ${social.relationships}`);
  if (social.education) socialParts.push(`Education: ${social.education}`);
  if (social.legal) socialParts.push(`Legal: ${social.legal}`);
  if (social.supportSystem) socialParts.push(`Support System: ${social.supportSystem}`);
  if (social.additionalDetails && social.additionalDetails.length > 0) {
    socialParts.push(`Additional: ${social.additionalDetails.join('; ')}`);
  }
  if (socialParts.length > 0) {
    sections.push(`SOCIAL HISTORY:\n${socialParts.join('\n')}`);
  }

  // SUBSTANCE USE HISTORY
  if (profile.substanceUse.substances.length > 0) {
    let s = 'SUBSTANCE USE HISTORY:';
    for (const sub of profile.substanceUse.substances) {
      let line = `\n- ${sub.substance}: ${sub.pattern}`;
      if (sub.frequency) line += ` (${sub.frequency})`;
      if (sub.sobrietyDate) line += ` — sober since ${sub.sobrietyDate}`;
      if (sub.consequences && sub.consequences.length > 0) {
        line += ` — consequences: ${sub.consequences.join(', ')}`;
      }
      s += line;
    }
    sections.push(s);
  }

  // ALLERGIES
  if (profile.allergies.length > 0) {
    let s = 'ALLERGIES:';
    for (const a of profile.allergies) {
      s += `\n- ${a.substance}`;
      if (a.reaction) s += `: ${a.reaction}`;
      if (a.severity) s += ` (${a.severity})`;
    }
    sections.push(s);
  }

  // MEDICAL HISTORY
  if (profile.medicalHistory.conditions.length > 0) {
    sections.push(`MEDICAL HISTORY:\n${profile.medicalHistory.conditions.map(c => `- ${c}`).join('\n')}`);
  }

  // TREATMENT THEMES
  const themes = profile.treatmentThemes;
  const themeParts: string[] = [];
  if (themes.formulation) {
    themeParts.push(`Clinical Formulation: ${themes.formulation}`);
  }
  if (themes.keyThemes.length > 0) {
    themeParts.push(`Key Themes: ${themes.keyThemes.join('; ')}`);
  }
  if (themes.standingPlanItems.length > 0) {
    themeParts.push(`Standing Plan Items:\n${themes.standingPlanItems.map(i => `  - ${i}`).join('\n')}`);
  }
  if (themeParts.length > 0) {
    sections.push(`TREATMENT THEMES:\n${themeParts.join('\n')}`);
  }

  return sections.join('\n\n');
}
