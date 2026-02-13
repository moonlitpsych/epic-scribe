/**
 * PATCH /api/companion/session/sync - Laptop pushes generated note + patient context
 *
 * Auth: NextAuth (laptop side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import {
  getActiveSessionForUser,
  updateSyncSessionGeneratedNote,
  updateSyncSessionPatientContext,
  PatientContext,
} from '@/lib/db/sync-sessions';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncSession = await getActiveSessionForUser(session.user.email);

    if (!syncSession || !syncSession.is_paired) {
      return NextResponse.json({ error: 'No paired session' }, { status: 404 });
    }

    const body = await request.json();
    const { generatedNote, patientContext } = body as {
      generatedNote?: string;
      patientContext?: PatientContext;
    };

    if (generatedNote !== undefined) {
      await updateSyncSessionGeneratedNote(syncSession.id, generatedNote);
    }

    if (patientContext !== undefined) {
      await updateSyncSessionPatientContext(syncSession.id, patientContext);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Companion/Session/Sync PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync' },
      { status: 500 }
    );
  }
}
