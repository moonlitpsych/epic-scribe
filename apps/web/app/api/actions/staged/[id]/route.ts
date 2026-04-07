/**
 * PATCH /api/actions/staged/[id] — Update staged action status (dismiss/approve)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { updateStagedActionStatus } from '@/lib/db/staged-actions';

const ALLOWED_STATUSES = ['dismissed', 'approved', 'executing', 'completed', 'failed'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();
    const body = await request.json();
    const { status } = body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const action = await updateStagedActionStatus(params.id, ps.providerId, status);
    return NextResponse.json({ action });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[PATCH /api/actions/staged/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to update staged action' }, { status: 500 });
  }
}
