# SmartList Plain Text Output - Fix Applied

**Date:** October 15, 2025
**Status:** ✅ FIXED - Ready to test

## Problem Statement

The AI was outputting SmartLists in Epic format:
```
Sleep: {Sleep Quality:304120106:: "Poor quality"}
Mood: {Mood:304120108:: "Anxious"}
```

But we wanted plain text output:
```
Sleep: Poor quality
Mood: Anxious
```

## Root Cause

The prompt instructions told the AI to "Preserve {Display:EpicID} format" which caused it to output the Epic SmartList syntax instead of just the selected value.

## Solution Applied

### 1. Updated Prompt Instructions (prompt-builder.ts:75-84)

**Before:**
```typescript
2. SMARTLISTS: Preserve {Display:EpicID} format and append :: "selected value"
   - Select ONLY from the provided option list for each SmartList
   - Example: {Sleep Quality:304120106:: "Poor"}
```

**After:**
```typescript
2. SMARTLISTS: Replace {Display:EpicID} with ONLY the selected value text
   - Where you see {Sleep Quality:304120106} in the template, output just the value like "Poor quality"
   - Where you see {Mood:304120108} in the template, output just the value like "Anxious"
   - Select ONLY from the provided option list for each SmartList
   - Example: Template has "{Sleep Quality:304120106}" → Output "Poor quality"
   - Example: Template has "{Mood:304120108}" → Output "Depressed"
   - DO NOT include the {Display:EpicID:: } wrapper in your output
   - Output plain text values only
```

### 2. Updated SmartList Export Format (smartlist-service.ts:224-254)

Enhanced the SmartList definitions section to make it crystal clear:

**Before:**
```
SmartList: Mood (Epic ID: 304120108)
Allowed values:
  - "Euthymic"
  - "Depressed" [DEFAULT]
  ...
Format: {Mood:304120108:: "selected value"}
```

**After:**
```
SmartList: Mood (Epic ID: 304120108)
Template placeholder: {Mood:304120108}
Allowed values (output ONLY the value text, NOT the {placeholder} format):
  - "Euthymic"
  - "Depressed" [DEFAULT]
  ...

When you see {Mood:304120108} in the template:
  → Select the appropriate value based on the transcript
  → Output ONLY the value text (e.g., "Euthymic")
  → Do NOT include the {Display:EpicID} wrapper in your output
  → If unsure, prefer "Depressed"
```

## Expected Behavior

### Template Input
```
--- Psychiatric Review of Systems ---
Sleep: {Sleep Quality:304120106}
Appetite: {Appetite:304120107}
Mood: {Mood:304120108}
Anxiety: {Anxiety Level:304120109}
Concentration: {Concentration:304120110}
```

### AI Output (NEW - Correct)
```
--- Psychiatric Review of Systems ---
Sleep: Poor quality
Appetite: Decreased
Mood: Anxious
Anxiety: Moderate
Concentration: Poor
```

### What NOT to See Anymore
```
Sleep: {Sleep Quality:304120106:: "Poor quality"}  ← OLD, WRONG
```

## Testing Instructions

1. **Navigate to:** http://localhost:3002 (server restarted on new port)
2. **Go to Generator page**
3. **Select:** HMHI Downtown RCC / Intake
4. **Paste test transcript** (use sample data button)
5. **Click "Preview Prompt"** to verify instructions include:
   - "Replace {Display:EpicID} with ONLY the selected value text"
   - "DO NOT include the {Display:EpicID::} wrapper"
6. **Generate note**
7. **Verify output** shows plain text like "Poor quality", NOT `{Sleep Quality:304120106:: "Poor quality"}`

## Validation Points

### ✅ Success Criteria
- [ ] SmartList values appear as plain text (e.g., "Anxious")
- [ ] NO `{Display:EpicID:: "value"}` format in output
- [ ] Values are still selected from valid catalog options
- [ ] Preview shows updated instructions about plain text output

### ❌ Failure Indicators
- SmartLists still showing as `{Display:ID:: "value"}`
- Invalid values not from catalog
- Missing SmartList definitions in prompt preview

## Files Modified

| File | Lines Changed | Description |
|------|--------------|-------------|
| `/services/note/src/prompts/prompt-builder.ts` | 75-84 | Updated SMARTTOOLS INSTRUCTIONS rule #2 |
| `/services/note/src/smartlists/smartlist-service.ts` | 224-254 | Enhanced exportForPrompt() format |

## Technical Details

### How It Works Now

1. **Template** contains: `Sleep: {Sleep Quality:304120106}`
2. **PromptBuilder** extracts SmartList identifiers
3. **SmartListService** generates definitions with clear instructions:
   - Shows the template placeholder
   - Lists all valid options
   - Explicitly instructs to output plain text only
4. **AI receives** both the template AND clear instructions to replace with plain text
5. **AI outputs:** `Sleep: Poor quality` (no Epic format)

### Key Changes

The AI now understands:
- `{Display:EpicID}` in template = placeholder to replace
- Output = ONLY the selected value text
- NO wrapper format in final output

## Next Steps

1. Test with the sample transcript
2. Verify plain text output
3. Check that values are still from valid options
4. If successful, mark SmartList integration as COMPLETE

---

**Server URL:** http://localhost:3002
**Status:** Ready for testing
**Expected Result:** Plain text SmartList values in generated notes
