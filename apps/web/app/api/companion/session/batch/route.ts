/**
 * GET /api/companion/session/batch - List batch queue items for user's active sync session
 *
 * Auth: NextAuth (laptop side)
 */

import { NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getActiveSessionForUser } from '@/lib/db/sync-sessions';
import { getBatchItems } from '@/lib/db/batch-queue';

export async function GET() {
  try {
    const ps = await requireProviderSession();

    const syncSession = await getActiveSessionForUser(ps.email);

    if (!syncSession || !syncSession.is_paired) {
      return NextResponse.json({ error: 'No paired session' }, { status: 404 });
    }

    const items = await getBatchItems(syncSession.id);

    return NextResponse.json({ items, syncSessionId: syncSession.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[Companion/Session/Batch GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch batch items' },
      { status: 500 }
    );
  }
}
