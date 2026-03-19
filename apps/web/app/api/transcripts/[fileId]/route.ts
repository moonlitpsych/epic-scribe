/**
 * GET /api/transcripts/[fileId]
 *
 * Retrieves the content of a transcript file from Google Drive.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getFileContent } from '@/google-drive';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const ps = await requireProviderSession();

    const session = { accessToken: ps.accessToken } as any;

    const fileId = params.fileId;
    const content = await getFileContent(session, fileId);

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error fetching transcript content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript content' },
      { status: 500 }
    );
  }
}
