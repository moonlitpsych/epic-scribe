/**
 * POST /api/transcripts/sync - Receive visit transcript from iOS app
 *
 * Auth: Bearer token via HEALTHKIT_SYNC_API_KEY (same shared secret as HealthKit sync).
 * The phone records + transcribes on-device, then POSTs only the text transcript here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVisitTranscript } from '@/lib/db/transcripts';
import { getSupabaseClient } from '@/lib/supabase';

interface TranscriptSyncPayload {
  patientName: string;
  patientId?: string;
  transcript: string;
  recordingDurationSeconds?: number;
  wordCount?: number;
  whisperModel?: string;
  recordedAt: string;
  transcribedAt?: string;
  providerId?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.HEALTHKIT_SYNC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Sync not configured (missing HEALTHKIT_SYNC_API_KEY)' },
      { status: 501 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: TranscriptSyncPayload = await request.json();

    if (!body.patientName || !body.transcript || !body.recordedAt) {
      return NextResponse.json(
        { error: 'patientName, transcript, and recordedAt are required' },
        { status: 400 }
      );
    }

    // Resolve provider: use provided ID or fall back to admin provider
    let providerId = body.providerId;
    if (!providerId) {
      const supabase = getSupabaseClient(true);
      const { data: admin } = await (supabase as any)
        .from('es_providers')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .single();

      if (!admin) {
        return NextResponse.json(
          { error: 'No provider found' },
          { status: 500 }
        );
      }
      providerId = admin.id;
    }

    const transcript = await createVisitTranscript({
      provider_id: providerId,
      patient_id: body.patientId || null,
      patient_name: body.patientName,
      transcript: body.transcript,
      recording_duration_seconds: body.recordingDurationSeconds,
      word_count: body.wordCount || body.transcript.split(/\s+/).length,
      whisper_model: body.whisperModel,
      recorded_at: body.recordedAt,
      transcribed_at: body.transcribedAt,
    });

    console.log(`[TranscriptSync] Synced transcript ${transcript.id} for "${body.patientName}"`);

    return NextResponse.json({
      success: true,
      transcriptId: transcript.id,
      patientName: body.patientName,
    });
  } catch (error) {
    console.error('Error processing transcript sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync transcript' },
      { status: 500 }
    );
  }
}
