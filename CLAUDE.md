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
pnpm dev          # Start dev server on :3002
pnpm build        # Production build
pnpm lint         # Check for issues
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

### IntakeQ Integration - Write Path (DEFERRED)
Push generated notes TO IntakeQ via Playwright browser automation. Architecture documented in `INTAKEQ_INTEGRATION_ARCHITECTURE.md`. Includes:
- Creating notes from generated content
- Adding ICD-10 diagnoses
- Signing and locking notes

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
