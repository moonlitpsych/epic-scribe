/**
 * GET /api/transcripts/[fileId]
 *
 * Retrieves the content of a transcript file from Google Drive.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getFileContent } from '@/google-drive';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.fileId;
    const content = await getFileContent(session, fileId);

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching transcript content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript content' },
      { status: 500 }
    );
  }
}
