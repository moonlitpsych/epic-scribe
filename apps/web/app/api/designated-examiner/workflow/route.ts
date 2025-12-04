/**
 * POST /api/designated-examiner/workflow - Create new DE workflow
 * GET /api/designated-examiner/workflow - List user's workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST - Create a new DE workflow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      patient_name,
      hearing_date,
      commitment_type,
      hospital,
      cde_note,
      progress_notes,
      adhoc_notes,
    } = body;

    // Validate required fields
    if (!patient_name?.trim()) {
      return NextResponse.json(
        { error: 'Patient name is required' },
        { status: 400 }
      );
    }

    if (!cde_note?.trim()) {
      return NextResponse.json(
        { error: 'CDE note is required' },
        { status: 400 }
      );
    }

    // Create the workflow record
    const { data: workflow, error } = await supabase
      .from('designated_examiner_reports')
      .insert({
        patient_name,
        hearing_date: hearing_date || null,
        commitment_type: commitment_type || '30-day',
        hospital: hospital || 'Huntsman Mental Health Institute',
        cde_note,
        progress_notes: progress_notes || null,
        adhoc_notes: adhoc_notes || null,
        workflow_step: 1,
        workflow_status: 'in_progress',
        finalized_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[DE Workflow] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create workflow', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('[DE Workflow] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - List user's DE workflows
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'in_progress', 'completed', 'abandoned'
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('designated_examiner_reports')
      .select('*')
      .eq('finalized_by', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status if provided
    if (status) {
      query = query.eq('workflow_status', status);
    }

    const { data: workflows, error } = await query;

    if (error) {
      console.error('[DE Workflow] List error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('[DE Workflow] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
