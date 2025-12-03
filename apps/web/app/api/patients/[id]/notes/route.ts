/**
 * GET /api/patients/[id]/notes - Get all manual notes for a patient
 * POST /api/patients/[id]/notes - Create a new manual note (clinical note or quick memo)
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import {
  getPatientNotes,
  createPatientNote,
  PatientNoteType,
} from '@/lib/db/notes';

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

    const notes = await getPatientNotes(patientId);

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching patient notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { noteType, title, content } = body;

    // Validate required fields
    if (!noteType || !content) {
      return NextResponse.json(
        { error: 'noteType and content are required' },
        { status: 400 }
      );
    }

    // Validate note type
    if (noteType !== 'clinical_note' && noteType !== 'quick_memo') {
      return NextResponse.json(
        { error: 'noteType must be "clinical_note" or "quick_memo"' },
        { status: 400 }
      );
    }

    const note = await createPatientNote({
      patientId,
      noteType: noteType as PatientNoteType,
      title: title || undefined,
      content,
      createdBy: session.user.email,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient note:', error);
    return NextResponse.json(
      { error: 'Failed to create patient note' },
      { status: 500 }
    );
  }
}
