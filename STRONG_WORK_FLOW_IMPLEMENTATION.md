# strong.work/flow — Implementation Spec

**Owner:** Dr. Rufus Sweeney (PGY-3 Psychiatry, Moonlit Psychiatry PLLC)
**Repo:** epic-scribe (existing Next.js 14 / pnpm monorepo / Supabase / Gemini)
**North Star:** A physician workflow service — not an EMR — that sits as a thin, beautiful application layer on top of Google Workspace. Physicians never open Google Calendar, Drive, Meet, or Gmail directly. They open strong.work/flow and see three views: **The Day**, **The Encounter**, **The Inbox**.

---

## Context & Motivation

Epic Scribe already generates psychiatry notes, manages patients, integrates with Google Calendar/Meet/Drive, handles transcription, and pushes notes to IntakeQ via Playwright. This spec describes the next evolution: transforming Epic Scribe from a note-generation tool into a complete physician workflow service that replaces IntakeQ as the system of record.

The core architectural insight: Google Workspace (Business Plus, $22/user/month) provides HIPAA-covered telehealth (Meet), scheduling (Calendar), transcript generation (Meet auto-transcribe), document storage (Drive), email (Gmail), and AI (Gemini) — all under a single BAA. We build only the experience layer: the UI the physician touches, the encounter status machine, action item extraction, and e-prescribe embedding. Google handles the plumbing.

### What Already Exists (in epic-scribe repo)
- **Google Calendar integration** (`src/google-calendar.ts`): Fetches encounters from shared calendar (`hello@trymoonlit.com`), creates events with Meet links, parses `"Patient Last, First — Setting — VisitType"` naming convention
- **Note generation pipeline** (`services/note/`): Gemini 2.5 Pro, template system (15 templates), SmartList system (97+ SmartLists), section-level editing, prompt builder architecture
- **Patient profiles** (`services/note/src/extractors/`): Async Gemini extraction after note save → cumulative structured profile per patient
- **Patient database** (Supabase): `patients`, `encounters`, `generated_notes`, `claims`, `payers`, `billing_providers` tables with RLS and multi-tenant provider isolation
- **IntakeQ integration** (`services/intakeq-api/`, `services/intakeq-playwright/`): Read prior notes, write generated notes via Playwright automation
- **Browser transcription**: Gemini 2.5 Flash via AudioRecorder, Supabase Storage presigned URLs
- **CLI transcription**: `record-visit.sh` + `transcribe-visit.py` with BlackHole speaker separation
- **HealthKit integration**: iOS app syncs FHIR R4 clinical data from Apple Health
- **Authentication**: NextAuth + multi-tenant provider isolation (`es_providers`, `provider_id` on patients)
- **Claims pipeline**: `claims` table, `edi_response_files`, `claim_status_events`, X12 837P generation, payer routing
- **Listening Coder (v0)**: CPT code suggestions (static rules)

### What We're Building
A new primary UI for Epic Scribe — three views (The Day, The Encounter, The Inbox) — that replaces the current `/flow` page as the physician's daily workspace. Powered entirely by Google Workspace APIs for scheduling, telehealth, transcription, and storage, with Supabase as the application database and Gemini as the AI engine.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     strong.work/flow                         │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ The Day  │  │ The Encounter │  │      The Inbox         │ │
│  │ (schedule│  │ (note, rx,   │  │  (action items from    │ │
│  │  + status)│  │  profile,    │  │   all visits today)    │ │
│  │          │  │  labs, actions)│  │                        │ │
│  └────┬─────┘  └──────┬───────┘  └───────────┬────────────┘ │
│       │               │                       │              │
│       └───────────────┼───────────────────────┘              │
│                       │                                      │
│               ┌───────▼───────┐                              │
│               │ Encounter     │                              │
│               │ State Machine │                              │
│               └───────┬───────┘                              │
└───────────────────────┼──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────────────────┐
        │               │                           │
  ┌─────▼─────┐  ┌──────▼──────┐  ┌───────────────▼───────────┐
  │  Google   │  │  Supabase   │  │     External Services     │
  │ Workspace │  │  (Postgres) │  │                           │
  │           │  │             │  │  ┌─────────┐ ┌──────────┐ │
  │ Calendar  │  │ patients    │  │  │ WENO    │ │ Lab Req  │ │
  │ Meet API  │  │ encounters  │  │  │ Exchange│ │ Tool     │ │
  │ Drive API │  │ gen_notes   │  │  │ (eRx)   │ │ (fax)    │ │
  │ Gmail API │  │ claims      │  │  └─────────┘ └──────────┘ │
  │ Workspace │  │ action_items│  │                           │
  │ Events API│  │ profiles    │  │  ┌─────────────────────┐  │
  │ (Pub/Sub) │  │ payers      │  │  │ Gemini 2.5 Pro      │  │
  │           │  │             │  │  │ (note generation +   │  │
  └───────────┘  └─────────────┘  │  │  action extraction)  │  │
                                  │  └─────────────────────┘  │
                                  └───────────────────────────┘
```

### Key Design Principle

The physician never interacts with Google's UI. All Google services are accessed via their REST APIs and rendered in our custom interface. The only time the physician sees Google's UI is inside the Meet call itself (which is intentional — Meet's video UI is good and we don't need to replace it).

---

## The Three Views

### View 1: The Day (`/flow` — new default)

The physician's home screen. A vertical list of today's patients ordered by appointment time.

**Data source:** Google Calendar API → `calendar.events.list()` on the shared calendar (`SHARED_CALENDAR_ID`), filtered to today. Already implemented in `src/google-calendar.ts`.

**Each patient row displays:**
- Time and duration (from calendar event `start`/`end`)
- Patient name (parsed from event title: `"Last, First — Setting — VisitType"`)
- Visit type badge (Intake / Follow-up / TOC)
- Payer tag with color coding (from `patients` → `payers` join in Supabase)
- Primary diagnosis preview (from patient profile)
- **Real-time status badge** (see Encounter State Machine below)
- "Join" button (conditionally visible, opens Meet link from `event.hangoutLink`)

**Status progression shown visually:**
| Status | Color | Trigger |
|--------|-------|---------|
| Scheduled | Gray | Default when calendar event exists |
| Ready | Amber | Patient joined the Meet call (participant.v2.joined event AND host not yet in call) |
| In Visit | Green | Both patient and provider in the Meet call |
| Note Pending | Blue pulse | Conference ended, transcript being fetched/processed |
| Note Ready | Purple | Note draft generated, awaiting physician review |
| Signed | Dim gray | Physician clicked "Sign" — row dims to shift focus to remaining patients |

**Signed patients dim down** so the physician's eye naturally focuses on what still needs attention.

**Header shows:** Date (e.g., "Saturday, March 28"), patient count, completed count, in-progress count.

### View 2: The Encounter (`/flow/encounter/[id]`)

Opened by clicking any patient row in The Day. A single-patient workspace with tabbed sections.

**Header displays:** Patient name, age, status badge, visit type, time, duration, payer tag. Contextual action button: "Join Meet ↗" (if in-visit), "Sign Note ✓" (if note-ready).

**Diagnosis strip** below header: all active diagnoses as chips.

**Five tabs:**

#### Tab: Note
- If visit not yet completed: empty state with live recording indicator ("Recording & transcribing via Google Meet" with pulsing green dot)
- If note generated: editable note draft with section-level editing (reuse existing Epic Scribe note editing UI)
- Toolbar shows: "Generated via Gemini · X min ago", "View transcript" link, "View source material" link
- Note body renders as styled paragraphs (not raw text) — the existing template/section system already handles this

#### Tab: Profile
- **Patient Summary**: cumulative structured profile from `patient_profiles` table (already built — async Gemini extraction after note save)
- **Current Medications**: from profile extraction
- **Diagnoses**: from profile + encounter data
- **Prior Notes**: list of previous notes with dates (already built via IntakeQ API read path or from `generated_notes` table)

#### Tab: Actions
- Action items extracted from the current visit's transcript (see Action Item Extraction below)
- Each item is a checkbox with text description
- Items are also aggregated in The Inbox view
- If visit not yet completed: empty state

#### Tab: Rx (e-Prescribe)
- Embedded WENO Exchange interface via iframe
- WENO's "EZ Integration" iframes their DEA-compliant prescribing screens
- Patient context passed to pre-populate demographics
- Current medication list displayed below the prescribing interface for reference
- **Implementation note:** WENO provides a web component / iframe integration. The iframe URL includes patient context parameters. See WENO's API documentation at wenoexchange.com/api-learn-more/

#### Tab: Labs
- Opens the existing lab-requisition-tool functionality
- Either embedded inline or launched as a panel/modal
- Patient pre-selected based on encounter context

### View 3: The Inbox (`/flow/inbox`)

Aggregated action items from all of today's visits.

**Sections:**
- **Pending**: unchecked items, grouped by patient
- **Completed**: checked items (dimmed)

Each item shows: checkbox, action text, patient name (clickable — navigates to that patient's Encounter view).

**Empty state:** "Nothing here. Your visits will populate action items automatically."

---

## Encounter State Machine

The encounter lifecycle is driven by Google Meet events, with the state stored in the `encounters` table.

### State Transitions

```
                    ┌─────────────────────────────────┐
                    │                                   │
  Calendar event    │     participant.v2.joined          │
  created           │     (patient joins Meet)          │
       │            │            │                       │
       ▼            │            ▼                       │
  ┌──────────┐      │     ┌───────────┐                 │
  │ scheduled│──────┘     │  ready    │                 │
  └──────────┘            └─────┬─────┘                 │
                                │                        │
                   provider joins Meet                   │
                                │                        │
                          ┌─────▼─────┐                 │
                          │ in-visit  │                  │
                          └─────┬─────┘                  │
                                │                        │
                   conference.v2.ended                   │
                                │                        │
                       ┌────────▼────────┐               │
                       │  note-pending   │               │
                       └────────┬────────┘               │
                                │                        │
                   transcript fetched +                  │
                   note generated                        │
                                │                        │
                       ┌────────▼────────┐               │
                       │   note-ready    │               │
                       └────────┬────────┘               │
                                │                        │
                   physician clicks "Sign"               │
                                │                        │
                       ┌────────▼────────┐               │
                       │     signed      │               │
                       └─────────────────┘
```

### Implementation: Google Workspace Events API + Pub/Sub

**Setup (one-time):**
1. Create a Google Cloud Pub/Sub topic (e.g., `projects/moonlit-flow/topics/meet-events`)
2. Grant `meet-api-event-push@system.gserviceaccount.com` the Pub/Sub Publisher role on the topic
3. Create a Pub/Sub subscription that pushes to a webhook endpoint on our backend (e.g., `POST /api/meet-events`)

**Per-encounter subscription:**
When a calendar event is created (or at day-start for all today's events), create a Workspace Events subscription for each meeting space:

```typescript
// Subscribe to Meet events for a specific meeting space
const subscription = await workspaceEvents.subscriptions.create({
  requestBody: {
    targetResource: `//meet.googleapis.com/${meetSpaceName}`,
    eventTypes: [
      'google.workspace.meet.conference.v2.started',
      'google.workspace.meet.conference.v2.ended',
      'google.workspace.meet.participant.v2.joined',
      'google.workspace.meet.participant.v2.left',
      'google.workspace.meet.transcript.v2.fileGenerated',
    ],
    notificationEndpoint: {
      pubsubTopic: 'projects/moonlit-flow/topics/meet-events',
    },
    ttl: '86400s', // 24 hours
  },
});
```

**Event handling webhook (`POST /api/meet-events`):**

```typescript
// Pseudocode for the event handler
async function handleMeetEvent(event: MeetEvent) {
  const { eventType, conferenceRecord, participant } = event;

  // Find the encounter by matching the Meet space to a calendar event
  const encounter = await findEncounterByMeetSpace(conferenceRecord);
  if (!encounter) return;

  switch (eventType) {
    case 'participant.v2.joined':
      // Determine if this is the patient or the provider
      const isProvider = await isProviderParticipant(participant);
      const isPatient = !isProvider;

      if (isPatient && encounter.status === 'scheduled') {
        await updateEncounterStatus(encounter.id, 'ready');
      }
      if (isProvider && encounter.status === 'ready') {
        await updateEncounterStatus(encounter.id, 'in-visit');
      }
      // If both join simultaneously, go straight to in-visit
      if (isProvider && encounter.status === 'scheduled') {
        await updateEncounterStatus(encounter.id, 'in-visit');
      }
      break;

    case 'conference.v2.ended':
      await updateEncounterStatus(encounter.id, 'note-pending');
      // Trigger async: fetch transcript → generate note
      await triggerNoteGeneration(encounter.id);
      break;

    case 'transcript.v2.fileGenerated':
      // Transcript is ready in Drive — fetch it
      await fetchAndStoreTranscript(encounter.id, event.transcript);
      break;
  }

  // Push status update to connected clients via Supabase Realtime
  // (the frontend subscribes to encounter status changes)
}
```

**Determining patient vs. provider:**
The participant event includes a `signedin_user` object with the user's identity. Providers are Moonlit Workspace users (email domain `@trymoonlit.com`). Anyone else joining is the patient. This heuristic covers 99% of cases for 1-on-1 telehealth encounters.

### Real-Time Frontend Updates

Use **Supabase Realtime** to push encounter status changes to the frontend. The Day view subscribes to changes on the `encounters` table for today's encounters:

```typescript
// In The Day view component
useEffect(() => {
  const subscription = supabase
    .channel('encounter-status')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'encounters',
      filter: `scheduled_start=gte.${todayStart}`,
    }, (payload) => {
      // Update the encounter's status in local state
      updateEncounterInList(payload.new);
    })
    .subscribe();

  return () => { supabase.removeChannel(subscription); };
}, []);
```

---

## Post-Visit Pipeline

After `conference.v2.ended` fires, the following happens automatically:

### Step 1: Fetch Transcript from Google Drive

Google Meet auto-transcription saves a transcript file to the meeting organizer's Google Drive. The `transcript.v2.fileGenerated` event provides the transcript resource, which includes a Drive file reference.

```typescript
async function fetchTranscript(transcriptResource) {
  // Get the transcript entries via Meet REST API
  const entries = await meet.conferenceRecords.transcripts.entries.list({
    parent: transcriptResource.name,
  });

  // Or fetch the Drive file directly
  const driveFileId = transcriptResource.docs[0]?.document?.documentId;
  const content = await drive.files.export({
    fileId: driveFileId,
    mimeType: 'text/plain',
  });

  return content.data;
}
```

**Important:** Google Meet auto-transcription is enabled org-wide in the Moonlit Workspace admin console. This is already configured. Transcripts are saved to the organizer's Drive (hello@trymoonlit.com). The backend fetches them via Drive API using the service account or user OAuth.

### Step 2: Generate Note via Gemini

Feed the transcript + patient profile into the existing note generation pipeline:

```typescript
async function generateNote(encounterId: string) {
  const encounter = await getEncounter(encounterId);
  const patient = await getPatient(encounter.patient_id);
  const profile = await getPatientProfile(patient.id); // Cumulative structured profile
  const transcript = await getTranscript(encounter.id);
  const template = await getTemplate(encounter.setting, encounter.visit_type);

  // Use existing prompt builder from services/note/
  const prompt = getPromptBuilder().build({
    template,
    transcript,
    patientProfile: profile,
    patientDemographics: { name: `${patient.first_name} ${patient.last_name}`, age: calculateAge(patient.dob) },
    priorNotes: profile?.summary || '',
  });

  const noteContent = await getGeminiClient().generate(prompt);

  // Save generated note
  await supabase.from('generated_notes').insert({
    encounter_id: encounterId,
    template_id: template.template_id,
    prompt_version: 'flow-v1',
    prompt_hash: hashPrompt(prompt),
    generated_content: noteContent,
    generated_at: new Date().toISOString(),
  });

  // Update encounter status
  await updateEncounterStatus(encounterId, 'note-ready');
}
```

### Step 3: Extract Action Items

A parallel Gemini call on the same transcript extracts action items:

```typescript
async function extractActionItems(encounterId: string, transcript: string) {
  const prompt = `You are a psychiatric clinical assistant. Extract all action items mentioned during this clinical visit. An action item is anything the physician committed to doing after the visit: sending information to the patient, making referrals, changing prescriptions, ordering labs, following up on results, coordinating with other providers, etc.

Return a JSON array of objects with:
- "text": a clear, actionable description of the task
- "category": one of "referral", "prescription", "lab", "patient_education", "coordination", "follow_up", "other"

If no action items were mentioned, return an empty array.

Transcript:
${transcript}`;

  const result = await getGeminiClient().generate(prompt, { jsonMode: true });
  const items = JSON.parse(result);

  // Save to action_items table
  for (const item of items) {
    await supabase.from('action_items').insert({
      encounter_id: encounterId,
      text: item.text,
      category: item.category,
      completed: false,
    });
  }
}
```

---

## Database Schema Changes

### New table: `action_items`

```sql
CREATE TABLE public.action_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.encounters(id),
  text text NOT NULL,
  category text CHECK (category IN ('referral', 'prescription', 'lab', 'patient_education', 'coordination', 'follow_up', 'other')),
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT action_items_pkey PRIMARY KEY (id)
);

-- RLS: providers can only see action items for their own encounters
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
```

### Modify `encounters` table

Add columns to support the new status machine and Meet event tracking:

```sql
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS meet_space_name text,
  ADD COLUMN IF NOT EXISTS meet_subscription_id text,
  ADD COLUMN IF NOT EXISTS transcript_drive_file_id text,
  ADD COLUMN IF NOT EXISTS transcript_content text,
  ADD COLUMN IF NOT EXISTS conference_started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS conference_ended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS note_generated_at timestamp with time zone;

-- Update status CHECK constraint to include new statuses
-- Existing status column already has no CHECK, just DEFAULT 'scheduled'
-- Valid statuses: scheduled, ready, in-visit, note-pending, note-ready, signed
```

### Modify `patients` table

Add payer reference and insurance details for display in The Day view:

```sql
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS payer_id uuid REFERENCES public.payers(id),
  ADD COLUMN IF NOT EXISTS member_id text,
  ADD COLUMN IF NOT EXISTS primary_dx_codes jsonb DEFAULT '[]'::jsonb;
```

---

## Google API Setup

### Required OAuth Scopes (add to existing NextAuth config)

```
https://www.googleapis.com/auth/calendar              (already have)
https://www.googleapis.com/auth/calendar.events        (already have)
https://www.googleapis.com/auth/meetings.space.readonly (NEW)
https://www.googleapis.com/auth/drive.readonly          (NEW — for transcript fetch)
```

### Required Google Cloud APIs (enable in Cloud Console)

- Google Calendar API (already enabled)
- Google Meet REST API (NEW — `meet.googleapis.com`)
- Google Workspace Events API (NEW — `workspaceevents.googleapis.com`)
- Google Cloud Pub/Sub API (NEW — for receiving Meet events)
- Google Drive API (NEW — for transcript file access)

### Pub/Sub Setup

1. Create topic: `projects/{project-id}/topics/meet-events`
2. Grant publisher role to `meet-api-event-push@system.gserviceaccount.com`
3. Create push subscription pointing to `https://epic-scribe.vercel.app/api/meet-events`
4. Configure authentication on the push subscription (Vercel endpoint must verify Pub/Sub push tokens)

### Environment Variables (new)

```bash
GOOGLE_CLOUD_PROJECT_ID=         # For Pub/Sub topic naming
PUBSUB_TOPIC_NAME=meet-events   # Pub/Sub topic for Meet events
PUBSUB_VERIFICATION_TOKEN=      # Shared secret to verify Pub/Sub pushes
WENO_CLINIC_ID=                  # WENO Exchange clinic identifier (once registered)
```

---

## UI Implementation Details

### Design System

- **Font stack:** DM Serif Display (headings) + DM Sans (body) — loaded from Google Fonts
- **Color scheme:** Warm dark mode. Background `#0f1117`, sidebar `#0a0b0f`, text `#e4e4e7`, muted `#6b7280`, accent amber `#d97706`/`#f59e0b`
- **Payer color coding:**
  - HMHI-BHN: `#f59e0b` (amber — highest value payer)
  - Optum PMHP: `#3b82f6` (blue)
  - SelectHealth: `#10b981` (green)
  - Molina: `#ef4444` (red)
  - DMBA: `#8b5cf6` (purple)
  - Regence: `#06b6d4` (cyan)
- **Status colors:** See table above in View 1 spec
- **Animations:** `slideUp` entrance on patient rows with staggered `animation-delay`. Pulse animation on live recording indicator. Smooth transitions on status badge changes.
- **Layout:** Fixed sidebar (200px) + scrollable main content (max-width 860px, centered)

### Prototype Reference

See the interactive prototype in `strong-work-flow.jsx` (generated during this conversation). It contains the complete UI for all three views with mock data representing a realistic clinic day. The prototype demonstrates:
- Patient row rendering with status, payer, diagnosis, time, visit type
- Encounter view with all five tabs (Note, Profile, Actions, Rx, Labs)
- WENO e-prescribe mock interface layout
- Inbox view with pending/completed sections
- Sidebar navigation with badge counts
- All color theming, typography, and animation patterns

### File Structure (new pages/components)

```
apps/web/app/(protected)/flow/
├── page.tsx                    # The Day view (replaces current flow page)
├── encounter/
│   └── [id]/
│       └── page.tsx            # The Encounter view
├── inbox/
│   └── page.tsx                # The Inbox view
├── components/
│   ├── DayView.tsx             # Patient list, status badges, header
│   ├── PatientRow.tsx          # Individual patient row with status
│   ├── EncounterView.tsx       # Encounter container with tabs
│   ├── NotePanel.tsx           # Note tab content (edit, sign, view)
│   ├── ProfilePanel.tsx        # Profile tab (summary, meds, dx)
│   ├── ActionsPanel.tsx        # Actions tab (checklist)
│   ├── RxPanel.tsx             # Rx tab (WENO iframe)
│   ├── LabsPanel.tsx           # Labs tab (embedded lab tool)
│   ├── InboxView.tsx           # Aggregated action items
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── StatusBadge.tsx         # Reusable status indicator
│   └── PayerTag.tsx            # Payer color chip
├── hooks/
│   ├── useEncounterStatus.ts   # Supabase Realtime subscription for status updates
│   ├── useTodayEncounters.ts   # Fetch + poll today's calendar events
│   └── useActionItems.ts       # Fetch + manage action items
└── lib/
    ├── encounter-state.ts      # Status constants, transitions, colors
    ├── meet-events.ts          # Meet event type definitions
    └── payer-colors.ts         # Payer → color mapping

apps/web/app/api/
├── meet-events/
│   └── route.ts                # Pub/Sub webhook endpoint for Meet events
├── encounters/
│   ├── [id]/
│   │   ├── status/
│   │   │   └── route.ts        # Update encounter status
│   │   ├── sign/
│   │   │   └── route.ts        # Sign/finalize a note
│   │   └── transcript/
│   │       └── route.ts        # Fetch transcript from Drive
│   └── today/
│       └── route.ts            # Get today's encounters with status
├── action-items/
│   ├── route.ts                # List action items for today
│   └── [id]/
│       └── route.ts            # Toggle action item completion
└── note-generation/
    └── trigger/
        └── route.ts            # Trigger async note generation for an encounter
```

---

## Implementation Phases

### Phase 1: The Day View (Core Schedule + Real-Time Status)

**Goal:** Replace the current `/flow` page with The Day view. Show today's patients from Google Calendar with real-time Meet status updates.

**Tasks:**
1. Build `DayView`, `PatientRow`, `Sidebar`, `StatusBadge`, `PayerTag` components using the design system from the prototype
2. Refactor `useTodayEncounters` hook to fetch today's events from Google Calendar (adapt existing `getUpcomingEncounters()` with date filtering)
3. Enrich calendar events with Supabase patient data (payer, dx, profile summary) — match by patient name parsed from calendar event title, or by `encounters.calendar_event_id`
4. Set up Google Workspace Events API + Pub/Sub infrastructure
5. Build `POST /api/meet-events` webhook to receive participant.joined/left and conference.started/ended events
6. Implement encounter status state machine in `encounters` table
7. Wire `useEncounterStatus` hook to Supabase Realtime for live status badge updates
8. Apply schema migrations for new `encounters` columns

**Definition of done:** Physician opens `/flow`, sees today's schedule, and when a patient joins a Meet call, the status badge updates in real-time without page refresh.

### Phase 2: The Encounter View (Note Generation + Profile)

**Goal:** Click a patient row → open The Encounter with Note and Profile tabs working.

**Tasks:**
1. Build `EncounterView`, `NotePanel`, `ProfilePanel` components
2. Wire the post-visit pipeline: conference.ended → fetch Drive transcript → generate note via Gemini → update status to note-ready
3. Adapt existing note generation pipeline (`services/note/`) to accept Google Meet transcripts (they come as timestamped dialogue, similar to what the existing Whisper/Gemini Flash pipeline produces)
4. Implement "Sign Note" action: sets `is_final = true`, `finalized_at`, `finalized_by` on `generated_notes`, updates encounter status to `signed`
5. Display patient profile (existing `patient_profiles` data) in the Profile tab
6. Display current medications and diagnoses from profile extraction

**Definition of done:** After a Meet call ends, the note draft appears in the Encounter's Note tab within 2–3 minutes. Physician can edit and sign.

### Phase 3: Action Items + Inbox

**Goal:** Extract action items from visit transcripts and display them in both the Encounter's Actions tab and The Inbox.

**Tasks:**
1. Build `ActionsPanel` and `InboxView` components
2. Implement action item extraction as a parallel Gemini call during note generation
3. Create `action_items` table and API routes
4. Wire `useActionItems` hook for fetching and toggling completion
5. Add badge count to Inbox nav item in Sidebar

**Definition of done:** After a visit, action items appear in both the Encounter's Actions tab and The Inbox. Checking items off in either location syncs.

### Phase 4: Rx + Labs Integration

**Goal:** Embed WENO e-prescribe and lab ordering within the Encounter view.

**Tasks:**
1. Register with WENO Exchange for EZ Integration (sign up at online.wenoexchange.com, $400 one-time sign-on fee + $99/year per prescriber for EPCS)
2. Build `RxPanel` that iframes WENO Online with patient context
3. Build `LabsPanel` that embeds or links to the existing lab-requisition-tool
4. Pass patient demographics to both embedded tools to avoid re-entry

**Definition of done:** Physician can prescribe and order labs from within the Encounter view without opening separate applications.

### Phase 5: Kill IntakeQ

**Goal:** Migrate remaining IntakeQ functions and cut the subscription.

**Tasks:**
1. Patient intake forms: replace with Google Forms (HIPAA-covered) or build simple intake form in the app
2. Appointment reminders: implement via Gmail API (send from hello@trymoonlit.com)
3. Superbill generation: already handled by the claims pipeline
4. Remove IntakeQ Playwright integration, IntakeQ API service, Browserbase dependency
5. Update all note-saving paths to write to Supabase + Drive (no more IntakeQ push)

**Definition of done:** IntakeQ subscription cancelled. All clinical documentation flows through strong.work/flow.

---

## Key Technical Decisions

### Why Supabase Realtime (not WebSockets from scratch)?
Supabase Realtime is already in the stack and provides Postgres change notifications with zero additional infrastructure. The encounter status update path is: Meet event → webhook → Supabase UPDATE → Realtime broadcast → frontend re-render. No custom WebSocket server needed.

### Why Google Meet transcription (not Whisper/Gemini Flash)?
Meet auto-transcription is free, runs in the background, saves to Drive automatically, and is HIPAA-covered under the Workspace BAA. The existing Whisper/Gemini Flash pipeline was necessary when recording happened outside of Meet (via AudioRecorder or CLI). For encounters that happen in Meet, the native transcription is simpler and more reliable. The existing transcription paths remain available as fallback for non-Meet encounters.

### Why iframe WENO (not build our own prescribing UI)?
E-prescribing requires Surescripts or equivalent network certification, DEA EPCS audits, and two-factor authentication at the prescription level. WENO has done all of this. Their iframe integration is DEA-compliant, EPCS-enabled, and costs $99/year per prescriber — less than one month of ScriptSure. Building our own prescribing UI would take 6–12 months and $50K+ in certification costs. The iframe is the correct abstraction boundary.

### Why not replace Google Calendar with our own scheduler?
Google Calendar is HIPAA-covered, syncs to every device, sends reminders, and creates Meet links automatically. Building a scheduler would add months of work for something that already works. The key insight: we read from Calendar via API and render our own UI. The physician gets the benefits of Google Calendar's infrastructure without ever needing to open it.

---

## Cost Model

| Component | Cost | Notes |
|-----------|------|-------|
| Google Workspace Business Plus | $22/user/mo | Meet + Calendar + Drive + Gmail + Gemini — all HIPAA |
| Supabase Pro | $25/mo | Postgres + Auth + Realtime + Storage |
| Vercel Pro | $20/mo | Hosting |
| WENO Exchange | $99/prescriber/yr | EPCS-enabled e-prescribe |
| Gemini API | ~$50–100/mo | Note generation + action extraction |
| Google Cloud Pub/Sub | ~$0–5/mo | Meet event delivery (very low volume) |
| **Total (5 prescribers)** | **~$265/mo** | vs. $600+/mo for IntakeQ + ScriptSure alone |

---

## Security & Compliance Notes

- **HIPAA BAA:** Signed electronically via Google Workspace Admin Console. Covers Meet, Calendar, Drive, Gmail, Gemini in Workspace. Supabase BAA signed separately. Vercel BAA available on Enterprise plan; alternatively, self-host on Google Cloud Run.
- **PHI in transit:** All Google API calls use TLS. Supabase connections use TLS. Pub/Sub messages encrypted in transit.
- **PHI at rest:** Google Drive encrypts at rest. Supabase encrypts at rest. Transcripts stored in both Drive (auto) and Supabase (after fetch).
- **Access control:** Multi-tenant provider isolation via NextAuth + `provider_id` on all tables. Supabase RLS policies enforce row-level access.
- **Audit logging:** Google Workspace provides admin audit logs. Supabase has audit capabilities via pgaudit. The `claim_status_events` table already models event sourcing for claims; consider extending this pattern to encounter status changes.
- **Session management:** Existing 15-minute HIPAA idle timeout in the lab-requisition-tool should be applied to strong.work/flow.

---

## References

- **Prototype UI:** `strong-work-flow.jsx` (generated in this conversation — interactive React prototype with mock data)
- **Existing codebase:** `epic-scribe-main/` (this repo)
- **Google Meet REST API:** https://developers.google.com/workspace/meet/api/guides/overview
- **Google Workspace Events API:** https://developers.google.com/workspace/events
- **Meet event types:** https://developers.google.com/workspace/events/guides/events-meet
- **WENO Exchange integration:** https://wenoexchange.com/api-learn-more/
- **Google HIPAA Included Functionality:** https://workspace.google.com/terms/2015/1/hipaa_functionality/
- **Google HIPAA Implementation Guide:** https://services.google.com/fh/files/misc/gsuite_cloud_identity_hipaa_implementation_guide.pdf
- **Existing Google Calendar integration:** `apps/web/src/google-calendar.ts`
- **Existing note generation service:** `services/note/`
- **Existing Supabase schema:** `supabase/COMPLETE_SCHEMA.sql`
- **Shared calendar setup:** `SHARED-CALENDAR-SETUP.md`
- **Financial model (payer economics):** Project knowledge `Financial_Modeling_Analysis_v4.md`
