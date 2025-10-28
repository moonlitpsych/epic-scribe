# Supabase Setup Guide

This guide will help you set up Supabase for the Epic Scribe application to enable durable storage for templates, SmartLists, patients, and encounters.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js and pnpm installed
3. The Epic Scribe repository cloned locally

## Setup Steps

### 1. Create a New Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Name your project (e.g., "epic-scribe")
4. Set a strong database password (save this securely!)
5. Choose a region close to you
6. Click "Create new project"

### 2. Run the Database Migration

Once your project is created:

1. Go to the SQL Editor in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `/supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

You should see success messages for all table creations.

### 3. Get Your API Keys

1. In your Supabase project, go to Settings → API
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon/Public Key** (safe for browser use)
   - **Service Role Key** (keep this secret! Server-side only)

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local` in the `/apps/web` directory:
   ```bash
   cp .env.example apps/web/.env.local
   ```

2. Add your Supabase credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### 5. Initialize Data (Optional)

If you have existing SmartLists and templates in your JSON files, you can migrate them to Supabase:

```bash
# Run the migration script (coming soon)
pnpm migrate:data
```

### 6. Test the Connection

1. Restart your development server:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. Open your browser console and check for any Supabase connection errors

3. Test saving a SmartList or template edit - it should now persist even after server restart!

## Database Schema Overview

The migration creates the following tables:

### Core Tables
- **patients**: Patient demographics (PHI - handle with care)
- **encounters**: Appointment/visit metadata
- **templates**: Epic note templates for each setting/visit type
- **smartlists**: Epic SmartList definitions and options
- **generated_notes**: Metadata for generated notes

### Supporting Tables
- **smartlist_values**: Track SmartList usage patterns
- **template_edits**: Audit trail for template changes

## Security Notes

1. **PHI Storage**: Patient names and DOB are stored in Supabase. Ensure you:
   - Use strong passwords
   - Enable 2FA on your Supabase account
   - Never commit `.env.local` files
   - Consider encryption at rest (Supabase Pro feature)

2. **Transcripts & Notes**: These remain in Google Drive for additional security

3. **Row Level Security (RLS)**: Currently configured for single-user access. For multi-user, update the RLS policies.

## Troubleshooting

### "Missing Supabase environment variables" Error
- Ensure all three Supabase environment variables are set in `.env.local`
- Restart your Next.js dev server after adding them

### Tables Not Found
- Make sure you ran the SQL migration successfully
- Check the Table Editor in Supabase to confirm tables exist

### Connection Refused
- Verify your Project URL is correct
- Check if your project is paused (Supabase pauses inactive free projects after 1 week)

### Authentication Issues
- The current setup uses anonymous auth
- For production, implement proper authentication with Supabase Auth

## Next Steps

After setup:
1. Test creating and editing templates - they should persist!
2. Test SmartList management - all changes are saved
3. Create patients and encounters
4. Generate notes with full persistence

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Review the browser console for errors
3. Ensure your environment variables are correctly set
4. Verify the migration ran successfully

## Production Considerations

Before going to production:
1. Enable point-in-time recovery
2. Set up regular backups
3. Implement proper user authentication
4. Review and tighten RLS policies
5. Consider upgrading to Supabase Pro for:
   - No project pausing
   - Better performance
   - Encryption at rest
   - Priority support