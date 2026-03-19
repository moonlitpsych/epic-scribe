/**
 * PATCH /api/companion/session/batch/[id] - Update batch item from laptop
 *
 * Used to: update transcript, change status, store generated note
 *
 * Auth: NextAuth (laptop side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getActiveSessionForUser } from '@/lib/db/sync-sessions';
import {
  updateBatchItemTranscript,
  updateBatchItemStatus,
  updateBatchItemGeneratedNote,
} from '@/lib/db/batch-queue';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();

    const syncSession = await getActiveSessionForUser(ps.email);

    if (!syncSession || !syncSession.is_paired) {
      return NextResponse.json({ error: 'No paired session' }, { status: 404 });
    }

    const { id } = params;
    const body = await request.json();
    const { transcript, status, generatedNoteContent, errorMessage } = body;

    // Update transcript
    if (transcript !== undefined) {
      const updated = await updateBatchItemTranscript(id, syncSession.id, transcript);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update transcript' }, { status: 500 });
      }
    }

    // Update status
    if (status !== undefined) {
      const updated = await updateBatchItemStatus(id, syncSession.id, status, errorMessage);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
      }
    }

    // Store generated note
    if (generatedNoteContent !== undefined) {
      const updated = await updateBatchItemGeneratedNote(
        id,
        syncSession.id,
        generatedNoteContent
      );
      if (!updated) {
        return NextResponse.json({ error: 'Failed to store generated note' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[Companion/Session/Batch PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update batch item' },
      { status: 500 }
    );
  }
}
