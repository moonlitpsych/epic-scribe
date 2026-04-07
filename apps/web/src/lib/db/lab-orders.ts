/**
 * Lab Orders Database Operations
 *
 * Fuzzy test matching, insurance lookup, and requisition creation
 * for the Action Resolver Phase 2 lab execution flow.
 *
 * Tables: lab_tests, lab_locations, patient_insurance,
 *         lab_requisitions, requisition_tests, requisition_diagnoses
 */

import { getSupabaseClient } from '../supabase';

// --- Types ---

export interface LabTest {
  id: string;
  name: string;
  labcorp_code: string | null;
  cpt_code: string | null;
  category: string | null;
  is_psychiatric: boolean;
  requires_fasting: boolean;
  is_active: boolean;
}

export interface MatchedLabTest {
  inputKeyword: string;
  matched: boolean;
  labTest: LabTest | null;
  testCode: string;
  testName: string;
  requiresFasting: boolean;
}

export interface LabLocation {
  id: string;
  lab_company: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  fax: string | null;
}

export interface PatientInsuranceRecord {
  id: string;
  payer_name: string | null;
  member_id: string | null;
  group_number: string | null;
  plan_name: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

export interface CreateRequisitionParams {
  providerId: string;
  encounterId?: string;
  stagedActionId?: string;
  patientName: string;
  patientDob: string | null;
  patientPhone: string | null;
  medicaidId: string | null;
  insuranceProvider: string | null;
  labLocationId: string | null;
  specialInstructions: string | null;
  tests: Array<{
    labTestId: string | null;
    testCode: string;
    testName: string;
  }>;
  diagnoses: Array<{
    icd10Code: string;
    description: string;
    isPrimary: boolean;
  }>;
}

// --- Abbreviation Map ---

const ABBREVIATION_MAP: Record<string, string[]> = {
  cbc: ['complete blood count'],
  cmp: ['comprehensive metabolic panel'],
  bmp: ['basic metabolic panel'],
  tsh: ['thyroid stimulating hormone'],
  uds: ['drug screen'],
  a1c: ['hemoglobin a1c'],
  hba1c: ['hemoglobin a1c'],
  lfts: ['hepatic function panel'],
  lft: ['hepatic function panel'],
  rfp: ['renal function panel'],
  t4: ['free t4'],
  tibc: ['iron and tibc'],
  vit_d: ['vitamin d'],
  vit_b12: ['vitamin b12'],
  b12: ['vitamin b12'],
  vpa: ['valproic acid'],
  depakote: ['valproic acid'],
  tegretol: ['carbamazepine'],
  lamictal: ['lamotrigine'],
};

// --- Functions ---

/**
 * Fuzzy-match keywords from Gemini extraction against lab_tests rows.
 * Strategy: lowercase substring match + abbreviation expansion.
 */
export async function getLabTestsByKeywords(
  keywords: string[]
): Promise<MatchedLabTest[]> {
  const supabase = getSupabaseClient(true);

  const { data: allTests, error } = await (supabase as any)
    .from('lab_tests')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[lab-orders] Error fetching lab tests:', error);
    throw new Error('Failed to fetch lab tests');
  }

  const tests: LabTest[] = allTests || [];

  return keywords.map((keyword) => {
    const normalized = keyword.toLowerCase().trim();

    // Check abbreviation map first
    const expandedTerms = ABBREVIATION_MAP[normalized] || [normalized];

    for (const term of expandedTerms) {
      const match = tests.find((t) => {
        const testName = t.name.toLowerCase();
        return testName.includes(term) || term.includes(testName);
      });

      if (match) {
        return {
          inputKeyword: keyword,
          matched: true,
          labTest: match,
          testCode: match.labcorp_code || '',
          testName: match.name,
          requiresFasting: match.requires_fasting,
        };
      }
    }

    // No match — return raw keyword
    return {
      inputKeyword: keyword,
      matched: false,
      labTest: null,
      testCode: '',
      testName: keyword,
      requiresFasting: false,
    };
  });
}

/**
 * Get the default lab collection location (Murray Labcorp PSC).
 */
export async function getDefaultLabLocation(): Promise<LabLocation | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('lab_locations')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[lab-orders] Error fetching default lab location:', error);
    return null;
  }

  return data as LabLocation;
}

/**
 * Get primary active insurance for a patient.
 */
export async function getPatientInsurance(
  patientId: string
): Promise<PatientInsuranceRecord | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await (supabase as any)
    .from('patient_insurance')
    .select('id, payer_name, member_id, group_number, plan_name, address_line1, city, state, zip_code')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .eq('is_primary', true)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[lab-orders] Error fetching patient insurance:', error);
    return null;
  }

  return data as PatientInsuranceRecord;
}

/**
 * Create a lab requisition with junction rows for tests and diagnoses.
 * Auto-generates requisition_number as LAB-YYYYMMDD-{8hex}.
 */
export async function createLabRequisition(params: CreateRequisitionParams) {
  const supabase = getSupabaseClient(true);

  // Generate requisition number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const requisitionNumber = `LAB-${dateStr}-${hex}`;

  // Insert requisition
  const { data: requisition, error: reqError } = await (supabase as any)
    .from('lab_requisitions')
    .insert({
      requisition_number: requisitionNumber,
      provider_id: params.providerId,
      encounter_id: params.encounterId || null,
      staged_action_id: params.stagedActionId || null,
      lab_company: 'Labcorp',
      lab_location_id: params.labLocationId || null,
      patient_name: params.patientName,
      patient_dob: params.patientDob,
      patient_phone: params.patientPhone,
      medicaid_id: params.medicaidId,
      insurance_provider: params.insuranceProvider,
      special_instructions: params.specialInstructions,
      status: 'draft',
      tests: params.tests.map((t) => ({
        code: t.testCode,
        name: t.testName,
      })),
    })
    .select('*')
    .single();

  if (reqError) {
    console.error('[lab-orders] Error creating requisition:', reqError);
    throw new Error(`Failed to create lab requisition: ${reqError.message}`);
  }

  // Insert requisition_tests junction rows
  const testRows = params.tests.map((t, i) => ({
    requisition_id: requisition.id,
    lab_test_id: t.labTestId || null,
    test_code: t.testCode || 'CUSTOM',
    test_name: t.testName,
    display_order: i + 1,
  }));

  let requisitionTests: any[] = [];
  if (testRows.length > 0) {
    const { data: tests, error: testError } = await (supabase as any)
      .from('requisition_tests')
      .insert(testRows)
      .select('*');

    if (testError) {
      console.error('[lab-orders] Error creating requisition tests:', testError);
    } else {
      requisitionTests = tests || [];
    }
  }

  // Insert requisition_diagnoses junction rows
  let requisitionDiagnoses: any[] = [];
  if (params.diagnoses.length > 0) {
    const diagRows = params.diagnoses.map((d, i) => ({
      requisition_id: requisition.id,
      icd10_code: d.icd10Code,
      description: d.description,
      is_primary: d.isPrimary,
      display_order: i + 1,
    }));

    const { data: diags, error: diagError } = await (supabase as any)
      .from('requisition_diagnoses')
      .insert(diagRows)
      .select('*');

    if (diagError) {
      console.error('[lab-orders] Error creating requisition diagnoses:', diagError);
    } else {
      requisitionDiagnoses = diags || [];
    }
  }

  return {
    requisition,
    requisitionTests,
    requisitionDiagnoses,
    requisitionNumber,
  };
}
