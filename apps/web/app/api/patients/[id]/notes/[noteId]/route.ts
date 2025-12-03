/**
 * GET /api/patients/[id]/notes/[noteId] - Get a specific patient note
 * PATCH /api/patients/[id]/notes/[noteId] - Update a patient note
 * DELETE /api/patients/[id]/notes/[noteId] - Delete a patient note
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import {
  getPatientNoteById,
  updatePatientNote,
  deletePatientNote,
} from '@/lib/db/notes';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId } = params;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const note = await getPatientNoteById(noteId);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error fetching patient note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient note' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId } = params;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, content } = body;

    // At least one field must be provided
    if (title === undefined && content === undefined) {
      return NextResponse.json(
        { error: 'At least one of title or content must be provided' },
        { status: 400 }
      );
    }

    const note = await updatePatientNote(noteId, { title, content });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error updating patient note:', error);
    return NextResponse.json(
      { error: 'Failed to update patient note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId } = params;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    await deletePatientNote(noteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient note:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient note' },
      { status: 500 }
    );
  }
}
