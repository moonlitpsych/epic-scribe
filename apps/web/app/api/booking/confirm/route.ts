import { NextResponse } from 'next/server';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getEncounterById, updateEncounter, deleteEncounter } from '@/lib/db/encounters';
import { confirmBookingEvent, deleteBookingEvent } from '@/lib/booking/calendar-client';
import { getSupabaseClient } from '@/lib/supabase';
import { notifyBookingConfirmed, notifyBookingDeclined } from '@/lib/notifications/booking-notifications';

export async function POST(request: Request) {
  try {
    const providerSession = await requireProviderSession();
    const { encounterId, action } = await request.json();

    if (!encounterId || !['confirm', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Fetch encounter and verify ownership through patient
    const encounter = await getEncounterById(encounterId);
    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }

    const supabase = getSupabaseClient(true);
    const { data: patient } = await supabase
      .from('patients')
      .select('id, provider_id, first_name, email, phone')
      .eq('id', encounter.patient_id)
      .single();

    if (!patient || patient.provider_id !== providerSession.providerId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Build notification params from encounter
    const appointmentDate = encounter.scheduled_start
      ? new Date(encounter.scheduled_start).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' })
      : '';
    const appointmentTime = encounter.scheduled_start
      ? new Date(encounter.scheduled_start).toLocaleTimeString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit' })
      : '';
    const duration = encounter.scheduled_start && encounter.scheduled_end
      ? Math.round((new Date(encounter.scheduled_end).getTime() - new Date(encounter.scheduled_start).getTime()) / 60000)
      : 60;

    if (action === 'confirm') {
      // Update encounter status to scheduled
      await updateEncounter(encounterId, { status: 'scheduled' } as any);

      // Confirm the calendar event
      if (encounter.calendar_event_id) {
        try {
          await confirmBookingEvent(providerSession.providerId, encounter.calendar_event_id);
        } catch (err) {
          console.error('[booking/confirm] Calendar confirm failed:', err);
        }
      }

      // Notify patient
      notifyBookingConfirmed({
        email: patient.email,
        phone: patient.phone,
        patientName: patient.first_name,
        date: appointmentDate,
        time: appointmentTime,
        duration,
        meetLink: encounter.meet_link,
        setting: encounter.setting || 'Moonlit Psychiatry',
        providerName: providerSession.name || 'your provider',
      }).catch(err => console.error('[booking/confirm] Notification error:', err));

      return NextResponse.json({ success: true, action: 'confirmed' });
    }

    if (action === 'decline') {
      // Notify patient before deleting encounter/patient data
      notifyBookingDeclined({
        email: patient.email,
        phone: patient.phone,
        patientName: patient.first_name,
        date: appointmentDate,
        time: appointmentTime,
        providerName: providerSession.name || 'your provider',
      }).catch(err => console.error('[booking/confirm] Notification error:', err));

      // Delete the calendar event
      if (encounter.calendar_event_id) {
        try {
          await deleteBookingEvent(providerSession.providerId, encounter.calendar_event_id);
        } catch (err) {
          console.error('[booking/confirm] Calendar delete failed:', err);
        }
      }

      // Delete the encounter
      await deleteEncounter(encounterId);

      // Check if the patient has any other encounters — if not, delete the patient
      const { data: otherEncounters } = await supabase
        .from('encounters')
        .select('id')
        .eq('patient_id', encounter.patient_id)
        .limit(1);

      if (!otherEncounters || otherEncounters.length === 0) {
        await supabase.from('patients').delete().eq('id', encounter.patient_id);
      }

      return NextResponse.json({ success: true, action: 'declined' });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[booking/confirm] Error:', error);
    return NextResponse.json({ error: 'Failed to process booking action' }, { status: 500 });
  }
}
