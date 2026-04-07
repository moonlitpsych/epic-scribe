import { google } from 'googleapis';
import { getSupabaseClient } from '../supabase';
import { BookingSlot, ProviderAvailability } from './types';

const TIMEZONE = 'America/Denver';

/**
 * Get an authenticated Google Calendar client using the provider's stored refresh token.
 */
async function getCalendarClientForProvider(providerId: string) {
  const supabase = getSupabaseClient(true);

  const { data: provider, error } = await (supabase as any)
    .from('es_providers')
    .select('google_refresh_token')
    .eq('id', providerId)
    .single();

  if (error || !provider?.google_refresh_token) {
    throw new Error('Provider has no stored refresh token. Provider must sign in first.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: provider.google_refresh_token,
  });

  // Force token refresh to get a valid access token
  await oauth2Client.getAccessToken();

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function getSharedCalendarId(): string {
  return process.env.SHARED_CALENDAR_ID || 'primary';
}

/**
 * Generate all possible time slots from provider availability rules for a date range.
 */
function generateSlotsFromAvailability(
  availability: ProviderAvailability[],
  startDate: Date,
  endDate: Date
): BookingSlot[] {
  const slots: BookingSlot[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); // 0=Sun
    const dateStr = current.toISOString().split('T')[0];

    const dayRules = availability.filter(
      (a) => a.day_of_week === dayOfWeek && a.is_active
    );

    for (const rule of dayRules) {
      const [startH, startM] = rule.start_time.split(':').map(Number);
      const [endH, endM] = rule.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m + rule.slot_duration_minutes <= endMinutes; m += rule.slot_duration_minutes) {
        const hours = Math.floor(m / 60);
        const mins = m % 60;
        slots.push({
          date: dateStr,
          time: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
          durationMinutes: rule.slot_duration_minutes,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Get available booking slots for a provider within a date range.
 * Checks provider availability rules and subtracts busy calendar periods.
 */
export async function getAvailableSlots(
  providerId: string,
  startDate: Date,
  endDate: Date
): Promise<{ slots: BookingSlot[]; setting: string; visitType: string }> {
  const supabase = getSupabaseClient(true);

  // Fetch availability rules
  const { data: availability, error } = await (supabase as any)
    .from('provider_availability')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true);

  if (error || !availability?.length) {
    return { slots: [], setting: '', visitType: '' };
  }

  // Generate all possible slots
  const allSlots = generateSlotsFromAvailability(availability, startDate, endDate);

  if (allSlots.length === 0) {
    return { slots: [], setting: availability[0].setting, visitType: availability[0].visit_type };
  }

  // Filter out past slots
  const now = new Date();
  const futureSlots = allSlots.filter((slot) => {
    const slotDate = new Date(`${slot.date}T${slot.time}:00`);
    return slotDate > now;
  });

  if (futureSlots.length === 0) {
    return { slots: [], setting: availability[0].setting, visitType: availability[0].visit_type };
  }

  // Query Google Calendar freebusy to find conflicts
  try {
    const calendar = await getCalendarClientForProvider(providerId);
    const calendarId = getSharedCalendarId();

    const freebusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const busyPeriods =
      freebusyResponse.data.calendars?.[calendarId]?.busy || [];

    // Filter out slots that overlap with busy periods
    const availableSlots = futureSlots.filter((slot) => {
      const slotStart = new Date(`${slot.date}T${slot.time}:00`);
      const slotEnd = new Date(slotStart.getTime() + slot.durationMinutes * 60 * 1000);

      return !busyPeriods.some((busy) => {
        const busyStart = new Date(busy.start!);
        const busyEnd = new Date(busy.end!);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    });

    return {
      slots: availableSlots,
      setting: availability[0].setting,
      visitType: availability[0].visit_type,
    };
  } catch (err) {
    console.error('[Booking] Failed to check calendar availability:', err);
    // If calendar check fails, return all future slots (better to show slots than none)
    return {
      slots: futureSlots,
      setting: availability[0].setting,
      visitType: availability[0].visit_type,
    };
  }
}

/**
 * Create a booking event on the shared Google Calendar with a Meet link.
 * Event is created as "tentative" — provider must confirm before it becomes final.
 */
export async function createBookingEvent(
  providerId: string,
  {
    patientName,
    setting,
    visitType,
    startTime,
    endTime,
  }: {
    patientName: string;
    setting: string;
    visitType: string;
    startTime: string; // ISO datetime
    endTime: string;   // ISO datetime
  }
): Promise<{ eventId: string; meetLink?: string }> {
  const calendar = await getCalendarClientForProvider(providerId);
  const calendarId = getSharedCalendarId();

  const summary = `${patientName} - ${setting} - ${visitType}`;

  // Notify provider via Google Calendar attendee invite (sends email with Accept/Decline)
  const NOTIFICATION_EMAIL = 'hello@trymoonlit.com';

  const event = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary,
      description: 'Booked via patient self-scheduling — awaiting provider confirmation',
      status: 'tentative',
      start: { dateTime: startTime, timeZone: TIMEZONE },
      end: { dateTime: endTime, timeZone: TIMEZONE },
      attendees: [
        { email: NOTIFICATION_EMAIL, responseStatus: 'needsAction' },
      ],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  return {
    eventId: event.data.id || '',
    meetLink: event.data.hangoutLink || undefined,
  };
}

/**
 * Confirm a tentative booking event — sets status to confirmed and notifies attendees.
 */
export async function confirmBookingEvent(providerId: string, calendarEventId: string) {
  const calendar = await getCalendarClientForProvider(providerId);
  const calendarId = getSharedCalendarId();

  await calendar.events.patch({
    calendarId,
    eventId: calendarEventId,
    sendUpdates: 'all',
    requestBody: {
      status: 'confirmed',
    },
  });
}

/**
 * Delete a booking event from the calendar and notify attendees.
 */
export async function deleteBookingEvent(providerId: string, calendarEventId: string) {
  const calendar = await getCalendarClientForProvider(providerId);
  const calendarId = getSharedCalendarId();

  await calendar.events.delete({
    calendarId,
    eventId: calendarEventId,
    sendUpdates: 'all',
  });
}

/**
 * Check if a specific slot is still available (for race condition prevention).
 */
export async function isSlotAvailable(
  providerId: string,
  slot: BookingSlot
): Promise<boolean> {
  try {
    const calendar = await getCalendarClientForProvider(providerId);
    const calendarId = getSharedCalendarId();

    const slotStart = new Date(`${slot.date}T${slot.time}:00`);
    const slotEnd = new Date(slotStart.getTime() + slot.durationMinutes * 60 * 1000);

    const freebusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: slotStart.toISOString(),
        timeMax: slotEnd.toISOString(),
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const busyPeriods =
      freebusyResponse.data.calendars?.[calendarId]?.busy || [];

    return busyPeriods.length === 0;
  } catch {
    return false;
  }
}
