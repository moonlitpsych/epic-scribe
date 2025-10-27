# SmartList Extraction Issue - Summary

## Problem
Generated notes were inventing SmartList values instead of selecting from the catalog's valid options.

Example:
- **Expected**: `{Mood:304120108:: "Depressed"}` (from catalog options)
- **Actual**: `{Mood:304120108:: "Blunted"}` (invented, not in catalog)

## Root Cause
The SmartList definitions were never being included in the prompt sent to Gemini, so the model had no knowledge of valid options.

## Issues Found & Fixed

### 1. Missing SmartLists in Catalog ✅ FIXED
**Problem**: Template referenced 12 SmartLists, but catalog only had 4.

**Solution**: Added 8 missing SmartLists to `/configs/smartlists-catalog.json`:
- BH Hospitalizations (304120103)
- Suicide History (304120104)
- Medication Compliance (304120105)
- Mood (304120108) - for Psychiatric ROS
- Risk Level (304120111)
- Prognosis (304120112)
- Therapy Referral (304120113)
- Follow-up Timeframe (304120114)

### 2. Wrong Config File Location ✅ FIXED
**Problem**: Updated catalog at `/configs/smartlists-catalog.json` but server loaded from `/apps/web/configs/smartlists-catalog.json`.

**Solution**: Copied updated catalog to correct location:
```bash
cp /configs/smartlists-catalog.json /apps/web/configs/smartlists-catalog.json
```

### 3. Map Key Mismatch ✅ FIXED
**Problem**: SmartListService Map was keyed by camelCase JSON keys (`bhHospitalizations`, `sleepQuality`) but lookups used identifier field values (`BH Hospitalizations`, `Sleep Quality`).

**Code Location**: `/services/note/src/smartlists/smartlist-service.ts` line 32-55

**Before**:
```typescript
Object.entries(catalog.smartLists).forEach(([key, list]: [string, any]) => {
  this.smartLists.set(key, { // ❌ Using camelCase key
    identifier: list.identifier || key,
    // ...
  });
});
```

**After**:
```typescript
Object.entries(catalog.smartLists).forEach(([key, list]: [string, any]) => {
  const smartList = {
    identifier: list.identifier || key,
    epicId: list.epicId,
    displayName: list.displayName,
    group: list.group,
    options: list.options,
  };
  this.smartLists.set(smartList.identifier, smartList); // ✅ Using identifier field
});
```

## Verification
Check server logs after next generation:
```
✅ Loaded 26 SmartLists from config (not 18)
✅ [PromptBuilder] Found SmartList: BH Hospitalizations (304120103) -> BH Hospitalizations (no WARNING)
✅ [PromptBuilder] Extracted 12 SmartList identifiers (not 4)
✅ [SmartListService] Generated 12/12 SmartList definition sections (not 0/12)
✅ [Generate] SmartList definitions length: >5000 chars (not 0)
```

## Expected Result
Gemini should now receive prompts containing:
```
=== SMARTLIST DEFINITIONS ===

SmartList: Mood (Epic ID: 304120108)
Allowed values:
  - "Euthymic"
  - "Depressed" [DEFAULT]
  - "Anxious"
  - "Irritable"
  - "Elevated"
  - "Angry"

When selecting a value, choose based on the transcript content.
Format: {Mood:304120108:: "selected value"}

---

[... 11 more SmartLists ...]

=== END SMARTLIST DEFINITIONS ===
```

## Next Steps
1. Generate a new note
2. Check server logs for verification criteria above
3. Verify generated SmartLists use only catalog values
4. Mark todo item #4 as completed
