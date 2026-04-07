/**
 * POST /api/encounters/check-meet-status
 *
 * Checks Google Meet conference status for active encounters and
 * auto-transitions encounter statuses:
 *   scheduled → in-visit    (when conference starts)
 *   in-visit  → note-pending (when conference ends)
 *
 * Called by the client on each poll cycle (piggybacks on useEncounterRange).
 * Non-blocking — errors on individual encounters are logged and skipped.
 */

import { NextResponse } from 'next/server';
import { requireProviderSession, UnauthorizedError, unauthorizedResponse } from '@/lib/auth/get-provider-session';
import { extractMeetingCode, getConferenceStatus } from '@/lib/meet/meet-client';
import { getSupabaseClient } from '@/lib/supabase';

interface Transition {
  id: string;
  calendarEventId: string;
  from: string;
  to: string;
}

// Statuses that should never be overwritten by Meet auto-transitions
const TERMINAL_STATUSES = new Set([
  'note-pending', 'note-ready', 'signed', 'cancelled', 'no-show',
]);

export async function POST() {
  try {
    const ps = await requireProviderSession();
    const supabase = getSupabaseClient(true);

    // Find encounters that could transition: scheduled or in-visit, with meet link, near now
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);   // 30 min from now

    const { data: encounters, error } = await supabase
      .from('encounters')
      .select('id, calendar_event_id, status, meet_link, scheduled_start, patient_id')
      .in('status', ['scheduled', 'in-visit'])
      .not('meet_link', 'is', null)
      .gte('scheduled_start', windowStart.toISOString())
      .lte('scheduled_start', windowEnd.toISOString());

    if (error) {
      console.error('[check-meet-status] DB query error:', error);
      return NextResponse.json({ checked: 0, updated: 0, transitions: [] });
    }

    if (!encounters || encounters.length === 0) {
      return NextResponse.json({ checked: 0, updated: 0, transitions: [] });
    }

    // Filter to encounters owned by this provider
    const ownedEncounters = [];
    for (const enc of encounters) {
      if (!enc.patient_id) continue;
      const { data: patient } = await supabase
        .from('patients')
        .select('provider_id')
        .eq('id', enc.patient_id)
        .single();
      if (patient?.provider_id === ps.providerId) {
        ownedEncounters.push(enc);
      }
    }

    const transitions: Transition[] = [];

    for (const enc of ownedEncounters) {
      try {
        const meetCode = extractMeetingCode(enc.meet_link);
        if (!meetCode) continue;

        const conferenceStatus = await getConferenceStatus(ps.providerId, meetCode);

        let newStatus: string | null = null;

        if (enc.status === 'scheduled' && conferenceStatus.isActive) {
          newStatus = 'in-visit';
        } else if (enc.status === 'in-visit' && conferenceStatus.hasEnded) {
          newStatus = 'note-pending';
        }

        if (newStatus && !TERMINAL_STATUSES.has(enc.status)) {
          const { error: updateError } = await supabase
            .from('encounters')
            .update({ status: newStatus })
            .eq('id', enc.id);

          if (!updateError) {
            transitions.push({
              id: enc.id,
              calendarEventId: enc.calendar_event_id,
              from: enc.status,
              to: newStatus,
            });
          } else {
            console.error(`[check-meet-status] Failed to update ${enc.id}:`, updateError);
          }
        }
      } catch (err) {
        // Non-blocking — log and continue with next encounter
        console.error(`[check-meet-status] Error checking ${enc.id}:`, err);
      }
    }

    return NextResponse.json({
      checked: ownedEncounters.length,
      updated: transitions.length,
      transitions,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[check-meet-status] Error:', error);
    return NextResponse.json({ checked: 0, updated: 0, transitions: [] });
  }
}
