/**
 * PATCH /api/companion/session/sync - Laptop pushes generated note + patient context
 *
 * Auth: NextAuth (laptop side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import {
  getActiveSessionForUser,
  updateSyncSessionGeneratedNote,
  updateSyncSessionPatientContext,
  PatientContext,
} from '@/lib/db/sync-sessions';

export async function PATCH(request: NextRequest) {
  try {
    const ps = await requireProviderSession();

    const syncSession = await getActiveSessionForUser(ps.email);

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
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);

    console.error('[Companion/Session/Sync PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync' },
      { status: 500 }
    );
  }
}
