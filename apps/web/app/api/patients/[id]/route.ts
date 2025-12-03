/**
 * GET /api/patients/[id] - Get patient details with encounter count
 * PATCH /api/patients/[id] - Update patient
 * DELETE /api/patients/[id] - Soft delete patient (set active=false)
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  getPatientById,
  updatePatient,
  deletePatient,
} from '@/lib/db';
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

    // Get patient details
    const patient = await getPatientById(patientId);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get encounters for this patient (optional - table may not exist yet)
    let encounters = [];
    try {
      const { getEncountersByPatientId } = await import('@/lib/db');
      encounters = await getEncountersByPatientId(patientId);
    } catch (error) {
      console.warn('Could not fetch encounters (table may not exist):', error);
      // Continue without encounters
    }

    // Get generated notes for this patient
    let notes = [];
    try {
      notes = await getPatientFinalizedNotes(patientId);
    } catch (error) {
      console.warn('Could not fetch notes:', error);
      // Continue without notes
    }

    return NextResponse.json({ patient, encounters, notes });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, mrn, notes, active } = body;

    const updates: any = {};

    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (dateOfBirth !== undefined) {
      // Validate date format
      const dobDate = new Date(dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format for dateOfBirth' },
          { status: 400 }
        );
      }
      updates.date_of_birth = dateOfBirth;
    }
    if (mrn !== undefined) updates.mrn = mrn;
    if (notes !== undefined) updates.notes = notes;
    if (active !== undefined) updates.active = active;

    const patient = await updatePatient(patientId, updates);

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deletePatient(patientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
