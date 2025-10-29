# Transfer OAuth to trymoonlit.com Workspace

This guide explains how to transfer OAuth from rufussweeneymd.com to trymoonlit.com workspace.

## Prerequisites

- Admin access to trymoonlit.com Google Workspace
- Access to Google Cloud Console
- Local development environment set up

## Step 1: Create a New GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your **trymoonlit.com** Google Workspace account
3. Click "New Project"
4. Name it: `Epic Scribe Moonlit`
5. Organization: Select `trymoonlit.com` (if available)
6. Click "Create"

## Step 2: Enable Required APIs

In the new project, enable these APIs:
1. Go to **APIs & Services** → **Library**
2. Search and enable each:
   - ✅ Google Calendar API
   - ✅ Google Drive API
   - ✅ Google Meet API (if available)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (for Google Workspace users only)
   - This allows all trymoonlit.com users to use the app without approval
3. Fill in:
   - **App name:** Epic Scribe
   - **User support email:** Your trymoonlit.com email
   - **App logo:** (optional)
   - **App domain:** trymoonlit.com
   - **Developer contact:** Your trymoonlit.com email
4. Click **Save and Continue**
5. **Scopes** page - Add these scopes:
   ```
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/drive.readonly
   ```
6. **Save and Continue** through the rest

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Epic Scribe Web`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:3002
   https://epic-scribe.vercel.app
   https://epic.trymoonlit.com
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:3002/api/auth/callback/google
   https://epic-scribe.vercel.app/api/auth/callback/google
   https://epic.trymoonlit.com/api/auth/callback/google
   ```
7. Click **Create**
8. **SAVE THESE VALUES:**
   - Client ID
   - Client Secret

## Step 5: Update Environment Variables

### For Local Development

Update `/Users/macsweeney/Projects/epic-scribe/.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-new-moonlit-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-new-moonlit-secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### For Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Epic Scribe project
3. Go to **Settings** → **Environment Variables**
4. Update/Add:
   - `GOOGLE_CLIENT_ID`: Your new Moonlit client ID
   - `GOOGLE_CLIENT_SECRET`: Your new Moonlit secret
   - `NEXTAUTH_URL`: `https://epic-scribe.vercel.app` (or your custom domain)
   - `NEXTAUTH_SECRET`: Generate a secure random string

## Step 6: Test the Migration

### Local Testing
```bash
# From project root
cd apps/web
pnpm dev
```

1. Navigate to http://localhost:3002/auth/signin
2. Click "Sign in with Google"
3. You should see the trymoonlit.com consent screen
4. Sign in with a trymoonlit.com account
5. Verify access to Calendar and Drive

### Production Testing
After deploying to Vercel:
1. Visit your production URL
2. Sign in with Google
3. Verify you can:
   - Access Google Calendar events
   - Create new calendar events
   - Access Google Drive files
   - Generate Meet links

## Benefits of Moving to trymoonlit.com

1. **Internal OAuth App**: No need for verification process
2. **All Workspace Users**: Automatic access for all trymoonlit.com users
3. **Better Security**: Internal apps have more trusted status
4. **Workspace Integration**: Better integration with Workspace features
5. **Admin Control**: Workspace admins can manage app access

## Rollback Plan

If you need to switch back to rufussweeneymd.com:
1. Keep the old OAuth credentials saved securely
2. Update the environment variables back to the original values
3. Restart the application

## Troubleshooting

### "Access blocked" Error
- Ensure you're signed in with a trymoonlit.com account
- Check that the OAuth consent screen is set to "Internal"
- Verify all required APIs are enabled

### "redirect_uri_mismatch" Error
- Double-check all redirect URIs match exactly
- Ensure no trailing slashes
- Verify NEXTAUTH_URL matches the domain

### Missing Permissions
- Re-authenticate to get fresh tokens
- Check that all scopes are added in consent screen
- Verify user has access to Calendar and Drive in Workspace

## Notes

- The migration doesn't affect existing data in Supabase
- User sessions will need to be re-established
- Existing calendar events and Drive files remain accessible
- Consider informing users about the re-authentication requirement

## Production Domains

When you set up a custom domain (e.g., epic.trymoonlit.com):
1. Add it to the OAuth redirect URIs in Google Cloud Console
2. Update NEXTAUTH_URL in Vercel environment variables
3. Configure DNS to point to Vercel