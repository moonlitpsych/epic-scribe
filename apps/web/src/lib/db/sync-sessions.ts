/**
 * Sync Sessions Database Operations
 *
 * CRUD operations for the sync_sessions table.
 * Enables cross-device note syncing between laptop (Epic Scribe) and work desktop (Companion Portal).
 */

import { randomUUID } from 'crypto';
import { getSupabaseClient } from '../supabase';

export interface SyncSession {
  id: string;
  user_email: string;
  pairing_code: string;
  pairing_code_expires_at: string;
  device_token: string | null;
  is_paired: boolean;
  prior_note_content: string | null;
  prior_note_updated_at: string | null;
  generated_note_content: string | null;
  generated_note_updated_at: string | null;
  patient_context: PatientContext | null;
  status: 'active' | 'expired' | 'revoked';
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface PatientContext {
  firstName?: string;
  lastName?: string;
  setting?: string;
  visitType?: string;
  status?: string;
}

/**
 * Generate a random 6-digit pairing code
 */
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Extract device token from Authorization header
 */
export function extractDeviceToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Create a new sync session for a user.
 * Expires any existing active sessions for that user first.
 */
export async function createSyncSession(userEmail: string): Promise<{
  session: SyncSession;
  pairingCode: string;
}> {
  const supabase = getSupabaseClient(true);

  // Expire existing active sessions for this user
  await supabase
    .from('sync_sessions')
    .update({ status: 'expired' })
    .eq('user_email', userEmail)
    .eq('status', 'active');

  const pairingCode = generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const { data, error } = await supabase
    .from('sync_sessions')
    .insert({
      user_email: userEmail,
      pairing_code: pairingCode,
      pairing_code_expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating sync session:', error);
    throw new Error('Failed to create sync session');
  }

  return {
    session: data as SyncSession,
    pairingCode,
  };
}

/**
 * Verify a pairing code and issue a device token.
 * Returns null if code is invalid, expired, or already used.
 */
export async function verifyPairingCode(code: string): Promise<{
  session: SyncSession;
  deviceToken: string;
} | null> {
  const supabase = getSupabaseClient(true);

  // Find matching active, unpaired session with valid code
  const { data: session, error } = await supabase
    .from('sync_sessions')
    .select('*')
    .eq('pairing_code', code)
    .eq('is_paired', false)
    .eq('status', 'active')
    .gt('pairing_code_expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    return null;
  }

  // Issue device token and mark as paired
  const deviceToken = randomUUID();

  const { data: updated, error: updateError } = await supabase
    .from('sync_sessions')
    .update({
      device_token: deviceToken,
      is_paired: true,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error pairing sync session:', updateError);
    throw new Error('Failed to pair device');
  }

  return {
    session: updated as SyncSession,
    deviceToken,
  };
}

/**
 * Get a session by device token (for companion API auth).
 * Also updates last_activity_at.
 */
export async function getSessionByDeviceToken(token: string): Promise<SyncSession | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('sync_sessions')
    .select('*')
    .eq('device_token', token)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  // Update last_activity_at (fire and forget)
  supabase
    .from('sync_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', data.id)
    .then();

  return data as SyncSession;
}

/**
 * Get the active sync session for a user (laptop side).
 */
export async function getActiveSessionForUser(email: string): Promise<SyncSession | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('sync_sessions')
    .select('*')
    .eq('user_email', email)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching sync session:', error);
    return null;
  }

  return data as SyncSession;
}

/**
 * Companion writes prior note content to sync session.
 */
export async function updateSyncSessionPriorNote(
  deviceToken: string,
  content: string
): Promise<SyncSession | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('sync_sessions')
    .update({
      prior_note_content: content,
      prior_note_updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('device_token', deviceToken)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    console.error('Error updating prior note:', error);
    return null;
  }

  return data as SyncSession;
}

/**
 * Laptop writes generated note to sync session.
 */
export async function updateSyncSessionGeneratedNote(
  sessionId: string,
  content: string
): Promise<SyncSession | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('sync_sessions')
    .update({
      generated_note_content: content,
      generated_note_updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    console.error('Error updating generated note:', error);
    return null;
  }

  return data as SyncSession;
}

/**
 * Laptop updates patient context on sync session.
 */
export async function updateSyncSessionPatientContext(
  sessionId: string,
  context: PatientContext
): Promise<SyncSession | null> {
  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('sync_sessions')
    .update({
      patient_context: context,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    console.error('Error updating patient context:', error);
    return null;
  }

  return data as SyncSession;
}

/**
 * Revoke a sync session (disconnect device).
 */
export async function revokeSession(
  sessionId: string,
  userEmail: string
): Promise<boolean> {
  const supabase = getSupabaseClient(true);

  const { error } = await supabase
    .from('sync_sessions')
    .update({ status: 'revoked' })
    .eq('id', sessionId)
    .eq('user_email', userEmail);

  if (error) {
    console.error('Error revoking sync session:', error);
    return false;
  }

  return true;
}
