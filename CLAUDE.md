# Epic Scribe — Technical Roadmap & Context

**Owner:** Dr. Rufus Sweeney (PGY‑3 Psychiatry)
**Stack:** Next.js 14, pnpm monorepo, Supabase, Gemini API
**North Star:** Generate Epic‑ready psychiatry notes with SmartTools that require <5 minutes of edits

---

## 🎯 CURRENT STATUS (2025-10-28)

### ✅ What's Working
- **Note Generation**: Full workflow with Gemini API integration
- **Template System**: 12 templates in Supabase database with section-level editing
- **SmartList System**: 86 SmartLists loaded (database + file fallback)
- **Google Integration**: Calendar/Meet/Drive integration for encounters
- **Deployment**: Successfully deployed to Vercel
- **Database**: Supabase with patients, encounters, templates, smartlists tables

### ⚠️ Known Issues & Technical Debt

1. **ESLint/TypeScript Warnings Ignored** (CRITICAL)
   - `ignoreDuringBuilds: true` in next.config.js is temporary
   - Must fix linting errors before production
   - Run `pnpm lint` to see all issues

2. **Template Loading Architecture** (FIXED)
   - ✅ Generate API now loads from database (not in-memory)
   - ✅ Visit type normalization for Redwood "Consultation Visit" → "Intake"

3. **Environment Variables**
   - Need comprehensive documentation
   - Add runtime validation for critical vars

---

## 📋 NEXT PRIORITIES

### Immediate (Week 1-2)
1. **Fix ESLint/TypeScript Warnings**
   - Remove `ignoreDuringBuilds` hack
   - Fix unescaped quotes, unused vars, console statements

2. **Patient Management UI**
   - Create `/patients` page with list/search
   - Replace free-text patient names with database references
   - Link encounters to patient records

3. **Environment Variable Documentation**
   - Document all required vars in `.env.example`
   - Add validation at startup

### Medium Priority (Phase 1.5)
4. **Encounter Delete Functionality**
   - Add delete button to encounters table
   - Sync deletion with Google Calendar

5. **Transcript Auto-Attachment**
   - Drive watcher for automatic transcript indexing
   - Attach transcripts to encounters within 60s

### Future (Phase 2)
6. **Prompt Control & Observability**
   - Prompt preview before generation
   - Prompt receipts with version/hash tracking
   - Golden prompt snapshot tests

7. **IntakeQ Integration** (Moonlit only)
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

---

## 🗂️ DATA MODEL

### Templates
```typescript
{
  id: UUID,
  template_id: string,  // e.g., "rcc_intake_v1"
  name: string,
  setting: string,      // "HMHI Downtown RCC" | "Redwood Clinic MHI" | ...
  visit_type: string,   // "Intake" | "Transfer of Care" | "Follow-up"
  sections: TemplateSection[],
  smarttools: SmartTool[],
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
2. **Redwood Clinic MHI**: Consultation Visit (→ Intake), Transfer of Care, Follow-up
3. **Davis Behavioral Health**: Intake, Transfer of Care, Follow-up
4. **Moonlit Psychiatry**: Intake, Transfer of Care, Follow-up

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
4. Click Generate
5. Copy note to clipboard

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
SYSTEM + TASK + SMARTTOOLS RULES + TEMPLATE + PRIOR NOTE? + TRANSCRIPT
→ Gemini API
→ Validation (SmartLists, structure, format)
→ Generated Note
```

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

**Start Here:**
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

---

*For historical details and session notes, see Git commit history.*
