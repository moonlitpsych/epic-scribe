/**
 * DELETE /api/encounters/[id] - Deletes an encounter from Google Calendar
 *
 * Requires authenticated session with Google OAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { deleteEncounter } from '@/google-calendar';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();

    const calendarEventId = params.id;

    if (!calendarEventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // 1. Delete from Google Calendar
    await deleteEncounter({ accessToken: ps.accessToken } as any, calendarEventId);

    // 2. Delete from Supabase (by calendar_event_id)
    const { deleteEncounterByCalendarEventId } = await import('@/lib/db');
    try {
      await deleteEncounterByCalendarEventId(calendarEventId);
    } catch (dbError) {
      console.error('Error deleting encounter from database:', dbError);
      // Calendar event was deleted, but DB deletion failed
      // This is acceptable since Calendar is source of truth
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error deleting encounter:', error);
    return NextResponse.json(
      { error: 'Failed to delete encounter' },
      { status: 500 }
    );
  }
}
