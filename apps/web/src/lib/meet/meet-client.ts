/**
 * Google Meet API Client
 *
 * Checks conference status for Meet links on encounters.
 * Uses the provider's stored refresh token (same pattern as calendar-client.ts).
 */

import { google, meet_v2 } from 'googleapis';
import { getSupabaseClient } from '../supabase';

export interface ConferenceStatus {
  isActive: boolean;
  hasEnded: boolean;
  conferenceId?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Extract meeting code from a Google Meet URL.
 * "https://meet.google.com/dkt-ypfa-wyf" → "dkt-ypfa-wyf"
 */
export function extractMeetingCode(meetLink: string): string | null {
  try {
    const url = new URL(meetLink);
    if (!url.hostname.includes('meet.google.com')) return null;
    // Path is like "/dkt-ypfa-wyf" or "/lookup/dkt-ypfa-wyf"
    const parts = url.pathname.split('/').filter(Boolean);
    const code = parts[parts.length - 1];
    // Meeting codes are xxx-xxxx-xxx pattern
    if (code && /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(code)) {
      return code;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get an authenticated Google Meet API client using the provider's stored refresh token.
 */
async function getMeetClientForProvider(providerId: string): Promise<meet_v2.Meet> {
  const supabase = getSupabaseClient(true);

  const { data: provider, error } = await (supabase as any)
    .from('es_providers')
    .select('google_refresh_token')
    .eq('id', providerId)
    .single();

  if (error || !provider?.google_refresh_token) {
    throw new Error('Provider has no stored refresh token.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: provider.google_refresh_token,
  });

  await oauth2Client.getAccessToken();

  return google.meet({ version: 'v2', auth: oauth2Client });
}

/**
 * Check conference status for a meeting code.
 *
 * Uses conferenceRecords.list filtered by space matching the meeting code.
 * A null endTime means the conference is still active.
 */
export async function getConferenceStatus(
  providerId: string,
  meetingCode: string
): Promise<ConferenceStatus> {
  const meet = await getMeetClientForProvider(providerId);

  // List conference records — filter by space with this meeting code
  // The filter format is: space.meeting_code="xxx-xxxx-xxx"
  const res = await meet.conferenceRecords.list({
    filter: `space.meeting_code="${meetingCode}"`,
  });

  const records = res.data.conferenceRecords || [];

  if (records.length === 0) {
    return { isActive: false, hasEnded: false };
  }

  // Get the most recent conference record
  const latest = records[records.length - 1];

  const hasEnded = !!latest.endTime;
  const isActive = !!latest.startTime && !latest.endTime;

  return {
    isActive,
    hasEnded,
    conferenceId: latest.name || undefined,
    startTime: latest.startTime || undefined,
    endTime: latest.endTime || undefined,
  };
}
