/**
 * GET /api/companion/patients - Search patients from companion portal
 *
 * Query params:
 *   - q: Search query (searches first_name, last_name). If empty, returns all patients.
 *
 * Auth: Bearer device token (companion side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCompanion } from '@/lib/companion-auth';
import { searchPatients, getAllPatients } from '@/lib/db/patients';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateCompanion(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    const patients = query
      ? await searchPatients(query)
      : await getAllPatients();

    // Return only non-clinical fields needed for companion display
    const results = patients.map((p: any) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      date_of_birth: p.date_of_birth || p.dob || null,
      email: p.email,
    }));

    return NextResponse.json({ patients: results });
  } catch (error) {
    console.error('[Companion/Patients GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search patients' },
      { status: 500 }
    );
  }
}
