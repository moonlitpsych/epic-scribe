# Google OAuth Setup - External App Configuration

**Updated for Google Cloud Console 2024/2025**

## Internal vs External OAuth Apps

### When to use **Internal** (Google Workspace only):
- You have a Google Workspace domain (e.g., @trymoonlit.com)
- Only users from your domain will use the app
- No verification needed
- No user limits

### When to use **External** (Your current setup):
- You don't have Google Workspace OR
- You want external collaborators to access the app
- Personal Gmail accounts (@gmail.com) need access
- You're developing/testing with multiple accounts

## External App Configuration (Recommended for your case)

### Step 1: OAuth Consent Screen Configuration

Since you're using **External**, here's the proper configuration:

1. Go to **APIs & Services** → **OAuth consent screen**
2. Keep **User Type: External** selected
3. Click **Edit App** (if already created) or fill in:

#### App Information:
- **App name:** Epic Scribe
- **User support email:** Your email
- **App logo:** (optional, 120x120px max)

#### App Domain (optional but recommended):
- **Application home page:** `https://epic-scribe.vercel.app` (or your domain)
- **Application privacy policy:** Can leave blank for testing
- **Application terms of service:** Can leave blank for testing

#### Developer contact information:
- **Email addresses:** Your email (required)

4. Click **Save and Continue**

### Step 2: Scopes Configuration

Add these scopes (click **Add or Remove Scopes**):

```
✅ .../auth/userinfo.email (automatically added)
✅ .../auth/userinfo.profile (automatically added)
✅ .../auth/calendar
✅ .../auth/calendar.events
✅ .../auth/drive.file
✅ .../auth/drive.readonly
```

**Note:** These are "sensitive" scopes, which means:
- In testing mode: Works fine with test users
- For production: Would require Google verification (but not needed for your use)

Click **Update** → **Save and Continue**

### Step 3: Test Users (IMPORTANT for External Apps)

Since you're using External type, you MUST add test users:

1. Click **Add Users**
2. Add ALL email addresses that will use the app:
   - Your personal Gmail
   - rufussweeneymd@gmail.com (if different)
   - Any collaborator emails
   - Maximum 100 test users allowed

3. Click **Add** → **Save and Continue**

**⚠️ Critical:** Only emails listed here can sign in while in testing mode!

### Step 4: Publishing Status

For your use case, keep the app in **Testing** mode:

- ✅ **Testing mode benefits:**
  - No verification required
  - Up to 100 test users
  - All OAuth features work
  - No quotas or restrictions for test users
  - Perfect for internal tools and small teams

- ❌ **Don't publish to production unless:**
  - You need more than 100 users
  - You're making it publicly available
  - You want to remove the "unverified app" warning

## OAuth Credentials (Already configured)

Your credentials are already set up correctly:
- Client ID: `[YOUR_EPIC_SCRIBE_CLIENT_ID].apps.googleusercontent.com`
- Client Secret: `GOCSPX-[YOUR_CLIENT_SECRET]`

### Verify Authorized URIs:

Go to **APIs & Services** → **Credentials** → Click your OAuth 2.0 Client ID

**Authorized JavaScript origins:**
```
http://localhost:3002
http://localhost:3000
https://epic-scribe.vercel.app
https://your-custom-domain.com (if applicable)
```

**Authorized redirect URIs:**
```
http://localhost:3002/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
https://epic-scribe.vercel.app/api/auth/callback/google
https://your-custom-domain.com/api/auth/callback/google (if applicable)
```

## Testing Your Setup

### Local Development:
```bash
cd /Users/macsweeney/Projects/epic-scribe/apps/web
pnpm dev
```

1. Navigate to http://localhost:3002/auth/signin
2. Click "Sign in with Google"
3. You'll see a warning screen (normal for external apps in testing):
   - "Google hasn't verified this app"
   - Click **Continue** (appears after clicking Advanced)
4. Grant the requested permissions
5. You should be redirected back successfully!

### Production (Vercel):
Same process, but use your production URL.

## Common Issues & Solutions

### "Access blocked: Authorization Error"
**Solution:** Make sure the signing-in email is added as a test user

### "Google hasn't verified this app" warning
**This is normal for External apps in testing mode.** Your test users can safely click "Continue" to proceed. The warning appears because:
- External apps show this until verified
- Verification is only needed for public production apps
- Your test users expect this and can proceed safely

### "Redirect URI mismatch"
**Solution:**
1. Check exact URL in browser error
2. Add it exactly as shown to Authorized redirect URIs
3. Wait 5-10 minutes for changes to propagate

### "403: access_denied"
**Solution:** The user is not in your test users list. Add them!

## Moving to Production (Future)

If you eventually need more than 100 users:

1. **Prepare for verification:**
   - Need a privacy policy URL
   - Need terms of service URL
   - Domain verification required
   - Prepare justification for each OAuth scope

2. **Submit for verification:**
   - Click "Publish App" in OAuth consent screen
   - Submit verification request
   - Google review takes 3-5 business days
   - May require security assessment for sensitive scopes

3. **Alternative: Stay in testing**
   - Most internal tools never need verification
   - 100 test users is usually sufficient
   - All features work identically
   - Just has the "unverified app" warning

## Your Current Status

✅ **You're all set!** With your External app in testing mode:
- Up to 100 specific users can access it
- All OAuth features work perfectly
- No verification needed
- Perfect for your Epic Scribe use case

The External + Testing configuration is ideal because:
1. You can use personal Gmail accounts
2. You can add collaborators easily
3. No domain restrictions
4. No complex verification process
5. Fully functional for your team's needs

## Next Steps

1. Add all team members as test users in Google Cloud Console
2. Test sign-in locally
3. Deploy to Vercel and test production sign-in
4. Share with your test users (they'll need to accept the "unverified app" screen once)

Remember: The "unverified app" warning is cosmetic for test users - it doesn't affect functionality!