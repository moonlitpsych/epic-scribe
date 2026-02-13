/**
 * GET /api/companion/sync - Hydrate companion on load
 * PATCH /api/companion/sync - Companion pushes prior note
 *
 * Auth: Bearer device token (companion side)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractDeviceToken,
  getSessionByDeviceToken,
  updateSyncSessionPriorNote,
} from '@/lib/db/sync-sessions';

export async function GET(request: NextRequest) {
  try {
    const token = extractDeviceToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Missing device token' }, { status: 401 });
    }

    const session = await getSessionByDeviceToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      sessionId: session.id,
      isPaired: session.is_paired,
      patientContext: session.patient_context,
      priorNoteContent: session.prior_note_content,
      priorNoteUpdatedAt: session.prior_note_updated_at,
      generatedNoteContent: session.generated_note_content,
      generatedNoteUpdatedAt: session.generated_note_updated_at,
      status: session.status,
    });
  } catch (error) {
    console.error('[Companion/Sync GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractDeviceToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Missing device token' }, { status: 401 });
    }

    const session = await getSessionByDeviceToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body = await request.json();
    const { priorNoteContent } = body;

    if (typeof priorNoteContent !== 'string') {
      return NextResponse.json({ error: 'priorNoteContent is required' }, { status: 400 });
    }

    const updated = await updateSyncSessionPriorNote(token, priorNoteContent);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update prior note' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      priorNoteUpdatedAt: updated.prior_note_updated_at,
    });
  } catch (error) {
    console.error('[Companion/Sync PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update prior note' },
      { status: 500 }
    );
  }
}
