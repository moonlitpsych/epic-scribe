/**
 * POST /api/notes - Save or finalize a generated note
 * GET /api/notes?patientId=xxx - Get all finalized notes for a patient
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import {
  saveGeneratedNote,
  getPatientFinalizedNotes,
  SaveNoteParams,
} from '@/lib/db/notes';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      encounterId,
      patientId,
      templateId,
      promptVersion,
      promptHash,
      generatedContent,
      finalNoteContent,
      isFinal,
    } = body;

    // Validation
    if (!templateId || !promptVersion || !promptHash || !generatedContent || !finalNoteContent) {
      return NextResponse.json(
        {
          error: 'Missing required fields: templateId, promptVersion, promptHash, generatedContent, finalNoteContent',
        },
        { status: 400 }
      );
    }

    if (!encounterId && !patientId) {
      return NextResponse.json(
        { error: 'Either encounterId or patientId is required' },
        { status: 400 }
      );
    }

    const params: SaveNoteParams = {
      encounterId: encounterId || '',
      patientId,
      templateId,
      promptVersion: String(promptVersion),
      promptHash,
      generatedContent,
      finalNoteContent,
      isFinal: isFinal || false,
      finalizedBy: session.user?.email || 'unknown',
    };

    const savedNote = await saveGeneratedNote(params);

    return NextResponse.json({ note: savedNote }, { status: 201 });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      {
        error: 'Failed to save note',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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

    const notes = await getPatientFinalizedNotes(patientId);

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch notes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
