/**
 * GET /api/companion/session/batch - List batch queue items for user's active sync session
 *
 * Auth: NextAuth (laptop side)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getActiveSessionForUser } from '@/lib/db/sync-sessions';
import { getBatchItems } from '@/lib/db/batch-queue';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncSession = await getActiveSessionForUser(session.user.email);

    if (!syncSession || !syncSession.is_paired) {
      return NextResponse.json({ error: 'No paired session' }, { status: 404 });
    }

    const items = await getBatchItems(syncSession.id);

    return NextResponse.json({ items, syncSessionId: syncSession.id });
  } catch (error) {
    console.error('[Companion/Session/Batch GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch batch items' },
      { status: 500 }
    );
  }
}
