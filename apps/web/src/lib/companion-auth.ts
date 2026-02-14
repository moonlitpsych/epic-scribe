/**
 * Companion Auth Helper
 *
 * Shared device token validation for all companion API routes.
 * Extracts and validates the Bearer token, returns the active sync session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractDeviceToken, getSessionByDeviceToken, SyncSession } from './db/sync-sessions';

export async function authenticateCompanion(request: NextRequest): Promise<
  | { session: SyncSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  const token = extractDeviceToken(request);

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing device token' }, { status: 401 }) };
  }

  const session = await getSessionByDeviceToken(token);

  if (!session) {
    return { error: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }) };
  }

  return { session };
}
