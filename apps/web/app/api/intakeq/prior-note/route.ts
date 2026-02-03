/**
 * GET /api/intakeq/prior-note - Fetch prior note from IntakeQ
 *
 * Query params:
 *   - email: Patient email address to search for in IntakeQ
 *
 * Returns:
 *   - found: boolean
 *   - priorNote?: string (formatted note content)
 *   - noteDate?: string (ISO date of the note)
 *   - noteName?: string (type of note in IntakeQ)
 *   - reason?: string (if not found: 'patient_not_found', 'no_notes', 'api_error', 'not_configured')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  IntakeQApiClient,
  IntakeQApiError,
  formatIntakeQNoteForEpicScribe,
} from '@epic-scribe/intakeq-api';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if IntakeQ is configured
    const apiKey = process.env.INTAKEQ_API_KEY;
    if (!apiKey) {
      console.warn('IntakeQ API key not configured');
      return NextResponse.json({
        found: false,
        reason: 'not_configured',
        message: 'IntakeQ integration is not configured',
      });
    }

    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'email query parameter is required' },
        { status: 400 }
      );
    }

    // Initialize IntakeQ client
    const client = new IntakeQApiClient({ apiKey });

    // Search for patient by email
    console.log(`[IntakeQ] Searching for patient with email: ${email}`);
    const intakeQClient = await client.getClientByEmail(email);

    if (!intakeQClient) {
      console.log(`[IntakeQ] Patient not found for email: ${email}`);
      return NextResponse.json({
        found: false,
        reason: 'patient_not_found',
        message: 'Patient not found in IntakeQ',
      });
    }

    console.log(
      `[IntakeQ] Found patient: ${intakeQClient.ClientName} (ID: ${intakeQClient.ClientId})`
    );

    // Fetch most recent locked note
    const note = await client.getMostRecentLockedNote(intakeQClient.ClientId);

    if (!note) {
      console.log(`[IntakeQ] No locked notes found for patient: ${intakeQClient.ClientId}`);
      return NextResponse.json({
        found: false,
        reason: 'no_notes',
        message: 'No prior notes found in IntakeQ',
      });
    }

    console.log(
      `[IntakeQ] Found note: ${note.NoteName} from ${note.DateCreated}`
    );

    // Format the note for Epic Scribe
    const formattedNote = formatIntakeQNoteForEpicScribe(note);

    return NextResponse.json({
      found: true,
      priorNote: formattedNote,
      noteDate: note.DateCreated,
      noteName: note.NoteName,
    });
  } catch (err: unknown) {
    console.error('[IntakeQ] Error fetching prior note:', err);

    if (err instanceof IntakeQApiError) {
      return NextResponse.json({
        found: false,
        reason: 'api_error',
        message: `IntakeQ API error: ${err.message}`,
        statusCode: err.statusCode,
      });
    }

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        found: false,
        reason: 'api_error',
        message: `Failed to fetch from IntakeQ: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
