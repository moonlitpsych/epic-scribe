import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../../src/lib/supabase';
import { getAvailableSlots } from '../../../../../src/lib/booking/calendar-client';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getSupabaseClient(true);
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    // Look up provider by booking slug
    const { data: provider, error: providerError } = await (supabase as any)
      .from('es_providers')
      .select('id, booking_enabled')
      .eq('booking_slug', slug)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (!provider.booking_enabled) {
      return NextResponse.json({ error: 'Booking not available' }, { status: 403 });
    }

    // Parse date range (default: next 14 days)
    const now = new Date();
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    const startDate = startStr ? new Date(startStr) : now;
    const endDate = endStr
      ? new Date(endStr)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const result = await getAvailableSlots(provider.id, startDate, endDate);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Booking] Availability error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
