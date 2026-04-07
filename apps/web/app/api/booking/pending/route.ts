import { NextResponse } from 'next/server';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const providerSession = await requireProviderSession();
    const supabase = getSupabaseClient(true);

    // Fetch encounters with pending_confirmation status, scoped to provider's patients
    const { data: encounters, error } = await supabase
      .from('encounters')
      .select('*, patients!inner(id, first_name, last_name, primary_payer_id, provider_id)')
      .eq('patients.provider_id', providerSession.providerId)
      .eq('status', 'pending_confirmation')
      .order('scheduled_start', { ascending: true });

    if (error) {
      console.error('[booking/pending] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch pending bookings' }, { status: 500 });
    }

    // Enrich with payer names
    const enriched = await Promise.all(
      (encounters || []).map(async (enc: any) => {
        const patient = enc.patients;
        let payerName: string | undefined;

        if (patient?.primary_payer_id) {
          const { data: payer } = await (supabase as any)
            .from('payers')
            .select('name')
            .eq('id', patient.primary_payer_id)
            .single();
          if (payer) payerName = payer.name;
        }

        return {
          id: enc.id,
          calendarEventId: enc.calendar_event_id,
          scheduledStart: enc.scheduled_start,
          scheduledEnd: enc.scheduled_end,
          meetLink: enc.meet_link,
          patientId: patient?.id,
          patientName: `${patient?.last_name}, ${patient?.first_name}`,
          setting: enc.setting,
          visitType: enc.visit_type,
          payerName,
        };
      })
    );

    return NextResponse.json({ pendingBookings: enriched });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[booking/pending] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending bookings' }, { status: 500 });
  }
}
