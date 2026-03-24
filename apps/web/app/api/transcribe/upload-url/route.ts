/**
 * POST /api/transcribe/upload-url — Generate presigned Supabase Storage URL
 *
 * Returns a signed URL the client can PUT audio to directly,
 * bypassing Vercel's 4.5 MB body size limit for serverless functions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await requireProviderSession();
    const { mimeType } = await request.json();

    const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm';
    const storagePath = `transcriptions/${session.providerId}/${Date.now()}.${ext}`;

    const supabase = getSupabaseClient(true);

    // Ensure bucket exists (idempotent — ignores "already exists" error)
    await supabase.storage
      .createBucket('encounter-recordings', { public: false })
      .catch(() => {});

    const { data, error } = await supabase.storage
      .from('encounter-recordings')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('[UploadUrl] Error creating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      storagePath,
      token: data.token,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[UploadUrl] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
