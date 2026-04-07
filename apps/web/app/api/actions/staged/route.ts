/**
 * GET /api/actions/staged?encounterId=xxx — Fetch staged actions for an encounter
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getStagedActionsByEncounter } from '@/lib/db/staged-actions';

export async function GET(request: NextRequest) {
  try {
    const ps = await requireProviderSession();
    const { searchParams } = new URL(request.url);
    const encounterId = searchParams.get('encounterId');

    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId is required' }, { status: 400 });
    }

    const actions = await getStagedActionsByEncounter(encounterId, ps.providerId);
    return NextResponse.json({ actions });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[GET /api/actions/staged] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch staged actions' }, { status: 500 });
  }
}
