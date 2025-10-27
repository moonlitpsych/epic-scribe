/**
 * Supabase Client Configuration
 *
 * Provides both client-side and server-side Supabase clients.
 *
 * IMPORTANT: No PHI is stored in Supabase - only metadata.
 * All clinical content (transcripts, notes) stays in Google Drive.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Client-side Supabase client (uses anon key with RLS)
 * Use this in client components and pages
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client (uses service role key, bypasses RLS)
 * Use this in API routes and server components for admin operations
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Helper to get the appropriate client based on context
 */
export function getSupabaseClient(useServiceRole = false) {
  if (useServiceRole) {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured');
    }
    return supabaseAdmin;
  }
  return supabase;
}
