# Epic Scribe — Technical Context

**Owner:** Dr. Rufus Sweeney (PGY-3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**Production URL:** https://epic-scribe.vercel.app
**North Star:** Generate Epic-ready psychiatry notes with SmartTools (<5 min edits) and become the agentic backbone for non-clinical operations (billing, payer management, revenue cycle)

---

## Current Status (2026-03-28)

### Working Features
- **Calendar Schedule View**: Day/Week/Month views at `/flow` with URL-based navigation (`?view=day&date=2026-03-28`). Time grid, encounter blocks, mini calendar sidebar, detail modal with ad-hoc notes.
- **Note Generation**: Gemini 2.5 Pro + automatic failover to backup API key
- **Browser Transcription**: Gemini 2.5 Flash via AudioRecorder (replaced local Whisper). Audio uploads via Supabase Storage presigned URLs to bypass Vercel 4.5 MB limit.
- **Standalone /record Page**: Mobile-first recording page at `/record` with auto-save to `visit_transcripts`. PWA manifest for "Add to Home Screen" on iPhone.
- **Inline Translation**: "Translate to English" button on transcript textarea (Gemini 2.5 Flash). Replaces old separate Spanish textarea flow.
- **Patient Demographics**: Actual name/age in notes (not dotphrases)
- **Authentication**: NextAuth + multi-tenant provider isolation (`es_providers`, `provider_id` on patients)
- **Template System**: 15 templates with section-level editing
- **SmartList System**: 97+ SmartLists in 8 logical groups
- **Google Integration**: Calendar/Meet/Drive for encounters
- **Patient Management**: Full CRUD with RLS, editable demographics
- **Note Saving**: Raw + edited versions with historical context
- **Therapy Notes**: BHIDC therapy prompt builder
- **IntakeQ Integration**: Read (auto-fetch prior notes) + Write (Playwright/Browserbase push) + multi-provider credentials via Admin UI
- **Prior Notes Import**: Clipboard watcher (Electron) for Epic copy-forward notes
- **HealthKit Integration**: iOS app syncs FHIR R4 clinical data from Apple Health. QR code pairing, background sync, data enriches note generation.
- **Structured Patient Profile**: Async Gemini extraction after note save, cumulative profile per patient
- **Listening Coder (v0)**: CPT code suggestions (static rules, needs payer-aware intelligence)
- **Dark Mode UI**: 50 files, CSS custom properties, Space Grotesk + IBM Plex fonts
- **CLI Transcription**: `record-visit.sh` + `transcribe-visit.py` (BlackHole removed 2026-04-03 — was interfering with Meet transcription; telehealth speaker separation inactive)
- **iPhone Recording** (code complete, needs Xcode build): WhisperKit on-device transcription, offline queue, auto-sync to desktop

### Known Issues
1. **Google OAuth Token Expiration** — Sign out/in to refresh (~1 hour expiry)
2. **Vercel 404 Deployment** — See `HANDOFF_VERCEL_404.md`
3. **ESLint Warnings** — `ignoreDuringBuilds: true` masks ~40 errors
4. **Listening Coder 90792 for intakes** — Should default to E/M codes in Utah (90792 reimburses ~50% of E/M). Exception: Optum may require 90792 (unconfirmed).

---

## Product Vision: Agentic Non-Clinical Operations

### Listening Coder — Payer-Aware CPT Suggestions

**Phase 1 — Fee schedule awareness (near-term):** Store payer fee schedules in Supabase. Listening Coder queries patient's payer, suggests highest-reimbursing clinically defensible code.

**Phase 2 — EOB/ERA-driven intelligence (medium-term):** Ingest EOBs/ERAs from Office Ally, Availity, payer portals. Build `claim_outcomes` table to learn real reimbursement patterns per payer/CPT.

**Phase 3 — Proactive billing agent (long-term):** Pre-submission claim review, denial pattern detection, authorization tracking, appeal automation, revenue dashboard.

**Moonlit payer landscape (Utah):** FFS Medicaid, Molina, SelectHealth, Healthy U (MCOs), Optum (pending). Clearinghouses: Office Ally, Availity.

### E-Prescribing — ScriptSure Direct (5 prescribers)

**Decision:** ScriptSure direct via DAW Systems, migrating from IntakeQ's ScriptSure wrapper.
- **IntakeQ cost:** $65/rx/mo = $325/mo for 5 prescribers
- **ScriptSure direct (annual):** $41.67/rx/mo = $208/mo for 5 prescribers — **saves $1,400/yr**
- All 5 prescribers already have EPCS credentials via IntakeQ; DAW Systems expected to transfer identity proofing (call 866-755-1500 x2 to confirm)
- Surescripts-certified, EPCS included, no setup fees
- NOT WENO (pharmacy rejection issues unacceptable for controlled substances)
- **Phase 1:** Standalone ScriptSure alongside strong.work/flow, Rx stager outputs copy-to-clipboard
- **Phase 2:** Embed ScriptSure into encounter Rx tab via vendor API
- **Fallback:** DoseSpot Jumpstart iframe ($225/mo via Oystehr) if ScriptSure API is inadequate
- See `AI_MA_ACTION_RESOLVER_SPEC.md` for full vendor comparison

### Beyond Billing
Scheduling intelligence, patient outreach, credentialing tracking, compliance monitoring.

---

## Environment Variables

```bash
GEMINI_API_KEY=              # Primary Gemini key
GEMINI_BACKUP_API_KEY=       # Auto-failover on 429
GEMINI_MODEL=gemini-2.5-pro  # Note generation model

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SHARED_CALENDAR_ID=

NEXTAUTH_URL=                # Production: https://epic-scribe.vercel.app
NEXTAUTH_SECRET=

INTAKEQ_API_KEY=
INTAKEQ_USER_EMAIL=          # Fallback if no per-provider DB credentials
INTAKEQ_USER_PASSWORD=
INTAKEQ_NOTE_TEMPLATE_NAME=  # Optional

BROWSERBASE_API_KEY=         # Remote browser for Vercel IntakeQ push
BROWSERBASE_PROJECT_ID=

HEALTHKIT_SYNC_API_KEY=      # Bearer token for iOS app sync
```

**Domain change:** Update `NEXTAUTH_URL` in Vercel + Google Cloud Console OAuth redirect URIs.

---

## Key Architecture

- **Patient demographics** passed directly to AI prompt (name, age from DOB)
- **Gemini failover**: 429 on primary key → automatic switch to backup
- **Template loading**: Database-first with in-memory fallback
- **Multi-tenant isolation**: `requireProviderSession()` on all routes, `verifyPatientOwnership()` for child tables
- **Audio upload**: Browser → presigned Supabase Storage URL → server downloads → Gemini Flash transcribes → storage cleaned up
- **Translation**: Gemini 2.5 Flash, inline replacement in transcript textarea, backup key failover
- **PWA**: `manifest.json` with `start_url: "/record"`, `display: "standalone"`. Apple Web App metadata in root layout.

---

## Quick Reference

### Workflow
1. `/flow` — Select patient → Setting x Visit Type → Record/paste transcript → Generate → Review/edit → Save
2. `/record` — Standalone recording page, auto-saves transcript to workflow

### Development
```bash
pnpm dev              # Dev server on :3002
pnpm build            # Production build
pnpm dev:clipboard    # Clipboard watcher (Electron)
pnpm lint             # Check for issues
```

### Settings x Visit Types

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

## Feature Details

### Calendar Schedule View (2026-03-28)

Google Calendar-like schedule view replacing the old flat DayView list at `/flow`. Three view modes (Day/Week/Month) with URL-based state (`?view=day&date=2026-03-28`).

**Architecture:**
- `getEncountersInRange()` in `google-calendar.ts` — generalized calendar fetch for arbitrary date ranges (max 200 results)
- `enrichCalendarEvents()` in `lib/flow/enrich-encounters.ts` — shared enrichment logic (patient lookup, payer, diagnoses, note status) extracted from today route. Used by both `/api/encounters/today` and `/api/encounters/range`.
- `GET /api/encounters/range?start=YYYY-MM-DD&end=YYYY-MM-DD` — date-range endpoint, 35-day cap
- `PATCH /api/encounters/[id]` — saves `provider_notes` (migration 030)
- `useEncounterRange(start, end)` hook — client-side fetch with polling and abort-on-change

**Components:**
- `ScheduleView.tsx` — orchestrator: reads URL params, computes date range, manages modal state, renders header with prev/next/today/view-dropdown
- `schedule/ScheduleDayView.tsx` — 7AM–7PM time grid (48px/30min slots), positioned encounter blocks color-coded by status, current-time red line
- `schedule/ScheduleWeekView.tsx` — 7-column grid (Mon–Sun), time gutter, today highlighted, encounter blocks per column
- `schedule/ScheduleMonthView.tsx` — month grid, encounter pills (max 3 + "+N more"), click day → day view
- `MiniCalendar.tsx` — compact month calendar in FlowSidebar, click day → navigates URL
- `EncounterDetailModal.tsx` — modal overlay on click: patient info, status/payer badges, diagnoses, Meet link, notes textarea (auto-saves on blur via PATCH)

**Old DayView:** `DayView.tsx` still exists but is no longer imported by `flow/page.tsx`. Can be removed.

**Migration 030:** `encounters.provider_notes` column — already run.

**Remaining Phase 1 cleanup:** Delete old `DayView.tsx` (no longer imported), test confirm-booking → navigate-to-date flow, polish from real-world use.

**Key files:**
- `src/components/flow/ScheduleView.tsx`, `schedule/ScheduleDayView.tsx`, `schedule/ScheduleWeekView.tsx`, `schedule/ScheduleMonthView.tsx`
- `src/components/flow/MiniCalendar.tsx`, `EncounterDetailModal.tsx`
- `src/lib/flow/enrich-encounters.ts`, `hooks/useEncounterRange.ts`
- `app/api/encounters/range/route.ts`, `app/api/encounters/[id]/route.ts` (PATCH added)
- `supabase/migrations/030_encounter_provider_notes.sql`

### Encounter View (shipped 2026-03-30)

Full encounter workspace at `/flow/encounter/[id]` — header with patient info, Note/Profile/Actions tabs, transcript input (record/paste), generation, editing, and saving. Replaces the old `WorkflowWizard` step-by-step flow.

**Tabs:** Note (transcript → generate → edit → save), Profile (demographics, diagnoses, meds), Actions (AI-extracted + manual action items)
- AI-suggested actions appear after **Generate Note** (fire-and-forget extractor). Lab actions are executable (Phase 2): approve → create requisition with matched Labcorp codes, patient demographics, insurance, diagnoses.
- Rx and Labs tabs are future features

**Key files:**
- `app/(protected)/flow/encounter/[id]/page.tsx` — encounter page
- `src/components/workflow/` — step components reused in encounter view
- `AudioRecorder.tsx` for transcription, `PatientProfile` for profile tab

**API routes:**
- `GET/POST /api/encounters` — list/create
- `GET/PATCH/DELETE /api/encounters/[id]` — fetch/update/delete (provider_notes, status)
- `POST /api/generate` — note generation
- `POST /api/transcribe` — audio transcription
- `GET/POST /api/notes` — note CRUD
- `GET /api/patient-profile/[patientId]` — patient profile data

### Google Meet Status Integration (2026-03-30)

Auto-updates encounter status based on Google Meet conference activity. Uses client-triggered polling (not Pub/Sub webhooks) — piggybacks on the existing 30s poll cycle in `useEncounterRange`.

**Transitions:**
- `scheduled` → `in-visit` when conference starts (participant joins)
- `in-visit` → `note-pending` when conference ends
- Never overwrites terminal statuses (`note-ready`, `signed`, `cancelled`, `no-show`)

**Architecture:**
- `src/lib/meet/meet-client.ts` — Meet API client (auth via provider's stored refresh token, same pattern as `calendar-client.ts`)
- `POST /api/encounters/check-meet-status` — checks encounters with `status IN (scheduled, in-visit)` + meet_link within ±30 min of now
- `useEncounterRange` hook fires the check after each encounter fetch, re-fetches on transitions
- Non-blocking: Meet API errors don't affect encounter loading

**Prerequisites:**
- Google Meet REST API enabled in GCP Console
- OAuth scope `meetings.space.readonly` added to consent screen
- Provider must sign out/in to grant new scope

**Key files:**
- `src/lib/meet/meet-client.ts`, `app/api/encounters/check-meet-status/route.ts`
- `app/api/auth/[...nextauth]/route.ts` (scope added)
- `src/lib/flow/hooks/useEncounterRange.ts` (meet check hook)

### AI MA Action Resolver Phase 2 — Lab Execution (2026-04-03)

Approved lab actions auto-create Labcorp requisitions with matched test codes, patient demographics, insurance, and diagnoses from patient profile.

**Flow:** Generate Note → extractor produces staged lab action → Approve → "Create Requisition" → fuzzy-match tests → create requisition + junction rows → completed with `LAB-YYYYMMDD-{hex}` number.

**Architecture:**
- `src/lib/db/lab-orders.ts` — fuzzy test matching (abbreviation map: cbc/cmp/tsh/uds/a1c/lfts), insurance lookup, requisition creation
- `src/lib/action-resolver/stagers/lab-stager.ts` — parallel-fetches patient, insurance, tests, profile diagnoses → `LabOrderPayload`
- `POST /api/actions/staged/[id]/execute` — generic dispatcher (lab case first, extensible for rx/referral)
- `src/components/flow/encounter/LabActionCard.tsx` — status-driven UI card (staged→approved→executing→completed/failed)

**DB (migration 032):** `staged_actions` gets `execution_result`, `error_message`, `executed_at`; `lab_requisitions` gets `encounter_id`, `staged_action_id`; 12 new lab tests (22 total).

**Key files:**
- `src/lib/db/lab-orders.ts`, `src/lib/action-resolver/stagers/lab-stager.ts`
- `app/api/actions/staged/[id]/execute/route.ts`
- `src/components/flow/encounter/LabActionCard.tsx`, `ActionsTab.tsx`
- `supabase/migrations/032_lab_phase2.sql`

### Browser Transcription + Audio Upload (2026-03-24)

AudioRecorder uses Gemini 2.5 Flash (not local Whisper) for browser transcription. Audio uploads use Supabase Storage presigned URLs to bypass Vercel's 4.5 MB serverless limit.

**Flow:** AudioRecorder (128 kbps) → `POST /api/transcribe/upload-url` → PUT to Supabase Storage → `POST /api/transcribe` with `storagePath` → Gemini Flash transcribes → storage auto-cleaned.

**Key files:** `AudioRecorder.tsx`, `api/transcribe/route.ts`, `api/transcribe/upload-url/route.ts`

### Standalone /record Page + PWA (2026-03-24)

Mobile-first recording page under `(protected)/record/`. Records audio, auto-saves transcript to `visit_transcripts` via `POST /api/transcripts/save`. Transcripts appear in `/flow` "Recent Recordings" section.

PWA manifest enables "Add to Home Screen" — opens directly to `/record` in standalone mode.

**Key files:** `(protected)/record/page.tsx`, `api/transcripts/save/route.ts`, `public/manifest.json`

### Inline Translation (2026-03-24)

"Translate to English" button below transcript textarea in ReviewGenerateStep. Uses Gemini 2.5 Flash with medical terminology prompt. Replaces previous separate Spanish/English textarea flow.

**Key files:** `ReviewGenerateStep.tsx`, `api/translate/route.ts`

### CLI Transcription (2026-03-19)

Local Whisper via CLI scripts. HIPAA compliant (audio stays on device). BlackHole-2ch was removed (2026-04-03) because it interfered with Google Meet transcription — telehealth speaker separation is currently inactive.

**Scripts:** `record-visit.sh`, `transcribe-visit.py`, `whisper-server.py` (port 5111)

### HealthKit + iOS App

iOS app (`apps/healthkit-sync/`) syncs FHIR R4 clinical data from Apple Health. QR code pairing, background sync, auto-sync on foreground. Data enriches note generation (medications, labs, conditions, vitals, allergies).

**Build:** `cd apps/healthkit-sync && xcodegen generate` → Xcode build → `devicectl device install app`
**iPhone UDID:** `00008140-001170D01E33001C`

iPhone recording (WhisperKit on-device) code complete but needs Xcode build + test. See MEMORY.md for details.

### IntakeQ Integration

**Read:** Auto-fetch prior notes for Moonlit patients (`services/intakeq-api/`)
**Write:** Playwright pushes notes to IntakeQ. Browserbase on Vercel, local Chromium in dev. (`services/intakeq-playwright/`)
**Admin:** Per-provider credentials and template field mappings at `/admin`
**Key API:** Use `search` param for client lookup, `status=1` for locked notes.

### Structured Patient Profile (2026-02-24)

After note save → async Gemini extraction → cumulative profile. At generation time, profile replaces raw historical notes dump. Profile tab: `/patients/[id]?tab=profile`.

### Psycho-oncology (HCI)

Bio-Psycho-Social-**Existential** formulation (cancer-specific domains). Placeholder templates (`hci_psychonc_intake_v1`, `hci_psychonc_fu_v1`).

---

## Reference Documentation

- `SHARED-CALENDAR-SETUP.md` — HIPAA-compliant Meet hosting
- `SUPABASE_SETUP.md` — Database setup and RLS policies
- `HANDOFF_VERCEL_404.md` — Vercel deployment troubleshooting
- `DESIGNATED_EXAMINER_SPEC.md` — DE feature specification
- `HEALTHKIT_EPIC_SCRIBE_ROADMAP.md` — Full HealthKit roadmap
- `INTAKEQ_INTEGRATION_ARCHITECTURE.md` — IntakeQ write path details
