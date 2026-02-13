/**
 * POST /api/companion/verify - Verify a pairing code and issue device token
 *
 * Auth: None (companion side - no Google OAuth needed)
 * Body: { code: string }
 * Returns device token for future companion API calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPairingCode } from '@/lib/db/sync-sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Pairing code is required' }, { status: 400 });
    }

    const result = await verifyPairingCode(code.trim());

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired pairing code' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      deviceToken: result.deviceToken,
      sessionId: result.session.id,
      paired: true,
    });
  } catch (error) {
    console.error('[Companion/Verify] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify pairing code' },
      { status: 500 }
    );
  }
}
