/**
 * GET /api/companion/batch - List all batch queue items for this session
 * POST /api/companion/batch - Add patient to batch queue
 *
 * Auth: Bearer device token (companion side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCompanion } from '@/lib/companion-auth';
import { addBatchItem, getBatchItems } from '@/lib/db/batch-queue';
import { getPatientById } from '@/lib/db/patients';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateCompanion(request);
    if (auth.error) return auth.error;

    const items = await getBatchItems(auth.session.id);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Companion/Batch GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch batch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateCompanion(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { patientId, setting, visitType, sortOrder } = body;

    if (!patientId || !setting || !visitType) {
      return NextResponse.json(
        { error: 'patientId, setting, and visitType are required' },
        { status: 400 }
      );
    }

    // Look up patient name from DB
    const patient = await getPatientById(patientId);

    const item = await addBatchItem(auth.session.id, {
      patientId,
      firstName: patient.first_name,
      lastName: patient.last_name,
      setting,
      visitType,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[Companion/Batch POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add batch item' },
      { status: 500 }
    );
  }
}
