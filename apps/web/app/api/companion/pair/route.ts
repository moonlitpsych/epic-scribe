/**
 * POST /api/companion/pair - Generate a pairing code for companion device
 *
 * Auth: NextAuth (laptop side)
 * Returns a 6-digit pairing code valid for 10 minutes.
 */

import { NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { createSyncSession } from '@/lib/db/sync-sessions';

export async function POST() {
  try {
    const ps = await requireProviderSession();

    const { session: syncSession, pairingCode } = await createSyncSession(ps.email);

    return NextResponse.json({
      sessionId: syncSession.id,
      pairingCode,
      expiresAt: syncSession.pairing_code_expires_at,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);

    console.error('[Companion/Pair] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pairing code' },
      { status: 500 }
    );
  }
}
