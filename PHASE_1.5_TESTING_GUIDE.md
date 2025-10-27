# Phase 1.5 Testing Guide - Patient Management & Database

## ✅ Pre-Test Checklist

Before testing, verify:
- [x] Supabase migration applied (tables: patients, encounters, generated_notes)
- [x] All code changes committed/saved
- [ ] Dev server running (`pnpm dev` in project root)
- [ ] Signed in with Google OAuth

---

## Test Suite 1: Patient Management

### Test 1.1: Create Patient via Patients Page
**Steps:**
1. Navigate to http://localhost:3000/patients
2. Click "Add Patient" button
3. Fill in form:
   - First Name: "John"
   - Last Name: "Doe"
   - Date of Birth: "1990-01-15"
   - MRN: "MRN123456" (optional)
4. Click "Add Patient"

**Expected Results:**
- ✅ Patient created successfully
- ✅ Patient appears in table with correct info
- ✅ Age calculated correctly (34 years old in 2024)
- ✅ Status shows "Active"

### Test 1.2: Search Patients
**Steps:**
1. In search bar, type "Doe"
2. Press "Search"

**Expected Results:**
- ✅ Only patients with "Doe" in name shown
- ✅ Click "Clear" returns all patients

### Test 1.3: Verify Patient in Supabase
**Steps:**
1. Go to Supabase Dashboard → Table Editor
2. Open "patients" table
3. Find John Doe record

**Expected Results:**
- ✅ Patient exists in database
- ✅ All fields populated correctly
- ✅ `created_at` and `updated_at` timestamps present

---

## Test Suite 2: Encounter Creation with Patient Linking

### Test 2.1: Create Encounter with Existing Patient
**Steps:**
1. Navigate to http://localhost:3000/encounters
2. Click "New Encounter"
3. In patient dropdown:
   - Type "Doe" in search
   - Select "Doe, John (1/15/1990)"
4. Select Setting: "HMHI Downtown RCC"
5. Select Visit Type: "Intake"
6. Pick tomorrow's date and time (e.g., 2:00 PM)
7. Duration: 50 minutes
8. Click "Create Encounter"

**Expected Results:**
- ✅ Encounter created successfully
- ✅ Modal closes
- ✅ Encounter appears in upcoming encounters list
- ✅ Patient name shows as "Doe, John"

### Test 2.2: Create Encounter with Inline Patient Creation
**Steps:**
1. Click "New Encounter" again
2. Click "+ Or add new patient"
3. Fill inline form:
   - First Name: "Jane"
   - Last Name: "Smith"
   - Date of Birth: "1985-05-20"
4. Click "Create & Select Patient"
5. Wait for confirmation
6. Fill encounter details (setting, visit type, date/time)
7. Click "Create Encounter"

**Expected Results:**
- ✅ Patient created inline
- ✅ Patient auto-selected in dropdown
- ✅ Encounter created with Jane Smith
- ✅ Both records in database

### Test 2.3: Verify Encounter in Supabase
**Steps:**
1. Go to Supabase Dashboard → Table Editor
2. Open "encounters" table
3. Find the two created encounters

**Expected Results:**
- ✅ Both encounters exist
- ✅ `patient_id` correctly linked to patient records
- ✅ `calendar_event_id` populated
- ✅ `meet_link` present (Google Meet URL)
- ✅ `status` = "scheduled"
- ✅ `scheduled_start` and `scheduled_end` correct

### Test 2.4: Verify in Google Calendar
**Steps:**
1. Open Google Calendar (calendar.google.com)
2. Find the created encounters

**Expected Results:**
- ✅ Events exist in Calendar
- ✅ Title format: "Doe, John — HMHI Downtown RCC — Intake"
- ✅ Google Meet link attached

---

## Test Suite 3: Delete Encounter (Dual Sync)

### Test 3.1: Delete Encounter from UI
**Steps:**
1. In encounters list, click "Delete" on one encounter
2. Confirm deletion in modal

**Expected Results:**
- ✅ Encounter removed from UI immediately
- ✅ Event deleted from Google Calendar
- ✅ Record deleted from Supabase `encounters` table
- ✅ Patient record remains (not deleted)

### Test 3.2: Verify Deletion Sync
**Steps:**
1. Refresh encounters page
2. Check Supabase Table Editor
3. Check Google Calendar

**Expected Results:**
- ✅ Encounter not in any location
- ✅ Patient still exists in database

---

## Test Suite 4: Data Enrichment (GET Endpoint)

### Test 4.1: Verify Enriched Encounter Data
**Steps:**
1. Open browser DevTools → Network tab
2. Refresh encounters page
3. Find GET request to `/api/encounters`
4. Inspect response JSON

**Expected Results:**
```json
{
  "encounters": [
    {
      "id": "calendar_event_id",
      "summary": "Doe, John — HMHI Downtown RCC — Intake",
      "patient": "Doe, John",
      "setting": "HMHI Downtown RCC",
      "visitType": "Intake",
      "meetLink": "https://meet.google.com/...",
      "patientId": "uuid-from-supabase",
      "patientFirstName": "John",
      "patientLastName": "Doe",
      "patientDOB": "1990-01-15",
      "dbStatus": "scheduled"
    }
  ]
}
```

- ✅ Calendar data present
- ✅ Supabase patient data merged
- ✅ `patientId`, `patientFirstName`, etc. populated

---

## Test Suite 5: Error Handling

### Test 5.1: Create Encounter Without Patient
**Steps:**
1. Click "New Encounter"
2. Leave patient dropdown empty
3. Fill other fields
4. Click "Create Encounter"

**Expected Results:**
- ✅ Alert: "Please select a patient"
- ✅ Form not submitted

### Test 5.2: Create Encounter with Invalid Patient ID
**Steps:**
1. Open DevTools → Console
2. Run:
```javascript
fetch('/api/encounters', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    patientId: 'invalid-uuid',
    setting: 'HMHI Downtown RCC',
    visitType: 'Intake',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString()
  })
}).then(r => r.json()).then(console.log)
```

**Expected Results:**
- ✅ Response: `{ "error": "Patient not found" }`
- ✅ Status: 404

---

## Test Suite 6: Backward Compatibility

### Test 6.1: Legacy Calendar Events
**Steps:**
1. Manually create event in Google Calendar:
   - Title: "Test, Legacy — HMHI Downtown RCC — Intake"
   - Add Google Meet
   - Schedule for tomorrow
2. Refresh encounters page

**Expected Results:**
- ✅ Legacy event appears in list
- ✅ No crash or error
- ✅ Patient name parsed from title
- ✅ `patientId` fields null (not in DB)

---

## Success Criteria Summary

Phase 1.5 is **COMPLETE** when:

### Database Integration:
- [x] All 3 tables created in Supabase
- [ ] Patients CRUD working
- [ ] Encounters sync to DB on create
- [ ] Encounters deleted from both sources

### UI Functionality:
- [ ] Patients page loads and shows data
- [ ] Add patient modal works
- [ ] Search patients works
- [ ] Encounter modal shows patient dropdown
- [ ] Inline patient creation works
- [ ] Delete encounter with confirmation

### Data Integrity:
- [ ] Patient → Encounter foreign key enforced
- [ ] No orphaned records
- [ ] Calendar and DB stay in sync
- [ ] Legacy events still work

### No Regressions:
- [ ] Existing note generation still works
- [ ] Google Meet links still created
- [ ] Transcript fetching unchanged

---

## Troubleshooting

### "Patient not found" error
- Check Supabase RLS policies are disabled or allow access
- Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### Encounters not syncing to DB
- Check browser console for errors
- Verify API endpoint responses
- Check Supabase logs in dashboard

### Can't create patient
- Check form validation
- Verify API route is accessible
- Check Supabase connection

---

## Next Steps After Testing

Once all tests pass:
1. Create a few test patients
2. Create a few test encounters
3. Try generating a note from an encounter
4. Verify the full workflow works end-to-end

**Ready for Production Use** when:
- All test suites pass ✅
- No console errors
- Data persists correctly
- Note generation works with new flow
