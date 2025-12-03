/**
 * GET /api/encounters/[id]/transcripts
 *
 * Searches Google Drive for transcripts matching this encounter.
 * Returns list of potential transcript files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { findTranscripts } from '@/google-drive';
import { google } from 'googleapis';

// Helper to get calendar event details
async function getCalendarEvent(accessToken: string, eventId: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const event = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  return event.data;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Get calendar event to extract patient name and date
    const event = await getCalendarEvent(session.accessToken, eventId);

    if (!event.start?.dateTime) {
      return NextResponse.json(
        { error: 'Event has no start time' },
        { status: 400 }
      );
    }

    // Extract date (YYYY-MM-DD)
    const eventDate = new Date(event.start.dateTime);
    const date = eventDate.toISOString().split('T')[0];

    // Extract patient name from event title
    // Expected format: "Patient Last, First — Setting — Visit Type"
    const title = event.summary || '';
    const parts = title.split('—').map(s => s.trim());
    const patientName = parts.length > 0 ? parts[0] : undefined;

    // Search for transcripts
    const transcripts = await findTranscripts(session, {
      date,
      patientName,
    });

    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}
