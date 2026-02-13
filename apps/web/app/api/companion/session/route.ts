/**
 * GET /api/companion/session - Check for active sync session (laptop side)
 * DELETE /api/companion/session - Revoke sync session (laptop side)
 *
 * Auth: NextAuth
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getActiveSessionForUser, revokeSession } from '@/lib/db/sync-sessions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncSession = await getActiveSessionForUser(session.user.email);

    if (!syncSession) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: syncSession.id,
        isPaired: syncSession.is_paired,
        priorNoteContent: syncSession.prior_note_content,
        priorNoteUpdatedAt: syncSession.prior_note_updated_at,
        generatedNoteContent: syncSession.generated_note_content,
        generatedNoteUpdatedAt: syncSession.generated_note_updated_at,
        patientContext: syncSession.patient_context,
        status: syncSession.status,
        lastActivityAt: syncSession.last_activity_at,
      },
    });
  } catch (error) {
    console.error('[Companion/Session GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncSession = await getActiveSessionForUser(session.user.email);

    if (!syncSession) {
      return NextResponse.json({ error: 'No active session' }, { status: 404 });
    }

    const revoked = await revokeSession(syncSession.id, session.user.email);

    if (!revoked) {
      return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Companion/Session DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
