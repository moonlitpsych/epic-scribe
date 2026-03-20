/**
 * GET /api/transcripts/recent - Fetch recent phone transcripts for desktop UI
 *
 * Auth: NextAuth session (provider-scoped).
 * Query params: status (optional), limit (optional, default 10)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProviderSession, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getRecentTranscripts } from '@/lib/db/transcripts';

export async function GET(request: NextRequest) {
  try {
    const session = await requireProviderSession();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const transcripts = await getRecentTranscripts(
      session.providerId,
      status,
      Math.min(limit, 50)
    );

    return NextResponse.json({ transcripts });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching recent transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}
