/**
 * GET /api/designated-examiner/[id]
 * PUT /api/designated-examiner/[id]
 * DELETE /api/designated-examiner/[id]
 *
 * CRUD operations for individual designated examiner reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch a specific report
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user ID from session
    const userId = session.user.id || session.user.email;

    const { data: report, error } = await supabase
      .from('designated_examiner_reports')
      .select('*')
      .eq('id', params.id)
      .eq('finalized_by', userId)
      .single();

    if (error || !report) {
      console.error('[DE Get] Error fetching report:', error);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('[DE Get] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

// PUT - Update a report (primarily for saving edits)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { final_argument } = body;

    if (!final_argument?.trim()) {
      return NextResponse.json(
        { error: 'Final argument is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user ID from session
    const userId = session.user.id || session.user.email;

    const { data: report, error } = await supabase
      .from('designated_examiner_reports')
      .update({
        final_argument,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('finalized_by', userId)
      .select()
      .single();

    if (error || !report) {
      console.error('[DE Update] Error updating report:', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    console.log(`[DE Update] Updated report: ${report.id}`);

    return NextResponse.json({ report });
  } catch (error) {
    console.error('[DE Update] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a report
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user ID from session
    const userId = session.user.id || session.user.email;

    const { error } = await supabase
      .from('designated_examiner_reports')
      .delete()
      .eq('id', params.id)
      .eq('finalized_by', userId);

    if (error) {
      console.error('[DE Delete] Error deleting report:', error);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    console.log(`[DE Delete] Deleted report: ${params.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DE Delete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}
