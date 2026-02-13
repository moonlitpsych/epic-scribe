/**
 * POST /api/companion/pair - Generate a pairing code for companion device
 *
 * Auth: NextAuth (laptop side)
 * Returns a 6-digit pairing code valid for 10 minutes.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createSyncSession } from '@/lib/db/sync-sessions';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session: syncSession, pairingCode } = await createSyncSession(session.user.email);

    return NextResponse.json({
      sessionId: syncSession.id,
      pairingCode,
      expiresAt: syncSession.pairing_code_expires_at,
    });
  } catch (error) {
    console.error('[Companion/Pair] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pairing code' },
      { status: 500 }
    );
  }
}
