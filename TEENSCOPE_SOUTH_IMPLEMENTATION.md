# Teenscope South Implementation Guide

## Overview
Teenscope South is a clinical site specialization for adolescent psychiatry at Huntsman Mental Health Institute. This implementation adds support for:
- Comprehensive Psychiatric Diagnostic Evaluation (Intake)
- Daily Progress Notes (Follow-up)
- Optional collateral transcript integration for parent/guardian conversations

## Features Implemented

### 1. Collateral Transcript Support
- **Optional field** that only appears when "Teenscope South" is selected
- Supports parent/guardian conversations separate from patient interview
- Automatically integrates into the "Per Collateral" section of the HPI
- Provides placeholder text when collateral is unavailable

### 2. Template Structure

#### Intake Note
- Comprehensive psychiatric evaluation format
- Includes sections for:
  - Chief Complaint
  - History of Present Illness (with "Patient Interview" and "Per Collateral" subsections)
  - Psychiatric Review of Symptoms (detailed)
  - Past Psychiatric History
  - Substance Use History
  - Social History
  - Development History
  - Family Psychiatric History
  - Mental Status Examination
  - Risk Assessment
  - Initial Formulation
  - Treatment Plan

#### Follow-up Note
- Daily progress note format
- Includes sections for:
  - Interval History (with collateral information if available)
  - Review of Systems
  - Psychiatric Examination
  - Risk Assessment
  - Formulation and Treatment Plan
  - Teenscope Medications

## Setup Instructions

### 1. Run Database Migration
```sql
-- In Supabase Dashboard > SQL Editor, run:
-- File: supabase/migrations/011_add_teenscope_south.sql
```

### 2. Start Development Server
```bash
pnpm dev
# Server will start on http://localhost:3002
```

### 3. Access Workflow
1. Navigate to `/workflow`
2. Sign in with Google OAuth
3. Select "Teenscope South" from the Setting dropdown
4. Choose "Intake" or "Follow-up" as Visit Type

## Using the Collateral Transcript Feature

### With Collateral Available
1. Paste the patient interview transcript in the main "Transcript" field
2. Paste the parent/guardian conversation in the "Collateral Transcript" field
3. The AI will incorporate collateral information into the "Per Collateral" section of the HPI
4. Information will be synthesized to include:
   - Parent observations about behavior at home
   - Guardian concerns about treatment
   - Family perspectives on symptoms

### Without Collateral Available
1. Leave the "Collateral Transcript" field empty
2. The note will automatically include:
   ```
   "I attempted to reach [relationship], patient's [parent/guardian], to obtain collateral
   information, but they were unavailable. Will attempt to reach later this week."
   ```

## Technical Implementation Details

### Files Modified
- `packages/types/src/index.ts` - Added Teenscope South to settings, added collateralTranscript field
- `apps/web/src/components/workflow/GenerateInputStep.tsx` - Added collateral UI field
- `apps/web/src/components/workflow/WorkflowWizard.tsx` - Updated to pass collateralTranscript
- `apps/web/app/api/generate/route.ts` - Added collateralTranscript handling
- `services/note/src/prompts/prompt-builder.ts` - Added collateral prompt logic
- `apps/web/app/api/prompts/preview/route.ts` - Added collateral to preview

### Database Migration
- `supabase/migrations/011_add_teenscope_south.sql` - Adds both templates to database

### Key Features
1. **Conditional UI**: Collateral field only shows for Teenscope South
2. **Smart Placeholders**: Automatic text when collateral unavailable
3. **Word Count**: Displays word count for collateral transcript
4. **Prompt Integration**: Special instructions for handling collateral in AI prompt

## Testing Checklist
- [ ] Database migration applied successfully
- [ ] "Teenscope South" appears in Setting dropdown
- [ ] Collateral transcript field appears only for Teenscope South
- [ ] Word count updates for collateral transcript
- [ ] Placeholder message shows when collateral field is empty
- [ ] Note generates with collateral information in correct section
- [ ] Note generates with placeholder text when collateral unavailable
- [ ] Both Intake and Follow-up templates work correctly

## Notes for Production
1. Ensure database migration is run in production Supabase
2. Test with real adolescent psychiatry transcripts
3. Verify HIPAA compliance for collateral information handling
4. Consider adding validation for relationship type in placeholder text

## Future Enhancements
- Auto-detection of relationship from collateral transcript
- Separate sections for multiple collateral sources
- Template customization for different collateral types
- Integration with calendar for collateral call scheduling