import { getSupabaseClient } from '../supabase';

/**
 * Persist the Google refresh token for a provider.
 * Used for server-side calendar access (e.g., public booking pages).
 */
export async function storeProviderRefreshToken(
  providerId: string,
  refreshToken: string
): Promise<void> {
  const supabase = getSupabaseClient(true);

  const { error } = await (supabase as any)
    .from('es_providers')
    .update({ google_refresh_token: refreshToken })
    .eq('id', providerId);

  if (error) {
    console.error('[Auth] Failed to store refresh token:', error);
  }
}
