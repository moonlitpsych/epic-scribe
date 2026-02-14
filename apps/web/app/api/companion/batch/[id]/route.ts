/**
 * PATCH /api/companion/batch/[id] - Update prior note or mark as copied
 * DELETE /api/companion/batch/[id] - Remove item from queue
 *
 * Auth: Bearer device token (companion side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateCompanion } from '@/lib/companion-auth';
import {
  updateBatchItemPriorNote,
  markBatchItemNoPriorNote,
  markItemCopied,
  removeBatchItem,
} from '@/lib/db/batch-queue';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateCompanion(request);
    if (auth.error) return auth.error;

    const { id } = params;
    const body = await request.json();
    const { priorNoteContent, priorNoteSource, status } = body;

    // Mark as copied
    if (status === 'copied') {
      const updated = await markItemCopied(id, auth.session.id);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
      }
      return NextResponse.json({ item: updated });
    }

    // Mark as no prior note needed
    if (priorNoteSource === 'none') {
      const updated = await markBatchItemNoPriorNote(id, auth.session.id);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
      }
      return NextResponse.json({ item: updated });
    }

    // Update prior note content
    if (priorNoteContent !== undefined) {
      const updated = await updateBatchItemPriorNote(
        id,
        auth.session.id,
        priorNoteContent,
        priorNoteSource || 'manual'
      );
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
      }
      return NextResponse.json({ item: updated });
    }

    return NextResponse.json({ error: 'No valid update provided' }, { status: 400 });
  } catch (error) {
    console.error('[Companion/Batch PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update batch item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateCompanion(request);
    if (auth.error) return auth.error;

    const success = await removeBatchItem(params.id, auth.session.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Companion/Batch DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove batch item' },
      { status: 500 }
    );
  }
}
