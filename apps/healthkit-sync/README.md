# HealthKit Sync — iOS App for Epic Scribe

Minimal iOS app that reads clinical records from Apple Health and syncs them to Epic Scribe.

## Prerequisites

- iPhone with Health Records connected (MyChart → Apple Health)
- Xcode 15+ on your Mac
- Apple Developer account (free account works for device testing)

## Xcode Setup (5 minutes)

1. **Create new Xcode project:**
   - File → New → Project
   - Choose **iOS → App**
   - Product Name: `HealthKitSync`
   - Team: Your Apple ID
   - Organization Identifier: `com.epicscribe`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Save anywhere temporarily

2. **Replace the generated Swift files** with the ones from this folder:
   - Delete the auto-generated `ContentView.swift` and `HealthKitSyncApp.swift`
   - Drag all `.swift` files from `HealthKitSync/` into the Xcode project navigator

3. **Add HealthKit capability:**
   - Select the project in the navigator
   - Select the **HealthKitSync** target
   - Go to **Signing & Capabilities** tab
   - Click **+ Capability** → search for **HealthKit**
   - Check **Clinical Health Records** under the HealthKit capability

4. **Add Info.plist keys:**
   - Go to the **Info** tab of the target
   - Add these keys:
     - `NSHealthShareUsageDescription` = "Epic Scribe needs access to your health records to include clinical data in generated notes."
     - `NSHealthClinicalHealthRecordsShareUsageDescription` = "Epic Scribe reads your clinical records (medications, conditions, labs) to enrich generated psychiatry notes."

5. **Build and run on your iPhone:**
   - Connect your iPhone via USB or use wireless debugging
   - Select your iPhone as the run destination
   - Click Run (⌘R)

## Usage

1. **Authorize** — Tap to grant HealthKit clinical record access
2. **Read Records** — Fetches all FHIR clinical records from Apple Health
3. **Review** — Check the data preview to see what was found
4. **Sync** — Enter a patient UUID from Epic Scribe and tap Sync

## Testing with Your Data

Since you (Dr. Sweeney) have MyChart connected to Apple Health for both U of U Health and UW Health:

1. Open the app on your iPhone
2. Authorize HealthKit access
3. Read Records — you should see your medications, conditions, labs, etc.
4. For the patient UUID, you can create a test patient in Epic Scribe or use your own record
5. After syncing, go to Epic Scribe workflow → select that patient → you should see the green "Health Records synced" badge

## Quick Test with Apple Health Export (no Xcode needed)

If you just want to validate the data pipeline:

```bash
# 1. On iPhone: Health → Profile → Export All Health Data → AirDrop to Mac
# 2. Unzip the export
unzip export.zip -d ~/Desktop/health-export

# 3. Run the parser script (dry run first to see what's there)
cd /path/to/epic-scribe
npx tsx scripts/parse-health-export.ts ~/Desktop/health-export <patient-uuid> --dry-run

# 4. If it looks good, run for real
HEALTHKIT_SYNC_API_KEY=0f72604d16001fe62ae158c0e5479556111199d7e138bf9eb61c4ea593994187 \
  npx tsx scripts/parse-health-export.ts ~/Desktop/health-export <patient-uuid>
```

## Files

| File | Purpose |
|------|---------|
| `HealthKitSyncApp.swift` | App entry point |
| `Config.swift` | API URL and key |
| `Models.swift` | Codable types matching Epic Scribe backend |
| `HealthKitManager.swift` | HealthKit auth + FHIR resource parsing |
| `APIClient.swift` | POST to Epic Scribe endpoint |
| `ContentView.swift` | SwiftUI interface |
