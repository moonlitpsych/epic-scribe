/**
 * GET /api/patients - List all active patients
 * POST /api/patients - Create a new patient
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getAllPatients, createPatient, searchPatients } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // If search query provided, search patients
    if (query) {
      const patients = await searchPatients(query);
      return NextResponse.json({ patients });
    }

    // Otherwise, get all patients
    const patients = await getAllPatients(includeInactive);

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, mrn, notes } = body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: 'firstName, lastName, and dateOfBirth are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for dateOfBirth' },
        { status: 400 }
      );
    }

    const patient = await createPatient({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      mrn: mrn || null,
      notes: notes || null,
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}
