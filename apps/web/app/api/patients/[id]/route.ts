/**
 * GET /api/patients/[id] - Get patient details with encounter count
 * PATCH /api/patients/[id] - Update patient
 * DELETE /api/patients/[id] - Soft delete patient (set active=false)
 *
 * Requires authenticated session with provider context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import {
  getPatientById,
  updatePatient,
  deletePatient,
  getEncountersByPatientId,
} from '@/lib/db';
import { getPatientFinalizedNotes } from '@/lib/db/notes';
import { getSupabaseClient } from '@/lib/supabase';

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

    const patient = await getPatientById(patientId, ps.providerId);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    let encounters: any[] = [];
    try {
      encounters = await getEncountersByPatientId(patientId, ps.providerId);
    } catch (error) {
      console.warn('Could not fetch encounters:', error);
    }

    let notes: any[] = [];
    try {
      notes = await getPatientFinalizedNotes(patientId, ps.providerId);
    } catch (error) {
      console.warn('Could not fetch notes:', error);
    }

    // Look up payer name if patient has a primary payer
    if ((patient as any).primary_payer_id) {
      const supabase = getSupabaseClient(true);
      const { data: payer } = await supabase
        .from('payers')
        .select('name')
        .eq('id', (patient as any).primary_payer_id)
        .single();
      (patient as any).primary_payer_name = payer?.name || null;
    }

    return NextResponse.json({ patient, encounters, notes });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
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
    const ps = await requireProviderSession();
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, mrn, email, notes, active, primaryPayerId } = body;

    const updates: any = {};

    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (dateOfBirth !== undefined) {
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
    if (email !== undefined) updates.email = email;
    if (notes !== undefined) updates.notes = notes;
    if (active !== undefined) updates.active = active;
    if (primaryPayerId !== undefined) updates.primary_payer_id = primaryPayerId;

    const patient = await updatePatient(patientId, ps.providerId, updates);

    return NextResponse.json({ patient });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
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
    const ps = await requireProviderSession();
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    await deletePatient(patientId, ps.providerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
