/**
 * Lab Panel Grouper
 *
 * Groups lab results by clinical panel for organized display in prompts.
 * Uses LOINC codes when available, falls back to name-based grouping.
 */

import type { LabResultSummary } from '@epic-scribe/types';

interface PanelDefinition {
  name: string;
  loincCodes: string[];
  namePatterns: string[];
}

const PANELS: PanelDefinition[] = [
  {
    name: 'Complete Blood Count (CBC)',
    loincCodes: [
      '6690-2', // WBC
      '789-8',  // RBC
      '718-7',  // Hemoglobin
      '4544-3', // Hematocrit
      '787-2',  // MCV
      '785-6',  // MCH
      '786-4',  // MCHC
      '788-0',  // RDW
      '777-3',  // Platelet count
      '32623-1', // Platelet MPV
    ],
    namePatterns: ['wbc', 'rbc', 'hemoglobin', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw', 'platelet', 'white blood', 'red blood'],
  },
  {
    name: 'Basic Metabolic Panel (BMP)',
    loincCodes: [
      '2947-0', // Sodium
      '6298-4', // Potassium
      '2069-3', // Chloride
      '1963-8', // CO2
      '3094-0', // BUN
      '2160-0', // Creatinine
      '2345-7', // Glucose
      '17861-6', // Calcium
    ],
    namePatterns: ['sodium', 'potassium', 'chloride', 'co2', 'bicarbonate', 'bun', 'creatinine', 'glucose', 'calcium'],
  },
  {
    name: 'Comprehensive Metabolic Panel (CMP)',
    loincCodes: [
      '1742-6', // ALT
      '1920-8', // AST
      '6768-6', // ALP
      '1975-2', // Total bilirubin
      '2885-2', // Total protein
      '1751-7', // Albumin
    ],
    namePatterns: ['alt', 'ast', 'alkaline phosphatase', 'alp', 'bilirubin', 'total protein', 'albumin'],
  },
  {
    name: 'Thyroid Panel',
    loincCodes: [
      '3016-3', // TSH
      '3053-6', // Free T3
      '3024-7', // Free T4
      '3051-0', // T3 total
      '3026-2', // T4 total
    ],
    namePatterns: ['tsh', 'thyroid', 'free t3', 'free t4', 't3', 't4', 'thyroxine', 'triiodothyronine'],
  },
  {
    name: 'Lipid Panel',
    loincCodes: [
      '2093-3', // Total cholesterol
      '2571-8', // Triglycerides
      '2085-9', // HDL
      '13457-7', // LDL (calc)
      '2089-1', // LDL (direct)
    ],
    namePatterns: ['cholesterol', 'triglyceride', 'hdl', 'ldl', 'lipid'],
  },
  {
    name: 'Metabolic Monitoring (Antipsychotic)',
    loincCodes: [
      '4548-4', // HbA1c
      '2345-7', // Glucose
    ],
    namePatterns: ['a1c', 'hba1c', 'hemoglobin a1c', 'glycated'],
  },
  {
    name: 'Therapeutic Drug Levels',
    loincCodes: [
      '14334-7', // Lithium
      '4086-5',  // Valproic acid
      '3432-7',  // Carbamazepine
      '3968-5',  // Phenytoin
      '34928-0', // Lamotrigine
    ],
    namePatterns: ['lithium level', 'valproic acid', 'valproate', 'carbamazepine', 'depakote', 'lamotrigine', 'drug level'],
  },
  {
    name: 'Hepatic Panel',
    loincCodes: [
      '1742-6', // ALT
      '1920-8', // AST
      '6768-6', // ALP
      '1975-2', // Total bilirubin
      '1968-7', // Direct bilirubin
    ],
    namePatterns: ['hepatic', 'liver function', 'liver panel'],
  },
  {
    name: 'Urine Drug Screen',
    loincCodes: [
      '19295-5', // UDS
    ],
    namePatterns: ['urine drug', 'uds', 'drug screen', 'toxicology'],
  },
];

/**
 * Group lab results by clinical panel.
 * Labs that don't match any panel go into an "Other" group.
 */
export function groupLabsByPanel(
  labs: LabResultSummary[]
): Record<string, LabResultSummary[]> {
  const grouped: Record<string, LabResultSummary[]> = {};
  const assigned = new Set<number>();

  // First pass: match by LOINC code
  for (let i = 0; i < labs.length; i++) {
    const lab = labs[i];
    if (!lab.loincCode) continue;

    for (const panel of PANELS) {
      if (panel.loincCodes.includes(lab.loincCode)) {
        if (!grouped[panel.name]) grouped[panel.name] = [];
        grouped[panel.name].push(lab);
        assigned.add(i);
        break;
      }
    }
  }

  // Second pass: match unassigned by name
  for (let i = 0; i < labs.length; i++) {
    if (assigned.has(i)) continue;

    const lab = labs[i];
    const lowerName = lab.name.toLowerCase();
    let matched = false;

    for (const panel of PANELS) {
      for (const pattern of panel.namePatterns) {
        if (lowerName.includes(pattern)) {
          if (!grouped[panel.name]) grouped[panel.name] = [];
          grouped[panel.name].push(lab);
          assigned.add(i);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  // Remaining labs go to "Other"
  for (let i = 0; i < labs.length; i++) {
    if (!assigned.has(i)) {
      if (!grouped['Other Labs']) grouped['Other Labs'] = [];
      grouped['Other Labs'].push(labs[i]);
    }
  }

  return grouped;
}
