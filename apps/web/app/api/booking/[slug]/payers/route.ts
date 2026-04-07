import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../../src/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getSupabaseClient(true);
    const { slug } = params;

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

    // Fetch active payers
    const { data: payers, error: payersError } = await (supabase as any)
      .from('payers')
      .select('id, name, payer_type')
      .eq('status_code', 'approved')
      .order('name');

    if (payersError) {
      console.error('[Booking] Failed to fetch payers:', payersError);
      return NextResponse.json({ error: 'Failed to fetch payers' }, { status: 500 });
    }

    return NextResponse.json({ payers: payers || [] });
  } catch (err) {
    console.error('[Booking] Payers error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
