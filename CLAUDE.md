# Epic Scribe — Technical Roadmap & Context

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**Production URL:** https://strong.work (custom domain on Vercel)
**North Star:** Generate Epic-ready psychiatry notes with SmartTools that require <5 minutes of edits

---

## Current Status (2026-02-03)

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
- **IntakeQ Integration (Write Path)**: Push generated notes to IntakeQ via Playwright automation (local only)
- **Prior Notes Import**: Clipboard-based Epic note import with auto-population in workflow UI

### Known Issues
1. **Google OAuth Token Expiration** - Workaround: Sign out/in to refresh (~1 hour expiry)
2. **Vercel 404 Deployment** - Build succeeds but routes return 404 (see `HANDOFF_VERCEL_404.md`)
3. **ESLint Warnings** - `ignoreDuringBuilds: true` masks ~40 errors (mostly unescaped apostrophes)

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
NEXTAUTH_URL=             # Production: https://strong.work
NEXTAUTH_SECRET=

# IntakeQ API (for Moonlit Psychiatry prior notes)
INTAKEQ_API_KEY=          # Get from IntakeQ Settings > Integrations > Developer API

# IntakeQ Playwright (for pushing notes - local/server only, not Vercel)
INTAKEQ_USER_EMAIL=       # IntakeQ login email
INTAKEQ_USER_PASSWORD=    # IntakeQ login password
INTAKEQ_NOTE_TEMPLATE_NAME=  # Optional, defaults to "Moonlit Psychiatric Note"
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

---

## Recent Updates (2026-02-03)

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

### IntakeQ Integration - Write Path (IN PROGRESS)
Push generated notes TO IntakeQ via Playwright browser automation.

**IMPORTANT:** This only works locally or on servers with browser support. Does NOT work on Vercel serverless.

**Current Status (2026-02-03):**
- ✅ Login automation works (`https://intakeq.com/signin`)
- ✅ Client navigation works (uses GUID-based URL)
- ⏳ "Add Note" flow not yet implemented
- ⏳ Form field filling not yet tested
- ⏳ Diagnosis addition not yet tested
- ⏳ Signature/lock not yet tested

**Key Discovery - IntakeQ URL Structure:**
- Login: `https://intakeq.com/signin`
- Client profile: `https://intakeq.com/#/client/{GUID}?tab=timeline`
- The GUID comes from the API response (`Guid` field), NOT the numeric `ClientId`

**Test Scripts (run from `services/intakeq-playwright/`):**
```bash
pnpm tsc                      # Compile TypeScript
node dist/test-login.js       # Test login - WORKS
node dist/test-client-nav.js  # Test client navigation - WORKS
```

**What the Next Session Needs to Do:**
1. Click the blue "+" button next to Timeline to see Add Note flow
2. Identify selectors for template selection modal
3. Map Epic Scribe note sections to IntakeQ form fields
4. Test diagnosis addition via "More → Add Diagnosis"
5. Test signature and lock functionality
6. Update `services/intakeq-playwright/src/selectors.ts` with real selectors

**Components:**
- `services/intakeq-playwright/` - Playwright automation, selectors, note mapper
- `services/intakeq-playwright/src/intakeq-automation.ts` - Main automation class
- `services/intakeq-playwright/src/selectors.ts` - CSS selectors (need updates for Add Note flow)
- `services/intakeq-playwright/src/note-mapper.ts` - Maps Epic Scribe sections to IntakeQ fields
- `services/intakeq-playwright/src/diagnosis-extractor.ts` - Extracts ICD-10 codes from notes
- `apps/web/app/api/intakeq/push-note/route.ts` - API endpoint
- `INTAKEQ_INTEGRATION_ARCHITECTURE.md` - Full architecture documentation

**Env vars required (already configured in .env.local):**
- `INTAKEQ_API_KEY` - For API lookups
- `INTAKEQ_USER_EMAIL` - IntakeQ login (hello@trymoonlit.com)
- `INTAKEQ_USER_PASSWORD` - IntakeQ password
- `INTAKEQ_NOTE_TEMPLATE_NAME` (optional) - Template to use

**Playwright Setup:**
```bash
npx playwright install chromium  # Install browser (already done)
```

**Screenshots saved to:** `services/intakeq-playwright/screenshots/` (gitignored for PHI)

**Limitations:**
- Requires real browser (Chromium via Playwright)
- UI selectors may need updating if IntakeQ changes their interface
- Only works locally or on servers with browser support (not Vercel)

---

## Previous Updates (2025-01-05)

### Custom Domain Migration
- Production moved from `epic-scribe.vercel.app` to **https://strong.work**
- Google OAuth configured for new domain
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
