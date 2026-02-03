/**
 * GET /api/prior-notes/patient/:patientId - Get prior notes for a patient
 *
 * Returns all active prior notes for a patient, most recent first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getPriorNotesForPatient } from '@/lib/db/prior-notes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    const priorNotes = await getPriorNotesForPatient(patientId);

    return NextResponse.json({ priorNotes });
  } catch (error) {
    console.error('Error fetching prior notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prior notes' },
      { status: 500 }
    );
  }
}
