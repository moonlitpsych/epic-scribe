/**
 * GET /api/payers - List all approved payers
 *
 * Returns payers with status_code = 'approved', sorted by name.
 * Requires authenticated session.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Error in payers route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payers' },
      { status: 500 }
    );
  }
}
