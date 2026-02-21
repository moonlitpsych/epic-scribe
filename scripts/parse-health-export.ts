#!/usr/bin/env npx tsx
/**
 * Apple Health Export → Epic Scribe Clinical Data Parser
 *
 * Reads an Apple Health data export (unzipped), extracts FHIR clinical records,
 * transforms them to ClinicalDataPayload, and POSTs to the HealthKit sync endpoint.
 *
 * Usage:
 *   npx tsx scripts/parse-health-export.ts <export-folder> <patient-id> [--dry-run]
 *
 * The export folder should be the unzipped Apple Health export containing export.xml
 * and the clinical-records/ subfolder with FHIR JSON files.
 *
 * Example:
 *   # 1. Export from iPhone: Health → Profile → Export All Health Data
 *   # 2. AirDrop/transfer the zip to your Mac
 *   # 3. Unzip it
 *   unzip export.zip -d ~/Desktop/health-export
 *   # 4. Run this script
 *   npx tsx scripts/parse-health-export.ts ~/Desktop/health-export <patient-uuid>
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Configuration ──────────────────────────────────────────────────────────
const API_URL = process.env.HEALTHKIT_API_URL || 'http://localhost:3002/api/clinical-data/healthkit';
const API_KEY = process.env.HEALTHKIT_SYNC_API_KEY || '';

// ── Types (matching @epic-scribe/types) ────────────────────────────────────
interface MedicationSummary {
  // Structured fields (FHIR R4 sources — repeatable, comparable across meds)
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  prn?: boolean;
  rxNormCode?: string;
  status?: 'active' | 'stopped' | 'on-hold';
  startDate?: string;
  // Rich context (normalized from sig — preserves clinical intent)
  sig?: string;
  instructions?: string;
  dispensing?: string;
}

interface ConditionSummary {
  displayName: string;
  icd10Code?: string;
  snomedCode?: string;
  clinicalStatus?: 'active' | 'resolved' | 'inactive' | 'remission';
  onsetDate?: string;
}

interface LabResultSummary {
  name: string;
  value: string;
  units?: string;
  referenceRange?: string;
  loincCode?: string;
  collectionDate?: string;
  isAbnormal?: boolean;
}

interface VitalSignSummary {
  name: string;
  value: string;
  units?: string;
  loincCode?: string;
  recordedDate?: string;
}

interface AllergySummary {
  substance: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  onsetDate?: string;
}

interface ClinicalNoteSummary {
  title: string;
  date: string;
  author?: string;
  narrativeText: string;
  encounterType?: string;
}

interface ProcedureSummary {
  name: string;
  date?: string;
  cptCode?: string;
  snomedCode?: string;
}

interface HealthKitClinicalData {
  medications?: MedicationSummary[];
  conditions?: ConditionSummary[];
  labResults?: LabResultSummary[];
  vitalSigns?: VitalSignSummary[];
  allergies?: AllergySummary[];
  clinicalNotes?: ClinicalNoteSummary[];
  procedures?: ProcedureSummary[];
}

// ── FHIR Resource Parsers ──────────────────────────────────────────────────

function extractCoding(codings: any[], system: string): string | undefined {
  if (!Array.isArray(codings)) return undefined;
  const match = codings.find((c: any) => c.system?.includes(system));
  return match?.code;
}

function extractDisplay(codeableConcept: any): string {
  if (!codeableConcept) return 'Unknown';
  if (codeableConcept.text) return codeableConcept.text;
  const codings = codeableConcept.coding || [];
  for (const c of codings) {
    if (c.display) return c.display;
  }
  return 'Unknown';
}

/**
 * Normalize timing repeat fields into a human-readable frequency string.
 * Handles Epic patterns: timing.code.text, timing.repeat (frequency/period/periodUnit).
 */
function normalizeFrequency(dosage: any): string | undefined {
  const timing = dosage?.timing;
  if (!timing) return undefined;

  // Prefer timing.code.text — Epic provides human-readable strings here
  // (e.g., "once daily", "at bedtime as needed", "as needed", "3 times a day")
  if (timing.code?.text) {
    return timing.code.text;
  }

  // Fall back to structured repeat fields
  const repeat = timing.repeat;
  if (!repeat) return undefined;

  const freq = repeat.frequency as number | undefined;
  const period = repeat.period as number | undefined;
  const periodUnit = repeat.periodUnit as string | undefined;

  if (freq && period && periodUnit) {
    const unitMap: Record<string, string> = {
      s: 'second', min: 'minute', h: 'hour', d: 'day', wk: 'week', mo: 'month', a: 'year',
    };
    const unitLabel = unitMap[periodUnit] || periodUnit;

    // Common patterns
    if (periodUnit === 'd' && period === 1) {
      if (freq === 1) return 'once daily';
      if (freq === 2) return 'twice daily';
      if (freq === 3) return 'three times daily';
      return `${freq} times daily`;
    }
    if (periodUnit === 'h') {
      return `every ${period} hours`;
    }
    if (periodUnit === 'min') {
      return `every ${period} minutes`;
    }
    if (freq === 1 && period === 1) {
      return `once per ${unitLabel}`;
    }
    return `${freq} times per ${period} ${unitLabel}${period > 1 ? 's' : ''}`;
  }

  // timeOfDay only (e.g., ["09:00:00"])
  if (repeat.timeOfDay?.length) {
    return `at ${repeat.timeOfDay.join(', ')}`;
  }

  return undefined;
}

/**
 * Build dispensing string from FHIR dispenseRequest.
 * Format: "Disp: 30 capsule, 30-day supply, 0 refills"
 */
function formatDispenseRequest(dispenseRequest: any): string | undefined {
  if (!dispenseRequest) return undefined;

  const parts: string[] = [];

  if (dispenseRequest.quantity) {
    const qty = dispenseRequest.quantity;
    parts.push(`${qty.value} ${qty.unit || ''}`);
  }

  if (dispenseRequest.expectedSupplyDuration) {
    const dur = dispenseRequest.expectedSupplyDuration;
    parts.push(`${dur.value}-${(dur.unit || 'day').toLowerCase()} supply`);
  }

  if (typeof dispenseRequest.numberOfRepeatsAllowed === 'number') {
    parts.push(`${dispenseRequest.numberOfRepeatsAllowed} refills`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Extract clinical instructions from the full sig text.
 * Separates the main patient instruction from clinical guidance (taper plans,
 * titration notes, provider notes) and dispensing lines.
 */
function extractInstructions(sigText: string | undefined): string | undefined {
  if (!sigText) return undefined;

  const lines = sigText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return undefined;

  // Skip first line (patient instruction) and non-clinical lines
  const instructionLines = lines.slice(1).filter(line => {
    const lower = line.toLowerCase();
    // Skip dispensing lines (Disp-30 tablet, R-0, Normal)
    if (/^disp[-–—]/.test(lower)) return false;
    // Skip lines that are just supply/refill info
    if (/^\d+\s*(tablet|capsule|ml|patch|cap)s?\s*,\s*r-\d/i.test(lower)) return false;
    // Skip Rx discount card / insurance info
    if (/^use\s+rx\s+discount/i.test(lower)) return false;
    if (/\bbin:\d+.*pcn:/i.test(lower)) return false;
    return true;
  });

  return instructionLines.length > 0 ? instructionLines.join('\n') : undefined;
}

function parseMedicationRequest(resource: any): MedicationSummary | null {
  try {
    // Epic uses medicationReference.display; also check contained resources and medicationCodeableConcept
    let name = resource.medicationReference?.display
      || extractDisplay(resource.medicationCodeableConcept);

    // If still unknown, check contained Medication resources
    if ((!name || name === 'Unknown') && resource.contained) {
      for (const contained of resource.contained) {
        if (contained.resourceType === 'Medication' && contained.code) {
          name = extractDisplay(contained.code);
          break;
        }
      }
    }

    if (!name || name === 'Unknown') name = 'Unknown medication';

    // Extract RxNorm from medicationCodeableConcept or contained Medication
    let rxNormCode: string | undefined;
    const medCodings = resource.medicationCodeableConcept?.coding || [];
    rxNormCode = extractCoding(medCodings, 'rxnorm');
    if (!rxNormCode && resource.contained) {
      for (const contained of resource.contained) {
        if (contained.resourceType === 'Medication' && contained.code?.coding) {
          rxNormCode = extractCoding(contained.code.coding, 'rxnorm');
          if (rxNormCode) break;
        }
      }
    }

    const dosage = resource.dosageInstruction?.[0];

    // ── Structured fields ──
    let dose: string | undefined;
    if (dosage) {
      // Try doseQuantity first, then doseRange
      const doseAndRate = dosage.doseAndRate?.[0];
      if (doseAndRate?.doseQuantity) {
        const dq = doseAndRate.doseQuantity;
        dose = `${dq.value} ${dq.unit || dq.code || ''}`.trim();
      } else if (doseAndRate?.doseRange) {
        const dr = doseAndRate.doseRange;
        const low = dr.low?.value;
        const high = dr.high?.value;
        const unit = dr.low?.unit || dr.high?.unit || '';
        dose = low === high ? `${low} ${unit}`.trim() : `${low}-${high} ${unit}`.trim();
      }
    }

    const route = dosage?.route?.text as string | undefined;
    const frequency = normalizeFrequency(dosage);
    const prn = dosage?.asNeededBoolean === true ? true : undefined;

    // ── Rich context fields ──
    const sig = dosage?.text as string | undefined;
    const instructions = extractInstructions(sig);
    const dispensing = formatDispenseRequest(resource.dispenseRequest);

    const statusMap: Record<string, 'active' | 'stopped' | 'on-hold'> = {
      active: 'active',
      stopped: 'stopped',
      'on-hold': 'on-hold',
      completed: 'stopped',
      cancelled: 'stopped',
    };

    return {
      name,
      dose,
      route,
      frequency,
      prn,
      rxNormCode,
      status: statusMap[resource.status] || 'active',
      startDate: resource.authoredOn,
      sig,
      instructions,
      dispensing,
    };
  } catch {
    return null;
  }
}

function parseMedicationStatement(resource: any): MedicationSummary | null {
  try {
    let name = resource.medicationReference?.display
      || extractDisplay(resource.medicationCodeableConcept);

    if ((!name || name === 'Unknown') && resource.contained) {
      for (const contained of resource.contained) {
        if (contained.resourceType === 'Medication' && contained.code) {
          name = extractDisplay(contained.code);
          break;
        }
      }
    }
    if (!name || name === 'Unknown') name = 'Unknown medication';

    let rxNormCode = extractCoding(
      resource.medicationCodeableConcept?.coding || [],
      'rxnorm'
    );
    if (!rxNormCode && resource.contained) {
      for (const contained of resource.contained) {
        if (contained.resourceType === 'Medication' && contained.code?.coding) {
          rxNormCode = extractCoding(contained.code.coding, 'rxnorm');
          if (rxNormCode) break;
        }
      }
    }

    const dosage = resource.dosage?.[0];

    let dose: string | undefined;
    if (dosage) {
      const doseAndRate = dosage.doseAndRate?.[0];
      if (doseAndRate?.doseQuantity) {
        const dq = doseAndRate.doseQuantity;
        dose = `${dq.value} ${dq.unit || ''}`.trim();
      } else if (doseAndRate?.doseRange) {
        const dr = doseAndRate.doseRange;
        const low = dr.low?.value;
        const high = dr.high?.value;
        const unit = dr.low?.unit || dr.high?.unit || '';
        dose = low === high ? `${low} ${unit}`.trim() : `${low}-${high} ${unit}`.trim();
      }
    }

    const route = dosage?.route?.text as string | undefined;
    const frequency = normalizeFrequency(dosage);
    const prn = dosage?.asNeededBoolean === true ? true : undefined;
    const sig = dosage?.text as string | undefined;
    const instructions = extractInstructions(sig);

    return {
      name,
      dose,
      route,
      frequency,
      prn,
      rxNormCode,
      status: resource.status === 'active' ? 'active' : 'stopped',
      startDate: resource.effectivePeriod?.start || resource.dateAsserted,
      sig,
      instructions,
    };
  } catch {
    return null;
  }
}

function parseCondition(resource: any): ConditionSummary | null {
  try {
    const displayName = extractDisplay(resource.code);
    const codings = resource.code?.coding || [];
    const icd10Code = extractCoding(codings, 'icd') || extractCoding(codings, 'icd10');
    const snomedCode = extractCoding(codings, 'snomed');

    const statusMap: Record<string, 'active' | 'resolved' | 'inactive' | 'remission'> = {
      active: 'active',
      resolved: 'resolved',
      inactive: 'inactive',
      remission: 'remission',
      recurrence: 'active',
    };

    return {
      displayName,
      icd10Code,
      snomedCode,
      clinicalStatus: statusMap[resource.clinicalStatus?.coding?.[0]?.code] || 'active',
      onsetDate: resource.onsetDateTime || resource.onsetPeriod?.start,
    };
  } catch {
    return null;
  }
}

function parseObservationLab(resource: any): LabResultSummary | null {
  try {
    const name = extractDisplay(resource.code);
    const loincCode = extractCoding(resource.code?.coding || [], 'loinc');

    let value: string;
    let units: string | undefined;
    if (resource.valueQuantity) {
      value = String(resource.valueQuantity.value);
      units = resource.valueQuantity.unit || resource.valueQuantity.code;
    } else if (resource.valueString) {
      value = resource.valueString;
    } else if (resource.valueCodeableConcept) {
      value = extractDisplay(resource.valueCodeableConcept);
    } else {
      return null; // No value to report
    }

    let referenceRange: string | undefined;
    if (resource.referenceRange?.[0]) {
      const rr = resource.referenceRange[0];
      if (rr.text) {
        referenceRange = rr.text;
      } else if (rr.low && rr.high) {
        referenceRange = `${rr.low.value}-${rr.high.value}`;
      }
    }

    const isAbnormal = resource.interpretation?.[0]?.coding?.[0]?.code ?
      !['N', 'normal'].includes(resource.interpretation[0].coding[0].code) :
      undefined;

    return {
      name,
      value,
      units,
      referenceRange,
      loincCode,
      collectionDate: resource.effectiveDateTime || resource.issued,
      isAbnormal,
    };
  } catch {
    return null;
  }
}

function parseObservationVital(resource: any): VitalSignSummary | null {
  try {
    const name = extractDisplay(resource.code);
    const loincCode = extractCoding(resource.code?.coding || [], 'loinc');

    let value: string;
    let units: string | undefined;

    // Handle component vitals (e.g., blood pressure with systolic/diastolic)
    if (resource.component && resource.component.length > 0) {
      const parts = resource.component.map((c: any) => {
        const cName = extractDisplay(c.code);
        const cVal = c.valueQuantity?.value ?? '';
        const cUnit = c.valueQuantity?.unit || '';
        return `${cName}: ${cVal} ${cUnit}`.trim();
      });
      value = parts.join(', ');
    } else if (resource.valueQuantity) {
      value = String(resource.valueQuantity.value);
      units = resource.valueQuantity.unit || resource.valueQuantity.code;
    } else if (resource.valueString) {
      value = resource.valueString;
    } else {
      return null;
    }

    return {
      name,
      value,
      units,
      loincCode,
      recordedDate: resource.effectiveDateTime || resource.issued,
    };
  } catch {
    return null;
  }
}

function parseAllergyIntolerance(resource: any): AllergySummary | null {
  try {
    const substance = extractDisplay(resource.code) || 'Unknown';

    let reaction: string | undefined;
    let severity: 'mild' | 'moderate' | 'severe' | undefined;
    if (resource.reaction?.[0]) {
      const r = resource.reaction[0];
      reaction = r.manifestation?.map((m: any) => extractDisplay(m)).join(', ');
      severity = r.severity as any;
    }

    return {
      substance,
      reaction,
      severity,
      onsetDate: resource.onsetDateTime,
    };
  } catch {
    return null;
  }
}

function parseProcedure(resource: any): ProcedureSummary | null {
  try {
    const name = extractDisplay(resource.code);
    const codings = resource.code?.coding || [];
    const cptCode = extractCoding(codings, 'cpt');
    const snomedCode = extractCoding(codings, 'snomed');

    return {
      name,
      date: resource.performedDateTime || resource.performedPeriod?.start,
      cptCode,
      snomedCode,
    };
  } catch {
    return null;
  }
}

function parseDocumentReference(resource: any): ClinicalNoteSummary | null {
  try {
    const title = extractDisplay(resource.type) || resource.description || 'Clinical Note';
    const date = resource.date || resource.context?.period?.start || '';
    const author = resource.author?.[0]?.display;

    // Narrative text is usually in content[].attachment
    let narrativeText = '';
    for (const content of (resource.content || [])) {
      if (content.attachment?.data) {
        // Base64 encoded
        narrativeText = Buffer.from(content.attachment.data, 'base64').toString('utf-8');
      } else if (content.attachment?.url) {
        narrativeText = `[Document at ${content.attachment.url}]`;
      }
    }

    if (!narrativeText && resource.text?.div) {
      // Strip HTML tags from narrative
      narrativeText = resource.text.div.replace(/<[^>]*>/g, '').trim();
    }

    if (!narrativeText) return null;

    return {
      title,
      date,
      author,
      narrativeText,
      encounterType: resource.context?.encounter?.[0]?.display,
    };
  } catch {
    return null;
  }
}

// ── Observation Category Detection ─────────────────────────────────────────

const VITAL_SIGN_LOINC_CODES = new Set([
  '8310-5',  // Body temperature
  '8462-4',  // Diastolic BP
  '8480-6',  // Systolic BP
  '8867-4',  // Heart rate
  '9279-1',  // Respiratory rate
  '2708-6',  // SpO2
  '29463-7', // Body weight
  '8302-2',  // Body height
  '39156-5', // BMI
  '85354-9', // Blood pressure panel
]);

function isVitalSign(resource: any): boolean {
  // Check category
  const categories = resource.category || [];
  for (const cat of categories) {
    const codings = cat.coding || [];
    for (const c of codings) {
      if (c.code === 'vital-signs') return true;
    }
  }
  // Check LOINC code
  const loincCode = extractCoding(resource.code?.coding || [], 'loinc');
  if (loincCode && VITAL_SIGN_LOINC_CODES.has(loincCode)) return true;

  return false;
}

// ── Main Export Parser ─────────────────────────────────────────────────────

function findFhirJsonFiles(exportDir: string): string[] {
  const jsonFiles: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.json')) {
        jsonFiles.push(fullPath);
      }
    }
  }

  // Look for clinical-records folder
  const clinicalDir = path.join(exportDir, 'clinical-records');
  if (fs.existsSync(clinicalDir)) {
    walk(clinicalDir);
  }

  // Also check for apple_health_export subfolder
  const appleDir = path.join(exportDir, 'apple_health_export');
  if (fs.existsSync(appleDir)) {
    const clinicalSubDir = path.join(appleDir, 'clinical-records');
    if (fs.existsSync(clinicalSubDir)) {
      walk(clinicalSubDir);
    }
  }

  return jsonFiles;
}

function parseExportXml(exportDir: string): any[] {
  // Try to find clinical record file paths from export.xml
  const xmlPath = path.join(exportDir, 'export.xml');
  const appleXmlPath = path.join(exportDir, 'apple_health_export', 'export.xml');
  const actualPath = fs.existsSync(xmlPath) ? xmlPath : fs.existsSync(appleXmlPath) ? appleXmlPath : null;

  if (!actualPath) {
    console.log('  No export.xml found, will scan for JSON files directly');
    return [];
  }

  console.log(`  Reading export.xml from ${actualPath}...`);

  // Check file size first — export.xml can be gigabytes for active Health users
  const stats = fs.statSync(actualPath);
  if (stats.size > 500 * 1024 * 1024) { // > 500MB
    console.log(`  export.xml is ${(stats.size / 1024 / 1024).toFixed(0)}MB — too large, skipping XML parsing`);
    console.log(`  Will use Strategy 2 (direct JSON file scan) instead`);
    return [];
  }

  const xml = fs.readFileSync(actualPath, 'utf-8');

  // Extract ClinicalRecord entries with resourceFilePath
  const records: any[] = [];
  const regex = /<ClinicalRecord\s+([^>]+)\/>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const attrs = match[1];
    const filePath = attrs.match(/resourceFilePath="([^"]+)"/)?.[1];
    const resourceType = attrs.match(/type="([^"]+)"/)?.[1];

    if (filePath) {
      const baseDir = path.dirname(actualPath);
      const fullPath = path.join(baseDir, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          const json = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          records.push(json);
        } catch (e) {
          console.log(`  Warning: Could not parse ${filePath}`);
        }
      }
    }
  }

  return records;
}

function parseFhirResources(exportDir: string): HealthKitClinicalData {
  const data: HealthKitClinicalData = {
    medications: [],
    conditions: [],
    labResults: [],
    vitalSigns: [],
    allergies: [],
    clinicalNotes: [],
    procedures: [],
  };

  // Strategy 1: Parse export.xml for ClinicalRecord entries
  console.log('Strategy 1: Parsing export.xml...');
  const xmlRecords = parseExportXml(exportDir);
  console.log(`  Found ${xmlRecords.length} records from export.xml`);

  // Strategy 2: Scan for standalone JSON files
  console.log('Strategy 2: Scanning for FHIR JSON files...');
  const jsonFiles = findFhirJsonFiles(exportDir);
  console.log(`  Found ${jsonFiles.length} JSON files`);

  // Combine all resources (deduplicate by id)
  const allResources: any[] = [...xmlRecords];
  const seenIds = new Set(xmlRecords.map((r: any) => r.id).filter(Boolean));

  for (const file of jsonFiles) {
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
      // Could be a single resource or a Bundle
      if (json.resourceType === 'Bundle') {
        for (const entry of (json.entry || [])) {
          if (entry.resource && !seenIds.has(entry.resource.id)) {
            allResources.push(entry.resource);
            seenIds.add(entry.resource.id);
          }
        }
      } else if (json.resourceType && !seenIds.has(json.id)) {
        allResources.push(json);
        seenIds.add(json.id);
      }
    } catch {
      // Skip unparseable files
    }
  }

  console.log(`\nProcessing ${allResources.length} total FHIR resources...`);

  // Route each resource to the appropriate parser
  const typeCounts: Record<string, number> = {};
  for (const resource of allResources) {
    const rt = resource.resourceType;
    typeCounts[rt] = (typeCounts[rt] || 0) + 1;

    switch (rt) {
      case 'MedicationRequest':
      case 'MedicationOrder': { // DSTU2 equivalent
        const med = parseMedicationRequest(resource);
        if (med) data.medications!.push(med);
        break;
      }
      case 'MedicationStatement': {
        const med = parseMedicationStatement(resource);
        if (med) data.medications!.push(med);
        break;
      }
      case 'Condition': {
        const cond = parseCondition(resource);
        if (cond) data.conditions!.push(cond);
        break;
      }
      case 'Observation': {
        if (isVitalSign(resource)) {
          const vital = parseObservationVital(resource);
          if (vital) data.vitalSigns!.push(vital);
        } else {
          const lab = parseObservationLab(resource);
          if (lab) data.labResults!.push(lab);
        }
        break;
      }
      case 'DiagnosticReport': {
        // DiagnosticReports often reference Observations; treat as lab panel header
        const lab = parseObservationLab(resource);
        if (lab) data.labResults!.push(lab);
        break;
      }
      case 'AllergyIntolerance': {
        const allergy = parseAllergyIntolerance(resource);
        if (allergy) data.allergies!.push(allergy);
        break;
      }
      case 'Procedure': {
        const proc = parseProcedure(resource);
        if (proc) data.procedures!.push(proc);
        break;
      }
      case 'DocumentReference': {
        const note = parseDocumentReference(resource);
        if (note) data.clinicalNotes!.push(note);
        break;
      }
      default:
        // Skip unsupported resource types (Patient, Encounter, etc.)
        break;
    }
  }

  console.log('\nFHIR resource types found:', typeCounts);

  // Remove empty arrays
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length === 0) {
      delete (data as any)[key];
    }
  }

  return data;
}

// ── CLI ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Apple Health Export → Epic Scribe Clinical Data Parser

Usage:
  npx tsx scripts/parse-health-export.ts <export-folder> <patient-id> [--dry-run]

  <export-folder>  Path to unzipped Apple Health export
  <patient-id>     UUID of the patient in Epic Scribe
  --dry-run        Parse and display data without POSTing

Environment:
  HEALTHKIT_SYNC_API_KEY  API key for the sync endpoint (required unless --dry-run)
  HEALTHKIT_API_URL       Override API URL (default: http://localhost:3002/api/clinical-data/healthkit)

Example:
  unzip export.zip -d ~/Desktop/health-export
  HEALTHKIT_SYNC_API_KEY=your-key npx tsx scripts/parse-health-export.ts ~/Desktop/health-export abc-123-uuid
`);
    process.exit(1);
  }

  const exportDir = path.resolve(args[0]);
  const patientId = args[1];
  const dryRun = args.includes('--dry-run');

  if (!fs.existsSync(exportDir)) {
    console.error(`Error: Export folder not found: ${exportDir}`);
    process.exit(1);
  }

  console.log(`\n=== Apple Health Export Parser ===`);
  console.log(`Export folder: ${exportDir}`);
  console.log(`Patient ID: ${patientId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no POST)' : 'LIVE (will POST to API)'}`);
  console.log('');

  // Parse FHIR resources
  const data = parseFhirResources(exportDir);

  // Summary
  console.log('\n=== Parsed Clinical Data Summary ===');
  if (data.medications) console.log(`  Medications: ${data.medications.length}`);
  if (data.conditions) console.log(`  Conditions: ${data.conditions.length}`);
  if (data.labResults) console.log(`  Lab Results: ${data.labResults.length}`);
  if (data.vitalSigns) console.log(`  Vital Signs: ${data.vitalSigns.length}`);
  if (data.allergies) console.log(`  Allergies: ${data.allergies.length}`);
  if (data.clinicalNotes) console.log(`  Clinical Notes: ${data.clinicalNotes.length}`);
  if (data.procedures) console.log(`  Procedures: ${data.procedures.length}`);

  const totalItems = Object.values(data).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  if (totalItems === 0) {
    console.log('\n  No clinical records found in the export.');
    console.log('  Make sure you have Health Records connected in the Health app');
    console.log('  (Health → Browse → Health Records → Add Account)');
    process.exit(0);
  }

  // Show sample data
  console.log('\n=== Sample Data ===');
  if (data.medications?.length) {
    console.log('\nMedications (first 5):');
    data.medications.slice(0, 5).forEach(m => {
      const parts = [m.name];
      if (m.dose) parts.push(m.dose);
      if (m.route) parts.push(`(${m.route})`);
      if (m.frequency) parts.push(m.frequency);
      if (m.prn) parts.push('PRN');
      parts.push(`[${m.status}]`);
      console.log(`  - ${parts.join(' ')}`);
      if (m.dispensing) console.log(`      Dispensing: ${m.dispensing}`);
      if (m.instructions) console.log(`      Instructions: ${m.instructions.substring(0, 120)}${m.instructions.length > 120 ? '...' : ''}`);
    });
  }
  if (data.conditions?.length) {
    console.log('\nConditions (first 5):');
    data.conditions.slice(0, 5).forEach(c =>
      console.log(`  - ${c.displayName} ${c.icd10Code ? `(${c.icd10Code})` : ''} [${c.clinicalStatus}]`)
    );
  }
  if (data.labResults?.length) {
    console.log('\nLab Results (first 5):');
    data.labResults.slice(0, 5).forEach(l =>
      console.log(`  - ${l.name}: ${l.value} ${l.units || ''} ${l.isAbnormal ? '**ABNORMAL**' : ''}`)
    );
  }
  if (data.allergies?.length) {
    console.log('\nAllergies:');
    data.allergies.forEach(a =>
      console.log(`  - ${a.substance} ${a.reaction ? `— ${a.reaction}` : ''}`)
    );
  }

  if (dryRun) {
    console.log('\n=== DRY RUN — Not posting to API ===');
    console.log('\nFull parsed data:');
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // POST to API
  if (!API_KEY) {
    console.error('\nError: HEALTHKIT_SYNC_API_KEY environment variable is required');
    console.error('Set it or use --dry-run to just parse');
    process.exit(1);
  }

  console.log(`\n=== POSTing to ${API_URL} ===`);

  const payload = {
    patientId,
    data,
    syncTimestamp: new Date().toISOString(),
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (response.ok) {
    console.log('\nSuccess!', JSON.stringify(result, null, 2));
  } else {
    console.error('\nFailed:', response.status, result);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
