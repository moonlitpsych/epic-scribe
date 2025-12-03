/**
 * POST /api/encounters/[id]/start-meet
 *
 * Ensures the calendar event has a Google Meet link and returns it.
 * Creates the Meet link if it doesn't exist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { ensureMeetLink } from '@/google-calendar';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const meetLink = await ensureMeetLink(session, eventId);

    return NextResponse.json({ meetLink });
  } catch (error) {
    console.error('Error starting Meet:', error);
    return NextResponse.json(
      { error: 'Failed to start Meet session' },
      { status: 500 }
    );
  }
}
