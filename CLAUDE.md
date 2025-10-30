# Epic Scribe — Technical Roadmap & Context

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**North Star:** Generate Epic‑ready psychiatry notes with SmartTools that require <5 minutes of edits

---

## 🎯 CURRENT STATUS (2025-10-30)

### ✅ What's Working
- **Note Generation**: Full workflow with Gemini API integration (LOCAL ONLY)
- **Template System**: 14 templates in Supabase database with section-level editing
- **SmartList System**: 97 SmartLists organized in 8 logical groups
- **Template Editor**:
  - Section-level editing with SmartTool insertion
  - Section cloning between templates
  - SmartList groups UI (Mental Status Exam, Psychiatric ROS, etc.)
- **Google OAuth**: External app configured for trymoonlit.com workspace
- **Google Integration**: Calendar/Meet/Drive integration for encounters
- **Patient Management**: Full CRUD operations with database RLS policies
- **Patient Selector**: Integrated into workflow page with search and inline creation
- **Local Development**: Full app works on `pnpm dev`
- **Local Builds**: Production builds succeed with `pnpm build`
- **Database**: Supabase with patients, encounters, templates, smartlists, generated_notes tables
- **Final Note Storage**: Database schema with `final_note_content` field ready
- **Staffing Workflows**: Inline (RCC) and separate (Davis/Redwood) staffing detection
- **Therapy Notes**: BHIDC therapy templates (First Visit, Follow-up)

### ⚠️ Known Issues & Technical Debt

1. **Vercel Deployment 404 Error** (CRITICAL BLOCKER)
   - Build succeeds but app returns 404 on all routes
   - See `HANDOFF_VERCEL_404.md` for detailed troubleshooting
   - Status: UNRESOLVED

2. **ESLint/TypeScript Warnings**
   - `ignoreDuringBuilds: true` in next.config.js is temporary
   - Run `pnpm lint` to see all issues

3. **Testing Required**
   - Staffing workflows (inline and separate) not tested with real transcripts
   - BHIDC therapy templates not tested with real sessions

---

## 📋 NEXT PRIORITIES

### Immediate
1. **Resolve Vercel 404 Deployment Issue**
   - Most likely: monorepo routing or build output path issue
   - See HANDOFF_VERCEL_404.md for hypotheses

2. **Note Finalization Flow**
   - Add "Finalize Note" button to NoteResultsStep
   - Save final edited note content to database
   - Link finalized notes to patient records

3. **Fix ESLint/TypeScript Warnings**
   - Remove `ignoreDuringBuilds` hack
   - Fix unescaped quotes, unused vars, console statements

### Medium Priority
4. **Historical Note Context**
   - Fetch last 3 finalized notes for follow-up visits
   - Pass historical context to generation API

5. **Enhanced Patient Profile**
   - Display all finalized notes chronologically
   - Show encounter timeline with notes

6. **Transcript Auto-Attachment**
   - Drive watcher for automatic transcript indexing
   - Attach transcripts to encounters within 60s

### Future
7. **Prompt Control & Observability**
   - Prompt preview before generation
   - Prompt receipts with version/hash tracking
   - Golden prompt snapshot tests

8. **IntakeQ Integration** (Moonlit only)
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

### Monorepo Package Structure
- Services expose barrel exports via `/src/index.ts`
- `package.json` declares subpath exports
- Web app imports via `@epic-scribe/note-service`

### Next.js Rendering
- Pages with `useSearchParams()` must use Suspense boundaries
- Add `export const dynamic = 'force-dynamic'` for dynamic rendering

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
2. Select patient (or create new)
3. Select Setting × Visit Type
4. Paste transcript (and prior note for TOC/FU)
5. **Optional fields based on setting:**
   - **Davis/Redwood**: Paste separate staffing transcript
   - **BHIDC First Visit**: Paste BHIDC staff screener intake note
6. Click Generate
7. Review and edit note
8. Copy to clipboard for Epic

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
- **GOOGLE-OAUTH-EXTERNAL-SETUP.md** - OAuth configuration
- **SUPABASE_SETUP.md** - Database setup and RLS policies
- **UPDATE_OAUTH_CREDENTIALS.md** - OAuth troubleshooting
- **TRANSFER-OAUTH-TO-MOONLIT.md** - Workspace migration guide
- **HANDOFF_VERCEL_404.md** - Vercel deployment troubleshooting
- **DESIGNATED_EXAMINER_SPEC.md** - DE feature specification

---

## 🎉 RECENT UPDATES (2025-10-30)

### Session: Template Editor Improvements
**Completed:**
1. ✅ Fixed BHIDC missing from workflow dropdown
   - Imported `SETTINGS` from types package instead of hardcoding
   - File: `apps/web/src/components/workflow/TemplateReviewStep.tsx`

2. ✅ Fixed "Add SmartTool" error on templates page
   - Generated SmartList groups structure (8 groups, 97 SmartLists)
   - Groups: Mental Status Exam, Psychiatric ROS, Substance Use, Social History, etc.
   - Files: `configs/smartlists-catalog.json`, `scripts/generate-smartlist-groups.js`

3. ✅ Added section clone/copy functionality
   - Created `SectionCloneModal` component for cloning sections between templates
   - Added "Clone" button to TemplateEditor
   - Supports replacing existing sections or creating new ones
   - Files: `apps/web/src/components/SectionCloneModal.tsx`, `apps/web/src/components/TemplateEditor.tsx`

4. ✅ Fixed build error
   - Removed broken import of non-existent `smarttools/validator`
   - File: `services/note/src/index.ts`

**Commits:**
- `f4154f1` - fix: Add BHIDC dropdown, fix SmartTool error, and add section clone feature
- `37ef11a` - fix: Use object keys instead of identifiers in SmartList groups

---

*For historical details and previous session notes, see Git commit history.*
