/**
 * GET /api/transcripts/[fileId] - Google Drive transcript content
 * PATCH /api/transcripts/[fileId] - Update a visit transcript (mark used, link patient)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getFileContent } from '@/google-drive';
import { updateTranscript } from '@/lib/db/transcripts';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await requireProviderSession();
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    if (body.status) {
      updates.status = body.status;
    }
    if (body.patientId !== undefined) {
      updates.patient_id = body.patientId;
    }
    if (body.status === 'used') {
      updates.used_at = new Date().toISOString();
    }

    const transcript = await updateTranscript(
      params.fileId,
      session.providerId,
      updates
    );

    return NextResponse.json({ transcript });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error updating transcript:', error);
    return NextResponse.json(
      { error: 'Failed to update transcript' },
      { status: 500 }
    );
  }
}
