/**
 * DELETE /api/encounters/[id] - Deletes an encounter from Google Calendar
 * PATCH /api/encounters/[id] - Updates encounter fields (e.g. provider_notes)
 *
 * Requires authenticated session with Google OAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { deleteEncounter, getCalendarEventById } from '@/google-calendar';
import { getEncounterById, getEncounterByCalendarEventId } from '@/lib/db/encounters';
import { enrichCalendarEvents } from '@/lib/flow/enrich-encounters';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Encounter ID is required' }, { status: 400 });
    }

    // Try as DB UUID first, then as calendar event ID
    let calendarEventId: string | null = null;
    let dbEncounter;

    // Check if it's a UUID (DB encounter ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      try {
        dbEncounter = await getEncounterById(id);
        calendarEventId = dbEncounter?.calendar_event_id || null;
      } catch {
        // Not found as UUID, will try as calendar event ID
      }
    }

    if (!calendarEventId) {
      // Treat as calendar event ID
      calendarEventId = id;
      try {
        dbEncounter = await getEncounterByCalendarEventId(id);
      } catch {
        dbEncounter = null;
      }
    }

    // Fetch calendar event
    const calendarEvent = await getCalendarEventById(session, calendarEventId);
    if (!calendarEvent) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    // Enrich with patient data
    const [enriched] = await enrichCalendarEvents([calendarEvent], ps.providerId);
    if (!enriched) {
      return NextResponse.json({ error: 'Failed to enrich encounter' }, { status: 500 });
    }

    // Load existing note if encounter has one
    let existingNote = null;
    if (enriched.noteId) {
      const supabase = getSupabaseClient(true);
      const { data } = await supabase
        .from('generated_notes')
        .select('*')
        .eq('id', enriched.noteId)
        .single();
      existingNote = data;
    }

    // Load provider_notes from DB encounter
    let providerNotes = null;
    if (dbEncounter?.provider_notes) {
      providerNotes = dbEncounter.provider_notes;
    }

    return NextResponse.json({ encounter: enriched, existingNote, providerNotes });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[GET /api/encounters/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch encounter' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();
    const body = await request.json();
    const encounterId = params.id;

    if (!encounterId) {
      return NextResponse.json({ error: 'Encounter ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient(true);

    // Try to find the encounter — could be a DB encounter ID or calendar event ID
    let dbEncounter;
    try {
      const { data } = await supabase.from('encounters').select('id, patient_id').eq('id', encounterId).single();
      dbEncounter = data;
    } catch {
      // Try by calendar event ID
      dbEncounter = await getEncounterByCalendarEventId(encounterId);
    }

    if (!dbEncounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }

    // Verify ownership through patient
    if (dbEncounter.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('provider_id')
        .eq('id', dbEncounter.patient_id)
        .single();

      if (patient?.provider_id !== ps.providerId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Update allowed fields
    const updates: Record<string, any> = {};
    if (body.providerNotes !== undefined) {
      updates.provider_notes = body.providerNotes;
    }
    if (body.status !== undefined) {
      const validStatuses = [
        'pending_confirmation', 'scheduled', 'ready', 'in-visit',
        'note-pending', 'note-ready', 'signed', 'cancelled', 'no-show',
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('encounters')
      .update(updates)
      .eq('id', dbEncounter.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating encounter:', error);
      return NextResponse.json({ error: 'Failed to update encounter' }, { status: 500 });
    }

    return NextResponse.json({ encounter: data });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error updating encounter:', error);
    return NextResponse.json({ error: 'Failed to update encounter' }, { status: 500 });
  }
}

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
