# Next Session Quick Setup Guide

## Current Status
Database foundation is complete but RLS is blocking data migration.

## Immediate Steps to Continue

### 1. Fix RLS Permissions (5 minutes)
```sql
-- Go to Supabase Dashboard > SQL Editor
-- Run this to disable RLS temporarily:

ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE encounters DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE smartlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE smartlist_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_edits DISABLE ROW LEVEL SECURITY;
```

### 2. Run Data Migration (2 minutes)
```bash
# Start the dev server if not running
cd apps/web
npm run dev

# In another terminal, run migration
curl http://localhost:3002/api/migrate
```

### 3. Verify Migration Success
- Check Supabase Dashboard > Table Editor
- Should see data in `smartlists` and `templates` tables

### 4. Test Persistence
- Go to http://localhost:3002/templates
- Edit a template section
- Refresh page - changes should persist
- Go to http://localhost:3002/smartlists
- Add/edit a SmartList
- Refresh page - changes should persist

## What's Working
- ✅ Google Calendar/Meet/Drive integration
- ✅ Encounter creation and management
- ✅ Note generation with v2 safety features
- ✅ Moonlit design system applied
- ✅ Database schema and services ready
- ⏳ Just needs RLS fix to activate persistence

## Next Major Tasks
1. Patient management system (UI to add/edit patients)
2. Link encounters to patients (dropdown in encounter modal)
3. Delete encounter functionality
4. Encounter history by patient

## Files Created This Session
- `/apps/web/src/lib/supabase.ts` - Database client
- `/apps/web/src/lib/database.types.ts` - TypeScript types
- `/apps/web/src/lib/db/smartlists.ts` - SmartList service
- `/apps/web/src/lib/db/templates.ts` - Template service
- `/apps/web/app/api/migrate/route.ts` - Migration endpoint
- `/apps/web/app/api/templates/route.ts` - Template API
- `/supabase/migrations/002_disable_rls_dev.sql` - RLS fix

## Testing URLs
- http://localhost:3002 - Main app
- http://localhost:3002/encounters - Create/manage encounters
- http://localhost:3002/generate - Generate notes
- http://localhost:3002/templates - Edit templates
- http://localhost:3002/smartlists - Manage SmartLists
- http://localhost:3002/api/migrate - Run migration (after RLS fix)