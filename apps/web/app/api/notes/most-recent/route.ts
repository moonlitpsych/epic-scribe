/**
 * GET /api/notes/most-recent?patientId=xxx - Get the most recent finalized note for a patient
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getMostRecentFinalizedNote } from '@/lib/db/notes';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId parameter is required' },
        { status: 400 }
      );
    }

    const note = await getMostRecentFinalizedNote(patientId);

    if (!note) {
      return NextResponse.json({ found: false });
    }

    const encounters = (note as any).encounters;

    return NextResponse.json({
      found: true,
      note: {
        id: note.id,
        finalNoteContent: note.final_note_content,
        finalizedAt: note.finalized_at,
        setting: encounters?.setting || null,
        visitType: encounters?.visit_type || null,
        encounterDate: encounters?.scheduled_start || null,
      },
    });
  } catch (error) {
    console.error('Error fetching most recent note:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch most recent note',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
