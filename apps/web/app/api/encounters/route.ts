/**
 * GET /api/encounters - Returns upcoming encounters for the next 7 days
 * POST /api/encounters - Creates a new encounter and pushes to Google Calendar
 *
 * Requires authenticated session with Google OAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getUpcomingEncounters, createEncounter } from '@/google-calendar';

export async function GET() {
  try {
    const ps = await requireProviderSession();

    // 1. Get encounters from Google Calendar (source of truth for scheduling)
    const calendarEncounters = await getUpcomingEncounters({ accessToken: ps.accessToken } as any);

    // 2. Enrich with Supabase data (patient info, metadata)
    const { getEncounterByCalendarEventId } = await import('@/lib/db');

    const enrichedEncounters = await Promise.all(
      calendarEncounters.map(async (calendarEncounter) => {
        try {
          const dbEncounter = await getEncounterByCalendarEventId(calendarEncounter.id);

          if (dbEncounter) {
            // Merge Calendar data with DB data
            return {
              ...calendarEncounter,
              patientId: dbEncounter.patient_id,
              patientFirstName: dbEncounter.patients?.first_name,
              patientLastName: dbEncounter.patients?.last_name,
              patientDOB: dbEncounter.patients?.date_of_birth,
              transcriptFileId: dbEncounter.transcript_file_id,
              transcriptIndexedAt: dbEncounter.transcript_indexed_at,
              dbStatus: dbEncounter.status,
            };
          }

          // Calendar event exists but not in DB (legacy or manually created)
          return calendarEncounter;
        } catch (err) {
          // If DB lookup fails, just return Calendar data
          console.error('Error enriching encounter:', err);
          return calendarEncounter;
        }
      })
    );

    return NextResponse.json({ encounters: enrichedEncounters });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error fetching encounters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch encounters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ps = await requireProviderSession();

    const body = await request.json();
    const { patientId, setting, visitType, startTime, endTime } = body;

    // Require patientId for new encounters
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    // Fetch patient name from database
    const { getPatientById, createEncounter: createEncounterInDB } = await import('@/lib/db');
    let patientData;

    try {
      patientData = await getPatientById(patientId, ps.providerId);
    } catch (err) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const patientName = `${patientData.last_name}, ${patientData.first_name}`;

    // Validate required fields
    if (!setting || !visitType || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: setting, visitType, startTime, endTime' },
        { status: 400 }
      );
    }

    // 1. Create encounter in Google Calendar with Meet link
    const calendarEncounter = await createEncounter({ accessToken: ps.accessToken } as any, {
      patient: patientName,
      setting,
      visitType,
      startTime,
      endTime,
    });

    // 2. Save encounter metadata to Supabase
    try {
      const dbEncounter = await createEncounterInDB({
        patient_id: patientId,
        calendar_event_id: calendarEncounter.id,
        setting,
        visit_type: visitType,
        scheduled_start: startTime,
        scheduled_end: endTime,
        meet_link: calendarEncounter.meetLink || null,
        status: 'scheduled',
      });

      return NextResponse.json({
        encounter: calendarEncounter,
        dbEncounter
      });
    } catch (dbError) {
      console.error('Error saving encounter to database:', dbError);
      // Calendar event was created but DB save failed
      // We could rollback the calendar event here, but for now just log it
      return NextResponse.json(
        {
          encounter: calendarEncounter,
          warning: 'Encounter created in Calendar but failed to save to database'
        },
        { status: 201 }
      );
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error creating encounter:', error);
    return NextResponse.json(
      { error: 'Failed to create encounter' },
      { status: 500 }
    );
  }
}
