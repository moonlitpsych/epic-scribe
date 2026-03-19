/**
 * Provider Lookup — Auto-provision es_providers rows on sign-in
 */

import { getSupabaseClient } from '../supabase';

export interface EsProvider {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
}

/**
 * Look up or auto-create an es_providers row for a given email.
 * Called during NextAuth JWT callback on initial sign-in.
 */
export async function getOrCreateProvider(
  email: string,
  displayName: string
): Promise<EsProvider> {
  const supabase = getSupabaseClient(true);

  // Try to find existing provider
  const { data: existing, error: lookupError } = await (supabase as any)
    .from('es_providers')
    .select('id, email, display_name, is_admin')
    .eq('email', email)
    .single();

  if (existing && !lookupError) {
    return existing as EsProvider;
  }

  // Auto-create for new users
  const { data: created, error: createError } = await (supabase as any)
    .from('es_providers')
    .insert({
      email,
      display_name: displayName || email.split('@')[0],
      is_admin: false,
    })
    .select('id, email, display_name, is_admin')
    .single();

  if (createError) {
    console.error('[ProviderLookup] Error creating provider:', createError);
    throw new Error('Failed to create provider account');
  }

  console.log('[ProviderLookup] Auto-provisioned provider:', created.id, 'for', email);
  return created as EsProvider;
}
