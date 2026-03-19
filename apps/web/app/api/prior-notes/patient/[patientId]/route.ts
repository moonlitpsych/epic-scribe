/**
 * GET /api/prior-notes/patient/:patientId - Get prior notes for a patient
 *
 * Returns all active prior notes for a patient, most recent first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getPriorNotesForPatient } from '@/lib/db/prior-notes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const ps = await requireProviderSession();

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    const priorNotes = await getPriorNotesForPatient(patientId, ps.providerId);

    return NextResponse.json({ priorNotes });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error fetching prior notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prior notes' },
      { status: 500 }
    );
  }
}
