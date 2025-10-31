# Google Service Account Setup for Epic Scribe

**Purpose:** Configure a service account to create all Google Calendar events and Meet links under `hello@trymoonlit.com` for HIPAA compliance.

---

## Prerequisites

- Google Workspace Admin access for `trymoonlit.com` domain
- Access to [Google Cloud Console](https://console.cloud.google.com)
- Project with Calendar API and Google Meet API enabled

---

## Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your existing project (or create new one for Epic Scribe)
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **+ CREATE SERVICE ACCOUNT**
5. Fill in details:
   - **Service account name:** `epic-scribe-calendar-service`
   - **Service account ID:** `epic-scribe-calendar-service` (auto-generated)
   - **Description:** "Service account for creating patient encounters in hello@trymoonlit.com calendar"
6. Click **CREATE AND CONTINUE**
7. Skip "Grant this service account access to project" (click **CONTINUE**)
8. Skip "Grant users access to this service account" (click **DONE**)

---

## Step 2: Create Service Account Key

1. In the Service Accounts list, click on `epic-scribe-calendar-service@[PROJECT-ID].iam.gserviceaccount.com`
2. Go to **Keys** tab
3. Click **ADD KEY** → **Create new key**
4. Select **JSON** format
5. Click **CREATE**
6. Save the downloaded JSON file securely (e.g., `service-account-key.json`)

**⚠️ Security Warning:** This key provides full access to the service account. Never commit it to git!

---

## Step 3: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google Calendar API**
   - **Google Meet API** (may be auto-enabled with Calendar)

---

## Step 4: Configure Domain-Wide Delegation

This allows the service account to act on behalf of `hello@trymoonlit.com` to create calendar events.

### 4a. Enable Domain-Wide Delegation for Service Account

1. Go back to **IAM & Admin** → **Service Accounts**
2. Click on `epic-scribe-calendar-service@[PROJECT-ID].iam.gserviceaccount.com`
3. Click **SHOW ADVANCED SETTINGS** (or go to **Details** tab)
4. Under "Domain-wide delegation", click **ENABLE DOMAIN-WIDE DELEGATION**
5. Click **SAVE**
6. Copy the **OAuth2 Client ID** (a long numeric string like `112233445566778899000`)

### 4b. Authorize Service Account in Google Workspace Admin

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Security** → **Access and data control** → **API Controls**
3. Click **MANAGE DOMAIN-WIDE DELEGATION**
4. Click **Add new**
5. Fill in:
   - **Client ID:** Paste the OAuth2 Client ID from step 4a
   - **OAuth Scopes:**
     ```
     https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/calendar.events
     ```
   - **Authorized:** (leave checked)
6. Click **AUTHORIZE**

---

## Step 5: Grant Service Account Access to hello@trymoonlit.com Calendar

### Option A: Share Calendar with Service Account (Recommended)

1. Open [Google Calendar](https://calendar.google.com) as `hello@trymoonlit.com`
2. Go to **Settings** → **Settings for my calendars** → Select primary calendar
3. Scroll to **Share with specific people or groups**
4. Click **+ Add people and groups**
5. Enter: `epic-scribe-calendar-service@[PROJECT-ID].iam.gserviceaccount.com`
6. Set permission: **Make changes to events**
7. Click **Send**

### Option B: Use Service Account's Own Calendar (Alternative)

If you want events in a dedicated calendar:
1. Create a new calendar in `hello@trymoonlit.com` account (e.g., "Patient Encounters")
2. Share with service account (same as Option A)
3. Update code to use this calendar ID instead of 'primary'

---

## Step 6: Add Service Account Key to Environment Variables

### For Local Development

1. Open `apps/web/.env.local`
2. Add the following variable with the **entire JSON key as a string**:

```bash
# Google Service Account (for HIPAA-compliant Meet hosting)
# Copy the entire contents of the service-account-key.json file here
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"epic-scribe-calendar-service@[PROJECT-ID].iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# Email address to impersonate for calendar operations
GOOGLE_SERVICE_ACCOUNT_SUBJECT=hello@trymoonlit.com
```

**Note:** The entire JSON must be on one line. Escape quotes if needed, or use single quotes around the value.

### For Production (Vercel)

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `GOOGLE_SERVICE_ACCOUNT_KEY` with the JSON content
3. Add `GOOGLE_SERVICE_ACCOUNT_SUBJECT` with value `hello@trymoonlit.com`
4. Select all environments (Production, Preview, Development)
5. Click **Save**

---

## Step 7: Verify Setup

Once environment variables are configured:

1. Restart your development server: `pnpm dev`
2. Go to `/workflow`
3. Select a patient and create a new encounter
4. Verify:
   - Calendar event appears in `hello@trymoonlit.com` calendar
   - Meet link is owned by `hello@trymoonlit.com`
   - Event shows service account as creator

---

## Troubleshooting

### Error: "Error creating calendar event"

**Cause:** Service account doesn't have calendar access

**Fix:**
- Verify domain-wide delegation is enabled (Step 4)
- Verify calendar is shared with service account (Step 5)
- Check OAuth scopes are correct

### Error: "Invalid credentials"

**Cause:** Malformed JSON key in environment variable

**Fix:**
- Verify JSON key is valid by pasting into [JSONLint](https://jsonlint.com)
- Ensure no line breaks in the environment variable
- Use single quotes around the entire JSON string

### Error: "Request had insufficient authentication scopes"

**Cause:** Missing OAuth scopes in domain-wide delegation

**Fix:**
- Go to Google Workspace Admin → API Controls → Domain-wide Delegation
- Verify scopes include both calendar scopes from Step 4b

---

## Security Best Practices

1. **Never commit service account key to git**
   - Add to `.gitignore`: `service-account-key.json`
   - Use environment variables only

2. **Rotate keys periodically**
   - Create new key every 90 days
   - Delete old keys after rotation

3. **Limit service account permissions**
   - Only grant calendar access, nothing more
   - Use "Make changes to events" permission, not "Make changes and manage sharing"

4. **Monitor usage**
   - Check Google Workspace Admin logs for service account activity
   - Set up alerts for unusual calendar API usage

---

## Next Steps

After completing this setup:
- Environment variables will be loaded by the app
- `google-calendar.ts` will use service account authentication
- All encounters will be created under `hello@trymoonlit.com`
- Meet recordings will be HIPAA-compliant (stored in Workspace account)
