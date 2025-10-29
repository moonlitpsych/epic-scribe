# Quick Fix: Update OAuth Credentials

## Current Issue
The app is using credentials from "Dr. Rufus Admin" OAuth client, but you need to use "Epic Scribe" OAuth client.

## Steps:

1. **In Google Cloud Console, while viewing the Epic Scribe OAuth client:**
   - Copy the **Client ID** (should be different from `110169090317...`)
   - Copy the **Client Secret**

2. **Update `/apps/web/.env.local`:**
   Replace these lines:
   ```
   GOOGLE_CLIENT_ID=[OLD_CLIENT_ID_FROM_DR_RUFUS_ADMIN]
   GOOGLE_CLIENT_SECRET=[OLD_CLIENT_SECRET_FROM_DR_RUFUS_ADMIN]
   ```

   With the Epic Scribe credentials:
   ```
   GOOGLE_CLIENT_ID=[Your Epic Scribe Client ID]
   GOOGLE_CLIENT_SECRET=[Your Epic Scribe Client Secret]
   ```

3. **Save the file**

4. **Restart the server** (I'll do this for you)

5. **Try signing in again**

The "redirect_uri_mismatch" error will be fixed because you'll be using the OAuth client that actually has the correct redirect URIs configured!