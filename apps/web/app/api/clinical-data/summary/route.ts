/**
 * GET /api/clinical-data/summary?patientId=... - Get clinical data summary for UI badges
 *
 * Returns counts and last sync timestamp for a patient's clinical data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClinicalDataSummary } from '@/lib/db/clinical-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json(
      { error: 'patientId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const summary = await getClinicalDataSummary(patientId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching clinical data summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinical data summary' },
      { status: 500 }
    );
  }
}
