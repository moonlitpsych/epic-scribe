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
    console.log('[POST /api/notes] Request received');

    const session = await getServerSession(authOptions);

    if (!session) {
      console.warn('[POST /api/notes] Unauthorized: No session found');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be signed in to save notes. Please sign in and try again.',
        },
        { status: 401 }
      );
    }

    console.log('[POST /api/notes] Session verified:', session.user?.email);

    const body = await request.json();
    console.log('[POST /api/notes] Received fields:', Object.keys(body));

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
      console.error('[POST /api/notes] Validation failed:', {
        hasTemplateId: !!templateId,
        hasPromptVersion: !!promptVersion,
        hasPromptHash: !!promptHash,
        hasGeneratedContent: !!generatedContent,
        hasFinalNoteContent: !!finalNoteContent,
        receivedBody: Object.keys(body),
        templateId: templateId || 'MISSING',
        promptVersion: promptVersion || 'MISSING',
        promptHash: promptHash ? `${promptHash.substring(0, 8)}...` : 'MISSING',
        generatedContentLength: generatedContent?.length || 0,
        finalNoteContentLength: finalNoteContent?.length || 0,
      });
      return NextResponse.json(
        {
          error: 'Missing required fields: templateId, promptVersion, promptHash, generatedContent, finalNoteContent',
          missing: {
            templateId: !templateId,
            promptVersion: !promptVersion,
            promptHash: !promptHash,
            generatedContent: !generatedContent,
            finalNoteContent: !finalNoteContent,
          },
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
