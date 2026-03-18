# Epic Scribe — Technical Roadmap & Context

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**Production URL:** https://epic-scribe.vercel.app
**North Star:** Generate Epic-ready psychiatry notes with SmartTools that require <5 minutes of edits — and, beyond documentation, become the agentic backbone for non-clinical operations (billing intelligence, payer management, revenue cycle)

---

## Current Status (2026-03-18)

### Working Features
- **Note Generation**: Full workflow with Gemini 2.5 Pro API + automatic failover to backup API key
- **Patient Demographics**: Uses actual patient name/age in notes (not dotphrases like `.FNAME`)
- **Authentication**: NextAuth middleware protecting all routes
- **Template System**: 15 templates with section-level editing
- **SmartList System**: 97+ SmartLists in 8 logical groups
- **Google Integration**: Calendar/Meet/Drive for encounters (shared calendar for HIPAA)
- **Patient Management**: Full CRUD with RLS policies, required for note generation; editable demographics
- **Note Saving**: Save finalized notes with historical context for continuity
- **Therapy Notes**: Specialized BHIDC therapy prompt builder
- **IntakeQ Integration (Read Path)**: Auto-fetch prior notes from IntakeQ for Moonlit Psychiatry patients
- **IntakeQ Integration (Write Path)**: Push generated notes to IntakeQ via Playwright automation (Browserbase on Vercel, local Chromium in dev)
- **Prior Notes Import**: Clipboard-based Epic note import with auto-population in workflow UI
- **Multi-Provider Support**: Per-provider IntakeQ credentials and template configurations via Admin UI
- **HealthKit Clinical Data Integration (COMPLETE)**: Receives FHIR R4 clinical data from Apple Health, enriches note generation with structured medications, labs, conditions, vitals, allergies, clinical notes. iOS app built, installed, and tested on iPhone.
- **QR Code Patient Pairing**: Provider shows QR code on screen (patient page or workflow), patient scans with iOS app camera to link health records — zero typing
- **Background Sync (iOS)**: After one-time setup (authorize + QR scan), app auto-syncs on foreground, on background HealthKit data changes, and immediately after pairing. Patient pairing and auth state persist across launches.
- **Listening Coder (v0)**: Appends CPT code suggestions after note signature. Currently uses static prompt rules — needs payer-aware intelligence (see Product Vision below).
- **Dark Mode UI (COMPLETE)**: Full app dark mode redesign — 50 files converted using CSS custom properties. Space Grotesk + IBM Plex fonts, emerald/salmon accents, dark surfaces, minimal border radius. Landing page unchanged.

### Known Issues
1. **Google OAuth Token Expiration** - Workaround: Sign out/in to refresh (~1 hour expiry)
2. **Vercel 404 Deployment** - Build succeeds but routes return 404 (see `HANDOFF_VERCEL_404.md`)
3. **ESLint Warnings** - `ignoreDuringBuilds: true` masks ~40 errors (mostly unescaped apostrophes)
4. **Listening Coder suggests 90792 for intakes** - In Utah, 90792 reimburses ~50% of E/M codes (992X4/992X5) for FFS Medicaid and MCOs. Should default to E/M codes for intakes. Exception: Optum may require 90792 (unconfirmed — pending contract signing).

---

## Product Vision: Agentic Non-Clinical Operations

Epic Scribe started as a documentation tool, but the long-term vision is a fully integrated, agentic platform for non-clinical operations at Moonlit Psychiatry — starting with billing intelligence and expanding to revenue cycle management.

### Listening Coder — Payer-Aware CPT Suggestions

The Listening Coder (v0) appends CPT code suggestions after the note signature. Currently it uses static prompt rules that don't account for payer-specific reimbursement realities. The goal is intelligent, payer-aware code selection.

**Current problem (v0):**
- Suggests 90792 (psychiatric diagnostic eval) for intakes, which reimburses ~50% of E/M codes in Utah
- E/M codes (99204/99205 for new patients, 99214/99215 for established) are universally accepted by Utah FFS Medicaid and MCOs
- No awareness of which payer the patient has or what that payer actually reimburses
- Exception to track: Optum (contract pending) may require 90792 for intakes — needs confirmation

**Phase 1 — Fee schedule awareness (near-term):**
- Store payer fee schedules in Supabase (CPT code → allowed amount per payer)
- Listening Coder queries patient's payer and compares reimbursement rates across valid codes
- Suggests the highest-reimbursing code that is clinically defensible for the encounter
- Flags when a payer is known to reject certain codes (e.g., if Optum rejects 99205 for intakes)

**Phase 2 — EOB/ERA-driven intelligence (medium-term):**
- Ingest real Explanation of Benefits (EOBs) and Electronic Remittance Advice (ERAs) to learn which codes are actually paid, denied, or down-coded by each payer
- This is the gold standard: hard data on what gets reimbursed, not just fee schedule theory
- **Challenge: data sources vary by payer:**
  - Some payers → Office Ally (Moonlit's primary clearinghouse)
  - Some payers → Availity
  - Some payers → proprietary portals or mailed paper EOBs/remittance
- **Challenge: format variability:**
  - ERAs (835 files) are structured EDI — parseable but need per-payer mapping
  - EOBs are often PDFs or paper — may need OCR or manual entry initially
- Build a `claim_outcomes` table: payer, CPT code, billed amount, allowed amount, paid amount, denial reason, date
- Over time, the Listening Coder learns from real outcomes: "Optum has paid 99205 for intakes 12/12 times" or "Molina denied 90792 3 times in Q4"

**Phase 3 — Proactive billing agent (long-term):**
- Pre-submission claim review: flag likely denials before the claim goes out
- Denial pattern detection: alert when a payer starts denying a code it previously accepted
- Authorization tracking: know which payers require prior auth for which codes
- Appeal automation: generate appeal letters using the clinical note + payer denial reason
- Revenue dashboard: real-time view of expected vs. actual reimbursement by payer

**Moonlit's current payer landscape (Utah):**
- FFS Medicaid (Utah DHHS)
- Medicaid MCOs: Molina, SelectHealth, Healthy U (UofU Health Plans)
- Commercial: pending (Optum contract in progress)
- Clearinghouses: Office Ally (primary), Availity (some payers)

### Beyond Billing — Agentic Operations Platform

The billing intelligence system is the first module. The broader vision is Epic Scribe as the operational brain for Moonlit Psychiatry:
- **Scheduling intelligence**: Optimize provider schedules based on no-show patterns, visit type durations, payer mix
- **Patient outreach**: Automated appointment reminders, intake form follow-ups, prescription refill coordination
- **Credentialing**: Track provider-payer credentialing status, alert on expirations
- **Compliance monitoring**: Ensure documentation meets payer-specific requirements before submission

---

## Environment Variables

```bash
# Gemini API (with automatic failover)
GEMINI_API_KEY=           # Primary key
GEMINI_BACKUP_API_KEY=    # Backup key (auto-used when primary quota exhausted)
GEMINI_MODEL=gemini-2.5-pro

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SHARED_CALENDAR_ID=       # For HIPAA-compliant Meet hosting

# NextAuth
NEXTAUTH_URL=             # Production: https://epic-scribe.vercel.app
NEXTAUTH_SECRET=

# IntakeQ API (for Moonlit Psychiatry prior notes)
INTAKEQ_API_KEY=          # Get from IntakeQ Settings > Integrations > Developer API

# IntakeQ Playwright (for pushing notes)
# These are fallbacks - prefer configuring per-provider in Admin UI
INTAKEQ_USER_EMAIL=       # IntakeQ login email (fallback if no DB credentials)
INTAKEQ_USER_PASSWORD=    # IntakeQ login password (fallback if no DB credentials)
INTAKEQ_NOTE_TEMPLATE_NAME=  # Optional, defaults to "Kyle Roller Intake Note"

# Browserbase (remote browser for serverless IntakeQ push)
BROWSERBASE_API_KEY=      # Enables remote browser on Vercel; omit for local Chromium
BROWSERBASE_PROJECT_ID=   # Browserbase project ID

# HealthKit Clinical Data Sync
HEALTHKIT_SYNC_API_KEY=   # Bearer token for iOS app → backend sync (shared secret)
```

**Note:** When changing domains, update both:
1. `NEXTAUTH_URL` in Vercel environment variables
2. Google Cloud Console OAuth redirect URIs (add `https://[domain]/api/auth/callback/google`)

---

## Key Architecture Decisions

### Patient Demographics in Notes
Patient name and age are now passed directly to the AI prompt instead of using Epic dotphrases:
- First/Last name: Required before note generation
- Age: Calculated from DOB or uses `***-year-old` if not provided
- Files: `prompt-builder.ts`, `api/generate/route.ts`, `GenerateInputStep.tsx`

### Gemini API Failover
Automatic failover to backup API key when primary quota is exhausted:
- Detects 429 quota errors and switches seamlessly
- Logs which key is being used
- File: `services/note/src/llm/gemini-client.ts`

### Template Loading
Database-first with in-memory fallback for templates.

### Note Persistence
Saves both raw AI output and user-edited versions with timestamps.

---

## Quick Reference

### Note Generation Workflow
1. Go to `/workflow`
2. Select patient (required - must have first/last name)
3. Select Setting × Visit Type
4. Paste transcript
5. Click Generate
6. Review/edit, then Save Note

### Local Development
```bash
pnpm dev              # Start dev server on :3002
pnpm dev:clipboard    # Start clipboard watcher (Electron menu bar app)
pnpm build            # Production build
pnpm build:clipboard  # Build clipboard watcher for distribution
pnpm lint             # Check for issues
```

---

## Settings × Visit Types

| Setting | Visit Types | Staffing |
|---------|-------------|----------|
| HMHI Downtown RCC | Intake, TOC, Follow-up | Inline (Intake only) |
| Redwood Clinic MHI | Consultation, TOC, Follow-up | Separate |
| Davis Behavioral Health | Intake, TOC, Follow-up | Separate |
| Moonlit Psychiatry | Intake, TOC, Follow-up | None |
| BHIDC therapy | First Visit, Follow-up | None |
| Teenscope South | Intake, Follow-up | None |
| Psycho-oncology (HCI) | Intake, Follow-up | None |

---

## Recent Updates (2026-03-18)

### Dark Mode UI Redesign (COMPLETE)

Comprehensive visual overhaul converting the entire app from light/cream theme to dark mode. 50 files changed, purely visual — zero functionality changes. The landing page (`app/page.tsx`) was intentionally left unchanged as it already had the target aesthetic.

**Design System:**
- CSS custom properties in `globals.css` `:root` — all colors, borders, status tokens
- Tailwind config maps CSS vars to utility classes (`colors.bg.base`, `colors.accent.primary`, etc.)
- Fonts via `next/font/google`: Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono (code)
- Custom Tailwind `fontFamily` entries: `font-heading`, `font-body`, `font-mono`

**Color Palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0f1117` | Page background |
| `--bg-surface` | `#141720` | Card backgrounds |
| `--bg-surface-2` | `#1a1d27` | Nested surfaces, table headers |
| `--bg-hover` | `#1e2130` | Hover states |
| `--border-default` | `#1e2130` | Card/input borders |
| `--text-primary` | `#e8eaf0` | Headings, primary text |
| `--text-secondary` | `#8b90a0` | Body text |
| `--text-muted` | `#5a5e68` | Placeholders, timestamps |
| `--accent-primary` | `#10b981` | Emerald — CTAs, generate, save |
| `--accent-warm` | `#E89C8A` | Salmon — focus rings, active tabs |
| Status colors | Dark-bg variants | success/warning/error/info with `--*-bg`, `--*-border`, `--*-text` |

**Visual Rules:**
- Border radius: `rounded-[2px]` for cards, `rounded` (4px) for buttons/inputs, `rounded-full` for pills
- No shadows on dark surfaces (all `shadow-*` removed)
- QR codes keep white background container for scanability

**Files Modified (50 total):**
- Foundation: `globals.css`, `tailwind.config.js`, `layout.tsx`, `(protected)/layout.tsx`
- Shell: `AppShell.tsx`, `signin/page.tsx`
- Workflow (8): `WorkflowWizard`, `TemplateReviewStep`, `GenerateInputStep`, `NoteResultsStep`, `PatientSelector`, `AudioRecorder`, `TranscriptSelector`, `workflow/page.tsx`
- Patients (5): `patients/page.tsx`, `[id]/page.tsx`, `PatientOverviewTab`, `PatientNotesTab`, `PatientProfileTab`
- Templates: `templates/page.tsx`, `TemplateEditor.tsx`
- Admin/Batch: `admin/page.tsx`, `batch/page.tsx`
- Workflow extras (4): `ManualNotePanel`, `EncountersList`, `SmartListExpander`, `CompanionPairingModal`
- Patient extras (2): `PatientEncountersTab`, `PatientGenerateTab`
- Modals/editors (4): `SectionCloneModal`, `SmartListEditModal`, `SmartListEditor`, `QuickAddSmartList`
- DE (9): `designated-examiner/page.tsx`, `DEWorkflowWizard`, `StepProgressBar`, `Step1`–`Step5`, `CriterionStatusCard`, `UtahCriteriaChecklist`
- Public pages (5): `companion/page.tsx`, `generate/page.tsx`, `demo/page.tsx`, `smartlists/page.tsx`, `test-psychiatric/page.tsx`
- Other (2): `SmartToolsDemo.tsx`, `moonlit-theme.ts`

**Key files for future UI work:**
- `apps/web/app/globals.css` — all CSS custom properties (design tokens)
- `apps/web/tailwind.config.js` — Tailwind ↔ CSS var mapping
- `apps/web/src/lib/moonlit-theme.ts` — JS theme object (used by SmartListEditModal, QuickAddSmartList for inline styles)

---

### Previous Updates (2026-02-24)

### Psycho-oncology (HCI) Setting (COMPLETE)

Added Huntsman Cancer Institute as a new clinical setting for Dr. Sweeney's psycho-oncology rotation. This is a consultation-liaison setting where psychiatric care intersects with cancer treatment.

**What's different from standard psychiatric notes:**
- **Bio-Psycho-Social-Existential Formulation**: Intake Formulation (Paragraph 2) expands the standard bio-psycho-social model to four domains:
  - **Biological**: Cancer type/stage, cancer treatment effects (chemo brain, fatigue, neuropathy, pain), medication interactions between psychiatric and oncology drugs
  - **Psychological**: Adjustment to diagnosis, illness identity, body image changes, anticipatory grief, fear of recurrence, trauma of treatment
  - **Social**: Caregiver burden, role changes, financial toxicity of cancer care, functional/occupational changes
  - **Existential**: Confrontation with mortality, meaning-making, loss of assumed future, death anxiety, spiritual distress/growth, legacy concerns
- **Follow-up Assessment**: Interval update addresses cancer treatment trajectory changes, treatment side effects impacting psychiatric symptoms, and existential/adjustment concerns

**Files:**
| File | Change |
|------|--------|
| `packages/types/src/index.ts` | Added to `SETTINGS` and `EPIC_EMR_SETTINGS` arrays |
| `apps/web/src/components/workflow/TemplateReviewStep.tsx` | Visit type mapping (Intake, Follow-up) |
| `configs/template-mapping.json` | Template IDs for HCI |
| `services/note/src/prompts/prompt-builder.ts` | SmartLink examples, template mappings, `isPsychoOncology` flag, passes `setting` to psychiatric builder |
| `services/note/src/prompts/psychiatric-prompt-builder.ts` | Accepts `setting` param, injects psycho-oncology overrides for Formulation and Assessment sections |
| `services/note/src/templates/template-service.ts` | Placeholder templates (`hci_psychonc_intake_v1`, `hci_psychonc_fu_v1`) using focused psychiatric format |

**Staffing:** None configured. Can be added later once the HCI workflow is clearer.
**Templates:** Using placeholder focused psychiatric templates. Real HCI-specific templates can replace them later.

---

## Previous Updates (2026-02-21)

### Background Sync for iOS App (COMPLETE)

After one-time setup (authorize HealthKit + scan QR code), the app auto-syncs clinical data without manual taps. Returning users go straight to a dashboard instead of the setup wizard.

**Auto-sync triggers:**
- App comes to foreground (`.onChange(of: scenePhase)`)
- Immediately after QR scan pairing
- Background delivery via `HKObserverQuery` when Apple Health data changes

**Persistence (UserDefaults):**
- Patient pairing: `ScannedPatient.save()` / `loadSaved()` / `clearSaved()` — scan QR once, persisted across launches
- Auth state: `hasAuthorizedBefore` flag — HealthKit doesn't reliably expose read-only auth status, so we track it ourselves
- Last sync date: persisted by `SyncManager`, displayed as relative time on dashboard

**Architecture:**
- `SyncManager.swift` (new) — `ObservableObject` coordinator with `performSync() async -> Bool`. Reads HealthKit → POSTs to backend. Guards against concurrent syncs. Tracks `lastSyncDate` and `lastSyncResult`.
- `HealthKitManager.swift` — Added `enableBackgroundDelivery()` which registers `HKObserverQuery` + `healthStore.enableBackgroundDelivery(for:frequency:.immediate)` for each clinical type. Must be called on every app launch (registrations don't persist across termination). Added `onClinicalDataChanged` callback fired by observer queries.
- `HealthKitSyncApp.swift` — Creates both managers as `@StateObject`, wires `onClinicalDataChanged` → `performSync()`, calls `enableBackgroundDelivery()` on init, injects via `.environmentObject()`.
- `ContentView.swift` — Three-mode conditional UI: (1) not authorized → authorize button, (2) authorized but not paired → QR scan + manual fallback, (3) paired → dashboard with patient card, sync status, "Sync Now" button, "Unpair" button, clinical data preview.
- `project.yml` — Added `INFOPLIST_KEY_UIBackgroundModes: "fetch"` for HealthKit background delivery.

**Files:**
| File | Change |
|------|--------|
| `apps/healthkit-sync/HealthKitSync/ScannedPatient.swift` | Added UserDefaults persistence |
| `apps/healthkit-sync/HealthKitSync/SyncManager.swift` | **New** — sync coordinator |
| `apps/healthkit-sync/HealthKitSync/HealthKitManager.swift` | Background delivery + auth persistence |
| `apps/healthkit-sync/HealthKitSync/HealthKitSyncApp.swift` | Rewritten — init managers, wire callback |
| `apps/healthkit-sync/HealthKitSync/ContentView.swift` | Rewritten — setup wizard → dashboard |
| `apps/healthkit-sync/project.yml` | Added UIBackgroundModes |

**Unchanged:** `Config.swift`, `Models.swift`, `APIClient.swift`, `QRScannerView.swift`

---

### HealthKit Data as Prior Note Substitute (COMPLETE)

For Follow-up and Transfer of Care visits, synced HealthKit clinical data now substitutes for a prior note. Previously, these visit types required a pasted prior note to generate — blocking generation for patients who only had Apple Health data.

**What changed:**
- Frontend: Split `requiresPreviousNote` into `showPreviousNote` (controls section visibility) and `requiresPreviousNote` (controls validation). When HealthKit data is synced, the prior note field shows as "(optional — Health Records synced)" instead of required.
- Backend: `validateRequirements()` accepts `hasHealthKitData` param — passes validation when HealthKit data is present even without a prior note.
- Generate route: Passes `!!healthKitData` to the validator.

**Result:** Notes generated with HealthKit data alone are comparable in quality to notes with a pasted prior note. Structured medication data (doses, routes, frequencies) is often more accurate than copy-forward text. The `***` placeholders in psychiatric/social history sections are expected when no prior note is available — the model correctly avoids fabricating history.

**Files:**
| File | Change |
|------|--------|
| `apps/web/src/components/workflow/GenerateInputStep.tsx` | Optional prior note when HealthKit synced |
| `services/note/src/prompts/prompt-builder.ts` | `validateRequirements()` accepts HealthKit flag |
| `apps/web/app/api/generate/route.ts` | Passes HealthKit presence to validator |

---

## Previous Updates (2026-02-20)

### QR Code Patient Pairing (COMPLETE)

Replaced manual UUID text entry in the iOS app with QR code scanning. Provider shows QR on screen, patient scans with in-app camera — ~10 seconds, zero typing.

**QR payload:** `{"id":"<patient-uuid>","name":"Rufus Sweeney"}`

**Web (provider side):**
- Patient Overview tab → "HealthKit Sync" card → "Show QR Code" button (inline QR + patient name)
- Workflow page → QR button appears next to HealthKit badge when patient is selected → opens modal with QR
- Uses `qrcode` npm package (client-side `QRCode.toDataURL`)

**iOS (patient side):**
- `QRScannerView.swift` — AVFoundation camera wrapper (`UIViewControllerRepresentable`), scans `.qr` only, vibrates on detection
- `ScannedPatient.swift` — `Codable` struct with `from(qrString:)` factory method
- `ContentView.swift` Step 3 → "Scan QR Code" button → camera sheet → green confirmation card with patient name → "Sync to Epic Scribe"
- "Enter UUID manually" fallback link (hidden by default)
- Camera permission added to `project.yml` (`NSCameraUsageDescription`)

**Files:**
| File | Purpose |
|------|---------|
| `apps/web/src/components/patient/PatientOverviewTab.tsx` | QR code card on patient page |
| `apps/web/src/components/workflow/GenerateInputStep.tsx` | QR button + modal in workflow |
| `apps/healthkit-sync/HealthKitSync/QRScannerView.swift` | AVFoundation QR scanner |
| `apps/healthkit-sync/HealthKitSync/ScannedPatient.swift` | QR payload model |
| `apps/healthkit-sync/HealthKitSync/ContentView.swift` | Updated Step 3 UI |
| `apps/healthkit-sync/project.yml` | Camera permission + xcodegen config |

**Tested:** Full end-to-end flow verified — web QR → iOS scan → sync succeeded (2026-02-20)

---

### HealthKit Clinical Data Integration (COMPLETE — Backend + iOS App)

Patient-authorized Apple Health data enriches note generation with structured FHIR R4 clinical records. Replaces/supplements clipboard-based Epic note import with typed, structured data from any health system the patient has connected to Apple Health (Epic MyChart, etc.).

**Architecture:**
```
Apple Health (Epic/MyChart) → iOS App (HealthKit API) → POST /api/clinical-data/healthkit → Supabase → prompt-builder → richer notes
```

**What's built (backend — deployed to production):**
- Shared types: `HealthKitClinicalData`, enriched `MedicationSummary` with structured fields (route, frequency, PRN) + rich context (sig, instructions, dispensing)
- DB: `patient_clinical_data` table (migration 023) — one row per data type per patient, upserted on sync
- Smart filtering in `fhir-to-context.ts`: deduplicates meds by name (keeps most recent), shows active only + recently stopped psych meds (<6mo), deduplicates vitals/labs to most recent per type
- Robust prompt instructions in `prompt-builder.ts`: explains to the model that HealthKit data is structured EHR data (not a prior note), gives specific clinical guidance per data type (medication reconciliation, BP on stimulants, metabolic monitoring, etc.)
- **Coexists with prior note path**: HealthKit data and traditional prior notes (clipboard/IntakeQ) work independently or together. If both present, model gets structured data AND prior note. HealthKit fills the gap when no prior note exists.
- API: `POST /api/clinical-data/healthkit` (bearer token auth) + `GET /api/clinical-data/summary`
- FHIR transforms: `psych-med-classifier.ts` (psychiatric med classification), `lab-panel-grouper.ts` (LOINC-based lab grouping), `fhir-to-context.ts` (clinically organized prompt text)
- Prompt builder: auto-injects "CLINICAL DATA FROM PATIENT HEALTH RECORDS" section when HealthKit data exists
- Generate route: auto-fetches HealthKit data for any patient that has it
- UI: green "Health Records synced" badge in workflow when patient has data
- Apple Health Export parser: `scripts/parse-health-export.ts` — parses unzipped iPhone health export, transforms FHIR JSON, POSTs to API

**What's built (iOS app — built, installed, tested on iPhone):**
- `apps/healthkit-sync/HealthKitSync/` — 9 Swift files (SwiftUI app)
- Reads all clinical record types from HealthKit (meds, conditions, labs, vitals, allergies, procedures, clinical notes)
- Parses FHIR R4 JSON with enriched medication extraction
- QR code scanner for patient pairing (AVFoundation camera)
- POSTs `ClinicalDataPayload` to production endpoint
- Xcode project managed via `project.yml` (xcodegen)

**iOS App Build (on Mac Mini with Xcode):**
```bash
cd apps/healthkit-sync
xcodegen generate                    # Regenerate .xcodeproj from project.yml
xcodebuild -project HealthKitSync.xcodeproj -scheme HealthKitSync \
  -destination 'generic/platform=iOS' -sdk iphoneos -allowProvisioningUpdates build
devicectl device install app --device <DEVICE_UDID> \
  ~/Library/Developer/Xcode/DerivedData/HealthKitSync-*/Build/Products/Debug-iphoneos/HealthKitSync.app
```
- Device UDID for Rufus' iPhone: `00008140-001170D01E33001C`
- Signing: Apple Development: Christopher Sweeney (J6YNYCXUUZ), Team 7T2269T9TK

**Test patient (seeded with real Apple Health data):**
- Name: Rufus Sweeney
- Patient ID: `75168b31-c6eb-4b87-a13a-8e013d87a00d`
- Data: 132 meds, 66 labs, 139 vitals, 126 clinical notes, 1 condition, 2 allergies, 3 procedures
- Mock transcript: `scripts/test-healthkit-transcript.txt` (HMHI Downtown RCC Follow-up)
- Test in web UI: /workflow → select "Rufus Sweeney" → HMHI Downtown RCC → Follow-up → paste transcript → Generate

**Key files:**
| File | Purpose |
|------|---------|
| `packages/types/src/index.ts` | HealthKit types + enriched MedicationSummary |
| `supabase/migrations/023_patient_clinical_data.sql` | DB table |
| `apps/web/src/lib/db/clinical-data.ts` | DB operations (upsert, get, summary, delete) |
| `apps/web/app/api/clinical-data/healthkit/route.ts` | POST endpoint (bearer auth) |
| `apps/web/app/api/clinical-data/summary/route.ts` | GET summary endpoint |
| `services/note/src/fhir/psych-med-classifier.ts` | Psychiatric med classification |
| `services/note/src/fhir/lab-panel-grouper.ts` | Lab panel grouping by LOINC |
| `services/note/src/fhir/fhir-to-context.ts` | FHIR → prompt text transform |
| `services/note/src/prompts/prompt-builder.ts` | Injects HealthKit context into prompt |
| `apps/web/app/api/generate/route.ts` | Auto-fetches HealthKit data per patient |
| `apps/web/src/components/workflow/GenerateInputStep.tsx` | Green badge UI + QR button in workflow |
| `apps/web/src/components/patient/PatientOverviewTab.tsx` | QR code card on patient page |
| `scripts/parse-health-export.ts` | Apple Health Export → API parser |
| `apps/healthkit-sync/HealthKitSync/SyncManager.swift` | Background sync coordinator |
| `apps/healthkit-sync/` | iOS app (SwiftUI, 9 files) |
| `apps/healthkit-sync/project.yml` | Xcode project config (xcodegen) |
| `HEALTHKIT_EPIC_SCRIBE_ROADMAP.md` | Full roadmap document |

**Next steps:**
1. ~~Test web UI with seeded data~~ ✅ Done
2. ~~Build iOS app in Xcode~~ ✅ Done — installed and tested on iPhone
3. ~~QR code patient pairing~~ ✅ Done — full end-to-end tested (2026-02-20)
4. ~~Background sync~~ ✅ Done — auto-sync on foreground, background delivery, post-pairing (2026-02-21)
5. Phase 4: UX polish (data preview in dashboard)
6. Phase 5: Apple review preparation (privacy policy)

---

### Serverless IntakeQ Push via Browserbase (COMPLETE)
IntakeQ write path now works on Vercel via Browserbase remote browser-as-a-service.

**What changed:**
- `playwright` → `playwright-core` (no bundled browsers for remote connect)
- Added `@browserbasehq/sdk` dependency
- `initialize()` branches: Browserbase CDP when `browserbaseApiKey` set, local Chromium otherwise
- Contenteditable fields filled via `evaluate` + `innerText` instead of `keyboard.type` (instant over CDP)
- API route: removed serverless 501 block, added `maxDuration = 60`, passes Browserbase config from env vars
- `AutomationConfig` type extended with `browserbaseApiKey` / `browserbaseProjectId`

**Files modified:**
- `services/intakeq-playwright/package.json` — deps
- `services/intakeq-playwright/src/types.ts` — config type
- `services/intakeq-playwright/src/intakeq-automation.ts` — `initialize()`, `close()`, `fillAllSections()`, `pushNoteToIntakeQ()`
- `apps/web/app/api/intakeq/push-note/route.ts` — serverless support

---

## Previous Updates (2026-02-05)

### Multi-Provider IntakeQ Integration (COMPLETE)
Transformed from single-user MVP to multi-provider system where each provider has their own IntakeQ credentials and template configurations.

**Database Tables (Migration 018-019):**
- `epic_scribe_user_providers` - Links NextAuth users (by email) to moonlit-scheduler providers
- `provider_intakeq_credentials` - IntakeQ login credentials per provider for Playwright automation
- `intakeq_templates` - IntakeQ note template definitions (name, type, field count)
- `intakeq_template_fields` - Field mappings from Epic Scribe sections to IntakeQ form fields

**Admin UI (`/admin`):**
- Configure IntakeQ credentials (email, password, default template)
- View/edit linked users (admin only)
- View available IntakeQ templates

**How it works:**
1. User signs in with Google (NextAuth)
2. System looks up provider via `epic_scribe_user_providers` (by email)
3. When pushing notes to IntakeQ:
   - Uses provider's DB credentials (fallback to env vars if not configured)
   - Loads template field mappings from database
   - Passes dynamic mappings to Playwright automation
4. Admin users can link new users to providers and manage credentials

**Linked Users (epic_scribe_user_providers):**
- hello@trymoonlit.com → Rufus Sweeney (Admin) - primary login for Epic Scribe
- rufussweeney@gmail.com → Rufus Sweeney (Admin)
- merricksreynolds@gmail.com → Merrick Reynolds
- bigrollerdad@gmail.com → Kyle Roller

**Note:** Users must be linked in `epic_scribe_user_providers` table by their NextAuth login email (the Google account they use to sign into Epic Scribe), not their provider email in moonlit-scheduler.

**Files:**
- `apps/web/src/lib/db/providers.ts` - Provider DB operations
- `apps/web/src/lib/db/intakeq-templates.ts` - Template DB operations
- `apps/web/app/(protected)/admin/page.tsx` - Admin dashboard UI
- `apps/web/app/api/admin/` - Admin API routes (data, credentials, link-user)
- `services/intakeq-playwright/src/intakeq-automation.ts` - Updated for dynamic field mappings

---

## Previous Updates (2026-02-04)

### Prior Notes Import System (COMPLETE)
Clipboard-based import of Epic copy-forward notes for **non-Moonlit** settings (HMHI, Redwood, Davis, etc.).

**How it works:**
1. Run clipboard watcher: `pnpm dev:clipboard` (Electron menu bar app)
2. Copy a note from Epic (copy-forward or chart review)
3. Clipboard watcher detects Epic note pattern, parses patient info
4. Note is sent to API, matched to existing patient (or creates new one)
5. In workflow UI, selecting patient for Follow-up/TOC auto-loads most recent prior note

**Components:**
- `apps/clipboard-watcher/` - Electron menu bar app (monitors clipboard)
- `services/epic-note-parser/` - Extracts patient name, DOB, setting, provider from Epic notes
- `apps/web/app/api/prior-notes/import/route.ts` - Receives and stores imported notes
- `apps/web/app/api/prior-notes/patient/[patientId]/route.ts` - Fetches prior notes for UI
- `apps/web/src/lib/db/prior-notes.ts` - Database operations with content hash deduplication

**Database:**
- `prior_notes` table with SHA-256 content hash for deduplication
- Tracks import source, setting, provider, usage in generation

### IntakeQ Integration - Read Path (COMPLETE)
Auto-fetch prior notes from IntakeQ for **Moonlit Psychiatry** patients during Follow-up/TOC visits.

**How it works:**
1. Select Moonlit Psychiatry patient with email for Follow-up or Transfer of Care
2. System auto-fetches most recent locked note from IntakeQ
3. Note is formatted and pre-populated in Prior Note field
4. Patients without email get inline prompt to add one

**Files:**
- `services/intakeq-api/` - API client, types, note formatter
- `apps/web/app/api/intakeq/prior-note/route.ts` - API endpoint
- `apps/web/src/components/workflow/GenerateInputStep.tsx` - UI integration

**Key API details** (learned from debugging):
- Use `search` param, NOT `email` for client lookup: `/clients?search=email@example.com&includeProfile=true`
- Notes endpoint: `/notes/summary?clientId=123&status=1` (status 1=locked, 2=unlocked)
- Full note: `/notes/{noteId}`
- Reference working code in `/Users/macsweeney/cm-research-app/packages/backend/src/services/intakeq.service.ts`

### IntakeQ Integration - Write Path (COMPLETE)
Push generated notes TO IntakeQ via Playwright browser automation.

**Browser strategy:**
- **Vercel/serverless:** Uses [Browserbase](https://browserbase.com) (remote browser-as-a-service) via CDP connection. Requires `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` env vars.
- **Local dev:** Falls back to local Chromium when Browserbase env vars are not set. Set them locally to test the remote path.
- API route timeout set to 60s (`maxDuration = 60`) for the full login + fill + save/lock flow.
- Contenteditable fields are filled via `evaluate` + `innerText` (instant) rather than `keyboard.type` (too slow over CDP).

**Current Status (2026-02-09):**
- ✅ Full end-to-end working on Browserbase (tested 2026-02-09 with TestingPt Test)
- ✅ Login, client navigation, template selection, form filling, diagnosis, save/lock
- ✅ CC field filled via `input.fill()`, rich text sections via `evaluate` + `innerText`
- ✅ Deployed to Vercel with Browserbase env vars

**Test Patient (use for all testing):**
- Name: TestingPt Test
- GUID: `420b2da2-6678-4036-b54a-62b2d22ae1f9`
- IntakeQ ID: 155
- URL: `https://intakeq.com/#/client/420b2da2-6678-4036-b54a-62b2d22ae1f9?tab=timeline`

**Complete Add Note Flow (tested 2026-02-03):**
1. Click blue "+" button (`.btn-group.btn-success.add-new`)
2. Click "Create New Note" in dropdown
3. Select template from dropdown (options: Kyle Roller Intake/Progress, Anthony Privratsky Intake/Progress, etc.)
4. Click "Continue"
5. Note editor loads with sections: Demographics, CC, HPI, etc.
6. Fill form fields (textareas with names like `content-0`, `content-1`, etc.)
7. Click More → Add Diagnosis to add ICD-10 codes
8. Click Save (blue button in header)
9. Click Lock (gray button in header)

**Note Editor Header Buttons:**
- Save (`button.btn-primary:has-text("Save")`)
- Lock (`button.btn-nav:has-text("Lock")`)
- Print
- Heidi
- More (dropdown with: Download, Share, Request Signature, Add Diagnosis, etc.)
- Close Note

**Test Scripts (run from `services/intakeq-playwright/`):**
```bash
pnpm tsc                        # Compile TypeScript
node dist/test-login.js         # Test login - WORKS
node dist/test-client-nav.js    # Test client navigation - WORKS
node dist/test-add-note.js      # Test Add Note flow - WORKS (opens note editor)
node dist/test-fill-note.js     # Test form filling - WORKS (CC + rich text editors)
node dist/test-add-diagnosis.js # Test Add Diagnosis - WORKS (F32.1 added successfully)
node dist/test-save-lock.js     # Test Save/Lock flow - WORKS (uses TestingPt Test)
node dist/test-explore-fields.js # Explore IntakeQ form structure
node dist/test-note-mapper.js   # Test section mapping against SAMPLE_PATIENT_NOTE.md
node dist/test-full-push.js     # FULL END-TO-END TEST - Epic Scribe → IntakeQ ✅
```

**Form Field Types (Kyle Roller Intake Note):**
- **Section 1**: Demographics (auto-filled from client record)
- **Section 2 - CC**: Simple input field (`placeholder="Chief Complaint"`)
- **Section 3 - HPI**: Rich text editor (`contenteditable="true"`)
- **Section 4 - Psychiatric ROS**: Rich text editor
- **Section 5 - Social History**: Rich text editor
- **Section 6 - Substance Use**: Rich text editor
- **Section 7+ (MSE, Assessment, Plan)**: Rich text editors

**Add Diagnosis Flow (tested 2026-02-04):**
1. Click More button in note header (position y ≈ 110-130, NOT top nav)
2. Click "Add Diagnosis" from dropdown menu
3. Search input appears - enter ICD-10 code (e.g., "F32.1")
4. Results appear as `.list-group-item` elements
5. Click on result to add diagnosis
6. Diagnosis appears in "Diagnostic Codes" panel
7. Selector for More button: `button.dropdown-toggle:has-text("More")` at y > 100

**Save/Lock Flow (tested 2026-02-04):**
1. Save button: `button.btn-primary:has-text("Save")` at y ≈ 110
2. Click Save → wait for "saved" indicator (green badge appears)
3. Lock button: `button:has-text("Lock")` at y ≈ 110
4. Click Lock → **Lock button changes to "Edit" button** (this indicates locked state!)
5. Verification: Look for `button:has-text("Edit")` or `a:has-text("Edit")` at y ≈ 110
6. No confirmation dialog required (at least for this template)

**Section Mapping (completed 2026-02-04):**

Epic Scribe Section → IntakeQ Kyle Roller Intake Note Section:
| Epic Scribe | IntakeQ Section # | IntakeQ Field | Type |
|-------------|-------------------|---------------|------|
| Chief Complaint | 2 | CC | input |
| History (HPI) | 3 | HPI | contenteditable |
| Psychiatric Review of Symptoms | 4 | Psychiatric Review of Systems | contenteditable |
| Social History | 5 | Social History | contenteditable |
| (Substance Use) | 6 | Substance Use History | contenteditable |
| Current Medications | 7 | Medication History | contenteditable |
| Review of Systems | 8 | Medical Review of Systems | contenteditable |
| Mental Status Examination | 10 | Mental Status Exam (MSE) | contenteditable |
| Risk Assessment + FORMULATION + PLAN | 13 | Assessment and Plan | contenteditable |
| DIAGNOSIS | 12 | Via Add Diagnosis flow | ICD-10 codes |

**Note:** Risk Assessment is combined into Assessment and Plan (no separate field in IntakeQ template).

**Diagnosis Extraction (tested with sample note):**
- F33.1: Major depressive disorder, recurrent episode, moderate
- F43.10: Posttraumatic stress disorder
- F44.4: Functional neurological symptom disorder

**Completed Tasks:**
1. ~~Test Add Diagnosis flow~~ ✅ Done (F32.1 added successfully)
2. ~~Test Save/Lock flow~~ ✅ Done (working with TestingPt Test)
3. ~~Map Epic Scribe sections to IntakeQ fields~~ ✅ Done (8 sections mapped)
4. ~~Implement `pushNoteToIntakeQ()` function~~ ✅ Done
5. ~~Test full end-to-end~~ ✅ Done (2026-02-04) - WORKING!
6. ~~Add UI button to push notes~~ ✅ Done (2026-02-04)

**INTEGRATION 100% COMPLETE!** The IntakeQ write path is fully functional with UI:
- "Push to IntakeQ" button appears in `NoteResultsStep.tsx` for Moonlit Psychiatry patients
- Button only active when patient has email address
- `pushNoteToIntakeQ()` takes an Epic Scribe note and creates it in IntakeQ
- All 8 sections are filled automatically
- Note is saved and locked
- Test: `node dist/test-full-push.js`

**Components:**
- `services/intakeq-playwright/` - Playwright automation, selectors, note mapper
- `services/intakeq-playwright/src/intakeq-automation.ts` - Main automation class (updated)
- `services/intakeq-playwright/src/selectors.ts` - CSS selectors (updated with tested values)
- `services/intakeq-playwright/src/note-mapper.ts` - Maps Epic Scribe sections to IntakeQ fields
- `services/intakeq-playwright/src/diagnosis-extractor.ts` - Extracts ICD-10 codes from notes
- `apps/web/app/api/intakeq/push-note/route.ts` - API endpoint
- `apps/web/src/components/workflow/NoteResultsStep.tsx` - UI button "Push to IntakeQ"
- `INTAKEQ_INTEGRATION_ARCHITECTURE.md` - Full architecture documentation

**Env vars required (configured in .env.local + Vercel):**
- `INTAKEQ_API_KEY` - For API lookups
- `INTAKEQ_USER_EMAIL` - IntakeQ login (hello@trymoonlit.com)
- `INTAKEQ_USER_PASSWORD` - IntakeQ password
- `INTAKEQ_NOTE_TEMPLATE_NAME` (optional) - Template to use
- `BROWSERBASE_API_KEY` - Remote browser for Vercel deployment
- `BROWSERBASE_PROJECT_ID` - Browserbase project ID

**Key Discovery - IntakeQ URL Structure:**
- Login: `https://intakeq.com/signin`
- Client profile: `https://intakeq.com/#/client/{GUID}?tab=timeline`
- The GUID comes from the API response (`Guid` field), NOT the numeric `ClientId`

**Playwright Setup (local dev only):**
```bash
npx playwright install chromium  # Install browser (only needed for local, not Browserbase)
```

**Screenshots saved to:** `services/intakeq-playwright/screenshots/` (gitignored for PHI)

**Limitations:**
- UI selectors may need updating if IntakeQ changes their interface
- Browserbase sessions have a default timeout; long notes should be fine with `evaluate` but monitor if issues arise
- Browserbase dashboard at browserbase.com has session replays for debugging

---

## Previous Updates (2025-01-05)

### Custom Domain Migration
- Production URL: `https://epic-scribe.vercel.app`
- Google OAuth configured for this domain
- No hardcoded URLs in codebase - all use `NEXTAUTH_URL` env var

### Patient Demographics Editing
- Added **Edit** button to patient Overview tab (Demographics section)
- Can now modify: first name, last name, DOB, MRN
- File: `apps/web/src/components/patient/PatientOverviewTab.tsx`

---

## Previous Updates (2024-12-08)

### Patient Demographics Enhancement
- **Patient name/age now used directly** in generated notes instead of `.FNAME`, `.LNAME`, `.age` dotphrases
- Patient selection is now **mandatory** before note generation
- Age calculated from DOB automatically, or shows `***-year-old` if not provided
- Files modified:
  - `services/note/src/prompts/prompt-builder.ts`
  - `apps/web/app/api/generate/route.ts`
  - `apps/web/src/components/workflow/GenerateInputStep.tsx`

### Gemini API Failover
- Added `GEMINI_BACKUP_API_KEY` support for automatic failover
- Primary key quota exhaustion triggers seamless switch to backup
- Model standardized to `gemini-2.5-pro` across all files

### Database Migration
- `013_make_dob_optional_add_age.sql` - Made DOB optional, added age column

---

## Reference Documentation

- `SHARED-CALENDAR-SETUP.md` - HIPAA-compliant Meet hosting
- `SUPABASE_SETUP.md` - Database setup and RLS policies
- `HANDOFF_VERCEL_404.md` - Vercel deployment troubleshooting
- `DESIGNATED_EXAMINER_SPEC.md` - DE feature specification
