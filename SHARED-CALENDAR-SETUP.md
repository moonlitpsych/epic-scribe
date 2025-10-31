# Shared Calendar Setup for HIPAA-Compliant Meet Hosting

**Simple alternative to service account keys - uses Google Calendar sharing instead!**

---

## ✅ **Benefits of This Approach**

- ✅ No service account JSON keys required
- ✅ No complex Google Cloud permissions
- ✅ Meet links hosted by hello@trymoonlit.com (HIPAA-compliant)
- ✅ All recordings/transcripts in Workspace Drive
- ✅ Uses existing OAuth authentication
- ✅ Easier to manage and share with team

---

## 📋 **Setup Steps**

### **Step 1: Create Shared Calendar**

1. Sign in to **Google Calendar** as `hello@trymoonlit.com`
   - URL: https://calendar.google.com

2. **Create new calendar:**
   - Left sidebar: click **+ next to "Other calendars"**
   - Select **"Create new calendar"**

3. **Configure calendar:**
   - **Name:** `Epic Scribe - Patient Encounters`
   - **Description:** `Shared calendar for all patient clinical encounters and Google Meet sessions`
   - Click **"Create calendar"**

---

### **Step 2: Get Calendar ID**

1. Find your new calendar in the left sidebar under **"My calendars"**

2. Click the **three dots (⋮)** next to it → **"Settings and sharing"**

3. Scroll down to **"Integrate calendar"** section

4. **Copy the Calendar ID**
   - Format: `abc123xyz@group.calendar.google.com`
   - Example: `c_1234567890abcdef@group.calendar.google.com`

---

### **Step 3: Share with Team (Optional)**

Still in calendar settings:

1. Go to **"Share with specific people or groups"**

2. Click **"+ Add people and groups"**

3. Add each doctor's email address

4. Set permission: **"Make changes to events"**
   - This allows them to create/edit encounters

5. Click **"Send"**

6. Repeat for all team members

---

### **Step 4: Add Calendar ID to Environment Variables**

#### **Local Development:**

1. Open `apps/web/.env.local`

2. Add this line (replace with your actual calendar ID):
   ```bash
   SHARED_CALENDAR_ID=c_1234567890abcdef@group.calendar.google.com
   ```

3. Save the file

4. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   pnpm dev
   ```

#### **Production (Vercel):**

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add new variable:
   - **Key:** `SHARED_CALENDAR_ID`
   - **Value:** `c_1234567890abcdef@group.calendar.google.com`
   - **Environments:** Production, Preview, Development

3. Click **"Save"**

4. **Redeploy** your app for changes to take effect

---

## 🧪 **Testing**

### **Test 1: Create an Encounter**

1. Go to `http://localhost:3002/workflow`
2. Sign in with Google
3. Select a patient
4. Click **"Schedule New Encounter & Meet"**
5. Fill in the form and submit

### **Test 2: Verify Meet Link Owner**

1. Check the **shared calendar** in Google Calendar (as hello@trymoonlit.com)
2. You should see the new encounter event
3. Click on the event
4. The Meet link should be present
5. **Verify:** The event is in the shared calendar (not doctor's personal calendar)

### **Test 3: Check Meet Recording Location**

1. Join the Meet link
2. Start recording (if you have permission)
3. After stopping, verify recording goes to **hello@trymoonlit.com's Drive**

---

## 🔍 **Troubleshooting**

### **Problem: "Permission denied" when creating encounter**

**Solution:** Make sure:
1. The authenticated user has access to the shared calendar
2. Permission is set to "Make changes to events" (not just "See all event details")
3. The calendar ID in `.env.local` is correct

### **Problem: Events appear in doctor's personal calendar**

**Solution:**
1. Check `SHARED_CALENDAR_ID` is set correctly in environment variables
2. Restart dev server after changing `.env.local`
3. If empty, it defaults to `'primary'` (user's personal calendar)

### **Problem: Calendar ID not found**

**Solution:**
1. Verify the calendar ID format: `xxx@group.calendar.google.com`
2. Make sure it's a shared calendar, not a personal calendar
3. Check that hello@trymoonlit.com owns the calendar

### **Problem: Meet link not created**

**Solution:**
1. Ensure Google Workspace has Meet enabled
2. Check that calendar allows Meet integration
3. Verify OAuth scopes include calendar permissions

---

## 📊 **How It Works**

### **Before (Service Account - Complex):**
```
User signs in → Service account creates event → Event in service account calendar
                ↓
        Requires: JSON keys, domain delegation, complex permissions
```

### **After (Shared Calendar - Simple):**
```
User signs in → OAuth token used → Event created in shared calendar
                ↓
        Shared calendar owned by hello@trymoonlit.com
        ↓
        Meet link hosted by hello@trymoonlit.com ✅
```

---

## 🎉 **You're Done!**

Once `SHARED_CALENDAR_ID` is set:
- All new encounters will be created in the shared calendar
- All Meet links will be hosted by hello@trymoonlit.com
- All recordings will be HIPAA-compliant
- No service account setup required!

---

## 📝 **Notes**

- **Backwards Compatible:** If `SHARED_CALENDAR_ID` is not set, it falls back to user's primary calendar
- **Team Visibility:** Everyone with calendar access can see all encounters
- **Centralized Management:** Easy to audit and manage all patient encounters
- **Simpler Permissions:** No organization policies or IAM roles to configure

---

*For questions or issues, see CLAUDE.md or check the codebase documentation.*
