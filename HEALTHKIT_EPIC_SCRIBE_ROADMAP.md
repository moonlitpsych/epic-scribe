# HealthKit → Epic Scribe Integration Roadmap

**Goal:** Replace clipboard-based Epic note import with patient-authorized Apple Health data, giving epic-scribe access to previous notes, medications, diagnoses, labs, and vitals from Epic (and any other connected health system) — without requiring Epic API approval or U of U IT involvement.

**Last Updated:** 2026-02-20

---

## How It Works

Patient connects their U of U Health (Epic) records to Apple Health via the Health app. Moonlit's iOS app requests HealthKit authorization for clinical records. App reads FHIR R4 resources from HealthKit locally on the patient's device, then sends them to epic-scribe's backend. The prompt builder consumes structured clinical data instead of (or in addition to) raw clipboard-pasted text.

The patient mediates the data exchange, making this HIPAA-compliant patient-directed access. No Epic API approval needed. No U of U IT involvement. Works with any health system the patient has connected to Apple Health.

```
┌─────────────┐     FHIR sync      ┌──────────────┐
│  Epic (U of U) │ ──────────────► │  Apple Health  │
│  + other EHRs  │  (patient-auth) │  (on device)   │
└─────────────┘                    └──────┬───────┘
                                          │ HealthKit API
                                          ▼
                                   ┌──────────────┐
                                   │  Moonlit iOS   │
                                   │  App           │
                                   └──────┬───────┘
                                          │ HTTPS POST
                                          ▼
                                   ┌──────────────┐
                                   │  epic-scribe   │
                                   │  backend       │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ prompt-builder │
                                   │ .ts            │
                                   └──────────────┘
```

---

## What This Replaces

**Current workflow (clipboard watcher):**
1. Open patient's last note in Epic
2. Select all → Copy
3. Clipboard watcher (Electron app) detects Epic note via regex patterns
4. EpicNoteParser extracts: patient name, DOB, setting, note type, provider
5. Full note text → `previousNote` field in prompt builder
6. Repeat manually every visit

**HealthKit workflow:**
1. Patient authorizes Moonlit app for HealthKit clinical records (one-time, ~30 seconds)
2. App automatically queries latest FHIR resources before each visit
3. Structured data flows into prompt builder: previous note, medications, diagnoses, labs, vitals
4. No manual copying. No Electron app. Works from iPad/iPhone during visit.

---

## What Data Becomes Available

Each data type maps to a HealthKit clinical type identifier and a FHIR R4 resource:

| Clinical Data | HKClinicalTypeIdentifier | FHIR Resource | Prompt Builder Field |
|---|---|---|---|
| Previous psych note | `.clinicalNoteRecord` | DocumentReference | `previousNote` |
| Current medications | `.medicationRecord` | MedicationRequest | `patientContext` (meds section) |
| Active diagnoses | `.conditionRecord` | Condition | `patientContext` (dx section) |
| Lab results | `.labResultRecord` | Observation | `patientContext` (labs section) |
| Vital signs | `.vitalSignRecord` | Observation | `patientContext` (vitals section) |
| Allergies | `.allergyRecord` | AllergyIntolerance | `patientContext` (allergies section) |
| Immunizations | `.immunizationRecord` | Immunization | Generally not needed for psych |
| Procedures | `.procedureRecord` | Procedure | Useful for ECT history, TMS, etc. |

**Key upgrade over clipboard:** Instead of just `previousNote` (unstructured text blob), the prompt builder gets typed, structured clinical data. The model receives a medication list it can reason over (dose changes, interactions), lab values it can interpret (lithium levels, metabolic panels), and diagnoses with ICD-10 codes and onset dates.

---

## Phase 1: Verify Data Availability (1-2 days, manual)

Before writing any code, confirm what U of U actually exposes through Apple Health.

### Steps

1. **Check your own Apple Health records**
   - Open Health app → Browse → Health Records
   - Confirm "University of Utah Health" appears as connected institution
   - Navigate to: Clinical Documents / Lab Results / Medications / Conditions
   - Specifically look for: psychiatric progress notes (DocumentReference), recent lab panels, medication list

2. **Document what's available**
   - Are clinical notes visible? (This is the big question — some institutions share notes, some don't)
   - If notes are visible, do they include full narrative text or just metadata?
   - Are medication lists current and complete?
   - Which lab types appear? (Look for lithium, BMP, CBC, UDS, hepatic panel, thyroid)
   - Do vital signs include weight? (Important for metabolic monitoring on antipsychotics)

3. **Check multi-system data**
   - If you have records from UW Health (Madison) connected, verify those are also accessible
   - This confirms the multi-system data aggregation advantage

### Decision Gate

- If DocumentReference resources include narrative note text → Full integration (replaces clipboard entirely)
- If only structured data (meds/labs/dx) but no note text → Partial integration (structured data supplements clipboard workflow)
- If clinical records sparse → May not be worth building yet; revisit when U of U expands FHIR exposure

---

## Phase 2: iOS App — HealthKit Clinical Records (1-2 weeks)

### 2a. Project Setup & Entitlements

**Xcode Configuration:**
- Add HealthKit capability to Moonlit iOS app target
- Enable "Clinical Health Records" sub-capability (this is separate from regular HealthKit)
- Add to `Info.plist`:
  ```xml
  <key>NSHealthClinicalHealthRecordsShareUsageDescription</key>
  <string>Moonlit uses your health records to give your psychiatrist a complete clinical picture, including your current medications, recent labs, and previous visit notes. This helps generate more accurate documentation and reduces time spent on paperwork during your visit.</string>
  ```

**Dependencies:**
- `HealthKit` (system framework)
- Stanford's `HealthKitOnFHIR` library for FHIR resource conversion: https://github.com/StanfordBDHG/HealthKitOnFHIR
- Add via Swift Package Manager: `https://github.com/StanfordBDHG/HealthKitOnFHIR`

### 2b. Authorization Flow

The in-visit UX when onboarding a patient:

```
Provider says: "I'm going to send you an invitation to share your health records 
with our app. This lets me see your complete medication list and lab results 
automatically — saves us both time."

1. Patient opens Moonlit app (or taps link)
2. App calls HKHealthStore.requestAuthorization(toShare:read:)
   - read types: [.clinicalNoteRecord, .medicationRecord, .conditionRecord, 
                   .labResultRecord, .vitalSignRecord, .allergyRecord, .procedureRecord]
3. iOS presents standard 3-screen authorization:
   - Screen 1: General info about health record sharing
   - Screen 2: App's usage description (from Info.plist) + privacy policy link
   - Screen 3: Granular toggles for each data category
4. Patient taps "Allow All" (or selects specific categories)
5. Done. ~30 seconds total.
```

**Swift implementation outline:**

```swift
import HealthKit

class HealthRecordsManager {
    let healthStore = HKHealthStore()
    
    // Clinical record types we need for psychiatric practice
    let clinicalTypes: Set<HKClinicalType> = [
        HKClinicalType(.clinicalNoteRecord),
        HKClinicalType(.medicationRecord),
        HKClinicalType(.conditionRecord),
        HKClinicalType(.labResultRecord),
        HKClinicalType(.vitalSignRecord),
        HKClinicalType(.allergyRecord),
        HKClinicalType(.procedureRecord)
    ]
    
    func requestAuthorization() async throws {
        try await healthStore.requestAuthorization(toShare: [], read: clinicalTypes)
    }
    
    func fetchMedications() async throws -> [HKClinicalRecord] {
        let type = HKClinicalType(.medicationRecord)
        let query = HKSampleQuery(
            sampleType: type,
            predicate: nil,  // all medications
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        ) { query, samples, error in
            // Process samples
        }
        healthStore.execute(query)
    }
    
    func fetchRecentLabs(since date: Date) async throws -> [HKClinicalRecord] {
        let type = HKClinicalType(.labResultRecord)
        let predicate = HKQuery.predicateForSamples(
            withStart: date, 
            end: Date(), 
            options: .strictStartDate
        )
        // Similar query pattern
    }
}
```

### 2c. FHIR Resource Parsing

Each `HKClinicalRecord` contains a `.fhirResource` property with the raw FHIR JSON. Use `HealthKitOnFHIR` to parse into typed Swift models:

```swift
import HealthKitOnFHIR

// Parse medication
let medicationRecord: HKClinicalRecord = // from query
let medicationRequest = try medicationRecord.resource().get(if: MedicationRequest.self)
// Access: medicationRequest.medicationCodeableConcept (drug name, RxNorm code)
//         medicationRequest.dosageInstruction (dose, frequency)
//         medicationRequest.authoredOn (prescription date)

// Parse lab result
let labRecord: HKClinicalRecord = // from query
let observation = try labRecord.resource().get(if: Observation.self)
// Access: observation.code (LOINC code, display name)
//         observation.valueQuantity (numeric result, units)
//         observation.referenceRange (normal range)
//         observation.effectiveDateTime (collection date)

// Parse condition/diagnosis
let conditionRecord: HKClinicalRecord = // from query
let condition = try conditionRecord.resource().get(if: Condition.self)
// Access: condition.code (ICD-10, SNOMED CT)
//         condition.clinicalStatus (active, resolved, etc.)
//         condition.onsetDateTime
```

### 2d. Data Sync to Backend

After parsing, send structured clinical data to epic-scribe:

```swift
struct ClinicalDataPayload: Codable {
    let patientId: String  // epic-scribe patient UUID
    let timestamp: Date
    
    // Structured data from FHIR resources
    let medications: [MedicationSummary]
    let conditions: [ConditionSummary]
    let labResults: [LabResultSummary]
    let vitalSigns: [VitalSignSummary]
    let allergies: [AllergySummary]
    let clinicalNotes: [ClinicalNoteSummary]
}

struct MedicationSummary: Codable {
    let name: String          // e.g., "sertraline"
    let dose: String?         // e.g., "100 mg"
    let frequency: String?    // e.g., "daily"
    let rxNormCode: String?   // RxNorm CUI
    let prescriber: String?
    let startDate: Date?
    let status: String        // active, stopped, etc.
}

struct LabResultSummary: Codable {
    let name: String          // e.g., "Lithium Level"
    let value: String         // e.g., "0.8"
    let units: String?        // e.g., "mEq/L"
    let referenceRange: String? // e.g., "0.6-1.2"
    let loincCode: String?    // LOINC code
    let collectionDate: Date
    let isAbnormal: Bool
}

// ... similar for conditions, vitals, notes
```

**API endpoint:** `POST /api/clinical-data/healthkit`

---

## Phase 3: Backend — FHIR-to-Prompt-Builder Transform (1 week)

### 3a. New API Route

File: `apps/web/app/api/clinical-data/healthkit/route.ts`

Accepts the `ClinicalDataPayload` from the iOS app and stores it in Supabase associated with the patient record.

### 3b. Database Schema

New table: `patient_clinical_data`

```sql
CREATE TABLE patient_clinical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    data_source TEXT NOT NULL DEFAULT 'healthkit',  -- 'healthkit', 'clipboard', 'intakeq'
    data_type TEXT NOT NULL,  -- 'medications', 'conditions', 'labs', 'vitals', 'notes', 'allergies'
    fhir_resource_type TEXT,  -- 'MedicationRequest', 'Condition', 'Observation', etc.
    structured_data JSONB NOT NULL,  -- Parsed, structured representation
    raw_fhir JSONB,  -- Original FHIR JSON for audit/debugging
    effective_date TIMESTAMPTZ,  -- When the data is from (lab date, note date, etc.)
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups during note generation
CREATE INDEX idx_clinical_data_patient_type ON patient_clinical_data(patient_id, data_type, effective_date DESC);
```

### 3c. Prompt Builder Integration

Modify `services/note/src/prompts/prompt-builder.ts` to consume structured clinical data alongside (or instead of) the existing fields:

**Current `PromptBuilderOptions` interface** (from codebase):
```typescript
interface PromptBuilderOptions {
    template: Template;
    transcript: string;
    previousNote?: string;           // ← clipboard-pasted text (raw)
    longitudinalChartData?: string;  // ← formatted PHQ-9/GAD-7 trends
    patientContext?: string;         // ← clinical context string
    historicalNotes?: string;        // ← all previous finalized notes
    // ...
}
```

**Extended with HealthKit data:**
```typescript
interface PromptBuilderOptions {
    // ... existing fields ...
    
    // NEW: Structured clinical data from HealthKit
    healthKitData?: {
        medications?: MedicationSummary[];
        conditions?: ConditionSummary[];
        labResults?: LabResultSummary[];
        vitalSigns?: VitalSignSummary[];
        allergies?: AllergySummary[];
        clinicalNotes?: ClinicalNoteSummary[];  // Previous notes as FHIR DocumentReference
    };
}
```

**Transform logic** — builds a clinically organized context string from structured data:

```typescript
function buildHealthKitContext(data: HealthKitData): string {
    let context = '';
    
    // Medications — formatted for psychiatric relevance
    if (data.medications?.length) {
        const active = data.medications.filter(m => m.status === 'active');
        const psych = active.filter(m => isPsychMed(m.rxNormCode));
        const other = active.filter(m => !isPsychMed(m.rxNormCode));
        
        context += 'CURRENT MEDICATIONS:\n';
        if (psych.length) {
            context += '  Psychiatric:\n';
            psych.forEach(m => {
                context += `    - ${m.name} ${m.dose || ''} ${m.frequency || ''}\n`;
            });
        }
        if (other.length) {
            context += '  Other:\n';
            other.forEach(m => {
                context += `    - ${m.name} ${m.dose || ''} ${m.frequency || ''}\n`;
            });
        }
    }
    
    // Labs — most recent, flagging abnormals
    if (data.labResults?.length) {
        context += '\nRECENT LABS:\n';
        // Group by panel, sort by date
        const grouped = groupLabsByPanel(data.labResults);
        for (const [panel, labs] of Object.entries(grouped)) {
            context += `  ${panel} (${labs[0].collectionDate}):\n`;
            labs.forEach(l => {
                const flag = l.isAbnormal ? ' [ABNORMAL]' : '';
                context += `    - ${l.name}: ${l.value} ${l.units || ''}${flag}`;
                if (l.referenceRange) context += ` (ref: ${l.referenceRange})`;
                context += '\n';
            });
        }
    }
    
    // Diagnoses — active problem list
    if (data.conditions?.length) {
        const active = data.conditions.filter(c => c.clinicalStatus === 'active');
        context += '\nACTIVE DIAGNOSES:\n';
        active.forEach(c => {
            context += `  - ${c.icd10Code}: ${c.displayName}`;
            if (c.onsetDate) context += ` (onset: ${c.onsetDate})`;
            context += '\n';
        });
    }
    
    // Vitals — most recent
    if (data.vitalSigns?.length) {
        context += '\nMOST RECENT VITALS:\n';
        data.vitalSigns.forEach(v => {
            context += `  - ${v.name}: ${v.value} ${v.units || ''} (${v.recordedDate})\n`;
        });
    }
    
    return context;
}
```

**Fallback strategy:** If HealthKit data is available, use it. If not (patient hasn't connected, or using web), fall back to clipboard workflow. Both paths feed the same prompt builder fields, so the downstream note generation is identical.

---

## Phase 4: In-Visit UX Polish (1 week)

### Provider-Side (epic-scribe web UI)

On the workflow page (`/workflow`), after selecting a patient:

- If patient has HealthKit data synced: show green badge "Clinical data from Apple Health" with timestamp of last sync
- Display summary: "12 active medications, 3 recent lab panels, 8 active diagnoses"
- Toggle to expand/preview the structured data before generating note
- Option to manually refresh (triggers push notification to patient's app to re-sync)

### Patient-Side (Moonlit iOS app)

- During onboarding or first visit: prompt to connect health records
- Background sync: app periodically queries HealthKit for new data (when app is opened or via background app refresh)
- Before-visit sync: push notification 1 hour before scheduled appointment saying "Tap to sync your latest health records for your visit today"
- Privacy dashboard: show patient what data has been shared and with which provider

---

## Phase 5: Apple Review Preparation (concurrent with Phase 2-3)

### Required for Clinical Records Access

1. **Privacy Policy** — Must explicitly cover:
   - What clinical data types are accessed
   - How data is transmitted and stored
   - Who has access (provider only)
   - Data retention and deletion policies
   - HIPAA compliance statement

2. **App Review Notes** — Explain to Apple:
   - App is used by licensed psychiatrists at Moonlit Psychiatry
   - Clinical records access provides the treating physician with medication list, lab results, and clinical notes to improve documentation accuracy
   - Data is transmitted over HTTPS to HIPAA-compliant backend (Supabase with encryption at rest)
   - Patient explicitly authorizes sharing during a clinical visit

3. **Proportional Access** — Only request the clinical record types you actually use. Don't request immunization records if you won't use them. Apple reviews this.

---

## Phase 6: SmartLink Database (parallel workstream)

This is a separate but converging effort. The SmartLink/DotPhrase catalog becomes the answer key for what MCP tools to eventually expose.

### Building the Catalog

1. **System-level SmartLinks** (`@` prefix) — these are standard across all Epic institutions:
   - Documented on Epic UserWeb
   - Examples: `@PROBLEMLIST@`, `@MEDHX@`, `@LASTBMP@`, `@VITALS@`, `@ALLERGIES@`
   - Map each to FHIR resource type + query parameters

2. **Institution-specific DotPhrases** (`.` prefix) — these vary by U of U:
   - Use SmartTool Butler (`.?`) to search systematically
   - Search categories: labs (BMP, CBC, CMP, lithium, valproate, UDS, thyroid, hepatic), vitals, medications, problem list, encounters, procedures
   - Document: name, description, what it pulls, FHIR equivalent

3. **Storage format:**
   ```json
   {
     "smartlinks": [
       {
         "name": "@LASTBMP@",
         "type": "smartlink",
         "scope": "system",
         "description": "Most recent Basic Metabolic Panel results",
         "pulls": "Latest BMP lab panel with individual component values",
         "fhir_mapping": {
           "resource": "Observation",
           "category": "laboratory",
           "code_system": "http://loinc.org",
           "codes": ["51990-0"],
           "sort": "date:desc",
           "count": 1
         },
         "mcp_tool": {
           "name": "get_lab_panel",
           "params": {
             "panel": "BMP",
             "sort": "date_desc",
             "limit": 1
           }
         }
       }
     ]
   }
   ```

4. **Ask Epic analyst team** if there's an admin report that can export SmartPhrase/SmartLink definitions from Clarity database

### Convergence with HealthKit

The SmartLink catalog and HealthKit integration solve the same problem from different angles. HealthKit gives you the data pipeline (FHIR resources flowing from Epic to your app). The SmartLink catalog tells you what clinical data retrieval patterns are actually useful. Together, they define the MCP tool signatures for the future: each SmartLink becomes a tool the model can call, and HealthKit is the data source those tools query.

---

## Architecture Summary

```
TODAY (Phase 1-4):
  Apple Health → HealthKit API → iOS app → epic-scribe backend → prompt builder
  (Patient authorizes. App reads FHIR. Backend transforms. Model generates note.)

NEAR FUTURE (Phase 6):
  Same pipeline + SmartLink catalog defining which data matters for which clinical context
  (Prompt builder gets smarter about what to pull based on visit type)

FUTURE (MCP):
  HealthKit FHIR data exposed via MCP server
  Model dynamically queries clinical data tools during note generation
  SmartLink catalog = MCP tool definitions
  Model decides what data it needs based on what emerges in the visit
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `apps/ios/HealthRecordsManager.swift` | HealthKit authorization + FHIR resource queries |
| `apps/ios/ClinicalDataSync.swift` | Transform FHIR → ClinicalDataPayload, POST to backend |
| `apps/web/app/api/clinical-data/healthkit/route.ts` | API endpoint receiving HealthKit data |
| `services/note/src/fhir/fhir-to-context.ts` | Transform structured FHIR data to prompt builder context |
| `services/note/src/fhir/psych-med-classifier.ts` | Classify medications as psychiatric vs. other (by RxNorm) |
| `services/note/src/fhir/lab-panel-grouper.ts` | Group lab results into clinical panels (BMP, CBC, etc.) |
| `configs/smartlink-catalog.json` | SmartLink → FHIR mapping database |
| `supabase/migrations/XXX_clinical_data.sql` | patient_clinical_data table |

### Modified Files
| File | Change |
|------|--------|
| `services/note/src/prompts/prompt-builder.ts` | Add `healthKitData` to options, integrate `buildHealthKitContext()` |
| `apps/web/src/components/workflow/GenerateInputStep.tsx` | Show HealthKit data status badge |
| `apps/web/app/api/generate/route.ts` | Fetch HealthKit data from DB if available for patient |

---

## Open Questions

1. **What percentage of patients have already connected U of U Health to Apple Health?** (Determines adoption friction)
2. **Does U of U's FHIR endpoint include narrative text from progress notes?** (Phase 1 verification — determines if this fully replaces clipboard)
3. **How to handle patients who haven't connected Apple Health?** (Answer: fallback to clipboard watcher, with in-visit prompt to connect)
4. **Should the app proactively prompt patients to connect health records during Moonlit's intake process?** (Yes — add to onboarding flow)
5. **Background sync frequency?** (Recommended: on app launch + before scheduled appointments + manual trigger)
6. **Data retention policy for clinical data in Supabase?** (Recommend: keep for duration of treatment relationship, delete on patient request)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Verify data availability | 1-2 days | Just Rufus + his iPhone |
| Phase 2: iOS HealthKit integration | 1-2 weeks | Moonlit iOS app exists (or create minimal version) |
| Phase 3: Backend FHIR transform | 1 week | Phase 2 data format finalized |
| Phase 4: UX polish | 1 week | Phase 2 + 3 working |
| Phase 5: Apple review prep | Concurrent | Privacy policy, usage description |
| Phase 6: SmartLink catalog | Ongoing | SmartTool Butler access, Epic UserWeb |

**Total to working MVP: ~4-5 weeks** (Phases 2-5 in parallel where possible)

Phase 1 is the critical gate — do it first before investing any dev time.
