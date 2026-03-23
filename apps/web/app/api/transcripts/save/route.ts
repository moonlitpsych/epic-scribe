/**
 * POST /api/transcripts/save - Save a web-recorded transcript
 *
 * Auth: NextAuth session (requireProviderSession).
 * Web counterpart to /api/transcripts/sync (which uses bearer token for iOS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { createVisitTranscript } from '@/lib/db/transcripts';

interface SavePayload {
  transcript: string;
  deviceInfo?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireProviderSession();

    const body: SavePayload = await request.json();

    if (!body.transcript) {
      return NextResponse.json(
        { error: 'transcript is required' },
        { status: 400 }
      );
    }

    const wordCount = body.transcript.split(/\s+/).filter(Boolean).length;

    const transcript = await createVisitTranscript({
      provider_id: session.providerId,
      patient_id: null,
      patient_name: 'Web Recording',
      transcript: body.transcript,
      word_count: wordCount,
      whisper_model: 'gemini-2.5-flash',
      recorded_at: new Date().toISOString(),
    });

    console.log(`[TranscriptSave] Saved web transcript ${transcript.id} (${wordCount} words)`);

    return NextResponse.json({
      success: true,
      transcriptId: transcript.id,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error saving transcript:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript' },
      { status: 500 }
    );
  }
}
