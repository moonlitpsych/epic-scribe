# Testing Guide - SmartList Integration

## Quick Start

The development server is now running at: **http://localhost:3003**

## What Was Fixed

The SmartList integration issue has been **completely resolved**. Previously, Gemini was inventing values like `{Mood:304120108:: "Blunted"}` because it never received the valid options. Now, the system includes a comprehensive SmartList definitions section in every prompt.

### Key Fixes Applied

1. ✅ Added 8 missing SmartLists to catalog (now 25 total)
2. ✅ Fixed Map key mismatch in SmartListService
3. ✅ Verified both config file locations are synchronized
4. ✅ Created integration test to verify the fix

## Testing Steps

### 1. Basic Functionality Test

1. Navigate to **http://localhost:3003**
2. Go to the **Generator** page
3. Select:
   - **Setting:** "HMHI Downtown RCC"
   - **Visit Type:** "Intake"
4. Paste this test transcript:

```
Patient is a 35-year-old presenting for initial psychiatric evaluation.
Chief complaint: "I've been feeling really down lately."

The patient reports depressed mood for the past 3 months. Sleep has been poor with difficulty falling asleep. Appetite is decreased. Energy level is low. Concentration is impaired. Anxiety is moderate.

Past psychiatric history includes one hospitalization in 2020 for major depression. Patient reports one suicide attempt in 2019 by overdose. Currently not taking any medications.

Mental status exam: Patient appears stated age, casually dressed. Cooperative, good eye contact. Speech normal rate and tone. Mood described as "depressed", affect congruent. Thought process linear and goal-directed. No psychosis. Denies current suicidal or homicidal ideation. Insight fair, judgment fair.

Impression: Major Depressive Disorder, moderate severity. Risk level is low. Prognosis is good with treatment.

Plan: Start sertraline 50mg daily. Refer for CBT. Follow-up in 2-3 weeks. Safety planning reviewed.
```

### 2. Preview the Prompt (Recommended)

**Before generating**, click **"Preview Prompt"** to verify:

✅ Section should appear: `=== SMARTLIST DEFINITIONS ===`
✅ Should contain 12 SmartList definitions
✅ Each SmartList should list allowed values
✅ Total SmartList definitions: ~3,973 characters

Example of what you should see:

```
=== SMARTLIST DEFINITIONS ===

SmartList: BH Hospitalizations (Epic ID: 304120103)
Allowed values:
  - "None" [DEFAULT]
  - "1 hospitalization"
  - "2 hospitalizations"
  - "3+ hospitalizations"
  - "Details in note"

[... 11 more SmartLists ...]
```

### 3. Generate the Note

Click **"Generate Note"** and wait for completion.

### 4. Validation Checks

In the generated note, look for SmartList selections like:

```
{BH Hospitalizations:304120103:: "1 hospitalization"}
{Suicide History:304120104:: "1 attempt"}
{Sleep Quality:304120106:: "Poor quality"}
{Mood:304120108:: "Depressed"}
{Risk Level:304120111:: "Low"}
{Prognosis:304120112:: "Good with treatment"}
```

### Expected Results ✅

- All SmartList values should be from the valid options
- No invented values like "Blunted" (not in catalog)
- Validation section should show no errors
- Each SmartList should have the format: `{Display:EpicID:: "valid value"}`

### Expected Failures ❌

If you see:
- `{Mood:304120108:: "Blunted"}` → FAIL (not a valid option)
- `{Mood:304120108:: "Slightly elevated"}` → FAIL (not in catalog)
- Empty SmartList definitions in preview → FAIL (service not loading)

## Server Logs to Monitor

When you generate a note, check the terminal/console for these logs:

```
✅ Loaded 25 SmartLists from config
✅ [PromptBuilder] Found SmartList: BH Hospitalizations (304120103)
✅ [PromptBuilder] Extracted 12 SmartList identifiers
✅ [SmartListService] Generated 12/12 SmartList definition sections
✅ [Generate] SmartList definitions length: 3973 chars
```

### Red Flags 🚩

Watch for these warning signs:
- "Loaded 4 SmartLists" (should be 25)
- "WARNING: SmartList not found in catalog"
- "Generated 0/12 SmartList definition sections"
- "SmartList definitions length: 0 chars"

## Advanced Testing

### Test Different Visit Types

1. **Follow-up Visit:**
   - Requires a previous note (paste any prior note text)
   - Should still include SmartList definitions

2. **Transfer of Care:**
   - Also requires previous note
   - Verify SmartLists still work correctly

### Test SmartList Validation

Try to manually edit a generated note and insert an invalid value:

```
{Mood:304120108:: "Completely made up"}
```

Then check validation - it should flag this as invalid.

## Integration Test

Run the automated test:

```bash
cd /Users/macsweeney/Projects/epic-scribe
npx tsx test-smartlist-integration.ts
```

Expected output: `=== All Tests Passed ✓ ===`

## Troubleshooting

### Server Won't Start
```bash
# Kill any lingering processes
lsof -ti:3003 | xargs kill -9

# Restart
cd /Users/macsweeney/Projects/epic-scribe/apps/web
npm run dev
```

### SmartLists Still Not Working

1. Verify catalog file exists:
```bash
cat /Users/macsweeney/Projects/epic-scribe/apps/web/configs/smartlists-catalog.json | head -20
```

2. Check server loads catalog:
```bash
# Look for "Loaded 25 SmartLists" in server output
```

3. Run integration test:
```bash
npx tsx test-smartlist-integration.ts
```

### Invalid Values Still Appearing

If Gemini still generates invalid values:
1. Check the prompt preview - SmartList definitions MUST be present
2. Verify the catalog has the correct Epic IDs
3. Check logs for "WARNING: SmartList not found"

## Success Criteria

All of these should be true:

- [x] Server starts successfully
- [x] Can access generator at http://localhost:3003
- [x] Prompt preview shows SmartList definitions section
- [x] SmartList definitions section is ~3,973 characters
- [x] Generated notes use only valid SmartList values
- [x] Validation catches any invalid values
- [x] Integration test passes
- [x] Server logs show "Loaded 25 SmartLists"
- [x] Server logs show "Generated 12/12 SmartList definition sections"

## Files Reference

### Key Files Modified
- `/configs/smartlists-catalog.json` - Main catalog (25 SmartLists)
- `/apps/web/configs/smartlists-catalog.json` - Web app catalog (synchronized)
- `/services/note/src/smartlists/smartlist-service.ts:47` - Fixed Map key usage

### Test Files
- `/test-smartlist-integration.ts` - Automated integration test
- `/SMARTLIST-STATUS.md` - Detailed status report
- `/SMARTLIST-FIX-SUMMARY.md` - Original issue summary

## Need Help?

If you encounter issues:
1. Check server logs for errors
2. Run the integration test
3. Verify SmartList definitions appear in prompt preview
4. Check the SMARTLIST-STATUS.md file for detailed troubleshooting

---

**Server URL:** http://localhost:3003
**Test Command:** `npx tsx test-smartlist-integration.ts`
**Status:** ✅ Ready to test
