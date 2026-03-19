/**
 * POST /api/prior-notes/save - Save a prior note for a known patient
 *
 * Simple endpoint for manual note prep: saves a pasted note for
 * a patient already selected by ID. Deduplicates via content hash.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { savePriorNote } from '@/lib/db/prior-notes';

interface SaveRequest {
  patientId: string;
  noteContent: string;
}

export async function POST(request: NextRequest) {
  try {
    const ps = await requireProviderSession();

    const body: SaveRequest = await request.json();

    if (!body.patientId || !body.noteContent?.trim()) {
      return NextResponse.json(
        { error: 'patientId and noteContent are required' },
        { status: 400 }
      );
    }

    const { priorNote, isDuplicate } = await savePriorNote({
      patientId: body.patientId,
      noteContent: body.noteContent.trim(),
      importSource: 'manual',
    }, ps.providerId);

    return NextResponse.json({
      success: true,
      priorNote,
      isDuplicate,
      message: isDuplicate
        ? 'This note was already imported for this patient.'
        : 'Prior note saved successfully.',
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error saving prior note:', error);
    return NextResponse.json(
      { error: 'Failed to save prior note' },
      { status: 500 }
    );
  }
}
