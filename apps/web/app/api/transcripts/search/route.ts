/**
 * GET /api/transcripts/search
 *
 * Searches Google Drive for transcripts by patient name.
 * Query params: patientName (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { searchFiles, DriveFile } from '@/google-drive';

/**
 * Search for Google Meet transcripts by patient name.
 */
async function findTranscriptsByPatient(
  session: any,
  patientName: string
): Promise<DriveFile[]> {
  const allTranscripts: DriveFile[] = [];

  // Strategy 1: Search "Meet Recordings" folder for transcripts
  try {
    const meetRecordingsQuery = [
      "name contains 'Meet Recordings'",
      "mimeType = 'application/vnd.google-apps.folder'",
      "trashed = false",
    ].join(' and ');

    const meetFolders = await searchFiles(session, meetRecordingsQuery, 5);

    if (meetFolders.length > 0) {
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

  // Strategy 2: Search by patient name parts
  const nameParts = patientName.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);

  for (const term of nameParts) {
    if (!term || term.length < 2) continue;

    try {
      const nameQuery = [
        `name contains '${term.replace(/'/g, "\\'")}'`,
        "(name contains 'Transcript' or name contains '.vtt' or name contains '.sbv' or name contains '.srt' or mimeType = 'text/vtt' or mimeType = 'application/vnd.google-apps.document')",
        "trashed = false",
      ].join(' and ');

      const nameMatches = await searchFiles(session, nameQuery, 20);
      allTranscripts.push(...nameMatches);
    } catch (error) {
      console.error(`Error searching for term "${term}":`, error);
    }
  }

  // Strategy 3: Search for recent transcripts (last 7 days)
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    const recentQuery = [
      "(name contains 'Transcript' or mimeType = 'application/vnd.google-apps.document')",
      `modifiedTime >= '${dateStr}'`,
      "trashed = false",
    ].join(' and ');

    const recentMatches = await searchFiles(session, recentQuery, 30);
    // Only include files that look like transcripts
    const filteredRecent = recentMatches.filter(f =>
      f.name.toLowerCase().includes('transcript') ||
      f.name.match(/\.(vtt|sbv|srt)$/i)
    );
    allTranscripts.push(...filteredRecent);
  } catch (error) {
    console.error('Error searching recent transcripts:', error);
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const patientName = searchParams.get('patientName');

    if (!patientName) {
      return NextResponse.json(
        { error: 'patientName is required' },
        { status: 400 }
      );
    }

    console.log('[Transcripts] Searching by patient name:', patientName);

    const transcripts = await findTranscriptsByPatient(session, patientName);

    console.log('[Transcripts] Found:', transcripts.length, 'files');

    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error('Error searching transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to search transcripts' },
      { status: 500 }
    );
  }
}
