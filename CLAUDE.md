# Epic Scribe — Technical Roadmap & Context

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**North Star:** Generate Epic‑ready psychiatry notes with SmartTools that require <5 minutes of edits

---

## 🎯 CURRENT STATUS (2025-10-31)

### ✅ What's Working
- **Note Generation**: Full workflow with Gemini API integration
- **Authentication**: NextAuth middleware protecting /workflow, /templates, /patients, and all API routes
- **Template System**: 14 templates in Supabase database with section-level editing
- **SmartList System**: 97 SmartLists organized in 8 logical groups
- **Template Editor**:
  - Section-level editing with SmartTool insertion
  - Section cloning between templates
  - SmartList groups UI (Mental Status Exam, Psychiatric ROS, etc.)
- **Google OAuth**: External app configured for trymoonlit.com workspace
- **Google Integration**: Calendar/Meet/Drive integration for encounters
  - **Shared Calendar Integration**: All Meet links created in shared calendar owned by hello@trymoonlit.com for HIPAA compliance
  - **Encounter Management in /workflow**: View and select patient encounters directly in workflow page
  - **Enhanced Encounter Creation**: Prominent "Schedule New Encounter" button with improved UX
  - **Automatic List Refresh**: Newly created encounters appear immediately in workflow
  - **Simplified Setup**: No service account keys required - just share a Google Calendar!
- **Patient Management**: Full CRUD operations with database RLS policies
- **Patient Selector**: Integrated into workflow page with search and inline creation
- **Note Saving**: Save finalized notes to database with edited content tracking
- **Historical Context**: All patient notes automatically included in future prompts for continuity
- **Therapy Note Generation**: Specialized BHIDC therapy prompt builder (not medication management)
- **Local Development**: Full app works on `pnpm dev`
- **Local Builds**: Production builds succeed with `pnpm build`
- **Database**: Supabase with patients, encounters, templates, smartlists, generated_notes tables
- **Staffing Workflows**: Inline (RCC) and separate (Davis/Redwood) staffing detection

### ⚠️ Known Issues & Technical Debt

1. **Shared Calendar Setup Required** (CRITICAL for HIPAA Compliance)
   - Create a shared Google Calendar in hello@trymoonlit.com account
   - Follow `SHARED-CALENDAR-SETUP.md` for step-by-step instructions
   - Much simpler than service account approach - no JSON keys or complex permissions!
   - Without this: Meet links will be created under individual user accounts (not HIPAA compliant)
   - Environment variable needed:
     - `SHARED_CALENDAR_ID=calendar-id@group.calendar.google.com`

2. **Google OAuth Token Expiration**
   - Calendar API calls fail with 401 after token expires (typically ~1 hour)
   - **Workaround**: Sign out and sign back in to refresh tokens
   - Token refresh logic exists in auth callback but may not trigger properly
   - File: `apps/web/app/api/auth/[...nextauth]/route.ts`
   - **Note**: With shared calendar approach, user OAuth is used for both reading and creating events

3. **Database Migration Required**
   - Migration `010_add_note_content_fields.sql` must be run in Supabase dashboard
   - Adds `generated_content`, `final_note_content`, `is_final`, `finalized_at`, `finalized_by` columns
   - Required for note saving feature to work

3. **Vercel Deployment 404 Error** (CRITICAL BLOCKER)
   - Build succeeds but app returns 404 on all routes
   - See `HANDOFF_VERCEL_404.md` for detailed troubleshooting
   - Status: UNRESOLVED

4. **ESLint/TypeScript Warnings**
   - `ignoreDuringBuilds: true` in next.config.js is temporary
   - Run `pnpm lint` to see all issues

5. **Testing Required**
   - Note saving and historical context feature not tested end-to-end
   - Therapy note generation needs testing with real therapy transcripts
   - Staffing workflows (inline and separate) not tested with real transcripts

---

## 📋 NEXT PRIORITIES

### Immediate
1. **Set Up Shared Calendar** (CRITICAL - Required for Production)
   - Follow `SHARED-CALENDAR-SETUP.md` to create and configure shared calendar
   - Add `SHARED_CALENDAR_ID` to env vars
   - Test encounter creation to verify Meet links are hosted by hello@trymoonlit.com
   - This is required before production use to ensure HIPAA compliance
   - **Much simpler than service account approach!**

2. **Run Database Migration**
   - Execute `supabase/migrations/010_add_note_content_fields.sql` in Supabase dashboard
   - Required for note saving feature

3. **Test Encounter Workflow in /workflow**
   - Select patient → View encounters list
   - Create new encounter → Verify it appears in list
   - Click "Open Meet" button → Verify Meet link works
   - Select encounter → Verify encounter ID is tracked

4. **Fix OAuth Token Refresh**
   - Investigate why token refresh isn't triggering automatically
   - Consider implementing token refresh interceptor for API calls
   - File: `apps/web/app/api/auth/[...nextauth]/route.ts`

5. **Test Note Saving End-to-End**
   - Generate note → Edit → Save → Verify database entry
   - Generate second note for same patient → Verify historical context included
   - Test finalized notes display in patient profile

4. **Resolve Vercel 404 Deployment Issue**
   - Most likely: monorepo routing or build output path issue
   - See HANDOFF_VERCEL_404.md for hypotheses

5. **Fix ESLint/TypeScript Warnings**
   - Remove `ignoreDuringBuilds` hack
   - Fix unescaped quotes, unused vars, console statements

### Medium Priority
6. **Enhanced Patient Profile**
   - Display all finalized notes chronologically
   - Show encounter timeline with notes
   - Link to regenerate or view past notes

7. **Transcript Auto-Attachment**
   - Drive watcher for automatic transcript indexing
   - Attach transcripts to encounters within 60s

### Future
8. **Prompt Control & Observability**
   - Prompt preview before generation
   - Prompt receipts with version/hash tracking
   - Golden prompt snapshot tests

9. **IntakeQ Integration** (Moonlit only)
   - Auto-fetch prior notes for Transfer of Care / Follow-up

---

## 🏗️ ARCHITECTURE DECISIONS

### Template Loading Pattern
```typescript
// Database-first with fallback
try {
  template = await getTemplateBySettingAndVisitType(setting, visitType);
} catch (dbError) {
  template = templateService.getTemplate(setting, visitType); // fallback
}
```

### Visit Type Normalization
```typescript
// Handle aliases at database layer
if (setting === 'Redwood Clinic MHI' && visitType === 'Consultation Visit') {
  normalizedVisitType = 'Intake';
}
```

### Therapy Note Detection
```typescript
// Detect therapy templates and route to specialized prompt builder
const isTherapyFocused = template.setting === 'BHIDC therapy' ||
                        template.name?.toLowerCase().includes('therapy');

if (isTherapyFocused) {
  return buildTherapyPrompt({ template, transcript, ... });
}
```

### Note Persistence Pattern
```typescript
// Save both generated and edited versions
await saveGeneratedNote({
  patientId,
  encounterId,
  templateId,
  generatedContent: rawAIOutput,      // Original AI output
  finalNoteContent: userEditedVersion, // After user edits
  isFinal: true,                       // Mark as finalized
});
```

### Historical Context Inclusion
```typescript
// Fetch all finalized notes for patient
const notes = await getPatientFinalizedNotes(patientId);
const historicalNotes = formatHistoricalNotes(notes);

// Include in prompt for continuity of care
const prompt = await promptBuilder.build({
  template,
  transcript,
  historicalNotes, // All previous notes
});
```

### Monorepo Package Structure
- Services expose barrel exports via `/src/index.ts`
- `package.json` declares subpath exports
- Web app imports via `@epic-scribe/note-service`

### Next.js Rendering
- Pages with `useSearchParams()` must use Suspense boundaries
- Add `export const dynamic = 'force-dynamic'` for dynamic rendering

### Authentication Pattern
- Middleware protects all sensitive routes and API endpoints
- Server-side auth via `getServerSession(authOptions)`
- Client-side auth via `useSession()` hook with redirect logic
- AuthStatus component shows user email and sign-out option

---

## 📊 ACCEPTANCE CRITERIA

### Functional (F-series)
- **F1**: SmartLinks render as DotPhrases (`@lastvitals@` → `.lastvitals`)
- **F2**: SmartLists use valid options from catalog
- **F3**: Wildcards (`***`) replaced with transcript content or kept if unavailable
- **F4**: All template sections present in correct order
- **F5**: Prose-only output (no bullets/lists)

### Quality (Q-series)
- **Q1**: Median edit time ≤ 5 minutes
- **Q2**: ≥80% clinically usable with minor edits
- **Q3**: 100% valid SmartList selections
- **Q4**: Zero hallucinated clinical data

### Performance (P-series)
- **P1**: Generation < 30s for 30-minute transcript
- **P2**: ≥95% success rate across test transcripts

### Security (S-series)
- **S1**: No PHI in application logs
- **S2**: Encrypted PHI at rest in Supabase

---

## 🚀 DEPLOYMENT

### Vercel Configuration
**Key Files:**
- `vercel.json`: Build commands with pnpm version pinning
- `package.json`: `"packageManager": "pnpm@10.13.1"`
- `.vercelignore`: Exclude docs, tests, infra

**Deployment Checklist:**
- [ ] Resolve 404 issue (see HANDOFF_VERCEL_404.md)
- [ ] Run `pnpm lint` and fix warnings
- [ ] Test `pnpm build` locally
- [ ] Verify environment variables in Vercel dashboard
- [ ] Test database connectivity
- [ ] Post-deploy: test note generation end-to-end

---

## 🗂️ DATA MODEL

### Templates
```typescript
{
  id: UUID,
  template_id: string,     // e.g., "rcc_intake_v1"
  name: string,
  setting: string,         // "HMHI Downtown RCC" | "Redwood Clinic MHI" | ...
  visit_type: string,      // "Intake" | "Transfer of Care" | "Follow-up" | "First Visit"
  sections: TemplateSection[],
  smarttools: SmartTool[],
  staffing_config: {
    mode: 'inline' | 'separate' | 'none',
    visitTypes: string[],
    markers?: string[],    // For inline detection
    weight?: 'heavy' | 'moderate' | 'light'
  } | null,
  version: number,
  active: boolean
}
```

### SmartLists
```typescript
{
  id: UUID,
  identifier: string,
  epic_id: string,
  display_name: string,
  options: { value: string, order: number, is_default: boolean }[]
}
```

### Encounters
```typescript
{
  id: UUID,
  patient_id: UUID,
  calendar_event_id: string,
  setting: string,
  visit_type: string,
  scheduled_start: timestamp,
  meet_link: string,
  transcript_file_id?: string  // Google Drive
}
```

### Generated Notes
```typescript
{
  id: UUID,
  encounter_id: UUID,
  template_id: UUID,
  generated_content: text,
  final_note_content: text,    // Edited final version
  is_final: boolean,
  finalized_at: timestamp,
  finalized_by: UUID
}
```

---

## 🔧 CONFIGURATION

### Settings × Visit Types
1. **HMHI Downtown RCC**: Intake, Transfer of Care, Follow-up
   - **Staffing**: `inline` (Intake only) - attending conversation in same transcript
   - **Markers**: "supervising doctor", "staff this", "talk with my attending"

2. **Redwood Clinic MHI**: Consultation Visit (→ Intake), Transfer of Care, Follow-up
   - **Staffing**: `separate` (all visits) - end-of-day staffing in separate recording

3. **Davis Behavioral Health**: Intake, Transfer of Care, Follow-up
   - **Staffing**: `separate` (all visits)

4. **Moonlit Psychiatry**: Intake, Transfer of Care, Follow-up
   - **Staffing**: `none` (private practice)

5. **BHIDC therapy**: First Visit, Follow-up
   - **Note Type**: Therapy-focused (no medication management)
   - **Staffing**: `none`

### Required Environment Variables
```bash
# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-pro

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Workspace
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

---

## 📝 QUICK REFERENCE

### Template Editing
1. Go to `/templates`
2. Select template by Setting × Visit Type
3. Edit sections inline or use "Clone" to copy from another template
4. Changes auto-save to database

### SmartList Management
1. Go to `/smartlists`
2. Use "Quick Add SmartList" for common patterns
3. Or edit `/configs/smartlists-catalog.json` directly
4. Regenerate groups: `node scripts/generate-smartlist-groups.js`

### Note Generation
1. Go to `/workflow`
2. Sign in with Google (required for patient creation and encounters)
3. Select patient (or create new)
4. Select Setting × Visit Type
5. Paste transcript (and prior note for TOC/FU)
6. **Optional fields based on setting:**
   - **Davis/Redwood**: Paste separate staffing transcript
   - **BHIDC First Visit**: Paste BHIDC staff screener intake note
7. Click Generate
8. Review and edit note (historical notes automatically included if patient has prior notes)
9. Click "Save Note" to persist to database (optional)
10. Copy to clipboard for Epic

---

## 🧪 TESTING

### Local Testing
```bash
# Start dev server
pnpm dev

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Build for production
pnpm build
```

### Key Test Scenarios
1. **Template Editing**: Edit section → Save → Verify database update
2. **SmartTool Insertion**: Click "Add SmartTool" → Select group → Insert → Verify
3. **Section Cloning**: Clone RCC Psych ROS → MHI Consultation → Verify content copied
4. **Patient Creation**: Create patient → Link to encounter → Generate note
5. **Note Generation**: All 5 settings × all visit types → Verify output format

---

## 📚 REFERENCE DOCUMENTATION

For detailed setup and troubleshooting guides, see:
- **SHARED-CALENDAR-SETUP.md** - Shared calendar setup for HIPAA-compliant Meet hosting (NEW - RECOMMENDED)
- **GOOGLE-SERVICE-ACCOUNT-SETUP.md** - Alternative service account approach (more complex, deprecated in favor of shared calendar)
- **GOOGLE-OAUTH-EXTERNAL-SETUP.md** - OAuth configuration
- **SUPABASE_SETUP.md** - Database setup and RLS policies
- **UPDATE_OAUTH_CREDENTIALS.md** - OAuth troubleshooting
- **TRANSFER-OAUTH-TO-MOONLIT.md** - Workspace migration guide
- **HANDOFF_VERCEL_404.md** - Vercel deployment troubleshooting
- **DESIGNATED_EXAMINER_SPEC.md** - DE feature specification

---

## 🎉 RECENT UPDATES (2025-10-31)

### Session: Shared Calendar Integration & Encounter Management in /workflow
**Completed:**

1. ✅ **Shared Calendar Approach** (Replaced Service Account)
   - **Pivot**: Organization policy blocked service account key creation (`iam.disableServiceAccountKeyCreation`)
   - Switched to simpler shared calendar approach - no JSON keys required!
   - Shared calendar owned by hello@trymoonlit.com ensures HIPAA compliance
   - All Meet links created in shared calendar are automatically hosted by hello@trymoonlit.com
   - Uses existing user OAuth tokens instead of service account
   - Calendar ID configured in `.env.local` (see SHARED-CALENDAR-SETUP.md for instructions)
   - **Files:**
     - `SHARED-CALENDAR-SETUP.md` (created - simple setup guide)
     - `apps/web/src/google-calendar.ts` (modified - removed service account, added `getSharedCalendarId()`)
     - `.env.example` (updated with shared calendar documentation)
     - `GOOGLE-SERVICE-ACCOUNT-SETUP.md` (deprecated, kept for reference)

2. ✅ **Encounter Management Integrated into /workflow**
   - Created `EncountersList` component to display patient encounters
   - Shows: date/time, setting, visit type, Meet link (with "Open Meet" button)
   - Encounters automatically fetched when patient selected
   - Click encounter to select it (highlights, sets encounter ID)
   - Real-time list refresh after creating new encounter
   - Responsive design with max-height and scroll
   - **Files:**
     - `apps/web/src/components/workflow/EncountersList.tsx` (created)
     - `apps/web/src/components/workflow/GenerateInputStep.tsx` (modified - integrates EncountersList, fetch logic)

3. ✅ **Enhanced Encounter Creation UX**
   - Made "Create Encounter" button highly visible with gradient background and 2px border
   - Moved to prominent card (gradient indigo-50 to blue-50) with visual emphasis
   - Shows contextual info: patient, setting, visit type
   - Button scales on hover for better discoverability
   - User feedback: "no longer missable"
   - **Files:**
     - `apps/web/src/components/workflow/PatientSelector.tsx` (modified - prominent button styling)

4. ✅ **Post-Creation Behavior**
   - Encounters list automatically refreshes after creation
   - Newly created encounter auto-selected
   - Encounter ID tracked for note generation
   - Meet link immediately accessible
   - Callback system for seamless workflow
   - **Files:**
     - `apps/web/src/components/workflow/PatientSelector.tsx` (modified - added `onEncounterCreated` callback)
     - `apps/web/src/components/workflow/GenerateInputStep.tsx` (modified - `handleEncounterCreated` callback)

5. ✅ **Login Redirect to /workflow**
   - Changed default landing page from `/encounters` to `/workflow`
   - Users now go directly to main workflow after authentication
   - Makes workflow the central hub for all activities
   - **Files:**
     - `apps/web/app/auth/signin/page.tsx` (modified - line 12 callbackUrl changed)

6. ✅ **Bug Fix: Note Saving Database Query**
   - Fixed Supabase PostgREST ordering syntax error
   - Can't order by joined table columns with dot notation
   - Changed from `order('encounters.scheduled_start')` to `order('generated_at')`
   - Applied to both `getPatientFinalizedNotes()` and `getMostRecentFinalizedNote()`
   - **Error:** `PGRST100: "failed to parse order (encounters.scheduled_start.asc)"`
   - **Files:**
     - `apps/web/src/lib/db/notes.ts` (modified - lines 156, 178)

**Environment Variables Required:**
```bash
SHARED_CALENDAR_ID=your_calendar_id@group.calendar.google.com  # Get from SHARED-CALENDAR-SETUP.md
```

**Setup Required:**
- Follow `SHARED-CALENDAR-SETUP.md` to:
  1. Create shared calendar in hello@trymoonlit.com account
  2. Get Calendar ID from settings
  3. Share with team members (optional)
  4. Add `SHARED_CALENDAR_ID` to environment variables

**Testing Required:**
- Encounter creation → Verify Meet hosted by hello@trymoonlit.com
- Encounters list refresh after creation
- OAuth token behavior (may need sign-out/sign-in after ~1 hour)
- Note saving with historical context inclusion
- End-to-end workflow: select patient → create encounter → open Meet → generate note

**Advantages of Shared Calendar Approach:**
- ✅ Simpler setup (no JSON keys, no domain-wide delegation)
- ✅ Same HIPAA compliance outcome
- ✅ Easier to manage permissions
- ✅ No organization policy conflicts
- ✅ Uses existing OAuth flow

---

### Session: Authentication, Therapy Notes, and Note Persistence (2025-10-30)
**Completed:**

1. ✅ **Authentication Protection**
   - Created middleware to protect sensitive routes and API endpoints
   - Protected routes: `/workflow`, `/templates`, `/patients`, `/encounters`, `/designated-examiner`, all `/api/*` endpoints
   - Created `AuthStatus` component with user email display and sign-out button
   - Added client-side auth checks in workflow, templates, and home pages
   - Redirects unauthenticated users to `/auth/signin`
   - **Files:**
     - `apps/web/middleware.ts` (created)
     - `apps/web/src/components/AuthStatus.tsx` (created)
     - `apps/web/app/workflow/page.tsx` (modified)
     - `apps/web/app/templates/page.tsx` (modified)
     - `apps/web/app/home/page.tsx` (modified)

2. ✅ **Therapy Note Generation Fix**
   - Created specialized therapy prompt builder for BHIDC therapy templates
   - Routes therapy templates to `buildTherapyPrompt()` instead of clinical note builder
   - Emphasizes: therapeutic interventions, client progress, session content
   - Excludes: medication plans, lab orders, pharmacotherapy
   - Uses client-centered language ("client" not "patient")
   - **Detection logic:** `template.setting === 'BHIDC therapy'`
   - **Files:**
     - `services/note/src/prompts/therapy-prompt-builder.ts` (created)
     - `services/note/src/prompts/prompt-builder.ts` (modified)

3. ✅ **Note Saving and Historical Context**
   - Created database migration for note persistence columns
   - Created database functions for note CRUD operations
   - Created API endpoint for saving and retrieving notes
   - Added "Save Note" button to NoteResultsStep with loading/success states
   - Implemented automatic historical notes fetching for continuity of care
   - All finalized patient notes now included in future prompts
   - **Schema changes:**
     - `generated_content TEXT` - Raw AI output
     - `final_note_content TEXT` - User-edited version
     - `is_final BOOLEAN` - Finalization flag
     - `finalized_at TIMESTAMPTZ` - Save timestamp
     - `finalized_by TEXT` - User email
   - **Files:**
     - `supabase/migrations/010_add_note_content_fields.sql` (created)
     - `apps/web/src/lib/db/notes.ts` (created)
     - `apps/web/app/api/notes/route.ts` (created)
     - `apps/web/app/api/generate/route.ts` (modified - adds historical notes)
     - `apps/web/src/components/workflow/NoteResultsStep.tsx` (modified - Save button)
     - `apps/web/src/components/workflow/WorkflowWizard.tsx` (modified - handleSaveNote)
     - `services/note/src/prompts/prompt-builder.ts` (modified - historicalNotes param)

4. ✅ **Security Improvements**
   - Added `.gitignore` entry for `test-data/` directory to prevent PHI leaks

**Known Issues Identified:**
- Google OAuth tokens expire, causing 401 errors when creating encounters
- Workaround: Sign out and sign back in to refresh tokens
- Token refresh logic may not be triggering properly

**Migration Required:**
- Run `supabase/migrations/010_add_note_content_fields.sql` in Supabase dashboard before testing note saving feature

**Testing Required:**
- End-to-end note saving workflow
- Historical context inclusion verification
- Therapy note generation with real therapy transcripts
- OAuth token refresh behavior

---

### Session: Template Editor Improvements (Earlier)
**Completed:**
1. ✅ Fixed BHIDC missing from workflow dropdown
2. ✅ Fixed "Add SmartTool" error on templates page
3. ✅ Added section clone/copy functionality
4. ✅ Fixed build error

---

*For historical details and previous session notes, see Git commit history.*
