/**
 * GET /api/patients/[id]/notes - Get all manual notes for a patient
 * POST /api/patients/[id]/notes - Create a new manual note (clinical note or quick memo)
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
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
    const ps = await requireProviderSession();

    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const notes = await getPatientNotes(patientId, ps.providerId);

    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
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
    const ps = await requireProviderSession();

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

    const note = await createPatientNote(ps.providerId, {
      patientId,
      noteType: noteType as PatientNoteType,
      title: title || undefined,
      content,
      createdBy: ps.email,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error creating patient note:', error);
    return NextResponse.json(
      { error: 'Failed to create patient note' },
      { status: 500 }
    );
  }
}
