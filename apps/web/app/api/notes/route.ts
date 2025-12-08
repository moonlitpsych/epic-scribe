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

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[POST /api/notes] Failed to parse request body:', parseError);
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Failed to parse request body',
        },
        { status: 400 }
      );
    }

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
      epicChartData,
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
      epicChartData: epicChartData || null, // Extracted questionnaire scores and medications
    };

    console.log('[POST /api/notes] Attempting to save with params:', {
      hasEncounterId: !!params.encounterId,
      hasPatientId: !!params.patientId,
      templateId: params.templateId,
      promptVersion: params.promptVersion,
      promptHashPrefix: params.promptHash?.substring(0, 8),
      generatedContentLength: params.generatedContent?.length,
      finalContentLength: params.finalNoteContent?.length,
      isFinal: params.isFinal,
      finalizedBy: params.finalizedBy,
      hasEpicChartData: !!params.epicChartData,
    });

    const savedNote = await saveGeneratedNote(params);

    console.log('[POST /api/notes] Note saved successfully with ID:', savedNote.id);

    return NextResponse.json({ note: savedNote }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/notes] Error saving note:', error);

    // Check for specific database schema errors
    if (error instanceof Error) {
      if (error.message.includes('Database schema is missing required columns')) {
        return NextResponse.json(
          {
            error: 'Database schema error',
            message: error.message,
            action: 'Please run the database migration in your Supabase dashboard.',
          },
          { status: 500 }
        );
      }

      // Check for Supabase-specific errors
      if (error.message.includes('column') || error.message.includes('relation')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: `Database schema issue: ${error.message}`,
            action: 'Please ensure all database migrations have been applied.',
          },
          { status: 500 }
        );
      }
    }

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
