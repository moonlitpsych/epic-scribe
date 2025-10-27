/**
 * Google Calendar API Client
 *
 * Fetches encounters from Google Calendar with 7-day lookahead.
 * Naming convention: "<Patient Last, First> — <Setting> — <VisitType>"
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
 * Expected format: "<Patient Last, First> — <Setting> — <VisitType>"
 */
function parseEventTitle(summary: string) {
  const parts = summary.split('—').map(s => s.trim());

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
 * Get Google Calendar client authenticated with user's access token.
 */
function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Fetch encounters for the next 7 days from user's primary calendar.
 */
export async function getUpcomingEncounters(
  session: Session
): Promise<CalendarEncounter[]> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);

  // Calculate time range: now to 7 days from now
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: sevenDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    const events = response.data.items || [];

    // Filter to only events that match our naming convention
    // Must have the em-dash separator (—) which indicates patient encounters
    return events
      .filter((event) => {
        const title = event.summary || '';
        return title.includes('—');
      })
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
 * Create or update a calendar event with a Google Meet link.
 */
export async function ensureMeetLink(
  session: Session,
  eventId: string
): Promise<string> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);

  try {
    // First, get the event to check if it already has a Meet link
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    // If Meet link already exists, return it
    if (event.data.hangoutLink) {
      return event.data.hangoutLink;
    }

    // Otherwise, update the event to add conferencing
    const updatedEvent = await calendar.events.patch({
      calendarId: 'primary',
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

  const summary = `${patient} — ${setting} — ${visitType}`;

  try {
    const event = await calendar.events.insert({
      calendarId: 'primary',
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
 * Delete a calendar event by ID.
 */
export async function deleteEncounter(
  session: Session,
  eventId: string
): Promise<void> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const calendar = getCalendarClient(session.accessToken);

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw new Error('Failed to delete encounter');
  }
}
