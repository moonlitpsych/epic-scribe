/**
 * GET /api/patients - List all active patients (scoped to provider)
 * POST /api/patients - Create a new patient (assigned to provider)
 *
 * Requires authenticated session with provider context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getAllPatients, createPatient, searchPatients } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ps = await requireProviderSession();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (query) {
      const patients = await searchPatients(query, ps.providerId);
      return NextResponse.json({ patients });
    }

    const patients = await getAllPatients(ps.providerId);

    return NextResponse.json({ patients });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ps = await requireProviderSession();

    const body = await request.json();
    const { firstName, lastName, dob, dateOfBirth, age, medicaid_id, mrn, phone, email } = body;

    const dobValue = dob || dateOfBirth || null;
    const medicaidIdValue = medicaid_id || mrn;
    const ageValue = age ? parseInt(age, 10) : null;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 }
      );
    }

    if (dobValue) {
      const dobDate = new Date(dobValue);
      if (isNaN(dobDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format for dob' },
          { status: 400 }
        );
      }
    }

    if (ageValue !== null && (ageValue < 0 || ageValue > 150)) {
      return NextResponse.json(
        { error: 'Invalid age value' },
        { status: 400 }
      );
    }

    const patient = await createPatient(ps.providerId, {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dobValue,
      age: ageValue,
      mrn: medicaidIdValue || null,
      phone: phone || null,
      email: email || null,
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(error.message);
    }
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}
