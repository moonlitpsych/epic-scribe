/**
 * GET /api/patient-profile/[patientId] - Fetch structured patient profile
 * PUT /api/patient-profile/[patientId] - Update structured patient profile (manual edits)
 *
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  getPatientProfile,
  upsertPatientProfile,
  getPatientProfileSummary,
} from '@/lib/db/patient-profiles';
import type { StructuredPatientProfile } from '@epic-scribe/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId } = params;
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    const profile = await getPatientProfile(patientId);
    if (!profile) {
      return NextResponse.json({ profile: null, hasProfile: false });
    }

    return NextResponse.json({ profile, hasProfile: true });
  } catch (error) {
    console.error('[GET /api/patient-profile] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient profile', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId } = params;
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { profile } = body as { profile: StructuredPatientProfile };

    if (!profile) {
      return NextResponse.json({ error: 'profile is required in request body' }, { status: 400 });
    }

    // Preserve metadata, update timestamp
    profile.lastUpdated = new Date().toISOString();

    await upsertPatientProfile(patientId, profile);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('[PUT /api/patient-profile] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update patient profile', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
