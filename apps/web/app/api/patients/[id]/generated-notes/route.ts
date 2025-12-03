/**
 * GET /api/patients/[id]/generated-notes - Get all generated notes for a patient
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getPatientFinalizedNotes } from '@/lib/db/notes';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const notes = await getPatientFinalizedNotes(patientId);

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching generated notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generated notes' },
      { status: 500 }
    );
  }
}
