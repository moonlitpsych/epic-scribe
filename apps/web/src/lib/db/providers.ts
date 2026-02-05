/**
 * Provider Database Operations
 *
 * Functions for looking up providers and their IntakeQ credentials.
 * Links NextAuth users to moonlit-scheduler providers.
 */

import { getSupabaseClient } from '../supabase';

// ============================================================
// Types
// ============================================================

export interface Provider {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  role: string | null;
  intakeq_practitioner_id: string | null;
}

export interface EpicScribeUserProvider {
  id: string;
  nextauth_user_email: string;
  provider_id: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderIntakeQCredentials {
  id: string;
  provider_id: string;
  login_email: string;
  login_password: string;
  default_template_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderWithCredentials extends Provider {
  intakeq_credentials: ProviderIntakeQCredentials | null;
  is_admin: boolean;
}

// ============================================================
// Provider Lookup
// ============================================================

/**
 * Get provider by NextAuth user email
 * Returns the provider linked to this user, or null if not linked
 */
export async function getProviderByEmail(email: string): Promise<ProviderWithCredentials | null> {
  const supabase = getSupabaseClient(true);

  // First, look up the user-provider link
  const { data: userProvider, error: linkError } = await supabase
    .from('epic_scribe_user_providers')
    .select('provider_id, is_admin')
    .eq('nextauth_user_email', email)
    .single();

  if (linkError || !userProvider) {
    // User not linked to any provider
    console.log(`[Providers] No provider link for email: ${email}`);
    return null;
  }

  // Get the provider details
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('id, first_name, last_name, email, title, role, intakeq_practitioner_id')
    .eq('id', userProvider.provider_id)
    .single();

  if (providerError || !provider) {
    console.error('[Providers] Error fetching provider:', providerError);
    return null;
  }

  // Get IntakeQ credentials if they exist
  const { data: credentials } = await supabase
    .from('provider_intakeq_credentials')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .single();

  return {
    ...provider,
    intakeq_credentials: credentials || null,
    is_admin: userProvider.is_admin,
  };
}

/**
 * Get provider by ID
 */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('providers')
    .select('id, first_name, last_name, email, title, role, intakeq_practitioner_id')
    .eq('id', providerId)
    .single();

  if (error) {
    console.error('[Providers] Error fetching provider by ID:', error);
    return null;
  }

  return data;
}

// ============================================================
// IntakeQ Credentials
// ============================================================

/**
 * Get IntakeQ credentials for a provider
 */
export async function getProviderIntakeQCredentials(
  providerId: string
): Promise<ProviderIntakeQCredentials | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('provider_intakeq_credentials')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .single();

  if (error) {
    // No credentials found is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Providers] Error fetching IntakeQ credentials:', error);
    return null;
  }

  return data;
}

/**
 * Save or update IntakeQ credentials for a provider
 */
export async function upsertProviderIntakeQCredentials(
  providerId: string,
  credentials: {
    login_email: string;
    login_password: string;
    default_template_name?: string;
  }
): Promise<ProviderIntakeQCredentials> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('provider_intakeq_credentials')
    .upsert({
      provider_id: providerId,
      login_email: credentials.login_email,
      login_password: credentials.login_password,
      default_template_name: credentials.default_template_name || null,
      is_active: true,
    }, {
      onConflict: 'provider_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[Providers] Error upserting IntakeQ credentials:', error);
    throw new Error('Failed to save IntakeQ credentials');
  }

  return data;
}

// ============================================================
// User-Provider Links
// ============================================================

/**
 * Link a NextAuth user to a provider
 */
export async function linkUserToProvider(
  email: string,
  providerId: string,
  isAdmin = false
): Promise<EpicScribeUserProvider> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('epic_scribe_user_providers')
    .upsert({
      nextauth_user_email: email,
      provider_id: providerId,
      is_admin: isAdmin,
    }, {
      onConflict: 'nextauth_user_email',
    })
    .select()
    .single();

  if (error) {
    console.error('[Providers] Error linking user to provider:', error);
    throw new Error('Failed to link user to provider');
  }

  return data;
}

/**
 * Get all linked users for admin view
 */
export async function getAllLinkedUsers(): Promise<Array<EpicScribeUserProvider & { provider: Provider }>> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('epic_scribe_user_providers')
    .select(`
      *,
      provider:providers(id, first_name, last_name, email, title, role, intakeq_practitioner_id)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Providers] Error fetching linked users:', error);
    throw new Error('Failed to fetch linked users');
  }

  // Type assertion since Supabase doesn't know about our join
  return data as Array<EpicScribeUserProvider & { provider: Provider }>;
}

/**
 * Get all providers (for admin dropdown)
 */
export async function getAllProviders(): Promise<Provider[]> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('providers')
    .select('id, first_name, last_name, email, title, role, intakeq_practitioner_id')
    .order('last_name', { ascending: true });

  if (error) {
    console.error('[Providers] Error fetching all providers:', error);
    throw new Error('Failed to fetch providers');
  }

  return data;
}
