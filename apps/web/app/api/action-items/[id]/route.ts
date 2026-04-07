/**
 * PATCH /api/action-items/[id] — Update an action item (toggle completed, edit text)
 * DELETE /api/action-items/[id] — Delete an action item
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { updateActionItem, deleteActionItem } from '@/lib/db/action-items';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();
    const body = await request.json();

    const updates: { text?: string; category?: string; completed?: boolean } = {};
    if (body.text !== undefined) updates.text = body.text;
    if (body.category !== undefined) updates.category = body.category;
    if (body.completed !== undefined) updates.completed = body.completed;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const item = await updateActionItem(params.id, ps.providerId, updates);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[PATCH /api/action-items/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ps = await requireProviderSession();
    await deleteActionItem(params.id, ps.providerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('[DELETE /api/action-items/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to delete action item' }, { status: 500 });
  }
}
