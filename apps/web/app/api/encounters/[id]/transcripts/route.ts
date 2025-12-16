/**
 * GET /api/encounters/[id]/transcripts
 *
 * Searches Google Drive for transcripts matching this encounter.
 * Returns list of potential transcript files from Google Meet recordings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { searchFiles, DriveFile } from '@/google-drive';
import { google } from 'googleapis';

// Use shared calendar for HIPAA compliance
const CALENDAR_ID = process.env.SHARED_CALENDAR_ID || 'primary';

// Helper to get calendar event details
async function getCalendarEvent(accessToken: string, eventId: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const event = await calendar.events.get({
    calendarId: CALENDAR_ID,
    eventId,
  });

  return event.data;
}

/**
 * Search for Google Meet transcripts.
 * Meet saves transcripts in "Meet Recordings" folder with format:
 * - "[Meeting Title] (date) - Transcript.txt"
 * - Or just the meeting title with various extensions
 */
async function findMeetTranscripts(
  session: any,
  {
    meetingTitle,
    patientName,
    date,
  }: {
    meetingTitle?: string;
    patientName?: string;
    date?: string;
  }
): Promise<DriveFile[]> {
  const allTranscripts: DriveFile[] = [];

  // Strategy 1: Search "Meet Recordings" folder for transcripts
  const meetRecordingsQuery = [
    "name contains 'Meet Recordings'",
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(' and ');

  try {
    const meetFolders = await searchFiles(session, meetRecordingsQuery, 5);

    if (meetFolders.length > 0) {
      // Search within Meet Recordings folders for transcript files
      for (const folder of meetFolders) {
        const transcriptQuery = [
          `'${folder.id}' in parents`,
          "(name contains 'Transcript' or name contains 'transcript')",
          "trashed = false",
        ].join(' and ');

        const folderTranscripts = await searchFiles(session, transcriptQuery, 50);
        allTranscripts.push(...folderTranscripts);
      }
    }
  } catch (error) {
    console.error('Error searching Meet Recordings folder:', error);
  }

  // Strategy 2: Search by meeting title / patient name anywhere in Drive
  const searchTerms: string[] = [];

  if (patientName) {
    // Patient name format: "Last, First" - search for both parts
    const nameParts = patientName.split(',').map(s => s.trim());
    searchTerms.push(...nameParts);
  }

  if (meetingTitle) {
    searchTerms.push(meetingTitle);
  }

  for (const term of searchTerms) {
    if (!term) continue;

    try {
      const nameQuery = [
        `name contains '${term.replace(/'/g, "\\'")}'`,
        "(name contains 'Transcript' or name contains '.vtt' or name contains '.sbv' or name contains '.srt' or mimeType = 'text/vtt')",
        "trashed = false",
      ].join(' and ');

      const nameMatches = await searchFiles(session, nameQuery, 20);
      allTranscripts.push(...nameMatches);
    } catch (error) {
      console.error(`Error searching for term "${term}":`, error);
    }
  }

  // Strategy 3: Search by date if provided
  if (date) {
    try {
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const dateQuery = [
        "(name contains 'Transcript' or name contains '.vtt' or name contains '.sbv')",
        `createdTime >= '${startOfDay}'`,
        `createdTime <= '${endOfDay}'`,
        "trashed = false",
      ].join(' and ');

      const dateMatches = await searchFiles(session, dateQuery, 20);
      allTranscripts.push(...dateMatches);
    } catch (error) {
      console.error('Error searching by date:', error);
    }
  }

  // Deduplicate by file ID
  const seen = new Set<string>();
  const uniqueTranscripts = allTranscripts.filter(file => {
    if (seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });

  // Sort by modified time (most recent first)
  uniqueTranscripts.sort((a, b) =>
    new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
  );

  return uniqueTranscripts;
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
    let event;
    try {
      event = await getCalendarEvent(session.accessToken, eventId);
    } catch (calError: any) {
      console.error('Error fetching calendar event:', calError?.message);
      // If we can't get the event, still try searching by recent transcripts
      const recentTranscripts = await findMeetTranscripts(session, {});
      return NextResponse.json({ transcripts: recentTranscripts });
    }

    // Extract date (YYYY-MM-DD)
    const eventDate = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
      ? new Date(event.start.date)
      : null;

    const date = eventDate ? eventDate.toISOString().split('T')[0] : undefined;

    // Extract patient name from event title
    // Expected format: "Patient Last, First — Setting — Visit Type"
    const title = event.summary || '';
    const parts = title.split('—').map((s: string) => s.trim());
    const patientName = parts.length > 0 ? parts[0] : undefined;

    console.log('[Transcripts] Searching for:', { date, patientName, title });

    // Search for transcripts using multiple strategies
    const transcripts = await findMeetTranscripts(session, {
      meetingTitle: title,
      patientName,
      date,
    });

    console.log('[Transcripts] Found:', transcripts.length, 'files');

    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}
