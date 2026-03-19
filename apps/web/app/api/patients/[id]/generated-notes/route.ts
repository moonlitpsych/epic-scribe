/**
 * GET /api/patients/[id]/generated-notes - Get all generated notes for a patient
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getPatientFinalizedNotes } from '@/lib/db/notes';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();

    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const notes = await getPatientFinalizedNotes(patientId, ps.providerId);

    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error fetching generated notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generated notes' },
      { status: 500 }
    );
  }
}
