# The AI MA — Action Resolver Implementation Spec

**Owner:** Dr. Rufus Sweeney (PGY-4 Psychiatry, Moonlit Psychiatry PLLC)
**Repo:** epic-scribe (existing Next.js 14+ / pnpm monorepo / Supabase / Gemini)
**Created:** April 1, 2026
**North Star:** Build Michelle — not a scribe, but a medical assistant who listens to the visit, understands what needs to happen next, and pre-executes every post-visit action so the physician approves with one click.

---

## The Insight

Every AI scribe on the market operates on the same model: listen → produce a record of what happened. The note is the output. The note is the product.

strong.work/flow does something categorically different. It listens → produces a record AND extracts what needs to happen next → pre-executes each action against the downstream systems → queues everything for one-click physician approval.

The difference is the difference between a transcriptionist and a medical assistant. A transcriptionist writes down what you said. A medical assistant writes it down and then goes and does the next five things — orders the labs, queues the prescription, schedules the follow-up, starts the prior auth, submits the claim — without you having to spell it out.

This spec describes the **Action Resolver**: the connecting layer between the transcript (which already exists) and the execution services (which already exist). It is estimated at 500–800 lines of core TypeScript. The architecture is already built. The only missing piece is the router.

---

## Why This Is Possible Now

Every downstream service the Action Resolver needs to call already exists and is working:

| Service | Location | Status | What It Does |
|---------|----------|--------|-------------|
| Note generation | `services/note/` | ✅ Working | Gemini 2.5 Pro, 15 templates, 97+ SmartLists |
| Action item extraction | `services/note/` (current to-do list) | ✅ Working | Extracts to-do items from transcript |
| Lab requisition + fax | `LAB_FAX_IMPLEMENTATION_PLAN.md` | 🔧 Pipeline designed | PDF generation → Phaxio fax → Labcorp Murray |
| E-prescribe | Surescripts-certified platform (see E-Prescribing Research below) | 📋 Planned (Phase 4 of /flow spec) | DEA-compliant EPCS, vendor TBD |
| Claims pipeline | `packages/backend/src/services/em-claims.service.ts` | ✅ Working | Deterministic CPT rules, 837P generation, SFTP submission |
| Eligibility verification | `packages/backend/src/services/eligibility.service.ts` | ✅ Working | X12 270/271, 6+ payers verified |
| Payer rules + config | `packages/backend/src/services/payer-rules.service.ts` | ✅ Working | Payer-specific auth requirements, coverage rules |
| ICD-10 extraction | `packages/backend/src/services/gemini.service.ts` | ✅ Working | AI diagnosis extraction from notes |
| Rendering provider logic | `packages/backend/src/services/em-claims.service.ts` | ✅ Working | Payer-based NPI selection (supervision model) |
| Patient database | Supabase `patients`, `encounters`, `generated_notes` | ✅ Working | Demographics, insurance, med list, diagnosis list |
| IntakeQ integration | `services/intakeq-api/`, `services/intakeq-playwright/` | ✅ Working | Patient records, scheduling, messaging, portal |
| CHIE/ADT alerts | `UHIN_CHIE_INTEGRATION_SPEC.md` | 📋 In progress | Hospital admit/discharge/transfer notifications |
| Patient profiles | `services/note/src/extractors/` | ✅ Working | Cumulative structured profile per patient |
| Google Calendar | `apps/web/src/google-calendar.ts` | ✅ Working | Scheduling, appointment management |
| Coding recommender | `packages/coding-recommender/` | ✅ Working | Full CPT/ICD-10 recommendation engine |

The Action Resolver does NOT rebuild any of these. It classifies, enriches, and routes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        VISIT LIFECYCLE                                    │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │ Pre-Visit│───▶│ In-Visit │───▶│ Post-Vist│───▶│ Between Visits    │  │
│  │ Synthesis│    │ (scribe) │    │ (AI MA)  │    │ (monitors)        │  │
│  └──────────┘    └──────────┘    └──────────┘    └───────────────────┘  │
│       │                │               │                  │              │
│   CHIE alerts     Transcript     Action Resolver     Follow-up          │
│   Prior visit     Note gen       Lab staging          monitors          │
│   deltas          Action         Rx pre-fill         ADT alerts         │
│   MBC trends      extraction     Auth pre-fill       Med adherence      │
│                                  Claim staging        Scheduling         │
│                                  Referral gen          flags             │
│                                  Patient summary                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### The Action Resolver — Core Flow

```
Visit Transcript
       │
       ▼
┌─────────────────────────┐
│  ACTION EXTRACTOR       │
│  (Gemini 2.5 Pro)       │
│                         │
│  Input: raw transcript  │
│  Output: structured     │
│  action intents (JSON)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  ACTION RESOLVER        │
│                         │
│  For each action:       │
│  1. Classify type       │
│  2. Enrich with patient │
│     + payer context     │
│  3. Route to stager     │
│  4. Pre-stage execution │
│  5. Write to            │
│     staged_actions      │
└────────┬────────────────┘
         │
    ┌────┼────┬─────────┬─────────┬──────────┬──────────┐
    ▼    ▼    ▼         ▼         ▼          ▼          ▼
  Labs  Rx  Follow-up  Auth    Claims    Referral   Patient
                                                    Summary
```

### Trigger Point

The Action Resolver fires when the encounter state machine transitions to `signed` (physician signs the note). This is the natural trigger because:

1. The transcript is finalized
2. The note has been reviewed and approved (confirming clinical intent)
3. The physician is still in the encounter context and can immediately review staged actions
4. It prevents premature action staging on draft notes

However, action EXTRACTION (the Gemini call) should fire at `note-ready` — when the note generates but before signing. This way the actions are already staged and waiting by the time the physician finishes reviewing and signing the note. The physician sees actions appear in the Actions tab in real-time as they're reviewing the note. Signing unlocks the "execute" buttons.

### State Machine Extension

```
Current (from STRONG_WORK_FLOW_IMPLEMENTATION.md):

  scheduled → ready → in-visit → note-pending → note-ready → signed

Extended:

  scheduled → ready → in-visit → note-pending → note-ready → signed
                                      │                          │
                                      │                          ▼
                                      │                   actions-staged
                                      │                     (actions are
                                      │                      executable)
                                      ▼
                                 actions-extracting
                                   (Gemini processing
                                    transcript for
                                    action intents)
```

More precisely: `note-pending` triggers both note generation AND action extraction in parallel. By the time the physician sees `note-ready`, the Actions tab is already populated. Signing transitions to `signed` which unlocks execution on all staged actions.

---

## Data Model

### `staged_actions` Table

```sql
create table staged_actions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references encounters(id) on delete cascade,
  patient_id uuid not null references patients(id),
  provider_id uuid not null references es_providers(id),

  -- Classification
  action_type text not null check (action_type in (
    'lab', 'rx_new', 'rx_change', 'rx_refill', 'rx_discontinue',
    'followup', 'prior_auth', 'claim', 'referral', 'patient_summary',
    'safety_plan', 'other'
  )),
  urgency text not null default 'routine' check (urgency in (
    'stat', 'urgent', 'routine'
  )),

  -- Display
  display_text text not null,               -- Human-readable one-liner
  display_detail text,                      -- Optional longer description
  transcript_excerpt text,                  -- The part of transcript that generated this

  -- Execution
  status text not null default 'staged' check (status in (
    'extracting',   -- Gemini is processing
    'staged',       -- Ready for physician review (note not yet signed)
    'ready',        -- Note signed, action can be executed
    'approved',     -- Physician clicked approve/execute
    'executing',    -- Downstream service call in progress
    'completed',    -- Successfully executed
    'failed',       -- Execution failed (with error details)
    'dismissed'     -- Physician chose to skip this action
  )),
  staged_payload jsonb not null default '{}',   -- Type-specific pre-filled data
  execution_result jsonb,                        -- Response from downstream service
  error_message text,                            -- If status = 'failed'

  -- Monitoring (for followup type)
  monitor_until timestamptz,                -- Stop monitoring after this date
  monitor_status text check (monitor_status in (
    'watching', 'triggered', 'resolved', 'expired'
  )),

  -- Timestamps
  executed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_staged_actions_encounter on staged_actions(encounter_id);
create index idx_staged_actions_provider_status on staged_actions(provider_id, status);
create index idx_staged_actions_monitor on staged_actions(monitor_status, monitor_until)
  where monitor_status = 'watching';
create index idx_staged_actions_type on staged_actions(action_type);

-- RLS (multi-tenant isolation — same pattern as all other tables)
alter table staged_actions enable row level security;
create policy "Users can view own staged_actions"
  on staged_actions for select using (
    provider_id = (select id from es_providers where user_id = auth.uid())
  );
create policy "Users can update own staged_actions"
  on staged_actions for update using (
    provider_id = (select id from es_providers where user_id = auth.uid())
  );
create policy "Service role can insert staged_actions"
  on staged_actions for insert with check (true);

-- Updated_at trigger (reuse existing pattern)
create trigger set_updated_at before update on staged_actions
  for each row execute function update_updated_at();
```

### `pending_followups` Table (Monitoring)

```sql
create table pending_followups (
  id uuid primary key default gen_random_uuid(),
  staged_action_id uuid not null references staged_actions(id) on delete cascade,
  patient_id uuid not null references patients(id),
  provider_id uuid not null references es_providers(id),

  -- Follow-up details
  interval_weeks int not null,
  reason text,
  target_date date not null,                  -- Ideal follow-up date
  alert_date date not null,                   -- When to flag if not booked (target - 5 days default)
  hard_deadline date,                         -- For HEDIS: 7 days post-discharge, etc.

  -- Status
  status text not null default 'watching' check (status in (
    'watching',     -- Monitoring for booking
    'booked',       -- Patient scheduled appointment (resolved)
    'alerted',      -- Alert date passed, no booking — flagged in Inbox
    'escalated',    -- Patient outreach sent
    'expired',      -- Past hard deadline, no booking
    'dismissed'     -- Provider dismissed the alert
  )),

  -- Resolution
  booked_appointment_id text,                -- IntakeQ appointment ID if booked
  outreach_sent_at timestamptz,              -- When automated message was sent
  resolved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pending_followups_status on pending_followups(status, alert_date)
  where status in ('watching', 'alerted');
create index idx_pending_followups_patient on pending_followups(patient_id);
```

---

## Action Extraction — The Gemini Prompt

This is the single most important artifact in the system. It converts a raw transcript into structured action intents.

### System Prompt

```
You are a psychiatric medical assistant AI. You have just listened to a psychiatric visit.
Your job is to extract every actionable clinical intent from the transcript — things the
physician said they want to do, order, prescribe, schedule, refer, or communicate.

You are NOT generating a clinical note. You are generating a structured action list.

Return ONLY valid JSON. No markdown, no preamble, no explanation.

Output schema:
{
  "actions": [
    {
      "type": "lab" | "rx_new" | "rx_change" | "rx_refill" | "rx_discontinue" |
              "followup" | "prior_auth" | "referral" | "safety_plan" | "patient_education" | "other",
      "urgency": "stat" | "urgent" | "routine",
      "summary": "Brief one-line description of the action",
      "details": { ... type-specific fields ... },
      "transcript_excerpt": "The relevant quote from the transcript (max 200 chars)"
    }
  ]
}

Type-specific detail schemas:

For type "lab":
{
  "tests": ["lithium level", "CBC with differential", "CMP", ...],
  "fasting_required": true/false,
  "timing": "before next visit" | "stat" | "routine",
  "special_instructions": "optional string"
}

For type "rx_new":
{
  "medication": "Seroquel",
  "dose": "50mg",
  "frequency": "at bedtime",
  "quantity": 30,
  "refills": 0,
  "indication": "insomnia and mood stabilization",
  "special_instructions": "take at bedtime, avoid driving until tolerability established"
}

For type "rx_change":
{
  "medication": "Vraylar",
  "previous_dose": "1.5mg daily",
  "new_dose": "3mg daily" | null (if discontinuing),
  "change_type": "increase" | "decrease" | "discontinue",
  "reason": "partial response, tolerating well"
}

For type "rx_discontinue":
{
  "medication": "Vraylar",
  "reason": "akathisia — patient unable to tolerate",
  "taper_instructions": "may stop abruptly given low dose and short duration" | null
}

For type "rx_refill":
{
  "medication": "sertraline",
  "dose": "100mg daily",
  "quantity": 90,
  "refills": 3
}

For type "followup":
{
  "interval_weeks": 2,
  "reason": "medication initiation monitoring",
  "specific_date": null | "2026-04-15",
  "hedis_relevant": true/false,
  "hedis_measure": "FUH-7" | "FUA" | null
}

For type "prior_auth":
{
  "medication_or_service": "Vraylar",
  "payer_mentioned": "Optum" | null,
  "clinical_justification_excerpts": [
    "patient has tried and failed sertraline and bupropion",
    "current episode duration 6 months",
    "moderate-to-severe functional impairment"
  ]
}

For type "referral":
{
  "referral_to": "Dr. Smith" | "therapist" | "neuropsychological testing",
  "specialty": "psychotherapy" | "neuropsych" | "primary care" | "other",
  "reason": "CBT for anxiety management",
  "urgency": "routine"
}

For type "safety_plan":
{
  "update_type": "new" | "review" | "update",
  "risk_level_discussed": "low" | "moderate" | "high",
  "components_discussed": ["warning signs", "coping strategies", "emergency contacts"]
}

For type "patient_education":
{
  "topics": ["akathisia side effect", "importance of medication adherence", "sleep hygiene"],
  "specific_instructions": ["take Seroquel at bedtime", "do not drive until tolerability known", "call if restlessness occurs"]
}

For type "other":
{
  "description": "free text description of the action"
}

Rules:
- Extract ONLY actions the physician explicitly stated or clearly implied intent to perform.
- Do NOT invent actions that weren't discussed.
- Do NOT include documentation tasks (note writing, chart updates) — those are handled separately.
- If the physician said "we should think about" or "consider" something, include it with a note in summary that it's tentative.
- One action per item. If the physician ordered 3 labs, that's 1 lab action with 3 tests, not 3 actions.
- But if the physician prescribed 2 different medications, that's 2 separate rx actions.
- Include patient_education if the physician explained side effects, gave behavioral instructions, or provided psychoeducation that the patient should receive in writing.
- Include followup even if the physician just said "see you in X weeks" in passing.
```

### User Prompt

```
Here is the transcript from a psychiatric visit. Extract all actionable clinical intents.

Patient: {patient_name}
Visit type: {visit_type} (intake / follow-up / crisis / etc.)
Current medications (from patient profile): {med_list}
Current diagnoses: {diagnosis_list}
Payer: {payer_name}

TRANSCRIPT:
{transcript}
```

### Why Patient Context is in the Prompt

Including the patient's med list, diagnoses, and payer in the extraction prompt helps Gemini:
- Distinguish between a NEW medication (not on the list) and a REFILL (already on the list)
- Distinguish between a dose CHANGE and a new start
- Flag prior auth relevance based on payer (if the physician mentions a brand-name medication and the payer is Medicaid)
- Identify HEDIS-relevant follow-ups (if the patient has a recent hospitalization flagged in their profile)

---

## Stager Implementations

Each stager takes a raw action intent (from Gemini) + patient context (from Supabase/IntakeQ) and produces a `staged_payload` that the UI can render and the execution layer can consume.

### Lab Order Stager

**File:** `services/action-resolver/stagers/lab-order.ts`

**Input:** Action intent with `type: "lab"`, patient record, payer info

**What it does:**
1. Maps natural-language test names to Labcorp 6-digit codes using a lookup table
   - "lithium level" → `001040` (Lithium, Serum)
   - "CBC with differential" → `005009` (CBC/Diff)
   - "CMP" → `322000` (Comprehensive Metabolic Panel)
   - "TSH" → `004259` (TSH)
   - "lipid panel" → `303756` (Lipid Panel)
   - "A1C" → `001453` (Hemoglobin A1c)
   - "prolactin" → `004465` (Prolactin)
   - "hepatic function panel" → `322755` (Hepatic Function Panel)
   - "valproic acid level" → `001685` (Valproic Acid)
   - This table should be maintained as a simple JSON/TS map; start with the 20 most commonly ordered psychiatric labs and expand as needed
2. Pulls patient demographics from Supabase `patients` table (name, DOB, address, phone)
3. Pulls insurance information (payer name, member ID, group number) from patient record
4. Pulls Medicaid ID if applicable (from eligibility service cache or patient record)
5. Structures the complete requisition payload — identical schema to what `pdfGenerator.js` expects:

```typescript
interface LabOrderPayload {
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    medicaidId?: string;
  };
  insurance: {
    payerName: string;
    memberId: string;
    groupNumber?: string;
  };
  tests: Array<{
    name: string;
    labcorpCode: string;
    icd10: string[];       // From the encounter's diagnosis list
  }>;
  fasting: boolean;
  specialInstructions?: string;
  orderingProvider: {
    name: string;
    npi: string;
  };
  collectionSite: {
    name: string;           // "Labcorp Murray PSC"
    faxNumber: string;      // "(801) 268-2553"
    address: string;
    phone: string;
  };
}
```

6. Writes to `staged_actions` with `action_type: 'lab'` and the above as `staged_payload`

**Execution (on physician approval):**
1. Pass `staged_payload` to `pdfGeneratorServer.js` → generates requisition PDF
2. Store PDF in Supabase Storage
3. Send PDF to Phaxio → fax to Labcorp Murray (or other configured PSC)
4. Update status to `completed` with fax confirmation ID in `execution_result`
5. If fax fails, update status to `failed`, provide PDF download link as fallback

**Display in UI:**
```
🧪 Lab Order: Lithium Level, CBC w/ Diff, CMP
   Labcorp Murray PSC · Fasting: No
   [Review PDF]  [Send Fax ✓]  [Dismiss ✗]
```

**Labcorp Code Lookup Table (initial set — expand as needed):**

```typescript
const LABCORP_TEST_MAP: Record<string, { code: string; name: string; fasting?: boolean }> = {
  // Mood stabilizer levels
  'lithium': { code: '001040', name: 'Lithium, Serum' },
  'lithium level': { code: '001040', name: 'Lithium, Serum' },
  'valproic acid': { code: '001685', name: 'Valproic Acid, Total' },
  'valproic acid level': { code: '001685', name: 'Valproic Acid, Total' },
  'depakote level': { code: '001685', name: 'Valproic Acid, Total' },
  'carbamazepine': { code: '001032', name: 'Carbamazepine, Total' },
  'tegretol level': { code: '001032', name: 'Carbamazepine, Total' },
  'lamotrigine': { code: '080357', name: 'Lamotrigine' },
  'lamictal level': { code: '080357', name: 'Lamotrigine' },

  // Metabolic monitoring
  'cmp': { code: '322000', name: 'Comprehensive Metabolic Panel', fasting: true },
  'comprehensive metabolic panel': { code: '322000', name: 'Comprehensive Metabolic Panel', fasting: true },
  'bmp': { code: '322777', name: 'Basic Metabolic Panel', fasting: true },
  'basic metabolic panel': { code: '322777', name: 'Basic Metabolic Panel', fasting: true },
  'cbc': { code: '005009', name: 'CBC with Differential' },
  'cbc with diff': { code: '005009', name: 'CBC with Differential' },
  'cbc with differential': { code: '005009', name: 'CBC with Differential' },
  'lipid panel': { code: '303756', name: 'Lipid Panel', fasting: true },
  'a1c': { code: '001453', name: 'Hemoglobin A1c' },
  'hemoglobin a1c': { code: '001453', name: 'Hemoglobin A1c' },
  'hba1c': { code: '001453', name: 'Hemoglobin A1c' },

  // Thyroid
  'tsh': { code: '004259', name: 'TSH' },
  'thyroid': { code: '004259', name: 'TSH' },
  'free t4': { code: '001974', name: 'Free T4' },
  't4 free': { code: '001974', name: 'Free T4' },

  // Endocrine / antipsychotic monitoring
  'prolactin': { code: '004465', name: 'Prolactin' },

  // Liver / hepatic
  'hepatic function panel': { code: '322755', name: 'Hepatic Function Panel' },
  'liver function': { code: '322755', name: 'Hepatic Function Panel' },
  'lfts': { code: '322755', name: 'Hepatic Function Panel' },

  // Renal
  'renal function panel': { code: '322001', name: 'Renal Function Panel' },

  // Substance use
  'uds': { code: '729406', name: 'Drug Screen, Urine' },
  'urine drug screen': { code: '729406', name: 'Drug Screen, Urine' },
  'utox': { code: '729406', name: 'Drug Screen, Urine' },
  'ethanol level': { code: '001198', name: 'Ethanol, Blood' },
  'alcohol level': { code: '001198', name: 'Ethanol, Blood' },

  // Other common
  'vitamin d': { code: '081950', name: '25-Hydroxyvitamin D' },
  'b12': { code: '000810', name: 'Vitamin B12' },
  'folate': { code: '000810', name: 'Folate, Serum' },
  'ferritin': { code: '004598', name: 'Ferritin' },
  'iron panel': { code: '167197', name: 'Iron and TIBC' },
  'magnesium': { code: '001537', name: 'Magnesium, Serum' },
};
```

**NOTE:** Verify all Labcorp codes against current Labcorp test menu before production use. Codes may vary by region and update periodically. The lookup should be fuzzy — use keyword matching, not exact string match — so that "check a lithium" matches "lithium level."

---

### Prescription Pre-fill Stager

**File:** `services/action-resolver/stagers/rx-prefill.ts`

**Input:** Action intent with `type: "rx_new" | "rx_change" | "rx_refill"`, patient record

**What it does:**
1. Structures the prescription data for e-prescribe platform pre-fill (vendor-agnostic payload)
2. Looks up the patient's preferred pharmacy from their profile (if stored)
3. For controlled substances, flags that EPCS two-factor will be required
4. For rx_change: includes the current medication from the patient's med list for reference
5. For rx_discontinue: flags this as informational (no e-prescribe action needed, but should be documented and patient notified)

```typescript
interface RxPrefillPayload {
  action: 'new' | 'change' | 'refill' | 'discontinue';
  medication: string;
  dose: string;
  frequency: string;
  quantity: number;
  refills: number;
  indication: string;
  isControlled: boolean;           // Flags EPCS requirement
  previousMedication?: {           // For changes
    medication: string;
    dose: string;
    changeType: 'increase' | 'decrease' | 'switch' | 'discontinue';
    reason: string;
  };
  preferredPharmacy?: {
    name: string;
    address: string;
    phone: string;
    ncpdpId?: string;
  };
  specialInstructions?: string;
  patientEducation?: string[];      // Side effects discussed, to include in patient summary
}
```

**Execution (on physician approval):**
- Cannot auto-execute (DEA compliance requires physician interaction with e-prescribe platform)
- Instead: opens the e-prescribe UI (iframe/embed) in the Rx tab with the patient pre-loaded and medication pre-searched
- The physician confirms and signs within the e-prescribe platform (EPCS two-factor for controlled substances)
- After signing, the staged_action status updates to `completed`

**Display in UI:**
```
💊 New Rx: Seroquel 50mg at bedtime — Qty 30, 0 refills
   Indication: insomnia + mood stabilization
   ⚠️ Non-controlled — standard e-prescribe
   [Open Rx to Prescribe →]  [Dismiss ✗]
```

For discontinuation:
```
🚫 Discontinue: Vraylar 1.5mg daily
   Reason: akathisia — unable to tolerate
   May stop abruptly (low dose, short duration)
   [Acknowledge ✓]  [Dismiss ✗]
```

---

### Follow-up Monitor Stager

**File:** `services/action-resolver/stagers/followup.ts`

**Input:** Action intent with `type: "followup"`, patient record, encounter date

**What it does:**
1. Calculates target follow-up date from encounter date + interval_weeks
2. Calculates alert date (target - 5 days, configurable)
3. Determines HEDIS relevance:
   - If patient has a recent hospital discharge (from profile or CHIE ADT), flag as FUH-7 or FUH-30
   - If patient has a recent ED visit for alcohol/substance use, flag as FUA
4. Creates `pending_followups` record
5. Sets up the monitoring watch

```typescript
interface FollowupPayload {
  intervalWeeks: number;
  targetDate: string;              // ISO date
  alertDate: string;               // ISO date (when to flag if not booked)
  hardDeadline?: string;           // For HEDIS measures
  reason: string;
  hedisRelevant: boolean;
  hedisMeasure?: 'FUH-7' | 'FUH-30' | 'FUA' | null;
  patientContactInfo: {
    phone?: string;
    email?: string;
    portalEnabled: boolean;         // Can receive IntakeQ portal messages
  };
  automatedOutreach: boolean;       // Whether to auto-send booking reminder
}
```

**Execution (on physician approval):**
1. Create `pending_followups` record with status `watching`
2. If `automatedOutreach` is true and `alertDate` passes without a booking:
   - Send patient reminder via IntakeQ messaging API (or Gmail API fallback)
   - Template: "Hi {firstName}, Dr. {providerLastName} would like to see you by {targetDate}. You can schedule at {bookingLink}."
   - Update followup status to `escalated`
3. Continue monitoring until booking is detected or `hardDeadline` passes

**Monitoring implementation — two approaches (pick based on current IntakeQ integration):**

*Option A: IntakeQ webhook listener*
- IntakeQ fires webhooks on appointment creation
- A webhook handler checks if the new appointment matches any `pending_followups` for that patient
- If match: update followup to `booked`, update staged_action to `completed`

*Option B: Daily cron poll*
- A daily cron job (Vercel cron or Supabase pg_cron) checks all `watching` followups
- For each: query IntakeQ appointments API for the patient within the target window
- If found: update to `booked`; if alert_date passed: update to `alerted` and surface in Inbox

**Recommendation:** Start with Option B (simpler, no webhook infrastructure needed). Migrate to Option A when IntakeQ webhook integration is mature.

**Display in UI:**
```
📅 Follow-up: 1 week (by April 8, 2026)
   Reason: medication initiation monitoring
   Auto-reminder: On (will text patient April 3 if not booked)
   [Approve ✓]  [Change Interval]  [Dismiss ✗]
```

In The Inbox (when alert fires):
```
⚠️ Jane Smith hasn't scheduled her 1-week follow-up
   Due by: April 8 · Reason: medication change monitoring
   Last visit: April 1 · HEDIS: Not flagged
   [Send Reminder]  [View Encounter]  [Dismiss]
```

---

### Prior Authorization Stager

**File:** `services/action-resolver/stagers/prior-auth.ts`

**Input:** Action intent (typically derived from an `rx_new` action where the payer requires auth), patient record, payer rules, transcript

**What it does:**
1. Checks `payer_rules` table to determine if the medication requires prior auth for this payer
2. If no auth required: does NOT create a staged action (or creates an informational "No PA needed" note)
3. If auth required: extracts clinical justification from the transcript
4. Pre-fills a prior auth form with:
   - Patient demographics and insurance info
   - Diagnosis codes (from the encounter)
   - Medication requested (name, dose, quantity)
   - Clinical justification narrative (from transcript excerpts)
   - Prior medication trials (from patient profile med history)
   - Duration of current episode / condition
5. Structures this as a PA form payload

```typescript
interface PriorAuthPayload {
  medication: string;
  dose: string;
  quantity: number;
  daysSupply: number;

  payer: {
    name: string;
    planType: string;                    // 'commercial' | 'medicaid_mco' | 'medicaid_ffs'
    memberId: string;
    groupNumber?: string;
    priorAuthPhone?: string;             // Payer's PA phone number
    priorAuthFax?: string;               // Payer's PA fax number
    epaPortalUrl?: string;               // Electronic PA portal if known
  };

  patient: {
    name: string;
    dob: string;
    diagnoses: Array<{ code: string; description: string }>;
  };

  clinicalJustification: {
    currentSymptoms: string;              // Extracted from transcript
    functionalImpairment: string;         // Extracted from transcript
    priorTrials: Array<{                  // From patient profile + transcript
      medication: string;
      dose: string;
      duration: string;
      outcome: string;                    // "inadequate response", "intolerable side effects", etc.
    }>;
    reasonForRequest: string;             // Why this specific medication
    additionalNotes: string;              // Any other relevant clinical info
  };

  prescriber: {
    name: string;
    npi: string;
    phone: string;
    fax: string;
  };
}
```

**Execution (on physician approval):**
- Phase 1: Generate a formatted PA letter (PDF) that the physician can fax or upload to the payer's portal
- Phase 2 (future): Direct electronic PA submission via CoverMyMeds or payer-specific APIs

**Display in UI:**
```
📋 Prior Auth Required: Vraylar 1.5mg — Optum PMHP
   Clinical justification pre-filled from visit:
   • Failed sertraline 100mg (8 weeks, inadequate response)
   • Failed bupropion 300mg (6 weeks, inadequate response)
   • Current: moderate-severe MDD with anhedonia, 6-month duration
   [Review PA Letter]  [Download PDF]  [Dismiss ✗]
```

---

### Claim Auto-Stage

**File:** `services/action-resolver/stagers/claim.ts`

**Input:** Signed encounter, note, patient record, payer info

**What it does:**
1. This is primarily a trigger — it invokes the EXISTING claims pipeline from `AUTOMATED_CLAIMS_SUBMISSION_SPEC.md`
2. Applies deterministic CPT rules (from `cpt-rules.service.ts`) to the encounter
3. Runs date-of-service eligibility check
4. Selects rendering provider NPI
5. Extracts ICD-10 from the signed note
6. Stages the claim in `em_claims` table as a draft
7. Writes a `staged_actions` record pointing to the draft claim

```typescript
interface ClaimPayload {
  claimId: string;                       // Reference to em_claims table
  cptCodes: Array<{
    code: string;
    modifier?: string;
    units: number;
    description: string;
    estimatedReimbursement?: number;
  }>;
  icd10Codes: Array<{ code: string; description: string }>;
  payer: string;
  renderingProvider: { name: string; npi: string };
  estimatedTotal: number;
}
```

**Execution (on physician approval):**
- Individual claim: generate 837P → SFTP upload to Office Ally
- Batch mode: this claim joins the daily batch in the Inbox for bulk submission

**Display in UI:**
```
💰 Claim Ready: 99215 + 90836 + G2211 — Optum PMHP
   Dx: F33.1 (MDD, recurrent, moderate)
   Rendering: Kyle Roller, MD
   Est. reimbursement: $285
   [Submit Now]  [Add to Batch]  [Edit Codes]  [Dismiss ✗]
```

---

### Referral Letter Stager

**File:** `services/action-resolver/stagers/referral.ts`

**Input:** Action intent with `type: "referral"`, patient record, encounter note

**What it does:**
1. Generates a referral letter using Gemini with the clinical context
2. Includes: patient demographics, relevant diagnoses, current medications, reason for referral, specific questions/requests for the consultant
3. Formats as a professional letter (PDF)

```typescript
interface ReferralPayload {
  referralTo: string;                    // Provider name or specialty
  specialty: string;
  reason: string;
  urgency: 'routine' | 'urgent';
  clinicalSummary: string;               // AI-generated from note + transcript
  specificQuestions?: string[];           // What we want the consultant to address
  patientDemographics: { name: string; dob: string; phone: string };
  currentMedications: string[];
  relevantDiagnoses: Array<{ code: string; description: string }>;
  referringProvider: { name: string; npi: string; phone: string; fax: string };
}
```

**Execution:** Generate PDF letter → fax via Phaxio or send via Gmail API.

**Display in UI:**
```
📨 Referral: Psychotherapy — CBT for anxiety
   To: [Select provider or enter name]
   Reason: CBT for generalized anxiety, complement pharmacotherapy
   [Review Letter]  [Send via Fax]  [Send via Email]  [Dismiss ✗]
```

---

### Patient Visit Summary Stager

**File:** `services/action-resolver/stagers/patient-summary.ts`

**Input:** Encounter note, all other staged actions for this encounter, patient record

**What it does:**
1. Generates a plain-language visit summary for the patient
2. Tailored to THIS visit, THIS patient, THIS conversation
3. Includes:
   - What was discussed (in patient-friendly language)
   - Medication changes (what's new, what stopped, what stayed the same)
   - Side effects to watch for (from the patient_education action intent)
   - When to come back (from the followup action)
   - Labs ordered and where to go (from the lab action)
   - When and how to reach the office if there's a problem
4. Written at approximately 8th-grade reading level
5. Available in English and Spanish (patient language preference from profile)

```typescript
interface PatientSummaryPayload {
  summaryHtml: string;                   // Formatted for IntakeQ portal display
  summaryText: string;                   // Plain text for SMS/email
  language: 'en' | 'es';
  sections: {
    visitOverview: string;
    medicationChanges: string;
    sideEffectsToWatch: string;
    labsOrdered?: string;
    followUpPlan: string;
    emergencyInstructions: string;
  };
  deliveryMethod: 'portal' | 'email' | 'text' | 'print';
}
```

**Execution:** Push to IntakeQ patient portal (via API or Playwright) or send via email/SMS.

**Display in UI:**
```
📄 Patient Visit Summary ready for Maria Garcia
   Includes: medication change, lab order, follow-up plan, side effects
   Language: English
   [Preview]  [Send to Portal]  [Email to Patient]  [Dismiss ✗]
```

---

## Pre-Visit Synthesis (Future — Phase 5+)

This is the "before the visit" layer. It runs automatically when an encounter is created (calendar event detected) and surfaces decision-relevant context before the physician starts the visit.

### What it surfaces:

1. **Since last visit:** Time elapsed, any ADT alerts (ER visits, hospitalizations) from CHIE, any appointment no-shows
2. **Medication status:** Were prescriptions filled? (Requires pharmacy fill data — future CHIE integration or patient self-report)
3. **MBC trends:** PHQ-9, GAD-7, C-SSRS scores over time from patient profile (already extracted by the profile pipeline)
4. **Outstanding actions:** Any pending_followups, uncompleted lab orders, pending prior auths from the last encounter
5. **Today's plan from last visit:** What did the physician say they planned to do at THIS visit? (extracted from the prior encounter's note/actions — e.g., "planned to reassess lithium level at next visit")

### Data sources:
- `staged_actions` from prior encounters (check for uncompleted items)
- `pending_followups` (any that resolved or expired)
- Patient profile (MBC scores, med list, diagnosis list)
- CHIE ADT alerts (when integration is live)
- IntakeQ appointment history (no-shows, cancellations)

This is listed here for architectural context but is NOT part of the initial build phases. It slots in cleanly once the core Action Resolver is working because it reads from the same `staged_actions` table.

---

## File Structure

```
services/action-resolver/
├── index.ts                         # Main entry point — called by encounter state machine
├── resolver.ts                      # Core router: extract → classify → enrich → stage
├── types.ts                         # All TypeScript interfaces (ActionIntent, StagedAction, payloads)
│
├── extractors/
│   └── transcript-actions.ts        # Gemini prompt + response parsing for action extraction
│
├── enrichers/
│   ├── patient-context.ts           # Pulls patient demographics, meds, dx from Supabase/IntakeQ
│   ├── payer-context.ts             # Pulls payer rules, auth requirements, coverage details
│   └── medication-context.ts        # Maps drug names → controlled status, auth requirements
│
├── stagers/
│   ├── lab-order.ts                 # Lab test name → Labcorp code, requisition pre-fill
│   ├── rx-prefill.ts                # Prescription pre-fill (vendor-agnostic)
│   ├── followup.ts                  # Follow-up scheduling + monitoring setup
│   ├── prior-auth.ts               # PA form pre-fill from transcript + patient history
│   ├── claim.ts                     # Trigger existing claims pipeline
│   ├── referral.ts                  # Referral letter generation
│   └── patient-summary.ts          # Patient-facing visit summary generation
│
├── executors/
│   ├── lab-executor.ts              # Calls pdfGenerator + Phaxio fax service
│   ├── followup-executor.ts         # Creates pending_followup, sets up monitoring
│   ├── claim-executor.ts            # Calls existing em-claims + SFTP services
│   ├── referral-executor.ts         # Generates PDF + fax/email
│   ├── patient-summary-executor.ts  # Pushes to IntakeQ portal / email
│   └── generic-executor.ts          # Marks action as completed (for rx, acknowledge-only actions)
│
├── monitors/
│   └── followup-monitor.ts          # Cron job: check pending_followups against IntakeQ bookings
│
└── prompts/
    ├── action-extraction.ts         # System + user prompt templates for Gemini
    ├── patient-summary.ts           # Prompt for generating patient visit summaries
    └── referral-letter.ts           # Prompt for generating referral letters
```

### API Routes (new)

```
apps/web/app/api/
├── actions/
│   ├── extract/
│   │   └── route.ts                 # POST — trigger action extraction for an encounter
│   ├── [id]/
│   │   ├── execute/
│   │   │   └── route.ts             # POST — execute a single staged action
│   │   ├── dismiss/
│   │   │   └── route.ts             # POST — dismiss a staged action
│   │   └── route.ts                 # GET — get action details; PATCH — update payload
│   └── encounter/
│       └── [encounterId]/
│           └── route.ts             # GET — get all actions for an encounter
├── followups/
│   ├── route.ts                     # GET — list pending followups for provider
│   ├── check/
│   │   └── route.ts                 # POST — manual trigger of followup monitoring check
│   └── [id]/
│       └── route.ts                 # PATCH — update followup status
```

### UI Components (extending existing /flow views)

```
apps/web/app/(protected)/flow/
├── components/
│   ├── ActionsPanel.tsx             # UPDATE — currently renders simple to-do list;
│   │                                #   now renders staged_actions with type-specific UI
│   ├── ActionCard.tsx               # NEW — individual action card with execute/dismiss buttons
│   ├── LabActionCard.tsx            # NEW — lab-specific card (test list, fax button)
│   ├── RxActionCard.tsx             # NEW — rx-specific card (med details, e-prescribe link)
│   ├── FollowupActionCard.tsx       # NEW — follow-up card (date, auto-reminder toggle)
│   ├── AuthActionCard.tsx           # NEW — prior auth card (justification preview)
│   ├── ClaimActionCard.tsx          # NEW — claim card (CPT codes, est reimbursement)
│   ├── ReferralActionCard.tsx       # NEW — referral card (letter preview, send options)
│   ├── PatientSummaryCard.tsx       # NEW — patient summary card (preview, send to portal)
│   └── InboxView.tsx                # UPDATE — add pending followup alerts + action queue
```

---

## Implementation Phases

### Phase 1: Extraction + Table + Basic UI (Week 1)
**Goal:** Get structured action intents extracting reliably from real transcripts and displaying in the Actions tab.

**Tasks:**
1. Create `staged_actions` Supabase migration (table + RLS + indexes)
2. Build `extractors/transcript-actions.ts` — the Gemini prompt + JSON response parser
3. Build `resolver.ts` — minimal version that calls extractor and writes raw actions to Supabase
4. Wire extraction trigger to the encounter state machine at `note-pending` state
5. Update `ActionsPanel.tsx` to fetch and render `staged_actions` (replacing or augmenting current to-do list)
6. Build `ActionCard.tsx` — generic card that displays action type icon, summary, transcript excerpt
7. Status buttons: Approve (no-op for now) and Dismiss (sets status to 'dismissed')

**Test with:** 3–5 real visit transcripts from recent Moonlit encounters. Manually review extracted actions for accuracy. Iterate on the Gemini prompt until extraction quality is >90%.

**Definition of done:** After a visit, the Actions tab shows structured, correctly-classified action items extracted from the transcript. They're not yet executable — just visible and dismissable.

**Estimated effort:** 8–12 hours

---

### Phase 2: Lab Order Stager + Execution (Week 2)
**Goal:** Transcript says "check a lithium level" → one tap sends a fax to Labcorp.

**Tasks:**
1. Build `stagers/lab-order.ts` with Labcorp code lookup table
2. Build `enrichers/patient-context.ts` — pulls patient demographics + insurance from Supabase
3. Build `executors/lab-executor.ts` — calls existing PDF generator + Phaxio fax service
4. Build `LabActionCard.tsx` — lab-specific UI with test list, PDF preview, fax button
5. Wire the full loop: extraction → staging → enrichment → UI → execution
6. Handle edge cases: unknown test name (flag for manual entry), missing patient insurance info

**Prerequisite:** Lab fax pipeline (from `LAB_FAX_IMPLEMENTATION_PLAN.md`) must be working. If not yet implemented, build it as part of this phase — it's a 1-day build per that spec.

**Test with:** Order labs from a real visit transcript. Verify the faxed requisition matches what you would have manually created.

**Definition of done:** End a visit, see "Lab Order: Lithium, CBC" in Actions tab, tap "Send Fax," Labcorp Murray receives a correct requisition. Total time from visit end to lab order sent: <30 seconds.

**Estimated effort:** 10–14 hours (including lab fax pipeline if not yet built)

---

### Phase 3: Follow-up Monitor (Week 3)
**Goal:** "Follow up in 2 weeks" → system monitors whether the patient books and flags you if they don't.

**Tasks:**
1. Create `pending_followups` Supabase migration
2. Build `stagers/followup.ts` — calculates dates, checks HEDIS relevance
3. Build `executors/followup-executor.ts` — creates monitoring record
4. Build `monitors/followup-monitor.ts` — daily cron that checks IntakeQ for bookings
5. Build `FollowupActionCard.tsx` — date display, auto-reminder toggle
6. Add follow-up alerts to `InboxView.tsx` — "Jane Smith hasn't booked" with action buttons
7. Optional: automated patient outreach via IntakeQ messaging when alert fires

**Test with:** Approve a follow-up action, then verify the monitor catches it when the patient does (or doesn't) book.

**Definition of done:** Follow-up actions are staged, monitors are running daily, alerts appear in the Inbox when patients don't book. HEDIS-relevant follow-ups are flagged.

**Estimated effort:** 8–10 hours

---

### Phase 4: Claim Auto-Staging (Week 4)
**Goal:** Note signed → claim automatically staged and ready for batch submission.

**Tasks:**
1. Build `stagers/claim.ts` — triggers existing CPT rules engine + eligibility + 837P pipeline
2. Build `executors/claim-executor.ts` — wraps existing em-claims + SFTP services
3. Build `ClaimActionCard.tsx` — CPT codes, estimated reimbursement, edit capability
4. Wire note-signing to automatically trigger claim staging (no manual batch generation needed)
5. Update Inbox with daily batch review: "8 claims ready to submit — Est. $2,340"

**Dependency:** The batch claims pipeline from `AUTOMATED_CLAIMS_SUBMISSION_SPEC.md` should ideally be working. If not, the staged_action can simply link to the existing ClaimsGeneratorView for manual processing, and this phase becomes a lightweight trigger + UI wrapper.

**Definition of done:** Sign a note → claim appears in Actions tab with correct codes and estimated reimbursement → can submit individually or add to daily batch.

**Estimated effort:** 6–8 hours

---

### Phase 5: Rx Pre-fill + Patient Summary (Week 5)
**Goal:** Prescriptions pre-staged for e-prescribe platform. Patient visit summaries auto-generated and pushed to portal.

**Tasks:**
1. Build `stagers/rx-prefill.ts` — structures medication data in vendor-agnostic format
2. Build `RxActionCard.tsx` — medication details + "Open Rx" button
3. Build `stagers/patient-summary.ts` + `prompts/patient-summary.ts` — Gemini generates patient-facing summary
4. Build `executors/patient-summary-executor.ts` — pushes to IntakeQ portal (via Playwright or API)
5. Build `PatientSummaryCard.tsx` — preview + send buttons

**E-prescribe note:** The Rx stager outputs a vendor-agnostic payload. If the chosen e-prescribe platform integration (see E-Prescribing Research section) is not yet live, the Rx cards display pre-filled data with a "copy to clipboard" option for manual entry. The value is still there — the physician doesn't have to remember or re-derive the prescription details.

**Definition of done:** Rx actions show pre-filled medication details. Patient summaries generate in plain language and can be previewed and sent to the IntakeQ portal.

**Estimated effort:** 10–14 hours

---

### Phase 6: Prior Auth + Referral (Week 6)
**Goal:** Prior auths pre-filled with clinical justification from transcript. Referral letters auto-generated.

**Tasks:**
1. Build `enrichers/medication-context.ts` — maps medications → controlled status, common PA triggers
2. Build `stagers/prior-auth.ts` + `prompts/prior-auth-letter.ts`
3. Build `AuthActionCard.tsx` — justification preview, PDF download, payer contact info
4. Build `stagers/referral.ts` + `prompts/referral-letter.ts`
5. Build `executors/referral-executor.ts` — PDF generation + fax/email
6. Build `ReferralActionCard.tsx` — letter preview, send options

**Test with:** Simulate a visit where a brand-name antipsychotic is started on a Medicaid MCO patient. Verify the PA letter captures the relevant clinical justification.

**Definition of done:** Prior auth letters generate from transcript context. Referral letters generate with appropriate clinical summaries. Both are reviewable and sendable from the Actions tab.

**Estimated effort:** 10–14 hours

---

### Phase 7: Pre-Visit Synthesis (Weeks 7–8)
**Goal:** Before each visit, surface decision-relevant context from prior encounters, outstanding actions, and external data.

**Tasks:**
1. Build pre-visit synthesis service that aggregates:
   - Uncompleted staged_actions from prior encounters
   - Pending/expired followups
   - MBC score trends from patient profile
   - ADT alerts from CHIE (if integration is live)
   - Prior visit's "plan for next time" (from the note or action intents)
2. Build pre-visit summary UI in the Encounter view (visible before the visit starts)
3. Wire to calendar event creation — synthesis runs when encounter is created in The Day view

**Definition of done:** Opening an encounter before the visit shows relevant context: outstanding actions, recent events, MBC trends, and what was planned at the last visit.

**Estimated effort:** 12–16 hours

---

## Guiding Principles (extending the five from STRONG_WORK_ROADMAP.md)

The original five principles still apply. These additions are specific to the Action Resolver:

6. **One click, not zero clicks.** The physician approves every action before execution. We never auto-send a fax, auto-submit a claim, or auto-message a patient without explicit approval. The value is in the pre-staging, not the auto-execution. The physician is always in the loop.

7. **Wrong is worse than missing.** If the Gemini extraction is uncertain about an action, it's better to NOT extract it than to extract it incorrectly. A false negative (missed action) means the physician does it manually, like they do today. A false positive (wrong action approved and executed) creates a clinical error. Tune the extraction prompt for precision over recall.

8. **The transcript is the source of truth.** Every staged action includes the `transcript_excerpt` that generated it. The physician can always see WHY the system thinks this action is needed. This builds trust and makes it easy to catch errors.

9. **Degrade gracefully.** If a downstream service is unavailable (Phaxio down, IntakeQ API rate-limited, Office Ally SFTP unreachable), the action stays in `staged` status with a clear error message. The physician can retry later or complete the action manually. Never block the workflow because an external service failed.

10. **Each action type is independent.** Stagers don't depend on each other. The lab stager works even if the claims stager is broken. The follow-up monitor works even if the Rx pre-fill isn't built yet. This enables the phased build — each phase delivers standalone value.

---

## Success Metrics

### Phase 1–2 (MVP: extraction + labs)
- Action extraction accuracy >90% on real transcripts (manually reviewed)
- Lab orders sent via fax in <30 seconds post-approval
- Zero re-entry of information that was said in the visit

### Phase 3–4 (Monitoring + claims)
- Follow-up booking rate tracked (baseline vs. with monitoring)
- Time from note-sign to claim-ready: <60 seconds (automated) vs. current manual batching
- Claims per week submitted with zero manual code selection

### Phase 5–6 (Full action suite)
- Post-visit administrative time per patient: target <2 minutes (from current ~5–10 minutes)
- Patient summary delivery rate (% of visits where patient receives a summary)
- Prior auth turnaround time (time from visit to PA submission)

### Long-term
- "Pajama time" (after-hours documentation): target zero
- Visit completion rate: physician closes laptop when last patient's actions are approved
- Provider NPS: "How likely are you to recommend this tool to a colleague?"

---

## E-Prescribing Platform Research (April 2026)

**Context:** 5 psychiatrists migrating from IntakeQ's integrated ScriptSure e-prescribe. EPCS mandatory for psychiatry (Schedule II stimulants, benzodiazepines). Utah EPCS mandate enacted Jan 2022, CMS enforcing for Medicare Part D since Jan 2023. Must be Surescripts-certified — WENO's independent network has pharmacy rejection issues unacceptable for controlled substances.

### 5-Prescriber Pricing Comparison

| Platform | Path | Per Rx/mo | 5 Rx Monthly | 5 Rx Annual | EPCS | Setup |
|----------|------|-----------|-------------|-------------|------|-------|
| **MDToolbox Complete** | Direct | $35 (annual) | **$175** | $2,100 | Yes | None (ID proofing TBD) |
| **ScriptSure** | Direct (annual) | $41.67 | **$208** | $2,500 | Yes | None ($65/yr ID proofing incl.) |
| **ScriptSure** | Via IntakeQ (current) | $65 | **$325** | $3,900 | Yes | None |
| **DoseSpot** | Via Oystehr | $45 | **$225** | $2,700 | Yes | Oystehr plan required |
| **DoseSpot** | Via Healthie | $60 | **$300** | $3,600 | Yes | Healthie Enterprise required |
| **DrFirst** | Via Practice Better | $49 | **$245** | $2,940 | Yes | $99/rx onboarding ($495 total) |
| **Photon Health** | Direct/API | Not published | N/A | N/A | Unconfirmed | Enterprise sales only |
| **WENO** | Direct | $12 | $60 | $720 | Yes | **NOT recommended** (see below) |

No vendor publishes volume discounts at 5 prescribers (typically starts at 10–20+).

### Decision: ScriptSure Direct Integration with strong.work/flow

**Chosen platform:** ScriptSure (DAW Systems) — direct integration, annual plan.

**Why ScriptSure:**
- **Already credentialed:** All 5 prescribers have active EPCS credentials via IntakeQ's ScriptSure integration. DAW Systems expected to transfer identity proofing (confirm with 866-755-1500 x2).
- **Immediate savings:** IntakeQ charges $65/rx/mo ($325/mo). ScriptSure direct annual plan is $41.67/rx/mo ($208/mo). That's **$1,400/yr saved** — the practice's biggest recurring fixed expense after labor.
- **Surescripts-certified:** Full network connectivity, no pharmacy rejection risk.
- **EPCS included:** No surcharge. DEA-compliant two-factor for Schedule II–V.
- **No setup fees, no contract lock-in.**
- **Integration path:** ScriptSure offers a vendor API (custom pricing from DAW Systems). Phase 1 uses standalone; Phase 2 embeds into `/flow/encounter/[id]` Rx tab.

**Phased integration with strong.work/flow:**

**Phase 1 — Migrate from IntakeQ to ScriptSure direct (immediate)**
- Switch 5 prescribers from IntakeQ-brokered ScriptSure to direct DAW Systems accounts
- Transfer existing EPCS identity proofing (confirm with DAW Systems)
- Prescribers use ScriptSure standalone UI alongside strong.work/flow
- Rx stager outputs copy-to-clipboard data for manual entry into ScriptSure
- **Saves $1,400/yr from day one**

**Phase 2 — Embed ScriptSure into encounter view**
- Contact DAW Systems re: vendor API pricing for custom EHR integration
- Embed ScriptSure in `/flow/encounter/[id]` as an "Rx" tab (iframe or API-driven)
- Patient demographics sync automatically from Supabase → ScriptSure
- Action Resolver's Rx cards link directly to pre-filled ScriptSure prescriptions

**Phase 3 — Evaluate alternatives if ScriptSure API is inadequate**
- DoseSpot Jumpstart iframe ($225/mo via Oystehr for 5 Rx) — fallback if ScriptSure integration is limited
- Photon Health Web Components — monitor for EPCS confirmation and pricing transparency

### Why Not WENO

WENO operates its own network, NOT Surescripts. CVS and Walgreens (CVS owns 25% of Surescripts) have refused WENO prescriptions, asking prescribers to "send it another way." For psychiatry — where Schedule II stimulants and benzodiazepines are routine — pharmacy rejection of EPCS orders is a patient safety issue. The savings ($60/mo vs $175/mo for 5 Rx) are not worth the operational risk.

### Rx Stager Design Implication

The `stagers/rx-prefill.ts` module outputs a **vendor-agnostic payload** (medication, dose, frequency, quantity, refills, indication, controlled substance flag, patient pharmacy preference). This keeps optionality if we switch from ScriptSure to DoseSpot or Photon later. The payload drives:
- ScriptSure: copy-to-clipboard for manual entry (Phase 1), API pre-fill (Phase 2)
- DoseSpot: API call to pre-fill patient + medication in iframe (fallback)
- Photon: GraphQL mutation to create prescription draft (future)

---

## Multi-Tenant Considerations

When this system is offered to other psychiatrists (via the bespoke consulting model or the Strong Work MSO), the following must be configurable per provider:

1. **Lab service:** Not everyone uses Labcorp Murray. The collection site (name, fax number) must be configurable. The test code lookup table should support multiple lab vendors (Quest, regional labs).

2. **Prescribing tool:** The Rx stager outputs a vendor-agnostic payload adaptable to any Surescripts-certified e-prescribe platform. See E-Prescribing Research section for vendor evaluation.

3. **Claims pipeline:** Different providers use different clearinghouses (not just Office Ally). The claim stager should interface with the claims service through an abstraction layer.

4. **Payer rules:** Payer mix varies by geography and practice. The payer rules table is already per-provider in the current architecture.

5. **Follow-up monitoring:** Different providers use different scheduling systems (not just IntakeQ). The followup monitor should check bookings through a scheduling adapter.

6. **Patient communication:** Different providers have different preferences for patient outreach (portal vs. text vs. email vs. none). This must be configurable.

7. **Action extraction prompt:** The Gemini prompt may need specialty-specific tuning. An outpatient med management psychiatrist generates different action types than a C/L psychiatrist. The prompt should be configurable per provider archetype (this is the Setting × EMR matrix in action).

These multi-tenant concerns DO NOT need to be solved in Phase 1–6. They are listed here so that the initial implementation doesn't make choices that are hard to undo later. Specifically:
- Use the existing `provider_id` pattern on all tables
- Keep service-specific configuration (lab vendor, fax number, clearinghouse) in a `provider_settings` table or JSON column rather than hardcoding
- Write stagers against interfaces, not concrete implementations

---

## Relationship to Existing Specs

This spec extends and connects to:

| Spec | Relationship |
|------|-------------|
| `STRONG_WORK_FLOW_IMPLEMENTATION.md` | The Action Resolver lives inside the /flow architecture. It powers the Actions tab in The Encounter and adds action alerts to The Inbox. |
| `STRONG_WORK_ROADMAP.md` | This is the feature that "widens the gap between strong.work and a generic scribe" — principle #3. It transforms the product from an AI scribe into an AI MA. |
| `AUTOMATED_CLAIMS_SUBMISSION_SPEC.md` | The claim stager calls the existing batch claims pipeline. Auto-staging at note-sign replaces manual batch generation. |
| `LAB_FAX_IMPLEMENTATION_PLAN.md` | The lab executor calls the existing Phaxio fax pipeline. The stager pre-populates the same PDF schema. |
| `UHIN_CHIE_INTEGRATION_SPEC.md` | CHIE ADT alerts feed the pre-visit synthesis (Phase 7) and can trigger HEDIS-relevant follow-up flagging. |
| `CIN_TECHNICAL_PLAN.md` | The follow-up monitor directly supports HEDIS FUH-7 measure closure, which is a core CIN value proposition. |

---

## The Michelle Test

Before shipping any phase, ask: **"Would Michelle do this?"**

Michelle doesn't need to be told to order the lab — she heard the physician say it and she goes and does it. Michelle doesn't need to be told to check if the patient booked their follow-up — she just keeps track. Michelle doesn't need to be told to start the prior auth — she knows which payers require them and she pulls together the justification.

But Michelle also doesn't act without confirmation. She queues things up and says "I've got the lab order ready, the fax is addressed to Labcorp Murray, want me to send it?" The physician says yes. Michelle sends it.

That's the product. Build Michelle.
