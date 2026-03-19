/**
 * POST /api/encounters/[id]/start-meet
 *
 * Ensures the calendar event has a Google Meet link and returns it.
 * Creates the Meet link if it doesn't exist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { ensureMeetLink } from '@/google-calendar';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();

    const session = { accessToken: ps.accessToken } as any;

    const eventId = params.id;
    const meetLink = await ensureMeetLink(session, eventId);

    return NextResponse.json({ meetLink });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error starting Meet:', error);
    return NextResponse.json(
      { error: 'Failed to start Meet session' },
      { status: 500 }
    );
  }
}
