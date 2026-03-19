/**
 * GET /api/clinical-data/detail?patientId=... - Get full clinical data for modal display
 *
 * Returns the complete HealthKitClinicalData plus sync metadata.
 * Auth: NextAuth session required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getClinicalDataForPatient, getClinicalDataSummary } from '@/lib/db/clinical-data';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json(
      { error: 'patientId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const [data, summary] = await Promise.all([
      getClinicalDataForPatient(patientId),
      getClinicalDataSummary(patientId),
    ]);

    return NextResponse.json({
      data: data || {},
      lastSyncedAt: summary.lastSyncedAt,
      counts: summary.counts,
    });
  } catch (error) {
    console.error('Error fetching clinical data detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinical data' },
      { status: 500 }
    );
  }
}
