import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getTodaysEncounters } from '@/google-calendar';
import { enrichCalendarEvents } from '@/lib/flow/enrich-encounters';
import type { TodayResponse } from '@/lib/flow/types';

export async function GET() {
  try {
    const providerSession = await requireProviderSession();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch today's calendar events
    let calendarEvents;
    try {
      calendarEvents = await getTodaysEncounters(session);
    } catch (err) {
      console.error('[encounters/today] Calendar fetch failed:', err);
      calendarEvents = [];
    }

    const encounters = await enrichCalendarEvents(calendarEvents, providerSession.providerId);

    const response: TodayResponse = {
      encounters,
      date: new Date().toISOString().split('T')[0],
      providerName: providerSession.name || providerSession.email,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[encounters/today] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch today\'s encounters' }, { status: 500 });
  }
}
