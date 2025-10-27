# Google OAuth Setup Guide

**Time to complete:** 10-15 minutes

## Step 1: Create/Select a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Either:
   - Create a new project (recommended): Click "New Project" → Name it "Epic Scribe" → Create
   - Or select an existing project from the dropdown

## Step 2: Enable Required APIs

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for and **Enable** each of these APIs:
   - ✅ **Google Calendar API**
   - ✅ **Google Drive API**
   - ✅ **Google Meet API** (if available, otherwise Calendar API covers Meet links)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Workspace)
3. Fill in the required fields:
   - **App name:** Epic Scribe
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **Save and Continue**
5. On the **Scopes** page:
   - Click **Add or Remove Scopes**
   - Search for and add these scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.readonly`
   - Click **Update** then **Save and Continue**
6. On **Test users** page:
   - Click **Add Users**
   - Add your Google Workspace email
   - Click **Save and Continue**
7. Review and click **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select Application type: **Web application**
4. Name it: `Epic Scribe Web`
5. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:3002
   ```
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3002/api/auth/callback/google
   ```
7. Click **Create**
8. 🎉 **Save these values** - You'll see a popup with:
   - **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abc123...`)

## Step 5: Update Your .env.local File

1. Open `/Users/macsweeney/Projects/epic-scribe/apps/web/.env.local`
2. Add or update these lines:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here

# NextAuth
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=u3oos3sePic9cxqa8dMCr4slZ6suaQPLmp/C6Mvnzf8=

# Gemini API (existing)
GEMINI_API_KEY=your-existing-key
```

3. Generate a NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

4. Save the file

## Step 6: Test the Integration

1. Restart your dev server (if running)
2. Navigate to: http://localhost:3002/auth/signin
3. Click "Sign in with Google"
4. You should see the Google OAuth consent screen
5. Grant the requested permissions
6. You'll be redirected back to the app! 🎉

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Double-check the redirect URI in GCP matches exactly: `http://localhost:3002/api/auth/callback/google`
- Make sure NEXTAUTH_URL in .env.local matches: `http://localhost:3002`

### "Access blocked: This app's request is invalid"
- Make sure all required APIs are enabled in GCP
- Verify OAuth consent screen is configured
- Add yourself as a test user

### "Missing refresh token"
- This is handled automatically by our code with `access_type: 'offline'` and `prompt: 'consent'`
- If you see this, try signing out and signing in again

## Production Setup (Later)

When you're ready to deploy:

1. Add production URL to authorized origins and redirect URIs:
   - `https://your-production-domain.com`
   - `https://your-production-domain.com/api/auth/callback/google`

2. Submit app for verification (if needed for non-test users)

3. Update .env for production with production NEXTAUTH_URL

---

**Need help?** Check the [NextAuth.js docs](https://next-auth.js.org/providers/google) or [Google OAuth docs](https://developers.google.com/identity/protocols/oauth2)
