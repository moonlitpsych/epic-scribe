/**
 * GET /api/transcripts/patients - Patient name autocomplete for iOS app
 *
 * Auth: Bearer token via HEALTHKIT_SYNC_API_KEY.
 * Query: ?q=search_term (searches by name, ilike)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const apiKey = process.env.HEALTHKIT_SYNC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Sync not configured' },
      { status: 501 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({ patients: [] });
    }

    // Resolve admin provider for scoping
    const supabase = getSupabaseClient(true);
    const { data: admin } = await (supabase as any)
      .from('es_providers')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .single();

    if (!admin) {
      return NextResponse.json({ patients: [] });
    }

    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('provider_id', admin.id)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .order('last_name', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error searching patients:', error);
      return NextResponse.json({ patients: [] });
    }

    return NextResponse.json({
      patients: (data || []).map((p: any) => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
      })),
    });
  } catch (error) {
    console.error('Error in patient search:', error);
    return NextResponse.json(
      { error: 'Failed to search patients' },
      { status: 500 }
    );
  }
}
