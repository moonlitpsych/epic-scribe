/**
 * Google Calendar API Client
 *
 * Fetches encounters from Google Calendar with 7-day lookahead.
 * Naming convention: "<Patient Last, First> - <Setting> - <VisitType>"
 * Also accepts em-dash (—) for backwards compatibility.
 *
 * Authentication:
 * - Uses shared calendar for HIPAA-compliant Meet hosting (hello@trymoonlit.com)
 * - Uses user OAuth for all operations (create and read)
 * - All events created in shared calendar instead of user's primary calendar
 */

import { google } from 'googleapis';
import { Session } from 'next-auth';

export interface CalendarEncounter {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  meetLink?: string;
  patient?: string;
  setting?: string;
  visitType?: string;
}

/**
 * Parse encounter details from calendar event title.
 * Accepts both "Name - Setting - Type" (hyphen) and "Name — Setting — Type" (em-dash).
 */
function parseEventTitle(summary: string) {
  // Split on em-dash or space-hyphen-space
  const parts = summary.split(/\s*[—]\s*|\s+-\s+/).map(s => s.trim());

  if (parts.length === 3) {
    return {
      patient: parts[0],
      setting: parts[1],
      visitType: parts[2],
    };
  }

  return {
    patient: summary,
    setting: undefined,
    visitType: undefined,
  };
}

/**
 * Check if an event title matches our encounter naming convention.
 * Accepts both hyphen (-) and em-dash (—) separators.
 */
function isEncounterEvent(title: string): boolean {
  const parts = title.split(/\s*[—]\s*|\s+-\s+/);
  return parts.length >= 3;
}

/**
 * Get Google Calendar client authenticated with user's access token.
 */
function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Get the shared calendar ID for creating encounters.
 * Falls back to 'primary' if not configured.
 */
function getSharedCalendarId(): string {
  return process.env.SHARED_CALENDAR_ID || 'primary';
}

/**
 * Fetch encounters for the next 7 days from shared calendar.
 */
export async function getUpcomingEncounters(
  session: Session
): Promise<CalendarEncounter[]> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  // Calculate time range: now to 7 days from now
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: now.toISOString(),
      timeMax: sevenDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    const events = response.data.items || [];

    // Filter to only events that match our naming convention
    return events
      .filter((event) => isEncounterEvent(event.summary || ''))
      .map((event) => {
        const { patient, setting, visitType } = parseEventTitle(event.summary || '');

        return {
          id: event.id || '',
          summary: event.summary || '',
          description: event.description,
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          meetLink: event.hangoutLink,
          patient,
          setting,
          visitType,
        };
      });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw new Error('Failed to fetch calendar events');
  }
}

/**
 * Fetch today's encounters from shared calendar.
 * Same as getUpcomingEncounters but scoped to start-of-day to end-of-day.
 */
export async function getTodaysEncounters(
  session: Session,
  timezone = 'America/Denver'
): Promise<CalendarEncounter[]> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  // Calculate today's range in the given timezone
  const now = new Date();
  const startOfDay = new Date(now.toLocaleDateString('en-US', { timeZone: timezone }));
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 30,
    });

    const events = response.data.items || [];

    // Debug logging — remove after testing
    console.log('[getTodaysEncounters] calendarId:', calendarId);
    console.log('[getTodaysEncounters] timeRange:', startOfDay.toISOString(), '->', endOfDay.toISOString());
    console.log('[getTodaysEncounters] raw events:', events.length, events.map(e => ({ summary: e.summary, start: e.start?.dateTime })));
    console.log('[getTodaysEncounters] after filter:', events.filter(e => isEncounterEvent(e.summary || '')).map(e => e.summary));

    return events
      .filter((event) => isEncounterEvent(event.summary || ''))
      .map((event) => {
        const { patient, setting, visitType } = parseEventTitle(event.summary || '');

        return {
          id: event.id || '',
          summary: event.summary || '',
          description: event.description,
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          meetLink: event.hangoutLink,
          patient,
          setting,
          visitType,
        };
      });
  } catch (error) {
    console.error('Error fetching today\'s calendar events:', error);
    throw new Error('Failed to fetch today\'s calendar events');
  }
}

/**
 * Fetch encounters in an arbitrary date range from shared calendar.
 * Used by the schedule view for day/week/month modes.
 */
export async function getEncountersInRange(
  session: Session,
  timeMin: string,
  timeMax: string,
  timezone = 'America/Denver'
): Promise<CalendarEncounter[]> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 200,
      timeZone: timezone,
    });

    const events = response.data.items || [];

    return events
      .filter((event) => isEncounterEvent(event.summary || ''))
      .map((event) => {
        const { patient, setting, visitType } = parseEventTitle(event.summary || '');

        return {
          id: event.id || '',
          summary: event.summary || '',
          description: event.description,
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          meetLink: event.hangoutLink,
          patient,
          setting,
          visitType,
        };
      });
  } catch (error) {
    console.error('Error fetching calendar events in range:', error);
    throw new Error('Failed to fetch calendar events');
  }
}

/**
 * Fetch a single calendar event by ID from shared calendar.
 */
export async function getCalendarEventById(
  session: Session,
  eventId: string
): Promise<CalendarEncounter | null> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    const event = response.data;
    if (!event || !event.summary) return null;

    const { patient, setting, visitType } = parseEventTitle(event.summary);

    return {
      id: event.id || '',
      summary: event.summary,
      description: event.description ?? undefined,
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      meetLink: event.hangoutLink ?? undefined,
      patient,
      setting,
      visitType,
    };
  } catch (error: any) {
    if (error?.code === 404) return null;
    console.error('Error fetching calendar event by ID:', error);
    throw new Error('Failed to fetch calendar event');
  }
}

/**
 * Create or update a calendar event with a Google Meet link.
 * Uses shared calendar so Meet is hosted by hello@trymoonlit.com.
 */
export async function ensureMeetLink(
  session: Session,
  eventId: string
): Promise<string> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  try {
    // First, get the event to check if it already has a Meet link
    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId,
    });

    // If Meet link already exists, return it
    if (event.data.hangoutLink) {
      return event.data.hangoutLink;
    }

    // Otherwise, update the event to add conferencing
    const updatedEvent = await calendar.events.patch({
      calendarId: calendarId,
      eventId,
      requestBody: {
        conferenceData: {
          createRequest: {
            requestId: `${eventId}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    return updatedEvent.data.hangoutLink || '';
  } catch (error) {
    console.error('Error ensuring Meet link:', error);
    throw new Error('Failed to create Meet link');
  }
}

/**
 * Create a new calendar event with patient encounter details.
 * Uses shared calendar so event and Meet link are owned by hello@trymoonlit.com (HIPAA-compliant).
 */
export async function createEncounter(
  session: Session,
  {
    patient,
    setting,
    visitType,
    startTime,
    endTime,
    description,
  }: {
    patient: string;
    setting: string;
    visitType: string;
    startTime: string;
    endTime: string;
    description?: string;
  }
): Promise<CalendarEncounter> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  const summary = `${patient} - ${setting} - ${visitType}`;

  try {
    const event = await calendar.events.insert({
      calendarId: calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const { patient: parsedPatient, setting: parsedSetting, visitType: parsedVisitType } =
      parseEventTitle(event.data.summary || '');

    return {
      id: event.data.id || '',
      summary: event.data.summary || '',
      description: event.data.description,
      start: event.data.start?.dateTime || event.data.start?.date || '',
      end: event.data.end?.dateTime || event.data.end?.date || '',
      meetLink: event.data.hangoutLink,
      patient: parsedPatient,
      setting: parsedSetting,
      visitType: parsedVisitType,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new Error('Failed to create encounter');
  }
}

/**
 * Delete a calendar event by ID from the shared calendar.
 */
export async function deleteEncounter(
  session: Session,
  eventId: string
): Promise<void> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);
  const calendarId = getSharedCalendarId();

  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw new Error('Failed to delete encounter');
  }
}
