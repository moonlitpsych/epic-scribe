/**
 * GET /api/action-items?encounterId=xxx — List action items for an encounter
 * POST /api/action-items — Create a new action item
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getActionItemsByEncounter, createActionItem } from '@/lib/db/action-items';

export async function GET(request: NextRequest) {
  try {
    const ps = await requireProviderSession();
    const { searchParams } = new URL(request.url);
    const encounterId = searchParams.get('encounterId');

    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId is required' }, { status: 400 });
    }

    const items = await getActionItemsByEncounter(encounterId, ps.providerId);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[GET /api/action-items] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch action items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ps = await requireProviderSession();
    const body = await request.json();

    const { encounterId, patientId, text, category } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const item = await createActionItem({
      encounterId,
      patientId,
      providerId: ps.providerId,
      text: text.trim(),
      category: category || 'other',
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[POST /api/action-items] Error:', error);
    return NextResponse.json({ error: 'Failed to create action item' }, { status: 500 });
  }
}
