import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../../src/lib/supabase';
import { createBookingEvent, isSlotAvailable } from '../../../../../src/lib/booking/calendar-client';
import { createPatient } from '../../../../../src/lib/db/patients';
import { createEncounter } from '../../../../../src/lib/db/encounters';
import { BookingRequest } from '../../../../../src/lib/booking/types';
import { notifyBookingSubmitted } from '../../../../../src/lib/notifications/booking-notifications';

export async function POST(
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

    const body: BookingRequest = await request.json();
    const { slot, patient: patientInfo, payerId } = body;

    // Validate required fields
    if (!slot?.date || !slot?.time || !patientInfo?.firstName || !patientInfo?.lastName || !patientInfo?.dateOfBirth || !patientInfo?.email || !patientInfo?.phone || !payerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Re-check slot availability to prevent double-booking
    const available = await isSlotAvailable(provider.id, slot);
    if (!available) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select another.' },
        { status: 409 }
      );
    }

    // Build ISO datetimes for the slot
    const startTime = `${slot.date}T${slot.time}:00-06:00`; // MDT
    const endMs = new Date(startTime).getTime() + (slot.durationMinutes || 60) * 60 * 1000;
    const endTime = new Date(endMs).toISOString();

    const patientName = `${patientInfo.lastName}, ${patientInfo.firstName}`;

    // Fetch setting/visitType from provider availability
    const { data: avail } = await (supabase as any)
      .from('provider_availability')
      .select('setting, visit_type')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    const setting = avail?.setting || 'Moonlit Psychiatry';
    const visitType = avail?.visit_type || 'Intake';

    // 1. Create calendar event
    const { eventId, meetLink } = await createBookingEvent(provider.id, {
      patientName,
      setting,
      visitType,
      startTime,
      endTime,
    });

    // 2. Create patient in DB
    const patient = await createPatient(provider.id, {
      first_name: patientInfo.firstName,
      last_name: patientInfo.lastName,
      date_of_birth: patientInfo.dateOfBirth,
      email: patientInfo.email,
      phone: patientInfo.phone,
    });

    // 3. Set primary payer on patient
    if (payerId && payerId !== 'self-pay') {
      await (supabase as any)
        .from('patients')
        .update({ primary_payer_id: payerId })
        .eq('id', patient.id);
    }

    // 4. Create encounter in DB
    await createEncounter({
      patient_id: patient.id,
      calendar_event_id: eventId,
      setting,
      visit_type: visitType,
      scheduled_start: startTime,
      scheduled_end: endTime,
      meet_link: meetLink || null,
      status: 'pending_confirmation',
    } as any);

    // Fire-and-forget notifications — don't block the booking response
    notifyBookingSubmitted({
      email: patientInfo.email,
      phone: patientInfo.phone,
      patientName: patientInfo.firstName,
      date: slot.date,
      time: slot.time,
      duration: slot.durationMinutes || 60,
      setting,
      visitType,
    }).catch(err => console.error('[booking] Notification error:', err));

    return NextResponse.json({
      appointmentDate: slot.date,
      appointmentTime: slot.time,
      duration: slot.durationMinutes || 60,
      meetLink,
      setting,
      visitType,
      patientName: `${patientInfo.firstName} ${patientInfo.lastName}`,
    });
  } catch (err) {
    console.error('[Booking] Book error:', err);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
