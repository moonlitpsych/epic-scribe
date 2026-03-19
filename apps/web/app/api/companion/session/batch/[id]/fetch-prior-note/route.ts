/**
 * POST /api/companion/session/batch/[id]/fetch-prior-note - Auto-fetch prior note for a batch item
 *
 * For Moonlit Psychiatry patients with email: fetches from IntakeQ API
 * For other settings: fetches most recent from prior_notes table (clipboard imports)
 *
 * Auth: NextAuth (laptop side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getActiveSessionForUser } from '@/lib/db/sync-sessions';
import { updateBatchItemPriorNote, getBatchItems } from '@/lib/db/batch-queue';
import { getPatientById } from '@/lib/db/patients';
import { getMostRecentPriorNote } from '@/lib/db/prior-notes';

export async function POST(
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

    // Find this item in the queue
    const items = await getBatchItems(syncSession.id);
    const item = items.find((i) => i.id === id);

    if (!item) {
      return NextResponse.json({ error: 'Item not found in queue' }, { status: 404 });
    }

    // Get full patient record
    const patient = await getPatientById(item.patient_id, ps.providerId);

    // Moonlit Psychiatry + patient has email -> fetch from IntakeQ
    if (item.setting === 'Moonlit Psychiatry' && patient.email) {
      const apiKey = process.env.INTAKEQ_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          reason: 'not_configured',
          message: 'IntakeQ API key not configured',
        });
      }

      // Dynamic import to avoid loading IntakeQ client when not needed
      const { IntakeQApiClient, formatIntakeQNoteForEpicScribe } = await import(
        '@epic-scribe/intakeq-api'
      );

      const client = new IntakeQApiClient({ apiKey });
      const intakeQClient = await client.getClientByEmail(patient.email);

      if (!intakeQClient) {
        return NextResponse.json({
          success: false,
          reason: 'patient_not_found',
          message: 'Patient not found in IntakeQ',
        });
      }

      const note = await client.getMostRecentLockedNote(intakeQClient.ClientId);

      if (!note) {
        return NextResponse.json({
          success: false,
          reason: 'no_notes',
          message: 'No prior notes found in IntakeQ',
        });
      }

      const formattedNote = formatIntakeQNoteForEpicScribe(note);

      const updated = await updateBatchItemPriorNote(
        id,
        syncSession.id,
        formattedNote,
        'intakeq'
      );

      return NextResponse.json({
        success: true,
        source: 'intakeq',
        item: updated,
      });
    }

    // Other settings -> fetch from prior_notes table (clipboard imports)
    const priorNote = await getMostRecentPriorNote(item.patient_id);

    if (!priorNote) {
      return NextResponse.json({
        success: false,
        reason: 'no_notes',
        message: 'No imported prior notes found for this patient',
      });
    }

    const updated = await updateBatchItemPriorNote(
      id,
      syncSession.id,
      priorNote.note_content,
      'clipboard_import'
    );

    return NextResponse.json({
      success: true,
      source: 'clipboard_import',
      item: updated,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[Session/Batch FetchPriorNote] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prior note' },
      { status: 500 }
    );
  }
}
