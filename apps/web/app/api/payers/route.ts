/**
 * GET /api/payers - List all approved payers
 *
 * Returns payers with status_code = 'approved', sorted by name.
 * Requires authenticated session.
 */

import { NextResponse } from 'next/server';
import { requireProviderSession, unauthorizedResponse, UnauthorizedError } from '@/lib/auth/get-provider-session';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const ps = await requireProviderSession();

    const supabase = getSupabaseClient(true);

    const { data, error } = await supabase
      .from('payers')
      .select('id, name, payer_type')
      .eq('status_code', 'approved')
      .order('name');

    if (error) {
      console.error('Error fetching payers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payers' },
        { status: 500 }
      );
    }

    return NextResponse.json({ payers: data });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse(error.message);
    console.error('Error in payers route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payers' },
      { status: 500 }
    );
  }
}
