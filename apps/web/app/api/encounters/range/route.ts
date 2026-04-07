import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getEncountersInRange } from '@/google-calendar';
import { enrichCalendarEvents } from '@/lib/flow/enrich-encounters';

const MAX_RANGE_DAYS = 35;

export async function GET(request: NextRequest) {
  try {
    const providerSession = await requireProviderSession();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end query params required' }, { status: 400 });
    }

    // Validate dates
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Cap range
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: `Range cannot exceed ${MAX_RANGE_DAYS} days` }, { status: 400 });
    }

    let calendarEvents;
    try {
      calendarEvents = await getEncountersInRange(
        session,
        startDate.toISOString(),
        endDate.toISOString()
      );
    } catch (err: any) {
      console.error('[encounters/range] Calendar fetch failed:', err);
      // If Google returns 401/403, the token is expired — signal client to re-auth
      if (err?.code === 401 || err?.code === 403 || err?.status === 401 || err?.status === 403 ||
          (err?.message && /unauthorized|invalid.credentials|token.*expired/i.test(err.message))) {
        return NextResponse.json({ error: 'Google token expired' }, { status: 401 });
      }
      calendarEvents = [];
    }

    const encounters = await enrichCalendarEvents(calendarEvents, providerSession.providerId);

    return NextResponse.json({ encounters, start, end });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[encounters/range] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch encounters' }, { status: 500 });
  }
}
