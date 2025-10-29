# Epic Scribe — Technical Roadmap & Context

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**North Star:** Generate Epic‑ready psychiatry notes with SmartTools that require <5 minutes of edits

---

## 🎯 CURRENT STATUS (2025-10-29)

### ✅ What's Working
- **Note Generation**: Full workflow with Gemini API integration (LOCAL ONLY)
- **Template System**: 14 templates in Supabase database with section-level editing
- **SmartList System**: 86 SmartLists loaded (database + file fallback)
- **Google OAuth**: Successfully configured with External app for trymoonlit.com workspace
- **Google Integration**: Calendar/Meet/Drive integration for encounters - TESTED & WORKING
- **Patient Management**: Full CRUD operations with database RLS policies configured
- **Patient Selector**: Integrated into workflow page with search and inline creation
- **Local Development**: Full app works perfectly on `pnpm dev`
- **Local Builds**: Production builds succeed with `pnpm build`
- **Database**: Supabase with patients, encounters, templates, smartlists, generated_notes tables
- **Database Permissions**: All RLS policies and table grants properly configured
- **Final Note Storage**: Database schema ready for storing finalized notes
- **Staffing Workflows**: Automated attending staffing conversation detection and integration (untested)
- **Therapy Notes**: BHIDC therapy-focused templates (First Visit, Follow-up) (untested)

### ⚠️ Known Issues & Technical Debt

1. **Vercel Deployment 404 Error** (CRITICAL BLOCKER)
   - ⚠️ Build succeeds but app returns 404 on all routes
   - ⚠️ See "Vercel Deployment Troubleshooting" section below for details
   - Status: UNRESOLVED - requires investigation

2. **ESLint/TypeScript Warnings Ignored** (CRITICAL)
   - `ignoreDuringBuilds: true` in next.config.js is temporary
   - Must fix linting errors before production
   - Run `pnpm lint` to see all issues

3. **Environment Variables**
   - Need comprehensive documentation
   - Add runtime validation for critical vars

4. **Staffing Workflows** (TESTING REQUIRED)
   - ⚠️ Inline staffing (HMHI RCC) not yet tested with real transcripts
   - ⚠️ Separate staffing (Davis, Redwood) not yet tested with real transcripts
   - ⚠️ BHIDC therapy templates not yet tested with real sessions

---

## 📋 NEXT PRIORITIES

### Immediate (Week 1-2)
1. ✅ **Patient Management UI** - COMPLETED (2025-10-29)
   - ✅ Created `/patients` page with list/search
   - ✅ Replaced free-text patient names with database references
   - ✅ Linked encounters to patient records
   - ✅ Integrated patient selector into workflow

2. ✅ **Google OAuth Setup** - COMPLETED (2025-10-29)
   - ✅ Configured External OAuth app for trymoonlit.com
   - ✅ Fixed authentication flow and credentials
   - ✅ Tested and working with Google Calendar/Meet/Drive

3. ✅ **Database Permissions** - COMPLETED (2025-10-29)
   - ✅ Configured RLS policies for all tables
   - ✅ Set up PostgreSQL table-level grants
   - ✅ Service role and authenticated role access working

4. **Note Finalization Flow** - IN PROGRESS
   - Add "Finalize Note" button to NoteResultsStep
   - Save final edited note content to database
   - Link finalized notes to patient records

5. **Fix ESLint/TypeScript Warnings**
   - Remove `ignoreDuringBuilds` hack
   - Fix unescaped quotes, unused vars, console statements

### Medium Priority (Phase 1.5)
6. **Historical Note Context**
   - Fetch last 3 finalized notes for follow-up visits
   - Pass historical context to generation API
   - Improve continuity in follow-up notes

7. **Enhanced Patient Profile**
   - Display all finalized notes chronologically
   - Show encounter timeline with notes
   - Quick access to generate new note

8. **Encounter Delete Functionality**
   - Add delete button to encounters table
   - Sync deletion with Google Calendar

9. **Transcript Auto-Attachment**
   - Drive watcher for automatic transcript indexing
   - Attach transcripts to encounters within 60s

### Future (Phase 2)
10. **Prompt Control & Observability**
   - Prompt preview before generation
   - Prompt receipts with version/hash tracking
   - Golden prompt snapshot tests

11. **IntakeQ Integration** (Moonlit only)
   - Auto-fetch prior notes for Transfer of Care / Follow-up

---

## 🏗️ ARCHITECTURE DECISIONS

### Template Loading Pattern
```typescript
// Database-first with fallback (apps/web/app/api/generate/route.ts)
try {
  template = await getTemplateBySettingAndVisitType(setting, visitType);
} catch (dbError) {
  template = templateService.getTemplate(setting, visitType); // fallback
}
```

### Visit Type Normalization
```typescript
// Handle aliases at database layer (apps/web/src/lib/db/templates.ts)
if (setting === 'Redwood Clinic MHI' && visitType === 'Consultation Visit') {
  normalizedVisitType = 'Intake';
}
```

### Monorepo Package Structure
- Services expose barrel exports via `/src/index.ts`
- `package.json` declares subpath exports
- Web app imports via `@epic-scribe/note-service`

### Next.js Rendering
- Pages with `useSearchParams()` must use Suspense boundaries
- Add `export const dynamic = 'force-dynamic'` for dynamic rendering

---

## 📊 ACCEPTANCE CRITERIA (Core)

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
- [ ] Run `pnpm lint` and fix warnings
- [ ] Run `pnpm typecheck` and fix errors
- [ ] Test `pnpm build` locally
- [ ] Verify environment variables
- [ ] Test database connectivity
- [ ] Post-deploy: test note generation end-to-end

### Vercel Deployment Troubleshooting (2025-10-28)

**PROBLEM:** Vercel deployment returns 404 on all routes despite successful build.

**Symptoms:**
- Build logs show successful compilation
- All Next.js routes compile successfully (including Route (app) pages)
- Installation completes: `Already up to date` with pnpm@10.13.1
- Build output shows no errors
- Deployed URL returns 404: Page Not Found
- Next.js renders `/_not-found` route instead of actual pages

**Context:**
- This is a **pnpm monorepo** with structure: `/apps/web` (Next.js app), `/packages/*`, `/services/*`
- Apps and packages linked via workspace protocol
- Root `package.json` uses `"packageManager": "pnpm@10.13.1"`
- Vercel detects Next.js framework automatically

**Troubleshooting Steps Attempted:**

1. ✅ **Fixed Missing BHIDC in TemplateReviewStep.tsx** (commit: 9c10d85)
   - Added `'BHIDC therapy': ['First Visit', 'Follow-up']` to VISIT_TYPES Record
   - Fixed TypeScript error that was blocking builds
   - Result: Build succeeded, but 404 persisted

2. ✅ **Added Missing Environment Variables to Vercel**
   - User initially only had localhost URLs in Vercel environment variables
   - Added production URLs for `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`
   - Added all required Supabase, Gemini, and Google Workspace credentials
   - Result: Build succeeded, but 404 persisted

3. ❌ **Attempted to Set rootDirectory in vercel.json** (commit: reverted)
   - Added `"rootDirectory": "apps/web"` to vercel.json
   - Result: Schema validation error - `rootDirectory` is NOT a valid vercel.json property
   - This property must be set in Vercel Dashboard UI, not in vercel.json

4. ✅ **Set Root Directory in Vercel Dashboard UI**
   - Navigated to Vercel project → Settings → General → Root Directory
   - Set value to: `apps/web`
   - Triggered redeploy
   - Result: Build succeeded, but **404 STILL PERSISTS**

**Current vercel.json Configuration:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && npx pnpm@10.13.1 --filter=@epic-scribe/web build",
  "devCommand": "pnpm --filter=@epic-scribe/web dev",
  "installCommand": "npx pnpm@10.13.1 install",
  "framework": null,
  "outputDirectory": ".next"
}
```

**Current Vercel Project Settings:**
- Root Directory: `apps/web`
- Framework Preset: Next.js (auto-detected, then overridden to null in vercel.json)
- Build Command: Custom (defined in vercel.json)
- Output Directory: `.next`
- Install Command: Custom (defined in vercel.json)
- Node.js Version: 20.x (from package.json engines)

**Key Observations:**
- Local development works perfectly (`pnpm dev` from root)
- Local production build works (`pnpm build` from root)
- Vercel build logs show successful compilation with no errors
- Build cache is being used from previous deployments
- `.vercelignore` excludes 50+ files (mostly .git and docs)

**What's NOT the Issue:**
- ❌ TypeScript errors (fixed)
- ❌ Missing environment variables (added to Vercel)
- ❌ Missing Root Directory setting (configured in Dashboard)
- ❌ Build failures (build succeeds every time)
- ❌ vercel.json syntax errors (schema validates)

**Hypotheses to Investigate:**

1. **Monorepo Routing Issue**
   - Vercel may not be correctly resolving the Next.js app within the monorepo structure
   - The `buildCommand` uses `cd ../..` which assumes it starts from `apps/web`
   - If Root Directory is set to `apps/web`, the build command may be going to wrong location
   - **Test:** Try removing `cd ../..` from buildCommand since Root Directory is already set

2. **Output Directory Path Issue**
   - `outputDirectory: ".next"` may need to be relative to root or absolute
   - With Root Directory set to `apps/web`, Vercel might be looking for `.next` in wrong location
   - **Test:** Try `apps/web/.next` as outputDirectory

3. **Framework Detection Conflict**
   - Setting `"framework": null` may interfere with Next.js routing
   - Vercel auto-detects Next.js but we're overriding it
   - **Test:** Remove `"framework": null` and let Vercel auto-detect

4. **Workspace Dependencies Not Resolved**
   - Monorepo packages may not be properly linked during Vercel build
   - pnpm workspace protocol may need special handling
   - **Test:** Check if Vercel needs special pnpm configuration

5. **Build Output Location Mismatch**
   - Next.js may be building to correct location but Vercel can't find it
   - Need to verify where `.next` directory actually exists after build
   - **Test:** Add debug step to list directory contents after build

**Recommended Next Steps:**

1. **Review Vercel Build Logs Completely**
   - User's last log snippet stopped after installation
   - Need to see full build output including Next.js compilation and deployment
   - Look for warnings about missing files or incorrect paths

2. **Try Simplified vercel.json**
   ```json
   {
     "buildCommand": "pnpm --filter=@epic-scribe/web build",
     "installCommand": "pnpm install"
   }
   ```
   - Remove `cd ../..` since Root Directory handles path
   - Remove `framework: null` to allow auto-detection
   - Simplify install command

3. **Check Vercel Function Logs**
   - View runtime logs in Vercel dashboard
   - Look for Next.js server errors or routing issues
   - Check if pages are being served at all

4. **Verify Package Resolution**
   - Ensure `@epic-scribe/types`, `@epic-scribe/note-service` are resolved
   - Check if Vercel is following workspace protocol
   - May need to use `pnpm install --frozen-lockfile`

5. **Test with Minimal Next.js App**
   - Temporarily simplify app to single page
   - Verify basic deployment works before adding complexity
   - Rule out app-specific routing issues

**Files to Review:**
- `/apps/web/next.config.js` - Check for routing config
- `/apps/web/app/layout.tsx` - Verify root layout
- `/.vercelignore` - Ensure not excluding critical files
- `/pnpm-lock.yaml` - Verify dependency resolution

**Reference:**
- Vercel Monorepo Docs: https://vercel.com/docs/monorepos
- Vercel Next.js Docs: https://vercel.com/docs/frameworks/nextjs
- pnpm Workspace Docs: https://pnpm.io/workspaces

---

## 🗂️ DATA MODEL

### Templates
```typescript
{
  id: UUID,
  template_id: string,  // e.g., "rcc_intake_v1"
  name: string,
  setting: string,      // "HMHI Downtown RCC" | "Redwood Clinic MHI" | ...
  visit_type: string,   // "Intake" | "Transfer of Care" | "Follow-up" | "First Visit"
  sections: TemplateSection[],
  smarttools: SmartTool[],
  staffing_config: {    // NEW: Attending staffing configuration
    mode: 'inline' | 'separate' | 'none',
    visitTypes: string[],
    markers?: string[],  // For inline detection
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

### Encounters (TODO: Patient Link)
```typescript
{
  id: UUID,
  patient_id: UUID,           // TODO: implement patient management
  calendar_event_id: string,
  setting: string,
  visit_type: string,
  scheduled_start: timestamp,
  meet_link: string,
  transcript_file_id?: string // Google Drive
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
   - **Staffing**: `separate` (all visits) - end-of-day staffing in separate recording
4. **Moonlit Psychiatry**: Intake, Transfer of Care, Follow-up
   - **Staffing**: `none` (private practice - no staffing)
5. **BHIDC therapy**: First Visit, Follow-up
   - **Note Type**: Therapy-focused (no medication management)
   - **Staff Intake**: Optional BHIDC staff screener intake note (First Visit only)

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
```

---

## 📝 QUICK REFERENCE

### Template Editing
1. Go to `/templates`
2. Select template by Setting × Visit Type
3. Edit sections inline
4. Changes auto-save to database

### SmartList Management
1. Go to `/smartlists`
2. Use "Quick Add SmartList" for common patterns
3. Or edit `/configs/smartlists-catalog.json` directly

### Note Generation
1. Go to `/encounters` or `/generate`
2. Select Setting × Visit Type
3. Paste transcript (and prior note for TOC/FU)
4. **Optional fields based on setting:**
   - **Davis/Redwood**: Paste separate staffing transcript (if applicable)
   - **BHIDC First Visit**: Paste BHIDC staff screener intake note (if available)
5. Click Generate
6. Copy note to clipboard

---

## 📚 TECHNICAL NOTES

### SmartList Catalog Structure
- Nested in `smartLists` object: 69 SmartLists
- Top-level keys: 17 Psychiatric ROS SmartLists
- Total unique: 86 (172 Map entries for dual-key lookup)
- Lookup by `epicId` or `identifier` both O(1)

### Template Version Control
- Each edit increments `version` number
- Edit history tracked in `template_edits` table
- Section-level tracking with old/new content

### Prompt Builder Flow
```
SYSTEM + TASK + SMARTTOOLS RULES + TEMPLATE + PRIOR NOTE? + STAFFING TRANSCRIPT? + TRANSCRIPT
→ Gemini API
→ Validation (SmartLists, structure, format)
→ Generated Note
```

### Staffing Configuration System
**Three modes of attending physician staffing:**

1. **Inline Staffing** (HMHI RCC Intake)
   - Staffing conversation recorded in same transcript as patient visit
   - LLM detects transition markers ("supervising doctor", "staff this")
   - Extracts attending recommendations
   - Plan section heavily weighted on staffing discussion

2. **Separate Staffing** (Davis, Redwood)
   - End-of-day staffing recorded separately
   - UI provides optional "Staffing Discussion Transcript" field
   - Patient transcript used for clinical sections
   - Staffing transcript used primarily for Plan section

3. **No Staffing** (Moonlit, BHIDC)
   - Private practice or therapy-only settings
   - No attending staffing workflow

---

## 🎯 DEFINITION OF DONE (v1.0)

- [ ] All F-series criteria met
- [ ] All Q-series thresholds hit on 20-test-transcript run
- [ ] All P-series benchmarks achieved
- [ ] All S-series security controls verified
- [ ] Patient management UI complete
- [ ] ESLint/TypeScript clean build
- [ ] Environment variables documented
- [ ] Paste into Epic with zero formatting fixes

---

## 📖 FOR FUTURE SESSIONS

### 🚨 URGENT: Vercel 404 Deployment Issue

**CRITICAL BLOCKER:** The application is currently NOT accessible on Vercel despite successful builds.

**Your First Task:**
1. Read the "Vercel Deployment Troubleshooting" section under DEPLOYMENT
2. Ask user for complete Vercel build logs (full output, not just snippet)
3. Review all 5 hypotheses and recommended next steps
4. Focus on Hypothesis #1 (Monorepo Routing Issue) - most likely culprit
5. Try the simplified vercel.json configuration first

**Quick Context:**
- Monorepo structure: `/apps/web` contains Next.js app
- Build succeeds, all routes compile, but deployment returns 404
- Root Directory is set to `apps/web` in Vercel Dashboard
- Current buildCommand: `cd ../.. && pnpm --filter=@epic-scribe/web build`
- Likely issue: `cd ../..` conflicts with Root Directory setting

**What We've Already Tried:**
- ✅ Fixed TypeScript errors
- ✅ Added environment variables
- ✅ Set Root Directory in Vercel Dashboard
- ❌ All attempts still result in 404

**Don't Waste Time On:**
- Environment variables (already configured)
- TypeScript errors (already fixed)
- Build failures (build succeeds)

---

**Start Here (Normal Sessions):**
1. Read "CURRENT STATUS" and "NEXT PRIORITIES"
2. Check "Known Issues" for blockers
3. Review recent git log for context
4. Run `pnpm dev` and test locally before changes

**Common Tasks:**
- Add SmartList: Edit `/configs/smartlists-catalog.json` or use QuickAdd UI
- Edit Template: Use `/templates` page, edits persist to database
- Fix Template Loading: All template reads via `/lib/db/templates.ts`
- Deploy: Push to main → Vercel auto-deploys

**Key Files:**
- Templates DB: `/apps/web/src/lib/db/templates.ts`
- SmartLists Service: `/services/note/src/smartlists/smartlist-service.ts`
- Note Generation: `/apps/web/app/api/generate/route.ts`
- Prompt Builder: `/services/note/src/prompts/psychiatric-prompt-builder.ts`
- Staffing Config: Templates table `staffing_config` JSONB column

**Recent Migrations:**
- `005_add_staffing_config_complete.sql` - Added staffing_config column, updated HMHI RCC
- `006_add_separate_staffing_configs.sql` - Updated Davis/Redwood with separate staffing
- `007_add_bhidc_therapy_templates_v2.sql` - Added BHIDC therapy templates
- `008_add_final_note_storage.sql` - Added final_note_content, is_final, finalized_at fields for persistent note storage

---

## 🎉 SESSION NOTES (2025-10-29)

### What We Accomplished

**1. Google OAuth Setup - COMPLETE ✅**
- Created fresh OAuth 2.0 client in Google Cloud Console
- Configured as **External** app (supports personal Gmail + Workspace accounts)
- Set up test users for trymoonlit.com workspace
- Updated OAuth credentials in both `.env` and `.env.local`
- Client ID: `1040402296542-n05n394qaemohkvulsqhrpc8qvat4veb.apps.googleusercontent.com`
- Successfully tested authentication flow
- Google Calendar/Meet/Drive integration working

**2. Patient Management System - COMPLETE ✅**
- Created comprehensive `PatientSelector` component with:
  - Real-time patient search with debouncing
  - Inline patient creation modal
  - Google Calendar encounter creation
  - Automatic Google Meet link generation
- Enhanced patient API endpoints:
  - `GET /api/patients/[id]` - Fetch patient with encounters and notes
  - Added `getNotesByPatientId()` function
- Integrated patient selection into `/workflow` page
- Patient creation working in both `/workflow` and `/encounters` views

**3. Database Permissions - COMPLETE ✅**
- Fixed Supabase RLS policies for authenticated users
- Set up PostgreSQL table-level grants:
  - `authenticated` role: full access to patients, encounters, generated_notes
  - `service_role`: full access to all tables
  - Sequence permissions for auto-increment IDs
- Resolved "permission denied" errors
- Patient CRUD operations now working flawlessly

**4. Final Note Storage Schema - COMPLETE ✅**
- Created migration `008_add_final_note_storage.sql`
- Added fields to `generated_notes` table:
  - `final_note_content` (TEXT) - Stores the edited final version
  - `is_final` (BOOLEAN) - Marks note as finalized
  - `finalized_at` (TIMESTAMPTZ) - Timestamp of finalization
  - `finalized_by` (UUID) - User who finalized the note
- Created database function `get_recent_final_notes_for_patient()` for efficient retrieval
- Added helper functions in `/lib/db/notes.ts`:
  - `finalizeNote()`
  - `getRecentFinalNotesForPatient()`
  - `getFinalNotesForPatient()`

**5. Documentation**
- Created `GOOGLE-OAUTH-EXTERNAL-SETUP.md` - Complete guide for External OAuth apps
- Created `TRANSFER-OAUTH-TO-MOONLIT.md` - Migration guide for workspace transfer
- Created `APPLY_FINAL_NOTES_MIGRATION.md` - Instructions for database migration
- Updated `UPDATE_OAUTH_CREDENTIALS.md` - Troubleshooting guide

### Key Fixes & Decisions

**OAuth Configuration:**
- **Decision:** Use External OAuth (not Internal) to support both personal Gmail and Workspace accounts
- **Benefit:** More flexible for testing, supports up to 100 test users, no verification needed
- **Tradeoff:** Shows "unverified app" warning (acceptable for internal tool)

**Database Architecture:**
- **Decision:** Store final note content in database (not just Google Drive)
- **Benefit:** Fast retrieval for historical context in follow-up visits
- **Implementation:** `generated_notes` table with `final_note_content` field

**Patient Selector UX:**
- **Decision:** Integrate patient selection into workflow page (not separate screen)
- **Benefit:** Smoother user experience, fewer page transitions
- **Implementation:** `PatientSelector` component with inline modals

### Environment Variables (Vercel Update Required)

Update these in Vercel Dashboard:
```bash
# Google OAuth (from .env.local)
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<your-google-client-secret>

# NextAuth (already set)
NEXTAUTH_URL=https://epic-scribe.vercel.app
NEXTAUTH_SECRET=<your-nextauth-secret>

# Gemini (from .env.local)
GEMINI_API_KEY=AIzaSy<your-gemini-api-key>
GEMINI_MODEL=gemini-1.5-pro

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Files Created/Modified

**New Files:**
- `/apps/web/src/components/workflow/PatientSelector.tsx` - Patient selection UI
- `/supabase/migrations/008_add_final_note_storage.sql` - Database schema
- `/GOOGLE-OAUTH-EXTERNAL-SETUP.md` - OAuth documentation
- `/TRANSFER-OAUTH-TO-MOONLIT.md` - Migration guide
- `/APPLY_FINAL_NOTES_MIGRATION.md` - Migration instructions
- `/UPDATE_OAUTH_CREDENTIALS.md` - Troubleshooting guide

**Modified Files:**
- `/apps/web/src/lib/db/notes.ts` - Added patient note functions
- `/apps/web/app/api/patients/[id]/route.ts` - Enhanced with notes
- `/apps/web/src/components/workflow/WorkflowWizard.tsx` - Patient state management
- `/apps/web/src/components/workflow/GenerateInputStep.tsx` - Integrated PatientSelector
- `/.env` - Updated OAuth credentials
- `/apps/web/.env.local` - Updated OAuth credentials
- `/CLAUDE.md` - Updated status and priorities

### Testing Completed

✅ Google OAuth sign-in with rufussweeney@gmail.com
✅ Google OAuth sign-in with hello@trymoonlit.com
✅ Patient creation in workflow page
✅ Patient search functionality
✅ Patient selection and persistence
✅ Database permissions for all operations
✅ Encounters page patient creation

### Next Session Priorities

1. **Implement note finalization UI**
   - Add "Finalize Note" button in NoteResultsStep
   - Create API endpoint to save final note content
   - Test complete flow from generation to finalization

2. **Add historical context to note generation**
   - Fetch last 3 finalized notes for patient
   - Pass to generation API for better continuity
   - Update prompt builder to include historical context

3. **Enhance patient profile page**
   - Display finalized notes chronologically
   - Show encounter timeline
   - Add quick "Generate New Note" action

---

*For historical details and session notes, see Git commit history.*
