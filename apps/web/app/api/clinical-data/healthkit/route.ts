/**
 * POST /api/clinical-data/healthkit - Receive HealthKit clinical data from iOS app
 *
 * Accepts a ClinicalDataPayload and fans out into individual upserts per data type.
 * Auth: Bearer token via HEALTHKIT_SYNC_API_KEY (device-facing route with PHI).
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ClinicalDataPayload } from '@epic-scribe/types';
import { upsertClinicalData } from '@/lib/db/clinical-data';

const DATA_TYPE_MAP: Record<string, string> = {
  medications: 'medications',
  conditions: 'conditions',
  labResults: 'labs',
  vitalSigns: 'vitals',
  clinicalNotes: 'notes',
  allergies: 'allergies',
  procedures: 'procedures',
};

export async function POST(request: NextRequest) {
  // Auth: verify bearer token
  const apiKey = process.env.HEALTHKIT_SYNC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'HealthKit sync not configured (missing HEALTHKIT_SYNC_API_KEY)' },
      { status: 501 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: ClinicalDataPayload = await request.json();

    // Validate required fields
    if (!body.patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    if (!body.data || typeof body.data !== 'object') {
      return NextResponse.json(
        { error: 'data object is required with at least one data type' },
        { status: 400 }
      );
    }

    // Check that at least one data type is present
    const presentTypes = Object.entries(body.data).filter(
      ([, value]) => Array.isArray(value) && value.length > 0
    );

    if (presentTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one data type must contain data' },
        { status: 400 }
      );
    }

    // Fan out into individual upserts per data type
    const results: Record<string, number> = {};

    for (const [key, items] of presentTypes) {
      const dataType = DATA_TYPE_MAP[key];
      if (!dataType) {
        console.warn(`[HealthKit] Unknown data type key: ${key}, skipping`);
        continue;
      }

      await upsertClinicalData(
        body.patientId,
        'healthkit',
        dataType as any,
        items,
        undefined, // rawFhir - could be added later
        body.syncTimestamp
      );

      results[dataType] = (items as unknown[]).length;
    }

    console.log(`[HealthKit] Synced clinical data for patient ${body.patientId}:`, results);

    return NextResponse.json({
      success: true,
      patientId: body.patientId,
      syncedTypes: results,
      syncTimestamp: body.syncTimestamp,
    });
  } catch (error) {
    console.error('Error processing HealthKit sync:', error);
    return NextResponse.json(
      { error: 'Failed to process HealthKit data' },
      { status: 500 }
    );
  }
}
